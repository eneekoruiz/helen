import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { PACKAGE_ROOT } from './version.js';

/**
 * Rubrics: what "good" means for a kind of work, written down once so that every agent measures
 * against the same bar instead of deciding for itself when it is done.
 */
const CriterionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,40}$/),
  title: z.string().min(3).max(120),
  weight: z.number().int().min(1).max(5),
  critical: z.boolean(),
  ask: z.string().min(20).max(600),
  evidence: z.string().min(20).max(600),
});

export const RubricSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,30}$/),
  title: z.string().min(3).max(120),
  description: z.string().min(20).max(600),
  threshold: z.number().min(50).max(100),
  minCritical: z.number().int().min(1).max(5),
  maxIterations: z.number().int().min(1).max(20),
  independentFinalScore: z.boolean(),
  criteria: z.array(CriterionSchema).min(4).max(20),
});

export type Rubric = z.infer<typeof RubricSchema>;
export type Criterion = z.infer<typeof CriterionSchema>;

export const RUBRICS_ROOT = path.join(PACKAGE_ROOT, 'docs', 'rubrics');

export function validateRubric(value: unknown, fileName?: string): string[] {
  const parsed = RubricSchema.safeParse(value);
  const issues: string[] = [];
  if (!parsed.success) {
    for (const issue of parsed.error.issues) issues.push(`${issue.path.join('.') || 'rubric'}: ${issue.message}`);
    return issues;
  }
  const rubric = parsed.data;
  if (fileName && `${rubric.id}.json` !== fileName) issues.push(`id "${rubric.id}" must match the file name ${fileName}`);
  const ids = rubric.criteria.map(criterion => criterion.id);
  for (const id of new Set(ids.filter((entry, index) => ids.indexOf(entry) !== index))) issues.push(`duplicate criterion id "${id}"`);
  if (!rubric.criteria.some(criterion => criterion.critical)) issues.push('at least one criterion must be critical');
  return issues;
}

export function listRubrics(root: string = RUBRICS_ROOT): Rubric[] {
  if (!fs.existsSync(root)) return [];
  const rubrics: Rubric[] = [];
  for (const name of fs.readdirSync(root).filter(entry => entry.endsWith('.json')).sort()) {
    const value: unknown = JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
    if (validateRubric(value, name).length === 0) rubrics.push(value as Rubric);
  }
  return rubrics;
}

export function getRubric(id: string, root: string = RUBRICS_ROOT): Rubric {
  if (!/^[a-z][a-z0-9-]{1,30}$/.test(id)) throw new Error(`Invalid rubric id "${id}".`);
  const file = path.join(root, `${id}.json`);
  if (!fs.existsSync(file)) throw new Error(`Unknown rubric "${id}". Available: ${listRubrics(root).map(rubric => rubric.id).join(', ')}`);
  const value: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  const issues = validateRubric(value, `${id}.json`);
  if (issues.length > 0) throw new Error(`Rubric "${id}" is invalid: ${issues.join('; ')}`);
  return value as Rubric;
}

/** Every rubric file is checked by `helen lint`. */
export function validateAllRubrics(root: string = RUBRICS_ROOT): string[] {
  if (!fs.existsSync(root)) return [];
  const issues: string[] = [];
  for (const name of fs.readdirSync(root).filter(entry => entry.endsWith('.json')).sort()) {
    try {
      for (const issue of validateRubric(JSON.parse(fs.readFileSync(path.join(root, name), 'utf8')), name)) issues.push(`${name}: ${issue}`);
    } catch (error) {
      issues.push(`${name}: invalid JSON - ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return issues;
}
