import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installAgentPreset } from '../src/core/agentPresets.js';

describe('installAgentPreset', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-preset-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('creates the requested helpers and additive agent configs, then is idempotent', () => {
    const result = installAgentPreset({ cwd: tmp, agents: ['codex', 'claude', 'antigravity'] });
    expect(result.created).toHaveLength(15); // 12 helpers, shared once, plus 3 MCP configs
    expect(result.skipped).toEqual([]);
    expect(fs.existsSync(path.join(tmp, '.agents/skills/helen-track/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, '.claude/skills/helen-done/SKILL.md'))).toBe(true);
    const done = fs.readFileSync(path.join(tmp, '.agents/skills/helen-done/SKILL.md'), 'utf8');
    expect(done).toContain('Never pass `force`');
    expect(done).toContain('recorded passing full HELEN `check`');
    expect(fs.readFileSync(path.join(tmp, '.agents/mcp_config.json'), 'utf8')).toContain('"cwd":');

    const second = installAgentPreset({ cwd: tmp, agents: ['codex', 'claude', 'antigravity'] });
    expect(second.created).toEqual([]);
    expect(second.skipped).toHaveLength(15);
    expect(fs.readFileSync(path.join(tmp, '.agents/skills/helen-track/SKILL.md'), 'utf8')).toBeTruthy();
  });

  it('preserves existing settings and helpers while adding only missing MCP entries', () => {
    fs.mkdirSync(path.join(tmp, '.codex'), { recursive: true });
    const toml = '# local setting\nmodel = "keep-me"\n';
    fs.writeFileSync(path.join(tmp, '.codex/config.toml'), toml);
    fs.mkdirSync(path.join(tmp, '.claude/skills/helen-status'), { recursive: true });
    const custom = 'local helper';
    fs.writeFileSync(path.join(tmp, '.claude/skills/helen-status/SKILL.md'), custom);
    fs.writeFileSync(path.join(tmp, '.mcp.json'), JSON.stringify({ other: { kept: true }, mcpServers: { existing: { command: 'keep' } } }));

    const result = installAgentPreset({ cwd: tmp, agents: ['codex', 'claude'] });
    const patchedToml = fs.readFileSync(path.join(tmp, '.codex/config.toml'), 'utf8');
    expect(patchedToml).toBe(toml);
    expect(fs.readFileSync(path.join(tmp, '.claude/skills/helen-status/SKILL.md'), 'utf8')).toBe(custom);
    const mcp = JSON.parse(fs.readFileSync(path.join(tmp, '.mcp.json'), 'utf8')) as { other: { kept: boolean }; mcpServers: Record<string, { cwd?: string }> };
    expect(mcp.other).toEqual({ kept: true });
    expect(mcp.mcpServers.existing).toEqual({ command: 'keep' });
    expect(mcp.mcpServers.helen).toBeTruthy();
    expect(mcp.mcpServers.helen.cwd).toBeUndefined();
    expect(result.skipped).toContain('.claude/skills/helen-status/SKILL.md');
    expect(result.skipped).toContain('.codex/config.toml');
    expect(result.notices).toContain('Skipped .codex/config.toml: existing Codex TOML preserved; add the HELEN MCP table manually.');
  });

  it('dry-runs without creating files or directories', () => {
    const result = installAgentPreset({ cwd: tmp, agents: ['claude', 'antigravity'], dryRun: true });
    expect(result.created).toHaveLength(14);
    expect(fs.readdirSync(tmp)).toEqual([]);
  });

  it('preserves existing HELEN connections byte for byte', () => {
    const content = '{"mcpServers":{"helen":{"command":"custom"}},"local":true}\n';
    fs.writeFileSync(path.join(tmp, '.mcp.json'), content);
    const result = installAgentPreset({ cwd: tmp, agents: ['claude'] });
    expect(result.skipped).toContain('.mcp.json');
    expect(fs.readFileSync(path.join(tmp, '.mcp.json'), 'utf8')).toBe(content);
    expect(fs.existsSync(path.join(tmp, '.mcp.json.helen-backup'))).toBe(false);
  });

  it('rejects oversized configurations before helper writes', () => {
    fs.writeFileSync(path.join(tmp, '.mcp.json'), ' '.repeat(256 * 1024 + 1));
    expect(() => installAgentPreset({ cwd: tmp, agents: ['claude'] })).toThrow('256 KiB');
    expect(fs.readdirSync(tmp)).toEqual(['.mcp.json']);
  });

  it('rejects malformed JSON before making any planned helper writes', () => {
    fs.writeFileSync(path.join(tmp, '.mcp.json'), '{broken');
    expect(() => installAgentPreset({ cwd: tmp, agents: ['claude'] })).toThrow('Malformed JSON agent config');
    expect(fs.readdirSync(tmp)).toEqual(['.mcp.json']);
  });

  it('fails closed on a symlink destination without writing through it', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-preset-outside-'));
    try {
      fs.mkdirSync(path.join(tmp, '.claude/skills'), { recursive: true });
      fs.symlinkSync(outside, path.join(tmp, '.claude/skills/helen-track'), 'junction');
      expect(() => installAgentPreset({ cwd: tmp, agents: ['claude'] })).toThrow('Unsafe preset destination');
      expect(fs.readdirSync(outside)).toEqual([]);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it('launches the generated Codex MCP command and exposes HELEN tools', () => {
    const result = installAgentPreset({ cwd: tmp, agents: ['codex'] });
    expect(result.created).toContain('.codex/config.toml');
    const config = fs.readFileSync(path.join(tmp, '.codex/config.toml'), 'utf8');
    const cliPath = JSON.parse(config.match(/^args = \[(".*?"), "mcp"\]$/m)![1]) as string;
    const child = spawnSync(process.execPath, [cliPath, 'mcp'], {
      cwd: tmp,
      input: `${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1' } } })}\n${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' })}\n`,
      encoding: 'utf8',
      timeout: 5000,
    });
    expect(child.error).toBeUndefined();
    expect(child.status).toBe(0);
    const replies = child.stdout.trim().split(/\r?\n/).map(line => JSON.parse(line) as { id: number; result?: { tools?: Array<{ name: string }> } });
    expect(replies.map(reply => reply.id)).toEqual([1, 2]);
    expect(replies[1].result?.tools?.map(tool => tool.name)).toContain('helen_status');
  });
});
