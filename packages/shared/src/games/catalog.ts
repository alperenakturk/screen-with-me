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
  /**
   * Card GW (owner: "the min and max sizes must be clear"): the free window's smallest and largest size (px, head and
   * border included). Smallest = the least window where the game still shows at its own scale (every text ≥ 13 px,
   * nothing cut, nothing scrolling), measured in English and Turkish by `scripts/harness/games-sweep/probe-min.cjs`
   * plus 3 %; largest = where growing stops helping (the game is shown bigger in proportion up to there). The window keeps `size`'s
   * shape, so the grip stops at whichever side reaches its limit first; a screen smaller than `minSize` gets the whole
   * screen (the game then scales down to fit it).
   */
  minSize: readonly [number, number];
  maxSize: readonly [number, number];
  /**
   * Card PROP (owner: "the same experience in both modes"): the shape the game is laid out at in the video's place, a
   * wide, short box (px, head and border included, like `size`). The game window picks this shape or `size`, whichever
   * shows the game bigger in the box, and scales it to the box; the game's CSS reflows for it
   * (`@container game (min-aspect-ratio: 16 / 10)`).
   */
  wide?: readonly [number, number];
}

// Card CL2 (owner): every game opens in the free mini window by default, at the size its own layout wants; "in the
// video's place" stays a choice, remembered per game (`gamePlace:<kind>`).
export const GAME_CATALOG: Record<RoomGameKind, GameInfo> = {
  xox: { min: 2, max: 2, place: 'float', size: [420, 560], fit: [300, 420], minSize: [540, 620], maxSize: [672, 896], wide: [820, 440] },
  four: { min: 2, max: 2, place: 'float', size: [520, 590], fit: [360, 440], minSize: [543, 620], maxSize: [832, 944], wide: [820, 440] },
  draw: { min: 2, max: 8, place: 'float', size: [860, 600], fit: [640, 440], minSize: [789, 550], maxSize: [1204, 840], wide: [820, 440] },
  quiz: { min: 2, max: 8, place: 'float', size: [680, 640], fit: [520, 440], minSize: [625, 588], maxSize: [952, 896], wide: [820, 440] },
  poker: { min: 2, max: 6, place: 'float', size: [860, 600], fit: [640, 440], minSize: [728, 507], maxSize: [1204, 840], wide: [880, 480] },
  // 🎲 Classics (P6): two players, or one against Stub. Its window follows the board on the table (`CLASSICS_SIZES`).
  classics: { min: 1, max: 2, place: 'float', size: [600, 560], fit: [480, 440], minSize: [581, 543], maxSize: [960, 896], wide: [820, 440] },
  // 🚢 Sea Battle: two seas side by side on a computer (one at a time in a narrow window), or one player against Stub.
  sea: { min: 1, max: 2, place: 'float', size: [780, 560], fit: [600, 440], minSize: [764, 548], maxSize: [1170, 840], wide: [820, 440] },
  // ⚔️ Five Frames Duel (FFDUEL): my board and the other's marks side by side, the letter tray under them.
  duel: { min: 2, max: 2, place: 'float', size: [600, 660], fit: [540, 600], minSize: [600, 660], maxSize: [900, 990], wide: [860, 470] },
};

/** Classics (CL2): the window's size per screen of the table: the picker, then each board built around itself. */
export const CLASSICS_SIZES: Record<'picker' | 'xox' | 'four' | 'dama' | 'chess' | 'backgammon' | 'reversi', Pick<GameInfo, 'size' | 'fit' | 'minSize' | 'maxSize' | 'wide'>> = {
  picker: { size: [600, 560], fit: [480, 440], minSize: [581, 543], maxSize: [960, 896], wide: [820, 440] },
  xox: { size: [540, 620], fit: [320, 460], minSize: [540, 620], maxSize: [864, 992], wide: [820, 440] },
  four: { size: [560, 640], fit: [380, 480], minSize: [543, 620], maxSize: [896, 1024], wide: [820, 440] },
  dama: { size: [540, 720], fit: [380, 540], minSize: [507, 676], maxSize: [864, 1152], wide: [820, 440] },
  chess: { size: [540, 720], fit: [380, 540], minSize: [507, 676], maxSize: [864, 1152], wide: [820, 440] },
  backgammon: { size: [720, 660], fit: [560, 500], minSize: [631, 578], maxSize: [1080, 990], wide: [820, 440] },
  reversi: { size: [540, 720], fit: [380, 540], minSize: [507, 676], maxSize: [864, 1152], wide: [820, 440] },
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
  snack: { place: 'float', size: [400, 575], fit: [380, 520], minSize: [400, 575], maxSize: [600, 862], wide: [900, 480] },
  garden: { place: 'float', size: [400, 555], fit: [380, 500], minSize: [400, 555], maxSize: [600, 832], wide: [900, 480] },
  word: { place: 'float', size: [400, 635], fit: [380, 580], minSize: [400, 635], maxSize: [600, 952], wide: [820, 440] },
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
    v: '0.9.97.106',
    kinds: ['classics', 'sea', 'draw', 'quiz', 'poker', 'duel'],
    badge: 'updated',
    tr: 'Masaların yeni maskotu Stub: hakem, rakip ve kazanınca seninle sevinen bilet. Her masanın kendi rozeti; taşlar artık kayarak gidiyor.',
    en: 'Stub, the ticket, is the tables’ new mascot: the referee, the opponent, and the one who cheers your win. Every table has its own badge; pieces now slide.',
  },
  {
    v: '0.9.97.103',
    kinds: ['duel', 'sea'],
    badge: 'updated',
    tr: 'Beş Kare Düellosu’nda üç oyunluk maç ve zor mod (bulunan harfler tekrar kullanılmalı). Telefonda Amiral Battı: ilk dokunuş yakınlaştırır, ikincisi ateşler.',
    en: 'Five Frames Duel: best of three and hard mode (letters you found must be used again). Sea Battle on a phone: the first tap zooms in, the second fires.',
  },
  {
    v: '0.9.97.99',
    kinds: ['duel'],
    badge: 'new',
    tr: 'Yeni: ⚔️ Beş Kare Düellosu. Aynı beş harfli kelimeyi bir arkadaşından önce bul: onun işaretlerini görürsün, harflerini asla.',
    en: 'New: ⚔️ Five Frames Duel. Race a friend to the same five-letter word: you see their marks, never their letters.',
  },
  {
    v: '0.9.97.65',
    kinds: ['classics'],
    badge: 'updated',
    tr: 'Klasiklere ⚫ Reversi geldi: karşı rengin sırasını kapat, taşları çevir. Bir arkadaşla ya da Stub’a karşı.',
    en: 'Reversi ⚫ joins the Classics: close a line of the other colour and turn it over. With a friend, or against Stub.',
  },
  {
    v: '0.9.97.61',
    kinds: ['sea'],
    badge: 'new',
    tr: 'Yeni: 🚢 Amiral Battı. Filonu gizle, sırayla atış yap, onunkini önce batır. Bir arkadaşla ya da Stub’a karşı (kolay / orta).',
    en: 'New: 🚢 Sea Battle. Hide your fleet, call shots in turns, sink theirs first. With a friend, or against Stub (easy / medium).',
  },
  {
    v: '0.9.97.46',
    kinds: ['classics'],
    badge: 'updated',
    tr: 'Klasiklere satranç ve tavla geldi. Yalnızsan Stub’a karşı oyna.',
    en: 'Chess and backgammon join the Classics. Alone? Play Stub.',
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
    tr: 'Yeni: 🎲 Klasikler. XOX, Dört Taş ve yeni dama tek masada, raftan seç. Yalnızsan Stub’a karşı oyna (kolay / orta); Stub hakemlik de yapıyor.',
    en: 'New: 🎲 Classics. Tic-tac-toe, Four in a Row and the new dama at one table, picked from a shelf. Alone? Play Stub (easy / medium); it referees too.',
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
