import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Command } from "commander";
import {
  installSkills,
  listFlowSkills,
  listSkills,
  resolveTargetDir,
  validateSkills,
} from "../src/core/skills.js";
import { parseFrontmatter } from "../src/core/frontmatter.js";
import { EXECUTION_CONTRACT } from "../src/core/executionProtocol.js";
import {
  listOperations,
  recoverOperation,
  runProjectOperationSync,
  writeAtomicFile,
} from "../src/core/operations.js";
import { registerSkillsCommands } from "../src/commands/skillsCmd.js";
import { clearJsonBuffers, setJsonMode } from "../src/core/jsonOutput.js";

describe("Skills installer", () => {
  let tmp: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "helen-skills-"));
    process.chdir(tmp);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setJsonMode(false);
    clearJsonBuffers();
    process.exitCode = 0;
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("lists the bundled skills with a SKILL.md", () => {
    expect(listSkills().map((skill) => skill.name)).toContain("helen-audit");
  });

  it("every bundled skill has name and description frontmatter matching its folder", () => {
    for (const skill of listSkills()) {
      const content = fs.readFileSync(
        path.join(skill.dir!, "SKILL.md"),
        "utf-8",
      );
      const { data, hasFrontmatter } = parseFrontmatter(content);
      expect(hasFrontmatter).toBe(true);
      expect(data.name).toBe(skill.name);
      expect(typeof data.description).toBe("string");
      expect(Object.hasOwn(data, "metadata")).toBe(true);
      expect(Object.hasOwn(data, "version")).toBe(false);
      expect(content.length).toBeGreaterThan(200);
      const description = String(data.description);
      expect(description.length).toBeLessThanOrEqual(1024);
      expect(content.replace(/\r\n/g, "\n").split("\n").length).toBeLessThan(
        500,
      );
    }
  });

  it("bundled skills pass structural validation", () => {
    expect(validateSkills()).toEqual([]);
  });

  it("accepts portable optional fields in any order and preserves nested metadata when installing", () => {
    const root = path.join(tmp, "source-skills");
    const name = "helen-portable-helper";
    fs.mkdirSync(path.join(root, name), { recursive: true });
    const content = `---
license: MIT
metadata:
  version: "3.4.5"
  maintainer: Local fixture
allowed-tools: [Read, Grep]
description: Use to inspect supplied project documents and report evidence without editing files or granting additional task authorization.
name: ${name}
---

# Portable helper

Keep the supplied source boundaries and record what was observed.
`;
    fs.writeFileSync(path.join(root, name, "SKILL.md"), content);
    expect(validateSkills(root)).toEqual([]);
    installSkills(
      { cwd: tmp, targets: ["custom"], customDir: "project-skills" },
      root,
    );
    expect(
      fs.readFileSync(
        path.join(tmp, "project-skills", name, "SKILL.md"),
        "utf8",
      ),
    ).toBe(content);
  });

  it.each(["version", "unsupported-setting"])(
    "rejects the unsupported top-level field %s instead of silently claiming portable validity",
    (field) => {
      const root = path.join(tmp, "source-skills");
      const name = "helen-portable-helper";
      fs.mkdirSync(path.join(root, name), { recursive: true });
      fs.writeFileSync(
        path.join(root, name, "SKILL.md"),
        `---
name: ${name}
description: Use to inspect supplied project documents and report evidence without editing files or granting additional task authorization.
${field}: 2.1.0
---

# Portable helper
`,
      );
      const issues = validateSkills(root);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toContain(`frontmatter field "${field}"`);
      if (field === "version") expect(issues[0]).toContain("metadata.version");
    },
  );

  it("installs into the claude and codex directories", () => {
    const result = installSkills({ cwd: tmp, targets: ["claude", "codex"] });

    expect(
      fs.existsSync(path.join(tmp, ".claude/skills/helen-audit/SKILL.md")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tmp, ".agents/skills/helen-audit/SKILL.md")),
    ).toBe(true);
    expect(result.created).toContain(
      path.join(".claude/skills/helen-audit/SKILL.md"),
    );
    expect(result.created).toContain(
      path.join(".agents/skills/helen-audit/SKILL.md"),
    );
    expect(result.skipped).toHaveLength(0);
  });

  it("supports a generic custom directory", () => {
    installSkills({
      cwd: tmp,
      targets: ["custom"],
      customDir: "my-agent/skills",
    });

    expect(
      fs.existsSync(path.join(tmp, "my-agent/skills/helen-audit/SKILL.md")),
    ).toBe(true);
  });

  it("blocks every installer consumer while recovery is pending and still permits dry-run", () => {
    const failed = runProjectOperationSync(
      tmp,
      "interrupted",
      () => {
        writeAtomicFile(path.join(tmp, "partial.txt"), "partial");
        return false;
      },
      (value) => value,
    );
    expect(() =>
      installSkills({ cwd: tmp, targets: ["codex"], skills: ["helen-audit"] }),
    ).toThrow("needs recovery");
    const preview = installSkills({
      cwd: tmp,
      targets: ["codex"],
      skills: ["helen-audit"],
      dryRun: true,
    });
    expect(preview.created.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(tmp, ".agents"))).toBe(false);
    expect(listOperations(tmp).map((operation) => operation.id)).toEqual([
      failed.operation!.id,
    ]);
  });

  it.each(["install", "update"])(
    "returns a JSON recovery error for skills %s without mutating files",
    async (command) => {
      installSkills({ cwd: tmp, targets: ["codex"], skills: ["helen-audit"] });
      const skill = path.join(tmp, ".agents/skills/helen-audit/SKILL.md");
      fs.appendFileSync(skill, "\nUser change\n");
      const before = fs.readFileSync(skill, "utf8");
      runProjectOperationSync(
        tmp,
        "interrupted",
        () => {
          writeAtomicFile(path.join(tmp, "partial.txt"), "partial");
          return false;
        },
        (value) => value,
      );
      setJsonMode(true);
      clearJsonBuffers();
      let output = "";
      vi.spyOn(process.stdout, "write").mockImplementation((value) => {
        output += value.toString();
        return true;
      });
      vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      const program = new Command();
      registerSkillsCommands(program);
      await program.parseAsync(["skills", command], { from: "user" });
      const envelope = JSON.parse(output);
      expect(envelope.ok).toBe(false);
      expect(envelope.command).toBe(`skills:${command}`);
      expect(envelope.errors.join(" ")).toContain("helen recover");
      expect(process.exitCode).toBe(1);
      expect(fs.readFileSync(skill, "utf8")).toBe(before);
      expect(fs.existsSync(path.join(tmp, ".claude"))).toBe(false);
      expect(fs.existsSync(`${skill}.helen-backup`)).toBe(false);
    },
  );

  it("recovers an installed skill update and its backup after a caught write failure", () => {
    installSkills({ cwd: tmp, targets: ["codex"], skills: ["helen-audit"] });
    const skill = path.join(tmp, ".agents/skills/helen-audit/SKILL.md");
    fs.writeFileSync(skill, "custom old instructions");
    const manifest = fs.readFileSync(
      path.join(tmp, ".helen/skill-files.json"),
      "utf8",
    );
    const originalRename = fs.renameSync;
    vi.spyOn(fs, "renameSync").mockImplementation((source, destination) => {
      if (path.resolve(String(destination)) === skill)
        throw new Error("skill update write failure");
      originalRename(source, destination);
    });
    expect(() =>
      installSkills({
        cwd: tmp,
        targets: ["codex"],
        skills: ["helen-audit"],
        force: true,
      }),
    ).toThrow("helen recover");
    vi.restoreAllMocks();
    expect(fs.existsSync(`${skill}.helen-backup`)).toBe(true);
    recoverOperation(tmp, listOperations(tmp)[0]!.id);
    expect(fs.readFileSync(skill, "utf8")).toBe("custom old instructions");
    expect(fs.existsSync(`${skill}.helen-backup`)).toBe(false);
    expect(
      fs.readFileSync(path.join(tmp, ".helen/skill-files.json"), "utf8"),
    ).toBe(manifest);
  });

  it("rejects unsafe skill destinations and preserves files outside the project", () => {
    const outside = fs.mkdtempSync(
      path.join(os.tmpdir(), "helen-skills-outside-"),
    );
    try {
      fs.mkdirSync(path.join(tmp, ".agents"));
      fs.symlinkSync(outside, path.join(tmp, ".agents", "skills"), "junction");
      expect(() =>
        installSkills({
          cwd: tmp,
          targets: ["codex"],
          skills: ["helen-audit"],
        }),
      ).toThrow(/Unsafe file destination/);
      expect(fs.readdirSync(outside)).toEqual([]);
    } finally {
      fs.rmSync(path.join(tmp, ".agents", "skills"), { force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it("keeps a partial mixed-target installation recoverable when another target is unsafe", () => {
    const outside = fs.mkdtempSync(
      path.join(os.tmpdir(), "helen-skills-outside-"),
    );
    try {
      fs.mkdirSync(path.join(tmp, ".agents"));
      fs.symlinkSync(
        outside,
        path.join(tmp, ".agents", "skills"),
        process.platform === "win32" ? "junction" : "dir",
      );
      expect(() =>
        installSkills({
          cwd: tmp,
          targets: ["claude", "codex"],
          skills: ["helen-audit"],
        }),
      ).toThrow(/helen recover/);
      const pending = listOperations(tmp);
      expect(pending).toHaveLength(1);
      expect(
        fs.existsSync(path.join(tmp, ".claude/skills/helen-audit/SKILL.md")),
      ).toBe(true);
      expect(fs.readdirSync(outside)).toEqual([]);
      recoverOperation(tmp, pending[0]!.id);
      expect(
        fs.existsSync(path.join(tmp, ".claude/skills/helen-audit/SKILL.md")),
      ).toBe(false);
      expect(fs.existsSync(path.join(tmp, ".helen/skill-files.json"))).toBe(
        false,
      );
      expect(fs.readdirSync(outside)).toEqual([]);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it("rejects custom dirs that escape the project or are missing", () => {
    expect(() => resolveTargetDir("custom")).toThrow(/requires --dir/);
    expect(() => resolveTargetDir("custom", "../outside")).toThrow(
      /inside the project/,
    );
    expect(() => resolveTargetDir("custom", "/abs/path")).toThrow(
      /inside the project/,
    );
  });

  it("does not write on dry-run and skips existing files without force", () => {
    installSkills({ cwd: tmp, targets: ["claude"], dryRun: true });
    expect(fs.existsSync(path.join(tmp, ".claude"))).toBe(false);

    const first = installSkills({ cwd: tmp, targets: ["claude"] });
    const second = installSkills({ cwd: tmp, targets: ["claude"] });
    expect(second.skipped).toHaveLength(first.created.length);
  });

  it("errors on an unknown skill name", () => {
    expect(() =>
      installSkills({ cwd: tmp, targets: ["claude"], skills: ["nope"] }),
    ).toThrow(/not found/);
  });

  it("turns every executable flow into a valid, self-contained skill", () => {
    const flows = listFlowSkills();
    const names = flows.map((skill) => skill.name);

    expect(flows.length).toBeGreaterThanOrEqual(10);
    expect(new Set(names).size).toBe(names.length);
    for (const flow of flows) {
      const content = flow.files!["SKILL.md"]!;
      const { data, hasFrontmatter } = parseFrontmatter(content);
      expect(hasFrontmatter).toBe(true);
      expect(data.name).toBe(flow.name);
      expect(typeof data.description).toBe("string");
      expect(content).not.toMatch(/\]\([^)]*\.md\)/);
      expect(content).not.toContain("## Objetivo");
      expect(content).toContain("HELEN execution contract");
      expect(content).toContain("Improvement discovery");
    }
  });

  it("installs flow skills only when requested", () => {
    installSkills({ cwd: tmp, targets: ["claude"], skills: ["helen-audit"] });
    expect(
      fs.existsSync(path.join(tmp, ".claude/skills/helen-flow-full-polish")),
    ).toBe(false);

    installSkills({
      cwd: tmp,
      targets: ["claude"],
      flows: true,
      skills: ["helen-flow-full-polish"],
    });
    expect(
      fs.existsSync(
        path.join(tmp, ".claude/skills/helen-flow-full-polish/SKILL.md"),
      ),
    ).toBe(true);
  });

  it("places identical shared instructions before each generated flow body", () => {
    const bodies = listFlowSkills().map(
      (flow) => parseFrontmatter(flow.files!["SKILL.md"]!).body,
    );
    const prefix = bodies[0].split("\n\n---\n")[0];
    expect(prefix).toContain(EXECUTION_CONTRACT);
    for (const body of bodies) {
      expect(body.startsWith(`${prefix}\n\n---\n`)).toBe(true);
      expect(body.match(/HELEN execution contract/g)).toHaveLength(1);
    }
  });
});
