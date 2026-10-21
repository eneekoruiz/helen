import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/*
 * Regressions for defects an independent audit found in the Codex-written layers. Each test names the defect.
 */
const root = path.resolve(import.meta.dirname, "..");
const dist = (file: string) =>
  pathToFileURL(path.join(root, "dist", file)).href;

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "helen-audit-"));
});
afterEach(() =>
  fs.rmSync(tmp, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  }),
);

function node(script: string, input?: string) {
  return spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: tmp,
    encoding: "utf8",
    timeout: 60_000,
    input,
  });
}

describe("project scripts and the protocol streams", () => {
  it("a project script never writes to our stdout nor reads our stdin", () => {
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({
        name: "demo",
        scripts: {
          test: "node -e \"process.stdout.write('NOI'+'SE-FROM-SCRIPT\\n'); process.stdin.on('data', d => process.stderr.write('STO' + 'LE:' + d)); process.stdin.on('end', () => {})\"",
        },
      }),
    );
    const result = node(
      `import { runChecks } from ${JSON.stringify(dist("core/progress.js"))};
      const run = runChecks(process.cwd());
      process.stdout.write(JSON.stringify({ ok: run.ok }) + '\\n');`,
      "PROTOCOL-INPUT\n",
    );
    expect(result.stdout.trim()).toBe(JSON.stringify({ ok: true }));
    expect(result.stdout).not.toContain("NOISE-FROM-SCRIPT");
    expect(result.stderr).not.toContain("STOLE:");
  });
});

describe("operation journals that arrive with a repository", () => {
  it("are never replayed: no write into .git/hooks, no blocked commands", () => {
    const sha = (text: string) =>
      createHash("sha256").update(text).digest("hex");
    const before = "#!/bin/sh\necho OWNED\n";
    const id = "11111111-2222-4333-8444-555555555555";
    fs.mkdirSync(path.join(tmp, ".git", "hooks"), { recursive: true });
    fs.mkdirSync(path.join(tmp, ".helen", "operations"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, ".helen", "operations", `${id}.json`),
      JSON.stringify({
        version: 1,
        id,
        kind: "hostile",
        status: "failed",
        startedAt: new Date().toISOString(),
        temporaries: [],
        entries: [
          {
            file: ".git/hooks/pre-commit",
            before: Buffer.from(before).toString("base64"),
            mode: 0o755,
            hashes: [sha(before), null],
          },
        ],
      }),
    );
    fs.writeFileSync(
      path.join(tmp, ".helen", "operations", "broken.json"),
      "{ not json",
    );
    const result =
      node(`import { listOperations, recoverOperation } from ${JSON.stringify(dist("core/operations.js"))};
      const pending = listOperations(process.cwd());
      let refused = '';
      try { recoverOperation(process.cwd(), ${JSON.stringify(id)}); } catch (error) { refused = error.message; }
      process.stdout.write(JSON.stringify({ pending: pending.length, refused }) + '\\n');`);
    const report = JSON.parse(
      result.stdout
        .split("\n")
        .filter((line) => line.startsWith("{"))
        .at(-1)!,
    );
    expect(report.pending).toBe(0);
    expect(report.refused).toMatch(
      /not created by this HELEN installation|Invalid recovery target/,
    );
    expect(fs.existsSync(path.join(tmp, ".git", "hooks", "pre-commit"))).toBe(
      false,
    );
  });
});
