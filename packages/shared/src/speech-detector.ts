// Tells real speech apart from short noises (a mouse click, a cough, a bump on the desk) in voice chat levels.
// Used to lower the film's volume only while someone is actually talking: a single loud sample must not do it.

export interface SpeechDetectorOptions {
  /** Level (0–1, see LevelMeter) above which a sample counts as loud. */
  threshold: number;
  /** How many loud samples are needed inside `window` ms to start "talking". */
  minLoud: number;
  /** Sliding window in ms. */
  window: number;
  /** Once talking, keep talking this long after the last loud sample (pauses between words). */
  hold: number;
}

export const SPEECH_DEFAULTS: SpeechDetectorOptions = { threshold: 0.06, minLoud: 4, window: 800, hold: 1200 };

export class SpeechDetector {
  private readonly loud = new Map<string, number[]>();
  private readonly talkingSince = new Map<string, number>();
  private readonly lastLoud = new Map<string, number>();

  constructor(private readonly options: SpeechDetectorOptions = SPEECH_DEFAULTS) {}

  /** Feed one level sample of a person (call regularly, e.g. every 100 ms). */
  push(key: string, level: number, now: number): void {
    const { threshold, minLoud, window } = this.options;
    const times = (this.loud.get(key) ?? []).filter((at) => now - at < window);
    if (level > threshold) {
      times.push(now);
      this.lastLoud.set(key, now);
    }
    this.loud.set(key, times);
    if (times.length >= minLoud && !this.talkingSince.has(key)) this.talkingSince.set(key, now);
  }

  /** Is this person talking right now? */
  talking(key: string, now: number): boolean {
    if (!this.talkingSince.has(key)) return false;
    if (now - (this.lastLoud.get(key) ?? 0) < this.options.hold) return true;
    this.talkingSince.delete(key);
    return false;
  }

  /** Is anyone talking? */
  anyone(now: number): boolean {
    let any = false;
    for (const key of [...this.talkingSince.keys()]) if (this.talking(key, now)) any = true;
    return any;
  }

  /** Forget a person (left voice). */
  forget(key: string): void {
    this.loud.delete(key);
    this.talkingSince.delete(key);
    this.lastLoud.delete(key);
  }
}
