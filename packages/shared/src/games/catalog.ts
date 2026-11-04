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

// Card CL2 (owner): every game opens in the free mini window by default, at the size its own layout wants; "in the
// video's place" stays a choice, remembered per game (`gamePlace:<kind>`).
export const GAME_CATALOG: Record<RoomGameKind, GameInfo> = {
  xox: { min: 2, max: 2, place: 'float', size: [420, 560], fit: [300, 420] },
  four: { min: 2, max: 2, place: 'float', size: [520, 590], fit: [360, 440] },
  draw: { min: 2, max: 8, place: 'float', size: [860, 600], fit: [640, 440] },
  quiz: { min: 2, max: 8, place: 'float', size: [680, 560], fit: [520, 400] },
  poker: { min: 2, max: 6, place: 'float', size: [860, 600], fit: [640, 440] },
  // 🎲 Classics (P6): two players, or one against Glowbeam. Its window follows the board on the table (`CLASSICS_SIZES`).
  classics: { min: 1, max: 2, place: 'float', size: [600, 560], fit: [480, 440] },
};

/** Classics (CL2): the window's size per screen of the table: the picker, then each board built around itself. */
export const CLASSICS_SIZES: Record<'picker' | 'xox' | 'four' | 'dama' | 'chess' | 'backgammon', Pick<GameInfo, 'size' | 'fit'>> = {
  picker: { size: [600, 560], fit: [480, 440] },
  xox: { size: [420, 580], fit: [300, 440] },
  four: { size: [520, 600], fit: [360, 460] },
  dama: { size: [520, 700], fit: [380, 540] },
  chess: { size: [520, 700], fit: [380, 540] },
  backgammon: { size: [720, 660], fit: [560, 500] },
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
  /** The room's item now: its id, its length (0 = not known yet), where the room is in it (seconds), its title. */
  item: { id: string; duration: number; position: number; title?: string } | null;
  /** Others' names (Window Garden's memories keep them in this browser only). */
  names?: string[];
  /** Others in the room, by member id (Window Garden gives them cuttings). */
  people?: { id: string; name: string }[];
  /** The room's tip jar: how full, its size, and whether its +10 % is on for this film. */
  tipJar?: { fill: number; size: number; boost: boolean } | null;
  /** A Snack Bar serve puts a coin in the room's tip jar. */
  tip?: () => void;
  /** Sends a cutting to someone in the room; false when the room connection is down. */
  gift?: (to: string, plant: string) => boolean;
}

export const SOLO_CATALOG: Record<SoloKind, Omit<GameInfo, 'min' | 'max'>> = {
  // Card GP (Design's `side-games-polish.md` §2): each opens at the size its content needs, so its scale (`--fit`) is 1
  // at 1366 × 768 and the text never shrinks below 13 px (the window is the fit + its 55 px head and border); smaller windows scale it down (stage.ts `refit`).
  snack: { place: 'float', size: [400, 575], fit: [380, 520] },
  garden: { place: 'float', size: [400, 555], fit: [380, 500] },
  word: { place: 'float', size: [400, 635], fit: [380, 580] },
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
    v: '0.9.97.46',
    kinds: ['classics'],
    badge: 'updated',
    tr: 'Klasiklere satranç ve tavla geldi. Yalnızsan Glowbeam’e karşı oyna.',
    en: 'Chess and backgammon join the Classics. Alone? Play Glowbeam.',
  },
  {
    v: '0.9.97.40',
    kinds: ['draw'],
    badge: 'updated',
    tr: 'Çiz-Bil’de 12 kelime kategorisi: masayı açan birini (ya da hepsini) seçer. Yeni 🧽 silgi ve “yinele” (Ctrl+Y).',
    en: 'Draw & Guess has 12 word categories: the table’s host picks one (or all). A new 🧽 eraser and redo (Ctrl+Y).',
  },
  {
    v: '0.9.97.35',
    kinds: ['classics'],
    badge: 'new',
    tr: 'Yeni: 🎲 Klasikler. XOX, Dört Taş ve yeni dama tek masada, raftan seç. Yalnızsan Glowbeam’e karşı oyna (kolay / orta); Glowbeam hakemlik de yapıyor.',
    en: 'New: 🎲 Classics. Tic-tac-toe, Four in a Row and the new dama at one table, picked from a shelf. Alone? Play Glowbeam (easy / medium); it referees too.',
  },
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
