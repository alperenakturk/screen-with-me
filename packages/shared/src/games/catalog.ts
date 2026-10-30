// The games hub's catalog: every in-room game with the facts the hub needs (players, the placement it opens in by
// default), and the "What's new" notes shown in the hub after a game arrives or changes. A new game = an entry here +
// its rules / server object + its mount function (apps/web/src/games/stage.ts) + i18n `games.<kind>.title/text`.

import type { RoomGameKind } from '../protocol.ts';

export interface GameInfo {
  /** Players: least and most (two-player board games seat 2, everyone else watches). */
  min: number;
  max: number;
  /** Where the game window opens by default: next to the video (small games) or in its place (big ones). */
  place: 'side' | 'stage';
}

export const GAME_CATALOG: Record<RoomGameKind, GameInfo> = {
  xox: { min: 2, max: 2, place: 'side' },
  four: { min: 2, max: 2, place: 'side' },
  draw: { min: 2, max: 8, place: 'stage' },
  quiz: { min: 2, max: 8, place: 'stage' },
};

export interface GameNews {
  /** The release that brought it. */
  v: string;
  kinds: RoomGameKind[];
  /** `new`: a new game; `updated`: an existing one changed. */
  badge: 'new' | 'updated';
  tr: string;
  en: string;
}

/** Newest first. Add one line per release that changes games. */
export const GAME_NEWS: readonly GameNews[] = [
  {
    v: '0.9.91.7',
    kinds: [],
    badge: 'updated',
    tr: 'Oyun salonu: aynı anda 4 masaya kadar oyun. İki kişi XOX oynarken diğerleri Bilgi yarışmasında olabilir; masalar arasında serbestçe geç.',
    en: 'Game hall: up to 4 tables at once. Two can play tic-tac-toe while others are in a quiz; move freely between tables.',
  },
  {
    v: '0.9.91.6',
    kinds: ['quiz'],
    badge: 'updated',
    tr: 'Bilgi yarışması: 11 konuda 400’den çok soru, herkese bir 50:50 jokeri, dili ve uzunluğu açan seçer.',
    en: 'Quiz: over 400 questions in 11 topics, a 50:50 joker for everyone, the opener picks language and length.',
  },
  {
    v: '0.9.91.6',
    kinds: ['draw'],
    badge: 'updated',
    tr: 'Çiz-Bil: dili ve tur sayısını açan seçer, ilk bilen daha çok kazanır, sonunda kürsü.',
    en: 'Draw & Guess: the opener picks language and rounds, the first guess wins more, a podium at the end.',
  },
];

/** Compares dotted versions ("0.9.91.6" < "0.9.91.10"). */
export function compareVersions(a: string, b: string): number {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Notes newer than what this person saw (`null`: never opened the hub → the latest few). */
export function unseenNews(seen: string | null, limit = 3): GameNews[] {
  return GAME_NEWS.filter((n) => seen === null || compareVersions(n.v, seen) > 0).slice(0, limit);
}

/** The newest note's version (what "seen" is set to). */
export const LATEST_NEWS = GAME_NEWS[0]?.v ?? '0';
