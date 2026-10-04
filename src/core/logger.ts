import pc from 'picocolors';
import { renderHelenWordmark, shouldUseAsciiArt } from './cinematicArt.js';
import { isJsonMode, addWarning, addError } from './jsonOutput.js';
import { AsyncLocalStorage } from 'node:async_hooks';

const stderrLogging = new AsyncLocalStorage<boolean>();
const errorObserver = new AsyncLocalStorage<(message: string) => void>();
export function withCapturedErrors<T>(action: () => T, observer: (message: string) => void): T {
  return errorObserver.run(observer, action);
}
export function withStderrLogging<T>(action: () => T): T {
  return stderrLogging.run(true, action);
}
const useStderr = (): boolean => isJsonMode() || stderrLogging.getStore() === true;

export const logger = {
  info(msg: string): void {
    if (useStderr()) {
      console.error(`[ HELEN ] ${msg}`);
      return;
    }
    console.log(`[ HELEN ] ${msg}`);
  },
  success(msg: string): void {
    if (useStderr()) {
      console.error(`[ HELEN ] ${msg}`);
      return;
    }
    console.log(`[ HELEN ] ${msg}`);
  },
  warn(msg: string): void {
    if (useStderr()) {
      if (isJsonMode()) addWarning(msg);
      console.error(`[ HELEN ] ${msg}`);
      return;
    }
    console.log(`[ HELEN ] ${msg}`);
  },
  error(msg: string): void {
    errorObserver.getStore()?.(msg);
    if (useStderr()) {
      if (isJsonMode()) addError(msg);
      console.error(`[ HELEN ] ${msg}`);
      return;
    }
    console.error(`[ HELEN ] ${msg}`);
  },
  step(msg: string): void {
    if (useStderr()) {
      console.error(`  ${pc.dim('→')} ${msg}`);
      return;
    }
    console.log(`  ${pc.dim('→')} ${msg}`);
  },
  section(title: string): void {
    if (useStderr()) {
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
    if (useStderr()) {
      console.error('');
      return;
    }
    console.log('');
  },
  banner(): void {
    if (useStderr()) return;
    const width = Math.min(process.stdout.columns ?? 80, 104);
    const color = process.env.NO_COLOR === undefined;
    console.log(renderHelenWordmark({ width, height: 12, color, ascii: shouldUseAsciiArt() }));
    console.log(pc.dim('  AI development system / cinematic scaffolds / production-grade taste'));
    console.log(pc.dim('  Designed to ship quieter, sharper, and unmistakably human.'));
    console.log('');
  },
};
