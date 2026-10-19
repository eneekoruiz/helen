import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BLOCK_END,
  BLOCK_START,
  helenBlock,
  setupProject,
  upsertBlock,
  uninstallProject,
} from "../src/core/setup.js";
import { SKILL_TARGETS, listSkills, skillFiles } from "../src/core/skills.js";
import { listPresetSkills } from "../src/core/agentPresets.js";
import {
  listOperations,
  recoverOperation,
  runProjectOperationSync,
  writeAtomicFile,
} from "../src/core/operations.js";

describe("helen setup", () => {
  let tmp: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "helen-setup-"));
    process.chdir(tmp);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("blocks setup and uninstall before any mutation when recovery is pending", () => {
    const failed = runProjectOperationSync(
      tmp,
      "interrupted",
      () => {
        writeAtomicFile(path.join(tmp, "partial.txt"), "partial");
        return false;
      },
      (value) => value,
    );
    expect(() => setupProject({ cwd: tmp, agents: ["codex"] })).toThrow(
      "needs recovery",
    );
    expect(() => uninstallProject({ cwd: tmp })).toThrow("needs recovery");
    expect(fs.existsSync(path.join(tmp, ".agents"))).toBe(false);
    expect(fs.existsSync(path.join(tmp, "AGENTS.md"))).toBe(false);
    expect(listOperations(tmp).map((operation) => operation.id)).toEqual([
      failed.operation!.id,
    ]);
  });

  it("checks global recovery before installing any project files", () => {
    const home = path.join(tmp, "home");
    fs.mkdirSync(home);
    vi.stubEnv("HOME", home);
    const failed = runProjectOperationSync(
      home,
      "interrupted-global",
      () => {
        writeAtomicFile(path.join(home, "partial.txt"), "partial");
        return false;
      },
      (value) => value,
    );
    expect(() =>
      setupProject({ cwd: tmp, agents: ["claude"], global: true }),
    ).toThrow(`Global skill directory ${home}`);
    expect(fs.existsSync(path.join(tmp, ".claude"))).toBe(false);
    expect(fs.existsSync(path.join(tmp, ".helen"))).toBe(false);
    expect(listOperations(home).map((operation) => operation.id)).toEqual([
      failed.operation!.id,
    ]);
  });

  it("keeps both project and global installation recoverable after a later instruction write fails", () => {
    const home = path.join(tmp, "home");
    fs.mkdirSync(home);
    vi.stubEnv("HOME", home);
    const originalRename = fs.renameSync;
    const instructions = path.join(tmp, "AGENTS.md");
    vi.spyOn(fs, "renameSync").mockImplementation((source, destination) => {
      if (path.resolve(String(destination)) === instructions)
        throw new Error("instruction write failure");
      originalRename(source, destination);
    });
    expect(() =>
      setupProject({ cwd: tmp, agents: ["claude"], global: true }),
    ).toThrow("instruction write failure");
    vi.restoreAllMocks();
    const projectOperation = listOperations(tmp)[0]!;
    const globalOperation = listOperations(home)[0]!;
    expect(projectOperation.kind).toBe("setup");
    expect(globalOperation.kind).toBe("setup:global");
    expect(projectOperation.files).toContain(
      ".claude/skills/helen-apply/SKILL.md",
    );
    expect(globalOperation.files).toContain(
      ".claude/skills/helen-apply/SKILL.md",
    );
    expect(
      fs.existsSync(path.join(home, ".claude/skills/helen-apply/SKILL.md")),
    ).toBe(true);
    recoverOperation(tmp, projectOperation.id);
    recoverOperation(home, globalOperation.id);
    for (const root of [tmp, home]) {
      expect(
        fs.existsSync(path.join(root, ".claude/skills/helen-apply/SKILL.md")),
      ).toBe(false);
      expect(fs.existsSync(path.join(root, ".helen/skill-files.json"))).toBe(
        false,
      );
      expect(listOperations(root)).toEqual([]);
    }
  });

  it("restores skills, ownership, instructions and rules after an interrupted uninstall", () => {
    setupProject({
      cwd: tmp,
      agents: ["claude", "codex"],
      preset: "efficient",
    });
    const manifest = ".helen/skill-files.json";
    const ownership = JSON.parse(
      fs.readFileSync(path.join(tmp, manifest), "utf8"),
    );
    const files = [
      ...Object.keys(ownership.files),
      manifest,
      "AGENTS.md",
      "CLAUDE.md",
      ".agents/rules/security.md",
      ".agents/rules/quality.md",
      ".agents/rules/design.md",
    ];
    const originals = new Map(
      files.map((file) => [file, fs.readFileSync(path.join(tmp, file))]),
    );
    const originalUnlink = fs.unlinkSync;
    const rule = path.join(tmp, ".agents/rules/security.md");
    vi.spyOn(fs, "unlinkSync").mockImplementation((file) => {
      if (path.resolve(String(file)) === rule)
        throw new Error("uninstall interruption");
      originalUnlink(file);
    });
    expect(() => uninstallProject({ cwd: tmp })).toThrow("helen recover");
    vi.restoreAllMocks();
    expect(fs.existsSync(path.join(tmp, "AGENTS.md"))).toBe(false);
    const pending = listOperations(tmp)[0]!;
    expect(pending.files).toEqual(
      expect.arrayContaining([
        "AGENTS.md",
        "CLAUDE.md",
        manifest,
        ".agents/skills/helen-apply/SKILL.md",
      ]),
    );
    recoverOperation(tmp, pending.id);
    for (const [file, before] of originals)
      expect(fs.readFileSync(path.join(tmp, file)), file).toEqual(before);
    expect(listOperations(tmp)).toEqual([]);
  });

  it("preserves a recreated instruction file and the full uninstall journal on recovery conflict", () => {
    setupProject({ cwd: tmp, agents: ["codex"] });
    const failed = runProjectOperationSync(
      tmp,
      "uninstall interrupted",
      () => {
        uninstallProject({ cwd: tmp });
        return false;
      },
      (value) => value,
    );
    fs.writeFileSync(
      path.join(tmp, "AGENTS.md"),
      "User instructions after uninstall\n",
    );
    expect(() => recoverOperation(tmp, failed.operation!.id)).toThrow(
      "Recovery conflict",
    );
    expect(fs.readFileSync(path.join(tmp, "AGENTS.md"), "utf8")).toBe(
      "User instructions after uninstall\n",
    );
    expect(
      fs.existsSync(path.join(tmp, ".agents/skills/helen-apply/SKILL.md")),
    ).toBe(false);
    expect(listOperations(tmp)).toHaveLength(1);
  });

  it("reports global installed files and includes requested flows", () => {
    const home = path.join(tmp, "home");
    vi.stubEnv("HOME", home);
    const result = setupProject({
      cwd: tmp,
      agents: ["claude"],
      global: true,
      flows: true,
    });
    const globalFlow = path.join(
      home,
      ".claude",
      "skills",
      "helen-flow-full-polish",
      "SKILL.md",
    );
    expect(fs.existsSync(globalFlow)).toBe(true);
    expect(result.skills.created).toContain(globalFlow);
  });

  it("installs the optional preset alongside bundled skills and instructions", () => {
    const result = setupProject({
      cwd: tmp,
      agents: ["claude", "codex", "antigravity"],
      preset: "efficient",
    });
    expect(result.preset?.created).toContain(".mcp.json");
    expect(result.instructionFiles).toContain("AGENTS.md");
    expect(
      fs.existsSync(path.join(tmp, ".agents/skills/helen-resume/SKILL.md")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tmp, ".claude/skills/helen-audit/SKILL.md")),
    ).toBe(true);
  });

  it("rejects global preset installation before any writes", () => {
    expect(() =>
      setupProject({
        cwd: tmp,
        agents: ["codex"],
        preset: "efficient",
        global: true,
      }),
    ).toThrow("project-only");
    expect(fs.readdirSync(tmp)).toEqual([]);
  });

  it("fails malformed preset configuration before bundled installation", () => {
    fs.writeFileSync(path.join(tmp, ".mcp.json"), "{broken");
    expect(() =>
      setupProject({ cwd: tmp, agents: ["claude"], preset: "efficient" }),
    ).toThrow("Malformed JSON");
    expect(fs.readdirSync(tmp)).toEqual([".mcp.json"]);
  });

  it("uninstall leaves unrelated instructions untouched and unreported", () => {
    fs.writeFileSync(path.join(tmp, "AGENTS.md"), "User instructions\n");
    expect(uninstallProject({ cwd: tmp }).cleanedInstructions).toEqual([]);
    expect(fs.readFileSync(path.join(tmp, "AGENTS.md"), "utf8")).toBe(
      "User instructions\n",
    );
  });

  it("uninstall replaces managed instruction files without changing hard-linked personal copies", () => {
    const original = `Personal rules\n${BLOCK_START}\nmanaged\n${BLOCK_END}\n`;
    const personal = path.join(tmp, "personal.md");
    fs.writeFileSync(personal, original);
    fs.linkSync(personal, path.join(tmp, "AGENTS.md"));
    uninstallProject({ cwd: tmp });
    expect(fs.readFileSync(personal, "utf8")).toBe(original);
    expect(fs.readFileSync(path.join(tmp, "AGENTS.md"), "utf8")).toBe(
      "Personal rules\n",
    );
  });

  it("uninstall never follows a skill directory junction outside the project", () => {
    const outside = fs.mkdtempSync(
      path.join(os.tmpdir(), "helen-uninstall-outside-"),
    );
    try {
      fs.mkdirSync(path.join(outside, "helen-custom"));
      fs.writeFileSync(path.join(outside, "helen-custom", "SKILL.md"), "keep");
      fs.mkdirSync(path.join(tmp, ".agents"));
      fs.symlinkSync(outside, path.join(tmp, ".agents", "skills"), "junction");
      expect(uninstallProject({ cwd: tmp }).removedSkills).toEqual([]);
      expect(
        fs.readFileSync(path.join(outside, "helen-custom", "SKILL.md"), "utf8"),
      ).toBe("keep");
    } finally {
      fs.rmSync(path.join(tmp, ".agents", "skills"), { force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it("antigravity shares the codex folder (documented .agents/skills)", () => {
    expect(SKILL_TARGETS.antigravity).toBe(".agents/skills");
  });

  it("installs skills for all agents and writes AGENTS.md and CLAUDE.md", () => {
    const result = setupProject({
      cwd: tmp,
      agents: ["claude", "codex", "antigravity"],
    });

    expect(
      fs.existsSync(path.join(tmp, ".claude/skills/helen-apply/SKILL.md")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tmp, ".agents/skills/helen-apply/SKILL.md")),
    ).toBe(true);
    expect(result.instructionFiles).toEqual(["AGENTS.md", "CLAUDE.md"]);
    expect(fs.readFileSync(path.join(tmp, "AGENTS.md"), "utf-8")).toContain(
      "helen apply",
    );
    expect(result.skills.skipped).toHaveLength(0);
  });

  it("codex and antigravity together write the shared folder once", () => {
    const result = setupProject({ cwd: tmp, agents: ["codex", "antigravity"] });

    expect(result.skills.skipped).toHaveLength(0);
    expect(fs.existsSync(path.join(tmp, "CLAUDE.md"))).toBe(false);
  });

  it("keeps existing instructions and is idempotent", () => {
    fs.writeFileSync(path.join(tmp, "AGENTS.md"), "# My rules\n\nBe kind.\n");
    setupProject({ cwd: tmp, agents: ["codex"] });
    setupProject({ cwd: tmp, agents: ["codex"] });

    const content = fs.readFileSync(path.join(tmp, "AGENTS.md"), "utf-8");
    expect(content).toContain("Be kind.");
    expect(content.split(BLOCK_START)).toHaveLength(2);
  });

  it("replaces only the managed block", () => {
    const old = `before\n${BLOCK_START}\nOLD\n${BLOCK_END}\nafter\n`;
    const updated = upsertBlock(old, helenBlock());

    expect(updated).not.toContain("OLD");
    expect(updated.startsWith("before")).toBe(true);
    expect(updated.trimEnd().endsWith("after")).toBe(true);
  });

  it("updates managed quality rules while preserving user text and unrelated rules", () => {
    setupProject({ cwd: tmp, agents: ["codex"] });
    const quality = path.join(tmp, ".agents", "rules", "quality.md");
    fs.writeFileSync(
      quality,
      `Before\n${BLOCK_START}\nobsolete\n${BLOCK_END}\nAfter\n`,
    );
    const custom = path.join(tmp, ".agents", "rules", "security.md");
    fs.writeFileSync(custom, "# Custom security rules\nPreserve this\n");
    setupProject({ cwd: tmp, agents: ["codex"] });
    const content = fs.readFileSync(quality, "utf8");
    expect(content).toContain("HELEN execution contract");
    expect(content).not.toContain("obsolete");
    expect(content).toContain("Before");
    expect(content).toContain("After");
    expect(fs.readFileSync(custom, "utf8")).toBe(
      "# Custom security rules\nPreserve this\n",
    );
  });

  it("migrates the exact legacy quality rules without replacing edited legacy files", () => {
    const legacy = fs.readFileSync(
      new URL("./fixtures/legacy-quality.md", import.meta.url),
      "utf8",
    );
    const rules = path.join(tmp, ".agents", "rules");
    fs.mkdirSync(rules, { recursive: true });
    const file = path.join(rules, "quality.md");
    fs.writeFileSync(file, legacy + "\nUser addition\n");
    setupProject({ cwd: tmp, agents: ["codex"] });
    expect(fs.readFileSync(file, "utf8")).toContain("User addition");
    fs.writeFileSync(file, legacy);
    setupProject({ cwd: tmp, agents: ["codex"] });
    expect(fs.readFileSync(file, "utf8")).toContain("HELEN execution contract");
    expect(fs.readFileSync(file, "utf8")).not.toContain("Level 100");
  });

  it("writes nothing on dry-run", () => {
    setupProject({ cwd: tmp, agents: ["claude"], dryRun: true });

    expect(fs.existsSync(path.join(tmp, "AGENTS.md"))).toBe(false);
    expect(fs.existsSync(path.join(tmp, ".claude"))).toBe(false);
  });
  it("uninstall cleans up managed rules in .agents/rules", () => {
    const rulesDir = path.join(tmp, ".agents", "rules");
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(
      path.join(rulesDir, "security.md"),
      `${BLOCK_START}\nmanaged\n${BLOCK_END}\n`,
    );
    fs.writeFileSync(
      path.join(rulesDir, "quality.md"),
      `custom\n${BLOCK_START}\nmanaged\n${BLOCK_END}\n`,
    );
    const uninst = uninstallProject({ cwd: tmp });
    expect(uninst.cleanedRules).toContain(".agents/rules/security.md");
    expect(uninst.cleanedRules).toContain(".agents/rules/quality.md");
    expect(fs.existsSync(path.join(rulesDir, "security.md"))).toBe(false);
    expect(
      fs.readFileSync(path.join(rulesDir, "quality.md"), "utf8"),
    ).toContain("custom");
  });

  it("migrates exact generated legacy design rules but preserves custom additions", () => {
    setupProject({ cwd: tmp, agents: ["codex"] });
    const file = path.join(tmp, ".agents/rules/design.md");
    const modern = fs.readFileSync(file, "utf8");
    const body = modern.slice(
      modern.indexOf("\n") + 1,
      modern.lastIndexOf(BLOCK_END),
    );
    const old = body.replace(
      /- Model routing:[^\n]+/,
      "- Senior Model Cascade: Scaffolding and styling begin with eco-tier models, escalating only if visual/layout tests fail.",
    );
    fs.writeFileSync(file, old + "User addition\n");
    setupProject({ cwd: tmp, agents: ["codex"] });
    expect(fs.readFileSync(file, "utf8")).toBe(old + "User addition\n");
    fs.writeFileSync(file, old);
    setupProject({ cwd: tmp, agents: ["codex"] });
    expect(fs.readFileSync(file, "utf8")).toContain("handoff overhead");
    expect(fs.readFileSync(file, "utf8")).not.toContain("eco-tier");
    expect(fs.existsSync(`${file}.helen-backup`)).toBe(true);
  });

  it("uninstalls owned files while preserving edited and unowned skill contents", () => {
    setupProject({ cwd: tmp, agents: ["codex"], preset: "efficient" });
    const custom = path.join(tmp, ".agents/skills/helen-personal");
    fs.mkdirSync(custom);
    fs.writeFileSync(path.join(custom, "SKILL.md"), "Personal instructions");
    const emptyPersonal = path.join(tmp, ".agents/skills/helen-personal-empty");
    fs.mkdirSync(emptyPersonal);
    const edited = path.join(tmp, ".agents/skills/helen-resume/SKILL.md");
    fs.appendFileSync(edited, "\nMy customization");
    const extra = path.join(tmp, ".agents/skills/helen-apply/notes.txt");
    fs.writeFileSync(extra, "Personal notes");
    const result = uninstallProject({ cwd: tmp });
    expect(fs.readFileSync(path.join(custom, "SKILL.md"), "utf8")).toBe(
      "Personal instructions",
    );
    expect(fs.existsSync(emptyPersonal)).toBe(true);
    expect(fs.readFileSync(edited, "utf8")).toContain("My customization");
    expect(fs.readFileSync(extra, "utf8")).toBe("Personal notes");
    expect(fs.existsSync(path.join(tmp, ".agents/skills/helen-status"))).toBe(
      false,
    );
    expect(result.preservedSkills).toContain(
      path.join(".agents/skills/helen-personal"),
    );
    expect(fs.existsSync(path.join(tmp, ".codex/config.toml"))).toBe(true);
  });

  it("uninstalls exact legacy preset helper skills without a manifest", () => {
    const helper = listPresetSkills().find(
      (skill) => skill.name === "helen-status",
    )!;
    const file = path.join(tmp, ".agents", "skills", helper.name, "SKILL.md");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, helper.files["SKILL.md"]);

    const result = uninstallProject({ cwd: tmp });
    expect(fs.existsSync(file)).toBe(false);
    expect(fs.existsSync(path.dirname(file))).toBe(false);
    expect(result.removedSkills).toContain(
      path.join(".agents", "skills", helper.name),
    );
    expect(result.preservedSkills).not.toContain(
      path.join(".agents", "skills", helper.name),
    );
  });

  it("prunes empty legacy skill directories, preserves nested notes, and simulates the same result in dry-run", () => {
    const design = listSkills().find((skill) => skill.name === "helen-design")!;
    const skillDir = path.join(tmp, ".agents", "skills", design.name);
    const cleanSkillDir = path.join(tmp, ".claude", "skills", design.name);
    const generatedFiles = Object.entries(skillFiles(design)).map(
      ([relative, content]) => {
        const file = path.join(skillDir, relative);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content);
        const cleanFile = path.join(cleanSkillDir, relative);
        fs.mkdirSync(path.dirname(cleanFile), { recursive: true });
        fs.writeFileSync(cleanFile, content);
        return file;
      },
    );
    const note = path.join(skillDir, "references", "notes.md");
    fs.writeFileSync(note, "Keep this personal note");
    const relativeSkillDir = path.join(".agents", "skills", design.name);

    const preview = uninstallProject({ cwd: tmp, dryRun: true });
    expect(preview.removedSkills).toContain(
      path.join(".claude", "skills", design.name),
    );
    expect(preview.preservedSkills).not.toContain(
      path.join(".claude", "skills", design.name),
    );
    expect(fs.existsSync(cleanSkillDir)).toBe(true);
    expect(preview.removedSkills).not.toContain(relativeSkillDir);
    expect(preview.preservedSkills).toContain(relativeSkillDir);
    for (const file of generatedFiles) expect(fs.existsSync(file)).toBe(true);
    expect(fs.existsSync(note)).toBe(true);

    const result = uninstallProject({ cwd: tmp });
    expect(fs.existsSync(cleanSkillDir)).toBe(false);
    for (const file of generatedFiles) expect(fs.existsSync(file)).toBe(false);
    expect(fs.readFileSync(note, "utf8")).toBe("Keep this personal note");
    expect(fs.existsSync(skillDir)).toBe(true);
    expect(result.removedSkills).not.toContain(relativeSkillDir);
    expect(result.preservedSkills).toContain(relativeSkillDir);
  });
});
