// Tiny on purpose: loaded with every page (app.ts), while the TV code itself (tv.ts, QR) loads only when used.
import { ROOM_ID_PATTERN, TV_TOKEN } from '@swm/shared/protocol';
import { load, save } from './storage.ts';

/**
 * The TV version is hidden for now (owner, 30 Oct 2026: shelved until a Google Cast version after 1.0; the code stays).
 * It only works on a device where the hidden lab switch is on: open any page of the site with `?tvlab=1` (`?tvlab=0`
 * turns it off). Without it the TV button, `/tv`, `/tv/<code>` and `/tv-test` are not reachable.
 */
export function tvLab(): boolean {
  return load('opt:tvLab') === '1';
}

/** Reads `?tvlab=1|0` from the address once and removes it. */
export function readTvLabSwitch(): void {
  const params = new URLSearchParams(location.search);
  const value = params.get('tvlab');
  if (value === null) return;
  save('opt:tvLab', value === '1' ? '1' : '0');
  params.delete('tvlab');
  const rest = params.toString();
  history.replaceState(null, '', `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`);
}

// The TV's pairing record lives here (not in tv.ts) so the room can read it without loading the TV pages.
/** A paired TV may come back to its room with the same token for this long (the server keeps it as long). */
const LINK_TTL_MS = 12 * 60 * 60_000;

export interface TvLink {
  room: string;
  token: string;
  at: number;
}

/** This TV's last pairing (the room it may return to). */
export function tvLink(): TvLink | null {
  try {
    const link = JSON.parse(load('tvLink') ?? 'null') as TvLink | null;
    if (link && ROOM_ID_PATTERN.test(link.room) && TV_TOKEN.test(link.token) && Date.now() - link.at < LINK_TTL_MS) return link;
  } catch {
    // A broken record counts as none.
  }
  return null;
}

export function saveTvLink(room: string, token: string): void {
  save('tvLink', JSON.stringify({ room, token, at: Date.now() }));
}

export function clearTvLink(): void {
  save('tvLink', '');
}

