import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { describe, expect, it } from 'vitest';

const runner = path.resolve('scripts/run-skill-evals.mjs');

describe('Evaluation runner argument validation', () => {
  it('requires an explicit call budget for live evaluations', () => {
    const result = spawnSync(process.execPath, [runner, 'helen-reprompt'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Live evaluations require --max-calls');
    expect(result.stdout).not.toContain('Evaluating');
  });

  it('stops zero-budget live runs before authentication or any prompt call', () => {
    const result = spawnSync(process.execPath, [runner, 'helen-reprompt', '--max-calls', '0'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('No provider calls permitted');
    expect(result.stdout).not.toContain('Evaluating');
  });

  it('reports an actionable missing-provider preflight instead of repeated failed evaluations', () => {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toUpperCase() !== 'PATH'));
    env.PATH = '';
    const result = spawnSync(process.execPath, [runner, 'helen-reprompt', '--max-calls', '1'], { encoding: 'utf8', env });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Evaluation preflight failed');
    expect(result.stderr).toContain('No evaluation prompts were sent');
    expect(result.stdout).not.toContain('Evaluating');
  });
  it('stops quota refusals after one invocation without calling a judge or retrying', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-eval-fixture-'));
    if (!path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error('Unsafe fixture cleanup target');
    try {
      fs.mkdirSync(path.join(dir, 'scripts', 'lib'), { recursive: true });
      fs.copyFileSync(runner, path.join(dir, 'scripts', 'run-skill-evals.mjs'));
      fs.cpSync(path.resolve('scripts/lib'), path.join(dir, 'scripts/lib'), { recursive: true });
      fs.mkdirSync(path.join(dir, 'skills', 'helen-reprompt'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'skills/helen-reprompt/SKILL.md'), '# Fixture');
      fs.mkdirSync(path.join(dir, 'evals'));
      fs.writeFileSync(path.join(dir, 'evals/helen-reprompt.json'), JSON.stringify({ skill: 'helen-reprompt', cases: ['quota-first', 'quota-second', 'quota-third'].map(id => ({ id, prompt: 'Answer in chat only.', criteria: ['Verified'] })) }));
      fs.mkdirSync(path.join(dir, 'docs'));
      const bin = path.join(dir, 'bin');
      fs.mkdirSync(bin);
      const counter = path.join(dir, 'calls.log');
      const fixture = path.join(bin, 'fixture.cjs');
      fs.writeFileSync(fixture, [
        "const fs=require('node:fs');",
        "const args=process.argv.slice(2);",
        "if(args[0]==='auth'){console.log(JSON.stringify({loggedIn:true}));process.exit(0);}",
        "const file=" + JSON.stringify(counter) + ";",
        "fs.appendFileSync(file,'call\\n');",
        "process.stdin.resume();process.stdin.on('end',()=>{console.log(JSON.stringify({type:'result',is_error:true,result:\"You've hit your weekly limit\"}));process.exitCode=1;});",
      ].join('\n'));
      if (process.platform === 'win32') {
        fs.writeFileSync(path.join(bin, 'claude.cmd'), '@"' + process.execPath + '" "' + fixture + '" %*\r\n');
      } else {
        const executable = path.join(bin, 'claude');
        fs.writeFileSync(executable, '#!/bin/sh\nexec "' + process.execPath + '" "' + fixture + '" "$@"\n');
        fs.chmodSync(executable, 0o755);
      }
      const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toUpperCase() !== 'PATH'));
      env.PATH = bin + path.delimiter + (process.env.PATH ?? process.env.Path ?? '');
      const result = spawnSync(process.execPath, [path.join(dir, 'scripts/run-skill-evals.mjs'), 'helen-reprompt', '--runs', '3', '--concurrency', '3', '--max-calls', '20'], { encoding: 'utf8', env, timeout: 90_000 });
      expect(result.status, result.stderr).toBe(1);
      expect(result.stderr).toContain('provider blocked (quota)');
      expect(fs.readFileSync(counter, 'utf8').trim().split('\n')).toHaveLength(1);
      const observations = JSON.parse(fs.readFileSync(path.join(dir, 'evals/results/helen-reprompt.json'), 'utf8'));
      expect(observations.cases[0].runs).toHaveLength(1);
      expect(observations.cases[0].baseline).toBeNull();
      expect(fs.readFileSync(path.join(dir, 'docs/SKILLS_QUALITY.md'), 'utf8')).toContain('UNMEASURED');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
  it.each([
    ['missing-skill'], ['--rnus', '3'], ['--runs', '1', '--runs', '2'],
    ['helen-reprompt', '--cases', 'missing-case'], ['--cases', ','],
  ])('rejects nonexistent selections or unknown options %j', (...args) => {
    const result = spawnSync(process.execPath, [runner, ...args, '--dry-run'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Unknown|select at least one/);
    expect(result.stdout).not.toContain('Evaluating');
  });
  it.each([
    ['--runs', 'NaN'],
    ['--concurrency', '0'],
    ['--max-calls', '-1'],
    ['--runs', '2garbage'],
    ['--runs'],
  ])('rejects invalid options %j before starting evaluations', (...args) => {
    const result = spawnSync(process.execPath, [runner, ...args, '--dry-run'], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/requires a value|must be an integer/);
    expect(result.stdout).not.toContain('Evaluating');
  });

  it('plans evaluation calls without invoking the provider', () => {
    const result = spawnSync(process.execPath, [runner, 'helen-reprompt', '--runs', '1', '--max-calls', '0', '--dry-run'], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Total skills: 1');
    expect(result.stdout).toContain('Configured max budget: 0 calls');
  });

  it('uses corrected confidence intervals in the standalone runner too', () => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e',
      "import { studentTCriticalValue, pairedDeltaConfidenceInterval } from './scripts/lib/evalsStats.mjs'; console.log(JSON.stringify({ t: studentTCriticalValue(50), noise: pairedDeltaConfidenceInterval([0], [100]).isNoise }));",
    ], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ t: 2.009, noise: true });
  });
  it('rejects empty statistics in the standalone runner rather than producing noise at zero', () => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e',
      "import { confidenceInterval95 } from './scripts/lib/evalsStats.mjs'; confidenceInterval95([]);",
    ], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('require finite observations');
  });
});
