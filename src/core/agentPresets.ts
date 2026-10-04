import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSafeProjectPath, writeFileSafe } from './fs.js';

export type AgentPreset = 'codex' | 'claude' | 'antigravity';

export interface InstallAgentPresetOptions {
  cwd: string;
  agents: AgentPreset[];
  dryRun?: boolean;
}

export interface InstallAgentPresetResult {
  created: string[];
  skipped: string[];
  notices: string[];
}

const MAX_CONFIG_BYTES = 256 * 1024;
const HELPER_NAMES = ['helen-track', 'helen-status', 'helen-next', 'helen-resume', 'helen-check', 'helen-done'] as const;
const CLI_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist', 'cli.js');

const helperBodies: Record<(typeof HELPER_NAMES)[number], { description: string; instruction: string }> = {
  'helen-track': {
    description: 'Start or track a HELEN plan for the user’s requested project goal while preserving existing progress.',
    instruction: 'Use the requested goal with `helen_apply` and `track: true`. Never pass `force`; if a plan is already active, preserve it and report that state. Keep the user’s stated scope and acceptance criteria intact.',
  },
  'helen-status': {
    description: 'Read the current HELEN project phase and tracked plan without changing project state.',
    instruction: 'Call `helen_status` to inspect the phase, active plan, completed work, and checkpoints. Treat this as read-only and summarize what is recorded.',
  },
  'helen-next': {
    description: 'Read the next action in the active HELEN plan without changing project state.',
    instruction: 'Call `helen_next` and report the immediate action and its acceptance requirements. Treat this as read-only; do not mark anything complete.',
  },
  'helen-resume': {
    description: 'Resume the recorded HELEN plan and decisions while retaining its existing scope.',
    instruction: 'Call `helen_resume`. Supply a decision only when the user explicitly provided that decision in this conversation. Preserve the current plan and its acceptance criteria.',
  },
  'helen-check': {
    description: 'Run the full HELEN verification gate and record checkpoint-eligible results.',
    instruction: 'Run the HELEN CLI `check` command with no focused files or selected scripts so the full gate runs. Report the actual result; partial checks never qualify as a checkpoint.',
  },
  'helen-done': {
    description: 'Record HELEN plan work as complete only after it is actually finished and eligible.',
    instruction: 'Call `helen_done` only after the current task is actually complete. Never pass `force`. For a checkpoint, require a recorded passing full HELEN `check`; never treat partial checks as a checkpoint.',
  },
};

function skillContent(name: (typeof HELPER_NAMES)[number]): string {
  const { description, instruction } = helperBodies[name];
  const fallbackArgs = name === 'helen-track' ? '["apply", goal, "--track"]' :
    name === 'helen-status' ? '["status"]' :
      name === 'helen-next' ? '["next"]' :
        name === 'helen-resume' ? '["resume"]' :
          name === 'helen-check' ? '["check"]' : '["done"]';
  const mcpTool = name === 'helen-track' ? '`helen_apply` with `track: true`' :
    name === 'helen-status' ? '`helen_status`' :
      name === 'helen-next' ? '`helen_next`' :
        name === 'helen-resume' ? '`helen_resume`' :
          name === 'helen-done' ? '`helen_done`' : 'no MCP tool is available for this action';
  const toolInstruction = name === 'helen-check' ? 'This action requires terminal access; HELEN does not expose an MCP check tool.' : `When using HELEN MCP, pass the project directory explicitly as cwd to ${mcpTool}.`;
  return `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n\n${instruction}\n\n${toolInstruction} For CLI execution, use a process argument array (never a shell command): [${JSON.stringify(process.execPath)}, ${JSON.stringify(CLI_PATH)}, ...${fallbackArgs}]. Keep each absolute path as its own argument even when it contains spaces, and set the process working directory to the same project directory. Do not claim a command ran unless its result is available. Keep the user’s stated scope and acceptance criteria intact.\n`;
}

function relative(cwd: string, absolute: string): string {
  return path.relative(cwd, absolute).split(path.sep).join('/');
}

function preflightPath(cwd: string, filePath: string, isConfig: boolean): { exists: boolean; content?: string } {
  if (!isSafeProjectPath(cwd, filePath)) throw new Error(`Unsafe preset destination: ${relative(cwd, filePath)}`);
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { exists: false };
    throw error;
  }
  if (!stat.isFile()) throw new Error(`Preset destination must be a regular file: ${relative(cwd, filePath)}`);
  if (!isConfig) return { exists: true };
  if (stat.size > MAX_CONFIG_BYTES) throw new Error(`Config exceeds the 256 KiB preset read limit: ${relative(cwd, filePath)}`);
  return { exists: true, content: fs.readFileSync(filePath, 'utf8') };
}

function mcpConfig(): Record<string, unknown> {
  return { command: process.execPath, args: [CLI_PATH, 'mcp'] };
}

function jsonConfigPlan(cwd: string, filePath: string, result: InstallAgentPresetResult, withCwd: boolean): { path: string; content: string } | undefined {
  const preflight = preflightPath(cwd, filePath, true);
  let parsed: Record<string, unknown> = {};
  if (preflight.exists) {
    try {
      const value: unknown = JSON.parse(preflight.content!);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('root must be an object');
      parsed = value as Record<string, unknown>;
    } catch {
      throw new Error(`Malformed JSON agent config: ${relative(cwd, filePath)}`);
    }
  }
  const key = 'mcpServers';
  const serverMap = parsed[key];
  if (serverMap !== undefined && (!serverMap || typeof serverMap !== 'object' || Array.isArray(serverMap))) {
    result.notices.push(`Skipped ${relative(cwd, filePath)}: existing mcpServers value is not an object.`);
    result.skipped.push(relative(cwd, filePath));
    return undefined;
  }
  const servers = (serverMap ?? {}) as Record<string, unknown>;
  if (Object.hasOwn(servers, 'helen')) {
    result.skipped.push(relative(cwd, filePath));
    return undefined;
  }
  parsed[key] = { ...servers, helen: { ...mcpConfig(), ...(withCwd ? { cwd } : {}) } };
  return { path: filePath, content: `${JSON.stringify(parsed, null, 2)}\n` };
}

function tomlConfigPlan(cwd: string, filePath: string, result: InstallAgentPresetResult): { path: string; content: string } | undefined {
  const preflight = preflightPath(cwd, filePath, true);
  const current = preflight.content ?? '';
  if (current.trim().length > 0) {
    const hasHelen = /^\s*\[mcp_servers\.(?:"helen"|helen)\]\s*(?:#.*)?$/m.test(current);
    if (!hasHelen) result.notices.push(`Skipped ${relative(cwd, filePath)}: existing Codex TOML preserved; add the HELEN MCP table manually.`);
    result.skipped.push(relative(cwd, filePath));
    return undefined;
  }
  const config = `[mcp_servers.helen]\ncommand = ${JSON.stringify(process.execPath)}\nargs = [${JSON.stringify(CLI_PATH)}, "mcp"]\ncwd = ${JSON.stringify(cwd)}\n`;
  const content = current.length === 0 ? config : `${current}${current.endsWith('\n') ? '' : '\n'}\n${config}`;
  return { path: filePath, content };
}

/** Install small HELEN progress helpers and an additive project MCP config for selected agents. */
export function installAgentPreset(options: InstallAgentPresetOptions): InstallAgentPresetResult {
  const cwd = path.resolve(options.cwd);
  if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) throw new Error(`Project directory does not exist: ${cwd}`);
  const result: InstallAgentPresetResult = { created: [], skipped: [], notices: [] };
  const agents = [...new Set(options.agents)];
  const skillRoots = new Set<string>();
  if (agents.includes('claude')) skillRoots.add('.claude/skills');
  if (agents.includes('codex') || agents.includes('antigravity')) skillRoots.add('.agents/skills');

  const planned: Array<{ path: string; content: string; config?: boolean }> = [];
  // Complete all safety and content preflight before the first write.
  for (const root of skillRoots) {
    for (const name of HELPER_NAMES) {
      const destination = path.join(cwd, root, name, 'SKILL.md');
      preflightPath(cwd, destination, false);
      preflightPath(cwd, `${destination}.helen-backup`, false);
      planned.push({ path: destination, content: skillContent(name) });
    }
  }
  const configPlans: Array<{ path: string; content: string } | undefined> = [];
  if (agents.includes('codex')) configPlans.push(tomlConfigPlan(cwd, path.join(cwd, '.codex', 'config.toml'), result));
  if (agents.includes('claude')) configPlans.push(jsonConfigPlan(cwd, path.join(cwd, '.mcp.json'), result, false));
  if (agents.includes('antigravity')) configPlans.push(jsonConfigPlan(cwd, path.join(cwd, '.agents', 'mcp_config.json'), result, true));
  const configItems = configPlans.filter((plan): plan is { path: string; content: string } => Boolean(plan));
  for (const config of configItems) {
    preflightPath(cwd, `${config.path}.helen-backup`, false);
    planned.push({ ...config, config: true });
  }

  for (const item of planned) {
    const status = writeFileSafe(item.path, item.content, { dryRun: options.dryRun, force: item.config, root: cwd });
    const target = relative(cwd, item.path);
    if (status === 'created' || status === 'overwritten') result.created.push(target);
    else if (status === 'skipped') result.skipped.push(target);
  }
  return result;
}
