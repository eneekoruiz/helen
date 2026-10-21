import { recordFileResult } from "../results.js";
import type { HelenModule } from "../types.js";
import type { HelenContext, ModuleResult } from "../../core/context.js";
import { createEmptyResult } from "../../core/context.js";
import { writeFileSafe, patchPackageJson, readJson } from "../../core/fs.js";
import { getTemplatePath } from "../../core/templateResolver.js";
import path from "node:path";
import fs from "fs-extra";

const meta: HelenModule["meta"] = {
  id: "docker",
  name: "Docker Setup",
  category: "Infrastructure",
  summary: "Dockerfile multi-stage + docker-compose.yml + .dockerignore",
  description:
    "Creates a multi-stage Dockerfile for a static Vite app using npm (Node build + Nginx serve), a docker-compose.yml, and a .dockerignore. Other frameworks and package managers require their own container setup.",
  problemItSolves:
    "Provides a starting container setup for the default Vite dist output, with a separate build and static serving stage.",
  whenToUse:
    "When you plan to deploy via containers or want reproducible environments.",
  whenNotToUse:
    "If deploying exclusively to serverless platforms like Vercel or Netlify without Docker.",
  filesCreated: ["Dockerfile", "docker-compose.yml", ".dockerignore"],
  filesModified: ["package.json"],
  runtimeDependencies: [],
  devDependencies: [],
  requirements: [
    "Static Vite app with the default dist build output",
    "npm with package-lock.json",
    "Docker installed locally for testing",
  ],
  risks: [
    "Custom Vite output paths and server rendering require a different Dockerfile.",
  ],
  nextSteps: [
    "Run npm install to refresh package-lock.json",
    "Run docker compose up --build to test locally",
    "Customize the Nginx configuration in Dockerfile if needed",
  ],
  riskLevel: "low",
  recommendedLevel: "intermediate",
  status: "stable",
  compatibleFrameworks: ["vite"],
};

async function execute(ctx: HelenContext): Promise<ModuleResult> {
  const result = createEmptyResult(meta.id, meta.name);
  const { cwd, dryRun, force } = ctx;
  const pkg = readJson<{ packageManager?: string }>(
    path.join(cwd, "package.json"),
  );
  const declaredManager = pkg?.packageManager?.split("@")[0];
  if (ctx.project.framework !== "vite") {
    throw new Error(
      `Docker scaffold supports static Vite apps only; detected ${ctx.project.framework}. No files were changed. Use a Dockerfile for your framework's runtime.`,
    );
  }
  if (
    !["npm", "unknown"].includes(ctx.project.packageManager) ||
    (declaredManager && declaredManager !== "npm")
  ) {
    throw new Error(
      "Docker scaffold requires npm; your package manager needs its own install and build instructions. No files were changed.",
    );
  }

  // Dockerfile
  const dockerfileTemplatePath = getTemplatePath("docker/Dockerfile");
  let dockerfileContent: string;
  if (fs.existsSync(dockerfileTemplatePath)) {
    dockerfileContent = fs.readFileSync(dockerfileTemplatePath, "utf-8");
  } else {
    dockerfileContent = getDefaultDockerfile();
  }
  const r1 = writeFileSafe(path.join(cwd, "Dockerfile"), dockerfileContent, {
    dryRun,
    force,
    root: cwd,
  });
  recordFileResult(result, "Dockerfile", r1);

  // docker-compose.yml
  const composeTemplatePath = getTemplatePath("docker/docker-compose.yml");
  let composeContent: string;
  if (fs.existsSync(composeTemplatePath)) {
    composeContent = fs.readFileSync(composeTemplatePath, "utf-8");
  } else {
    composeContent = getDefaultCompose();
  }
  const r2 = writeFileSafe(
    path.join(cwd, "docker-compose.yml"),
    composeContent,
    { dryRun, force, root: cwd },
  );
  recordFileResult(result, "docker-compose.yml", r2);

  // .dockerignore
  const dockerignore = `node_modules
dist
.git
.gitignore
.env*
*.md
.vscode
coverage
.DS_Store
Thumbs.db
`;
  const r3 = writeFileSafe(path.join(cwd, ".dockerignore"), dockerignore, {
    dryRun,
    force,
    root: cwd,
  });
  recordFileResult(result, ".dockerignore", r3);

  // Patch package.json scripts
  const patchResult = patchPackageJson(
    cwd,
    {
      scripts: {
        "docker:build": "docker build -t app .",
        "docker:up": "docker compose up -d",
        "docker:down": "docker compose down",
      },
    },
    { dryRun },
  );
  recordFileResult(result, "package.json", patchResult);

  result.nextSteps.push("Run docker compose up --build to test");
  result.nextSteps.push(
    "Run npm install to create or refresh package-lock.json before building the image",
  );

  return result;
}

function getDefaultDockerfile(): string {
  return `# ── Stage 1: Build ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────
FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback
RUN printf 'server {\\n  listen 80;\\n  root /usr/share/nginx/html;\\n  location / {\\n    index index.html;\\n    try_files $uri $uri/ /index.html;\\n  }\\n  location ~* \\\\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {\\n    try_files $uri =404;\\n    expires 1y;\\n    add_header Cache-Control "public, immutable";\\n  }\\n}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;
}

function getDefaultCompose(): string {
  return `version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
`;
}

export const dockerModule: HelenModule = { meta, execute };
