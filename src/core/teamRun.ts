import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ClaimConflictError, heartbeatClaim, listClaims } from "./claims.js";
import { appendEvent } from "./events.js";
import { isSafeProjectPath } from "./fs.js";
import {
  buildWorkGraph,
  claimWorkItem,
  completeWorkItem,
  formatItemBrief,
  releaseWorkItem,
  resultFile,
  workDir,
  type WorkGraph,
  type WorkItem,
} from "./orchestrate.js";
import { runChecks, type CheckRun } from "./progress.js";
import { redact } from "./secrets.js";

/**
 * `helen team run`: drive a tracked plan to the end with worker agents.
 *
 * HELEN does not run a model itself. It claims each ready item, hands the worker (any command that
 * reads a prompt on stdin, such as `claude -p`) a complete brief, keeps the lease alive, and completes
 * the item. Read-only work of one wave runs in parallel; writers and checkpoints run alone. Checkpoints
 * are verified by HELEN itself with the project's own scripts: a worker's word is never enough.
 *
 * Several runs (or a run and agents working by hand) can share one plan: every run has its own agent
 * names, takes only what it can claim, waits for what others hold, and gives back what it held when it stops.
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
  /** How long to wait for items other agents hold before stopping (0 stops at once). */
  waitMs?: number;
  /** How often to look again while waiting. */
  pollMs?: number;
  /** Stops the run: workers are terminated and their claims given back. */
  signal?: AbortSignal;
  /** Distinguishes this run's agents from any other run's. Random by default. */
  runId?: string;
}

export interface TeamRunResult {
  runId: string;
  completed: string[];
  failed: Array<{ item: string; reason: string }>;
  /** Items the run could not do on its own, with the reason (approval needed, checkpoint failing...). */
  stopped?: { item: string; reason: string };
  interrupted: boolean;
  finished: boolean;
  runs: number;
  graph: WorkGraph;
}

const OUTPUT_TAIL = 64 * 1024;
const LOG_LIMIT = 1024 * 1024;
const KILL_GRACE_MS = 5000;

/** Split a command line into arguments, honoring quotes. No shell is involved. */
export function splitCommand(line: string): string[] {
  const args: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let started = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (quote) {
      if (char === quote) quote = null;
      else if (
        char === "\\" &&
        quote === '"' &&
        (line[i + 1] === '"' || line[i + 1] === "\\")
      )
        current += line[++i];
      else current += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started || current) args.push(current);
      current = "";
      started = false;
    } else {
      current += char;
      started = true;
    }
  }
  if (quote) throw new Error("Unterminated quote in the agent command.");
  if (started || current) args.push(current);
  return args;
}

/** Presets are inspectable data, not magic: `--dry-run` prints exactly what would run. */
export function presetCommand(name: string, item: WorkItem): string[] {
  if (name === "claude") {
    // Print mode cannot ask for permission, so grant only what the item needs.
    return item.readOnly
      ? ["claude", "-p", "--allowedTools", "Read", "Glob", "Grep"]
      : [
          "claude",
          "-p",
          "--permission-mode",
          "acceptEdits",
          "--allowedTools",
          "Read",
          "Glob",
          "Grep",
          "Edit",
          "Write",
        ];
  }
  throw new Error(
    `Unknown agent preset "${name}". Available: claude. For any other agent pass --command "<program and arguments>".`,
  );
}

/** Options arrive from command lines and MCP: reject what is not a whole number in range instead of looping on NaN. */
export function wholeNumber(
  value: number | undefined,
  fallback: number,
  name: string,
  min: number,
  max: number,
): number {
  const number = value ?? fallback;
  if (!Number.isInteger(number) || number < min || number > max)
    throw new Error(
      `${name} must be a whole number from ${min} to ${max} (got ${String(value)}).`,
    );
  return number;
}

function assertWorkPath(cwd: string, file: string): void {
  if (!isSafeProjectPath(cwd, file))
    throw new Error(
      `${path.relative(cwd, file)} must stay inside the project with no symbolic links.`,
    );
}

/** Remove a file HELEN owns under .helen/work; a symbolic link on the way is refused, never followed. */
function removeWorkFile(cwd: string, file: string): void {
  assertWorkPath(cwd, file);
  fs.rmSync(file, { force: true });
}

/** Write a file HELEN owns under .helen/work, never through a symbolic link planted there. */
function writeWorkFile(cwd: string, file: string, content: string): void {
  assertWorkPath(cwd, file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  removeWorkFile(cwd, file);
  // O_EXCL: if a link reappears between the removal and the open, the write fails instead of following it.
  fs.writeFileSync(file, content, { flag: "wx", mode: 0o600 });
}

function killTree(child: ChildProcess, signal: NodeJS.Signals): void {
  if (
    child.pid === undefined ||
    child.exitCode !== null ||
    child.signalCode !== null
  )
    return;
  try {
    if (process.platform === "win32")
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
        timeout: KILL_GRACE_MS,
      });
    else process.kill(-child.pid, signal); // the worker leads its own process group: its tools die with it
  } catch {
    try {
      child.kill(signal);
    } catch {
      // Already gone.
    }
  }
}

/** taskkill can be slow under load; concurrent cancellations must not block one another's event handlers. */
function stopTree(child: ChildProcess): Promise<void> {
  if (process.platform !== "win32" || child.pid === undefined) {
    killTree(child, "SIGTERM");
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
      timeout: KILL_GRACE_MS,
      killSignal: "SIGKILL",
    });
    let settled = false;
    const done = (failed: boolean): void => {
      if (settled) return;
      settled = true;
      if (failed) killTree(child, "SIGKILL");
      resolve();
    };
    killer.once("error", () => done(true));
    killer.once("close", (code) => done(code !== 0));
  });
}

interface WorkerOutcome {
  ok: boolean;
  code: number | null;
  timedOut: boolean;
  interrupted: boolean;
  /** The lease was lost while the worker ran (another agent may hold the item now). */
  lost: boolean;
  /** Set when the program could not be started at all. */
  startError?: string;
  output: string;
}

interface WorkerOptions {
  cwd: string;
  argv: string[];
  item: WorkItem;
  agent: string;
  brief: string;
  timeoutMs: number;
  env: NodeJS.ProcessEnv;
  onHeartbeat: () => boolean;
  heartbeatMs: number;
  signal?: AbortSignal;
  children: Set<ChildProcess>;
}

function runWorker(options: WorkerOptions): Promise<WorkerOutcome> {
  const dir = workDir(options.cwd, options.item.id);
  const briefFile = path.join(dir, "brief.md");
  writeWorkFile(options.cwd, briefFile, options.brief);
  const failure = {
    ok: false,
    code: null,
    timedOut: false,
    interrupted: false,
    lost: false,
  };
  return new Promise((resolve) => {
    const [program, ...args] = options.argv;
    let output = "";
    let settled = false;
    let stopping: {
      outcome: Omit<WorkerOutcome, "output" | "code">;
      note: string;
    } | null = null;
    let child: ChildProcess | undefined;
    let fallback: NodeJS.Timeout | undefined;
    let escalation: NodeJS.Timeout | undefined;
    let termination = Promise.resolve();
    // Assigned once the worker starts; declared up front because finish() and stop() clear them.
    // eslint-disable-next-line prefer-const
    let beat: NodeJS.Timeout | undefined;
    // eslint-disable-next-line prefer-const
    let timer: NodeJS.Timeout | undefined;
    const finish = (outcome: WorkerOutcome): void => {
      if (settled) return;
      settled = true;
      for (const handle of [timer, fallback, escalation])
        if (handle) clearTimeout(handle);
      if (beat) clearInterval(beat);
      options.signal?.removeEventListener("abort", onAbort);
      if (child) options.children.delete(child);
      try {
        writeWorkFile(
          options.cwd,
          path.join(dir, "agent.log"),
          redact(outcome.output.slice(-LOG_LIMIT)),
        );
      } catch {
        // The log is a convenience.
      }
      resolve(outcome);
    };
    // Stop the worker and report only once it is gone, so its claim is never given back while it still writes.
    const stop = (
      kind: "timeout" | "interrupt" | "lost",
      note: string,
    ): void => {
      if (settled || stopping) return;
      stopping = {
        outcome: {
          ...failure,
          timedOut: kind === "timeout",
          interrupted: kind === "interrupt",
          lost: kind === "lost",
        },
        note,
      };
      if (beat) clearInterval(beat);
      if (!child)
        return finish({
          ...stopping.outcome,
          code: null,
          output: `[helen] ${note}`,
        });
      const target = child;
      termination = stopTree(target);
      escalation = setTimeout(() => killTree(target, "SIGKILL"), KILL_GRACE_MS);
      escalation.unref();
      fallback = setTimeout(async () => {
        await termination;
        finish({
          ...stopping!.outcome,
          code: null,
          output: `${output}\n[helen] ${note} (the worker did not exit)`,
        });
      }, KILL_GRACE_MS + 2000);
    };
    const onAbort = (): void => stop("interrupt", "interrupted");
    if (options.signal?.aborted) {
      finish({
        ...failure,
        interrupted: true,
        output: "[helen] interrupted before start",
      });
      return;
    }
    try {
      child = spawn(program!, args, {
        cwd: options.cwd,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        detached: process.platform !== "win32",
        env: {
          ...process.env,
          ...options.env,
          HELEN_ITEM: options.item.id,
          HELEN_AGENT: options.agent,
          HELEN_PROJECT: options.cwd,
          HELEN_BRIEF_FILE: briefFile,
        },
      });
    } catch (error) {
      finish({ ...failure, startError: (error as Error).message, output: "" });
      return;
    }
    options.children.add(child);
    const collect = (chunk: Buffer): void => {
      output += chunk.toString("utf8");
      if (output.length > OUTPUT_TAIL * 4)
        output = output.slice(-OUTPUT_TAIL * 2);
    };
    child.stdout!.on("data", collect);
    child.stderr!.on("data", collect);
    child.stdin!.on("error", () => {
      /* the worker may exit without reading its prompt */
    });
    child.stdin!.end(options.brief);
    options.signal?.addEventListener("abort", onAbort, { once: true });
    beat = setInterval(() => {
      // A lease that is gone means someone else may be doing this item now: stop rather than duplicate the work.
      if (!options.onHeartbeat())
        stop(
          "lost",
          "lost the claim on this item; stopped to avoid duplicate work",
        );
    }, options.heartbeatMs);
    timer = setTimeout(
      () =>
        stop(
          "timeout",
          `timed out after ${Math.round(options.timeoutMs / 1000)} s`,
        ),
      options.timeoutMs,
    );
    child.on("error", (error) => {
      if (stopping) return;
      const code = (error as NodeJS.ErrnoException).code;
      finish({
        ...failure,
        startError: code === "ENOENT" ? "command not found" : error.message,
        output,
      });
    });
    child.on("close", async (code) => {
      await termination;
      if (stopping)
        finish({
          ...stopping.outcome,
          code,
          output: `${output}\n[helen] ${stopping.note}`,
        });
      else finish({ ...failure, ok: code === 0, code, output });
    });
  });
}

/** A worker that only printed its answer still leaves a result for the next wave to read. */
function ensureResult(cwd: string, item: WorkItem, output: string): void {
  const file = resultFile(cwd, item.id);
  try {
    // Any earlier result.md was removed before the worker started, so a regular file here is the worker's own.
    if (fs.lstatSync(file).isFile()) return;
  } catch {
    // Not written by the worker.
  }
  const body = redact(output.trim().slice(-OUTPUT_TAIL));
  writeWorkFile(
    cwd,
    file,
    `# ${item.id}\n\n(Captured from the worker's output: it did not write this file itself.)\n\n${body}\n`,
  );
}

function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(done, ms);
    function done(): void {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    }
    signal?.addEventListener("abort", done, { once: true });
  });
}

interface Outcome {
  item: WorkItem;
  ok: boolean;
  reason: string;
  retryable: boolean;
  /** Another agent holds the item (or paths it needs): not a failure, just not ours to do now. */
  conflict?: boolean;
  interrupted?: boolean;
}

export async function runTeam(options: TeamRunOptions): Promise<TeamRunResult> {
  const { cwd } = options;
  const concurrency = wholeNumber(options.concurrency, 3, "concurrency", 1, 16);
  const ttlSeconds = wholeNumber(
    options.ttlSeconds,
    30 * 60,
    "ttlSeconds",
    30,
    4 * 60 * 60,
  );
  const timeoutMs = wholeNumber(
    options.timeoutMs,
    25 * 60 * 1000,
    "timeoutMs",
    50,
    24 * 60 * 60 * 1000,
  );
  const retries = wholeNumber(options.retries, 1, "retries", 0, 10);
  const maxRuns = wholeNumber(options.maxRuns, 100, "maxRuns", 1, 10_000);
  const waitMs = wholeNumber(
    options.waitMs,
    0,
    "waitMs",
    0,
    24 * 60 * 60 * 1000,
  );
  const pollMs = wholeNumber(options.pollMs, 3000, "pollMs", 10, 60_000);
  const prefix = options.agentPrefix ?? "worker";
  const runId = options.runId ?? crypto.randomBytes(3).toString("hex");
  const verify = options.verify ?? ((dir: string) => runChecks(dir));
  const log = options.log ?? (() => undefined);
  const signal = options.signal;
  const agentFor = (suffix: string): string =>
    `${prefix}-${runId}-${suffix}`.slice(0, 64);
  const attempts = new Map<string, number>();
  const held = new Map<string, { agent: string; token: string }>();
  const children = new Set<ChildProcess>();
  const result: TeamRunResult = {
    runId,
    completed: [],
    failed: [],
    interrupted: false,
    finished: false,
    runs: 0,
    graph: buildWorkGraph(cwd),
  };

  const giveBack = (item: string, reason: string, failed: boolean): void => {
    const claim = held.get(item);
    if (!claim) return;
    held.delete(item);
    try {
      releaseWorkItem(cwd, item, {
        agent: claim.agent,
        token: claim.token,
        reason,
        failed,
        ifOwned: true,
      });
    } catch {
      // Best effort: the lease expires on its own.
    }
  };
  // Last line of defense: whatever ends this process (an uncaught error, a second Ctrl-C) gives the claims back.
  const onExit = (): void => {
    for (const child of children) killTree(child, "SIGKILL");
    for (const item of [...held.keys()])
      giveBack(item, "the run ended abruptly", false);
  };
  process.on("exit", onExit);

  appendEvent(cwd, {
    type: "run.started",
    agent: prefix,
    data: { runId, concurrency, retries },
  });
  let waitingSince: number | null = null;
  let lastWaitMessage = "";

  /** Other agents hold what we need: wait for them (up to waitMs) or stop with a reason. True means look again. */
  const waitOrStop = async (
    graph: WorkGraph,
    reason: string,
  ): Promise<boolean> => {
    const others = listClaims(cwd).active.filter(
      (claim) => !held.has(claim.item),
    );
    if (others.length > 0 && waitMs > 0) {
      waitingSince ??= Date.now();
      if (Date.now() - waitingSince < waitMs) {
        const message = `Waiting for ${others.map((claim) => `${claim.item} (${claim.agent}, lease until ${claim.expiresAt})`).join(", ")}. If that agent is gone: helen team release <item> --agent <you> --force`;
        if (message !== lastWaitMessage) log(message);
        lastWaitMessage = message;
        await abortableDelay(pollMs, signal);
        return true;
      }
    }
    result.stopped = {
      item:
        others[0]?.item ??
        graph.items.find((item) => item.state === "blocked")?.id ??
        "",
      reason: others.length
        ? `${reason} Remaining work is claimed by other agents; rerun when their leases end, or pass a longer --wait.`
        : "Nothing is ready: the plan is blocked.",
    };
    return false;
  };

  try {
    for (;;) {
      if (signal?.aborted) {
        result.interrupted = true;
        result.stopped = {
          item: "",
          reason:
            "Interrupted: workers were stopped and their claims given back.",
        };
        break;
      }
      if (result.runs >= maxRuns) {
        result.stopped = {
          item: "",
          reason: `Stopped after ${maxRuns} worker runs (safety limit).`,
        };
        break;
      }
      const graph = buildWorkGraph(cwd);
      result.graph = graph;
      if (graph.finished) break;
      const ready = graph.items.filter((item) => item.state === "ready");
      if (ready.length === 0) {
        if (await waitOrStop(graph, "Nothing is ready.")) continue;
        break;
      }

      const first = ready[0]!;
      if (first.needsApproval) {
        result.stopped = {
          item: first.id,
          reason:
            "Needs the user's approval (it installs or connects an external tool); HELEN will not do that unattended.",
        };
        break;
      }

      if (first.kind === "checkpoint") {
        const agent = agentFor("verify");
        try {
          const claimed = claimWorkItem(cwd, first.id, {
            agent,
            ttlSeconds,
            strict: true,
          });
          held.set(first.id, { agent, token: claimed.token });
        } catch (error) {
          if (!(error instanceof ClaimConflictError)) throw error;
          if (
            await waitOrStop(
              buildWorkGraph(cwd),
              `${first.id} is held by another agent.`,
            )
          )
            continue;
          break;
        }
        waitingSince = null;
        log(
          `Verifying checkpoint ${first.id} with the project's own scripts...`,
        );
        result.runs += 1;
        let check: CheckRun;
        try {
          check = verify(cwd);
        } catch (error) {
          giveBack(
            first.id,
            `verification crashed: ${(error as Error).message}`,
            true,
          );
          result.failed.push({
            item: first.id,
            reason: `Checkpoint verification crashed: ${(error as Error).message}`,
          });
          result.stopped = {
            item: first.id,
            reason: `Checkpoint verification crashed: ${(error as Error).message}`,
          };
          break;
        }
        if (!check.ok) {
          const failing =
            check.results
              .filter((entry) => !entry.ok)
              .map((entry) => entry.script)
              .join(", ") || "no scripts found";
          giveBack(first.id, `checks failed: ${failing}`, true);
          result.failed.push({
            item: first.id,
            reason: `Checkpoint failed (${failing}).`,
          });
          result.stopped = {
            item: first.id,
            reason: `Checkpoint failed (${failing}). Fix the project and run again.`,
          };
          break;
        }
        const claim = held.get(first.id)!;
        try {
          completeWorkItem(cwd, first.id, {
            agent,
            token: claim.token,
            strict: true,
            note: "Verified by helen team run (typecheck, lint, test, build).",
          });
          held.delete(first.id);
          result.completed.push(first.id);
          continue;
        } catch (error) {
          giveBack(first.id, (error as Error).message, true);
          result.failed.push({
            item: first.id,
            reason: (error as Error).message,
          });
          result.stopped = { item: first.id, reason: (error as Error).message };
          break;
        }
      }

      const batch = first.readOnly
        ? ready
            .filter((item) => item.readOnly && !item.needsApproval)
            .slice(0, Math.min(concurrency, maxRuns - result.runs))
        : [first];
      const outcomes = await Promise.all(
        batch.map(async (item): Promise<Outcome> => {
          const agent = agentFor(item.id);
          const argv =
            typeof options.command === "function"
              ? options.command(item)
              : options.command;
          if (argv.length === 0 || !argv[0])
            return {
              item,
              ok: false,
              reason: "The agent command is empty.",
              retryable: false,
            };
          let token: string;
          try {
            token = claimWorkItem(cwd, item.id, {
              agent,
              ttlSeconds,
              strict: true,
            }).token;
          } catch (error) {
            if (error instanceof ClaimConflictError)
              return {
                item,
                ok: false,
                reason: error.message,
                retryable: false,
                conflict: true,
              };
            return {
              item,
              ok: false,
              reason: (error as Error).message,
              retryable: false,
            };
          }
          held.set(item.id, { agent, token });
          result.runs += 1;
          let worker: WorkerOutcome;
          try {
            removeWorkFile(cwd, resultFile(cwd, item.id)); // a result from an earlier attempt or plan is not this run's work
            const brief = formatItemBrief(cwd, item.id, agent, {
              managed: true,
            });
            worker = await runWorker({
              cwd,
              argv,
              item,
              agent,
              brief,
              timeoutMs,
              env: options.env ?? {},
              signal,
              children,
              heartbeatMs: Math.max(1000, (ttlSeconds * 1000) / 3),
              onHeartbeat: () => {
                const current = held.get(item.id);
                if (!current) return false;
                try {
                  heartbeatClaim(cwd, item.id, agent, {
                    ttlSeconds,
                    token: current.token,
                    strict: true,
                  });
                  return true;
                } catch {
                  // The lease ran out (a suspended laptop) or the lock was busy: take it again if nobody else has.
                  try {
                    current.token = claimWorkItem(cwd, item.id, {
                      agent,
                      ttlSeconds,
                      strict: true,
                      token: current.token,
                    }).token;
                    return true;
                  } catch {
                    held.delete(item.id);
                    return false;
                  }
                }
              },
            });
          } catch (error) {
            giveBack(item.id, (error as Error).message, true);
            return {
              item,
              ok: false,
              reason: (error as Error).message,
              retryable: false,
            };
          }
          if (!worker.ok) {
            if (worker.interrupted) {
              giveBack(item.id, "interrupted", false);
              return {
                item,
                ok: false,
                reason: "Interrupted.",
                retryable: false,
                interrupted: true,
              };
            }
            if (worker.lost) {
              giveBack(item.id, "lost the lease", false);
              return {
                item,
                ok: false,
                reason:
                  "Lost the claim while working; another agent may hold the item now.",
                retryable: false,
                conflict: true,
              };
            }
            const reason = worker.startError
              ? `could not start "${argv[0]}": ${worker.startError}`
              : worker.timedOut
                ? "timed out"
                : `exited with code ${worker.code}`;
            giveBack(item.id, reason, true);
            return {
              item,
              ok: false,
              reason: `Worker ${reason}.`,
              retryable: !worker.startError,
            };
          }
          // The worker may have finished the item itself by following the protocol in its brief.
          const after = buildWorkGraph(cwd).items.find(
            (candidate) => candidate.id === item.id,
          );
          if (after && (after.state === "done" || after.state === "skipped")) {
            held.delete(item.id);
            return {
              item,
              ok: true,
              reason: "completed by the worker",
              retryable: false,
            };
          }
          try {
            ensureResult(cwd, item, worker.output);
            const current = held.get(item.id);
            if (!current)
              throw new Error(
                "The claim on this item was lost while the worker ran; its result was kept but the item is not completed.",
              );
            completeWorkItem(cwd, item.id, {
              agent,
              token: current.token,
              strict: true,
              note: `Completed by ${prefix} worker (run ${runId}).`,
            });
            held.delete(item.id);
            return { item, ok: true, reason: "completed", retryable: false };
          } catch (error) {
            giveBack(item.id, (error as Error).message, true);
            return {
              item,
              ok: false,
              reason: (error as Error).message,
              retryable: false,
            };
          }
        }),
      );

      if (outcomes.some((outcome) => !outcome.conflict)) waitingSince = null;
      for (const outcome of outcomes) {
        if (outcome.ok) {
          result.completed.push(outcome.item.id);
          continue;
        }
        if (outcome.conflict || outcome.interrupted) continue;
        const tried = (attempts.get(outcome.item.id) ?? 0) + 1;
        attempts.set(outcome.item.id, tried);
        if (outcome.retryable && tried <= retries) {
          log(
            `${outcome.item.id}: ${outcome.reason} Retrying (${tried}/${retries}).`,
          );
          continue;
        }
        result.failed.push({ item: outcome.item.id, reason: outcome.reason });
      }
      if (result.failed.length > 0) {
        result.stopped = {
          item: result.failed[0]!.item,
          reason: result.failed[0]!.reason,
        };
        break;
      }
      if (
        outcomes.length > 0 &&
        outcomes.every((outcome) => outcome.conflict)
      ) {
        // Everything we tried is held by someone else (or needs paths they hold).
        if (
          await waitOrStop(
            buildWorkGraph(cwd),
            `${outcomes.map((outcome) => outcome.item.id).join(", ")} held by other agents.`,
          )
        )
          continue;
        break;
      }
    }
  } finally {
    for (const item of [...held.keys()])
      giveBack(
        item,
        result.interrupted ? "interrupted" : "the run stopped",
        false,
      );
    process.removeListener("exit", onExit);
  }

  result.graph = buildWorkGraph(cwd);
  result.finished = result.graph.finished;
  if (result.finished) delete result.stopped;
  appendEvent(cwd, {
    type: "run.finished",
    agent: prefix,
    data: {
      runId,
      finished: result.finished,
      interrupted: result.interrupted,
      completed: result.completed.length,
      failed: result.failed.length,
      ...(result.stopped ? { stopped: result.stopped.reason } : {}),
    },
  });
  return result;
}
