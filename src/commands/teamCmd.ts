import { Command } from 'commander';
import { ClaimConflictError, heartbeatClaim } from '../core/claims.js';
import { readEvents } from '../core/events.js';
import { isJsonMode, printJsonAndExit } from '../core/jsonOutput.js';
import { logger } from '../core/logger.js';
import {
  ackHandoff, buildWorkGraph, claimNextItem, claimWorkItem, completeWorkItem, createHandoff, formatItemBrief, readInbox, releaseWorkItem, skipWorkItem, type WorkGraph, type WorkRole,
} from '../core/orchestrate.js';
import { buildPlan, readPlaybooks } from '../core/apply.js';
import { readProgress, startProgress } from '../core/progress.js';
import { presetCommand, runTeam, splitCommand } from '../core/teamRun.js';

const ROLES: WorkRole[] = ['planner', 'researcher', 'implementer', 'reviewer', 'verifier'];

/** 30m, 2h, 90s or plain seconds. */
export function parseDuration(value: string): number {
  const match = /^(\d+(?:\.\d+)?)\s*(s|m|h)?$/i.exec(value.trim());
  if (!match) throw new Error(`Invalid duration "${value}": use 90s, 30m, 2h or a number of seconds.`);
  const unit = (match[2] ?? 's').toLowerCase();
  return Math.round(Number(match[1]) * (unit === 'h' ? 3600 : unit === 'm' ? 60 : 1));
}

export function agentName(value?: string): string {
  const name = value ?? process.env.HELEN_AGENT;
  if (!name) throw new Error('Say who you are: pass --agent <name> or set HELEN_AGENT (for example claude-1, codex-2).');
  return name;
}

function roleOption(value?: string): WorkRole | undefined {
  if (value === undefined) return undefined;
  if (!ROLES.includes(value as WorkRole)) throw new Error(`Unknown role "${value}". Roles: ${ROLES.join(', ')}.`);
  return value as WorkRole;
}

export function formatGraph(graph: WorkGraph): string {
  const icon = { done: '[x]', skipped: '[-]', claimed: '[~]', ready: '[ ]', blocked: '[.]' } as const;
  const lines = [`${graph.title} (${graph.goal}), phase ${graph.phase}: ${graph.counts.done + graph.counts.skipped}/${graph.counts.total} finished, ${graph.counts.ready} ready, ${graph.counts.claimed} claimed`];
  graph.waves.forEach((wave, index) => {
    lines.push('', `Wave ${index + 1}${wave.length > 1 ? ` - ${wave.length} items can run in parallel` : ''}`);
    for (const id of wave) {
      const item = graph.items.find(candidate => candidate.id === id)!;
      const holder = item.claim ? `  claimed by ${item.claim.agent} until ${item.claim.expiresAt}` : item.expiredClaim ? `  lease of ${item.expiredClaim.agent} expired` : '';
      lines.push(`  ${icon[item.state]} ${item.id}  (${item.role}${item.readOnly ? ', read-only' : ''}${item.needsApproval ? ', needs approval' : ''})${holder}`);
    }
  });
  lines.push('', graph.finished ? 'Finished.' : graph.ready.length ? `Next: helen team claim --agent <name>   (ready: ${graph.ready.join(', ')})` : 'Nothing is ready: wait for the claimed items.');
  return lines.join('\n');
}

export function handle(command: string, action: () => unknown, human: (data: any) => void): void {
  try {
    const data = action();
    if (isJsonMode()) {
      printJsonAndExit(command, data);
      return;
    }
    human(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const conflict = error instanceof ClaimConflictError;
    if (isJsonMode()) {
      printJsonAndExit(command, conflict && error.holder ? { holder: { agent: error.holder.agent, expiresAt: error.holder.expiresAt } } : {}, { ok: false, errors: [message], exitCode: 1 });
      return;
    }
    logger.error(message);
    process.exitCode = 1;
  }
}

export function registerTeamCommands(program: Command): void {
  const team = program
    .command('team')
    .description('Coordinate several AI agents on one plan: work graph, claims, handoffs, and an autonomous runner');

  team.command('graph')
    .description('Show the plan as waves of work: what can run in parallel, what is ready, who holds what')
    .action(() => handle('team graph', () => buildWorkGraph(process.cwd()), graph => console.log(formatGraph(graph))));

  team.command('claim [item]')
    .description('Take a work item (or the next ready one) with a lease; other agents cannot take it until it expires')
    .option('--agent <name>', 'Your agent name (or HELEN_AGENT)')
    .option('--role <role>', `Prefer items for this role: ${ROLES.join(', ')}`)
    .option('--paths <globs...>', 'Files or folders you will write (writers default to the whole project)')
    .option('--ttl <duration>', 'Lease length, e.g. 30m (default), 2h', '30m')
    .option('--note <text>', 'Why or how')
    .action((item: string | undefined, opts: { agent?: string; role?: string; paths?: string[]; ttl: string; note?: string }) => {
      handle('team claim', () => {
        const options = { agent: agentName(opts.agent), role: roleOption(opts.role), paths: opts.paths, ttlSeconds: parseDuration(opts.ttl), note: opts.note };
        const claimed = item ? claimWorkItem(process.cwd(), item, options) : claimNextItem(process.cwd(), options);
        if (!claimed) return { claimed: false, message: 'Nothing is ready to claim.' };
        return { claimed: true, item: claimed.item, claim: claimed.claim, renewed: claimed.renewed, tookOverFrom: claimed.tookOverFrom?.agent };
      }, data => {
        if (!data.claimed) { console.log(data.message); return; }
        console.log(`Claimed ${data.item.id} until ${data.claim.expiresAt}${data.tookOverFrom ? ` (took over from ${data.tookOverFrom})` : ''}.`);
        console.log(`Brief: helen team brief ${data.item.id} --agent ${data.claim.agent}`);
      });
    });

  team.command('brief <item>')
    .description('Print everything a worker needs for one item: protocol, prompt, earlier results, handoffs')
    .option('--agent <name>', 'Your agent name (or HELEN_AGENT)')
    .action((item: string, opts: { agent?: string }) => {
      handle('team brief', () => ({ item, brief: formatItemBrief(process.cwd(), item, agentName(opts.agent)) }), data => console.log(data.brief));
    });

  team.command('heartbeat <item>')
    .description('Extend your lease while you are still working')
    .option('--agent <name>', 'Your agent name (or HELEN_AGENT)')
    .option('--ttl <duration>', 'New lease length')
    .action((item: string, opts: { agent?: string; ttl?: string }) => {
      handle('team heartbeat', () => heartbeatClaim(process.cwd(), item, agentName(opts.agent), opts.ttl ? parseDuration(opts.ttl) : undefined),
        claim => console.log(`Lease on ${claim.item} extended until ${claim.expiresAt}.`));
    });

  team.command('complete <item>')
    .description('Finish an item you hold (a checkpoint needs a passing helen check)')
    .option('--agent <name>', 'Your agent name (or HELEN_AGENT)')
    .option('--note <text>', 'What you did')
    .option('--force', 'Allow a checkpoint without a passing check (the note must say why)', false)
    .action((item: string, opts: { agent?: string; note?: string; force: boolean }) => {
      handle('team complete', () => completeWorkItem(process.cwd(), item, { agent: agentName(opts.agent), note: opts.note, force: opts.force }),
        graph => console.log(`Completed ${item}. ${graph.finished ? 'The plan is finished.' : `Ready now: ${graph.ready.join(', ') || 'nothing (wait for claimed items)'}`}`));
    });

  team.command('skip <item>')
    .description('Skip an item with a recorded reason')
    .option('--agent <name>', 'Your agent name (or HELEN_AGENT)')
    .requiredOption('--reason <text>', 'Why it does not apply')
    .action((item: string, opts: { agent?: string; reason: string }) => {
      handle('team skip', () => skipWorkItem(process.cwd(), item, { agent: agentName(opts.agent), reason: opts.reason }), () => console.log(`Skipped ${item}.`));
    });

  team.command('release <item>')
    .description('Give an item back so another agent can take it')
    .option('--agent <name>', 'Your agent name (or HELEN_AGENT)')
    .option('--reason <text>', 'Why')
    .option('--force', 'Release a claim held by someone else', false)
    .action((item: string, opts: { agent?: string; reason?: string; force: boolean }) => {
      handle('team release', () => ({ released: releaseWorkItem(process.cwd(), item, { agent: agentName(opts.agent), reason: opts.reason, force: opts.force }) }),
        data => console.log(data.released ? `Released ${item}.` : `${item} had no claim.`));
    });

  team.command('handoff')
    .description('Leave a structured message for another agent or role')
    .option('--from <name>', 'Your agent name (or HELEN_AGENT)')
    .requiredOption('--to <recipient>', 'Agent name or role:<planner|researcher|implementer|reviewer|verifier>')
    .requiredOption('--message <text>', 'What the next agent must know')
    .option('--item <id>', 'Related work item')
    .option('--files <paths...>', 'Relevant files')
    .option('--next <text>', 'Suggested next action')
    .action((opts: { from?: string; to: string; message: string; item?: string; files?: string[]; next?: string }) => {
      handle('team handoff', () => createHandoff(process.cwd(), { from: agentName(opts.from), to: opts.to, message: opts.message, item: opts.item, files: opts.files, next: opts.next }),
        handoff => console.log(`Handoff ${handoff.id} left for ${handoff.to}.`));
    });

  team.command('inbox')
    .description('Read handoffs addressed to you')
    .option('--agent <name>', 'Your agent name (or HELEN_AGENT)')
    .option('--role <role>', 'Also receive handoffs addressed to this role')
    .option('--all', 'Include acknowledged handoffs', false)
    .option('--ack <id>', 'Acknowledge a handoff')
    .action((opts: { agent?: string; role?: string; all: boolean; ack?: string }) => {
      handle('team inbox', () => {
        const agent = agentName(opts.agent);
        if (opts.ack) ackHandoff(process.cwd(), opts.ack, agent);
        return { handoffs: readInbox(process.cwd(), { agent, role: roleOption(opts.role) }, opts.all) };
      }, data => {
        if (data.handoffs.length === 0) { console.log('No handoffs for you.'); return; }
        for (const handoff of data.handoffs) console.log(`${handoff.id}  from ${handoff.from}${handoff.item ? ` (${handoff.item})` : ''}${handoff.acked ? ' [read]' : ''}\n  ${handoff.message}${handoff.next ? `\n  Next: ${handoff.next}` : ''}`);
      });
    });

  team.command('events')
    .description('Show the coordination log')
    .option('--type <type>', 'Event type, e.g. item.completed or claim.*')
    .option('--item <id>', 'Only this item')
    .option('--agent <name>', 'Only this agent')
    .option('--since <iso>', 'Only events after this timestamp')
    .option('--limit <n>', 'Only the last n events', '50')
    .action((opts: { type?: string; item?: string; agent?: string; since?: string; limit: string }) => {
      handle('team events', () => ({ events: readEvents(process.cwd(), { type: opts.type, item: opts.item, agent: opts.agent, since: opts.since, limit: Number(opts.limit) }) }),
        data => { for (const event of data.events) console.log(`${event.ts}  ${event.type}${event.agent ? `  ${event.agent}` : ''}${event.item ? `  ${event.item}` : ''}`); });
    });

  team.command('run [goal]')
    .description('Drive the plan to the end with worker agents: parallel read-only work, serial writers, HELEN-verified checkpoints')
    .option('--agent <preset>', 'Worker preset: claude (print mode, scoped permissions)')
    .option('--command <line>', 'Worker command line; the brief arrives on stdin and in $HELEN_BRIEF_FILE')
    .option('--concurrency <n>', 'Parallel read-only workers', '3')
    .option('--ttl <duration>', 'Lease length per item', '30m')
    .option('--timeout <duration>', 'Time limit per worker run', '25m')
    .option('--retries <n>', 'Retries per failed item', '1')
    .option('--max-runs <n>', 'Safety limit on worker runs', '100')
    .option('--dry-run', 'Show what would run without starting any worker', false)
    .action(async (goal: string | undefined, opts: { agent?: string; command?: string; concurrency: string; ttl: string; timeout: string; retries: string; maxRuns: string; dryRun: boolean }) => {
      try {
        const cwd = process.cwd();
        if (!opts.agent && !opts.command) throw new Error('Choose the worker: --agent claude, or --command "<program and arguments>".');
        if (opts.agent && opts.command) throw new Error('Use either --agent or --command, not both.');
        if (!readProgress(cwd)) {
          if (!goal) throw new Error('Nothing is being tracked. Pass a goal: helen team run <goal> --agent claude');
          startProgress(cwd, buildPlan(cwd, goal, readPlaybooks(undefined, cwd)));
        }
        const commandFor = (item: Parameters<typeof presetCommand>[1]): string[] => (opts.agent ? presetCommand(opts.agent, item) : splitCommand(opts.command!));
        if (opts.dryRun) {
          const graph = buildWorkGraph(cwd);
          const plan = graph.waves.map((wave, index) => ({
            wave: index + 1,
            parallel: wave.length > 1,
            items: wave.map(id => { const item = graph.items.find(candidate => candidate.id === id)!; return { id, state: item.state, command: item.kind === 'checkpoint' ? ['(verified by helen with the project scripts)'] : commandFor(item) }; }),
          }));
          if (isJsonMode()) { printJsonAndExit('team run', { dryRun: true, plan }); return; }
          for (const wave of plan) {
            console.log(`Wave ${wave.wave}${wave.parallel ? ' (parallel)' : ''}`);
            for (const item of wave.items) console.log(`  [${item.state}] ${item.id}: ${item.command.join(' ')}`);
          }
          return;
        }
        const result = await runTeam({
          cwd, command: commandFor, concurrency: Number(opts.concurrency), ttlSeconds: parseDuration(opts.ttl), timeoutMs: parseDuration(opts.timeout) * 1000,
          retries: Number(opts.retries), maxRuns: Number(opts.maxRuns), log: message => logger.info(message),
        });
        const { graph, ...summary } = result;
        if (isJsonMode()) {
          printJsonAndExit('team run', { ...summary, graph }, { ok: result.finished, errors: result.finished ? [] : [result.stopped?.reason ?? 'The run did not finish.'], exitCode: result.finished ? 0 : 1 });
          return;
        }
        console.log(formatGraph(graph));
        if (result.finished) logger.success(`Finished: ${result.completed.length} item(s) completed in ${result.runs} run(s).`);
        else { logger.error(result.stopped?.reason ?? 'The run did not finish.'); process.exitCode = 1; }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isJsonMode()) { printJsonAndExit('team run', {}, { ok: false, errors: [message], exitCode: 1 }); return; }
        logger.error(message);
        process.exitCode = 1;
      }
    });
}
