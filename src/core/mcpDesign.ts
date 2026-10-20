import path from 'node:path';
import { checkDesign } from './designCheck.js';
import { generateDirections } from './direction.js';
import { listLoops, loopStatus, scoreLoop, startLoop, type ScoreInput } from './loop.js';
import type { McpToolHandler } from './mcpTypes.js';
import { getRubric, listRubrics } from './rubrics.js';
import { isPathInside } from './fs.js';

const AGENT = { type: 'string', description: 'Your agent name, stable for the whole session' };
const CWD = { type: 'string', description: 'Project directory (must be inside the allowed roots of the server; defaults to the first root)' };

/**
 * Quality tools: measure work against a rubric until it really converges, and keep results from looking
 * like everyone else's. They mirror `helen loop ...` and `helen design ...`.
 */
export const DESIGN_TOOLS: McpToolHandler[] = [
  {
    definition: {
      name: 'helen_loop_rubric',
      description: 'List the rubrics (general, design, code, copy, security, release) or read one in full: every criterion with what to ask and what counts as evidence.',
      inputSchema: { type: 'object', properties: { rubric: { type: 'string', description: 'Rubric id; omit to list them' } } },
    },
    run: args => (typeof args.rubric === 'string' ? getRubric(args.rubric) : { rubrics: listRubrics().map(rubric => ({ id: rubric.id, title: rubric.title, threshold: rubric.threshold, criteria: rubric.criteria.length })) }),
  },
  {
    definition: {
      name: 'helen_loop_start',
      description: 'Open a convergence loop for a piece of work. Score it with helen_loop_score until the verdict is converged.',
      inputSchema: {
        type: 'object',
        properties: {
          cwd: CWD, rubric: { type: 'string', description: 'Rubric id, for example design or code' }, subject: { type: 'string', description: 'What is being worked on' },
          author: AGENT, id: { type: 'string', description: 'Loop id (default: <rubric>-<n>)' }, threshold: { type: 'number', description: 'Raise the bar above the rubric default' },
        },
        required: ['rubric', 'subject', 'author'],
      },
    },
    run: (args, { cwd }) => startLoop(cwd, { rubric: String(args.rubric), subject: String(args.subject), author: String(args.author), id: args.id as string | undefined, threshold: args.threshold as number | undefined }),
  },
  {
    definition: {
      name: 'helen_loop_score',
      description: 'Record a round: a whole-number 0-5 score with specific evidence for every criterion. Returns the weighted total, the verdict (continue, stalled, needs-independent-score, converged, exhausted) and what to work on next. The final round must come from an agent other than the author.',
      inputSchema: {
        type: 'object',
        properties: {
          cwd: CWD, id: { type: 'string', description: 'Loop id' }, scorer: AGENT,
          scores: { type: 'object', description: 'Object mapping each criterion id to { "score": 0-5, "evidence": "what you observed, specific to this criterion" }' },
          carry: { type: 'boolean', description: 'Reuse last round for criteria you did not re-examine (such a round cannot converge)' },
          next: { type: 'string', description: 'What you will change next' }, notes: { type: 'string', description: 'Anything the next scorer should know' },
        },
        required: ['id', 'scorer', 'scores'],
      },
    },
    run: (args, { cwd }) => {
      if (!args.scores || typeof args.scores !== 'object' || Array.isArray(args.scores)) throw new Error('scores must be an object mapping criterion ids to { score, evidence }');
      return scoreLoop(cwd, String(args.id), { scorer: String(args.scorer), scores: args.scores as Record<string, ScoreInput>, carry: args.carry === true, next: args.next as string | undefined, notes: args.notes as string | undefined });
    },
  },
  {
    definition: {
      name: 'helen_loop_status',
      description: 'Show the rounds of a loop and what is weakest; without id, list the loops of the project.',
      inputSchema: { type: 'object', properties: { cwd: CWD, id: { type: 'string', description: 'Loop id; omit to list loops' } } },
    },
    run: (args, { cwd }) => (typeof args.id === 'string' ? loopStatus(cwd, args.id) : { loops: listLoops(cwd) }),
  },
  {
    definition: {
      name: 'helen_design_direction',
      description: 'Generate distinct creative directions (concept, typefaces, palette with tokens, layout, motion, imagery, voice) from a project brief, so the result does not look like every other generated site. Pick one before building.',
      inputSchema: {
        type: 'object',
        properties: {
          brief: { type: 'string', description: 'What it is, who it is for, how it should feel' }, count: { type: 'integer', description: 'How many directions, 1 to 5 (default 3)' },
          seed: { type: 'string', description: 'Reproducible variation; use another seed to explore different directions' },
          tone: { type: 'array', items: { type: 'string' }, description: 'Extra tone words' }, avoid: { type: 'array', items: { type: 'string' }, description: 'Options to rule out' },
        },
        required: ['brief'],
      },
    },
    run: args => generateDirections({ brief: String(args.brief), count: args.count as number | undefined, seed: args.seed as string | undefined, tone: args.tone as string[] | undefined, avoid: args.avoid as string[] | undefined }),
  },
  {
    definition: {
      name: 'helen_design_check',
      description: 'Scan a front end for the tells of generic output (default typefaces, purple gradients, cliche copy, placeholder content) and real defects (contrast, alt text, reduced motion). Returns findings with file, line and fix.',
      inputSchema: { type: 'object', properties: { cwd: CWD, path: { type: 'string', description: 'Folder to scan, relative to cwd (default: the whole project)' } } },
    },
    run: (args, { cwd }) => {
      const target = typeof args.path === 'string' && args.path ? path.resolve(cwd, args.path) : cwd;
      if (!isPathInside(cwd, target)) throw new Error('path must stay inside the project directory');
      return checkDesign(target);
    },
  },
];
