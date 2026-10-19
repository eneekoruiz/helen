import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { heartbeatClaim } from './claims.js';
import { appendEvent } from './events.js';
import { buildWorkGraph, claimWorkItem, completeWorkItem, formatItemBrief, releaseWorkItem, resultFile, workDir, type WorkGraph, type WorkItem } from './orchestrate.js';
import { runChecks, type CheckRun } from './progress.js';

/**
 * `helen team run`: drive a tracked plan to the end with worker agents.
 *
 * HELEN does not run a model itself. It claims each ready item, hands the worker (any command that
 * reads a prompt on stdin, such as `claude -p`) a complete brief, keeps the lease alive, and completes
 * the item. Read-only work of one wave runs in parallel; writers and checkpoints run alone. Checkpoints
 * are verified by HELEN itself with the project's own scripts: a worker's word is never enough.
 */
export interface TeamRunOptions {
  cwd: string;
  /** argv of the worker; the brief is written to its stdin and also to $HELEN_BRIEF_FILE. */
  command: string[] | ((item: WorkItem) => string[]);
  concurrency?: number;
  ttlSeconds?: number;
  timeoutMs?: number;
  retries?: number;
  agentPrefix?: string;
  /** Stop after this many worker runs (a runaway guard). */
  maxRuns?: number;
  env?: NodeJS.ProcessEnv;
  /** Verifies a checkpoint. Defaults to the project's own typecheck, lint, test and build. */
  verify?: (cwd: string) => CheckRun;
  log?: (message: string) => void;
}

export interface TeamRunResult {
  completed: string[];
  failed: Array<{ item: string; reason: string }>;
  /** Items the run could not do on its own, with the reason (approval needed, checkpoint failing...). */
  stopped?: { item: string; reason: string };
  finished: boolean;
  runs: number;
  graph: WorkGraph;
}

const OUTPUT_TAIL = 64 * 1024;
const LOG_LIMIT = 1024 * 1024;

/** Split a command line into arguments, honoring quotes. No shell is involved. */
export function splitCommand(line: string): string[] {
  const args: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let started = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (quote) {
      if (char === quote) quote = null;
      else if (char === '\\' && quote === '"' && (line[i + 1] === '"' || line[i + 1] === '\\')) current += line[++i];
      else current += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started || current) args.push(current);
      current = '';
      started = false;
    } else {
      current += char;
      started = true;
    }
  }
  if (quote) throw new Error('Unterminated quote in the agent command.');
  if (started || current) args.push(current);
  return args;
}

/** Presets are inspectable data, not magic: `--dry-run` prints exactly what would run. */
export function presetCommand(name: string, item: WorkItem): string[] {
  if (name === 'claude') {
    // Print mode cannot ask for permission, so grant only what the item needs.
    return item.readOnly
      ? ['claude', '-p', '--allowedTools', 'Read', 'Glob', 'Grep']
      : ['claude', '-p', '--permission-mode', 'acceptEdits', '--allowedTools', 'Read', 'Glob', 'Grep', 'Edit', 'Write'];
  }
  throw new Error(`Unknown agent preset "${name}". Available: claude. For any other agent pass --command "<program and arguments>".`);
}

interface WorkerOutcome {
  ok: boolean;
  code: number | null;
  timedOut: boolean;
  output: string;
}

function runWorker(options: {
  cwd: string; argv: string[]; item: WorkItem; agent: string; brief: string; timeoutMs: number; env: NodeJS.ProcessEnv; onHeartbeat: () => void; heartbeatMs: number;
}): Promise<WorkerOutcome> {
  const dir = workDir(options.cwd, options.item.id);
  fs.mkdirSync(dir, { recursive: true });
  const briefFile = path.join(dir, 'brief.md');
  fs.writeFileSync(briefFile, options.brief, { mode: 0o600 });
  return new Promise(resolve => {
    const [program, ...args] = options.argv;
    let output = '';
    let settled = false;
    const finish = (outcome: WorkerOutcome): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(beat);
      try {
        fs.writeFileSync(path.join(dir, 'agent.log'), outcome.output.slice(-LOG_LIMIT), { mode: 0o600 });
      } catch {
        // The log is a convenience.
      }
      resolve(outcome);
    };
    let child;
    try {
      child = spawn(program!, args, {
        cwd: options.cwd, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
        env: { ...process.env, ...options.env, HELEN_ITEM: options.item.id, HELEN_AGENT: options.agent, HELEN_PROJECT: options.cwd, HELEN_BRIEF_FILE: briefFile },
      });
    } catch (error) {
      resolve({ ok: false, code: null, timedOut: false, output: `Could not start "${program}": ${(error as Error).message}` });
      return;
    }
    const collect = (chunk: Buffer): void => {
      output += chunk.toString('utf8');
      if (output.length > OUTPUT_TAIL * 4) output = output.slice(-OUTPUT_TAIL * 2);
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.stdin.on('error', () => { /* the worker may exit without reading its prompt */ });
    child.stdin.end(options.brief);
    const beat = setInterval(options.onHeartbeat, options.heartbeatMs);
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5000).unref();
      finish({ ok: false, code: null, timedOut: true, output: `${output}\n[helen] timed out after ${Math.round(options.timeoutMs / 1000)} s` });
    }, options.timeoutMs);
    child.on('error', error => finish({ ok: false, code: null, timedOut: false, output: `${output}\n[helen] ${error.message}` }));
    child.on('close', code => finish({ ok: code === 0, code, timedOut: false, output }));
  });
}

/** A worker that only printed its answer still leaves a result for the next wave to read. */
function ensureResult(cwd: string, item: WorkItem, output: string): void {
  const file = resultFile(cwd, item.id);
  if (fs.existsSync(file)) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const body = output.trim().slice(-OUTPUT_TAIL);
  fs.writeFileSync(file, `# ${item.id}\n\n(Captured from the worker's output: it did not write this file itself.)\n\n${body}\n`, { mode: 0o600 });
}

export async function runTeam(options: TeamRunOptions): Promise<TeamRunResult> {
  const { cwd } = options;
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 3, 16));
  const ttlSeconds = options.ttlSeconds ?? 30 * 60;
  const timeoutMs = options.timeoutMs ?? 25 * 60 * 1000;
  const retries = Math.max(0, options.retries ?? 1);
  const prefix = options.agentPrefix ?? 'worker';
  const maxRuns = options.maxRuns ?? 100;
  const verify = options.verify ?? ((dir: string) => runChecks(dir));
  const log = options.log ?? (() => undefined);
  const attempts = new Map<string, number>();
  const result: TeamRunResult = { completed: [], failed: [], finished: false, runs: 0, graph: buildWorkGraph(cwd) };

  appendEvent(cwd, { type: 'run.started', agent: prefix, data: { concurrency, retries } });

  while (result.runs < maxRuns) {
    const graph = buildWorkGraph(cwd);
    result.graph = graph;
    if (graph.finished) {
      result.finished = true;
      break;
    }
    const ready = graph.items.filter(item => item.state === 'ready');
    if (ready.length === 0) {
      const claimedByOthers = graph.items.filter(item => item.state === 'claimed');
      result.stopped = { item: claimedByOthers[0]?.id ?? graph.items.find(item => item.state === 'blocked')?.id ?? '', reason: claimedByOthers.length ? 'Remaining work is claimed by other agents; rerun when their leases end.' : 'Nothing is ready: the plan is blocked.' };
      break;
    }

    const first = ready[0]!;
    if (first.needsApproval) {
      result.stopped = { item: first.id, reason: 'Needs the user\'s approval (it installs or connects an external tool); HELEN will not do that unattended.' };
      break;
    }

    if (first.kind === 'checkpoint') {
      const agent = `${prefix}-verify`;
      claimWorkItem(cwd, first.id, { agent, ttlSeconds });
      log(`Verifying checkpoint ${first.id} with the project's own scripts...`);
      const check = verify(cwd);
      result.runs += 1;
      if (!check.ok) {
        const failing = check.results.filter(entry => !entry.ok).map(entry => entry.script).join(', ') || 'no scripts found';
        releaseWorkItem(cwd, first.id, { agent, reason: `checks failed: ${failing}`, failed: true });
        result.failed.push({ item: first.id, reason: `Checkpoint failed (${failing}).` });
        result.stopped = { item: first.id, reason: `Checkpoint failed (${failing}). Fix the project and run again.` };
        break;
      }
      completeWorkItem(cwd, first.id, { agent, note: 'Verified by helen team run (typecheck, lint, test, build).' });
      result.completed.push(first.id);
      continue;
    }

    const batch = first.readOnly ? ready.filter(item => item.readOnly && !item.needsApproval).slice(0, concurrency) : [first];
    log(`Running ${batch.map(item => item.id).join(', ')}${batch.length > 1 ? ' in parallel' : ''}...`);
    result.runs += batch.length;

    const outcomes = await Promise.all(batch.map(async item => {
      const agent = `${prefix}-${item.id}`.slice(0, 64);
      const argv = typeof options.command === 'function' ? options.command(item) : options.command;
      try {
        claimWorkItem(cwd, item.id, { agent, ttlSeconds });
      } catch (error) {
        return { item, ok: false, reason: (error as Error).message, retryable: false };
      }
      const brief = formatItemBrief(cwd, item.id, agent, { managed: true });
      const worker = await runWorker({
        cwd, argv, item, agent, brief, timeoutMs, env: options.env ?? {}, heartbeatMs: Math.max(1000, (ttlSeconds * 1000) / 3),
        onHeartbeat: () => { try { heartbeatClaim(cwd, item.id, agent, ttlSeconds); } catch { /* the lease is gone; completion will say so */ } },
      });
      if (!worker.ok) {
        const reason = worker.timedOut ? 'timed out' : `exited with code ${worker.code}`;
        releaseWorkItem(cwd, item.id, { agent, reason, failed: true, force: true });
        return { item, ok: false, reason: `Worker ${reason}.`, retryable: true };
      }
      // The worker may have finished the item itself by following the protocol in its brief.
      const after = buildWorkGraph(cwd).items.find(candidate => candidate.id === item.id);
      if (after && (after.state === 'done' || after.state === 'skipped')) return { item, ok: true, reason: 'completed by the worker', retryable: false };
      ensureResult(cwd, item, worker.output);
      try {
        completeWorkItem(cwd, item.id, { agent, note: `Completed by ${prefix} worker.` });
        return { item, ok: true, reason: 'completed', retryable: false };
      } catch (error) {
        releaseWorkItem(cwd, item.id, { agent, reason: (error as Error).message, failed: true, force: true });
        return { item, ok: false, reason: (error as Error).message, retryable: false };
      }
    }));

    for (const outcome of outcomes) {
      if (outcome.ok) {
        result.completed.push(outcome.item.id);
        continue;
      }
      const tried = (attempts.get(outcome.item.id) ?? 0) + 1;
      attempts.set(outcome.item.id, tried);
      if (outcome.retryable && tried <= retries) {
        log(`${outcome.item.id}: ${outcome.reason} Retrying (${tried}/${retries}).`);
        continue;
      }
      result.failed.push({ item: outcome.item.id, reason: outcome.reason });
    }
    if (result.failed.length > 0) {
      result.stopped = { item: result.failed[0]!.item, reason: result.failed[0]!.reason };
      break;
    }
  }

  if (!result.finished && !result.stopped && result.runs >= maxRuns) result.stopped = { item: '', reason: `Stopped after ${maxRuns} worker runs (safety limit).` };
  result.graph = buildWorkGraph(cwd);
  result.finished = result.graph.finished;
  appendEvent(cwd, { type: 'run.finished', agent: prefix, data: { finished: result.finished, completed: result.completed.length, failed: result.failed.length, ...(result.stopped ? { stopped: result.stopped.reason } : {}) } });
  return result;
}
