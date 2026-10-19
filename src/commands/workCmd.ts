import fs from "node:fs";
import { Command } from "commander";
import { z } from "zod";
import { isJsonMode, printJsonAndExit } from "../core/jsonOutput.js";
import {
  workspaceAction,
  readWorkspace,
  summarizeWorkspace,
  readyTasks,
  getFeature,
  captureFeatureGate,
  retrieveLearnings,
  defaultCreativeKit,
} from "../core/workspace.js";
import { prepareWorkBrief, recommendAgent } from "../core/workBrief.js";
import { buildTaskContext } from "../core/codeMap.js";
import { inspectCapabilities, CAPABILITY_NAMES } from "../core/capabilities.js";
import {
  recordOutcome,
  readOutcomes,
  summarizeOutcomes,
} from "../core/outcomes.js";

async function output(
  name: string,
  action: () => unknown | Promise<unknown>,
): Promise<void> {
  try {
    const data = await action();
    const failed =
      name === "work check" && (data as { ok?: boolean }).ok === false;
    if (isJsonMode())
      printJsonAndExit(name, data, { ok: !failed, exitCode: failed ? 1 : 0 });
    else {
      console.log(
        typeof data === "string" ? data : JSON.stringify(data, null, 2),
      );
      if (failed) process.exitCode = 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isJsonMode())
      printJsonAndExit(name, {}, { ok: false, errors: [message], exitCode: 1 });
    else {
      console.error(message);
      process.exitCode = 1;
    }
  }
}
function inputFile(location: string): unknown {
  const info = fs.statSync(location);
  if (!info.isFile() || info.size > 256000)
    throw new Error("Input must be a JSON file below 256KB");
  return JSON.parse(fs.readFileSync(location, "utf8"));
}
export function registerWorkCommands(program: Command): void {
  const outcomes = program
    .command("outcomes")
    .description(
      "Append outcome evidence and compare quality, time and measured consumption",
    );
  outcomes
    .command("record")
    .requiredOption(
      "--input <file>",
      "Versioned outcome JSON; unknown telemetry must be null",
    )
    .action((opts) =>
      output("outcomes record", () =>
        recordOutcome(process.cwd(), inputFile(opts.input)),
      ),
    );
  outcomes
    .command("report")
    .action(() =>
      output("outcomes report", () =>
        summarizeOutcomes(readOutcomes(process.cwd())),
      ),
    );
  const work = program
    .command("work")
    .description(
      "Persistent feature scope, decisions, dependent tasks and verified handoffs",
    );
  work
    .command("create <id>")
    .requiredOption("--title <title>", "Feature name")
    .requiredOption("--goal <text>", "Authorized outcome")
    .option("--exclude <texts...>", "Explicit scope exclusions")
    .option("--files <paths...>", "Relevant project-relative files")
    .option("--profile <profile>", "quick, standard or exhaustive", "standard")
    .action((id, opts) =>
      output("work create", () =>
        workspaceAction(process.cwd(), "create", {
          data: {
            id,
            title: opts.title,
            goal: opts.goal,
            exclusions: opts.exclude ?? [],
            files: opts.files ?? [],
            profile: opts.profile,
          },
        }),
      ),
    );
  work
    .command("list")
    .action(() => output("work list", () => summarizeWorkspace(process.cwd())));
  work
    .command("show <id>")
    .action((id) => output("work show", () => getFeature(process.cwd(), id)));
  work
    .command("route [id]")
    .description(
      "Diagnose providers before a handoff; only verified abilities can justify a recommendation",
    )
    .option(
      "--needs <capabilities...>",
      "read, write, exec, browser, mcp, nativeQuestions",
      ["read"],
    )
    .option(
      "--codex-credits-unavailable",
      "Human-confirmed zero credits/reload off",
      false,
    )
    .option(
      "--claude-extra-usage-disabled",
      "Human-confirmed extra usage off",
      false,
    )
    .action((id, opts) =>
      output("work route", async () => {
        const needs = z
          .array(z.enum(CAPABILITY_NAMES))
          .min(1)
          .max(6)
          .parse(opts.needs);
        const parent = id ? getFeature(process.cwd(), id) : undefined;
        const report = await inspectCapabilities({
          cwd: process.cwd(),
          billing: {
            codexCreditsUnavailable: opts.codexCreditsUnavailable,
            claudeExtraUsageDisabled: opts.claudeExtraUsageDisabled,
          },
        });
        return {
          feature: parent?.id ?? null,
          requiredCapabilities: needs,
          recommendation: recommendAgent(report, needs),
          report,
          modelCalls: 0,
          note: "Read-only diagnosis does not exercise model tools. Use a trusted runtime/UI bridge to verify actual abilities before an automatic handoff; no model or cheaper-price claim is made.",
        };
      }),
    );
  work
    .command("ready")
    .action(() => output("work ready", () => readyTasks(process.cwd())));
  work
    .command("plan <id>")
    .option("--kind <kind>", "fix, feature or migration", "feature")
    .action((id, opts) =>
      output("work plan", () =>
        workspaceAction(process.cwd(), "plan", {
          id,
          data: { kind: opts.kind },
        }),
      ),
    );
  work
    .command("record <action> [id]")
    .requiredOption("--input <file>", "Structured action data from a JSON file")
    .option("--expect-revision <revision>", "Reject concurrent stale updates")
    .action((action, id, opts) =>
      output("work record", () =>
        workspaceAction(process.cwd(), action, {
          id,
          data: inputFile(opts.input),
          expectedRevision: opts.expectRevision,
        }),
      ),
    );
  work
    .command("brief <id>")
    .option("--task <task>", "Prepare one specific task")
    .option("--agent <agent>", "codex, claude or antigravity")
    .option(
      "--include-source",
      "Explicitly include bounded eligible source text",
      false,
    )
    .option("--max-characters <number>", "Maximum brief characters", "48000")
    .action((id, opts) =>
      output("work brief", async () => {
        const brief = await prepareWorkBrief(process.cwd(), id, {
          task: opts.task,
          agent: opts.agent,
          includeSource: opts.includeSource,
          maxCharacters: Number(opts.maxCharacters),
        });
        return isJsonMode() ? brief : brief.text;
      }),
    );
  work
    .command("check <id> <task>")
    .description(
      "Execute the project's declared quality scripts; record an observed gate for this feature task",
    )
    .action((id, task) =>
      output("work check", () => {
        const gate = captureFeatureGate(process.cwd(), id, task);
        if (!gate.ok) process.exitCode = 1;
        return gate;
      }),
    );
  program
    .command("context")
    .description(
      "Prepare bounded task-specific dependency context without running project code",
    )
    .option("--task <text>", "Task to select relevant modules")
    .option("--feature <id>", "Use recorded feature references")
    .option("--files <paths...>", "Explicit project source paths")
    .option(
      "--include-source",
      "Explicitly include source; private files are excluded",
      false,
    )
    .option("--max-files <number>", "File selection bound", "12")
    .action((opts) =>
      output("context", () => {
        const parent = opts.feature
          ? getFeature(process.cwd(), opts.feature)
          : undefined;
        return buildTaskContext(process.cwd(), {
          task: opts.task ?? parent?.goal,
          paths: opts.files ?? parent?.files,
          includeSource: opts.includeSource,
          maxFiles: Number(opts.maxFiles),
        });
      }),
    );
  program
    .command("capabilities")
    .description(
      "Read-only native capability diagnosis; no model calls or project edits",
    )
    .option("--provider <provider>", "codex or claude; default both")
    .option(
      "--codex-credits-unavailable",
      "Human-confirmed zero credits/reload off",
      false,
    )
    .option(
      "--claude-extra-usage-disabled",
      "Human-confirmed extra usage off",
      false,
    )
    .action((opts) =>
      output("capabilities", () =>
        inspectCapabilities({
          cwd: process.cwd(),
          ...(opts.provider
            ? { providers: [z.enum(["codex", "claude"]).parse(opts.provider)] }
            : {}),
          billing: {
            codexCreditsUnavailable: opts.codexCreditsUnavailable,
            claudeExtraUsageDisabled: opts.claudeExtraUsageDisabled,
          },
        }),
      ),
    );
  const knowledge = program
    .command("knowledge")
    .description("Conditional, sourced project learnings");
  knowledge
    .command("record")
    .requiredOption(
      "--input <file>",
      "Learning data with applicability and evidence",
    )
    .action((opts) =>
      output("knowledge record", () =>
        workspaceAction(process.cwd(), "learning", {
          data: inputFile(opts.input),
        }),
      ),
    );
  knowledge
    .command("search [query]")
    .option("--paths <paths...>", "Task paths for applicability")
    .option("--tags <tags...>", "Task tags for applicability")
    .action((query, opts) =>
      output("knowledge search", () =>
        retrieveLearnings(process.cwd(), {
          query,
          paths: opts.paths,
          tags: opts.tags,
        }),
      ),
    );
  knowledge
    .command("retire <id>")
    .action((id) =>
      output("knowledge retire", () =>
        workspaceAction(process.cwd(), "retire-learning", { data: { id } }),
      ),
    );
  const creative = program
    .command("creative")
    .description("Shared direction for web, presentations, copy and documents");
  creative
    .command("show")
    .action(() =>
      output(
        "creative show",
        () => readWorkspace(process.cwd())?.creativeKit ?? null,
      ),
    );
  creative.command("init").action(() =>
    output("creative init", () => {
      if (readWorkspace(process.cwd())?.creativeKit)
        throw new Error(
          "Creative kit exists; review it before an explicit set",
        );
      return workspaceAction(process.cwd(), "creative-init", {
        data: defaultCreativeKit(),
      });
    }),
  );
  creative
    .command("set")
    .requiredOption("--input <file>", "Creative direction JSON")
    .option("--expect-revision <revision>", "Reject stale concurrent updates")
    .action((opts) =>
      output("creative set", () =>
        workspaceAction(process.cwd(), "creative", {
          data: inputFile(opts.input),
          expectedRevision: opts.expectRevision,
        }),
      ),
    );
}
