import { describe, expect, it } from 'vitest';
import { applyAction, expectedPosition, initialState, parseClientMessage, type PlaybackState } from './protocol.ts';

const playing: PlaybackState = {
  media: { kind: 'youtube', id: 'dQw4w9WgXcQ' },
  paused: false,
  position: 10,
  rate: 1,
  updatedAt: 1_000_000,
};

describe('expectedPosition', () => {
  it('advances while playing, scaled by rate', () => {
    expect(expectedPosition(playing, 1_002_000)).toBe(12);
    expect(expectedPosition({ ...playing, rate: 2 }, 1_002_000)).toBe(14);
  });

  it('stays put while paused', () => {
    expect(expectedPosition({ ...playing, paused: true }, 1_009_000)).toBe(10);
  });
});

describe('applyAction', () => {
  const now = 2_000_000;

  it('loading a video resets to paused at 0 and keeps the speed', () => {
    const next = applyAction({ ...playing, rate: 1.5 }, { t: 'load', media: { kind: 'html5', url: 'https://x.dev/a.mp4' } }, now);
    expect(next).toEqual({ media: { kind: 'html5', url: 'https://x.dev/a.mp4' }, paused: true, position: 0, rate: 1.5, updatedAt: now });
  });

  it('uses the client timestamp, but only up to 2s in the past', () => {
    expect(applyAction(playing, { t: 'pause', position: 20, at: now - 150 }, now).updatedAt).toBe(now - 150);
    expect(applyAction(playing, { t: 'pause', position: 20, at: now - 60_000 }, now).updatedAt).toBe(now - 2000);
    expect(applyAction(playing, { t: 'pause', position: 20, at: now + 60_000 }, now).updatedAt).toBe(now);
  });

  it('applies play, pause, seek and rate', () => {
    expect(applyAction({ ...playing, paused: true }, { t: 'play', position: 5, at: now }, now)).toMatchObject({ paused: false, position: 5 });
    expect(applyAction(playing, { t: 'pause', position: 7, at: now }, now)).toMatchObject({ paused: true, position: 7 });
    expect(applyAction(playing, { t: 'seek', position: 99, at: now }, now)).toMatchObject({ paused: false, position: 99 });
    expect(applyAction(playing, { t: 'rate', rate: 2, position: 11, at: now }, now)).toMatchObject({ rate: 2, position: 11 });
  });
});

describe('parseClientMessage', () => {
  it('accepts valid messages and cleans names', () => {
    expect(parseClientMessage(JSON.stringify({ t: 'hello', v: 1, name: '  Ali   Veli ' }))).toEqual({ t: 'hello', v: 1, name: 'Ali Veli' });
    expect(parseClientMessage(JSON.stringify({ t: 'seek', position: 3.5, at: 123 }))).toEqual({ t: 'seek', position: 3.5, at: 123 });
  });

  it.each([
    'not json',
    '[]',
    JSON.stringify({ t: 'hello', v: 1, name: '   ' }),
    JSON.stringify({ t: 'seek', position: -1, at: 1 }),
    JSON.stringify({ t: 'seek', position: Number.MAX_VALUE, at: 1 }),
    JSON.stringify({ t: 'rate', rate: 16, position: 1, at: 1 }),
    JSON.stringify({ t: 'load', media: { kind: 'youtube', id: '<script>' } }),
    JSON.stringify({ t: 'load', media: { kind: 'html5', url: 'javascript:alert(1)' } }),
    JSON.stringify({ t: 'nuke' }),
    JSON.stringify({ t: 'hello', v: 1, name: 'x'.repeat(5000) }),
  ])('rejects %s', (raw) => {
    expect(parseClientMessage(raw)).toBeNull();
  });

  it('truncates long names', () => {
    const message = parseClientMessage(JSON.stringify({ t: 'hello', v: 1, name: 'x'.repeat(100) }));
    expect(message).toEqual({ t: 'hello', v: 1, name: 'x'.repeat(32) });
  });
});

describe('initialState', () => {
  it('starts empty and paused', () => {
    expect(initialState(5)).toEqual({ media: null, paused: true, position: 0, rate: 1, updatedAt: 5 });
  });
});
