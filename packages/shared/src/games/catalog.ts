// The games hub's catalog: every in-room game with the facts the hub needs (players, the placement it opens in by
// default), and the "What's new" notes shown in the hub after a game arrives or changes. A new game = an entry here +
// its rules / server object + its mount function (apps/web/src/games/stage.ts) + i18n `games.<kind>.title/text`.

import type { RoomGameKind } from '../protocol.ts';

export interface GameInfo {
  /** Players: least and most (two-player board games seat 2, everyone else watches). */
  min: number;
  max: number;
  /** Where the game window opens by default: a free window (small games) or in the video's place (big ones). */
  place: 'float' | 'stage';
  /** The free window's size when it opens (px; shrunk to fit the screen). */
  size: readonly [number, number];
  /** The room the game's layout needs (px): a smaller window shows the game scaled down instead of cramped. */
  fit: readonly [number, number];
}

export const GAME_CATALOG: Record<RoomGameKind, GameInfo> = {
  xox: { min: 2, max: 2, place: 'stage', size: [400, 560], fit: [300, 420] },
  four: { min: 2, max: 2, place: 'stage', size: [480, 560], fit: [360, 420] },
  draw: { min: 2, max: 8, place: 'stage', size: [860, 600], fit: [640, 440] },
  quiz: { min: 2, max: 8, place: 'stage', size: [760, 540], fit: [540, 380] },
  poker: { min: 2, max: 6, place: 'stage', size: [860, 600], fit: [640, 440] },
};

/**
 * Games played on the side, alone, while the room watches (no server, no table; saves stay in the browser). They open
 * in the same game window as the room games.
 */
export const SOLO_KINDS = ['snack', 'garden', 'word'] as const;
export type SoloKind = (typeof SOLO_KINDS)[number];
export const isSoloKind = (kind: string): kind is SoloKind => (SOLO_KINDS as readonly string[]).includes(kind);

/** What a solo game may know about the room, read on my screen only (nothing is sent anywhere). */
export interface SoloRoom {
  /** The room's video is playing (an item, not paused, past the "3-2-1" hold). */
  playing: boolean;
  /** Other people in the room (by person: my other tabs and TVs left out). */
  others: number;
  /** Of them, those in voice while I am in voice too. */
  voiceOthers: number;
  /** The room's item now: its id, its length (0 = not known yet) and where the room is in it (seconds). */
  item: { id: string; duration: number; position: number } | null;
}

export const SOLO_CATALOG: Record<SoloKind, Omit<GameInfo, 'min' | 'max'>> = {
  // Design session's mock: a free window of 340 × 300 (+ the window's head and room for the room's own bar), the
  // phone sheet 360 × 460. Smaller windows scale it down (stage.ts `refit`).
  snack: { place: 'float', size: [360, 380], fit: [330, 330] },
  // The window-sill scene (340 × 226) + the action bar and the album strip; the phone sheet shows it 296 px tall.
  garden: { place: 'float', size: [360, 400], fit: [330, 350] },
  // Seven ticket rows + the letter tray.
  word: { place: 'float', size: [360, 500], fit: [320, 440] },
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
    v: '0.9.91.11',
    kinds: ['poker'],
    badge: 'updated',
    tr: 'Can Pokeri’nin yeni adı Son Kalp: “Nasıl oynanır?” rehberi, üstte sıra kimde ve kaç saniye kaldı, herkesin gördüğü hamle duyuruları, el sonucu hemen.',
    en: 'Life Poker is now Last Heart: a “How to play” guide, whose turn and the seconds left always on top, moves announced to everyone, hand results at once.',
  },
  {
    v: '0.9.91.11',
    kinds: ['draw'],
    badge: 'updated',
    tr: 'Çiz-Bil: boya kovası, 20 renk, 5 kalınlık ve geri al (Ctrl+Z).',
    en: 'Draw & Guess: a paint bucket, 20 colors, 5 sizes and undo (Ctrl+Z).',
  },
  {
    v: '0.9.91.11',
    kinds: [],
    badge: 'updated',
    tr: 'Oyunlar artık her ekrana sığıyor, hiçbir yerde kaydırma yok; serbest pencere orantılı büyüyüp küçülüyor. Oda emojileri oyunun üstünde de uçuyor.',
    en: 'Games now fit any screen with no scrolling; the free window grows and shrinks in proportion. Room emojis fly over the game too.',
  },
  {
    v: '0.9.91.10',
    kinds: [],
    badge: 'updated',
    tr: 'Serbest oyun penceresi: sayfanın her yerine sürükle, köşesinden boyutlandır. Her oyun kendi boyutunda açılır, küçültünce sıkışmaz; tam ekranda da yanında gelir.',
    en: 'Free game window: drag it anywhere on the page and resize it from its corner. Each game opens at its own size and scales down instead of getting squeezed; it comes along into fullscreen too.',
  },
  {
    v: '0.9.91.9',
    kinds: ['xox', 'four'],
    badge: 'updated',
    tr: 'XOX ve Dört Taş yenilendi: işaretler çizilerek beliriyor, sıra sendeyken taşının ya da işaretinin önizlemesi görünüyor.',
    en: 'Tic-tac-toe and Four in a Row got a new look: marks draw in, and you see a preview of your mark or disc on your turn.',
  },
  {
    v: '0.9.91.8',
    kinds: ['poker'],
    badge: 'new',
    tr: 'Yeni oyun: Can Pokeri. Para yerine can: herkes %100 canla başlar. Özel hamleler: bir oyuncuyu elden çıkar, bedelsiz çekil, kalkan, göz at. Jokerli ya da jokersiz.',
    en: 'New game: Life Poker. Life instead of chips: everyone starts at 100 %. Special moves: disqualify a player, fold for free, shield, peek. With or without jokers.',
  },
  {
    v: '0.9.91.8',
    kinds: [],
    badge: 'updated',
    tr: 'Oyun salonu: aynı anda 4 masaya kadar oyun, masalar arasında serbestçe geç. Oyun artık videonun yanında, üstünde küçük bir pencerede ya da yerinde açılabilir (başlıktaki düğmeler).',
    en: 'Game hall: up to 4 tables at once, move freely between them. A game can now sit next to the video, in a small window over it, or in its place (the buttons in its head).',
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
