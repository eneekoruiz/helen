import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import {
  renderCinematicFrame,
  renderEnekoRuizWordmark,
  renderHelenWordmark,
  shouldAnimateCinematicArt,
  playCinematicSequence,
  startupWelcomeIdentity,
} from '../src/core/cinematicArt.js';

describe('Cinematic terminal identities', () => {
  it('settles HELEN into a signed final lockup', () => {
    const frame = renderHelenWordmark({ width: 88, height: 16, color: false });

    expect(frame).toContain('███████');
    expect(frame).toContain('B Y   E N E K O   R U I Z');
    expect(frame).toContain('SYSTEM');
    expect(frame).toContain('READY');
    expect(frame).not.toContain('\x1b[');
  });

  it('gives ENEKO RUIZ an independent panoramic wordmark', () => {
    const frame = renderEnekoRuizWordmark({ width: 100, height: 16, color: false });

    expect(frame).toContain('███████  ██    ██  ███████  ██   ██');
    expect(frame).toContain('███████  ██   ███  ███████  ██   ██   █████      ██   ██   █████   ██  ███████');
    expect(frame).not.toContain('B Y   E N E K O');
  });

  it('uses a procedural braille light field during formation', () => {
    const opening = renderCinematicFrame('helen', 0.08, { width: 80, height: 18, color: false });
    const field = renderCinematicFrame('helen', 0.3, { width: 80, height: 18, color: false });
    const final = renderCinematicFrame('helen', 1, { width: 80, height: 18, color: false });

    expect(field).toMatch(/[⠀-⣿]/u);
    expect(field).toMatch(/[·∴∷∙]/u);
    expect(opening).not.toBe(field);
    expect(field).not.toBe(final);
  });

  it('draws the editorial frame once the identity has resolved', () => {
    const frame = renderCinematicFrame('helen', 0.88, { width: 88, height: 16, color: false });

    expect(frame).toMatch(/[─━]/u);
    expect(frame).toContain('COMPOSED');
  });

  it('keeps both identities legible in narrow terminals', () => {
    const helen = renderHelenWordmark({ width: 34, height: 10, color: false });
    const signature = renderEnekoRuizWordmark({ width: 34, height: 10, color: false });

    expect(helen).toContain('█  █  ███');
    expect(signature).toContain('E N E K O');
  });

  it('can render a pure ASCII lockup for legacy terminals', () => {
    const frame = renderHelenWordmark({ width: 80, height: 14, color: false, ascii: true });

    expect(frame).toContain('H   H  EEEEE');
    expect(frame).toContain('SYSTEM');
    // eslint-disable-next-line no-control-regex
    expect(frame).not.toMatch(/[^\x00-\x7F]/);
  });

  it('animates only in capable interactive terminals', () => {
    expect(shouldAnimateCinematicArt({ isTTY: true, term: 'xterm-256color' })).toBe(true);
    expect(shouldAnimateCinematicArt({ isTTY: false })).toBe(false);
    expect(shouldAnimateCinematicArt({ isTTY: true, inputTTY: false })).toBe(false);
    expect(shouldAnimateCinematicArt({ isTTY: true, reducedMotion: true })).toBe(false);
    expect(shouldAnimateCinematicArt({ isTTY: true, ci: true })).toBe(false);
    expect(shouldAnimateCinematicArt({ isTTY: true, term: 'dumb' })).toBe(false);
  });
});

describe('Skippable playback', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  function input(raw = false, flowing = false) {
    return Object.assign(new EventEmitter(), {
      isTTY: true, isRaw: raw, readableFlowing: flowing,
      setRawMode: vi.fn(), resume: vi.fn(), pause: vi.fn(),
    });
  }

  it('skips after a key and restores the original input state and cursor', async () => {
    const stream = input();
    const writes: string[] = [];
    const render = vi.fn(() => 'frame');
    await playCinematicSequence(text => writes.push(text), stream, render, true, async () => { stream.emit('data', Buffer.from(' ')); });
    expect(render).toHaveBeenCalledTimes(1);
    expect(stream.setRawMode.mock.calls).toEqual([[true], [false]]);
    expect(stream.pause).toHaveBeenCalledOnce();
    expect(stream.listenerCount('data')).toBe(0);
    expect(writes.at(-1)).toContain('\x1b[?25h');
  });

  it('restores state after a render exception without disturbing existing listeners', async () => {
    const stream = input(true, true);
    const existing = vi.fn();
    stream.on('data', existing);
    const write = vi.fn();
    await expect(playCinematicSequence(write, stream, () => { throw new Error('render failed'); }, true)).rejects.toThrow('render failed');
    expect(stream.setRawMode.mock.calls).toEqual([[true], [true]]);
    expect(stream.pause).not.toHaveBeenCalled();
    expect(stream.listeners('data')).toEqual([existing]);
    expect(write.mock.calls.at(-1)?.[0]).toContain('\x1b[?25h');
  });

  it('uses a shorter optional sequence while retaining full playback', async () => {
    const delays: number[] = [];
    await playCinematicSequence(() => {}, input(), () => '', true, async ms => { delays.push(ms); });
    expect(delays.reduce((sum, ms) => sum + ms, 0)).toBeLessThan(600);
  });

  it('never starts a welcome for automation, reduced motion, or explicit disabling', () => {
    const runtime = { inputTTY: true, welcome: 'signature', capabilities: { isTTY: true, reducedMotion: false, ci: false, term: 'xterm' } };
    expect(startupWelcomeIdentity({}, runtime)).toBe('signature');
    expect(startupWelcomeIdentity({ welcome: 'off' }, runtime)).toBeNull();
    expect(startupWelcomeIdentity({ animation: false }, runtime)).toBeNull();
    expect(startupWelcomeIdentity({}, { ...runtime, inputTTY: false })).toBeNull();
    for (const capabilities of [{ isTTY: false }, { isTTY: true, ci: true }, { isTTY: true, reducedMotion: true }, { isTTY: true, term: 'dumb' }]) {
      expect(startupWelcomeIdentity({}, { ...runtime, capabilities: { ...runtime.capabilities, ...capabilities } })).toBeNull();
    }
  });
});

