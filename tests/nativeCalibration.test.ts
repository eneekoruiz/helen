import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Observation { id: string; action: string; executionMode: string; modifiesFiles: boolean; brief: string; acceptance: string[]; limitations: string[] }
const observations = JSON.parse(fs.readFileSync('evals/native/reprompt-observations.json', 'utf8')) as {
  baseline: { cases: Observation[] }; withSkill: { cases: Observation[] }; limitations: string[];
};

describe('Recorded native reprompt calibration', () => {
  it('preserved intent and chat-only execution in both observed conditions', () => {
    for (const condition of [observations.baseline, observations.withSkill]) {
      expect(condition.cases.map(c => c.id)).toEqual(['advice', 'checkout', 'performance']);
      for (const result of condition.cases) {
        expect(result.action).toBe(result.id === 'advice' ? 'evaluate' : 'implement');
        expect(result.executionMode).toBe('chat-only');
        expect(result.modifiesFiles).toBe(false);
        expect(result.limitations.length).toBeGreaterThan(0);
      }
    }
  });
  it('recorded concrete retry acceptance and preserved performance baseline', () => {
    const cases = observations.withSkill.cases;
    expect(cases[1].acceptance.join(' ')).toMatch(/concurrent/);
    expect(cases[1].acceptance.join(' ')).toMatch(/one payment effect per idempotency key/);
    expect(cases[1].acceptance.join(' ')).toMatch(/UI and provider are preserved/);
    expect(cases[2].brief).toContain('p95 1200 ms at 100 requests/s');
    expect(cases[2].acceptance.join(' ')).toContain('preserving public response schema');
    expect(observations.limitations.join(' ')).toContain('not coding outcomes');
  });
});
