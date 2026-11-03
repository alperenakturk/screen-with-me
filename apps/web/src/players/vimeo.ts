import type { PlayerAdapter, PlayerEvent } from '@swm/shared/player';

/**
 * Vimeo videos through Vimeo's own embed player (card P1, `docs/internal/research/more-players.md`):
 * `https://player.vimeo.com/video/<id>?h=<hash>` in an iframe, driven with the postMessage protocol Vimeo's player.js
 * SDK speaks (we talk it directly, no third-party script). Host → player: `{ method, value? }` (`play`, `pause`,
 * `setCurrentTime` seconds, `setMuted`, `getDuration`, `addEventListener` event name). Player → host, as an object or
 * a JSON string: `{ event: 'ready' }`, `{ event, data }` for the events we asked for (`play`, `pause`, `ended`,
 * `timeupdate` / `seeked` with `{ seconds, duration }`, `error` with `{ name, message, method? }`), and
 * `{ method, value }` answers. Vimeo's own bar stays (quality, captions, its volume). Always 1×: speed only works on
 * videos from paid Vimeo accounts. `dnt=1`: Vimeo sets no tracking cookies for our viewers.
 */
export const VIMEO_ORIGIN = 'https://player.vimeo.com';
/** If the player never says it is ready, the room still goes on (commands are then sent anyway). */
const READY_TIMEOUT_MS = 8000;
/** After "play", wait this long for "play" back before telling the engine the browser blocked autoplay. */
const PLAY_CONFIRM_MS = 4000;
const EVENTS = ['play', 'pause', 'ended', 'timeupdate', 'seeked', 'error', 'volumechange'];

export function vimeoEmbedUrl(id: string, hash?: string): string {
  const params = new URLSearchParams({
    ...(hash ? { h: hash } : {}),
    dnt: '1',
    autoplay: '0',
    playsinline: '1',
    title: '0',
    byline: '0',
    portrait: '0',
    pip: '0',
  });
  return `${VIMEO_ORIGIN}/video/${encodeURIComponent(id)}?${params}`;
}

export function createVimeoPlayer(container: HTMLElement, id: string, hash: string | undefined, onError: (code: number) => void): Promise<PlayerAdapter> {
  const frame = document.createElement('iframe');
  frame.src = vimeoEmbedUrl(id, hash);
  // No "fullscreen" here: the room's own fullscreen holds the video, the chat and the rail together.
  frame.allow = 'autoplay; encrypted-media';
  frame.title = 'Vimeo';
  frame.className = 'vimeo-frame';
  container.append(frame);

  const listeners = new Set<(event: PlayerEvent) => void>();
  const emit = (event: PlayerEvent) => listeners.forEach((listener) => listener(event));
  let ready = false;
  let destroyed = false;
  let playing = false;
  let ended = false;
  /** Last reported position and when it came (the position moves on between reports while playing). */
  let time = 0;
  let timeAt = performance.now();
  let duration = 0;
  let muted = false;
  let blocked: (() => void) | null = null;
  const queued: { method: string; value?: unknown }[] = [];

  const send = (method: string, value?: unknown) =>
    frame.contentWindow?.postMessage(value === undefined ? { method } : { method, value }, VIMEO_ORIGIN);
  const post = (method: string, value?: unknown) => {
    if (destroyed) return;
    if (!ready) queued.push({ method, value });
    else send(method, value);
  };
  const setTime = (seconds: unknown, total?: unknown) => {
    if (typeof seconds === 'number' && Number.isFinite(seconds)) {
      time = seconds;
      timeAt = performance.now();
    }
    if (typeof total === 'number' && Number.isFinite(total) && total > 0) duration = total;
  };

  return new Promise((resolve) => {
    const becomeReady = () => {
      if (ready || destroyed) return;
      ready = true;
      for (const name of EVENTS) send('addEventListener', name);
      send('getDuration');
      for (const { method, value } of queued.splice(0)) send(method, value);
      resolve(adapter);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== VIMEO_ORIGIN || event.source !== frame.contentWindow) return;
      let data: unknown = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (typeof data !== 'object' || data === null) return;
      const message = data as { event?: unknown; method?: unknown; value?: unknown; data?: unknown };
      const info = (typeof message.data === 'object' && message.data !== null ? message.data : {}) as Record<string, unknown>;
      if (message.method === 'getDuration') return setTime(undefined, message.value);
      switch (message.event) {
        case 'ready':
          return becomeReady();
        case 'timeupdate':
        case 'seeked':
          return setTime(info.seconds, info.duration);
        case 'play':
          setTime(info.seconds, info.duration);
          playing = true;
          ended = false;
          blocked = null;
          return emit('play');
        case 'pause':
          // The time stands still while paused: fix it where the player says it is.
          // Always reported, also after our own "pause": the engine counts the events its commands cause.
          setTime(info.seconds, info.duration);
          playing = false;
          return emit('pause');
        case 'ended':
          setTime(info.seconds ?? duration, info.duration);
          playing = false;
          ended = true;
          return;
        case 'volumechange':
          if (typeof info.muted === 'boolean') muted = info.muted;
          else if (typeof info.volume === 'number') muted = info.volume === 0;
          return;
        case 'error':
          // A refused "play" (autoplay with sound): the engine shows the "start watching" card instead of an error.
          if (info.method === 'play' || info.name === 'NotAllowedError') {
            blocked?.();
            blocked = null;
            return;
          }
          if (info.method) return; // Another command it could not do (e.g. a seek past the end): nothing to show.
          onError(0);
          return;
      }
    };
    addEventListener('message', onMessage);

    const adapter: PlayerAdapter = {
      fineRate: false,
      // A seek gives `seeking` / `seeked`, never play / pause of its own (unlike YouTube), so a pause is sent at once
      // and a quick play right after a seek is not swallowed. The owner's real check confirms it.
      seekNoise: false,
      getTime: () => {
        const now = playing ? time + (performance.now() - timeAt) / 1000 : time;
        return duration > 0 ? Math.min(now, duration) : now;
      },
      getDuration: () => duration,
      isPaused: () => !playing,
      isEnded: () => ended,
      getRate: () => 1,
      setRate: () => {},
      play: () =>
        new Promise((done) => {
          if (playing) return done('ok');
          const timer = setTimeout(() => {
            blocked = null;
            done(playing || !ready ? 'ok' : 'blocked');
          }, PLAY_CONFIRM_MS);
          blocked = () => {
            clearTimeout(timer);
            done('blocked');
          };
          post('play');
        }),
      pause: () => {
        if (playing) time = adapter.getTime();
        playing = false;
        post('pause');
      },
      seek: (seconds) => {
        ended = false;
        time = Math.max(0, duration > 0 ? Math.min(seconds, duration) : seconds);
        timeAt = performance.now();
        post('setCurrentTime', time);
      },
      onEvent: (listener) => {
        listeners.add(listener);
      },
      isMuted: () => muted,
      setMuted: (on) => {
        muted = on;
        post('setMuted', on);
      },
      destroy: () => {
        destroyed = true;
        blocked = null;
        removeEventListener('message', onMessage);
        frame.remove();
      },
    };
    // player.js asks a frame that loaded before it listened with "ping"; we listen first, but ask anyway.
    frame.addEventListener('load', () => {
      if (!ready) send('ping');
    });
    setTimeout(becomeReady, READY_TIMEOUT_MS);
  });
}
