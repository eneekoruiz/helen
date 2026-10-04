import { describe, expect, it } from 'vitest';
import {
  calculateGrade,
  confidenceInterval95,
  falsePositiveRate,
  mean,
  pairedDeltaConfidenceInterval,
  parseStreamJsonEvents,
  sampleStdDev,
  studentTCriticalValue,
  validateAllEvals,
  validateEvalSpec,
} from '../src/core/evals.js';

describe('Eval Statistics', () => {
  it('does not manufacture zero scores or confidence from absent observations', () => {
    expect(() => confidenceInterval95([])).toThrow('require finite observations');
    expect(() => confidenceInterval95([NaN])).toThrow('require finite observations');
    expect(() => pairedDeltaConfidenceInterval([], [])).toThrow('require observations');
  });
  it('computes mean and standard deviation correctly', () => {
    const data = [80, 90, 100];
    expect(mean(data)).toBe(90);
    expect(sampleStdDev(data)).toBe(10);
  });

  it('uses Student t critical values for 95% confidence intervals', () => {
    expect(studentTCriticalValue(1)).toBe(12.706);
    expect(studentTCriticalValue(2)).toBe(4.303);
    expect(studentTCriticalValue(9)).toBe(2.262);
    expect(studentTCriticalValue(21)).toBe(2.080);
    expect(studentTCriticalValue(29)).toBe(2.045);
    expect(studentTCriticalValue(31)).toBe(2.040);
    expect(studentTCriticalValue(50)).toBe(2.009);
    expect(studentTCriticalValue(100)).toBe(1.984);
  });

  it('computes 95% confidence intervals with t-distribution for small N', () => {
    // With N=3, mean=90, s=10, df=2, t=4.303, SE = 10 / sqrt(3) ~= 5.7735, moe = 4.303 * 5.7735 ~= 24.8
    const ci = confidenceInterval95([80, 90, 100]);
    expect(ci.mean).toBe(90);
    expect(ci.stdDev).toBe(10);
    expect(ci.marginOfError).toBeCloseTo(24.8, 0);
    expect(ci.lower).toBeCloseTo(65.2, 0);
    expect(ci.upper).toBeCloseTo(114.8, 0);
  });

  it('handles N=1 gracefully without error', () => {
    const ci = confidenceInterval95([100]);
    expect(ci.mean).toBe(100);
    expect(ci.stdDev).toBe(0);
    expect(ci.marginOfError).toBe(0);
    expect(ci.lower).toBe(100);
    expect(ci.upper).toBe(100);
  });

  it('detects noise in paired delta confidence intervals when interval spans zero', () => {
    // Paired diffs: [-10, 0, 10] -> mean delta 0 -> interval contains 0
    const deltaNoise = pairedDeltaConfidenceInterval([90, 80, 70], [80, 80, 80]);
    expect(deltaNoise.mean).toBe(0);
    expect(deltaNoise.isNoise).toBe(true);

    // Delta with small negative/positive variance containing 0
    const deltaNoise2 = pairedDeltaConfidenceInterval([80, 85, 90], [82, 83, 91]);
    expect(deltaNoise2.isNoise).toBe(true);

    // Strong distinct delta
    const deltaReal = pairedDeltaConfidenceInterval([40, 50, 40], [100, 100, 100]);
    expect(deltaReal.mean).toBe(56.7);
    expect(deltaReal.isNoise).toBe(false);
  });

  it('assigns NOISE grade when delta is not distinguishable from noise', () => {
    expect(calculateGrade(5, 95, true)).toBe('NOISE');
    expect(calculateGrade(-7, 85, true)).toBe('NOISE');
    expect(calculateGrade(25, 95, false)).toBe('A');
    expect(calculateGrade(15, 80, false)).toBe('B');
    expect(calculateGrade(5, 60, false)).toBe('C');
  });

  it('does not claim statistical significance from a single paired run', () => {
    expect(pairedDeltaConfidenceInterval([0], [100]).isNoise).toBe(true);
    expect(() => pairedDeltaConfidenceInterval([0, 50], [100])).toThrow('equal lengths');
  });

  it('computes false positive rates for negative test cases', () => {
    const cases = [
      { expectTrigger: false, triggered: false },
      { expectTrigger: false, triggered: true },
      { expectTrigger: true, triggered: true },
    ];
    const fp = falsePositiveRate(cases);
    expect(fp.totalNegative).toBe(2);
    expect(fp.falsePositives).toBe(1);
    expect(fp.rate).toBe(50);
  });
});

describe('Stream JSON Parsing', () => {
  it('parses assistant tool use and result events correctly', () => {
    const stream = [
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read' }] } }),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Skill' }] } }),
      JSON.stringify({ type: 'result', result: 'Here is the completed review.' }),
    ].join('\n');

    const parsed = parseStreamJsonEvents(stream);
    expect(parsed.triggered).toBe(true);
    expect(parsed.toolCalls).toEqual(['Read', 'Skill']);
    expect(parsed.text).toBe('Here is the completed review.');
  });

  it('ignores non-json lines and empty lines gracefully', () => {
    const raw = 'non-json line\n\n' + JSON.stringify({ type: 'result', result: 'Success' });
    const parsed = parseStreamJsonEvents(raw);
    expect(parsed.triggered).toBe(false);
    expect(parsed.text).toBe('Success');
  });
});

describe('Eval Spec Validation', () => {
  it('validates deterministic acceptance checks and rejects malformed checks', () => {
    const base = { skill: 'helen-release', cases: [{ id: 'check-case', prompt: 'Answer in chat only.', criteria: ['Evidence'], checks: [{ type: 'excludes', value: '100/100' }, { type: 'json-equals', path: 'evidence.verified', value: true }] }] };
    expect(validateEvalSpec(base, 'helen-release.json')).toEqual([]);
    const invalid = { ...base, cases: [{ ...base.cases[0], checks: [{ type: 'execute', value: 'shell' }] }] };
    expect(validateEvalSpec(invalid, 'helen-release.json')).toContain('helen-release.json case #1: invalid deterministic check #1');
  });
  it('validates bundled eval files successfully', () => {
    const issues = validateAllEvals();
    expect(issues).toEqual([]);
  });

  it('rejects unknown properties in cases', () => {
    const spec = {
      skill: 'helen-release',
      cases: [
        {
          id: 'test-case',
          prompt: 'Answer in chat only.',
          criteria: ['Valid criterion'],
          unexpectedField: true,
        },
      ],
    };
    const issues = validateEvalSpec(spec, 'helen-release.json');
    expect(issues.some(i => i.includes('unknown property "unexpectedField"'))).toBe(true);
  });

  it('rejects empty criteria and duplicate ids', () => {
    const spec = {
      skill: 'helen-release',
      cases: [
        { id: 'dup-id', prompt: 'chat only', criteria: [] },
        { id: 'dup-id', prompt: 'chat only', criteria: ['ok'] },
      ],
    };
    const issues = validateEvalSpec(spec, 'helen-release.json');
    expect(issues.some(i => i.includes('"criteria" must be a non-empty array'))).toBe(true);
    expect(issues.some(i => i.includes('duplicate case id "dup-id"'))).toBe(true);
  });

  it('flags prompts asking to modify files without chat-only guard', () => {
    const spec = {
      skill: 'helen-release',
      cases: [
        {
          id: 'bad-prompt',
          prompt: 'Please modify files in the src folder to fix bugs.',
          criteria: ['Correct fix'],
        },
      ],
    };
    const issues = validateEvalSpec(spec, 'helen-release.json');
    expect(issues.some(i => i.includes('prompt asks to modify files; eval prompts must be chat-only'))).toBe(true);
  });
});
