// GHOST: every game page pings its object every 15 s in every phase, so the object can tell a live connection from a dead
// one (silent past 90 s = closed and gone, `apps/server/src/ghost.ts`). The Test Lab's "go silent" stops this page from
// sending anything for a while, as a connection that died without a word would.
import type { LabCommand } from '../debug-lab.ts';

/** The game pages' ping period (the server's ghost limit is 90 s, room for a hidden tab's once-a-minute timers). */
export const GAME_PING_MS = 15_000;

export interface Silence {
  /** True while the lab keeps this page quiet: `send` drops everything, pings included. */
  readonly on: boolean;
  /** The lab command for this game (`<game>.silent`, seconds as the argument, 120 by default). */
  command(game: string, name: { en: string; tr: string }): LabCommand;
}

export function silence(): Silence {
  let until = 0;
  return {
    get on() {
      return Date.now() < until;
    },
    command(game, name) {
      return {
        id: `${game}.silent`,
        title: { en: `${name.en}: go silent (a dead connection)`, tr: `${name.tr}: sessize geç (kopmuş bağlantı)` },
        help: {
          en: 'This tab sends nothing for 120 s (or the seconds you give): after about 90 s the table counts you as gone, then you come back.',
          tr: 'Bu sekme 120 sn (ya da verdiğin süre) hiçbir şey göndermez: yaklaşık 90 sn sonra masa seni gitmiş sayar, sonra geri gelirsin.',
        },
        tab: 'games',
        where: { en: `at a ${name.en} table`, tr: `${name.tr} masasında` },
        run: (arg?: string) => {
          const seconds = Math.max(1, Math.min(600, Number(arg) || 120));
          until = Date.now() + seconds * 1000;
        },
        undo: () => {
          until = 0;
        },
      };
    },
  };
}
