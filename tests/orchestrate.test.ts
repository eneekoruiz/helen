import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ApplyPlan, PlaybookStep } from "../src/core/apply.js";
import {
  ClaimConflictError,
  claimItem,
  heartbeatClaim,
  listClaims,
  normalizeScope,
  releaseClaim,
  scopesOverlap,
} from "../src/core/claims.js";
import {
  appendEvent,
  cleanText,
  eventsFile,
  readEvents,
} from "../src/core/events.js";
import { withLockSync } from "../src/core/fileLock.js";
import {
  ackHandoff,
  buildWorkGraph,
  claimNextItem,
  claimWorkItem,
  completeWorkItem,
  createHandoff,
  formatItemBrief,
  readInbox,
  releaseWorkItem,
  resultFile,
  skipWorkItem,
} from "../src/core/orchestrate.js";
import { readProgress, startProgress } from "../src/core/progress.js";

const STEPS: PlaybookStep[] = [
  { kind: "skill", ref: "helen-design", why: "criteria" },
  { kind: "prompt", ref: "audit-project-risk-and-architecture", why: "risks" },
  { kind: "prompt", ref: "research-competitive-benchmark", why: "market" },
  {
    kind: "prompt",
    ref: "generate-competitive-advantage",
    why: "write the advantage",
  },
  { kind: "prompt", ref: "init-architecture-and-scaffold", why: "scaffold" },
  { kind: "checkpoint", ref: "audit-quality-gates-checkpoint", why: "gate" },
];

function plan(steps: PlaybookStep[] = STEPS): ApplyPlan {
  return {
    detection: { phase: "02-building", confidence: "low", evidence: [] },
    goalId: "test",
    goal: { title: "Test plan", description: "d", keywords: [], steps },
    installedSkills: [],
    missingSkills: [],
  };
}

describe("coordination primitives", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "helen-team-"));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  describe("file lock", () => {
    it("releases the lock even when the action throws, and returns its value", () => {
      const lock = path.join(tmp, ".helen", "x.lock");
      expect(withLockSync(lock, () => 42)).toBe(42);
      expect(() =>
        withLockSync(lock, () => {
          throw new Error("boom");
        }),
      ).toThrow("boom");
      expect(fs.existsSync(lock)).toBe(false);
    });

    it("times out while another process holds it and breaks a stale lock", () => {
      const lock = path.join(tmp, ".helen", "y.lock");
      fs.mkdirSync(path.dirname(lock), { recursive: true });
      fs.writeFileSync(lock, JSON.stringify({ token: "other", pid: 1 }));
      expect(() => withLockSync(lock, () => 1, { timeoutMs: 120 })).toThrow(
        /Timed out/,
      );
      const old = new Date(Date.now() - 60_000);
      fs.utimesSync(lock, old, old);
      expect(
        withLockSync(lock, () => "taken", { timeoutMs: 500, staleMs: 1000 }),
      ).toBe("taken");
    });
  });

  describe("event log", () => {
    it("records, filters and survives torn lines", () => {
      appendEvent(tmp, { type: "claim.created", agent: "a", item: "s01-x" });
      appendEvent(tmp, {
        type: "item.completed",
        agent: "a",
        item: "s01-x",
        data: { note: "ok" },
      });
      appendEvent(tmp, { type: "claim.created", agent: "b", item: "s02-y" });
      fs.appendFileSync(eventsFile(tmp), '{"ts":"broken\n');
      expect(readEvents(tmp)).toHaveLength(3);
      expect(readEvents(tmp, { type: "claim.*" }).map((e) => e.item)).toEqual([
        "s01-x",
        "s02-y",
      ]);
      expect(readEvents(tmp, { agent: "b" })).toHaveLength(1);
      expect(readEvents(tmp, { item: "s01-x", limit: 1 })[0]!.type).toBe(
        "item.completed",
      );
    });

    it("strips control characters and prototype keys from event data", () => {
      const event = appendEvent(tmp, {
        type: "note\u0007",
        data: {
          message: "a\u0000b\u001bc",
          __proto__: { polluted: true } as unknown as string,
        },
      });
      expect(event.type).toBe("note");
      expect(JSON.stringify(event.data)).not.toContain("polluted");
      expect(event.data!.message).toBe("abc");
      expect(cleanText("x".repeat(10), 4)).toBe("xxxx");
    });
  });

  describe("claims", () => {
    const t0 = new Date("2026-01-01T10:00:00Z");
    const at = (seconds: number) => new Date(t0.getTime() + seconds * 1000);

    it("lets one agent win, renews for the holder and rejects the others", () => {
      const first = claimItem(tmp, {
        item: "s01-x",
        agent: "a",
        now: t0,
        ttlSeconds: 60,
      });
      expect(first.renewed).toBe(false);
      expect(() =>
        claimItem(tmp, { item: "s01-x", agent: "b", now: at(10) }),
      ).toThrow(ClaimConflictError);
      const again = claimItem(tmp, {
        item: "s01-x",
        agent: "a",
        now: at(30),
        ttlSeconds: 60,
        token: first.token,
      });
      expect(again.renewed).toBe(true);
      expect(again.token).toBe(first.token);
      expect(again.claim.expiresAt).toBe(at(90).toISOString());
      // Only a hash is stored: the token itself never reaches the disk.
      expect(
        fs.readFileSync(
          path.join(tmp, ".helen", "claims", "s01-x.json"),
          "utf8",
        ),
      ).not.toContain(first.token);
    });

    it("lets another agent take over after the lease expired and records it", () => {
      claimItem(tmp, { item: "s01-x", agent: "a", now: t0, ttlSeconds: 60 });
      const taken = claimItem(tmp, { item: "s01-x", agent: "b", now: at(61) });
      expect(taken.tookOverFrom?.agent).toBe("a");
      expect(listClaims(tmp, at(62)).active.map((c) => c.agent)).toEqual(["b"]);
      expect(readEvents(tmp, { type: "claim.expired" })[0]!.data).toMatchObject(
        { takenBy: "b" },
      );
    });

    it("heartbeat extends only for the holder and not after expiry", () => {
      claimItem(tmp, { item: "s01-x", agent: "a", now: t0, ttlSeconds: 60 });
      expect(
        heartbeatClaim(tmp, "s01-x", "a", { ttlSeconds: 120, now: at(30) })
          .expiresAt,
      ).toBe(at(150).toISOString());
      expect(() =>
        heartbeatClaim(tmp, "s01-x", "b", { ttlSeconds: 60, now: at(31) }),
      ).toThrow(ClaimConflictError);
      expect(() =>
        heartbeatClaim(tmp, "s01-x", "a", { ttlSeconds: 60, now: at(400) }),
      ).toThrow(/expired/);
      expect(() => heartbeatClaim(tmp, "nope", "a")).toThrow(/no claim/);
    });

    it("only the holder (or force) can release", () => {
      claimItem(tmp, { item: "s01-x", agent: "a", now: t0 });
      expect(() => releaseClaim(tmp, "s01-x", "b", { now: at(1) })).toThrow(
        ClaimConflictError,
      );
      expect(
        releaseClaim(tmp, "s01-x", "b", { force: true, now: at(1) })?.agent,
      ).toBe("a");
      expect(releaseClaim(tmp, "s01-x", "a")).toBeNull();
    });

    it("rejects overlapping write scopes between agents but allows disjoint ones and the same agent", () => {
      claimItem(tmp, {
        item: "one",
        agent: "a",
        paths: ["src/ui/**"],
        now: t0,
      });
      expect(() =>
        claimItem(tmp, {
          item: "two",
          agent: "b",
          paths: ["src/ui/Button.tsx"],
          now: t0,
        }),
      ).toThrow(/overlap/);
      expect(
        claimItem(tmp, {
          item: "two",
          agent: "b",
          paths: ["src/api/**"],
          now: t0,
        }).claim.paths,
      ).toEqual(["src/api/**"]);
      expect(
        claimItem(tmp, {
          item: "three",
          agent: "a",
          paths: ["src/ui/Card.tsx"],
          now: t0,
        }).renewed,
      ).toBe(false);
      expect(
        claimItem(tmp, { item: "four", agent: "c", paths: [], now: t0 }).claim
          .paths,
      ).toEqual([]);
    });

    it("validates names, leases and scopes", () => {
      expect(() => claimItem(tmp, { item: "../etc", agent: "a" })).toThrow(
        /Invalid work item/,
      );
      expect(() => claimItem(tmp, { item: "ok", agent: "a b" })).toThrow(
        /Invalid agent/,
      );
      expect(() =>
        claimItem(tmp, { item: "ok", agent: "a", ttlSeconds: 5 }),
      ).toThrow(/Lease/);
      expect(() =>
        claimItem(tmp, { item: "ok", agent: "a", paths: ["../outside"] }),
      ).toThrow(/inside the project/);
      expect(() =>
        claimItem(tmp, { item: "ok", agent: "a", paths: ["/abs"] }),
      ).toThrow(/relative/);
      expect(normalizeScope("src\\ui\\")).toBe("src/ui/**");
    });

    it("computes scope overlap conservatively", () => {
      expect(scopesOverlap(["src/a/**"], ["src/b/**"])).toBe(false);
      expect(scopesOverlap(["src/a.ts"], ["src/b.ts"])).toBe(false);
      expect(scopesOverlap(["src/**"], ["src/a/b.ts"])).toBe(true);
      expect(scopesOverlap(["**"], ["anything/at/all.ts"])).toBe(true);
      expect(scopesOverlap(["src/*.ts"], ["src/a.ts"])).toBe(true);
      expect(scopesOverlap(["docs/"], ["src/"])).toBe(false);
    });
  });

  describe("work graph", () => {
    beforeEach(() => {
      startProgress(tmp, plan());
    });

    it("groups read-only steps into one parallel wave and serializes writers and the checkpoint", () => {
      const graph = buildWorkGraph(tmp);
      expect(graph.waves.map((wave) => wave.length)).toEqual([3, 1, 1, 1]);
      expect(
        graph.items
          .slice(0, 3)
          .every((item) => item.readOnly && item.state === "ready"),
      ).toBe(true);
      expect(graph.items[3]).toMatchObject({
        readOnly: false,
        state: "blocked",
        role: "implementer",
      });
      expect(graph.items[3]!.dependsOn).toEqual(graph.waves[0]);
      expect(graph.items[5]).toMatchObject({ role: "verifier", wave: 3 });
      expect(graph.items[1]).toMatchObject({ role: "reviewer" });
      expect(graph.items[2]).toMatchObject({ role: "researcher" });
      expect(graph.ready).toHaveLength(3);
      expect(graph.finished).toBe(false);
    });

    it("hands different items to different agents and nothing when the wave is taken", () => {
      const a = claimNextItem(tmp, { agent: "agent-a" })!;
      const b = claimNextItem(tmp, { agent: "agent-b" })!;
      const c = claimNextItem(tmp, { agent: "agent-c" })!;
      expect(new Set([a.item.id, b.item.id, c.item.id]).size).toBe(3);
      expect(claimNextItem(tmp, { agent: "agent-d" })).toBeNull();
      expect(claimNextItem(tmp, { agent: "agent-a" })!.item.id).toBe(a.item.id); // resumes its own work
      expect(buildWorkGraph(tmp).counts).toMatchObject({
        claimed: 3,
        ready: 0,
        blocked: 3,
      });
    });

    it("prefers items matching the requested role", () => {
      expect(
        claimNextItem(tmp, { agent: "r", role: "researcher" })!.item.ref,
      ).toBe("research-competitive-benchmark");
    });

    it("refuses blocked, finished and unknown items", () => {
      const graph = buildWorkGraph(tmp);
      expect(() =>
        claimWorkItem(tmp, graph.items[3]!.id, { agent: "a" }),
      ).toThrow(/blocked/);
      expect(() => claimWorkItem(tmp, "s99-nope", { agent: "a" })).toThrow(
        /Unknown work item/,
      );
    });

    it("completing needs the claim, unlocks the next wave and keeps progress consistent", () => {
      const ids = buildWorkGraph(tmp).waves[0]!;
      expect(() => completeWorkItem(tmp, ids[0]!, { agent: "a" })).toThrow(
        /Claim .* first/,
      );
      for (const id of ids) {
        claimWorkItem(tmp, id, { agent: "a" });
        completeWorkItem(tmp, id, { agent: "a", note: `done ${id}` });
      }
      const graph = buildWorkGraph(tmp);
      expect(graph.counts.done).toBe(3);
      expect(graph.ready).toEqual([graph.items[3]!.id]);
      expect(listClaims(tmp).active).toEqual([]);
      expect(
        readProgress(tmp)!
          .steps.slice(0, 3)
          .map((step) => step.status),
      ).toEqual(["done", "done", "done"]);
      expect(readEvents(tmp, { type: "item.completed" })).toHaveLength(3);
    });

    it("another agent cannot complete an item it does not hold", () => {
      const id = buildWorkGraph(tmp).waves[0]![0]!;
      claimWorkItem(tmp, id, { agent: "a" });
      expect(() => completeWorkItem(tmp, id, { agent: "b" })).toThrow(
        /claimed by a/,
      );
    });

    it("a checkpoint cannot be completed without a passing check, and forcing needs a note", () => {
      const graph = buildWorkGraph(tmp);
      for (const id of graph.waves.slice(0, 3).flat()) {
        claimWorkItem(tmp, id, { agent: "a" });
        completeWorkItem(tmp, id, { agent: "a", note: "ok" });
      }
      const checkpoint = graph.items[5]!.id;
      claimWorkItem(tmp, checkpoint, { agent: "v" });
      expect(() => completeWorkItem(tmp, checkpoint, { agent: "v" })).toThrow(
        /checkpoint/,
      );
      expect(() =>
        completeWorkItem(tmp, checkpoint, { agent: "v", force: true }),
      ).toThrow(/note/);
      expect(buildWorkGraph(tmp).finished).toBe(false);
      completeWorkItem(tmp, checkpoint, {
        agent: "v",
        force: true,
        note: "verified manually by the owner",
      });
      expect(buildWorkGraph(tmp).finished).toBe(true);
    });

    it("skipping records the reason, releases the claim and unblocks dependents", () => {
      const ids = buildWorkGraph(tmp).waves[0]!;
      claimWorkItem(tmp, ids[0]!, { agent: "a" });
      skipWorkItem(tmp, ids[0]!, { agent: "a", reason: "not applicable" });
      expect(() =>
        skipWorkItem(tmp, ids[1]!, { agent: "a", reason: "" }),
      ).toThrow();
      for (const id of ids.slice(1))
        skipWorkItem(tmp, id, { agent: "a", reason: "covered elsewhere" });
      expect(buildWorkGraph(tmp).ready).toHaveLength(1);
      expect(readProgress(tmp)!.steps[0]!.note).toBe("not applicable");
    });

    it("a released or expired item becomes available again", () => {
      const id = buildWorkGraph(tmp).waves[0]![0]!;
      const t0 = new Date("2026-01-01T10:00:00Z");
      claimWorkItem(tmp, id, { agent: "a", ttlSeconds: 60, now: t0 });
      expect(
        buildWorkGraph(
          tmp,
          undefined,
          new Date(t0.getTime() + 10_000),
        ).items.find((i) => i.id === id)!.state,
      ).toBe("claimed");
      const later = buildWorkGraph(
        tmp,
        undefined,
        new Date(t0.getTime() + 120_000),
      ).items.find((i) => i.id === id)!;
      expect(later.state).toBe("ready");
      expect(later.expiredClaim?.agent).toBe("a");
      claimWorkItem(tmp, id, {
        agent: "b",
        now: new Date(t0.getTime() + 121_000),
      });
      releaseWorkItem(tmp, id, {
        agent: "b",
        reason: "needs a human",
        failed: true,
      });
      expect(readEvents(tmp, { type: "item.failed" })).toHaveLength(1);
      expect(buildWorkGraph(tmp).items.find((i) => i.id === id)!.state).toBe(
        "ready",
      );
    });

    it("writers claim the whole tree by default, so two writers never edit at once", () => {
      const graph = buildWorkGraph(tmp);
      for (const id of graph.waves[0]!) {
        claimWorkItem(tmp, id, { agent: "a" });
        completeWorkItem(tmp, id, { agent: "a" });
      }
      const writer = buildWorkGraph(tmp).items[3]!;
      expect(claimWorkItem(tmp, writer.id, { agent: "w" }).claim.paths).toEqual(
        ["**"],
      );
      expect(() =>
        claimItem(tmp, { item: "adhoc", agent: "x", paths: ["src/other.ts"] }),
      ).toThrow(/overlap/);
    });
  });

  describe("handoffs and briefs", () => {
    beforeEach(() => {
      startProgress(tmp, plan());
    });

    it("delivers a handoff to the named agent or role, once, until acknowledged", () => {
      const first = createHandoff(tmp, {
        from: "planner-1",
        to: "role:reviewer",
        item: "s02-x",
        message: "Check the auth flow first",
        files: ["src/auth.ts"],
        next: "review auth",
      });
      createHandoff(tmp, {
        from: "planner-1",
        to: "codex-2",
        message: "for codex only",
      });
      expect(
        readInbox(tmp, { agent: "claude-1", role: "reviewer" }).map(
          (h) => h.id,
        ),
      ).toEqual([first.id]);
      expect(readInbox(tmp, { agent: "codex-2" })).toHaveLength(1);
      expect(readInbox(tmp, { agent: "claude-1" })).toHaveLength(0);
      expect(() => ackHandoff(tmp, first.id, "claude-1")).toThrow(
        /addressed to role:reviewer/,
      );
      ackHandoff(tmp, first.id, "claude-1", "reviewer");
      expect(
        readInbox(tmp, { agent: "claude-1", role: "reviewer" }),
      ).toHaveLength(0);
      expect(
        readInbox(tmp, { agent: "claude-1", role: "reviewer" }, true)[0],
      ).toMatchObject({
        acked: true,
        files: ["src/auth.ts"],
        next: "review auth",
      });
      expect(() => ackHandoff(tmp, "h-unknown", "claude-1")).toThrow(
        /Unknown handoff/,
      );
    });

    it("rejects empty messages and bad recipients", () => {
      expect(() =>
        createHandoff(tmp, { from: "a", to: "b", message: "  " }),
      ).toThrow(/needs a message/);
      expect(() =>
        createHandoff(tmp, { from: "a", to: "role:boss", message: "x" }),
      ).toThrow(/Invalid recipient/);
    });

    it("builds a brief with the protocol, the prompt, earlier results and pending handoffs", () => {
      const graph = buildWorkGraph(tmp);
      for (const id of graph.waves[0]!) {
        claimWorkItem(tmp, id, { agent: "a" });
        fs.mkdirSync(path.dirname(resultFile(tmp, id)), { recursive: true });
        fs.writeFileSync(resultFile(tmp, id), `findings of ${id}`);
        completeWorkItem(tmp, id, { agent: "a" });
      }
      createHandoff(tmp, {
        from: "a",
        to: "role:implementer",
        message: "Keep the public API stable",
      });
      const writer = buildWorkGraph(tmp).items[3]!;
      const brief = formatItemBrief(tmp, writer.id, "w-1");
      expect(brief).toContain(`HELEN work item ${writer.id}`);
      expect(brief).toContain("This item may modify the project");
      expect(brief).toContain(
        ".helen/work/s02-audit-project-risk-and-architecture/result.md",
      );
      expect(brief).toContain("Keep the public API stable");
      expect(brief).toContain(`helen team complete ${writer.id} --agent w-1`);
      expect(brief).toContain("Step 4/6");
    });

    it("managed briefs tell the worker not to run helen and carry skills inline", () => {
      const graph = buildWorkGraph(tmp);
      const skill = formatItemBrief(tmp, graph.items[0]!.id, "w-1", {
        managed: true,
      });
      expect(skill).toContain("Do not run any helen command");
      expect(skill).not.toContain("Protocol:");
      expect(skill).toContain(
        "Skill instructions (apply them to this project)",
      );
      expect(skill).toContain("Do not modify any file");
      const unmanaged = formatItemBrief(tmp, graph.items[0]!.id, "w-1");
      expect(unmanaged).toContain("Protocol:");
      expect(unmanaged).not.toContain("Skill instructions (apply them");
    });
  });
});

describe("races between real processes", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "helen-race-"));
  });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const root = path.resolve(import.meta.dirname, "..");
  function run(
    script: string,
    args: string[],
  ): Promise<{ code: number | null; out: string }> {
    const file = path.join(
      tmp,
      `worker-${Math.random().toString(36).slice(2)}.mjs`,
    );
    fs.writeFileSync(file, script);
    return new Promise((resolve) => {
      const child = spawn(
        process.execPath,
        ["--import", "tsx", file, ...args],
        { cwd: root, stdio: ["ignore", "pipe", "inherit"] },
      );
      let out = "";
      child.stdout.on("data", (chunk) => {
        out += chunk;
      });
      child.on("close", (code) => resolve({ code, out }));
    });
  }
  const src = (name: string) =>
    pathToFileURL(path.join(root, "src", "core", name)).href;

  it("exactly one of many agents wins the same item", async () => {
    const script = `import { claimItem } from '${src("claims.ts")}';
      try { claimItem(process.argv[2], { item: 'race-item', agent: process.argv[3] }); console.log('won'); }
      catch (error) { console.log(error.name); }`;
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) => run(script, [tmp, `agent-${i}`])),
    );
    const outcomes = results.map((result) => result.out.trim());
    expect(outcomes.filter((o) => o === "won")).toHaveLength(1);
    expect(outcomes.filter((o) => o === "ClaimConflictError")).toHaveLength(7);
    expect(listClaims(tmp).active).toHaveLength(1);
  }, 60_000);

  it("concurrent appends never corrupt the event log", async () => {
    const script = `import { appendEvent } from '${src("events.ts")}';
      for (let i = 0; i < 40; i += 1) appendEvent(process.argv[2], { type: 'race', agent: process.argv[3], data: { i, pad: 'x'.repeat(300) } });`;
    await Promise.all(
      Array.from({ length: 6 }, (_, i) => run(script, [tmp, `w${i}`])),
    );
    const lines = fs
      .readFileSync(eventsFile(tmp), "utf8")
      .split("\n")
      .filter(Boolean);
    expect(lines).toHaveLength(240);
    expect(readEvents(tmp, { type: "race" })).toHaveLength(240);
  }, 60_000);

  it("parallel completions of different steps are all kept (no lost updates)", async () => {
    startProgress(
      tmp,
      plan([
        { kind: "skill", ref: "helen-design", why: "a" },
        { kind: "skill", ref: "helen-copy", why: "b" },
        { kind: "skill", ref: "helen-audit", why: "c" },
        { kind: "skill", ref: "helen-backend", why: "d" },
        { kind: "skill", ref: "helen-release", why: "e" },
        { kind: "skill", ref: "helen-router", why: "f" },
      ]),
    );
    const script = `import { completeStepAt } from '${src("progress.ts")}';
      completeStepAt(process.argv[2], Number(process.argv[3]), 'done by ' + process.argv[3]);`;
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => run(script, [tmp, String(i)])),
    );
    expect(results.map((r) => r.code)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(readProgress(tmp)!.steps.map((step) => step.status)).toEqual(
      Array(6).fill("done"),
    );
  }, 60_000);
});
