import { describe, expect, it } from 'vitest';
import { listPromptEntries, readPrompt, resolvePromptEntry } from '../src/core/prompts.js';

describe('Prompt Library', () => {
  it('lists executable flows from the registry', () => {
    const entries = listPromptEntries();
    const flows = entries.filter(entry => entry.kind === 'flow').map(entry => entry.id);

    expect(flows).toContain('full-polish');
    expect(flows).toContain('release-candidate');
    expect(flows).toContain('client-delivery');
  });

  it('resolves the master prompt', () => {
    const entry = resolvePromptEntry('master');

    expect(entry.kind).toBe('master');
    expect(entry.absolutePath.endsWith('MASTER.md')).toBe(true);
  });

  it('exposes taxonomy and coverage guides', () => {
    const taxonomy = resolvePromptEntry('taxonomy');
    const coverage = readPrompt('coverage');

    expect(taxonomy.kind).toBe('guide');
    expect(coverage).toContain('Canonical Prompt Coverage Map');
  });

  it('resolves exact flow ids before basename matches', () => {
    const entry = resolvePromptEntry('security-hardening');

    expect(entry.kind).toBe('flow');
    expect(entry.id).toBe('security-hardening');
  });

  it('can read an atomic step by full id', () => {
    const content = readPrompt('security/security-hardening');

    expect(content).toContain('# Security Hardening');
    expect(content).toContain('## Más allá de estos criterios');
  });

  it('exposes standalone prompt families through the same resolver', () => {
    const entry = resolvePromptEntry('final/01-code-quality-audit');
    const content = readPrompt('discovery/01-methodology-and-blind-spots-audit');

    expect(entry.kind).toBe('prompt');
    expect(content).toContain('## Más allá de estos criterios');
  });

  it('exposes advanced blind-spot prompt families', () => {
    const privacy = resolvePromptEntry('privacy/01-privacy-legal-and-compliance-audit');
    const data = resolvePromptEntry('data/01-data-model-and-domain-integrity-audit');
    const design = resolvePromptEntry('design/01-product-design-and-awards-visual-excellence-audit');
    const cms = resolvePromptEntry('cms/01-static-content-to-editable-cms-fields');
    const agentQuality = readPrompt('agent-quality/01-agent-workflow-and-prompt-quality-audit');

    expect(privacy.kind).toBe('prompt');
    expect(data.kind).toBe('prompt');
    expect(design.kind).toBe('prompt');
    expect(cms.kind).toBe('prompt');
    expect(agentQuality).toContain('Agent Workflow and Prompt Quality Audit');
  });
});
