import { runJobAttempt } from "./core/jobs.js";

const [cwd, id, attempt, nonce] = process.argv.slice(2);
try {
  if (!cwd || !id || !attempt || !nonce)
    throw new Error("Invalid background worker arguments");
  await runJobAttempt(cwd, id, Number(attempt), nonce);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
