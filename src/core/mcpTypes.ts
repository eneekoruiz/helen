export interface McpProperty {
  type: string;
  description: string;
  items?: { type: string };
  enum?: string[];
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, McpProperty>;
    required?: string[];
  };
}

/** Access policy for a running MCP server (see serverPolicy in mcp.ts). */
export interface McpPolicy {
  roots?: string[];
  allowForce?: boolean;
}

/** A tool implemented outside mcp.ts: it receives validated arguments and the already-confined project directory. */
export interface McpToolHandler {
  definition: McpTool;
  run(args: Record<string, unknown>, context: { cwd: string; policy?: McpPolicy }): unknown | Promise<unknown>;
}

export function matchesType(value: unknown, type: string): boolean {
  if (type === 'array') return Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === type;
}
