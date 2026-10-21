import path from "node:path";
import fs from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import type { SpawnOptions } from "node:child_process";
import { nativeEccCommands, readEccEnvironment, eccStatus } from "./ecc.js";
import { subscriptionEnvironment } from "./jobRuntime.js";
import { isSafeProjectPath } from "./fs.js";

export type EccTarget = "claude" | "codex";
export interface EccInvocation {
  command: string;
  args: string[];
  options: SpawnOptions;
}
export type EccExecutor = (invocation: EccInvocation) => Promise<void>;

function executable(target: EccTarget, cwd: string): string {
  if (process.platform !== "win32") return target;
  const result = spawnSync(
    path.win32.join(
      process.env.SystemRoot ?? "C:\\Windows",
      "System32",
      "where.exe",
    ),
    [`$PATH:${target}.exe`],
    { encoding: "utf8", windowsHide: true, timeout: 5000 },
  );
  const file = result.stdout?.trim().split(/\r?\n/)[0];
  if (
    result.status !== 0 ||
    !file ||
    !path.isAbsolute(file) ||
    path.relative(path.resolve(cwd), path.dirname(file)) === ""
  )
    throw new Error(`Native ${target}.exe is unavailable on PATH`);
  return file;
}

const execute: EccExecutor = ({ command, args, options }) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${signal ?? code}`));
    });
  });

function environment(cwd: string): NodeJS.ProcessEnv {
  const config = readEccEnvironment(cwd);
  if (!config.enabled) throw new Error("ECC is disabled in HELEN_ECC_ENABLED");
  const instincts = path.join(config.dataHome, "homunculus");
  if (
    !isSafeProjectPath(cwd, instincts) ||
    (fs.existsSync(instincts) && !fs.lstatSync(instincts).isDirectory())
  )
    throw new Error("Unsafe ECC instinct data directory");
  return {
    ...subscriptionEnvironment(),
    ECC_HOOK_PROFILE: config.profile,
    ECC_AGENT_DATA_HOME: config.dataHome,
    CLV2_HOMUNCULUS_DIR: instincts,
  };
}

/** Native plugin administration only. Installing never launches a model. */
export async function installNativeEcc(
  cwd: string,
  target: EccTarget,
  executor: EccExecutor = execute,
): Promise<{ target: EccTarget; installed: true; restartRequired: true }> {
  if (!eccStatus(cwd).configured) throw new Error("Run helen ecc setup first");
  const env = environment(cwd);
  for (const command of nativeEccCommands(cwd, target)) {
    await executor({
      command: executor === execute ? executable(target, cwd) : command.command,
      args: command.args,
      options: { cwd, env, shell: false, windowsHide: true, stdio: "inherit" },
    });
  }
  return { target, installed: true, restartRequired: true };
}

/** Explicit interactive launch; original ECC assets are loaded by the native host. */
export async function launchEcc(
  cwd: string,
  target: EccTarget,
  goal?: string,
  executor: EccExecutor = execute,
): Promise<void> {
  if (!["claude", "codex"].includes(target))
    throw new Error("Invalid ECC target");
  if (!eccStatus(cwd).configured) throw new Error("Run helen ecc setup first");
  const env = environment(cwd);
  const args = goal
    ? [
        `Use HELEN to coordinate this task with relevant available ECC skills. ${goal}`,
      ]
    : [];
  await executor({
    command: executor === execute ? executable(target, cwd) : target,
    args,
    options: { cwd, env, shell: false, windowsHide: true, stdio: "inherit" },
  });
}
