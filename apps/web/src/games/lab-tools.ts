// 🐞 Test Lab, games part (card DL3, Game Studio). The hall's commands (open any game, side-game time ×10, "pretend the
// film plays", restore my real saves) and the sandbox the side games' own lab commands use: before the first cheat a
// game's real save is copied aside, and "Restore my real saves" puts every copy back. Nothing here talks to the server.
// With the lab off, `debugHooks.register` only stores the factory; it runs only while the lab is open.

import { ROOM_GAME_KINDS, type RoomGameKind } from '@swm/shared/protocol';
import { SOLO_KINDS, type SoloKind, type SoloRoom } from '@swm/shared/games/catalog';
import { debugHooks, type LabCommand } from '../debug-lab.ts';
import { load, save } from '../storage.ts';

/** Side games: how fast their clock runs, and whether they act as if the room's film played. */
export const labClock = { speed: 1, playing: false };
/** The fake film "pretend the film plays" gives the side games (an hour long, its position moving with time). */
const LAB_FILM = 'lab-film';
let labFilmStart = 0;

/** The save keys the side games keep (the sandbox copies only these). */
export const SIDE_SAVES = ['snackBar', 'windowGarden', 'fiveFrames'] as const;
const REAL = 'lab:real:';
/** The event an open side game listens to: its save was put back, read it again. */
export const RESTORE_EVENT = 'swm-lab-restore';

function realCopy(key: string): string | null {
  try {
    return localStorage.getItem(REAL + key);
  } catch {
    return null;
  }
}

/** Before a game's first lab cheat: keep its real save aside (once; later cheats change only the sandbox). */
export function sandbox(key: string): void {
  if (realCopy(key) !== null) return;
  try {
    localStorage.setItem(REAL + key, load(key) ?? '');
  } catch {
    /* storage blocked: the cheat still works, there is just nothing to restore */
  }
}

export const sandboxed = (): string[] => SIDE_SAVES.filter((key) => realCopy(key) !== null);

/** Puts every real save back (through `save`, so the extension's copy follows) and tells open games to reload. */
export function restoreSaves(): string[] {
  const done: string[] = [];
  for (const key of SIDE_SAVES) {
    const real = realCopy(key);
    if (real === null) continue;
    save(key, real);
    try {
      localStorage.removeItem(REAL + key);
    } catch {
      /* ignore */
    }
    done.push(key);
  }
  if (done.length) dispatchEvent(new CustomEvent(RESTORE_EVENT, { detail: done }));
  return done;
}

/** The room as the side games see it, with the lab's "pretend the film plays". */
export function labRoom(r: SoloRoom): SoloRoom {
  if (!labClock.playing || r.playing) return r;
  const position = (Date.now() - labFilmStart) / 1000;
  return { ...r, playing: true, item: r.item ?? { id: LAB_FILM, duration: 3600, position, title: 'Lab film' } };
}

/** How many ticks a side game runs for one real tick (×10 time). */
export const labTicks = (): number => labClock.speed;

const SOLO_NAMES: Record<SoloKind, string> = { snack: 'Snack Bar', garden: 'Window Garden', word: 'Five Frames' };

/** The hall's commands, registered once by the games stage. */
export function registerGamesLab(openTable: (kind: RoomGameKind) => void, openSolo: (kind: SoloKind) => Promise<void>): () => void {
  return debugHooks.register('games', () => {
    const commands: LabCommand[] = [
      ...ROOM_GAME_KINDS.map((kind): LabCommand => ({
        id: `games.open.${kind}`,
        title: `Open a table: ${kind}`,
        help: 'Opens this game as a table in the room, as the hall would.',
        tab: 'games',
        where: 'in a room',
        run: () => openTable(kind),
      })),
      ...SOLO_KINDS.map((kind): LabCommand => ({
        id: `games.open.${kind}`,
        title: `Open on the side: ${SOLO_NAMES[kind]}`,
        help: 'Opens this side game in the game window.',
        tab: 'games',
        where: 'in a room',
        run: () => void openSolo(kind),
      })),
      {
        id: 'games.speed',
        title: labClock.speed > 1 ? 'Side games: normal time' : 'Side games: time ×10',
        help: 'Snack Bar and Window Garden tick ten times a second (arg: a speed from 1 to 30).',
        tab: 'games',
        run: (arg) => {
          const was = labClock.speed;
          const asked = Number(arg);
          labClock.speed = Number.isFinite(asked) && asked >= 1 ? Math.min(30, Math.round(asked)) : was > 1 ? 1 : 10;
          return `×${labClock.speed}`;
        },
        undo: () => {
          labClock.speed = 1;
        },
      },
      {
        id: 'games.playing',
        title: labClock.playing ? 'Side games: stop pretending' : 'Side games: pretend the film plays',
        help: 'The side games act as if the room played an hour-long film (nothing is sent to the room).',
        tab: 'games',
        run: () => {
          labClock.playing = !labClock.playing;
          if (labClock.playing) labFilmStart = Date.now();
          return labClock.playing ? 'pretending' : 'off';
        },
        undo: () => {
          labClock.playing = false;
        },
      },
      {
        id: 'games.restore',
        title: 'Restore my real saves',
        help: 'Puts back the side-game saves the lab copied aside before its first cheat.',
        tab: 'games',
        available: () => sandboxed().length > 0 || 'no lab cheat used yet: the saves are the real ones',
        run: () => restoreSaves().join(', '),
      },
    ];
    return {
      commands,
      status: () => [
        ['Side-game time', `×${labClock.speed}${labClock.playing ? ' · pretend playing' : ''}`],
        ['Sandboxed saves', sandboxed().join(', ') || 'none'],
      ],
    };
  });
}

/** For a side game: register its own commands while its window is open; each run is sandboxed first. */
export function registerSideLab(name: string, key: (typeof SIDE_SAVES)[number], commands: () => LabCommand[], status?: () => [string, string][]): () => void {
  return debugHooks.register(name, () => ({
    commands: commands().map((c) => ({
      ...c,
      run: (arg?: string) => {
        sandbox(key);
        return c.run(arg);
      },
    })),
    status,
  }));
}
