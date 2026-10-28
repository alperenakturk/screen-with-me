import { describe, expect, it } from 'vitest';
import { SpeechDetector } from './speech-detector.ts';

/** Feeds `levels` as samples 100 ms apart starting at `start`; returns the time after the last sample. */
function feed(detector: SpeechDetector, key: string, levels: number[], start = 0): number {
  let now = start;
  for (const level of levels) {
    detector.push(key, level, now);
    now += 100;
  }
  return now;
}

describe('SpeechDetector', () => {
  it('ignores a single click', () => {
    const d = new SpeechDetector();
    const now = feed(d, 'a', [0, 0, 0.9, 0, 0, 0, 0]);
    expect(d.anyone(now)).toBe(false);
  });

  it('ignores two short knocks', () => {
    const d = new SpeechDetector();
    const now = feed(d, 'a', [0.5, 0, 0, 0, 0.5, 0, 0, 0, 0, 0]);
    expect(d.anyone(now)).toBe(false);
  });

  it('detects sustained speech', () => {
    const d = new SpeechDetector();
    const now = feed(d, 'a', [0.2, 0.3, 0.1, 0.25, 0.2]);
    expect(d.talking('a', now)).toBe(true);
  });

  it('holds through pauses between words, then stops', () => {
    const d = new SpeechDetector();
    let now = feed(d, 'a', [0.2, 0.3, 0.1, 0.25]);
    now = feed(d, 'a', [0, 0, 0, 0, 0], now);
    expect(d.anyone(now)).toBe(true);
    now = feed(d, 'a', new Array(10).fill(0), now);
    expect(d.anyone(now)).toBe(false);
  });

  it('keeps people separate', () => {
    const d = new SpeechDetector();
    feed(d, 'a', [0.9]);
    feed(d, 'b', [0.9, 0, 0]);
    expect(d.anyone(300)).toBe(false);
  });
});
