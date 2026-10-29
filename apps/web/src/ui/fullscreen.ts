import { cleanChatText, type ClientMessage } from '@swm/shared/protocol';
import type { PlayerAdapter } from '@swm/shared/player';
import { formatTime } from '../media-info.ts';
import { load, postToExtension, save } from '../storage.ts';
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
  /** Kabukta: kontroller hiç kaybolmasın mı ("video kontrollerin üstünde" seçeneği). */
  keepControls?: () => boolean;
  /** Is the current player one the site plays itself (our bar is its only remote, also in the window)? */
  ownControls?: () => boolean;
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
export function createFullscreen({ shell = false, keepControls = () => false, ownControls = () => true, theater, getPlayer, send, onSkip, onRate }: FullscreenOptions) {
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

  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let progressTimer: ReturnType<typeof setInterval> | null = null;
  let seeking = false;
  let hoveringControls = false;

  let fake = false;
  const isActive = () => (shell ? fake : document.fullscreenElement === theater);
  /**
   * The site plays this video itself (YouTube / video file / sync test; not the film page): our bar is its only
   * remote, also in the normal (windowed) view, shown while the mouse is over the video (0.9.90.1).
   */
  let own = false;
  const shown = () => isActive() || own;

  // Volume is mine only (never sent to the room) and remembered in this browser.
  let wantVolume = Math.min(100, Math.max(1, Number(load('opt:volume') ?? '100') || 100));
  let wantMuted = load('opt:muted') === '1';
  function applyVolume(player: PlayerAdapter): void {
    player.setVolume?.(wantVolume / 100);
    player.setMuted?.(wantMuted);
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
    volumeBox.hidden = !player?.setVolume;
    if (player) applyVolume(player);
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
    onActiveChange();
    if (tellExtension) postToExtension({ type: 'fullscreen', on });
  }
  const exit = () => (shell ? setFake(false, true) : void document.exitFullscreen());

  function wake(): void {
    theater.classList.remove('idle');
    if (idleTimer !== null) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      // Yazı yazarken ya da kontrollerin üstündeyken gizleme. Kabukta fare film sayfasında oynayınca eklenti
      // haber verir (poke). "Video kontrollerin üstünde" seçiliyse çubuğun kendi yeri var: hep görünür.
      if (hoveringControls || document.activeElement === chatInput || seeking || (shell && keepControls())) wake();
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
    if (!shell) onActiveChange();
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
  volume.addEventListener('change', () => {
    save('opt:volume', String(wantVolume));
    save('opt:muted', wantMuted ? '1' : '0');
  });
  muteButton.addEventListener('click', () => {
    wantMuted = !wantMuted;
    if (!wantMuted && wantVolume === 0) wantVolume = 50;
    save('opt:volume', String(wantVolume));
    save('opt:muted', wantMuted ? '1' : '0');
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
      chatInput.focus();
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
    if (shell) setFake(!fake, true);
    else if (isActive()) void document.exitFullscreen();
    else void theater.requestFullscreen();
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
    },
    setSkipEnabled(enabled: boolean): void {
      skipButton.disabled = !enabled;
    },
  };
}
