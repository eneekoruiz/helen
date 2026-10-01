import { describe, expect, it } from 'vitest';
import { HELEN_MCP_TOOLS, handleToolCall, startMcpServer } from '../src/core/mcp.js';
import { PassThrough } from 'node:stream';

describe('HELEN MCP Server & Tools', () => {
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
});
