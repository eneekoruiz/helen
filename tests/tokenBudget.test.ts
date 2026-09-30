import { describe, expect, it } from 'vitest';
import { computeTokenBudget, estimateTokens, calculateCost } from '../src/core/tokenBudget.js';

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
});
