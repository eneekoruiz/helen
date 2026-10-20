import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { Command } from 'commander';
import { createAlexaVerifier, interactionModel } from '../assistant/alexa.js';
import { buildAgenda, formatAgenda, type AgendaRange } from '../assistant/agenda.js';
import { handleMessage, whenText } from '../assistant/brain.js';
import {
  apiToken, configFile, ensureHome, helenHome, homePermissionProblems, readConfig, setConfigValue, writeConfig, writePrivate, type AssistantConfig,
} from '../assistant/home.js';
import { addMemory, exportMemory, forgetMemory, listMemory, MEMORY_KINDS, searchMemory, type MemoryKind } from '../assistant/memory.js';
import { configuredChannels, deliver } from '../assistant/notify.js';
import { addReminder, cancelReminder, completeReminder, findReminder, listReminders, snoozeReminder, type ReminderContext } from '../assistant/reminders.js';
import { acquireSchedulerLease, runScheduler } from '../assistant/scheduler.js';
import { createAssistantServer } from '../assistant/server.js';
import { addTasks, clearDone, completeTask, findTask, listLabel, listNames, listTasks, removeTask } from '../assistant/tasks.js';
import { runTelegramBot } from '../assistant/telegram.js';
import { isValidTimeZone } from '../assistant/time.js';
import { parseWhen } from '../assistant/when.js';
import { isJsonMode, printJsonAndExit } from '../core/jsonOutput.js';
import { logger } from '../core/logger.js';
import { handle } from './teamCmd.js';

/**
 * HELEN as a personal assistant: memory, reminders, lists and agenda from the terminal, plus the server
 * that answers on the web, Telegram and Alexa. Everything lives in ~/.helen (HELEN_HOME), never in a project.
 */
function home(): string {
  return helenHome();
}

function config(): AssistantConfig {
  return readConfig(home());
}

function lang(cfg: AssistantConfig = config()): 'es' | 'en' {
  return cfg.locale.startsWith('es') ? 'es' : 'en';
}

function reminderContext(cfg: AssistantConfig = config()): ReminderContext {
  return { timezone: cfg.timezone, locale: cfg.locale, defaultTime: cfg.defaultTime };
}

function rangeOf(value: string | undefined): AgendaRange {
  const folded = (value ?? 'today').toLowerCase();
  if (/^(tomorrow|manana|mañana)$/.test(folded)) return 'tomorrow';
  if (/^(week|semana|esta-semana)$/.test(folded)) return 'week';
  if (/^(today|hoy)$/.test(folded)) return 'today';
  throw new Error(`Unknown range "${value}": use today, tomorrow or week (hoy, mañana, semana).`);
}

function words(parts: string[]): string {
  return parts.join(' ').trim();
}

export function registerAssistantCommands(program: Command): void {
  // ---------------------------------------------------------------------------------------------
  // Memory
  // ---------------------------------------------------------------------------------------------
  program.command('remember <text...>')
    .description('Keep something in your personal memory (~/.helen): a fact, a note, an idea, a person')
    .option('--title <title>', 'Title (default: the first sentence)')
    .option('--kind <kind>', `Kind: ${MEMORY_KINDS.join(', ')}`, 'note')
    .option('--tags <tags...>', 'Tags')
    .option('--agents', 'Share it with coding agents (MCP)', false)
    .option('--sensitive', 'Private: never spoken aloud nor sent to a model', false)
    .option('--expires <when>', 'Forget it after this date ("en 3 meses", "2027-01-01")')
    .option('--allow-secret', 'Store it even if it looks like a credential (not recommended)', false)
    .action((text: string[], opts: { title?: string; kind: string; tags?: string[]; agents: boolean; sensitive: boolean; expires?: string; allowSecret: boolean }) => {
      handle('remember', () => {
        if (!MEMORY_KINDS.includes(opts.kind as MemoryKind)) throw new Error(`Unknown kind "${opts.kind}". Kinds: ${MEMORY_KINDS.join(', ')}`);
        let expires: string | undefined;
        if (opts.expires) {
          const cfg = config();
          const parsed = parseWhen(opts.expires, { now: new Date(), timezone: cfg.timezone, defaultTime: cfg.defaultTime, locale: cfg.locale });
          if (!parsed) throw new Error(`Cannot read the date "${opts.expires}".`);
          expires = parsed.due.toISOString();
        }
        const { file: _file, ...item } = addMemory(home(), {
          text: words(text), ...(opts.title ? { title: opts.title } : {}), kind: opts.kind as MemoryKind, ...(opts.tags ? { tags: opts.tags } : {}),
          visibility: opts.agents ? 'agents' : 'private', ...(opts.sensitive ? { sensitive: true } : {}), ...(expires ? { expires } : {}),
          allowSecret: opts.allowSecret, source: 'cli', lang: lang(),
        });
        return item;
      }, item => console.log(`Remembered ${item.id}: ${item.title}${item.sensitive ? ' (private)' : ''}${item.visibility === 'agents' ? ' (shared with agents)' : ''}`));
    });

  program.command('recall <query...>')
    .description('Search your personal memory')
    .option('--limit <n>', 'Maximum results', '5')
    .option('--kind <kind>', 'Only this kind')
    .action((query: string[], opts: { limit: string; kind?: string }) => {
      handle('recall', () => ({
        results: searchMemory(home(), words(query), { limit: Math.max(1, Math.min(Number(opts.limit) || 5, 50)), ...(opts.kind ? { kind: opts.kind as MemoryKind } : {}) })
          .map(hit => ({ id: hit.item.id, title: hit.item.title, snippet: hit.snippet, kind: hit.item.kind, tags: hit.item.tags, score: hit.score, file: hit.item.file })),
      }), data => {
        if (data.results.length === 0) { console.log('Nothing found.'); return; }
        for (const hit of data.results) console.log(`${hit.id}  ${hit.title}\n  ${hit.snippet}${hit.tags.length ? `\n  #${hit.tags.join(' #')}` : ''}`);
      });
    });

  program.command('notes')
    .description('List your memory, newest first')
    .option('--kind <kind>', 'Only this kind')
    .option('--tag <tag>', 'Only this tag')
    .option('--limit <n>', 'How many', '20')
    .option('--all', 'Include expired items', false)
    .action((opts: { kind?: string; tag?: string; limit: string; all: boolean }) => {
      handle('notes', () => ({
        notes: listMemory(home(), { ...(opts.kind ? { kind: opts.kind as MemoryKind } : {}), ...(opts.tag ? { tag: opts.tag } : {}), includeExpired: opts.all })
          .slice(0, Math.max(1, Number(opts.limit) || 20)).map(({ file: _file, body: _body, ...item }) => item),
      }), data => {
        if (data.notes.length === 0) { console.log('Your memory is empty. Try: helen remember "..."'); return; }
        for (const note of data.notes) console.log(`${note.id}  ${note.updated.slice(0, 10)}  [${note.kind}] ${note.title}${note.sensitive ? ' (private)' : ''}`);
      });
    });

  program.command('forget <id>')
    .description('Delete a memory item for good (ids come from helen recall or helen notes)')
    .action((id: string) => {
      handle('forget', () => {
        const { file: _file, ...item } = forgetMemory(home(), id);
        return item;
      }, item => console.log(`Forgot ${item.id}: ${item.title}`));
    });

  // ---------------------------------------------------------------------------------------------
  // Reminders
  // ---------------------------------------------------------------------------------------------
  program.command('remind <text...>')
    .description('Set a reminder in plain words: helen remind llamar a mamá mañana a las 9 | helen remind "pagar el alquiler" --at "el día 1 de cada mes"')
    .option('--at <when>', 'When, if it is not in the text')
    .action((text: string[], opts: { at?: string }) => {
      handle('remind', () => {
        const cfg = config();
        const reminder = addReminder(home(), { text: words(text), ...(opts.at ? { when: opts.at } : {}), source: 'cli' }, reminderContext(cfg));
        return { reminder, when: whenText(reminder, { config: cfg, now: new Date(), lang: lang(cfg) }) };
      }, data => console.log(`Reminder ${data.reminder.id}: "${data.reminder.text}" ${data.when}`));
    });

  const reminders = program.command('reminders').description('Your reminders: list, cancel, snooze, done');
  reminders.command('list', { isDefault: true })
    .description('Pending reminders (or all with --all)')
    .option('--all', 'Include done and cancelled', false)
    .action((opts: { all: boolean }) => {
      handle('reminders', () => {
        const cfg = config();
        return { reminders: listReminders(home(), { status: opts.all ? 'all' : 'pending' }).map(reminder => ({ ...reminder, when: whenText(reminder, { config: cfg, now: new Date(), lang: lang(cfg) }) })) };
      }, data => {
        if (data.reminders.length === 0) { console.log('No reminders.'); return; }
        for (const reminder of data.reminders) console.log(`${reminder.id}  ${reminder.status === 'pending' ? '' : `[${reminder.status}] `}${reminder.when}  ${reminder.text}`);
      });
    });
  reminders.command('cancel <ref...>')
    .description('Cancel a reminder by id or by what it says')
    .action((ref: string[]) => handle('reminders cancel', () => cancelReminder(home(), findReminder(home(), words(ref), lang()).id), reminder => console.log(`Cancelled ${reminder.id}: ${reminder.text}`)));
  reminders.command('snooze <id> <when...>')
    .description('Move a reminder: helen reminders snooze r1a2b3c 30 | "mañana a las 9"')
    .action((id: string, when: string[]) => handle('reminders snooze', () => {
      const cfg = config();
      const reminder = snoozeReminder(home(), id, words(when), reminderContext(cfg));
      return { reminder, when: whenText(reminder, { config: cfg, now: new Date(), lang: lang(cfg) }) };
    }, data => console.log(`Snoozed ${data.reminder.id} to ${data.when}`)));
  reminders.command('done <id>')
    .description('Mark a one-off reminder as done')
    .action((id: string) => handle('reminders done', () => completeReminder(home(), id), reminder => console.log(`Done: ${reminder.text}`)));

  // ---------------------------------------------------------------------------------------------
  // Lists
  // ---------------------------------------------------------------------------------------------
  const todo = program.command('todo')
    .description('Tasks and lists: helen todo renovar el DNI | helen todo --list compra leche, pan | helen todo list | helen todo done leche')
    .argument('[text...]', 'What to add (without text: list your tasks)')
    .option('--list <name>', 'List (tasks by default; "compra" is the shopping list)')
    .option('--due <when>', 'Deadline ("el viernes", "2026-11-30")')
    .option('--priority <level>', 'high, normal or low')
    .action((text: string[], opts: { list?: string; due?: string; priority?: string }) => {
      if (text.length === 0) {
        printTasks(opts.list, false);
        return;
      }
      handle('todo', () => {
        const cfg = config();
        let due: Date | undefined;
        if (opts.due) {
          const parsed = parseWhen(opts.due, { now: new Date(), timezone: cfg.timezone, defaultTime: cfg.defaultTime, locale: cfg.locale });
          if (!parsed) throw new Error(`Cannot read the date "${opts.due}".`);
          due = parsed.due;
        }
        if (opts.priority && !['high', 'normal', 'low'].includes(opts.priority)) throw new Error('Priority must be high, normal or low.');
        return addTasks(home(), { text: words(text), ...(opts.list ? { list: opts.list } : {}), ...(due ? { due } : {}), ...(opts.priority ? { priority: opts.priority as 'high' | 'normal' | 'low' } : {}), source: 'cli', lang: lang(cfg) });
      }, data => {
        for (const task of data.added) console.log(`Added ${task.id} to ${listLabel(task.list, 'en')}: ${task.text}`);
        for (const task of data.existing) console.log(`Already on ${listLabel(task.list, 'en')}: ${task.text}`);
      });
    });
  const printTasks = (list: string | undefined, all: boolean): void => {
    handle('todo list', () => ({ tasks: listTasks(home(), { ...(list ? { list } : {}), status: all ? 'all' : 'open' }), lists: listNames(home()) }), data => {
      if (data.tasks.length === 0) console.log(list ? 'That list is empty.' : 'Nothing to do.');
      for (const task of data.tasks) console.log(`${task.id}  ${task.status === 'done' ? '[x]' : '[ ]'} ${task.priority === 'high' ? '(!) ' : ''}${task.text}${list ? '' : `  · ${task.list}`}${task.due ? `  · due ${task.due.slice(0, 10)}` : ''}`);
      if (!list && data.lists.length > 1) console.log(`Lists: ${data.lists.map((entry: { list: string; open: number }) => `${entry.list} (${entry.open})`).join(', ')}`);
    });
  };
  todo.command('list')
    .description('Open tasks (all lists, or one with --list)')
    .option('--list <name>', 'Only this list')
    .option('--all', 'Include finished items', false)
    .action((opts: { list?: string; all: boolean }) => printTasks(opts.list, opts.all));
  todo.command('done <ref...>')
    .description('Tick off a task by id or by what it says')
    .option('--list <name>', 'Look only in this list')
    .action((ref: string[], opts: { list?: string }) => handle('todo done', () => completeTask(home(), findTask(home(), words(ref), { ...(opts.list ? { list: opts.list } : {}), lang: lang() }).id), task => console.log(`Done: ${task.text}`)));
  todo.command('rm <ref...>')
    .description('Remove a task without marking it done')
    .option('--list <name>', 'Look only in this list')
    .action((ref: string[], opts: { list?: string }) => handle('todo rm', () => removeTask(home(), findTask(home(), words(ref), { ...(opts.list ? { list: opts.list } : {}), lang: lang() }).id), task => console.log(`Removed: ${task.text}`)));
  todo.command('clear')
    .description('Delete finished items (of one list with --list)')
    .option('--list <name>', 'Only this list')
    .action((opts: { list?: string }) => handle('todo clear', () => ({ removed: clearDone(home(), opts.list) }), data => console.log(`Removed ${data.removed} finished item(s).`)));

  // ---------------------------------------------------------------------------------------------
  // Agenda and conversation
  // ---------------------------------------------------------------------------------------------
  program.command('agenda [range]')
    .description('What you have today, tomorrow or this week (hoy, mañana, semana)')
    .action((range?: string) => {
      handle('agenda', () => {
        const cfg = config();
        const agenda = buildAgenda(home(), rangeOf(range), { timezone: cfg.timezone });
        return { agenda, text: formatAgenda(agenda, { lang: lang(cfg), locale: cfg.locale, timezone: cfg.timezone, showSensitive: cfg.privacy.showSensitiveOn.includes('cli') }) };
      }, data => console.log(data.text));
    });

  program.command('ask <text...>')
    .description('Say anything to HELEN, as in a chat: helen ask "¿qué tengo mañana?" | helen ask recuérdame mañana a las 9 llamar a mamá')
    .option('--speaker', 'Answer as a speaker would (short, nothing private)', false)
    .action(async (text: string[], opts: { speaker: boolean }) => {
      try {
        const answer = await handleMessage(words(text), { home: home(), channel: 'cli', ...(opts.speaker ? { speaker: true } : {}) });
        if (isJsonMode()) { printJsonAndExit('ask', answer); return; }
        console.log(opts.speaker ? answer.speech : answer.text);
      } catch (error) {
        if (isJsonMode()) { printJsonAndExit('ask', {}, { ok: false, errors: [(error as Error).message], exitCode: 1 }); return; }
        logger.error((error as Error).message);
        process.exitCode = 1;
      }
    });

  program.command('chat')
    .description('Talk with HELEN in the terminal (Ctrl-D or "salir" to leave)')
    .action(async () => {
      const cfg = config();
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
      const prompt = (): void => { rl.setPrompt('> '); rl.prompt(); };
      console.log(lang(cfg) === 'es' ? `Hola, ${cfg.owner}. Escribe lo que necesites («ayuda» para ejemplos).` : `Hi, ${cfg.owner}. Type what you need ("help" for examples).`);
      prompt();
      for await (const line of rl) {
        if (!line.trim()) { prompt(); continue; }
        try {
          const answer = await handleMessage(line, { home: home(), channel: 'cli', conversation: 'chat' });
          console.log(answer.text);
          if (answer.intent === 'stop') break;
        } catch (error) {
          logger.error((error as Error).message);
        }
        prompt();
      }
      rl.close();
    });

  registerAssistantAdmin(program);
}

// -------------------------------------------------------------------------------------------------
// helen assistant ...
// -------------------------------------------------------------------------------------------------

function registerAssistantAdmin(program: Command): void {
  const assistant = program.command('assistant').description('Set up and run HELEN as your personal assistant (server, Telegram, Alexa, notifications)');

  assistant.command('status')
    .description('Where your data lives, what is configured and what is pending')
    .action(() => {
      handle('assistant status', () => {
        const dir = home();
        const exists = fs.existsSync(configFile(dir));
        const cfg = config();
        return {
          home: dir,
          configured: exists,
          owner: cfg.owner, locale: cfg.locale, timezone: cfg.timezone,
          memory: listMemory(dir).length,
          reminders: listReminders(dir).length,
          tasks: listTasks(dir).length,
          provider: cfg.provider ? `${cfg.provider.type}${cfg.provider.model ? ` (${cfg.provider.model})` : ''}, ${cfg.provider.mode}` : 'none (rules only)',
          channels: [cfg.channels.console ? 'console' : '', cfg.channels.desktop ? 'desktop' : '', cfg.channels.webhook ? `webhook:${cfg.channels.webhook.format}` : '', cfg.channels.telegram ? 'telegram' : ''].filter(Boolean),
          alexa: cfg.alexa.skillIds.length > 0 ? `${cfg.alexa.skillIds.length} skill id(s)` : 'not set up',
          server: `http://${cfg.server.host}:${cfg.server.port}`,
          problems: homePermissionProblems(dir),
        };
      }, data => {
        console.log(`HELEN home: ${data.home}${data.configured ? '' : ' (defaults; set up with helen assistant config)'}`);
        console.log(`Owner: ${data.owner} · ${data.locale} · ${data.timezone}`);
        console.log(`Memory: ${data.memory} items · Reminders: ${data.reminders} pending · Tasks: ${data.tasks} open`);
        console.log(`Model: ${data.provider}`);
        console.log(`Delivery: ${data.channels.join(', ') || 'none'} · Alexa: ${data.alexa} · Server: ${data.server}`);
        for (const problem of data.problems) logger.warn(problem);
      });
    });

  const configCmd = assistant.command('config').description('Read or change the assistant settings (~/.helen/config.json)');
  configCmd.command('show', { isDefault: true })
    .description('Print the settings')
    .action(() => handle('assistant config', () => config(), cfg => console.log(JSON.stringify(cfg, null, 2))));
  configCmd.command('set <key> <value>')
    .description('Set one value: timezone Europe/Madrid | locale es-ES | owner Eneko | channels.webhook \'{"url":"https://ntfy.sh/<topic>","format":"ntfy"}\' | provider \'{"type":"command","command":["claude","-p"]}\' | briefing.time 08:00')
    .action((key: string, value: string) => handle('assistant config set', () => {
      if (key === 'timezone' && !isValidTimeZone(value)) throw new Error(`Unknown time zone "${value}" (use an IANA name such as Europe/Madrid).`);
      return setConfigValue(key, value, home());
    }, () => console.log(`Set ${key}.`)));
  configCmd.command('init')
    .description('Write the default settings, detecting your time zone')
    .option('--owner <name>', 'Your name')
    .option('--locale <locale>', 'es-ES, en-US...')
    .action((opts: { owner?: string; locale?: string }) => handle('assistant config init', () => {
      const current = fs.existsSync(configFile(home())) ? config() : {};
      return writeConfig({ ...current, ...(opts.owner ? { owner: opts.owner } : {}), ...(opts.locale ? { locale: opts.locale } : {}) }, home());
    }, cfg => console.log(`Saved ${configFile(home())} (owner ${cfg.owner}, ${cfg.locale}, ${cfg.timezone}).`)));

  assistant.command('token')
    .description('The bearer token for the HTTP API and the chat page')
    .option('--show', 'Print the whole token', false)
    .option('--rotate', 'Replace it with a new one (old clients stop working)', false)
    .action((opts: { show: boolean; rotate: boolean }) => handle('assistant token', () => {
      const dir = home();
      if (opts.rotate) {
        ensureHome(dir);
        fs.rmSync(path.join(dir, 'token'), { force: true });
      }
      const token = apiToken(dir);
      return { token: opts.show || opts.rotate ? token : `${token.slice(0, 4)}…${token.slice(-4)}`, source: process.env.HELEN_TOKEN ? 'HELEN_TOKEN' : path.join(dir, 'token') };
    }, data => console.log(`${data.token}  (${data.source})`)));

  assistant.command('check')
    .description('Check the setup: permissions, time zone, model key, channels (--send-test sends a test notification)')
    .option('--send-test', 'Send a test notification to every channel', false)
    .action(async (opts: { sendTest: boolean }) => {
      const problems: string[] = [];
      const notes: string[] = [];
      try {
        const dir = home();
        const cfg = config();
        problems.push(...homePermissionProblems(dir));
        if (!isValidTimeZone(cfg.timezone)) problems.push(`Unknown time zone ${cfg.timezone}.`);
        if (cfg.provider?.type === 'anthropic' && cfg.provider.keyEnv && !process.env[cfg.provider.keyEnv]) problems.push(`The model key variable ${cfg.provider.keyEnv} is not set.`);
        if (cfg.channels.telegram && !process.env[cfg.channels.telegram.tokenEnv]) problems.push(`The Telegram token variable ${cfg.channels.telegram.tokenEnv} is not set.`);
        if (cfg.channels.telegram && cfg.channels.telegram.allowedChats.length === 0) notes.push('Telegram has no allowed chat yet: write to your bot, then run helen assistant telegram allow <chat id>.');
        if (cfg.server.host !== '127.0.0.1' && cfg.server.host !== 'localhost' && cfg.server.host !== '::1') notes.push(`The server listens on ${cfg.server.host}: anyone who can reach it still needs the token, but prefer localhost plus a tunnel.`);
        if (cfg.alexa.skillIds.length > 0 && cfg.alexa.userIds.length === 0) notes.push('Alexa: any account that can use your skill can talk to HELEN; pin yours with alexa.userIds.');
        const results = opts.sendTest
          ? await deliver({ title: 'HELEN', text: lang(cfg) === 'es' ? 'Prueba de aviso de HELEN.' : 'HELEN test notification.', sensitive: false, kind: 'test', lang: lang(cfg) }, configuredChannels(cfg, { write: line => console.log(line) }))
          : [];
        for (const result of results) if (!result.ok) (result.skipped ? notes : problems).push(`${result.channel}: ${result.error}`);
        if (isJsonMode()) { printJsonAndExit('assistant check', { problems, notes, delivery: results }, { ok: problems.length === 0, errors: problems, warnings: notes, exitCode: problems.length ? 1 : 0 }); return; }
        for (const result of results) console.log(`${result.ok ? 'sent' : result.skipped ? 'skipped' : 'FAILED'}  ${result.channel}${result.error ? `: ${result.error}` : ''}`);
        for (const note of notes) logger.warn(note);
        for (const problem of problems) logger.error(problem);
        if (problems.length === 0) logger.success('The assistant setup looks right.');
        else process.exitCode = 1;
      } catch (error) {
        if (isJsonMode()) { printJsonAndExit('assistant check', {}, { ok: false, errors: [(error as Error).message], exitCode: 1 }); return; }
        logger.error((error as Error).message);
        process.exitCode = 1;
      }
    });

  assistant.command('serve')
    .description('Run the assistant: chat page and API, reminders, Telegram bot and Alexa endpoint')
    .option('--port <port>', 'Port (default from config: 8787)')
    .option('--host <host>', 'Address to listen on (default 127.0.0.1)')
    .option('--no-scheduler', 'Do not deliver reminders from this process')
    .option('--no-telegram', 'Do not start the Telegram bot')
    .action(async (opts: { port?: string; host?: string; scheduler: boolean; telegram: boolean }) => {
      const dir = home();
      ensureHome(dir);
      const cfg = config();
      const controller = new AbortController();
      const log = (message: string): void => console.log(`${new Date().toISOString().slice(11, 19)}  ${message}`);
      const stop = (): void => { log('Stopping...'); controller.abort(); };
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
      const port = opts.port ? Number(opts.port) : cfg.server.port;
      const host = opts.host ?? cfg.server.host;
      const server = createAssistantServer({
        home: dir, config: cfg, token: apiToken(dir), log,
        ...(cfg.alexa.skillIds.length > 0 ? { verifyAlexa: createAlexaVerifier({ skillIds: cfg.alexa.skillIds, userIds: cfg.alexa.userIds }) } : {}),
      });
      await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, host, () => resolve()); });
      log(`HELEN is listening on http://${host}:${port} (chat page at /, Alexa at /alexa${cfg.alexa.skillIds.length ? '' : ' once alexa.skillIds is set'}).`);
      const tasks: Array<Promise<void>> = [];
      let releaseLease: (() => void) | null = null;
      if (opts.scheduler) {
        try {
          releaseLease = acquireSchedulerLease(dir);
          tasks.push(runScheduler({ home: dir, channels: configuredChannels(cfg, { write: log }), signal: controller.signal, log }));
          log(`Reminders: on (${configuredChannels(cfg, { write: log }).map(channel => channel.name).join(', ') || 'no channel configured'}).`);
        } catch (error) {
          log(`Reminders: off here. ${(error as Error).message}`);
        }
      }
      if (opts.telegram && cfg.channels.telegram) {
        tasks.push(runTelegramBot({ home: dir, config: cfg, signal: controller.signal, log }).catch(error => log(`Telegram: ${(error as Error).message}`)));
        log('Telegram bot: on.');
      }
      await new Promise<void>(resolve => controller.signal.addEventListener('abort', () => resolve(), { once: true }));
      await new Promise<void>(resolve => server.close(() => resolve()));
      await Promise.allSettled(tasks);
      releaseLease?.();
    });

  assistant.command('export')
    .description('Everything HELEN keeps about you, as one JSON document (backups, moving machines)')
    .option('--out <file>', 'Write to a file instead of stdout')
    .action((opts: { out?: string }) => {
      const dir = home();
      const data = { exported: new Date().toISOString(), memory: exportMemory(dir), reminders: listReminders(dir, { status: 'all' }), tasks: listTasks(dir, { status: 'all' }) };
      const json = `${JSON.stringify(data, null, 2)}\n`;
      if (opts.out) {
        writePrivate(path.resolve(opts.out), json);
        logger.success(`Exported ${data.memory.length} notes, ${data.reminders.length} reminders and ${data.tasks.length} tasks to ${opts.out}.`);
      } else process.stdout.write(json);
    });

  const alexa = assistant.command('alexa').description('Talk to HELEN from an Echo');
  alexa.command('model')
    .description('Print the interaction model for the Alexa developer console (Build > JSON Editor)')
    .option('--locale <locale>', 'Skill language (es-ES, es-MX, es-US, en-US, en-GB...)')
    .option('--invocation <name>', 'Invocation name (default: asistente helen / helen assistant)')
    .action((opts: { locale?: string; invocation?: string }) => {
      process.stdout.write(`${JSON.stringify(interactionModel(opts.locale ?? config().locale, opts.invocation), null, 2)}\n`);
    });
  alexa.command('setup')
    .description('Step-by-step: create the skill, expose HELEN over HTTPS, allow reminders')
    .action(() => console.log(alexaGuide(config())));

  const telegram = assistant.command('telegram').description('Talk to HELEN from Telegram');
  telegram.command('allow <chatId>')
    .description('Allow a chat to talk to your HELEN (the bot tells unknown chats their id)')
    .action((chatId: string) => handle('assistant telegram allow', () => {
      const id = Number(chatId);
      if (!Number.isSafeInteger(id)) throw new Error(`"${chatId}" is not a chat id.`);
      const cfg = config();
      const telegramConfig = cfg.channels.telegram ?? { tokenEnv: 'HELEN_TELEGRAM_TOKEN', allowedChats: [] };
      const allowedChats = [...new Set([...telegramConfig.allowedChats, id])];
      writeConfig({ ...cfg, channels: { ...cfg.channels, telegram: { ...telegramConfig, allowedChats } } }, home());
      return { allowedChats };
    }, data => console.log(`Allowed chats: ${data.allowedChats.join(', ')}. Restart helen assistant serve.`)));
  telegram.command('setup')
    .description('How to create your bot and connect it')
    .action(() => console.log(telegramGuide()));

  assistant.command('service')
    .description('Print how to start the assistant automatically at login (systemd, launchd or Task Scheduler)')
    .action(() => console.log(serviceGuide()));
}

function alexaGuide(cfg: AssistantConfig): string {
  const port = cfg.server.port;
  return [
    'Alexa + HELEN, step by step',
    '',
    '1. Expose HELEN over HTTPS. Alexa only calls public HTTPS endpoints with a valid certificate. Pick one tunnel you trust and run it yourself:',
    `   - Cloudflare Tunnel:  cloudflared tunnel --url http://localhost:${port}`,
    `   - Tailscale Funnel:   tailscale funnel ${port}`,
    `   - ngrok:              ngrok http ${port}`,
    '   HELEN does not install any of them. The /alexa endpoint checks Amazon\'s signature on every request; the rest needs the token.',
    '2. In https://developer.amazon.com/alexa/console/ask create a Custom skill, "Provision your own" backend, language ' + cfg.locale + '.',
    '3. Build > Interaction Model > JSON Editor: paste the output of',
    `   helen assistant alexa model --locale ${cfg.locale}`,
    '   then Save and Build.',
    '4. Build > Endpoint: HTTPS, Default Region = https://<your tunnel>/alexa, certificate type "My development endpoint has a certificate from a trusted certificate authority".',
    '5. Build > Permissions: enable "Reminders" (so voice reminders also ring on the Echo).',
    '6. Copy the Skill ID (amzn1.ask.skill....) and allow it:',
    '   helen assistant config set alexa.skillIds \'["amzn1.ask.skill.<id>"]\'',
    '7. Start HELEN: helen assistant serve   (keep the tunnel running)',
    '8. Test > Development, then on your Echo: "Alexa, abre asistente helen" or',
    '   "Alexa, pídele a asistente helen que me recuerde mañana a las nueve llamar a mamá".',
    '9. Optional: pin your Alexa account. Look for "Alexa account" ids in the server log and set alexa.userIds.',
  ].join('\n');
}

function telegramGuide(): string {
  return [
    'Telegram + HELEN, step by step',
    '',
    '1. In Telegram, talk to @BotFather: /newbot, choose a name, copy the token.',
    '2. Keep the token in an environment variable (never in a file in a repository):',
    '   export HELEN_TELEGRAM_TOKEN="<token>"        (Windows: setx HELEN_TELEGRAM_TOKEN "<token>")',
    '3. Turn the channel on:',
    '   helen assistant config set channels.telegram \'{"tokenEnv":"HELEN_TELEGRAM_TOKEN"}\'',
    '4. helen assistant serve, then write anything to your bot. It answers with your chat id and the command to allow it:',
    '   helen assistant telegram allow <chat id>   (then restart the server)',
    'Commands in the chat: /agenda, /manana, /semana, /compra [items], /tareas, /recordatorios, /recuerda <texto>, /recuerdame <texto>, /busca <texto>, or plain sentences.',
  ].join('\n');
}

function serviceGuide(): string {
  const node = process.execPath;
  const cli = path.resolve(process.argv[1] ?? 'helen');
  if (process.platform === 'darwin') {
    const plist = path.join(os.homedir(), 'Library/LaunchAgents/dev.helen.assistant.plist');
    return [
      `Save this as ${plist}:`, '',
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
      '<plist version="1.0"><dict>',
      '  <key>Label</key><string>dev.helen.assistant</string>',
      `  <key>ProgramArguments</key><array><string>${node}</string><string>${cli}</string><string>assistant</string><string>serve</string></array>`,
      '  <key>RunAtLoad</key><true/><key>KeepAlive</key><true/>',
      `  <key>StandardOutPath</key><string>${path.join(os.homedir(), '.helen', 'serve.log')}</string>`,
      `  <key>StandardErrorPath</key><string>${path.join(os.homedir(), '.helen', 'serve.log')}</string>`,
      '</dict></plist>', '',
      `Then: launchctl load -w ${plist}`,
      'Environment variables (HELEN_TELEGRAM_TOKEN, ANTHROPIC_API_KEY...) go in an EnvironmentVariables dict in the same file.',
    ].join('\n');
  }
  if (process.platform === 'win32') {
    return [
      'Run at logon with Task Scheduler (PowerShell):', '',
      `$action = New-ScheduledTaskAction -Execute "${node}" -Argument '"${cli}" assistant serve'`,
      '$trigger = New-ScheduledTaskTrigger -AtLogOn',
      'Register-ScheduledTask -TaskName "HELEN assistant" -Action $action -Trigger $trigger -Description "HELEN personal assistant"',
    ].join('\n');
  }
  const unit = path.join(os.homedir(), '.config/systemd/user/helen-assistant.service');
  return [
    `Save this as ${unit}:`, '',
    '[Unit]', 'Description=HELEN personal assistant', 'After=network-online.target', '',
    '[Service]', `ExecStart=${node} ${cli} assistant serve`, 'Restart=on-failure', '# Environment=HELEN_TELEGRAM_TOKEN=...   (or EnvironmentFile=%h/.helen/env)', '',
    '[Install]', 'WantedBy=default.target', '',
    'Then: systemctl --user daemon-reload && systemctl --user enable --now helen-assistant',
    'To keep it running after you log out: loginctl enable-linger $USER',
  ].join('\n');
}
