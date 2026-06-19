import { describe, expect, it } from 'vitest';
import {
  renderCinematicFrame,
  renderEnekoRuizWordmark,
  renderHelenWordmark,
  shouldAnimateCinematicArt,
} from '../src/core/cinematicArt.js';

describe('Cinematic terminal identities', () => {
  it('settles HELEN into a signed final lockup', () => {
    const frame = renderHelenWordmark({ width: 88, height: 16, color: false });

    expect(frame).toContain('███████');
    expect(frame).toContain('B Y   E N E K O   R U I Z');
    expect(frame).not.toContain('\x1b[');
  });

  it('gives ENEKO RUIZ an independent panoramic wordmark', () => {
    const frame = renderEnekoRuizWordmark({ width: 100, height: 16, color: false });

    expect(frame).toContain('███████ ██   ██ ███████ ██   ██');
    expect(frame).toContain('███████ ██   ██ ███████ ██   ██  █████      ██   ██  █████  ███████ ███████');
    expect(frame).not.toContain('B Y   E N E K O');
  });

  it('uses a procedural braille light field during formation', () => {
    const opening = renderCinematicFrame('helen', 0.08, { width: 80, height: 18, color: false });
    const field = renderCinematicFrame('helen', 0.3, { width: 80, height: 18, color: false });
    const final = renderCinematicFrame('helen', 1, { width: 80, height: 18, color: false });

    expect(field).toMatch(/[⠀-⣿]/u);
    expect(opening).not.toBe(field);
    expect(field).not.toBe(final);
  });

  it('keeps both identities legible in narrow terminals', () => {
    const helen = renderHelenWordmark({ width: 34, height: 10, color: false });
    const signature = renderEnekoRuizWordmark({ width: 34, height: 10, color: false });

    expect(helen).toContain('█  █  ███');
    expect(signature).toContain('E N E K O');
  });

  it('animates only in capable interactive terminals', () => {
    expect(shouldAnimateCinematicArt({ isTTY: true, term: 'xterm-256color' })).toBe(true);
    expect(shouldAnimateCinematicArt({ isTTY: false })).toBe(false);
    expect(shouldAnimateCinematicArt({ isTTY: true, reducedMotion: true })).toBe(false);
    expect(shouldAnimateCinematicArt({ isTTY: true, ci: true })).toBe(false);
    expect(shouldAnimateCinematicArt({ isTTY: true, term: 'dumb' })).toBe(false);
  });
});

