// Oda içi oyunların (PlayWithMe) mesajları: XOX ve Dört Taş. Oyun izleme odasında açılır ama kendisi ayrı bir Durable
// Object'te yürür (kimliğini oda verir), iki oyuncu oturur, gelenler izler. Sunucu gelen her şeyi doğrular ve yeni nesneye kopyalar.

import { CLIENT_ID, cleanName, isAvatar, type Avatar } from '../protocol.ts';
import type { BoardRules, BoardState } from './board.ts';
import { CHESS } from './chess.ts';
import { DAMA } from './dama.ts';
import { FOUR } from './four.ts';
import { XOX } from './xox.ts';

/** Geriye uyumsuz değişiklikte artar (eski sayfa "yenile" uyarısı alır). 2: durum `game` + `kind` (Dört Taş geldi). */
export const GAME_PROTOCOL_VERSION = 2;

/** Boards: `xox` tic-tac-toe, `four` Connect Four, `dama` Turkish draughts (🎲 Classics, P6), `chess` (P7). */
export const GAME_KINDS = ['xox', 'four', 'dama', 'chess'] as const;
export type GameKind = (typeof GAME_KINDS)[number];

export const GAME_RULES: Record<GameKind, BoardRules> = { xox: XOX, four: FOUR, dama: DAMA, chess: CHESS };
/** Glowbeam the bot's levels (0 = no bot). */
export type BotLevel = 1 | 2;

/** Maçta atılabilen emojiler (sabit liste: sohbet yok, kimse kimseye yazı yazamaz). */
export const GAME_EMOJIS = ['👏', '😂', '😮', '🔥', '😭', '🤝', '😎', '🤔'] as const;
export type GameEmoji = (typeof GAME_EMOJIS)[number];

/** Oyuncu/izleyici (kalıcı kimlik istemcilere gitmez). */
export interface GamePerson {
  id: string;
  name: string;
  avatar?: Avatar;
  /** Şu an bağlı mı (koltuktaki kişi çıktıysa izleyiciler oturabilir). */
  online: boolean;
  /** Glowbeam the bot sits here (its level). */
  bot?: BotLevel;
}

export interface GameScore {
  X: number;
  O: number;
  draw: number;
}

export type GameClientMessage =
  /** `classics`: a 🎲 Classics table, whose board is chosen inside it (the table's current board is used). */
  | { t: 'hello'; v: number; game: GameKind; name: string; avatar?: Avatar; cid?: string; classics?: boolean }
  /** XOX: the cell (0–8); Connect Four: the column (0–6); dama: `from * 64 + to`; chess: `promo * 4096 + from * 64 + to`. */
  | { t: 'move'; cell: number }
  /** Classics: another board from the shelf (a player, while no game is in progress). */
  | { t: 'switch'; game: GameKind }
  /** Glowbeam takes the empty seat (level 1 easy, 2 medium) or leaves it (0). */
  | { t: 'bot'; level: 0 | BotLevel }
  /** Yeni el (oyun bittiyse oyunculardan biri başlatır). */
  | { t: 'rematch' }
  /** Boş (ya da sahibi bağlı olmayan) koltuğa otur: 0 = X, 1 = O. */
  | { t: 'sit'; seat: 0 | 1 }
  /** Koltuktan kalk, izleyici ol. */
  | { t: 'stand' }
  | { t: 'react'; emoji: GameEmoji }
  | { t: 'ping' };

export type GameServerMessage =
  | { t: 'welcome'; you: string; game: GameKind }
  | { t: 'state'; kind: GameKind; game: BoardState; seats: [GamePerson | null, GamePerson | null]; watchers: GamePerson[]; score: GameScore; classics?: boolean; started?: boolean }
  | { t: 'react'; from: GamePerson; emoji: GameEmoji }
  | { t: 'error'; code: GameErrorCode }
  | { t: 'pong' };

/** `kind`: bu kodla başka bir oyun sürüyor (adres elle değiştirildi). */
export type GameErrorCode = 'version' | 'bad' | 'full' | 'kind' | 'not_player' | 'not_your_turn' | 'seat_taken' | 'rate' | 'in_progress';

/** Odada en fazla bu kadar kişi (2 oyuncu + izleyiciler). */
export const GAME_MAX_PEOPLE = 30;

/** İstemciden gelen mesajı doğrular; geçersizse null. */
export function parseGameMessage(raw: string): GameClientMessage | null {
  if (raw.length > 2000) return null;
  let m: Record<string, unknown>;
  try {
    m = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!m || typeof m !== 'object') return null;
  switch (m.t) {
    case 'hello': {
      const name = cleanName(m.name);
      if (typeof m.v !== 'number' || name === null || !(GAME_KINDS as readonly unknown[]).includes(m.game)) return null;
      const hello: Extract<GameClientMessage, { t: 'hello' }> = { t: 'hello', v: m.v, game: m.game as GameKind, name };
      if (isAvatar(m.avatar)) hello.avatar = m.avatar;
      if (typeof m.cid === 'string' && CLIENT_ID.test(m.cid)) hello.cid = m.cid;
      if (m.classics === true) hello.classics = true;
      return hello;
    }
    case 'move':
      // The game's rules check the exact range (dama: from * 64 + to; chess: promo * 4096 + from * 64 + to).
      return Number.isInteger(m.cell) && (m.cell as number) >= 0 && (m.cell as number) < 16384 ? { t: 'move', cell: m.cell as number } : null;
    case 'switch':
      return (GAME_KINDS as readonly unknown[]).includes(m.game) ? { t: 'switch', game: m.game as GameKind } : null;
    case 'bot':
      return m.level === 0 || m.level === 1 || m.level === 2 ? { t: 'bot', level: m.level } : null;
    case 'sit':
      return m.seat === 0 || m.seat === 1 ? { t: 'sit', seat: m.seat } : null;
    case 'react':
      return (GAME_EMOJIS as readonly unknown[]).includes(m.emoji) ? { t: 'react', emoji: m.emoji as GameEmoji } : null;
    case 'rematch':
    case 'stand':
    case 'ping':
      return { t: m.t };
    default:
      return null;
  }
}

/** Oyun odası kimliği: oda kimlikleriyle aynı biçim. */
export const GAME_ID_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;
