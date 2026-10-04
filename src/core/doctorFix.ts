import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { detectProject } from './projectDetector.js';
import { updateAgentSetup } from './agentDoctor.js';
import { writeFileSafe } from './fs.js';
import { updateConfig } from './config.js';

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

  // 1. Repair Git hooks if git is initialized
  if (project.hasGit) {
    try {
      const githooksDir = path.join(cwd, '.githooks');
      if (!fs.existsSync(githooksDir)) {
        if (!opts.dryRun) fs.mkdirSync(githooksDir, { recursive: true });
      }

      // Configure git hooksPath
      try {
        const currentHooks = execSync('git config core.hooksPath', { cwd, encoding: 'utf-8' }).trim();
        if (currentHooks !== '.githooks') {
          if (!opts.dryRun) execSync('git config core.hooksPath .githooks', { cwd, stdio: 'ignore' });
          report.fixed.push('Configured git core.hooksPath to .githooks');
        }
      } catch {
        // Not configured yet
        if (!opts.dryRun) execSync('git config core.hooksPath .githooks', { cwd, stdio: 'ignore' });
        report.fixed.push('Configured git core.hooksPath to .githooks');
      }

      // Pre-commit hook
      const preCommitPath = path.join(githooksDir, 'pre-commit');
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
        writeFileSafe(preCommitPath, hookContent, { dryRun: opts.dryRun });
        report.fixed.push('Installed .githooks/pre-commit');
      }
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
