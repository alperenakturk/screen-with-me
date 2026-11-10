// 🚢 Sea Battle (Game Studio, owner's pick C, 5 Nov 2026; notes in docs/internal/design/games/sea-battle.md): two
// players hide a fleet each, then call shots in turns; the first fleet sunk loses. Pure rules, the protocol and the
// Stub bot. The server (`apps/server/src/sea.ts`) holds both fleets and sends each player only their own ships.

import { CLIENT_ID, cleanName, isAvatar, type Avatar } from '../protocol.ts';

export const SEA_PROTOCOL_VERSION = 1;
export const SEA_ID_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;
/** Stub waits this long before a shot (like the Classics bot). */
export const SEA_BOT_DELAY_MS = 700;

/** The rule choices (the owner's questions 1–3 in the design note); one place to change them. */
export interface SeaRules {
  /** Cells per side of the square sea. */
  size: number;
  /** Ship lengths, longest first. */
  fleet: readonly number[];
  /** A hit lets the shooter shoot again (a miss passes the turn). */
  again: boolean;
  /** Ships may touch (also at a corner). */
  touch: boolean;
}

export const SEA_RULES: SeaRules = { size: 10, fleet: [5, 4, 3, 3, 2], again: true, touch: false };

/** A ship on the sea: its first (top / left) cell and whether it runs down (else right). Cell = row * size + column. */
export interface ShipPlace {
  at: number;
  down: boolean;
}

/** The cells of a ship of `len` at `place`, or null when it leaves the sea. */
export function shipCells(rules: SeaRules, len: number, place: ShipPlace): number[] | null {
  const { size } = rules;
  if (!Number.isInteger(place.at) || place.at < 0 || place.at >= size * size) return null;
  const row = Math.floor(place.at / size);
  const col = place.at % size;
  if (place.down ? row + len > size : col + len > size) return null;
  return Array.from({ length: len }, (_, i) => (place.down ? place.at + i * size : place.at + i));
}

/** The 8 cells around `cell` (fewer at the edges). */
export function around(size: number, cell: number): number[] {
  const row = Math.floor(cell / size);
  const col = cell % size;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < size && c >= 0 && c < size) out.push(r * size + c);
    }
  }
  return out;
}

/** A fleet laid out by `places` (one per ship of `rules.fleet`, in order): every ship's cells, or null if it breaks a
 * rule (off the sea, overlapping, touching when ships may not touch, the wrong number of ships). */
export function checkFleet(rules: SeaRules, places: readonly ShipPlace[]): number[][] | null {
  if (places.length !== rules.fleet.length) return null;
  const taken = new Map<number, number>();
  const ships: number[][] = [];
  for (let i = 0; i < places.length; i++) {
    const cells = shipCells(rules, rules.fleet[i]!, places[i]!);
    if (!cells) return null;
    for (const c of cells) {
      if (taken.has(c)) return null;
      if (!rules.touch && around(rules.size, c).some((n) => taken.has(n) && taken.get(n) !== i)) return null;
    }
    for (const c of cells) taken.set(c, i);
    ships.push(cells);
  }
  return ships;
}

/** A random valid fleet. */
export function randomFleet(rules: SeaRules, random: () => number = Math.random): ShipPlace[] {
  for (let attempt = 0; attempt < 200; attempt++) {
    const places: ShipPlace[] = [];
    let ok = true;
    for (let i = 0; i < rules.fleet.length && ok; i++) {
      ok = false;
      for (let tries = 0; tries < 300; tries++) {
        const place = { at: Math.floor(random() * rules.size * rules.size), down: random() < 0.5 };
        if (checkFleet({ ...rules, fleet: rules.fleet.slice(0, i + 1) }, [...places, place])) {
          places.push(place);
          ok = true;
          break;
        }
      }
    }
    if (ok) return places;
  }
  // Practically never reached: a fixed fleet down the left that always fits the default rules.
  return rules.fleet.map((_, i) => ({ at: i * 2 * rules.size, down: false }));
}

export type ShotResult = 'miss' | 'hit' | 'sunk';

/** What one shot at a fleet does, given the shots already taken at it (`shots` without `cell`). */
export function shotResult(ships: readonly number[][], shots: readonly number[], cell: number): ShotResult {
  const ship = ships.find((s) => s.includes(cell));
  if (!ship) return 'miss';
  const hit = new Set([...shots, cell]);
  return ship.every((c) => hit.has(c)) ? 'sunk' : 'hit';
}

/** The ships (indices) every cell of which was shot. */
export function sunkShips(ships: readonly number[][], shots: readonly number[]): number[] {
  const hit = new Set(shots);
  return ships.flatMap((s, i) => (s.every((c) => hit.has(c)) ? [i] : []));
}

export const fleetSunk = (ships: readonly number[][], shots: readonly number[]): boolean => sunkShips(ships, shots).length === ships.length;

/** What a shooter knows about the enemy sea: every shot with hit or not, and the sunk ships' cells. */
export interface SeaView {
  shots: readonly (readonly [number, 0 | 1])[];
  sunk: readonly (readonly number[])[];
}

/** Cells known to be empty without a shot: around a sunk ship when ships may not touch. */
export function knownEmpty(rules: SeaRules, view: SeaView): Set<number> {
  const out = new Set<number>();
  if (rules.touch) return out;
  for (const ship of view.sunk) for (const c of ship) for (const n of around(rules.size, c)) if (!ship.includes(n)) out.add(n);
  return out;
}

export type SeaBotLevel = 1 | 2;

/**
 * Stub's shot. Easy: a random cell, but after a hit it tries the cells next to it. Medium: counts, for every cell,
 * how many ways the ships still afloat could cover it (skipping misses, sunk ships and the water around them), and
 * gives cells next to an open hit a large bonus, so it follows a hit along the ship's line.
 */
export function botShot(rules: SeaRules, view: SeaView, level: SeaBotLevel, random: () => number = Math.random): number {
  const { size } = rules;
  const shot = new Map(view.shots.map(([c, h]) => [c, h]));
  const sunkCells = new Set(view.sunk.flat());
  const blocked = knownEmpty(rules, view);
  const free = (c: number) => !shot.has(c) && !blocked.has(c);
  const openHits = view.shots.filter(([c, h]) => h === 1 && !sunkCells.has(c)).map(([c]) => c);
  const neighbours = (c: number) => {
    const r = Math.floor(c / size);
    const col = c % size;
    return [r > 0 ? c - size : -1, r < size - 1 ? c + size : -1, col > 0 ? c - 1 : -1, col < size - 1 ? c + 1 : -1].filter((n) => n >= 0);
  };
  const pick = (cells: number[]) => cells[Math.floor(random() * cells.length)]!;
  const all = Array.from({ length: size * size }, (_, i) => i).filter(free);
  if (!all.length) return 0;
  if (level === 1) {
    const near = openHits.flatMap(neighbours).filter(free);
    return near.length ? pick(near) : pick(all);
  }
  // Ships still afloat: the fleet minus the lengths of the sunk ones.
  const afloat = [...rules.fleet];
  for (const s of view.sunk) {
    const i = afloat.indexOf(s.length);
    if (i >= 0) afloat.splice(i, 1);
  }
  const score = new Array<number>(size * size).fill(0);
  const hits = new Set(openHits);
  for (const len of afloat) {
    for (let at = 0; at < size * size; at++) {
      for (const down of [false, true]) {
        const cells = shipCells(rules, len, { at, down });
        if (!cells || cells.some((c) => !free(c) && !hits.has(c))) continue;
        const covered = cells.filter((c) => hits.has(c)).length;
        const weight = covered ? 50 * covered : 1;
        for (const c of cells) if (free(c)) score[c]! += weight;
      }
    }
  }
  const best = Math.max(...all.map((c) => score[c]!));
  return pick(all.filter((c) => score[c] === best));
}

// ---- Protocol ----

export type SeaPhase = 'place' | 'play' | 'over';

export type SeaClientMessage =
  | { t: 'hello'; v: number; name: string; avatar?: Avatar; cid?: string }
  | { t: 'ping' }
  | { t: 'place'; ships: ShipPlace[] }
  | { t: 'shuffle' }
  | { t: 'ready'; on: boolean }
  | { t: 'shot'; cell: number }
  | { t: 'bot'; level: SeaBotLevel | 0 }
  | { t: 'sit' }
  | { t: 'rematch' }
  | { t: 'lab'; op: 'oneLeft' | 'reveal' };

export interface SeaPlayer {
  id: string;
  name: string;
  avatar?: Avatar;
  online: boolean;
  bot?: SeaBotLevel;
  ready: boolean;
  /** Ships of this player's fleet still afloat (everyone may know how many are left). */
  left: number;
  wins: number;
}

export interface SeaSideView extends SeaView {
  /** Every ship's cells: only for the fleet's owner, and for everyone once the game is over. */
  ships?: number[][];
}

export type SeaServerMessage =
  | { t: 'welcome'; you: string; now: number }
  | { t: 'pong'; now: number }
  | {
      t: 'state';
      phase: SeaPhase;
      /** Two seats (null = free). */
      players: (SeaPlayer | null)[];
      /** The two seas: index i = the sea of seat i (shots fired at it). */
      seas: SeaSideView[];
      /** Seat index whose turn it is to shoot (play phase). */
      turn: number;
      winner: number | null;
      /** My seat (-1 = watching). */
      seat: number;
      /** My fleet while placing (the server's random one at first). */
      places?: ShipPlace[];
      watchers: { id: string; name: string; avatar?: Avatar }[];
      last?: { by: number; cell: number; result: ShotResult };
      rules: { size: number; fleet: number[]; again: boolean; touch: boolean };
    }
  | { t: 'reveal'; seat: number; ships: number[][] }
  | { t: 'error'; code: string };

const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isInt = (v: unknown, max: number): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < max;

/** Checks and copies a client message (never trusts its shape). */
export function parseSeaMessage(raw: string): SeaClientMessage | null {
  if (raw.length > 2000) return null;
  let m: Record<string, unknown>;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!m || typeof m !== 'object') return null;
  const cells = SEA_RULES.size * SEA_RULES.size;
  switch (m.t) {
    case 'hello': {
      const name = cleanName(m.name);
      if (typeof m.v !== 'number' || name === null) return null;
      const hello: Extract<SeaClientMessage, { t: 'hello' }> = { t: 'hello', v: m.v, name };
      if (isAvatar(m.avatar)) hello.avatar = m.avatar;
      if (typeof m.cid === 'string' && CLIENT_ID.test(m.cid)) hello.cid = m.cid;
      return hello;
    }
    case 'ping':
    case 'shuffle':
    case 'sit':
    case 'rematch':
      return { t: m.t };
    case 'place': {
      if (!Array.isArray(m.ships) || m.ships.length !== SEA_RULES.fleet.length) return null;
      const ships: ShipPlace[] = [];
      for (const s of m.ships as unknown[]) {
        const p = s as Record<string, unknown>;
        if (!p || !isInt(p.at, cells) || !isBool(p.down)) return null;
        ships.push({ at: p.at, down: p.down });
      }
      return { t: 'place', ships };
    }
    case 'ready':
      return isBool(m.on) ? { t: 'ready', on: m.on } : null;
    case 'shot':
      return isInt(m.cell, cells) ? { t: 'shot', cell: m.cell } : null;
    case 'bot':
      return m.level === 0 || m.level === 1 || m.level === 2 ? { t: 'bot', level: m.level } : null;
    case 'lab':
      return m.op === 'oneLeft' || m.op === 'reveal' ? { t: 'lab', op: m.op } : null;
    default:
      return null;
  }
}
