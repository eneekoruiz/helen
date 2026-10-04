import pc from 'picocolors';
import { listPromptEntries, readPromptEntry, type PromptEntry } from './prompts.js';
import { readPlaybooks, type PlaybookStep } from './apply.js';

export interface TokenEstimate {
  id: string;
  title: string;
  phase: string;
  characters: number;
  words: number;
  estimatedTokens: number;
  cost: {
    geminiFlash: number;
    geminiPro: number;
    claudeSonnet: number;
    gpt4o: number;
  };
}

export interface TokenBudgetSummary {
  measurement: { kind: 'estimate'; method: 'characters/3.8'; pricing: 'historical-reference'; includes: 'input-only' };
  target: string;
  totalPrompts: number;
  totalTokens: number;
  totalCost: {
    geminiFlash: number;
    geminiPro: number;
    claudeSonnet: number;
    gpt4o: number;
  };
  breakdown: TokenEstimate[];
}

/**
 * Rates per 1,000,000 input tokens (USD)
 */
const PRICING_PER_MILLION = {
  geminiFlash: 0.075,
  geminiPro: 1.25,
  claudeSonnet: 3.0,
  gpt4o: 2.5,
};

export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Standard approximation for code & english prose: ~3.8 chars per token
  return Math.ceil(text.length / 3.8);
}

export function calculateCost(tokens: number) {
  return {
    geminiFlash: (tokens / 1_000_000) * PRICING_PER_MILLION.geminiFlash,
    geminiPro: (tokens / 1_000_000) * PRICING_PER_MILLION.geminiPro,
    claudeSonnet: (tokens / 1_000_000) * PRICING_PER_MILLION.claudeSonnet,
    gpt4o: (tokens / 1_000_000) * PRICING_PER_MILLION.gpt4o,
  };
}

export function computeTokenBudget(target?: string): TokenBudgetSummary {
  let entries: PromptEntry[] = listPromptEntries();

  // If target matches a playbook, filter prompts in that playbook
  if (target) {
    const playbooks = readPlaybooks();
    const playbook = Object.hasOwn(playbooks.goals, target) ? playbooks.goals[target] : undefined;
    if (playbook) {
      const stepRefs = new Set(playbook.steps.filter((s: PlaybookStep) => ['prompt', 'flow', 'checkpoint'].includes(s.kind)).map((s: PlaybookStep) => s.ref));
      entries = entries.filter(e => {
        return stepRefs.has(e.id) || Array.from(stepRefs).some(ref => e.id === ref || e.id.endsWith(`/${ref}`));
      });
    } else {
      // Filter by phase or id match
      entries = entries.filter(e => e.id.includes(target) || (e.phase && e.phase.toLowerCase() === target.toLowerCase()));
    }
  }

  const breakdown: TokenEstimate[] = [];
  let totalTokens = 0;

  for (const entry of entries) {
    const content = readPromptEntry(entry);
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const tokens = estimateTokens(content);
    totalTokens += tokens;

    breakdown.push({
      id: entry.id,
      title: entry.title,
      phase: entry.phase || 'general',
      characters: content.length,
      words,
      estimatedTokens: tokens,
      cost: calculateCost(tokens),
    });
  }

  return {
    measurement: { kind: 'estimate', method: 'characters/3.8', pricing: 'historical-reference', includes: 'input-only' },
    target: target || 'all',
    totalPrompts: breakdown.length,
    totalTokens,
    totalCost: calculateCost(totalTokens),
    breakdown,
  };
}

export function printTokenBudget(summary: TokenBudgetSummary): void {
  console.log(pc.bold(`\n  HELEN Token & Cost Budget (${pc.cyan(summary.target)})`));
  console.log(pc.dim('  ─────────────────────────────────────────────────────────────'));
  console.log(`  Total Prompts Analyzed: ${pc.bold(String(summary.totalPrompts))}`);
  console.log(`  Estimated Total Tokens: ${pc.bold(pc.yellow(summary.totalTokens.toLocaleString()))}`);
  console.log();
  console.log(pc.bold('  Projected Cost (per full context pass):'));
  console.log(pc.dim('  Approximate token counts and historical reference rates; these are not current price quotes.'));
  console.log(`    • Gemini 1.5 Flash : $${summary.totalCost.geminiFlash.toFixed(4)}`);
  console.log(`    • Gemini 1.5 Pro   : $${summary.totalCost.geminiPro.toFixed(4)}`);
  console.log(`    • Claude 3.5 Sonnet: $${summary.totalCost.claudeSonnet.toFixed(4)}`);
  console.log(`    • GPT-4o           : $${summary.totalCost.gpt4o.toFixed(4)}`);
  console.log();

  if (summary.breakdown.length <= 15) {
    console.log(pc.bold('  Prompt Breakdown:'));
    for (const item of summary.breakdown) {
      console.log(`    ${pc.cyan(item.id.padEnd(28))} ${String(item.estimatedTokens).padStart(6)} tokens  ${pc.dim(`($${item.cost.claudeSonnet.toFixed(4)} Sonnet)`)}`);
    }
    console.log();
  } else {
    // Show top 5 heaviest
    const sorted = [...summary.breakdown].sort((a, b) => b.estimatedTokens - a.estimatedTokens);
    console.log(pc.bold('  Top 5 Heaviest Prompts:'));
    for (const item of sorted.slice(0, 5)) {
      console.log(`    ${pc.yellow(item.id.padEnd(28))} ${String(item.estimatedTokens).padStart(6)} tokens  ${pc.dim(`($${item.cost.claudeSonnet.toFixed(4)} Sonnet)`)}`);
    }
    console.log();
  }
}
