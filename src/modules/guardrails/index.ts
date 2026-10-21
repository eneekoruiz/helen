import type { HelenModule } from "../types.js";
import type { HelenContext, ModuleResult } from "../../core/context.js";
import { createEmptyResult } from "../../core/context.js";
import { patchPackageJson, readJson, writeFileSafe } from "../../core/fs.js";
import fs from "node:fs";
import path from "node:path";
import { recordFileResult } from "../results.js";
import { hooksPathPrepareScript, readHooksPath } from "./hooksPath.js";
import { PRE_COMMIT_HOOK, PRE_PUSH_HOOK } from "../../core/gitHooks.js";

export const PREPARE_SCRIPT = hooksPathPrepareScript;

const meta: HelenModule["meta"] = {
  id: "guardrails",
  name: "Git Hooks & Dependabot",
  category: "Infrastructure",
  summary:
    "Dependency-free pre-commit / pre-push hooks and a grouped Dependabot config",
  description:
    "Adds .githooks/pre-commit (blocks .env files, conflict markers, likely secrets and huge files), .githooks/pre-push (runs the typecheck, lint, test and build scripts that exist) and .github/dependabot.yml (weekly, grouped minor/patch updates for npm and GitHub Actions). Hooks are activated through the prepare script.",
  problemItSolves:
    "Secrets, broken builds and stale dependencies reach the remote before CI or a reviewer catches them.",
  whenToUse: "On every project hosted on GitHub that is worked on locally.",
  whenNotToUse:
    "If the project already uses husky, lefthook or another hook manager (keep one).",
  filesCreated: [
    ".githooks/pre-commit",
    ".githooks/pre-push",
    ".github/dependabot.yml",
  ],
  filesModified: ["package.json"],
  runtimeDependencies: [],
  devDependencies: [],
  requirements: ["git", "GitHub repository for Dependabot"],
  risks: ["Hooks can be skipped with --no-verify; CI stays the real gate."],
  nextSteps: [
    "Run npm install to activate the hooks when no custom core.hooksPath is configured",
  ],
  riskLevel: "low",
  recommendedLevel: "beginner",
  status: "stable",
};

const dependabot = `version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    groups:
      minor-and-patch:
        update-types: [minor, patch]
    # Major updates arrive as separate PRs so breaking changes are reviewed one by one.
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    groups:
      actions:
        patterns: ['*']
`;

async function execute(ctx: HelenContext): Promise<ModuleResult> {
  const result = createEmptyResult(meta.id, meta.name);
  const { cwd, dryRun, force } = ctx;
  const hooks = ctx.project.hasGit
    ? readHooksPath(cwd)
    : { kind: "unset" as const };
  if (hooks.kind === "custom") {
    result.warnings.push(
      `Preserved custom git core.hooksPath: ${JSON.stringify(hooks.value)}. HELEN hooks remain inactive.`,
    );
  }

  const files: Array<[string, string]> = [
    [".githooks/pre-commit", PRE_COMMIT_HOOK],
    [".githooks/pre-push", PRE_PUSH_HOOK],
    [".github/dependabot.yml", dependabot],
  ];
  for (const [rel, content] of files) {
    const status = writeFileSafe(path.join(cwd, rel), content, {
      dryRun,
      force,
      root: cwd,
    });
    if (status === "created" || status === "overwritten") {
      recordFileResult(result, rel, status);
      if (!dryRun && rel.startsWith(".githooks/"))
        fs.chmodSync(path.join(cwd, rel), 0o755);
    } else {
      result.skipped.push(rel);
    }
  }

  const pkg = readJson<{ scripts?: Record<string, string> }>(
    path.join(cwd, "package.json"),
  );
  if (pkg && !pkg.scripts?.prepare) {
    const status = patchPackageJson(
      cwd,
      { scripts: { prepare: hooksPathPrepareScript } },
      { dryRun },
    );
    recordFileResult(result, "package.json", status);
    if (hooks.kind !== "custom")
      result.nextSteps.push(
        "Run your package manager install once to activate the hooks",
      );
  } else if (hooks.kind !== "custom") {
    result.nextSteps.push(
      "A prepare script already exists. To opt into HELEN hooks, set core.hooksPath to .githooks after reviewing your current hook manager.",
    );
  }
  result.nextSteps.push(
    "Enable Dependabot security updates in the GitHub repository settings",
  );
  return result;
}

export const guardrailsModule: HelenModule = { meta, execute };
