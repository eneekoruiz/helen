# HELEN with the original ECC plugin

HELEN coordinates the authorized goal, project phase, task dossier and acceptance.
[ECC](https://github.com/affaan-m/ECC) supplies its original agents, skills,
commands and provider-specific hooks. HELEN references an exact upstream commit;
it does not maintain copies of ECC's skill library, memory system or agent runtime.

The initial inspected source is ECC 2.2.3, commit
`ef648e01899ba3e8dc6371642deaaf64b4477775`, under the upstream MIT license.
Its canonical directories contain 68 agent definitions, 293 skills and 94
commands. These are available components, not simultaneous processes or a
guarantee that a host supports every component.

## Configure, install and start

From this checkout, use `node dist/cli.js` instead of `helen` after building.

```powershell
helen ecc setup
helen ecc status
helen ecc install --target claude --dry-run
helen ecc install --target claude
helen ecc launch --target claude "Implement the authorized checkout requirements"
```

`setup` adds the project catalogs, native plugin enablement, a short coordination
block in `AGENTS.md` and `CLAUDE.md`, and missing controls in `.env`. It preserves
existing content and rejects conflicting ECC entries and unsafe destinations.
The additive Codex editor preserves unrelated single-line TOML settings; it
rejects multiline TOML strings explicitly rather than risking an incorrect
section insertion. It does not replace the native host's full config validator.
It does not install a model, invoke a model, copy ECC assets, or prove the plugin
is loaded. `status` reports configuration separately from native installation.

`install` uses the installed native CLI's original plugin administration commands.
Claude uses the original `ecc@ecc` plugin at **project scope**. Codex installs
`ecc@helen-integrations` from this project's catalog, whose source points directly
to the original ECC commit. Codex's native install cache belongs to the active
`CODEX_HOME`; the project configuration enables the project marketplace entry.
No Claude-style `--scope` is fabricated for Codex. These install commands can
download plugin assets but do not invoke a model.

Restart the native host after installation. In Codex, review the original ECC
hooks through `/hooks` when native trust is required; installing a plugin is
separate from granting hook trust. HELEN does not bypass that control. The
upstream Codex plugin also declares its Chrome DevTools MCP integration.

`launch` explicitly starts a new native interactive session. It loads only these
allowlisted `.env` controls, with process environment taking precedence:

| Variable | Behavior |
| --- | --- |
| `HELEN_ECC_ENABLED` | Enables the bridge; `false` prevents bridge launch/install. |
| `ECC_HOOK_PROFILE` | Original Claude hook profile: `minimal`, `standard` or `strict`. |
| `ECC_AGENT_DATA_HOME` | Project-local ECC data directory, resolved under `.helen`. |

The launcher forwards the resolved ECC controls and native subscription/auth
configuration. It does not inject arbitrary `.env` values, API keys or app IPC
into the child, or change account billing controls. Native account usage and
permissions still apply. Launching a session consumes the chosen provider's
usage; setup, status and install are separate from this action.
The original v2 instinct store uses its own override; the launcher derives
`CLV2_HOMUNCULUS_DIR` under `ECC_AGENT_DATA_HOME/homunculus` so both original
memory mechanisms remain project-local.

Native clients do not automatically load HELEN's `.env`. Starting `codex` or
`claude` directly can still use the configured plugin, but does not inherit these
project data/profile values unless they were exported. Use `helen ecc launch`
when those controls must apply.

## What activates when the user says "use HELEN"

The generated coordination block tells the foreground agent to reuse the user's
scope and relevant HELEN dossier, select task-relevant original ECC components,
perform authorized implementation, review security and correctness, and verify
the observable acceptance. It is instruction-based routing executed by the host
agent. Installing definitions is not a separate always-running coordinator.

Skills are recipes loaded on demand. The host discovers their names and
descriptions, then can read a relevant skill when the task matches. Explicit
invocation is useful when matching is ambiguous. In Claude, plugin commands use
the `ecc:` namespace, for example `/ecc:plan`, `/ecc:code-review` and `/ecc:verify`.
In Codex, use the installed skill names, for example `$tdd-workflow`,
`$security-review`, `$verification-loop` and `$continuous-agent-loop`, when they
appear in the current host inventory. The host determines the supported syntax.

| Component | Trigger | Example |
| --- | --- | --- |
| Skill | Relevant task or explicit invocation | A feature uses TDD and verification recipes. |
| Agent | A concrete delegation by the coordinator | A reviewer inspects the implementation. |
| Command | Explicit shortcut invocation | A planning command starts the planning workflow. |
| Hook | An enabled, trusted native lifecycle event | SessionStart loads bounded previous context. |
| Learning | Enabled original observation/analysis workflow | Repeated evidenced corrections become instincts or learned recipes. |

HELEN does not load all 293 skills into every task or launch all 68 agents.
Delegate only useful independent specialist work, preserve file ownership and
budgets, and verify integrated results. Automatic skill choice is model-driven;
neither metadata nor a prompt guarantees a particular recipe was executed.

## Update without forking

Inspect the desired upstream revision, then set its exact 40-character commit:

```powershell
helen ecc setup --ref <upstream-commit>
helen ecc install --target claude
# Or, for Codex:
helen ecc install --target codex
```

The catalog and native source declarations are updated together. User settings,
HELEN skills and project data remain separate from upstream plugin assets.
Updates are explicit so a session does not silently change executable hooks.
After updating, verify the actual native plugin version/cache and restart the
host. Reapplying the same plugin version may require the native provider's cache
refresh workflow; registration alone does not prove refreshed asset bytes.

To roll back, set the previously used commit and refresh/reinstall through the
same native provider. This changes the plugin source; it does not roll back
project code, conversations or learned data. Preserve records before any schema
migration required by upstream.

## Actual autonomy and platform limits

Original ECC skills describe loops, team coordination and verification. They
need a running host agent and tools to execute them. A `.env` cannot supply an AI
process, keep a powered-off computer running, guarantee correctness or eliminate
material human decisions.

At the inspected revision, Codex's hook projection contains SessionStart; it
does not reproduce Claude's full PreToolUse/PostToolUse/Stop lifecycle. The v2
learning background observer defaults off, and its documented detached process
does not survive native Windows Job Objects. Use supported foreground learning
or a supported environment when continuous observation is required. HELEN does
not enable a competing observer or claim automatic skill evolution is active.

Configured native integration, plugin installation, actual hook trust, observed
task execution and learned-pattern quality are distinct verification states.
For this integration, deterministic configuration/process tests do not require
model calls. A later account-approved task must verify actual host loading and
the desired workflow before claiming live effectiveness.

Primary references: [ECC native Codex notes](https://github.com/affaan-m/ECC/blob/ef648e01899ba3e8dc6371642deaaf64b4477775/.codex-plugin/README.md),
[OpenAI native plugin packaging](https://developers.openai.com/plugins/build/plugins),
and [Claude plugin installation](https://code.claude.com/docs/en/discover-plugins).
