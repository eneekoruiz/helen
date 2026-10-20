import path from 'node:path';
import type { McpToolHandler } from '../core/mcpTypes.js';
import { helenHome, readConfig } from './home.js';
import { addMemory, MEMORY_KINDS, searchMemory, type MemoryKind } from './memory.js';
import { addReminder } from './reminders.js';

/**
 * The personal memory, seen from coding agents through MCP. Agents only read items the owner shared with
 * them (visibility "agents"), never items marked sensitive, and what they save is shared with agents by
 * default. The owner can widen reading with shareAllMemoryWithAgents.
 */
function home(): string {
  return helenHome();
}

export const ASSISTANT_TOOLS: McpToolHandler[] = [
  {
    definition: {
      name: 'helen_memory_search',
      description: 'Search the owner\'s personal memory for preferences, conventions, decisions and facts they shared with agents (for example "prefers pnpm", "deploys on Fridays are forbidden"). Call it before asking the owner something they may have told an agent before.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Words to look for' },
          limit: { type: 'integer', description: 'Maximum results (default 5)' },
        },
        required: ['query'],
      },
    },
    run: args => {
      const config = readConfig(home());
      const hits = searchMemory(home(), String(args.query), {
        limit: Math.min(Math.max(Number(args.limit ?? 5), 1), 20),
        includeSensitive: false,
        ...(config.shareAllMemoryWithAgents ? {} : { visibility: 'agents' as const }),
      });
      return { results: hits.map(hit => ({ id: hit.item.id, kind: hit.item.kind, title: hit.item.title, body: hit.item.body.slice(0, 2000), tags: hit.item.tags, project: hit.item.project, updated: hit.item.updated, score: hit.score })) };
    },
  },
  {
    definition: {
      name: 'helen_memory_add',
      description: 'Save a durable preference, convention or decision the owner stated, so every future agent session knows it (for example "use tabs in this repo", "never touch the billing module without asking"). Not for secrets or temporary notes.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'What to remember, in one or two sentences' },
          kind: { type: 'string', enum: [...MEMORY_KINDS], description: 'Kind of item (default note)' },
          tags: { type: 'array', items: { type: 'string' }, description: 'A few short tags' },
          project: { type: 'boolean', description: 'Tag it with the current project folder name' },
        },
        required: ['text'],
      },
    },
    run: (args, { cwd }) => {
      const item = addMemory(home(), {
        text: String(args.text),
        ...(typeof args.kind === 'string' ? { kind: args.kind as MemoryKind } : {}),
        ...(Array.isArray(args.tags) ? { tags: args.tags as string[] } : {}),
        ...(args.project === true ? { project: path.basename(cwd) } : {}),
        visibility: 'agents',
        source: 'mcp',
      });
      return { saved: item.id, title: item.title, visibility: item.visibility, sensitive: item.sensitive };
    },
  },
  {
    definition: {
      name: 'helen_remind',
      description: 'Schedule a reminder for the owner, delivered by HELEN on their phone, desktop or Echo (for example "review the release PR tomorrow at 10"). Only when the owner asks to be reminded.',
      inputSchema: {
        type: 'object',
        properties: {
          what: { type: 'string', description: 'What to remind, short' },
          when: { type: 'string', description: 'When, in natural language ("mañana a las 10", "in 2 hours", "every Monday at 9")' },
        },
        required: ['what', 'when'],
      },
    },
    run: args => {
      const config = readConfig(home());
      const reminder = addReminder(home(), { text: String(args.what), when: String(args.when), source: 'mcp' }, { timezone: config.timezone, locale: config.locale, defaultTime: config.defaultTime });
      return { scheduled: reminder.id, text: reminder.text, due: reminder.due, recurring: Boolean(reminder.recurrence) };
    },
  },
];
