import { confidenceInterval95, pairedDeltaConfidenceInterval, parseStreamJsonEvents } from './evalsStats.mjs';

const score = value => Number.isFinite(value) && value >= 0 && value <= 100;
const validPair = run => score(run.baseline) && score(run.withSkill)
  && (run.baselineOk ?? run.errors === 0) && (run.skillOk ?? run.errors === 0);
const knownMetric = values => values.length && values.every(Number.isFinite)
  ? values.reduce((sum, value) => sum + value, 0) : null;

/** Historical summary means are not evidence: reconstruct exclusively from raw observations. */
export function summarizeEvidence(summary, currentFingerprint, condition = 'natural') {
  const cases = Array.isArray(summary.cases) ? summary.cases : [];
  const conditionRun = run => (run.condition ?? (run.forcedTriggered !== null && run.forcedTriggered !== undefined ? 'forced' : 'natural')) === condition;
  const allRuns = cases.flatMap(c => Array.isArray(c.runs) ? c.runs.filter(conditionRun) : []);
  const pairedCases = cases.map(c => {
    const pairs = (c.runs ?? []).filter(conditionRun).filter(validPair);
    return pairs.length ? {
      baseline: pairs.reduce((sum, r) => sum + r.baseline, 0) / pairs.length,
      withSkill: pairs.reduce((sum, r) => sum + r.withSkill, 0) / pairs.length,
      pairs: pairs.length,
    } : null;
  }).filter(Boolean);
  const activation = cases.flatMap(c => (c.runs ?? [])
    .filter(r => (r.naturalAgentOk ?? r.errors === 0) && typeof r.triggered === 'boolean')
    .map(r => ({ expected: c.expectTrigger !== false, triggered: r.triggered })));
  const positive = activation.filter(a => a.expected);
  const negative = activation.filter(a => !a.expected);
  const fresh = Boolean(summary.fingerprint && summary.fingerprint === currentFingerprint);
  const delta = pairedCases.length >= 2 ? pairedDeltaConfidenceInterval(
    pairedCases.map(c => c.baseline), pairedCases.map(c => c.withSkill)) : null;
  const status = !pairedCases.length ? 'UNMEASURED' : !fresh ? 'HISTORICAL'
    : pairedCases.length < 2 ? 'INSUFFICIENT' : delta.isNoise ? 'INCONCLUSIVE' : 'MEASURED';
  return {
    status, fresh, cases: cases.length, attempted: allRuns.length,
    validPairs: pairedCases.reduce((sum, c) => sum + c.pairs, 0), independentCases: pairedCases.length,
    baseline: pairedCases.length ? confidenceInterval95(pairedCases.map(c => c.baseline)) : null,
    withSkill: pairedCases.length ? confidenceInterval95(pairedCases.map(c => c.withSkill)) : null,
    delta, errors: allRuns.reduce((sum, r) => sum + (r.errors ?? 0), 0),
    trigger: positive.length ? `${positive.filter(a => a.triggered).length}/${positive.length}` : 'unknown',
    falsePositive: negative.length ? `${negative.filter(a => a.triggered).length}/${negative.length}` : 'unknown',
    forced: cases.flatMap(c => c.runs ?? []).filter(r => !conditionRun(r) && condition === 'natural').length,
    tokens: knownMetric(allRuns.map(r => r.metrics?.tokens)),
    costUsd: knownMetric(allRuns.map(r => r.metrics?.costUsd)),
    durationMs: knownMetric(allRuns.map(r => r.metrics?.durationMs)),
    blocker: summary.providerBlocker ?? allRuns.map(r =>
      r.failures?.baseline ?? r.failures?.naturalSkill
      ?? (r.baselineOk === false ? classifyProviderBlocker(r.answers?.baseline ?? '') : null)
      ?? (r.skillOk === false ? classifyProviderBlocker(r.answers?.withSkill ?? '') : null)).find(value => value === 'quota' || value === 'authentication') ?? null,
  };
}

export function renderEvidenceReport(summaries, fingerprints = {}) {
  const clean = new Map();
  for (const summary of summaries) {
    const previous = clean.get(summary.skill);
    if (!previous || (summary.date ?? '') > (previous.date ?? '')) clean.set(summary.skill, summary);
  }
  const lines = ['# Skill quality', '',
    'Generated from stored observations; report generation makes no provider calls.',
    'Quality is **unmeasured** when execution or judging fails. Historical observations do not certify the current skill version.',
    'Activation counts exclude failed observations and remain separate from answer effectiveness. Forced activation is not natural routing.', '',
    '| Skill | Evidence | Valid pairs / attempted | Independent cases | Natural trigger | False activation | Forced runs | Baseline | With skill | Delta 95% CI | Errors |',
    '|---|---|---|---|---|---|---|---|---|---|---|'];
  const measured = (stats, count) => !stats ? 'unknown' : count < 2 ? `${stats.mean}% (descriptive)`
    : `${stats.mean}% [${stats.lower}, ${stats.upper}]`;
  for (const summary of [...clean.values()].sort((a, b) => a.skill.localeCompare(b.skill))) {
    const e = summarizeEvidence(summary, fingerprints[summary.skill]);
    const delta = e.delta ? `${e.delta.mean}% [${e.delta.lower}, ${e.delta.upper}]` : 'unknown';
    lines.push(`| ${summary.skill} | ${e.status} | ${e.validPairs}/${e.attempted} | ${e.independentCases} | ${e.trigger} | ${e.falsePositive} | ${e.forced} | ${measured(e.baseline, e.independentCases)} | ${measured(e.withSkill, e.independentCases)} | ${delta} | ${e.errors} |`);
  }
  lines.push('', '## Interpretation and limits', '',
    '- UNMEASURED: no valid paired observations. This is not a zero quality score and not statistical noise.',
    '- HISTORICAL: observations lack the current content fingerprint; rerun before drawing conclusions about edited skills.',
    '- INSUFFICIENT: fewer than two independent cases. Descriptive means are not a confidence claim.',
    '- INCONCLUSIVE: the paired case-mean confidence interval includes zero; this does not prove equivalence.',
    '- MEASURED: a delta was distinguishable from zero in these cases; it is not a guarantee of future results.',
    '- Baseline and skill scores use only matching successful pairs. Case means are the independent unit; repeated trials do not inflate task coverage.',
    '- Student-t intervals assume independent case means and approximately normal errors; a two-case pilot is exploratory and cannot establish general effectiveness.',
    '- Chat-only grades measure answer criteria. They do not verify changes to a real repository or specialized-agent execution.',
    '- A forced skill answer and naturally selected answer are different experimental conditions; forced trial counts are explicit.',
    '- No costs or tokens are inferred from language or prompt length. Unknown provider telemetry remains unknown.', '',
    '- Error counts are recorded failed stages, not billed model requests. Historical runners also counted unavailable judges after execution failed.', '',
    '## Forced skill condition (separate from natural selection)', '',
    '| Skill | Evidence | Valid pairs / attempted | Independent cases | Baseline | Forced skill | Delta 95% CI | Errors |',
    '|---|---|---|---|---|---|---|---|');
  for (const summary of [...clean.values()].sort((a, b) => a.skill.localeCompare(b.skill))) {
    const e = summarizeEvidence(summary, fingerprints[summary.skill], 'forced');
    const delta = e.delta ? `${e.delta.mean}% [${e.delta.lower}, ${e.delta.upper}]` : 'unknown';
    lines.push(`| ${summary.skill} | ${e.status} | ${e.validPairs}/${e.attempted} | ${e.independentCases} | ${measured(e.baseline, e.independentCases)} | ${measured(e.withSkill, e.independentCases)} | ${delta} | ${e.errors} |`);
  }
  lines.push('',
    '## Reported execution metrics', '', '| Skill | Tokens | Reported cost USD | Sum of call durations ms | Model | Observation date |',
    '|---|---|---|---|---|---|');
  for (const summary of [...clean.values()].sort((a, b) => a.skill.localeCompare(b.skill))) {
    const runs = (summary.cases ?? []).flatMap(c => c.runs ?? []);
    const metric = key => knownMetric(runs.map(r => r.metrics?.[key])) ?? 'unknown';
    lines.push(`| ${summary.skill} | ${metric('tokens')} | ${metric('costUsd')} | ${metric('durationMs')} | ${summary.model ?? 'unknown'} | ${summary.date ?? 'unknown'} |`);
  }
  lines.push('', '## Answer token comparison', '',
    'Compare identical task/model conditions; judge tokens are overhead, not answer-generation cost. Older experiments without per-condition telemetry remain unknown.', '',
    '| Skill | Baseline answer tokens | Natural skill answer tokens | Forced answer tokens | Judge tokens |',
    '|---|---|---|---|---|');
  for (const summary of [...clean.values()].sort((a, b) => a.skill.localeCompare(b.skill))) {
    const runs = (summary.cases ?? []).flatMap(c => c.runs ?? []);
    const metric = key => knownMetric(runs.map(r => r.metricsByCondition?.[key]?.tokens)) ?? 'unknown';
    const forced = runs.filter(r => r.condition === 'forced');
    const forcedTokens = knownMetric(forced.map(r => r.metricsByCondition?.forcedSkill?.tokens)) ?? 'unknown';
    const judgeTokens = knownMetric(runs.flatMap(r => [r.metricsByCondition?.judgeBaseline?.tokens, r.metricsByCondition?.judgeSkill?.tokens])) ?? 'unknown';
    lines.push(`| ${summary.skill} | ${metric('baseline')} | ${metric('naturalSkill')} | ${forcedTokens} | ${judgeTokens} |`);
  }
  lines.push('', 'Historical files for retired skills and archived previous versions remain in `evals/results`; they are excluded from the current-skill table.', '', 'Acceptance criteria and the live evaluation procedure: [EVALUATION_PLAN.md](EVALUATION_PLAN.md).', '');
  const blocked = [...clean.values()].map(summary => ({ skill: summary.skill, cause: summarizeEvidence(summary, fingerprints[summary.skill]).blocker })).filter(item => item.cause);
  if (blocked.length) {
    lines.push('## Provider blockers', '', ...blocked.map(item => `- ${item.skill}: **${item.cause}**. Resolve the provider quota or authentication before rerunning; authentication status alone does not establish usable quota.`), '',
      'Inspect the plan without provider calls: `npm run evals -- helen-reprompt --dry-run`.',
      'After access changes, rerun the same bounded experiment: `npm run evals -- helen-reprompt --model haiku --runs 3 --cases question-remains-question,explicit-exclusion-preserved --max-calls 28 --concurrency 2 --force`.', '');
  }
  return lines.join('\n');
}

/** Accept provider-reported usage only; absent fields are unknown, not zero. */
export function extractProviderMetrics(stdout) {
  const events = [];
  for (const line of (stdout ?? '').split('\n')) {
    try { events.push(JSON.parse(line)); } catch { /* non-JSON diagnostics */ }
  }
  const result = events.findLast(event => event.type === 'result') ?? events.at(-1);
  const usage = result?.usage;
  const tokenFields = ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'];
  const tokens = usage && Number.isFinite(usage.input_tokens) && Number.isFinite(usage.output_tokens)
    ? tokenFields.reduce((sum, key) => sum + (Number.isFinite(usage[key]) ? usage[key] : 0), 0) : null;
  return { tokens, costUsd: Number.isFinite(result?.total_cost_usd) ? result.total_cost_usd : null,
    durationMs: Number.isFinite(result?.duration_ms) ? result.duration_ms : null };
}

export function combineProviderMetrics(values) {
  return Object.fromEntries(['tokens', 'costUsd', 'durationMs'].map(key => [key,
    values.length && values.every(value => Number.isFinite(value?.[key]))
      ? values.reduce((sum, value) => sum + value[key], 0) : null]));
}

export function providerReportedFailure(stdout) {
  for (const line of (stdout ?? '').split('\n')) {
    try {
      const event = JSON.parse(line);
      if (event.is_error === true || (event.type === 'result' && String(event.subtype ?? '').startsWith('error'))) return true;
    } catch { /* non-JSON diagnostic */ }
  }
  return false;
}

export function classifyProviderBlocker(text) {
  if (/you(?:'ve| have) hit your (?:weekly|daily|monthly) limit|credit balance is too low|insufficient (?:credits|quota)|quota (?:exceeded|exhausted)/i.test(text)) return 'quota';
  if (/not logged in|authentication failed|invalid api key|unauthorized|please (?:run|use).*login/i.test(text)) return 'authentication';
  return null;
}

export function providerFailureCause(stdout, code, stderr = '') {
  if (code === 0 && !providerReportedFailure(stdout)) return null;
  return classifyProviderBlocker(parseStreamJsonEvents(stdout).text + '\n' + stderr);
}
