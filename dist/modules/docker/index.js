import { createEmptyResult } from '../../core/context.js';
import { writeFileSafe, patchPackageJson } from '../../core/fs.js';
import { getTemplatePath } from '../../core/templateResolver.js';
import path from 'node:path';
import fs from 'fs-extra';
const meta = {
    id: 'docker',
    name: 'Docker Setup',
    category: 'Infrastructure',
    summary: 'Dockerfile multi-stage + docker-compose.yml + .dockerignore',
    description: 'Creates an optimized multi-stage Dockerfile (Node build + Nginx serve), a docker-compose.yml for local development, and a .dockerignore to keep images small.',
    problemItSolves: 'Manual Docker setup is error-prone and often results in bloated images. This provides a production-ready setup from day one.',
    whenToUse: 'When you plan to deploy via containers or want reproducible environments.',
    whenNotToUse: 'If deploying exclusively to serverless platforms like Vercel or Netlify without Docker.',
    filesCreated: ['Dockerfile', 'docker-compose.yml', '.dockerignore'],
    filesModified: ['package.json'],
    runtimeDependencies: [],
    devDependencies: [],
    requirements: ['Docker installed locally for testing'],
    risks: ['None — files are standalone and do not affect the build'],
    nextSteps: ['Run docker compose up to test locally', 'Customize nginx.conf if needed'],
    riskLevel: 'low',
    recommendedLevel: 'intermediate',
    status: 'stable',
};
async function execute(ctx) {
    const result = createEmptyResult(meta.id, meta.name);
    const { cwd, dryRun, force } = ctx;
    // Dockerfile
    const dockerfileTemplatePath = getTemplatePath('docker/Dockerfile');
    let dockerfileContent;
    if (fs.existsSync(dockerfileTemplatePath)) {
        dockerfileContent = fs.readFileSync(dockerfileTemplatePath, 'utf-8');
    }
    else {
        dockerfileContent = getDefaultDockerfile();
    }
    const r1 = writeFileSafe(path.join(cwd, 'Dockerfile'), dockerfileContent, { dryRun, force });
    if (r1 === 'created' || r1 === 'overwritten')
        result.created.push('Dockerfile');
    else
        result.skipped.push('Dockerfile');
    // docker-compose.yml
    const composeTemplatePath = getTemplatePath('docker/docker-compose.yml');
    let composeContent;
    if (fs.existsSync(composeTemplatePath)) {
        composeContent = fs.readFileSync(composeTemplatePath, 'utf-8');
    }
    else {
        composeContent = getDefaultCompose();
    }
    const r2 = writeFileSafe(path.join(cwd, 'docker-compose.yml'), composeContent, { dryRun, force });
    if (r2 === 'created' || r2 === 'overwritten')
        result.created.push('docker-compose.yml');
    else
        result.skipped.push('docker-compose.yml');
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
    const r3 = writeFileSafe(path.join(cwd, '.dockerignore'), dockerignore, { dryRun, force });
    if (r3 === 'created' || r3 === 'overwritten')
        result.created.push('.dockerignore');
    else
        result.skipped.push('.dockerignore');
    // Patch package.json scripts
    const patchResult = patchPackageJson(cwd, {
        scripts: {
            'docker:build': 'docker build -t app .',
            'docker:up': 'docker compose up -d',
            'docker:down': 'docker compose down',
        },
    }, { dryRun });
    if (patchResult === 'modified')
        result.modified.push('package.json');
    result.nextSteps.push('Run docker compose up to test');
    result.nextSteps.push('Adjust Dockerfile if using pnpm or yarn');
    return result;
}
function getDefaultDockerfile() {
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
RUN echo 'server { \\
  listen 80; \\
  location / { \\
    root /usr/share/nginx/html; \\
    index index.html; \\
    try_files $uri $uri/ /index.html; \\
  } \\
  location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ { \\
    expires 1y; \\
    add_header Cache-Control "public, immutable"; \\
  } \\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;
}
function getDefaultCompose() {
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
export const dockerModule = { meta, execute };
//# sourceMappingURL=index.js.map