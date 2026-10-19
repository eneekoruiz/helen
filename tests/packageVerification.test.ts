import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertOwnedTemporaryDirectory,
  validateMcpToolSchemas,
  validatePackageFiles,
} from "../scripts/verify-package.mjs";

describe("installed-package verification safeguards", () => {
  const fixtures: string[] = [];
  const fixture = () => {
    const directory = fs.mkdtempSync(
      path.join(fs.realpathSync(os.tmpdir()), "helen-installed-package-"),
    );
    const token = randomUUID();
    fs.writeFileSync(
      path.join(directory, ".helen-package-verification-owner"),
      token,
    );
    fixtures.push(directory);
    return { directory, token };
  };

  afterEach(() => {
    for (const directory of fixtures.splice(0)) {
      // Each path came directly from mkdtemp in this test, including link fixtures.
      if (fs.lstatSync(directory).isSymbolicLink()) fs.unlinkSync(directory);
      else fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it("accepts public runtime and documentation while rejecting private auth and state", () => {
    expect(() =>
      validatePackageFiles([
        { path: "dist/core/jobRuntime.js" },
        { path: "docs/prompts/playbooks.json" },
        { path: "templates/security/.env.example" },
        { path: "skills/helen-audit/SKILL.md" },
      ]),
    ).not.toThrow();
    for (const name of [
      ".helen/jobs/task/input.json",
      ".HELEN/audit-results/report.json",
      ".helenrc",
      ".helenrc.corrupt",
      "docs/.codex/auth.json",
      "docs/auth.json",
      "docs/credentials.json",
      "docs/token.production.json",
      "docs/.npmrc",
      "templates/security/.env",
      "templates/security/.env.production",
      "skills/helen-audit/SKILL.md.helen-backup",
      "docs/private.pem",
      "../outside.txt",
      "docs/../../outside.txt",
      "/outside.txt",
      "C:\\private\\auth.json",
    ]) {
      expect(() => validatePackageFiles([{ path: name }]), name).toThrow();
    }
    expect(() => validatePackageFiles([])).toThrow("Empty package inventory");
  });

  it("permits cleanup only with the owned path and exact marker token", () => {
    const { directory, token } = fixture();
    expect(assertOwnedTemporaryDirectory(directory, token)).toBe(directory);
    expect(() => assertOwnedTemporaryDirectory(directory, "wrong")).toThrow(
      "Cleanup ownership token differs",
    );
    expect(() => assertOwnedTemporaryDirectory(os.tmpdir(), token)).toThrow();
  });

  it("rejects incomplete MCP array schemas, including nested properties", () => {
    const inventory = (paths: unknown) => [
      {
        name: "helen_context",
        inputSchema: {
          type: "object",
          properties: { request: { type: "object", properties: { paths } } },
        },
      },
    ];
    expect(() =>
      validateMcpToolSchemas(
        inventory({ type: "array", items: { type: "string" } }),
      ),
    ).not.toThrow();
    for (const items of [undefined, null, [], "string"]) {
      expect(() =>
        validateMcpToolSchemas(inventory({ type: "array", items })),
      ).toThrow("MCP array lacks a valid item schema");
    }
  });

  it("rejects a linked cleanup target even if the target has a valid marker", () => {
    const target = fixture();
    const link = fixture();
    fs.rmSync(link.directory, { recursive: true });
    fs.symlinkSync(
      target.directory,
      link.directory,
      process.platform === "win32" ? "junction" : "dir",
    );
    expect(() =>
      assertOwnedTemporaryDirectory(link.directory, target.token),
    ).toThrow("Linked cleanup target");
  });
});
