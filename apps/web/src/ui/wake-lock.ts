// PWA1 (owner, 13 Nov 2026): the screen stays on while the room's video plays, so a phone (or the installed app) does
// not dim and lock in the middle of a film. One switch, `set(playing)`, called with every playback state the room
// applies; released on pause, when nothing plays and when the room is left. The browser drops a wake lock whenever
// the page is hidden, so it is asked for again when the page comes back and the video still plays. Where the Screen
// Wake Lock API is missing (older Safari, Firefox) nothing happens.

interface Sentinel {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', fn: () => void): void;
}

export interface WakeLock {
  /** The room's video plays (true) or not. */
  set(playing: boolean): void;
  /** Leaving the room: let the screen sleep again. */
  release(): void;
  /** For the Test Lab: 'unsupported', 'off', 'asking', 'on' or 'refused'. */
  readonly state: string;
}

export function createWakeLock(): WakeLock {
  const api = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<Sentinel> } }).wakeLock;
  let want = false;
  let sentinel: Sentinel | null = null;
  let state = api ? 'off' : 'unsupported';

  function take(): void {
    if (!api || !want || sentinel || document.visibilityState !== 'visible' || state === 'asking') return;
    state = 'asking';
    api
      .request('screen')
      .then((lock) => {
        if (!want) {
          state = 'off';
          void lock.release().catch(() => {});
          return;
        }
        sentinel = lock;
        state = 'on';
        lock.addEventListener('release', () => {
          if (sentinel === lock) sentinel = null;
          if (state === 'on') state = 'off';
        });
      })
      .catch(() => {
        // Refused (battery saver, no user gesture yet, a hidden page): try again with the next state or visit.
        state = 'refused';
      });
  }
  function drop(): void {
    const lock = sentinel;
    sentinel = null;
    if (lock && !lock.released) void lock.release().catch(() => {});
    if (api) state = 'off';
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') take();
  });
  return {
    set(playing) {
      want = playing;
      if (playing) {
        if (state === 'refused') state = 'off';
        take();
      } else drop();
    },
    release() {
      want = false;
      drop();
    },
    get state() {
      return state;
    },
  };
}
