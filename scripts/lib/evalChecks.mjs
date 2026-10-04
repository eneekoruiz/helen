import { isDeepStrictEqual } from 'node:util';

/** Deterministic assertions complement semantic judging; failures are task failures, not missing evidence. */
export function runAnswerChecks(answer, checks = []) {
  return checks.map(check => {
    if (check.type === 'includes') return answer.includes(check.value);
    if (check.type === 'excludes') return !answer.includes(check.value);
    if (check.type === 'json-equals') {
      try {
        let value = JSON.parse(answer);
        for (const key of check.path.split('.')) {
          if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) return false;
          value = value[key];
        }
        return isDeepStrictEqual(value, check.value);
      } catch { return false; }
    }
    throw new Error('Unknown deterministic evaluation check: ' + check.type);
  });
}

export function parseJudgeResult(raw, criterionCount) {
  if (typeof raw !== 'string') throw new Error('Judge answer must be text');
  const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  const results = json.results;
  if (!Array.isArray(results) || results.length !== criterionCount
    || results.some(r => !r || !Number.isInteger(r.index) || r.index < 1 || r.index > criterionCount || typeof r.pass !== 'boolean')
    || new Set(results.map(r => r.index)).size !== criterionCount) throw new Error('Invalid or mismatched criterion grades');
  const ordered = [...results].sort((a, b) => a.index - b.index);
  return { grades: ordered.map(r => r.pass), notes: ordered.map(r => typeof r.note === 'string' ? r.note : '') };
}
