import type { EmbedControl, EmbedReply, EmbedRequest, EmbedStatus, FrameVerdict } from '@swm/shared/embed';
import type { PlayerAdapter } from '@swm/shared/player';
import type { ClientMessage, PlaybackState } from '@swm/shared/protocol';

/**
 * "Film sitenin içinde": başka sitedeki film sayfası oynatıcı alanımızda (iframe) açılır.
 * O sayfanın videosuna site dokunamaz (başka köken); eklenti çerçevenin içinde senkron
 * motorunu çalıştırır, site ile mesajları köprü (site-bridge) üzerinden taşır.
 *
 * Bu dosya sitenin tarafı: çerçeveyi açar, eklentinin "sayfa açıldı" el sıkışmasını
 * bekler, olmazsa (site çerçevede açılmayı yasakladıysa) vazgeçer. Sitedeki tam ekran
 * kontrolleri ve pin şeridi bunu normal bir oynatıcı gibi kullanır; verdikleri komutlar
 * çerçevedeki videoya uygulanır, oradaki motor da kullanıcı hareketi gibi odaya yayar.
 */

/** Eklenti bu özelliği biliyor mu (eski sürümler bilmez)? */
export function canEmbed(): boolean {
  return document.documentElement.dataset.swmEmbed === '1';
}

/** Neden çerçevede izlenemedi: başlıklar yasaklıyor, sayfa açılmadı ya da kullanıcı ayrı sekmeyi seçti. */
export type EmbedFailure = Exclude<FrameVerdict, 'ok'> | 'timeout' | 'manual';

export interface EmbedOptions {
  roomId: string;
  url: string;
  title: string;
  /** Film sayfası çerçevede açıldı (eklenti içeriden haber verdi). */
  onReady: () => void;
  onBlocked: (reason: EmbedFailure) => void;
  /** Çerçevedeki motorun odaya göndermek istediği mesaj (site kendi bağlantısından yollar). */
  onSend: (message: ClientMessage) => void;
  onKey: (key: string) => void;
  onFullscreen: () => void;
}

export interface EmbedPlayer extends PlayerAdapter {
  setState(state: PlaybackState): void;
  setClock(offset: number, synced: boolean): void;
  control(control: EmbedControl): void;
}

/** Bir "try"/"blocked" cevabı bu kadar sürede gelmezse eklenti cevap vermiyor demektir. */
const ANSWER_MS = 8000;
/** Çerçeve yüklendiği halde içeriden haber gelmezse açılmamıştır (hata sayfasında eklenti çalışmaz). */
const AFTER_LOAD_MS = 3000;
/** Sayfa hiç yüklenmezse en fazla bu kadar beklenir. */
const LOAD_MS = 20_000;

let listener: ((reply: EmbedReply) => void) | null = null;

window.addEventListener('message', (event: MessageEvent) => {
  // Sadece köprüden (aynı pencere); içteki film sayfası parent'a mesaj atsa bile kabul edilmez.
  if (event.source !== window || event.origin !== location.origin) return;
  const data = event.data as { source?: string; type?: string; reply?: EmbedReply } | null;
  if (data?.source !== 'screenwithme-extension' || data.type !== 'embed' || typeof data.reply?.type !== 'string') return;
  listener?.(data.reply);
});

function request(message: EmbedRequest): void {
  window.postMessage({ source: 'screenwithme-site', type: 'embed', request: message }, location.origin);
}

export function createEmbedPlayer(slot: HTMLElement, options: EmbedOptions): EmbedPlayer {
  let status: EmbedStatus = { time: 0, duration: 0, paused: true, rate: 1 };
  let statusAt = performance.now();
  let frame: HTMLIFrameElement | null = null;
  let ready = false;
  let finished = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const wait = (ms: number) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => fail('timeout'), ms);
  };
  function fail(reason: EmbedFailure): void {
    if (ready || finished) return;
    finished = true;
    if (timer !== null) clearTimeout(timer);
    options.onBlocked(reason);
  }

  function open(): void {
    frame = document.createElement('iframe');
    frame.src = options.url;
    frame.title = options.title;
    // Otomatik oynatma izni devredilir (yoksa video sesli başlayamaz). Tam ekran izni bilerek
    // verilmez: film sitesinin ⛶ düğmesi hata alır, eklenti bunu görüp sitenin tam ekranını
    // açtırır (sohbet ve emojiler görünsün). İzin verseydik çerçevenin tam ekranı kullanıcının
    // tıklama hakkını harcardı ve site kendi tam ekranına geçemezdi.
    frame.allow = 'autoplay; encrypted-media; picture-in-picture';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.addEventListener('load', () => {
      if (!ready) wait(AFTER_LOAD_MS);
    });
    slot.append(frame);
    wait(LOAD_MS);
  }

  const self = listener = (reply: EmbedReply) => {
    switch (reply.type) {
      case 'blocked':
        fail(reply.reason);
        break;
      case 'try':
        if (!frame && !finished) open();
        break;
      case 'frame':
        if (ready || finished) break;
        ready = true;
        if (timer !== null) clearTimeout(timer);
        options.onReady();
        break;
      case 'send':
        if (typeof reply.message?.t === 'string') options.onSend(reply.message);
        break;
      case 'status':
        status = reply.status;
        statusAt = performance.now();
        break;
      case 'key':
        if (typeof reply.key === 'string') options.onKey(reply.key);
        break;
      case 'fullscreen':
        options.onFullscreen();
        break;
    }
  };
  request({ type: 'start', roomId: options.roomId, url: options.url });
  wait(ANSWER_MS);

  const control = (c: EmbedControl) => request({ type: 'control', control: c });

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
    // Motor sitede çalışmaz (çerçevede çalışır); olay dinlemeye gerek yok.
    onEvent() {},
    destroy() {
      finished = true;
      if (timer !== null) clearTimeout(timer);
      if (listener === self) listener = null;
      request({ type: 'stop' });
      frame?.remove();
      frame = null;
    },
    setState: (state) => request({ type: 'state', state }),
    setClock: (offset, synced) => request({ type: 'clock', offset, synced }),
    control,
  };
}
