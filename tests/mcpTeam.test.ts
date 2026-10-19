import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ApplyPlan, PlaybookStep } from '../src/core/apply.js';
import { HELEN_MCP_TOOLS, handleToolCall, serverPolicy } from '../src/core/mcp.js';
import { startProgress } from '../src/core/progress.js';

const STEPS: PlaybookStep[] = [
  { kind: 'prompt', ref: 'audit-project-risk-and-architecture', why: 'risks' },
  { kind: 'prompt', ref: 'research-competitive-benchmark', why: 'market' },
  { kind: 'prompt', ref: 'generate-competitive-advantage', why: 'write' },
];
const plan: ApplyPlan = { detection: { phase: '02-building', confidence: 'low', evidence: [] }, goalId: 'test', goal: { title: 'T', description: 'd', keywords: [], steps: STEPS }, installedSkills: [], missingSkills: [] };

const call = async (name: string, args: Record<string, unknown>, policy?: Parameters<typeof handleToolCall>[2]) => {
  const result = await handleToolCall(name, args, policy);
  return { isError: result.isError === true, text: result.content[0]!.text, json: () => JSON.parse(result.content[0]!.text) };
};

describe('HELEN MCP team tools', () => {
  let tmp: string;
  beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-mcp-team-')); startProgress(tmp, plan); });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  it('advertises the coordination tools with typed schemas', () => {
    const names = HELEN_MCP_TOOLS.map(tool => tool.name);
    for (const name of ['helen_team_graph', 'helen_team_claim', 'helen_team_brief', 'helen_team_heartbeat', 'helen_team_complete', 'helen_team_skip', 'helen_team_release', 'helen_team_handoff', 'helen_team_inbox', 'helen_team_events']) {
      expect(names).toContain(name);
    }
    expect(new Set(names).size).toBe(names.length);
    const claim = HELEN_MCP_TOOLS.find(tool => tool.name === 'helen_team_claim')!;
    expect(claim.inputSchema.properties.paths).toMatchObject({ type: 'array', items: { type: 'string' } });
    expect(claim.inputSchema.required).toEqual(['agent']);
  });

  it('two agents get different items, finish them, and the wave advances', async () => {
    const a = (await call('helen_team_claim', { cwd: tmp, agent: 'claude-1' })).json();
    const b = (await call('helen_team_claim', { cwd: tmp, agent: 'codex-1' })).json();
    expect(a.claimed && b.claimed).toBe(true);
    expect(a.item.id).not.toBe(b.item.id);

    const brief = await call('helen_team_brief', { cwd: tmp, agent: 'claude-1', item: a.item.id });
    expect(brief.text).toContain(`HELEN work item ${a.item.id}`);

    const graph = (await call('helen_team_graph', { cwd: tmp })).json();
    expect(graph.counts).toMatchObject({ claimed: 2, blocked: 1 });

    await call('helen_team_heartbeat', { cwd: tmp, agent: 'claude-1', item: a.item.id, ttlSeconds: 600 });
    expect((await call('helen_team_complete', { cwd: tmp, agent: 'claude-1', item: a.item.id, note: 'audited' })).json()).toMatchObject({ completed: a.item.id, finished: false });
    expect((await call('helen_team_complete', { cwd: tmp, agent: 'codex-1', item: b.item.id })).json().ready).toHaveLength(1);
    const writer = (await call('helen_team_claim', { cwd: tmp, agent: 'claude-1' })).json();
    expect(writer.item.readOnly).toBe(false);
    expect(writer.claim.paths).toEqual(['**']);
  });

  it('reports conflicts and nothing-to-claim as results the agent can act on', async () => {
    const first = (await call('helen_team_claim', { cwd: tmp, agent: 'claude-1' })).json();
    const clash = await call('helen_team_claim', { cwd: tmp, agent: 'codex-1', item: first.item.id });
    expect(clash.isError).toBe(true);
    expect(clash.text).toContain('claimed by claude-1');
    await call('helen_team_claim', { cwd: tmp, agent: 'codex-1' });
    const none = (await call('helen_team_claim', { cwd: tmp, agent: 'third' })).json();
    expect(none.claimed).toBe(false);
  });

  it('hands off context between agents and roles, with acknowledgement', async () => {
    const sent = (await call('helen_team_handoff', { cwd: tmp, from: 'claude-1', to: 'role:implementer', message: 'Keep the API stable', files: ['src/api.ts'], next: 'implement' })).json();
    const inbox = (await call('helen_team_inbox', { cwd: tmp, agent: 'codex-9', role: 'implementer' })).json();
    expect(inbox.handoffs.map((h: { id: string }) => h.id)).toEqual([sent.id]);
    expect((await call('helen_team_inbox', { cwd: tmp, agent: 'codex-9', role: 'implementer', ack: sent.id })).json().handoffs).toEqual([]);
    expect((await call('helen_team_events', { cwd: tmp, type: 'handoff*' })).json().events).toHaveLength(2);
  });

  it('validates argument types, including arrays and enums', async () => {
    expect((await call('helen_team_claim', { cwd: tmp, agent: 'a', paths: 'src' })).text).toContain('expected array');
    expect((await call('helen_team_claim', { cwd: tmp, agent: 'a', paths: [1] })).text).toContain('every entry must be a string');
    expect((await call('helen_team_claim', { cwd: tmp, agent: 'a', role: 'boss' })).text).toContain('expected one of');
    expect((await call('helen_team_claim', { cwd: tmp, agent: 'a', ttlSeconds: 1.5 })).text).toContain('expected integer');
    expect((await call('helen_team_claim', { cwd: tmp })).text).toContain('Missing required argument: agent');
  });

  it('applies the server policy: confined directories and no forced checkpoints', async () => {
    const policy = serverPolicy({ cwd: tmp, env: {} });
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-mcp-team-out-'));
    try {
      expect((await call('helen_team_graph', { cwd: outside }, policy)).text).toContain('outside the directories');
      expect((await call('helen_team_graph', { cwd: tmp }, policy)).isError).toBe(false);
      const forced = await call('helen_team_complete', { cwd: tmp, agent: 'a', item: 's01-x', force: true }, policy);
      expect(forced.isError).toBe(true);
      expect(forced.text).toContain('force is disabled');
    } finally { fs.rmSync(outside, { recursive: true, force: true }); }
  });
});
