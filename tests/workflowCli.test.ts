import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "dist", "cli.js");
function run(cwd: string, args: string[]) {
  let execArgs: string[];
  if (fs.existsSync(cli)) {
    execArgs = [cli, ...args, "--json"];
  } else {
    const tsxBin = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
    const srcCli = path.join(root, "src", "cli.ts");
    execArgs = [tsxBin, srcCli, ...args, "--json"];
  }
  const result = spawnSync(process.execPath, execArgs, {
    cwd,
    encoding: "utf8",
    timeout: 45000,
    env: { ...process.env, HELEN_WELCOME: "signature" },
  });
  expect(result.error).toBeUndefined();
  return { status: result.status, body: JSON.parse(result.stdout) };
}

describe("Workflow CLI acceptance", () => {
  let cwd: string;
  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "helen-workflow-cli-"));
    fs.writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ scripts: { test: 'node -e "process.exit(0)"' } }),
    );
  });
  afterEach(() => {
    fs.rmSync(cwd, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  });

  it("fails safely on malformed ownership and preserves personal skills on uninstall", () => {
    expect(
      run(cwd, ["setup", "--agents", "codex", "--preset", "efficient"]).status,
    ).toBe(0);
    const personal = path.join(cwd, ".agents/skills/helen-personal/SKILL.md");
    fs.mkdirSync(path.dirname(personal), { recursive: true });
    fs.writeFileSync(personal, "My personal skill");
    const manifest = path.join(cwd, ".helen/skill-files.json");
    const validManifest = fs.readFileSync(manifest, "utf8");
    const instructions = fs.readFileSync(path.join(cwd, "AGENTS.md"), "utf8");
    fs.writeFileSync(manifest, "{bad");
    expect(run(cwd, ["uninstall"]).status).toBe(1);
    expect(fs.readFileSync(path.join(cwd, "AGENTS.md"), "utf8")).toBe(
      instructions,
    );
    fs.writeFileSync(manifest, validManifest);
    expect(run(cwd, ["uninstall", "--dry-run"]).status).toBe(0);
    expect(fs.readFileSync(manifest, "utf8")).toBe(validManifest);
    expect(
      fs.existsSync(path.join(cwd, ".agents/skills/helen-status/SKILL.md")),
    ).toBe(true);
    const removed = run(cwd, ["uninstall"]);
    expect(removed.status).toBe(0);
    expect(removed.body.data.preservedSkills).toContain(
      path.join(".agents", "skills", "helen-personal"),
    );
    expect(fs.readFileSync(personal, "utf8")).toBe("My personal skill");
    expect(
      fs.existsSync(path.join(cwd, ".agents/skills/helen-status/SKILL.md")),
    ).toBe(false);
  }, 120000);

  it("resumes durable decisions and exposes stale evidence after source changes", () => {
    const apply = run(cwd, [
      "apply",
      "quality",
      "--track",
      "--brief",
      "--profile",
      "quick",
    ]);
    expect(apply.status).toBe(0);
    expect(apply.body.data.brief).toContain("Explicit profile: quick");
    expect(run(cwd, ["check"]).status).toBe(0);
    const resume = run(cwd, [
      "resume",
      "--decision",
      "Preserve the public API",
    ]);
    expect(resume.body.data.verification).toBe("current");
    expect(resume.body.data.instructions).toContain("Preserve the public API");
    fs.writeFileSync(
      path.join(cwd, "source.ts"),
      "export const changed = true;",
    );
    expect(run(cwd, ["status"]).body.data.verification).toBe("stale");
  }, 120000);

  it("reports invalid profiles and missing sessions as failures", () => {
    expect(run(cwd, ["apply", "quality", "--profile", "auto"]).status).toBe(1);
    const resume = run(cwd, ["resume"]);
    expect(resume.status).toBe(1);
    expect(resume.body.errors.join(" ")).toContain("Nothing is being tracked");
  });

  it("previews and installs the efficient preset through the public CLI", () => {
    const args = [
      "setup",
      "--agents",
      "codex",
      "claude",
      "antigravity",
      "--preset",
      "efficient",
    ];
    expect(run(cwd, [...args, "--dry-run"]).status).toBe(0);
    expect(fs.readdirSync(cwd)).toEqual(["package.json"]);
    const installed = run(cwd, args);
    expect(installed.status).toBe(0);
    expect(installed.body.data.preset.created).toContain(".codex/config.toml");
    expect(
      fs.existsSync(path.join(cwd, ".claude/skills/helen-resume/SKILL.md")),
    ).toBe(true);
    expect(run(cwd, args).body.data.preset.created).toEqual([]);
    expect(run(cwd, [...args, "--global"]).status).toBe(1);
    expect(run(cwd, ["setup", "--preset", "unknown"]).status).toBe(1);
  }, 120000);

  it("omits already-loaded rules only on explicit request and labels budget estimates", () => {
    const full = run(cwd, ["prompts", "show", "audit-code-quality"]);
    const compact = run(cwd, [
      "prompts",
      "show",
      "audit-code-quality",
      "--no-protocol",
    ]);
    expect(full.body.data.content).toContain("HELEN execution contract");
    expect(compact.body.data.content).not.toContain("HELEN execution contract");
    expect(compact.body.data.content).toContain("## Goal");
    const budget = run(cwd, ["token-budget", "quality"]);
    expect(budget.body.data.measurement.kind).toBe("estimate");
    expect(budget.body.data.measurement.includes).toBe("input-only");
  });

  it("keeps welcome configuration outside JSON commands and rejects invalid identity", () => {
    expect(run(cwd, ["status", "--welcome", "signature"]).status).toBe(0);
    const invalid = run(cwd, ["status", "--welcome", "unknown"]);
    expect(invalid.status).toBe(1);
    expect(invalid.body.errors.join(" ")).toContain(
      "Choose helen, signature, or off",
    );
  });

  it("rejects ambiguous custom prompt names and accepts an explicit mixed-case id", () => {
    for (const folder of ["first", "second"]) {
      const dir = path.join(cwd, ".helen", "prompts", folder);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "APPLY-Shared.md"), "# Custom prompt\n");
    }
    const ambiguous = run(cwd, ["prompts", "show", "apply-shared"]);
    expect(ambiguous.status).toBe(1);
    expect(ambiguous.body.errors.join(" ")).toMatch(/ambiguous.*full id/i);
    const explicit = run(cwd, ["prompts", "show", "USER/SECOND/APPLY-SHARED"]);
    expect(explicit.status).toBe(0);
    expect(explicit.body.data.content).toContain("# Custom prompt");
  });

  it("uses the safe report writer through status --html", () => {
    const original = path.join(cwd, "original.html");
    fs.writeFileSync(original, "preserve original");
    fs.mkdirSync(path.join(cwd, ".helen"));
    fs.linkSync(original, path.join(cwd, ".helen", "report.html"));
    const result = run(cwd, ["status", "--html"]);
    expect(result.status).toBe(0);
    expect(result.body.data.reportPath).toBe(
      path.join(cwd, ".helen", "report.html"),
    );
    expect(fs.readFileSync(original, "utf8")).toBe("preserve original");
    expect(fs.readFileSync(result.body.data.reportPath, "utf8")).toContain(
      "HELEN Project Dashboard",
    );
  });
});
