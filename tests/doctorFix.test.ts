import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { repairDoctorIssues } from '../src/core/doctorFix.js';

describe('helen doctor --fix', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-doctor-fix-'));
    // Setup basic package.json
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'fix-test', version: '1.0.0' }));
    fs.writeFileSync(path.join(tmp, '.gitignore'), 'node_modules/\n');
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('safely remediates missing configuration files and .gitignore entry', () => {
    const report = repairDoctorIssues(tmp);

    expect(report.fixed.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(tmp, '.helenrc'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, '.github', 'dependabot.yml'))).toBe(true);

    const gitignoreContent = fs.readFileSync(path.join(tmp, '.gitignore'), 'utf-8');
    expect(gitignoreContent).toContain('.helen/');
  });

  it('respects dry-run option without modifying files', () => {
    const dryReport = repairDoctorIssues(tmp, { dryRun: true });

    expect(dryReport.errors.length).toBe(0);
    expect(fs.existsSync(path.join(tmp, '.helenrc'))).toBe(false);
    expect(fs.existsSync(path.join(tmp, '.github', 'dependabot.yml'))).toBe(false);
  });
});
