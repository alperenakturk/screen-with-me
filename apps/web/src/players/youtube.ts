import type { PlayerAdapter, PlayerEvent } from '@swm/shared/player';

let apiReady: Promise<void> | null = null;

/** YouTube'un resmi oynatıcı API'sini bir kez yükler. Odaya girerken önden çağrılır, ilk video hızlı açılsın. */
export function loadYouTubeApi(): Promise<void> {
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

/** Oynat dedikten sonra en fazla bu kadar "engellendi" haberi beklenir. */
const PLAY_CONFIRM_MS = 5000;

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
    // Oynatıcıdan en son ne istendi: oynamak mı, durmak mı?
    // YouTube "oynat"tan sonra bir süre yükleniyor (UNSTARTED/BUFFERING) durumunda
    // kalır. Bu arada videonun oynuyor mu duraklatılmış mı sayılacağına bu karar verir:
    // - Biz oynat dediysek yükleme "oynuyor" sayılır; motor tekrar tekrar oynat demez.
    // - Kullanıcı duraklatmışken başlayan yükleme (örn. ileri sarma) "duraklatılmış" sayılır.
    let wantsToPlay = false;
    let onBlocked: (() => void) | null = null;

    const player: YT.Player = new YT.Player(host, {
      videoId,
      width: '100%',
      height: '100%',
      // fs: 0 → YouTube'un kendi tam ekran butonu gizlenir. Onun tam ekranında
      // bizim emojilerimiz ve kontrollerimiz görünmez; herkes bizimkini kullansın.
      playerVars: { playsinline: 1, rel: 0, fs: 0 },
      events: {
        onReady: () => resolve(adapter),
        onStateChange: (event) => {
          if (event.data === YT.PlayerState.PLAYING) {
            wantsToPlay = true;
            emit('play');
          } else if (event.data === YT.PlayerState.PAUSED) {
            wantsToPlay = false;
            emit('pause');
          } else if (event.data === YT.PlayerState.ENDED) {
            wantsToPlay = false;
          }
        },
        onPlaybackRateChange: () => emit('ratechange'),
        onError: (event) => onError(event.data),
        // Tarayıcı sesli otomatik oynatmayı gerçekten engellediğinde YouTube bunu söyler.
        onAutoplayBlocked: () => {
          wantsToPlay = false;
          onBlocked?.();
        },
      } as YT.Events,
    });

    const state = () => player.getPlayerState();

    const adapter: PlayerAdapter = {
      fineRate: false,
      getTime: () => player.getCurrentTime(),
      getDuration: () => player.getDuration() || 0,
      isPaused: () => {
        const current = state();
        if (current === YT.PlayerState.PLAYING) return false;
        if (current === YT.PlayerState.PAUSED || current === YT.PlayerState.ENDED) return true;
        return !wantsToPlay;
      },
      isEnded: () => state() === YT.PlayerState.ENDED,
      getRate: () => player.getPlaybackRate(),
      play() {
        wantsToPlay = true;
        player.playVideo();
        // Sadece YouTube "engellendi" derse engellenmiş sayılır. Yükleme uzun sürse
        // bile yanlış alarm verilmez; video başlayınca ya da süre dolunca 'ok' döner.
        return new Promise((done) => {
          const started = Date.now();
          const finish = (result: 'ok' | 'blocked') => {
            clearInterval(timer);
            onBlocked = null;
            done(result);
          };
          onBlocked = () => finish('blocked');
          const timer = setInterval(() => {
            if (state() === YT.PlayerState.PLAYING || Date.now() - started > PLAY_CONFIRM_MS) finish('ok');
          }, 200);
        });
      },
      pause: () => {
        wantsToPlay = false;
        player.pauseVideo();
      },
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
