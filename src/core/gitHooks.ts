import fs from "node:fs";
import { writeAtomicFile } from "./operations.js";
import {
  hooksPathPrepareScript,
  readHooksPath,
} from "../modules/guardrails/hooksPath.js";
import path from "node:path";
import { spawnSync } from "node:child_process";

/** Portable on cmd.exe, PowerShell and POSIX shells, and harmless outside a git repository. */
export const PREPARE_SCRIPT = hooksPathPrepareScript;

/** The single source of the hooks HELEN installs. The guardrails module, doctor --fix and this repository all use it. */
export const PRE_COMMIT_HOOK = `#!/bin/sh
# HELEN pre-commit: inspect staged blobs (paths with spaces included); fast checks on staged files only, no dependencies.
# Skip once with: git commit --no-verify
node --input-type=commonjs <<'HELEN_NODE'
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const git = (...args) => execFileSync('git', args, { maxBuffer: 32 * 1024 * 1024 });
let failed = false;
try {
  const files = git('diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR').toString().split('\\0').filter(Boolean);
  for (const file of files) {
    const fail = (reason) => { console.error('✖ ' + JSON.stringify(file) + ': ' + reason); failed = true; };
    const name = path.posix.basename(file);
    if ((name === '.env' || name.startsWith('.env.') || name.endsWith('.env')) && !/\\.(example|sample|template)$/.test(name)) fail('environment files must not be committed');
    const blob = git('show', ':' + file);
    if (blob.length > 5242880) fail('larger than 5 MB (use Git LFS or external storage)');
    const content = blob.toString();
    if (/^(<<<<<<<|>>>>>>>) /m.test(content)) fail('merge conflict markers');
    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36}|sk-(live|proj)-[A-Za-z0-9_-]{16,}|xox[baprs]-[A-Za-z0-9-]{10,}/.test(content)) fail('looks like it contains a secret (value not shown)');
  }
} catch {
  console.error('Unable to inspect staged files; commit blocked.');
  failed = true;
}
if (failed) { console.error('Commit blocked by .githooks/pre-commit'); process.exit(1); }
HELEN_NODE
`;

export const PRE_PUSH_HOOK = `#!/bin/sh
# HELEN pre-push: run the project's own quality scripts that exist.
# Skip once with: git push --no-verify
if [ -f pnpm-lock.yaml ]; then pm=pnpm; elif [ -f yarn.lock ]; then pm=yarn; elif [ -f bun.lockb ] || [ -f bun.lock ]; then pm=bun; else pm=npm; fi
[ -f package.json ] || exit 0

for script in typecheck lint format:check docs:check test build; do
  if node -e "process.exit(require('./package.json').scripts?.['$script'] ? 0 : 1)" 2>/dev/null; then
    echo "▸ $pm run $script"
    CI=1 $pm run "$script" || { echo "✖ $script failed: push blocked by .githooks/pre-push"; exit 1; }
  fi
done
`;

export const HOOK_FILES: Record<string, string> = {
  "pre-commit": PRE_COMMIT_HOOK,
  "pre-push": PRE_PUSH_HOOK,
};

const IS_WINDOWS = process.platform === "win32";

function git(cwd: string, args: string[]): { ok: boolean; out: string } {
  const result = spawnSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    timeout: 10000,
    windowsHide: true,
  });
  return { ok: result.status === 0, out: (result.stdout ?? "").trim() };
}

/** True when `cwd` is the top level of a git work tree (not a folder inside a parent repository). */
export function isGitRoot(cwd: string): boolean {
  const top = git(cwd, ["rev-parse", "--show-toplevel"]);
  if (!top.ok) return false;
  try {
    return fs.realpathSync.native(top.out) === fs.realpathSync.native(cwd);
  } catch {
    return false;
  }
}

export interface HooksStatus {
  directory: boolean;
  present: string[];
  missing: string[];
  /** Hooks git would silently ignore because they lack the executable bit (POSIX only). */
  notExecutable: string[];
  /** null when the folder is not a git repository root. */
  hooksPathActive: boolean | null;
}

export function hooksStatus(cwd: string): HooksStatus {
  const dir = path.join(cwd, ".githooks");
  const directory = fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  const present = directory
    ? fs
        .readdirSync(dir)
        .filter((name) => fs.statSync(path.join(dir, name)).isFile())
        .sort()
    : [];
  const missing = Object.keys(HOOK_FILES).filter(
    (name) => !present.includes(name),
  );
  const notExecutable = IS_WINDOWS
    ? []
    : present.filter(
        (name) => (fs.statSync(path.join(dir, name)).mode & 0o111) === 0,
      );
  const hooksPathActive = isGitRoot(cwd)
    ? git(cwd, ["config", "--local", "core.hooksPath"]).out === ".githooks"
    : null;
  return { directory, present, missing, notExecutable, hooksPathActive };
}

/** Write the hooks that are missing and set the executable bit on every hook. Existing content is never replaced. */
export function ensureHooks(
  cwd: string,
  options: { dryRun?: boolean } = {},
): { created: string[]; madeExecutable: string[] } {
  const dir = path.join(cwd, ".githooks");
  const created: string[] = [];
  const madeExecutable: string[] = [];
  for (const [name, content] of Object.entries(HOOK_FILES)) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) continue;
    created.push(name);
    if (!options.dryRun) {
      fs.mkdirSync(dir, { recursive: true });
      writeAtomicFile(file, content, { mode: 0o755 });
    }
  }
  if (!IS_WINDOWS && fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir)) {
      const file = path.join(dir, name);
      if (!fs.statSync(file).isFile() || (fs.statSync(file).mode & 0o111) !== 0)
        continue;
      madeExecutable.push(name);
      if (!options.dryRun)
        writeAtomicFile(file, fs.readFileSync(file), {
          mode: fs.statSync(file).mode | 0o111,
        });
    }
  }
  return { created, madeExecutable };
}

/** Point git at .githooks, but only for the repository whose root is `cwd` (a parent repo would be affected too). */
export function activateHooks(
  cwd: string,
  options: { dryRun?: boolean } = {},
): { active: boolean; changed: boolean; note?: string } {
  if (!isGitRoot(cwd))
    return {
      active: false,
      changed: false,
      note: "Not the root of a git repository; hooks path left unchanged.",
    };
  const state = readHooksPath(cwd);
  if (state.kind === "owned") return { active: true, changed: false };
  // Another hook manager (husky, lefthook, a global hooksPath) owns the hooks: never replace it.
  if (state.kind === "custom")
    return {
      active: false,
      changed: false,
      note: `Kept the existing core.hooksPath ${JSON.stringify(state.value)}; HELEN hooks stay inactive.`,
    };
  if (options.dryRun) return { active: false, changed: true };
  const set = git(cwd, ["config", "--local", "core.hooksPath", ".githooks"]);
  return set.ok
    ? { active: true, changed: true }
    : { active: false, changed: false, note: "Could not set core.hooksPath." };
}
