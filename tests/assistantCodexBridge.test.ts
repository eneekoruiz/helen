import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  listRecentCodexSessions,
  summarizeCodexWork,
} from "../src/assistant/codexBridge.js";
import {
  findCapability,
  formatCapabilities,
} from "../src/assistant/capabilities.js";

let directory: string;
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "helen-transcript-audit-"));
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(directory, { recursive: true, force: true });
});
function transcript(session: string, goal: string) {
  const file = path.join(directory, "brain", session, "transcript.jsonl");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify({ type: "USER_INPUT", content: goal }) + "\n",
  );
  return file;
}
it("does not read or expose transcript goals without explicit private authorization and never speaks them", () => {
  transcript(
    "session-1",
    "Mi objetivo confidencial es construir un telescopio.",
  );
  const spy = vi.spyOn(fs, "openSync");
  const denied = summarizeCodexWork({
    brainDir: path.join(directory, "brain"),
  });
  expect(denied.text).not.toContain("telescopio");
  expect(spy).not.toHaveBeenCalled();
  const allowed = summarizeCodexWork({
    brainDir: path.join(directory, "brain"),
    authorized: true,
  });
  expect(allowed.text).toContain("telescopio");
  expect(allowed.speech).not.toContain("telescopio");
  expect(allowed.text).not.toContain("Codex");
});
it("bounds tail reads, ignores malformed records and redacts credentials before returning evidence", () => {
  const file = transcript("session-1", "ignored old goal");
  fs.writeFileSync(
    file,
    "x".repeat(3 * 1024 * 1024) +
      "\nnot-json\n" +
      JSON.stringify({
        type: "USER_INPUT",
        content: "Configurar password=hunter2",
      }) +
      "\n",
  );
  const spy = vi.spyOn(fs, "readSync");
  const [result] = listRecentCodexSessions(path.join(directory, "brain"));
  expect(result!.lastGoal).not.toContain("hunter2");
  expect(result!.source).toBe(path.join("session-1", "transcript.jsonl"));
  expect(path.isAbsolute(result!.source)).toBe(false);
  expect(spy.mock.calls[0]![3]).toBeLessThanOrEqual(2 * 1024 * 1024);
});
it("uses actual transcript modification time rather than directory order or untrusted event timestamps", () => {
  const old = transcript("old", "Old recorded goal");
  const recent = transcript("recent", "Recent recorded goal");
  fs.utimesSync(old, new Date("2020-01-01"), new Date("2020-01-01"));
  fs.utimesSync(recent, new Date("2026-10-24"), new Date("2026-10-24"));
  fs.utimesSync(
    path.dirname(old),
    new Date("2030-01-01"),
    new Date("2030-01-01"),
  );
  expect(
    listRecentCodexSessions(path.join(directory, "brain"), 1)[0]!.sessionId,
  ).toBe("recent");
  for (const limit of [-1, 21, 1.5, NaN])
    expect(() =>
      listRecentCodexSessions(path.join(directory, "brain"), limit),
    ).toThrow(/limit/);
});
it("refuses symlinked session directories and intermediate transcript locations outside the configured root", () => {
  const root = path.join(directory, "brain");
  const outside = path.join(directory, "outside");
  fs.mkdirSync(path.join(outside, "logs"), { recursive: true });
  fs.writeFileSync(
    path.join(outside, "transcript.jsonl"),
    JSON.stringify({ type: "USER_INPUT", content: "Outside private goal" }),
  );
  fs.writeFileSync(
    path.join(outside, "logs", "transcript.jsonl"),
    JSON.stringify({ type: "USER_INPUT", content: "Outside private goal" }),
  );
  fs.mkdirSync(path.join(root, "session-2"), { recursive: true });
  fs.symlinkSync(outside, path.join(root, "session-1"), "junction");
  fs.symlinkSync(
    outside,
    path.join(root, "session-2", ".system_generated"),
    "junction",
  );
  expect(listRecentCodexSessions(root)).toEqual([]);
});
it("capability descriptions acknowledge integration limits and public information is not fabricated", () => {
  expect(findCapability("  ")).toBeUndefined();
  const bridge = formatCapabilities({ topic: "antigravity", lang: "es" }).text;
  expect(bridge).toContain("No lee los formatos nativos de Codex");
  expect(bridge).not.toContain("quedaron pendientes");
  const gmail = formatCapabilities({ topic: "gmail", lang: "es" }).text;
  expect(gmail).toContain("literal solicitado explícitamente");
  expect(gmail).not.toContain("NUNCA envía");
  const memory = formatCapabilities({ topic: "memory", lang: "en" }).text;
  expect(memory).toContain("configured model");
  expect(memory).not.toContain("autonomously");
});
