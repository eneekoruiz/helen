import fs from 'node:fs';
import path from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { isSafeProjectPath } from './fs.js';
import { logger } from './logger.js';

const journalSchema = z.object({
  version: z.literal(1), id: z.string().uuid(), kind: z.string(),
  status: z.enum(['active', 'failed', 'committed', 'recovered']), startedAt: z.string().datetime(),
  ownerPid: z.number().int().positive().optional(), temporaries: z.array(z.string()).default([]),
  entries: z.array(z.object({
    file: z.string(), before: z.string().nullable(), mode: z.number().int().optional(),
    hashes: z.array(z.string().nullable()),
  })),
});
type Journal = z.infer<typeof journalSchema>;
const currentOperation = new AsyncLocalStorage<{ cwd: string; journal: Journal }>();
const digest = (content: Buffer): string => createHash('sha256').update(content).digest('hex');
const journalPath = (cwd: string, id: string): string => path.join(cwd, '.helen', 'operations', `${id}.json`);
const lockPath = (cwd: string): string => path.join(cwd, '.helen', 'operations', '.lock');

function unlinkIfPresent(file: string): void {
  try { fs.unlinkSync(file); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}

function releaseLock(cwd: string, id: string): void {
  const file = lockPath(cwd);
  assertFile(cwd, file);
  if (fs.existsSync(file) && journalSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8'))).id === id) unlinkIfPresent(file);
}

/** Atomic replacement: readers see the previous complete file or the new complete file. */
function atomicWrite(file: string, content: string | Buffer, mode?: number, preparedTemporary?: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = preparedTemporary ?? `${file}.${randomUUID()}.tmp`;
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(temporary, 'wx', mode ?? 0o666);
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
  if (!isSafeProjectPath(cwd, file) || path.resolve(file) === path.resolve(cwd) ||
      (fs.existsSync(file) && !fs.lstatSync(file).isFile())) {
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

/** Persist original bytes and all intended versions before the filesystem mutation. */
export function beforeFileMutation(file: string, after: string | Buffer | null): void {
  const operation = currentOperation.getStore();
  if (!operation) return;
  const { cwd, journal } = operation;
  const absolute = path.resolve(file);
  assertFile(cwd, absolute);
  const relative = path.relative(cwd, absolute).replace(/\\/g, '/');
  if (relative.startsWith('.helen/operations/')) throw new Error('Operation journals cannot be mutated by an operation');
  let entry = journal.entries.find(candidate => candidate.file === relative);
  if (!entry) {
    const before = fs.existsSync(absolute) ? fs.readFileSync(absolute) : null;
    entry = { file: relative, before: before?.toString('base64') ?? null,
      mode: before ? fs.statSync(absolute).mode & 0o777 : undefined,
      hashes: [before ? digest(before) : null] };
    journal.entries.push(entry);
  }
  const hash = after === null ? null : digest(Buffer.isBuffer(after) ? after : Buffer.from(after));
  if (!entry.hashes.includes(hash)) entry.hashes.push(hash);
  persist(cwd, journal);
}

export function writeAtomicFile(file: string, content: string | Buffer, options: { mode?: number } = {}): void {
  beforeFileMutation(file, content);
  const mode = options.mode ?? (fs.existsSync(file) ? fs.statSync(file).mode & 0o777 : undefined);
  const operation = currentOperation.getStore();
  let temporary: string | undefined;
  if (operation) {
    temporary = `${file}.${operation.journal.id}.${randomUUID()}.tmp`;
    assertFile(operation.cwd, temporary);
    operation.journal.temporaries.push(path.relative(operation.cwd, temporary).replace(/\\/g, '/'));
    persist(operation.cwd, operation.journal);
  }
  atomicWrite(file, content, mode, temporary);
}

export function removeTrackedFile(file: string): void {
  if (!fs.existsSync(file)) return;
  beforeFileMutation(file, null);
  fs.unlinkSync(file);
}

export interface OperationSummary {
  id: string; kind: string; status: Journal['status']; startedAt: string; files: string[]; recoveryCommand: string;
}

function summary(journal: Journal): OperationSummary {
  return { id: journal.id, kind: journal.kind, status: journal.status, startedAt: journal.startedAt,
    files: journal.entries.map(entry => entry.file), recoveryCommand: `helen recover ${journal.id}` };
}

function readJournal(cwd: string, id: string): Journal {
  if (!z.string().uuid().safeParse(id).success) throw new Error('Operation ID must be a UUID. List IDs with: helen recover');
  const file = journalPath(cwd, id);
  assertFile(cwd, file);
  const journal = journalSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (journal.id !== id) throw new Error('Operation journal ID does not match its filename');
  for (const entry of journal.entries) {
    const relative = path.relative(cwd, path.resolve(cwd, entry.file)).replace(/\\/g, '/');
    if (path.isAbsolute(entry.file) || relative.startsWith('.helen/operations/')) throw new Error('Invalid recovery target in operation journal');
    assertFile(cwd, path.resolve(cwd, entry.file));
  }
  for (const temporary of journal.temporaries) {
    if (!temporary.endsWith('.tmp') || !temporary.includes(`.${id}.`)) throw new Error('Invalid temporary file in operation journal');
    assertFile(cwd, path.resolve(cwd, temporary));
  }
  return journal;
}

export function listOperations(cwd: string): OperationSummary[] {
  const directory = path.join(cwd, '.helen', 'operations');
  if (!isSafeProjectPath(cwd, directory)) throw new Error('Unsafe operation journal directory');
  if (!fs.existsSync(directory)) return [];
  const lock = lockPath(cwd);
  assertFile(cwd, lock);
  if (fs.existsSync(lock)) {
    const owner = journalSchema.parse(JSON.parse(fs.readFileSync(lock, 'utf8')));
    // Journal removal occurs only after commit/recovery, so an orphan lock is safe to clean.
    const ownerFile = journalPath(cwd, owner.id);
    assertFile(cwd, ownerFile);
    if (!fs.existsSync(ownerFile)) unlinkIfPresent(lock);
    else {
      const current = journalSchema.parse(JSON.parse(fs.readFileSync(ownerFile, 'utf8')));
      if (current.status === 'committed' || current.status === 'recovered') {
        unlinkIfPresent(ownerFile);
        releaseLock(cwd, owner.id);
      }
    }
  }
  return fs.readdirSync(directory).filter(name => name.endsWith('.json')).map(name =>
    summary(readJournal(cwd, name.slice(0, -5)))).filter(operation => operation.status === 'active' || operation.status === 'failed');
}

export async function runProjectOperation<T>(cwd: string, kind: string, action: () => Promise<T>,
  successful: (value: T) => boolean = () => true): Promise<{ value: T; operation?: OperationSummary }> {
  if (currentOperation.getStore()) return { value: await action() };
  const pending = listOperations(cwd);
  if (pending.length) throw new Error(`An unfinished ${pending[0]!.kind} operation needs recovery. Run: ${pending[0]!.recoveryCommand}`);
  const journal: Journal = { version: 1, id: randomUUID(), kind, status: 'active', startedAt: new Date().toISOString(), entries: [], ownerPid: process.pid, temporaries: [] };
  const ignore = path.join(cwd, '.helen', 'operations', '.gitignore');
  assertFile(cwd, ignore);
  const ignoreContent = fs.existsSync(ignore) ? fs.readFileSync(ignore, 'utf8') : '';
  if (!ignoreContent.split(/\r?\n/).some(line => line.trim() === '*')) atomicWrite(ignore, `${ignoreContent}${ignoreContent.endsWith('\n') || !ignoreContent ? '' : '\n'}*\n`, 0o600);
  persist(cwd, journal);
  try {
    // Exclusive hard-link creation makes the initial complete journal the lock.
    fs.linkSync(journalPath(cwd, journal.id), lockPath(cwd));
  } catch (error) {
    fs.unlinkSync(journalPath(cwd, journal.id));
    throw new Error('Another project operation is active. Run: helen recover', { cause: error });
  }
  try {
    const value = await currentOperation.run({ cwd, journal }, action);
    journal.status = successful(value) ? 'committed' : 'failed';
    persist(cwd, journal);
    if (journal.status === 'committed' || journal.entries.length === 0) {
      unlinkIfPresent(journalPath(cwd, journal.id));
      releaseLock(cwd, journal.id);
    }
    return { value, operation: journal.status === 'failed' && journal.entries.length > 0 ? summary(journal) : undefined };
  } catch (error) {
    if (journal.entries.length === 0) {
      unlinkIfPresent(journalPath(cwd, journal.id));
      releaseLock(cwd, journal.id);
      throw error;
    }
    journal.status = 'failed';
    try { persist(cwd, journal); }
    catch (persistenceError) {
      logger.warn(`Unable to update failed operation status; the last write-ahead record remains. Run: helen recover ${journal.id}. ${persistenceError instanceof Error ? persistenceError.message : String(persistenceError)}`);
    }
    throw new Error(`Operation ${journal.id} did not complete: ${error instanceof Error ? error.message : String(error)}. Files may have changed. Run: helen recover ${journal.id}`, { cause: error });
  }
}

/** Undo an interrupted operation only when files still match a recorded version. */
export function recoverOperation(cwd: string, id: string, dryRun = false): OperationSummary {
  const journal = readJournal(cwd, id);
  if (journal.status !== 'active' && journal.status !== 'failed') throw new Error(`Operation ${id} is already ${journal.status}`);
  if (!dryRun && journal.status === 'active' && journal.ownerPid) {
    let running = true;
    try { process.kill(journal.ownerPid, 0); }
    catch (error) { running = (error as NodeJS.ErrnoException).code !== 'ESRCH'; }
    if (running) throw new Error(`Operation ${id} is still running. Stop that HELEN process before recovery.`);
  }
  // Validate every file before restoring any; preserve later user edits.
  for (const entry of journal.entries) {
    const file = path.resolve(cwd, entry.file);
    const hash = fs.existsSync(file) ? digest(fs.readFileSync(file)) : null;
    if (!entry.hashes.includes(hash)) throw new Error(`Recovery conflict in ${entry.file}: the file changed after the operation. Preserve your edit and restore a recorded version before retrying recovery.`);
  }
  if (!dryRun) {
    for (const entry of [...journal.entries].reverse()) {
      const file = path.resolve(cwd, entry.file);
      if (entry.before === null) { if (fs.existsSync(file)) fs.unlinkSync(file); }
      else atomicWrite(file, Buffer.from(entry.before, 'base64'), entry.mode);
    }
    for (const temporary of journal.temporaries) {
      const file = path.resolve(cwd, temporary);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    const interruptedWrite = `${journalPath(cwd, id)}.tmp`;
    assertFile(cwd, interruptedWrite);
    if (fs.existsSync(interruptedWrite)) fs.unlinkSync(interruptedWrite);
    journal.status = 'recovered';
    persist(cwd, journal);
    unlinkIfPresent(journalPath(cwd, journal.id));
    releaseLock(cwd, journal.id);
  }
  return summary(journal);
}
