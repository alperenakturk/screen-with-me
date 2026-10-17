import { CHAT_MAX_LENGTH, REACTIONS, cleanChatText, type ClientMessage } from '@swm/shared/protocol';
import { t } from './i18n.ts';
import type { ChatLine, RoomInfo } from './messages.ts';

/** Sayfa üstündeki hızlı mesaj kutusu kısa mesajlar içindir (popup ile aynı). */
const QUICK_CHAT_MAX = Math.min(120, CHAT_MAX_LENGTH);
const MAX_FLOATS = 30;
const MAX_TOASTS = 4;
const TOAST_MS = 6000;
/** Fare bu kadar hareketsiz kalınca panel butonu kaybolur. */
const IDLE_MS = 3000;

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
.root { position: fixed; pointer-events: none; z-index: 2147483647; overflow: hidden;
  font: 14px/1.4 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #ecedf1; }

/* Uçuşan emojiler */
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

/* Panel kapalıyken gelen mesajlar */
.toasts { position: absolute; left: 16px; bottom: 72px; display: flex; flex-direction: column; align-items: flex-start;
  gap: 6px; max-width: min(420px, 60%); }
.toast { background: rgb(0 0 0 / .72); border: 1px solid rgb(255 255 255 / .12); padding: 6px 12px; border-radius: 12px;
  font-size: 15px; overflow-wrap: anywhere; animation: in .2s ease-out; }
.toast b, .line b { color: #8f74ff; }
.toast.me b, .line.me b { color: #3ccf8e; }
.toast.leaving { animation: out .4s ease-in forwards; }
@keyframes in { from { opacity: 0; transform: translateY(8px); } }
@keyframes out { to { opacity: 0; transform: translateX(-12px); } }

/* Panel butonu */
.fab { position: absolute; right: 14px; bottom: 64px; pointer-events: auto; display: flex; align-items: center; gap: 6px;
  background: rgb(15 16 20 / .85); border: 1px solid rgb(255 255 255 / .18); color: #fff; border-radius: 999px;
  padding: 6px 12px 6px 6px; font: inherit; font-weight: 600; cursor: pointer; transition: opacity .25s;
  box-shadow: 0 4px 16px rgb(0 0 0 / .4); }
.fab .logo { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: #7c5cff; font-size: 10px; }
.fab .badge { background: #7c5cff; border-radius: 999px; padding: 0 6px; font-size: 11px; }
.idle .fab { opacity: 0; pointer-events: none; }

/* Panel */
.panel { position: absolute; top: 12px; right: 12px; bottom: 12px; width: min(320px, calc(100% - 24px)); pointer-events: auto;
  display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 14px;
  background: rgb(15 16 20 / .92); border: 1px solid rgb(255 255 255 / .12); box-shadow: 0 8px 30px rgb(0 0 0 / .5);
  backdrop-filter: blur(6px); }
.head { display: flex; align-items: center; gap: 8px; }
.head .title { font-weight: 700; }
.head .code { color: #9a9fad; font-size: 12px; }
.head .close { margin-left: auto; }
.members { color: #9a9fad; font-size: 12px; overflow-wrap: anywhere; }
.reactions { display: flex; flex-wrap: wrap; gap: 4px; }
.reactions button { width: 32px; height: 32px; border-radius: 999px; background: rgb(255 255 255 / .06);
  border: 1px solid rgb(255 255 255 / .14); font-size: 16px; cursor: pointer; padding: 0; }
.reactions button:hover { background: rgb(255 255 255 / .14); }
.lines { flex: 1; min-height: 60px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px; }
.line { overflow-wrap: anywhere; }
.empty { color: #9a9fad; font-size: 12px; }
form { display: flex; gap: 6px; }
input { flex: 1; min-width: 0; background: rgb(0 0 0 / .4); color: #fff; border: 1px solid rgb(255 255 255 / .2);
  border-radius: 8px; padding: 8px 10px; font: inherit; }
input:focus { outline: 2px solid #7c5cff; outline-offset: 1px; }
button.btn { background: rgb(255 255 255 / .08); color: #fff; border: 1px solid rgb(255 255 255 / .16); border-radius: 8px;
  padding: 7px 10px; font: inherit; font-weight: 600; cursor: pointer; white-space: nowrap; }
button.btn:hover:not(:disabled) { background: rgb(255 255 255 / .16); }
button.btn:disabled { opacity: .4; cursor: default; }
button.primary { background: #7c5cff; border-color: #7c5cff; }
.foot { display: flex; gap: 6px; }
.foot .btn { flex: 1; }

/* Otomatik oynatma engellenince */
.start { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; background: rgb(0 0 0 / .7); pointer-events: auto; font-size: 16px; text-align: center; padding: 16px; }
.start button { font: inherit; font-weight: 600; color: #fff; background: #7c5cff; border: 0; border-radius: 10px;
  padding: 12px 22px; cursor: pointer; }
`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}

/**
 * Videonun tam üstüne oturan saydam katman: uçuşan emojiler, köşede beliren
 * mesajlar ve fare oynayınca çıkan ScreenWithMe butonuyla açılan panel.
 * Sitenin CSS'inden etkilenmemek için kapalı shadow DOM kullanır. Video tam
 * ekrana alınırsa tam ekran öğesinin içine taşınır.
 */
export function createOverlay(send: (message: ClientMessage) => void) {
  let host: HTMLElement | null = null;
  let root: HTMLElement | null = null;
  let parts: ReturnType<typeof build> | null = null;
  let video: HTMLVideoElement | null = null;
  let positionTimer: ReturnType<typeof setInterval> | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let room: RoomInfo | null = null;
  let lines: ChatLine[] = [];
  let panelOpen = false;
  let unread = 0;
  let onNext: (() => void) | null = null;

  function build(container: HTMLElement) {
    const floats = el('div');
    const toasts = el('div', 'toasts');

    const badge = el('span', 'badge');
    badge.hidden = true;
    const fab = el('button', 'fab', el('span', 'logo', '▶'), 'ScreenWithMe', badge);
    fab.type = 'button';
    fab.addEventListener('click', () => setPanel(!panelOpen));

    const code = el('span', 'code');
    const close = el('button', 'btn close', '✕');
    close.type = 'button';
    close.title = t('close');
    close.addEventListener('click', () => setPanel(false));
    const members = el('div', 'members');

    const reactions = el('div', 'reactions');
    for (const emoji of REACTIONS) {
      const b = el('button', '', emoji);
      b.type = 'button';
      b.addEventListener('click', () => send({ t: 'react', emoji }));
      reactions.append(b);
    }

    const list = el('div', 'lines');
    const input = el('input');
    input.maxLength = QUICK_CHAT_MAX;
    input.placeholder = t('chatPlaceholder');
    input.autocomplete = 'off';
    const sendButton = el('button', 'btn primary', t('send'));
    const form = el('form', '', input, sendButton);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = cleanChatText(input.value.slice(0, QUICK_CHAT_MAX));
      if (text) send({ t: 'chat', text });
      input.value = '';
    });

    const copy = el('button', 'btn', t('copyInvite'));
    copy.type = 'button';
    copy.addEventListener('click', async () => {
      if (!room) return;
      await copyText(room.inviteUrl);
      copy.textContent = t('copied');
      setTimeout(() => (copy.textContent = t('copyInvite')), 1500);
    });
    const next = el('button', 'btn', `${t('next')} ⏭`);
    next.type = 'button';
    next.addEventListener('click', () => onNext?.());

    const panel = el(
      'div',
      'panel',
      el('div', 'head', el('span', 'title', 'ScreenWithMe'), code, close),
      members,
      reactions,
      list,
      form,
      el('div', 'foot', copy, next),
    );
    panel.hidden = true;

    container.append(floats, toasts, fab, panel);
    return { floats, toasts, fab, badge, panel, code, members, list, input, next };
  }

  function mount(): HTMLElement {
    if (root && host?.isConnected) return root;
    host = document.createElement('swm-overlay');
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = CSS;
    root = el('div', 'root');
    parts = build(root);
    shadow.append(style, root);
    // Paneldeki yazı alanına basılan tuşlar sitenin kısayollarını (boşluk = durdur vb.) tetiklemesin.
    for (const type of ['keydown', 'keyup', 'keypress'] as const) {
      host.addEventListener(type, (event) => {
        event.stopPropagation();
        if (type === 'keydown' && (event as KeyboardEvent).key === 'Escape') setPanel(false);
      });
    }
    place();
    positionTimer ??= setInterval(position, 500);
    renderRoom();
    renderLines();
    wake();
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

  /** Fare oynayınca panel butonu görünür, bir süre sonra kaybolur. */
  function wake(): void {
    if (!root) return;
    root.classList.remove('idle');
    if (idleTimer !== null) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!panelOpen) root?.classList.add('idle');
    }, IDLE_MS);
  }

  function setPanel(open: boolean): void {
    panelOpen = open;
    if (!parts) return;
    parts.panel.hidden = !open;
    parts.fab.hidden = open;
    parts.toasts.hidden = open;
    if (open) {
      unread = 0;
      renderBadge();
      parts.list.scrollTop = parts.list.scrollHeight;
      parts.input.focus();
    } else {
      wake();
    }
  }

  function renderBadge(): void {
    if (!parts) return;
    parts.badge.hidden = unread === 0;
    parts.badge.textContent = unread > 9 ? '9+' : String(unread);
  }

  function renderRoom(): void {
    if (!parts || !room) return;
    parts.code.textContent = t('room', { id: room.roomId });
    const names = room.members.map((m) => (m.id === room!.myId ? `${m.name} (${t('you')})` : m.name));
    parts.members.textContent = `${t('members', { n: room.members.length })}: ${names.join(', ')}`;
    parts.next.disabled = room.queueLength === 0;
  }

  function line(chat: ChatLine): HTMLElement {
    return el('div', chat.mine ? 'line me' : 'line', el('b', '', chat.name), ' ', chat.text);
  }

  function renderLines(): void {
    if (!parts) return;
    parts.list.replaceChildren(...(lines.length ? lines.map(line) : [el('div', 'empty', t('chatEmpty'))]));
    parts.list.scrollTop = parts.list.scrollHeight;
  }

  async function copyText(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      document.documentElement.append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
  }

  document.addEventListener('fullscreenchange', place);
  addEventListener('resize', position);
  addEventListener('scroll', position, { passive: true, capture: true });
  document.addEventListener('mousemove', () => host && wake(), { passive: true, capture: true });

  return {
    /** Katmanı bu videonun üstüne yerleştir. */
    follow(next: HTMLVideoElement): void {
      video = next;
      mount();
      position();
    },

    /** "Sonraki" butonuna basılınca ne yapılacağı. */
    onNext(handler: () => void): void {
      onNext = handler;
    },

    setRoom(info: RoomInfo): void {
      room = info;
      lines = info.chat;
      renderRoom();
      renderLines();
    },

    reaction(emoji: string, name: string): void {
      mount();
      if (!parts) return;
      const floats = parts.floats;
      if (floats.childElementCount >= MAX_FLOATS) floats.firstElementChild?.remove();
      const bubble = el('div', 'float', el('span', 'emoji', emoji), el('span', 'name', name));
      bubble.style.left = `${8 + Math.random() * 80}%`;
      bubble.style.setProperty('--drift', `${(Math.random() - 0.5) * 60}px`);
      bubble.addEventListener('animationend', () => bubble.remove());
      floats.append(bubble);
    },

    chat(chat: ChatLine): void {
      mount();
      lines = [...lines, chat].slice(-50);
      if (!parts) return;
      const atBottom = parts.list.scrollHeight - parts.list.scrollTop - parts.list.clientHeight < 40;
      if (lines.length === 1) parts.list.replaceChildren();
      parts.list.append(line(chat));
      if (atBottom || chat.mine) parts.list.scrollTop = parts.list.scrollHeight;
      if (panelOpen) return;

      // Panel kapalıyken mesaj köşede kısa süre görünür.
      if (!chat.mine) {
        unread++;
        renderBadge();
      }
      const toasts = parts.toasts;
      while (toasts.childElementCount >= MAX_TOASTS) toasts.firstElementChild?.remove();
      const toast = el('div', chat.mine ? 'toast me' : 'toast', el('b', '', chat.name), ' ', chat.text);
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
      const button = el('button', '', t('startWatching'));
      const box = el('div', 'start', el('div', '', t('autoplayBlocked')), button);
      button.addEventListener('click', () => {
        box.remove();
        onStart();
      });
      layer.append(box);
    },

    unmount(): void {
      host?.remove();
      host = root = null;
      parts = null;
      video = null;
      panelOpen = false;
      if (positionTimer !== null) clearInterval(positionTimer);
      positionTimer = null;
      if (idleTimer !== null) clearTimeout(idleTimer);
      idleTimer = null;
    },
  };
}
