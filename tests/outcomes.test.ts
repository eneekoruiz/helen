import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  readOutcomes,
  recordOutcome,
  summarizeOutcomes,
} from "../src/core/outcomes.js";
import type { Outcome, OutcomeInput } from "../src/core/outcomes.js";

const LIMIT = 8 * 1024 * 1024;
const fixtures: string[] = [];
let cwd: string;
const fixture = () => {
  const dir = fs.mkdtempSync(
    path.join(fs.realpathSync(os.tmpdir()), "helen-outcomes-qa-"),
  );
  fixtures.push(dir);
  return dir;
};
const input = (extra: Partial<OutcomeInput> = {}): OutcomeInput => ({
  runId: "paired-run",
  caseId: "checkout-retry",
  provider: "fixture-provider",
  providerVersion: "1.2.3",
  model: "fixture-model",
  condition: "baseline",
  skill: null,
  skillDigest: null,
  taskDigest: "a".repeat(64),
  graderDigest: "b".repeat(64),
  repositoryFingerprint: "c".repeat(64),
  accepted: false,
  evaluationStatus: "completed",
  elapsedMs: 3000,
  inputTokens: 100,
  outputTokens: 20,
  cachedTokens: 40,
  retries: 0,
  humanCorrections: null,
  humanMinutes: null,
  evidence: "immutable-fixture/run.json",
  source: "native-runtime",
  ...extra,
});
const record = (extra: Partial<OutcomeInput> = {}) =>
  recordOutcome(cwd, input(extra));
const skill = (extra: Partial<OutcomeInput> = {}) =>
  record({
    condition: "skill",
    skill: "helen-implementa",
    skillDigest: "d".repeat(64),
    accepted: true,
    elapsedMs: 2000,
    inputTokens: 70,
    outputTokens: 10,
    cachedTokens: 30,
    ...extra,
  });
const file = () => path.join(cwd, ".helen", "outcomes.json");
const serialize = (records: Outcome[]) =>
  JSON.stringify({ schemaVersion: 1, records }, null, 2) + "\n";
const writeStore = (value: string) => {
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(file(), value);
};

beforeEach(() => {
  cwd = fixture();
});
afterEach(() => {
  for (const dir of fixtures.splice(0)) {
    const resolved = path.resolve(dir);
    if (
      path.dirname(resolved) !== fs.realpathSync(os.tmpdir()) ||
      !path.basename(resolved).startsWith("helen-outcomes-qa-") ||
      fs.lstatSync(resolved).isSymbolicLink()
    )
      throw new Error("Refusing cleanup outside the owned outcomes fixture");
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});

describe("outcome persistence", () => {
  it("keeps prior records unchanged while appending IDs and preserving project files", () => {
    const project = path.join(cwd, "package.json");
    fs.writeFileSync(project, '{"private":true}\n');
    fs.mkdirSync(path.dirname(file()));
    const ignore = path.join(cwd, ".helen", ".gitignore");
    fs.writeFileSync(ignore, "# Personal ignores\n*.local\n");
    const first = record({ id: randomUUID() });
    const second = skill();
    expect(readOutcomes(cwd)).toEqual([first, second]);
    expect(second.id).not.toBe(first.id);
    expect(second.recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(fs.readFileSync(project, "utf8")).toBe('{"private":true}\n');
    expect(fs.readFileSync(ignore, "utf8")).toBe(
      "# Personal ignores\n*.local\n*\n",
    );
    const before = fs.readFileSync(file(), "utf8");
    expect(() => record({ id: first.id, accepted: true })).toThrow(
      "Outcome IDs are append-only",
    );
    expect(fs.readFileSync(file(), "utf8")).toBe(before);
    expect(readOutcomes(cwd)).toEqual([first, second]);
  });

  it.each([
    { elapsedMs: -1 },
    { elapsedMs: 1.5 },
    { inputTokens: -1 },
    { inputTokens: undefined },
    { outputTokens: 0.5 },
    { outputTokens: undefined },
    { cachedTokens: Number.MAX_SAFE_INTEGER + 1 },
    { retries: 101 },
    { humanCorrections: -1 },
    { humanCorrections: undefined },
    { humanMinutes: 100001 },
    { humanMinutes: undefined },
    { evidence: "x".repeat(4001) },
    { taskDigest: "not-a-digest" },
    { providerVersion: " " },
    { model: undefined },
    { source: undefined },
    { condition: "skill", skill: null, skillDigest: null },
    { skill: "helen-implementa", skillDigest: "d".repeat(64) },
    { costUsd: 0 },
  ])("rejects invalid metadata before creating a store: %j", (extra) => {
    expect(() => recordOutcome(cwd, { ...input(), ...extra })).toThrow();
    expect(fs.existsSync(path.join(cwd, ".helen"))).toBe(false);
  });

  it.each(["blocked", "failed", "invalid", "timed_out"] as const)(
    "rejects accepted=true when the evaluation is %s",
    (evaluationStatus) => {
      expect(() => record({ evaluationStatus, accepted: true })).toThrow();
      expect(fs.existsSync(path.join(cwd, ".helen"))).toBe(false);
    },
  );

  it("defaults evaluation status to completed without claiming human or token observations", () => {
    const { evaluationStatus: _status, ...raw } = input({
      inputTokens: null,
      outputTokens: null,
      cachedTokens: null,
    });
    const stored = recordOutcome(cwd, raw);
    expect(stored.evaluationStatus).toBe("completed");
    expect(stored.inputTokens).toBeNull();
    expect(stored.outputTokens).toBeNull();
    expect(stored.cachedTokens).toBeNull();
    expect(stored.humanCorrections).toBeNull();
    expect(stored.humanMinutes).toBeNull();
  });

  it.each(["not json", '{"schemaVersion":2,"records":[]}'])(
    "preserves a corrupt or unsupported store before rejecting an append",
    (original) => {
      writeStore(original);
      expect(() => readOutcomes(cwd)).toThrow();
      expect(() => record()).toThrow();
      expect(fs.readFileSync(file(), "utf8")).toBe(original);
    },
  );

  it("revalidates stored record invariants and rejects duplicate IDs without rewriting them", () => {
    const first = record();
    for (const records of [
      [first, first],
      [{ ...first, condition: "skill", skill: null, skillDigest: null }],
      [{ ...first, source: undefined }],
      [{ ...first, evaluationStatus: "failed", accepted: true }],
    ]) {
      const original = JSON.stringify({ schemaVersion: 1, records });
      writeStore(original);
      expect(() => readOutcomes(cwd)).toThrow();
      expect(fs.readFileSync(file(), "utf8")).toBe(original);
    }
  });

  it("rejects directory and oversized stores without replacing them", () => {
    fs.mkdirSync(file(), { recursive: true });
    expect(() => readOutcomes(cwd)).toThrow("Invalid outcome store");
    fs.rmdirSync(file());
    const descriptor = fs.openSync(file(), "w");
    fs.ftruncateSync(descriptor, LIMIT + 1);
    fs.closeSync(descriptor);
    expect(() => readOutcomes(cwd)).toThrow("Invalid outcome store");
    expect(fs.statSync(file()).size).toBe(LIMIT + 1);
  });

  it("enforces the record-count bound independently of the byte bound", () => {
    const seed = record({
      runId: "r",
      caseId: "c",
      provider: "p",
      providerVersion: "v",
      model: null,
      evidence: "e",
      elapsedMs: 0,
      inputTokens: null,
      outputTokens: null,
      cachedTokens: null,
    });
    const records = Array.from({ length: 10001 }, () => ({
      ...seed,
      id: randomUUID(),
    }));
    const original = JSON.stringify({ schemaVersion: 1, records });
    expect(Buffer.byteLength(original)).toBeLessThan(LIMIT);
    writeStore(original);
    expect(() => readOutcomes(cwd)).toThrow();
    expect(fs.readFileSync(file(), "utf8")).toBe(original);
  });

  it("refuses an append that would exceed the store byte bound and retains every existing record", () => {
    const seed = record({ evidence: "e".repeat(4000) });
    const perRecord =
      Buffer.byteLength(serialize([seed, seed])) -
      Buffer.byteLength(serialize([seed]));
    const count = Math.floor(
      (LIMIT - Buffer.byteLength(serialize([]))) / perRecord,
    );
    const records = Array.from({ length: count }, () => ({
      ...seed,
      id: randomUUID(),
    }));
    const original = serialize(records);
    expect(Buffer.byteLength(original)).toBeLessThanOrEqual(LIMIT);
    expect(Buffer.byteLength(serialize([...records, seed]))).toBeGreaterThan(
      LIMIT,
    );
    writeStore(original);
    expect(() => record({ evidence: "e".repeat(4000) })).toThrow(
      "exceeds 8 MiB",
    );
    expect(fs.readFileSync(file(), "utf8")).toBe(original);
  });

  it.each(["metadata directory", "store"])(
    "refuses a junction or directory symlink at the %s without touching the target",
    (kind) => {
      const outside = fixture();
      fs.writeFileSync(path.join(outside, "personal.txt"), "Preserve me\n");
      const link = kind === "store" ? file() : path.dirname(file());
      if (kind === "store") fs.mkdirSync(path.dirname(file()));
      fs.symlinkSync(
        outside,
        link,
        process.platform === "win32" ? "junction" : "dir",
      );
      try {
        expect(() => readOutcomes(cwd)).toThrow("Unsafe outcome metadata path");
        expect(() => record()).toThrow();
        expect(fs.readdirSync(outside)).toEqual(["personal.txt"]);
        expect(
          fs.readFileSync(path.join(outside, "personal.txt"), "utf8"),
        ).toBe("Preserve me\n");
      } finally {
        fs.unlinkSync(link);
      }
    },
  );
});

describe("outcome comparisons and consumption", () => {
  it("reports empty and partially observed metrics as null without writing metadata", () => {
    expect(readOutcomes(cwd)).toEqual([]);
    expect(summarizeOutcomes(readOutcomes(cwd))).toMatchObject({
      attempts: 0,
      acceptanceRate: null,
      tokenCoverage: null,
      tokensPerAcceptedTask: null,
      elapsedMsPerAcceptedTask: null,
      humanCorrections: null,
      humanMinutes: null,
      pairs: [],
    });
    expect(fs.existsSync(path.join(cwd, ".helen"))).toBe(false);
    record({ inputTokens: null, outputTokens: null, cachedTokens: null });
    skill({ humanCorrections: 0, humanMinutes: 0 });
    const summary = summarizeOutcomes(readOutcomes(cwd));
    expect(summary).toMatchObject({
      attempts: 2,
      measuredTokenAttempts: 1,
      tokenCoverage: 0.5,
      tokensPerAcceptedTask: null,
      humanCorrections: null,
      humanMinutes: null,
      pairs: [expect.objectContaining({ tokenDelta: null })],
    });
    for (const field of ["costUsd", "charge", "savings", "costSavingsUsd"])
      expect(summary).not.toHaveProperty(field);
  });

  it.each([
    { runId: "different-run" },
    { caseId: "different-case" },
    { provider: "different-provider" },
    { providerVersion: "2.0.0" },
    { model: "different-model" },
    { taskDigest: "e".repeat(64) },
    { graderDigest: "f".repeat(64) },
    { repositoryFingerprint: "0".repeat(64) },
  ])("excludes pairs with mismatched experimental identity: %j", (extra) => {
    record();
    skill(extra);
    expect(summarizeOutcomes(readOutcomes(cwd))).toMatchObject({
      attempts: 2,
      pairs: [],
      excludedPairGroups: 2,
    });
  });

  it("excludes both unknown model identity and caller-reported source from comparisons", () => {
    record({ model: null });
    skill({ model: null });
    record({ runId: "reported-run", source: "reported" });
    skill({ runId: "reported-run", source: "reported" });
    expect(summarizeOutcomes(readOutcomes(cwd))).toMatchObject({
      attempts: 4,
      pairs: [],
      excludedPairGroups: 2,
    });
    const records = readOutcomes(cwd)
      .slice(2)
      .map(({ source: _source, ...entry }) => entry);
    expect(summarizeOutcomes(records as Outcome[]).pairs).toEqual([]);
  });

  it.each(["baseline", "skill"] as const)(
    "excludes duplicate %s observations instead of choosing a favorable pair",
    (condition) => {
      record();
      skill();
      if (condition === "baseline") record({ accepted: true });
      else skill({ accepted: false });
      expect(summarizeOutcomes(readOutcomes(cwd))).toMatchObject({
        attempts: 3,
        pairs: [],
        excludedPairGroups: 1,
      });
    },
  );

  it.each(["blocked", "failed", "invalid", "timed_out"] as const)(
    "retains %s attempts in consumption while excluding their pairs",
    (evaluationStatus) => {
      record();
      skill({ evaluationStatus, accepted: false, retries: 1 });
      expect(summarizeOutcomes(readOutcomes(cwd))).toMatchObject({
        attempts: 2,
        accepted: 0,
        acceptanceRate: 0,
        measuredTokenAttempts: 2,
        tokenCoverage: 1,
        tokensPerAcceptedTask: null,
        elapsedMsPerAcceptedTask: null,
        totalRetries: 1,
        pairs: [],
        excludedPairGroups: 1,
      });
    },
  );

  it("compares completed grader failure with success, and sums all attempts per accepted result", () => {
    record({ humanCorrections: 2, humanMinutes: 3, retries: 1 });
    skill({ humanCorrections: 0, humanMinutes: 0 });
    record({
      runId: "project-attempt",
      condition: "project",
      evaluationStatus: "failed",
      elapsedMs: 1000,
      inputTokens: 50,
      outputTokens: 10,
      cachedTokens: 50,
      humanCorrections: 1,
      humanMinutes: 0.5,
      retries: 2,
    });
    const summary = summarizeOutcomes(readOutcomes(cwd));
    expect(summary).toMatchObject({
      attempts: 3,
      accepted: 1,
      acceptanceRate: 1 / 3,
      measuredTokenAttempts: 3,
      tokenCoverage: 1,
      tokensPerAcceptedTask: 260,
      elapsedMsPerAcceptedTask: 6000,
      totalRetries: 3,
      humanCorrections: 3,
      humanMinutes: 3.5,
      excludedPairGroups: 0,
      pairs: [
        {
          runId: "paired-run",
          caseId: "checkout-retry",
          provider: "fixture-provider",
          model: "fixture-model",
          skill: "helen-implementa",
          skillDigest: "d".repeat(64),
          qualityDelta: 1,
          elapsedDeltaMs: -1000,
          tokenDelta: -40,
        },
      ],
    });
    expect(summary.limitations).toEqual(
      expect.arrayContaining([
        expect.stringContaining("caller provenance"),
        expect.stringContaining("No spending or savings is inferred"),
      ]),
    );
  });

  it("counts observed zeros as measurements and keeps negative quality deltas", () => {
    record({
      accepted: true,
      inputTokens: 0,
      outputTokens: 0,
      humanCorrections: 0,
      humanMinutes: 0,
    });
    skill({
      accepted: false,
      inputTokens: 0,
      outputTokens: 0,
      humanCorrections: 0,
      humanMinutes: 0,
    });
    expect(summarizeOutcomes(readOutcomes(cwd))).toMatchObject({
      measuredTokenAttempts: 2,
      tokensPerAcceptedTask: 0,
      humanCorrections: 0,
      humanMinutes: 0,
      pairs: [expect.objectContaining({ qualityDelta: -1, tokenDelta: 0 })],
    });
  });

  it("divides all-attempt usage and time by both accepted observations", () => {
    record({ accepted: true });
    skill();
    record({
      runId: "failed-project-attempt",
      condition: "project",
      evaluationStatus: "failed",
      elapsedMs: 1000,
      inputTokens: 50,
      outputTokens: 10,
    });
    expect(summarizeOutcomes(readOutcomes(cwd))).toMatchObject({
      attempts: 3,
      accepted: 2,
      acceptanceRate: 2 / 3,
      tokensPerAcceptedTask: 130,
      elapsedMsPerAcceptedTask: 3000,
      pairs: [expect.objectContaining({ qualityDelta: 0 })],
    });
  });
});
