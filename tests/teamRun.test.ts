import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ApplyPlan, PlaybookStep } from "../src/core/apply.js";
import { parseDuration } from "../src/commands/teamCmd.js";
import { readEvents } from "../src/core/events.js";
import { buildWorkGraph, resultFile } from "../src/core/orchestrate.js";
import {
  readProgress,
  runChecks,
  startProgress,
} from "../src/core/progress.js";
import { presetCommand, runTeam, splitCommand } from "../src/core/teamRun.js";

function plan(steps: PlaybookStep[]): ApplyPlan {
  return {
    detection: { phase: "02-building", confidence: "low", evidence: [] },
    goalId: "test",
    goal: { title: "Test plan", description: "d", keywords: [], steps },
    installedSkills: [],
    missingSkills: [],
  };
}

// The real verifier is runChecks(); these run it against a script runner that passes or fails.
const PASS = (cwd: string) => runChecks(cwd, () => true);
const FAIL = (cwd: string) => runChecks(cwd, () => false);

describe("command parsing", () => {
  it("splits a command line honoring quotes, without a shell", () => {
    expect(splitCommand("claude -p --allowedTools Read")).toEqual([
      "claude",
      "-p",
      "--allowedTools",
      "Read",
    ]);
    expect(splitCommand(`node -e "console.log('a b')" 'x y'`)).toEqual([
      "node",
      "-e",
      "console.log('a b')",
      "x y",
    ]);
    expect(splitCommand('a "" b')).toEqual(["a", "", "b"]);
    expect(splitCommand("  ")).toEqual([]);
    expect(() => splitCommand('a "b')).toThrow(/Unterminated/);
  });

  it("parses durations", () => {
    expect(parseDuration("90")).toBe(90);
    expect(parseDuration("90s")).toBe(90);
    expect(parseDuration("30m")).toBe(1800);
    expect(parseDuration("1.5h")).toBe(5400);
    expect(() => parseDuration("soon")).toThrow(/Invalid duration/);
  });

  it("presets are explicit and unknown ones are rejected", () => {
    const item = { readOnly: true } as Parameters<typeof presetCommand>[1];
    expect(presetCommand("claude", item)).toEqual([
      "claude",
      "-p",
      "--allowedTools",
      "Read",
      "Glob",
      "Grep",
    ]);
    expect(
      presetCommand("claude", { readOnly: false } as typeof item),
    ).toContain("acceptEdits");
    expect(() => presetCommand("nope", item)).toThrow(/Unknown agent preset/);
  });
});

describe("helen team run", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "helen-run-"));
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "demo", scripts: { test: "echo test" } }),
    );
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const steps: PlaybookStep[] = [
    {
      kind: "prompt",
      ref: "audit-project-risk-and-architecture",
      why: "risks",
    },
    { kind: "prompt", ref: "research-competitive-benchmark", why: "market" },
    { kind: "prompt", ref: "generate-competitive-advantage", why: "write" },
    { kind: "checkpoint", ref: "audit-quality-gates-checkpoint", why: "gate" },
  ];

  // A worker that proves it received the brief, records when it ran and prints a finding.
  const worker = (extra = ""): string[] => [
    process.execPath,
    "-e",
    `
    const fs = require('fs'); const path = require('path');
    let brief = ''; process.stdin.on('data', c => brief += c).on('end', async () => {
      const item = process.env.HELEN_ITEM;
      if (!brief.includes('HELEN work item ' + item)) process.exit(3);
      const stamps = path.join(process.env.HELEN_PROJECT, 'stamps.jsonl');
      fs.appendFileSync(stamps, JSON.stringify({ item, start: Date.now() }) + '\\n');
      await new Promise(r => setTimeout(r, 400));
      ${extra}
      fs.appendFileSync(stamps, JSON.stringify({ item, end: Date.now() }) + '\\n');
      console.log('finding for ' + item);
    });
  `,
  ];

  it("runs read-only items in parallel, then the writer, then verifies the checkpoint itself", async () => {
    startProgress(tmp, plan(steps));
    let verified = 0;
    const result = await runTeam({
      cwd: tmp,
      command: worker(),
      concurrency: 3,
      verify: (dir) => {
        verified += 1;
        return PASS(dir);
      },
    });

    expect(result.finished).toBe(true);
    expect(result.failed).toEqual([]);
    expect(result.completed).toHaveLength(4);
    expect(verified).toBe(1);
    expect(readProgress(tmp)!.steps.map((step) => step.status)).toEqual([
      "done",
      "done",
      "done",
      "done",
    ]);

    const stamps = fs
      .readFileSync(path.join(tmp, "stamps.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map(
        (line) =>
          JSON.parse(line) as { item: string; start?: number; end?: number },
      );
    const span = (item: string) => ({
      start: stamps.find((s) => s.item === item && s.start)!.start!,
      end: stamps.find((s) => s.item === item && s.end)!.end!,
    });
    const [a, b] = result.graph.waves[0]!.map(span) as [
      { start: number; end: number },
      { start: number; end: number },
    ];
    expect(a.start).toBeLessThan(b.end);
    expect(b.start).toBeLessThan(a.end); // overlapped: they ran at the same time
    const writer = span(result.graph.waves[1]![0]!);
    expect(writer.start).toBeGreaterThanOrEqual(Math.max(a.end, b.end)); // the writer waited for the whole wave

    // A worker that only printed still leaves a result for the next wave.
    expect(
      fs.readFileSync(resultFile(tmp, result.graph.waves[0]![0]!), "utf8"),
    ).toContain("finding for");
    expect(
      readEvents(tmp, { type: "run.*" }).map((event) => event.type),
    ).toEqual(["run.started", "run.finished"]);
    expect(
      fs.existsSync(
        path.join(
          tmp,
          ".helen",
          "work",
          result.graph.waves[0]![0]!,
          "brief.md",
        ),
      ),
    ).toBe(true);
  }, 60_000);

  it("retries a failing worker once, then stops and leaves the item available", async () => {
    startProgress(tmp, plan(steps));
    const result = await runTeam({
      cwd: tmp,
      command: [process.execPath, "-e", "process.exit(1)"],
      retries: 1,
    });
    expect(result.finished).toBe(false);
    expect(result.failed.length).toBeGreaterThan(0);
    expect(result.stopped?.reason).toContain("exited with code 1");
    expect(
      readEvents(tmp, { type: "item.failed" }).length,
    ).toBeGreaterThanOrEqual(4); // 2 parallel items x (try + retry)
    expect(buildWorkGraph(tmp).counts.claimed).toBe(0);
    expect(buildWorkGraph(tmp).ready.length).toBe(2);
  }, 60_000);

  it("stops a worker that exceeds its time limit", async () => {
    startProgress(tmp, plan(steps.slice(0, 1)));
    const started = Date.now();
    const result = await runTeam({
      cwd: tmp,
      command: [process.execPath, "-e", "setTimeout(() => {}, 30000)"],
      timeoutMs: 400,
      retries: 0,
    });
    expect(Date.now() - started).toBeLessThan(10_000);
    expect(result.stopped?.reason).toContain("timed out");
  }, 30_000);

  it("does not trust a worker for a checkpoint: a failing gate stops the run", async () => {
    startProgress(tmp, plan(steps));
    const result = await runTeam({ cwd: tmp, command: worker(), verify: FAIL });
    expect(result.finished).toBe(false);
    expect(result.stopped?.reason).toContain("Checkpoint failed");
    expect(result.completed).toHaveLength(3);
    expect(buildWorkGraph(tmp).items[3]!.state).toBe("ready");
  }, 60_000);

  it("never installs external tools unattended", async () => {
    startProgress(
      tmp,
      plan([
        { kind: "external", ref: "taste-skill", why: "design skill" },
        ...steps.slice(0, 1),
      ]),
    );
    const result = await runTeam({ cwd: tmp, command: worker() });
    expect(result.runs).toBe(0);
    expect(result.stopped?.reason).toContain("approval");
    expect(fs.existsSync(path.join(tmp, "stamps.jsonl"))).toBe(false);
  });

  it("reports a worker that cannot even start", async () => {
    startProgress(tmp, plan(steps.slice(0, 1)));
    const result = await runTeam({
      cwd: tmp,
      command: ["definitely-not-a-real-program-xyz"],
      retries: 0,
    });
    expect(result.finished).toBe(false);
    expect(result.stopped?.reason).toMatch(/exited with code|Worker/);
  }, 30_000);

  it("stops at the safety limit instead of looping forever", async () => {
    startProgress(tmp, plan(steps));
    const result = await runTeam({
      cwd: tmp,
      command: worker(),
      maxRuns: 1,
      concurrency: 1,
      verify: PASS,
    });
    expect(result.finished).toBe(false);
    expect(result.stopped?.reason).toContain("safety limit");
  }, 60_000);
});
