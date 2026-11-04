import { LIVE_MAX_VIEWERS, type ClientMessage, type LiveKind, type Member, type Signal } from '@swm/shared/protocol';
import type { LiveP2p, LiveQuality } from '@swm/shared/live-p2p';
import { t } from '../i18n.ts';
import { load, save } from '../storage.ts';
import { flashHint } from './hint.ts';
import type { IpNoticeKind } from './ip-notice.ts';
import type { Composed } from './live-compose.ts';
import { setIcon } from './icons.ts';
import { openCam } from './voice-devices.ts';
import { debugHooks } from '../debug-lab.ts';
import { whenIdle } from './idle.ts';

type Engine = typeof import('./live-engine.ts');
const ipNotice = (kind: IpNoticeKind) => import('./ip-notice.ts').then((m) => m.confirmIpNotice(kind, []));
/** Can the browser draw my camera into the screen's corner (`live-compose.ts`; checked here so the card needs no chunk)? */
const scope = globalThis as { MediaStreamTrackProcessor?: unknown; MediaStreamTrackGenerator?: unknown };
const composeSupported = typeof scope.MediaStreamTrackProcessor === 'function' && typeof scope.MediaStreamTrackGenerator === 'function' && typeof OffscreenCanvas === 'function';

/**
 * Yayın kartı (sağ panelde, sesli sohbetin altında) ve yayın penceresi (videonun köşesinde, büyütülebilir).
 * Odada aynı anda tek yayın: ekran/pencere/sekme paylaşımı ya da kamera; en fazla LIVE_MAX_VIEWERS kişi izler (sınır hep
 * görünür, dolunca düğme soluk ve nedeni). Kimse kendiliğinden izlemez: "▶ İzle"ye basan izler (trafik harcamasın).
 * Film yayınlamak için değil (paylaşılan şey eşitlenmiş film değil, canlı görüntü); film sayfasında (kabuk) yayın
 * açılamaz, izlenebilir.
 *
 * Ekran paylaşımında kalite seçilir (yazı net / akıcı; yayın sürerken de değişir, tarayıcıda hatırlanır). Yönetici
 * yayını herkes için durdurabilir ve "yayını sadece yönetici açsın" diyebilir (`settings.liveHostOnly`).
 */
export function createLive(
  root: HTMLElement,
  send: (message: ClientMessage) => void,
  myId: () => string | null,
  isShell: boolean,
  isHost: () => boolean,
) {
  const card = root.querySelector<HTMLElement>('#live-card')!;
  const screenButton = root.querySelector<HTMLButtonElement>('#live-screen')!;
  // 0.9.90.8 (owner): no separate camera stream any more (voice has cameras); a screen stream can show my camera in
  // its corner instead. Remembered in this browser.
  const withCamRow = root.querySelector<HTMLElement>('#live-with-cam-row')!;
  const withCamBox = root.querySelector<HTMLInputElement>('#live-with-cam')!;
  // Line icons in the menu (0.9.91.5, owner: nicer than the emojis): share = the screen, the corner camera = the camera.
  setIcon(screenButton.querySelector('.live-menu-icon')!, 'screen');
  setIcon(withCamRow.querySelector('.live-menu-icon')!, 'cam');
  withCamBox.checked = load('opt:liveCam') === '1';
  withCamBox.addEventListener('change', () => save('opt:liveCam', withCamBox.checked ? '1' : '0'));
  const watchButton = root.querySelector<HTMLButtonElement>('#live-watch')!;
  const stopButton = root.querySelector<HTMLButtonElement>('#live-stop')!;
  const status = root.querySelector<HTMLElement>('#live-status')!;
  const limit = root.querySelector<HTMLElement>('#live-limit')!;
  const win = root.querySelector<HTMLElement>('#live-window')!;
  const video = root.querySelector<HTMLVideoElement>('#live-video')!;
  const title = root.querySelector<HTMLElement>('#live-title')!;
  const bigButton = root.querySelector<HTMLButtonElement>('#live-big')!;
  const closeButton = root.querySelector<HTMLButtonElement>('#live-close')!;
  const killButton = root.querySelector<HTMLButtonElement>('#live-kill')!;
  const hideSelfButton = root.querySelector<HTMLButtonElement>('#live-hide-self')!;
  const previewButton = root.querySelector<HTMLButtonElement>('#live-preview')!;
  // 0.9.91.15 (owner): the streamer doesn't have to watch their own screen; remembered in this browser.
  let selfHidden = load('opt:liveSelfHidden') === '1';
  const qualityRow = root.querySelector<HTMLElement>('#live-quality-row')!;
  const qualitySelect = root.querySelector<HTMLSelectElement>('#live-quality')!;
  // Boştayken tek "🖥️ Paylaş ▾" düğmesi: basınca ekran / kamera seçenekleri ve sınır notu küçük menüde.
  const shareWrap = root.querySelector<HTMLElement>('#live-share-wrap')!;
  const shareButton = root.querySelector<HTMLButtonElement>('#live-share')!;
  setIcon(shareButton, 'screen');
  const menu = root.querySelector<HTMLElement>('#live-menu')!;
  const menuNote = root.querySelector<HTMLElement>('#live-menu-note')!;
  const row = root.querySelector<HTMLElement>('#live-row')!;
  const setMenu = (open: boolean) => {
    menu.hidden = !open;
    shareButton.setAttribute('aria-expanded', String(open));
  };
  const savedQuality = load('opt:liveQuality');
  qualitySelect.value = savedQuality === 'text' ? 'text' : 'motion';
  const quality = (): LiveQuality => (qualitySelect.value === 'text' ? 'text' : 'motion');
  /** Yayını sadece yönetici açabilir. */
  let hostOnly = false;

  let available = false;
  let members: Member[] = [];
  let incoming: MediaStream | null = null;
  // Telefonda ekran paylaşımı yok (mobil tarayıcıda getDisplayMedia yok); izlemek olur.
  const canShare = !isShell && typeof navigator.mediaDevices?.getDisplayMedia === 'function';
  const canCamera = !isShell && typeof navigator.mediaDevices?.getUserMedia === 'function' && composeSupported;
  /** The running "screen + my camera" picture (its camera and screen are stopped when the stream ends). */
  let composed: Composed | null = null;

  let toldBlocked = false;
  /** My member id at the last welcome (a reconnect with the same id keeps the stream). */
  let lastId: string | null = null;
  /**
   * Card SZ: the stream itself (`live-engine.ts`) is a lazy chunk, made the first time it is needed: someone streams, the
   * Share button is hovered or focused, a press. Until then nobody streams to or from me, so "not streaming, not watching".
   */
  let engine: Engine | null = null;
  let live: LiveP2p | null = null;
  let float: ReturnType<Engine['createLiveFloat']> | null = null;
  let loading: Promise<LiveP2p> | null = null;
  function ensure(): Promise<LiveP2p> {
    loading ??= import('./live-engine.ts').then(
      (m) => {
        engine = m;
        float = m.createLiveFloat({
          win,
          wrap: root.querySelector<HTMLElement>('.player-wrap')!,
          theater: root.querySelector<HTMLElement>('#theater')!,
          onMove: () => dispatchEvent(new Event('swm-layout')),
        });
        live = makeLive(m);
        live.sync(members, myId());
        render();
        return live;
      },
      (error: unknown) => {
        loading = null;
        throw error;
      },
    );
    return loading;
  }
  const warm = () => void ensure().catch(() => {});
  whenIdle(warm);
  for (const button of [shareButton, watchButton]) {
    button.addEventListener('pointerenter', warm, { once: true });
    button.addEventListener('focus', warm, { once: true });
    button.addEventListener('touchstart', warm, { once: true, passive: true });
  }
  const makeLive = (m: Engine) => new m.LiveP2p({
    capture: async (kind, q) => {
      const screen = await navigator.mediaDevices.getDisplayMedia(m.screenConstraints(q));
      if (kind !== 'screen' || !canCamera || !withCamBox.checked) return screen;
      // The camera is optional: if it can't open, the screen goes out alone.
      const camera = await openCam().catch(() => null);
      if (!camera) return screen;
      composed = m.composeScreenWithCamera(screen, camera);
      return composed.stream;
    },
    signal: (to, data) => send({ t: 'live-signal', to, data }),
    announce: (on, kind) => send(on && kind ? { t: 'live', on: true, kind } : { t: 'live', on: false }),
    watch: (on) => send({ t: 'live-watch', on }),
    onStream: (stream) => {
      incoming = stream;
      render();
    },
    onEnded: () => render(),
    onFailed: (memberId) => {
      const who = members.find((m) => m.id === memberId)?.name ?? '';
      flashHint(card, t('live.failed', { name: who }), 7000);
    },
    // The browser forbids direct connections (see `ice-watch.ts`): say how to fix it, once per page.
    onBlocked: () => {
      if (toldBlocked) return;
      toldBlocked = true;
      flashHint(card, t('voice.blocked'), 15000);
    },
  });
  // 🐞 Test Lab: each stream connection's state (ids shortened; read only).
  debugHooks.register('live', () => ({
    status: () => {
      const peers = live?.peerStates() ?? [];
      return [['Stream peers', peers.length ? peers.map((p) => `${p.id.slice(0, 4)} ${p.state}/${p.ice}`).join(', ') : 'none']];
    },
  }));

  function streamer(): Member | undefined {
    return members.find((m) => m.live);
  }

  function render(): void {
    const me = myId();
    const host = streamer();
    const broadcasting = live?.broadcasting ?? null;
    const watching = live?.isWatching ?? false;
    const mine = host?.id === me && broadcasting !== null;
    const viewers = members.filter((m) => m.watching).length;
    const full = viewers >= LIVE_MAX_VIEWERS;
    const idle = !host;
    const locked = hostOnly && !isHost();
    // Boşta ve paylaşamıyorsa (film sayfası, ekran paylaşımı olmayan telefon) kart hiç görünmez.
    card.hidden = !available || (idle && !canShare);
    // The stream ended (by me, the browser's "Stop sharing", the host or a reconnect): free the camera too.
    if (!broadcasting && composed) {
      composed.close();
      composed = null;
    }
    card.classList.toggle('active', !idle);
    shareWrap.hidden = !idle;
    row.hidden = idle;
    if (!idle) setMenu(false);
    screenButton.hidden = !canShare;
    withCamRow.hidden = !canShare || !canCamera;
    // Yönetici kilitlediyse düğme soluk (basınca nedeni).
    shareButton.classList.toggle('is-full', locked);
    menuNote.textContent = t('live.limitIdle', { max: LIVE_MAX_VIEWERS });
    stopButton.hidden = !mine;
    killButton.hidden = !host || mine || !isHost();
    // Kalite sadece kendi ekran yayınım sürerken (varsayılan: son seçilen).
    qualityRow.hidden = !(mine && broadcasting === 'screen');
    watchButton.hidden = !host || mine;
    watchButton.textContent = watching ? t('live.unwatch') : t('live.watch');
    watchButton.classList.toggle('primary', !watching);
    watchButton.classList.toggle('is-full', !watching && full);
    // Card R23: while streaming the status sits beside the faces in a narrow column: a short line, the full one as its title.
    status.title = '';
    if (idle) status.textContent = isShell ? t('live.shellIdle') : locked ? t('live.hostOnly') : t('live.idle');
    else {
      status.textContent = `🔴 ${mine ? t('live.youShort') : t('live.theyShort', { name: host.name })}`;
      status.title = mine ? t(host.live === 'camera' ? 'live.youCamera' : 'live.youScreen') : t(host.live === 'camera' ? 'live.theyCamera' : 'live.theyScreen', { name: host.name });
    }
    // Sınır hep görünür.
    // R23: beside the faces the count is short ("👁 2/4"); the full line is its title.
    limit.textContent = idle ? t('live.limitIdle', { max: LIVE_MAX_VIEWERS }) : `👁 ${viewers}/${LIVE_MAX_VIEWERS}`;
    limit.title = idle ? t('live.limitTitle', { max: LIVE_MAX_VIEWERS }) : `${t('live.viewers', { n: viewers, max: LIVE_MAX_VIEWERS })} · ${t('live.limitTitle', { max: LIVE_MAX_VIEWERS })}`;
    limit.classList.toggle('full', !idle && full);
    limit.classList.toggle('near', !idle && !full && LIVE_MAX_VIEWERS - viewers === 1);

    // Pencere: yayıncıya kendi önizlemesi (sessiz), izleyiciye yayın.
    const stream = mine ? (selfHidden ? null : (live?.preview ?? null)) : watching ? incoming : null;
    const shown = !!stream && win.hidden;
    win.hidden = !stream;
    hideSelfButton.hidden = !mine;
    previewButton.hidden = !mine || !selfHidden;
    if (shown) float?.apply();
    if (stream && video.srcObject !== stream) {
      video.srcObject = stream;
      video.muted = mine;
      void video.play().catch(() => {});
    }
    if (!stream) {
      video.srcObject = null;
      win.classList.remove('big');
    }
    title.textContent = host ? `🔴 ${host.name}` : '';
    win.classList.toggle('mine', mine);
  }

  async function start(kind: LiveKind, button: HTMLButtonElement): Promise<void> {
    if (streamer()) return;
    if (hostOnly && !isHost()) {
      flashHint(button, t('live.hostOnly'), 6000);
      return;
    }
    // Streams are always peer-to-peer: viewers and the streamer see each other's IP (security review 1).
    if (!(await ipNotice('stream'))) return;
    button.disabled = true;
    try {
      await (await ensure()).start(kind, quality());
    } catch (error) {
      // Kişi seçme penceresini kapattıysa sessizce vazgeç.
      const cancelled = error instanceof DOMException && error.name === 'NotAllowedError';
      if (!cancelled) flashHint(button, t('live.startFailed'), 6000);
    } finally {
      button.disabled = false;
      render();
    }
  }

  shareButton.addEventListener('click', () => {
    if (hostOnly && !isHost()) {
      flashHint(shareButton, t('live.hostOnly'), 6000);
      return;
    }
    setMenu(menu.hidden === true);
  });
  document.addEventListener('pointerdown', (event) => {
    const target = event.target as Element | null;
    if (!menu.hidden && target && !shareWrap.contains(target)) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) setMenu(false);
  });
  screenButton.addEventListener('click', () => {
    setMenu(false);
    void start('screen', shareButton);
  });
  stopButton.addEventListener('click', () => {
    live?.stop();
    render();
  });
  watchButton.addEventListener('click', () => {
    if (live?.isWatching) {
      live.stopWatching();
      render();
      return;
    }
    const viewers = members.filter((m) => m.watching).length;
    if (viewers >= LIVE_MAX_VIEWERS) {
      flashHint(watchButton, t('live.fullHint', { n: viewers, max: LIVE_MAX_VIEWERS }), 7000);
      return;
    }
    void ipNotice('watch')
      .then(async (yes) => {
        if (!yes) return;
        (await ensure()).watch();
        render();
      })
      .catch(() => flashHint(watchButton, t('live.startFailed'), 6000));
  });
  killButton.addEventListener('click', () => send({ t: 'live-stop' }));
  qualitySelect.addEventListener('change', () => {
    save('opt:liveQuality', quality());
    // With my camera in the corner the picture follows the real screen's frames: the frame rate is set there.
    if (engine) void composed?.screen.applyConstraints({ frameRate: { ideal: engine.FPS[quality()], max: engine.FPS[quality()] } }).catch(() => {});
    void live?.setQuality(quality());
  });
  bigButton.addEventListener('click', () => float?.toggleBig());
  const setSelfHidden = (hidden: boolean) => {
    selfHidden = hidden;
    save('opt:liveSelfHidden', hidden ? '1' : '0');
    render();
  };
  hideSelfButton.addEventListener('click', () => setSelfHidden(true));
  previewButton.addEventListener('click', () => setSelfHidden(false));
  closeButton.addEventListener('click', () => {
    if (live?.broadcasting) live.stop();
    else live?.stopWatching();
    render();
  });

  return {
    welcome(enabled: boolean): void {
      available = enabled;
      const id = myId();
      // Card R1: the server gave me my member id back (a deploy or a network blip closed the room connection), so the
      // direct connections are still up: keep streaming / watching and only tell the server again. With a new id the
      // server doesn't know the old one, so the stream and the watching end.
      if (live && enabled && id !== null && id === lastId && (live.broadcasting || live.isWatching)) live.resume();
      else {
        live?.stop();
        live?.stopWatching();
      }
      lastId = id;
      render();
    },
    members(next: Member[]): void {
      members = next;
      if (live) live.sync(members, myId());
      // Someone streams: get the stream's chunk now, so "▶ Watch" works at once.
      else if (next.some((m) => m.live)) warm();
      render();
    },
    signal(from: string, data: Signal): void {
      void ensure()
        .then((l) => l.receive(from, data))
        .catch(() => {});
    },
    error(code: 'live_busy' | 'live_full' | 'live_host' | 'live_stopped'): void {
      if (code === 'live_busy' || code === 'live_host' || code === 'live_stopped') {
        live?.stop();
        flashHint(card, t(code === 'live_busy' ? 'live.busy' : code === 'live_host' ? 'live.hostOnly' : 'live.stopped'), 6000);
      } else {
        live?.stopWatching();
        const viewers = members.filter((m) => m.watching).length;
        flashHint(watchButton, t('live.fullHint', { n: viewers, max: LIVE_MAX_VIEWERS }), 7000);
      }
      render();
    },
    /** Oda ayarı: yayını sadece yönetici açabilsin. */
    settings(liveHostOnly: boolean): void {
      hostOnly = liveHostOnly;
      render();
    },
    /** Sayfadan çıkarken / odadan atılınca. */
    leave(): void {
      live?.stop();
      live?.stopWatching();
    },
    relabel: render,
  };
}
