#!/usr/bin/env node

import { logger } from "./core/logger.js";
import {
  isJsonMode,
  printJsonAndExit,
  setJsonMode,
} from "./core/jsonOutput.js";
import { Command, CommanderError } from "commander";

process.on("unhandledRejection", (err) => {
  logger.error("Fatal: Unhandled promise rejection");
  console.error(err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error("Fatal: Uncaught exception");
  console.error(err);
  process.exit(1);
});

// Native MCP clients need only the protocol server, not the interactive CLI,
// module registry and menus. Keep full argument validation for other invocations.
if (process.argv.length === 3 && process.argv[2] === "mcp") {
  const { startMcpServer } = await import("./core/mcp.js");
  startMcpServer(process.stdin, process.stdout);
} else {
  await runCli();
}

async function runCli(): Promise<void> {
  const { createProgram } = await import("./index.js");
  const program = createProgram();
  if (process.argv.includes("--json")) {
    setJsonMode(true);
    const overrideExits = (command: Command): void => {
      command.exitOverride();
      command.commands.forEach(overrideExits);
    };
    overrideExits(program);
  }
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    if (err instanceof CommanderError && err.exitCode === 0) {
      process.exitCode = 0;
    } else {
      const message = err instanceof Error ? err.message : String(err);
      if (isJsonMode()) {
        printJsonAndExit(
          program.args[0] ?? "root",
          {},
          { ok: false, errors: [message], exitCode: 1 },
        );
      } else {
        logger.error(message);
        process.exitCode = 1;
      }
    }
  }
}
