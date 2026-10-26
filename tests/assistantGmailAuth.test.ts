import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GMAIL_AUTH_ENV,
  GMAIL_SCOPES,
  completeGmailAuth,
  disconnectGmail,
  gmailAuthEnvironment,
  readGmailConnection,
  savedGmailConfig,
  startGmailAuth,
  type GmailAuthOptions,
} from "../src/assistant/gmailAuth.js";

let home: string;
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "helen-gmail-auth-"));
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(home, { recursive: true, force: true });
});
const start = {
  clientId: "client-id",
  clientSecret: "client-secret",
  redirectUri: "http://127.0.0.1:7331/gmail/callback",
  owner: "authenticated-owner",
};
const now = 1_000_000;
function mock(
  handler?: (url: string, init: RequestInit) => unknown | Promise<unknown>,
): GmailAuthOptions {
  return {
    now: () => now,
    fetch: (async (url, init) => {
      const response = handler
        ? await handler(String(url), init ?? {})
        : String(url).endsWith("/token")
          ? {
              access_token: "access-secret",
              refresh_token: "refresh-secret",
              scope: GMAIL_SCOPES.join(" "),
              expires_in: 3600,
            }
          : { emailAddress: "owner@example.com" };
      return response instanceof Response
        ? response
        : new Response(JSON.stringify(response));
    }) as typeof fetch,
  };
}
const finish = (state: string) => ({
  state,
  code: "auth-code",
  redirectUri: start.redirectUri,
});
describe("Gmail browser OAuth", () => {
  it("rejects oversized credential state before reading its content", () => {
    fs.writeFileSync(path.join(home, "gmail-auth.json"), "x".repeat(128_001));
    const read = vi.spyOn(fs, "readSync");
    expect(() => readGmailConnection(home)).toThrow(/state is invalid/);
    expect(read).not.toHaveBeenCalled();
  });
  it("removes credentials before waiting for remote revocation and preserves a later new connection", async () => {
    const first = startGmailAuth(home, start, { now: () => now });
    await completeGmailAuth(home, finish(first.state), mock());
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const disconnecting = disconnectGmail(
      home,
      { revoke: true },
      mock(async () => {
        await gate;
        return new Response("", { status: 200 });
      }),
    );
    expect(readGmailConnection(home)).toBeUndefined();
    const next = startGmailAuth(home, start, { now: () => now });
    await completeGmailAuth(home, finish(next.state), mock());
    release();
    await expect(disconnecting).resolves.toEqual({
      disconnected: true,
      revoked: true,
    });
    expect(readGmailConnection(home)?.account).toBe("owner@example.com");
  });
  it("supports expiring access-only authorization for a public client", async () => {
    const a = startGmailAuth(
      home,
      { ...start, clientSecret: undefined },
      { now: () => now },
    );
    await completeGmailAuth(
      home,
      finish(a.state),
      mock((url, init) => {
        if (url.endsWith("/token")) {
          expect(String(init.body)).not.toContain("client_secret");
          return {
            access_token: "access-only-secret",
            scope: GMAIL_SCOPES.join(" "),
            expires_in: 10,
          };
        }
        return { emailAddress: "owner@example.com" };
      }),
    );
    expect(savedGmailConfig(home)).toMatchObject({
      accessTokenEnv: GMAIL_AUTH_ENV.accessToken,
    });
    expect(gmailAuthEnvironment(home, now + 1)).toEqual({
      [GMAIL_AUTH_ENV.accessToken]: "access-only-secret",
    });
    expect(() => gmailAuthEnvironment(home, now + 10_000)).toThrow(/expired/);
    const disconnected = await disconnectGmail(
      home,
      { revoke: true },
      mock((url, init) => {
        expect(url).toBe("https://oauth2.googleapis.com/revoke");
        expect(String(init.body)).toContain("access-only-secret");
        return new Response(null, { status: 200 });
      }),
    );
    expect(disconnected.revoked).toBe(true);
  });
  it("creates unpredictable state and PKCE, stores no secrets in the consent URL", () => {
    const a = startGmailAuth(home, start, { now: () => now });
    const pending = JSON.parse(
      fs.readFileSync(path.join(home, "gmail-oauth-pending.json"), "utf8"),
    );
    const url = new URL(a.url);
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("code_challenge")).toBe(
      createHash("sha256").update(pending.verifier).digest("base64url"),
    );
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(a.url).not.toContain("client-secret");
    expect(a.url).not.toContain(pending.verifier);
    expect(a.expiresAt).toBe(now + 600_000);
    expect(startGmailAuth(home, start).state).not.toBe(a.state);
  });
  it("verifies scopes and account, saves private auth, exports ephemeral config without returning tokens", async () => {
    const a = startGmailAuth(home, start, { now: () => now });
    const connection = await completeGmailAuth(home, finish(a.state), mock());
    expect(connection).toMatchObject({
      account: "owner@example.com",
      refreshable: true,
    });
    expect(JSON.stringify(connection)).not.toContain("secret");
    expect(gmailAuthEnvironment(home)).toMatchObject({
      [GMAIL_AUTH_ENV.refreshToken]: "refresh-secret",
    });
    expect(savedGmailConfig(home)).toMatchObject({
      account: "owner@example.com",
      clientIdEnv: GMAIL_AUTH_ENV.clientId,
      refreshTokenEnv: GMAIL_AUTH_ENV.refreshToken,
    });
    await expect(
      completeGmailAuth(home, finish(a.state), mock()),
    ).rejects.toThrow(/state/);
    if (process.platform !== "win32")
      expect(fs.statSync(path.join(home, "gmail-auth.json")).mode & 0o777).toBe(
        0o600,
      );
  });
  it("refuses wrong, expired, mismatched redirect and consumed state without exchanging code", async () => {
    const a = startGmailAuth(home, start, { now: () => now });
    let calls = 0;
    const options = mock(() => {
      calls++;
      throw new Error("should never run");
    });
    await expect(
      completeGmailAuth(home, finish("wrong"), options),
    ).rejects.toThrow(/state/);
    await expect(
      completeGmailAuth(
        home,
        { ...finish(a.state), redirectUri: "https://other.example/callback" },
        options,
      ),
    ).rejects.toThrow(/state/);
    await expect(
      completeGmailAuth(home, finish(a.state), {
        ...options,
        now: () => now + 600_001,
      }),
    ).rejects.toThrow(/state/);
    expect(calls).toBe(0);
    await expect(
      completeGmailAuth(home, finish(a.state), options),
    ).rejects.toThrow(/could not be verified/);
    expect(calls).toBe(1);
    await expect(
      completeGmailAuth(home, finish(a.state), options),
    ).rejects.toThrow(/state/);
    expect(calls).toBe(1);
  });
  it("requires granted scopes, rejects unsafe callback URLs and sanitizes Google errors", async () => {
    for (const redirectUri of [
      "http://remote.example/callback",
      "https://user:password@example.com/callback",
      "https://example.com/callback?redirect=evil",
      "javascript:alert(1)",
    ])
      expect(() => startGmailAuth(home, { ...start, redirectUri })).toThrow();
    const a = startGmailAuth(home, start, { now: () => now });
    await expect(
      completeGmailAuth(
        home,
        finish(a.state),
        mock(() => ({
          access_token: "access-secret",
          scope: GMAIL_SCOPES[0],
          expires_in: 3600,
        })),
      ),
    ).rejects.toThrow(/could not be verified/);
    expect(readGmailConnection(home)).toBeUndefined();
    const b = startGmailAuth(home, start, { now: () => now });
    await expect(
      completeGmailAuth(
        home,
        finish(b.state),
        mock(() => {
          throw new Error("client-secret refresh-secret");
        }),
      ),
    ).rejects.toThrow(
      "Gmail connection could not be verified; reconnect from HELEN. No credentials were displayed.",
    );
  });
  it("disconnects without erasing the send ledger and reports failed revocation honestly", async () => {
    const a = startGmailAuth(home, start, { now: () => now });
    await completeGmailAuth(home, finish(a.state), mock());
    fs.writeFileSync(path.join(home, "gmail-drafts.json"), "keep ledger");
    const result = await disconnectGmail(
      home,
      { revoke: true },
      mock(() => new Response("", { status: 503 })),
    );
    expect(result).toEqual({ disconnected: true, revoked: false });
    expect(readGmailConnection(home)).toBeUndefined();
    expect(gmailAuthEnvironment(home)).toEqual({});
    expect(fs.readFileSync(path.join(home, "gmail-drafts.json"), "utf8")).toBe(
      "keep ledger",
    );
  });
  it("does not reconnect after disconnect while an OAuth exchange is in flight", async () => {
    const a = startGmailAuth(home, start, { now: () => now });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started = false;
    const pending = completeGmailAuth(
      home,
      finish(a.state),
      mock(async (url) => {
        if (url.endsWith("/token")) {
          started = true;
          await gate;
          return {
            access_token: "access-secret",
            refresh_token: "refresh-secret",
            scope: GMAIL_SCOPES.join(" "),
            expires_in: 3600,
          };
        }
        return { emailAddress: "owner@example.com" };
      }),
    );
    while (!started) await new Promise((resolve) => setTimeout(resolve, 1));
    await disconnectGmail(home, { revoke: false });
    release();
    await expect(pending).rejects.toThrow(/could not be verified/);
    expect(readGmailConnection(home)).toBeUndefined();
  });
});

it("lets the owner disconnect even when the saved connection file is corrupt", async () => {
  fs.writeFileSync(path.join(home, "gmail-auth.json"), "{bad");
  const result = await disconnectGmail(home, { revoke: true }, mock());
  expect(result).toEqual({ disconnected: true, revoked: false });
  expect(fs.existsSync(path.join(home, "gmail-auth.json"))).toBe(false);
});
