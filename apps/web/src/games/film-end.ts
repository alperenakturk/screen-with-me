// Films that ended while I was in a room (owner's pick 11 B, 4 Nov 2026: Window Garden's "film ended" seed comes
// whenever a film of 20 min or more ends while I am in the room, even with the garden closed). The room page watches
// its item (`watchFilmEnds`) and notes each ending in `localStorage` (`sideFilms`); the side games read the list
// (`takeFilmEnds`) and keep their own record of what they already used, so the list is shared and never emptied by one.
// Tiny on purpose: the watcher lives in the room's chunk.

import { load, save } from '../storage.ts';

const KEY = 'sideFilms';
/** Matches Window Garden's `FILM_MIN_S` (20 min). */
const FILM_MIN_S = 20 * 60;
/** "Ended": the room reached its last seconds (also by skipping there), or the next item came after them. */
const END_S = 10;
const KEEP = 20;
/** Endings older than this are not handed out any more (a garden opened next week gets no seed for them). */
const FRESH_MS = 12 * 3600_000;

export interface FilmEnd {
  id: string;
  duration: number;
}
interface Stored extends FilmEnd {
  at: number;
}
type Item = { id: string; duration: number; position: number } | null;

function read(): Stored[] {
  try {
    const list = JSON.parse(load(KEY) || '[]') as unknown;
    if (!Array.isArray(list)) return [];
    return list.filter((e): e is Stored => !!e && typeof e.id === 'string' && e.id.length <= 64 && typeof e.duration === 'number' && typeof e.at === 'number');
  } catch {
    return [];
  }
}

function note(item: FilmEnd): void {
  const list = read();
  if (list.some((e) => e.id === item.id)) return;
  save(KEY, JSON.stringify([...list, { id: item.id, duration: item.duration, at: Date.now() }].slice(-KEEP)));
}

/** Recent films that ended while I was in a room (newest last). */
export function takeFilmEnds(): FilmEnd[] {
  const now = Date.now();
  return read()
    .filter((e) => now - e.at < FRESH_MS)
    .map(({ id, duration }) => ({ id, duration }));
}

/** Watches the room's item every 2 s; returns the stop function. */
export function watchFilmEnds(item: () => Item): () => void {
  let last: Item = null;
  const timer = setInterval(() => {
    const now = item();
    const long = (x: NonNullable<Item>) => x.duration >= FILM_MIN_S;
    if (last && long(last) && (!now || now.id !== last.id) && last.position >= last.duration - END_S - 5) note(last);
    if (now && long(now) && now.position >= now.duration - END_S) note(now);
    last = now;
  }, 2000);
  return () => clearInterval(timer);
}
