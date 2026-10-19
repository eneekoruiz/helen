import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { jobProviderSchema } from "../core/jobTypes.js";
import {
  startJob,
  listJobs,
  getJob,
  resumeJob,
  stopJob,
  jobLogs,
} from "../core/jobs.js";
import { isJsonMode, printJsonAndExit } from "../core/jsonOutput.js";

async function output(
  command: string,
  action: () => unknown | Promise<unknown>,
): Promise<void> {
  try {
    const data = await action();
    if (isJsonMode()) printJsonAndExit(command, data);
    else console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isJsonMode())
      printJsonAndExit(
        command,
        {},
        { ok: false, errors: [message], exitCode: 1 },
      );
    else throw error;
  }
}
export function registerJobsCommands(program: Command): void {
  const jobs = program
    .command("jobs")
    .description(
      "Run bounded local read-only AI tasks independently of the CLI window",
    );
  jobs
    .command("start [prompt]")
    .requiredOption(
      "--provider <provider>",
      "Subscription-authenticated codex or claude",
    )
    .option("--prompt-file <file>", "Read the task from a UTF-8 text file")
    .option(
      "--subscription-only",
      "Require included subscription authentication; no API fallback",
      false,
    )
    .option(
      "--claude-extra-usage-disabled",
      "Confirm Claude extra usage is disabled in your account",
      false,
    )
    .option("--max-minutes <minutes>", "Maximum time per attempt (1–240)", "30")
    .option(
      "--codex-credits-unavailable",
      "Confirm Codex has no usage credits available and automatic reload is off",
      false,
    )
    .option(
      "--max-calls <calls>",
      "Maximum attempts, including explicit continuations (1–20)",
      "1",
    )
    .option(
      "--max-turns <turns>",
      "Claude native turn cap; Codex uses time/output bounds (1–100)",
      "12",
    )
    .action((prompt: string | undefined, opts) =>
      output("jobs start", async () => {
        if (Boolean(prompt) === Boolean(opts.promptFile))
          throw new Error("Supply either a prompt or --prompt-file");
        let text = prompt;
        if (opts.promptFile) {
          const file = path.resolve(opts.promptFile);
          if (!fs.statSync(file).isFile() || fs.statSync(file).size > 240000)
            throw new Error(
              "Prompt file must be a regular text file below 240KB",
            );
          text = fs.readFileSync(file, "utf8");
        }
        return startJob({
          cwd: process.cwd(),
          provider: jobProviderSchema.parse(opts.provider),
          prompt: text!,
          subscriptionOnly: opts.subscriptionOnly,
          claudeExtraUsageDisabled: opts.claudeExtraUsageDisabled,
          codexCreditsUnavailable: opts.codexCreditsUnavailable,
          maxMinutes: Number(opts.maxMinutes),
          maxCalls: Number(opts.maxCalls),
          maxTurns: Number(opts.maxTurns),
        });
      }),
    );
  jobs
    .command("list")
    .description("List tasks and record errors without launching a model")
    .action(() => output("jobs list", () => listJobs(process.cwd())));
  jobs
    .command("show <id>")
    .description("Read task status, result and any pending question")
    .action((id: string) =>
      output("jobs show", () => getJob(process.cwd(), id)),
    );
  jobs
    .command("logs <id>")
    .description("Read the last 64KB of each local log")
    .action((id: string) =>
      output("jobs logs", () => jobLogs(process.cwd(), id)),
    );
  jobs
    .command("stop <id>")
    .description(
      "Request cancellation; the live worker terminates its own child",
    )
    .action((id: string) =>
      output("jobs stop", () => stopJob(process.cwd(), id)),
    );
  jobs
    .command("resume <id>")
    .description(
      "Explicitly launch a new bounded attempt with the recorded task/context",
    )
    .option("--answer <text>", "Answer the task's pending question")
    .option(
      "--max-calls <calls>",
      "Explicitly extend the attempt budget (maximum 20)",
    )
    .action((id: string, opts) =>
      output("jobs resume", () =>
        resumeJob(process.cwd(), id, {
          answer: opts.answer,
          maxCalls:
            opts.maxCalls === undefined ? undefined : Number(opts.maxCalls),
        }),
      ),
    );
}
