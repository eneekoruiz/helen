import fs from 'node:fs';
import path from 'node:path';
import { detectProject } from './projectDetector.js';
import { updateAgentSetup } from './agentDoctor.js';
import { writeFileSafe } from './fs.js';
import { updateConfig } from './config.js';
import { activateHooks, ensureHooks } from './gitHooks.js';

export interface DoctorFixReport {
  fixed: string[];
  skipped: string[];
  errors: string[];
}

/**
 * Automatically repairs safe, non-destructive issues detected by helen doctor.
 */
export function repairDoctorIssues(cwd: string = process.cwd(), opts: { dryRun?: boolean } = {}): DoctorFixReport {
  const report: DoctorFixReport = {
    fixed: [],
    skipped: [],
    errors: [],
  };

  const project = detectProject(cwd);

  // 1. Repair git hooks: write missing ones, make every hook executable (git silently ignores the rest), activate them
  if (project.hasGit) {
    try {
      const hooks = ensureHooks(cwd, { dryRun: opts.dryRun });
      for (const name of hooks.created) report.fixed.push(`Installed .githooks/${name}`);
      for (const name of hooks.madeExecutable) report.fixed.push(`Made .githooks/${name} executable (git ignores hooks that are not)`);
      const activation = activateHooks(cwd, { dryRun: opts.dryRun });
      if (activation.changed) report.fixed.push('Configured git core.hooksPath to .githooks');
      else if (activation.note && fs.existsSync(path.join(cwd, '.githooks'))) report.skipped.push(activation.note);
    } catch (err: unknown) {
      report.errors.push(`Failed to configure git hooks: ${(err as Error)?.message || String(err)}`);
    }
  }

  // 2. Repair .gitignore (.helen/ entry)
  const gitignorePath = path.join(cwd, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignoreContent.includes('.helen')) {
      const updated = gitignoreContent.trimEnd() + '\n\n# HELEN local state\n.helen/\n';
      if (!opts.dryRun) {
        fs.writeFileSync(gitignorePath, updated, 'utf-8');
      }
      report.fixed.push('Added .helen/ to .gitignore');
    }
  }

  // 3. Repair Dependabot configuration
  const dependabotPath = path.join(cwd, '.github', 'dependabot.yml');
  if (!fs.existsSync(dependabotPath)) {
    const dependabotContent = `version: 2\nupdates:\n  - package-ecosystem: "npm"\n    directory: "/"\n    schedule:\n      interval: "weekly"\n    open-pull-requests-limit: 10\n`;
    writeFileSafe(dependabotPath, dependabotContent, { dryRun: opts.dryRun });
    report.fixed.push('Scaffolded .github/dependabot.yml');
  }

  // 4. Update Agent Setup (outdated skills & AGENTS.md)
  try {
    const agentUpdate = updateAgentSetup(cwd, opts.dryRun);
    if (agentUpdate.skills.length > 0) {
      report.fixed.push(`Updated ${agentUpdate.skills.length} outdated HELEN skills: ${agentUpdate.skills.join(', ')}`);
    }
    if (agentUpdate.instructionFiles.length > 0) {
      report.fixed.push(`Synchronized instruction blocks in: ${agentUpdate.instructionFiles.join(', ')}`);
    }
  } catch (err: unknown) {
    report.errors.push(`Failed to update agent setup: ${(err as Error)?.message || String(err)}`);
  }

  // 5. Initialize .helenrc if missing
  const helenrcPath = path.join(cwd, '.helenrc');
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
    report.fixed.push('Created default .helenrc configuration');
  }

  return report;
}
