import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  createAssistantBackup,
  restoreAssistantBackup,
} from "../src/assistant/backup.js";
import { readConfig, writeConfig } from "../src/assistant/home.js";
import {
  createWorkflow,
  listWorkflows,
  updateWorkflowItem,
} from "../src/assistant/workflows.js";

let root: string;
afterEach(() => {
  if (root) fs.rmSync(root, { recursive: true, force: true });
});

it("restores workflow progress while excluding Gmail state and executable connection configuration", () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "helen-life-backup-"));
  const home = path.join(root, "source");
  const target = path.join(root, "restored");
  const file = path.join(root, "backup.json");
  const now = new Date("2026-10-24T08:00:00Z");
  writeConfig(
    {
      owner: "Test",
      locale: "es-ES",
      timezone: "Europe/Madrid",
      provider: {
        type: "command",
        command: ["local-cli", "CONFIG_PROVIDER_SENTINEL"],
      },
      capture: {
        extractor: {
          command: "local-ocr",
          args: ["CONFIG_EXTRACTOR_SENTINEL"],
        },
      },
      gmail: {
        account: "owner@example.test",
        accessTokenEnv: "HELEN_GMAIL_ACCESS",
        contacts: { Ana: "ana@example.test" },
      },
      gmailAuth: {
        clientIdEnv: "HELEN_GOOGLE_CLIENT_ID",
        clientSecretEnv: "HELEN_GOOGLE_CLIENT_SECRET",
        redirectUri: "http://127.0.0.1:49152/gmail/callback",
      },
      gmailRedirectUri: "http://127.0.0.1:49152/gmail/callback",
    },
    home,
  );
  const workflow = createWorkflow(
    home,
    {
      title: "Preparar cita",
      kind: "appointment",
      requestId: "backup-workflow-1",
      scheduledStart: "2026-10-25T10:00:00Z",
      scheduledEnd: "2026-10-25T10:30:00Z",
      items: [
        { text: "Documento confirmado", kind: "document", sensitive: true },
        { text: "Preparar preguntas", kind: "question" },
      ],
    },
    now,
  );
  const waiting = updateWorkflowItem(
    home,
    {
      workflowId: workflow.id,
      itemId: workflow.items[0]!.id,
      status: "waiting",
      waitingReason: "Pendiente de respuesta",
      reviewAfter: "2026-10-25T08:00:00Z",
    },
    now,
    { showSensitive: true },
  );
  const excluded = [
    "gmail-auth.json",
    "gmail-oauth-pending.json",
    "gmail-drafts.json",
    "gmail-watches.json",
    "captures.json",
  ];
  for (const name of excluded)
    fs.writeFileSync(
      path.join(home, name),
      JSON.stringify({ privateState: `FILE_PRIVATE_SENTINEL_${name}` }),
    );

  createAssistantBackup(home, file, now);
  const serialized = fs.readFileSync(file, "utf8");
  const backup = JSON.parse(serialized);
  expect(backup.workflows).toEqual([waiting]);
  for (const omitted of [
    "FILE_PRIVATE_SENTINEL",
    "CONFIG_PROVIDER_SENTINEL",
    "CONFIG_EXTRACTOR_SENTINEL",
    "owner@example.test",
    "ana@example.test",
    "HELEN_GOOGLE_CLIENT",
    "HELEN_GMAIL_ACCESS",
  ])
    expect(serialized).not.toContain(omitted);
  for (const key of [
    "gmail",
    "gmailAuth",
    "gmailRedirectUri",
    "capture",
    "provider",
  ])
    expect(backup.config[key]).toBeUndefined();

  restoreAssistantBackup(target, file, now);
  expect(listWorkflows(target, { showSensitive: true })).toEqual([waiting]);
  const restored = readConfig(target);
  expect(restored.gmail).toBeUndefined();
  expect(restored.gmailAuth).toBeUndefined();
  expect(restored.capture).toBeUndefined();
  expect(restored.provider).toBeUndefined();
  for (const name of excluded)
    expect(fs.existsSync(path.join(target, name))).toBe(false);
  for (const name of excluded)
    expect(fs.existsSync(path.join(home, name))).toBe(true);
});

it("keeps this installation's channels and links when a backup is restored over it", () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "helen-life-backup-trust-"));
  const home = path.join(root, "source");
  const target = path.join(root, "target");
  const file = path.join(root, "backup.json");
  const now = new Date("2026-10-24T08:00:00Z");
  writeConfig(
    { owner: "Test", locale: "es-ES", timezone: "Europe/Madrid" },
    home,
  );
  writeConfig(
    { owner: "Mine", locale: "es-ES", timezone: "Europe/Madrid" },
    target,
  );
  createAssistantBackup(home, file, now);
  // Someone edits the backup file to let their own chat in.
  const tampered = JSON.parse(fs.readFileSync(file, "utf8"));
  tampered.config.channels = {
    telegram: { allowedChats: [666] },
  };
  tampered.config.owner = "Restored owner";
  fs.writeFileSync(file, JSON.stringify(tampered));

  restoreAssistantBackup(target, file, now);
  const restored = readConfig(target);
  expect(restored.owner).toBe("Restored owner");
  expect(JSON.stringify(restored.channels)).not.toContain("666");
});
