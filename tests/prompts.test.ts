import { describe, expect, it } from 'vitest';
import { listPromptEntries, readPrompt, resolvePromptEntry } from '../src/core/prompts.js';

describe('Prompt Library', () => {
  it('lists executable flows from the registry', () => {
    const entries = listPromptEntries();
    const flows = entries.filter(entry => entry.kind === 'flow').map(entry => entry.id);

    expect(flows).toContain('03-finish-features/full-polish-flow');
    expect(flows).toContain('06-release/release-candidate-flow');
    expect(flows).toContain('07-client-handoff/client-delivery-flow');
    expect(flows).toContain('08-maintenance/prompt-library-maintenance-flow');
  });

  it('resolves the master prompt', () => {
    const entry = resolvePromptEntry('master');

    expect(entry.kind).toBe('master');
    expect(entry.absolutePath.endsWith('MASTER.md')).toBe(true);
  });

  it('exposes taxonomy and coverage guides', () => {
    const taxonomy = resolvePromptEntry('taxonomy');
    const coverage = readPrompt('coverage');
    const standards = readPrompt('standards');

    expect(taxonomy.kind).toBe('guide');
    expect(coverage).toContain('Canonical Prompt Coverage Map');
    expect(standards).toContain('Prompt Standards');
  });

  it('resolves exact flow ids before basename matches', () => {
    const entry = resolvePromptEntry('02-building/security-hardening-flow');

    expect(entry.kind).toBe('flow');
    expect(entry.id).toBe('02-building/security-hardening-flow');
  });

  it('can read an atomic step/prompt by full id', () => {
    const content = readPrompt('02-building/safe-clean-code-simplification-pass');

    expect(content.toLowerCase()).toContain('clean code');
  });

  it('exposes standalone prompt families through the same resolver', () => {
    const entry = resolvePromptEntry('05-final-audit/code-quality-audit');
    const content = readPrompt('01-start-project/methodology-and-blind-spots-audit');

    expect(entry.kind).toBe('prompt');
    expect(content).toContain('Requisitos mínimos obligatorios');
  });

  it('exposes advanced blind-spot prompt families', () => {
    const privacy = resolvePromptEntry('04-before-production/privacy-legal-and-compliance-audit');
    const data = resolvePromptEntry('02-building/data-model-and-domain-integrity-audit');
    const design = resolvePromptEntry('03-finish-features/product-design-and-awards-visual-excellence-audit');
    const cms = resolvePromptEntry('02-building/cms-editable-content-conversion-flow');
    const lastMile = resolvePromptEntry('07-client-handoff/browser-smoke-test-and-demo-readiness-audit');
    const agentQuality = readPrompt('08-maintenance/prompt-library-maintenance-flow');

    expect(privacy.kind).toBe('prompt');
    expect(data.kind).toBe('prompt');
    expect(design.kind).toBe('prompt');
    expect(cms.kind).toBe('flow');
    expect(lastMile.kind).toBe('prompt');
    expect(agentQuality.toLowerCase()).toContain('prompt library');
  });
});
