import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { PACKAGE_ROOT } from './version.js';

/**
 * Creative directions that differ on purpose.
 *
 * Left alone, an AI builds the same safe page every time: the same typeface, the same gradient, the same
 * three cards. A direction set breaks that at the concept stage. It combines curated, mutually distinct
 * choices on seven axes (concept, type, color, layout, motion, imagery, voice), keeps each direction
 * coherent through shared tags, and guarantees that no two directions of the set share an option.
 * A seed makes the result reproducible; a different seed explores a different part of the space.
 */
const Option = z.object({ id: z.string(), name: z.string(), tags: z.array(z.string()) }).passthrough();
const DataSchema = z.object({
  version: z.literal(1),
  toneTags: z.record(z.string(), z.array(z.string())),
  bannedDefaults: z.array(z.string()).min(5),
  axes: z.object({
    concept: z.array(Option.extend({ summary: z.string(), signature: z.array(z.string()).min(2), risks: z.array(z.string()) })).min(8),
    type: z.array(Option.extend({ display: z.string(), text: z.string(), notes: z.string() })).min(8),
    color: z.array(Option.extend({ palette: z.object({ background: z.string(), surface: z.string(), ink: z.string(), accent: z.string(), muted: z.string() }), accentUse: z.enum(['text', 'fill']).optional() })).min(8),
    layout: z.array(Option.extend({ summary: z.string() })).min(8),
    motion: z.array(Option.extend({ summary: z.string(), guard: z.string() })).min(8),
    imagery: z.array(Option.extend({ summary: z.string(), needs: z.string() })).min(8),
    voice: z.array(Option.extend({ summary: z.string(), avoid: z.array(z.string()) })).min(8),
  }),
}).passthrough();

export type DirectionData = z.infer<typeof DataSchema>;
const AXES = ['concept', 'type', 'color', 'layout', 'motion', 'imagery', 'voice'] as const;
export type Axis = (typeof AXES)[number];

export const DIRECTIONS_FILE = path.join(PACKAGE_ROOT, 'docs', 'directions.json');

export function loadDirectionData(file: string = DIRECTIONS_FILE): DirectionData {
  return DataSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8')));
}

export function validateDirectionData(file: string = DIRECTIONS_FILE): string[] {
  if (!fs.existsSync(file)) return [];
  const issues: string[] = [];
  let data: DirectionData;
  try {
    data = loadDirectionData(file);
  } catch (error) {
    return [`directions.json: ${error instanceof z.ZodError ? error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') : String(error)}`];
  }
  for (const axis of AXES) {
    const ids = data.axes[axis].map(option => option.id);
    for (const id of new Set(ids.filter((entry, index) => ids.indexOf(entry) !== index))) issues.push(`directions.json: duplicate ${axis} id "${id}"`);
  }
  return issues;
}

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** mulberry32: a small, well-distributed seeded generator. */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DirectionRequest {
  brief: string;
  count?: number;
  seed?: string;
  tone?: string[];
  avoid?: string[];
}

type AnyOption = DirectionData['axes'][Axis][number];

export interface Direction {
  label: string;
  title: string;
  thesis: string;
  signature: string;
  choices: Record<Axis, AnyOption>;
  tokens: { css: string; fonts: { display: string; text: string } };
  differsFrom: Record<string, Axis[]>;
  watchOut: string[];
  firstSteps: string[];
}

export interface DirectionSet {
  seed: string;
  briefTags: string[];
  directions: Direction[];
  banned: string[];
  howToChoose: string[];
}

function jaccard(a: string[], b: string[]): number {
  const left = new Set(a);
  const right = new Set(b);
  const shared = [...left].filter(tag => right.has(tag)).length;
  return shared / (left.size + right.size - shared || 1);
}

function briefTagsFor(data: DirectionData, text: string): string[] {
  const words = text.toLowerCase().split(/[^a-záéíóúüñ]+/).filter(Boolean);
  const tags: string[] = [];
  for (const word of words) {
    for (const [key, values] of Object.entries(data.toneTags)) {
      if (word === key || (word.length >= 5 && key.length >= 5 && (word.startsWith(key) || key.startsWith(word)))) tags.push(...values);
    }
  }
  return tags;
}

export function generateDirections(request: DirectionRequest, data: DirectionData = loadDirectionData()): DirectionSet {
  const brief = request.brief.trim();
  if (brief.length < 8) throw new Error('Describe the project in a sentence: what it is, who it is for, how it should feel.');
  const count = request.count ?? 3;
  if (!Number.isInteger(count) || count < 1 || count > 5) throw new Error('Ask for 1 to 5 directions.');
  const seed = request.seed ?? String(fnv1a(brief));
  const random = rng(fnv1a(`${seed}|${brief}`));
  const avoid = (request.avoid ?? []).map(term => term.toLowerCase()).filter(Boolean);
  const briefTags = briefTagsFor(data, `${brief} ${(request.tone ?? []).join(' ')}`);
  const weight = (tags: string[], wanted: string[]): number => tags.reduce((sum, tag) => sum + wanted.filter(entry => entry === tag).length, 0);
  const allowed = <T extends AnyOption>(options: T[]): T[] => {
    const kept = options.filter(option => !avoid.some(term => option.id.includes(term) || option.name.toLowerCase().includes(term) || option.tags.includes(term)));
    return kept.length >= count ? kept : options;
  };

  // Concepts first: the best fits for the brief, kept apart from each other.
  const concepts: AnyOption[] = [];
  const pool = allowed(data.axes.concept);
  while (concepts.length < count) {
    const best = pool
      .filter(candidate => !concepts.some(chosen => chosen.id === candidate.id))
      .map(candidate => ({
        candidate,
        score: 2 * weight(candidate.tags, briefTags) + 3 * (1 - Math.max(0, ...concepts.map(chosen => jaccard(chosen.tags, candidate.tags)))) + random() * 1.5,
      }))
      .sort((a, b) => b.score - a.score)[0];
    if (!best) break;
    concepts.push(best.candidate);
  }

  const used: Record<Axis, Set<string>> = { concept: new Set(), type: new Set(), color: new Set(), layout: new Set(), motion: new Set(), imagery: new Set(), voice: new Set() };
  const directions: Direction[] = concepts.map((concept, index) => {
    used.concept.add(concept.id);
    const choices = { concept } as Record<Axis, AnyOption>;
    for (const axis of AXES.filter(entry => entry !== 'concept')) {
      const options = allowed(data.axes[axis] as AnyOption[]);
      const fresh = options.filter(option => !used[axis].has(option.id));
      const candidates = fresh.length > 0 ? fresh : options;
      const pick = candidates
        .map(option => ({ option, score: 2 * weight(option.tags, concept.tags) + 1.5 * weight(option.tags, briefTags) + random() * 1.2 }))
        .sort((a, b) => b.score - a.score)[0]!.option;
      used[axis].add(pick.id);
      choices[axis] = pick;
    }
    const conceptData = concept as DirectionData['axes']['concept'][number];
    const type = choices.type as DirectionData['axes']['type'][number];
    const color = choices.color as DirectionData['axes']['color'][number];
    const motion = choices.motion as DirectionData['axes']['motion'][number];
    const imagery = choices.imagery as DirectionData['axes']['imagery'][number];
    const voice = choices.voice as DirectionData['axes']['voice'][number];
    const layout = choices.layout as DirectionData['axes']['layout'][number];
    const signature = conceptData.signature[Math.floor(random() * conceptData.signature.length)]!;
    const label = String.fromCharCode(65 + index);
    const palette = color.palette;
    const css = [
      ':root {',
      `  --color-background: ${palette.background};`, `  --color-surface: ${palette.surface};`, `  --color-ink: ${palette.ink};`, `  --color-accent: ${palette.accent};`, `  --color-muted: ${palette.muted};`,
      `  --font-display: "${type.display}", serif;`, `  --font-text: "${type.text}", sans-serif;`,
      '}',
    ].join('\n');
    return {
      label,
      title: `${conceptData.name} with ${type.display}`,
      thesis: `${conceptData.summary} Set in ${type.display} over ${type.text}, on ${color.name.toLowerCase()}; ${layout.name.toLowerCase()}, ${motion.name.toLowerCase()} motion, ${imagery.name.toLowerCase()}, in a ${voice.name.toLowerCase()} voice. For: ${brief}`,
      signature,
      choices,
      tokens: { css, fonts: { display: type.display, text: type.text } },
      differsFrom: {},
      watchOut: [
        ...conceptData.risks,
        motion.guard,
        `Imagery needs: ${imagery.needs}`,
        ...(color.accentUse === 'fill' ? ['The accent is a fill color: set ink text on it, never accent-colored text on the background.'] : []),
        `Voice: avoid ${voice.avoid.join(', ')}.`,
      ],
      firstSteps: [
        'Write the one-sentence thesis in your own words and the three things this page must never feel like.',
        'Put the tokens in CSS, load the two typefaces, and build the single hardest section first.',
        `Build the signature move: ${signature}.`,
        'Run `helen design check` and fix every finding before polishing.',
        'Open a loop: `helen loop start design --subject "<this site>"`, then score it with evidence.',
      ],
    };
  });

  for (const direction of directions) {
    for (const other of directions.filter(entry => entry !== direction)) {
      direction.differsFrom[other.label] = AXES.filter(axis => direction.choices[axis].id !== other.choices[axis].id);
    }
  }

  return {
    seed,
    briefTags: [...new Set(briefTags)],
    directions,
    banned: data.bannedDefaults,
    howToChoose: [
      'Score each direction against the brief with the distinctiveness and hierarchy criteria of `helen loop rubrics design` before building anything.',
      'Pick one. You may borrow one element from another direction, never three: a coherent point of view beats an average of options.',
      'Record the choice, the rejected alternatives and the reasons in DESIGN.md so the next agent does not undo it.',
      'None fits? Run again with another --seed, or --avoid to rule out what the client dislikes.',
    ],
  };
}
