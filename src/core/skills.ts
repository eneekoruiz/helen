import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSafe } from "./fs.js";
import { listPromptEntries, readPromptEntry } from "./prompts.js";
import { parseFrontmatter } from "./frontmatter.js";
import {
  recordOwnedSkillFiles,
  validateSkillOwnership,
} from "./skillOwnership.js";
import { runProjectOperationSync } from "./operations.js";

/**
 * Skills are folders containing a SKILL.md. Known targets map an agent to the
 * project-relative directory it scans; any other agent uses the generic
 * `custom` target with an explicit directory.
 */
export const SKILL_TARGETS = {
  claude: ".claude/skills",
  codex: ".agents/skills",
  // Google's Antigravity codelab documents <project-root>/.agents/skills/ for workspace skills,
  // the same folder Codex reads. Older material mentions .agent/skills: use `custom --dir` for that.
  antigravity: ".agents/skills",
} as const;

export type SkillTarget = keyof typeof SKILL_TARGETS | "custom";

export interface SkillInfo {
  name: string;
  /** Source directory for bundled skills; absent for generated ones. */
  dir?: string;
  /** In-memory files (relative path -> content) for generated skills. */
  files?: Record<string, string>;
  /** Origin of the skill */
  sourceType?: "bundled" | "local-ecc" | "agent-global";
}

export interface InstallSkillsOptions {
  cwd: string;
  targets: SkillTarget[];
  /** Project-relative directory for the `custom` target. */
  customDir?: string;
  skills?: string[];
  /** Also install executable prompt flows as `helen-flow-<id>` skills. */
  flows?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

export interface InstallSkillsResult {
  created: string[];
  overwritten: string[];
  skipped: string[];
}

const SKILLS_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "skills",
);

export function getSkillsRoot(): string {
  return SKILLS_ROOT;
}

export function listSkills(root: string = SKILLS_ROOT): SkillInfo[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        fs.existsSync(path.join(root, entry.name, "SKILL.md")),
    )
    .map((entry): SkillInfo => ({
      name: entry.name,
      dir: path.join(root, entry.name),
      sourceType: "bundled",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Discovers local skill roots across the ECC clone and global agent environments
 * (Claude, Codex, Antigravity/Gemini).
 */
export function getLocalSkillsRoots(): string[] {
  const roots: string[] = [];
  const home = process.env.HOME || process.env.USERPROFILE || "";

  if (
    process.env.HELEN_LOCAL_SKILLS_PATH &&
    fs.existsSync(process.env.HELEN_LOCAL_SKILLS_PATH)
  ) {
    roots.push(path.resolve(process.env.HELEN_LOCAL_SKILLS_PATH));
  }
  if (
    process.env.ECC_SKILLS_PATH &&
    fs.existsSync(process.env.ECC_SKILLS_PATH)
  ) {
    roots.push(path.resolve(process.env.ECC_SKILLS_PATH));
  }

  const localEcc = path.join(
    "C:",
    "Users",
    "User",
    "Desktop",
    "ENEKO",
    "ECC",
    "skills",
  );
  if (
    fs.existsSync(localEcc) &&
    !roots.some((r) => r.toLowerCase() === path.resolve(localEcc).toLowerCase())
  ) {
    roots.push(path.resolve(localEcc));
  }

  const agentRoots = [
    path.join(home, ".gemini", "config", "skills"),
    path.join(home, ".claude", "skills"),
    path.join(home, ".codex", "skills"),
  ];
  for (const agentRoot of agentRoots) {
    if (
      fs.existsSync(agentRoot) &&
      !roots.some(
        (r) => r.toLowerCase() === path.resolve(agentRoot).toLowerCase(),
      )
    ) {
      roots.push(path.resolve(agentRoot));
    }
  }

  return roots;
}

/**
 * Returns available skills from the local ECC repo and agent installations.
 */
export function listLocalSkills(): SkillInfo[] {
  const roots = getLocalSkillsRoots();
  const map = new Map<string, SkillInfo>();

  for (const root of roots) {
    const isEcc = root.toLowerCase().includes("ecc");
    for (const skill of listSkills(root)) {
      if (!map.has(skill.name)) {
        map.set(skill.name, {
          ...skill,
          sourceType: isEcc ? "local-ecc" : "agent-global",
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Returns all skills: bundled HELEN skills, local ECC skills, and agent global skills.
 */
export function listAllSkills(root: string = SKILLS_ROOT): SkillInfo[] {
  const bundled = listSkills(root).map((s) => ({
    ...s,
    sourceType: "bundled" as const,
  }));
  const bundledNames = new Set(bundled.map((s) => s.name));
  const local = listLocalSkills().filter((s) => !bundledNames.has(s.name));
  return [...bundled, ...local].sort((a, b) => a.name.localeCompare(b.name));
}

function firstMatch(content: string, pattern: RegExp): string | undefined {
  return pattern.exec(content)?.[1]?.replace(/\s+/g, " ").trim();
}

/**
 * Turns each executable prompt flow into a skill so agents can invoke it by
 * name. The flow body is embedded; its step links are rewritten to
 * `helen prompts show <id>` hints so the skill stays self-contained.
 */
export function listFlowSkills(): SkillInfo[] {
  return listPromptEntries()
    .filter((entry) => entry.kind === "flow")
    .map((entry): SkillInfo => {
      const raw = readPromptEntry(entry, { cacheReady: true });
      const body = raw
        .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n+/, "")
        .replace(
          /\[([^\]]+)\]\(([^)]+\.md)\)/g,
          (_match, label: string, target: string) => {
            const stem = decodeURIComponent(target)
              .split("/")
              .at(-1)!
              .replace(/\.md$/i, "")
              .toLowerCase();
            return `${label} (\`helen prompts show ${stem} --no-protocol\`)`;
          },
        );
      const objective =
        entry.summary ||
        firstMatch(body, /## Goal\s+([^\n]+(?:\n(?!#)[^\n]+)*)/) ||
        entry.title;
      const slug = entry.id
        .split("/")
        .at(-1)!
        .replace(/^(apply|audit|generate|plan|research|init|enhance)-/, "")
        .replace(/-flow$/, "");
      const name = `helen-flow-${slug}`;
      const description = `Use to run the HELEN "${slug}" flow. ${objective}`
        .replace(/\s+/g, " ")
        .slice(0, 500);
      const skill =
        `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n\n` +
        `> Steps below omit the shared rules embedded here. Print them with \`helen prompts show <id> --no-protocol\` (list ids with \`helen prompts list\`). A new specialist must receive the shared contract or use default exports until it has loaded it.\n\n${body}`;
      return { name, files: { "SKILL.md": skill } };
    });
}

function walkFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

export function skillFiles(skill: SkillInfo): Record<string, string> {
  if (skill.files) return skill.files;
  const dir = skill.dir!;
  return Object.fromEntries(
    walkFiles(dir).map((file) => [
      path.relative(dir, file),
      fs.readFileSync(file, "utf-8"),
    ]),
  );
}

export function resolveTargetDir(
  target: SkillTarget,
  customDir?: string,
): string {
  if (target !== "custom") return SKILL_TARGETS[target];
  if (!customDir) {
    throw new Error(
      'The "custom" target requires --dir <project-relative directory>.',
    );
  }
  const normalized = path.normalize(customDir);
  if (
    path.isAbsolute(normalized) ||
    normalized.split(path.sep).includes("..")
  ) {
    throw new Error(
      `--dir must be a relative path inside the project: ${customDir}`,
    );
  }
  return normalized;
}

export function installSkills(
  options: InstallSkillsOptions,
  root: string = SKILLS_ROOT,
): InstallSkillsResult {
  validateSkillOwnership(options.cwd);
  const available = [
    ...listSkills(root),
    ...(options.flows ? listFlowSkills() : []),
  ];
  const selected = options.skills?.length
    ? options.skills.map((name) => {
        const found = available.find((skill) => skill.name === name);
        if (!found)
          throw new Error(
            `Skill "${name}" not found. Available: ${available.map((s) => s.name).join(", ") || "none"}`,
          );
        return found;
      })
    : available;

  // Several agents can share a folder (codex and antigravity): write each folder once.
  const targetDirs = new Set(
    options.targets.map((target) =>
      resolveTargetDir(target, options.customDir),
    ),
  );
  const action = () => installSelectedSkills(options, selected, targetDirs);
  return options.dryRun
    ? action()
    : runProjectOperationSync(options.cwd, "skills:install", action).value;
}

function installSelectedSkills(
  options: InstallSkillsOptions,
  selected: SkillInfo[],
  targetDirs: Set<string>,
): InstallSkillsResult {
  const result: InstallSkillsResult = {
    created: [],
    overwritten: [],
    skipped: [],
  };
  const ownedFiles: Record<string, string> = {};

  for (const targetDir of targetDirs) {
    for (const skill of selected) {
      for (const [relative, content] of Object.entries(skillFiles(skill))) {
        const destination = path.join(
          options.cwd,
          targetDir,
          skill.name,
          relative,
        );
        const outcome = writeFileSafe(destination, content, {
          dryRun: options.dryRun,
          force: options.force,
          root: options.cwd,
        });
        result[outcome].push(path.relative(options.cwd, destination));
        if (outcome !== "skipped")
          ownedFiles[
            path.relative(options.cwd, destination).split(path.sep).join("/")
          ] = content;
      }
    }
  }

  recordOwnedSkillFiles(options.cwd, ownedFiles, options.dryRun);

  return result;
}

const SKILL_FRONTMATTER_FIELDS = new Set([
  "name",
  "description",
  "license",
  "allowed-tools",
  "metadata",
]);

/** Portable top-level fields and flat discovery checks; not a full YAML validator. */
export function validateSkills(root: string = SKILLS_ROOT): string[] {
  const issues: string[] = [];
  for (const skill of listSkills(root)) {
    const raw = fs.readFileSync(path.join(skill.dir!, "SKILL.md"), "utf-8");
    const { data, hasFrontmatter } = parseFrontmatter(raw);
    if (
      !hasFrontmatter ||
      typeof data.name !== "string" ||
      !data.name ||
      typeof data.description !== "string" ||
      !data.description
    ) {
      issues.push(
        `${skill.name}: SKILL.md must start with name and description frontmatter`,
      );
      continue;
    }
    for (const field of Object.keys(data)) {
      if (!SKILL_FRONTMATTER_FIELDS.has(field))
        issues.push(
          `${skill.name}: unsupported SKILL.md frontmatter field "${field}"${field === "version" ? "; preserve the version under metadata.version" : ""}`,
        );
    }
    const name = String(data.name);
    const desc = String(data.description);
    if (name !== skill.name)
      issues.push(`${skill.name}: name "${name}" does not match the folder`);
    if (desc.length > 1024)
      issues.push(`${skill.name}: description longer than 1024 characters`);
    if (desc.length < 80)
      issues.push(
        `${skill.name}: description too short to trigger reliably (under 80 characters)`,
      );
    if (raw.replace(/\r\n/g, "\n").split("\n").length > 500)
      issues.push(
        `${skill.name}: SKILL.md longer than 500 lines; move detail to references/`,
      );
  }
  return issues;
}
