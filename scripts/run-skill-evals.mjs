#!/usr/bin/env node
// Skill evals: for each case compare baseline runs (no skill) with runs where the
// skill is installed. Records whether the agent triggered the skill on its own and
// grades both answers against the case criteria with an LLM judge.
//
// Usage: node scripts/run-skill-evals.mjs [skill...] [--runs 3] [--concurrency 4] [--model sonnet] [--dry-run]
// Requires the `claude` CLI logged in. Results: evals/results/<skill>.json + docs/SKILLS_QUALITY.md

import { spawn } from 'node:child_process';
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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
};

const hasFlag = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
};

const runsCount = Math.max(1, parseInt(opt('runs', '3'), 10));
const concurrency = Math.max(1, parseInt(opt('concurrency', '4'), 10));
const model = opt('model', 'sonnet');
const rawMaxCalls = opt('max-calls', null);
const maxCalls = rawMaxCalls !== null ? parseInt(rawMaxCalls, 10) : null;
const rawCases = opt('cases', null);
const casesFilter = rawCases ? rawCases.split(',').map((s) => s.trim()).filter(Boolean) : null;
const skillFilter = opt('skill', null);
const dryRun = hasFlag('dry-run');
const force = hasFlag('force');
const reportOnly = hasFlag('report-only');
const only = args.filter((a) => !a.startsWith('--'));
if (skillFilter && !only.includes(skillFilter)) {
  only.push(skillFilter);
}

const evalDir = path.join(root, 'evals');
const resultDir = path.join(evalDir, 'results');
fs.mkdirSync(resultDir, { recursive: true });

let totalCallsMade = 0;
let budgetExhausted = false;

function resolveExecutable(cmd) {
  if (process.platform !== 'win32') return { cmd, shell: false };
  if (cmd.endsWith('.exe')) return { cmd, shell: false };
  if (cmd.endsWith('.cmd') || cmd.endsWith('.bat')) return { cmd, shell: true };
  const dirs = (process.env.PATH || '').split(path.delimiter);
  for (const ext of ['.exe', '.cmd', '.bat']) {
    for (const dir of dirs) {
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

function runProcess(cmd, cmdArgs, cwd, timeoutMs = 300_000) {
  if (maxCalls !== null && totalCallsMade >= maxCalls) {
    budgetExhausted = true;
    return Promise.resolve({ code: 1, out: '', err: 'Call budget exhausted' });
  }
  totalCallsMade++;

  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const resolved = resolveExecutable(cmd);
    const child = spawn(resolved.cmd, cmdArgs, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: resolved.shell,
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
  });
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
        '-p', prompt,
        '--model', model,
        '--setting-sources', 'project',
        '--allowedTools', 'Skill', 'Read', 'Glob', 'Grep',
        '--output-format', 'stream-json',
        '--verbose',
      ],
      cwd
    );
    const { text, triggered } = parseStreamJsonEvents(res.out);
    const isRateLimited = /hit your (?:weekly|daily) limit/i.test(text);
    const ok = res.code === 0 && text.length > 0 && !isRateLimited;
    if (!ok && attempt < 1 && !budgetExhausted) {
      return agent(prompt, skill, attempt + 1);
    }
    return { text, triggered, ok, rawOut: res.out };
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
Return only JSON: {"results":[{"criterion":"...","pass":true|false,"note":"<=15 words"}]}

TASK:
${prompt}

ANSWER:
${answer || '(empty)'}

CRITERIA:
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;

  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-judge-'));
  try {
    const res = await runProcess(
      'claude',
      ['-p', judgePrompt, '--model', model, '--setting-sources', 'project', '--output-format', 'json'],
      cwd
    );
    const raw = JSON.parse(res.out).result;
    const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    if (json.results.length !== criteria.length) throw new Error('criteria count mismatch');
    return {
      grades: json.results.map((r) => Boolean(r.pass)),
      notes: json.results.map((r) => r.note ?? ''),
      rawOutput: raw,
    };
  } catch {
    if (attempt < 1 && !budgetExhausted) {
      return grade(prompt, answer, criteria, attempt + 1);
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
        if (budgetExhausted) break;
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
  const tasks = [];
  for (const file of specFiles) {
    const spec = JSON.parse(fs.readFileSync(path.join(evalDir, file), 'utf-8'));
    const resultFile = path.join(resultDir, `${spec.skill}.json`);
    const existingData = fs.existsSync(resultFile) ? JSON.parse(fs.readFileSync(resultFile, 'utf-8')) : null;

    for (const c of spec.cases) {
      if (casesFilter && !casesFilter.includes(c.id)) continue;

      // Resumability check: if already has sufficient runs and not --force, skip
      if (!force && existingData?.cases) {
        const existingCase = existingData.cases.find((ec) => ec.id === c.id);
        if (existingCase && existingCase.runs && existingCase.runs.length >= runsCount) {
          console.log(`Skipping already completed case ${spec.skill}/${c.id} (runs: ${existingCase.runs.length})`);
          continue;
        }
      }

      tasks.push(async () => {
        if (budgetExhausted) return null;
        console.log(`Evaluating ${spec.skill}/${c.id} (${runsCount} runs)...`);
        const caseRuns = [];
        const pct = (g) => (g ? Math.round((100 * g.filter(Boolean).length) / g.length) : null);

        for (let r = 1; r <= runsCount; r++) {
          if (budgetExhausted) break;

          const [baseline, withSkill] = await Promise.all([
            agent(c.prompt, null),
            agent(c.prompt, spec.skill),
          ]);

          let forced = null;
          // Only force if skill was expected to trigger and did not trigger on its own
          if (!withSkill.triggered && c.expectTrigger !== false && !budgetExhausted) {
            forced = await agent(`Use the ${spec.skill} skill. ${c.prompt}`, spec.skill);
          }

          const skillRun = forced ?? withSkill;
          const [baseGrades, skillGrades] = await Promise.all([
            grade(c.prompt, baseline.text, c.criteria),
            grade(c.prompt, skillRun.text, c.criteria),
          ]);

          const basePct = pct(baseGrades?.grades);
          const skillPct = pct(skillGrades?.grades);

          caseRuns.push({
            run: r,
            triggered: withSkill.triggered,
            forcedTriggered: forced ? forced.triggered : null,
            baseline: basePct,
            withSkill: skillPct,
            criteria: c.criteria.map((text, idx) => ({
              text,
              baseline: baseGrades?.grades?.[idx] ?? null,
              withSkill: skillGrades?.grades?.[idx] ?? null,
              note: skillGrades?.notes?.[idx] ?? '',
            })),
            errors:
              [baseline, withSkill, forced].filter((res) => res && !res.ok).length +
              [baseGrades, skillGrades].filter((res) => !res).length,
            answers: {
              baseline: redact(baseline.text),
              withSkill: redact(skillRun.text),
            },
          });
        }

        if (caseRuns.length === 0) return null;

        const baseScores = caseRuns.map((r) => r.baseline).filter((n) => typeof n === 'number');
        const skillScores = caseRuns.map((r) => r.withSkill).filter((n) => typeof n === 'number');
        const trigCount = caseRuns.filter((r) => r.triggered).length;

        const baseStats = confidenceInterval95(baseScores);
        const skillStats = confidenceInterval95(skillScores);
        const deltaStats = pairedDeltaConfidenceInterval(baseScores, skillScores);

        const row = {
          skill: spec.skill,
          id: c.id,
          expectTrigger: c.expectTrigger ?? true,
          runsCount: caseRuns.length,
          triggeredCount: trigCount,
          triggerRate: Math.round((trigCount / caseRuns.length) * 100),
          baseline: baseStats.mean,
          withSkill: skillStats.mean,
          baselineStats: baseStats,
          withSkillStats: skillStats,
          deltaStats,
          runs: caseRuns,
          errors: caseRuns.reduce((sum, r) => sum + r.errors, 0),
        };

        console.log(
          `  -> ${spec.skill}/${c.id}: trigger=${trigCount}/${caseRuns.length} base=${row.baseline}% skill=${row.withSkill}% delta=${deltaStats.mean}% (noise=${deltaStats.isNoise})`
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
    const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')).cases : [];
    for (const old of previous) {
      if (!cases.some((c) => c.id === old.id)) cases.push(old);
    }
    fs.writeFileSync(
      path.join(resultDir, `${skill}.json`),
      JSON.stringify({ skill, model, date, runsPerCase: runsCount, cases }, null, 2) + '\n',
      'utf-8'
    );
  }

  if (budgetExhausted) {
    console.log(`\nNotice: Execution stopped because max calls budget (${maxCalls}) was reached.`);
  }
}

// Generate report from stored results
const summaries = fs
  .readdirSync(resultDir)
  .filter((f) => f.endsWith('.json') && !f.startsWith('.'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(resultDir, f), 'utf-8')))
  .sort((a, b) => a.skill.localeCompare(b.skill));

const lines = [
  '# Skill quality',
  '',
  'Generated by `npm run evals` (`scripts/run-skill-evals.mjs`). Each case runs the prompt against two conditions in clean',
  'temporary projects: **baseline** (no skill installed) and **with skill** (skill installed in project).',
  'Grades are evaluated against explicit case criteria by an LLM judge with multi-run sampling.',
  '',
  '### Statistical Methodology (95% Confidence Interval)',
  '- **Runs per case (N)**: Each case is executed multiple times to isolate signal from model and judge variance.',
  "- **Confidence Intervals**: Computed using two-tailed Student's t-distribution at 95% confidence level for small sample sizes ($df = N - 1$).",
  '- **Noise threshold**: When the 95% confidence interval of the delta contains 0 ($CI_{lower} \\le 0 \\le CI_{upper}$), the difference is statistically **not distinguishable from noise**. Such skills are marked as **Noise** and are intentionally not awarded letter grades (A/B/C) to prevent misleading conclusions.',
  '- **Grades (for real signal only)**: **A** for $\\Delta \\ge +20$ and with-skill $\\ge 85\\%$ · **B** for with-skill $\\ge 75\\%$ · **C** otherwise.',
  '- **False Positive Rate**: Evaluated on explicit negative test cases (`expectTrigger: false`) where the agent must not load the skill.',
  '',
  '| Skill | Cases | Runs | Trigger | False Pos | Baseline (95% CI) | With skill (95% CI) | Delta (95% CI) | Grade | Errors |',
  '|---|---|---|---|---|---|---|---|---|---|',
];

for (const s of summaries) {
  const cases = s.cases || [];
  const totalRuns = cases.reduce((acc, c) => acc + (c.runsCount || (c.runs ? c.runs.length : 1)), 0);
  const avgRunsPerCase = cases.length > 0 ? Math.round(totalRuns / cases.length) : (s.runsPerCase || 1);

  // Trigger metrics
  const positiveCases = cases.filter((c) => c.expectTrigger !== false);
  const positiveTriggers = positiveCases.reduce(
    (acc, c) => acc + (c.triggeredCount !== undefined ? c.triggeredCount : c.triggered ? 1 : 0),
    0
  );
  const totalPositivePossible = positiveCases.reduce(
    (acc, c) => acc + (c.runsCount || (c.runs ? c.runs.length : 1)),
    0
  );
  const trigDisplay = totalPositivePossible > 0 ? `${positiveTriggers}/${totalPositivePossible}` : 'N/A';

  // False positive metrics
  const fp = falsePositiveRate(
    cases.flatMap((c) =>
      c.runs
        ? c.runs.map((r) => ({ expectTrigger: c.expectTrigger, triggered: r.triggered }))
        : [{ expectTrigger: c.expectTrigger, triggered: c.triggered }]
    )
  );
  const fpDisplay = fp.totalNegative > 0 ? `${fp.rate}% (${fp.falsePositives}/${fp.totalNegative})` : '0%';

  // Score aggregations
  const allBase = cases.map((c) => (c.baselineStats ? c.baselineStats.mean : c.baseline)).filter((n) => typeof n === 'number');
  const allSkill = cases.map((c) => (c.withSkillStats ? c.withSkillStats.mean : c.withSkill)).filter((n) => typeof n === 'number');

  const baseMean = Math.round(mean(allBase));
  const skillMean = Math.round(mean(allSkill));
  const deltaCI = pairedDeltaConfidenceInterval(allBase, allSkill);
  const meanDelta = deltaCI.mean;

  const isNoise = deltaCI.isNoise || (Math.abs(meanDelta) <= 10 && deltaCI.lower <= 0 && deltaCI.upper >= 0);
  const gradeStr = isNoise ? 'Noise*' : calculateGrade(meanDelta, skillMean, false);

  const deltaStr = `${meanDelta >= 0 ? '+' : ''}${meanDelta}% [${deltaCI.lower}%, ${deltaCI.upper}%]`;
  const totalErrors = cases.reduce((n, c) => n + (c.errors ?? 0), 0);

  lines.push(
    `| ${s.skill} | ${cases.length} | ${avgRunsPerCase}x | ${trigDisplay} | ${fpDisplay} | ${baseMean}% | ${skillMean}% | ${deltaStr} | ${gradeStr} | ${totalErrors} |`
  );
}

lines.push(
  '',
  '* \\*Noise: The 95% confidence interval spans zero, meaning the delta cannot be reliably distinguished from sample variance under current evaluation conditions. No letter grade is assigned.',
  '',
  '## Failed criteria with skill',
  ''
);

for (const s of summaries) {
  const cases = s.cases || [];
  const failed = cases.flatMap((c) => {
    if (c.criteria) {
      return c.criteria
        .filter((k) => k.withSkill === false)
        .map((k) => `- ${s.skill}/${c.id}: ${k.text}${k.note ? ` (${k.note})` : ''}`);
    }
    return [];
  });
  if (failed.length) lines.push(...failed);
}

lines.push(
  '',
  '## Known limits & Recommendations',
  '',
  '- Differences where the confidence interval crosses 0 are statistical noise. Expanding evaluation cases (e.g. to 10 cases with 3+ runs) narrows the confidence intervals.',
  '- Trigger rates below 100% on chat-only prompts indicate that skill descriptions require keyword tuning so agents activate them autonomously.'
);

if (summaries[0]) {
  lines.push('', `Model: ${summaries[0].model} · last report update: ${summaries.map((s) => s.date).sort().at(-1)}`);
}

fs.writeFileSync(path.join(root, 'docs', 'SKILLS_QUALITY.md'), lines.join('\n') + '\n', 'utf-8');
console.log('Updated docs/SKILLS_QUALITY.md');
