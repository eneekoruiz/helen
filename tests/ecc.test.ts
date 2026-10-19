import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureEcc,
  eccStatus,
  nativeEccCommands,
  readEccEnvironment,
  ECC_DEFAULT_REF,
} from "../src/core/ecc.js";
import { installNativeEcc, launchEcc } from "../src/core/eccRuntime.js";
import type { EccInvocation } from "../src/core/eccRuntime.js";

let cwd: string;
beforeEach(() => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), "helen ecc "));
});
afterEach(() => {
  vi.unstubAllEnvs();
  fs.rmSync(cwd, { recursive: true, force: true });
});
function write(file: string, value: string): void {
  fs.mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
  fs.writeFileSync(path.join(cwd, file), value);
}
function read(file: string): string {
  return fs.readFileSync(path.join(cwd, file), "utf8");
}

describe("Original ECC integration", () => {
  it("preserves settings, user instructions and secrets, with no copied skill library", () => {
    write(".env", "PRIVATE_TEST_VALUE=keep-me\nECC_HOOK_PROFILE=minimal\n");
    write("AGENTS.md", "# User constraints\nKeep this text.\n");
    write(
      ".claude/settings.json",
      JSON.stringify({ permissions: { deny: ["Bash(rm *)"] } }),
    );
    write(".codex/config.toml", 'model = "existing-model"\n');
    configureEcc(cwd);
    expect(read(".env")).toContain("PRIVATE_TEST_VALUE=keep-me");
    expect(readEccEnvironment(cwd, {}).profile).toBe("minimal");
    expect(read("AGENTS.md")).toContain("Keep this text.");
    expect(JSON.parse(read(".claude/settings.json")).permissions.deny).toEqual([
      "Bash(rm *)",
    ]);
    expect(read(".codex/config.toml")).toContain('model = "existing-model"');
    expect(eccStatus(cwd)).toMatchObject({
      configured: true,
      ref: ECC_DEFAULT_REF,
    });
    expect(
      JSON.parse(read(".agents/plugins/marketplace.json")).plugins[0],
    ).toMatchObject({
      source: {
        source: "url",
        url: "https://github.com/affaan-m/ECC.git",
        sha: ECC_DEFAULT_REF,
      },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Productivity",
    });
    expect(fs.existsSync(path.join(cwd, ".agents/skills"))).toBe(false);
    expect(fs.existsSync(path.join(cwd, ".claude/agents"))).toBe(false);
  });

  it("is idempotent and updates both original source declarations together", () => {
    configureEcc(cwd);
    const files = [
      ".env",
      "AGENTS.md",
      "CLAUDE.md",
      ".claude/settings.json",
      ".codex/config.toml",
      ".agents/plugins/marketplace.json",
    ];
    const before = files.map(read);
    configureEcc(cwd);
    expect(files.map(read)).toEqual(before);
    const ref = "a".repeat(40);
    configureEcc(cwd, { ref });
    expect(
      JSON.parse(read(".claude/settings.json")).extraKnownMarketplaces.ecc
        .source.ref,
    ).toBe(ref);
    expect(
      JSON.parse(read(".agents/plugins/marketplace.json")).plugins.find(
        (p: { name: string }) => p.name === "ecc",
      ).source.sha,
    ).toBe(ref);
    expect(eccStatus(cwd).ref).toBe(ref);
    expect(read(".env")).toBe(before[0]);
  });

  it("rejects malformed existing configuration before project integration writes", () => {
    write(".claude/settings.json", "{broken");
    expect(() => configureEcc(cwd)).toThrow();
    expect(read(".claude/settings.json")).toBe("{broken");
    expect(fs.existsSync(path.join(cwd, ".env"))).toBe(false);
  });

  it("preserves an unrelated marketplace and rejects another source masquerading as ECC", () => {
    const catalog = {
      name: "helen-integrations",
      plugins: [
        { name: "my-plugin", source: { source: "github", repo: "my/plugin" } },
      ],
    };
    write(".agents/plugins/marketplace.json", JSON.stringify(catalog));
    configureEcc(cwd);
    expect(
      JSON.parse(read(".agents/plugins/marketplace.json")).plugins[0],
    ).toEqual(catalog.plugins[0]);
    const settings = JSON.parse(read(".claude/settings.json"));
    settings.extraKnownMarketplaces.ecc.source.repo = "somebody/other-repo";
    write(".claude/settings.json", JSON.stringify(settings));
    const original = read(".agents/plugins/marketplace.json");
    expect(() => configureEcc(cwd, { ref: "b".repeat(40) })).toThrow();
    expect(read(".agents/plugins/marketplace.json")).toBe(original);
  });

  it("does not turn a disabled existing plugin back on", () => {
    write(
      ".claude/settings.json",
      JSON.stringify({ enabledPlugins: { "ecc@ecc": false } }),
    );
    expect(() => configureEcc(cwd)).toThrow();
    expect(
      JSON.parse(read(".claude/settings.json")).enabledPlugins["ecc@ecc"],
    ).toBe(false);
  });

  it("rejects mutable refs and path/command input instead of composing shell commands", () => {
    for (const ref of [
      "main",
      "../../outside",
      "$(echo secret)",
      "-c",
      "a".repeat(39),
    ])
      expect(() => configureEcc(cwd, { ref })).toThrow();
    expect(fs.existsSync(path.join(cwd, ".env"))).toBe(false);
  });

  it("blocks junction destinations without touching their target", () => {
    const outside = fs.mkdtempSync(
      path.join(os.tmpdir(), "helen-ecc-outside-"),
    );
    try {
      fs.symlinkSync(
        outside,
        path.join(cwd, ".agents"),
        process.platform === "win32" ? "junction" : "dir",
      );
      expect(() => configureEcc(cwd)).toThrow();
      expect(fs.readdirSync(outside)).toEqual([]);
      expect(fs.existsSync(path.join(cwd, ".env"))).toBe(false);
    } finally {
      fs.rmSync(path.join(cwd, ".agents"), { force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it("loads only bounded allowlisted controls without expanding or executing .env values", () => {
    configureEcc(cwd);
    write(
      ".env",
      'HELEN_ECC_ENABLED=true\nECC_HOOK_PROFILE=standard\nECC_AGENT_DATA_HOME=".helen/ecc-data"\nPRIVATE_KEY="$(danger)"\n',
    );
    const config = readEccEnvironment(cwd, { ECC_HOOK_PROFILE: "strict" });
    expect(config).toEqual({
      enabled: true,
      profile: "strict",
      dataHome: path.join(cwd, ".helen/ecc-data"),
    });
    expect(() =>
      readEccEnvironment(cwd, { ECC_AGENT_DATA_HOME: "../outside" }),
    ).toThrow();
    expect(() =>
      readEccEnvironment(cwd, { HELEN_ECC_ENABLED: "perhaps" }),
    ).toThrow();
    expect(() =>
      readEccEnvironment(cwd, { ECC_HOOK_PROFILE: "$(danger)" }),
    ).toThrow();
  });

  it("invokes native installers in order, preserving paths with spaces and excluding API credentials", async () => {
    configureEcc(cwd);
    vi.stubEnv("OPENAI_API_KEY", "must-not-pass");
    vi.stubEnv("ANTHROPIC_API_KEY", "must-not-pass");
    vi.stubEnv("CODEX_APP_TOOLS_PIPE_PATH", "parent-ipc");
    const calls: EccInvocation[] = [];
    await installNativeEcc(cwd, "codex", async (invocation) => {
      calls.push(invocation);
    });
    expect(calls.map((c) => c.args)).toEqual(
      nativeEccCommands(cwd, "codex").map((c) => c.args),
    );
    expect(calls[0].args).toContain(cwd);
    expect(calls[1].args).toContain("ecc@helen-integrations");
    expect(calls[0].options).toMatchObject({ shell: false, cwd });
    expect(calls[0].options.env?.OPENAI_API_KEY).toBeUndefined();
    expect(calls[0].options.env?.ANTHROPIC_API_KEY).toBeUndefined();
    expect(calls[0].options.env?.CODEX_APP_TOOLS_PIPE_PATH).toBeUndefined();
    expect(calls[0].options.env?.ECC_AGENT_DATA_HOME).toBe(
      path.join(cwd, ".helen/ecc-data"),
    );
    expect(
      nativeEccCommands(cwd, "claude").every((c) => c.args.includes("project")),
    ).toBe(true);
  });

  it("stops after a native installation failure and never launches a model", async () => {
    configureEcc(cwd);
    const execute = vi.fn().mockRejectedValue(new Error("native failure"));
    await expect(installNativeEcc(cwd, "claude", execute)).rejects.toThrow(
      "native failure",
    );
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0].args).not.toContain("-p");
  });

  it("forwards an explicit task literally and refuses launch when disabled", async () => {
    configureEcc(cwd);
    const execute = vi.fn().mockResolvedValue(undefined);
    await launchEcc(
      cwd,
      "claude",
      'Inspect literal $(touch danger); "quoted"',
      execute,
    );
    expect(execute.mock.calls[0][0].args).toHaveLength(1);
    expect(execute.mock.calls[0][0].args[0]).toContain("$(touch danger)");
    vi.stubEnv("HELEN_ECC_ENABLED", "false");
    await expect(launchEcc(cwd, "claude", undefined, execute)).rejects.toThrow(
      "disabled",
    );
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("reports configured status and installation preview in a real CLI without provider calls", () => {
    const cli = path.resolve("dist/cli.js");
    const run = (...args: string[]): any =>
      JSON.parse(
        execFileSync(process.execPath, [cli, "--json", "ecc", ...args], {
          cwd,
          encoding: "utf8",
        }),
      );
    expect(run("setup").ok).toBe(true);
    expect(run("status").data.configured).toBe(true);
    const preview = run("install", "--target", "codex", "--dry-run");
    expect(preview.ok).toBe(true);
    expect(preview.data.commands[1].args).toContain("ecc@helen-integrations");
  });
});
