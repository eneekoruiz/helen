#!/usr/bin/env node
// Skill evals: for each case compare baseline runs (no skill) with runs where the
// skill is installed. Records whether the agent triggered the skill on its own and
// grades both answers against the case criteria with an LLM judge.
//
// Usage: node scripts/run-skill-evals.mjs [skill...] [--runs 3] [--concurrency 4] [--model sonnet] [--dry-run]
// Requires the `claude` CLI logged in. Results: evals/results/<skill>.json + docs/SKILLS_QUALITY.md

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  calculateGrade,
  confidenceInterval95,
  falsePositiveRate,
  mean,
  pairedDeltaConfidenceInterval,
  parseStreamJsonEvents,
} from './lib/evalsStats.mjs';
import { combineProviderMetrics, extractProviderMetrics, providerFailureCause, providerReportedFailure, renderEvidenceReport } from './lib/evalEvidence.mjs';
import { parseJudgeResult, runAnswerChecks } from './lib/evalChecks.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const value = args[i + 1];
  if (value === undefined || value.startsWith('--')) throw new Error(`--${name} requires a value`);
  args.splice(i, 2);
  return value;
};

const hasFlag = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
};

const integerOption = (name, value, minimum) => {
  const parsed = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`--${name} must be an integer >= ${minimum}`);
  }
  return parsed;
};
const runsCount = integerOption('runs', opt('runs', '3'), 1);
const concurrency = integerOption('concurrency', opt('concurrency', '4'), 1);
const model = opt('model', 'sonnet');
if (!/^[A-Za-z0-9_.:/-]+$/.test(model)) throw new Error('--model must be a model alias or identifier without shell characters');
const rawMaxCalls = opt('max-calls', null);
const maxCalls = rawMaxCalls !== null ? integerOption('max-calls', rawMaxCalls, 0) : null;
const rawCases = opt('cases', null);
const casesFilter = rawCases ? rawCases.split(',').map((s) => s.trim()).filter(Boolean) : null;
const skillFilter = opt('skill', null);
const dryRun = hasFlag('dry-run');
const force = hasFlag('force');
const forceTrigger = hasFlag('force-trigger');
const reportOnly = hasFlag('report-only');
const unknownOption = args.find(a => a.startsWith('-'));
if (unknownOption) throw new Error(`Unknown or repeated option: ${unknownOption}`);
const only = args;
if (skillFilter && !only.includes(skillFilter)) {
  only.push(skillFilter);
}

const evalDir = path.join(root, 'evals');
const resultDir = path.join(evalDir, 'results');

function fingerprint(spec) {
  const hash = createHash('sha256').update(JSON.stringify(spec));
  const skillDir = path.join(root, 'skills', spec.skill);
  function walk(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, item.name);
      if (item.isDirectory()) walk(file);
      else if (item.isFile()) hash.update(path.relative(skillDir, file)).update(fs.readFileSync(file));
    }
  }
  walk(skillDir);
  return hash.digest('hex');
}

let totalCallsMade = 0;
let budgetExhausted = false;
let providerBlocker = null;
let firstProviderCall = null;
let providerProbeComplete = false;

function resolveExecutable(cmd) {
  if (process.platform !== 'win32') return { cmd, shell: false };
  if (cmd.endsWith('.exe')) return { cmd, shell: false };
  if (cmd.endsWith('.cmd') || cmd.endsWith('.bat')) return { cmd, shell: true };
  const dirs = (process.env.PATH || '').split(path.delimiter);
  for (const dir of dirs) {
    for (const ext of ['.exe', '.cmd', '.bat']) {
      try {
        const full = path.join(dir, cmd + ext);
        if (fs.existsSync(full)) {
          return { cmd: full, shell: ext !== '.exe' };
        }
      } catch {
        // Ignore unreadable dirs in PATH
      }
    }
  }
  return { cmd, shell: false };
}

function runProcess(cmd, cmdArgs, cwd, timeoutMs = 300_000, input = '') {
  const providerCall = cmd === 'claude' && cmdArgs.includes('-p');
  if (providerCall && providerBlocker) return Promise.resolve({ code: 1, out: '', err: `Provider blocked: ${providerBlocker}` });
  // Use the first real baseline request as a readiness probe, then release concurrency.
  // This avoids an extra paid probe and makes a quota refusal stop after one invocation.
  if (providerCall && firstProviderCall) return firstProviderCall.then(() => runProcess(cmd, cmdArgs, cwd, timeoutMs, input));
  if (providerCall && maxCalls !== null && totalCallsMade >= maxCalls) {
    budgetExhausted = true;
    return Promise.resolve({ code: 1, out: '', err: 'Call budget exhausted' });
  }
  if (providerCall) totalCallsMade++;

  const operation = new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const resolved = resolveExecutable(cmd);
    const child = spawn(resolved.cmd, cmdArgs, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: resolved.shell,
      windowsHide: true,
    });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      try {
        child.kill(isWin ? undefined : 'SIGKILL');
      } catch {
        // Process might have terminated already
      }
    }, timeoutMs);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, out, err });
    });
    child.on('error', (errObj) => {
      clearTimeout(timer);
      resolve({ code: 1, out, err: String(errObj) });
    });
    child.stdin.on('error', () => { /* Spawn/close handlers report process failures. */ });
    child.stdin.end(input);
  });
  if (providerCall && !providerProbeComplete) {
    firstProviderCall = operation.then(result => {
      const blocker = providerFailureCause(result.out, result.code, result.err);
      if (blocker) {
        providerBlocker = blocker;
        console.error(`Claude provider blocked (${blocker}); stopping new calls without retries. Resume after resolving the provider limit or authentication.`);
      }
      providerProbeComplete = true;
      firstProviderCall = null;
      return result;
    });
    return firstProviderCall;
  }
  return operation;
}

function makeProject(skill) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-eval-'));
  fs.writeFileSync(path.join(dir, 'README.md'), '# Sample project\n', 'utf-8');
  if (skill) {
    fs.cpSync(path.join(root, 'skills', skill), path.join(dir, '.claude', 'skills', skill), {
      recursive: true,
    });
  }
  return dir;
}

async function agent(prompt, skill, attempt = 0) {
  const cwd = makeProject(skill);
  try {
    await runProcess('git', ['init', '-q'], cwd);
    const res = await runProcess(
      'claude',
      [
        '-p',
        '--model', model,
        '--setting-sources', 'project',
        '--allowedTools', 'Skill', 'Read', 'Glob', 'Grep',
        '--tools', 'Skill,Read,Glob,Grep',
        '--output-format', 'stream-json',
        '--verbose',
      ],
      cwd,
      300_000,
      prompt
    );
    const { text, triggered } = parseStreamJsonEvents(res.out);
    const blocker = providerFailureCause(res.out, res.code, res.err);
    if (blocker && !providerBlocker) {
      providerBlocker = blocker;
      console.error(`Claude provider blocked (${blocker}); stopping new calls without retries. Resume after resolving the provider limit or authentication.`);
    }
    const ok = res.code === 0 && text.length > 0 && !providerReportedFailure(res.out);
    if (!ok && attempt < 1 && !budgetExhausted && !providerBlocker) {
      const retried = await agent(prompt, skill, attempt + 1);
      return { ...retried, metrics: combineProviderMetrics([extractProviderMetrics(res.out), retried.metrics]) };
    }
    return { text, triggered, ok, failure: blocker ?? (!ok ? 'execution' : null), rawOut: res.out, metrics: extractProviderMetrics(res.out) };
  } finally {
    try {
      fs.rmSync(cwd, { recursive: true, force: true });
    } catch {
      // Ignore cleanup failures on locked temp files
    }
  }
}

async function grade(prompt, answer, criteria, attempt = 0) {
  if (!answer) return null;
  const judgePrompt = `You are a strict evaluator. Grade the ANSWER against each CRITERION.
Return only JSON: {"results":[{"index":1,"pass":true|false,"note":"<=15 words"}]}. Include each numbered criterion exactly once.

TASK:
${prompt}

ANSWER:
${answer || '(empty)'}

CRITERIA:
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;

  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-judge-'));
  let attemptMetrics = null;
  try {
    const res = await runProcess(
      'claude',
      ['-p', '--model', model, '--setting-sources', 'project', '--tools', 'Read', '--output-format', 'json'],
      cwd,
      300_000,
      judgePrompt
    );
    attemptMetrics = extractProviderMetrics(res.out);
    const blocker = providerFailureCause(res.out, res.code, res.err);
    if (blocker) { providerBlocker = blocker; throw new Error(`Provider blocked: ${blocker}`); }
    if (res.code !== 0 || providerReportedFailure(res.out)) throw new Error('Judge provider call failed');
    const raw = JSON.parse(res.out).result;
    const judged = parseJudgeResult(raw, criteria.length);
    return {
      ...judged,
      rawOutput: raw,
      metrics: extractProviderMetrics(res.out),
    };
  } catch {
    if (attempt < 1 && !budgetExhausted && !providerBlocker) {
      const retried = await grade(prompt, answer, criteria, attempt + 1);
      return retried ? { ...retried, metrics: combineProviderMetrics([attemptMetrics, retried.metrics]) } : null;
    }
    return null;
  } finally {
    try {
      fs.rmSync(cwd, { recursive: true, force: true });
    } catch {
      // Ignore cleanup
    }
  }
}

const redact = (text) =>
  (text || '').replace(/(sk-(?:live|proj)-|AKIA|gh[pousr]_|xox[baprs]-)[A-Za-z0-9_-]{6,}/g, '$1[redacted]');

async function pool(tasks, size) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < tasks.length) {
        if (budgetExhausted || providerBlocker) break;
        const i = next++;
        results[i] = await tasks[i]();
      }
    })
  );
  return results.filter(Boolean);
}

const specFiles = fs
  .readdirSync(evalDir)
  .filter((f) => f.endsWith('.json') && !f.startsWith('.'))
  .filter((f) => only.length === 0 || only.includes(f.replace(/\.json$/, '')));
const knownSkills = new Set(specFiles.map(file => file.replace(/\.json$/, '')));
for (const skill of only) {
  if (!knownSkills.has(skill)) throw new Error(`Unknown evaluation skill: ${skill}`);
}
if (casesFilter) {
  const knownCases = new Set(specFiles.flatMap(file => JSON.parse(fs.readFileSync(path.join(evalDir, file), 'utf8')).cases.map(c => c.id)));
  for (const id of casesFilter) {
    if (!knownCases.has(id)) throw new Error(`Unknown evaluation case: ${id}`);
  }
  if (casesFilter.length === 0) throw new Error('--cases must select at least one case');
}

// Dry-run mode: plan calls, print estimates and exit
if (dryRun) {
  console.log('=== HELEN Skill Evals Plan (Dry Run) ===');
  console.log(`Model: ${model} | Runs per case: ${runsCount} | Concurrency: ${concurrency}`);
  let plannedCases = 0;
  let estimatedCalls = 0;

  for (const file of specFiles) {
    const spec = JSON.parse(fs.readFileSync(path.join(evalDir, file), 'utf-8'));
    const cases = spec.cases.filter((c) => !casesFilter || casesFilter.includes(c.id));
    console.log(`\nSkill: ${spec.skill} (${cases.length} cases)`);
    for (const c of cases) {
      plannedCases++;
      // Baseline run + withSkill run per runCount.
      // Forced run if not triggered (up to 1).
      // 2 judge calls per run.
      // Total approx 4 to 5 calls per run * runsCount.
      const callsForCase = runsCount * 4;
      estimatedCalls += callsForCase;
      const trigExpect = c.expectTrigger === false ? ' (Must NOT trigger)' : '';
      console.log(`  - [${c.id}] "${c.prompt.slice(0, 70)}..."${trigExpect} [~${callsForCase} calls]`);
    }
  }
  console.log('\n--- Summary ---');
  console.log(`Total skills: ${specFiles.length}`);
  console.log(`Total cases: ${plannedCases}`);
  console.log(`Estimated LLM calls: ~${estimatedCalls} calls`);
  if (maxCalls !== null) {
    console.log(`Configured max budget: ${maxCalls} calls`);
    if (estimatedCalls > maxCalls) {
      console.log(`Warning: Estimated calls (${estimatedCalls}) exceed budget (${maxCalls}). Will stop when budget reached.`);
    }
  }
  process.exit(0);
}

if (!reportOnly) {
  if (maxCalls === null) throw new Error('Live evaluations require --max-calls <N>. Use --dry-run to inspect the plan without provider calls.');
  if (maxCalls === 0) throw new Error('No provider calls permitted by --max-calls 0. Use --dry-run or --report-only.');
  // Local authentication check: never print account details or start a paid prompt to discover missing credentials.
  const auth = await runProcess('claude', ['auth', 'status'], root, 15_000);
  let authenticated = false;
  try { authenticated = auth.code === 0 && JSON.parse(auth.out).loggedIn === true; } catch { /* missing/unsupported CLI */ }
  if (!authenticated) {
    console.error('Evaluation preflight failed: Claude CLI is unavailable, not authenticated, or does not support `claude auth status`. Install/update the CLI and run `claude auth login`; then retry with --max-calls. No evaluation prompts were sent.');
    process.exit(1);
  }
  fs.mkdirSync(resultDir, { recursive: true });
  const tasks = [];
  for (const file of specFiles) {
    const spec = JSON.parse(fs.readFileSync(path.join(evalDir, file), 'utf-8'));
    const resultFile = path.join(resultDir, `${spec.skill}.json`);
    const existingData = fs.existsSync(resultFile) ? JSON.parse(fs.readFileSync(resultFile, 'utf-8')) : null;

    for (const c of spec.cases) {
      if (casesFilter && !casesFilter.includes(c.id)) continue;

      // Resumability check: if already has sufficient runs and not --force, skip
      if (!force && existingData?.model === model && existingData?.fingerprint === fingerprint(spec) && existingData?.cases) {
        const existingCase = existingData.cases.find((ec) => ec.id === c.id);
        if (existingCase && existingCase.runs?.filter(r => r.baselineOk && r.skillOk).length >= runsCount) {
          console.log(`Skipping already completed case ${spec.skill}/${c.id} (runs: ${existingCase.runs.length})`);
          continue;
        }
      }

      tasks.push(async () => {
        if (budgetExhausted || providerBlocker) return null;
        console.log(`Evaluating ${spec.skill}/${c.id} (${runsCount} runs)...`);
        const caseRuns = [];
        const pct = (g) => (g ? Math.round((100 * g.filter(Boolean).length) / g.length) : null);

        for (let r = 1; r <= runsCount; r++) {
          if (budgetExhausted || providerBlocker) break;

          const [baseline, withSkill] = await Promise.all([
            agent(c.prompt, null),
            agent(c.prompt, spec.skill),
          ]);

          let forced = null;
          // Only force if skill was expected to trigger and did not trigger on its own
          if (forceTrigger && withSkill.ok && !withSkill.triggered && c.expectTrigger !== false && !budgetExhausted) {
            forced = await agent(`Use the ${spec.skill} skill. ${c.prompt}`, spec.skill);
          }

          const skillRun = forced ?? withSkill;
          const [baseGrades, skillGrades] = await Promise.all([
            baseline.ok ? grade(c.prompt, baseline.text, c.criteria) : Promise.resolve(null),
            skillRun.ok ? grade(c.prompt, skillRun.text, c.criteria) : Promise.resolve(null),
          ]);

          const baselineChecks = baseline.ok ? runAnswerChecks(baseline.text, c.checks) : null;
          const skillChecks = skillRun.ok ? runAnswerChecks(skillRun.text, c.checks) : null;
          const basePct = baseGrades ? pct([...baseGrades.grades, ...(baselineChecks ?? [])]) : null;
          const skillPct = skillGrades ? pct([...skillGrades.grades, ...(skillChecks ?? [])]) : null;

          caseRuns.push({
            run: r,
            triggered: withSkill.triggered,
            forcedTriggered: forced ? forced.triggered : null,
            naturalAgentOk: withSkill.ok,
            failures: { baseline: baseline.failure ?? null, naturalSkill: withSkill.failure ?? null, forcedSkill: forced?.failure ?? null },
            baselineOk: baseline.ok && Boolean(baseGrades),
            skillOk: skillRun.ok && Boolean(skillGrades),
            condition: forced ? 'forced' : 'natural',
            checks: { baseline: baselineChecks, withSkill: skillChecks },
            metricsByCondition: {
              baseline: baseline.metrics, naturalSkill: withSkill.metrics,
              forcedSkill: forced?.metrics ?? null,
              judgeBaseline: baseGrades?.metrics ?? null, judgeSkill: skillGrades?.metrics ?? null,
            },
            baseline: basePct,
            withSkill: skillPct,
            metrics: combineProviderMetrics([baseline.metrics, withSkill.metrics, ...(forced ? [forced.metrics] : []), baseGrades?.metrics, skillGrades?.metrics]),
            criteria: c.criteria.map((text, idx) => ({
              text,
              baseline: baseGrades?.grades?.[idx] ?? null,
              withSkill: skillGrades?.grades?.[idx] ?? null,
              note: skillGrades?.notes?.[idx] ?? '',
            })),
            errors:
              [baseline, withSkill, forced].filter((res) => res && !res.ok).length +
              (baseline.ok && !baseGrades ? 1 : 0) + (skillRun.ok && !skillGrades ? 1 : 0),
            answers: {
              baseline: redact(baseline.text),
              withSkill: redact(skillRun.text),
            },
          });
          console.log(`  ${spec.skill}/${c.id} run ${r}/${runsCount}: baseline=${basePct ?? 'unmeasured'}, skill=${skillPct ?? 'unmeasured'}, naturalTrigger=${withSkill.ok ? withSkill.triggered : 'unmeasured'}`);
        }

        if (caseRuns.length === 0) return null;

        const baseScores = caseRuns.map((r) => r.baseline).filter((n) => typeof n === 'number');
        const skillScores = caseRuns.map((r) => r.withSkill).filter((n) => typeof n === 'number');
        const trigCount = caseRuns.filter((r) => r.triggered).length;

        const baseStats = baseScores.length ? confidenceInterval95(baseScores) : null;
        const skillStats = skillScores.length ? confidenceInterval95(skillScores) : null;
        const pairedRuns = caseRuns.filter(r => typeof r.baseline === 'number' && typeof r.withSkill === 'number');
        const deltaStats = pairedRuns.length ? pairedDeltaConfidenceInterval(pairedRuns.map(r => r.baseline), pairedRuns.map(r => r.withSkill)) : null;

        const row = {
          skill: spec.skill,
          fingerprint: fingerprint(spec),
          id: c.id,
          expectTrigger: c.expectTrigger ?? true,
          runsCount: caseRuns.length,
          triggeredCount: trigCount,
          triggerRate: Math.round((trigCount / caseRuns.length) * 100),
          baseline: baseStats?.mean ?? null,
          withSkill: skillStats?.mean ?? null,
          baselineStats: baseStats,
          withSkillStats: skillStats,
          deltaStats,
          runs: caseRuns,
          errors: caseRuns.reduce((sum, r) => sum + r.errors, 0),
        };

        console.log(
          `  -> ${spec.skill}/${c.id}: trigger=${trigCount}/${caseRuns.length} base=${row.baseline ?? 'unknown'} skill=${row.withSkill ?? 'unknown'} delta=${deltaStats?.mean ?? 'unknown'} (noise=${deltaStats?.isNoise ?? 'unmeasured'})`
        );
        return row;
      });
    }
  }

  const rows = await pool(tasks, concurrency);
  const bySkill = {};
  for (const r of rows) {
    if (r) (bySkill[r.skill] ??= []).push(r);
  }

  const date = new Date().toISOString().slice(0, 10);
  for (const [skill, cases] of Object.entries(bySkill)) {
    const file = path.join(resultDir, `${skill}.json`);
    const oldData = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : null;
    const currentFingerprint = cases[0].fingerprint;
    if (oldData && (oldData.fingerprint !== currentFingerprint || oldData.model !== model)) {
      const archiveDir = path.join(resultDir, 'archive');
      fs.mkdirSync(archiveDir, { recursive: true });
      const identity = createHash('sha256').update(JSON.stringify(oldData)).digest('hex').slice(0, 16);
      const archiveFile = path.join(archiveDir, `${skill}-${identity}.json`);
      if (!fs.existsSync(archiveFile)) fs.writeFileSync(archiveFile, JSON.stringify(oldData, null, 2) + '\n', 'utf8');
    }
    const previous = oldData?.fingerprint === currentFingerprint && oldData?.model === model ? oldData.cases : [];
    for (const old of previous) {
      if (!cases.some((c) => c.id === old.id)) cases.push(old);
    }
    fs.writeFileSync(
      path.join(resultDir, `${skill}.json`),
      JSON.stringify({ skill, model, date, fingerprint: currentFingerprint, providerBlocker, providerCalls: totalCallsMade, runsPerCase: runsCount, cases }, null, 2) + '\n',
      'utf-8'
    );
  }

  if (budgetExhausted) {
    console.log(`\nNotice: Execution stopped because max calls budget (${maxCalls}) was reached.`);
  }
}

// Generate one row per current skill, reconstructing scores from valid observations.
const fingerprints = {};
const summaries = fs.readdirSync(evalDir).filter(file => file.endsWith('.json')).map(file => {
  const spec = JSON.parse(fs.readFileSync(path.join(evalDir, file), 'utf8'));
  fingerprints[spec.skill] = fingerprint(spec);
  const resultFile = path.join(resultDir, file);
  return fs.existsSync(resultFile)
    ? JSON.parse(fs.readFileSync(resultFile, 'utf8'))
    : { skill: spec.skill, cases: [] };
});
fs.writeFileSync(path.join(root, 'docs', 'SKILLS_QUALITY.md'), renderEvidenceReport(summaries, fingerprints), 'utf8');
console.log('Updated docs/SKILLS_QUALITY.md');
if (!reportOnly) {
  const issues = [];
  for (const file of specFiles) {
    const spec = JSON.parse(fs.readFileSync(path.join(evalDir, file), 'utf8'));
    const summary = summaries.find(s => s.skill === spec.skill);
    if (!summary || summary.fingerprint !== fingerprints[spec.skill] || summary.model !== model) {
      issues.push(`${spec.skill}: missing current observations`);
      continue;
    }
    for (const c of spec.cases.filter(c => !casesFilter || casesFilter.includes(c.id))) {
      const observed = summary.cases.find(item => item.id === c.id)?.runs ?? [];
      const valid = observed.filter(r => r.baselineOk && r.skillOk);
      if (valid.length < runsCount) issues.push(`${spec.skill}/${c.id}: incomplete paired runs (${valid.length}/${runsCount})`);
      if (valid.some(r => r.withSkill !== 100)) issues.push(`${spec.skill}/${c.id}: acceptance criteria failed`);
      if (observed.some(r => r.naturalAgentOk && r.triggered !== (c.expectTrigger !== false))) issues.push(`${spec.skill}/${c.id}: natural activation mismatch`);
    }
  }
  if (issues.length) {
    console.error('Evaluation acceptance not satisfied:\n' + issues.join('\n'));
    process.exitCode = 1;
  }
  console.log(`Provider calls made: ${totalCallsMade}/${maxCalls}`);
}
