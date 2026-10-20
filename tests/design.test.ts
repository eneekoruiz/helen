import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { contrastRatio, hue, parseColor } from '../src/core/color.js';
import { checkDesign } from '../src/core/designCheck.js';
import { generateDirections, loadDirectionData, validateDirectionData } from '../src/core/direction.js';
import { handleToolCall, serverPolicy } from '../src/core/mcp.js';
import { getRubric } from '../src/core/rubrics.js';

describe('color helpers', () => {
  it('parses hex, rgb and hsl', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('#1C1A17')).toEqual({ r: 28, g: 26, b: 23 });
    expect(parseColor('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 });
    expect(parseColor('rgba(10 20 30 / 50%)')).toEqual({ r: 10, g: 20, b: 30 });
    expect(parseColor('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor('var(--x)')).toBeNull();
  });

  it('computes WCAG contrast and hue', () => {
    expect(contrastRatio('#000', '#fff')).toBe(21);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
    expect(hue(parseColor('#7c3aed')!)).toBeGreaterThan(250);
    expect(hue(parseColor('#808080')!)).toBeNull();
  });
});

describe('design directions', () => {
  const data = loadDirectionData();
  const brief = 'Small-batch handmade ceramic mugs from a two-person studio, warm and honest';

  it('ships valid, accessible data', () => {
    expect(validateDirectionData()).toEqual([]);
    for (const color of data.axes.color) {
      const p = color.palette;
      expect(contrastRatio(p.ink, p.background), color.id).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(p.muted, p.background), color.id).toBeGreaterThanOrEqual(4.5);
      if (color.accentUse === 'fill') expect(contrastRatio(p.ink, p.accent), color.id).toBeGreaterThanOrEqual(4.5);
      else expect(contrastRatio(p.accent, p.background), color.id).toBeGreaterThanOrEqual(4.5);
    }
    for (const type of data.axes.type) {
      expect(['inter', 'roboto', 'arial', 'poppins', 'montserrat'], type.id).not.toContain(type.display.toLowerCase());
    }
  });

  it('is reproducible for a seed and different for another', () => {
    const a = generateDirections({ brief, seed: 'one' });
    const b = generateDirections({ brief, seed: 'one' });
    const c = generateDirections({ brief, seed: 'two' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const signature = (set: typeof a) => set.directions.map(d => Object.values(d.choices).map(option => option.id).join('|')).join('/');
    expect(signature(c)).not.toBe(signature(a));
  });

  it('never repeats an option across the directions of one set', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const set = generateDirections({ brief, seed, count: 5 });
      for (const axis of ['concept', 'type', 'color', 'layout', 'motion', 'imagery', 'voice'] as const) {
        const ids = set.directions.map(direction => direction.choices[axis].id);
        expect(new Set(ids).size, `${seed}/${axis}`).toBe(ids.length);
      }
      for (const direction of set.directions) {
        for (const differences of Object.values(direction.differsFrom)) expect(differences).toHaveLength(7);
      }
    }
  });

  it('reads the brief and keeps directions coherent with it', () => {
    const set = generateDirections({ brief, seed: 'x' });
    expect(set.briefTags).toEqual(expect.arrayContaining(['warm', 'tactile']));
    const lead = set.directions[0]!.choices.concept;
    expect(lead.tags.some(tag => ['warm', 'tactile', 'humane'].includes(tag))).toBe(true);
  });

  it('honors avoid terms', () => {
    for (const seed of ['1', '2', '3']) {
      const set = generateDirections({ brief: 'A late-night jazz club in Lisbon, moody and dramatic', seed, avoid: ['dark', 'brutalist'] });
      for (const direction of set.directions) {
        expect(direction.choices.color.tags).not.toContain('dark');
        expect(direction.choices.concept.id).not.toBe('brutalist-poster');
      }
    }
  });

  it('gives tokens, a ban list and a way to choose', () => {
    const set = generateDirections({ brief, count: 2, seed: 'tokens' });
    expect(set.directions).toHaveLength(2);
    const direction = set.directions[0]!;
    expect(direction.tokens.css).toContain('--color-background: #');
    expect(direction.tokens.css).toContain(`--font-display: "${direction.tokens.fonts.display}"`);
    expect(direction.firstSteps.join(' ')).toContain('helen design check');
    expect(set.banned.join(' ')).toContain('Inter');
    expect(set.howToChoose.join(' ')).toContain('DESIGN.md');
  });

  it('rejects unusable requests', () => {
    expect(() => generateDirections({ brief: 'site' })).toThrow(/Describe the project/);
    expect(() => generateDirections({ brief, count: 9 })).toThrow(/1 to 5/);
    expect(() => generateDirections({ brief, count: 0 })).toThrow(/1 to 5/);
  });
});

describe('design check', () => {
  let tmp: string;
  beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-design-')); });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const write = (rel: string, content: string) => {
    fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true });
    fs.writeFileSync(path.join(tmp, rel), content);
  };

  it('finds the tells of a generic generated page', () => {
    write('index.html', `<html>
<head><title>Acme</title></head>
<body>
  <h1>Welcome to the future</h1>
  <p>Lorem ipsum dolor sit amet.</p>
  <p>Trusted by 10,000+ customers</p>
  <img src="hero.png">
</body></html>`);
    write('styles.css', `body { font-family: Inter, system-ui, sans-serif; }
.hero { background: linear-gradient(90deg, #7c3aed, #db2777); }
.muted { color: #aaaaaa; background-color: #ffffff; }
@keyframes rise { from { opacity: 0 } to { opacity: 1 } }
.a { animation: rise 1s; }
.b { transition: transform .2s; }`);
    write('src/App.tsx', `export function App() {
  return (<main className="bg-gradient-to-r from-purple-500 to-pink-500">
    <h2>🚀 Supercharge your workflow ✨</h2>
    <p>🔥 Seamless 💡</p>
    <div className="grid md:grid-cols-3 gap-6">
      <Card title="Fast" />
      <Card title="Secure" />
      <Card title="Simple" />
    </div>
    ${Array.from({ length: 6 }, (_, i) => `<div className="rounded-2xl shadow-lg p-6">${i}</div>`).join('\n    ')}
    <div className="backdrop-blur-md" /><div className="backdrop-blur-md" /><div className="backdrop-blur-lg" />
  </main>);
}`);
    write('node_modules/lib/ignored.css', '.x { font-family: Inter; color: #eee; background: #fff; }');

    const report = checkDesign(tmp);
    const rules = new Set(report.findings.map(finding => finding.rule));
    for (const rule of ['typeface-default', 'purple-gradient', 'low-contrast', 'placeholder-content', 'cliche-copy', 'unsourced-proof', 'motion-without-reduced-motion', 'img-without-alt', 'html-lang-missing', 'viewport-missing', 'feature-card-triad', 'uniform-radius-shadow', 'glassmorphism', 'emoji-icons']) {
      expect(rules, rule).toContain(rule);
    }
    expect(report.findings.some(finding => finding.file.startsWith('node_modules'))).toBe(false);
    expect(report.findings.find(finding => finding.rule === 'low-contrast')).toMatchObject({ severity: 'error', file: 'styles.css', line: 3 });
    expect(report.findings.find(finding => finding.rule === 'placeholder-content')).toMatchObject({ file: 'index.html', line: 5 });
    expect(report.verdict).toBe('template-like');
    expect(report.findings.every(finding => finding.fix.length > 10)).toBe(true);
  });

  it('stays quiet on a deliberate, accessible page', () => {
    write('index.html', `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,700&family=Instrument+Sans&display=swap" rel="stylesheet"></head>
<body><h1>Mugs thrown by hand in Bilbao</h1><p>Each batch is 40 mugs. This one ships on 12 November.</p><img src="mug.jpg" alt="A blue glazed mug on a wooden bench"></body></html>`);
    write('styles.css', `:root { --ink: #1C1A17; }
body { font-family: "Instrument Sans", sans-serif; color: #1C1A17; background: #F5F0E6; }
h1 { font-family: "Fraunces", serif; }
.reveal { animation: rise .6s ease-out; transition: opacity .3s; }
@keyframes rise { from { opacity: 0 } to { opacity: 1 } }
@media (prefers-reduced-motion: reduce) { .reveal { animation: none; transition: none; } }`);
    const report = checkDesign(tmp);
    expect(report.findings).toEqual([]);
    expect(report.verdict).toBe('clean');
    expect(report.score).toBe(100);
  });

  it('reports a folder without a chosen typeface, and rejects a missing folder', () => {
    write('page.html', '<html lang="en"><head><meta name="viewport" content="width=device-width"></head><body><p>Hi</p></body></html>');
    expect(checkDesign(tmp).findings.map(finding => finding.rule)).toEqual(['typeface-default']);
    expect(() => checkDesign(path.join(tmp, 'nope'))).toThrow(/Not a directory/);
  });

  it('caps repeated findings of one rule', () => {
    write('a.html', Array.from({ length: 30 }, () => '<img src="x.png">').join('\n'));
    const report = checkDesign(tmp, { maxFindingsPerRule: 5 });
    expect(report.findings.filter(finding => finding.rule === 'img-without-alt')).toHaveLength(5);
  });
});

describe('design and loop MCP tools', () => {
  let tmp: string;
  beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'helen-mcp-design-')); });
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const call = async (name: string, args: Record<string, unknown>, policy?: Parameters<typeof handleToolCall>[2]) => {
    const result = await handleToolCall(name, args, policy);
    return { isError: result.isError === true, text: result.content[0]!.text };
  };

  it('generates directions and checks a folder inside the project only', async () => {
    const directions = JSON.parse((await call('helen_design_direction', { brief: 'A calm meditation app for nurses on night shifts', count: 2 })).text);
    expect(directions.directions).toHaveLength(2);
    fs.writeFileSync(path.join(tmp, 'index.html'), '<html><body><img src="a.png"></body></html>');
    const policy = serverPolicy({ cwd: tmp, env: {} });
    expect(JSON.parse((await call('helen_design_check', { cwd: tmp }, policy)).text).findings.length).toBeGreaterThan(0);
    expect((await call('helen_design_check', { cwd: tmp, path: '../..' }, policy)).text).toContain('inside the project');
  });

  it('runs a loop over MCP, including the independent final score', async () => {
    const started = JSON.parse((await call('helen_loop_start', { cwd: tmp, rubric: 'general', subject: 'Fix login', author: 'claude-1' })).text);
    const scores = Object.fromEntries(getRubric('general').criteria.map(criterion => [criterion.id, { score: 5, evidence: `Verified ${criterion.id}: output saved in logs/${criterion.id}.txt with all checks passing` }]));
    const own = JSON.parse((await call('helen_loop_score', { cwd: tmp, id: started.id, scorer: 'claude-1', scores })).text);
    expect(own.verdict).toBe('needs-independent-score');
    const independent = JSON.parse((await call('helen_loop_score', { cwd: tmp, id: started.id, scorer: 'codex-1', scores })).text);
    expect(independent.verdict).toBe('converged');
    expect(JSON.parse((await call('helen_loop_status', { cwd: tmp })).text).loops[0]).toMatchObject({ id: started.id, verdict: 'converged' });
    expect((await call('helen_loop_score', { cwd: tmp, id: started.id, scorer: 'x', scores: [] })).text).toContain('scores must be an object');
    expect(JSON.parse((await call('helen_loop_rubric', {})).text).rubrics.length).toBe(6);
  });
});
