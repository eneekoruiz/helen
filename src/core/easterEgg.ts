import {
  renderCinematicFrame,
  renderHelenWordmark as renderCinematicHelenWordmark,
  runHelenArt,
  shouldAnimateCinematicArt,
  type CinematicArtOptions,
  type TerminalCapabilities,
} from './cinematicArt.js';

export type HelenAnimationCapabilities = TerminalCapabilities;

export type HelenArtOptions = CinematicArtOptions;

export function shouldAnimateHelenArt(capabilities: HelenAnimationCapabilities): boolean {
  return shouldAnimateCinematicArt(capabilities);
}

export function renderHelenFrame(progress: number, options: HelenArtOptions = {}): string {
  return renderCinematicFrame('helen', progress, options);
}

export function renderHelenWordmark(options: HelenArtOptions = {}): string {
  return renderCinematicHelenWordmark(options);
}

export async function runEasterEgg(): Promise<void> {
  await runHelenArt();
}
