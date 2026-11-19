// GD1: a table's connection that died without a word. A phone that wakes up, a Wi-Fi switch or a laptop lid leaves the
// game page's WebSocket "open" while nothing gets through any more: no close event comes for minutes, so the page
// never reconnects, the table's object closes the socket as a ghost after 90 s (`apps/server/src/ghost.ts`) and the
// player looks thrown out (frozen board, offline seat, a Draw & Guess round back in the lobby). The room page has had
// this check for long (`connection.ts`, a ping without an answer); the game pages now have it too.
//
// The watch notes every message the table sends. When nothing came for a while (or the tab comes back into view, or the
// browser is back online) it sends the free keepalive (`@swm/shared/keepalive`, answered by the runtime without waking
// the object); no answer within `DEAD_MS` and the page drops that socket and opens a new one at once. The seat is tied
// to the browser id, so the player is back in it silently. Only WebSockets: the HTTP fallback finds its own failed
// requests. The Test Lab's "go silent" (`silent.ts`) is left alone: the page sends nothing then, probes included.
import { KEEPALIVE } from '@swm/shared/keepalive';
import { OPEN, type SwmSocket } from '@swm/shared/socket';
import type { Silence } from './silent.ts';
import { debugHooks } from '../debug-lab.ts';

/** A probe without an answer this long: the connection is dead. */
export const DEAD_MS = 8_000;
/** Nothing heard this long (the page's keepalive is every 15 s and is always answered): probe. */
export const QUIET_MS = 20_000;
const CHECK_MS = 5_000;

/** Why a game page dropped its connection (the Test Lab's log; no personal data). */
export interface LinkDrop {
  at: number;
  game: string;
  why: 'dead' | 'woke' | 'online' | 'cut';
}
const drops: LinkDrop[] = [];
/** The last drops of this tab's game connections, newest last (the Test Lab's `game.drop` shows them). */
export const linkDrops = (): readonly LinkDrop[] => drops;

export interface LinkWatch {
  /** Call for every new socket (in `connect`). */
  attach(socket: SwmSocket): void;
  /** Test Lab: answers stop counting for `ms`, as on a cut line; the watch finds it and reconnects. */
  cut(ms?: number): void;
  /** Test Lab: as if the tab had just come back into view. */
  woke(): void;
  stop(): void;
}

/**
 * Watches the page's table connection. `revive` must drop the current socket (so its late close is ignored) and
 * connect again.
 */
export function watchLink(game: string, current: () => SwmSocket | null, quiet: Silence, revive: () => void): LinkWatch {
  let heard = Date.now();
  let probeAt = 0;
  let cutUntil = 0;
  let cause: LinkDrop['why'] = 'dead';
  let soon = 0;

  const live = (): SwmSocket | null => {
    const ws = current();
    return ws && ws.readyState === OPEN && ws.transport === 'ws' && !quiet.on ? ws : null;
  };
  const probe = (why: LinkDrop['why']): void => {
    const ws = live();
    if (!ws || probeAt) return;
    cause = why;
    probeAt = Date.now();
    try {
      ws.send(KEEPALIVE);
    } catch {
      // Closing meanwhile: its close event reconnects.
    }
    clearTimeout(soon);
    soon = window.setTimeout(check, DEAD_MS + 100);
  };
  function check(): void {
    if (!live()) {
      probeAt = 0;
      return;
    }
    const now = Date.now();
    if (probeAt && heard < probeAt && now - probeAt > DEAD_MS) {
      drops.push({ at: now, game, why: cause });
      if (drops.length > 20) drops.shift();
      console.info(`[game link] ${game}: no answer for ${Math.round((now - probeAt) / 1000)} s (${cause}), reconnecting`);
      probeAt = 0;
      cutUntil = 0;
      heard = now;
      revive();
      return;
    }
    if (!probeAt && now - heard > QUIET_MS) probe('dead');
  }
  const timer = window.setInterval(check, CHECK_MS);
  const onVisible = (): void => {
    if (document.visibilityState === 'visible') probe('woke');
  };
  const onOnline = (): void => probe('online');
  document.addEventListener('visibilitychange', onVisible);
  addEventListener('online', onOnline);
  // Test Lab (GD1): the three ways a table connection goes away, and what this tab's watch did about them.
  const where = { en: 'at a table', tr: 'bir masada' };
  const offLab = debugHooks.register('game.drop', () => ({
    commands: [
      {
        id: 'game.drop.cut',
        title: { en: 'Table: cut the line (a dead connection)', tr: 'Masa: hattı kes (ölü bağlantı)' },
        help: { en: 'Answers stop counting for 15 s: in about 8 s the page finds the dead line and reconnects; the seat stays.', tr: 'Cevaplar 15 sn sayılmaz: yaklaşık 8 sn içinde sayfa ölü hattı bulur ve yeniden bağlanır; koltuk kalır.' },
        tab: 'games' as const,
        where,
        run: (arg?: string) => watch.cut(Math.max(1, Math.min(120, Number(arg) || 15)) * 1000),
      },
      {
        id: 'game.drop.background',
        title: { en: 'Table: back from the background', tr: 'Masa: arka plandan dönüş' },
        help: { en: 'As if the tab or phone had just woken: the page checks its line at once (a healthy one stays).', tr: 'Sekme ya da telefon yeni uyanmış gibi: sayfa hattını hemen yoklar (sağlam hat kalır).' },
        tab: 'games' as const,
        where,
        run: () => watch.woke(),
      },
    ],
    status: () => {
      const last = drops.at(-1);
      return [
        [
          { en: 'Table line drops', tr: 'Masa hattı kopmaları' },
          last
            ? { en: `${drops.length}, last: ${last.game} (${last.why}), reconnected, seat kept`, tr: `${drops.length}, son: ${last.game} (${last.why}), yeniden bağlandı, koltuk kaldı` }
            : { en: 'none', tr: 'yok' },
        ],
      ];
    },
  }));

  const watch: LinkWatch = {
    attach(socket) {
      heard = Date.now();
      probeAt = 0;
      socket.addEventListener('open', () => {
        heard = Date.now();
      });
      socket.addEventListener('message', () => {
        if (Date.now() < cutUntil) return;
        heard = Date.now();
        if (probeAt) probeAt = 0;
      });
    },
    cut(ms = 15_000) {
      cutUntil = Date.now() + ms;
      probeAt = 0;
      probe('cut');
    },
    woke: () => probe('woke'),
    stop() {
      offLab();
      clearInterval(timer);
      clearTimeout(soon);
      document.removeEventListener('visibilitychange', onVisible);
      removeEventListener('online', onOnline);
    },
  };
  return watch;
}
