import type { PlayerAdapter, PlayerEvent } from '@swm/shared/player';

let apiReady: Promise<void> | null = null;

/** YouTube'un resmi oynatıcı API'sini bir kez yükler. */
function loadYouTubeApi(): Promise<void> {
  if ('YT' in window && typeof YT.Player === 'function') return Promise.resolve();
  apiReady ??= new Promise<void>((resolve, reject) => {
    const w = window as unknown as { onYouTubeIframeAPIReady?: () => void };
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => {
      apiReady = null;
      reject(new Error('YouTube API could not be loaded'));
    };
    document.head.append(script);
  });
  return apiReady;
}

const PLAY_CONFIRM_MS = 1500;

export async function createYouTubePlayer(
  container: HTMLElement,
  videoId: string,
  onError: (code: number) => void,
): Promise<PlayerAdapter> {
  await loadYouTubeApi();
  const host = document.createElement('div');
  container.append(host);
  const listeners = new Set<(event: PlayerEvent) => void>();
  const emit = (event: PlayerEvent) => listeners.forEach((listener) => listener(event));

  return new Promise((resolve) => {
    // Arabelleğe almadan (buffering) önceki son kararlı durum. YouTube "oynat"a
    // basılınca önce BUFFERING'e geçer, PLAYING olayını sonra yollar; o arada
    // video hâlâ "duraklatılmış" sayılmalı, yoksa motor bunu tuhaflık sanıp durdurur.
    let lastStable: YT.PlayerState = YT.PlayerState.UNSTARTED;

    const player: YT.Player = new YT.Player(host, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: { playsinline: 1, rel: 0 },
      events: {
        onReady: () => resolve(adapter),
        onStateChange: (event) => {
          if (event.data !== YT.PlayerState.BUFFERING) lastStable = event.data;
          if (event.data === YT.PlayerState.PLAYING) emit('play');
          else if (event.data === YT.PlayerState.PAUSED) emit('pause');
        },
        onPlaybackRateChange: () => emit('ratechange'),
        onError: (event) => onError(event.data),
      },
    });

    const state = () => player.getPlayerState();

    const adapter: PlayerAdapter = {
      fineRate: false,
      getTime: () => player.getCurrentTime(),
      // Oynarken takılma (buffering) "oynuyor" sayılır; duraklatılmışken başlayan yükleme sayılmaz.
      isPaused: () => {
        const current = state();
        if (current === YT.PlayerState.PLAYING) return false;
        if (current === YT.PlayerState.BUFFERING) return lastStable !== YT.PlayerState.PLAYING;
        return true;
      },
      isEnded: () => state() === YT.PlayerState.ENDED,
      getRate: () => player.getPlaybackRate(),
      async play() {
        player.playVideo();
        // YouTube, oynatmanın engellenip engellenmediğini söylemez; kısa süre bekleyip bakarız.
        const started = Date.now();
        while (Date.now() - started < PLAY_CONFIRM_MS) {
          await new Promise((r) => setTimeout(r, 100));
          const current = state();
          if (current === YT.PlayerState.PLAYING || current === YT.PlayerState.BUFFERING) return 'ok';
        }
        return 'blocked';
      },
      pause: () => player.pauseVideo(),
      seek: (seconds) => player.seekTo(seconds, true),
      setRate: (rate) => player.setPlaybackRate(rate),
      onEvent: (listener) => listeners.add(listener),
      destroy: () => {
        listeners.clear();
        player.destroy();
        container.replaceChildren();
      },
    };
  });
}
