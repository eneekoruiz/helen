import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "dist", "cli.js");

function run(cwd: string, args: string[], env: Record<string, string> = {}) {
  const execArgs = fs.existsSync(cli)
    ? [cli, ...args, "--json"]
    : [
        path.join(root, "node_modules", "tsx", "dist", "cli.mjs"),
        path.join(root, "src", "cli.ts"),
        ...args,
        "--json",
      ];
  const result = spawnSync(process.execPath, execArgs, {
    cwd,
    encoding: "utf8",
    timeout: 60000,
    env: { ...process.env, HELEN_AGENT: "", ...env },
  });
  expect(result.error).toBeUndefined();
  return { status: result.status, body: JSON.parse(result.stdout) };
}

describe("helen team (CLI)", () => {
  let cwd: string;
  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "helen-team-cli-"));
    fs.writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({
        name: "x",
        scripts: { test: 'node -e "process.exit(0)"' },
      }),
    );
  });
  afterEach(() => {
    fs.rmSync(cwd, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  });

  it("needs a tracked plan and an agent name, and says so", () => {
    const graph = run(cwd, ["team", "graph"]);
    expect(graph.status).toBe(1);
    expect(graph.body.errors[0]).toContain("Nothing is being tracked");
    expect(run(cwd, ["apply", "strategy", "--track"]).status).toBe(0);
    const claim = run(cwd, ["team", "claim"]);
    expect(claim.status).toBe(1);
    expect(claim.body.errors[0]).toContain("--agent");
  }, 120000);

  it("claims, briefs, hands off and completes from the command line", () => {
    run(cwd, ["apply", "strategy", "--track"]);
    const a = run(cwd, ["team", "claim", "--agent", "claude-1"]);
    expect(a.status).toBe(0);
    expect(a.body.data.claimed).toBe(true);
    const id = a.body.data.item.id as string;

    const clash = run(cwd, ["team", "claim", id, "--agent", "codex-1"]);
    expect(clash.status).toBe(1);
    expect(clash.body.data.holder.agent).toBe("claude-1");

    expect(
      run(cwd, ["team", "brief", id, "--agent", "claude-1"]).body.data.brief,
    ).toContain(`helen team complete ${id}`);
    expect(
      run(cwd, [
        "team",
        "handoff",
        "--from",
        "claude-1",
        "--to",
        "role:reviewer",
        "--message",
        "check risks",
      ]).status,
    ).toBe(0);
    expect(
      run(cwd, ["team", "inbox", "--agent", "rev", "--role", "reviewer"]).body
        .data.handoffs,
    ).toHaveLength(1);
    // The agent name can come from the environment instead of a flag.
    expect(
      run(cwd, ["team", "heartbeat", id, "--ttl", "10m"], {
        HELEN_AGENT: "claude-1",
      }).status,
    ).toBe(0);
    const done = run(cwd, [
      "team",
      "complete",
      id,
      "--agent",
      "claude-1",
      "--note",
      "ok",
    ]);
    expect(done.status).toBe(0);
    expect(done.body.data.counts.done).toBe(1);
    expect(
      run(cwd, ["team", "events", "--type", "item.*"]).body.data.events,
    ).toHaveLength(1);
    expect(run(cwd, ["team", "graph"]).body.data.counts.done).toBe(1);
  }, 180000);

  it("previews a run without starting workers, and refuses an unsafe or missing worker choice", () => {
    const dry = run(cwd, [
      "team",
      "run",
      "strategy",
      "--agent",
      "claude",
      "--dry-run",
    ]);
    expect(dry.status).toBe(0);
    expect(dry.body.data.dryRun).toBe(true);
    expect(dry.body.data.plan[0].parallel).toBe(true);
    expect(dry.body.data.plan[0].items[0].command.slice(0, 2)).toEqual([
      "claude",
      "-p",
    ]);
    expect(run(cwd, ["team", "run", "--dry-run"]).body.errors[0]).toContain(
      "Choose the worker",
    );
    expect(
      run(cwd, [
        "team",
        "run",
        "--agent",
        "claude",
        "--command",
        "x",
        "--dry-run",
      ]).body.errors[0],
    ).toContain("either");
    expect(
      run(cwd, [
        "team",
        "run",
        "strategy",
        "--agent",
        "gemini-magic",
        "--dry-run",
      ]).body.errors[0],
    ).toContain("Unknown agent preset");
  }, 180000);

  it("runs a plan to its approval stop with a custom worker command", () => {
    const worker = `${JSON.stringify(process.execPath)} -e "process.stdin.resume();process.stdin.on('end',()=>console.log('analysis done'))"`;
    const result = run(cwd, [
      "team",
      "run",
      "strategy",
      "--command",
      worker,
      "--concurrency",
      "5",
      "--timeout",
      "1m",
    ]);
    expect(result.status).toBe(1);
    expect(result.body.errors[0]).toContain("approval");
    expect(result.body.data.completed).toHaveLength(5);
    expect(result.body.data.graph.counts.done).toBe(5);
  }, 180000);
});
