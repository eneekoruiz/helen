import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from '../src/core/frontmatter.js';
import { INDEX_END, INDEX_START, renderPhaseIndex, updatePhaseIndexes } from '../src/core/promptIndex.js';
import { idFromRelativePath, listPromptEntries, readPrompt, resolvePromptEntry, searchPrompts } from '../src/core/prompts.js';

describe('Prompt library', () => {
  const entries = listPromptEntries();

  it('exposes master, rules and contract as library documents', () => {
    expect(resolvePromptEntry('master').kind).toBe('master');
    expect(resolvePromptEntry('rules').kind).toBe('guide');
    expect(readPrompt('contract')).toContain('# Prompt Contract');
  });

  it('every phase prompt has a summary, action and phase from frontmatter', () => {
    const phasePrompts = entries.filter(entry => entry.phase);
    expect(phasePrompts.length).toBeGreaterThanOrEqual(90);
    for (const entry of phasePrompts) {
      expect(entry.summary.length).toBeGreaterThan(20);
      expect(entry.action).toMatch(/^(APPLY|AUDIT|ENHANCE|GENERATE|INIT|PLAN|RESEARCH)$/);
      expect(entry.relativePath.startsWith(entry.phase!)).toBe(true);
    }
  });

  it('classifies flows and checkpoints and reads flow metadata from frontmatter', () => {
    const flow = resolvePromptEntry('apply-full-polish-flow');
    expect(flow.kind).toBe('flow');
    expect(flow.repeatable).toBe(true);
    expect(flow.stage).toBe('polish');
    expect(resolvePromptEntry('audit-quality-gates-checkpoint').kind).toBe('checkpoint');
  });

  it('resolves full ids, short ids and relative paths', () => {
    expect(resolvePromptEntry('02-building/security/apply-security-hardening-flow').id).toBe('02-building/security/apply-security-hardening-flow');
    expect(resolvePromptEntry('apply-security-hardening-flow').id).toBe('02-building/security/apply-security-hardening-flow');
    expect(resolvePromptEntry('docs/prompts/04-before-production/compliance/AUDIT-final-seo.md').id).toBe('04-before-production/compliance/audit-final-seo');
  });

  it('keeps legacy ids working through aliases', () => {
    const legacy: Record<string, string> = {
      'audit-initial-project-risk-scan': 'audit-project-risk-and-architecture',
      'apply-safe-clean-code-simplification-pass': 'apply-clean-code-pass-flow',
      'audit-build-and-compile-checkpoint': 'audit-quality-gates-checkpoint',
      'audit-product-design-and-awards-visual-excellence': 'audit-design-excellence',
      'enhance-taste-visual-pov': 'enhance-taste-and-art-direction',
      'generate-webgpu-shaders': 'generate-shader-experience',
      'plan-release-checklist': 'audit-release-readiness-checkpoint',
      'audit-mcp-servers-security-and-scope': 'audit-third-party-tools-and-mcp',
      'init-director-creativo-orquestador-40k': 'init-creative-direction-and-design-md',
    };
    for (const [oldId, newId] of Object.entries(legacy)) {
      expect(resolvePromptEntry(oldId).id.endsWith(newId)).toBe(true);
    }
  });

  it('suggests close matches for unknown ids', () => {
    expect(() => resolvePromptEntry('audit-seo-finall')).toThrow(/not found/);
    expect(() => resolvePromptEntry('seo final audit')).toThrow(/Did you mean: .*audit-final-seo/);
  });

  it('searches by words in id, title, summary and aliases', () => {
    expect(searchPrompts('privacy cookies').map(entry => entry.id)).toContain('04-before-production/compliance/enhance-privacy-and-legal-readiness');
    expect(searchPrompts('x')).toEqual([]);
  });

  it('keeps the yearly professional presence review with its output sections', () => {
    const content = readPrompt('audit-yearly-professional-presence-review');
    expect(content).toContain('Manual actions required');
    expect(content).toContain('High-impact opportunities');
  });

  it('derives ids from file names', () => {
    expect(idFromRelativePath('02-building/clean-code/APPLY-clean-code-pass-flow.md')).toBe('02-building/clean-code/apply-clean-code-pass-flow');
    expect(idFromRelativePath('x/README.md')).toBe('x/README');
  });
});

describe('Frontmatter parser', () => {
  it('reads scalars, booleans, inline and block lists', () => {
    const { data, body, hasFrontmatter } = parseFrontmatter('---\naction: AUDIT\nmodifies_code: false\ntags: [a, b]\naliases:\n  - old-one\n  - old-two\nsummary: "quoted: text"\n---\n\n# Title\n');
    expect(hasFrontmatter).toBe(true);
    expect(data).toEqual({ action: 'AUDIT', modifies_code: false, tags: ['a', 'b'], aliases: ['old-one', 'old-two'], summary: 'quoted: text' });
    expect(body.trim()).toBe('# Title');
  });

  it('handles documents without frontmatter', () => {
    expect(parseFrontmatter('# Only a title').hasFrontmatter).toBe(false);
  });
});

describe('Phase indexes', () => {
  it('are generated from frontmatter and currently up to date', () => {
    expect(updatePhaseIndexes(false)).toEqual([]);
    const index = renderPhaseIndex('06-release');
    expect(index.startsWith(INDEX_START)).toBe(true);
    expect(index.endsWith(INDEX_END)).toBe(true);
    expect(index).toContain('[apply-deploy-github-and-hosting](deploy/APPLY-deploy-github-and-hosting.md)');
  });

  it('inserts an index into a README that has none', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-index-'));
    fs.mkdirSync(path.join(root, '01-x'));
    fs.writeFileSync(path.join(root, '01-x', 'README.md'), '# Phase\n');
    fs.writeFileSync(path.join(root, '01-x', 'AUDIT-a.md'), '---\naction: AUDIT\nphase: 01-x\nsummary: Sample.\nmodifies_code: false\n---\n\n# A\n');

    expect(updatePhaseIndexes(true, root)).toEqual(['01-x/README.md']);
    expect(fs.readFileSync(path.join(root, '01-x', 'README.md'), 'utf-8')).toContain('| [audit-a](AUDIT-a.md) | AUDIT | Sample. |');
    expect(updatePhaseIndexes(false, root)).toEqual([]);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
