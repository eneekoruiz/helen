import fs from "node:fs";
import path from "node:path";
import { detectProject } from "./projectDetector.js";
import { updateAgentSetup } from "./agentDoctor.js";
import { isSafeProjectPath, writeFileSafe } from "./fs.js";
import { updateConfig } from "./config.js";
import {
  configureHelenHooksPath,
  readHooksPath,
} from "../modules/guardrails/hooksPath.js";
import {
  listOperations,
  runProjectOperationSync,
  writeAtomicFile,
} from "./operations.js";

export interface DoctorFixReport {
  fixed: string[];
  skipped: string[];
  errors: string[];
}

/**
 * Automatically repairs safe, non-destructive issues detected by helen doctor.
 */
export function repairDoctorIssues(
  cwd: string = process.cwd(),
  opts: { dryRun?: boolean } = {},
): DoctorFixReport {
  if (opts.dryRun) return applyDoctorRepairs(cwd, opts);
  let hooksReady = false;
  const operation = runProjectOperationSync(
    cwd,
    "doctor-fix",
    () =>
      applyDoctorRepairs(cwd, opts, () => {
        hooksReady = true;
      }),
    (report) => report.errors.length === 0,
  );
  if (operation.operation)
    operation.value.errors.push(
      `Repair incomplete. Run: ${operation.operation.recoveryCommand}`,
    );
  // Git configuration is outside the file journal: activate only after every repair committed.
  if (hooksReady && operation.value.errors.length === 0) {
    try {
      if (listOperations(cwd).length > 0) {
        operation.value.skipped.push(
          "Git hook activation deferred until the enclosing operation commits; rerun doctor --fix.",
        );
        return operation.value;
      }
      const configured = configureHelenHooksPath(cwd);
      if (configured.kind === "unset")
        operation.value.fixed.push(
          "Configured git core.hooksPath to .githooks",
        );
      else if (configured.kind === "custom")
        operation.value.skipped.push(
          `Preserved custom git core.hooksPath: ${JSON.stringify(configured.value)}`,
        );
    } catch (err: unknown) {
      operation.value.errors.push(
        `Failed to configure git hooks: ${(err as Error)?.message || String(err)}`,
      );
    }
  }
  return operation.value;
}

function applyDoctorRepairs(
  cwd: string,
  opts: { dryRun?: boolean },
  onHooksReady?: () => void,
): DoctorFixReport {
  const report: DoctorFixReport = {
    fixed: [],
    skipped: [],
    errors: [],
  };

  const project = detectProject(cwd);

  // 1. Repair Git hooks if git is initialized
  if (project.hasGit) {
    try {
      const hooks = readHooksPath(cwd);
      if (hooks.kind === "custom") {
        report.skipped.push(
          `Preserved custom git core.hooksPath: ${JSON.stringify(hooks.value)}`,
        );
      } else {
        const githooksDir = path.join(cwd, ".githooks");
        if (!isSafeProjectPath(cwd, githooksDir))
          throw new Error("Unsafe .githooks path");

        // Pre-commit hook
        const preCommitPath = path.join(githooksDir, "pre-commit");
        if (
          !isSafeProjectPath(cwd, preCommitPath) ||
          (fs.existsSync(preCommitPath) && !fs.statSync(preCommitPath).isFile())
        ) {
          throw new Error("Unsafe .githooks/pre-commit path");
        }
        if (!fs.existsSync(preCommitPath)) {
          const hookContent = `#!/bin/sh
# HELEN pre-commit: fast checks on staged files only, no dependencies.
# Skip once with: git commit --no-verify
node --input-type=commonjs <<'HELEN_NODE'
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const git = (...args) => execFileSync('git', args, { maxBuffer: 32 * 1024 * 1024 });
let failed = false;
try {
  const files = git('diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR').toString().split('\\0').filter(Boolean);
  for (const file of files) {
    const fail = (reason) => { console.error('✖ ' + JSON.stringify(file) + ': ' + reason); failed = true; };
    const name = path.posix.basename(file);
    if ((name === '.env' || name.startsWith('.env.') || name.endsWith('.env')) && !/\\.(example|sample|template)$/.test(name)) fail('environment files must not be committed');
    const blob = git('show', ':' + file);
    if (blob.length > 5242880) fail('larger than 5 MB (use Git LFS or external storage)');
    const content = blob.toString();
    if (/^(<<<<<<<|>>>>>>>) /m.test(content)) fail('merge conflict markers');
    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36}|sk-(live|proj)-[A-Za-z0-9_-]{16,}|xox[baprs]-[A-Za-z0-9-]{10,}/.test(content)) fail('looks like it contains a secret (value not shown)');
  }
} catch {
  console.error('Unable to inspect staged files; commit blocked.');
  failed = true;
}
if (failed) { console.error('Commit blocked by .githooks/pre-commit'); process.exit(1); }
HELEN_NODE
`;
          const status = writeFileSafe(preCommitPath, hookContent, {
            dryRun: opts.dryRun,
            root: cwd,
          });
          if (status === "skipped")
            throw new Error("Could not safely install .githooks/pre-commit");
          if (!opts.dryRun) fs.chmodSync(preCommitPath, 0o755);
          report.fixed.push("Installed .githooks/pre-commit");
        } else if (
          process.platform !== "win32" &&
          (fs.statSync(preCommitPath).mode & 0o111) === 0
        ) {
          const existing = fs.readFileSync(preCommitPath, "utf8");
          if (existing.includes("# HELEN pre-commit:")) {
            if (!opts.dryRun)
              writeAtomicFile(preCommitPath, existing, {
                mode: (fs.statSync(preCommitPath).mode & 0o777) | 0o111,
              });
            report.fixed.push("Made .githooks/pre-commit executable");
          } else {
            report.skipped.push(
              "Preserved existing non-HELEN .githooks/pre-commit",
            );
          }
        }
        if (opts.dryRun && hooks.kind === "unset")
          report.fixed.push("Configured git core.hooksPath to .githooks");
        onHooksReady?.();
      }
    } catch (err: unknown) {
      report.errors.push(
        `Failed to configure git hooks: ${(err as Error)?.message || String(err)}`,
      );
    }
  }

  // 2. Repair .gitignore (.helen/ entry)
  const gitignorePath = path.join(cwd, ".gitignore");
  try {
    if (
      !isSafeProjectPath(cwd, gitignorePath) ||
      (fs.existsSync(gitignorePath) && !fs.lstatSync(gitignorePath).isFile())
    ) {
      throw new Error("Unsafe .gitignore path");
    }
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
      if (!gitignoreContent.includes(".helen")) {
        const updated =
          gitignoreContent.trimEnd() + "\n\n# HELEN local state\n.helen/\n";
        if (!opts.dryRun) {
          writeAtomicFile(gitignorePath, updated);
        }
        report.fixed.push("Added .helen/ to .gitignore");
      }
    }
  } catch (err: unknown) {
    report.errors.push(
      `Failed to update .gitignore: ${(err as Error)?.message || String(err)}`,
    );
  }

  // 3. Repair Dependabot configuration
  const dependabotPath = path.join(cwd, ".github", "dependabot.yml");
  if (!fs.existsSync(dependabotPath)) {
    const dependabotContent = `version: 2\nupdates:\n  - package-ecosystem: "npm"\n    directory: "/"\n    schedule:\n      interval: "weekly"\n    open-pull-requests-limit: 10\n`;
    const status = writeFileSafe(dependabotPath, dependabotContent, {
      dryRun: opts.dryRun,
      root: cwd,
    });
    if (status === "skipped")
      report.errors.push("Could not safely scaffold .github/dependabot.yml");
    else report.fixed.push("Scaffolded .github/dependabot.yml");
  }

  // 4. Update Agent Setup (outdated skills & AGENTS.md)
  try {
    const agentUpdate = updateAgentSetup(cwd, opts.dryRun);
    if (agentUpdate.skills.length > 0) {
      report.fixed.push(
        `Updated ${agentUpdate.skills.length} outdated HELEN skills: ${agentUpdate.skills.join(", ")}`,
      );
    }
    if (agentUpdate.instructionFiles.length > 0) {
      report.fixed.push(
        `Synchronized instruction blocks in: ${agentUpdate.instructionFiles.join(", ")}`,
      );
    }
  } catch (err: unknown) {
    report.errors.push(
      `Failed to update agent setup: ${(err as Error)?.message || String(err)}`,
    );
  }

  // 5. Initialize .helenrc if missing
  const helenrcPath = path.join(cwd, ".helenrc");
  if (!fs.existsSync(helenrcPath)) {
    if (!opts.dryRun) {
      updateConfig(cwd, {
        projectName: project.name,
        framework: project.framework,
        packageManager: project.packageManager,
        installedModules: [],
        createdFiles: [],
      });
    }
    report.fixed.push("Created default .helenrc configuration");
  }

  return report;
}
