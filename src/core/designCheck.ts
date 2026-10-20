import fs from 'node:fs';
import path from 'node:path';
import { contrastRatio, hue, parseColor } from './color.js';

/**
 * Deterministic detector for template-looking and untrustworthy front ends.
 *
 * It does not judge taste. It finds the specific, countable tells of generic AI output (default typefaces,
 * purple gradients, three equal cards, marketing cliches), content that cannot be real (lorem ipsum,
 * invented proof) and real defects (contrast, missing alt text, motion without a reduced-motion path).
 * Every finding says where it is and how to fix it, so an agent can act on it without interpretation.
 */
export type Severity = 'error' | 'warn' | 'info';

export interface DesignFinding {
  rule: string;
  severity: Severity;
  file: string;
  line: number;
  message: string;
  fix: string;
}

export interface DesignReport {
  root: string;
  filesScanned: number;
  findings: DesignFinding[];
  counts: Record<Severity, number>;
  /** 100 means no tells found. It measures template-likeness, not quality. */
  score: number;
  verdict: 'clean' | 'review' | 'template-like';
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.svelte-kit', '.output', 'coverage', '.helen', 'out', '.cache', 'vendor', '.turbo', '.vercel']);
const MARKUP = new Set(['.html', '.htm', '.tsx', '.jsx', '.vue', '.svelte', '.astro', '.mdx']);
const STYLE = new Set(['.css', '.scss', '.sass', '.less']);
const MAX_BYTES = 400 * 1024;
const MAX_FILES = 4000;

const DEFAULT_FAMILIES = new Set(['inter', 'roboto', 'arial', 'helvetica', 'helvetica neue', 'open sans', 'lato', 'poppins', 'montserrat', 'segoe ui', 'system-ui', '-apple-system', 'blinkmacsystemfont', 'ui-sans-serif', 'sans-serif', 'sf pro text', 'sf pro display']);
const GENERIC_KEYWORDS = new Set(['serif', 'monospace', 'cursive', 'fantasy', 'ui-serif', 'ui-monospace', 'ui-rounded', 'emoji', 'math', 'inherit', 'initial', 'unset']);

const CLICHES = [
  'elevate your', 'unlock the', 'unlock your', 'seamless', 'seamlessly', 'supercharge', 'revolutionize', 'next-generation', 'next generation', 'cutting-edge', 'all-in-one',
  'game-changer', 'game changer', 'harness the power', 'empower your', 'streamline your', 'transform your', 'take your', 'in today\'s fast-paced', 'welcome to',
];
const PLACEHOLDERS = [/lorem ipsum/i, /dolor sit amet/i, /\b(john|jane) doe\b/i, /your@email\.com/i, /\byourname@/i, /\bcompany name\b/i, /\byour company\b/i, /\bacme (inc|corp)\b/i, /placeholder text/i, /\bsample (text|content) here\b/i];
const PROOF = /\b\d[\d,.]*\s?(?:k|m)?\+?\s+(?:happy\s+|satisfied\s+|active\s+)?(?:customers|users|clients|companies|teams|developers|businesses|brands|downloads)\b/i;

interface SourceFile {
  rel: string;
  ext: string;
  content: string;
  lines: string[];
}

function walk(root: string): SourceFile[] {
  const files: SourceFile[] = [];
  const visit = (dir: string): void => {
    if (files.length >= MAX_FILES) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) visit(full);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      const isTailwind = /^tailwind\.config\.(js|cjs|mjs|ts)$/.test(entry.name);
      if (!MARKUP.has(ext) && !STYLE.has(ext) && !isTailwind) continue;
      if (fs.statSync(full).size > MAX_BYTES) continue;
      const content = fs.readFileSync(full, 'utf8');
      files.push({ rel: path.relative(root, full).replaceAll('\\', '/'), ext: isTailwind ? '.tailwind' : ext, content, lines: content.split('\n') });
      if (files.length >= MAX_FILES) return;
    }
  };
  visit(root);
  return files;
}

const lineOf = (content: string, index: number): number => content.slice(0, index).split('\n').length;

function familiesIn(file: SourceFile): Array<{ name: string; line: number }> {
  const found: Array<{ name: string; line: number }> = [];
  const add = (raw: string, index: number): void => {
    for (const part of raw.split(',')) {
      const name = part.trim().replace(/^['"]|['"]$/g, '').replace(/\s*!important$/i, '').toLowerCase();
      if (name && !name.startsWith('var(') && !name.startsWith('$') && !name.startsWith('@')) found.push({ name, line: lineOf(file.content, index) });
    }
  };
  for (const match of file.content.matchAll(/font-family\s*:\s*([^;}{]+)/gi)) add(match[1]!, match.index!);
  for (const match of file.content.matchAll(/fonts\.googleapis\.com\/css2?\?([^"')\s]+)/gi)) {
    for (const family of match[1]!.matchAll(/family=([^&:]+)/g)) add(decodeURIComponent(family[1]!.replace(/\+/g, ' ')), match.index!);
  }
  for (const match of file.content.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]next\/font\/google['"]/g)) add(match[1]!.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2'), match.index!);
  for (const match of file.content.matchAll(/@fontsource(?:-variable)?\/([a-z0-9-]+)/gi)) add(match[1]!.replace(/-/g, ' '), match.index!);
  if (file.ext === '.tailwind') {
    const block = /fontFamily\s*:\s*\{([\s\S]*?)\}\s*,?\s*(?:\}|\n\s*\w+\s*:)/.exec(file.content);
    if (block) for (const quoted of block[1]!.matchAll(/['"]([^'"]+)['"]/g)) add(quoted[1]!, block.index!);
  }
  return found;
}

export function checkDesign(root: string, options: { maxFindingsPerRule?: number } = {}): DesignReport {
  const absolute = path.resolve(root);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isDirectory()) throw new Error(`Not a directory: ${root}`);
  const files = walk(absolute);
  const findings: DesignFinding[] = [];
  const perRule = new Map<string, number>();
  const cap = options.maxFindingsPerRule ?? 8;
  const add = (finding: DesignFinding): void => {
    const count = (perRule.get(finding.rule) ?? 0) + 1;
    perRule.set(finding.rule, count);
    if (count <= cap) findings.push(finding);
  };

  // 1. Typefaces
  const families = files.flatMap(file => familiesIn(file).map(family => ({ ...family, file: file.rel })));
  const named = families.filter(family => !GENERIC_KEYWORDS.has(family.name));
  const hasStyles = files.some(file => STYLE.has(file.ext) || MARKUP.has(file.ext));
  if (named.length > 0 && named.every(family => DEFAULT_FAMILIES.has(family.name))) {
    add({ rule: 'typeface-default', severity: 'warn', file: named[0]!.file, line: named[0]!.line, message: `Only default typefaces are used (${[...new Set(named.map(family => family.name))].join(', ')}).`, fix: 'Choose a display and a text family for this brand (see `helen design direction`) and load them deliberately.' });
  } else if (named.length === 0 && hasStyles && files.length > 0) {
    add({ rule: 'typeface-default', severity: 'info', file: files[0]!.rel, line: 1, message: 'No typeface is chosen: the browser default applies.', fix: 'Declare font-family for headings and text.' });
  }

  // 2-6, 8-9: line patterns
  const cardTriad = /grid-cols-3|repeat\(\s*3\s*,/;
  let roundedShadow = 0;
  let roundedShadowFirst: { file: string; line: number } | null = null;
  let glass = 0;
  let glassFirst: { file: string; line: number } | null = null;
  const emojis: Array<{ file: string; line: number; char: string }> = [];
  for (const file of files) {
    file.lines.forEach((text, index) => {
      const line = index + 1;
      const classHues = [...text.matchAll(/\b(?:from|via|to)-(purple|violet|indigo|fuchsia|pink)-\d{2,3}\b/g)];
      if (classHues.length >= 2) add({ rule: 'purple-gradient', severity: 'warn', file: file.rel, line, message: 'A purple/indigo-to-pink gradient, the most common AI default.', fix: 'Use flat color from the palette, or a gradient built from the brand colors.' });
      for (const gradient of text.matchAll(/(?:linear|radial|conic)-gradient\(([^;]*)/gi)) {
        const hues = [...gradient[1]!.matchAll(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi)].map(color => parseColor(color[0])).filter((color): color is NonNullable<typeof color> => color !== null).map(hue).filter((value): value is number => value !== null);
        if (hues.filter(value => value >= 250 && value <= 335).length >= 2) {
          add({ rule: 'purple-gradient', severity: 'warn', file: file.rel, line, message: 'A gradient between purple, violet and magenta hues, the most common AI default.', fix: 'Use flat color from the palette, or a gradient built from the brand colors.' });
        }
      }
      // Count each class attribute that combines a large radius with a soft shadow, even several per line.
      for (const attribute of text.matchAll(/class(?:Name)?=["'`{][^"'`}]*/g)) {
        if (/\brounded-(?:xl|2xl|3xl)\b/.test(attribute[0]) && /\bshadow-(?:md|lg|xl|2xl)\b/.test(attribute[0])) {
          roundedShadow += 1;
          roundedShadowFirst ??= { file: file.rel, line };
        }
      }
      const blurs = (text.match(/backdrop-blur|backdrop-filter\s*:\s*blur/gi) ?? []).length;
      if (blurs > 0) {
        glass += blurs;
        glassFirst ??= { file: file.rel, line };
      }
      if (MARKUP.has(file.ext) && !/^\s*(\/\/|\*|\/\*|<!--)/.test(text)) {
        for (const match of text.matchAll(/\p{Extended_Pictographic}/gu)) {
          if (!'✓✔✗✘✕✖★☆©®™'.includes(match[0])) emojis.push({ file: file.rel, line, char: match[0] });
        }
      }
      if (cardTriad.test(text)) {
        const window = file.lines.slice(index, index + 30).join('\n');
        if ((window.match(/<Card\b|class(?:Name)?=["'][^"']*\bcard\b|<article\b/g) ?? []).length >= 3) {
          add({ rule: 'feature-card-triad', severity: 'info', file: file.rel, line, message: 'Three equal cards in a row, each with the same structure.', fix: 'Vary the hierarchy (one lead item, a list, or a table) or show the real content in a different form.' });
        }
      }
      if (file.ext !== '.tailwind' && !STYLE.has(file.ext) && !/^\s*(import|export .* from)\b/.test(text)) {
        const lower = text.toLowerCase();
        for (const phrase of CLICHES) {
          if (phrase === 'take your' ? /take your .{0,40} to the next level/i.test(text) : lower.includes(phrase)) {
            add({ rule: 'cliche-copy', severity: 'warn', file: file.rel, line, message: `Marketing cliche: "${phrase === 'take your' ? 'take your ... to the next level' : phrase}".`, fix: 'Say what it does, for whom, with a concrete noun or number.' });
            break;
          }
        }
        for (const pattern of PLACEHOLDERS) {
          if (pattern.test(text)) add({ rule: 'placeholder-content', severity: 'error', file: file.rel, line, message: `Placeholder content: ${pattern.source.replace(/\\b|\\/g, '')}.`, fix: 'Replace it with real content, or remove the block.' });
        }
        if (MARKUP.has(file.ext) && PROOF.test(text)) add({ rule: 'unsourced-proof', severity: 'warn', file: file.rel, line, message: 'A customer or user count with no visible source.', fix: 'Keep it only if it is true and can be shown; otherwise remove it.' });
      }
    });
  }
  if (roundedShadow >= 6 && roundedShadowFirst) add({ rule: 'uniform-radius-shadow', severity: 'warn', ...(roundedShadowFirst as { file: string; line: number }), message: `The same large radius and soft shadow on ${roundedShadow} elements.`, fix: 'Give surfaces different roles: flat, ruled, or elevated only where elevation means something.' });
  if (glass >= 3 && glassFirst) add({ rule: 'glassmorphism', severity: 'warn', ...(glassFirst as { file: string; line: number }), message: `Backdrop blur panels used ${glass} times.`, fix: 'Reserve blur for one overlay that needs it; use solid surfaces elsewhere.' });
  if (emojis.length >= 4) add({ rule: 'emoji-icons', severity: 'info', file: emojis[0]!.file, line: emojis[0]!.line, message: `${emojis.length} emoji in markup, likely used as icons (${[...new Set(emojis.map(entry => entry.char))].slice(0, 5).join(' ')}).`, fix: 'Use one consistent icon set, or none.' });

  // 10. Motion without a reduced-motion path
  const motionDeclarations = files.filter(file => STYLE.has(file.ext) || file.ext === '.vue' || file.ext === '.svelte').reduce((sum, file) => sum + (file.content.match(/@keyframes|animation\s*:|transition\s*:/g) ?? []).length, 0)
    + files.reduce((sum, file) => sum + (/from\s+['"](?:framer-motion|motion|gsap)['"]|from\s+['"]@react-spring/.test(file.content) ? 3 : 0), 0);
  const respectsReducedMotion = files.some(file => /prefers-reduced-motion|motion-reduce:|useReducedMotion|matchMedia\(['"]\(prefers-reduced-motion/.test(file.content));
  if (motionDeclarations >= 3 && !respectsReducedMotion) add({ rule: 'motion-without-reduced-motion', severity: 'warn', file: files.find(file => /@keyframes|animation\s*:|transition\s*:|framer-motion|gsap/.test(file.content))?.rel ?? '.', line: 1, message: 'Animations are defined but nothing honors prefers-reduced-motion.', fix: 'Add a prefers-reduced-motion: reduce block that removes transforms and long transitions.' });

  // 11, 13, 14. Markup defects
  for (const file of files.filter(entry => MARKUP.has(entry.ext))) {
    for (const match of file.content.matchAll(/<(img|Image)\b[^>]*?>/g)) {
      if (!/\balt\s*=/.test(match[0])) add({ rule: 'img-without-alt', severity: 'warn', file: file.rel, line: lineOf(file.content, match.index!), message: 'Image without an alt attribute.', fix: 'Describe the image, or alt="" if it is purely decorative.' });
    }
    if (/<html\b/i.test(file.content)) {
      if (!/<html\b[^>]*\blang\s*=/i.test(file.content)) add({ rule: 'html-lang-missing', severity: 'warn', file: file.rel, line: lineOf(file.content, file.content.search(/<html\b/i)), message: 'The html element has no lang attribute.', fix: 'Add lang="en" (or the page language).' });
      if (!/<meta[^>]+name=["']viewport["']/i.test(file.content)) add({ rule: 'viewport-missing', severity: 'warn', file: file.rel, line: 1, message: 'No viewport meta tag: mobile browsers will render the desktop layout.', fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.' });
    }
  }

  // 12. Contrast of declared pairs
  const contrastSources = files.filter(file => STYLE.has(file.ext) || file.ext === '.html' || file.ext === '.htm' || file.ext === '.vue' || file.ext === '.svelte' || file.ext === '.astro');
  for (const file of contrastSources) {
    for (const block of file.content.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const body = block[2]!;
      const foreground = /(?:^|;|\s)color\s*:\s*([^;]+)/i.exec(body)?.[1];
      const background = /background(?:-color)?\s*:\s*([^;]+)/i.exec(body)?.[1]?.split(/\s+/).find(token => parseColor(token) !== null);
      const fg = foreground ? parseColor(foreground.trim()) : null;
      const bg = background ? parseColor(background) : null;
      if (!fg || !bg) continue;
      const ratio = contrastRatio(fg, bg);
      const selector = block[1]!.trim().split('\n').pop()!.trim();
      if (ratio < 3) add({ rule: 'low-contrast', severity: 'error', file: file.rel, line: lineOf(file.content, block.index! + block[0].indexOf(body)), message: `${selector}: contrast ${ratio}:1 is below 3:1.`, fix: 'Darken the text or lighten the background until it reaches at least 4.5:1 (3:1 for large text).' });
      else if (ratio < 4.5) add({ rule: 'low-contrast', severity: 'warn', file: file.rel, line: lineOf(file.content, block.index! + block[0].indexOf(body)), message: `${selector}: contrast ${ratio}:1 is below 4.5:1 (fine only for large text).`, fix: 'Reach 4.5:1 for body text.' });
    }
  }

  const counts: Record<Severity, number> = { error: 0, warn: 0, info: 0 };
  for (const finding of findings) counts[finding.severity] += 1;
  const score = Math.max(0, 100 - counts.error * 12 - counts.warn * 5 - counts.info);
  const verdict = counts.error === 0 && score >= 90 ? 'clean' : score >= 70 ? 'review' : 'template-like';
  return { root: absolute, filesScanned: files.length, findings, counts, score, verdict };
}
