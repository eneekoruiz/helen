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
    type: "object";
    properties: Record<string, McpProperty>;
    required?: string[];
  };
}

/** Access policy for a running MCP server (see serverPolicy in mcp.ts). */
export interface McpPolicy {
  roots?: string[];
  allowForce?: boolean;
  allowJobs?: boolean;
}

/**
 * State of one MCP connection. A stdio server serves exactly one client, so whatever the session remembers
 * (the claim tokens it was given) proves that later calls come from the same client.
 */
export interface McpSession {
  claimTokens: Map<string, string>;
}

export function createMcpSession(): McpSession {
  return { claimTokens: new Map() };
}

export interface McpToolContext {
  cwd: string;
  policy?: McpPolicy;
  session: McpSession;
}

/** A tool implemented outside mcp.ts: it receives validated arguments and the already-confined project directory. */
export interface McpToolHandler {
  definition: McpTool;
  run(
    args: Record<string, unknown>,
    context: McpToolContext,
  ): unknown | Promise<unknown>;
}

export function matchesType(value: unknown, type: string): boolean {
  if (type === "array") return Array.isArray(value);
  if (type === "object")
    return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number")
    return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}
