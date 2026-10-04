import { describe, expect, it } from 'vitest';
import { computeTokenBudget, estimateTokens, calculateCost } from '../src/core/tokenBudget.js';
import { readPlaybooks } from '../src/core/apply.js';
import { resolvePromptEntry } from '../src/core/prompts.js';

describe('helen token-budget', () => {
  it('estimates tokens based on text length heuristic', () => {
    const text = 'Hello world, this is a test prompt designed to estimate token count accurately.';
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(10);
    expect(tokens).toBeLessThan(35);
  });

  it('calculates cost projections across models', () => {
    const cost = calculateCost(1_000_000);
    expect(cost.claudeSonnet).toBe(3.0);
    expect(cost.geminiFlash).toBe(0.075);
    expect(cost.geminiPro).toBe(1.25);
    expect(cost.gpt4o).toBe(2.5);
  });

  it('computes full library budget breakdown', () => {
    const summary = computeTokenBudget();
    expect(summary.totalPrompts).toBeGreaterThan(50);
    expect(summary.totalTokens).toBeGreaterThan(10_000);
    expect(summary.totalCost.claudeSonnet).toBeGreaterThan(0);
  });

  it('filters budget by target playbook or phase', () => {
    const summary = computeTokenBudget('strategy');
    expect(summary.target).toBe('strategy');
    expect(summary.totalPrompts).toBeGreaterThan(0);
    expect(summary.totalPrompts).toBeLessThan(50);
  });

  it('includes flows and checkpoints required by the selected playbook', () => {
    const refs = readPlaybooks().goals.quality!.steps
      .filter(step => ['prompt', 'flow', 'checkpoint'].includes(step.kind))
      .map(step => resolvePromptEntry(step.ref).id);
    const summary = computeTokenBudget('quality');
    for (const id of refs) expect(summary.breakdown.map(entry => entry.id)).toContain(id);
  });

  it('treats prototype property names as ordinary unmatched filters', () => {
    expect(computeTokenBudget('constructor').totalPrompts).toBe(0);
  });
});
