import { describe, expect, it } from 'vitest';
import {
  SEA_RULES,
  around,
  botShot,
  checkFleet,
  fleetSunk,
  knownEmpty,
  parseSeaMessage,
  randomFleet,
  shipCells,
  shotResult,
  sunkShips,
  type SeaView,
  type ShipPlace,
} from './sea.ts';

/** A seeded random source (so the tests repeat). */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

const R = SEA_RULES;
/** Ships along rows 0, 2, 4, 6, 8 from column 0: valid with gaps between them. */
const ROWS: ShipPlace[] = R.fleet.map((_, i) => ({ at: i * 2 * R.size, down: false }));

describe('sea battle rules', () => {
  it('lays a ship along a row or down a column, never off the sea', () => {
    expect(shipCells(R, 3, { at: 0, down: false })).toEqual([0, 1, 2]);
    expect(shipCells(R, 3, { at: 0, down: true })).toEqual([0, 10, 20]);
    expect(shipCells(R, 3, { at: 8, down: false })).toBeNull();
    expect(shipCells(R, 3, { at: 80, down: true })).toBeNull();
    expect(shipCells(R, 2, { at: 100, down: false })).toBeNull();
  });

  it('finds the cells around a cell, fewer at the edges', () => {
    expect(around(10, 0).sort((a, b) => a - b)).toEqual([1, 10, 11]);
    expect(around(10, 55)).toHaveLength(8);
  });

  it('accepts a fleet with gaps and refuses overlap, touching and the wrong count', () => {
    expect(checkFleet(R, ROWS)).toHaveLength(5);
    const overlap = [...ROWS];
    overlap[1] = { at: 0, down: true };
    expect(checkFleet(R, overlap)).toBeNull();
    const touching = [...ROWS];
    touching[1] = { at: 10, down: false }; // right under the first ship
    expect(checkFleet(R, touching)).toBeNull();
    const corner = [...ROWS];
    corner[1] = { at: 15, down: false }; // touches the first ship (cells 0–4) at the corner 4 / 15
    expect(checkFleet(R, corner)).toBeNull();
    expect(checkFleet({ ...R, touch: true }, touching)).not.toBeNull();
    expect(checkFleet(R, ROWS.slice(1))).toBeNull();
  });

  it('always makes a valid random fleet', () => {
    const random = seeded(7);
    for (let i = 0; i < 200; i++) expect(checkFleet(R, randomFleet(R, random))).not.toBeNull();
  });

  it('tells a miss, a hit and a sinking, and when the fleet is gone', () => {
    const ships = checkFleet(R, ROWS)!;
    expect(shotResult(ships, [], 9)).toBe('miss');
    expect(shotResult(ships, [], 80)).toBe('hit');
    expect(shotResult(ships, [80], 81)).toBe('sunk');
    expect(sunkShips(ships, [80, 81])).toEqual([4]);
    const everything = ships.flat();
    expect(fleetSunk(ships, everything.slice(1))).toBe(false);
    expect(fleetSunk(ships, everything)).toBe(true);
  });

  it('knows the water around a sunk ship is empty when ships may not touch', () => {
    const view: SeaView = { shots: [[80, 1], [81, 1]], sunk: [[80, 81]] };
    const empty = knownEmpty(R, view);
    expect(empty.has(70)).toBe(true);
    expect(empty.has(82)).toBe(true);
    expect(empty.has(80)).toBe(false);
    expect(knownEmpty({ ...R, touch: true }, view).size).toBe(0);
  });
});

describe('Stub at sea', () => {
  it('never shoots the same cell twice or water known to be empty', () => {
    for (const level of [1, 2] as const) {
      const random = seeded(level);
      const view: SeaView = { shots: [[80, 1], [81, 1], [0, 0]], sunk: [[80, 81]] };
      const blocked = knownEmpty(R, view);
      for (let i = 0; i < 50; i++) {
        const cell = botShot(R, view, level, random);
        expect([0, 80, 81].includes(cell)).toBe(false);
        expect(blocked.has(cell)).toBe(false);
      }
    }
  });

  it('follows an open hit to a cell next to it', () => {
    for (const level of [1, 2] as const) {
      const cell = botShot(R, { shots: [[44, 1]], sunk: [] }, level, seeded(3));
      expect([34, 54, 43, 45]).toContain(cell);
    }
  });

  it('keeps to the line of two hits (medium)', () => {
    const cell = botShot(R, { shots: [[44, 1], [45, 1]], sunk: [] }, 2, seeded(5));
    expect([43, 46]).toContain(cell);
  });

  it('sinks a whole random fleet in a fair number of shots (medium beats easy on average)', () => {
    const shotsToWin = (level: 1 | 2, seed: number) => {
      const random = seeded(seed);
      const ships = checkFleet(R, randomFleet(R, random))!;
      const fired: [number, 0 | 1][] = [];
      for (let n = 0; n < 100; n++) {
        const sunk = sunkShips(ships, fired.map(([c]) => c)).map((i) => ships[i]!);
        if (sunk.length === ships.length) return n;
        const cell = botShot(R, { shots: fired, sunk }, level, random);
        fired.push([cell, ships.some((s) => s.includes(cell)) ? 1 : 0]);
      }
      return 100;
    };
    let easy = 0;
    let medium = 0;
    for (let seed = 1; seed <= 12; seed++) {
      easy += shotsToWin(1, seed);
      medium += shotsToWin(2, seed);
    }
    expect(medium / 12).toBeLessThan(70);
    expect(medium).toBeLessThan(easy);
  });
});

describe('sea battle messages', () => {
  it('copies good messages and refuses bad ones', () => {
    expect(parseSeaMessage(JSON.stringify({ t: 'shot', cell: 42 }))).toEqual({ t: 'shot', cell: 42 });
    expect(parseSeaMessage(JSON.stringify({ t: 'shot', cell: 100 }))).toBeNull();
    expect(parseSeaMessage(JSON.stringify({ t: 'shot', cell: 4.5 }))).toBeNull();
    expect(parseSeaMessage(JSON.stringify({ t: 'place', ships: ROWS }))).toEqual({ t: 'place', ships: ROWS });
    expect(parseSeaMessage(JSON.stringify({ t: 'place', ships: ROWS.slice(1) }))).toBeNull();
    expect(parseSeaMessage(JSON.stringify({ t: 'ready', on: 'yes' }))).toBeNull();
    expect(parseSeaMessage(JSON.stringify({ t: 'bot', level: 3 }))).toBeNull();
    expect(parseSeaMessage(JSON.stringify({ t: 'lab', op: 'reveal' }))).toEqual({ t: 'lab', op: 'reveal' });
    expect(parseSeaMessage('not json')).toBeNull();
    const hello = parseSeaMessage(JSON.stringify({ t: 'hello', v: 1, name: 'Alex', cid: 'c'.repeat(32), extra: 1 }));
    expect(hello).toEqual({ t: 'hello', v: 1, name: 'Alex', cid: 'c'.repeat(32) });
  });
});
