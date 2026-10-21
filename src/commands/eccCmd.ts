import { Command } from "commander";
import { z } from "zod";
import { configureEcc, eccStatus, nativeEccCommands } from "../core/ecc.js";
import { installNativeEcc, launchEcc } from "../core/eccRuntime.js";
import { isJsonMode, printJsonAndExit } from "../core/jsonOutput.js";

const targetSchema = z.enum(["claude", "codex"]);
function output(command: string, data: unknown): void {
  if (isJsonMode()) printJsonAndExit(command, data);
  else console.log(JSON.stringify(data, null, 2));
}

export function registerEccCommands(program: Command): void {
  const ecc = program
    .command("ecc")
    .description(
      "Integrate the original ECC plugin without copying its skills or runtime",
    );
  ecc
    .command("setup")
    .description(
      "Configure project catalogs and HELEN routing, pinned to an upstream commit",
    )
    .option(
      "--ref <commit>",
      "Exact 40-character upstream commit (also used to update the pin)",
    )
    .action((options) =>
      output("ecc setup", configureEcc(process.cwd(), { ref: options.ref })),
    );
  ecc
    .command("status")
    .description(
      "Show the configured upstream version and native installation commands",
    )
    .action(() =>
      output("ecc status", {
        ...eccStatus(process.cwd()),
        nativeInstallation:
          "Not inspected; configuration alone does not prove plugin installation or activation",
        claude: nativeEccCommands(process.cwd(), "claude"),
        codex: nativeEccCommands(process.cwd(), "codex"),
      }),
    );
  ecc
    .command("install")
    .description(
      "Install the original plugin through the chosen native CLI; no model calls",
    )
    .requiredOption(
      "--target <target>",
      "claude (project scope) or codex (active CODEX_HOME)",
    )
    .option(
      "--dry-run",
      "Show the original native commands without executing them",
      false,
    )
    .action(async (options) => {
      const target = targetSchema.parse(options.target);
      if (options.dryRun)
        output("ecc install", {
          target,
          commands: nativeEccCommands(process.cwd(), target),
        });
      else {
        if (isJsonMode())
          throw new Error(
            "Native plugin administration uses its own output; use --dry-run with --json or install without --json",
          );
        output("ecc install", await installNativeEcc(process.cwd(), target));
      }
    });
  ecc
    .command("launch [goal]")
    .description(
      "Explicitly start an interactive native session with allowlisted ECC .env controls",
    )
    .requiredOption("--target <target>", "claude or codex")
    .action(async (goal, options) => {
      if (isJsonMode())
        throw new Error("An interactive session cannot use HELEN --json");
      await launchEcc(process.cwd(), targetSchema.parse(options.target), goal);
    });
}
