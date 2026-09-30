import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { findPromptOverlaps, readPrompt } from '../src/core/prompts.js';
import { compareCatalogItems, checkCatalogHealth } from '../src/core/catalog.js';
import { setupProject, uninstallProject, detectInstalledAgents } from '../src/core/setup.js';
import { getConfigValue, setConfigValue, readConfig } from '../src/core/config.js';
import { startProgress } from '../src/core/progress.js';
import { buildPlan } from '../src/core/apply.js';

describe('HELEN Wave 1-3 Comprehensive Features', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-feats-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('detects prompt overlaps using Jaccard word similarity', () => {
    const overlaps = findPromptOverlaps(undefined, 0.4);
    expect(Array.isArray(overlaps)).toBe(true);
    if (overlaps.length > 0) {
      expect(overlaps[0]!.similarity).toBeGreaterThanOrEqual(0.4);
      expect(overlaps[0]!.promptA).toBeTruthy();
      expect(overlaps[0]!.promptB).toBeTruthy();
    }
  });

  it('reads prompts with variable filling and reply language options', () => {
    const raw = readPrompt('init-repo-in-10-minutes', undefined, {
      fill: { test_key: 'custom_value' },
      replyLang: 'es',
    });
    expect(raw).toContain('Codebase Rapid Orientation in 10 Minutes');
    expect(raw).toContain('Reply Language');
    expect(raw).toContain('Please respond in es');
  });

  it('compares catalog items and checks catalog health', () => {
    const health = checkCatalogHealth();
    expect(health.total).toBeGreaterThan(0);
    expect(health.active).toBeGreaterThan(0);

    const comp = compareCatalogItems('taste-skill', 'impeccable');
    expect(comp.item1.name).toBeTruthy();
    expect(comp.item2.name).toBeTruthy();
    expect(comp.sameCategory).toBe(true);
  });

  it('gets and sets configuration keys in .helenrc', () => {
    setConfigValue(tmp, 'favoriteGoal', 'quality');
    expect(getConfigValue(tmp, 'favoriteGoal')).toBe('quality');

    setConfigValue(tmp, 'projectName', 'my-awesome-app');
    expect(getConfigValue(tmp, 'projectName')).toBe('my-awesome-app');
    expect(readConfig(tmp)?.projectName).toBe('my-awesome-app');
  });

  it('detects agents and uninstalls cleanly', () => {
    const agents = detectInstalledAgents();
    expect(agents.length).toBeGreaterThan(0);

    setupProject({ cwd: tmp, agents: ['claude', 'codex'], dryRun: false });
    expect(fs.existsSync(path.join(tmp, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, '.claude', 'skills'))).toBe(true);

    const uninst = uninstallProject({ cwd: tmp, dryRun: false });
    expect(uninst.cleanedInstructions).toContain('AGENTS.md');
    expect(uninst.removedSkills.length).toBeGreaterThan(0);
  });

  it('automatically writes and updates .helen/STATE.md', () => {
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'test-state-proj' }));
    fs.mkdirSync(path.join(tmp, 'src'));
    const plan = buildPlan(tmp, 'strategy');
    startProgress(tmp, plan, true);

    const stateFile = path.join(tmp, '.helen', 'STATE.md');
    expect(fs.existsSync(stateFile)).toBe(true);
    const content = fs.readFileSync(stateFile, 'utf-8');
    expect(content).toContain('# HELEN Project State');
    expect(content).toContain('strategy');
  });
});
