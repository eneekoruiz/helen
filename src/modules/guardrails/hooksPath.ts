import { spawnSync } from "node:child_process";
import path from "node:path";

export type HooksPathState = {
  kind: "unset" | "owned" | "custom";
  value?: string;
};

/** Read the effective value, including global configuration, without treating Git failures as unset. */
export function readHooksPath(cwd: string): HooksPathState {
  const result = spawnSync("git", ["config", "--get", "core.hooksPath"], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status === 1) return { kind: "unset" };
  if (result.status !== 0)
    throw new Error(
      result.stderr.trim() || "Unable to read git core.hooksPath",
    );
  const value = result.stdout.replace(/\r?\n$/, "");
  return {
    kind:
      value !== "" &&
      path.resolve(cwd, value) === path.resolve(cwd, ".githooks")
        ? "owned"
        : "custom",
    value,
  };
}

/** Only configure HELEN hooks when there is no other hook manager to replace. */
export function configureHelenHooksPath(
  cwd: string,
  dryRun = false,
): HooksPathState {
  const state = readHooksPath(cwd);
  if (state.kind !== "unset" || dryRun) return state;
  const root = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    timeout: 5000,
  });
  if (root.error) throw root.error;
  if (root.status !== 0 || path.relative(cwd, root.stdout.trim()) !== "")
    throw new Error("Activate HELEN hooks from the Git worktree root");
  const result = spawnSync(
    "git",
    ["config", "--local", "core.hooksPath", ".githooks"],
    {
      cwd,
      encoding: "utf8",
      windowsHide: true,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      result.stderr.trim() || "Unable to configure git core.hooksPath",
    );
  return state;
}

// This must run before dist/ exists during npm ci and when the package is installed without a Git checkout.
// Keep it dependency-free and portable across the Windows and POSIX package-script shells.
const prepareSource =
  "const {spawnSync}=require('node:child_process');const path=require('node:path');const opts={encoding:'utf8',windowsHide:true,timeout:5000};const root=spawnSync('git',['rev-parse','--show-toplevel'],opts);if(process.env.npm_config_ignore_scripts!=='true'&&root.status===0&&path.relative(process.cwd(),root.stdout.trim())===''){const current=spawnSync('git',['config','--get','core.hooksPath'],opts);const value=(current.stdout||'').replace(/\\r?\\n$/,'');if(current.status===1||(current.status===0&&value!==''&&path.resolve(value)===path.resolve('.githooks'))){const result=spawnSync('git',['config','--local','core.hooksPath','.githooks'],opts);if(result.error||result.status!==0){console.error(result.stderr||String(result.error));process.exitCode=1;}}}";
export const hooksPathPrepareScript = `node -e "${prepareSource}"`;
