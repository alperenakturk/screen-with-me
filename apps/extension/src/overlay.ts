import { t } from './i18n.ts';

const CSS = `
:host { all: initial; }
.root { position: fixed; pointer-events: none; z-index: 2147483647; overflow: hidden;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #fff; }
.float { position: absolute; bottom: 12%; display: flex; flex-direction: column; align-items: center;
  animation: up 2.8s ease-out forwards; }
.emoji { font-size: 40px; line-height: 1; filter: drop-shadow(0 2px 6px rgb(0 0 0 / .5)); }
.name { font-size: 12px; font-weight: 600; background: rgb(0 0 0 / .55); padding: 1px 6px; border-radius: 6px; margin-top: 2px; }
@keyframes up {
  0% { transform: translate(0, 20px) scale(.6); opacity: 0; }
  12% { transform: translate(0, 0) scale(1.1); opacity: 1; }
  75% { opacity: 1; }
  100% { transform: translate(var(--drift, 0), -220px) scale(1); opacity: 0; }
}
.toasts { position: absolute; left: 16px; bottom: 72px; display: flex; flex-direction: column; align-items: flex-start;
  gap: 6px; max-width: min(420px, 60%); }
.toast { background: rgb(0 0 0 / .72); border: 1px solid rgb(255 255 255 / .12); padding: 6px 12px; border-radius: 12px;
  font-size: 15px; overflow-wrap: anywhere; animation: in .2s ease-out; }
.toast b { color: #8f74ff; }
.toast.me b { color: #3ccf8e; }
.toast.leaving { animation: out .4s ease-in forwards; }
@keyframes in { from { opacity: 0; transform: translateY(8px); } }
@keyframes out { to { opacity: 0; transform: translateX(-12px); } }
.start { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; background: rgb(0 0 0 / .7); pointer-events: auto; font-size: 16px; text-align: center; padding: 16px; }
.start button { font: inherit; font-weight: 600; color: #fff; background: #7c5cff; border: 0; border-radius: 10px;
  padding: 12px 22px; cursor: pointer; }
`;

const MAX_FLOATS = 30;
const MAX_TOASTS = 4;
const TOAST_MS = 6000;

/**
 * Videonun tam üstüne oturan saydam katman. Sitenin CSS'inden etkilenmemek
 * için kapalı shadow DOM kullanır. Video tam ekrana alınırsa tam ekran
 * öğesinin içine taşınır (tam ekranda sadece o öğe ve içindekiler görünür).
 */
export function createOverlay() {
  let host: HTMLElement | null = null;
  let root: HTMLElement | null = null;
  let toasts: HTMLElement | null = null;
  let video: HTMLVideoElement | null = null;
  let positionTimer: ReturnType<typeof setInterval> | null = null;

  function mount(): HTMLElement {
    if (root && host?.isConnected) return root;
    host = document.createElement('swm-overlay');
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = CSS;
    root = document.createElement('div');
    root.className = 'root';
    toasts = document.createElement('div');
    toasts.className = 'toasts';
    root.append(toasts);
    shadow.append(style, root);
    place();
    positionTimer ??= setInterval(position, 500);
    return root;
  }

  /** Katmanı tam ekran öğesinin (varsa) ya da sayfanın içine koyar. */
  function place(): void {
    if (!host) return;
    const container = document.fullscreenElement ?? document.documentElement;
    // <video>'nun kendisi tam ekransa içine bir şey konamaz; o durumda sayfada kalır.
    const parent = container instanceof HTMLVideoElement ? document.documentElement : container;
    if (host.parentElement !== parent) parent.append(host);
    position();
  }

  function position(): void {
    if (!root) return;
    const rect = document.fullscreenElement || !video?.isConnected ? null : video.getBoundingClientRect();
    const box = rect ?? { left: 0, top: 0, width: innerWidth, height: innerHeight };
    Object.assign(root.style, {
      left: `${box.left}px`,
      top: `${box.top}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
    });
  }

  document.addEventListener('fullscreenchange', place);
  addEventListener('resize', position);
  addEventListener('scroll', position, { passive: true, capture: true });

  return {
    /** Katmanı bu videonun üstüne yerleştir. */
    follow(next: HTMLVideoElement): void {
      video = next;
      mount();
      position();
    },

    reaction(emoji: string, name: string): void {
      const layer = mount();
      if (layer.querySelectorAll('.float').length >= MAX_FLOATS) layer.querySelector('.float')?.remove();
      const bubble = document.createElement('div');
      bubble.className = 'float';
      bubble.style.left = `${8 + Math.random() * 80}%`;
      bubble.style.setProperty('--drift', `${(Math.random() - 0.5) * 60}px`);
      const e = document.createElement('span');
      e.className = 'emoji';
      e.textContent = emoji;
      const n = document.createElement('span');
      n.className = 'name';
      n.textContent = name;
      bubble.append(e, n);
      bubble.addEventListener('animationend', () => bubble.remove());
      layer.append(bubble);
    },

    chat(name: string, text: string, mine: boolean): void {
      mount();
      if (!toasts) return;
      while (toasts.childElementCount >= MAX_TOASTS) toasts.firstElementChild?.remove();
      const toast = document.createElement('div');
      toast.className = mine ? 'toast me' : 'toast';
      const b = document.createElement('b');
      b.textContent = name;
      toast.append(b, ' ', text);
      toasts.append(toast);
      setTimeout(() => {
        toast.classList.add('leaving');
        toast.addEventListener('animationend', () => toast.remove());
      }, TOAST_MS);
    },

    /** Tarayıcı otomatik oynatmayı engellerse videonun üstünde "İzlemeye başla" gösterir. */
    askToStart(onStart: () => void): void {
      const layer = mount();
      if (layer.querySelector('.start')) return;
      const box = document.createElement('div');
      box.className = 'start';
      const text = document.createElement('div');
      text.textContent = t('autoplayBlocked');
      const button = document.createElement('button');
      button.textContent = t('startWatching');
      button.addEventListener('click', () => {
        box.remove();
        onStart();
      });
      box.append(text, button);
      layer.append(box);
    },

    unmount(): void {
      host?.remove();
      host = root = toasts = null;
      video = null;
      if (positionTimer !== null) clearInterval(positionTimer);
      positionTimer = null;
    },
  };
}
