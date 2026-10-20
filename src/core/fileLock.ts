import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface LockOptions {
  /** How long to wait for the lock before giving up. */
  timeoutMs?: number;
  /** A lock older than this may be broken, but only when its holder is provably gone (see isAbandoned). */
  staleMs?: number;
}

interface LockRecord {
  token?: string;
  pid?: number;
  host?: string;
  at?: string;
}

const sleeper = new Int32Array(new SharedArrayBuffer(4));
const HOST = os.hostname();

/** Block the thread without spinning the CPU. */
export function sleepSync(ms: number): void {
  Atomics.wait(sleeper, 0, 0, Math.max(1, ms));
}

function readRecord(file: string): LockRecord | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as LockRecord;
  } catch {
    return null;
  }
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: the process exists but belongs to someone else.
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/**
 * A lock may only be broken when its holder cannot still be inside the critical section:
 * on this machine that means its process is gone; elsewhere (shared folder) that it is older than staleMs.
 * Age alone is never enough on the same host, because a slow holder would then lose its lock.
 */
function isAbandoned(record: LockRecord | null, ageMs: number, staleMs: number): boolean {
  if (record && typeof record.pid === 'number' && record.host === HOST) return !processAlive(record.pid);
  return ageMs > staleMs;
}

/**
 * Run `action` while holding an exclusive cross-process lock (an O_EXCL lock file).
 * Several agents may call HELEN at the same moment; without this, two read-modify-write
 * cycles on the same file silently lose one of the updates.
 */
export function withLockSync<T>(lockFile: string, action: () => T, options: LockOptions = {}): T {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const staleMs = options.staleMs ?? 30_000;
  const started = Date.now();
  const token = crypto.randomUUID();
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });

  for (;;) {
    if (Date.now() - started > timeoutMs) {
      throw new Error(`Timed out after ${timeoutMs} ms waiting for ${path.basename(lockFile)}; another HELEN process is holding it.`);
    }
    try {
      const fd = fs.openSync(lockFile, 'wx', 0o600);
      fs.writeSync(fd, JSON.stringify({ token, pid: process.pid, host: HOST, at: new Date().toISOString() }));
      fs.closeSync(fd);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }

    let info: fs.Stats;
    try {
      info = fs.lstatSync(lockFile);
    } catch {
      continue; // released between the open and the stat
    }
    if (!info.isFile()) {
      throw new Error(`${lockFile} is not a regular file (a symbolic link or folder). Remove it after checking nothing else uses it.`);
    }
    const record = readRecord(lockFile);
    if (isAbandoned(record, Date.now() - info.mtimeMs, staleMs)) {
      // Move the abandoned lock aside atomically, then make sure we moved the one we judged.
      const aside = `${lockFile}.${token}.stale`;
      try {
        fs.renameSync(lockFile, aside);
      } catch {
        continue; // someone else broke or released it
      }
      const moved = readRecord(aside);
      if (record?.token !== undefined && moved?.token !== record.token) {
        // We took a lock that was created after our check: put it back if nobody took the slot.
        try {
          fs.linkSync(aside, lockFile);
        } catch {
          // The slot is taken again; the moved lock's holder will see its token is gone and not remove anyone else's.
        }
      }
      fs.rmSync(aside, { force: true });
      continue;
    }
    sleepSync(10 + Math.floor(Math.random() * 25));
  }

  try {
    return action();
  } finally {
    // Never delete a lock that someone else holds now.
    if (readRecord(lockFile)?.token === token) fs.rmSync(lockFile, { force: true });
  }
}
