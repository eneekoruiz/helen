import fs from 'node:fs';
import path from 'node:path';
import { validateAgentName } from './claims.js';
import { appendEvent, cleanText } from './events.js';
import { withLockSync } from './fileLock.js';
import { isSafeProjectPath } from './fs.js';
import { getRubric, type Rubric } from './rubrics.js';

/**
 * The convergence ledger.
 *
 * "Keep improving until it is good" is only a promise until something measures it. A loop scores the work
 * against a rubric, demands evidence for every score, compares each round with the best so far, notices
 * when the same approach has stopped paying off, and only declares convergence when the bar is met and
 * someone other than the author has confirmed it. Every round is kept in .helen/loops/<id>.jsonl.
 */
export type Verdict = 'continue' | 'converged' | 'needs-independent-score' | 'stalled' | 'exhausted';

export interface LoopHeader {
  type: 'start';
  ts: string;
  id: string;
  rubric: string;
  subject: string;
  author: string;
  threshold: number;
  minCritical: number;
  maxIterations: number;
  independent: boolean;
}

export interface ScoreInput {
  score: number;
  evidence: string;
}

export interface RecordedScore extends ScoreInput {
  carried?: boolean;
}

export interface FocusItem {
  id: string;
  title: string;
  score: number;
  critical: boolean;
  ask: string;
}

export interface LoopIteration {
  type: 'score';
  ts: string;
  iteration: number;
  scorer: string;
  scores: Record<string, RecordedScore>;
  total: number;
  delta: number | null;
  best: number;
  complete: boolean;
  criticalFailing: string[];
  verdict: Verdict;
  regression: boolean;
  notes?: string;
  next?: string;
}

export interface ScoreResult extends Omit<LoopIteration, 'type' | 'scores' | 'ts'> {
  id: string;
  focus: FocusItem[];
  message: string;
}

const LOOP_ID = /^[a-z0-9][a-z0-9-]{0,40}$/;
const GENERIC = /^(?:(?:looks?|seems?|is|are|it'?s)\s+)?(?:good|fine|ok(?:ay)?|great|correct|done|perfect|nice|clean|solid|works?)(?:\s+(?:to me|enough))?[.!]*$/i;
const NOTHING = /^(?:n\/?a|none|nothing|no|yes|todo|tbd|\.+|-+)$/i;
const EVIDENCE_MIN = { high: 40, mid: 15, low: 10 };

export function loopsDir(cwd: string): string {
  return path.join(cwd, '.helen', 'loops');
}

function validateLoopId(id: string): string {
  if (!LOOP_ID.test(id)) throw new Error(`Invalid loop id "${id}": use lowercase letters, digits and dashes (max 41).`);
  return id;
}

function loopFile(cwd: string, id: string): string {
  const file = path.join(loopsDir(cwd), `${validateLoopId(id)}.jsonl`);
  if (!isSafeProjectPath(cwd, file)) throw new Error('Loops must stay inside the project directory');
  return file;
}

function withLoopLock<T>(cwd: string, action: () => T): T {
  return withLockSync(path.join(cwd, '.helen', 'loops.lock'), action);
}

function parse(file: string): Array<LoopHeader | LoopIteration> {
  if (!fs.existsSync(file)) return [];
  const records: Array<LoopHeader | LoopIteration> = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const value = JSON.parse(line) as LoopHeader | LoopIteration;
      if (value.type === 'start' || value.type === 'score') records.push(value);
    } catch {
      // A torn line must not make the whole history unreadable.
    }
  }
  return records;
}

export function readLoop(cwd: string, id: string): { header: LoopHeader; iterations: LoopIteration[] } {
  const records = parse(loopFile(cwd, id));
  const header = records.find((record): record is LoopHeader => record.type === 'start');
  if (!header) throw new Error(`Unknown loop "${id}". Start one with: helen loop start <rubric> --subject "<what>"`);
  return { header, iterations: records.filter((record): record is LoopIteration => record.type === 'score') };
}

export function listLoops(cwd: string): Array<{ id: string; rubric: string; subject: string; iterations: number; total: number | null; verdict: Verdict | null }> {
  const dir = loopsDir(cwd);
  if (!fs.existsSync(dir)) return [];
  const loops: Array<{ id: string; rubric: string; subject: string; iterations: number; total: number | null; verdict: Verdict | null }> = [];
  for (const name of fs.readdirSync(dir).filter(entry => entry.endsWith('.jsonl')).sort()) {
    try {
      const { header, iterations } = readLoop(cwd, name.replace(/\.jsonl$/, ''));
      const last = iterations.at(-1);
      loops.push({ id: header.id, rubric: header.rubric, subject: header.subject, iterations: iterations.length, total: last?.total ?? null, verdict: last?.verdict ?? null });
    } catch {
      // Skip unreadable ledgers.
    }
  }
  return loops;
}

export function startLoop(cwd: string, input: { rubric: string; subject: string; author: string; id?: string; threshold?: number }): LoopHeader {
  validateAgentName(input.author);
  const rubric = getRubric(input.rubric);
  const subject = cleanText(input.subject.trim(), 300);
  if (!subject) throw new Error('Say what is being worked on: --subject "<what>"');
  if (input.threshold !== undefined && (input.threshold < rubric.threshold || input.threshold > 100)) {
    throw new Error(`The threshold may be raised but not lowered: ${rubric.threshold} to 100 for the ${rubric.id} rubric.`);
  }
  return withLoopLock(cwd, () => {
    let id = input.id;
    if (id) {
      validateLoopId(id);
      if (fs.existsSync(loopFile(cwd, id))) throw new Error(`Loop "${id}" already exists.`);
    } else {
      let n = 1;
      while (fs.existsSync(loopFile(cwd, `${rubric.id}-${n}`))) n += 1;
      id = `${rubric.id}-${n}`;
    }
    const header: LoopHeader = {
      type: 'start', ts: new Date().toISOString(), id, rubric: rubric.id, subject, author: input.author,
      threshold: input.threshold ?? rubric.threshold, minCritical: rubric.minCritical, maxIterations: rubric.maxIterations, independent: rubric.independentFinalScore,
    };
    fs.mkdirSync(loopsDir(cwd), { recursive: true });
    fs.appendFileSync(loopFile(cwd, id), `${JSON.stringify(header)}\n`, { mode: 0o600 });
    appendEvent(cwd, { type: 'loop.started', agent: input.author, data: { loop: id, rubric: rubric.id, subject } });
    return header;
  });
}

/** Weighted score 0-100. */
export function weightedTotal(rubric: Rubric, scores: Record<string, { score: number }>): number {
  const weights = rubric.criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  const earned = rubric.criteria.reduce((sum, criterion) => sum + criterion.weight * ((scores[criterion.id]?.score ?? 0) / 5), 0);
  return Math.round((earned / weights) * 1000) / 10;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** A score is a claim; evidence is what makes it checkable. Returns what is wrong, empty when acceptable. */
export function evidenceProblems(rubric: Rubric, submitted: Record<string, ScoreInput>): string[] {
  const problems: string[] = [];
  const seen = new Map<string, string[]>();
  for (const criterion of rubric.criteria) {
    const entry = submitted[criterion.id];
    if (!entry) continue;
    const text = entry.evidence.trim();
    const need = entry.score >= 4 ? EVIDENCE_MIN.high : entry.score >= 1 ? EVIDENCE_MIN.mid : EVIDENCE_MIN.low;
    if (text.length < need) problems.push(`${criterion.id}: a score of ${entry.score} needs at least ${need} characters of evidence (${criterion.evidence})`);
    else if (GENERIC.test(text) || NOTHING.test(text)) problems.push(`${criterion.id}: "${text}" is a verdict, not evidence. ${criterion.evidence}`);
    else if (normalize(text) === normalize(criterion.title) || normalize(text) === normalize(criterion.ask)) problems.push(`${criterion.id}: the evidence repeats the criterion instead of showing what was observed`);
    const key = normalize(text);
    seen.set(key, [...(seen.get(key) ?? []), criterion.id]);
  }
  for (const ids of seen.values()) {
    if (ids.length >= 3) problems.push(`The same evidence is used for ${ids.join(', ')}: evidence must be specific to each criterion`);
  }
  return problems;
}

export interface ScoreRequest {
  scorer: string;
  scores: Record<string, ScoreInput>;
  /** Reuse last round's score for criteria not re-examined. A carried round can never converge. */
  carry?: boolean;
  next?: string;
  notes?: string;
}

function focusFor(rubric: Rubric, scores: Record<string, RecordedScore>, minCritical: number): FocusItem[] {
  return rubric.criteria
    .filter(criterion => (scores[criterion.id]?.score ?? 0) < 5)
    .map(criterion => {
      const score = scores[criterion.id]?.score ?? 0;
      const failing = criterion.critical && score < minCritical;
      return { criterion, score, failing, deficit: criterion.weight * (5 - score) };
    })
    .sort((a, b) => Number(b.failing) - Number(a.failing) || b.deficit - a.deficit)
    .slice(0, 3)
    .map(({ criterion, score }) => ({ id: criterion.id, title: criterion.title, score, critical: criterion.critical, ask: criterion.ask }));
}

export function scoreLoop(cwd: string, id: string, request: ScoreRequest): ScoreResult {
  validateAgentName(request.scorer);
  return withLoopLock(cwd, () => {
    const { header, iterations } = readLoop(cwd, id);
    const rubric = getRubric(header.rubric);
    const last = iterations.at(-1);
    if (last?.verdict === 'converged') throw new Error(`Loop "${id}" already converged at ${last.total}. Start a new loop for new work.`);

    for (const key of Object.keys(request.scores)) {
      if (!rubric.criteria.some(criterion => criterion.id === key)) throw new Error(`"${key}" is not a criterion of the ${rubric.id} rubric. Criteria: ${rubric.criteria.map(criterion => criterion.id).join(', ')}`);
      const value = request.scores[key]!;
      if (!Number.isInteger(value.score) || value.score < 0 || value.score > 5) throw new Error(`${key}: the score must be a whole number from 0 to 5.`);
      if (typeof value.evidence !== 'string') throw new Error(`${key}: evidence is required.`);
    }
    const missing = rubric.criteria.filter(criterion => !(criterion.id in request.scores)).map(criterion => criterion.id);
    if (missing.length > 0 && !(request.carry && last)) {
      throw new Error(`Score every criterion. Missing: ${missing.join(', ')}${last ? ' (or pass carry to reuse last round for criteria you did not re-examine)' : ''}.`);
    }
    const problems = evidenceProblems(rubric, request.scores);
    if (problems.length > 0) throw new Error(`Evidence is not acceptable:\n- ${problems.join('\n- ')}`);

    const scores: Record<string, RecordedScore> = {};
    for (const criterion of rubric.criteria) {
      const submitted = request.scores[criterion.id];
      scores[criterion.id] = submitted
        ? { score: submitted.score, evidence: cleanText(submitted.evidence.trim(), 1500) }
        : { ...last!.scores[criterion.id]!, carried: true };
    }
    const complete = !Object.values(scores).some(entry => entry.carried);
    const total = weightedTotal(rubric, scores);
    const criticalFailing = rubric.criteria.filter(criterion => criterion.critical && scores[criterion.id]!.score < header.minCritical).map(criterion => criterion.id);
    const iteration = iterations.length + 1;
    const bestBefore = iterations.length ? Math.max(...iterations.map(entry => entry.total)) : null;
    const delta = last ? Math.round((total - last.total) * 10) / 10 : null;
    const best = Math.max(total, bestBefore ?? total);
    const regression = delta !== null && delta < -5;

    let verdict: Verdict = 'continue';
    const meetsBar = total >= header.threshold && criticalFailing.length === 0 && complete;
    if (meetsBar) verdict = header.independent && request.scorer === header.author ? 'needs-independent-score' : 'converged';
    else if (iteration >= header.maxIterations) verdict = 'exhausted';
    else if (iteration >= 3) {
      const gains = [...iterations, { total }].map((entry, index, all) => entry.total - (index === 0 ? Number.NEGATIVE_INFINITY : Math.max(...all.slice(0, index).map(prior => prior.total))));
      if (gains.slice(-2).every(gain => gain < 1.5)) verdict = 'stalled';
    }

    const focus = verdict === 'converged' ? [] : focusFor(rubric, scores, header.minCritical);
    const record: LoopIteration = {
      type: 'score', ts: new Date().toISOString(), iteration, scorer: request.scorer, scores, total, delta, best, complete, criticalFailing, verdict, regression,
      ...(request.notes ? { notes: cleanText(request.notes, 1000) } : {}), ...(request.next ? { next: cleanText(request.next, 1000) } : {}),
    };
    fs.appendFileSync(loopFile(cwd, id), `${JSON.stringify(record)}\n`, { mode: 0o600 });
    appendEvent(cwd, { type: 'loop.scored', agent: request.scorer, data: { loop: id, iteration, total, verdict, criticalFailing } });

    const messages: Record<Verdict, string> = {
      converged: `Converged at ${total} (bar ${header.threshold}) with no critical criterion failing, confirmed by ${request.scorer}. Report the evidence and the residual risks.`,
      'needs-independent-score': `The author's own score meets the bar (${total}). Self-scoring is biased: have a different agent score every criterion from scratch with fresh evidence (helen loop score ${id} --scorer <other-agent>).`,
      stalled: 'The last two rounds gained almost nothing. Stop polishing the same approach: name the assumption that caps the weakest criteria and try a structurally different option.',
      exhausted: `Reached the iteration limit (${header.maxIterations}) at ${total}, below the bar of ${header.threshold} or with a critical criterion failing. Report honestly what remains and why; do not claim it passed.`,
      continue: regression
        ? `Total dropped by ${Math.abs(delta!)}: the last change made it worse. Revert it or find out why before going on.`
        : criticalFailing.length ? `Critical criteria below ${header.minCritical}: ${criticalFailing.join(', ')}. Fix those before anything else.` : `${total} of ${header.threshold} needed. Work on the focus criteria, then score again.`,
    };
    return { id, iteration, scorer: request.scorer, total, delta, best, complete, criticalFailing, verdict, regression, ...(request.next ? { next: request.next } : {}), focus, message: messages[verdict] };
  });
}

export function loopStatus(cwd: string, id: string): { header: LoopHeader; rounds: Array<Pick<LoopIteration, 'iteration' | 'scorer' | 'total' | 'delta' | 'verdict' | 'criticalFailing' | 'complete' | 'next'>>; converged: boolean; best: number | null; weakest: FocusItem[] } {
  const { header, iterations } = readLoop(cwd, id);
  const rubric = getRubric(header.rubric);
  const last = iterations.at(-1);
  return {
    header,
    rounds: iterations.map(({ iteration, scorer, total, delta, verdict, criticalFailing, complete, next }) => ({ iteration, scorer, total, delta, verdict, criticalFailing, complete, ...(next ? { next } : {}) })),
    converged: last?.verdict === 'converged',
    best: iterations.length ? Math.max(...iterations.map(entry => entry.total)) : null,
    weakest: last && last.verdict !== 'converged' ? focusFor(rubric, last.scores, header.minCritical) : [],
  };
}
