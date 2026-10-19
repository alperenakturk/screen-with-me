// Son odalar ve "benim odam": hesap yok, hepsi bu tarayıcıda (localStorage). Oda 24 saat boş
// kalınca sunucuda temizlense de link geçerli kalır (aynı adla boş oda açılır).

import { ROOM_ID_PATTERN } from '@swm/shared/protocol';
import { newRoomId } from '@swm/shared/room-id';
import { load, save } from './storage.ts';

const RECENT_KEY = 'recentRooms';
const MY_ROOM_KEY = 'myRoom';
const MAX_RECENT = 6;

export interface RecentRoom {
  id: string;
  /** Son girilme zamanı (ms). */
  at: number;
  /** Odada en son oynayanın başlığı (biliniyorsa). */
  title?: string;
  /** Kaydedilmiş oda mı (30 gün saklanır). */
  saved?: boolean;
}

export function recentRooms(): RecentRoom[] {
  try {
    const list = JSON.parse(load(RECENT_KEY) ?? '[]') as unknown;
    if (!Array.isArray(list)) return [];
    return list
      .filter((r): r is RecentRoom => typeof r?.id === 'string' && ROOM_ID_PATTERN.test(r.id) && typeof r.at === 'number')
      .map((r) => {
        const room: RecentRoom = { id: r.id, at: r.at };
        if (typeof r.title === 'string') room.title = r.title.slice(0, 120);
        if (r.saved === true) room.saved = true;
        return room;
      });
  } catch {
    return [];
  }
}

/** Odaya girince (ve oynayan değişince başlıkla) listenin başına yazar. */
export function rememberRoom(id: string, title?: string, saved?: boolean): void {
  const old = recentRooms().find((r) => r.id === id);
  const entry: RecentRoom = { id, at: Date.now() };
  const keep = title ?? old?.title;
  if (keep) entry.title = keep;
  if (saved ?? old?.saved) entry.saved = true;
  save(RECENT_KEY, JSON.stringify([entry, ...recentRooms().filter((r) => r.id !== id)].slice(0, MAX_RECENT)));
}

export function forgetRoom(id: string): void {
  save(RECENT_KEY, JSON.stringify(recentRooms().filter((r) => r.id !== id)));
}

/** "Benim odam": bu tarayıcıya ait, hep aynı kalan oda adı (ilk seferde oluşur). */
export function myRoomId(): string {
  const saved = load(MY_ROOM_KEY);
  if (saved && ROOM_ID_PATTERN.test(saved)) return saved;
  const id = newRoomId();
  save(MY_ROOM_KEY, id);
  return id;
}
