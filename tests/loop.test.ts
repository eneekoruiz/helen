import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { evidenceProblems, listLoops, loopStatus, readLoop, scoreLoop, startLoop, weightedTotal, type ScoreInput } from '../src/core/loop.js';
import { RubricSchema, getRubric, listRubrics, validateAllRubrics, validateRubric } from '../src/core/rubrics.js';

/** Scores for every criterion of a rubric, each with distinct, specific-looking evidence. */
function scoresFor(rubricId: string, value: number | Record<string, number>, tag = 'r1'): Record<string, ScoreInput> {
  const out: Record<string, ScoreInput> = {};
  for (const criterion of getRubric(rubricId).criteria) {
    const score = typeof value === 'number' ? value : (value[criterion.id] ?? value['*'] ?? 3);
    out[criterion.id] = { score, evidence: `Checked ${criterion.id} in round ${tag}: measured output recorded in artifacts/${tag}/${criterion.id}.txt` };
  }
  return out;
}

describe('rubrics', () => {
  it('ships valid rubrics with unique criteria and at least one critical one', () => {
    expect(validateAllRubrics()).toEqual([]);
    const rubrics = listRubrics();
    expect(rubrics.map(rubric => rubric.id).sort()).toEqual(['code', 'copy', 'design', 'general', 'release', 'security']);
    for (const rubric of rubrics) expect(rubric.criteria.some(criterion => criterion.critical)).toBe(true);
  });

  it('rejects malformed rubrics', () => {
    const good = getRubric('general');
    expect(validateRubric({ ...good, criteria: [...good.criteria, good.criteria[0]!] })).toContainEqual(expect.stringContaining('duplicate criterion id'));
    expect(validateRubric({ ...good, criteria: good.criteria.map(criterion => ({ ...criterion, critical: false })) })).toContainEqual(expect.stringContaining('at least one criterion must be critical'));
    expect(validateRubric({ ...good, threshold: 30 }).length).toBeGreaterThan(0);
    expect(validateRubric({ ...good, id: 'other' }, 'general.json')).toContainEqual(expect.stringContaining('must match the file name'));
    expect(RubricSchema.safeParse({}).success).toBe(false);
    expect(() => getRubric('nope')).toThrow(/Unknown rubric/);
    expect(() => getRubric('../etc')).toThrow(/Invalid rubric id/);
  });

  it('computes a weighted total from 0 to 100', () => {
    const rubric = getRubric('general');
    expect(weightedTotal(rubric, Object.fromEntries(rubric.criteria.map(c => [c.id, { score: 5 }])))).toBe(100);
    expect(weightedTotal(rubric, Object.fromEntries(rubric.criteria.map(c => [c.id, { score: 0 }])))).toBe(0);
    expect(weightedTotal(rubric, Object.fromEntries(rubric.criteria.map(c => [c.id, { score: 4 }])))).toBe(80);
  });
});

describe('evidence', () => {
  const rubric = getRubric('general');
  const entry = (score: number, evidence: string): ScoreInput => ({ score, evidence });

  it('asks for more evidence the higher the score', () => {
    expect(evidenceProblems(rubric, { 'acceptance-met': entry(5, 'all pass') })[0]).toContain('at least 40 characters');
    expect(evidenceProblems(rubric, { 'acceptance-met': entry(2, 'two of five hold, see notes') })).toEqual([]);
    expect(evidenceProblems(rubric, { 'acceptance-met': entry(0, 'x') })[0]).toContain('at least 10 characters');
  });

  it('rejects verdicts, empty answers and echoes of the question', () => {
    for (const text of ['Looks good', 'ok', 'It works.', 'n/a', 'perfect!', 'None']) {
      expect(evidenceProblems(rubric, { verified: entry(2, text) }).length, text).toBeGreaterThan(0);
    }
    expect(evidenceProblems(rubric, { 'acceptance-met': entry(4, rubric.criteria[0]!.ask) })[0]).toContain('repeats the criterion');
  });

  it('rejects the same evidence pasted onto three criteria', () => {
    const same = 'Everything was checked and all of it is fine in the final build output.';
    const problems = evidenceProblems(rubric, { 'acceptance-met': entry(4, same), verified: entry(4, same), 'no-regressions': entry(4, same) });
    expect(problems.join()).toContain('The same evidence is used for');
  });
});

describe('convergence loop', () => {
  let tmp: string;
  beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-loop-')); });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

  const open = (rubric = 'general', author = 'builder') => startLoop(tmp, { rubric, subject: 'Landing page for ceramic mugs', author });

  it('names loops, refuses lowering the bar and bad names', () => {
    expect(open().id).toBe('general-1');
    expect(open().id).toBe('general-2');
    expect(startLoop(tmp, { rubric: 'design', subject: 's', author: 'a', id: 'hero', threshold: 95 }).threshold).toBe(95);
    expect(() => startLoop(tmp, { rubric: 'design', subject: 's', author: 'a', threshold: 60 })).toThrow(/raised but not lowered/);
    expect(() => startLoop(tmp, { rubric: 'design', subject: 's', author: 'a', id: 'hero' })).toThrow(/already exists/);
    expect(() => startLoop(tmp, { rubric: 'design', subject: 's', author: 'a', id: '../x' })).toThrow(/Invalid loop id/);
    expect(() => startLoop(tmp, { rubric: 'design', subject: ' ', author: 'a' })).toThrow(/what is being worked on/);
    expect(() => startLoop(tmp, { rubric: 'design', subject: 's', author: 'bad name' })).toThrow(/Invalid agent/);
    expect(listLoops(tmp).map(loop => loop.id)).toEqual(['general-1', 'general-2', 'hero']);
  });

  it('walks from a weak first round to independent convergence', () => {
    const { id } = open();
    const first = scoreLoop(tmp, id, { scorer: 'builder', scores: scoresFor('general', { '*': 3, simplicity: 2 }, 'r1'), next: 'tighten scope' });
    expect(first.verdict).toBe('continue');
    expect(first.delta).toBeNull();
    expect(first.criticalFailing).toContain('acceptance-met');
    expect(first.focus[0]!.critical).toBe(true);
    expect(first.message).toContain('Critical criteria below 4');

    const second = scoreLoop(tmp, id, { scorer: 'builder', scores: scoresFor('general', 5, 'r2') });
    expect(second.total).toBe(100);
    expect(second.verdict).toBe('needs-independent-score'); // the author cannot confirm their own work
    expect(second.delta).toBeGreaterThan(0);

    const third = scoreLoop(tmp, id, { scorer: 'reviewer', scores: scoresFor('general', 5, 'r3') });
    expect(third.verdict).toBe('converged');
    expect(third.focus).toEqual([]);
    expect(loopStatus(tmp, id)).toMatchObject({ converged: true, best: 100 });
    expect(() => scoreLoop(tmp, id, { scorer: 'reviewer', scores: scoresFor('general', 5, 'r4') })).toThrow(/already converged/);
  });

  it('an independent reviewer who finds problems sends it back', () => {
    const { id } = open();
    scoreLoop(tmp, id, { scorer: 'builder', scores: scoresFor('general', 5, 'r1') });
    const review = scoreLoop(tmp, id, { scorer: 'reviewer', scores: scoresFor('general', { '*': 5, verified: 2 }, 'r2') });
    expect(review.verdict).toBe('continue');
    expect(review.criticalFailing).toEqual(['verified']);
    expect(review.focus[0]!.id).toBe('verified');
  });

  it('a high total never hides a failing critical criterion', () => {
    const { id } = open();
    const result = scoreLoop(tmp, id, { scorer: 'reviewer', scores: scoresFor('general', { '*': 5, honesty: 3 }, 'r1') });
    expect(result.total).toBeGreaterThan(90);
    expect(result.verdict).toBe('continue');
    expect(result.criticalFailing).toEqual(['honesty']);
  });

  it('requires every criterion unless the round carries earlier scores, and a carried round cannot converge', () => {
    const { id } = open();
    const full = scoresFor('general', 5, 'r1');
    expect(() => scoreLoop(tmp, id, { scorer: 'reviewer', scores: { 'acceptance-met': full['acceptance-met']! } })).toThrow(/Missing:/);
    scoreLoop(tmp, id, { scorer: 'builder', scores: { ...full, honesty: { score: 3, evidence: 'Residual risks were not listed in the report yet' } } });
    const partial = { honesty: { score: 5, evidence: 'Residual risks and unverified areas are now listed in the report' } };
    expect(() => scoreLoop(tmp, id, { scorer: 'reviewer', scores: partial })).toThrow(/carry/);
    const carried = scoreLoop(tmp, id, { scorer: 'reviewer', scores: partial, carry: true });
    expect(carried.complete).toBe(false);
    expect(carried.total).toBeGreaterThan(90);
    expect(carried.verdict).toBe('continue'); // fresh evidence for everything is still required
    expect(readLoop(tmp, id).iterations[1]!.scores['verified']!.carried).toBe(true);
  });

  it('flags a regression', () => {
    const { id } = open();
    scoreLoop(tmp, id, { scorer: 'builder', scores: scoresFor('general', 4, 'r1') });
    const worse = scoreLoop(tmp, id, { scorer: 'builder', scores: scoresFor('general', 2, 'r2') });
    expect(worse.regression).toBe(true);
    expect(worse.message).toContain('made it worse');
  });

  it('notices when rounds stop paying off', () => {
    const { id } = open('design');
    scoreLoop(tmp, id, { scorer: 'builder', scores: scoresFor('design', 3, 'r1') });
    expect(scoreLoop(tmp, id, { scorer: 'builder', scores: scoresFor('design', 3, 'r2') }).verdict).toBe('continue'); // too early to tell
    const stalled = scoreLoop(tmp, id, { scorer: 'builder', scores: scoresFor('design', 3, 'r3') });
    expect(stalled.verdict).toBe('stalled');
    expect(stalled.message).toContain('structurally different');
  });

  it('stops at the iteration limit and says it did not pass', () => {
    const { id } = open('release');
    let last;
    for (let round = 1; round <= getRubric('release').maxIterations; round += 1) {
      last = scoreLoop(tmp, id, { scorer: 'builder', scores: scoresFor('release', 2 + (round % 2), `r${round}`) });
    }
    expect(last!.verdict).toBe('exhausted');
    expect(last!.message).toContain('do not claim it passed');
  });

  it('validates the input it is given', () => {
    const { id } = open();
    expect(() => scoreLoop(tmp, id, { scorer: 'a b', scores: scoresFor('general', 4) })).toThrow(/Invalid agent/);
    expect(() => scoreLoop(tmp, id, { scorer: 'r', scores: { ...scoresFor('general', 4), bogus: { score: 3, evidence: 'something specific enough to read' } } })).toThrow(/not a criterion/);
    expect(() => scoreLoop(tmp, id, { scorer: 'r', scores: scoresFor('general', 7) })).toThrow(/whole number from 0 to 5/);
    expect(() => scoreLoop(tmp, id, { scorer: 'r', scores: scoresFor('general', 2.5) })).toThrow(/whole number/);
    expect(() => scoreLoop(tmp, id, { scorer: 'r', scores: Object.fromEntries(Object.keys(scoresFor('general', 4)).map(key => [key, { score: 4, evidence: 'fine' }])) })).toThrow(/Evidence is not acceptable/);
    expect(() => scoreLoop(tmp, 'nope', { scorer: 'r', scores: scoresFor('general', 4) })).toThrow(/Unknown loop/);
  });

  it('survives a torn line in the ledger and keeps the history readable', () => {
    const { id } = open();
    scoreLoop(tmp, id, { scorer: 'builder', scores: scoresFor('general', 3, 'r1') });
    fs.appendFileSync(path.join(tmp, '.helen', 'loops', `${id}.jsonl`), '{"type":"score","ts":"torn\n');
    expect(loopStatus(tmp, id).rounds).toHaveLength(1);
    expect(scoreLoop(tmp, id, { scorer: 'builder', scores: scoresFor('general', 4, 'r2') }).iteration).toBe(2);
  });
});
