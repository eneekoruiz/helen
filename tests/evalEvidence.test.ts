import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function evaluate(expression: string): unknown {
  const source = "import { summarizeEvidence, renderEvidenceReport, extractProviderMetrics, providerReportedFailure, combineProviderMetrics, classifyProviderBlocker, providerFailureCause } from './scripts/lib/evalEvidence.mjs'; import { runAnswerChecks, parseJudgeResult } from './scripts/lib/evalChecks.mjs'; console.log(JSON.stringify(" + expression + "));";
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

describe('Evaluation evidence integrity', () => {
  it('does not mislabel failed historical zero scores as measured quality', () => {
    const result = evaluate("summarizeEvidence({cases:[{baseline:0,withSkill:0,runs:[{baseline:null,withSkill:null,triggered:false,errors:4}]}]}, 'current')");
    expect(result).toMatchObject({ status: 'UNMEASURED', baseline: null, delta: null, trigger: 'unknown' });
  });
  it('excludes unmatched and errored pairs', () => {
    const result = evaluate("summarizeEvidence({fingerprint:'v',cases:[{runs:[{baseline:100,withSkill:null,errors:0},{baseline:null,withSkill:100,errors:0},{baseline:100,withSkill:100,errors:1},{baseline:Infinity,withSkill:100,errors:0}]}]}, 'v')");
    expect(result).toMatchObject({ validPairs: 0, attempted: 4 });
  });
  it('does not claim confidence from repeated trials on one task', () => {
    const result = evaluate("summarizeEvidence({fingerprint:'v',cases:[{runs:Array.from({length:20},()=>({baseline:0,withSkill:100,errors:0}))}]}, 'v')");
    expect(result).toMatchObject({ status: 'INSUFFICIENT', validPairs: 20, independentCases: 1, delta: null });
  });
  it('marks old content fingerprints as historical', () => {
    const result = evaluate("summarizeEvidence({fingerprint:'old',cases:[{runs:[{baseline:0,withSkill:100,errors:0}]}]}, 'new')");
    expect(result).toMatchObject({ status: 'HISTORICAL' });
  });
  it('separates forced effectiveness from natural selection', () => {
    const result = evaluate("summarizeEvidence({fingerprint:'v',cases:[{runs:[{baseline:0,withSkill:100,errors:0,triggered:false,forcedTriggered:true,condition:'forced',naturalAgentOk:true}]}]}, 'v')");
    expect(result).toMatchObject({ validPairs: 0, forced: 1, trigger: '0/1' });
  });
  it('deduplicates summaries and never invents telemetry', () => {
    const report = evaluate("renderEvidenceReport([{skill:'sample',cases:[],date:'2020-01-01'},{skill:'sample',cases:[],date:'2026-10-04'}])");
    expect(report).toContain('UNMEASURED');
    expect(report).not.toContain('Noise*');
    expect(report).toContain('| sample | unknown | unknown | unknown | unknown | 2026-10-04 |');
    expect(report).not.toContain('2020-01-01');
  });
  it('extracts reported tokens and preserves missing usage as unknown', () => {
    const value = JSON.stringify({ type: 'result', usage: { input_tokens: 12, output_tokens: 3, cache_read_input_tokens: 5 }, total_cost_usd: 0.02, duration_ms: 100 });
    expect(evaluate('extractProviderMetrics(' + JSON.stringify(value) + ')')).toEqual({ tokens: 20, costUsd: 0.02, durationMs: 100 });
    expect(evaluate('extractProviderMetrics("{}")')).toEqual({ tokens: null, costUsd: null, durationMs: null });
  });
  it('does not treat a failed result envelope as a successful answer', () => {
    expect(evaluate('providerReportedFailure(' + JSON.stringify('{"type":"result","is_error":true,"result":"Error"}') + ')')).toBe(true);
    expect(evaluate('providerReportedFailure(' + JSON.stringify('{"type":"result","subtype":"error_max_turns","result":"Partial"}') + ')')).toBe(true);
  });
  it('keeps aggregate cost unknown when retry telemetry is missing', () => {
    expect(evaluate("combineProviderMetrics([{tokens:3,costUsd:0.1,durationMs:100},null])")).toEqual({ tokens: null, costUsd: null, durationMs: null });
  });
  it('checks observable answers independently from a semantic judge', () => {
    const checks = [{ type: 'includes', value: 'verified' }, { type: 'excludes', value: '100/100' }];
    expect(evaluate('runAnswerChecks("verified with tests", ' + JSON.stringify(checks) + ')')).toEqual([true, true]);
    expect(evaluate('runAnswerChecks("100/100 verified", ' + JSON.stringify(checks) + ')')).toEqual([true, false]);
    expect(evaluate('runAnswerChecks(' + JSON.stringify('{"evidence":{"verified":true}}') + ',[{type:"json-equals",path:"evidence.verified",value:true}])')).toEqual([true]);
    expect(evaluate('runAnswerChecks("invalid JSON",[{type:"json-equals",path:"evidence.verified",value:true}])')).toEqual([false]);
  });
  it('matches judge grades to unique criterion indices even when order changes', () => {
    const raw = JSON.stringify({ results: [{ index: 2, pass: false }, { index: 1, pass: true }] });
    expect(evaluate('parseJudgeResult(' + JSON.stringify(raw) + ',2)')).toEqual({ grades: [true, false], notes: ['', ''] });
    const duplicate = JSON.stringify({ results: [{ index: 1, pass: true }, { index: 1, pass: true }] });
    const expression = '(()=>{try{parseJudgeResult(' + JSON.stringify(duplicate) + ',2);return false;}catch{return true;}})()';
    expect(evaluate(expression)).toBe(true);
  });
  it('identifies quota and authentication blockers instead of retrying unchanged failures', () => {
    expect(evaluate('classifyProviderBlocker("You have hit your weekly limit")')).toBe('quota');
    expect(evaluate('classifyProviderBlocker("invalid API key")')).toBe('authentication');
    expect(evaluate('classifyProviderBlocker("completed normally")')).toBeNull();
  });
  it('does not confuse successful security advice with a provider authentication error', () => {
    const advice = JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'Log authentication failed without exposing credentials' });
    expect(evaluate('providerFailureCause(' + JSON.stringify(advice) + ',0)')).toBeNull();
    const failure = JSON.stringify({ type: 'result', is_error: true, result: "You've hit your weekly limit" });
    expect(evaluate('providerFailureCause(' + JSON.stringify(failure) + ',1)')).toBe('quota');
  });
});
