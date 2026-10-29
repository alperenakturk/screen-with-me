// The site's sound effects player: one shared AudioContext, the user's settings (Settings → My screen:
// `opt:sounds`, `opt:soundVolume`) and the storm limits. What each sound is: @swm/shared/sounds; when it may play:
// @swm/shared/sound-policy. Runs in the room view on the film page too (the site is the overlay there).

import { SOUND_DEFAULT_ON, SoundLimiter, parseVolume, soundGain, type SoundId } from '@swm/shared/sound-policy';
import { scheduleSound } from '@swm/shared/sounds';
import { load, save } from './storage.ts';

let ctx: AudioContext | null = null;
let output: AudioNode | null = null;
let gestured = false;
let filmPlaying: () => boolean = () => false;
const limiter = new SoundLimiter();

/** Browsers only allow sound after the person has interacted with the page; until then sounds are skipped. */
function hasActivation(): boolean {
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return gestured || activation?.hasBeenActive === true;
}

function context(): AudioContext | null {
  if (!ctx) {
    if (!hasActivation()) return null;
    const AC: typeof AudioContext | undefined =
      globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      // A gentle limiter so overlapping sounds never clip.
      const limit = ctx.createDynamicsCompressor();
      limit.threshold.value = -18;
      limit.ratio.value = 4;
      limit.connect(ctx.destination);
      output = limit;
    } catch {
      return null;
    }
  }
  return ctx;
}

for (const type of ['pointerdown', 'keydown'] as const) {
  addEventListener(
    type,
    () => {
      gestured = true;
      if (ctx?.state === 'suspended') void ctx.resume().catch(() => {});
    },
    { capture: true },
  );
}

export function soundsOn(): boolean {
  const stored = load('opt:sounds');
  return stored === null ? SOUND_DEFAULT_ON : stored !== '0';
}

export function soundVolume(): number {
  return parseVolume(load('opt:soundVolume'));
}

export function setSoundsOn(on: boolean): void {
  save('opt:sounds', on ? '1' : '0');
}

export function setSoundVolume(volume: number): void {
  save('opt:soundVolume', String(parseVolume(String(volume))));
}

/** Room sounds are softer while the film plays (room.ts tells us). */
export function setFilmPlaying(check: () => boolean): void {
  filmPlaying = check;
}

/** Plays a sound effect if the settings, the browser and the storm limits allow it. Never queued for later. */
export function playSound(id: SoundId): void {
  const gain = soundGain(id, { on: soundsOn(), volume: soundVolume(), filmPlaying: filmPlaying() });
  if (gain <= 0) return;
  const audio = context();
  if (!audio || !output || !limiter.allow(id, performance.now())) return;
  const out = output;
  const start = () => {
    try {
      scheduleSound(audio, out, id, gain);
    } catch {
      // An old browser without some node: no sound.
    }
    // For tests (scripts/harness/sound): which sound really played.
    dispatchEvent(new CustomEvent('swm-sound', { detail: id }));
  };
  if (audio.state === 'running') return start();
  // Suspended: try once; a sound that comes late feels odd, so give up after 300 ms.
  const asked = performance.now();
  void audio.resume().then(() => {
    if (performance.now() - asked < 300) start();
  }, () => {});
}

/** The volume slider's preview: plays even right after the limiter let the same sound through. */
export function previewSound(): void {
  const audio = context();
  if (!audio || !output || !soundsOn()) return;
  const out = output;
  void audio.resume().then(() => scheduleSound(audio, out, 'voiceJoin', soundGain('voiceJoin', { on: true, volume: soundVolume(), filmPlaying: false })), () => {});
}
