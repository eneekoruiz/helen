import crypto from 'node:crypto';
import { z } from 'zod';
import { findSecrets, secretRefusal } from '../core/secrets.js';
import { bestMatch } from './reminders.js';
import { readCollection, updateCollection } from './store.js';
import { fold, oneLine, slug } from './text.js';

/**
 * Tasks and lists: "tengo que renovar el DNI", "añade leche y pan a la lista de la compra".
 * A task belongs to one list (inbox by default). Shopping items are split one per entry so each can be ticked off.
 */
export const TaskSchema = z.object({
  id: z.string().regex(/^t[0-9a-f]{6}$/),
  text: z.string().min(1).max(300),
  list: z.string().regex(/^[a-z0-9-]{1,30}$/),
  status: z.enum(['open', 'done']),
  priority: z.enum(['high', 'normal', 'low']),
  created: z.string().datetime(),
  updated: z.string().datetime(),
  done: z.string().datetime().optional(),
  /** Optional deadline (UTC instant). */
  due: z.string().datetime().optional(),
  source: z.string().max(20),
});

export type Task = z.infer<typeof TaskSchema>;

const NAME = 'tasks';
export const INBOX = 'inbox';
export const SHOPPING = 'compra';

const LIST_ALIASES: Record<string, string> = {
  compra: SHOPPING, compras: SHOPPING, 'la compra': SHOPPING, super: SHOPPING, supermercado: SHOPPING, mercado: SHOPPING,
  shopping: SHOPPING, groceries: SHOPPING, grocery: SHOPPING, 'grocery list': SHOPPING, 'shopping list': SHOPPING,
  tareas: INBOX, pendientes: INBOX, todo: INBOX, todos: INBOX, tasks: INBOX, inbox: INBOX, 'to do': INBOX, 'to-do': INBOX,
};

/** "la lista de la compra", "shopping", "Trabajo" -> a stable list key. */
export function listKey(name: string | undefined): string {
  if (!name?.trim()) return INBOX;
  const folded = fold(name).replace(/^(?:la\s+|mi\s+|my\s+|the\s+)?(?:lista\s+(?:de\s+(?:la\s+|las\s+|los\s+|el\s+)?)?)?/, '').replace(/\s+list$/, '').trim();
  return LIST_ALIASES[folded] ?? (slug(folded, 30) || INBOX);
}

export function listLabel(key: string, lang: 'es' | 'en'): string {
  if (key === SHOPPING) return lang === 'es' ? 'la lista de la compra' : 'the shopping list';
  if (key === INBOX) return lang === 'es' ? 'tus tareas' : 'your tasks';
  return lang === 'es' ? `la lista «${key}»` : `the "${key}" list`;
}

/** "leche, huevos y pan" -> three items. Only for lists of things, never for a task sentence. */
export function splitItems(text: string): string[] {
  return text
    .split(/\s*,\s*|\s+(?:y|e|and|&)\s+/i)
    .map(item => oneLine(item).replace(/^(?:un|una|unos|unas|el|la|los|las|some|a|an|the)\s+/i, ''))
    .filter(Boolean);
}

function priorityOf(text: string): Task['priority'] {
  const folded = fold(text);
  if (/\b(?:urgente|importante|prioritari[oa]|asap|urgent|important)\b/.test(folded)) return 'high';
  if (/\b(?:cuando\s+pueda|algun\s+dia|someday|whenever)\b/.test(folded)) return 'low';
  return 'normal';
}

export interface AddTaskInput {
  text: string;
  list?: string;
  due?: Date;
  priority?: Task['priority'];
  source?: string;
  lang?: 'es' | 'en';
  now?: Date;
}

/** Add one task, or one per item when adding to the shopping list. Duplicates of open items are not added twice. */
export function addTasks(home: string, input: AddTaskInput): { added: Task[]; existing: Task[] } {
  const list = listKey(input.list);
  const now = (input.now ?? new Date()).toISOString();
  const texts = (list === SHOPPING ? splitItems(input.text) : [oneLine(input.text)]).map(text => text.slice(0, 300)).filter(Boolean);
  if (texts.length === 0) throw new Error(input.lang === 'es' ? 'No hay nada que añadir.' : 'Nothing to add.');
  for (const text of texts) {
    const secrets = findSecrets(text);
    if (secrets.length > 0) throw new Error(secretRefusal(secrets, input.lang ?? 'en'));
  }
  return updateCollection(home, NAME, TaskSchema, items => {
    const added: Task[] = [];
    const existing: Task[] = [];
    for (const text of texts) {
      const duplicate = items.find(task => task.status === 'open' && task.list === list && fold(task.text) === fold(text));
      if (duplicate) {
        existing.push(duplicate);
        continue;
      }
      let id = '';
      do id = `t${crypto.randomBytes(3).toString('hex')}`; while (items.some(task => task.id === id));
      const task: Task = {
        id, text, list, status: 'open', priority: input.priority ?? priorityOf(text), created: now, updated: now,
        ...(input.due ? { due: input.due.toISOString() } : {}), source: (input.source ?? 'cli').replace(/[^a-z0-9-]/gi, '').slice(0, 20) || 'cli',
      };
      items.push(task);
      added.push(task);
    }
    return { added, existing };
  });
}

const PRIORITY_ORDER: Record<Task['priority'], number> = { high: 0, normal: 1, low: 2 };

export function listTasks(home: string, filter: { list?: string; status?: Task['status'] | 'all' } = {}): Task[] {
  const status = filter.status ?? 'open';
  const list = filter.list === undefined ? undefined : listKey(filter.list);
  return readCollection(home, NAME, TaskSchema).items
    .filter(task => (status === 'all' || task.status === status) && (list === undefined || task.list === list))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.due ?? '9').localeCompare(b.due ?? '9') || a.created.localeCompare(b.created));
}

export function listNames(home: string): Array<{ list: string; open: number }> {
  const counts = new Map<string, number>();
  for (const task of listTasks(home)) counts.set(task.list, (counts.get(task.list) ?? 0) + 1);
  return [...counts.entries()].map(([list, open]) => ({ list, open })).sort((a, b) => b.open - a.open);
}

/** Find an open task by id or by what it says, optionally within one list. */
export function findTask(home: string, ref: string, options: { list?: string; lang?: 'es' | 'en' } = {}): Task {
  const open = listTasks(home, { list: options.list });
  const byId = open.find(task => task.id === ref.trim());
  if (byId) return byId;
  const exact = open.filter(task => fold(task.text) === fold(oneLine(ref)));
  if (exact.length === 1) return exact[0]!;
  const lang = options.lang ?? 'es';
  return bestMatch(open, ref, task => task.text, lang === 'es' ? 'pendiente' : 'task', lang);
}

function mutate(home: string, id: string, change: (task: Task, items: Task[]) => void): Task {
  return updateCollection(home, NAME, TaskSchema, items => {
    const task = items.find(candidate => candidate.id === id);
    if (!task) throw new Error(`No task with id ${id}.`);
    change(task, items);
    task.updated = new Date().toISOString();
    return { ...task };
  });
}

export function completeTask(home: string, id: string, now: Date = new Date()): Task {
  return mutate(home, id, task => {
    task.status = 'done';
    task.done = now.toISOString();
  });
}

export function reopenTask(home: string, id: string): Task {
  return mutate(home, id, task => {
    task.status = 'open';
    delete task.done;
  });
}

export function removeTask(home: string, id: string): Task {
  return updateCollection(home, NAME, TaskSchema, items => {
    const index = items.findIndex(task => task.id === id);
    if (index === -1) throw new Error(`No task with id ${id}.`);
    return items.splice(index, 1)[0]!;
  });
}

/** Remove finished items of a list (or of every list). Returns how many were removed. */
export function clearDone(home: string, list?: string): number {
  const key = list === undefined ? undefined : listKey(list);
  return updateCollection(home, NAME, TaskSchema, items => {
    const before = items.length;
    const keep = items.filter(task => task.status !== 'done' || (key !== undefined && task.list !== key));
    items.splice(0, items.length, ...keep);
    return before - keep.length;
  });
}
