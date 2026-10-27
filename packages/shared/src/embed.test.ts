import { describe, expect, it } from 'vitest';
import { isForwardedKey, isRelayable } from './embed.ts';

describe('embed relay rules', () => {
  it('only lets playback messages through from the frame', () => {
    expect(isRelayable({ t: 'pause', position: 1, at: 2 })).toBe(true);
    expect(isRelayable({ t: 'ready', ready: false })).toBe(true);
    expect(isRelayable({ t: 'chat', text: 'hi' })).toBe(false);
    expect(isRelayable({ t: 'kick', id: 'x' })).toBe(false);
    expect(isRelayable({ t: 'load', media: { kind: 'page', url: 'https://a.example' } })).toBe(false);
  });

  it('forwards only our shortcut keys', () => {
    expect(['1', '8', 'Enter', 'p', 'P', 'v', 'V'].every(isForwardedKey)).toBe(true);
    expect(['9', ' ', 'k', 'f', 'ArrowLeft'].some(isForwardedKey)).toBe(false);
  });
});
