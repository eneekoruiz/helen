import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  startJob,
  resumeJob,
  stopJob,
  listJobs,
  getJob,
  jobLogs,
  runJobAttempt,
} from "../src/core/jobs.js";
import { handleToolCall } from "../src/core/mcp.js";
import type { JobRuntime, RuntimeOutcome } from "../src/core/jobTypes.js";

describe("bounded background jobs", () => {
  let cwd: string;
  const noLaunch = async (): Promise<void> => {};
  const completed: RuntimeOutcome = {
    status: "completed",
    result: {
      status: "completed",
      summary: "Reviewed the supplied evidence.",
      question: null,
      options: [],
    },
  };
  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "helen-jobs-"));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(cwd, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  });
  const start = (extra = {}) =>
    startJob(
      {
        cwd,
        provider: "codex",
        prompt: "Review package.json",
        subscriptionOnly: true,
        codexCreditsUnavailable: true,
        ...extra,
      },
      noLaunch,
    );
  const token = (directory: string) =>
    JSON.parse(fs.readFileSync(path.join(directory, "input.json"), "utf8"))
      .nonce as string;
  const run = (id: string, runtime: JobRuntime) => {
    const job = getJob(cwd, id);
    return runJobAttempt(
      cwd,
      id,
      job.state.attempt,
      token(job.logDirectory),
      runtime,
    );
  };

  it("rejects unsupported providers, billing modes and bounds before writing metadata", async () => {
    for (const extra of [
      { subscriptionOnly: false },
      { codexCreditsUnavailable: false },
      { provider: "other" },
      { provider: "claude" },
      { maxMinutes: 0 },
      { maxCalls: 21 },
      { maxTurns: 101 },
      { prompt: " " },
    ])
      await expect(start(extra)).rejects.toThrow();
    expect(fs.existsSync(path.join(cwd, ".helen"))).toBe(false);
    expect(listJobs(cwd)).toEqual({ jobs: [], errors: [] });
  });

  it("persists a task and validated result without touching project files or checkpoints", async () => {
    const file = path.join(cwd, "package.json");
    fs.writeFileSync(file, '{"name":"fixture"}');
    const job = await start();
    const definition = fs.readFileSync(
      path.join(path.dirname(job.logDirectory), "job.json"),
      "utf8",
    );
    const runtime = vi.fn<JobRuntime>(async (request) => {
      expect(request.prompt).toContain("read-only research/review");
      expect(request.prompt).toContain("Do not edit files, run commands");
      expect(request.maxMinutes).toBe(30);
      return completed;
    });
    await run(job.definition.id, runtime);
    expect(getJob(cwd, job.definition.id).state).toMatchObject(completed);
    expect(runtime).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync(file, "utf8")).toBe('{"name":"fixture"}');
    expect(fs.existsSync(path.join(cwd, ".helen", "progress.json"))).toBe(
      false,
    );
    expect(
      fs.readFileSync(
        path.join(path.dirname(job.logDirectory), "job.json"),
        "utf8",
      ),
    ).toBe(definition);
    expect(
      fs.readFileSync(path.join(cwd, ".helen", "jobs", ".gitignore"), "utf8"),
    ).toBe("*\n");
  });

  it("rejects a JSON-escaped prompt exceeding the metadata byte bound before writing", async () => {
    await expect(start({ prompt: "\u0001".repeat(60000) })).rejects.toThrow(
      /Oversized/,
    );
    expect(fs.existsSync(path.join(cwd, ".helen"))).toBe(false);
  });

  it("fails safely if cancellation metadata becomes unreadable while a provider runs", async () => {
    const job = await start();
    await run(job.definition.id, async (request) => {
      fs.writeFileSync(path.join(job.logDirectory, "stop.json"), "corrupt");
      expect(request.cancelled()).toBe(true);
      return { status: "stopped", error: "Persistence interrupted" };
    });
    expect(getJob(cwd, job.definition.id).state.status).toBe("failed");
  });

  it("pauses for an actual answer and requires an explicit budget extension", async () => {
    const job = await start();
    await run(job.definition.id, async () => ({
      status: "needs_input",
      result: {
        status: "needs_input",
        summary: "Audience is missing.",
        question: "Who is the audience?",
        options: ["Developers", "Clients"],
      },
    }));
    const firstState = fs.readFileSync(
      path.join(job.logDirectory, "state.json"),
      "utf8",
    );
    await expect(
      resumeJob(cwd, job.definition.id, {}, noLaunch),
    ).rejects.toThrow(/Answer/);
    await expect(
      resumeJob(cwd, job.definition.id, { answer: "Clients" }, noLaunch),
    ).rejects.toThrow(/budget exhausted/);
    const resumed = await resumeJob(
      cwd,
      job.definition.id,
      { answer: "Clients", maxCalls: 2 },
      noLaunch,
    );
    expect(resumed.state.attempt).toBe(2);
    await run(job.definition.id, async (request) => {
      expect(request.prompt).toContain("Audience is missing.");
      expect(request.prompt).toContain("Current user answer:\nClients");
      return completed;
    });
    expect(
      fs.readFileSync(path.join(job.logDirectory, "state.json"), "utf8"),
    ).toBe(firstState);
    await expect(
      resumeJob(cwd, job.definition.id, { maxCalls: 3 }, noLaunch),
    ).rejects.toThrow(/already completed/);
  });

  it("does not launch a model after a queued cancellation", async () => {
    const job = await start();
    expect(stopJob(cwd, job.definition.id).stopRequested).toBe(true);
    expect(stopJob(cwd, job.definition.id).stopRequested).toBe(true);
    const runtime = vi.fn<JobRuntime>(async () => completed);
    await run(job.definition.id, runtime);
    expect(runtime).not.toHaveBeenCalled();
    expect(getJob(cwd, job.definition.id).state.status).toBe("stopped");
  });

  it("lets only one worker claim an attempt and propagates running cancellation", async () => {
    const job = await start();
    let finish!: (result: RuntimeOutcome) => void;
    const runtime = vi.fn<JobRuntime>(
      (request) =>
        new Promise((resolve) => {
          finish = (result) => {
            expect(request.cancelled()).toBe(true);
            resolve(result);
          };
        }),
    );
    const pending = run(job.definition.id, runtime);
    await expect(run(job.definition.id, runtime)).rejects.toThrow(
      /already started/,
    );
    stopJob(cwd, job.definition.id);
    finish({ status: "stopped", error: "Cancelled" });
    await pending;
    expect(runtime).toHaveBeenCalledTimes(1);
    expect(getJob(cwd, job.definition.id).state.status).toBe("stopped");
    await expect(run(job.definition.id, runtime)).rejects.toThrow(
      /already started/,
    );
  });

  it("does not publish completion if cancellation wins the final publication race", async () => {
    const job = await start();
    await run(job.definition.id, async () => {
      stopJob(cwd, job.definition.id);
      return completed;
    });
    expect(getJob(cwd, job.definition.id).state.status).toBe("stopped");
  });

  it("records provider blocks, timeouts and malformed completion honestly", async () => {
    for (const outcome of [
      { status: "blocked", error: "Subscription auth unavailable" },
      { status: "timed_out", error: "Deadline" },
      { status: "completed" },
      {
        status: "completed",
        result: {
          status: "completed",
          summary: " ",
          question: null,
          options: [],
        },
      },
    ] as RuntimeOutcome[]) {
      const job = await start();
      await run(job.definition.id, async () => outcome);
      const state = getJob(cwd, job.definition.id).state;
      expect(state.status).toBe(
        outcome.status === "completed" ? "failed" : outcome.status,
      );
      expect(state.error).toBeTruthy();
    }
  });

  it("reports an exited worker without killing a recorded PID and can resume", async () => {
    const job = await start();
    fs.writeFileSync(
      path.join(job.logDirectory, "state.json"),
      JSON.stringify({
        attempt: 1,
        status: "running",
        updatedAt: new Date().toISOString(),
        workerPid: 2147483647,
      }),
    );
    const kill = vi.spyOn(process, "kill");
    expect(getJob(cwd, job.definition.id).state.status).toBe("interrupted");
    stopJob(cwd, job.definition.id);
    expect(kill.mock.calls.every((call) => call[1] === 0)).toBe(true);
    expect(
      (await resumeJob(cwd, job.definition.id, { maxCalls: 2 }, noLaunch)).state
        .attempt,
    ).toBe(2);
  });

  it("recovers a launch interrupted before its input file was written", async () => {
    const job = await start();
    fs.unlinkSync(path.join(job.logDirectory, "input.json"));
    expect(getJob(cwd, job.definition.id).state.status).toBe("interrupted");
    await resumeJob(cwd, job.definition.id, { maxCalls: 2 }, noLaunch);
    await run(job.definition.id, async (request) => {
      expect(request.prompt).toContain("Previous attempt context");
      return completed;
    });
    expect(getJob(cwd, job.definition.id).state.status).toBe("completed");
  });

  it("tracks a launched worker before its first state write and validates its token", async () => {
    const job = await start();
    fs.writeFileSync(
      path.join(job.logDirectory, "state.json"),
      JSON.stringify({
        attempt: 1,
        status: "queued",
        updatedAt: new Date(Date.now() - 60000).toISOString(),
      }),
    );
    fs.writeFileSync(
      path.join(job.logDirectory, "worker.json"),
      JSON.stringify({
        nonce: token(job.logDirectory),
        workerPid: process.pid,
      }),
    );
    expect(getJob(cwd, job.definition.id).state).toMatchObject({
      status: "queued",
      workerPid: process.pid,
    });
    await expect(
      resumeJob(cwd, job.definition.id, { maxCalls: 2 }, noLaunch),
    ).rejects.toThrow(/active/);
    fs.writeFileSync(
      path.join(job.logDirectory, "worker.json"),
      JSON.stringify({
        nonce: "00000000-0000-4000-8000-000000000000",
        workerPid: process.pid,
      }),
    );
    expect(() => getJob(cwd, job.definition.id)).toThrow(/Mismatched/);
  });

  it("arbitrates competing continuations and preserves earlier attempt records", async () => {
    const job = await start({ maxCalls: 2 });
    await run(job.definition.id, async () => ({
      status: "failed",
      error: "Evidence unavailable",
    }));
    const firstState = fs.readFileSync(
      path.join(job.logDirectory, "state.json"),
      "utf8",
    );
    const launches = vi.fn(noLaunch);
    const results = await Promise.allSettled([
      resumeJob(cwd, job.definition.id, {}, launches),
      resumeJob(cwd, job.definition.id, {}, launches),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(launches).toHaveBeenCalledTimes(1);
    expect(
      fs.readFileSync(path.join(job.logDirectory, "state.json"), "utf8"),
    ).toBe(firstState);
  });

  it("surfaces launcher failure and corrupt records without hiding other tasks", async () => {
    const job = await start();
    await expect(
      startJob(
        {
          cwd,
          provider: "codex",
          prompt: "Read",
          subscriptionOnly: true,
          codexCreditsUnavailable: true,
        },
        async () => {
          throw new Error("Worker unavailable");
        },
      ),
    ).rejects.toThrow(/unavailable/);
    expect(
      listJobs(cwd).jobs.some((view) => view.state.status === "failed"),
    ).toBe(true);
    fs.writeFileSync(path.join(job.logDirectory, "state.json"), "corrupt");
    const listing = listJobs(cwd);
    expect(listing.jobs).toHaveLength(1);
    expect(listing.errors[0].id).toBe(job.definition.id);
    expect(() => getJob(cwd, "../../outside")).toThrow();
  });

  it("refuses linked storage and linked logs rather than following them", async () => {
    const outside = fs.mkdtempSync(
      path.join(os.tmpdir(), "helen-job-outside-"),
    );
    try {
      fs.mkdirSync(path.join(cwd, ".helen"));
      fs.symlinkSync(
        outside,
        path.join(cwd, ".helen", "jobs"),
        process.platform === "win32" ? "junction" : "dir",
      );
      await expect(start()).rejects.toThrow(/Unsafe/);
      expect(fs.readdirSync(outside)).toEqual([]);
      fs.unlinkSync(path.join(cwd, ".helen", "jobs"));
      const job = await start();
      fs.symlinkSync(
        outside,
        path.join(job.logDirectory, "worker.log"),
        process.platform === "win32" ? "junction" : "dir",
      );
      expect(() => jobLogs(cwd, job.definition.id)).toThrow(/Unsafe/);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it("MCP exposes pending native questions and refuses guesses or billing ambiguity", async () => {
    const job = await start();
    await run(job.definition.id, async () => ({
      status: "needs_input",
      result: {
        status: "needs_input",
        summary: "Need scope",
        question: "Which audience?",
        options: ["Developers", "Clients"],
      },
    }));
    const shown = await handleToolCall("helen_job_show", {
      cwd,
      id: job.definition.id,
    });
    expect(JSON.parse(shown.content[0].text).state.result.question).toBe(
      "Which audience?",
    );
    expect(
      (await handleToolCall("helen_job_resume", { cwd, id: job.definition.id }))
        .isError,
    ).toBe(true);
    expect(
      (
        await handleToolCall("helen_job_start", {
          cwd,
          provider: "claude",
          prompt: "Read",
          subscriptionOnly: true,
        })
      ).isError,
    ).toBe(true);
    expect(
      (
        await handleToolCall("helen_job_start", {
          cwd,
          provider: "codex",
          prompt: "Read",
          subscriptionOnly: "true",
        })
      ).isError,
    ).toBe(true);
    const listed = await handleToolCall("helen_jobs_list", { cwd });
    expect(JSON.parse(listed.content[0].text).jobs).toHaveLength(1);
  });

  it("a production detached worker completes after its launching Node process exits", async () => {
    const moduleUrl = pathToFileURL(path.resolve("dist/core/jobs.js")).href;
    const worker = path.join(cwd, "controlled-worker.mjs");
    fs.writeFileSync(
      worker,
      `import { runJobAttempt } from ${JSON.stringify(moduleUrl)};
      const [cwd,id,attempt,nonce] = process.argv.slice(2);
      if (process.cwd() === cwd || process.env.NODE_OPTIONS || process.env.UNRELATED_API_TOKEN)
        throw new Error('Worker must start from the package with a clean environment');
      await runJobAttempt(cwd,id,Number(attempt),nonce, async () => {
        await new Promise(resolve => setTimeout(resolve,1200));
        return ${JSON.stringify(completed)};
      });`,
    );
    const parent = path.join(cwd, "launcher.mjs");
    fs.writeFileSync(
      parent,
      `import fs from 'node:fs';
      import { startJob, launchJobWorker } from ${JSON.stringify(moduleUrl)};
      process.env.NODE_OPTIONS = '--require missing-helen-test-preload';
      process.env.UNRELATED_API_TOKEN = 'test-only-value';
      const job = await startJob({cwd:process.argv[2],provider:'codex',prompt:'Read',subscriptionOnly:true,codexCreditsUnavailable:true},
        (cwd,id,input) => launchJobWorker(cwd,id,input,${JSON.stringify(worker)}));
      fs.writeFileSync(${JSON.stringify(path.join(cwd, "launched.json"))},JSON.stringify({id:job.definition.id,pid:process.pid}));`,
    );
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, [parent, cwd], {
        windowsHide: true,
        stdio: ["ignore", "ignore", "pipe"],
      });
      let error = "";
      child.stderr.on("data", (chunk) => {
        error += String(chunk);
      });
      child.once("error", reject);
      child.once("exit", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(error || `Launcher exited ${code}`)),
      );
    });
    const { id, pid } = JSON.parse(
      fs.readFileSync(path.join(cwd, "launched.json"), "utf8"),
    );
    expect(() => process.kill(pid, 0)).toThrow();
    // Startup may contend with other native subprocesses; this is a survival check,
    // not a ten-second startup SLA. Stay within the suite's 45-second budget.
    const deadline = Date.now() + 30000;
    let view = getJob(cwd, id);
    while (
      (view.state.status === "queued" || view.state.status === "running") &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      view = getJob(cwd, id);
    }
    expect(
      view.state.status,
      JSON.stringify({ state: view.state, logs: jobLogs(cwd, id) }),
    ).toBe("completed");
    expect(view.state.workerPid).not.toBe(pid);
    // Windows holds the worker's cwd/log handles until process exit, even after
    // its completed state is durable. Verify shutdown before deleting the fixture.
    let alive = true;
    while (alive && Date.now() < deadline) {
      try {
        process.kill(view.state.workerPid!, 0);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ESRCH") alive = false;
        else throw error;
      }
      if (alive) await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(alive, "Detached worker must exit after saving its result").toBe(
      false,
    );
  });
});
