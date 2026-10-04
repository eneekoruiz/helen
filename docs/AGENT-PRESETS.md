# Reusable agent preset

Acceptance: installation is optional, preview writes nothing, existing instructions and agent settings survive, repeated installation is safe, and tracking helpers never invent progress or bypass checkpoints. Malformed JSON or unsafe destinations fail before preset writes; unsupported configuration merges are skipped with a notice.

From the project directory, preview and then install:

```sh
helen setup --agents codex claude antigravity --preset efficient --dry-run
helen setup --agents codex claude antigravity --preset efficient
```

Choose only the agents you use. This project preset adds HELEN skills, the shared execution instructions, six small tracking helpers and a local HELEN MCP server connection. It preserves existing models, reasoning settings, permissions, secrets and other MCP servers. An existing server named `helen` is preserved; review notices if the installer cannot safely merge a configuration. `--force` applies to bundled skills, never to existing preset helpers or server definitions. The preset cannot be combined with `--global`.

For Codex, any nonempty existing TOML configuration is preserved instead of attempting an incomplete TOML parse. If the notice says the connection was skipped, add HELEN through `codex mcp add helen -- <absolute-node-path> <absolute-helen-dist-cli-path> mcp` and check the resulting connection with `codex mcp list`. Generated helpers always supply the project directory to tools explicitly. Claude and Antigravity JSON configurations are merged only when their structure is compatible, retaining backups of changed files. Keep local configurations and `*.helen-backup` files containing credentials out of source control.

| Agent | Helpers | MCP configuration | Invocation |
| --- | --- | --- | --- |
| Codex | `.agents/skills` | `.codex/config.toml` | `$helen-resume`, or select it through `/skills` where supported |
| Claude Code | `.claude/skills` | `.mcp.json` | `/helen-resume` |
| Antigravity | `.agents/skills` | `.agents/mcp_config.json` | `/helen-resume` |

The helper names are `helen-track`, `helen-status`, `helen-next`, `helen-resume`, `helen-check` and `helen-done`. Use track with your explicit goal, status to inspect progress, next to see the immediate action, resume to recover recorded context, check to run the full gate, and done only after completing the current step. A passing focused test does not count as a full checkpoint. Existing plans are preserved.

For example, ask: “Use helen-track to prepare this project's release”, then “Use helen-resume and continue the recorded plan”. The agent uses the matching MCP tool with an explicit project directory, or runs the CLI if the tool is unavailable. These helpers are instructions, so the agent still needs terminal or MCP access; they are not independent background jobs.

Restart or reload the client as needed and review its normal project trust or MCP permission prompt. Verify the connection with `codex mcp list`, `claude mcp list`, or Antigravity's `/mcp` interface. Local configuration uses absolute Node and HELEN installation paths: regenerate it on another machine instead of sharing those machine-specific paths. Reinstall after relocating HELEN; an existing named connection requires your explicit manual update. Uninstall removes HELEN instructions and skills while retaining MCP configuration to avoid deleting user settings.

Efficiency comes from short helpers, reused context, stable instruction prefixes, focused checks during fixes and optional delegation only when its total benefit exceeds overhead. Model switching and prompt caching depend on the runtime; the preset cannot guarantee cache hits, token savings or response times. Required final checks remain mandatory.

Configuration conventions: [Codex MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), [Codex skills](https://learn.chatgpt.com/docs/build-skills), [Claude skills](https://code.claude.com/docs/en/skills), [Claude MCP](https://code.claude.com/docs/en/mcp), [Antigravity MCP](https://www.antigravity.google/docs/mcp). [Antigravity's migration guide](https://antigravity.google/docs/migration/workflows-to-skills/) documents skill slash commands and retirement of legacy workflows on November 1, 2026; this preset installs skills instead of adding deprecated workflow files.
