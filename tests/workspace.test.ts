import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Command } from "commander";
import {
  captureFeatureGate,
  colorContrast,
  defaultCreativeKit,
  getFeature,
  readWorkspace,
  readyTasks,
  retrieveLearnings,
  workspaceAction,
} from "../src/core/workspace.js";
import { prepareWorkBrief } from "../src/core/workBrief.js";
import * as codeMap from "../src/core/codeMap.js";
import * as workspaceApi from "../src/core/workspace.js";
import { registerWorkCommands } from "../src/commands/workCmd.js";
import { handleToolCall } from "../src/core/mcp.js";
import { readOutcomes, summarizeOutcomes } from "../src/core/outcomes.js";
import {
  listOperations,
  recoverOperation,
  runProjectOperation,
} from "../src/core/operations.js";
import { repositoryFingerprint } from "../src/core/workflowContext.js";
import type { ScriptRunner } from "../src/core/progress.js";
import type { Feature, Workspace } from "../src/core/workspaceTypes.js";

const temporary: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of temporary.splice(0)) {
    const resolved = path.resolve(dir);
    if (
      path.dirname(resolved) !== path.resolve(os.tmpdir()) ||
      !path.basename(resolved).startsWith("helen-workspace-qa-")
    )
      throw new Error("Refusing cleanup outside owned QA temporary project");
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});
function project(
  scripts: string[] = ["typecheck", "lint", "test", "build"],
): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "helen-workspace-qa-"));
  temporary.push(dir);
  fs.mkdirSync(path.join(dir, "src"));
  fs.writeFileSync(
    path.join(dir, "src", "checkout.ts"),
    "export const chargeOnce = true;\n",
  );
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({
      name: "workspace-qa",
      private: true,
      scripts: Object.fromEntries(
        scripts.map((name) => [name, `echo ${name}`]),
      ),
      dependencies: { react: "^18.2.0" },
    }),
  );
  return dir;
}
const metadata = (cwd: string) => path.join(cwd, ".helen", "workspace.json");
function create(
  cwd: string,
  id = "checkout",
  data: Record<string, unknown> = {},
): Feature {
  return workspaceAction(cwd, "create", {
    data: {
      id,
      title: `Feature ${id}`,
      goal: "Charge exactly once without changing account billing",
      exclusions: ["No paid calls", "Do not change global settings"],
      files: ["src/checkout.ts"],
      ...data,
    },
  }) as Feature;
}
function requirement(
  cwd: string,
  id = "checkout",
  acceptance = "Same key and amount charge once",
): void {
  workspaceAction(cwd, "requirement", {
    id,
    data: {
      id: "once",
      title: "One charge",
      acceptance: [acceptance],
      files: ["src/checkout.ts"],
    },
  });
}
function task(
  cwd: string,
  feature = "checkout",
  id = "implement",
  data: Record<string, unknown> = {},
): void {
  workspaceAction(cwd, "task", {
    id: feature,
    data: {
      id,
      title: `Task ${id}`,
      requirements: ["once"],
      files: ["src/checkout.ts"],
      ...data,
    },
  });
}
function complete(
  cwd: string,
  feature = "checkout",
  id = "implement",
  gate?: string,
): void {
  workspaceAction(cwd, "task-state", {
    id: feature,
    data: {
      task: id,
      status: "done",
      note: "Accepted within the recorded scope",
      ...(gate ? { gate } : {}),
    },
  });
}
function clearRejectedJournals(cwd: string): void {
  for (const operation of listOperations(cwd))
    recoverOperation(cwd, operation.id);
}
function rejectUpdate(
  cwd: string,
  action: string,
  envelope: unknown,
  pattern: string | RegExp,
): void {
  const before = fs.existsSync(metadata(cwd))
    ? fs.readFileSync(metadata(cwd), "utf8")
    : null;
  expect(() => workspaceAction(cwd, action, envelope)).toThrow(pattern);
  expect(
    fs.existsSync(metadata(cwd))
      ? fs.readFileSync(metadata(cwd), "utf8")
      : null,
  ).toBe(before);
  clearRejectedJournals(cwd);
}
function setup(cwd: string, id = "checkout"): void {
  create(cwd, id);
  requirement(cwd, id);
}
function editMetadata(cwd: string, change: (state: Workspace) => void): void {
  const state = JSON.parse(fs.readFileSync(metadata(cwd), "utf8")) as Workspace;
  change(state);
  fs.writeFileSync(metadata(cwd), JSON.stringify(state));
}
const successfulRunner: ScriptRunner = () => true;

describe("Feature persistence, dependencies and accepted scope", () => {
  it("bounds a valid large MCP outcome report without mutating its private evidence", async () => {
    const cwd = project();
    const records = Array.from({ length: 600 }, (_, index) => {
      const base = {
        runId: "output-budget-fixture",
        caseId: `case-${index}-${"x".repeat(165)}`,
        provider: "codex",
        providerVersion: "fixture-version",
        model: "fixture-model",
        evaluationStatus: "completed",
        taskDigest: "b".repeat(64),
        graderDigest: "c".repeat(64),
        repositoryFingerprint: "d".repeat(64),
        accepted: true,
        elapsedMs: 1000,
        inputTokens: 1,
        outputTokens: 1,
        cachedTokens: null,
        retries: 0,
        humanCorrections: null,
        humanMinutes: null,
        evidence:
          "Supplied telemetry fixture for output limits; no provider was called",
        source: "native-runtime",
        recordedAt: "2026-10-08T10:00:00.000Z",
      };
      return [
        {
          ...base,
          id: randomUUID(),
          condition: "baseline",
          skill: null,
          skillDigest: null,
        },
        {
          ...base,
          id: randomUUID(),
          condition: "skill",
          skill: "helen-audit",
          skillDigest: "a".repeat(64),
        },
      ];
    }).flat();
    fs.mkdirSync(path.join(cwd, ".helen"));
    const file = path.join(cwd, ".helen", "outcomes.json");
    const original = JSON.stringify({ schemaVersion: 1, records });
    expect(Buffer.byteLength(original)).toBeLessThan(8 * 1024 * 1024);
    fs.writeFileSync(file, original);
    const full = summarizeOutcomes(readOutcomes(cwd));
    expect(full.attempts).toBe(1200);
    expect((full.pairs as unknown[]).length).toBe(600);
    expect(JSON.stringify(full, null, 2).length).toBeGreaterThan(128000);
    const response = await handleToolCall("helen_outcomes_report", { cwd });
    expect(response.isError).not.toBe(true);
    const page = JSON.parse(response.content[0].text);
    expect(page).toMatchObject({
      attempts: 1200,
      accepted: 1200,
      pairDetails: { total: 600, offset: 0, returned: 20, nextOffset: 20 },
    });
    expect(page.pairs).toHaveLength(20);
    const finalResponse = await handleToolCall("helen_outcomes_report", {
      cwd,
      offset: 580,
      limit: 100,
    });
    expect(finalResponse.isError).not.toBe(true);
    const finalPage = JSON.parse(finalResponse.content[0].text);
    expect(finalPage).toMatchObject({
      attempts: 1200,
      pairDetails: { total: 600, offset: 580, returned: 20, nextOffset: null },
    });
    expect(
      finalPage.pairs.map((pair: { caseId: string }) => pair.caseId),
    ).toEqual(
      Array.from(
        { length: 20 },
        (_, index) => `case-${580 + index}-${"x".repeat(165)}`,
      ),
    );
    expect(
      response.content.reduce((size, entry) => size + entry.text.length, 0),
    ).toBeLessThanOrEqual(128000);
    expect(fs.readFileSync(file, "utf8")).toBe(original);
  });

  it("rejects unknown branch questions and keeps unresolved branch execution/checks blocked", () => {
    const cwd = project();
    setup(cwd);
    rejectUpdate(
      cwd,
      "task",
      {
        id: "checkout",
        data: {
          id: "keep",
          title: "Conditional task",
          requirements: ["once"],
          condition: { question: "missing", answer: "Keep existing policy" },
        },
      },
      "Unknown branch question",
    );
    workspaceAction(cwd, "question", {
      id: "checkout",
      data: {
        id: "policy",
        question: "Which approved policy applies?",
        options: ["Keep existing policy", "Use new policy"],
        requirements: ["once"],
      },
    });
    task(cwd, "checkout", "keep", {
      condition: { question: "policy", answer: "Keep existing policy" },
      checkpoint: true,
    });
    expect(readyTasks(cwd)).toEqual([]);
    rejectUpdate(
      cwd,
      "task-state",
      {
        id: "checkout",
        data: {
          task: "keep",
          status: "active",
          note: "Must not guess the answer",
        },
      },
      /branch|human answer/,
    );
    const runner = vi.fn(successfulRunner);
    expect(() => captureFeatureGate(cwd, "checkout", "keep", runner)).toThrow(
      /inactive|unresolved/,
    );
    expect(runner).not.toHaveBeenCalled();
  });

  it("selects the exact recorded human branch, rejects its alternative, and joins only after applicable work is accepted", () => {
    const cwd = project();
    setup(cwd);
    workspaceAction(cwd, "requirement", {
      id: "checkout",
      data: {
        id: "replacement",
        title: "New policy behavior",
        acceptance: ["Implement the new policy only when selected"],
        files: ["src/checkout.ts"],
      },
    });
    const question = "Which approved policy applies?";
    workspaceAction(cwd, "question", {
      id: "checkout",
      data: {
        id: "policy",
        question,
        options: ["Keep existing policy", "Use new policy"],
        requirements: ["once"],
      },
    });
    task(cwd, "checkout", "keep", {
      condition: { question: "policy", answer: "Keep existing policy" },
    });
    task(cwd, "checkout", "replace", {
      condition: { question: "policy", answer: "Use new policy" },
      requirements: ["replacement"],
    });
    task(cwd, "checkout", "join", {
      dependsOn: ["checkout:keep", "checkout:replace"],
    });
    workspaceAction(cwd, "answer", {
      id: "checkout",
      data: {
        questionId: "policy",
        decision: {
          id: "policy-answer",
          question,
          answer: "Keep existing policy",
          rationale: "The controlled human answer selects this branch",
          requirements: ["once"],
          source: "conversation",
        },
      },
    });
    expect(readyTasks(cwd).map((entry) => entry.task.id)).toEqual(["keep"]);
    rejectUpdate(
      cwd,
      "task-state",
      {
        id: "checkout",
        data: {
          task: "replace",
          status: "done",
          note: "Wrong branch must remain inactive",
        },
      },
      "inactive",
    );
    const runner = vi.fn(successfulRunner);
    expect(() =>
      captureFeatureGate(cwd, "checkout", "replace", runner),
    ).toThrow("inactive");
    expect(runner).not.toHaveBeenCalled();
    rejectUpdate(
      cwd,
      "task-state",
      {
        id: "checkout",
        data: {
          task: "join",
          status: "done",
          note: "Active branch still pending",
        },
      },
      "Dependencies",
    );
    complete(cwd, "checkout", "keep");
    expect(readyTasks(cwd).map((entry) => entry.task.id)).toEqual(["join"]);
    complete(cwd, "checkout", "join");
    workspaceAction(cwd, "update", {
      id: "checkout",
      data: { status: "completed" },
    });
    expect(getFeature(cwd, "checkout")).toMatchObject({
      status: "completed",
      questions: [expect.objectContaining({ answer: "Keep existing policy" })],
    });
    expect(
      getFeature(cwd, "checkout").tasks.find((entry) => entry.id === "replace")!
        .status,
    ).toBe("pending");
  });

  it("keeps the actual branch answer and inactive status in the text sent for an explicit alternative task", async () => {
    const cwd = project();
    setup(cwd);
    workspaceAction(cwd, "requirement", {
      id: "checkout",
      data: {
        id: "replacement",
        title: "New policy behavior",
        acceptance: ["Use the replacement only after human selection"],
        files: [],
      },
    });
    const question = "Which approved policy applies?";
    workspaceAction(cwd, "question", {
      id: "checkout",
      data: { id: "policy", question, requirements: ["once"] },
    });
    task(cwd, "checkout", "replace", {
      requirements: ["replacement"],
      condition: { question: "policy", answer: "Use new policy" },
    });
    workspaceAction(cwd, "answer", {
      id: "checkout",
      data: {
        questionId: "policy",
        decision: {
          id: "policy-answer",
          question,
          answer: "Keep existing policy",
          rationale: "The actual human answer disables the replacement task",
          requirements: ["once"],
          source: "conversation",
        },
      },
    });
    const brief = await prepareWorkBrief(cwd, "checkout", { task: "replace" });
    expect(brief.ready).toBe(false);
    expect(brief.text).toContain(question);
    expect(brief.text).toContain("Keep existing policy");
    expect(brief.text).toMatch(/inactive/i);
    expect(brief.text).toContain("No paid calls");
  });

  it("retains selected/shared requirement coverage and refuses to close an applicable skipped task", () => {
    const cwd = project();
    setup(cwd);
    workspaceAction(cwd, "requirement", {
      id: "checkout",
      data: {
        id: "orphan",
        title: "Still mandatory",
        acceptance: ["The chosen path must retain the event trail"],
        files: [],
      },
    });
    const question = "Which approved policy applies?";
    workspaceAction(cwd, "question", {
      id: "checkout",
      data: { id: "policy", question, requirements: ["once"] },
    });
    task(cwd, "checkout", "keep", {
      condition: { question: "policy", answer: "Keep existing policy" },
    });
    task(cwd, "checkout", "replace", {
      condition: { question: "policy", answer: "Use new policy" },
    });
    workspaceAction(cwd, "answer", {
      id: "checkout",
      data: {
        questionId: "policy",
        decision: {
          id: "policy-answer",
          question,
          answer: "Keep existing policy",
          rationale: "Actual controlled choice",
          requirements: ["once"],
          source: "conversation",
        },
      },
    });
    complete(cwd, "checkout", "keep");
    rejectUpdate(
      cwd,
      "update",
      { id: "checkout", data: { status: "completed" } },
      /uncovered requirement|assign/,
    );
    task(cwd, "checkout", "event-trail", { requirements: ["orphan"] });
    complete(cwd, "checkout", "keep");
    workspaceAction(cwd, "task-state", {
      id: "checkout",
      data: {
        task: "event-trail",
        status: "skipped",
        note: "A selected requirement cannot be skipped away",
      },
    });
    rejectUpdate(
      cwd,
      "update",
      { id: "checkout", data: { status: "completed" } },
      "accepted tasks",
    );
    workspaceAction(cwd, "task-state", {
      id: "checkout",
      data: {
        task: "event-trail",
        status: "pending",
        note: "Restore required work",
      },
    });
    complete(cwd, "checkout", "event-trail");
    workspaceAction(cwd, "update", {
      id: "checkout",
      data: { status: "completed" },
    });
    expect(getFeature(cwd, "checkout").status).toBe("completed");
  });

  it("does not reopen a completed selected branch because an inactive historical checkpoint has stale evidence", () => {
    const cwd = project();
    setup(cwd);
    workspaceAction(cwd, "requirement", {
      id: "checkout",
      data: {
        id: "replacement",
        title: "Alternate policy",
        acceptance: ["Replacement work applies only if selected"],
        files: [],
      },
    });
    task(cwd, "checkout", "historical-verify", {
      requirements: ["replacement"],
      checkpoint: true,
    });
    const oldGate = captureFeatureGate(
      cwd,
      "checkout",
      "historical-verify",
      successfulRunner,
    );
    complete(cwd, "checkout", "historical-verify", oldGate.id);
    const question = "Which approved policy applies?";
    workspaceAction(cwd, "question", {
      id: "checkout",
      data: { id: "policy", question, requirements: ["once"] },
    });
    workspaceAction(cwd, "answer", {
      id: "checkout",
      data: {
        questionId: "policy",
        decision: {
          id: "policy-answer",
          question,
          answer: "Keep existing policy",
          rationale: "Historical alternative is no longer selected",
          requirements: ["once"],
          source: "conversation",
        },
      },
    });
    task(cwd, "checkout", "keep", {
      condition: { question: "policy", answer: "Keep existing policy" },
    });
    complete(cwd, "checkout", "keep");
    editMetadata(cwd, (state) => {
      const parent = state.features[0],
        historical = parent.tasks.find(
          (entry) => entry.id === "historical-verify",
        )!;
      historical.condition = { question: "policy", answer: "Use new policy" };
      historical.status = "done";
      historical.needsReview = false;
      historical.evidenceId = oldGate.id;
      parent.status = "completed";
    });
    expect(getFeature(cwd, "checkout").status).toBe("completed");
    expect(readyTasks(cwd)).toEqual([]);
  });

  it("preserves full before/after scope, requirements and task definitions in history", () => {
    const cwd = project();
    setup(cwd);
    task(cwd);
    const original = getFeature(cwd, "checkout");
    const revisedGoal = "Charge once and preserve the recorded event trail";
    const revisedExclusions = [
      "No paid calls",
      "Do not change billing",
      "Do not delete events",
    ];
    workspaceAction(cwd, "update", {
      id: "checkout",
      data: { goal: revisedGoal, exclusions: revisedExclusions },
    });
    const afterScope = getFeature(cwd, "checkout");
    const scopeHistory = afterScope.history.at(-1)!;
    expect(scopeHistory).toMatchObject({
      action: "update",
      previousScope: original.scopeRevision,
      scope: afterScope.scopeRevision,
    });
    expect(scopeHistory.changes).toEqual(
      expect.arrayContaining([
        { field: "goal", before: original.goal, after: revisedGoal },
        {
          field: "exclusions",
          before: original.exclusions,
          after: revisedExclusions,
        },
      ]),
    );
    requirement(
      cwd,
      "checkout",
      "Every accepted charge retains its event trail",
    );
    const requirementHistory = getFeature(cwd, "checkout").history.at(-1)!;
    expect(
      requirementHistory.changes.find(
        (entry) => entry.field === "requirements:once",
      ),
    ).toMatchObject({
      before: { acceptance: ["Same key and amount charge once"] },
      after: { acceptance: ["Every accepted charge retains its event trail"] },
    });
    task(cwd, "checkout", "implement", {
      title: "Implement the revised event contract",
    });
    const taskHistory = getFeature(cwd, "checkout").history.at(-1)!;
    expect(
      taskHistory.changes.find((entry) => entry.field === "tasks:implement"),
    ).toMatchObject({
      before: { title: "Task implement" },
      after: { title: "Implement the revised event contract" },
    });
    expect(
      getFeature(cwd, "checkout").history.find(
        (entry) => entry.id === scopeHistory.id,
      ),
    ).toEqual(scopeHistory);
  });

  it("refuses history overflow without dropping old scope evidence or partially applying a new goal", () => {
    const cwd = project();
    setup(cwd);
    task(cwd);
    editMetadata(cwd, (state) => {
      const parent = state.features[0],
        seed = parent.history.at(-1)!;
      parent.history = Array.from({ length: 500 }, () => ({
        ...structuredClone(seed),
        id: randomUUID(),
      }));
    });
    const original = getFeature(cwd, "checkout");
    rejectUpdate(
      cwd,
      "update",
      { id: "checkout", data: { goal: "This would overflow scope history" } },
      /500|history|too_big/,
    );
    const retained = getFeature(cwd, "checkout");
    expect(retained.goal).toBe(original.goal);
    expect(retained.history).toEqual(original.history);
  });

  it("rejects feature completion when a recorded requirement has no task coverage", () => {
    const cwd = project();
    setup(cwd);
    task(cwd);
    workspaceAction(cwd, "requirement", {
      id: "checkout",
      data: {
        id: "audit-trail",
        title: "Retain event evidence",
        acceptance: ["Every accepted charge retains its event trail"],
        files: ["src/checkout.ts"],
      },
    });
    complete(cwd);
    rejectUpdate(
      cwd,
      "update",
      { id: "checkout", data: { status: "completed" } },
      /requirement|cover|assign|accept|completed/i,
    );
    task(cwd, "checkout", "audit-trail", { requirements: ["audit-trail"] });
    complete(cwd);
    complete(cwd, "checkout", "audit-trail");
    workspaceAction(cwd, "update", {
      id: "checkout",
      data: { status: "completed" },
    });
    expect(getFeature(cwd, "checkout").status).toBe("completed");
  });

  it("persists several active features without replacing existing requirements or decisions", () => {
    const cwd = project();
    setup(cwd);
    workspaceAction(cwd, "decision", {
      id: "checkout",
      data: {
        id: "billing",
        question: "May billing settings change?",
        answer: "No",
        rationale: "Included-only use is required",
        source: "conversation",
        requirements: ["once"],
      },
    });
    const revision = readWorkspace(cwd)!.revision;
    create(cwd, "search", { goal: "Search local records only" });
    const reloaded = JSON.parse(fs.readFileSync(metadata(cwd), "utf8"));
    expect(
      reloaded.features.map((feature: Feature) => [feature.id, feature.status]),
    ).toEqual([
      ["checkout", "active"],
      ["search", "active"],
    ]);
    expect(getFeature(cwd, "checkout").decisions[0].answer).toBe("No");
    expect(getFeature(cwd, "checkout").requirements[0].acceptance).toEqual([
      "Same key and amount charge once",
    ]);
    expect(readWorkspace(cwd)!.revision).not.toBe(revision);
    expect(
      fs.readFileSync(path.join(cwd, ".helen", ".gitignore"), "utf8"),
    ).toContain("*\n");
    expect(listOperations(cwd)).toEqual([]);
    rejectUpdate(
      cwd,
      "create",
      {
        data: {
          id: "checkout",
          title: "Overwrite",
          goal: "Replace everything",
        },
      },
      "already exists",
    );
  });

  it("exposes dependent tasks only after accepted current prerequisites and honors pauses", () => {
    const cwd = project();
    setup(cwd);
    task(cwd);
    setup(cwd, "shipping");
    task(cwd, "shipping", "integrate", { dependsOn: ["checkout:implement"] });
    expect(
      readyTasks(cwd).map((entry) => `${entry.feature}:${entry.task.id}`),
    ).toEqual(["checkout:implement"]);
    rejectUpdate(
      cwd,
      "task-state",
      {
        id: "shipping",
        data: { task: "integrate", status: "done", note: "Too early" },
      },
      "Dependencies",
    );
    complete(cwd);
    expect(
      readyTasks(cwd).map((entry) => `${entry.feature}:${entry.task.id}`),
    ).toEqual(["shipping:integrate"]);
    workspaceAction(cwd, "update", {
      id: "checkout",
      data: { status: "paused" },
    });
    expect(readyTasks(cwd)).toEqual([]);
    workspaceAction(cwd, "update", {
      id: "checkout",
      data: { status: "active" },
    });
    complete(cwd, "shipping", "integrate");
    expect(readyTasks(cwd)).toEqual([]);
  });

  it("rejects cyclic and unknown dependency/requirement references without changing the prior plan", () => {
    const cwd = project();
    setup(cwd);
    task(cwd, "checkout", "first");
    task(cwd, "checkout", "second", { dependsOn: ["checkout:first"] });
    rejectUpdate(
      cwd,
      "task",
      {
        id: "checkout",
        data: {
          id: "first",
          title: "Cycle",
          requirements: ["once"],
          dependsOn: ["checkout:second"],
        },
      },
      "cycle",
    );
    rejectUpdate(
      cwd,
      "task",
      {
        id: "checkout",
        data: {
          id: "unknown",
          title: "Unknown dependency",
          requirements: ["once"],
          dependsOn: ["checkout:absent"],
        },
      },
      "Unknown dependency",
    );
    rejectUpdate(
      cwd,
      "task",
      {
        id: "checkout",
        data: {
          id: "bad-requirement",
          title: "Bad reference",
          requirements: ["absent"],
        },
      },
      "Unknown requirement",
    );
    expect(getFeature(cwd, "checkout").tasks.map((entry) => entry.id)).toEqual([
      "first",
      "second",
    ]);
  });

  it("invalidates accepted dependent features transitively while preserving unrelated acceptance", () => {
    const cwd = project();
    for (const id of ["checkout", "shipping", "delivery", "unrelated"])
      setup(cwd, id);
    task(cwd);
    task(cwd, "shipping", "integrate", { dependsOn: ["checkout:implement"] });
    task(cwd, "delivery", "publish", { dependsOn: ["shipping:integrate"] });
    task(cwd, "unrelated", "independent");
    complete(cwd);
    complete(cwd, "shipping", "integrate");
    complete(cwd, "delivery", "publish");
    complete(cwd, "unrelated", "independent");
    for (const id of ["checkout", "shipping", "delivery", "unrelated"])
      workspaceAction(cwd, "update", { id, data: { status: "completed" } });
    const unrelated = getFeature(cwd, "unrelated");
    requirement(
      cwd,
      "checkout",
      "Same key and amount charge once, including concurrent retries",
    );
    for (const id of ["checkout", "shipping", "delivery"])
      expect(getFeature(cwd, id)).toMatchObject({
        status: "active",
        tasks: [expect.objectContaining({ needsReview: true })],
      });
    expect(getFeature(cwd, "unrelated")).toMatchObject({
      status: "completed",
      scopeRevision: unrelated.scopeRevision,
      tasks: [expect.objectContaining({ needsReview: false })],
    });
    expect(
      readyTasks(cwd).map((entry) => `${entry.feature}:${entry.task.id}`),
    ).toEqual(["checkout:implement"]);
  });

  it("retains acceptance for identical requirements but invalidates it for a new human decision or reopened task", () => {
    const cwd = project();
    setup(cwd);
    task(cwd);
    complete(cwd);
    const accepted = getFeature(cwd, "checkout").scopeRevision;
    requirement(cwd);
    expect(getFeature(cwd, "checkout").scopeRevision).toBe(accepted);
    expect(getFeature(cwd, "checkout").tasks[0].needsReview).toBe(false);
    workspaceAction(cwd, "decision", {
      id: "checkout",
      data: {
        id: "retry-policy",
        question: "Should failed charges be retryable?",
        answer: "Yes",
        rationale: "Transient failures must be recoverable",
        source: "conversation",
        requirements: ["once"],
      },
    });
    expect(getFeature(cwd, "checkout").tasks[0].needsReview).toBe(true);
    complete(cwd);
    workspaceAction(cwd, "task-state", {
      id: "checkout",
      data: {
        task: "implement",
        status: "pending",
        note: "A failure needs review",
      },
    });
    expect(getFeature(cwd, "checkout").tasks[0]).toMatchObject({
      status: "pending",
      needsReview: true,
    });
  });

  it("requires accepted tasks and answered questions before feature completion", () => {
    const cwd = project();
    setup(cwd);
    rejectUpdate(
      cwd,
      "update",
      { id: "checkout", data: { status: "completed" } },
      "completed feature",
    );
    task(cwd);
    rejectUpdate(
      cwd,
      "update",
      { id: "checkout", data: { status: "completed" } },
      "completed feature",
    );
    complete(cwd);
    workspaceAction(cwd, "question", {
      id: "checkout",
      data: {
        id: "retention",
        question: "What retention period applies?",
        requirements: ["once"],
        options: ["Keep existing policy", "Supply approved policy"],
      },
    });
    expect(readyTasks(cwd)).toEqual([]);
    rejectUpdate(
      cwd,
      "update",
      { id: "checkout", data: { status: "completed" } },
      "completed feature",
    );
  });
});

describe("Observed current gates and mutation races", () => {
  it("runs required scripts through the seam before accepting a checkpoint", () => {
    const cwd = project();
    setup(cwd);
    task(cwd, "checkout", "verify", { checkpoint: true });
    rejectUpdate(
      cwd,
      "task-state",
      {
        id: "checkout",
        data: {
          task: "verify",
          status: "done",
          note: "A claim without execution",
        },
      },
      "current observed passing gate",
    );
    const runner = vi.fn(successfulRunner);
    const gate = captureFeatureGate(cwd, "checkout", "verify", runner);
    expect(runner.mock.calls.map((entry) => entry[2])).toEqual([
      "typecheck",
      "lint",
      "test",
      "build",
    ]);
    expect(gate.ok).toBe(true);
    complete(cwd, "checkout", "verify", gate.id);
    expect(getFeature(cwd, "checkout").tasks[0]).toMatchObject({
      status: "done",
      needsReview: false,
      evidenceId: gate.id,
    });
  });

  it.each(["failed", "missing"] as const)(
    "rejects a %s required gate without accepting the checkpoint",
    (mode) => {
      const cwd = project(
        mode === "missing" ? ["typecheck", "test"] : undefined,
      );
      setup(cwd);
      task(cwd, "checkout", "verify", { checkpoint: true });
      const gate = captureFeatureGate(
        cwd,
        "checkout",
        "verify",
        (_cwd, _manager, script) => mode !== "failed" || script !== "test",
      );
      expect(gate.ok).toBe(false);
      rejectUpdate(
        cwd,
        "task-state",
        {
          id: "checkout",
          data: {
            task: "verify",
            status: "done",
            gate: gate.id,
            note: "Incorrect acceptance",
          },
        },
        "current observed passing gate",
      );
      expect(getFeature(cwd, "checkout").tasks[0].status).toBe("pending");
    },
  );

  it("does not reuse a successful gate after source changes or for a different task", () => {
    const cwd = project();
    setup(cwd);
    task(cwd, "checkout", "verify", { checkpoint: true });
    task(cwd, "checkout", "other", { checkpoint: true });
    const gate = captureFeatureGate(
      cwd,
      "checkout",
      "verify",
      successfulRunner,
    );
    rejectUpdate(
      cwd,
      "task-state",
      {
        id: "checkout",
        data: {
          task: "other",
          status: "done",
          gate: gate.id,
          note: "Wrong owner",
        },
      },
      "current observed passing gate",
    );
    complete(cwd, "checkout", "verify", gate.id);
    fs.appendFileSync(
      path.join(cwd, "src", "checkout.ts"),
      "export const changed = true;\n",
    );
    expect(getFeature(cwd, "checkout").tasks[0]).toMatchObject({
      status: "done",
      needsReview: true,
    });
    rejectUpdate(
      cwd,
      "task-state",
      {
        id: "checkout",
        data: {
          task: "verify",
          status: "done",
          gate: gate.id,
          note: "Stale acceptance",
        },
      },
      "current observed passing gate",
    );
  });

  it("stales dependent feature checkpoints after changed upstream acceptance, including same-feature conservative gate scope", () => {
    const cwd = project();
    setup(cwd);
    task(cwd, "checkout", "verify", { checkpoint: true });
    setup(cwd, "shipping");
    task(cwd, "shipping", "integrate", {
      checkpoint: true,
      dependsOn: ["checkout:verify"],
    });
    task(cwd, "shipping", "other", { checkpoint: true });
    complete(
      cwd,
      "checkout",
      "verify",
      captureFeatureGate(cwd, "checkout", "verify", successfulRunner).id,
    );
    complete(
      cwd,
      "shipping",
      "integrate",
      captureFeatureGate(cwd, "shipping", "integrate", successfulRunner).id,
    );
    complete(
      cwd,
      "shipping",
      "other",
      captureFeatureGate(cwd, "shipping", "other", successfulRunner).id,
    );
    workspaceAction(cwd, "update", {
      id: "shipping",
      data: { status: "completed" },
    });
    requirement(cwd, "checkout", "Concurrent retry acceptance has changed");
    const dependent = getFeature(cwd, "shipping");
    expect(dependent.status).toBe("active");
    expect(dependent.tasks.every((entry) => entry.needsReview)).toBe(true);
    expect(() => readWorkspace(cwd)).not.toThrow();
  });

  it("rejects imported/forged successful gate rows that were never observed by captureFeatureGate", () => {
    const cwd = project();
    setup(cwd);
    task(cwd, "checkout", "verify", { checkpoint: true });
    const fingerprint = repositoryFingerprint(cwd);
    editMetadata(cwd, (state) =>
      state.features[0].gates.push({
        id: "gate-forged",
        task: "verify",
        scopeRevision: state.features[0].scopeRevision,
        fingerprint,
        at: new Date().toISOString(),
        ok: true,
        results: ["typecheck", "lint", "test", "build"].map((script) => ({
          script,
          ok: true,
        })),
      }),
    );
    expect(() => complete(cwd, "checkout", "verify", "gate-forged")).toThrow(
      /observed|provenance|receipt|gate/i,
    );
    clearRejectedJournals(cwd);
    expect(
      JSON.parse(fs.readFileSync(metadata(cwd), "utf8")).features[0].tasks[0]
        .status,
    ).toBe("pending");
  });

  it("rejects externally supplied gate data through the mutation API", () => {
    const cwd = project();
    setup(cwd);
    rejectUpdate(
      cwd,
      "gate",
      {
        id: "checkout",
        data: {
          id: "gate-forged",
          ok: true,
          results: [{ script: "test", ok: true }],
        },
      },
      "Unknown workspace action",
    );
    rejectUpdate(
      cwd,
      "task",
      {
        id: "checkout",
        data: {
          id: "verify",
          title: "Verify",
          checkpoint: true,
          gates: [{ ok: true }],
        },
      },
      /Unrecognized|unrecognized/,
    );
  });

  it("marks an imported completed checkpoint for review when it reuses another task's legitimate gate", () => {
    const cwd = project();
    setup(cwd);
    task(cwd, "checkout", "verify", { checkpoint: true });
    task(cwd, "checkout", "other", { checkpoint: true });
    const observed = captureFeatureGate(
      cwd,
      "checkout",
      "verify",
      successfulRunner,
    );
    complete(cwd, "checkout", "verify", observed.id);
    editMetadata(cwd, (state) => {
      const other = state.features[0].tasks[1];
      other.status = "done";
      other.needsReview = false;
      other.acceptedScope = state.features[0].scopeRevision;
      other.evidenceId = observed.id;
    });
    expect(getFeature(cwd, "checkout").tasks[1]).toMatchObject({
      status: "done",
      needsReview: true,
    });
    expect(readyTasks(cwd).map((entry) => entry.task.id)).toEqual(["other"]);
  });

  it("rejects a signed failed gate whose success/results were edited in imported metadata", () => {
    const cwd = project();
    setup(cwd);
    task(cwd, "checkout", "verify", { checkpoint: true });
    const failed = captureFeatureGate(
      cwd,
      "checkout",
      "verify",
      (_cwd, _manager, script) => script !== "test",
    );
    expect(failed.ok).toBe(false);
    editMetadata(cwd, (state) => {
      state.features[0].gates[0].ok = true;
      state.features[0].gates[0].results = [
        "typecheck",
        "lint",
        "test",
        "build",
      ].map((script) => ({ script, ok: true }));
    });
    rejectUpdate(
      cwd,
      "task-state",
      {
        id: "checkout",
        data: {
          task: "verify",
          status: "done",
          gate: failed.id,
          note: "Imported false success",
        },
      },
      "current observed passing gate",
    );
  });

  it.each(["corrupt", "junction"] as const)(
    "rejects a %s verification key without touching external data",
    (mode) => {
      const cwd = project(),
        outside = project();
      setup(cwd);
      task(cwd, "checkout", "verify", { checkpoint: true });
      const observed = captureFeatureGate(
        cwd,
        "checkout",
        "verify",
        successfulRunner,
      );
      const key = workspaceApi.gateKeyPath(cwd);
      if (mode === "corrupt") fs.writeFileSync(key, "not-a-verification-key");
      else {
        fs.unlinkSync(key);
        fs.symlinkSync(
          outside,
          key,
          process.platform === "win32" ? "junction" : "dir",
        );
      }
      const sentinel = fs.readFileSync(
        path.join(outside, "package.json"),
        "utf8",
      );
      expect(() => complete(cwd, "checkout", "verify", observed.id)).toThrow(
        /verification key/i,
      );
      clearRejectedJournals(cwd);
      expect(
        JSON.parse(fs.readFileSync(metadata(cwd), "utf8")).features[0].tasks[0]
          .status,
      ).toBe("pending");
      expect(fs.readFileSync(path.join(outside, "package.json"), "utf8")).toBe(
        sentinel,
      );
    },
  );

  it("does not bless repository mutations made during a gate", () => {
    const cwd = project();
    setup(cwd);
    task(cwd, "checkout", "verify", { checkpoint: true });
    const gate = captureFeatureGate(
      cwd,
      "checkout",
      "verify",
      (_cwd, _manager, script) => {
        if (script === "test")
          fs.appendFileSync(
            path.join(cwd, "src", "checkout.ts"),
            "export const changedDuringCheck = true;\n",
          );
        return true;
      },
    );
    expect(gate.ok).toBe(false);
    expect(gate.results).toContainEqual({
      script: "repository-unchanged-during-check",
      ok: false,
    });
    rejectUpdate(
      cwd,
      "task-state",
      {
        id: "checkout",
        data: {
          task: "verify",
          status: "done",
          note: "Changed during check",
          gate: gate.id,
        },
      },
      "current observed passing gate",
    );
  });

  it("preserves changed scope when a concurrent requirement update invalidates an in-progress gate", () => {
    const cwd = project();
    setup(cwd);
    task(cwd, "checkout", "verify", { checkpoint: true });
    expect(() =>
      captureFeatureGate(
        cwd,
        "checkout",
        "verify",
        (_cwd, _manager, script) => {
          if (script === "test")
            requirement(
              cwd,
              "checkout",
              "A new requirement added during verification",
            );
          return true;
        },
      ),
    ).toThrow("changed during verification");
    clearRejectedJournals(cwd);
    expect(getFeature(cwd, "checkout").requirements[0].acceptance).toEqual([
      "A new requirement added during verification",
    ]);
    expect(getFeature(cwd, "checkout").gates).toHaveLength(0);
  });

  it("keeps unrelated edits made during gate execution while recording the current feature gate", () => {
    const cwd = project();
    setup(cwd);
    task(cwd, "checkout", "verify", { checkpoint: true });
    const gate = captureFeatureGate(
      cwd,
      "checkout",
      "verify",
      (_cwd, _manager, script) => {
        if (script === "test") create(cwd, "concurrent-feature");
        return true;
      },
    );
    expect(gate.ok).toBe(true);
    expect(readWorkspace(cwd)!.features.map((entry) => entry.id)).toEqual([
      "checkout",
      "concurrent-feature",
    ]);
    expect(getFeature(cwd, "checkout").gates[0].id).toBe(gate.id);
  });

  it("prevents stale-revision overwrite and preserves edits blocked by the operation lock", async () => {
    const cwd = project();
    setup(cwd);
    const staleRevision = readWorkspace(cwd)!.revision;
    create(cwd, "concurrent-feature");
    rejectUpdate(
      cwd,
      "update",
      {
        id: "checkout",
        data: { goal: "Stale overwrite" },
        expectedRevision: staleRevision,
      },
      "revision changed",
    );
    expect(getFeature(cwd, "checkout").goal).toContain("Charge exactly once");
    let release!: () => void;
    const held = runProjectOperation(
      cwd,
      "held-qa-operation",
      async () =>
        await new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    try {
      expect(() =>
        workspaceAction(cwd, "update", {
          id: "checkout",
          data: { goal: "Blocked overwrite" },
        }),
      ).toThrow(/operation|recovery|lock/);
    } finally {
      release();
      await held;
    }
    expect(readWorkspace(cwd)!.features.map((entry) => entry.id)).toEqual([
      "checkout",
      "concurrent-feature",
    ]);
    expect(getFeature(cwd, "checkout").goal).toContain("Charge exactly once");
  });
});

describe("Metadata and human-question boundaries", () => {
  it.each([
    "json",
    "duplicate",
    "reference",
    "oversized",
    "directory",
  ] as const)("preserves and rejects %s invalid metadata", (mode) => {
    const cwd = project();
    setup(cwd);
    if (mode === "json") fs.writeFileSync(metadata(cwd), "{broken");
    if (mode === "duplicate")
      editMetadata(cwd, (state) =>
        state.features.push(structuredClone(state.features[0])),
      );
    if (mode === "reference")
      editMetadata(cwd, (state) =>
        state.features[0].questions.push({
          id: "bad",
          question: "Unknown requirement?",
          options: [],
          requirements: ["missing"],
        }),
      );
    if (mode === "oversized")
      fs.writeFileSync(metadata(cwd), " ".repeat(2 * 1024 * 1024 + 1));
    if (mode === "directory") {
      fs.unlinkSync(metadata(cwd));
      fs.mkdirSync(metadata(cwd));
    }
    const before = fs.statSync(metadata(cwd)).isFile()
      ? fs.readFileSync(metadata(cwd), "utf8")
      : null;
    expect(() => readWorkspace(cwd)).toThrow(/Invalid workspace|regular file/);
    expect(() => create(cwd, "new-feature")).toThrow(
      /Invalid workspace|regular file/,
    );
    expect(
      fs.statSync(metadata(cwd)).isFile()
        ? fs.readFileSync(metadata(cwd), "utf8")
        : null,
    ).toBe(before);
    expect(fs.existsSync(path.join(cwd, ".helen", "workspace.json.bak"))).toBe(
      false,
    );
  });

  it("rejects metadata and source references crossing a junction without touching its target", () => {
    const cwd = project(),
      outside = project();
    fs.symlinkSync(
      outside,
      path.join(cwd, ".helen"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const sentinel = fs.readFileSync(
      path.join(outside, "package.json"),
      "utf8",
    );
    expect(() => readWorkspace(cwd)).toThrow("Unsafe workspace metadata path");
    expect(() => create(cwd)).toThrow(/Unsafe.*(?:path|journal|file)/);
    expect(fs.existsSync(path.join(outside, "workspace.json"))).toBe(false);
    expect(fs.readFileSync(path.join(outside, "package.json"), "utf8")).toBe(
      sentinel,
    );
    const safe = project();
    fs.symlinkSync(
      outside,
      path.join(safe, "linked"),
      process.platform === "win32" ? "junction" : "dir",
    );
    rejectUpdate(
      safe,
      "create",
      {
        data: {
          id: "unsafe",
          title: "Unsafe reference",
          goal: "Should reject",
          files: ["linked/package.json"],
        },
      },
      "Unsafe source reference",
    );
  });

  it.each([
    "../outside.ts",
    "C:/outside.ts",
    ".helen/workspace.json",
    "node_modules/private.ts",
  ])("rejects protected or escaping source reference %s", (source) => {
    const cwd = project();
    rejectUpdate(
      cwd,
      "create",
      {
        data: {
          id: "unsafe",
          title: "Unsafe source",
          goal: "Reject path",
          files: [source],
        },
      },
      /project-relative source path/,
    );
  });

  it("records a real question and actual answer once, preserves links, and keeps reported native provenance distinct", () => {
    const cwd = project();
    setup(cwd);
    task(cwd);
    const question = {
      id: "policy",
      question: "Which approved retention policy applies?",
      options: ["Existing policy", "Provide a revised approved policy"],
      requirements: ["once"],
    };
    workspaceAction(cwd, "question", { id: "checkout", data: question });
    expect(readyTasks(cwd)).toEqual([]);
    const decision = {
      id: "policy-answer",
      question: question.question,
      answer: "Use the existing policy",
      rationale: "This is the human's answer",
      alternatives: question.options,
      requirements: ["once"],
      source: "native_question",
      runtime: "codex",
      tool: "request_user_input",
    };
    rejectUpdate(
      cwd,
      "answer",
      {
        id: "checkout",
        data: {
          questionId: "policy",
          decision: { ...decision, question: "Different question" },
        },
      },
      "retain the recorded question",
    );
    rejectUpdate(
      cwd,
      "answer",
      {
        id: "checkout",
        data: {
          questionId: "policy",
          decision: { ...decision, requirements: [] },
        },
      },
      "requirement links",
    );
    rejectUpdate(
      cwd,
      "answer",
      {
        id: "checkout",
        data: {
          questionId: "policy",
          decision: { ...decision, runtime: "", tool: "" },
        },
      },
      "provenance requires",
    );
    workspaceAction(cwd, "answer", {
      id: "checkout",
      data: { questionId: "policy", decision },
    });
    const recorded = getFeature(cwd, "checkout");
    expect(recorded.questions[0]).toMatchObject({
      question: question.question,
      answer: decision.answer,
      decisionId: decision.id,
    });
    expect(recorded.decisions[0]).toMatchObject({
      source: "native_question",
      answer: decision.answer,
      tool: "request_user_input",
    });
    expect(recorded.decisions[0]).not.toHaveProperty("nativeUiVerified");
    rejectUpdate(
      cwd,
      "answer",
      {
        id: "checkout",
        data: {
          questionId: "policy",
          decision: {
            ...decision,
            id: "replacement",
            answer: "Delete everything",
          },
        },
      },
      "already answered",
    );
    rejectUpdate(
      cwd,
      "decision",
      {
        id: "checkout",
        data: { ...decision, answer: "Overwrite immutable history" },
      },
      "append-only",
    );
    expect(getFeature(cwd, "checkout").decisions).toHaveLength(1);
    expect(readyTasks(cwd).map((entry) => entry.task.id)).toEqual([
      "implement",
    ]);
  });

  it.each(["answer", "question", "requirements"] as const)(
    "rejects contradictory imported %s linkage between answered questions and decision history",
    (field) => {
      const cwd = project();
      setup(cwd);
      workspaceAction(cwd, "question", {
        id: "checkout",
        data: {
          id: "policy",
          question: "Which policy applies?",
          requirements: ["once"],
        },
      });
      workspaceAction(cwd, "answer", {
        id: "checkout",
        data: {
          questionId: "policy",
          decision: {
            id: "policy-answer",
            question: "Which policy applies?",
            answer: "Keep the approved policy",
            rationale: "Actual human answer",
            requirements: ["once"],
            source: "conversation",
          },
        },
      });
      editMetadata(cwd, (state) => {
        if (field === "answer")
          state.features[0].questions[0].answer = "Delete everything";
        if (field === "question")
          state.features[0].questions[0].question = "May we delete everything?";
        if (field === "requirements")
          state.features[0].questions[0].requirements = [];
      });
      expect(() => readWorkspace(cwd)).toThrow(
        /question|answer|decision|link/i,
      );
    },
  );
});

function learning(
  cwd: string,
  id: string,
  data: Record<string, unknown> = {},
): void {
  workspaceAction(cwd, "learning", {
    data: {
      id,
      problem: "Retry requests charge twice",
      cause: "Concurrent cache miss",
      solution: "Share a pending promise and evict a rejected load",
      tags: ["retry"],
      conditions: {
        packages: [{ name: "react", major: 18 }],
        paths: ["src"],
        tags: ["standard"],
      },
      provenance: {
        source: "Observed regression fixture",
        evidence: ["Concurrent failure and retry check"],
        kind: "observed",
      },
      ...data,
    },
  });
}
describe("Applicable learnings, shared creative direction and bounded briefs", () => {
  it("preserves large valid goal/task text while bounding derived retrieval queries", async () => {
    const cwd = project();
    const goal = "Authorized goal: " + "g".repeat(3400);
    create(cwd, "checkout", { goal });
    requirement(cwd);
    const title = "Task acceptance context: " + "t".repeat(3400);
    task(cwd, "checkout", "implement", { title });
    const brief = await prepareWorkBrief(cwd, "checkout", {
      task: "implement",
      maxCharacters: 24000,
    });
    expect(brief.text).toContain(goal);
    expect(brief.text).toContain(title);
    expect(brief.text.length).toBeLessThanOrEqual(24000);
  });

  it("prepares valid many-reference features with explicitly disclosed context omissions", async () => {
    const cwd = project();
    const files = Array.from(
      { length: 33 },
      (_, index) => `src/ref-${index}.ts`,
    );
    for (const file of files)
      fs.writeFileSync(
        path.join(cwd, file),
        `export const value${files.indexOf(file)} = true;\n`,
      );
    create(cwd, "checkout", { files });
    requirement(cwd);
    task(cwd);
    const brief = await prepareWorkBrief(cwd, "checkout", {
      task: "implement",
    });
    for (const file of files) expect(brief.text).toContain(file);
    expect(brief.text).toContain("No paid calls");
    expect(brief.text).toContain("Same key and amount charge once");
    expect(
      (brief.context as { omittedFiles: number }).omittedFiles,
    ).toBeGreaterThan(0);
    expect(brief.text).toMatch(/omitted:/);
    expect(brief.text).toMatch(/seed|reference[^\n]*limit/i);
  });

  it("rejects a stale brief when a workspace mutation occurs while context is being prepared", async () => {
    const cwd = project();
    setup(cwd);
    task(cwd);
    const original = codeMap.buildTaskContext;
    vi.spyOn(codeMap, "buildTaskContext").mockImplementationOnce(
      async (root, request, options) => {
        const context = await original(root, request, options);
        create(cwd, "concurrent-feature");
        return context;
      },
    );
    await expect(
      prepareWorkBrief(cwd, "checkout", { task: "implement" }),
    ).rejects.toThrow("Workspace changed while preparing context");
    expect(readWorkspace(cwd)!.features.map((entry) => entry.id)).toEqual([
      "checkout",
      "concurrent-feature",
    ]);
  });

  it("retrieves only relevant unexpired learnings whose package/path/tag conditions all match", () => {
    const cwd = project();
    learning(cwd, "applicable");
    learning(cwd, "wrong-major", {
      conditions: {
        packages: [{ name: "react", major: 19 }],
        paths: ["src"],
        tags: ["standard"],
      },
    });
    learning(cwd, "missing-package", {
      conditions: {
        packages: [{ name: "vue", major: 3 }],
        paths: [],
        tags: [],
      },
    });
    learning(cwd, "expired", { expiresAt: "2020-01-01T00:00:00.000Z" });
    learning(cwd, "unrelated", {
      problem: "Photographic hero design",
      cause: "Flat visual hierarchy",
      solution: "Use authentic crops",
      tags: ["design"],
      conditions: { packages: [], paths: [], tags: [] },
    });
    const request = {
      query: "retry charge",
      paths: ["src/checkout.ts"],
      tags: ["standard"],
    };
    expect(
      retrieveLearnings(cwd, request).map((entry) => entry.learning.id),
    ).toEqual(["applicable"]);
    expect(
      retrieveLearnings(cwd, { ...request, paths: ["src-other/checkout.ts"] }),
    ).toEqual([]);
    expect(retrieveLearnings(cwd, { ...request, tags: ["quick"] })).toEqual([]);
    const match = retrieveLearnings(cwd, request)[0];
    expect(match.reasons).toEqual(
      expect.arrayContaining([
        "Package condition: react major 18",
        "Path condition matched",
        "Tag conditions matched",
      ]),
    );
    workspaceAction(cwd, "retire-learning", { data: { id: "applicable" } });
    expect(retrieveLearnings(cwd, request)).toEqual([]);
  });

  it("rejects unknown declared package versions rather than matching a required major", () => {
    const cwd = project();
    learning(cwd, "applicable");
    const pkgFile = path.join(cwd, "package.json"),
      pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
    for (const version of ["latest", "workspace:*", "^19.0.0"]) {
      pkg.dependencies.react = version;
      fs.writeFileSync(pkgFile, JSON.stringify(pkg));
      expect(
        retrieveLearnings(cwd, {
          query: "retry",
          paths: ["src/checkout.ts"],
          tags: ["standard"],
        }),
      ).toEqual([]);
    }
  });

  it("stores learning provenance append-only and rejects a silent replacement", () => {
    const cwd = project();
    learning(cwd, "applicable");
    rejectUpdate(
      cwd,
      "learning",
      {
        data: {
          id: "applicable",
          problem: "New issue",
          cause: "New cause",
          solution: "Overwrite old evidence",
          tags: [],
          conditions: { packages: [], paths: [], tags: [] },
          provenance: {
            source: "Unknown report",
            evidence: ["Unverified"],
            kind: "reported",
          },
        },
      },
      "already recorded",
    );
    expect(readWorkspace(cwd)!.learnings[0].provenance.kind).toBe("observed");
  });

  it("requires readable shared colors and explicit reduced-motion/static behavior", () => {
    const cwd = project();
    setup(cwd);
    create(cwd, "presentation");
    const kit = defaultCreativeKit();
    expect(colorContrast("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(colorContrast("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    expect(
      colorContrast(kit.colors.text, kit.colors.background),
    ).toBeGreaterThanOrEqual(4.5);
    workspaceAction(cwd, "creative", { data: kit });
    expect(readWorkspace(cwd)!.creativeKit).toMatchObject(kit);
    rejectUpdate(
      cwd,
      "creative",
      {
        data: {
          ...kit,
          colors: { ...kit.colors, text: kit.colors.background },
        },
      },
      "contrast",
    );
    rejectUpdate(
      cwd,
      "creative",
      { data: { ...kit, motion: { ...kit.motion, reducedMotion: "" } } },
      /too_small|at least|minimum/i,
    );
    rejectUpdate(
      cwd,
      "creative",
      { data: { ...kit, motion: { ...kit.motion, staticFallback: "" } } },
      /too_small|at least|minimum/i,
    );
    expect(readWorkspace(cwd)!.creativeKit?.motion).toEqual(kit.motion);
  });

  it("reopens every accepted feature when its shared creative direction changes", () => {
    const cwd = project();
    for (const id of ["checkout", "presentation"]) {
      setup(cwd, id);
      task(cwd, id);
      complete(cwd, id);
      workspaceAction(cwd, "update", { id, data: { status: "completed" } });
    }
    const previous = readWorkspace(cwd)!;
    workspaceAction(cwd, "creative", { data: defaultCreativeKit() });
    const updated = readWorkspace(cwd)!;
    for (const parent of updated.features) {
      expect(parent.status).toBe("active");
      expect(parent.scopeRevision).not.toBe(
        previous.features.find((entry) => entry.id === parent.id)!
          .scopeRevision,
      );
      expect(parent.tasks[0]).toMatchObject({
        status: "done",
        needsReview: true,
      });
      expect(parent.tasks[0].reviewReason).toMatch(/creative direction/i);
    }
    expect(
      readyTasks(cwd)
        .map((entry) => entry.feature)
        .sort(),
    ).toEqual(["checkout", "presentation"]);
  });

  it("does not let CLI creative init overwrite a human kit recorded immediately before its locked mutation", async () => {
    const cwd = project();
    const humanKit = {
      ...defaultCreativeKit(),
      direction: "Preserve the human-selected quiet editorial direction",
    };
    const originalAction = workspaceApi.workspaceAction;
    let competingWrite = false;
    vi.spyOn(process, "cwd").mockReturnValue(cwd);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(workspaceApi, "workspaceAction").mockImplementation(
      (directory, action, envelope) => {
        if (!competingWrite && directory === cwd) {
          competingWrite = true;
          originalAction(cwd, "creative", { data: humanKit });
        }
        return originalAction(directory, action, envelope);
      },
    );
    const command = new Command();
    registerWorkCommands(command);
    const originalExitCode = process.exitCode;
    try {
      await command.parseAsync(["creative", "init"], { from: "user" });
      expect(competingWrite).toBe(true);
      expect(readWorkspace(cwd)!.creativeKit).toMatchObject(humanKit);
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = originalExitCode;
    }
  });

  it("rejects imported unreadable creative colors while preserving the original metadata", () => {
    const cwd = project();
    setup(cwd);
    workspaceAction(cwd, "creative", { data: defaultCreativeKit() });
    editMetadata(cwd, (state) => {
      state.creativeKit!.colors.text = state.creativeKit!.colors.background;
    });
    const original = fs.readFileSync(metadata(cwd), "utf8");
    expect(() => readWorkspace(cwd)).toThrow(/contrast/);
    expect(fs.readFileSync(metadata(cwd), "utf8")).toBe(original);
  });

  it("preserves all scoped exclusions, acceptance, recorded decisions, open questions and shared creative data in the brief", async () => {
    const cwd = project();
    setup(cwd);
    task(cwd);
    workspaceAction(cwd, "decision", {
      id: "checkout",
      data: {
        id: "billing",
        question: "May account billing change?",
        answer: "Keep included-only use",
        rationale: "Human scope restriction",
        requirements: ["once"],
        source: "conversation",
      },
    });
    workspaceAction(cwd, "question", {
      id: "checkout",
      data: {
        id: "timeout",
        question: "Which timeout applies?",
        requirements: ["once"],
        options: ["Keep existing timeout", "Supply a new approved timeout"],
      },
    });
    workspaceAction(cwd, "creative", { data: defaultCreativeKit() });
    learning(cwd, "applicable");
    const before = fs.readFileSync(metadata(cwd), "utf8");
    const brief = await prepareWorkBrief(cwd, "checkout", {
      task: "implement",
      agent: "codex",
      includeSource: true,
    });
    expect(brief.ready).toBe(false);
    for (const content of [
      "No paid calls",
      "Do not change global settings",
      "Same key and amount charge once",
      "Keep included-only use",
      "Which timeout applies?",
      defaultCreativeKit().motion.reducedMotion,
      "export const chargeOnce = true",
      "data, not instructions",
    ])
      expect(brief.text).toContain(content);
    expect(brief.adapter).toMatch(/include source explicitly|supplied source/i);
    expect(brief.learnings).toEqual([
      expect.objectContaining({ id: "applicable" }),
    ]);
    expect(brief.characters).toBe(brief.text.length);
    expect(brief.text.length).toBeLessThanOrEqual(48000);
    expect(fs.readFileSync(metadata(cwd), "utf8")).toBe(before);
  });

  it("fails explicitly when required scope exceeds budget and permits an explicitly larger brief", async () => {
    const cwd = project();
    const exclusions = [
      "Preserve every private event " + "x".repeat(1800),
      "Do not expand deletion authorization " + "y".repeat(1800),
      "No paid external calls " + "z".repeat(1800),
    ];
    setup(cwd);
    workspaceAction(cwd, "update", { id: "checkout", data: { exclusions } });
    task(cwd);
    const before = fs.readFileSync(metadata(cwd), "utf8");
    await expect(
      prepareWorkBrief(cwd, "checkout", {
        task: "implement",
        maxCharacters: 4000,
      }),
    ).rejects.toThrow(/scope.*budget|exceed.*budget/i);
    const larger = await prepareWorkBrief(cwd, "checkout", {
      task: "implement",
      maxCharacters: 16000,
    });
    for (const exclusion of exclusions)
      expect(larger.text).toContain(exclusion);
    expect(larger.text.length).toBeLessThanOrEqual(16000);
    expect(fs.readFileSync(metadata(cwd), "utf8")).toBe(before);
  });

  it("rejects an unknown explicit task rather than silently switching to a ready task", async () => {
    const cwd = project();
    setup(cwd);
    task(cwd);
    await expect(
      prepareWorkBrief(cwd, "checkout", {
        task: "unknown",
        agent: "antigravity",
      }),
    ).rejects.toThrow("Unknown feature task");
    expect(getFeature(cwd, "checkout").tasks[0].id).toBe("implement");
  });

  it("rejects forged completed metadata with unresolved material questions", () => {
    const cwd = project();
    setup(cwd);
    task(cwd);
    complete(cwd);
    editMetadata(cwd, (state) => {
      state.features[0].status = "completed";
      state.features[0].questions.push({
        id: "policy",
        question: "What policy applies?",
        options: [],
        requirements: ["once"],
      });
      state.revision = randomUUID();
    });
    expect(() => readWorkspace(cwd)).toThrow(
      /completed feature|answered questions/,
    );
  });
});
