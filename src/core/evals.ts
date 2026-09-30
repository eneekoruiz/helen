import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface EvalCase {
  id: string;
  prompt: string;
  criteria: string[];
  expectTrigger?: boolean;
}

export interface EvalSpec {
  skill: string;
  cases: EvalCase[];
}

export interface StatSummary {
  mean: number;
  stdDev: number;
  marginOfError: number;
  lower: number;
  upper: number;
}

export interface DeltaStatSummary extends StatSummary {
  isNoise: boolean;
}

const EVALS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'evals');
const SKILLS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills');

export function getEvalsRoot(): string {
  return EVALS_ROOT;
}

/**
 * Two-tailed Student's t critical values for 95% confidence level.
 */
const T_TABLE_95: Record<number, number> = {
  1: 12.706,
  2: 4.303,
  3: 3.182,
  4: 2.776,
  5: 2.571,
  6: 2.447,
  7: 2.365,
  8: 2.306,
  9: 2.262,
  10: 2.228,
  11: 2.201,
  12: 2.179,
  13: 2.160,
  14: 2.145,
  15: 2.131,
  16: 2.120,
  17: 2.110,
  18: 2.101,
  19: 2.093,
  20: 2.086,
  25: 2.060,
  30: 2.042,
};

export function studentTCriticalValue(df: number): number {
  if (df <= 0) return 0;
  if (T_TABLE_95[df]) return T_TABLE_95[df]!;
  if (df < 20) {
    const keys = Object.keys(T_TABLE_95).map(Number).sort((a, b) => a - b);
    const closest = keys.reduce((prev, curr) => (Math.abs(curr - df) < Math.abs(prev - df) ? curr : prev));
    return T_TABLE_95[closest]!;
  }
  if (df <= 30) return 2.042;
  return 1.960; // Asymptotic standard normal distribution for large N
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function sampleVariance(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = mean(values);
  const sumSquares = values.reduce((sum, v) => sum + (v - avg) ** 2, 0);
  return sumSquares / (values.length - 1);
}

export function sampleStdDev(values: number[]): number {
  return Math.sqrt(sampleVariance(values));
}

/**
 * Calculates mean, sample standard deviation and a 95% confidence interval using Student's t-distribution.
 */
export function confidenceInterval95(values: number[]): StatSummary {
  const avg = mean(values);
  const n = values.length;
  if (n <= 1) {
    return {
      mean: Math.round(avg * 10) / 10,
      stdDev: 0,
      marginOfError: 0,
      lower: Math.round(avg * 10) / 10,
      upper: Math.round(avg * 10) / 10,
    };
  }
  const s = sampleStdDev(values);
  const df = n - 1;
  const t = studentTCriticalValue(df);
  const se = s / Math.sqrt(n);
  const moe = t * se;
  return {
    mean: Math.round(avg * 10) / 10,
    stdDev: Math.round(s * 10) / 10,
    marginOfError: Math.round(moe * 10) / 10,
    lower: Math.round((avg - moe) * 10) / 10,
    upper: Math.round((avg + moe) * 10) / 10,
  };
}

/**
 * Calculates paired delta confidence interval (withSkill - baseline) across N runs.
 */
export function pairedDeltaConfidenceInterval(baselineScores: number[], withSkillScores: number[]): DeltaStatSummary {
  const n = Math.min(baselineScores.length, withSkillScores.length);
  if (n === 0) {
    return { mean: 0, stdDev: 0, marginOfError: 0, lower: 0, upper: 0, isNoise: true };
  }
  const diffs: number[] = [];
  for (let i = 0; i < n; i++) {
    diffs.push(withSkillScores[i]! - baselineScores[i]!);
  }
  const ci = confidenceInterval95(diffs);
  // An interval that contains 0 means the delta is not distinguishable from noise
  const isNoise = n > 1 ? ci.lower <= 0 && ci.upper >= 0 : ci.mean === 0;
  return {
    ...ci,
    isNoise,
  };
}

export function calculateGrade(
  meanDelta: number,
  withSkillMean: number,
  isNoise: boolean
): 'A' | 'B' | 'C' | 'NOISE' {
  if (isNoise) return 'NOISE';
  if (meanDelta >= 20 && withSkillMean >= 85) return 'A';
  if (withSkillMean >= 75) return 'B';
  return 'C';
}

export function falsePositiveRate(cases: Array<{ expectTrigger?: boolean; triggered: boolean }>): {
  falsePositives: number;
  totalNegative: number;
  rate: number;
} {
  const negativeCases = cases.filter(c => c.expectTrigger === false);
  const totalNegative = negativeCases.length;
  if (totalNegative === 0) return { falsePositives: 0, totalNegative: 0, rate: 0 };
  const falsePositives = negativeCases.filter(c => c.triggered).length;
  return {
    falsePositives,
    totalNegative,
    rate: Math.round((falsePositives / totalNegative) * 100),
  };
}

/**
 * Parses events from claude `--output-format stream-json` lines.
 */
export function parseStreamJsonEvents(stdout: string): { text: string; triggered: boolean; toolCalls: string[] } {
  let text = '';
  let triggered = false;
  const toolCalls: string[] = [];

  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const event = JSON.parse(trimmed);
      if (event.type === 'assistant') {
        for (const block of event.message?.content ?? []) {
          if (block.type === 'tool_use') {
            toolCalls.push(block.name);
            if (block.name === 'Skill') {
              triggered = true;
            }
          }
        }
      }
      if (event.type === 'result' && typeof event.result === 'string') {
        text = event.result;
      }
    } catch {
      // Non-JSON lines are ignored
    }
  }

  return { text, triggered, toolCalls };
}

const ALLOWED_CASE_KEYS = new Set(['id', 'prompt', 'criteria', 'expectTrigger']);

/**
 * Validates an eval spec JSON against HELEN contract.
 */
export function validateEvalSpec(spec: unknown, filename: string, skillsRoot: string = SKILLS_ROOT): string[] {
  const issues: string[] = [];
  const baseName = path.basename(filename, '.json');

  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    return [`${filename}: must be an object`];
  }

  const record = spec as Record<string, unknown>;

  if (typeof record.skill !== 'string' || !record.skill.trim()) {
    issues.push(`${filename}: missing or invalid "skill" property`);
  } else {
    if (record.skill !== baseName) {
      issues.push(`${filename}: skill "${record.skill}" does not match file name "${baseName}"`);
    }
    const skillPath = path.join(skillsRoot, record.skill);
    if (!fs.existsSync(skillPath)) {
      issues.push(`${filename}: skill "${record.skill}" does not exist in ${path.relative(process.cwd(), skillsRoot)}`);
    }
  }

  if (!Array.isArray(record.cases) || record.cases.length === 0) {
    issues.push(`${filename}: "cases" must be a non-empty array`);
    return issues;
  }

  const seenIds = new Set<string>();

  record.cases.forEach((c: unknown, index: number) => {
    const caseLabel = `${filename} case #${index + 1}`;
    if (!c || typeof c !== 'object' || Array.isArray(c)) {
      issues.push(`${caseLabel}: case must be an object`);
      return;
    }

    const caseObj = c as Record<string, unknown>;

    // Check unknown keys
    for (const key of Object.keys(caseObj)) {
      if (!ALLOWED_CASE_KEYS.has(key)) {
        issues.push(`${caseLabel} (${caseObj.id ?? 'unknown'}): unknown property "${key}"`);
      }
    }

    // Check id
    if (typeof caseObj.id !== 'string' || !caseObj.id.trim()) {
      issues.push(`${caseLabel}: missing or empty "id"`);
    } else {
      if (!/^[a-z0-9_-]+$/.test(caseObj.id)) {
        issues.push(`${caseLabel} (${caseObj.id}): id must be lowercase alphanumeric with hyphens or underscores`);
      }
      if (seenIds.has(caseObj.id)) {
        issues.push(`${caseLabel}: duplicate case id "${caseObj.id}"`);
      }
      seenIds.add(caseObj.id);
    }

    // Check prompt
    if (typeof caseObj.prompt !== 'string' || !caseObj.prompt.trim()) {
      issues.push(`${caseLabel} (${caseObj.id}): missing or empty "prompt"`);
    } else {
      // Must not ask to modify or create files in the repo during evals
      const lower = caseObj.prompt.toLowerCase();
      const mentionsFileModification = /modify (?:or create )?files?|create (?:or edit )?files?|write to (?:file|disk)/i.test(lower);
      const forbidsModification = /do not modify|answer in chat only|chat only/i.test(lower);
      if (mentionsFileModification && !forbidsModification) {
        issues.push(`${caseLabel} (${caseObj.id}): prompt asks to modify files; eval prompts must be chat-only`);
      }
    }

    // Check criteria
    if (!Array.isArray(caseObj.criteria) || caseObj.criteria.length === 0) {
      issues.push(`${caseLabel} (${caseObj.id}): "criteria" must be a non-empty array`);
    } else {
      caseObj.criteria.forEach((crit, critIndex) => {
        if (typeof crit !== 'string' || !crit.trim()) {
          issues.push(`${caseLabel} (${caseObj.id}): criterion #${critIndex + 1} is empty`);
        }
      });
    }

    // Check expectTrigger
    if ('expectTrigger' in caseObj && typeof caseObj.expectTrigger !== 'boolean') {
      issues.push(`${caseLabel} (${caseObj.id}): "expectTrigger" must be a boolean`);
    }
  });

  return issues;
}

export function validateAllEvals(evalsDir: string = EVALS_ROOT, skillsRoot: string = SKILLS_ROOT): string[] {
  if (!fs.existsSync(evalsDir)) return [];
  const issues: string[] = [];
  const files = fs.readdirSync(evalsDir).filter(f => f.endsWith('.json') && !f.startsWith('.'));

  for (const file of files) {
    const fullPath = path.join(evalsDir, file);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const spec = JSON.parse(content);
      issues.push(...validateEvalSpec(spec, file, skillsRoot));
    } catch (err) {
      issues.push(`${file}: invalid JSON - ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return issues;
}
