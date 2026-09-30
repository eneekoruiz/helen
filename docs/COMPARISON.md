# HELEN Tool Comparison & Positioning

Honest comparison of HELEN with existing agent frameworks, code generators, and scaffolding tools.

## Comparison Matrix

| Feature | HELEN | Generic Scaffolder | Raw Prompts Repo |
|---|---|---|---|
| **Lifecycle Awareness** | Yes (9-phase detection) | No | No |
| **Strict Quality Gates** | Built-in (`helen check`) | No | Manual |
| **Native MCP Server** | Yes (`helen mcp` JSON-RPC) | No | No |
| **Multi-Agent Rules** | Antigravity, Claude, Codex | Single target | None |
| **Zero Telemetry** | Guaranteed zero tracking | Varies | Yes |
| **Deterministic Safeguards**| Auto-stops on failures | No | No |

## When to Use HELEN
- When you want continuous engineering quality across the entire project lifecycle, from initial scaffolding to client handoff and long-term maintenance.
- When working with autonomous AI agents that need deterministic guidance rather than vague prompts.
