import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectProject } from "../src/core/projectDetector.js";
import { dockerModule } from "../src/modules/docker/index.js";
import { guardrailsModule } from "../src/modules/guardrails/index.js";
import { hooksPathPrepareScript } from "../src/modules/guardrails/hooksPath.js";

describe("hook activation and Docker compatibility", () => {
  let cwd: string;
  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "helen-hooks-docker-"));
    fs.writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({
        name: "demo",
        type: "module",
        scripts: { build: "vite build" },
        devDependencies: { vite: "^7.0.0" },
      }),
    );
    vi.stubEnv("GIT_CONFIG_GLOBAL", path.join(cwd, "global-git-config"));
    vi.stubEnv("GIT_CONFIG_NOSYSTEM", "1");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(cwd, { recursive: true, force: true });
  });
  const context = () => ({
    cwd,
    project: detectProject(cwd),
    dryRun: false,
    force: false,
    verbose: false,
  });
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      windowsHide: true,
    }).replace(/\r?\n$/, "");
  const activate = () =>
    spawnSync(
      process.execPath,
      ["-e", hooksPathPrepareScript.slice('node -e "'.length, -1)],
      { cwd, encoding: "utf8", windowsHide: true },
    );

  it("activates the generated hooks without needing built files and repeats safely", async () => {
    git("init", "-q");
    await guardrailsModule.execute(context());
    expect(fs.existsSync(path.join(cwd, "dist"))).toBe(false);
    expect(activate().status).toBe(0);
    expect(git("config", "--get", "core.hooksPath")).toBe(".githooks");
    expect(activate().status).toBe(0);
    expect(git("config", "--get", "core.hooksPath")).toBe(".githooks");
  });

  it.each([".husky/_", "", "../shared hooks", ".githooks ", " .githooks"])(
    "the generated prepare script preserves a custom hooksPath %j",
    async (value) => {
      git("init", "-q");
      git("config", "--local", "core.hooksPath", value);
      const result = await guardrailsModule.execute(context());
      expect(result.warnings.join("\n")).toContain(
        "HELEN hooks remain inactive",
      );
      expect(activate().status).toBe(0);
      expect(git("config", "--get", "core.hooksPath")).toBe(value);
      expect(result.nextSteps.join("\n")).not.toContain("activate the hooks");
    },
  );

  it("the prepare script also preserves inherited global hook managers", async () => {
    git("init", "-q");
    git("config", "--global", "core.hooksPath", ".husky/_");
    await guardrailsModule.execute(context());
    expect(activate().status).toBe(0);
    expect(git("config", "--get", "core.hooksPath")).toBe(".husky/_");
    expect(
      fs.readFileSync(path.join(cwd, ".git", "config"), "utf8"),
    ).not.toContain("hooksPath");
  });

  it("leaves an existing prepare script intact and gives no unconditional activation instruction", async () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(cwd, "package.json"), "utf8"),
    );
    pkg.scripts.prepare = "husky";
    fs.writeFileSync(path.join(cwd, "package.json"), JSON.stringify(pkg));
    const result = await guardrailsModule.execute(context());
    expect(
      JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"))
        .scripts.prepare,
    ).toBe("husky");
    expect(result.nextSteps.join("\n")).toContain(
      "after reviewing your current hook manager",
    );
  });

  it("the prepare script permits installation outside a Git checkout", () => {
    expect(activate().status).toBe(0);
    expect(fs.existsSync(path.join(cwd, ".git"))).toBe(false);
  });

  it.each([
    "next",
    "cra",
    "remix",
    "astro",
    "sveltekit",
    "nuxt",
    "vue",
    "unknown",
  ] as const)(
    "rejects %s before creating or overwriting any file",
    async (framework) => {
      const dockerfile = path.join(cwd, "Dockerfile");
      fs.writeFileSync(dockerfile, "custom image");
      const packageBefore = fs.readFileSync(
        path.join(cwd, "package.json"),
        "utf8",
      );
      await expect(
        dockerModule.execute({
          ...context(),
          project: { ...detectProject(cwd), framework },
          force: true,
        }),
      ).rejects.toThrow("supports static Vite apps only");
      expect(fs.readFileSync(dockerfile, "utf8")).toBe("custom image");
      expect(fs.readFileSync(path.join(cwd, "package.json"), "utf8")).toBe(
        packageBefore,
      );
      expect(fs.existsSync(path.join(cwd, "docker-compose.yml"))).toBe(false);
      expect(fs.existsSync(path.join(cwd, ".dockerignore"))).toBe(false);
    },
  );

  it.each(["pnpm", "yarn", "bun"] as const)(
    "rejects %s Docker setup without changing files",
    async (packageManager) => {
      await expect(
        dockerModule.execute({
          ...context(),
          project: { ...detectProject(cwd), packageManager },
        }),
      ).rejects.toThrow("requires npm");
      expect(fs.existsSync(path.join(cwd, "Dockerfile"))).toBe(false);
    },
  );

  it("rejects declared package managers even before a lockfile exists", async () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(cwd, "package.json"), "utf8"),
    );
    pkg.packageManager = "pnpm@9.0.0";
    fs.writeFileSync(path.join(cwd, "package.json"), JSON.stringify(pkg));
    await expect(dockerModule.execute(context())).rejects.toThrow(
      "requires npm",
    );
    expect(fs.existsSync(path.join(cwd, "Dockerfile"))).toBe(false);
  });

  it("creates the npm/Vite image and preserves user Dockerfiles on repeated execution", async () => {
    const first = await dockerModule.execute(context());
    expect(first.created).toEqual([
      "Dockerfile",
      "docker-compose.yml",
      ".dockerignore",
    ]);
    expect(fs.readFileSync(path.join(cwd, "Dockerfile"), "utf8")).toContain(
      "/app/dist /usr/share/nginx/html",
    );
    fs.writeFileSync(path.join(cwd, "Dockerfile"), "custom image");
    const second = await dockerModule.execute(context());
    expect(second.skipped).toContain("Dockerfile");
    expect(fs.readFileSync(path.join(cwd, "Dockerfile"), "utf8")).toBe(
      "custom image",
    );
  });
});
