import fs from "node:fs";
import path from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { isSafeProjectPath } from "./fs.js";
import { logger } from "./logger.js";

const journalSchema = z.object({
  version: z.literal(1),
  id: z.string().uuid(),
  kind: z.string(),
  status: z.enum(["active", "failed", "committed", "recovered"]),
  startedAt: z.string().datetime(),
  ownerPid: z.number().int().positive().optional(),
  temporaries: z.array(z.string()).default([]),
  entries: z.array(
    z.object({
      file: z.string(),
      before: z.string().nullable(),
      mode: z.number().int().min(0).max(0o777).optional(),
      hashes: z
        .array(
          z
            .string()
            .regex(/^[a-f0-9]{64}$/)
            .nullable(),
        )
        .min(1),
    }),
  ),
});
type Journal = z.infer<typeof journalSchema>;
const recoveryLeaseSchema = z.object({
  version: z.literal(1),
  id: z.string().uuid(),
  operationId: z.string().uuid(),
  ownerPid: z.number().int().positive(),
  status: z.enum(["active", "released"]),
});
type RecoveryLease = z.infer<typeof recoveryLeaseSchema>;
interface OperationState {
  cwd: string;
  journal: Journal;
  active: boolean;
  failure?: { error: unknown };
  failedFiles: Map<string, unknown>;
  createdDirectory: boolean;
  scopes: Map<string, OperationState>;
}
const currentOperation = new AsyncLocalStorage<OperationState>();
const digest = (content: Buffer): string =>
  createHash("sha256").update(content).digest("hex");
const journalPath = (cwd: string, id: string): string =>
  path.join(cwd, ".helen", "operations", `${id}.json`);
const lockPath = (cwd: string): string =>
  path.join(cwd, ".helen", "operations", ".lock");
const sameDirectory = (first: string, second: string): boolean =>
  path.relative(first, path.resolve(second)) === "";
const mutationKey = (file: string): string =>
  process.platform === "win32"
    ? path.resolve(file).toLowerCase()
    : path.resolve(file);
const isOperationMetadata = (relative: string): boolean =>
  (process.platform === "win32" ? relative.toLowerCase() : relative).startsWith(
    ".helen/operations/",
  );

function processIsRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function unlinkIfPresent(file: string): void {
  try {
    fs.unlinkSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

function releaseLock(cwd: string, id: string): void {
  const file = lockPath(cwd);
  assertFile(cwd, file);
  if (
    fs.existsSync(file) &&
    journalSchema.parse(JSON.parse(fs.readFileSync(file, "utf8"))).id === id
  )
    unlinkIfPresent(file);
}

/** Atomic replacement: readers see the previous complete file or the new complete file. */
function atomicWrite(
  file: string,
  content: string | Buffer,
  mode?: number,
  preparedTemporary?: string,
): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = preparedTemporary ?? `${file}.${randomUUID()}.tmp`;
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(temporary, "wx", mode ?? 0o666);
    fs.writeFileSync(descriptor, content);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, file);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function assertFile(cwd: string, file: string): void {
  if (
    !isSafeProjectPath(cwd, file) ||
    path.resolve(file) === path.resolve(cwd) ||
    (fs.existsSync(file) && !fs.lstatSync(file).isFile())
  ) {
    throw new Error(`Unsafe operation file: ${path.relative(cwd, file)}`);
  }
}

function persist(cwd: string, journal: Journal): void {
  const file = journalPath(cwd, journal.id);
  assertFile(cwd, file);
  const temporary = `${file}.tmp`;
  assertFile(cwd, temporary);
  atomicWrite(file, `${JSON.stringify(journal)}\n`, 0o600, temporary);
}

function latestRecoveryLease(
  cwd: string,
): { file: string; lease: RecoveryLease } | undefined {
  const directory = path.join(cwd, ".helen", "operations");
  let file = path.join(directory, ".recovery.lock");
  assertFile(cwd, file);
  if (!fs.existsSync(file)) return undefined;
  const visited = new Set<string>();
  for (;;) {
    assertFile(cwd, file);
    const lease = recoveryLeaseSchema.parse(
      JSON.parse(fs.readFileSync(file, "utf8")),
    );
    if (visited.has(lease.id)) throw new Error("Invalid recovery lease chain.");
    visited.add(lease.id);
    const successor = path.join(directory, `.recovery.${lease.id}.lock`);
    assertFile(cwd, successor);
    if (!fs.existsSync(successor)) return { file, lease };
    file = successor;
  }
}

function acquireRecoveryLease(
  cwd: string,
  operationId: string,
): { file: string; lease: RecoveryLease } {
  const directory = path.join(cwd, ".helen", "operations");
  for (;;) {
    const current = latestRecoveryLease(cwd);
    if (
      current?.lease.status === "active" &&
      processIsRunning(current.lease.ownerPid)
    ) {
      throw new Error(
        `Recovery of operation ${current.lease.operationId} is still running. Stop that HELEN process before recovery.`,
      );
    }
    const file = current
      ? path.join(directory, `.recovery.${current.lease.id}.lock`)
      : path.join(directory, ".recovery.lock");
    assertFile(cwd, file);
    const lease: RecoveryLease = {
      version: 1,
      id: randomUUID(),
      operationId,
      ownerPid: process.pid,
      status: "active",
    };
    const candidate = path.join(directory, `.recovery.${lease.id}.tmp`);
    assertFile(cwd, candidate);
    atomicWrite(candidate, `${JSON.stringify(lease)}\n`, 0o600);
    try {
      // Never unlink a stale lease: two reclaimers compete for its one immutable
      // successor, so neither can accidentally delete the other's live lock.
      fs.linkSync(candidate, file);
      return { file, lease };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    } finally {
      unlinkIfPresent(candidate);
    }
  }
}

function releaseRecoveryLease(file: string, lease: RecoveryLease): void {
  lease.status = "released";
  atomicWrite(file, `${JSON.stringify(lease)}\n`, 0o600);
}

function assertRecoveryAvailable(cwd: string): void {
  const current = latestRecoveryLease(cwd);
  if (current?.lease.status !== "active") return;
  const running = processIsRunning(current.lease.ownerPid);
  if (!running && !fs.existsSync(journalPath(cwd, current.lease.operationId))) {
    // A terminated recovery may have completed all file and journal cleanup
    // immediately before releasing its lease. Reconcile that terminal state.
    const acquired = acquireRecoveryLease(cwd, current.lease.operationId);
    releaseRecoveryLease(acquired.file, acquired.lease);
    return;
  }
  throw new Error(
    `An unfinished recovery of operation ${current.lease.operationId} ${running ? "is still running" : "needs recovery"}. Run: helen recover ${current.lease.operationId}`,
  );
}

/** Persist original bytes and all intended versions before the filesystem mutation. */
export function beforeFileMutation(
  file: string,
  after: string | Buffer | null,
): void {
  const operation = currentOperation.getStore();
  if (!operation) return;
  if (!operation.active)
    throw new Error(
      "The project operation has already finished. Start a new operation before changing files.",
    );
  const { cwd, journal } = operation;
  const absolute = path.resolve(file);
  assertFile(cwd, absolute);
  const relative = path.relative(cwd, absolute).replace(/\\/g, "/");
  if (isOperationMetadata(relative))
    throw new Error("Operation journals cannot be mutated by an operation");
  let entry = journal.entries.find((candidate) =>
    sameDirectory(path.resolve(cwd, candidate.file), absolute),
  );
  if (!entry) {
    const before = fs.existsSync(absolute) ? fs.readFileSync(absolute) : null;
    entry = {
      file: relative,
      before: before?.toString("base64") ?? null,
      mode: before ? fs.statSync(absolute).mode & 0o777 : undefined,
      hashes: [before ? digest(before) : null],
    };
    journal.entries.push(entry);
  }
  const hash =
    after === null
      ? null
      : digest(Buffer.isBuffer(after) ? after : Buffer.from(after));
  if (!entry.hashes.includes(hash)) entry.hashes.push(hash);
  persist(cwd, journal);
}

export function writeAtomicFile(
  file: string,
  content: string | Buffer,
  options: { mode?: number } = {},
): void {
  const operation = currentOperation.getStore();
  try {
    beforeFileMutation(file, content);
    const mode =
      options.mode ??
      (fs.existsSync(file) ? fs.statSync(file).mode & 0o777 : undefined);
    let temporary: string | undefined;
    if (operation) {
      temporary = `${file}.${operation.journal.id}.${randomUUID()}.tmp`;
      assertFile(operation.cwd, temporary);
      operation.journal.temporaries.push(
        path.relative(operation.cwd, temporary).replace(/\\/g, "/"),
      );
      persist(operation.cwd, operation.journal);
    }
    atomicWrite(file, content, mode, temporary);
    operation?.failedFiles.delete(mutationKey(file));
  } catch (error) {
    recordFileMutationFailure(file, error);
    throw error;
  }
}

export function removeTrackedFile(file: string): void {
  const operation = currentOperation.getStore();
  try {
    if (!fs.existsSync(file)) return;
    beforeFileMutation(file, null);
    fs.unlinkSync(file);
    operation?.failedFiles.delete(mutationKey(file));
  } catch (error) {
    recordFileMutationFailure(file, error);
    throw error;
  }
}

/** Safe helpers may return "skipped" after an error, but a partial operation must remain recoverable. */
export function recordFileMutationFailure(file: string, error: unknown): void {
  const operation = currentOperation.getStore();
  if (operation?.active) operation.failedFiles.set(mutationKey(file), error);
}

export interface OperationSummary {
  id: string;
  kind: string;
  status: Journal["status"];
  startedAt: string;
  files: string[];
  recoveryCommand: string;
}

function summary(journal: Journal): OperationSummary {
  return {
    id: journal.id,
    kind: journal.kind,
    status: journal.status,
    startedAt: journal.startedAt,
    files: journal.entries.map((entry) => entry.file),
    recoveryCommand: `helen recover ${journal.id}`,
  };
}

function readJournal(cwd: string, id: string): Journal {
  if (!z.string().uuid().safeParse(id).success)
    throw new Error(
      "Operation ID must be a UUID. List IDs with: helen recover",
    );
  const file = journalPath(cwd, id);
  assertFile(cwd, file);
  const journal = journalSchema.parse(
    JSON.parse(fs.readFileSync(file, "utf8")),
  );
  if (journal.id !== id)
    throw new Error("Operation journal ID does not match its filename");
  for (const entry of journal.entries) {
    const relative = path
      .relative(cwd, path.resolve(cwd, entry.file))
      .replace(/\\/g, "/");
    if (path.isAbsolute(entry.file) || isOperationMetadata(relative))
      throw new Error("Invalid recovery target in operation journal");
    assertFile(cwd, path.resolve(cwd, entry.file));
    const original =
      entry.before === null ? null : Buffer.from(entry.before, "base64");
    if (
      (original !== null && original.toString("base64") !== entry.before) ||
      entry.hashes[0] !== (original === null ? null : digest(original))
    ) {
      throw new Error(
        `Invalid original snapshot in operation journal: ${entry.file}`,
      );
    }
  }
  for (const temporary of journal.temporaries) {
    if (!temporary.endsWith(".tmp") || !temporary.includes(`.${id}.`))
      throw new Error("Invalid temporary file in operation journal");
    assertFile(cwd, path.resolve(cwd, temporary));
  }
  return journal;
}

export function listOperations(cwd: string): OperationSummary[] {
  const directory = path.join(cwd, ".helen", "operations");
  if (!isSafeProjectPath(cwd, directory))
    throw new Error("Unsafe operation journal directory");
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .flatMap((name) => {
      try {
        return [summary(readJournal(cwd, name.slice(0, -5)))];
      } catch (error) {
        // A completed writer may remove its journal after directory enumeration.
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw error;
      }
    })
    .filter(
      (operation) =>
        operation.status === "active" || operation.status === "failed",
    );
}

function reconcileCompletedOperations(cwd: string): void {
  const lock = lockPath(cwd);
  assertFile(cwd, lock);
  if (fs.existsSync(lock)) {
    const owner = journalSchema.parse(
      JSON.parse(fs.readFileSync(lock, "utf8")),
    );
    if (owner.ownerPid && processIsRunning(owner.ownerPid)) {
      throw new Error(
        "Another project operation is still releasing its lock. Retry after it finishes.",
      );
    }
    const acquired = acquireRecoveryLease(cwd, owner.id);
    try {
      const pending = listOperations(cwd);
      if (pending.length)
        throw new Error(
          `An unfinished operation needs recovery. Run: ${pending[0]!.recoveryCommand}`,
        );
      // Only this lease holder can reconcile a legacy or abandoned operation lock.
      releaseLock(cwd, owner.id);
    } finally {
      releaseRecoveryLease(acquired.file, acquired.lease);
    }
  }
  const directory = path.join(cwd, ".helen", "operations");
  if (!fs.existsSync(directory)) return;
  for (const name of fs
    .readdirSync(directory)
    .filter((name) => name.endsWith(".json"))) {
    try {
      const journal = readJournal(cwd, name.slice(0, -5));
      if (journal.status === "committed" || journal.status === "recovered")
        unlinkIfPresent(journalPath(cwd, journal.id));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

/** Preflight guard for commands that will mutate more than one project root. */
export function assertProjectOperationAvailable(cwd: string): void {
  const current = currentOperation.getStore();
  if (
    current?.active &&
    [...current.scopes.values()].some(
      (scope) => scope.active && sameDirectory(scope.cwd, cwd),
    )
  )
    return;
  assertRecoveryAvailable(cwd);
  const pending = listOperations(cwd);
  if (pending.length)
    throw new Error(
      `An unfinished ${pending[0]!.kind} operation needs recovery. Run: ${pending[0]!.recoveryCommand}`,
    );
}

function beginOperation(cwd: string, kind: string): OperationState {
  cwd = path.resolve(cwd);
  assertProjectOperationAvailable(cwd);
  reconcileCompletedOperations(cwd);
  const journal: Journal = {
    version: 1,
    id: randomUUID(),
    kind,
    status: "active",
    startedAt: new Date().toISOString(),
    entries: [],
    ownerPid: process.pid,
    temporaries: [],
  };
  const createdDirectory = !fs.existsSync(
    path.join(cwd, ".helen", "operations"),
  );
  const ignore = path.join(cwd, ".helen", "operations", ".gitignore");
  assertFile(cwd, ignore);
  const ignoreContent = fs.existsSync(ignore)
    ? fs.readFileSync(ignore, "utf8")
    : "";
  if (!ignoreContent.split(/\r?\n/).some((line) => line.trim() === "*"))
    atomicWrite(
      ignore,
      `${ignoreContent}${ignoreContent.endsWith("\n") || !ignoreContent ? "" : "\n"}*\n`,
      0o600,
    );
  persist(cwd, journal);
  try {
    // Exclusive hard-link creation makes the initial complete journal the lock.
    fs.linkSync(journalPath(cwd, journal.id), lockPath(cwd));
  } catch (error) {
    fs.unlinkSync(journalPath(cwd, journal.id));
    throw new Error("Another project operation is active. Run: helen recover", {
      cause: error,
    });
  }
  const scopes =
    currentOperation.getStore()?.scopes ?? new Map<string, OperationState>();
  const operation = {
    cwd,
    journal,
    active: true,
    createdDirectory,
    failedFiles: new Map<string, unknown>(),
    scopes,
  };
  scopes.set(cwd, operation);
  return operation;
}

function finishOperation<T>(
  operation: OperationState,
  value: T,
  successful: (value: T) => boolean,
): { value: T; operation?: OperationSummary } {
  const { cwd, journal } = operation;
  const completed = successful(value);
  // Explicit failure results retain their structured diagnostics and recovery ID.
  // An apparently successful result must never hide a swallowed write failure.
  if (completed && operation.failure !== undefined)
    throw operation.failure.error;
  if (completed && operation.failedFiles.size > 0)
    throw operation.failedFiles.values().next().value;
  journal.status = completed ? "committed" : "failed";
  if (journal.status === "committed" || journal.entries.length === 0) {
    // The on-disk journal still says active: no new writer can begin while this
    // owner releases its lock. Publish completion only after the lock is gone.
    releaseLock(cwd, journal.id);
  }
  persist(cwd, journal);
  if (journal.status === "committed" || journal.entries.length === 0)
    unlinkIfPresent(journalPath(cwd, journal.id));
  return {
    value,
    operation:
      journal.status === "failed" && journal.entries.length > 0
        ? summary(journal)
        : undefined,
  };
}

function failOperation(operation: OperationState, error: unknown): never {
  const { cwd, journal } = operation;
  if (journal.entries.length === 0) {
    releaseLock(cwd, journal.id);
    unlinkIfPresent(journalPath(cwd, journal.id));
    // A rejected preflight must not leave a new installation behind.
    const directory = path.dirname(journalPath(cwd, journal.id));
    if (
      operation.createdDirectory &&
      fs.readdirSync(directory).length === 1 &&
      fs.existsSync(path.join(directory, ".gitignore"))
    ) {
      unlinkIfPresent(path.join(directory, ".gitignore"));
      try {
        fs.rmdirSync(directory);
        if (fs.readdirSync(path.dirname(directory)).length === 0)
          fs.rmdirSync(path.dirname(directory));
      } catch {
        /* Another process may already be using the metadata directory. */
      }
    }
    throw error;
  }
  journal.status = "failed";
  try {
    persist(cwd, journal);
  } catch (persistenceError) {
    logger.warn(
      `Unable to update failed operation status; the last write-ahead record remains. Run: helen recover ${journal.id}. ${persistenceError instanceof Error ? persistenceError.message : String(persistenceError)}`,
    );
  }
  throw new Error(
    `Operation ${journal.id} did not complete: ${error instanceof Error ? error.message : String(error)}. Files may have changed. Run: helen recover ${journal.id}`,
    { cause: error },
  );
}

function nestedOperation(
  cwd: string,
  independent = false,
): OperationState | undefined {
  const current = currentOperation.getStore();
  if (!current) return undefined;
  if (!current.active)
    throw new Error(
      "The project operation has already finished. Start a new operation outside its scope.",
    );
  if (sameDirectory(current.cwd, cwd)) return current;
  if (!independent)
    throw new Error(
      "A nested project operation must use the same project directory.",
    );
  return [...current.scopes.values()].find(
    (scope) => scope.active && sameDirectory(scope.cwd, cwd),
  );
}

function checkNestedResult<T>(
  current: OperationState,
  kind: string,
  value: T,
  successful: (value: T) => boolean,
): { value: T } {
  if (!successful(value)) {
    current.failure ??= {
      error: new Error(`Nested ${kind} operation did not complete.`),
    };
    throw current.failure.error;
  }
  return { value };
}

export async function runProjectOperation<T>(
  cwd: string,
  kind: string,
  action: () => Promise<T>,
  successful: (value: T) => boolean = () => true,
): Promise<{ value: T; operation?: OperationSummary }> {
  const current = nestedOperation(cwd);
  if (current) {
    try {
      return checkNestedResult(current, kind, await action(), successful);
    } catch (error) {
      current.failure ??= { error };
      throw error;
    }
  }
  const operation = beginOperation(cwd, kind);
  try {
    const value = await currentOperation.run(operation, action);
    return finishOperation(operation, value, successful);
  } catch (error) {
    return failOperation(operation, error);
  } finally {
    operation.active = false;
    operation.scopes.delete(operation.cwd);
  }
}

/** Synchronous commands use the same durable journal and exclusive lock. */
export function runProjectOperationSync<T>(
  cwd: string,
  kind: string,
  action: () => T,
  successful: (value: T) => boolean = () => true,
  options: { independent?: boolean } = {},
): { value: T; operation?: OperationSummary } {
  const current = nestedOperation(cwd, options.independent);
  const synchronousAction = (): T => {
    const value = action();
    if (
      value !== null &&
      (typeof value === "object" || typeof value === "function") &&
      "then" in value &&
      typeof value.then === "function"
    ) {
      throw new Error(
        "A synchronous project operation must not return a Promise. Use runProjectOperation for asynchronous work.",
      );
    }
    return value;
  };
  if (current) {
    try {
      return checkNestedResult(
        current,
        kind,
        currentOperation.run(current, synchronousAction),
        successful,
      );
    } catch (error) {
      current.failure ??= { error };
      throw error;
    }
  }
  const operation = beginOperation(cwd, kind);
  try {
    const value = currentOperation.run(operation, synchronousAction);
    return finishOperation(operation, value, successful);
  } catch (error) {
    return failOperation(operation, error);
  } finally {
    operation.active = false;
    operation.scopes.delete(operation.cwd);
  }
}

/** Undo an interrupted operation only when files still match a recorded version. */
export function recoverOperation(
  cwd: string,
  id: string,
  dryRun = false,
): OperationSummary {
  let journal = readJournal(cwd, id);
  assertRecoverable(journal, dryRun);
  if (dryRun) return restoreOperation(cwd, journal, true);
  const acquired = acquireRecoveryLease(cwd, id);
  try {
    // The journal and every conflict check must be refreshed after acquiring the
    // lease; another recovery could have finished while this caller was waiting.
    journal = readJournal(cwd, id);
    assertRecoverable(journal, false);
    return restoreOperation(cwd, journal, false);
  } finally {
    releaseRecoveryLease(acquired.file, acquired.lease);
  }
}

function assertRecoverable(journal: Journal, dryRun: boolean): void {
  const { id } = journal;
  if (journal.status !== "active" && journal.status !== "failed")
    throw new Error(`Operation ${id} is already ${journal.status}`);
  if (!dryRun && journal.status === "active" && journal.ownerPid) {
    if (processIsRunning(journal.ownerPid))
      throw new Error(
        `Operation ${id} is still running. Stop that HELEN process before recovery.`,
      );
  }
}

function restoreOperation(
  cwd: string,
  journal: Journal,
  dryRun: boolean,
): OperationSummary {
  const { id } = journal;
  // Validate every file before restoring any; preserve later user edits.
  for (const entry of journal.entries) {
    const file = path.resolve(cwd, entry.file);
    const hash = fs.existsSync(file) ? digest(fs.readFileSync(file)) : null;
    if (!entry.hashes.includes(hash))
      throw new Error(
        `Recovery conflict in ${entry.file}: the file changed after the operation. Preserve your edit and restore a recorded version before retrying recovery.`,
      );
  }
  if (!dryRun) {
    const restorations = [...journal.entries].reverse().map((entry) => {
      const file = path.resolve(cwd, entry.file);
      const temporary =
        entry.before === null ? undefined : `${file}.${id}.${randomUUID()}.tmp`;
      if (temporary) {
        assertFile(cwd, temporary);
        journal.temporaries.push(
          path.relative(cwd, temporary).replace(/\\/g, "/"),
        );
      }
      return { entry, file, temporary };
    });
    // Record every restoration temporary before it can contain original bytes.
    // A process terminated before rename can be recovered without leaving copies.
    persist(cwd, journal);
    for (const { entry, file, temporary } of restorations) {
      if (entry.before === null) {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } else
        atomicWrite(
          file,
          Buffer.from(entry.before, "base64"),
          entry.mode,
          temporary,
        );
    }
    for (const temporary of journal.temporaries) {
      const file = path.resolve(cwd, temporary);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    const interruptedWrite = `${journalPath(cwd, id)}.tmp`;
    assertFile(cwd, interruptedWrite);
    if (fs.existsSync(interruptedWrite)) fs.unlinkSync(interruptedWrite);
    journal.status = "recovered";
    persist(cwd, journal);
    unlinkIfPresent(journalPath(cwd, journal.id));
    releaseLock(cwd, journal.id);
  }
  return summary(journal);
}
