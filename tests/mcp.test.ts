import { describe, expect, it, vi } from 'vitest';
import { HELEN_MCP_TOOLS, handleToolCall, startMcpServer } from '../src/core/mcp.js';
import { PassThrough } from 'node:stream';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { installSkills } from '../src/core/skills.js';
import { runChecks } from '../src/core/progress.js';

describe('HELEN MCP Server & Tools', () => {
  it('keeps initialization diagnostics off protocol stdout', async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-mcp-logs-'));
    const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await handleToolCall('helen_init_project', { cwd, dryRun: true });
      expect(result.isError).not.toBe(true);
      expect(stdout).not.toHaveBeenCalled();
      expect(stderr).toHaveBeenCalled();
    } finally { stdout.mockRestore(); stderr.mockRestore(); fs.rmSync(cwd, { recursive: true, force: true }); }
  });

  it('includes agent setup diagnostics in MCP doctor results', async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-mcp-doctor-'));
    try {
      const result = await handleToolCall('helen_doctor', { cwd });
      const report = JSON.parse(result.content[0].text);
      expect(report.issues).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'HELEN skills' })]));
    } finally { fs.rmSync(cwd, { recursive: true, force: true }); }
  });
  it('exposes the standard suite of HELEN tools', () => {
    const names = HELEN_MCP_TOOLS.map(t => t.name);
    expect(names).toContain('helen_status');
    expect(names).toContain('helen_next');
    expect(names).toContain('helen_done');
    expect(names).toContain('helen_apply');
    expect(names).toContain('helen_doctor');
    expect(names).toContain('helen_prompt_get');
    expect(names).toContain('helen_skills_list');
    expect(names).toContain('helen_init_project');
    expect(names).toContain('helen_resume');
  });

  it('exports concise briefs and resumes with current or stale verification', async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-mcp-resume-'));
    try {
      fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ scripts: { test: 'test' } }));
      const applied = await handleToolCall('helen_apply', { cwd, goal: 'quality', track: true, brief: true, profile: 'quick' });
      expect(applied.isError).not.toBe(true);
      expect(JSON.parse(applied.content[0].text).brief).toContain('Explicit profile: quick');
      runChecks(cwd, () => true);
      const resumed = await handleToolCall('helen_resume', { cwd, decision: 'Keep public interfaces stable' });
      expect(JSON.parse(resumed.content[0].text).verification).toBe('current');
      fs.writeFileSync(path.join(cwd, 'changed.ts'), 'changed');
      const status = await handleToolCall('helen_status', { cwd });
      expect(JSON.parse(status.content[0].text).verification).toBe('stale');
      expect((await handleToolCall('helen_resume', { cwd, decision: 42 })).isError).toBe(true);
    } finally { fs.rmSync(cwd, { recursive: true, force: true }); }
  });

  it('handles helen_skills_list tool call', async () => {
    const res = await handleToolCall('helen_skills_list', {});
    expect(res.isError).toBeFalsy();
    const data = JSON.parse(res.content[0].text);
    expect(Array.isArray(data)).toBe(true);
    expect(data.some((s: any) => s.name === 'helen-apply')).toBe(true);
    expect(data.some((s: any) => s.name === 'helen-audit')).toBe(true);
  });

  it('handles helen_prompt_get tool call by promptId', async () => {
    const res = await handleToolCall('helen_prompt_get', { promptId: 'master' });
    expect(res.isError).toBeFalsy();
    expect(res.content[0].text).toContain('HELEN');
  });

  it('handles helen_apply tool call to preview playbook steps', async () => {
    const res = await handleToolCall('helen_apply', { goal: 'strategy', track: false });
    expect(res.isError).toBeFalsy();
    const data = JSON.parse(res.content[0].text);
    expect(data.goal).toBe('strategy');
    expect(data.steps.length).toBeGreaterThan(0);
  });

  it('returns skill trigger descriptions and installation status for the requested cwd', async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-mcp-skills-'));
    try {
      installSkills({ cwd, targets: ['codex'], skills: ['helen-audit'] });
      const res = await handleToolCall('helen_skills_list', { cwd });
      expect(res.isError).toBeFalsy();
      const skills = JSON.parse(res.content[0].text) as Array<{ name: string; description: string; installed: boolean }>;
      expect(skills.find(skill => skill.name === 'helen-audit')).toMatchObject({ installed: true });
      expect(skills.find(skill => skill.name === 'helen-audit')!.description.length).toBeGreaterThan(50);
      expect(skills.find(skill => skill.name === 'helen-design')).toMatchObject({ installed: false });
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('rejects string booleans before they can force completion or tracking', async () => {
    const res = await handleToolCall('helen_done', { force: 'false' });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('expected boolean');
  });

  it('honors a zero result limit and rejects negative limits', async () => {
    expect(JSON.parse((await handleToolCall('helen_prompt_get', { limit: 0 })).content[0].text)).toEqual([]);
    expect((await handleToolCall('helen_prompt_get', { limit: -1 })).isError).toBe(true);
  });

  it('exports cache-ready instructions consistently and validates the option', async () => {
    const result = await handleToolCall('helen_prompt_get', { promptId: 'audit-code-quality', cacheReady: true });
    expect(result.isError).not.toBe(true);
    expect(result.content[0].text.startsWith('**HELEN execution contract**')).toBe(true);
    const compact = await handleToolCall('helen_prompt_get', { promptId: 'audit-code-quality', cacheReady: true, protocol: false });
    expect(compact.content[0].text).not.toContain('HELEN execution contract');
    expect((await handleToolCall('helen_prompt_get', { promptId: 'audit-code-quality', cacheReady: 'true' })).isError).toBe(true);
  });

  it('preserves an active tracked plan when applying another goal', async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-mcp-'));
    try {
      expect((await handleToolCall('helen_apply', { cwd, goal: 'strategy', track: true })).isError).toBeFalsy();
      expect((await handleToolCall('helen_apply', { cwd, goal: 'design', track: true })).isError).toBe(true);
      const progress = JSON.parse(fs.readFileSync(path.join(cwd, '.helen', 'progress.json'), 'utf-8'));
      expect(progress.goal).toBe('strategy');
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('responds to invalid requests and continues processing valid requests', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    startMcpServer(input, output);
    const responses: Array<{ id: number | null; error?: { code: number }; result?: unknown }> = [];
    output.on('data', chunk => responses.push(JSON.parse(chunk.toString())));
    input.write('null\n[]\n42\n');
    input.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'helen_done', arguments: [] } }) + '\n');
    input.write(JSON.stringify({ jsonrpc: '2.0', id: null, method: 'ping' }) + '\n');
    input.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'ping' }) + '\n');
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(responses.slice(0, 3).map(r => r.error?.code)).toEqual([-32600, -32600, -32600]);
    expect(responses[3].error?.code).toBe(-32602);
    expect(responses[4]).toMatchObject({ id: null, result: {} });
    expect(responses[5]).toMatchObject({ id: 2, result: {} });
    input.end();
  });

  it('processes JSON-RPC 2.0 messages over streams', async () => {
    const input = new PassThrough();
    const output = new PassThrough();

    startMcpServer(input, output);

    const responses: any[] = [];
    output.on('data', chunk => {
      const lines = chunk.toString().trim().split('\n');
      for (const line of lines) {
        if (line) responses.push(JSON.parse(line));
      }
    });

    // 1. initialize
    input.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }) + '\n');
    await new Promise(r => setTimeout(r, 50));

    expect(responses.length).toBe(1);
    expect(responses[0].id).toBe(1);
    expect(responses[0].result.serverInfo.name).toBe('helen-mcp-server');

    // 2. tools/list
    input.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n');
    await new Promise(r => setTimeout(r, 50));

    expect(responses.length).toBe(2);
    expect(responses[1].id).toBe(2);
    expect(responses[1].result.tools.length).toBeGreaterThanOrEqual(8);

    // 3. tools/call
    input.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'helen_skills_list', arguments: {} }
    }) + '\n');
    await new Promise(r => setTimeout(r, 50));

    expect(responses.length).toBe(3);
    expect(responses[2].id).toBe(3);
    expect(responses[2].result.content).toBeDefined();
  });
  it('tolerates explicit undefined optional arguments without failing schema validation', async () => {
    const result = await handleToolCall('helen_status', { cwd: undefined });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('tracked');
  });
});
