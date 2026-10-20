import { Command } from 'commander';
import { checkDesign, type DesignReport } from '../core/designCheck.js';
import { generateDirections, type DirectionSet } from '../core/direction.js';
import { isJsonMode, printJsonAndExit } from '../core/jsonOutput.js';
import { logger } from '../core/logger.js';
import { handle } from './teamCmd.js';

function printDirections(set: DirectionSet): void {
  console.log(`Seed ${set.seed}${set.briefTags.length ? `  (brief reads as: ${[...new Set(set.briefTags)].join(', ')})` : ''}\n`);
  for (const direction of set.directions) {
    const c = direction.choices;
    console.log(`Direction ${direction.label}: ${direction.title}`);
    console.log(`  ${direction.thesis}`);
    console.log(`  Signature move: ${direction.signature}`);
    console.log(`  Type: ${(c.type as { display: string; text: string }).display} + ${(c.type as { display: string; text: string }).text}   Color: ${c.color.name}   Layout: ${c.layout.name}`);
    console.log(`  Motion: ${c.motion.name}   Imagery: ${c.imagery.name}   Voice: ${c.voice.name}`);
    console.log(`  Watch out: ${direction.watchOut.join(' | ')}`);
    console.log(`  Tokens:\n${direction.tokens.css.split('\n').map(line => `    ${line}`).join('\n')}\n`);
  }
  console.log('Never use (unless the brief truly asks for it):');
  for (const item of set.banned) console.log(`  - ${item}`);
  console.log('\nHow to choose:');
  for (const item of set.howToChoose) console.log(`  - ${item}`);
}

function printReport(report: DesignReport): void {
  console.log(`Scanned ${report.filesScanned} file(s): ${report.counts.error} error(s), ${report.counts.warn} warning(s), ${report.counts.info} note(s). Template score ${report.score}/100 (${report.verdict}).`);
  for (const severity of ['error', 'warn', 'info'] as const) {
    for (const finding of report.findings.filter(entry => entry.severity === severity)) {
      console.log(`  ${severity.padEnd(5)} ${finding.file}:${finding.line}  [${finding.rule}] ${finding.message}\n         Fix: ${finding.fix}`);
    }
  }
  if (report.findings.length === 0) console.log('No template tells found. That does not make it good: score it with `helen loop`.');
}

export function registerDesignCommands(program: Command): void {
  const design = program
    .command('design')
    .description('Make designs that are not the same as everyone else\'s: distinct directions up front, a deterministic template detector at the end');

  design.command('direction')
    .description('Generate distinct creative directions for a project: concept, type, color, layout, motion, imagery and voice')
    .requiredOption('--brief <text>', 'What it is, who it is for, how it should feel')
    .option('--count <n>', 'How many directions (1-5)', '3')
    .option('--seed <text>', 'Reproducible variation; change it to explore other directions')
    .option('--tone <words...>', 'Extra tone words, e.g. calm warm technical')
    .option('--avoid <terms...>', 'Options to rule out, e.g. dark brutalist')
    .action((opts: { brief: string; count: string; seed?: string; tone?: string[]; avoid?: string[] }) => {
      handle('design direction', () => generateDirections({ brief: opts.brief, count: Number(opts.count), seed: opts.seed, tone: opts.tone, avoid: opts.avoid }), printDirections);
    });

  design.command('check [path]')
    .description('Scan a front end for the tells of generic output and for real defects (contrast, alt text, reduced motion, placeholder content)')
    .option('--fail-on <level>', 'Exit non-zero on: error (default), warn, or none', 'error')
    .action((target: string | undefined, opts: { failOn: string }) => {
      try {
        const report = checkDesign(target ?? process.cwd());
        const failing = opts.failOn === 'none' ? 0 : opts.failOn === 'warn' ? report.counts.error + report.counts.warn : report.counts.error;
        const code = failing > 0 ? 1 : report.counts.warn + report.counts.info > 0 ? 2 : 0;
        if (isJsonMode()) {
          printJsonAndExit('design check', report, { ok: failing === 0, errors: report.findings.filter(finding => finding.severity === 'error').map(finding => `${finding.file}:${finding.line} [${finding.rule}] ${finding.message}`), warnings: report.findings.filter(finding => finding.severity !== 'error').map(finding => `${finding.file}:${finding.line} [${finding.rule}] ${finding.message}`), exitCode: failing > 0 ? 1 : code === 2 ? 2 : 0 });
          return;
        }
        printReport(report);
        process.exitCode = failing > 0 ? 1 : 0;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isJsonMode()) { printJsonAndExit('design check', {}, { ok: false, errors: [message], exitCode: 1 }); return; }
        logger.error(message);
        process.exitCode = 1;
      }
    });
}
