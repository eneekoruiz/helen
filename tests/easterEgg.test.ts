import { describe, expect, it } from 'vitest';
import {
  renderHelenFrame,
  renderHelenWordmark,
  shouldAnimateHelenArt,
} from '../src/core/easterEgg.js';

describe('Helen terminal art', () => {
  it('settles on the HELEN wordmark without ANSI when color is disabled', () => {
    const frame = renderHelenWordmark({ width: 80, height: 14, color: false });

    expect(frame).toContain('███████');
    expect(frame).toContain('███╗   ██╗');
    expect(frame).not.toContain('\x1b[');
  });

  it('uses a compact wordmark in narrow terminals', () => {
    const frame = renderHelenWordmark({ width: 34, height: 10, color: false });

    expect(frame).toContain('█  █  ███');
    expect(frame.split('\n')).toHaveLength(10);
  });

  it('renders distinct construction and final frames', () => {
    const opening = renderHelenFrame(0.16, { width: 70, height: 14, color: false });
    const reveal = renderHelenFrame(0.55, { width: 70, height: 14, color: false });
    const final = renderHelenFrame(1, { width: 70, height: 14, color: false });

    expect(opening).not.toBe(reveal);
    expect(reveal).not.toBe(final);
    expect(opening).toMatch(/[·•◆]/);
  });

  it('animates only in capable interactive terminals', () => {
    expect(shouldAnimateHelenArt({ isTTY: true, term: 'xterm-256color' })).toBe(true);
    expect(shouldAnimateHelenArt({ isTTY: false })).toBe(false);
    expect(shouldAnimateHelenArt({ isTTY: true, reducedMotion: true })).toBe(false);
    expect(shouldAnimateHelenArt({ isTTY: true, ci: true })).toBe(false);
    expect(shouldAnimateHelenArt({ isTTY: true, term: 'dumb' })).toBe(false);
  });
});
