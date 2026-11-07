// Moving to another address of the site (card R3-3, docs/internal/custom-domain.md). A browser's saves (name, avatar,
// saved rooms, game progress, settings) live in `localStorage`, which belongs to one address. When the site moves to
// its own domain, the old address keeps serving the same Worker, and a visit there:
//   1. packs this browser's saves once (`#handoff=` in the fragment: never sent to any server, never logged),
//   2. moves to the same page on the main address (`location.replace`).
// The main address then takes them in before the site starts: the move keys merge like "Move to another device"
// (`mergeMove`: games keep the save that got further, lists are joined), everything else only fills what is empty.
// It only accepts a handoff whose referrer is one of our aliases, packed less than two minutes ago and of a capped
// size, so a crafted or saved link can't write settings. The fragment is read and replaced (`history.replaceState`,
// the same history entry) before anything else of the site runs: nothing logs it, and it never reaches a server.
// A lazy chunk: it imports the game rules through `@swm/shared/move`.

import { MOVE_KEYS, MOVE_MAX_CHARS, decodeMove, encodeMove, mergeMove, packMove } from '@swm/shared/move';
import { HANDOFF_PREFIX, SITE } from './site.ts';
import { load, save } from './storage.ts';

/** Set on the alias once its saves went along, so later visits there only redirect. */
const DONE_KEY = 'swm-handed-off';
/** Other keys: each at most this long, all together at most EXTRA_TOTAL (the move keys have their own cap). */
const EXTRA_MAX = 20_000;
const EXTRA_TOTAL = 300_000;
/** A handoff is taken only this soon after it was packed (the redirect takes a moment; a saved link is too old). */
const HANDOFF_TTL_MS = 2 * 60_000;
/** The decoded handoff at most: the move part's own cap, the other keys' cap and room for the JSON around them. */
const HANDOFF_MAX = MOVE_MAX_CHARS + EXTRA_TOTAL + 20_000;
/** Never carried: bookkeeping of this address. */
const SKIP = new Set<string>([...MOVE_KEYS, '__at', DONE_KEY]);

interface Handoff {
  /** When it was packed (ms, this browser's clock on both ends). */
  at: number;
  move: string;
  extra: Record<string, string>;
  hash: string;
}

function localKeys(): string[] {
  try {
    return Object.keys(localStorage);
  } catch {
    return [];
  }
}

function alreadyHandedOff(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) !== null;
  } catch {
    return true;
  }
}

/** On an alias: carry the saves along (once) and move to the same page on the main address. */
export function leaveAlias(): void {
  const target = new URL(location.pathname + location.search, SITE.origin);
  if (alreadyHandedOff()) {
    location.replace(target.href + location.hash);
    return;
  }
  const extra: Record<string, string> = {};
  let total = 0;
  for (const key of localKeys().sort()) {
    if (SKIP.has(key)) continue;
    const value = load(key);
    if (value === null || value.length > EXTRA_MAX || total + value.length > EXTRA_TOTAL) continue;
    extra[key] = value;
    total += value.length;
  }
  const handoff: Handoff = { at: Date.now(), move: encodeMove(packMove(load)), extra, hash: location.hash };
  try {
    localStorage.setItem(DONE_KEY, String(Date.now()));
  } catch {
    // No storage here: nothing to carry either.
  }
  location.replace(`${target.href}${HANDOFF_PREFIX}${encodeURIComponent(JSON.stringify(handoff))}`);
}

function fromAlias(): boolean {
  try {
    return SITE.aliases.includes(new URL(document.referrer).origin);
  } catch {
    return false;
  }
}

/** The handoff, or null when it is too big, too old, from the future or not ours. */
function readHandoff(text: string, now = Date.now()): Handoff | null {
  // Percent-encoding at most triples a character: a longer fragment can't decode to an allowed size.
  if (text.length > HANDOFF_MAX * 3) return null;
  try {
    const json = decodeURIComponent(text);
    if (json.length > HANDOFF_MAX) return null;
    const data = JSON.parse(json) as Partial<Handoff> | null;
    if (!data || typeof data.at !== 'number' || typeof data.move !== 'string' || typeof data.hash !== 'string') return null;
    if (data.at > now + 5_000 || now - data.at > HANDOFF_TTL_MS) return null;
    const extra = data.extra && typeof data.extra === 'object' && !Array.isArray(data.extra) ? data.extra : {};
    return { at: data.at, move: data.move, extra, hash: data.hash };
  } catch {
    return null;
  }
}

/**
 * On the main address, before the site starts: take a handoff in (only from an alias) and put the page's own fragment
 * back (`#back`, `#move=…`, `#theme`), so the address bar never keeps the carried saves. Returns the keys written.
 */
export function takeHandoff(): string[] {
  const text = location.hash.slice(HANDOFF_PREFIX.length);
  const handoff = fromAlias() ? readHandoff(text) : null;
  const hash = handoff && /^#[^#]{0,200}$/.test(handoff.hash) ? handoff.hash : '';
  history.replaceState(history.state, '', location.pathname + location.search + hash);
  if (!handoff) return [];
  const written: string[] = [];
  const blob = decodeMove(handoff.move);
  if (blob) {
    const out = mergeMove(load, blob);
    for (const key of MOVE_KEYS) {
      if (out[key] === undefined) continue;
      save(key, out[key]!);
      written.push(key);
    }
  }
  for (const [key, value] of Object.entries(handoff.extra)) {
    if (SKIP.has(key) || typeof value !== 'string' || value.length > EXTRA_MAX || load(key) !== null) continue;
    save(key, value);
    written.push(key);
  }
  return written;
}
