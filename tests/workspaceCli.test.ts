import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, expect, it } from "vitest";
import { handleToolCall } from "../src/core/mcp.js";
import { workspaceAction } from "../src/core/workspace.js";

const cli = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist/cli.js",
);
let cwd: string;
beforeEach(() => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), "helen-feature-cli-"));
});
afterEach(() => {
  fs.rmSync(cwd, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
});
function run(args: string[]) {
  const result = spawnSync(process.execPath, [cli, ...args, "--json"], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    timeout: 30000,
  });
  expect(result.error).toBeUndefined();
  return { status: result.status, body: JSON.parse(result.stdout) };
}
it("keeps a real failing project check failed in CLI and MCP while storing the failed evidence", async () => {
  fs.writeFileSync(
    path.join(cwd, "package.json"),
    JSON.stringify({ scripts: { test: 'node -e "process.exit(1)"' } }),
  );
  expect(
    run([
      "work",
      "create",
      "fix",
      "--title",
      "Repair",
      "--goal",
      "Valid behavior",
    ]).status,
  ).toBe(0);
  workspaceAction(cwd, "task", {
    id: "fix",
    data: {
      id: "verify",
      title: "Verify",
      checkpoint: true,
      requiredChecks: ["test"],
    },
  });
  const result = run(["work", "check", "fix", "verify"]);
  expect(result.status).toBe(1);
  expect(result.body.ok).toBe(false);
  expect(result.body.data.ok).toBe(false);
  expect(result.body.data.results).toContainEqual({
    script: "test",
    ok: false,
  });
  const mcp = await handleToolCall("helen_work_check", {
    cwd,
    id: "fix",
    task: "verify",
  });
  expect(mcp.isError).toBe(true);
  expect(JSON.parse(mcp.content[0].text).ok).toBe(false);
  expect(run(["work", "show", "fix"]).body.data.gates).toHaveLength(2);
});
it("uses native-facing structured records to block work until the actual human answer reaches the brief", async () => {
  await handleToolCall("helen_work_record", {
    cwd,
    action: "create",
    data: {
      id: "talk",
      title: "Talk",
      goal: "Explain evidence",
      exclusions: ["No invented facts"],
    },
  });
  await handleToolCall("helen_work_record", {
    cwd,
    action: "task",
    id: "talk",
    data: { id: "draft", title: "Draft" },
  });
  const recorded = await handleToolCall("helen_work_record", {
    cwd,
    action: "question",
    id: "talk",
    data: {
      id: "audience",
      question: "Which audience?",
      options: ["Researchers", "Students"],
    },
  });
  expect(recorded.isError).not.toBe(true);
  expect(run(["work", "ready"]).body.data).toEqual([]);
  const response = await handleToolCall("helen_work_record", {
    cwd,
    action: "answer",
    id: "talk",
    data: {
      questionId: "audience",
      decision: {
        id: "audience-choice",
        question: "Which audience?",
        answer: "Researchers",
        rationale: "Human chose researchers",
        source: "native_question",
        runtime: "codex",
        tool: "request_user_input_async",
      },
    },
  });
  expect(response.isError).not.toBe(true);
  const brief = run(["work", "brief", "talk"]);
  expect(brief.status).toBe(0);
  expect(brief.body.data.text).toContain("Researchers");
  expect(brief.body.data.text).toContain("No invented facts");
  expect(brief.body.data.text).toContain("does not prove a visual form");
  expect(brief.body.data.ready).toBe(true);
});
it("passes MCP path arrays into bounded context and never exports a private source value", async () => {
  fs.mkdirSync(path.join(cwd, "src"));
  fs.writeFileSync(
    path.join(cwd, "src", "login.ts"),
    'import {validate} from "./rules"; export const login = validate;',
  );
  fs.writeFileSync(
    path.join(cwd, "src", "rules.ts"),
    "export const validate = () => true;",
  );
  fs.writeFileSync(path.join(cwd, ".env"), "PRIVATE_VALUE=do-not-export-12345");
  const result = await handleToolCall("helen_context", {
    cwd,
    task: "login",
    paths: ["src/login.ts"],
    includeSource: true,
  });
  expect(result.isError).not.toBe(true);
  const context = JSON.parse(result.content[0].text);
  expect(context.files.map((file: { path: string }) => file.path)).toContain(
    "src/rules.ts",
  );
  expect(result.content[0].text).not.toContain("do-not-export-12345");
  const invalid = await handleToolCall("helen_context", {
    cwd,
    paths: { path: "src/login.ts" },
  });
  expect(invalid.isError).toBe(true);
  expect(fs.existsSync(path.join(cwd, ".helen"))).toBe(false);
});
