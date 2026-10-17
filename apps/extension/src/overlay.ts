import { CHAT_MAX_LENGTH, REACTIONS, cleanChatText, type ClientMessage } from '@swm/shared/protocol';
import { t } from './i18n.ts';
import type { ChatLine, RoomInfo } from './messages.ts';

/** Hızlı mesaj kısa mesajlar içindir (popup ile aynı). */
const QUICK_CHAT_MAX = Math.min(120, CHAT_MAX_LENGTH);
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const MAX_FLOATS = 30;
/** Uzun bir sütun olmasın: en fazla bu kadar mesaj aynı anda görünür, kısa sürede kaybolur. */
const MAX_TOASTS = 4;
const TOAST_MS = 5000;
/** Fare bu kadar hareketsiz kalınca buton (ve açıksa çubuk) solar. */
const IDLE_MS = 3000;

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
.root { position: fixed; pointer-events: none; z-index: 2147483647; overflow: hidden;
  font: 13px/1.4 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #ecedf1; }

/* Uçuşan emojiler */
.float { position: absolute; bottom: 14%; display: flex; flex-direction: column; align-items: center;
  animation: up 2.8s ease-out forwards; }
.emoji { font-size: 40px; line-height: 1; filter: drop-shadow(0 2px 6px rgb(0 0 0 / .5)); }
.name { font-size: 12px; font-weight: 600; background: rgb(0 0 0 / .55); padding: 1px 6px; border-radius: 6px; margin-top: 2px; }
@keyframes up {
  0% { transform: translate(0, 20px) scale(.6); opacity: 0; }
  12% { transform: translate(0, 0) scale(1.1); opacity: 1; }
  75% { opacity: 1; }
  100% { transform: translate(var(--drift, 0), -220px) scale(1); opacity: 0; }
}

/* Mesajlar ve bildirimler: sağ üstteki ScreenWithMe çubuğunun hemen altında belirip kaybolur.
   (top değeri çubuğun yüksekliğine göre JS ile ayarlanır.) */
.toasts { position: absolute; right: 12px; top: 56px; display: flex; flex-direction: column; align-items: flex-end;
  gap: 5px; max-width: min(380px, calc(100% - 24px)); transition: top .2s; }
.toast { background: rgb(0 0 0 / .72); border: 1px solid rgb(255 255 255 / .12); padding: 5px 11px; border-radius: 12px;
  font-size: 14px; overflow-wrap: anywhere; text-align: right; animation: in .2s ease-out; }
.toast b { color: #a48dff; }
.toast.me b { color: #3ccf8e; }
.toast.notice { font-size: 12px; color: #c9cbd3; font-style: italic; padding: 3px 10px; }
.toast.leaving { animation: out .4s ease-in forwards; }
@keyframes in { from { opacity: 0; transform: translateX(10px); } }
@keyframes out { to { opacity: 0; transform: translateY(-6px); } }

/* Sağ üst: buton ve kompakt çubuk */
.fab, .bar { position: absolute; top: 12px; right: 12px; pointer-events: auto; transition: opacity .25s; }
.fab { display: flex; align-items: center; gap: 6px; background: rgb(15 16 20 / .85); border: 1px solid rgb(255 255 255 / .18);
  color: #fff; border-radius: 999px; padding: 5px 11px 5px 5px; font: inherit; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 16px rgb(0 0 0 / .4); }
.logo { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: #7c5cff; font-size: 9px; }
.badge { background: #7c5cff; border-radius: 999px; padding: 0 6px; font-size: 11px; }
.bar { width: min(400px, calc(100% - 24px)); display: flex; flex-direction: column; gap: 8px; padding: 8px;
  border-radius: 12px; background: rgb(15 16 20 / .88); border: 1px solid rgb(255 255 255 / .12);
  box-shadow: 0 6px 24px rgb(0 0 0 / .45); backdrop-filter: blur(6px); }
.idle .fab, .idle .bar { opacity: 0; pointer-events: none; }
.row { display: flex; align-items: center; gap: 4px; }
.spacer { flex: 1; }
.reaction { width: 28px; height: 28px; border-radius: 999px; background: rgb(255 255 255 / .06);
  border: 1px solid rgb(255 255 255 / .12); font-size: 15px; cursor: pointer; padding: 0; }
.reaction:hover { background: rgb(255 255 255 / .16); }
.icon { min-width: 28px; height: 28px; border-radius: 8px; background: rgb(255 255 255 / .06); color: #fff;
  border: 1px solid rgb(255 255 255 / .12); font: inherit; font-size: 13px; cursor: pointer; padding: 0 6px; white-space: nowrap; }
.icon:hover:not(:disabled) { background: rgb(255 255 255 / .16); }
.members { display: inline-flex; align-items: center; cursor: default; }
.icon:disabled { opacity: .35; cursor: default; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: #6b6f7b; margin: 0 4px; flex: none; }
.dot.good { background: #3ccf8e; } .dot.ok { background: #f5b94a; } .dot.bad { background: #ff6b6b; }
form { display: flex; gap: 4px; flex: 1; min-width: 0; }
input, select { background: rgb(0 0 0 / .45); color: #fff; border: 1px solid rgb(255 255 255 / .2); border-radius: 8px;
  padding: 6px 8px; font: inherit; height: 30px; }
input { flex: 1; min-width: 0; }
input:focus, select:focus { outline: 2px solid #7c5cff; outline-offset: 1px; }
.send { background: #7c5cff; border-color: #7c5cff; }

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

function button(className: string, text: string, title: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', className, text);
  b.type = 'button';
  b.title = title;
  b.setAttribute('aria-label', title);
  b.addEventListener('click', onClick);
  return b;
}

export interface OverlayActions {
  send: (message: ClientMessage) => void;
  onNext: () => void;
  onRate: (rate: number) => void;
}

/**
 * Videonun tam üstüne oturan saydam katman: uçuşan emojiler, sol üstte
 * beliren mesajlar ve sağ üstte fare oynayınca çıkan ScreenWithMe butonuyla
 * açılan kompakt çubuk (emoji, hızlı mesaj, hız, odadakiler, davet, sonraki).
 * Sitenin CSS'inden etkilenmemek için kapalı shadow DOM kullanır. Video tam
 * ekrana alınırsa tam ekran öğesinin içine taşınır.
 */
export function createOverlay(actions: OverlayActions) {
  let host: HTMLElement | null = null;
  let root: HTMLElement | null = null;
  let parts: ReturnType<typeof build> | null = null;
  let video: HTMLVideoElement | null = null;
  let positionTimer: ReturnType<typeof setInterval> | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let room: RoomInfo | null = null;
  let rate = 1;
  let barOpen = false;
  let unread = 0;

  function build(container: HTMLElement) {
    const floats = el('div');
    const toasts = el('div', 'toasts');

    const badge = el('span', 'badge');
    badge.hidden = true;
    const fab = el('button', 'fab', el('span', 'logo', '▶'), 'ScreenWithMe', badge);
    fab.type = 'button';
    fab.addEventListener('click', () => setBar(true));

    // 1. satır: emojiler | senkron · odadakiler · davet · sonraki · kapat
    const reactions = REACTIONS.map((emoji) => button('reaction', emoji, t('react'), () => actions.send({ t: 'react', emoji })));
    const dot = el('span', 'dot');
    // Odadakiler: sayı görünür, isimler üstüne gelince.
    const members = el('span', 'icon members', '👥');
    const copy = button('icon', '🔗', t('copyInvite'), async () => {
      if (!room) return;
      await copyText(room.inviteUrl);
      copy.textContent = '✓';
      setTimeout(() => (copy.textContent = '🔗'), 1500);
    });
    const next = button('icon', '⏭', t('next'), () => actions.onNext());
    const close = button('icon', '✕', t('close'), () => setBar(false));

    // 2. satır: hızlı mesaj | hız
    const input = el('input');
    input.maxLength = QUICK_CHAT_MAX;
    input.placeholder = t('chatPlaceholder');
    input.autocomplete = 'off';
    const send = el('button', 'icon send', '➤');
    send.title = t('send');
    const form = el('form', '', input, send);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = cleanChatText(input.value.slice(0, QUICK_CHAT_MAX));
      if (text) actions.send({ t: 'chat', text });
      input.value = '';
    });
    const speed = el('select');
    speed.title = t('speed');
    for (const value of SPEEDS) {
      const option = el('option', '', `${value}x`);
      option.value = String(value);
      speed.append(option);
    }
    speed.addEventListener('change', () => actions.onRate(Number(speed.value)));

    const bar = el(
      'div',
      'bar',
      el('div', 'row', ...reactions, el('span', 'spacer'), dot, members, copy, next, close),
      el('div', 'row', form, speed),
    );
    bar.hidden = true;

    container.append(floats, toasts, fab, bar);
    return { floats, toasts, fab, badge, bar, dot, members, next, input, speed };
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
    // Çubuktaki yazı alanına basılan tuşlar sitenin kısayollarını (boşluk = durdur vb.) tetiklemesin.
    for (const type of ['keydown', 'keyup', 'keypress'] as const) {
      host.addEventListener(type, (event) => {
        event.stopPropagation();
        if (type === 'keydown' && (event as KeyboardEvent).key === 'Escape') setBar(false);
      });
    }
    place();
    positionTimer ??= setInterval(position, 500);
    renderRoom();
    parts.speed.value = String(rate);
    setBar(barOpen);
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
    // Video boyutu değişince çubuk iki satıra inebilir; mesajlar onun altında kalsın.
    placeToasts();
  }

  /** Fare oynayınca buton/çubuk görünür, hareketsiz kalınca solar (yazı yazarken solmaz). */
  function wake(): void {
    if (!root) return;
    root.classList.remove('idle');
    if (idleTimer !== null) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (parts && host && document.activeElement === host) return wake();
      root?.classList.add('idle');
    }, IDLE_MS);
  }

  function setBar(open: boolean): void {
    barOpen = open;
    if (!parts) return;
    parts.bar.hidden = !open;
    parts.fab.hidden = open;
    if (open) {
      unread = 0;
      renderBadge();
      parts.input.focus();
    }
    placeToasts();
    wake();
  }

  /** Mesajları buton/çubuk hangisi görünüyorsa onun hemen altına koyar. */
  function placeToasts(): void {
    if (!parts) return;
    const anchor = barOpen ? parts.bar : parts.fab;
    const height = anchor.getBoundingClientRect().height || (barOpen ? 84 : 34);
    parts.toasts.style.top = `${12 + height + 8}px`;
  }

  function renderBadge(): void {
    if (!parts) return;
    parts.badge.hidden = unread === 0;
    parts.badge.textContent = unread > 9 ? '9+' : String(unread);
  }

  function renderRoom(): void {
    if (!parts || !room) return;
    const names = room.members.map((m) => {
      const name = (m.avatar ? `${m.avatar} ${m.name}` : m.name) + (m.id === room!.hostId ? ' 👑' : '');
      return m.id === room!.myId ? `${name} (${t('you')})` : name;
    });
    parts.members.textContent = `👥 ${room.members.length}`;
    parts.members.title = `${t('members', { n: room.members.length })}\n${names.join('\n')}`;
    parts.next.disabled = room.queueLength === 0;
  }

  function toast(content: (Node | string)[], className: string): void {
    mount();
    if (!parts) return;
    const toasts = parts.toasts;
    while (toasts.childElementCount >= MAX_TOASTS) toasts.firstElementChild?.remove();
    const node = el('div', `toast ${className}`, ...content);
    toasts.append(node);
    setTimeout(() => {
      node.classList.add('leaving');
      node.addEventListener('animationend', () => node.remove());
    }, TOAST_MS);
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

    setRoom(info: RoomInfo): void {
      room = info;
      renderRoom();
    },

    /** Odanın hızını seçicide göster. */
    setRate(value: number): void {
      rate = value;
      if (parts && SPEEDS.includes(value)) parts.speed.value = String(value);
    },

    /** Senkron göstergesi: odadan ne kadar uzaktayız (ms); bilinmiyorsa null. */
    setSync(diffMs: number | null): void {
      if (!parts) return;
      const abs = diffMs === null ? null : Math.abs(diffMs);
      parts.dot.className = `dot ${abs === null ? '' : abs < 250 ? 'good' : abs < 1000 ? 'ok' : 'bad'}`;
      parts.dot.title = abs === null ? t('syncUnknown') : t('syncDiff', { ms: Math.round(abs) });
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

    chat(line: ChatLine): void {
      toast([el('b', '', line.name), ' ', line.text], line.mine ? 'me' : '');
      if (!barOpen && !line.mine) {
        unread++;
        renderBadge();
      }
    },

    notice(kind: 'joined' | 'left', name: string): void {
      toast([t(kind === 'joined' ? 'joined' : 'left', { name })], 'notice');
    },

    /** Tarayıcı otomatik oynatmayı engellerse videonun üstünde "İzlemeye başla" gösterir. */
    askToStart(onStart: () => void): void {
      const layer = mount();
      if (layer.querySelector('.start')) return;
      const start = el('button', '', t('startWatching'));
      const box = el('div', 'start', el('div', '', t('autoplayBlocked')), start);
      start.addEventListener('click', () => {
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
      if (positionTimer !== null) clearInterval(positionTimer);
      positionTimer = null;
      if (idleTimer !== null) clearTimeout(idleTimer);
      idleTimer = null;
    },
  };
}
