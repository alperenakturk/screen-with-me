import { ROOM_ID_PATTERN } from './protocol.ts';

// Karışan harfler (l/1, o/0) yok; linki sesli okurken bile hata olmasın.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

export function newRoomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** "https://site/r/abc123", "site/r/abc123", "...#swm=abc123" veya sadece "abc123" kabul edilir. */
export function extractRoomId(input: string): string | null {
  const text = input.trim();
  const fromLink = text.match(/\/r\/([^/?#\s]+)/)?.[1] ?? text.match(/[#&]swm=([^&\s]+)/)?.[1];
  const id = fromLink ?? text;
  return ROOM_ID_PATTERN.test(id) ? id : null;
}

/** Bir sayfa adresine eklentinin tanıyacağı oda işaretini ekler: sayfa#swm=ODA */
export function pageInviteUrl(pageUrl: string, roomId: string): string {
  const url = new URL(pageUrl);
  url.hash = `swm=${roomId}`;
  return url.toString();
}

/** Adresteki #swm=ODA işaretini okur. */
export function roomIdFromHash(hash: string): string | null {
  const id = hash.match(/(?:^#|&)swm=([^&]+)/)?.[1];
  return id && ROOM_ID_PATTERN.test(id) ? id : null;
}

// A friendly name for a room that has none (0.9.93.2, owner: "a nice name instead of 'Room swky86r'"): worked out from
// the room's id, so everyone sees the same name without the server storing anything. English words (English first,
// CLAUDE.md); 32 × 32 = 1024 names, the id stays in the link.
const NAME_FIRST = [
  'Cozy', 'Velvet', 'Midnight', 'Golden', 'Sunny', 'Starry', 'Neon', 'Moonlit',
  'Lazy', 'Popcorn', 'Silver', 'Cosmic', 'Mellow', 'Crimson', 'Breezy', 'Twilight',
  'Snug', 'Lucky', 'Amber', 'Electric', 'Dreamy', 'Rainy', 'Sleepy', 'Jolly',
  'Cheerful', 'Saturday', 'Retro', 'Pocket', 'Hidden', 'Little', 'Quiet', 'Merry',
];
const NAME_SECOND = [
  'Couch', 'Lounge', 'Cinema', 'Den', 'Balcony', 'Theater', 'Hideout', 'Nook',
  'Studio', 'Corner', 'Attic', 'Rooftop', 'Cabin', 'Harbor', 'Garden', 'Booth',
  'Parlor', 'Loft', 'Veranda', 'Lighthouse', 'Treehouse', 'Hangout', 'Sofa', 'Screen',
  'Matinee', 'Club', 'Porch', 'Courtyard', 'Igloo', 'Tent', 'Library', 'Station',
];

/** "Velvet Lounge": the same id always gives the same name. */
export function friendlyRoomName(id: string): string {
  // FNV-1a over the id's characters.
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${NAME_FIRST[hash % NAME_FIRST.length]!} ${NAME_SECOND[(hash >>> 5) % NAME_SECOND.length]!}`;
}
