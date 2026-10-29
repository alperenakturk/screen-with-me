import type { EmbedControl, EmbedReply, EmbedStatus } from '@swm/shared/embed';
import type { PlayerAdapter } from '@swm/shared/player';
import type { ClientMessage, PlaybackState } from '@swm/shared/protocol';
import { onExtensionMessage, postToExtension } from '../storage.ts';

/**
 * Kabuk modunda film videosu: film sayfası bizim katmanımızın altında oynar, video katmandaki deliğe
 * yerleşir. Videoya site dokunamaz (başka sayfa); senkron motoru film çerçevesinde çalışır, buradan
 * sadece oda durumu ve saat gider, oradan oynatma mesajları ve videonun durumu gelir. Sitedeki tam
 * ekran kontrolleri ve pin şeridi bunu normal bir oynatıcı gibi kullanır; verdikleri komutlar film
 * videosuna uygulanır, oradaki motor da kullanıcı hareketi gibi odaya yayar.
 */
export interface ShellOptions {
  /** Film çerçevesindeki motorun odaya göndermek istediği mesaj (site kendi bağlantısından yollar). */
  onSend: (message: ClientMessage) => void;
  onKey: (key: string, up: boolean) => void;
  onFullscreen: () => void;
  /** Fare film sayfasında oynadı (tam ekran kontrolleri belirsin). */
  onActivity: () => void;
}

export interface ShellPlayer extends PlayerAdapter {
  setState(state: PlaybackState): void;
  setClock(offset: number, synced: boolean): void;
  control(control: EmbedControl): void;
  /** Can the extension hide this film player's own controls? (`undefined`: older extension, it can't.) */
  skin(): EmbedStatus['skin'];
  /** The film's volume, once the extension reports it (older extensions don't). */
  hasVolume(): boolean;
}

export function createShellPlayer(options: ShellOptions): ShellPlayer {
  let status: EmbedStatus = { time: 0, duration: 0, paused: true, rate: 1 };
  let statusAt = performance.now();

  const off = onExtensionMessage((message) => {
    if (message.type !== 'reply') return;
    const reply: EmbedReply = message.reply;
    switch (reply?.type) {
      case 'send':
        if (typeof reply.message?.t === 'string') options.onSend(reply.message);
        break;
      case 'status':
        status = reply.status;
        statusAt = performance.now();
        break;
      case 'key':
        if (typeof reply.key === 'string') options.onKey(reply.key, reply.up === true);
        break;
      case 'fullscreen':
        options.onFullscreen();
        break;
      case 'activity':
        options.onActivity();
        break;
    }
  });

  const control = (c: EmbedControl) => postToExtension({ type: 'embed', request: { type: 'control', control: c } });

  return {
    fineRate: true,
    getTime() {
      if (status.paused) return status.time;
      // Durum yarım saniyede bir gelir; arada akıcı görünsün diye ileri tahmin edilir.
      const elapsed = Math.min((performance.now() - statusAt) / 1000, 2);
      return Math.min(status.time + elapsed * status.rate, status.duration || Infinity);
    },
    getDuration: () => status.duration,
    isPaused: () => status.paused,
    isEnded: () => false,
    getRate: () => status.rate,
    async play() {
      control({ action: 'play' });
      status = { ...status, paused: false };
      statusAt = performance.now();
      return 'ok';
    },
    pause() {
      control({ action: 'pause' });
      status = { ...status, time: this.getTime(), paused: true };
    },
    seek(seconds: number) {
      control({ action: 'seek', time: seconds });
      status = { ...status, time: seconds };
      statusAt = performance.now();
    },
    setRate(rate: number) {
      control({ action: 'rate', rate });
    },
    // My volume for the film (local, the room never hears about it).
    getVolume: () => status.volume ?? 1,
    isMuted: () => status.muted ?? false,
    setVolume(volume: number) {
      status = { ...status, volume };
      control({ action: 'volume', volume, muted: status.muted ?? false });
    },
    setMuted(muted: boolean) {
      status = { ...status, muted };
      control({ action: 'volume', volume: status.volume ?? 1, muted });
    },
    skin: () => status.skin,
    hasVolume: () => typeof status.volume === 'number',
    // Motor sitede çalışmaz (film çerçevesinde çalışır); olay dinlemeye gerek yok.
    onEvent() {},
    destroy() {
      off();
    },
    setState: (state) => postToExtension({ type: 'embed', request: { type: 'state', state } }),
    setClock: (offset, synced) => postToExtension({ type: 'embed', request: { type: 'clock', offset, synced } }),
    control,
  };
}
