import pc from 'picocolors';
import { renderHelenWordmark, shouldUseAsciiArt } from './cinematicArt.js';

export const logger = {
  info(msg: string): void {
    console.log(`[ HELEN ] ${msg}`);
  },
  success(msg: string): void {
    console.log(`[ HELEN ] ${msg}`);
  },
  warn(msg: string): void {
    console.log(`[ HELEN ] ${msg}`);
  },
  error(msg: string): void {
    console.error(`[ HELEN ] ${msg}`);
  },
  step(msg: string): void {
    console.log(`  ${pc.dim('→')} ${msg}`);
  },
  section(title: string): void {
    console.log('');
    console.log(`${pc.bold(pc.cyan(`  ${title}`))}`);
    console.log(`  ${pc.dim('─'.repeat(60))}`);
  },
  blank(): void {
    console.log('');
  },
  banner(): void {
    const width = Math.min(process.stdout.columns ?? 80, 104);
    const color = process.env.NO_COLOR === undefined;
    console.log(renderHelenWordmark({ width, height: 12, color, ascii: shouldUseAsciiArt() }));
    console.log(pc.dim('  AI development system / cinematic scaffolds / production-grade taste'));
    console.log(pc.dim('  Designed to ship quieter, sharper, and unmistakably human.'));
    console.log('');
  },
};
