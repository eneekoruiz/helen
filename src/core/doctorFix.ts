import fs from "node:fs";
import path from "node:path";
import { detectProject } from "./projectDetector.js";
import { updateAgentSetup } from "./agentDoctor.js";
import { isSafeProjectPath, writeFileSafe } from "./fs.js";
import { ensureHooks } from "./gitHooks.js";
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

        // Write the hooks that are missing, make every hook executable (git silently ignores the rest).
        const installed = ensureHooks(cwd, { dryRun: opts.dryRun });
        for (const name of installed.created)
          report.fixed.push(`Installed .githooks/${name}`);
        for (const name of installed.madeExecutable)
          report.fixed.push(`Made .githooks/${name} executable`);
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
