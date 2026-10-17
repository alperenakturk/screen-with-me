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
