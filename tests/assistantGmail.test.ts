import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cancelGmailDraft,
  GmailConfigSchema,
  listGmailDrafts,
  prepareGmailDraft,
  reconcileGmailSend,
  sendGmailDraft,
  type GmailOptions,
} from "../src/assistant/gmail.js";

let home: string;
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-gmail-"));
});
afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
});
const config = GmailConfigSchema.parse({
  account: "owner@example.com",
  accessTokenEnv: "MAIL_TOKEN",
  contacts: { Ana: "ana@example.com" },
});
const input = {
  requestId: "request-1",
  to: ["Ana"],
  subject: "Café ☕ mañana",
  body: "Hola Ana,\n¿Quedamos mañana?",
};
function mock(
  handler: (url: string, init: RequestInit) => unknown | Promise<unknown>,
): GmailOptions {
  return {
    env: { MAIL_TOKEN: "secret-token" },
    fetch: (async (url, init) => {
      const result = await handler(String(url), init ?? {});
      if (result instanceof Response) return result;
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch,
  };
}
const standard = (url: string) => {
  if (url.endsWith("/profile")) return { emailAddress: config.account };
  if (url.endsWith("/drafts/send")) return { id: "message-1" };
  if (url.includes("/messages/message-1"))
    return { id: "message-1", labelIds: ["SENT"] };
  return { id: "draft-1" };
};
describe("Gmail owner-approved delivery", () => {
  it("keeps the draft unsent when cancelled before or during profile verification", async () => {
    const draft = await prepareGmailDraft(home, config, input, mock(standard));
    const consent = { ownerConfirmed: true, contentHash: draft.contentHash };
    const cancelled = new AbortController();
    cancelled.abort();
    let calls = 0;
    await expect(
      sendGmailDraft(home, config, draft.id, consent, {
        ...mock(() => {
          calls++;
          throw new Error("must not call Gmail");
        }),
        signal: cancelled.signal,
      }),
    ).rejects.toThrow(/cancelled/);
    expect(calls).toBe(0);
    expect(listGmailDrafts(home)[0]).toMatchObject({
      state: "failed",
      draftId: "draft-1",
    });
    const replay = await prepareGmailDraft(
      home,
      config,
      input,
      mock(() => {
        calls++;
        throw new Error("must not call Gmail");
      }),
    );
    expect(replay.id).toBe(draft.id);
    await expect(
      sendGmailDraft(
        home,
        config,
        replay.id,
        consent,
        mock(() => {
          calls++;
          throw new Error("must not call Gmail");
        }),
      ),
    ).rejects.toThrow(/blocked/);
    expect(calls).toBe(0);
    const second = await prepareGmailDraft(
      home,
      config,
      { ...input, requestId: "second-request" },
      mock(standard),
    );
    const controller = new AbortController();
    const options = mock((url, init) => {
      calls++;
      expect(url).toContain("/profile");
      expect(init.signal).toBeDefined();
      controller.abort();
      return standard(url);
    });
    options.signal = controller.signal;
    await expect(
      sendGmailDraft(home, config, second.id, consent, options),
    ).rejects.toThrow(/cancelled/);
    expect(calls).toBe(1);
    expect(listGmailDrafts(home)[1]!.state).toBe("failed");
  });
  it("blocks a send left inflight by a crashed process, without a network call", async () => {
    const draft = await prepareGmailDraft(home, config, input, mock(standard));
    const file = path.join(home, "gmail-drafts.json");
    const ledger = JSON.parse(fs.readFileSync(file, "utf8"));
    ledger.items[0].state = "inflight";
    fs.writeFileSync(file, JSON.stringify(ledger));
    expect(cancelGmailDraft(home, draft.id).state).toBe("inflight");
    const options = mock(() => {
      throw new Error("must not call Gmail");
    });
    await expect(
      sendGmailDraft(
        home,
        config,
        draft.id,
        { ownerConfirmed: true, contentHash: draft.contentHash },
        options,
      ),
    ).rejects.toThrow(/blocked/);
  });
  it("sanitizes network errors before send and refuses corrupt ledgers", async () => {
    const draft = await prepareGmailDraft(home, config, input, mock(standard));
    await expect(
      sendGmailDraft(
        home,
        config,
        draft.id,
        { ownerConfirmed: true, contentHash: draft.contentHash },
        mock(() => {
          throw new Error("secret-token");
        }),
      ),
    ).rejects.toThrow("Gmail network request failed or timed out");
    expect(listGmailDrafts(home)[0]!.state).toBe("drafted");
    fs.writeFileSync(
      path.join(home, "gmail-drafts.json"),
      JSON.stringify({ version: 1, items: [{ id: "damaged" }] }),
    );
    await expect(
      prepareGmailDraft(home, config, input, mock(standard)),
    ).rejects.toThrow(/invalid entries/);
  });
  it("prepares exact recipients and UTF-8 MIME, sends once, verifies Sent", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const options = mock((url, init) => {
      calls.push({ url, init });
      return standard(url);
    });
    const draft = await prepareGmailDraft(home, config, input, options);
    expect(draft.to).toEqual(["ana@example.com"]);
    expect(draft.state).toBe("drafted");
    const raw = JSON.parse(
      String(calls.find((call) => call.url.endsWith("/drafts"))!.init.body),
    ).message.raw;
    const mime = Buffer.from(raw, "base64url").toString("utf8");
    expect(mime).toContain("To: ana@example.com");
    expect(mime).toContain(Buffer.from(input.subject).toString("base64"));
    expect(mime).toContain(
      Buffer.from(input.body.replace(/\n/g, "\r\n")).toString("base64"),
    );
    const consent = { ownerConfirmed: true, contentHash: draft.contentHash };
    const sent = await sendGmailDraft(home, config, draft.id, consent, options);
    expect(sent.state).toBe("sent");
    expect(sent.verifiedAt).toBeDefined();
    await sendGmailDraft(home, config, draft.id, consent, options);
    expect(
      calls.filter((call) => call.url.endsWith("/drafts/send")),
    ).toHaveLength(1);
    expect(
      fs.readFileSync(path.join(home, "gmail-drafts.json"), "utf8"),
    ).not.toContain("secret-token");
  });
  it("rejects ambiguous contacts, header injection, excessive recipients, and missing approval before sending", async () => {
    let calls = 0;
    const options = mock((url) => {
      calls++;
      return standard(url);
    });
    await expect(
      prepareGmailDraft(home, config, { ...input, to: ["Someone"] }, options),
    ).rejects.toThrow();
    await expect(
      prepareGmailDraft(
        home,
        config,
        { ...input, subject: "hello\r\nBcc: attacker@example.com" },
        options,
      ),
    ).rejects.toThrow();
    await expect(
      prepareGmailDraft(
        home,
        config,
        { ...input, to: ["ana@example.com\r\nBcc: x@y.com"] },
        options,
      ),
    ).rejects.toThrow();
    expect(calls).toBe(0);
    const draft = await prepareGmailDraft(home, config, input, options);
    const before = calls;
    await expect(
      sendGmailDraft(
        home,
        config,
        draft.id,
        { ownerConfirmed: false, contentHash: draft.contentHash },
        options,
      ),
    ).rejects.toThrow(/approval/);
    await expect(
      sendGmailDraft(
        home,
        config,
        draft.id,
        { ownerConfirmed: true, contentHash: "wrong" },
        options,
      ),
    ).rejects.toThrow(/approval/);
    expect(calls).toBe(before);
  });
  it("blocks the wrong OAuth account", async () => {
    const options = mock(() => ({ emailAddress: "other@example.com" }));
    await expect(
      prepareGmailDraft(home, config, input, options),
    ).rejects.toThrow(/could not be verified/);
    expect(listGmailDrafts(home)[0]!.state).toBe("uncertain");
  });
  it("deduplicates preparations and refuses request-id content replacement", async () => {
    let creates = 0;
    const options = mock((url) => {
      if (url.endsWith("/drafts")) creates++;
      return standard(url);
    });
    const draft = await prepareGmailDraft(home, config, input, options);
    expect((await prepareGmailDraft(home, config, input, options)).id).toBe(
      draft.id,
    );
    await expect(
      prepareGmailDraft(home, config, { ...input, body: "different" }, options),
    ).rejects.toThrow(/different content/);
    expect(creates).toBe(1);
  });
  it("persists the claim before sending and blocks overlapping sends", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let sends = 0;
    const options = mock(async (url) => {
      if (url.endsWith("/drafts/send")) {
        sends++;
        expect(listGmailDrafts(home)[0]!.state).toBe("inflight");
        await gate;
      }
      return standard(url);
    });
    const draft = await prepareGmailDraft(home, config, input, options);
    const consent = { ownerConfirmed: true, contentHash: draft.contentHash };
    const first = sendGmailDraft(home, config, draft.id, consent, options);
    while (!sends) await new Promise((resolve) => setTimeout(resolve, 1));
    await expect(
      sendGmailDraft(home, config, draft.id, consent, options),
    ).rejects.toThrow(/blocked/);
    release();
    await first;
    expect(sends).toBe(1);
  });
  it("never retries ambiguous sends; reconciles the existing Message-ID", async () => {
    let sends = 0;
    const options = mock((url) => {
      if (url.endsWith("/drafts/send")) {
        sends++;
        throw new Error("network contains secret-token");
      }
      if (url.includes("/messages?q="))
        return { messages: [{ id: "message-1" }] };
      return standard(url);
    });
    const draft = await prepareGmailDraft(home, config, input, options);
    const consent = { ownerConfirmed: true, contentHash: draft.contentHash };
    await expect(
      sendGmailDraft(home, config, draft.id, consent, options),
    ).rejects.toThrow(/awaits verification/);
    await expect(
      sendGmailDraft(home, config, draft.id, consent, options),
    ).rejects.toThrow(/blocked/);
    expect(
      (await reconcileGmailSend(home, config, draft.id, options)).state,
    ).toBe("sent");
    expect(sends).toBe(1);
  });
  it("does not call an accepted but unverified send successful", async () => {
    const options = mock((url) =>
      url.includes("/messages/message-1")
        ? { id: "message-1", labelIds: ["DRAFT"] }
        : standard(url),
    );
    const draft = await prepareGmailDraft(home, config, input, options);
    await expect(
      sendGmailDraft(
        home,
        config,
        draft.id,
        { ownerConfirmed: true, contentHash: draft.contentHash },
        options,
      ),
    ).rejects.toThrow(/verification/);
    expect(listGmailDrafts(home)[0]).toMatchObject({
      state: "uncertain",
      messageId: "message-1",
    });
  });
  it("refreshes OAuth without storing tokens and rejects oversized API responses", async () => {
    const refreshed = GmailConfigSchema.parse({
      account: config.account,
      clientIdEnv: "CID",
      clientSecretEnv: "SECRET",
      refreshTokenEnv: "REFRESH",
      contacts: config.contacts,
    });
    const options = mock((url, init) => {
      if (url.includes("oauth2.googleapis.com")) {
        expect(String(init.body)).toContain("grant_type=refresh_token");
        return { access_token: "refreshed-secret" };
      }
      expect((init.headers as Record<string, string>).Authorization).toBe(
        "Bearer refreshed-secret",
      );
      return standard(url);
    });
    options.env = { CID: "client", SECRET: "secret", REFRESH: "refresh" };
    expect(
      (await prepareGmailDraft(home, refreshed, input, options)).state,
    ).toBe("drafted");
    expect(
      fs.readFileSync(path.join(home, "gmail-drafts.json"), "utf8"),
    ).not.toContain("refreshed-secret");
    const oversized = mock(() => new Response("x".repeat(512_001)));
    await expect(
      prepareGmailDraft(
        home,
        config,
        { ...input, requestId: "large" },
        oversized,
      ),
    ).rejects.toThrow(/could not be verified/);
  });
});
