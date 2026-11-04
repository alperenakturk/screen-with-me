// 🐞 Test Lab, 🎬 Video & network (card DL4, lane B): accidents on purpose, on this tab's own side only. The room gives
// the lab small named handles (`DebugRoom.lab`, see debug-lab.ts `RoomLab`); nothing here reaches into the room's
// code, and nothing gives the server a new power: a drop or a slow network is this tab's connection, a drift or a stall
// is this tab's player. Part of the lab chunk (lazy, never loaded with the lab off).
import { debugRoom, type LabCommand, type RoomLab } from '../debug-lab.ts';

/** The film-server harness (scripts/harness/embed/film-server.mjs): a film page with a pre-roll ad before the film. */
export const FILM_AD_URL = 'http://localhost:5299/preroll';

const lab = (): RoomLab | null => debugRoom()?.lab ?? null;
const inRoom = (): true | string => (lab() ? true : 'not in a room');
const local = (): boolean => ['localhost', '127.0.0.1'].includes(location.hostname);
/** A whole number from the command box's argument, within limits, or the default. */
function amount(arg: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(arg?.trim());
  return Number.isFinite(n) && arg?.trim() ? Math.min(max, Math.max(min, n)) : fallback;
}
function need(): RoomLab {
  const handles = lab();
  if (!handles) throw new Error('not in a room');
  return handles;
}

export function createVideoLab() {
  let latencyBefore = 0;
  const commands: LabCommand[] = [
    {
      id: 'net.drop',
      title: 'Network: drop my connection',
      help: 'My room connection breaks and stays down for N seconds (default 6), then the normal reconnect takes over.',
      tab: 'video',
      where: 'in a room',
      available: inRoom,
      run: (arg) => {
        const s = amount(arg, 6, 1, 60);
        need().drop(s * 1000);
        return `connection down for ${s} s`;
      },
    },
    {
      id: 'net.restart',
      title: 'Network: "the server restarted"',
      help: 'Reconnects at once with my member id, the way the room comes back after a deploy: voice, a stream and a game should stay.',
      tab: 'video',
      where: 'in a room',
      available: inRoom,
      run: () => {
        need().restart();
        return 'reconnecting with the same member id';
      },
    },
    {
      id: 'net.slow',
      title: 'Network: slow (latency)',
      help: 'Every room message in and out waits N ms (default 800, at most 10000). Undo puts the old value back.',
      tab: 'video',
      where: 'in a room',
      available: inRoom,
      run: (arg) => {
        const handles = need();
        latencyBefore = handles.latencyMs();
        const ms = amount(arg, 800, 0, 10_000);
        handles.latency(ms);
        return `latency ${ms} ms each way`;
      },
      undo: () => lab()?.latency(latencyBefore),
    },
    {
      id: 'net.http',
      title: 'Network: force the HTTP fallback',
      help: 'Reconnects over the backup connection (as on a network without WebSockets) until undone or "back to normal".',
      tab: 'video',
      where: 'in a room',
      available: inRoom,
      run: () => {
        need().forceHttp(true);
        return 'reconnecting over the HTTP fallback';
      },
      undo: () => lab()?.forceHttp(false),
    },
    {
      id: 'net.normal',
      title: 'Network: back to normal',
      help: 'No latency, the normal connection (a WebSocket where it works); reconnects if the fallback was forced.',
      tab: 'video',
      where: 'in a room',
      available: inRoom,
      run: () => {
        const handles = need();
        handles.latency(0);
        if (handles.forcedHttp()) handles.forceHttp(false);
        return 'network back to normal';
      },
    },
    {
      id: 'video.drift',
      title: 'Video: drift +3 s',
      help: 'Moves my video N seconds (default 3, negative = behind) away from the room: the drift correction must bring it back.',
      tab: 'video',
      where: 'with a video',
      available: inRoom,
      run: (arg) => {
        const s = amount(arg, 3, -60, 60);
        if (!need().drift(s)) throw new Error('no video playing here');
        return `my video moved ${s > 0 ? '+' : ''}${s} s`;
      },
    },
    {
      id: 'video.stall',
      title: 'Video: stall for N s',
      help: 'My video counts as stuck for N seconds (default 5), as when it buffers: the room waits for me ("everyone ready").',
      tab: 'video',
      where: 'with a video',
      available: inRoom,
      run: (arg) => {
        const s = amount(arg, 5, 1, 30);
        if (!need().stall(s * 1000)) throw new Error('no video in the room');
        return `my video stuck for ${s} s`;
      },
    },
    {
      id: 'video.adFilm',
      title: 'Video: a film page with a pre-roll ad',
      help: `Queues the harness film page ${FILM_AD_URL} (scripts/harness/embed/film-server.mjs with FILM_AD), played with the extension.`,
      tab: 'video',
      where: 'local server only',
      available: () => (!local() ? 'local server only (the harness film page)' : inRoom()),
      run: () => {
        need().addLink(FILM_AD_URL);
        return 'film page with an ad queued';
      },
    },
  ];
  return {
    commands,
    status: (): [string, string][] => {
      const handles = lab();
      if (!handles) return [];
      const lines: [string, string][] = [['Transport', handles.transport() ?? 'connecting…']];
      if (handles.forcedHttp()) lines.push(['Forced', 'HTTP fallback']);
      if (handles.latencyMs()) lines.push(['Lab latency', `${handles.latencyMs()} ms each way`]);
      return lines;
    },
    /** The lab goes off: nothing of it stays (no latency, no forced fallback). */
    close(): void {
      const handles = lab();
      if (!handles) return;
      handles.latency(0);
      if (handles.forcedHttp()) handles.forceHttp(false);
    },
  };
}
