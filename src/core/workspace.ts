import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID, randomBytes, createHmac, createHash } from "node:crypto";
import { z } from "zod";
import { isSafeProjectPath } from "./fs.js";
import { runProjectOperationSync, writeAtomicFile } from "./operations.js";
import { runChecks } from "./progress.js";
import { repositoryFingerprint } from "./workflowContext.js";
import {
  workspaceSchema,
  workId,
  requirementInput,
  taskInput,
  decisionInput,
  questionInput,
  learningInput,
  creativeKitInput,
} from "./workspaceTypes.js";
import type {
  Workspace,
  Feature,
  Task,
  CreativeKit,
} from "./workspaceTypes.js";

const LIMIT = 2 * 1024 * 1024;
const now = () => new Date().toISOString();
/**
 * The key lives with the user, not in the project: an agent that can only touch the repository (or call MCP tools)
 * cannot read it, so it cannot forge a gate receipt.
 */
export function gateKeyPath(cwd: string): string {
  const home = path.resolve(
    process.env.HELEN_HOME || path.join(os.homedir(), ".helen"),
  );
  const id = createHash("sha256")
    .update(fs.realpathSync(path.resolve(cwd)))
    .digest("hex")
    .slice(0, 32);
  return path.join(home, "gate-keys", `${id}.key`);
}
function gateKey(cwd: string, create = false): string | null {
  const location = gateKeyPath(cwd);
  if (!fs.existsSync(location)) {
    if (!create) return null;
    fs.mkdirSync(path.dirname(location), { recursive: true, mode: 0o700 });
    fs.writeFileSync(location, randomBytes(32).toString("hex"), {
      mode: 0o600,
      flag: "wx",
    });
  }
  const info = fs.lstatSync(location);
  if (!info.isFile() || info.size > 100)
    throw new Error("Invalid verification key");
  const key = fs.readFileSync(location, "utf8");
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error("Invalid verification key");
  return key;
}
function gateDigest(gate: Feature["gates"][number], key: string): string {
  const { receipt: _receipt, ...record } = gate;
  return createHmac("sha256", key).update(JSON.stringify(record)).digest("hex");
}
function observedGate(cwd: string, gate: Feature["gates"][number]): boolean {
  const key = gateKey(cwd);
  return !!key && gate.receipt === gateDigest(gate, key);
}
function file(cwd: string): string {
  const location = path.join(path.resolve(cwd), ".helen", "workspace.json");
  if (!isSafeProjectPath(cwd, location))
    throw new Error("Unsafe workspace metadata path");
  return location;
}
function unique(values: string[], label: string): void {
  if (new Set(values).size !== values.length)
    throw new Error(`Duplicate ${label}`);
}
function feature(state: Workspace, id: string): Feature {
  workId.parse(id);
  const found = state.features.find((value) => value.id === id);
  if (!found) throw new Error(`Unknown feature: ${id}`);
  return found;
}
function taskAt(
  state: Workspace,
  key: string,
): { feature: Feature; task: Task } {
  const [featureId, taskId] = key.split(":");
  const parent = feature(state, featureId ?? "");
  const found = parent.tasks.find((value) => value.id === taskId);
  if (!found) throw new Error(`Unknown dependency: ${key}`);
  return { feature: parent, task: found };
}
export function taskApplicability(parent: Feature, task: Task): boolean | null {
  if (!task.condition) return true;
  const question = parent.questions.find(
    (entry) => entry.id === task.condition!.question,
  );
  if (!question?.answer) return null;
  return question.answer === task.condition.answer;
}
function dependencyAccepted(entry: { feature: Feature; task: Task }): boolean {
  const applicable = taskApplicability(entry.feature, entry.task);
  return (
    applicable === false ||
    (applicable === true &&
      entry.task.status === "done" &&
      !entry.task.needsReview)
  );
}
export function requirementApplicability(
  parent: Feature,
  id: string,
): boolean | null {
  const owners = parent.tasks.filter((task) => task.requirements.includes(id));
  if (!owners.length) return true;
  const states = owners.map((task) => taskApplicability(parent, task));
  return states.includes(true) ? true : states.includes(null) ? null : false;
}
function validate(state: Workspace, cwd: string): Workspace {
  const parsed = workspaceSchema.parse(state);
  if (
    parsed.creativeKit &&
    colorContrast(
      parsed.creativeKit.colors.text,
      parsed.creativeKit.colors.background,
    ) < 4.5
  )
    throw new Error(
      "Creative kit body text/background contrast must be at least 4.5:1",
    );
  unique(
    parsed.features.map((value) => value.id),
    "feature IDs",
  );
  unique(
    parsed.learnings.map((value) => value.id),
    "learning IDs",
  );
  const visiting = new Set<string>(),
    visited = new Set<string>();
  const visit = (key: string): void => {
    if (visiting.has(key)) throw new Error(`Task dependency cycle at ${key}`);
    if (visited.has(key)) return;
    visiting.add(key);
    const entry = taskAt(parsed, key);
    for (const dependency of entry.task.dependsOn) visit(dependency);
    visiting.delete(key);
    visited.add(key);
  };
  for (const parent of parsed.features) {
    unique(
      parent.requirements.map((value) => value.id),
      "requirement IDs",
    );
    unique(
      parent.tasks.map((value) => value.id),
      "task IDs",
    );
    unique(
      parent.decisions.map((value) => value.id),
      "decision IDs",
    );
    unique(
      parent.questions.map((value) => value.id),
      "question IDs",
    );
    unique(
      parent.gates.map((value) => value.id),
      "gate IDs",
    );
    const requirements = new Set(parent.requirements.map((value) => value.id));
    const paths = [
      ...parent.files,
      ...parent.requirements.flatMap((value) => value.files),
      ...parent.tasks.flatMap((value) => value.files),
    ];
    for (const ref of paths)
      if (!isSafeProjectPath(cwd, path.resolve(cwd, ref)))
        throw new Error(`Unsafe source reference: ${ref}`);
    for (const value of [
      ...parent.tasks,
      ...parent.decisions,
      ...parent.questions,
    ]) {
      for (const requirement of value.requirements)
        if (!requirements.has(requirement))
          throw new Error(`Unknown requirement: ${requirement}`);
    }
    for (const decision of parent.decisions) {
      const { at: _at, ...input } = decision;
      decisionInput.parse(input);
    }
    for (const task of parent.tasks) {
      if (
        task.condition &&
        !parent.questions.some(
          (question) => question.id === task.condition!.question,
        )
      )
        throw new Error("Unknown branch question");
      unique(task.dependsOn, "task dependencies");
      visit(`${parent.id}:${task.id}`);
    }
    for (const question of parent.questions) {
      if (Boolean(question.answer) !== Boolean(question.decisionId))
        throw new Error("Answered questions require a recorded decision");
      if (
        question.decisionId &&
        !parent.decisions.some(
          (decision) => decision.id === question.decisionId,
        )
      )
        throw new Error("Question decision is missing");
      if (question.decisionId) {
        const decision = parent.decisions.find(
          (entry) => entry.id === question.decisionId,
        )!;
        if (
          question.answer !== decision.answer ||
          question.question !== decision.question ||
          JSON.stringify(question.requirements) !==
            JSON.stringify(decision.requirements)
        )
          throw new Error("Question and recorded decision disagree");
      }
    }
    if (
      parent.status === "completed" &&
      (parent.tasks.length === 0 ||
        parent.tasks.some(
          (task) =>
            taskApplicability(parent, task) !== false &&
            (task.status !== "done" || task.needsReview),
        ) ||
        parent.questions.some((question) => !question.answer))
    )
      throw new Error(
        "A completed feature needs accepted tasks and answered questions",
      );
    if (
      parent.status === "completed" &&
      parent.requirements.some(
        (requirement) =>
          requirementApplicability(parent, requirement.id) !== false &&
          !parent.tasks.some(
            (task) =>
              task.status === "done" &&
              taskApplicability(parent, task) === true &&
              !task.needsReview &&
              task.requirements.includes(requirement.id),
          ),
      )
    )
      throw new Error(
        "Completed feature has an uncovered requirement; assign and accept its work first",
      );
  }
  return parsed;
}
export function readWorkspace(cwd: string): Workspace | null {
  const location = file(cwd);
  if (!fs.existsSync(location)) return null;
  const info = fs.lstatSync(location);
  if (!info.isFile() || info.size > LIMIT)
    throw new Error("Workspace must be a regular file below 2 MiB");
  try {
    const state = validate(JSON.parse(fs.readFileSync(location, "utf8")), cwd);
    if (
      state.features.some((parent) =>
        parent.tasks.some((task) => task.status === "done" && task.checkpoint),
      )
    ) {
      const fingerprint = repositoryFingerprint(cwd);
      for (const parent of state.features)
        for (const task of parent.tasks) {
          if (
            task.status !== "done" ||
            !task.checkpoint ||
            taskApplicability(parent, task) === false
          )
            continue;
          const gate = parent.gates.find(
            (entry) => entry.id === task.evidenceId,
          );
          if (
            !gate?.ok ||
            gate.task !== task.id ||
            !task.requiredChecks.every((required) =>
              gate.results.some(
                (result) => result.script === required && result.ok,
              ),
            ) ||
            !observedGate(cwd, gate) ||
            gate.fingerprint !== fingerprint ||
            gate.scopeRevision !== parent.scopeRevision
          ) {
            task.needsReview = true;
            task.reviewReason = "Observed gate is stale; rerun verification";
            if (parent.status === "completed") parent.status = "active";
          }
        }
      let changed = true;
      while (changed) {
        changed = false;
        for (const parent of state.features)
          for (const task of parent.tasks) {
            if (
              !task.needsReview &&
              taskApplicability(parent, task) !== false &&
              task.dependsOn.some((key) => {
                const entry = taskAt(state, key);
                return !dependencyAccepted(entry);
              })
            ) {
              if (task.status === "done") {
                task.needsReview = true;
                task.reviewReason =
                  "Dependency acceptance is no longer current";
                if (parent.status === "completed") parent.status = "active";
                changed = true;
              }
            }
          }
      }
    }
    return state;
  } catch (error) {
    throw new Error(
      `Invalid workspace; preserve it before repair: ${String(error)}`,
    );
  }
}
function mutate<T>(
  cwd: string,
  kind: string,
  action: (state: Workspace) => T,
  expectedRevision?: string,
): T {
  return runProjectOperationSync(cwd, `workspace:${kind}`, () => {
    const state = readWorkspace(cwd) ?? {
      schemaVersion: 1 as const,
      revision: randomUUID(),
      updatedAt: now(),
      features: [],
      learnings: [],
    };
    if (expectedRevision && state.revision !== expectedRevision)
      throw new Error(
        "Workspace revision changed; reload before applying the update",
      );
    const previous = new Map(
      state.features.map((parent) => [parent.id, structuredClone(parent)]),
    );
    const result = action(state);
    for (const parent of state.features) {
      const old = previous.get(parent.id);
      if (!old || old.scopeRevision === parent.scopeRevision) continue;
      const changes: Feature["history"][number]["changes"] = [];
      for (const field of ["goal", "exclusions", "files", "profile"] as const)
        if (JSON.stringify(old[field]) !== JSON.stringify(parent[field]))
          changes.push({ field, before: old[field], after: parent[field] });
      for (const field of ["requirements", "tasks"] as const) {
        const ids = new Set(
          [...old[field], ...parent[field]].map((entry) => entry.id),
        );
        for (const id of ids) {
          const a = old[field].find((entry) => entry.id === id),
            b = parent[field].find((entry) => entry.id === id);
          if (JSON.stringify(a) !== JSON.stringify(b))
            changes.push({
              field: `${field}:${id}`,
              before: a ?? null,
              after: b ?? null,
            });
        }
      }
      parent.history.push({
        id: randomUUID(),
        at: now(),
        action: kind,
        previousScope: old.scopeRevision,
        scope: parent.scopeRevision,
        changes,
      });
    }
    state.revision = randomUUID();
    state.updatedAt = now();
    const checked = validate(state, cwd);
    const content = JSON.stringify(checked, null, 2) + "\n";
    if (Buffer.byteLength(content) > LIMIT)
      throw new Error(
        "Workspace exceeds 2 MiB; archive finished work before adding more",
      );
    fs.mkdirSync(path.dirname(file(cwd)), { recursive: true });
    const ignore = path.join(path.dirname(file(cwd)), ".gitignore");
    if (!isSafeProjectPath(cwd, ignore))
      throw new Error("Unsafe workspace ignore path");
    const ignored = fs.existsSync(ignore)
      ? fs.readFileSync(ignore, "utf8")
      : "";
    if (!ignored.split(/\r?\n/).includes("*"))
      writeAtomicFile(
        ignore,
        `${ignored}${ignored && !ignored.endsWith("\n") ? "\n" : ""}*\n`,
        { mode: 0o600 },
      );
    writeAtomicFile(file(cwd), content, { mode: 0o600 });
    return result;
  }).value;
}
function invalidate(
  state: Workspace,
  parent: Feature,
  reason: string,
): string[] {
  parent.scopeRevision = randomUUID();
  parent.updatedAt = now();
  if (parent.status === "completed") parent.status = "active";
  const affected = new Set(
    parent.tasks.map((task) => `${parent.id}:${task.id}`),
  );
  const owners = new Set([parent.id]);
  let added = true;
  while (added) {
    added = false;
    for (const owner of state.features)
      for (const task of owner.tasks) {
        const key = `${owner.id}:${task.id}`;
        if (
          !affected.has(key) &&
          task.dependsOn.some((dependency) => affected.has(dependency))
        ) {
          affected.add(key);
          added = true;
        }
      }
  }
  for (const key of affected) {
    const entry = taskAt(state, key);
    if (!owners.has(entry.feature.id)) {
      entry.feature.scopeRevision = randomUUID();
      owners.add(entry.feature.id);
    }
    entry.task.needsReview = true;
    entry.task.reviewReason = reason;
    if (entry.feature.status === "completed") entry.feature.status = "active";
    entry.feature.updatedAt = now();
  }
  return [...affected];
}
export function getFeature(cwd: string, id: string): Feature {
  const state = readWorkspace(cwd);
  if (!state) throw new Error("No workspace recorded");
  return feature(state, id);
}
export function summarizeWorkspace(cwd: string): Record<string, unknown> {
  const state = readWorkspace(cwd);
  return {
    revision: state?.revision ?? null,
    features:
      state?.features.map((parent) => ({
        id: parent.id,
        title: parent.title,
        status: parent.status,
        scopeRevision: parent.scopeRevision,
        tasks: parent.tasks.length,
        done: parent.tasks.filter(
          (task) => task.status === "done" && !task.needsReview,
        ).length,
        review: parent.tasks.filter((task) => task.needsReview).length,
        inactiveBranches: parent.tasks.filter(
          (task) => taskApplicability(parent, task) === false,
        ).length,
        questions: parent.questions.filter((question) => !question.answer)
          .length,
        unassignedRequirements: parent.requirements
          .filter(
            (requirement) =>
              requirementApplicability(parent, requirement.id) !== false &&
              !parent.tasks.some(
                (task) =>
                  taskApplicability(parent, task) !== false &&
                  task.requirements.includes(requirement.id),
              ),
          )
          .map((requirement) => requirement.id),
        inactiveRequirements: parent.requirements
          .filter(
            (requirement) =>
              requirementApplicability(parent, requirement.id) === false,
          )
          .map((requirement) => requirement.id),
      })) ?? [],
  };
}
export function readyTasks(
  cwd: string,
): Array<{ feature: string; task: Task; phase: string }> {
  const state = readWorkspace(cwd);
  if (!state) return [];
  return state.features
    .filter(
      (parent) =>
        parent.status === "active" &&
        !parent.questions.some((question) => !question.answer),
    )
    .flatMap((parent) =>
      parent.tasks
        .filter(
          (task) =>
            task.status !== "blocked" &&
            task.status !== "skipped" &&
            taskApplicability(parent, task) === true &&
            (task.status !== "done" || task.needsReview) &&
            task.dependsOn.every((key) => {
              const entry = taskAt(state, key);
              return (
                entry.feature.status !== "paused" && dependencyAccepted(entry)
              );
            }),
        )
        .map((task) => ({
          feature: parent.id,
          task,
          phase: task.needsReview
            ? "review"
            : task.checkpoint
              ? "verify"
              : "implement",
        })),
    );
}
export function workspaceAction(
  cwd: string,
  action: string,
  raw: unknown,
): unknown {
  const envelope = z
    .object({
      id: workId.optional(),
      data: z.unknown(),
      expectedRevision: z.string().uuid().optional(),
    })
    .strict()
    .parse(raw);
  const id = envelope.id;
  if (action === "create") {
    const input = z
      .object({
        id: workId,
        title: z.string().trim().min(1).max(4000),
        goal: z.string().trim().min(1).max(4000),
        exclusions: z
          .array(z.string().trim().min(1).max(4000))
          .max(40)
          .default([]),
        files: requirementInput.shape.files,
        profile: z
          .enum(["quick", "standard", "exhaustive"])
          .default("standard"),
      })
      .strict()
      .parse(envelope.data);
    return mutate(
      cwd,
      action,
      (state) => {
        if (state.features.some((parent) => parent.id === input.id))
          throw new Error("Feature already exists; update explicitly");
        const parent: Feature = {
          ...input,
          scopeRevision: randomUUID(),
          status: "active",
          createdAt: now(),
          updatedAt: now(),
          requirements: [],
          tasks: [],
          decisions: [],
          questions: [],
          gates: [],
          history: [],
        };
        state.features.push(parent);
        return parent;
      },
      envelope.expectedRevision,
    );
  }
  if (action === "learning") {
    const input = learningInput.parse(envelope.data);
    return mutate(
      cwd,
      action,
      (state) => {
        if (state.learnings.some((value) => value.id === input.id))
          throw new Error(
            "Learning already recorded; retire it before creating a revised learning",
          );
        const learning = { ...input, recordedAt: now() };
        state.learnings.push(learning);
        return learning;
      },
      envelope.expectedRevision,
    );
  }
  if (action === "retire-learning") {
    const input = z.object({ id: workId }).strict().parse(envelope.data);
    return mutate(
      cwd,
      action,
      (state) => {
        const learning = state.learnings.find((entry) => entry.id === input.id);
        if (!learning) throw new Error("Unknown learning");
        learning.expiresAt = now();
        return learning;
      },
      envelope.expectedRevision,
    );
  }
  if (action === "creative" || action === "creative-init") {
    const input = creativeKitInput.parse(envelope.data);
    if (colorContrast(input.colors.text, input.colors.background) < 4.5)
      throw new Error(
        "Creative kit body text/background contrast must be at least 4.5:1",
      );
    return mutate(
      cwd,
      action,
      (state) => {
        if (action === "creative-init" && state.creativeKit)
          throw new Error(
            "Creative kit exists; review it before an explicit set",
          );
        state.creativeKit = { ...input, updatedAt: now() };
        for (const parent of state.features)
          invalidate(
            state,
            parent,
            "Shared creative direction changed; review affected deliverables and acceptance",
          );
        return state.creativeKit;
      },
      envelope.expectedRevision,
    );
  }
  if (!id) throw new Error("Feature id is required");
  workId.parse(id);
  if (action === "plan") {
    const input = z
      .object({ kind: z.enum(["fix", "feature", "migration"]) })
      .strict()
      .parse(envelope.data);
    return mutate(
      cwd,
      action,
      (state) => {
        const parent = feature(state, id);
        if (parent.tasks.length)
          throw new Error(
            "Feature already has tasks; update them explicitly instead of replacing the plan",
          );
        const stages =
          parent.profile === "quick" && input.kind === "fix"
            ? ["implement", "verify"]
            : input.kind === "migration"
              ? ["design", "prepare", "implement", "review", "verify"]
              : input.kind === "fix"
                ? ["investigate", "implement", "verify"]
                : ["define", "implement", "review", "verify"];
        if (parent.profile === "exhaustive") {
          stages.splice(stages.indexOf("implement"), 0, "risk-review");
          stages.push("handoff");
        }
        parent.tasks = stages.map((stage, index) => ({
          id: stage,
          title: `${stage}: ${parent.title}`,
          requirements: parent.requirements.map(
            (requirement) => requirement.id,
          ),
          dependsOn: index ? [`${parent.id}:${stages[index - 1]}`] : [],
          files: parent.files,
          checkpoint: stage === "verify",
          requiredChecks: ["typecheck", "lint", "test", "build"],
          status: "pending",
          needsReview: false,
        }));
        parent.scopeRevision = randomUUID();
        parent.updatedAt = now();
        return parent;
      },
      envelope.expectedRevision,
    );
  }
  if (action === "requirement") {
    const input = requirementInput.parse(envelope.data);
    return mutate(
      cwd,
      action,
      (state) => {
        const parent = feature(state, id),
          index = parent.requirements.findIndex(
            (value) => value.id === input.id,
          );
        if (
          index >= 0 &&
          JSON.stringify(parent.requirements[index]) === JSON.stringify(input)
        )
          return { feature: parent, affected: [] };
        if (index < 0) parent.requirements.push(input);
        else parent.requirements[index] = input;
        return {
          feature: parent,
          affected: invalidate(
            state,
            parent,
            `Requirement ${input.id} changed; reassess scope and acceptance`,
          ),
        };
      },
      envelope.expectedRevision,
    );
  }
  if (action === "task") {
    const input = taskInput.parse(envelope.data);
    return mutate(
      cwd,
      action,
      (state) => {
        const parent = feature(state, id),
          index = parent.tasks.findIndex((value) => value.id === input.id);
        const task: Task = { ...input, status: "pending", needsReview: false };
        const previous = index < 0 ? undefined : parent.tasks[index];
        if (previous?.checkpoint) {
          // A checkpoint cannot be downgraded through the record tool.
          task.checkpoint = true;
          task.requiredChecks = [
            ...new Set([...previous.requiredChecks, ...task.requiredChecks]),
          ];
        }
        if (index < 0) parent.tasks.push(task);
        else parent.tasks[index] = task;
        return {
          feature: parent,
          affected: invalidate(
            state,
            parent,
            `Task ${input.id} changed; review the dependent plan`,
          ),
        };
      },
      envelope.expectedRevision,
    );
  }
  if (action === "decision") {
    const input = decisionInput.parse(envelope.data);
    return mutate(
      cwd,
      action,
      (state) => {
        const parent = feature(state, id);
        if (parent.decisions.some((value) => value.id === input.id))
          throw new Error(
            "Decisions are append-only; record a new decision to supersede one",
          );
        parent.decisions.push({ ...input, at: now() });
        return {
          feature: parent,
          affected: invalidate(
            state,
            parent,
            `Decision ${input.id} changed project direction`,
          ),
        };
      },
      envelope.expectedRevision,
    );
  }
  if (action === "question") {
    const input = questionInput.parse(envelope.data);
    return mutate(
      cwd,
      action,
      (state) => {
        const parent = feature(state, id);
        if (parent.questions.some((value) => value.id === input.id))
          throw new Error("Question already recorded");
        parent.questions.push(input);
        if (parent.status === "completed") parent.status = "active";
        parent.updatedAt = now();
        return input;
      },
      envelope.expectedRevision,
    );
  }
  if (action === "answer") {
    const input = z
      .object({ questionId: workId, decision: decisionInput })
      .strict()
      .parse(envelope.data);
    return mutate(
      cwd,
      action,
      (state) => {
        const parent = feature(state, id),
          question = parent.questions.find(
            (value) => value.id === input.questionId,
          );
        if (!question || question.answer)
          throw new Error("Question missing or already answered");
        if (
          input.decision.question !== question.question ||
          JSON.stringify(input.decision.requirements) !==
            JSON.stringify(question.requirements)
        )
          throw new Error(
            "Answer must retain the recorded question and requirement links",
          );
        if (parent.decisions.some((value) => value.id === input.decision.id))
          throw new Error("Decision ID already exists");
        parent.decisions.push({ ...input.decision, at: now() });
        question.answer = input.decision.answer;
        question.decisionId = input.decision.id;
        return {
          feature: parent,
          affected: invalidate(
            state,
            parent,
            `Human answer recorded for ${question.id}`,
          ),
        };
      },
      envelope.expectedRevision,
    );
  }
  if (action === "update") {
    const input = z
      .object({
        title: z.string().trim().min(1).max(4000).optional(),
        goal: z.string().trim().min(1).max(4000).optional(),
        exclusions: z
          .array(z.string().trim().min(1).max(4000))
          .max(40)
          .optional(),
        files: requirementInput.shape.files.optional(),
        profile: z.enum(["quick", "standard", "exhaustive"]).optional(),
        status: z.enum(["active", "paused", "completed"]).optional(),
      })
      .strict()
      .parse(envelope.data);
    return mutate(
      cwd,
      action,
      (state) => {
        const parent = feature(state, id),
          scopeChanged = ["goal", "exclusions", "files"].some((key) =>
            Object.hasOwn(input, key),
          );
        Object.assign(parent, input);
        parent.updatedAt = now();
        return {
          feature: parent,
          affected: scopeChanged
            ? invalidate(state, parent, "Feature scope changed")
            : [],
        };
      },
      envelope.expectedRevision,
    );
  }
  if (action === "task-state") {
    const input = z
      .object({
        task: workId,
        status: z.enum(["pending", "active", "blocked", "done", "skipped"]),
        note: z.string().trim().min(1).max(4000),
        gate: workId.optional(),
      })
      .strict()
      .parse(envelope.data);
    return mutate(
      cwd,
      action,
      (state) => {
        const parent = feature(state, id),
          entry = taskAt(state, `${id}:${input.task}`).task;
        if (input.status !== "done" && entry.status === "done")
          invalidate(
            state,
            parent,
            `Task ${entry.id} reopened; review dependent acceptance`,
          );
        if (input.status !== "done" && parent.status === "completed")
          parent.status = "active";
        if (input.status === "done" || input.status === "active") {
          if (taskApplicability(parent, entry) !== true)
            throw new Error("Task branch is inactive or awaits a human answer");
          if (
            parent.status !== "active" ||
            parent.questions.some((question) => !question.answer)
          )
            throw new Error(
              "Feature is paused, complete or awaiting a human answer",
            );
          if (
            entry.dependsOn.some((key) => {
              const dependency = taskAt(state, key);
              return (
                !dependencyAccepted(dependency) ||
                dependency.feature.status === "paused"
              );
            })
          )
            throw new Error("Dependencies are not accepted");
        }
        if (input.status === "done") {
          if (entry.checkpoint) {
            const gate = parent.gates.find(
              (value) => value.id === input.gate && value.task === entry.id,
            );
            if (
              !gate?.ok ||
              !observedGate(cwd, gate) ||
              gate.scopeRevision !== parent.scopeRevision ||
              gate.fingerprint !== repositoryFingerprint(cwd)
            )
              throw new Error(
                "Checkpoint requires a current observed passing gate for this task",
              );
            entry.evidenceId = gate.id;
          }
          entry.acceptedScope = parent.scopeRevision;
          entry.needsReview = false;
          delete entry.reviewReason;
        }
        entry.status = input.status;
        entry.note = input.note;
        parent.updatedAt = now();
        return entry;
      },
      envelope.expectedRevision,
    );
  }
  throw new Error(`Unknown workspace action: ${action}`);
}
export function captureFeatureGate(
  cwd: string,
  featureId: string,
  taskId: string,
  runner?: Parameters<typeof runChecks>[1],
): Feature["gates"][number] {
  const before = getFeature(cwd, featureId),
    task = before.tasks.find((entry) => entry.id === taskId);
  if (!task) throw new Error("Unknown task");
  if (taskApplicability(before, task) !== true)
    throw new Error("Cannot verify an inactive or unresolved task branch");
  const run = runChecks(cwd, runner);
  return mutate(cwd, "gate", (state) => {
    const parent = feature(state, featureId);
    if (parent.scopeRevision !== before.scopeRevision)
      throw new Error("Feature changed during verification; rerun its gate");
    const results = [...run.results];
    for (const required of task.requiredChecks)
      if (!results.some((result) => result.script === required))
        results.push({ script: `missing:${required}`, ok: false });
    const gate: Feature["gates"][number] = {
      id: `gate-${randomUUID()}`,
      task: task.id,
      scopeRevision: parent.scopeRevision,
      fingerprint: run.fingerprint ?? repositoryFingerprint(cwd),
      at: run.at,
      ok: run.ok && results.every((result) => result.ok),
      results,
    };
    gate.receipt = gateDigest(gate, gateKey(cwd, true)!);
    parent.gates.push(gate);
    parent.updatedAt = now();
    return gate;
  });
}
export function retrieveLearnings(
  cwd: string,
  request: {
    query?: string;
    paths?: string[];
    tags?: string[];
    limit?: number;
  } = {},
): Array<{
  learning: Workspace["learnings"][number];
  score: number;
  reasons: string[];
}> {
  const input = z
    .object({
      query: z.string().max(4000).optional(),
      paths: z.array(z.string().max(500)).max(100).optional(),
      tags: z.array(z.string().max(100)).max(30).optional(),
      limit: z.number().int().min(1).max(20).optional(),
    })
    .strict()
    .parse(request);
  const state = readWorkspace(cwd);
  if (!state) return [];
  const pkgFile = path.join(cwd, "package.json");
  let packages: Record<string, unknown> = {};
  if (
    isSafeProjectPath(cwd, pkgFile) &&
    fs.existsSync(pkgFile) &&
    fs.statSync(pkgFile).size < 256000
  ) {
    const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
    packages = { ...pkg.dependencies, ...pkg.devDependencies };
  }
  const words = (input.query ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
  return state.learnings
    .filter(
      (learning) =>
        !learning.expiresAt || Date.parse(learning.expiresAt) > Date.now(),
    )
    .flatMap((learning) => {
      const reasons: string[] = [];
      for (const condition of learning.conditions.packages) {
        const version = packages[condition.name];
        if (typeof version !== "string") return [];
        if (
          condition.major !== undefined &&
          Number(
            /^[~^]?(\d+)\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i.exec(version)?.[1],
          ) !== condition.major
        )
          return [];
        reasons.push(
          `Package condition: ${condition.name}${condition.major === undefined ? "" : ` major ${condition.major}`}`,
        );
      }
      if (
        learning.conditions.paths.length &&
        !learning.conditions.paths.some((prefix) =>
          input.paths?.some(
            (value) => value === prefix || value.startsWith(prefix + "/"),
          ),
        )
      )
        return [];
      if (learning.conditions.paths.length)
        reasons.push("Path condition matched");
      if (
        learning.conditions.tags.length &&
        !learning.conditions.tags.every((tag) => input.tags?.includes(tag))
      )
        return [];
      if (learning.conditions.tags.length)
        reasons.push("Tag conditions matched");
      const searchable =
        `${learning.problem} ${learning.cause} ${learning.solution} ${learning.tags.join(" ")}`.toLowerCase();
      const matches = words.filter((word) => searchable.includes(word));
      const tags = learning.tags.filter((tag) => input.tags?.includes(tag));
      const score = matches.length + tags.length * 2 + reasons.length;
      if (!score) return [];
      if (matches.length) reasons.push(`Query terms: ${matches.join(", ")}`);
      return [{ learning, score, reasons }];
    })
    .sort(
      (a, b) => b.score - a.score || a.learning.id.localeCompare(b.learning.id),
    )
    .slice(0, input.limit ?? 5);
}
export function colorContrast(foreground: string, background: string): number {
  const luminance = (color: string): number => {
    if (!/^#[a-f0-9]{6}$/i.test(color))
      throw new Error("Expected six-digit hex color");
    const channels = [1, 3, 5].map((offset) => {
      const value = parseInt(color.slice(offset, offset + 2), 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return (
      channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
    );
  };
  const a = luminance(foreground),
    b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export function defaultCreativeKit(): CreativeKit {
  return {
    name: "Modern editorial",
    direction:
      "Modernist professional composition with deliberate typography, restrained color and photographic depth.",
    references: [],
    colors: { background: "#F5F3ED", text: "#182126", accent: "#00665E" },
    typography: {
      display:
        "A distinctive available sans-serif; verify licensing and font availability",
      body: "A readable available sans-serif",
      hierarchy: [
        "One dominant message",
        "Supporting evidence",
        "Source and detail",
      ],
    },
    imagery:
      "Use authentic, relevant photography with purposeful crops and layered composition; cite sources.",
    composition:
      "Use a consistent grid, asymmetric balance, clear scale changes and generous whitespace. Vary layouts according to the content.",
    motion: {
      purpose:
        "Reveal structure, causality or emphasis; synchronize with the spoken narrative",
      durationMs: 350,
      reducedMotion: "Remove movement and reveal final content immediately",
      staticFallback:
        "Every final frame must remain readable without animation",
    },
    tone: "Concrete, confident, human and specific",
    exclusions: [
      "Generic AI slogans",
      "Decorative effects without communicative purpose",
      "Unreadable image overlays",
      "Unverified charts or claims",
    ],
  };
}
