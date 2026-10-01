import { Command } from 'commander';
import { isJsonMode, printJsonAndExit } from '../core/jsonOutput.js';
import { logger } from '../core/logger.js';
import { printPromptContent, printPromptList, printPromptPath, searchPrompts, shortId, listPromptEntries, resolvePromptEntry, readPrompt, findPromptOverlaps, type PromptKind } from '../core/prompts.js';
import { updatePhaseIndexes } from '../core/promptIndex.js';
import { runLint } from '../index.js';

export function registerPromptsCommands(program: Command) {
  const prompts = program
    .command('prompts')
    .description('Browse reusable project prompts, atomic steps, checkpoints, and executable flows')
    .action(() => {
      if (isJsonMode()) {
        printJsonAndExit('prompts', { prompts: listPromptEntries().map(e => ({ id: shortId(e), fullId: e.id, summary: e.summary, kind: e.kind })) });
        return;
      }
      printPromptList();
    });

  prompts
    .command('list')
    .description('List available prompts and flows')
    .option('--kind <kind>', 'Filter by kind: master, guide, flow, checkpoint, prompt')
    .action((opts: { kind?: PromptKind }) => {
      const entries = listPromptEntries().filter(entry => !opts.kind || entry.kind === opts.kind);
      if (isJsonMode()) {
        printJsonAndExit('prompts:list', {
          kind: opts.kind ?? 'all',
          count: entries.length,
          prompts: entries.map(e => ({
            id: shortId(e),
            fullId: e.id,
            kind: e.kind,
            phase: e.phase,
            action: e.action,
            summary: e.summary,
            path: e.relativePath,
          })),
        });
        return;
      }
      printPromptList(opts.kind);
    });

  prompts
    .command('search <words...>')
    .description('Find prompts by words in their id, title, summary or aliases')
    .action((words: string[]) => {
      const query = words.join(' ');
      const results = searchPrompts(query);
      if (isJsonMode()) {
        printJsonAndExit('prompts:search', {
          query,
          count: results.length,
          results: results.map(e => ({
            id: shortId(e),
            fullId: e.id,
            kind: e.kind,
            phase: e.phase,
            action: e.action,
            summary: e.summary,
            path: e.relativePath,
          })),
        });
        return;
      }
      if (results.length === 0) {
        logger.warn('No prompt matches. Try other words or: helen prompts list');
        return;
      }
      for (const entry of results.slice(0, 15)) {
        console.log(`${shortId(entry).padEnd(46)} ${entry.summary}`);
      }
    });

  prompts
    .command('index')
    .description('Regenerate the prompt index in every phase README from prompt frontmatter')
    .action(() => {
      const changed = updatePhaseIndexes(true);
      if (isJsonMode()) {
        printJsonAndExit('prompts:index', { changed });
        return;
      }
      logger.success(changed.length ? `Updated: ${changed.join(', ')}` : 'All phase indexes are up to date.');
    });

  prompts
    .command('lint')
    .description('Same as `helen lint`')
    .action(() => {
      process.exitCode = runLint();
    });

  prompts
    .command('show <prompt>')
    .description('Print a prompt, step, checkpoint, or flow')
    .option('--fill <pairs...>', 'Fill variables in format key=value')
    .option('--reply-lang <lang>', 'Target language for the AI response (e.g. es, en, fr)')
    .action((promptName: string, opts: { fill?: string[]; replyLang?: string }) => {
      try {
        const entry = resolvePromptEntry(promptName);
        const fillDict: Record<string, string> = {};
        if (opts.fill) {
          for (const pair of opts.fill) {
            const [k, ...rest] = pair.split('=');
            if (k && rest.length > 0) fillDict[k] = rest.join('=');
          }
        }
        const content = readPrompt(promptName, undefined, { fill: Object.keys(fillDict).length ? fillDict : undefined, replyLang: opts.replyLang });
        if (isJsonMode()) {
          printJsonAndExit('prompts:show', {
            id: shortId(entry),
            fullId: entry.id,
            kind: entry.kind,
            summary: entry.summary,
            path: entry.relativePath,
            content,
          });
          return;
        }
        console.log(content);
      } catch (err) {
        if (isJsonMode()) {
          printJsonAndExit('prompts:show', {}, {
            ok: false,
            errors: [err instanceof Error ? err.message : String(err)],
            exitCode: 1,
          });
          return;
        }
        logger.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });

  prompts
    .command('overlaps')
    .description('Identify overlapping prompts by word-set Jaccard similarity')
    .option('--threshold <val>', 'Similarity threshold between 0.0 and 1.0', '0.45')
    .action((opts: { threshold: string }) => {
      const thresh = parseFloat(opts.threshold) || 0.45;
      const overlaps = findPromptOverlaps(undefined, thresh);
      if (isJsonMode()) {
        printJsonAndExit('prompts:overlaps', {
          threshold: thresh,
          count: overlaps.length,
          overlaps,
        });
        return;
      }
      if (overlaps.length === 0) {
        logger.success(`No prompt overlaps found above ${thresh * 100}% similarity.`);
        return;
      }
      logger.section(`Prompt Overlaps (>= ${thresh * 100}%)`);
      for (const o of overlaps) {
        console.log(`  ${o.promptA} <-> ${o.promptB} (${Math.round(o.similarity * 100)}%)`);
      }
    });

  prompts
    .command('path <prompt>')
    .description('Print the absolute path to a prompt, step, checkpoint, or flow')
    .action((promptName: string) => {
      try {
        const entry = resolvePromptEntry(promptName);
        if (isJsonMode()) {
          printJsonAndExit('prompts:path', {
            id: shortId(entry),
            fullId: entry.id,
            absolutePath: entry.absolutePath,
            relativePath: entry.relativePath,
          });
          return;
        }
        printPromptPath(promptName);
      } catch (err) {
        if (isJsonMode()) {
          printJsonAndExit('prompts:path', {}, {
            ok: false,
            errors: [err instanceof Error ? err.message : String(err)],
            exitCode: 1,
          });
          return;
        }
        logger.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });

  prompts
    .command('flow <flow>')
    .description('Print an executable flow such as full-polish, release-candidate, or client-delivery')
    .action((flow: string) => {
      try {
        const entry = resolvePromptEntry(flow);
        const content = readPrompt(flow);
        if (isJsonMode()) {
          printJsonAndExit('prompts:flow', {
            id: shortId(entry),
            fullId: entry.id,
            kind: entry.kind,
            path: entry.relativePath,
            content,
          });
          return;
        }
        printPromptContent(flow);
      } catch (err) {
        if (isJsonMode()) {
          printJsonAndExit('prompts:flow', {}, {
            ok: false,
            errors: [err instanceof Error ? err.message : String(err)],
            exitCode: 1,
          });
          return;
        }
        logger.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });

}
