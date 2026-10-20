// Kaydedilmiş odalar listesi: hesap yok, liste bu tarayıcıda (localStorage). Odanın kendisi (ayarlar,
// sıra, kaldığı yerler, pinler, oturum özetleri) sunucuda odanın kendi deposunda durur; 30 gün kimse
// girmezse silinir. Liste en fazla MAX_SAVED oda tutar (ana sayfa kalabalıklaşmasın).

import { ROOM_ID_PATTERN } from '@swm/shared/protocol';
import { load, save } from './storage.ts';

const SAVED_KEY = 'savedRooms';
/** Kullanıcının kendisi çıkardığı odalar: tekrar girince listeye kendiliğinden eklenmesin. */
const DISMISSED_KEY = 'savedDismissed';
export const MAX_SAVED = 20;

export interface SavedRoom {
  id: string;
  name: string;
  /** Son girilme zamanı (ms). */
  at: number;
  /** Bu tarayıcı odanın yöneticisi mi (listeden çıkarınca oda kaydı da kalkar). */
  mine?: boolean;
}

function readList<T>(key: string, valid: (x: unknown) => x is T): T[] {
  try {
    const list = JSON.parse(load(key) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter(valid) : [];
  } catch {
    return [];
  }
}

const isSaved = (r: unknown): r is SavedRoom => {
  const x = r as SavedRoom | null;
  return typeof x?.id === 'string' && ROOM_ID_PATTERN.test(x.id) && typeof x.name === 'string' && typeof x.at === 'number';
};
const isId = (x: unknown): x is string => typeof x === 'string' && ROOM_ID_PATTERN.test(x);

export function savedRooms(): SavedRoom[] {
  return readList(SAVED_KEY, isSaved)
    .map((r) => ({ id: r.id, name: r.name.slice(0, 60), at: r.at, ...(r.mine ? { mine: true } : {}) }))
    .sort((a, b) => b.at - a.at);
}

function write(list: SavedRoom[]): void {
  save(SAVED_KEY, JSON.stringify(list));
}

/**
 * Kayıtlı bir odaya girince listeye yazar/günceller. `force`: kullanıcı odayı kendisi kaydetti
 * (daha önce çıkarmış olsa da eklenir). Liste doluysa yeni oda eklenmez: false döner.
 */
export function rememberSaved(room: SavedRoom, force = false): boolean {
  const list = savedRooms();
  const old = list.find((r) => r.id === room.id);
  if (!old && !force && dismissed().includes(room.id)) return false;
  if (!old && list.length >= MAX_SAVED) return false;
  const entry: SavedRoom = { id: room.id, name: room.name, at: room.at };
  if (room.mine || old?.mine) entry.mine = true;
  write([entry, ...list.filter((r) => r.id !== room.id)]);
  if (force) save(DISMISSED_KEY, JSON.stringify(dismissed().filter((id) => id !== room.id)));
  return true;
}

/** Listeden çıkarır. `byUser`: kullanıcı kendisi çıkardı (tekrar girince kendiliğinden eklenmesin). */
export function forgetSaved(id: string, byUser = false): void {
  write(savedRooms().filter((r) => r.id !== id));
  if (byUser) save(DISMISSED_KEY, JSON.stringify([id, ...dismissed().filter((x) => x !== id)].slice(0, 50)));
}

function dismissed(): string[] {
  return readList(DISMISSED_KEY, isId);
}

export function isFull(): boolean {
  return savedRooms().length >= MAX_SAVED;
}
