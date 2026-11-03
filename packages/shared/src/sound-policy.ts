// Which sound effects exist and when they may play (pure: no Web Audio, unit tested). The synthesis lives in
// sounds.ts. Owner's choice (29 Oct 2026): voice and room events use family A (warm pad, like the intro sound),
// games use family B (glass marimba). See CLAUDE.md "Sound effects".

export type SoundFamily = 'A' | 'B';
export type SoundGroup = 'voice' | 'room' | 'game';

export interface SoundSpec {
  group: SoundGroup;
  /** Relative loudness (0–1) on top of the user's volume. */
  level: number;
  /** The same sound plays at most once in this many ms (a burst of joins = one sound). */
  gap: number;
  /** Played at half volume while the film plays (room events; never game or microphone sounds). */
  softDuringFilm?: boolean;
}

export const SOUNDS = {
  // Voice (others only while I'm in voice; mine confirm something invisible: connection, microphone).
  voiceJoin: { group: 'voice', level: 0.9, gap: 3000, softDuringFilm: true },
  voiceLeave: { group: 'voice', level: 0.8, gap: 3000, softDuringFilm: true },
  meJoin: { group: 'voice', level: 0.9, gap: 1000 },
  meLeave: { group: 'voice', level: 0.8, gap: 1000 },
  micOn: { group: 'voice', level: 0.8, gap: 150 },
  micOff: { group: 'voice', level: 0.8, gap: 150 },
  pttDown: { group: 'voice', level: 0.6, gap: 80 },
  pttUp: { group: 'voice', level: 0.55, gap: 80 },
  // Room.
  roomJoin: { group: 'room', level: 0.75, gap: 3000, softDuringFilm: true },
  chat: { group: 'room', level: 0.7, gap: 4000, softDuringFilm: true },
  streamStart: { group: 'room', level: 0.85, gap: 3000, softDuringFilm: true },
  streamStop: { group: 'room', level: 0.7, gap: 3000, softDuringFilm: true },
  filmTime: { group: 'room', level: 0.9, gap: 10_000, softDuringFilm: true },
  homeCall: { group: 'room', level: 0.85, gap: 3000, softDuringFilm: true },
  gameInvite: { group: 'room', level: 0.85, gap: 3000, softDuringFilm: true },
  // Games: XOX and Connect Four.
  place: { group: 'game', level: 0.8, gap: 60 },
  drop: { group: 'game', level: 0.8, gap: 60 },
  win: { group: 'game', level: 1, gap: 1000 },
  lose: { group: 'game', level: 0.85, gap: 1000 },
  tie: { group: 'game', level: 0.85, gap: 1000 },
  // Games: Draw & Guess and Quiz.
  roundMine: { group: 'game', level: 0.85, gap: 1000 },
  guessRight: { group: 'game', level: 1, gap: 500 },
  otherRight: { group: 'game', level: 0.6, gap: 700 },
  close: { group: 'game', level: 0.7, gap: 500 },
  wrong: { group: 'game', level: 0.75, gap: 500 },
  tick: { group: 'game', level: 0.6, gap: 700 },
  podium: { group: 'game', level: 1, gap: 3000 },
  // Quiet ones the owner added: hint letter, my quiz answer locked, a wrong Draw & Guess guess (others' quieter).
  hint: { group: 'game', level: 0.45, gap: 1000 },
  locked: { group: 'game', level: 0.5, gap: 300 },
  guessWrong: { group: 'game', level: 0.45, gap: 300 },
  guessOther: { group: 'game', level: 0.25, gap: 2000 },
  // Snack Bar (solo, on the side): soft and short, a tap never hides the film's sound.
  snackServe: { group: 'game', level: 0.3, gap: 90 },
  snackBuy: { group: 'game', level: 0.5, gap: 120 },
  snackMilestone: { group: 'game', level: 0.65, gap: 600 },
  snackCinema: { group: 'game', level: 0.8, gap: 3000 },
} as const satisfies Record<string, SoundSpec>;

export type SoundId = keyof typeof SOUNDS;

export const FAMILY_OF_GROUP: Record<SoundGroup, SoundFamily> = { voice: 'A', room: 'A', game: 'B' };

export function familyOf(id: SoundId): SoundFamily {
  return FAMILY_OF_GROUP[SOUNDS[id].group];
}

/** Defaults of the Settings → My screen controls (`opt:sounds`, `opt:soundVolume`). */
export const SOUND_DEFAULT_ON = true;
export const SOUND_DEFAULT_VOLUME = 70;
/** Room sounds while the film plays. */
export const FILM_SOFTEN = 0.5;
/** At most this many room / voice sounds in `BURST_WINDOW_MS`. */
export const BURST_MAX = 4;
export const BURST_WINDOW_MS = 2000;

/** Parses the stored volume (0–100); anything odd falls back to the default. */
export function parseVolume(stored: string | null | undefined): number {
  if (stored === null || stored === undefined || stored === '') return SOUND_DEFAULT_VOLUME;
  const n = Number(stored);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : SOUND_DEFAULT_VOLUME;
}

/** Final gain (0–1) of one sound, or 0 when it must not play. */
export function soundGain(id: SoundId, o: { on: boolean; volume: number; filmPlaying: boolean }): number {
  if (!o.on || o.volume <= 0) return 0;
  const spec: SoundSpec = SOUNDS[id];
  return (o.volume / 100) * spec.level * (spec.softDuringFilm && o.filmPlaying ? FILM_SOFTEN : 1);
}

/**
 * Storm protection: the same sound at most once per its `gap`, and at most `BURST_MAX` room / voice sounds per
 * `BURST_WINDOW_MS` (six people joining at once = one sound; game sounds follow the game's own pace). Dropped sounds are never queued for later.
 */
export class SoundLimiter {
  private readonly last = new Map<SoundId, number>();
  private recent: number[] = [];

  allow(id: SoundId, now: number): boolean {
    const last = this.last.get(id);
    if (last !== undefined && now - last < SOUNDS[id].gap) return false;
    // Game sounds answer my own play (pieces, results): only room and voice notifications count for the burst.
    const notice = SOUNDS[id].group !== 'game';
    this.recent = this.recent.filter((at) => now - at < BURST_WINDOW_MS);
    if (notice && this.recent.length >= BURST_MAX) return false;
    this.last.set(id, now);
    if (notice) this.recent.push(now);
    return true;
  }
}

/** A person's key for "the same person again" (a reload or a second tab has a new member id). */
export function personKey(m: { name: string; avatar?: string | null }): string {
  return `${m.name}\u0000${m.avatar ?? ''}`;
}

/**
 * "Someone joined the room" without false alarms: a person (name + avatar) who left within `REJOIN_MS` (page
 * reload, reconnect, moving between the site and the film page) or who is already here with another connection
 * does not count.
 */
export class JoinFilter {
  static readonly REJOIN_MS = 30_000;
  /** Person key → when they were last in the room. */
  private readonly seen = new Map<string, number>();
  private current = new Map<string, string>();

  /** Call with every member list; returns how many really new people arrived (others than me). */
  update(members: ReadonlyArray<{ id: string; name: string; avatar?: string | null }>, myId: string | null, now: number): number {
    const next = new Map(members.map((m) => [m.id, personKey(m)]));
    // Whoever was here until now (also those who just left) was seen now.
    for (const key of this.current.values()) this.seen.set(key, now);
    const present = new Set<string>();
    for (const [id, key] of next) if (this.current.has(id)) present.add(key);
    let fresh = 0;
    for (const [id, key] of next) {
      if (id === myId || this.current.has(id)) continue;
      const lastSeen = this.seen.get(key);
      if (!present.has(key) && (lastSeen === undefined || now - lastSeen > JoinFilter.REJOIN_MS)) fresh++;
      present.add(key);
    }
    this.current = next;
    return fresh;
  }

  /** The first list (welcome): remembered, nobody counts as an arrival. */
  seed(members: ReadonlyArray<{ id: string; name: string; avatar?: string | null }>): void {
    this.current = new Map(members.map((m) => [m.id, personKey(m)]));
  }
}
