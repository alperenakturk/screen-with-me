// Sound effects, generated with Web Audio (no files, like the intro sound). Two families share the same notes
// (F major, like the intro) so they sit well together: A "warm pad" for voice and room events, B "glass marimba"
// for games (owner's choice, proposal page 29 Oct 2026). Which sound plays when, and the limits: sound-policy.ts.

import { familyOf, type SoundFamily, type SoundId } from './sound-policy.ts';

type Ctx = BaseAudioContext;

/** Overall loudness at 100 % volume: under speech and the film, never on top of them. */
const MASTER = 0.55;
const F4 = 349.23;

interface Voice {
  /** Octave multiplier of the score's notes. */
  oct: number;
  note(ctx: Ctx, at: number, freq: number, len: number, level: number, out: AudioNode): void;
  click(ctx: Ctx, at: number, level: number, out: AudioNode): void;
  /** Gap between the notes of an arpeggio. */
  step: number;
}

function env(ctx: Ctx, at: number, peak: number, attack: number, decay: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  return g;
}

function osc(ctx: Ctx, type: OscillatorType, freq: number, at: number, end: number, out: AudioNode, detune = 0): void {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  o.connect(out);
  o.start(at);
  o.stop(end + 0.05);
}

let noiseCache: AudioBuffer | null = null;
function noise(ctx: Ctx): AudioBuffer {
  if (noiseCache && noiseCache.sampleRate === ctx.sampleRate) return noiseCache;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.05), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseCache = buffer;
  return buffer;
}

function tap(ctx: Ctx, at: number, level: number, band: number, out: AudioNode): void {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = band;
  filter.Q.value = 3;
  src.connect(filter).connect(env(ctx, at, level, 0.002, 0.03)).connect(out);
  src.start(at);
  src.stop(at + 0.05);
}

const FAMILIES: Record<SoundFamily, Voice> = {
  // A: two slightly detuned triangles + a soft sub, through a closing low-pass (the intro's warm pad, short).
  A: {
    oct: 1,
    step: 0.1,
    note(ctx, at, freq, len, level, out) {
      const d = len * 1.5;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 0.6;
      lp.frequency.setValueAtTime(Math.min(freq * 3, 2200), at);
      lp.frequency.exponentialRampToValueAtTime(Math.min(freq * 1.4, 1200), at + d);
      lp.connect(env(ctx, at, 0.32 * level, 0.025, d)).connect(out);
      osc(ctx, 'triangle', freq, at, at + d + 0.03, lp, -6);
      osc(ctx, 'triangle', freq, at, at + d + 0.03, lp, 6);
      const sub = ctx.createGain();
      sub.gain.value = 0.5;
      sub.connect(lp);
      osc(ctx, 'sine', freq / 2, at, at + d, sub);
    },
    click(ctx, at, level, out) {
      this.note(ctx, at, F4 * 2 ** (19 / 12), 0.04, level * 0.5, out);
    },
  },
  // B: marimba body (4th partial = the mallet's "tok") + a glassy inharmonic shimmer, each with its own decay.
  B: {
    oct: 1,
    step: 0.075,
    note(ctx, at, freq, len, level, out) {
      const partials: Array<[ratio: number, amount: number, decay: number]> = [[1, 1, 1], [4, 0.2, 0.12], [2.76, 0.12, 0.35], [9.2, 0.03, 0.04]];
      for (const [ratio, amount, decay] of partials) {
        const d = Math.max(0.03, len * decay);
        const g = env(ctx, at, 0.42 * level * amount, 0.003, d);
        g.connect(out);
        osc(ctx, 'sine', freq * ratio, at, at + d + 0.01, g);
      }
    },
    click(ctx, at, level, out) {
      tap(ctx, at, 0.5 * level, 1800, out);
      this.note(ctx, at, F4 * 4, 0.05, level * 0.5, out);
    },
  },
};

/** A small room (delay + feedback, low-passed), like the intro; only the warm family uses much of it. */
function room(ctx: Ctx, out: AudioNode, wet: number): AudioNode {
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.22;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.25;
  const send = ctx.createGain();
  send.gain.value = wet;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2400;
  delay.connect(feedback).connect(delay);
  delay.connect(send).connect(tone).connect(out);
  return delay;
}

/** Schedules one sound into `ctx` at `t0` with the given gain (0–1). Also works with an OfflineAudioContext. */
export function scheduleSound(ctx: Ctx, destination: AudioNode, id: SoundId, gain: number, t0 = ctx.currentTime + 0.02): void {
  const family = familyOf(id);
  const F = FAMILIES[family];
  const out = ctx.createGain();
  out.gain.value = gain * MASTER;
  out.connect(destination);
  out.connect(room(ctx, destination, family === 'A' ? 0.28 : 0.18));
  const hz = (semi: number) => F4 * 2 ** (semi / 12) * F.oct;
  const N = (dt: number, semi: number, len: number, level = 1) => F.note(ctx, t0 + dt, hz(semi), len, level, out);
  const C = (dt: number, level = 1) => F.click(ctx, t0 + dt, level, out);
  const s = F.step;
  switch (id) {
    case 'voiceJoin': N(0, 0, 0.25, 0.8); N(s, 7, 0.35, 0.8); break;
    case 'voiceLeave': N(0, 7, 0.25, 0.7); N(s, 0, 0.35, 0.7); break;
    case 'meJoin': N(0, 0, 0.25); N(s, 4, 0.25); N(s * 2, 7, 0.45); break;
    case 'meLeave': N(0, 7, 0.22, 0.7); N(s, 4, 0.22, 0.7); N(s * 2, 0, 0.4, 0.7); break;
    case 'micOn': N(0, 7, 0.12, 0.7); N(s * 0.8, 12, 0.2, 0.8); break;
    case 'micOff': N(0, 7, 0.12, 0.7); N(s * 0.8, 0, 0.2, 0.7); break;
    case 'pttDown': C(0, 0.5); N(0.005, 12, 0.08, 0.35); break;
    case 'pttUp': C(0, 0.4); N(0.005, 5, 0.08, 0.3); break;
    case 'roomJoin': N(0, 4, 0.3, 0.6); N(s * 1.3, 9, 0.45, 0.6); break;
    case 'chat': N(0, 16, 0.18, 0.55); break;
    case 'streamStart': [0, 4, 7, 12].forEach((n, i) => N(i * s, n, 0.3 + i * 0.05, 0.7)); break;
    case 'streamStop': N(0, 12, 0.25, 0.55); N(s * 1.4, 7, 0.4, 0.55); break;
    case 'filmTime': [0, 4, 7, 11, 14].forEach((n, i) => N(i * s * 1.4, n, 0.9, 0.6)); break;
    case 'homeCall': N(0, 7, 0.22, 0.7); N(s * 1.5, 12, 0.22, 0.7); N(s * 3, 7, 0.35, 0.6); break;
    case 'gameInvite': N(0, 0, 0.18, 0.7); N(s, 7, 0.18, 0.7); N(s * 2, 12, 0.35, 0.8); break;
    case 'place': C(0, 0.7); N(0.004, 9, 0.12, 0.6); break;
    case 'drop': [16, 12, 9].forEach((n, i) => N(i * 0.04, n, 0.05, 0.25)); N(0.13, -5, 0.22, 0.9); C(0.13, 0.6); break;
    case 'win': [0, 4, 7, 12].forEach((n, i) => N(i * s, n, 0.25, 0.8)); [4, 7, 12, 16].forEach((n) => N(s * 4.2, n, 0.8, 0.45)); break;
    case 'lose': N(0, 7, 0.3, 0.6); N(s * 1.6, 3, 0.3, 0.6); N(s * 3.2, 0, 0.6, 0.6); break;
    case 'tie': N(0, 4, 0.3, 0.6); N(s * 1.6, 4, 0.45, 0.55); break;
    case 'roundMine': N(0, 0, 0.2, 0.7); N(s, 12, 0.4, 0.8); break;
    case 'guessRight': N(0, 7, 0.2, 0.8); N(s, 12, 0.2, 0.8); N(s * 2, 16, 0.5, 0.85); break;
    case 'otherRight': N(0, 12, 0.22, 0.45); N(s, 16, 0.3, 0.4); break;
    case 'close': N(0, 9, 0.12, 0.55); N(s * 0.9, 10, 0.12, 0.5); N(s * 1.8, 9, 0.2, 0.5); break;
    case 'wrong': N(0, 2, 0.25, 0.55); N(s * 1.4, -1, 0.4, 0.5); break;
    case 'tick': C(0, 0.6); break;
    case 'podium':
      [0, 4, 7].forEach((n, i) => N(i * s * 1.3, n, 0.25, 0.75));
      N(s * 4, 12, 0.3, 0.8);
      [0, 7, 12, 16].forEach((n) => N(s * 5.4, n, 1.1, 0.4));
      break;
    case 'hint': N(0, 14, 0.12, 0.35); break;
    case 'locked': C(0, 0.45); N(0.004, 7, 0.08, 0.35); break;
    case 'guessWrong': N(0, 4, 0.1, 0.35); N(s, 2, 0.14, 0.3); break;
    case 'guessOther': N(0, 9, 0.08, 0.3); break;
    case 'snackServe': C(0, 0.35); N(0.003, 19, 0.07, 0.3); break;
    case 'snackBuy': N(0, 12, 0.08, 0.5); N(s * 0.7, 16, 0.14, 0.5); break;
    case 'snackMilestone': [12, 16, 19].forEach((n, i) => N(i * s * 0.8, n, 0.16, 0.6)); break;
    case 'gardenPlant': N(0, 0, 0.12, 0.4); N(s * 0.6, 7, 0.18, 0.35); break;
    case 'gardenWater': [19, 16, 14].forEach((n, i) => N(i * 0.05, n, 0.08, 0.3)); break;
    case 'gardenSeed': N(0, 12, 0.12, 0.5); N(s * 0.8, 19, 0.3, 0.45); break;
    case 'gardenBloom': [7, 12, 16].forEach((n, i) => N(i * s * 1.2, n, 0.4, 0.45)); break;
    case 'gardenPick': N(0, 16, 0.1, 0.45); N(s * 0.7, 12, 0.2, 0.4); break;
    case 'gardenNew': [0, 4, 7, 12, 16].forEach((n, i) => N(i * s * 0.9, n, 0.35, 0.55)); break;
    case 'seaAim': N(0, 24, 0.04, 0.25); break;
    case 'seaMiss': [19, 14, 12].forEach((n, i) => N(i * 0.035, n, 0.07, 0.3)); break;
    case 'seaHit': C(0, 0.7); N(0.01, -12, 0.3, 0.9); N(0.03, -5, 0.22, 0.5); break;
    case 'seaSunk': C(0, 0.6); N(0.01, -12, 0.4, 0.8); [7, 12, 16].forEach((n, i) => N(0.18 + i * s, n, 0.3, 0.6)); break;
    case 'snackPop': [0, 0.06, 0.11].forEach((dt, i) => C(dt, 0.6 - i * 0.08)); N(0.17, 19, 0.14, 0.5); break;
    case 'snackFizz': [24, 26, 28, 31].forEach((n, i) => N(i * 0.03, n, 0.05, 0.25)); N(0.16, 19, 0.22, 0.5); break;
    case 'snackCrunch': C(0, 0.8); C(0.05, 0.65); N(0.1, 7, 0.15, 0.5); N(0.1 + s * 0.6, 12, 0.22, 0.5); break;
    case 'snackCandy': [12, 19, 24].forEach((n, i) => N(i * s * 0.5, n, 0.1, 0.45)); break;
    case 'snackBell': N(0, 24, 0.55, 0.6); N(0.01, 31, 0.4, 0.25); break;
    case 'snackSizzle': [0, 0.03, 0.06, 0.09].forEach((dt, i) => C(dt, 0.4 - i * 0.06)); N(0.13, 4, 0.18, 0.5); N(0.13 + s, 9, 0.26, 0.5); break;
    case 'snackScoop': [7, 12, 16, 19].forEach((n, i) => N(i * s * 0.4, n, 0.09, 0.4)); break;
    case 'snackArcade': [12, 16, 19, 24, 28].forEach((n, i) => N(i * 0.05, n, 0.05, 0.4)); N(0.3, 24, 0.25, 0.5); break;
    case 'snackCinema': [0, 7, 12, 16, 19].forEach((n, i) => N(i * s, n, 0.3, 0.7)); [12, 16, 19].forEach((n) => N(s * 5.2, n, 0.9, 0.4)); break;
  }
}
