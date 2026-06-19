import { describe, expect, it } from 'vitest';
import { listPromptEntries, readPrompt, resolvePromptEntry } from '../src/core/prompts.js';

describe('Prompt Library', () => {
  it('lists executable flows from the registry', () => {
    const entries = listPromptEntries();
    const flows = entries.filter(entry => entry.kind === 'flow').map(entry => entry.id);

    expect(flows).toContain('03-finish-features/apply-full-polish-flow');
    expect(flows).toContain('06-release/apply-release-candidate-flow');
    expect(flows).toContain('07-client-handoff/apply-client-delivery-flow');
    expect(flows).toContain('08-maintenance/apply-prompt-library-maintenance-flow');
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
    const entry = resolvePromptEntry('02-building/apply-security-hardening-flow');

    expect(entry.kind).toBe('flow');
    expect(entry.id).toBe('02-building/apply-security-hardening-flow');
  });

  it('can read an atomic step/prompt by full id', () => {
    const content = readPrompt('02-building/apply-safe-clean-code-simplification-pass');

    expect(content.toLowerCase()).toContain('clean code');
  });

  it('exposes standalone prompt families through the same resolver', () => {
    const entry = resolvePromptEntry('05-final-audit/audit-code-quality');
    const content = readPrompt('01-start-project/audit-methodology-and-blind-spots');

    expect(entry.kind).toBe('prompt');
    expect(content).toContain('Requisitos mínimos obligatorios');
  });

  it('exposes advanced blind-spot prompt families', () => {
    const privacy = resolvePromptEntry('04-before-production/audit-privacy-legal-and-compliance');
    const data = resolvePromptEntry('02-building/audit-data-model-and-domain-integrity');
    const design = resolvePromptEntry('03-finish-features/audit-product-design-and-awards-visual-excellence');
    const animation3d = resolvePromptEntry('03-finish-features/audit-animated-and-3d-visuals-performance-safety-and-integration');
    const cms = resolvePromptEntry('02-building/apply-cms-editable-content-conversion-flow');
    const lastMile = resolvePromptEntry('07-client-handoff/audit-browser-smoke-test-and-demo-readiness');
    const agentQuality = readPrompt('08-maintenance/apply-prompt-library-maintenance-flow');

    expect(privacy.kind).toBe('prompt');
    expect(data.kind).toBe('prompt');
    expect(design.kind).toBe('prompt');
    expect(animation3d.kind).toBe('prompt');
    expect(cms.kind).toBe('flow');
    expect(lastMile.kind).toBe('prompt');
    expect(agentQuality.toLowerCase()).toContain('prompt library');
  });

  it('exposes the yearly professional presence review through the CLI resolver', () => {
    const entry = resolvePromptEntry('audit-yearly-professional-presence-review');
    const content = readPrompt('08-maintenance/audit-yearly-professional-presence-review');

    expect(entry.kind).toBe('prompt');
    expect(entry.id).toBe('08-maintenance/audit-yearly-professional-presence-review');
    expect(content).toContain('## Más allá de estos criterios');
    expect(content).toContain('Manual actions required');
    expect(content).toContain('High-impact opportunities');
  });
});
