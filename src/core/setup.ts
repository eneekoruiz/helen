import fs from "node:fs";
import path from "node:path";
import { writeFileSafe, isSafeProjectPath } from "./fs.js";
import {
  installSkills,
  listSkills,
  listFlowSkills,
  skillFiles,
  type InstallSkillsResult,
  type SkillTarget,
} from "./skills.js";
import { EXECUTION_CONTRACT } from "./executionProtocol.js";
import { createHash } from "node:crypto";
import {
  installAgentPreset,
  listPresetSkills,
  type InstallAgentPresetResult,
} from "./agentPresets.js";
import {
  removeOwnedSkillFiles,
  validateSkillOwnership,
} from "./skillOwnership.js";
import {
  assertProjectOperationAvailable,
  removeTrackedFile,
  runProjectOperationSync,
  writeAtomicFile,
} from "./operations.js";

export const BLOCK_START =
  "<!-- HELEN:START (managed by helen setup, edit outside this block) -->";
export const BLOCK_END = "<!-- HELEN:END -->";

export type SetupAgent = "claude" | "codex" | "antigravity";

export interface SetupOptions {
  cwd: string;
  agents: SetupAgent[];
  flows?: boolean;
  dryRun?: boolean;
  force?: boolean;
  preset?: "efficient";
}

export interface SetupResult {
  skills: InstallSkillsResult;
  instructionFiles: string[];
  preset?: InstallAgentPresetResult;
}

/** Instructions any agent reads from AGENTS.md / CLAUDE.md. Kept short: it is loaded every session. */
export function helenBlock(): string {
  return [
    BLOCK_START,
    "## HELEN",
    "",
    "This project uses HELEN (prompts, skills and a tools catalog).",
    "",
    EXECUTION_CONTRACT,
    '- When asked to "use HELEN", or where the project stands, or what to do next: use the `helen-apply` skill, or run `helen apply`.',
    '- To work an area ("apply all the design improvements", "prepare the release"): `helen apply <goal>` prints the steps; `helen apply <goal> --track` follows them one by one with `helen next`, `helen done`, `helen check`.',
    "- Prompts: `helen prompts list`, `helen prompts show <id>`. Skills live in `.claude/skills` and `.agents/skills`. Guide: `helen guide`.",
    "- Never install an external tool, plugin or MCP server without showing its commands (`helen skills external <id>`) and getting explicit approval. Use at most one main design skill. Prefer read-only, least-privilege, development-environment MCP connections.",
    "- Never invent content, testimonials, metrics, logos or claims. Repair failed checkpoints autonomously; never bypass them.",
    BLOCK_END,
  ].join("\n");
}

/** Insert or replace the managed block, keeping everything else in the file. */
export function upsertBlock(existing: string | null, block: string): string {
  if (existing === null || existing.trim() === "") return `${block}\n`;
  const start = existing.indexOf(BLOCK_START);
  const end = existing.indexOf(BLOCK_END);
  if (start !== -1 && end > start) {
    return `${existing.slice(0, start)}${block}${existing.slice(end + BLOCK_END.length)}`;
  }
  return `${existing.replace(/\s*$/, "")}\n\n${block}\n`;
}

/** Install hierarchical rules in .agents/rules for Antigravity and Codex. */
export function installAntigravityRules(cwd: string, dryRun = false): string[] {
  const rulesDir = path.join(cwd, ".agents", "rules");
  const created: string[] = [];

  const rules = [
    {
      file: "security.md",
      content: `# HELEN Security Rules\n- Never commit or print real secrets, tokens, private keys or passwords.\n- Always use environment variables (.env.local) and sanitized inputs.\n- Enforce strict CSP headers and validate external inputs.\n`,
    },
    {
      file: "quality.md",
      content: `# HELEN Quality & Autonomous Execution Rules\n${EXECUTION_CONTRACT}\n- Maintain runtime-validated types; never weaken checks or bypass git hooks.\n`,
    },
    {
      file: "design.md",
      content: `# HELEN Design System Rules\n- Playwright + Chromium Testing Gate: Every visual component or design change must pass headless Chromium verification across 3 viewports (375px mobile, 768px tablet, 1440px desktop) with zero console errors.\n- Model routing: choose the cheapest available capable model when supported; keep the current agent when handoff overhead outweighs its benefit. Escalate on evidenced failure or capability limits; never lower reasoning effort automatically.\n- Maintain accessible contrast (WCAG AA/AAA) across all color themes.\n- Ensure responsive layouts across mobile, tablet, and desktop breakpoints without horizontal overflow.\n- Respect prefers-reduced-motion for all UI transitions and animations.\n`,
    },
  ];

  for (const { file, content } of rules) {
    const target = path.join(rulesDir, file);
    if (!isSafeProjectPath(cwd, target)) continue;
    const existing =
      fs.existsSync(target) && fs.lstatSync(target).isFile()
        ? fs.readFileSync(target, "utf8")
        : null;
    // Migrate only the exact previously generated quality file; preserve custom text.
    const legacyQuality =
      file === "quality.md" &&
      existing !== null &&
      createHash("sha256")
        .update(existing.replaceAll("\r\n", "\n"))
        .digest("hex") ===
        "1d5265b6bc64cc6173c2072ea7fb95b815555b3033bd458d521dc554d2420ce5";
    const legacyDesignContent =
      file === "design.md"
        ? content.replace(
            "- Model routing: choose the cheapest available capable model when supported; keep the current agent when handoff overhead outweighs its benefit. Escalate on evidenced failure or capability limits; never lower reasoning effort automatically.",
            "- Senior Model Cascade: Scaffolding and styling begin with eco-tier models, escalating only if visual/layout tests fail.",
          )
        : null;
    const legacyDesign =
      legacyDesignContent !== null &&
      existing?.replaceAll("\r\n", "\n") === legacyDesignContent;
    if (
      existing === null ||
      existing.includes(BLOCK_START) ||
      legacyQuality ||
      legacyDesign
    ) {
      const block = `${BLOCK_START}\n${content.trimEnd()}\n${BLOCK_END}`;
      const updated = upsertBlock(
        legacyQuality || legacyDesign ? null : existing,
        block,
      );
      if (
        updated !== existing &&
        writeFileSafe(target, updated, { dryRun, force: true, root: cwd }) !==
          "skipped"
      ) {
        created.push(`.agents/rules/${file}`);
      }
    }
  }

  return created;
}

export function removeBlock(existing: string | null): string {
  if (!existing) return "";
  const start = existing.indexOf(BLOCK_START);
  const end = existing.indexOf(BLOCK_END);
  if (start !== -1 && end > start) {
    const before = existing.slice(0, start).trimEnd();
    const after = existing.slice(end + BLOCK_END.length).trimStart();
    if (!before && !after) return "";
    if (!before) return `${after}\n`;
    if (!after) return `${before}\n`;
    return `${before}\n\n${after}\n`;
  }
  return existing;
}

export function detectInstalledAgents(): SetupAgent[] {
  const detected = new Set<SetupAgent>();
  const home = process.env.HOME || process.env.USERPROFILE || "";

  if (
    fs.existsSync(path.join(home, ".claude")) ||
    fs.existsSync(path.join(home, ".claude.json"))
  ) {
    detected.add("claude");
  }
  if (
    fs.existsSync(path.join(home, ".gemini")) ||
    fs.existsSync(path.join(home, ".antigravity"))
  ) {
    detected.add("antigravity");
  }
  if (
    fs.existsSync(path.join(home, ".codex")) ||
    fs.existsSync(path.join(home, ".agents"))
  ) {
    detected.add("codex");
  }

  return detected.size > 0
    ? Array.from(detected)
    : ["claude", "codex", "antigravity"];
}

export interface UninstallResult {
  cleanedInstructions: string[];
  removedSkills: string[];
  cleanedRules?: string[];
  preservedSkills?: string[];
}

export function uninstallProject(options: {
  cwd: string;
  dryRun?: boolean;
}): UninstallResult {
  validateSkillOwnership(options.cwd);
  const action = () => uninstallProjectFiles(options);
  return options.dryRun
    ? action()
    : runProjectOperationSync(options.cwd, "uninstall", action).value;
}

function uninstallProjectFiles(options: {
  cwd: string;
  dryRun?: boolean;
}): UninstallResult {
  const owned = removeOwnedSkillFiles(options.cwd, options.dryRun);
  const cleanedInstructions: string[] = [];
  const removedSkills: string[] = [];
  const cleanedRules: string[] = [];
  const preservedSkills = new Set<string>();
  const candidateDirectories = new Set<string>();
  const skillDirectory = (file: string): string => {
    const parts = path.normalize(file).split(path.sep);
    let index = -1;
    for (let i = 0; i < parts.length - 1; i++)
      if (parts[i].startsWith("helen-")) index = i;
    return parts.slice(0, index + 1).join(path.sep);
  };
  for (const file of owned.removed)
    candidateDirectories.add(skillDirectory(file));
  for (const file of owned.preserved) preservedSkills.add(skillDirectory(file));
  const preservedOwnedFiles = new Set(
    owned.preserved.map((file) => path.normalize(file)),
  );
  const plannedRemovedFiles = new Set(
    owned.removed.map((file) => path.normalize(file)),
  );

  for (const file of ["AGENTS.md", "CLAUDE.md"]) {
    const full = path.join(options.cwd, file);
    if (fs.existsSync(full) && isSafeProjectPath(options.cwd, full)) {
      const content = fs.readFileSync(full, "utf-8");
      const updated = removeBlock(content);
      if (updated === content) continue;
      if (!options.dryRun) {
        if (!updated.trim()) {
          removeTrackedFile(full);
        } else {
          writeAtomicFile(full, updated);
        }
      }
      cleanedInstructions.push(file);
    }
  }

  const rulesDir = path.join(options.cwd, ".agents", "rules");
  if (fs.existsSync(rulesDir) && isSafeProjectPath(options.cwd, rulesDir)) {
    for (const file of ["security.md", "quality.md", "design.md"]) {
      const full = path.join(rulesDir, file);
      if (
        fs.existsSync(full) &&
        isSafeProjectPath(options.cwd, full) &&
        fs.lstatSync(full).isFile()
      ) {
        const content = fs.readFileSync(full, "utf-8");
        const updated = removeBlock(content);
        if (updated === content) continue;
        if (!options.dryRun) {
          if (!updated.trim()) {
            removeTrackedFile(full);
          } else {
            writeAtomicFile(full, updated);
          }
        }
        cleanedRules.push(`.agents/rules/${file}`);
      }
    }
    if (!options.dryRun) {
      try {
        if (fs.readdirSync(rulesDir).length === 0) fs.rmdirSync(rulesDir);
      } catch {
        /* ignore */
      }
    }
  }

  const skillDirs = [
    path.join(options.cwd, ".claude", "skills"),
    path.join(options.cwd, ".agents", "skills"),
  ];

  const knownSkills = [
    ...listSkills(),
    ...listFlowSkills(),
    ...listPresetSkills(),
  ];
  for (const dir of skillDirs) {
    if (fs.existsSync(dir) && isSafeProjectPath(options.cwd, dir)) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory() && entry.name.startsWith("helen-")) {
          const skillPath = path.join(dir, entry.name);
          if (!isSafeProjectPath(options.cwd, skillPath)) continue;
          // Older installations have no manifest: recognize exact bundled bytes,
          // never infer ownership from a folder name or delete a whole directory.
          const known = knownSkills.find((skill) => skill.name === entry.name);
          let removed = false;
          if (known)
            for (const [relative, content] of Object.entries(
              skillFiles(known),
            )) {
              const full = path.join(skillPath, relative);
              const projectRelative = path.relative(options.cwd, full);
              if (
                preservedOwnedFiles.has(projectRelative) ||
                !isSafeProjectPath(options.cwd, full) ||
                !fs.existsSync(full) ||
                !fs.lstatSync(full).isFile()
              )
                continue;
              if (fs.readFileSync(full, "utf8") !== content) continue;
              if (!options.dryRun) removeTrackedFile(full);
              plannedRemovedFiles.add(path.normalize(projectRelative));
              removed = true;
            }
          const relativeSkillPath = path.relative(options.cwd, skillPath);
          if (!removed && !candidateDirectories.has(relativeSkillPath)) {
            preservedSkills.add(relativeSkillPath);
            continue;
          }
          if (removed) candidateDirectories.add(relativeSkillPath);
          const inspection = inspectSkillTree(
            options.cwd,
            skillPath,
            plannedRemovedFiles,
          );
          if (!options.dryRun)
            removeEmptyDirectories(options.cwd, inspection.emptyDirectories);
          if (!inspection.hasRemaining)
            candidateDirectories.add(relativeSkillPath);
          else preservedSkills.add(relativeSkillPath);
        }
      }
    }
  }

  for (const relative of candidateDirectories) {
    const full = path.join(options.cwd, relative);
    if (
      !fs.existsSync(full) ||
      !inspectSkillTree(options.cwd, full, plannedRemovedFiles).hasRemaining
    )
      removedSkills.push(relative);
  }
  return {
    cleanedInstructions,
    removedSkills,
    cleanedRules,
    preservedSkills: [...preservedSkills],
  };
}

function inspectSkillTree(
  cwd: string,
  directory: string,
  plannedRemovedFiles: Set<string>,
): { hasRemaining: boolean; emptyDirectories: string[] } {
  const emptyDirectories: string[] = [];
  const inspect = (current: string): boolean => {
    let stat: fs.Stats;
    try {
      stat = fs.lstatSync(current);
    } catch {
      return true;
    }
    if (
      stat.isSymbolicLink() ||
      !stat.isDirectory() ||
      !isSafeProjectPath(cwd, current)
    )
      return true;
    let remaining = false;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, entry.name);
      let childStat: fs.Stats;
      try {
        childStat = fs.lstatSync(child);
      } catch {
        remaining = true;
        continue;
      }
      if (childStat.isSymbolicLink()) {
        remaining = true;
        continue;
      }
      if (childStat.isDirectory()) {
        if (inspect(child)) remaining = true;
      } else if (
        !plannedRemovedFiles.has(path.normalize(path.relative(cwd, child)))
      ) {
        remaining = true;
      }
    }
    if (!remaining) emptyDirectories.push(current);
    return remaining;
  };
  return { hasRemaining: inspect(directory), emptyDirectories };
}

function removeEmptyDirectories(cwd: string, directories: string[]): void {
  for (const directory of directories.sort((a, b) => b.length - a.length)) {
    try {
      const stat = fs.lstatSync(directory);
      if (
        !stat.isDirectory() ||
        stat.isSymbolicLink() ||
        !isSafeProjectPath(cwd, directory) ||
        fs.readdirSync(directory).length !== 0
      )
        continue;
      fs.rmdirSync(directory);
    } catch {
      /* preserve directories that changed or cannot be removed safely */
    }
  }
}

export function setupProject(
  options: SetupOptions & { global?: boolean },
): SetupResult {
  validateSkillOwnership(options.cwd);
  if (options.preset && options.preset !== "efficient")
    throw new Error("Unknown preset. Valid: efficient");
  if (options.preset && options.global)
    throw new Error("The efficient preset is project-only; omit --global.");
  if (
    options.global &&
    (options.agents.includes("claude") ||
      options.agents.includes("antigravity") ||
      options.agents.includes("codex"))
  ) {
    const home = process.env.HOME || process.env.USERPROFILE;
    if (!home)
      throw new Error("Global installation requires HOME or USERPROFILE.");
    validateSkillOwnership(home);
    if (!options.dryRun) {
      assertProjectOperationAvailable(options.cwd);
      try {
        assertProjectOperationAvailable(home);
      } catch (error) {
        throw new Error(
          `Global skill directory ${home}: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }
    }
  }
  const action = () => setupProjectFiles(options);
  if (options.dryRun) return action();
  if (
    options.global &&
    (options.agents.includes("claude") ||
      options.agents.includes("antigravity") ||
      options.agents.includes("codex"))
  ) {
    const home = process.env.HOME || process.env.USERPROFILE!;
    try {
      // Acquire both roots before installing files. The explicit nested global
      // scope below joins this journal, so action failures preserve both journals.
      return runProjectOperationSync(
        home,
        "setup:global",
        () =>
          runProjectOperationSync(options.cwd, "setup", action, undefined, {
            independent: true,
          }).value,
        undefined,
        { independent: true },
      ).value;
    } catch (error) {
      throw new Error(
        `Global skill directory ${home}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }
  return runProjectOperationSync(options.cwd, "setup", action).value;
}

function setupProjectFiles(
  options: SetupOptions & { global?: boolean },
): SetupResult {
  const preset = options.preset
    ? installAgentPreset({
        cwd: options.cwd,
        agents: options.agents,
        dryRun: options.dryRun,
      })
    : undefined;
  const targets = options.agents as SkillTarget[];
  const skills = installSkills({
    cwd: options.cwd,
    targets,
    flows: options.flows,
    dryRun: options.dryRun,
    force: options.force,
  });

  if (options.global) {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    const installGlobal = () => {
      for (const [agent, directory] of [
        ["claude", ".claude/skills"],
        ["antigravity", ".gemini/config/skills"],
        ["codex", ".codex/skills"],
      ] as const) {
        if (!options.agents.includes(agent)) continue;
        const globalSkills = installSkills({
          cwd: home,
          targets: ["custom"],
          customDir: directory,
          flows: options.flows,
          dryRun: options.dryRun,
          force: options.force,
        });
        for (const outcome of ["created", "overwritten", "skipped"] as const)
          skills[outcome].push(
            ...globalSkills[outcome].map((file) => path.join(home, file)),
          );
      }
    };
    if (
      options.agents.includes("claude") ||
      options.agents.includes("antigravity") ||
      options.agents.includes("codex")
    ) {
      if (options.dryRun) installGlobal();
      else {
        try {
          runProjectOperationSync(
            home,
            "setup:global",
            installGlobal,
            undefined,
            { independent: true },
          );
        } catch (error) {
          throw new Error(
            `Global skill directory ${home}: ${error instanceof Error ? error.message : String(error)}`,
            { cause: error },
          );
        }
      }
    }
  }

  const requestedFiles = ["AGENTS.md"];
  if (options.agents.includes("claude")) requestedFiles.push("CLAUDE.md");
  const instructionFiles: string[] = [];

  for (const file of requestedFiles) {
    const target = path.join(options.cwd, file);
    if (!isSafeProjectPath(options.cwd, target)) continue;
    const existing = fs.existsSync(target)
      ? fs.readFileSync(target, "utf-8")
      : null;
    const updated = upsertBlock(existing, helenBlock());
    if (
      existing === updated ||
      writeFileSafe(target, updated, {
        dryRun: options.dryRun,
        force: true,
        root: options.cwd,
      }) !== "skipped"
    ) {
      instructionFiles.push(file);
    }
  }

  if (
    options.agents.includes("antigravity") ||
    options.agents.includes("codex")
  ) {
    installAntigravityRules(options.cwd, options.dryRun);
  }

  return { skills, instructionFiles, ...(preset ? { preset } : {}) };
}
