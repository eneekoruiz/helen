import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { expect, it, vi } from "vitest";
const moduleUrl = pathToFileURL(
  path.join(process.cwd(), "scripts/whatsapp-helen.mjs"),
);
const { normalizeOwnerJid, createOwnerMessageHandler } = await import(
  moduleUrl.href
);
const owner = "11111@s.whatsapp.net";
const message = (id: string, remoteJid = owner, text = "Revisar tests") => ({
  key: { id, remoteJid, fromMe: true },
  message: { conversation: text },
});
it("normalizes device IDs but rejects groups, broadcasts and malformed identities", () => {
  expect(normalizeOwnerJid("11111:7@s.whatsapp.net")).toBe(owner);
  for (const invalid of [
    "11111@g.us",
    "status@broadcast",
    "other",
    "11111@s.whatsapp.net/override",
  ])
    expect(normalizeOwnerJid(invalid)).toBe(null);
});
it("requires an explicitly configured self-chat matching the linked account before invoking Helen", async () => {
  const handleMessage = vi.fn(async () => ({ text: "PRIVATE_REPLY" })),
    sendMessage = vi.fn(),
    log = vi.fn();
  let linked = "22222@s.whatsapp.net";
  const handler = createOwnerMessageHandler({
    ownerJid: owner,
    linkedJid: () => linked,
    home: "synthetic-home",
    handleMessage,
    sendMessage,
    log,
  });
  await handler({ type: "notify", messages: [message("wrong-linked")] });
  linked = owner;
  await handler({ type: "append", messages: [message("history")] });
  await handler({
    type: "notify",
    messages: [
      message("other", "22222@s.whatsapp.net"),
      message("group", "11111@g.us"),
    ],
  });
  expect(handleMessage).not.toHaveBeenCalled();
  expect(sendMessage).not.toHaveBeenCalled();
  await handler({
    type: "notify",
    messages: [
      message("owner-1"),
      message("owner-1"),
      message("reply-loop", owner, "Helen: PRIVATE_REPLY"),
    ],
  });
  expect(handleMessage).toHaveBeenCalledTimes(1);
  expect(handleMessage.mock.calls[0]).toEqual([
    "Revisar tests",
    expect.objectContaining({
      channel: "whatsapp",
      ownerVerified: true,
      requestId: "owner-1",
    }),
  ]);
  expect(sendMessage).toHaveBeenCalledWith(owner, {
    text: "Helen: PRIVATE_REPLY",
  });
  expect(JSON.stringify(log.mock.calls)).not.toContain("PRIVATE_REPLY");
  expect(JSON.stringify(log.mock.calls)).not.toContain(owner);
});
it("does not disclose internal failures or retry ambiguous sends", async () => {
  const handleMessage = vi.fn(async () => ({ text: "PRIVATE_RESULT" }));
  const sendMessage = vi.fn(async () => {
    throw new Error("PRIVATE_TOKEN_OR_PROVIDER_ERROR");
  });
  const log = vi.fn();
  const handler = createOwnerMessageHandler({
    ownerJid: owner,
    linkedJid: () => owner,
    home: "synthetic-home",
    handleMessage,
    sendMessage,
    log,
  });
  await handler({ type: "notify", messages: [message("ambiguous")] });
  await handler({ type: "notify", messages: [message("ambiguous")] });
  expect(sendMessage).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(log.mock.calls)).not.toContain("PRIVATE_");
});
it("requires explicit manual connect/pairing and leaves no QR/runtime artifact paths in source", () => {
  const script = path.join(process.cwd(), "scripts/whatsapp-helen.mjs");
  const env = { ...process.env };
  delete env.WHATSAPP_OWNER_JID;
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_OPTIONS;
  const result = spawnSync(process.execPath, [script, "--help"], {
    env,
    windowsHide: true,
    timeout: 10000,
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("Nothing connects by default");
  const denied = spawnSync(process.execPath, [script, "--connect"], {
    env,
    windowsHide: true,
    timeout: 10000,
    encoding: "utf8",
  });
  expect(denied.status).toBe(1);
  expect(denied.stderr).not.toContain("Error:");
  const source = fs.readFileSync(script, "utf8");
  expect(source).not.toContain("QRCode.toFile");
  expect(source).not.toContain(".gemini");
  expect(source).not.toContain("Recibido]");
  expect(source).not.toContain("rmSync(authDir");
});
