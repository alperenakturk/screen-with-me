// Oyun köşesinin (PlayWithMe) mesajları. İzleme odasından ayrı: her maç kendi odasında (sunucuda ayrı bir Durable
// Object), iki oyuncu oturur, gelenler izler. Sunucu gelen her şeyi doğrular ve yeni nesneye kopyalar.

import { CLIENT_ID, cleanName, isAvatar, type Avatar } from '../protocol.ts';
import type { XoxState } from './xox.ts';

/** Geriye uyumsuz değişiklikte artar (eski sayfa "yenile" uyarısı alır). */
export const GAME_PROTOCOL_VERSION = 1;

export const GAME_KINDS = ['xox'] as const;
export type GameKind = (typeof GAME_KINDS)[number];

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
}

export interface GameScore {
  X: number;
  O: number;
  draw: number;
}

export type GameClientMessage =
  | { t: 'hello'; v: number; game: GameKind; name: string; avatar?: Avatar; cid?: string }
  | { t: 'move'; cell: number }
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
  | { t: 'state'; xox: XoxState; seats: [GamePerson | null, GamePerson | null]; watchers: GamePerson[]; score: GameScore }
  | { t: 'react'; from: GamePerson; emoji: GameEmoji }
  | { t: 'error'; code: GameErrorCode }
  | { t: 'pong' };

export type GameErrorCode = 'version' | 'bad' | 'full' | 'not_player' | 'not_your_turn' | 'seat_taken' | 'rate';

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
      return hello;
    }
    case 'move':
      return Number.isInteger(m.cell) && (m.cell as number) >= 0 && (m.cell as number) < 9 ? { t: 'move', cell: m.cell as number } : null;
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
