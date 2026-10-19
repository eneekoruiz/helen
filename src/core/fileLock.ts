import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface LockOptions {
  /** How long to wait for the lock before giving up. */
  timeoutMs?: number;
  /** A lock older than this is assumed to belong to a crashed process and is broken. */
  staleMs?: number;
}

const sleeper = new Int32Array(new SharedArrayBuffer(4));

/** Block the thread without spinning the CPU. */
export function sleepSync(ms: number): void {
  Atomics.wait(sleeper, 0, 0, Math.max(1, ms));
}

function readToken(lockFile: string): string | undefined {
  try {
    return (JSON.parse(fs.readFileSync(lockFile, 'utf8')) as { token?: string }).token;
  } catch {
    return undefined;
  }
}

/**
 * Run `action` while holding an exclusive cross-process lock (an O_EXCL lock file).
 * Several agents may call HELEN at the same moment; without this, two read-modify-write
 * cycles on the same JSON file silently lose one of the updates.
 */
export function withLockSync<T>(lockFile: string, action: () => T, options: LockOptions = {}): T {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const staleMs = options.staleMs ?? 30_000;
  const started = Date.now();
  const token = crypto.randomUUID();
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });

  for (;;) {
    try {
      const fd = fs.openSync(lockFile, 'wx', 0o600);
      fs.writeSync(fd, JSON.stringify({ token, pid: process.pid, at: new Date().toISOString() }));
      fs.closeSync(fd);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      let age = 0;
      try {
        age = Date.now() - fs.statSync(lockFile).mtimeMs;
      } catch {
        continue; // released between the open and the stat: try again immediately
      }
      if (age > staleMs) {
        // Only remove the lock we actually saw: someone may have replaced it in the meantime.
        const seen = readToken(lockFile);
        if (readToken(lockFile) === seen) fs.rmSync(lockFile, { force: true });
        continue;
      }
      if (Date.now() - started > timeoutMs) {
        throw new Error(`Timed out after ${timeoutMs} ms waiting for ${path.basename(lockFile)}; another HELEN process is holding it.`);
      }
      sleepSync(10 + Math.floor(Math.random() * 25));
    }
  }

  try {
    return action();
  } finally {
    // Never delete a lock that a process which broke ours as stale has since taken.
    if (readToken(lockFile) === token) fs.rmSync(lockFile, { force: true });
  }
}
