import fs from "node:fs";
import { Command } from "commander";
import {
  listLoops,
  loopStatus,
  scoreLoop,
  startLoop,
  type ScoreInput,
} from "../core/loop.js";
import { getRubric, listRubrics } from "../core/rubrics.js";
import { agentName, handle } from "./teamCmd.js";

function readScores(opts: {
  file?: string;
  scores?: string;
}): Record<string, ScoreInput> {
  const raw =
    opts.file === "-"
      ? fs.readFileSync(0, "utf8")
      : opts.file
        ? fs.readFileSync(opts.file, "utf8")
        : opts.scores;
  if (!raw)
    throw new Error(
      'Pass the scores: --file <scores.json> (or - for stdin) or --scores \'{"criterion":{"score":4,"evidence":"..."}}\'',
    );
  try {
    return JSON.parse(raw) as Record<string, ScoreInput>;
  } catch (error) {
    throw new Error(
      `The scores are not valid JSON: ${(error as Error).message}`,
    );
  }
}

export function registerLoopCommands(program: Command): void {
  const loop = program
    .command("loop")
    .description(
      "Convergence loop: score work against a rubric with evidence until it really meets the bar, confirmed by a second agent",
    );

  loop
    .command("rubrics [name]")
    .description(
      "List the rubrics, or show every criterion of one with what to ask and what counts as evidence",
    )
    .action((name?: string) => {
      handle(
        "loop rubrics",
        () =>
          name
            ? getRubric(name)
            : {
                rubrics: listRubrics().map((rubric) => ({
                  id: rubric.id,
                  title: rubric.title,
                  threshold: rubric.threshold,
                  criteria: rubric.criteria.length,
                })),
              },
        (data) => {
          if (data.rubrics) {
            for (const rubric of data.rubrics)
              console.log(
                `${rubric.id.padEnd(10)} ${rubric.title}  (bar ${rubric.threshold}, ${rubric.criteria} criteria)`,
              );
            return;
          }
          console.log(
            `${data.title} - bar ${data.threshold}/100; critical criteria must score at least ${data.minCritical}/5\n${data.description}\n`,
          );
          for (const criterion of data.criteria) {
            console.log(
              `${criterion.id}  [weight ${criterion.weight}${criterion.critical ? ", critical" : ""}]  ${criterion.title}\n  Ask: ${criterion.ask}\n  Evidence: ${criterion.evidence}\n`,
            );
          }
        },
      );
    });

  loop
    .command("start <rubric>")
    .description("Open a loop for a piece of work")
    .requiredOption("--subject <text>", "What is being worked on")
    .option("--author <name>", "Who does the work (or HELEN_AGENT)")
    .option("--id <id>", "Loop id (default: <rubric>-<n>)")
    .option("--threshold <n>", "Raise the bar above the rubric default")
    .action(
      (
        rubric: string,
        opts: {
          subject: string;
          author?: string;
          id?: string;
          threshold?: string;
        },
      ) => {
        handle(
          "loop start",
          () =>
            startLoop(process.cwd(), {
              rubric,
              subject: opts.subject,
              author: agentName(opts.author),
              id: opts.id,
              threshold: opts.threshold ? Number(opts.threshold) : undefined,
            }),
          (header) =>
            console.log(
              `Loop ${header.id} opened (${header.rubric}, bar ${header.threshold}, up to ${header.maxIterations} rounds). See what to score: helen loop rubrics ${header.rubric}`,
            ),
        );
      },
    );

  loop
    .command("score <id>")
    .description(
      "Record a round: a 0-5 score with evidence for every criterion",
    )
    .option(
      "--scorer <name>",
      "Who scores (or HELEN_AGENT). The final round must come from someone other than the author.",
    )
    .option("--file <path>", "JSON file with the scores, or - for stdin")
    .option("--scores <json>", "The scores as JSON")
    .option(
      "--carry",
      "Reuse last round for criteria you did not re-examine (such a round cannot converge)",
      false,
    )
    .option("--next <text>", "What you will change next")
    .option("--notes <text>", "Anything the next scorer should know")
    .action(
      (
        id: string,
        opts: {
          scorer?: string;
          file?: string;
          scores?: string;
          carry: boolean;
          next?: string;
          notes?: string;
        },
      ) => {
        handle(
          "loop score",
          () =>
            scoreLoop(process.cwd(), id, {
              scorer: agentName(opts.scorer),
              scores: readScores(opts),
              carry: opts.carry,
              next: opts.next,
              notes: opts.notes,
            }),
          (result) => {
            console.log(
              `Round ${result.iteration}: ${result.total}/100${result.delta !== null ? ` (${result.delta >= 0 ? "+" : ""}${result.delta})` : ""}  verdict: ${result.verdict}`,
            );
            console.log(result.message);
            if (result.criticalFailing.length)
              console.log(
                `Critical below the minimum: ${result.criticalFailing.join(", ")}`,
              );
            for (const item of result.focus)
              console.log(
                `  - ${item.id} (${item.score}/5${item.critical ? ", critical" : ""}): ${item.ask}`,
              );
            if (result.verdict === "converged") process.exitCode = 0;
            else if (result.verdict === "exhausted") process.exitCode = 3;
          },
        );
      },
    );

  loop
    .command("status <id>")
    .description("Show the rounds so far and what is weakest")
    .action((id: string) => {
      handle(
        "loop status",
        () => loopStatus(process.cwd(), id),
        (status) => {
          console.log(
            `${status.header.id}: ${status.header.subject} (${status.header.rubric}, bar ${status.header.threshold}, author ${status.header.author})`,
          );
          for (const round of status.rounds)
            console.log(
              `  round ${round.iteration}  ${String(round.total).padStart(5)}  ${round.verdict.padEnd(24)} by ${round.scorer}${round.complete ? "" : " (carried)"}`,
            );
          console.log(
            status.converged
              ? "Converged."
              : status.weakest.length
                ? `Weakest: ${status.weakest.map((item: { id: string; score: number }) => `${item.id} ${item.score}/5`).join(", ")}`
                : "No rounds yet.",
          );
        },
      );
    });

  loop
    .command("list")
    .description("List the loops of this project")
    .action(() => {
      handle(
        "loop list",
        () => ({ loops: listLoops(process.cwd()) }),
        (data) => {
          if (data.loops.length === 0)
            console.log(
              'No loops yet. Start one: helen loop start <rubric> --subject "<what>"',
            );
          for (const entry of data.loops)
            console.log(
              `${entry.id.padEnd(16)} ${entry.rubric.padEnd(9)} ${String(entry.iterations).padStart(2)} round(s)  ${entry.total ?? "-"}  ${entry.verdict ?? "not scored"}  ${entry.subject}`,
            );
        },
      );
    });
}
