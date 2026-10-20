import { cleanChatText, type ClientMessage } from '@swm/shared/protocol';
import type { PlayerAdapter } from '@swm/shared/player';
import { formatTime } from '../media-info.ts';
import { postToExtension } from '../storage.ts';

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
export function createFullscreen({ shell = false, theater, getPlayer, send, onSkip, onRate }: FullscreenOptions) {
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

  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let progressTimer: ReturnType<typeof setInterval> | null = null;
  let seeking = false;
  let hoveringControls = false;

  let fake = false;
  const isActive = () => (shell ? fake : document.fullscreenElement === theater);

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
      // Yazı yazarken ya da kontrollerin üstündeyken gizleme.
      // Kabukta fare hareketi film sayfasına gider (görmeyiz): kontroller hep görünür kalır.
      if (hoveringControls || document.activeElement === chatInput || seeking || shell) wake();
      else theater.classList.add('idle');
    }, IDLE_MS);
  }

  function renderProgress(): void {
    const player = getPlayer();
    const duration = player?.getDuration() ?? 0;
    const current = player?.getTime() ?? 0;
    if (!seeking) seek.value = duration > 0 ? String(Math.round((current / duration) * 1000)) : '0';
    const shown = seeking && duration > 0 ? (Number(seek.value) / 1000) * duration : current;
    time.textContent = `${formatTime(shown)} / ${formatTime(duration)}`;
    playButton.textContent = player && !player.isPaused() ? '⏸' : '▶';
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
      renderProgress();
      progressTimer = setInterval(renderProgress, 250);
    } else {
      theater.classList.remove('idle');
      if (idleTimer !== null) clearTimeout(idleTimer);
      if (progressTimer !== null) clearInterval(progressTimer);
      progressTimer = null;
      chatInput.blur();
    }
  }
  document.addEventListener('fullscreenchange', () => {
    if (!shell) onActiveChange();
  });

  for (const type of ['mousemove', 'mousedown', 'touchstart'] as const) {
    theater.addEventListener(type, () => isActive() && wake(), { passive: true });
  }
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
    exit();
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

  // Klavye: boşluk oynat/durdur, Enter hızlı mesaja odaklanır.
  document.addEventListener('keydown', (event) => {
    if (!isActive() || event.target === chatInput) return;
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

  return {
    isActive,
    toggle(): void {
      if (shell) setFake(!fake, true);
      else if (isActive()) void document.exitFullscreen();
      else void theater.requestFullscreen();
    },
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
