import pc from 'picocolors';
import { renderHelenWordmark, shouldUseAsciiArt } from './cinematicArt.js';
import { isJsonMode, addWarning, addError } from './jsonOutput.js';

export const logger = {
  info(msg: string): void {
    if (isJsonMode()) {
      console.error(`[ HELEN ] ${msg}`);
      return;
    }
    console.log(`[ HELEN ] ${msg}`);
  },
  success(msg: string): void {
    if (isJsonMode()) {
      console.error(`[ HELEN ] ${msg}`);
      return;
    }
    console.log(`[ HELEN ] ${msg}`);
  },
  warn(msg: string): void {
    if (isJsonMode()) {
      addWarning(msg);
      console.error(`[ HELEN ] ${msg}`);
      return;
    }
    console.log(`[ HELEN ] ${msg}`);
  },
  error(msg: string): void {
    if (isJsonMode()) {
      addError(msg);
      console.error(`[ HELEN ] ${msg}`);
      return;
    }
    console.error(`[ HELEN ] ${msg}`);
  },
  step(msg: string): void {
    if (isJsonMode()) {
      console.error(`  ${pc.dim('→')} ${msg}`);
      return;
    }
    console.log(`  ${pc.dim('→')} ${msg}`);
  },
  section(title: string): void {
    if (isJsonMode()) {
      console.error('');
      console.error(`${pc.bold(pc.cyan(`  ${title}`))}`);
      console.error(`  ${pc.dim('─'.repeat(60))}`);
      return;
    }
    console.log('');
    console.log(`${pc.bold(pc.cyan(`  ${title}`))}`);
    console.log(`  ${pc.dim('─'.repeat(60))}`);
  },
  blank(): void {
    if (isJsonMode()) {
      console.error('');
      return;
    }
    console.log('');
  },
  banner(): void {
    if (isJsonMode()) return;
    const width = Math.min(process.stdout.columns ?? 80, 104);
    const color = process.env.NO_COLOR === undefined;
    console.log(renderHelenWordmark({ width, height: 12, color, ascii: shouldUseAsciiArt() }));
    console.log(pc.dim('  AI development system / cinematic scaffolds / production-grade taste'));
    console.log(pc.dim('  Designed to ship quieter, sharper, and unmistakably human.'));
    console.log('');
  },
};
