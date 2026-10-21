import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { describe, expect, it } from "vitest";

const runner = path.resolve("scripts/run-skill-evals.mjs");

function createEvalFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "helen-eval-resume-"));
  if (!path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep))
    throw new Error("Unsafe fixture cleanup target");
  fs.mkdirSync(path.join(dir, "scripts", "lib"), { recursive: true });
  fs.copyFileSync(runner, path.join(dir, "scripts", "run-skill-evals.mjs"));
  fs.cpSync(path.resolve("scripts/lib"), path.join(dir, "scripts/lib"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(dir, "skills", "helen-reprompt"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "skills/helen-reprompt/SKILL.md"),
    "# Fixture skill",
  );
  fs.mkdirSync(path.join(dir, "evals"));
  fs.writeFileSync(
    path.join(dir, "evals/helen-reprompt.json"),
    JSON.stringify({
      skill: "helen-reprompt",
      cases: [
        {
          id: "resume-case",
          prompt: "Answer with Verified.",
          criteria: ["Contains Verified"],
        },
      ],
    }),
  );
  fs.mkdirSync(path.join(dir, "docs"));
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  const counter = path.join(dir, "calls.log");
  const fixture = path.join(bin, "fixture.cjs");
  fs.writeFileSync(
    fixture,
    [
      "const fs=require('node:fs');",
      "const args=process.argv.slice(2);",
      "if(args[0]==='auth'){console.log(JSON.stringify({loggedIn:process.env.FIXTURE_AUTH_FAIL!=='1',authMethod:process.env.FIXTURE_AUTH_METHOD||'claude.ai'}));process.exit(0);}",
      "const file=" + JSON.stringify(counter) + ";",
      "fs.appendFileSync(file,'call\\n');",
      "if(process.env.FIXTURE_FAIL==='1'){process.stdin.resume();process.stdin.on('end',()=>{console.log(JSON.stringify({type:'result',is_error:true,result:\"You've hit your weekly limit\"}));process.exitCode=1;});}else{",
      "const input=[];process.stdin.on('data',d=>input.push(d));process.stdin.on('end',()=>{",
      "const respond=()=>{if(args.includes('stream-json')){const hasSkill=fs.existsSync(process.cwd()+'/.claude/skills/helen-reprompt/SKILL.md');if(hasSkill){console.log(JSON.stringify({type:'assistant',message:{content:[{type:'tool_use',name:'Skill',id:'skill-1',input:{skill:'helen-reprompt'}}]}}));console.log(JSON.stringify({type:'user',message:{content:[{type:'tool_result',tool_use_id:'skill-1',content:'Loaded'}]}}));}console.log(JSON.stringify({type:'result',result:'Verified'}));}else console.log(JSON.stringify({result:JSON.stringify({results:[{index:1,pass:true,note:'ok'}]})}));};",
      "if(process.env.FIXTURE_BARRIER_DIR){const wait=()=>fs.existsSync(process.env.FIXTURE_BARRIER_DIR+'/release')?respond():setTimeout(wait,10);wait();}else respond();",
      "});}",
    ].join("\n"),
  );
  if (process.platform === "win32") {
    fs.writeFileSync(
      path.join(bin, "claude.cmd"),
      '@"' + process.execPath + '" "' + fixture + '" %*\r\n',
    );
  } else {
    const executable = path.join(bin, "claude");
    fs.writeFileSync(
      executable,
      '#!/bin/sh\nexec "' + process.execPath + '" "' + fixture + '" "$@"\n',
    );
    fs.chmodSync(executable, 0o755);
  }
  const makeEnv = (fail, overrides = {}) => {
    const env = Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) => key.toUpperCase() !== "PATH",
      ),
    );
    env.PATH =
      bin + path.delimiter + (process.env.PATH ?? process.env.Path ?? "");
    if (fail) env.FIXTURE_FAIL = "1";
    Object.assign(env, overrides);
    return env;
  };
  const commandArgs = (runs, extraArgs = []) => [
    path.join(dir, "scripts/run-skill-evals.mjs"),
    "helen-reprompt",
    "--runs",
    String(runs),
    "--concurrency",
    "1",
    "--max-calls",
    "20",
    "--subscription-only",
    "--claude-extra-usage-disabled",
    ...extraArgs,
  ];
  const children = new Set();
  const run = (runs, extraArgs = [], fail = false, overrides = {}) =>
    spawnSync(process.execPath, commandArgs(runs, extraArgs), {
      encoding: "utf8",
      env: makeEnv(fail, overrides),
      timeout: 90_000,
    });
  const runAsync = (runs, extraArgs = [], overrides = {}) =>
    new Promise((resolve, reject) => {
      const child = spawn(process.execPath, commandArgs(runs, extraArgs), {
        env: makeEnv(false, overrides),
        windowsHide: true,
      });
      children.add(child);
      let stdout = "";
      let stderr = "";
      let settled = false;
      const timeout = setTimeout(() => {
        child.kill();
        finish({
          status: null,
          stdout,
          stderr: `${stderr}\nfixture child timed out`,
        });
      }, 30_000);
      const finish = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        children.delete(child);
        resolve(result);
      };
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
      child.on("error", (error) => {
        clearTimeout(timeout);
        children.delete(child);
        if (!settled) {
          settled = true;
          reject(error);
        }
      });
      child.on("close", (status) => finish({ status, stdout, stderr }));
    });
  const killChildren = () => {
    for (const child of children) child.kill();
  };
  return { dir, counter, run, runAsync, killChildren };
}

describe("Evaluation runner argument validation", () => {
  it("requires an explicit call budget for live evaluations", () => {
    const result = spawnSync(process.execPath, [runner, "helen-reprompt"], {
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Live evaluations require --max-calls");
    expect(result.stdout).not.toContain("Evaluating");
  });

  it("stops zero-budget live runs before authentication or any prompt call", () => {
    const result = spawnSync(
      process.execPath,
      [runner, "helen-reprompt", "--max-calls", "0"],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("No provider calls permitted");
    expect(result.stdout).not.toContain("Evaluating");
  });

  it("requires included-only account confirmation before authentication or prompt calls", () => {
    for (const flags of [[], ["--subscription-only"]]) {
      const result = spawnSync(
        process.execPath,
        [runner, "helen-reprompt", "--max-calls", "1", ...flags],
        { encoding: "utf8" },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        flags.length ? "--claude-extra-usage-disabled" : "--subscription-only",
      );
      expect(result.stdout).not.toContain("Evaluating");
    }
  });

  it("rejects API authentication without sending evaluation prompts", () => {
    const fixture = createEvalFixture();
    try {
      const result = fixture.run(1, [], false, {
        FIXTURE_AUTH_METHOD: "api_key",
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        "API/cloud authentication is unsupported",
      );
      expect(fs.existsSync(fixture.counter)).toBe(false);
    } finally {
      fs.rmSync(fixture.dir, { recursive: true, force: true });
    }
  });

  it("reports an actionable missing-provider preflight instead of repeated failed evaluations", () => {
    const env = Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) => key.toUpperCase() !== "PATH",
      ),
    );
    env.PATH = "";
    const result = spawnSync(
      process.execPath,
      [
        runner,
        "helen-reprompt",
        "--max-calls",
        "1",
        "--subscription-only",
        "--claude-extra-usage-disabled",
      ],
      { encoding: "utf8", env },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Evaluation preflight failed");
    expect(result.stderr).toContain("No evaluation prompts were sent");
    expect(result.stdout).not.toContain("Evaluating");
  });
  it("stops quota refusals after one invocation without calling a judge or retrying", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "helen-eval-fixture-"));
    if (!path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep))
      throw new Error("Unsafe fixture cleanup target");
    try {
      fs.mkdirSync(path.join(dir, "scripts", "lib"), { recursive: true });
      fs.copyFileSync(runner, path.join(dir, "scripts", "run-skill-evals.mjs"));
      fs.cpSync(path.resolve("scripts/lib"), path.join(dir, "scripts/lib"), {
        recursive: true,
      });
      fs.mkdirSync(path.join(dir, "skills", "helen-reprompt"), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(dir, "skills/helen-reprompt/SKILL.md"),
        "# Fixture",
      );
      fs.mkdirSync(path.join(dir, "evals"));
      fs.writeFileSync(
        path.join(dir, "evals/helen-reprompt.json"),
        JSON.stringify({
          skill: "helen-reprompt",
          cases: ["quota-first", "quota-second", "quota-third"].map((id) => ({
            id,
            prompt: "Answer in chat only.",
            criteria: ["Verified"],
          })),
        }),
      );
      fs.mkdirSync(path.join(dir, "docs"));
      const bin = path.join(dir, "bin");
      fs.mkdirSync(bin);
      const counter = path.join(dir, "calls.log");
      const fixture = path.join(bin, "fixture.cjs");
      fs.writeFileSync(
        fixture,
        [
          "const fs=require('node:fs');",
          "const args=process.argv.slice(2);",
          "if(args[0]==='auth'){console.log(JSON.stringify({loggedIn:true,authMethod:'claude.ai'}));process.exit(0);}",
          "const file=" + JSON.stringify(counter) + ";",
          "fs.appendFileSync(file,'call\\n');",
          "process.stdin.resume();process.stdin.on('end',()=>{console.log(JSON.stringify({type:'result',is_error:true,result:\"You've hit your weekly limit\"}));process.exitCode=1;});",
        ].join("\n"),
      );
      if (process.platform === "win32") {
        fs.writeFileSync(
          path.join(bin, "claude.cmd"),
          '@"' + process.execPath + '" "' + fixture + '" %*\r\n',
        );
      } else {
        const executable = path.join(bin, "claude");
        fs.writeFileSync(
          executable,
          '#!/bin/sh\nexec "' + process.execPath + '" "' + fixture + '" "$@"\n',
        );
        fs.chmodSync(executable, 0o755);
      }
      const env = Object.fromEntries(
        Object.entries(process.env).filter(
          ([key]) => key.toUpperCase() !== "PATH",
        ),
      );
      env.PATH =
        bin + path.delimiter + (process.env.PATH ?? process.env.Path ?? "");
      const result = spawnSync(
        process.execPath,
        [
          path.join(dir, "scripts/run-skill-evals.mjs"),
          "helen-reprompt",
          "--runs",
          "3",
          "--concurrency",
          "3",
          "--max-calls",
          "20",
          "--subscription-only",
          "--claude-extra-usage-disabled",
        ],
        { encoding: "utf8", env, timeout: 90_000 },
      );
      expect(result.status, result.stderr).toBe(1);
      expect(result.stderr).toContain("provider blocked (quota)");
      expect(fs.readFileSync(counter, "utf8").trim().split("\n")).toHaveLength(
        1,
      );
      const observations = JSON.parse(
        fs.readFileSync(
          path.join(dir, "evals/results/helen-reprompt.json"),
          "utf8",
        ),
      );
      expect(observations.cases[0].runs).toHaveLength(1);
      expect(observations.cases[0].baseline).toBeNull();
      expect(
        fs.readFileSync(path.join(dir, "docs/SKILLS_QUALITY.md"), "utf8"),
      ).toContain("UNMEASURED");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
  it("resumes only the missing valid pair and preserves prior observations when quota blocks the resumed run", () => {
    const fixture = createEvalFixture();
    try {
      const first = fixture.run(1);
      expect(first.status, first.stderr).toBe(0);
      const resultFile = path.join(
        fixture.dir,
        "evals/results/helen-reprompt.json",
      );
      const original = JSON.parse(fs.readFileSync(resultFile, "utf8")).cases[0]
        .runs[0];
      fs.writeFileSync(fixture.counter, "");

      const resumed = fixture.run(2, [], true);
      expect(resumed.status).toBe(1);
      expect(
        fs.readFileSync(fixture.counter, "utf8").trim().split("\n"),
      ).toHaveLength(1);
      const runs = JSON.parse(fs.readFileSync(resultFile, "utf8")).cases[0]
        .runs;
      expect(runs).toHaveLength(2);
      expect(runs[0]).toEqual(original);
      expect(runs.map((run) => run.run)).toEqual([1, 2]);
      expect(runs.filter((run) => run.baselineOk && run.skillOk)).toHaveLength(
        1,
      );
    } finally {
      fs.rmSync(fixture.dir, { recursive: true, force: true });
    }
  });
  it("invalidates resumed evidence when evaluator code changes and archives the old evidence", () => {
    const fixture = createEvalFixture();
    try {
      expect(fixture.run(1).status).toBe(0);
      const file = path.join(fixture.dir, "evals/results/helen-reprompt.json");
      const before = JSON.parse(fs.readFileSync(file, "utf8"));
      fs.appendFileSync(
        path.join(fixture.dir, "scripts/lib/evalChecks.mjs"),
        "\n// Changed evaluator version\n",
      );
      fs.writeFileSync(fixture.counter, "");
      const rerun = fixture.run(1);
      expect(rerun.status, rerun.stderr).toBe(0);
      expect(JSON.parse(fs.readFileSync(file, "utf8")).fingerprint).not.toBe(
        before.fingerprint,
      );
      expect(
        fs.readFileSync(fixture.counter, "utf8").trim().split("\n"),
      ).toHaveLength(4);
      const archives = fs.readdirSync(
        path.join(fixture.dir, "evals/results/archive"),
      );
      expect(archives).toHaveLength(1);
      expect(
        JSON.parse(
          fs.readFileSync(
            path.join(fixture.dir, "evals/results/archive", archives[0]),
            "utf8",
          ),
        ),
      ).toEqual(before);
    } finally {
      fs.rmSync(fixture.dir, { recursive: true, force: true });
    }
  });

  it("skips a completed same-model, same-fingerprint case without paid calls", () => {
    const fixture = createEvalFixture();
    try {
      expect(fixture.run(1).status).toBe(0);
      fs.writeFileSync(fixture.counter, "");
      const skipped = fixture.run(1);
      expect(skipped.status, skipped.stderr).toBe(0);
      expect(fs.readFileSync(fixture.counter, "utf8")).toBe("");
      expect(skipped.stdout).toContain("Skipping already completed case");
    } finally {
      fs.rmSync(fixture.dir, { recursive: true, force: true });
    }
  });
  it("excludes a concurrent live invocation before it can make duplicate paid calls", async () => {
    const fixture = createEvalFixture();
    let firstRun;
    let barrier;
    try {
      barrier = path.join(fixture.dir, "provider-barrier");
      fs.mkdirSync(barrier);
      firstRun = fixture.runAsync(1, [], { FIXTURE_BARRIER_DIR: barrier });
      const markerDeadline = Date.now() + 10_000;
      while (!fs.existsSync(fixture.counter) && Date.now() < markerDeadline)
        await new Promise((resolve) => setTimeout(resolve, 10));
      expect(fs.existsSync(fixture.counter)).toBe(true);
      const second = await fixture.runAsync(1);
      expect(second.status).toBe(1);
      const rejected = second;
      expect(rejected.stderr).toContain("Another live evaluation is using");
      expect(rejected.stderr).toContain(
        "confirm that PID is no longer running",
      );
      expect(
        fs.readFileSync(fixture.counter, "utf8").trim().split("\n"),
      ).toHaveLength(1);
      fs.writeFileSync(path.join(barrier, "release"), "go");
      const first = await firstRun;
      expect(first.status, first.stderr).toBe(0);
      expect(
        fs.readFileSync(fixture.counter, "utf8").trim().split("\n"),
      ).toHaveLength(4);
      expect(
        fs.existsSync(
          path.join(fixture.dir, "evals/results/.run-skill-evals.lock"),
        ),
      ).toBe(false);
    } finally {
      if (firstRun) {
        if (barrier) fs.writeFileSync(path.join(barrier, "release"), "go");
        await Promise.race([
          firstRun.catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 2_000)),
        ]);
        fixture.killChildren();
      }
      fs.rmSync(fixture.dir, { recursive: true, force: true });
    }
  });
  it("releases the live lock after auth failure and leaves dry-run and report-only unlocked", () => {
    const fixture = createEvalFixture();
    const lockFile = path.join(
      fixture.dir,
      "evals/results/.run-skill-evals.lock",
    );
    try {
      const unauthenticated = fixture.run(1, [], false, {
        FIXTURE_AUTH_FAIL: "1",
      });
      expect(unauthenticated.status).toBe(1);
      expect(unauthenticated.stderr).toContain("Evaluation preflight failed");
      expect(fs.existsSync(lockFile)).toBe(false);

      expect(fixture.run(1, ["--dry-run"]).status).toBe(0);
      expect(fs.existsSync(lockFile)).toBe(false);
      expect(fixture.run(1, ["--report-only"]).status).toBe(0);
      expect(fs.existsSync(lockFile)).toBe(false);
    } finally {
      fs.rmSync(fixture.dir, { recursive: true, force: true });
    }
  });
  it("--force archives displaced observations even when the fingerprint and model match", () => {
    const fixture = createEvalFixture();
    try {
      expect(fixture.run(1).status).toBe(0);
      const oldData = JSON.parse(
        fs.readFileSync(
          path.join(fixture.dir, "evals/results/helen-reprompt.json"),
          "utf8",
        ),
      );
      const forced = fixture.run(1, ["--force"]);
      expect(forced.status, forced.stderr).toBe(0);
      const archiveDir = path.join(fixture.dir, "evals/results/archive");
      const archives = fs.readdirSync(archiveDir);
      expect(archives).toHaveLength(1);
      expect(
        JSON.parse(fs.readFileSync(path.join(archiveDir, archives[0]), "utf8")),
      ).toEqual(oldData);
      const current = JSON.parse(
        fs.readFileSync(
          path.join(fixture.dir, "evals/results/helen-reprompt.json"),
          "utf8",
        ),
      );
      expect(current.cases[0].runs).toHaveLength(1);
      expect(current.cases[0].runs[0].run).toBe(1);
    } finally {
      fs.rmSync(fixture.dir, { recursive: true, force: true });
    }
  });
  it.each([
    ["missing-skill"],
    ["--rnus", "3"],
    ["--runs", "1", "--runs", "2"],
    ["helen-reprompt", "--cases", "missing-case"],
    ["--cases", ","],
  ])("rejects nonexistent selections or unknown options %j", (...args) => {
    const result = spawnSync(process.execPath, [runner, ...args, "--dry-run"], {
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Unknown|select at least one/);
    expect(result.stdout).not.toContain("Evaluating");
  });
  it.each([
    ["--runs", "NaN"],
    ["--concurrency", "0"],
    ["--max-calls", "-1"],
    ["--runs", "2garbage"],
    ["--runs"],
  ])("rejects invalid options %j before starting evaluations", (...args) => {
    const result = spawnSync(process.execPath, [runner, ...args, "--dry-run"], {
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/requires a value|must be an integer/);
    expect(result.stdout).not.toContain("Evaluating");
  });

  it("plans evaluation calls without invoking the provider", () => {
    const result = spawnSync(
      process.execPath,
      [
        runner,
        "helen-reprompt",
        "--runs",
        "1",
        "--max-calls",
        "0",
        "--dry-run",
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Total skills: 1");
    expect(result.stdout).toContain("Configured max budget: 0 calls");
  });

  it("uses corrected confidence intervals in the standalone runner too", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "import { studentTCriticalValue, pairedDeltaConfidenceInterval } from './scripts/lib/evalsStats.mjs'; console.log(JSON.stringify({ t: studentTCriticalValue(50), noise: pairedDeltaConfidenceInterval([0], [100]).isNoise }));",
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ t: 2.009, noise: true });
  });
  it("rejects empty statistics in the standalone runner rather than producing noise at zero", () => {
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "import { confidenceInterval95 } from './scripts/lib/evalsStats.mjs'; confidenceInterval95([]);",
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("require finite observations");
  });
});
