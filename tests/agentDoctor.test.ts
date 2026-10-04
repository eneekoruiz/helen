import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findInlineSecrets, installedHelenSkills, runAgentDoctor, updateAgentSetup } from '../src/core/agentDoctor.js';
import { setupProject } from '../src/core/setup.js';

describe('HELEN doctor and update', () => {
  let tmp: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-doctor-'));
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const labels = (checks: ReturnType<typeof runAgentDoctor>) => checks.map(check => `${check.status} ${check.label}`);

  it('asks for setup in a project without HELEN', () => {
    const checks = runAgentDoctor(tmp);
    expect(labels(checks)).toContain('warn HELEN skills');
    expect(labels(checks)).toContain('warn AGENTS.md');
  });

  it('is clean right after setup', () => {
    setupProject({ cwd: tmp, agents: ['claude', 'codex'] });
    const checks = runAgentDoctor(tmp);
    expect(checks.filter(check => check.status !== 'ok')).toEqual([]);
    expect(installedHelenSkills(tmp).some(skill => skill.name === 'helen-apply')).toBe(true);
  });

  it('detects outdated skills and blocks, and update fixes them', () => {
    setupProject({ cwd: tmp, agents: ['claude'] });
    fs.appendFileSync(path.join(tmp, '.claude/skills/helen-apply/SKILL.md'), '\nlocal edit\n');
    const agents = path.join(tmp, 'AGENTS.md');
    fs.writeFileSync(agents, fs.readFileSync(agents, 'utf-8').replace('## HELEN', '## HELEN (old)'));

    expect(labels(runAgentDoctor(tmp))).toContain('warn Skill versions');
    expect(labels(runAgentDoctor(tmp))).toContain('warn AGENTS.md');

    const result = updateAgentSetup(tmp);
    expect(result.skills).toContain('.claude/skills/helen-apply');
    expect(result.instructionFiles).toContain('AGENTS.md');
    expect(runAgentDoctor(tmp).filter(check => check.status !== 'ok')).toEqual([]);
    expect(updateAgentSetup(tmp)).toEqual({ skills: [], instructionFiles: [] });
  });

  it('flags inline secrets in MCP configs but accepts environment references', () => {
    expect(findInlineSecrets('{"env": {"GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_abcdefghijklmnop1234"}}')).toEqual(['GITHUB_PERSONAL_ACCESS_TOKEN']);
    expect(findInlineSecrets('{"env": {"GITHUB_PERSONAL_ACCESS_TOKEN": "${input:github_token}"}}')).toEqual([]);
    expect(findInlineSecrets('{"url": "https://mcp.vercel.com/some/long/path"}')).toEqual([]);

    fs.writeFileSync(path.join(tmp, '.mcp.json'), '{"mcpServers":{"x":{"env":{"API_KEY":"sk-live-1234567890abcdef"}}}}');
    expect(labels(runAgentDoctor(tmp))).toContain('error MCP config .mcp.json');
  });

  it('reports a tracked plan and an unignored .helen folder', () => {
    fs.mkdirSync(path.join(tmp, '.helen'));
    fs.writeFileSync(path.join(tmp, '.helen/progress.json'), JSON.stringify({ goal: 'design', title: 'x', phase: '03', startedAt: new Date().toISOString(), steps: [{ kind: 'prompt', ref: 'a', why: '', status: 'pending' }] }));
    const checks = labels(runAgentDoctor(tmp));
    expect(checks).toContain('ok Tracked plan');
    expect(checks).toContain('warn .gitignore');
  });

  it('reports corrupt tracking without overwriting it or losing other diagnostics', () => {
    fs.mkdirSync(path.join(tmp, '.helen'));
    const file = path.join(tmp, '.helen/progress.json');
    fs.writeFileSync(file, '{broken');
    const checks = runAgentDoctor(tmp);
    expect(labels(checks)).toContain('error Tracked plan');
    expect(labels(checks)).toContain('warn .gitignore');
    expect(fs.readFileSync(file, 'utf-8')).toBe('{broken');
  });
});
