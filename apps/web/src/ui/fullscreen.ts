import { cleanChatText, type ClientMessage } from '@swm/shared/protocol';
import type { PlayerAdapter } from '@swm/shared/player';
import { formatTime } from '../media-info.ts';
import { t } from '../i18n.ts';
import { load, postToExtension, save } from '../storage.ts';
import { setIcon } from './icons.ts';
import { isTyping } from './reactions.ts';

/** Tam ekrandaki hızlı mesaj kutusu kısa mesajlar içindir. */
export const QUICK_CHAT_MAX = 120;
/** Fare bu kadar süre hareketsiz kalınca kontroller gizlenir. */
const IDLE_MS = 2500;

interface FullscreenOptions {
  /**
   * Film sayfasının üstündeki katmandayız (kabuk): tarayıcının tam ekranı film sayfasının tamamına
   * uygulanır (video ve katman birlikte), oda kendi tam ekran görünümüne geçer (`fake-fs`).
   */
  shell?: boolean;
  /** Is our bar this player's remote (Shorts, the sync test; also in the window)? Otherwise the dock (option A). */
  ownControls?: () => boolean;
  /** Fullscreen started / ended. */
  onActive?: (on: boolean) => void;
  /** Is the video landscape (a phone turns sideways for it in fullscreen; not for Shorts)? */
  landscape?: () => boolean;
  theater: HTMLElement;
  getPlayer: () => PlayerAdapter | null;
  send: (message: ClientMessage) => void;
  onSkip: () => void;
  onRate: (rate: number) => void;
}

/**
 * Kendi tam ekran modumuz: ekranda sadece video kalır. Fare oynayınca altta
 * oynat/durdur, ilerleme çubuğu, emojiler, hızlı mesaj, sonraki video ve hız
 * belirir; hareketsiz kalınca kaybolur (fare imleci de gizlenir).
 *
 * YouTube iframe'i fare hareketlerini sayfaya iletmediği için tam ekranda
 * videonun üstüne görünmez bir katman (catcher) konur: hareketi o yakalar,
 * tek tık oynat/durdur, çift tık tam ekrandan çıkış yapar.
 */
export function createFullscreen({ shell = false, ownControls = () => true, onActive, landscape = () => true, theater, getPlayer, send, onSkip, onRate }: FullscreenOptions) {
  const q = <T extends HTMLElement>(selector: string) => theater.querySelector<T>(selector)!;
  const catcher = q('#fs-catcher');
  const controls = q('#fs-controls');
  const seek = q<HTMLInputElement>('#fs-seek');
  const time = q('#fs-time');
  const playButton = q<HTMLButtonElement>('#fs-play');
  const skipButton = q<HTMLButtonElement>('#fs-skip');
  const speed = q<HTMLSelectElement>('#fs-speed');
  const exitButton = q<HTMLButtonElement>('#fs-exit');
  const chatForm = q<HTMLFormElement>('#fs-chat');
  const chatInput = q<HTMLInputElement>('#fs-chat-input');
  chatInput.maxLength = QUICK_CHAT_MAX;
  const volumeBox = q('#fs-volume-box');
  const volume = q<HTMLInputElement>('#fs-volume');
  const muteButton = q<HTMLButtonElement>('#fs-mute');
  const ccButton = q<HTMLButtonElement>('#fs-cc');
  const enterButton = q<HTMLButtonElement>('#fs-enter');
  const wrap = q('.player-wrap');
  // Option A (owner's choice, 0.9.91.1): players with their own controls (YouTube, video files, the film page) keep
  // them in fullscreen too; our buttons are a vertical dock on the right edge (talk · together · watch), so the two
  // never overlap and the film is never made smaller. Each button has a line icon and a name with its shortcut.
  const dock = q('#fs-dock');
  const dockChat = q<HTMLButtonElement>('#dock-chat');
  const dockReact = q<HTMLButtonElement>('#dock-react');
  const dockSpeed = q<HTMLButtonElement>('#dock-speed');
  const dockSkip = q<HTMLButtonElement>('#dock-skip');
  const dockExit = q<HTMLButtonElement>('#dock-exit');
  const dockChatForm = q<HTMLFormElement>('#dock-chat-form');
  const dockChatInput = q<HTMLInputElement>('#dock-chat-input');
  dockChatInput.maxLength = QUICK_CHAT_MAX;
  const pops = new Map<HTMLButtonElement, HTMLElement>([
    [dockChat, dockChatForm],
    [dockReact, q('#dock-react-pop')],
    [dockSpeed, q('#dock-speed-pop')],
  ]);
  setIcon(dockChat, 'chat');
  setIcon(dockReact, 'smile');
  setIcon(q('#dock-pin'), 'pin');
  setIcon(dockSkip, 'skip');
  setIcon(dockExit, 'fs-exit');

  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let progressTimer: ReturnType<typeof setInterval> | null = null;
  let seeking = false;
  let hoveringControls = false;

  let fake = false;
  /**
   * The room's own fullscreen without the browser's (iPhone has no fullscreen for page elements, 0.9.91.2): the theater
   * covers the window (`.pseudo-fs`); in the shell `fake` is the film page's fullscreen instead.
   */
  const isActive = () => fake || document.fullscreenElement === theater;
  /**
   * The site plays this video itself (YouTube / video file / sync test; not the film page): our bar is its only
   * remote, also in the normal (windowed) view, shown while the mouse is over the video (0.9.90.1).
   */
  let own = false;
  const shown = () => isActive() || own;
  /** Fullscreen with a player that keeps its own controls: the dock instead of our bar. */
  function renderDock(): void {
    const docked = isActive() && !own;
    theater.classList.toggle('dock-mode', docked);
    if (!docked) openPop(null);
  }
  let openButton: HTMLButtonElement | null = null;
  /** One small window next to the dock at a time (message box, emojis, speed), lined up with its button. */
  function openPop(button: HTMLButtonElement | null): void {
    openButton = button;
    for (const [b, pop] of pops) {
      const open = b === button;
      pop.hidden = !open;
      b.setAttribute('aria-expanded', String(open));
      b.classList.toggle('on', open);
      if (open) pop.style.top = `${Math.max(0, b.offsetTop + b.offsetHeight / 2 - pop.offsetHeight / 2)}px`;
    }
    if (button === dockChat) dockChatInput.focus();
    else if (document.activeElement === dockChatInput) dockChatInput.blur();
  }
  const dockLabels = () => {
    const label = (b: HTMLElement, text: string) => {
      b.title = text;
      b.setAttribute('aria-label', text);
    };
    dock.setAttribute('aria-label', t('dock.label'));
    label(dockChat, t('dock.chat'));
    label(dockReact, t('dock.react'));
    label(q('#dock-pin'), t('dock.pin'));
    label(dockSpeed, t('speed'));
    label(dockSkip, t('skip'));
    label(dockExit, t('dock.exit'));
  };
  dockLabels();
  addEventListener('langchange', dockLabels);
  for (const [button] of pops) button.addEventListener('click', () => openPop(openButton === button ? null : button));
  for (const option of dock.querySelectorAll<HTMLButtonElement>('.dock-speed-opt')) {
    option.addEventListener('click', () => {
      onRate(Number(option.dataset.rate));
      openPop(null);
    });
  }
  dockSkip.addEventListener('click', onSkip);
  dockExit.addEventListener('click', () => exit());
  dockChatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = cleanChatText(dockChatInput.value.slice(0, QUICK_CHAT_MAX));
    if (text !== null) send({ t: 'chat', text });
    dockChatInput.value = '';
    openPop(null);
    wake();
  });
  dockChatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') openPop(null);
  });
  // A click anywhere else or Esc closes the open window (pressing inside it, e.g. several emojis, keeps it).
  document.addEventListener('pointerdown', (event) => {
    if (openButton && !dock.contains(event.target as Node)) openPop(null);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (openButton) openPop(null);
    // Our own fullscreen has no browser to leave it with Esc.
    else if (fake && !shell && !document.querySelector('.dialog-backdrop:not([hidden])')) exit();
  });
  dock.addEventListener('mouseenter', () => (hoveringControls = true));
  dock.addEventListener('mouseleave', () => (hoveringControls = false));

  // Volume is mine only (never sent to the room) and remembered in this browser.
  let wantVolume = Math.min(100, Math.max(1, Number(load('opt:volume') ?? '100') || 100));
  let wantMuted = load('opt:muted') === '1';
  function applyVolume(player: PlayerAdapter): void {
    player.setVolume?.(wantVolume / 100);
    player.setMuted?.(wantMuted);
  }
  /** Volume of the film page's player: it keeps its own level (per site), we only show and change it. */
  function readVolume(player: PlayerAdapter): void {
    if (own || !player.getVolume || document.activeElement === volume) return;
    wantVolume = Math.round(player.getVolume() * 100);
    wantMuted = player.isMuted?.() ?? false;
    renderVolume();
  }
  const hasVolume = (player: PlayerAdapter | null) =>
    !!player?.setVolume && (!('hasVolume' in player) || (player.hasVolume as () => boolean)());
  /** Saved for the site's own players only (the film page's level belongs to that site). */
  function saveVolume(): void {
    if (!own) return;
    save('opt:volume', String(wantVolume));
    save('opt:muted', wantMuted ? '1' : '0');
  }
  function renderVolume(): void {
    volume.value = String(wantMuted ? 0 : wantVolume);
    muteButton.textContent = wantMuted || wantVolume === 0 ? '🔇' : wantVolume < 50 ? '🔉' : '🔊';
  }
  let lastPlayer: PlayerAdapter | null = null;
  /** A new video opened (or closed): which remote and which buttons it has. */
  function checkPlayer(): void {
    const player = getPlayer();
    if (player === lastPlayer) return;
    lastPlayer = player;
    own = !!player && ownControls();
    theater.classList.toggle('own-controls', own);
    renderDock();
    volumeBox.hidden = !hasVolume(player);
    if (player && own) applyVolume(player);
    renderVolume();
    if (own && !isActive()) theater.classList.add('idle');
    if (shown()) startProgress();
    else stopProgress();
  }
  setInterval(checkPlayer, 300);
  function startProgress(): void {
    renderProgress();
    progressTimer ??= setInterval(renderProgress, 250);
  }
  function stopProgress(): void {
    if (progressTimer !== null) clearInterval(progressTimer);
    progressTimer = null;
  }

  /** Kabukta: oda tam ekran görünümüne geçer/çıkar; eklenti film sayfasını tam ekran yapar. */
  function setFake(on: boolean, tellExtension: boolean): void {
    if (fake === on) return;
    fake = on;
    theater.classList.toggle('fake-fs', on);
    if (!shell) {
      theater.classList.toggle('pseudo-fs', on);
      document.documentElement.classList.toggle('pseudo-fs', on);
    }
    onActiveChange();
    if (tellExtension) postToExtension({ type: 'fullscreen', on });
  }
  /** A phone held upright turns sideways for a landscape video (Android; iPhone ignores it, the person rotates). */
  const touch = matchMedia('(pointer: coarse)');
  function turnSideways(on: boolean): void {
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    if (!touch.matches || !orientation) return;
    if (on && landscape()) orientation.lock?.('landscape').catch(() => {});
    else if (!on) orientation.unlock?.();
  }
  // Turning the phone sideways while a video plays opens our fullscreen (no browser fullscreen without a tap, so the
  // room's own); upright again closes it, if it was opened this way (setting "Yan çevirince tam ekran").
  const sideways = matchMedia('(orientation: landscape)');
  let byTurning = false;
  sideways.addEventListener('change', () => {
    if (shell || !touch.matches || load('opt:rotateFs') === '0') return;
    if (sideways.matches && !isActive() && getPlayer() && landscape() && !document.querySelector('#game-stage:not([hidden])')) {
      byTurning = true;
      setFake(true, false);
    } else if (!sideways.matches && byTurning && fake) setFake(false, false);
  });
  function enter(): void {
    if (shell) return setFake(true, true);
    if (typeof theater.requestFullscreen !== 'function') return setFake(true, false);
    theater.requestFullscreen().then(
      () => turnSideways(true),
      () => setFake(true, false),
    );
  }
  function exit(): void {
    byTurning = false;
    if (shell) setFake(false, true);
    else if (fake) setFake(false, false);
    else {
      turnSideways(false);
      void document.exitFullscreen().catch(() => {});
    }
  }

  function wake(): void {
    theater.classList.remove('idle');
    if (idleTimer !== null) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      // Yazı yazarken ya da kontrollerin üstündeyken gizleme. Kabukta fare film sayfasında oynayınca eklenti
      // haber verir (poke). "Video kontrollerin üstünde" seçiliyse çubuğun kendi yeri var: hep görünür.
      if (hoveringControls || openButton || document.activeElement === chatInput || seeking) wake();
      // In the window a paused video keeps its bar while the mouse is on it (like YouTube).
      else if (own && !isActive() && over && getPlayer()?.isPaused()) wake();
      else theater.classList.add('idle');
    }, IDLE_MS);
  }

  function renderProgress(): void {
    const player = getPlayer();
    const duration = player?.getDuration() ?? 0;
    const current = player?.getTime() ?? 0;
    if (!seeking) seek.value = duration > 0 ? String(Math.round((current / duration) * 1000)) : '0';
    const at = seeking && duration > 0 ? (Number(seek.value) / 1000) * duration : current;
    time.textContent = `${formatTime(at)} / ${formatTime(duration)}`;
    playButton.textContent = player && !player.isPaused() ? '⏸' : '▶';
    volumeBox.hidden = !hasVolume(player);
    if (player) readVolume(player);
    // Captions: only when the video has them (YouTube says so once it plays).
    const cc = player?.captions?.() ?? null;
    ccButton.hidden = cc === null;
    ccButton.classList.toggle('on', cc === true);
  }

  function togglePlay(): void {
    const player = getPlayer();
    if (!player) return;
    // Oynatıcıya doğrudan komut veririz; senkron motoru bunu kullanıcı hareketi
    // olarak görür ve odaya yayar (YouTube'un kendi butonuna basmakla aynı).
    if (player.isPaused()) void player.play();
    else player.pause();
    renderProgress();
  }

  function onActiveChange(): void {
    renderDock();
    onActive?.(isActive());
    if (isActive()) {
      wake();
      startProgress();
    } else {
      if (idleTimer !== null) clearTimeout(idleTimer);
      // Back in the window: our bar waits for the mouse (only for the site's own players).
      theater.classList.toggle('idle', own);
      if (!own) stopProgress();
      chatInput.blur();
    }
  }
  document.addEventListener('fullscreenchange', () => {
    if (shell) return;
    if (!document.fullscreenElement) turnSideways(false);
    onActiveChange();
  });

  for (const type of ['mousemove', 'mousedown', 'touchstart'] as const) {
    theater.addEventListener(type, () => isActive() && wake(), { passive: true });
    // In the window: only while the mouse is on the video itself.
    wrap.addEventListener(type, () => own && !isActive() && wake(), { passive: true });
  }
  let over = false;
  wrap.addEventListener('mouseenter', () => (over = true));
  // Leaving the video hides our bar at once in the window (YouTube's used to linger for seconds).
  wrap.addEventListener('mouseleave', () => {
    over = false;
    if (!own || isActive() || seeking || document.activeElement === volume) return;
    if (idleTimer !== null) clearTimeout(idleTimer);
    theater.classList.add('idle');
  });
  controls.addEventListener('mouseenter', () => (hoveringControls = true));
  controls.addEventListener('mouseleave', () => (hoveringControls = false));

  // Çift tıkta iki kez oynat/durdur olmasın diye tek tık biraz beklenir.
  let clickTimer: ReturnType<typeof setTimeout> | null = null;
  catcher.addEventListener('click', () => {
    if (clickTimer !== null) return;
    clickTimer = setTimeout(() => {
      clickTimer = null;
      togglePlay();
    }, 220);
  });
  catcher.addEventListener('dblclick', () => {
    if (clickTimer !== null) clearTimeout(clickTimer);
    clickTimer = null;
    // Double click: out of fullscreen, or (in the window) into it, like on YouTube.
    if (isActive()) exit();
    else toggle();
  });
  enterButton.addEventListener('click', () => toggle());
  volume.addEventListener('input', () => {
    const value = Number(volume.value);
    // Sliding to 0 = muted; the last real level is kept for unmuting.
    wantMuted = value === 0;
    if (value > 0) wantVolume = value;
    const player = getPlayer();
    if (player) applyVolume(player);
    muteButton.textContent = wantMuted ? '🔇' : wantVolume < 50 ? '🔉' : '🔊';
  });
  volume.addEventListener('change', saveVolume);
  muteButton.addEventListener('click', () => {
    wantMuted = !wantMuted;
    if (!wantMuted && wantVolume === 0) wantVolume = 50;
    saveVolume();
    const player = getPlayer();
    if (player) applyVolume(player);
    renderVolume();
  });
  ccButton.addEventListener('click', () => {
    const player = getPlayer();
    const on = player?.captions?.();
    if (on === null || on === undefined) return;
    player!.setCaptions?.(!on);
    renderProgress();
  });
  playButton.addEventListener('click', togglePlay);
  skipButton.addEventListener('click', onSkip);
  exitButton.addEventListener('click', exit);
  speed.addEventListener('change', () => onRate(Number(speed.value)));

  seek.addEventListener('input', () => {
    seeking = true;
    renderProgress();
  });
  seek.addEventListener('change', () => {
    const player = getPlayer();
    const duration = player?.getDuration() ?? 0;
    // Sarma da doğrudan oynatıcıya yapılır; motor zamandaki sıçramayı görüp odaya yayar.
    if (player && duration > 0) player.seek((Number(seek.value) / 1000) * duration);
    seeking = false;
    renderProgress();
  });

  // Klavye: boşluk oynat/durdur, Enter hızlı mesaja odaklanır. Bir kutuya yazarken (hızlı mesaj, pin notu) değil:
  // pin notunda boşluk herkes için oynat/durdur yapıyordu.
  document.addEventListener('keydown', (event) => {
    if (!isActive() || isTyping(event.target)) return;
    if (event.key === ' ' || event.key === 'k') {
      event.preventDefault();
      togglePlay();
      wake();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      wake();
      if (theater.classList.contains('dock-mode')) openPop(dockChat);
      else chatInput.focus();
    }
  });

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = cleanChatText(chatInput.value.slice(0, QUICK_CHAT_MAX));
    if (text !== null) send({ t: 'chat', text });
    chatInput.value = '';
    chatInput.blur();
    wake();
  });
  chatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') chatInput.blur();
  });

  function toggle(): void {
    if (isActive()) exit();
    else enter();
  }

  return {
    isActive,
    /** Başka yerden gelen hareket (film sayfasında fare oynadı): kontroller belirsin. */
    poke(): void {
      if (isActive()) wake();
    },
    toggle,
    /** Kabukta film sayfasının tam ekranı bitti/başladı (Esc vb.): görünüm de uysun. */
    syncShell(on: boolean): void {
      setFake(on, false);
    },
    setRate(rate: number): void {
      speed.value = String(rate);
      dockSpeed.textContent = `${rate}×`;
      for (const option of dock.querySelectorAll<HTMLElement>('.dock-speed-opt')) option.classList.toggle('on', Number(option.dataset.rate) === rate);
    },
    setSkipEnabled(enabled: boolean): void {
      skipButton.disabled = !enabled;
      dockSkip.disabled = !enabled;
    },
  };
}
