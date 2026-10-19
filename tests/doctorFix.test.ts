import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { repairDoctorIssues } from "../src/core/doctorFix.js";
import {
  listOperations,
  recoverOperation,
  runProjectOperationSync,
  writeAtomicFile,
} from "../src/core/operations.js";

describe("helen doctor --fix", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "helen-doctor-fix-"));
    // Setup basic package.json
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "fix-test", version: "1.0.0" }),
    );
    fs.writeFileSync(path.join(tmp, ".gitignore"), "node_modules/\n");
    vi.stubEnv("GIT_CONFIG_GLOBAL", path.join(tmp, "global-git-config"));
    vi.stubEnv("GIT_CONFIG_NOSYSTEM", "1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: tmp,
      encoding: "utf8",
      windowsHide: true,
    }).replace(/\r?\n$/, "");

  it("installs executable hooks only when core.hooksPath is unset", () => {
    git("init", "-q");
    const report = repairDoctorIssues(tmp);
    expect(report.errors).toEqual([]);
    expect(git("config", "--get", "core.hooksPath")).toBe(".githooks");
    const hook = path.join(tmp, ".githooks", "pre-commit");
    expect(fs.readFileSync(hook, "utf8")).toContain("HELEN pre-commit");
    if (process.platform !== "win32")
      expect(fs.statSync(hook).mode & 0o111).not.toBe(0);
    expect(report.fixed).toContain(
      "Configured git core.hooksPath to .githooks",
    );
  });

  it.skipIf(process.platform === "win32")(
    "repairs executable permissions on an existing HELEN hook without replacing its contents",
    () => {
      git("init", "-q");
      fs.mkdirSync(path.join(tmp, ".githooks"));
      const hook = path.join(tmp, ".githooks", "pre-commit");
      const content =
        "#!/bin/sh\n# HELEN pre-commit: custom safe check\nexit 0\n";
      fs.writeFileSync(hook, content, { mode: 0o644 });
      const report = repairDoctorIssues(tmp);
      expect(fs.readFileSync(hook, "utf8")).toBe(content);
      expect(fs.statSync(hook).mode & 0o111).not.toBe(0);
      expect(report.fixed).toContain("Made .githooks/pre-commit executable");
    },
  );

  it.each([".husky/_", "", "../shared-hooks", ".githooks ", " .githooks"])(
    "preserves custom hooksPath %j and reports the skipped repair",
    (value) => {
      git("init", "-q");
      git("config", "--local", "core.hooksPath", value);
      const report = repairDoctorIssues(tmp);
      expect(git("config", "--get", "core.hooksPath")).toBe(value);
      expect(fs.existsSync(path.join(tmp, ".githooks"))).toBe(false);
      expect(report.skipped).toContain(
        `Preserved custom git core.hooksPath: ${JSON.stringify(value)}`,
      );
      expect(
        report.fixed.some((message) => message.includes(".githooks")),
      ).toBe(false);
    },
  );

  it("preserves custom hooksPath from global configuration", () => {
    git("init", "-q");
    git("config", "--global", "core.hooksPath", ".husky/_");
    const report = repairDoctorIssues(tmp);
    expect(git("config", "--get", "core.hooksPath")).toBe(".husky/_");
    expect(report.skipped).toContain(
      'Preserved custom git core.hooksPath: ".husky/_"',
    );
    expect(fs.existsSync(path.join(tmp, ".githooks"))).toBe(false);
  });

  it("does not alter git configuration or hook files in dry-run mode", () => {
    git("init", "-q");
    const report = repairDoctorIssues(tmp, { dryRun: true });
    expect(report.errors).toEqual([]);
    expect(fs.existsSync(path.join(tmp, ".githooks"))).toBe(false);
    expect(
      fs.readFileSync(path.join(tmp, ".git", "config"), "utf8"),
    ).not.toContain("hooksPath");
  });

  it("reports a Git configuration failure rather than treating it as an unset value", () => {
    git("init", "-q");
    fs.writeFileSync(path.join(tmp, ".git", "config"), "[invalid config");
    const report = repairDoctorIssues(tmp);
    expect(
      report.errors.some((message) =>
        message.includes("Failed to configure git hooks"),
      ),
    ).toBe(true);
    expect(report.fixed.some((message) => message.includes(".githooks"))).toBe(
      false,
    );
    expect(fs.existsSync(path.join(tmp, ".githooks"))).toBe(false);
    expect(fs.readFileSync(path.join(tmp, ".git", "config"), "utf8")).toBe(
      "[invalid config",
    );
  });

  it("blocks fixes before any mutation when another operation needs recovery", () => {
    expect(() =>
      runProjectOperationSync(tmp, "interrupted", () => {
        writeAtomicFile(path.join(tmp, "pending.txt"), "partial change");
        throw new Error("interrupted");
      }),
    ).toThrow("did not complete");
    const gitignoreBefore = fs.readFileSync(
      path.join(tmp, ".gitignore"),
      "utf8",
    );
    expect(() => repairDoctorIssues(tmp)).toThrow("needs recovery");
    expect(fs.readFileSync(path.join(tmp, ".gitignore"), "utf8")).toBe(
      gitignoreBefore,
    );
    expect(fs.existsSync(path.join(tmp, ".helenrc"))).toBe(false);
    expect(fs.existsSync(path.join(tmp, ".github", "dependabot.yml"))).toBe(
      false,
    );
  });

  it("does not activate Git hooks before an enclosing operation commits", () => {
    git("init", "-q");
    expect(() =>
      runProjectOperationSync(tmp, "enclosing-operation", () => {
        const report = repairDoctorIssues(tmp);
        expect(report.skipped.join("\n")).toContain("activation deferred");
        expect(
          fs.readFileSync(path.join(tmp, ".git", "config"), "utf8"),
        ).not.toContain("hooksPath");
        throw new Error("fail after repairs");
      }),
    ).toThrow(/recover/);
    recoverOperation(tmp, listOperations(tmp)[0]!.id);
    expect(fs.existsSync(path.join(tmp, ".githooks", "pre-commit"))).toBe(
      false,
    );
    expect(
      fs.readFileSync(path.join(tmp, ".git", "config"), "utf8"),
    ).not.toContain("hooksPath");
  });

  it("tracks gitignore and scaffold changes for recovery when a repair reports an error", () => {
    git("init", "-q");
    fs.writeFileSync(path.join(tmp, ".git", "config"), "[invalid config");
    const gitignoreBefore = fs.readFileSync(
      path.join(tmp, ".gitignore"),
      "utf8",
    );
    const report = repairDoctorIssues(tmp);
    const pending = listOperations(tmp);
    expect(report.errors.join("\n")).toContain("helen recover");
    expect(pending).toHaveLength(1);
    expect(pending[0].files).toContain(".gitignore");
    recoverOperation(tmp, pending[0].id);
    expect(fs.readFileSync(path.join(tmp, ".gitignore"), "utf8")).toBe(
      gitignoreBefore,
    );
    expect(fs.existsSync(path.join(tmp, ".github", "dependabot.yml"))).toBe(
      false,
    );
    expect(fs.existsSync(path.join(tmp, ".helenrc"))).toBe(false);
  });

  it("rejects a .gitignore directory without reporting a successful repair", () => {
    git("init", "-q");
    fs.unlinkSync(path.join(tmp, ".gitignore"));
    fs.mkdirSync(path.join(tmp, ".gitignore"));
    const report = repairDoctorIssues(tmp);
    expect(report.errors.join("\n")).toContain("Unsafe .gitignore path");
    expect(report.fixed).not.toContain("Added .helen/ to .gitignore");
    expect(fs.statSync(path.join(tmp, ".gitignore")).isDirectory()).toBe(true);
    expect(
      fs.readFileSync(path.join(tmp, ".git", "config"), "utf8"),
    ).not.toContain("hooksPath");
    expect(report.fixed).not.toContain(
      "Configured git core.hooksPath to .githooks",
    );
  });

  it("safely remediates missing configuration files and .gitignore entry", () => {
    const report = repairDoctorIssues(tmp);

    expect(report.fixed.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(tmp, ".helenrc"))).toBe(true);
    expect(fs.existsSync(path.join(tmp, ".github", "dependabot.yml"))).toBe(
      true,
    );

    const gitignoreContent = fs.readFileSync(
      path.join(tmp, ".gitignore"),
      "utf-8",
    );
    expect(gitignoreContent).toContain(".helen/");
  });

  it("respects dry-run option without modifying files", () => {
    const dryReport = repairDoctorIssues(tmp, { dryRun: true });

    expect(dryReport.errors.length).toBe(0);
    expect(fs.existsSync(path.join(tmp, ".helenrc"))).toBe(false);
    expect(fs.existsSync(path.join(tmp, ".github", "dependabot.yml"))).toBe(
      false,
    );
  });
});
