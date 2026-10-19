#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prefix = "helen-installed-package-";
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Reject private state even when a future package files glob accidentally includes it. */
export function validatePackageFiles(files) {
  assert.ok(
    Array.isArray(files) && files.length > 0,
    "Empty package inventory",
  );
  for (const entry of files) {
    const name = typeof entry === "string" ? entry : entry.path;
    assert.equal(typeof name, "string", "Invalid package inventory entry");
    const parts = name.replaceAll("\\", "/").split("/");
    assert.ok(
      name &&
        !path.posix.isAbsolute(name) &&
        !/^[a-z]:/i.test(name) &&
        parts.every((part) => part && part !== "." && part !== ".."),
      `Unsafe package path: ${name}`,
    );
    assert.ok(
      !parts.some((part) =>
        /^(?:\.helen|\.helenrc(?:\.corrupt)?|\.git|\.codex|\.claude|\.agents|\.gemini|\.npmrc|\.netrc|\.ssh)$/i.test(
          part,
        ),
      ) &&
        !parts.some(
          (part) => /^\.env(?:$|\.)/i.test(part) && part !== ".env.example",
        ) &&
        !/\.(?:helen-backup|pem|key|p12|pfx)$/i.test(name) &&
        !/^(?:auth|credentials?|token|secrets?)(?:[.-].*)?\.json$/i.test(
          parts.at(-1),
        ),
      `Private state or authentication file in package: ${name}`,
    );
  }
}

/** Native clients need complete JSON schemas, including each array's item schema. */
export function validateMcpToolSchemas(tools) {
  assert.ok(Array.isArray(tools) && tools.length > 0, "Empty MCP inventory");
  const visit = (schema, label) => {
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) return;
    if (
      (Array.isArray(schema.type) ? schema.type : [schema.type]).includes(
        "array",
      )
    ) {
      assert.ok(
        schema.items &&
          typeof schema.items === "object" &&
          !Array.isArray(schema.items),
        `MCP array lacks a valid item schema: ${label}`,
      );
    }
    for (const [key, value] of Object.entries(schema)) {
      if (Array.isArray(value))
        value.forEach((entry, index) =>
          visit(entry, `${label}.${key}[${index}]`),
        );
      else if (value && typeof value === "object")
        visit(value, `${label}.${key}`);
    }
  };
  for (const tool of tools) {
    assert.equal(typeof tool.name, "string", "MCP tool lacks a name");
    assert.equal(
      tool.inputSchema?.type,
      "object",
      `MCP tool has an invalid input schema: ${tool.name}`,
    );
    visit(tool.inputSchema, tool.name);
  }
}

/** Cleanup is restricted to the exact mkdtemp directory owned by this run. */
export function assertOwnedTemporaryDirectory(
  directory,
  token,
  temporaryRoot = os.tmpdir(),
) {
  const resolved = path.resolve(directory);
  assert.equal(
    path.dirname(resolved),
    fs.realpathSync(temporaryRoot),
    "Cleanup target escaped the temporary root",
  );
  assert.ok(
    path.basename(resolved).startsWith(prefix),
    "Unexpected cleanup target name",
  );
  assert.ok(!fs.lstatSync(resolved).isSymbolicLink(), "Linked cleanup target");
  assert.equal(
    fs.realpathSync(resolved),
    resolved,
    "Cleanup target resolves elsewhere",
  );
  assert.equal(
    fs.readFileSync(
      path.join(resolved, ".helen-package-verification-owner"),
      "utf8",
    ),
    token,
    "Cleanup ownership token differs",
  );
  return resolved;
}

function npmCli() {
  const candidates = [
    process.env.npm_execpath,
    path.join(
      path.dirname(process.execPath),
      "node_modules/npm/bin/npm-cli.js",
    ),
  ];
  for (const directory of (process.env.PATH ?? process.env.Path ?? "").split(
    path.delimiter,
  )) {
    candidates.push(path.join(directory, "node_modules/npm/bin/npm-cli.js"));
    const executable = path.join(directory, "npm");
    if (fs.existsSync(executable)) candidates.push(fs.realpathSync(executable));
  }
  candidates.push(
    "/usr/share/nodejs/npm/bin/npm-cli.js",
    "/usr/local/lib/node_modules/npm/bin/npm-cli.js",
  );
  const found = candidates.find(
    (candidate) =>
      candidate &&
      path.isAbsolute(candidate) &&
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isFile() &&
      /npm(?:-cli)?\.js$/.test(candidate),
  );
  assert.ok(
    found,
    "Cannot locate npm-cli.js. Run through npm run verify:package or install Node with npm.",
  );
  return found;
}

function isolatedEnvironment(temporary) {
  const env = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (
      /^(?:PATH|PATHEXT|COMSPEC|SYSTEMROOT|SYSTEMDRIVE|WINDIR|OS|TEMP|TMP|TMPDIR|LANG|LANGUAGE|LC_[A-Z_]+|HTTP_PROXY|HTTPS_PROXY|ALL_PROXY|NO_PROXY|SSL_CERT_FILE|SSL_CERT_DIR)$/i.test(
        key,
      )
    )
      env[key] = value;
  }
  const home = path.join(temporary, "home");
  fs.mkdirSync(home);
  for (const key of [
    "HOME",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "CODEX_HOME",
    "CLAUDE_CONFIG_DIR",
    "XDG_CONFIG_HOME",
    "XDG_CACHE_HOME",
    "XDG_DATA_HOME",
  ])
    env[key] = path.join(home, key.toLowerCase());
  // npm reads an empty owned config; cached public dependencies remain reusable.
  env.HOME = home;
  env.USERPROFILE = home;
  for (const scope of ["user", "global"]) {
    const emptyConfig = path.join(temporary, `empty-${scope}.npmrc`);
    fs.writeFileSync(emptyConfig, "");
    env[`npm_config_${scope}config`] = emptyConfig;
  }
  const existingCache =
    process.env.npm_config_cache ??
    process.env.NPM_CONFIG_CACHE ??
    (process.platform === "win32"
      ? path.join(process.env.LOCALAPPDATA ?? os.homedir(), "npm-cache")
      : path.join(os.homedir(), ".npm"));
  env.npm_config_cache = existingCache;
  env.npm_config_registry = "https://registry.npmjs.org/";
  env.npm_config_ignore_scripts = "true";
  env.npm_config_audit = "false";
  env.npm_config_fund = "false";
  env.NO_COLOR = "1";
  return env;
}

function run(file, args, cwd, env, input = "", timeoutMs = 180000) {
  return new Promise((resolve) => {
    let stdout = "",
      stderr = "",
      error = null,
      timedOut = false,
      overflow = false;
    const started = Date.now();
    const child = spawn(file, args, {
      cwd,
      env,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    const collect = (which, chunk) => {
      if (which === "stdout") stdout += chunk;
      else stderr += chunk;
      if (stdout.length + stderr.length > 16 * 1024 * 1024) {
        overflow = true;
        child.kill();
      }
    };
    child.stdout.on("data", (chunk) => collect("stdout", chunk));
    child.stderr.on("data", (chunk) => collect("stderr", chunk));
    child.once("error", (caught) => {
      error = caught.message;
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      resolve({
        code,
        stdout,
        stderr,
        error,
        timedOut,
        overflow,
        durationMs: Date.now() - started,
      });
    });
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
}

export async function verifyPackage({ offline = false } = {}) {
  const startedAt = new Date().toISOString();
  const evidence = path.join(
    root,
    ".helen",
    "audit-results",
    `package-verification-${startedAt.replaceAll(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`,
  );
  fs.mkdirSync(evidence, { recursive: true });
  const report = {
    version: 1,
    startedAt,
    node: process.version,
    platform: process.platform,
    offline,
    modelCalls: 0,
    checks: [],
    commands: [],
    limitations: [
      "No live subscription/model invocation, generated-app build or hosted OS matrix is proved by this check.",
    ],
  };
  // This private sentinel must never appear in npm's published inventory.
  fs.writeFileSync(
    path.join(evidence, "auth-canary.json"),
    json({ privateFixture: true }),
  );
  const token = randomUUID();
  const temporary = fs.mkdtempSync(
    path.join(fs.realpathSync(os.tmpdir()), prefix),
  );
  fs.writeFileSync(
    path.join(temporary, ".helen-package-verification-owner"),
    token,
  );
  report.temporaryDirectory = temporary;
  let workerPid;
  let hookSettings;
  const check = async (name, action) => {
    const begin = Date.now();
    try {
      const detail = await action();
      report.checks.push({
        name,
        status: "passed",
        durationMs: Date.now() - begin,
        ...(detail ? { detail } : {}),
      });
      console.log(`PASS ${name}`);
      return detail;
    } catch (error) {
      report.checks.push({
        name,
        status: "failed",
        durationMs: Date.now() - begin,
        error: error.message,
      });
      throw error;
    }
  };
  const command = async (
    label,
    file,
    args,
    cwd,
    env,
    { code = 0, input = "" } = {},
  ) => {
    const result = await run(file, args, cwd, env, input);
    const log = `${String(report.commands.length + 1).padStart(2, "0")}-${label.replaceAll(/[^a-z0-9-]/gi, "-")}.json`;
    fs.writeFileSync(
      path.join(evidence, log),
      json({ file, args, cwd, ...result }),
    );
    report.commands.push({
      label,
      file,
      args,
      cwd,
      code: result.code,
      durationMs: result.durationMs,
      log,
    });
    assert.ok(
      !result.error && !result.timedOut && !result.overflow,
      `${label}: ${result.error ?? (result.timedOut ? "timed out" : "output overflow")}`,
    );
    assert.ok(
      (Array.isArray(code) ? code : [code]).includes(result.code),
      `${label} exited ${result.code}: ${result.stderr.slice(-5000)}`,
    );
    return result;
  };
  const snapshotHooks = async (stage) => {
    const settings = {};
    for (const scope of ["local", "global"]) {
      const result = await command(
        `git-${scope}-hooks-${stage}`,
        "git",
        ["config", `--${scope}`, "--get-all", "core.hooksPath"],
        root,
        process.env,
        { code: [0, 1] },
      );
      settings[scope] = { code: result.code, value: result.stdout };
    }
    return settings;
  };
  try {
    const npm = npmCli();
    hookSettings = await snapshotHooks("before");
    const env = isolatedEnvironment(temporary);
    const project = path.join(temporary, "project");
    fs.mkdirSync(project);
    fs.writeFileSync(
      path.join(project, "package.json"),
      json({
        name: "helen-installed-package-verification",
        private: true,
        type: "module",
      }),
    );
    const pack = await check(
      "pack real tarball without lifecycle hooks",
      async () => {
        const result = await command(
          "npm-pack",
          process.execPath,
          [
            npm,
            "pack",
            "--json",
            "--ignore-scripts",
            "--pack-destination",
            temporary,
          ],
          root,
          env,
        );
        const entries = JSON.parse(result.stdout);
        assert.equal(entries.length, 1);
        const manifest = entries[0];
        assert.equal(
          path.basename(manifest.filename),
          manifest.filename,
          "Tarball filename escapes its destination",
        );
        fs.writeFileSync(
          path.join(evidence, "pack-manifest.json"),
          json(manifest),
        );
        assert.equal(
          `sha512-${createHash("sha512")
            .update(fs.readFileSync(path.join(temporary, manifest.filename)))
            .digest("base64")}`,
          manifest.integrity,
          "Packed tarball bytes do not match npm's integrity",
        );
        return manifest;
      },
    );
    await check("exclude private state and include runtime/assets", () => {
      validatePackageFiles(pack.files);
      const names = new Set(pack.files.map((entry) => entry.path));
      for (const name of [
        "package.json",
        "dist/cli.js",
        "dist/index.js",
        "dist/backgroundWorker.js",
        "dist/core/jobs.js",
        "dist/core/jobRuntime.js",
        "dist/core/mcp.js",
        "dist/core/workspace.js",
        "dist/core/codeMap.js",
        "dist/core/capabilities.js",
        "dist/core/outcomes.js",
        "scripts/run-repo-evals.mjs",
        "scripts/run-specialty-evals.mjs",
        "scripts/import-specialty-outcomes.mjs",
        "scripts/review-specialty-rubric.mjs",
        "scripts/lib/repoEvalCases.mjs",
        "scripts/lib/specialtyEvalCases.mjs",
        "scripts/lib/specialtyRubricReview.mjs",
        "docs/FEATURE-WORK.md",
        "docs/OUTCOME-MEASUREMENT.md",
        "docs/prompts/RULES.md",
        "docs/prompts/playbooks.json",
        "skills/helen-apply/SKILL.md",
      ])
        assert.ok(names.has(name), `Required packaged file missing: ${name}`);
      assert.ok(
        pack.files.some((entry) => entry.path.startsWith("templates/")),
        "Scaffolding templates missing",
      );
      return { files: names.size, integrity: pack.integrity };
    });
    await check(
      "install tarball and normal dependencies in clean project",
      async () => {
        await command(
          "npm-install-tarball",
          process.execPath,
          [
            npm,
            "install",
            "--ignore-scripts",
            "--no-audit",
            "--no-fund",
            "--prefer-offline",
            ...(offline ? ["--offline"] : []),
            path.join(temporary, pack.filename),
          ],
          project,
          env,
        );
      },
    );
    const installed = path.join(project, "node_modules", "helen-cli");
    const packageInfo = JSON.parse(
      fs.readFileSync(path.join(installed, "package.json"), "utf8"),
    );
    const cli = path.join(installed, packageInfo.bin.helen);
    await check(
      "installed files match archive inventory outside checkout",
      () => {
        assert.ok(
          !fs.lstatSync(installed).isSymbolicLink(),
          "Tarball installation must not be a linked checkout",
        );
        assert.equal(fs.realpathSync(installed), installed);
        assert.ok(
          !path.relative(root, installed).startsWith(`node_modules${path.sep}`),
        );
        assert.equal(packageInfo.name, pack.name);
        assert.equal(packageInfo.version, pack.version);
        for (const file of pack.files) {
          const actual = path.join(installed, ...file.path.split("/"));
          assert.ok(
            fs.lstatSync(actual).isFile() &&
              !fs.lstatSync(actual).isSymbolicLink(),
            `Packaged file missing or linked: ${file.path}`,
          );
          assert.equal(
            fs.statSync(actual).size,
            file.size,
            `Installed file size differs: ${file.path}`,
          );
        }
        for (const alias of ["helen", "helen-cli"])
          assert.ok(
            fs.existsSync(
              path.join(
                project,
                "node_modules",
                ".bin",
                `${alias}${process.platform === "win32" ? ".cmd" : ""}`,
              ),
            ),
            `Installed bin shim missing: ${alias}`,
          );
      },
    );
    const emptyBin = path.join(temporary, "empty-bin");
    fs.mkdirSync(emptyBin);
    const runtimeEnv = { ...env };
    for (const key of Object.keys(runtimeEnv))
      if (/^path$/i.test(key)) delete runtimeEnv[key];
    runtimeEnv.PATH = emptyBin;
    const cliJson = async (label, args, cwd = project, code = 0) => {
      const response = await command(
        label,
        process.execPath,
        [cli, ...args, "--json"],
        cwd,
        runtimeEnv,
        { code },
      );
      const envelope = JSON.parse(response.stdout);
      assert.equal(
        envelope.ok,
        code === 0,
        `${label}: unexpected JSON success`,
      );
      return envelope;
    };
    await check(
      "installed CLI help and version with provider CLIs unavailable",
      async () => {
        const help = await command(
          "cli-help",
          process.execPath,
          [cli, "--help"],
          project,
          runtimeEnv,
        );
        assert.match(help.stdout, /prompts/);
        assert.match(help.stdout, /jobs/);
        const version = await command(
          "cli-version",
          process.execPath,
          [cli, "--version"],
          project,
          runtimeEnv,
        );
        assert.equal(version.stdout.trim(), packageInfo.version);
      },
    );
    await check("installed library validates its bundled content", async () => {
      const result = await cliJson("library-lint", ["lint"]);
      assert.ok(result.ok);
    });
    await check(
      "phase detection and planning need no provider CLI or authentication",
      async () => {
        const detection = (await cliJson("detect-phase", ["apply"])).data;
        assert.equal(typeof detection.detection.phase, "string");
        assert.ok(detection.suggestedGoals.length > 0);
        const plan = (
          await cliJson("strategy-brief", ["apply", "strategy", "--brief"])
        ).data;
        assert.ok(plan.brief.length > 0);
        assert.ok(
          !fs.existsSync(path.join(project, ".helen")),
          "Read-only planning wrote metadata",
        );
      },
    );
    fs.mkdirSync(path.join(project, "src"));
    fs.writeFileSync(
      path.join(project, "src/main.ts"),
      "import { greeting } from './helper.js';\nexport function main() { return greeting; }\n",
    );
    fs.writeFileSync(
      path.join(project, "src/helper.ts"),
      "export const greeting = 'Installed package fixture';\n",
    );
    fs.writeFileSync(
      path.join(project, ".env"),
      "PRIVATE_PACKAGE_CONTEXT_SENTINEL=fixture-only\n",
    );
    const assertContext = (context) => {
      assert.equal(context.mode, "references");
      assert.ok(context.files.some((file) => file.path === "src/main.ts"));
      assert.ok(
        !JSON.stringify(context).includes("PRIVATE_PACKAGE_CONTEXT_SENTINEL"),
        "Context included a private environment file",
      );
    };
    const assertCapabilities = (capabilities) => {
      assert.equal(capabilities.modelCalls, 0);
      assert.equal(capabilities.projectWrites, 0);
      assert.ok(capabilities.providers.length > 0);
      assert.ok(
        capabilities.providers.every(
          (provider) => provider.installed === false,
        ),
        "Provider availability must reflect the empty PATH",
      );
    };
    await check(
      "installed work, knowledge and creative read-only commands work without state",
      async () => {
        await cliJson("work-list", ["work", "list"]);
        await cliJson("work-ready", ["work", "ready"]);
        await cliJson("knowledge-search", [
          "knowledge",
          "search",
          "package verification",
        ]);
        await cliJson("creative-show", ["creative", "show"]);
        assert.ok(
          !fs.existsSync(path.join(project, ".helen")),
          "Read-only workspace commands wrote metadata",
        );
      },
    );
    await check(
      "installed task context references source and excludes private files",
      async () => {
        assertContext(
          (
            await cliJson("task-context", [
              "context",
              "--task",
              "Review src/main.ts greeting",
            ])
          ).data,
        );
        assert.ok(
          !fs.existsSync(path.join(project, ".helen")),
          "Read-only context wrote metadata",
        );
      },
    );
    await check(
      "installed capability detection reports absent providers without model calls",
      async () => {
        assertCapabilities(
          (await cliJson("capabilities", ["capabilities"])).data,
        );
        assert.ok(
          !fs.existsSync(path.join(project, ".helen")),
          "Read-only capabilities wrote metadata",
        );
      },
    );
    await check(
      "installed outcome reporting preserves unknowns without creating metadata",
      async () => {
        const report = (
          await cliJson("outcomes-report", ["outcomes", "report"])
        ).data;
        assert.equal(report.attempts, 0);
        for (const field of [
          "acceptanceRate",
          "tokenCoverage",
          "tokensPerAcceptedTask",
          "elapsedMsPerAcceptedTask",
          "humanCorrections",
          "humanMinutes",
        ])
          assert.equal(
            report[field],
            null,
            `Empty outcome ${field} must remain unknown`,
          );
        assert.deepEqual(report.pairs, []);
        assert.ok(
          !fs.existsSync(path.join(project, ".helen")),
          "Read-only outcome reporting wrote metadata",
        );
      },
    );
    await check(
      "TED aliases and cache-ready prompts use installed resources",
      async () => {
        let canonical;
        for (const alias of [
          "presentaciones",
          "powerpoint",
          "ted-talk",
          "generate-ted-presentation",
        ]) {
          const result = (
            await cliJson(`prompt-${alias}`, [
              "prompts",
              "show",
              alias,
              "--cache-ready",
            ])
          ).data;
          assert.match(result.content, /TED/i);
          assert.ok(
            result.content.startsWith("**HELEN execution contract**"),
            "Shared contract must precede prompt content",
          );
          canonical ??= result.fullId;
          assert.equal(result.fullId, canonical);
        }
        const resource = (
          await cliJson("prompt-path", ["prompts", "path", "powerpoint"])
        ).data.absolutePath;
        const relative = path.relative(installed, fs.realpathSync(resource));
        assert.ok(
          relative && !relative.startsWith("..") && !path.isAbsolute(relative),
          "Prompt resolves outside installed package",
        );
        const prompts = (await cliJson("prompt-list", ["prompts", "list"]))
          .data;
        assert.ok(prompts.count > 0);
        assert.ok(prompts.prompts.some((entry) => entry.fullId === canonical));
      },
    );
    await check("installed skills and flows are discoverable", async () => {
      const skills = (
        await cliJson("skill-list", ["skills", "list", "--flows"])
      ).data.skills;
      assert.ok(skills.some((skill) => skill.name === "helen-apply"));
      assert.ok(skills.some((skill) => skill.isFlow));
    });
    const setupProject = path.join(temporary, "setup-project");
    fs.mkdirSync(setupProject);
    const personal =
      "# Personal project instructions\nPreserve these instructions.\n";
    fs.writeFileSync(path.join(setupProject, "AGENTS.md"), personal);
    const custom = path.join(
      setupProject,
      ".agents/skills/helen-personal/SKILL.md",
    );
    fs.mkdirSync(path.dirname(custom), { recursive: true });
    fs.writeFileSync(custom, "Personal skill\n");
    await check(
      "project setup records ownership and preserves personal instructions",
      async () => {
        const preview = await cliJson(
          "setup-dry-run",
          ["setup", "--agents", "codex", "--preset", "efficient", "--dry-run"],
          setupProject,
        );
        assert.ok(preview.data.skillsCreated.length > 0);
        assert.equal(
          fs.readFileSync(path.join(setupProject, "AGENTS.md"), "utf8"),
          personal,
        );
        assert.ok(!fs.existsSync(path.join(setupProject, ".helen")));
        await cliJson(
          "setup",
          ["setup", "--agents", "codex", "--preset", "efficient"],
          setupProject,
        );
        assert.ok(
          fs
            .readFileSync(path.join(setupProject, "AGENTS.md"), "utf8")
            .startsWith(personal.trimEnd()),
        );
        const ownership = JSON.parse(
          fs.readFileSync(
            path.join(setupProject, ".helen/skill-files.json"),
            "utf8",
          ),
        );
        const skill = ".agents/skills/helen-audit/SKILL.md";
        assert.equal(
          ownership.files[skill],
          createHash("sha256")
            .update(fs.readFileSync(path.join(setupProject, skill)))
            .digest("hex"),
        );
        assert.equal(fs.readFileSync(custom, "utf8"), "Personal skill\n");
      },
    );
    const moduleUrl = (name) =>
      pathToFileURL(path.join(installed, "dist/core", `${name}.js`)).href;
    await check(
      "installed recovery blocks mutations then restores an interrupted operation",
      async () => {
        const fixture = path.join(temporary, "interrupt-operation.mjs");
        fs.writeFileSync(
          fixture,
          `import { runProjectOperationSync, writeAtomicFile } from ${JSON.stringify(moduleUrl("operations"))};\nimport path from 'node:path';\nconst cwd=process.argv[2];\nconst result=runProjectOperationSync(cwd,'package-verification-interruption',()=>{writeAtomicFile(path.join(cwd,'partial.txt'),'partial'); return false;},value=>value);\nconsole.log(JSON.stringify({id:result.operation.id}));\n`,
        );
        const interruption = await command(
          "interrupt-operation",
          process.execPath,
          [fixture, setupProject],
          temporary,
          runtimeEnv,
        );
        const { id } = JSON.parse(interruption.stdout);
        const blocked = await cliJson(
          "skills-blocked-by-recovery",
          ["skills", "install", "helen-audit", "--target", "codex", "--force"],
          setupProject,
          1,
        );
        assert.match(blocked.errors.join(" "), /recover/);
        const blockedSetup = await cliJson(
          "setup-blocked-by-recovery",
          ["setup", "--agents", "codex"],
          setupProject,
          1,
        );
        assert.match(blockedSetup.errors.join(" "), /recover/);
        const pending = (
          await cliJson("recovery-list", ["recover"], setupProject)
        ).data.operations;
        assert.ok(pending.some((operation) => operation.id === id));
        await cliJson(
          "recovery-preview",
          ["recover", id, "--dry-run"],
          setupProject,
        );
        assert.equal(
          fs.readFileSync(path.join(setupProject, "partial.txt"), "utf8"),
          "partial",
        );
        await cliJson("recovery", ["recover", id], setupProject);
        assert.ok(!fs.existsSync(path.join(setupProject, "partial.txt")));
        assert.deepEqual(
          (await cliJson("recovery-empty", ["recover"], setupProject)).data
            .operations,
          [],
        );
        await cliJson(
          "skills-after-recovery",
          ["skills", "install", "helen-audit", "--target", "codex", "--force"],
          setupProject,
        );
      },
    );
    await check(
      "uninstall removes owned files and preserves custom edits and MCP settings",
      async () => {
        const edited = path.join(
          setupProject,
          ".agents/skills/helen-audit/SKILL.md",
        );
        fs.appendFileSync(edited, "\nPersonal customization\n");
        const before = fs.readFileSync(edited, "utf8");
        const mcp = path.join(setupProject, ".codex/config.toml");
        const mcpBefore = fs.readFileSync(mcp, "utf8");
        await cliJson("uninstall", ["uninstall"], setupProject);
        assert.equal(fs.readFileSync(edited, "utf8"), before);
        assert.equal(fs.readFileSync(custom, "utf8"), "Personal skill\n");
        assert.equal(fs.readFileSync(mcp, "utf8"), mcpBefore);
        assert.ok(
          !fs.existsSync(
            path.join(setupProject, ".agents/skills/helen-design/SKILL.md"),
          ),
        );
        const instructions = fs.readFileSync(
          path.join(setupProject, "AGENTS.md"),
          "utf8",
        );
        assert.ok(instructions.startsWith(personal.trimEnd()));
        assert.ok(!instructions.includes("HELEN:START"));
      },
    );
    await check(
      "installed init-project creates project skills and tracked plan",
      async () => {
        const target = path.join(temporary, "new-project");
        const result = (
          await cliJson(
            "init-project",
            [
              "init-project",
              "new-project",
              "--agents",
              "codex",
              "--goal",
              "strategy",
              "--yes",
            ],
            temporary,
          )
        ).data;
        assert.equal(result.projectDir, target);
        assert.equal(result.chosenGoal, "strategy");
        assert.ok(
          fs.existsSync(
            path.join(target, ".agents/skills/helen-apply/SKILL.md"),
          ),
        );
        assert.ok(fs.existsSync(path.join(target, ".helen/progress.json")));
      },
    );
    await check(
      "installed MCP inventory and read-only resource calls work over stdio",
      async () => {
        const requests = [
          {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2024-11-05",
              capabilities: {},
              clientInfo: { name: "package-verification", version: "1" },
            },
          },
          { jsonrpc: "2.0", method: "notifications/initialized" },
          { jsonrpc: "2.0", id: 2, method: "tools/list" },
          {
            jsonrpc: "2.0",
            id: 3,
            method: "tools/call",
            params: {
              name: "helen_prompt_get",
              arguments: {
                cwd: project,
                promptId: "powerpoint",
                cacheReady: true,
              },
            },
          },
          {
            jsonrpc: "2.0",
            id: 4,
            method: "tools/call",
            params: { name: "helen_skills_list", arguments: { cwd: project } },
          },
          {
            jsonrpc: "2.0",
            id: 5,
            method: "tools/call",
            params: { name: "helen_jobs_list", arguments: { cwd: project } },
          },
          ...[
            [6, "helen_work_list", { cwd: project }],
            [7, "helen_work_ready", { cwd: project }],
            [
              8,
              "helen_context",
              { cwd: project, task: "Review src/main.ts greeting" },
            ],
            [
              9,
              "helen_knowledge_search",
              { cwd: project, query: "package verification" },
            ],
            [10, "helen_creative_show", { cwd: project }],
            [11, "helen_capabilities", { cwd: project }],
            [12, "helen_outcomes_report", { cwd: project }],
          ].map(([id, name, arguments_]) => ({
            jsonrpc: "2.0",
            id,
            method: "tools/call",
            params: { name, arguments: arguments_ },
          })),
        ];
        const result = await command(
          "mcp-read-only",
          process.execPath,
          [cli, "mcp"],
          project,
          runtimeEnv,
          {
            input:
              requests.map((request) => JSON.stringify(request)).join("\n") +
              "\n",
          },
        );
        const messages = new Map(
          result.stdout
            .trim()
            .split(/\r?\n/)
            .map((line) => {
              const message = JSON.parse(line);
              assert.equal(message.jsonrpc, "2.0");
              return [message.id, message];
            }),
        );
        assert.equal(messages.size, 12);
        assert.equal(
          messages.get(1).result.serverInfo.name,
          "helen-mcp-server",
        );
        validateMcpToolSchemas(messages.get(2).result.tools);
        const names = messages.get(2).result.tools.map((tool) => tool.name);
        assert.equal(
          new Set(names).size,
          names.length,
          "Duplicate MCP tool names",
        );
        for (const name of [
          "helen_prompt_get",
          "helen_skills_list",
          "helen_jobs_list",
          "helen_job_start",
          "helen_work_list",
          "helen_work_show",
          "helen_work_ready",
          "helen_work_brief",
          "helen_work_record",
          "helen_work_check",
          "helen_context",
          "helen_capabilities",
          "helen_knowledge_search",
          "helen_creative_show",
          "helen_outcome_record",
          "helen_outcomes_report",
        ])
          assert.ok(names.includes(name), `Missing MCP tool: ${name}`);
        for (const id of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
          assert.ok(
            !messages.get(id).error && !messages.get(id).result.isError,
            `MCP read-only request ${id} failed`,
          );
        assert.ok(
          messages
            .get(3)
            .result.content[0].text.startsWith("**HELEN execution contract**"),
        );
        assert.ok(
          JSON.parse(messages.get(4).result.content[0].text).some(
            (skill) => skill.name === "helen-apply",
          ),
        );
        assert.deepEqual(JSON.parse(messages.get(5).result.content[0].text), {
          jobs: [],
          errors: [],
        });
        assertContext(JSON.parse(messages.get(8).result.content[0].text));
        assertCapabilities(JSON.parse(messages.get(11).result.content[0].text));
        const outcomes = JSON.parse(messages.get(12).result.content[0].text);
        assert.equal(outcomes.attempts, 0);
        assert.equal(outcomes.tokensPerAcceptedTask, null);
        assert.equal(outcomes.humanCorrections, null);
        assert.equal(outcomes.humanMinutes, null);
        assert.ok(
          !fs.existsSync(path.join(project, ".helen")),
          "Read-only MCP requests wrote project metadata",
        );
        return { toolCount: names.length, tools: names };
      },
    );
    await check(
      "packaged production worker validates input before dispatching any model",
      async () => {
        const result = await command(
          "worker-invalid-input",
          process.execPath,
          [path.join(installed, "dist/backgroundWorker.js")],
          project,
          runtimeEnv,
          { code: 1 },
        );
        assert.match(result.stderr, /Invalid background worker arguments/);
      },
    );
    await check(
      "installed detached launcher survives parent exit with a fake runtime",
      async () => {
        const jobsProject = path.join(temporary, "jobs-project");
        fs.mkdirSync(jobsProject);
        const worker = path.join(temporary, "fake-worker.mjs");
        fs.writeFileSync(
          worker,
          `import assert from 'node:assert/strict';\nimport { runJobAttempt } from ${JSON.stringify(moduleUrl("jobs"))};\nconst [cwd,id,attempt,nonce]=process.argv.slice(2);\nassert.equal(process.cwd(),${JSON.stringify(path.dirname(fileURLToPath(moduleUrl("jobs"))))});\nassert.ok(!process.env.NODE_OPTIONS && !process.env.UNRELATED_API_TOKEN && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY);\nawait runJobAttempt(cwd,id,Number(attempt),nonce,async request=>{assert.ok(request.prompt.includes('read-only')); await new Promise(resolve=>setTimeout(resolve,1000)); return {status:'completed',result:{status:'completed',summary:'Installed fake runtime completed after parent exit.',question:null,options:[]}};});\n`,
        );
        const parent = path.join(temporary, "fake-launcher.mjs");
        fs.writeFileSync(
          parent,
          `import { startJob, launchJobWorker } from ${JSON.stringify(moduleUrl("jobs"))};\nprocess.env.NODE_OPTIONS='--require missing-preload';\nprocess.env.UNRELATED_API_TOKEN='fixture-only';\nconst job=await startJob({cwd:process.argv[2],provider:'codex',prompt:'Read packaged evidence',subscriptionOnly:true,codexCreditsUnavailable:true},(cwd,id,input)=>launchJobWorker(cwd,id,input,${JSON.stringify(worker)}));\nconsole.log(JSON.stringify({id:job.definition.id,parentPid:process.pid,workerPid:job.state.workerPid}));\n`,
        );
        const launched = JSON.parse(
          (
            await command(
              "fake-detached-launcher",
              process.execPath,
              [parent, jobsProject],
              temporary,
              runtimeEnv,
            )
          ).stdout,
        );
        workerPid = launched.workerPid;
        assert.ok(
          Number.isInteger(workerPid) && workerPid !== launched.parentPid,
        );
        assert.equal(
          alive(launched.parentPid),
          false,
          "Launching process must have exited",
        );
        const statePath = path.join(
          jobsProject,
          ".helen/jobs",
          launched.id,
          "attempt-0001/state.json",
        );
        const deadline = Date.now() + 30000;
        let state;
        do {
          state = JSON.parse(fs.readFileSync(statePath, "utf8"));
          if (!["queued", "running"].includes(state.status)) break;
          await delay(100);
        } while (Date.now() < deadline);
        fs.cpSync(
          path.join(jobsProject, ".helen/jobs", launched.id),
          path.join(evidence, "fake-job"),
          { recursive: true },
        );
        assert.equal(
          state.status,
          "completed",
          `Fake worker failed: ${JSON.stringify(state)}`,
        );
        while (alive(workerPid) && Date.now() < deadline) await delay(100);
        assert.equal(
          alive(workerPid),
          false,
          "Worker must exit before cleanup",
        );
        const shown = (
          await cliJson(
            "installed-job-show",
            ["jobs", "show", launched.id],
            jobsProject,
          )
        ).data;
        assert.equal(shown.state.status, "completed");
        return {
          id: launched.id,
          parentExited: true,
          workerExited: true,
          runtime: "injected fake; no model",
        };
      },
    );
    report.status = "passed";
  } catch (error) {
    report.status = "failed";
    report.error = error.stack ?? error.message;
  } finally {
    if (hookSettings) {
      try {
        await check(
          "leave project and global Git hook settings unchanged",
          async () => {
            assert.deepEqual(await snapshotHooks("after"), hookSettings);
          },
        );
      } catch (error) {
        report.status = "failed";
        report.error ??= error.stack ?? error.message;
      }
    }
    report.finishedAt = new Date().toISOString();
    try {
      if (workerPid && alive(workerPid)) {
        report.cleanup = "preserved: fake worker still alive";
        report.status = "failed";
      } else {
        fs.rmSync(assertOwnedTemporaryDirectory(temporary, token), {
          recursive: true,
          force: true,
          maxRetries: 10,
          retryDelay: 100,
        });
        report.cleanup = "owned temporary directory removed";
      }
    } catch (error) {
      report.cleanup = `failed; preserved: ${error.message}`;
      report.status = "failed";
    }
    fs.writeFileSync(path.join(evidence, "report.json"), json(report));
  }
  console.log(
    `${report.status.toUpperCase()} installed-package verification (${report.checks.filter((check) => check.status === "passed").length} checks). Evidence: ${evidence}`,
  );
  if (report.error) console.error(report.error);
  return report;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const arguments_ = process.argv.slice(2);
  if (arguments_.some((argument) => argument !== "--offline")) {
    console.error("Usage: node scripts/verify-package.mjs [--offline]");
    process.exitCode = 1;
  } else {
    const report = await verifyPackage({
      offline: arguments_.includes("--offline"),
    });
    process.exitCode = report.status === "passed" ? 0 : 1;
  }
}
