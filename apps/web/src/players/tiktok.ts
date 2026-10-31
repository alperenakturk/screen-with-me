import type { PlayerAdapter, PlayerEvent } from '@swm/shared/player';

/**
 * TikTok videos through TikTok's official embed player (0.9.91.18): `https://www.tiktok.com/player/v1/<id>` in an
 * iframe, driven with its postMessage API (`{ "x-tiktok-player": true, type, value }`). Host → player: `play`,
 * `pause`, `seekTo` (seconds), `mute`, `unMute`. Player → host: `onPlayerReady`, `onStateChange` (-1 init, 0 ended,
 * 1 playing, 2 paused, 3 buffering; some builds send the names), `onCurrentTime` ({ currentTime, duration }),
 * `onMute`, `onError` / `onPlayerError`. TikTok's own bar stays visible (its rules, like YouTube's). No speed
 * setting: a TikTok always plays at 1×. Commands sent before `onPlayerReady` wait for it.
 */
export const TIKTOK_ORIGIN = 'https://www.tiktok.com';
/** If the player never says it is ready, the room still goes on (commands are then sent anyway). */
const READY_TIMEOUT_MS = 8000;
/** After "play", wait this long for "playing" before telling the engine the browser blocked autoplay. */
const PLAY_CONFIRM_MS = 4000;

const PARAMS = new URLSearchParams({
  autoplay: '0',
  loop: '0',
  controls: '1',
  progress_bar: '1',
  play_button: '1',
  volume_control: '1',
  fullscreen_button: '0',
  timestamp: '1',
  music_info: '1',
  description: '1',
  rel: '0',
  native_context_menu: '0',
  closed_caption: '1',
});

type State = 'init' | 'ended' | 'playing' | 'paused' | 'buffering';

function stateOf(value: unknown): State | null {
  if (value === -1 || value === 'init' || value === 'unstarted') return 'init';
  if (value === 0 || value === 'ended') return 'ended';
  if (value === 1 || value === 'playing') return 'playing';
  if (value === 2 || value === 'paused') return 'paused';
  if (value === 3 || value === 'buffering') return 'buffering';
  return null;
}

export function createTikTokPlayer(container: HTMLElement, videoId: string, onError: (code: number) => void): Promise<PlayerAdapter> {
  const frame = document.createElement('iframe');
  frame.src = `${TIKTOK_ORIGIN}/player/v1/${encodeURIComponent(videoId)}?${PARAMS}`;
  frame.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
  frame.title = 'TikTok';
  frame.className = 'tiktok-frame';
  container.append(frame);

  const listeners = new Set<(event: PlayerEvent) => void>();
  const emit = (event: PlayerEvent) => listeners.forEach((listener) => listener(event));
  let ready = false;
  let destroyed = false;
  let state: State = 'init';
  /** Last reported position and when it came (the position moves on between reports while playing). */
  let time = 0;
  let timeAt = performance.now();
  let duration = 0;
  let muted = false;
  /** What we last asked for: loading counts as playing after our "play", as paused after our "pause". */
  let wantsToPlay = false;
  let blocked: (() => void) | null = null;
  const queued: { type: string; value?: unknown }[] = [];

  const post = (type: string, value?: unknown) => {
    if (destroyed) return;
    if (!ready) {
      queued.push({ type, value });
      return;
    }
    frame.contentWindow?.postMessage({ 'x-tiktok-player': true, type, ...(value === undefined ? {} : { value }) }, TIKTOK_ORIGIN);
  };

  return new Promise((resolve) => {
    const becomeReady = () => {
      if (ready || destroyed) return;
      ready = true;
      for (const { type, value } of queued.splice(0)) post(type, value);
      resolve(adapter);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== TIKTOK_ORIGIN || event.source !== frame.contentWindow) return;
      let data: unknown = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (typeof data !== 'object' || data === null) return;
      const { type, value } = data as { type?: unknown; value?: unknown };
      if (type === 'onPlayerReady') return becomeReady();
      if (type === 'onCurrentTime' && typeof value === 'object' && value !== null) {
        const v = value as { currentTime?: unknown; duration?: unknown };
        if (typeof v.currentTime === 'number' && Number.isFinite(v.currentTime)) {
          time = v.currentTime;
          timeAt = performance.now();
        }
        if (typeof v.duration === 'number' && Number.isFinite(v.duration) && v.duration > 0) duration = v.duration;
        return;
      }
      if (type === 'onMute') {
        muted = value === true;
        return;
      }
      if (type === 'onError' || type === 'onPlayerError') {
        // Autoplay with sound refused: the engine shows the "start watching" card instead of an error.
        if (blocked) {
          blocked();
          blocked = null;
          return;
        }
        onError(typeof value === 'number' ? value : 0);
        return;
      }
      if (type === 'onStateChange') {
        const next = stateOf(value);
        if (!next) return;
        // The time stands still while not playing: fix it where it was.
        if (state === 'playing' && next !== 'playing') {
          time = adapter.getTime();
          timeAt = performance.now();
        }
        if (next === 'playing') timeAt = performance.now();
        state = next;
        if (next === 'playing') {
          wantsToPlay = true;
          blocked = null;
          emit('play');
        } else if (next === 'paused') {
          wantsToPlay = false;
          emit('pause');
        } else if (next === 'ended') {
          wantsToPlay = false;
        }
      }
    };
    addEventListener('message', onMessage);

    const adapter: PlayerAdapter = {
      fineRate: false,
      // Seeking makes the player report state changes of its own.
      seekNoise: true,
      getTime: () => {
        const now = state === 'playing' ? time + (performance.now() - timeAt) / 1000 : time;
        return duration > 0 ? Math.min(now, duration) : now;
      },
      getDuration: () => duration,
      isPaused: () => (state === 'buffering' || state === 'init' ? !wantsToPlay : state !== 'playing'),
      isEnded: () => state === 'ended',
      getRate: () => 1,
      setRate: () => {},
      play: () =>
        new Promise((done) => {
          wantsToPlay = true;
          if (state === 'playing') return done('ok');
          const timer = setTimeout(() => {
            blocked = null;
            done(state === 'playing' || !ready ? 'ok' : 'blocked');
          }, PLAY_CONFIRM_MS);
          blocked = () => {
            clearTimeout(timer);
            wantsToPlay = false;
            done('blocked');
          };
          post('play');
        }),
      pause: () => {
        wantsToPlay = false;
        post('pause');
      },
      seek: (seconds) => {
        time = Math.max(0, seconds);
        timeAt = performance.now();
        post('seekTo', time);
      },
      onEvent: (listener) => {
        listeners.add(listener);
      },
      isMuted: () => muted,
      setMuted: (on) => {
        muted = on;
        post(on ? 'mute' : 'unMute');
      },
      destroy: () => {
        destroyed = true;
        removeEventListener('message', onMessage);
        frame.remove();
      },
    };
    setTimeout(becomeReady, READY_TIMEOUT_MS);
  });
}
