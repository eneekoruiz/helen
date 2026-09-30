#!/usr/bin/env node
// Skill evals: for each case compare a baseline run (no skill) with a run where the
// skill is installed. Records whether the agent triggered the skill on its own and
// grades both answers against the case criteria with an LLM judge.
//
// Usage: node scripts/run-skill-evals.mjs [skill...] [--concurrency 4] [--model sonnet]
// Requires the `claude` CLI logged in. Results: evals/results/<skill>.json + docs/SKILLS_QUALITY.md
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
};
const concurrency = Number(opt('concurrency', '4'));
const model = opt('model', 'sonnet');
const reportOnly = args.includes('--report-only');
const only = args.filter((a) => !a.startsWith('--'));

const evalDir = path.join(root, 'evals');
const resultDir = path.join(evalDir, 'results');
fs.mkdirSync(resultDir, { recursive: true });

function run(cmd, cmdArgs, cwd, timeoutMs = 300_000) {
  return new Promise((resolve) => {
    const child = spawn(cmd, cmdArgs, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, out, err });
    });
  });
}

function makeProject(skill) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-eval-'));
  fs.writeFileSync(path.join(dir, 'README.md'), '# Sample project\n');
  if (skill) {
    fs.cpSync(path.join(root, 'skills', skill), path.join(dir, '.claude', 'skills', skill), {
      recursive: true,
    });
  }
  return dir;
}

async function agent(prompt, skill, attempt = 0) {
  const cwd = makeProject(skill);
  await run('git', ['init', '-q'], cwd);
  const res = await run(
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
  let text = '';
  let triggered = false;
  for (const line of res.out.split('\n')) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === 'assistant') {
        for (const block of event.message?.content ?? []) {
          if (block.type === 'tool_use' && block.name === 'Skill') triggered = true;
        }
      }
      if (event.type === 'result' && typeof event.result === 'string') text = event.result;
    } catch {
      // ignore non-JSON lines
    }
  }
  fs.rmSync(cwd, { recursive: true, force: true });
  const ok = res.code === 0 && text.length > 0;
  if (!ok && attempt < 1) return agent(prompt, skill, attempt + 1);
  return { text, triggered, ok };
}

async function grade(prompt, answer, criteria, attempt = 0) {
  if (!answer) return null;
  const judge = `You are a strict evaluator. Grade the ANSWER against each CRITERION.
Return only JSON: {"results":[{"criterion":"...","pass":true|false,"note":"<=15 words"}]}

TASK:
${prompt}

ANSWER:
${answer || '(empty)'}

CRITERIA:
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-judge-'));
  const res = await run('claude', ['-p', judge, '--model', model, '--setting-sources', 'project', '--output-format', 'json'], cwd);
  fs.rmSync(cwd, { recursive: true, force: true });
  try {
    const raw = JSON.parse(res.out).result;
    const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    if (json.results.length !== criteria.length) throw new Error('criteria mismatch');
    return json.results.map((r) => Boolean(r.pass));
  } catch {
    // A judge failure is a harness error, not a failed criterion: retry once, then report it
    return attempt < 1 ? grade(prompt, answer, criteria, attempt + 1) : null;
  }
}

// Stored answers may echo secret-shaped strings from the eval prompts; never keep them verbatim.
const redact = (text) =>
  text.replace(/(sk-(?:live|proj)-|AKIA|gh[pousr]_|xox[baprs]-)[A-Za-z0-9_-]{6,}/g, '$1[redacted]');

async function pool(tasks, size) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < tasks.length) {
        const i = next++;
        results[i] = await tasks[i]();
      }
    })
  );
  return results;
}

const files = fs
  .readdirSync(evalDir)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => only.length === 0 || only.includes(f.replace(/\.json$/, '')));

if (!reportOnly) {
  const tasks = [];
  for (const file of files) {
    const spec = JSON.parse(fs.readFileSync(path.join(evalDir, file), 'utf-8'));
    for (const c of spec.cases) {
      tasks.push(async () => {
        const [baseline, withSkill] = await Promise.all([agent(c.prompt, null), agent(c.prompt, spec.skill)]);
        let forced = null;
        if (!withSkill.triggered) forced = await agent(`Use the ${spec.skill} skill. ${c.prompt}`, spec.skill);
        const skillRun = forced ?? withSkill;
        const [baseGrades, skillGrades] = await Promise.all([
          grade(c.prompt, baseline.text, c.criteria),
          grade(c.prompt, skillRun.text, c.criteria),
        ]);
        const pct = (g) => (g ? Math.round((100 * g.filter(Boolean).length) / g.length) : null);
        const row = {
          skill: spec.skill,
          id: c.id,
          triggered: withSkill.triggered,
          forcedTriggered: forced ? forced.triggered : null,
          baseline: pct(baseGrades),
          withSkill: pct(skillGrades),
          criteria: c.criteria.map((text, i) => ({ text, baseline: baseGrades?.[i] ?? null, withSkill: skillGrades?.[i] ?? null })),
          errors: [baseline, withSkill, forced].filter((r) => r && !r.ok).length + [baseGrades, skillGrades].filter((g) => !g).length,
          answers: { baseline: redact(baseline.text), withSkill: redact(skillRun.text) },
        };
        console.log(`${spec.skill}/${c.id}: trigger=${row.triggered} base=${row.baseline}% skill=${row.withSkill}%`);
        return row;
      });
    }
  }
  const rows = await pool(tasks, concurrency);
  const bySkill = {};
  for (const r of rows) (bySkill[r.skill] ??= []).push(r);
  const date = new Date().toISOString().slice(0, 10);
  for (const [skill, cases] of Object.entries(bySkill)) {
    // Keep stored cases that were not re-run (e.g. when running a single case subset)
    const file = path.join(resultDir, `${skill}.json`);
    const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')).cases : [];
    for (const old of previous) if (!cases.some((c) => c.id === old.id)) cases.push(old);
    fs.writeFileSync(path.join(resultDir, `${skill}.json`), JSON.stringify({ skill, model, date, cases }, null, 2) + '\n');
  }
}

// Report from every stored result
const summaries = fs
  .readdirSync(resultDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(resultDir, f), 'utf-8')))
  .sort((a, b) => a.skill.localeCompare(b.skill));

const avg = (values) => {
  const xs = values.filter((x) => typeof x === 'number');
  return Math.round(xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1));
};
const lines = [
  '# Skill quality',
  '',
  'Generated by `npm run evals` (`scripts/run-skill-evals.mjs`). Each case runs the same prompt twice in a clean',
  'project: **baseline** (no skill) and **with skill** (skill installed; if the agent did not load it on its own the',
  'run is repeated asking for the skill by name). An LLM judge grades both answers against the case criteria.',
  '',
  '- **Trigger**: cases where the agent loaded the skill without being told to (description quality).',
  '- **Baseline / With skill**: share of criteria met. **Delta**: value added by the skill.',
  '- Grade: A delta ≥ 20 and with skill ≥ 85 · B with skill ≥ 75 · C otherwise. A high baseline with a small delta means',
  '  the model already handles those cases well; the skill then adds consistency and HELEN routing rather than raw quality.',
  '- Harness errors (empty answer or unparsable judge after one retry) are excluded from the averages and counted apart.',
  '',
  '| Skill | Cases | Trigger | Baseline | With skill | Delta | Grade | Errors |',
  '|---|---|---|---|---|---|---|---|',
];
for (const s of summaries) {
  const trig = s.cases.filter((c) => c.triggered).length;
  const base = avg(s.cases.map((c) => c.baseline));
  const withSkill = avg(s.cases.map((c) => c.withSkill));
  const delta = withSkill - base;
  const gradeLetter = delta >= 20 && withSkill >= 85 ? 'A' : withSkill >= 75 ? 'B' : 'C';
  lines.push(`| ${s.skill} | ${s.cases.length} | ${trig}/${s.cases.length} | ${base}% | ${withSkill}% | ${delta >= 0 ? '+' : ''}${delta} | ${gradeLetter} | ${s.cases.reduce((n, c) => n + (c.errors ?? 0), 0)} |`);
}
lines.push('', '## Failed criteria with skill', '');
for (const s of summaries) {
  const failed = s.cases.flatMap((c) => c.criteria.filter((k) => k.withSkill === false).map((k) => `- ${s.skill}/${c.id}: ${k.text}`));
  if (failed.length) lines.push(...failed);
}
lines.push('', '## Known limits', '', '- 3 cases per skill and one judge run: differences under ~10 points are noise, not signal. Negative deltas on a high baseline (e.g. helen-release, helen-a11y-perf) mean the model already answers well without the skill.', '- Trigger 0/3 means the agent did not load the skill on its own for short chat-only prompts; the skill is then applied when requested by name or through `helen-apply`.');
if (summaries[0]) lines.push('', `Model: ${summaries[0].model} · last run: ${summaries.map((s) => s.date).sort().at(-1)}`);
fs.writeFileSync(path.join(root, 'docs', 'SKILLS_QUALITY.md'), lines.join('\n') + '\n');
console.log('Wrote docs/SKILLS_QUALITY.md');
