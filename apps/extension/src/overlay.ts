import { INTRO_CSS, createIntro } from '@swm/shared/intro';
import { createLogo } from '@swm/shared/logo';
import { fileToSticker } from '@swm/shared/sticker-file';
import { CHAT_MAX_LENGTH, PIN_NOTE_MAX, REACTION_PAGES, stepRate, avatarText, isDrawnAvatar, cleanChatText, type ClientMessage, type Pin } from '@swm/shared/protocol';
import { FS_BOTTOM, likelyPlayer, roomLayout } from './focus.ts';
import { t } from './i18n.ts';
import type { ChatLine, RoomInfo } from './messages.ts';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];
/** Ekranda aynı anda en fazla bu kadar tepki kartı; kart bu kadar kalır. */
const MAX_CARDS = 5;
const CARD_MS = 3200;
/** Bir tepkiden sonra kısa bekleme (art arda basıp ekranı doldurmasın). */
const COOLDOWN_MS = 1100;
/** Uzun bir sütun olmasın: en fazla bu kadar mesaj aynı anda görünür, kısa sürede kaybolur. */
const MAX_TOASTS = 4;
const TOAST_MS = 5000;
/** Tam ekranda fare bu kadar hareketsiz kalınca kontroller solar. */
const IDLE_MS = 3000;
/** "Odadan çıkarıldın" gibi kapanış açıklamaları bu kadar ekranda kalır. */
const FAREWELL_MS = 6000;
/** Sohbet panelinde tutulan en fazla satır. */
const MAX_LINES = 120;

// Renkler sitenin "Gece" temasıyla aynı (apps/web/src/styles.css :root). Oda görünümü sitedeki
// odanın aynısı: üstte şerit, sağda davet + Sohbet/Kişiler, videonun altında emojiler ve kontroller.
// Ölçüler focus.ts roomLayout'tan CSS değişkenleriyle gelir (--top, --right, --bottom, --left, --side).
const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
.root { --bg: #0b0d1a; --surface: #151a2e; --surface-2: #1e2440; --border: #2a3152; --text: #eceefa; --muted: #9aa0c2;
  --accent: #8b6cff; --accent-hover: #9f86ff; --danger: #ff6b6b; --ok: #3ccf8e; --warn: #f5b94a; --pin: #e9b949;
  --top: 0px; --right: 0px; --bottom: 0px; --left: 0px; --side: 320px;
  position: fixed; pointer-events: none; z-index: 2147483647; overflow: hidden;
  font: 14px/1.4 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: var(--text); }
button, input, select { font: inherit; color: inherit; }

/* Ortak parçalar (sitedeki .btn, .icon-btn, .card) */
.btn { border: 1px solid var(--border); background: var(--surface-2); color: var(--text); padding: 8px 14px; border-radius: 10px;
  font-weight: 600; cursor: pointer; white-space: nowrap; }
.btn:hover { border-color: var(--muted); }
.btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.btn.primary:hover { background: var(--accent-hover); }
.btn.small { padding: 6px 12px; font-size: 13.5px; }
.icon-btn { background: transparent; border: 1px solid var(--border); color: var(--text); border-radius: 8px; width: 36px; height: 36px;
  display: inline-grid; place-items: center; font-size: 16px; cursor: pointer; padding: 0; flex: none; }
.icon-btn:hover { background: var(--surface-2); border-color: var(--muted); }
.icon-btn.big { width: 38px; height: 38px; font-size: 18px; }
.icon-btn.step { width: 30px; height: 30px; font-weight: 700; }
input, select { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; min-width: 0; }
input:focus, select:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
.row { display: flex; gap: 8px; align-items: center; min-width: 0; }
.row input { flex: 1; }
.spacer { flex: 1; }
.logo { display: block; width: 28px; height: 28px; flex: none; }
.logo svg { display: block; width: 100%; height: 100%; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: #6b6f7b; flex: none; }
.dot.good { background: var(--ok); } .dot.ok { background: var(--warn); } .dot.bad { background: var(--danger); }

/* ---- Oda görünümü ---- */
.shell { display: none; }
.roomview .shell { display: block; }
.header { position: absolute; left: 0; right: 0; top: 0; height: 56px; display: flex; align-items: center; gap: 12px; padding: 0 16px;
  pointer-events: auto; background: color-mix(in srgb, var(--bg) 78%, transparent); border-bottom: 1px solid var(--border);
  backdrop-filter: blur(8px); }
.brand { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; white-space: nowrap; }
.room-chip { color: var(--muted); font-weight: 600; max-width: 30vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sync { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 13px; white-space: nowrap; }
.side { position: absolute; right: 16px; top: var(--top); bottom: 16px; width: var(--side); display: flex; flex-direction: column;
  gap: 16px; pointer-events: auto; }
.invite-card { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.label { font-size: 12px; color: var(--muted); font-weight: 600; }
.tabs-card { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.tabs { display: flex; border-bottom: 1px solid var(--border); }
.tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 11px 6px; background: transparent;
  border: 0; border-bottom: 2px solid transparent; color: var(--muted); font-weight: 600; cursor: pointer; white-space: nowrap; }
.tab:hover { color: var(--text); }
.tab[aria-selected='true'] { color: var(--text); border-bottom-color: var(--accent); }
.badge { background: var(--accent); color: #fff; border-radius: 999px; padding: 0 6px; font-size: 11px; }
.panel { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.chat-list { flex: 1; min-height: 0; overflow-y: auto; list-style: none; margin: 0; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.chat-line { display: flex; gap: 10px; align-items: flex-start; }
.chat-avatar, .person-avatar { flex: none; width: 32px; height: 32px; border-radius: 50%; background: var(--surface-2); display: grid;
  place-items: center; font-size: 18px; overflow: hidden; }
.chat-avatar img, .person-avatar img, .r-av img { width: 100%; height: 100%; display: block; }
.chat-body { min-width: 0; }
.chat-meta { display: flex; align-items: baseline; gap: 8px; }
.chat-name { font-weight: 600; }
.chat-line.me .chat-name { color: var(--accent-hover); }
.chat-meta time { font-size: 11px; color: var(--muted); }
.chat-text { margin: 2px 0 0; overflow-wrap: anywhere; }
.chat-empty { color: var(--muted); font-size: 13px; text-align: center; margin-top: 24px; }
.chat-empty:not(:only-child) { display: none; }
.chat-form { padding: 10px; border-top: 1px solid var(--border); }
.people { list-style: none; margin: 0; padding: 12px; display: flex; flex-direction: column; gap: 6px; overflow-y: auto; }
.person { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 10px; }
.person:hover { background: var(--surface-2); }
.person-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.person.me .person-name { font-weight: 600; }

/* Videonun altı: pin şeridi + araç çubuğu (emojiler | pin, eşitle, hız, tam ekran) */
.below { position: absolute; left: var(--left); right: var(--right); bottom: 16px; height: calc(var(--bottom) - 20px);
  display: flex; flex-direction: column; justify-content: flex-end; gap: 4px; pointer-events: auto; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; }
.toolbar-right { display: flex; align-items: center; gap: 10px; flex: none; }
.toolbar > .reaction-bar { flex: 0 1 auto; overflow: hidden; }
.reaction-bar { display: flex; align-items: center; gap: 4px; min-width: 0; }
.reaction { background: var(--surface); border: 1px solid var(--border); border-radius: 999px; width: 38px; height: 38px; font-size: 18px;
  cursor: pointer; padding: 0; transition: transform .1s; flex: none; }
.reaction:hover { transform: scale(1.15); border-color: var(--muted); }
.reaction:active { transform: scale(.9); }
.reaction.slot { visibility: hidden; display: inline-block; }
.reaction img { width: 24px; height: 24px; object-fit: contain; border-radius: 4px; display: block; margin: auto; }
.cooling .reaction:not(.slot) { opacity: .45; pointer-events: none; }
.no-react .reaction-bar, .no-react .sticker-add { display: none; }
.pager { display: flex; flex-direction: column; gap: 2px; margin-left: 2px; flex: none; }
.pager button { width: 22px; height: 17px; padding: 0; font-size: 8px; line-height: 1; background: var(--surface); border: 1px solid var(--border);
  border-radius: 5px; cursor: pointer; }
.pager button:hover { border-color: var(--muted); }
.sticker-wrap { position: relative; display: inline-flex; flex: none; }
.sticker-x { position: absolute; top: -5px; right: -5px; display: none; width: 16px; height: 16px; padding: 0; border-radius: 999px;
  border: 1px solid rgb(255 255 255 / .3); background: #222; color: #fff; font-size: 9px; line-height: 14px; cursor: pointer; }
.sticker-wrap:hover .sticker-x { display: block; }
.speed { display: flex; align-items: center; gap: 6px; }
.speed select { padding: 6px 8px; }

/* Pin şeridi: her pin 📌, tıklayınca oraya gidilir */
.pins { position: relative; height: 22px; flex: none; }
.pin-track { position: absolute; left: 0; right: 0; bottom: 4px; height: 3px; border-radius: 2px; background: rgb(255 255 255 / .14); }
.pin-now { position: absolute; bottom: 2px; width: 2px; height: 7px; border-radius: 1px; background: #fff; opacity: .6; }
.pin-wrap { position: absolute; bottom: 0; transform: translateX(-50%); display: flex; align-items: flex-end; }
.pin-mark { background: none; border: 0; padding: 0; font-size: 13px; line-height: 1; cursor: pointer; }
.pin-mark:hover { transform: scale(1.3); }
.pin-x { display: none; width: 14px; height: 14px; padding: 0; border-radius: 999px; border: 1px solid rgb(255 255 255 / .25);
  background: #222; color: #fff; font-size: 10px; line-height: 11px; cursor: pointer; }
.pin-wrap:hover .pin-x { display: block; }
.pin-form { position: absolute; left: 12px; bottom: 12px; display: flex; gap: 6px; width: min(380px, calc(100% - 24px)); pointer-events: auto; }
.pin-form input { flex: 1; border-color: var(--pin); background: rgb(15 16 20 / .92); }
.roomview .pin-form { left: calc(var(--left) + 12px); bottom: calc(var(--bottom) + 12px); }
.fsmode .pin-form { left: 20px; bottom: 140px; }
.ownfs .pin-form, .ownfs .feed { bottom: calc(var(--fs-bottom) + 12px); }

/* ---- Tam ekran: sitedeki gibi altta kontroller, mesajlar sürüklenen tutamağın yanında ---- */
.fs { display: none; }
.fsmode .fs { display: block; }
.fs-controls { position: absolute; left: 0; right: 0; bottom: 0; padding: 48px 20px 16px; display: flex; flex-direction: column; gap: 10px;
  background: linear-gradient(to top, rgb(0 0 0 / .85), rgb(0 0 0 / 0)); pointer-events: auto; transition: opacity .25s; }
.fs-progress { display: flex; align-items: center; gap: 12px; }
.fs-seek-wrap { flex: 1; position: relative; display: flex; }
.fs-seek-wrap .pins { position: absolute; left: 0; right: 0; bottom: 100%; }
.fs-seek { flex: 1; width: 100%; padding: 0; height: auto; background: none; border: 0; accent-color: var(--accent); cursor: pointer; }
.fs-time { font-variant-numeric: tabular-nums; font-size: 13px; color: #ddd; white-space: nowrap; }
.fs-row { display: flex; align-items: center; gap: 10px; }
.fs-row form { flex: 1; display: flex; min-width: 120px; }
.fs-row form input { flex: 1; background: rgb(0 0 0 / .5); border-color: rgb(255 255 255 / .2); color: #fff; }
.fs-row select { background: rgb(0 0 0 / .5); border-color: rgb(255 255 255 / .2); color: #fff; padding: 8px; }
.fs-btn { background: rgb(255 255 255 / .1); border: 1px solid rgb(255 255 255 / .15); color: #fff; border-radius: 10px; min-width: 40px;
  height: 40px; font-size: 18px; cursor: pointer; flex: none; }
.fs-btn:hover { background: rgb(255 255 255 / .2); }
.fs .reaction { background: rgb(255 255 255 / .1); border-color: rgb(255 255 255 / .15); }
.fs .pager button { background: rgb(255 255 255 / .1); border-color: rgb(255 255 255 / .15); color: #fff; }
.toast-handle { position: absolute; display: flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px;
  background: rgb(0 0 0 / .55); border: 1px dashed rgb(255 255 255 / .35); color: #fff; font-size: 13px; cursor: grab; user-select: none;
  pointer-events: auto; touch-action: none; transition: opacity .25s; white-space: nowrap; }
.toast-handle:active { cursor: grabbing; }
.idle .fs-controls, .idle .toast-handle { opacity: 0; pointer-events: none; }
/* Bizim ⛶ (sayfanın tamamı tam ekran): video üstte, kontroller altta kendi şeridinde (videonun kendi
   kontrolleriyle üst üste binmesin), hep görünür. Oynatıcının kendi tam ekranında videonun üstünde ve solar. */
.ownfs .fs-controls { height: var(--fs-bottom); justify-content: flex-end; padding: 10px 20px 14px; background: var(--bg);
  border-top: 1px solid var(--border); }
.ownfs.idle .fs-controls { opacity: 1; pointer-events: auto; }

/* Gelen tepkiler: videonun sol altında avatar + isim + emoji kartları */
.feed { position: absolute; left: 12px; bottom: 12px; display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
  max-width: calc(100% - 24px); }
.roomview .feed { left: calc(var(--left) + 12px); bottom: calc(var(--bottom) + 12px); }
.fsmode .feed { left: 20px; bottom: 140px; }
.r-card { display: flex; align-items: center; gap: 7px; padding: 4px 10px 4px 4px; border-radius: 999px; background: rgb(10 10 18 / .74);
  border: 1px solid rgb(255 255 255 / .12); font-size: 13px; animation: card-in .25s ease-out; }
.r-card.leaving { animation: card-out .35s ease-in forwards; }
.r-card.bump .r-emoji, .r-card.bump .r-sticker { animation: bump .3s ease; }
.r-av { width: 26px; height: 26px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; font-size: 17px; flex: none; }
.r-name { font-weight: 600; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.r-emoji { font-size: 24px; line-height: 1; }
.r-sticker { height: 36px; max-width: 72px; object-fit: contain; border-radius: 6px; display: block; }
.r-count { font-weight: 700; color: #ffd27a; }
.r-count:empty { display: none; }
@keyframes card-in { from { opacity: 0; transform: translateX(-16px); } }
@keyframes card-out { to { opacity: 0; transform: translateX(-16px); } }
@keyframes bump { 50% { transform: scale(1.35); } }

/* Bildirimler (katıldı/ayrıldı) ve tam ekranda sohbet mesajları */
.toasts { position: absolute; right: 12px; top: 12px; display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
  max-width: min(420px, calc(100% - 24px)); }
.roomview .toasts { right: calc(var(--right) + 12px); top: calc(var(--top) + 12px); }
.toast { background: rgb(0 0 0 / .72); border: 1px solid rgb(255 255 255 / .12); padding: 6px 12px; border-radius: 12px; font-size: 15px;
  overflow-wrap: anywhere; text-align: right; animation: in .2s ease-out; }
.toast b { color: var(--accent-hover); }
.toast.me b { color: var(--ok); }
.toast.notice { font-size: 13.5px; color: #c9cbd3; font-style: italic; padding: 4px 11px; }
.toast.leaving { animation: out .4s ease-in forwards; }
.toasts.left { align-items: flex-start; }
.toasts.left .toast { text-align: left; }
@keyframes in { from { opacity: 0; transform: translateX(10px); } }
@keyframes out { to { opacity: 0; transform: translateY(-6px); } }

/* "Herkes hazır" bekleme bandı (videonun üst ortası) */
.waiting { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); padding: 7px 14px; border-radius: 999px;
  background: rgb(0 0 0 / .78); border: 1px solid rgb(255 255 255 / .15); font-size: 16px; font-weight: 600;
  white-space: nowrap; max-width: 60%; overflow: hidden; text-overflow: ellipsis; }
.roomview .waiting, .roomview .note { left: calc(var(--left) + (100% - var(--left) - var(--right)) / 2); }
.roomview .waiting { top: calc(var(--top) + 12px); }

/* Otomatik oynatma engellenince */
.start { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; background: rgb(0 0 0 / .7); pointer-events: auto; font-size: 17px; text-align: center; padding: 16px; }
.roomview .start { inset: var(--top) var(--right) var(--bottom) var(--left); border-radius: 12px; }
/* Film sitenin içinde açıldı: arayüzü site gösteriyor; burada sadece "İzlemeye başla". */
.root.embedded > :not(.start) { display: none !important; }
/* Soru sorulurken senkron durmuş: sadece kart görünsün */
.bare .shell, .bare .fs, .bare .pin-form { display: none !important; }

/* Ortada kısa bilgi kartı: katılma onayı, "odaya dön", "çıkarıldın" gibi kapanış nedenleri */
.note { position: absolute; left: 50%; top: 18%; transform: translateX(-50%); width: min(400px, calc(100% - 24px));
  pointer-events: auto; background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
  padding: 16px 18px; text-align: center; font-size: 15px; box-shadow: 0 12px 40px rgb(0 0 0 / .5); animation: in .25s ease-out; }
.roomview .note { top: calc(var(--top) + 40px); }
.note b { display: block; font-size: 16px; margin-bottom: 6px; }
.note .actions { display: flex; gap: 8px; justify-content: center; margin-top: 12px; }
.end .end-title { color: #d8d2ff; font-weight: 600; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
${INTRO_CSS}
`;

/** "Filmi başlat" kartı: video henüz bulunmadan sayfanın üstünde; oynatıcıyı çerçeve ve okla gösterir. */
const HINT_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.ring { position: fixed; border: 3px solid #8b6cff; border-radius: 14px; pointer-events: none;
  box-shadow: 0 0 0 4px rgb(139 108 255 / .3), 0 0 32px rgb(139 108 255 / .55); animation: pulse 1.4s ease-in-out infinite; }
.arrow { position: fixed; font-size: 46px; line-height: 1; pointer-events: none; transform: translateX(-50%);
  filter: drop-shadow(0 3px 8px rgb(0 0 0 / .6)); animation: bob .9s ease-in-out infinite; }
.card { position: fixed; left: 50%; transform: translateX(-50%); width: min(430px, calc(100vw - 32px)); padding: 18px 20px;
  background: #151a2e; border: 1px solid #2a3152; border-radius: 16px; box-shadow: 0 16px 48px rgb(0 0 0 / .55);
  font: 14px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #eceefa; text-align: center; animation: in .3s ease-out; }
.head { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 18px; font-weight: 700; margin-bottom: 8px; }
.logo { width: 30px; height: 30px; display: block; } .logo svg { width: 100%; height: 100%; display: block; }
p { margin: 6px 0 0; }
.tip { color: #9aa0c2; font-size: 13px; }
button { margin-top: 14px; font: inherit; font-weight: 600; color: #fff; background: #8b6cff; border: 0; border-radius: 10px;
  padding: 9px 20px; cursor: pointer; }
button:hover { background: #9f86ff; }
@keyframes bob { 50% { margin-top: -10px; } }
@keyframes pulse { 50% { box-shadow: 0 0 0 7px rgb(139 108 255 / .18), 0 0 44px rgb(139 108 255 / .7); } }
@keyframes in { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .ring, .arrow { animation: none; } }
`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}

/** 75 → "1:15", 3725 → "1:02:05". */
function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const two = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${two(m)}:${two(s % 60)}` : `${m}:${two(s % 60)}`;
}

/** Kartın süresini (yeniden) başlatır; süre dolunca kayarak kaybolur. */
function expire(card: HTMLElement): void {
  const old = Number(card.dataset.timer ?? '0');
  if (old) clearTimeout(old);
  card.dataset.timer = String(
    window.setTimeout(() => {
      card.classList.add('leaving');
      setTimeout(() => card.remove(), 400);
    }, CARD_MS),
  );
}

/** Avatar: çizilmiş olan eklentinin resmi (sayfa engellerse emoji karşılığı), hayvan emoji. */
function avatarEl(avatar: string | undefined, className = 'r-av'): HTMLElement {
  const box = el('span', className);
  if (avatar && isDrawnAvatar(avatar)) {
    const img = el('img');
    img.alt = '';
    img.src = chrome.runtime.getURL(`avatars/${avatar}.svg`);
    img.addEventListener('error', () => box.replaceChildren(avatarText(avatar)));
    box.append(img);
  } else {
    box.textContent = avatar ?? '🙂';
  }
  return box;
}

/** Özel emoji resmi (sayfanın güvenlik ayarı resmi engellerse 🖼️). */
function stickerImg(data: string, className: string): HTMLElement {
  const img = el('img', className);
  img.alt = '';
  img.src = data;
  img.addEventListener('error', () => img.replaceWith(el('span', 'r-emoji', '🖼️')));
  return img;
}

/** Sayfanın yazı alanı mı (kısayollar orada çalışmasın)? */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function button(className: string, text: string, title: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', className, text);
  b.type = 'button';
  b.title = title;
  b.setAttribute('aria-label', title);
  b.addEventListener('click', onClick);
  return b;
}

function speedSelect(onChange: (rate: number) => void): HTMLSelectElement {
  const select = el('select');
  select.title = t('speed');
  for (const value of SPEEDS) {
    const option = el('option', '', `${value}x`);
    option.value = String(value);
    select.append(option);
  }
  select.addEventListener('change', () => onChange(Number(select.value)));
  return select;
}

const chatTime = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export interface OverlayActions {
  send: (message: ClientMessage) => void;
  onRate: (rate: number) => void;
  /** 🏠 Odaya dön: film bitti ya da başka bir şey izlenecek. */
  onBackToRoom: () => void;
  /** 🔄 Herkesi bana eşitle. */
  onSyncAll: () => void;
}

/**
 * Film sayfasının üstündeki katman (kapalı shadow DOM, sitenin CSS'inden etkilenmez):
 * - Oda görünümü: sayfa sitedeki odaya dönüşür (video focus.ts ile ortadaki boşluğa oturur).
 * - Tam ekran: sitedeki gibi altta kontroller ve sürüklenen mesaj tutamağı.
 * - Her durumda: tepki kartları, bildirimler, bekleme bandı, soru kartları.
 */
export function createOverlay(actions: OverlayActions) {
  let host: HTMLElement | null = null;
  let root: HTMLElement | null = null;
  let parts: ReturnType<typeof build> | null = null;
  let video: HTMLVideoElement | null = null;
  let positionTimer: ReturnType<typeof setInterval> | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let room: RoomInfo | null = null;
  /** Film sitenin içinde (iframe) açık: sadece "İzlemeye başla" kartı gösterilir. */
  let embeddedMode = false;
  /** Oda görünümü: sayfa sitedeki oda gibi görünür. */
  let roomView = false;
  let rate = 1;
  let reactionPage = 0;
  let tab: 'chat' | 'people' = 'chat';
  let unread = 0;
  let chatLines: ChatLine[] = [];
  /** Tam ekran ilerleme çubuğu sürükleniyor mu. */
  let seeking = false;
  /** Kapanış açıklaması bu ana kadar ekranda kalır. */
  let farewellUntil = 0;
  /** Tam ekrandaki mesaj tutamağının yeri (oran, sol üst köşe); null: sağ üst. Hatırlanır. */
  let pos: { x: number; y: number } | null = null;
  void chrome.storage.local
    .get('toastPos')
    .then(({ toastPos }) => {
      const p = toastPos as { x?: unknown; y?: unknown } | undefined;
      if (p && typeof p.x === 'number' && typeof p.y === 'number') {
        pos = { x: p.x, y: p.y };
        placeToasts();
      }
    })
    .catch(() => {});

  // Bizim kutulara yazarken basılan tuşlar sitenin ve başka eklentilerin kısayollarını
  // (boşluk = durdur, hız eklentilerinin harfleri vb.) tetiklemesin. Kapalı shadow
  // DOM yüzünden dışarıdan bakan onlar yazı alanını değil "swm-overlay"i görür ve
  // yazı yazıldığını anlamaz. Bu yüzden olayı en başta (pencerede, yakalama
  // aşamasında) durdururuz; harfin kutuya yazılması bundan etkilenmez.
  for (const type of ['keydown', 'keyup', 'keypress'] as const) {
    addEventListener(
      type,
      (event) => {
        if (!host || event.target !== host) return;
        event.stopImmediatePropagation();
        if (type === 'keydown' && event.key === 'Escape' && pinning) setPinning(false);
      },
      true,
    );
  }

  // ---- Tepkiler: üç emoji sayfası + özel emoji (GIF/resim) sayfaları ----
  type Item = { emoji: (typeof REACTION_PAGES)[number][number] } | { sticker: string };
  const stickers = new Map<string, string>();
  let coolUntil = 0;
  /** Benim eklediğim özel emojiler (✕ ile kaldırabilirim). */
  const mineStickers = new Set<string>();
  /** Sitedeki gibi: üç emoji sayfası, sonra (varsa) 8'erli özel emoji sayfaları. */
  function reactionPages(): Item[][] {
    const list: Item[][] = REACTION_PAGES.map((p) => p.map((emoji) => ({ emoji })));
    const ids = [...stickers.keys()];
    for (let i = 0; i < ids.length; i += 8) list.push(ids.slice(i, i + 8).map((sticker) => ({ sticker })));
    return list;
  }
  /** Özel emojiyi odadan kaldır; kendi listemden de çıkar (bir sonraki odaya yüklenmesin). */
  async function removeSticker(id: string): Promise<void> {
    const data = stickers.get(id);
    const { myStickers } = await chrome.storage.local.get('myStickers');
    if (data && Array.isArray(myStickers)) await chrome.storage.local.set({ myStickers: (myStickers as unknown[]).filter((d) => d !== data) });
    mineStickers.delete(id);
    actions.send({ t: 'sticker-remove', id });
  }
  /** Tepki yolla; ardından kısa bekleme (art arda basıp ekranı doldurmasın). */
  function fire(item: Item): void {
    if (room?.noReactions || Date.now() < coolUntil) return;
    coolUntil = Date.now() + COOLDOWN_MS;
    actions.send('emoji' in item ? { t: 'react', emoji: item.emoji } : { t: 'react', sticker: item.sticker });
    for (const bar of parts?.reactionBars ?? []) {
      bar.classList.add('cooling');
      setTimeout(() => bar.classList.remove('cooling'), COOLDOWN_MS);
    }
  }

  // Kısayollar (odadayken): 1–8 emoji, Enter mesaj, P pin. Çoğu oynatıcı rakamlarla videoyu
  // sarar (3 = %30); o yüzden tuşu yakalama aşamasında alıp siteye hiç göstermiyoruz, yoksa
  // emoji atarken herkes sarılırdı. Aynı tuşun keyup/keypress'i de yutulur.
  const swallowed = new Set<string>();
  addEventListener(
    'keydown',
    (event) => {
      if (!parts || !room || event.ctrlKey || event.metaKey || event.altKey) return;
      if ((host && event.target === host) || isEditable(event.composedPath()[0] ?? null)) return;
      const n = event.key.length === 1 ? Number(event.key) : NaN;
      if (Number.isInteger(n) && n >= 1 && n <= 8) {
        const item = reactionPages()[reactionPage]?.[n - 1];
        if (!item) return;
        if (!event.repeat) fire(item);
      } else if (event.key.toLowerCase() === 'p') {
        setPinning(true);
      } else if (event.key === 'Enter') {
        focusChat();
      } else {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      swallowed.add(event.code);
      wake();
    },
    true,
  );
  for (const type of ['keyup', 'keypress'] as const) {
    addEventListener(
      type,
      (event) => {
        if (!swallowed.has(event.code)) return;
        event.stopImmediatePropagation();
        if (type === 'keyup') swallowed.delete(event.code);
      },
      true,
    );
  }

  function build(container: HTMLElement) {
    const feed = el('div', 'feed');
    const toasts = el('div', 'toasts');
    const waiting = el('div', 'waiting');
    waiting.hidden = true;

    // Emoji çubuğu iki yerde (videonun altı ve tam ekran): her biri 8 sabit yuva + ▲▼.
    const reactionBars: HTMLElement[] = [];
    const drawers: Array<() => void> = [];
    const turn = (step: number) => {
      const count = reactionPages().length;
      reactionPage = (reactionPage + step + count) % count;
      drawReactions();
    };
    const reactionBar = (): HTMLElement => {
      const slotsBox = el('span', 'reaction-bar');
      const bar = el('div', 'reaction-bar', slotsBox, el('span', 'pager', button('', '▲', t('moreReactions'), () => turn(-1)), button('', '▼', t('moreReactions'), () => turn(1))));
      drawers.push(() => {
        const all = reactionPages();
        if (reactionPage >= all.length) reactionPage = 0;
        const slots: HTMLElement[] = all[reactionPage]!.map((item, i) => {
          const b = button('reaction', 'emoji' in item ? item.emoji : '', `${t('react')} (${i + 1})`, () => fire(item));
          if (!('sticker' in item)) return b;
          b.append(stickerImg(stickers.get(item.sticker) ?? '', ''));
          const isHost = room !== null && room.myId === room.hostId;
          if (!mineStickers.has(item.sticker) && !isHost) return b;
          // Kendi eklediğim (ya da yöneticiysem herhangi bir) özel emoji: üstüne gelince ✕.
          return el('span', 'sticker-wrap', b, button('sticker-x', '✕', t('stickerRemove'), () => void removeSticker(item.sticker)));
        });
        // Yerler sabit: 8'den az varsa kalan yuvalar boş (yanındaki düğmeler kaymasın).
        while (slots.length < 8) slots.push(el('span', 'reaction slot'));
        slotsBox.replaceChildren(...slots);
      });
      // Fare tekerleğiyle de sayfa değişir.
      bar.addEventListener('wheel', (event) => {
        event.preventDefault();
        turn(event.deltaY > 0 ? 1 : -1);
      }, { passive: false });
      reactionBars.push(bar);
      return bar;
    };
    const drawReactions = () => drawers.forEach((draw) => draw());

    // Özel emoji ekle: dosyayı küçült (GIF olduğu gibi), kendi listeme kaydet, odaya yolla.
    const file = el('input');
    file.type = 'file';
    file.accept = 'image/png,image/jpeg,image/webp,image/gif';
    file.hidden = true;
    file.addEventListener('change', async () => {
      const picked = file.files?.[0];
      file.value = '';
      if (!picked) return;
      try {
        const data = await fileToSticker(picked);
        const { myStickers } = await chrome.storage.local.get('myStickers');
        const mine = Array.isArray(myStickers) ? (myStickers as unknown[]).filter((d): d is string => typeof d === 'string' && d !== data) : [];
        await chrome.storage.local.set({ myStickers: [...mine, data].slice(-12) });
        reactionPage = REACTION_PAGES.length + Math.floor(stickers.size / 8);
        actions.send({ t: 'sticker-add', data });
      } catch (error) {
        const code = error instanceof Error && (error.message === 'type' || error.message === 'too_big') ? error.message : 'broken';
        toast([code === 'type' ? t('stickerType') : code === 'too_big' ? t('stickerBig') : t('stickerBroken')], 'notice');
      }
    });

    // ---- Üst şerit: logo, oda adı | senkron · odaya dön ----
    const roomChip = el('span', 'room-chip');
    const dot = el('span', 'dot');
    const syncText = el('span', '', t('syncUnknown'));
    const sync = el('span', 'sync', dot, syncText);
    const header = el(
      'div',
      'header',
      el('span', 'brand', el('span', 'logo', createLogo(document)), 'ScreenWithMe'),
      roomChip,
      el('span', 'spacer'),
      sync,
      button('btn small', `🏠 ${t('homeShort')}`, t('backToRoom'), confirmHome),
    );

    // ---- Sağ panel: davet linki + Sohbet / Kişiler ----
    const invite = el('input');
    invite.readOnly = true;
    invite.title = t('invite');
    invite.addEventListener('focus', () => invite.select());
    const copy = button('btn primary', t('copy'), t('copyInvite'), async () => {
      if (!room) return;
      await copyText(room.inviteUrl);
      copy.textContent = t('copied');
      setTimeout(() => (copy.textContent = t('copy')), 1500);
    });
    const inviteCard = el('section', 'card invite-card', el('span', 'label', t('invite')), el('div', 'row', invite, copy));

    const badge = el('span', 'badge');
    badge.hidden = true;
    const chatTab = el('button', 'tab', el('span', '', '💬'), t('chatTab'), badge);
    const peopleTab = el('button', 'tab', '👥');
    for (const b of [chatTab, peopleTab]) b.type = 'button';
    const chatList = el('ul', 'chat-list', el('li', 'chat-empty', t('chatEmpty')));
    const chatInput = el('input');
    chatInput.maxLength = CHAT_MAX_LENGTH;
    chatInput.placeholder = t('chatPlaceholder');
    chatInput.autocomplete = 'off';
    const chatForm = el('form', 'row chat-form', chatInput, el('button', 'btn primary', t('send')));
    chatForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = cleanChatText(chatInput.value);
      if (text) actions.send({ t: 'chat', text });
      chatInput.value = '';
    });
    const chatPanel = el('div', 'panel', chatList, chatForm);
    const peopleList = el('ul', 'people');
    const peoplePanel = el('div', 'panel', peopleList);
    chatTab.addEventListener('click', () => showTab('chat'));
    peopleTab.addEventListener('click', () => showTab('people'));
    const tabsCard = el('section', 'card tabs-card', el('nav', 'tabs', chatTab, peopleTab), chatPanel, peoplePanel);
    const side = el('aside', 'side', inviteCard, tabsCard);

    // ---- Videonun altı: pin şeridi + araç çubuğu ----
    const pinRow = el('div', 'pins');
    const speed = speedSelect((value) => actions.onRate(value));
    const toolbar = el(
      'div',
      'toolbar',
      reactionBar(),
      el(
        'div',
        'toolbar-right',
        button('icon-btn sticker-add', '🖼️', t('stickerAdd'), () => file.click()),
        button('icon-btn', '📌', t('pinHint'), () => setPinning(true)),
        button('icon-btn', '🔄', t('syncAll'), () => actions.onSyncAll()),
        el(
          'div',
          'speed',
          button('icon-btn step', '−', t('speedDown'), () => actions.onRate(stepRate(rate, -1))),
          speed,
          button('icon-btn step', '+', t('speedUp'), () => actions.onRate(stepRate(rate, 1))),
        ),
        button('icon-btn big', '⛶', t('fullscreen'), () => void enterFullscreen()),
      ),
    );
    const below = el('div', 'below', pinRow, toolbar);
    const shell = el('div', 'shell', header, side, below);

    // ---- Tam ekran: mesaj tutamağı + altta kontroller ----
    const handle = el('div', 'toast-handle', t('toastHandle'));
    handle.title = t('toastHandleHint');
    makeDraggable(handle);
    handle.addEventListener('dblclick', () => {
      pos = null;
      void chrome.storage.local.remove('toastPos');
      placeToasts();
    });
    const fsPins = el('div', 'pins');
    const seek = el('input', 'fs-seek');
    seek.type = 'range';
    seek.min = '0';
    seek.max = '1000';
    seek.value = '0';
    // Videoyu sarınca motor bunu kullanıcı sarması sayıp odaya yayar. Sürüklerken çubuk eski yere zıplamasın.
    seek.addEventListener('pointerdown', () => (seeking = true));
    seek.addEventListener('pointerup', () => (seeking = false));
    seek.addEventListener('input', () => {
      if (video && Number.isFinite(video.duration) && video.duration > 0) video.currentTime = (Number(seek.value) / 1000) * video.duration;
    });
    const time = el('span', 'fs-time', '0:00 / 0:00');
    const play = button('fs-btn', '▶', t('playPause'), () => {
      if (!video) return;
      if (video.paused) void video.play().catch(() => {});
      else video.pause();
    });
    const fsInput = el('input');
    fsInput.maxLength = CHAT_MAX_LENGTH;
    fsInput.placeholder = t('quickChat');
    fsInput.autocomplete = 'off';
    const fsForm = el('form', '', fsInput);
    fsForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = cleanChatText(fsInput.value);
      if (text) actions.send({ t: 'chat', text });
      fsInput.value = '';
    });
    const fsSpeed = speedSelect((value) => actions.onRate(value));
    const fsControls = el(
      'div',
      'fs-controls',
      el('div', 'fs-progress', el('div', 'fs-seek-wrap', fsPins, seek), time),
      el(
        'div',
        'fs-row',
        play,
        reactionBar(),
        fsForm,
        button('fs-btn', '📌', t('pinHint'), () => setPinning(true)),
        fsSpeed,
        button('fs-btn', '✕', t('exitFullscreen'), () => void document.exitFullscreen().catch(() => {})),
      ),
    );
    const fs = el('div', 'fs', handle, fsControls);

    // Pin notu kutusu (📌 / P ile açılır, Enter pinler, Esc vazgeçer).
    const pinNote = el('input');
    pinNote.maxLength = PIN_NOTE_MAX;
    pinNote.placeholder = t('pinPlaceholder');
    pinNote.autocomplete = 'off';
    const pinForm = el('form', 'pin-form', pinNote);
    pinForm.hidden = true;
    pinForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const note = cleanChatText(pinNote.value.slice(0, PIN_NOTE_MAX));
      actions.send(note ? { t: 'pin', note } : { t: 'pin' });
      pinNote.value = '';
      setPinning(false);
    });
    pinNote.addEventListener('blur', () => setTimeout(() => pinning && !pinNote.value && setPinning(false), 150));

    drawReactions();
    container.append(feed, toasts, waiting, shell, fs, pinForm, file);
    return {
      feed, toasts, waiting, reactionBars, drawReactions, file, roomChip, dot, syncText, invite, badge, chatTab, peopleTab,
      chatList, chatInput, chatPanel, peopleList, peoplePanel, pinRow, fsPins, speed, fsSpeed, handle, seek, time, play, fsInput,
      pinForm, pinNote,
    };
  }

  function mount(): HTMLElement {
    if (root && host?.isConnected) return root;
    host = document.createElement('swm-overlay');
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = CSS;
    root = el('div', 'root');
    root.classList.toggle('embedded', embeddedMode);
    parts = build(root);
    shadow.append(style, root);
    place();
    positionTimer ??= setInterval(position, 500);
    renderRoom();
    renderChat();
    renderPins();
    showTab(tab);
    setRate(rate);
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
    const fullscreen = !!document.fullscreenElement;
    // Oda görünümünde ve tam ekranda katman tüm ekranı kaplar; diğer durumlarda videonun üstünde durur.
    const shell = roomView && !fullscreen;
    root.classList.toggle('roomview', shell);
    root.classList.toggle('fsmode', fullscreen && !embeddedMode);
    root.classList.toggle('ownfs', document.fullscreenElement === document.documentElement);
    root.style.setProperty('--fs-bottom', `${FS_BOTTOM}px`);
    const rect = shell || fullscreen || !video?.isConnected ? null : video.getBoundingClientRect();
    const box = rect ?? { left: 0, top: 0, width: innerWidth, height: innerHeight };
    Object.assign(root.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
    const layout = roomLayout(innerWidth);
    for (const key of ['top', 'right', 'bottom', 'left', 'side'] as const) root.style.setProperty(`--${key}`, `${layout[key]}px`);
    if (fullscreen) updateProgress();
    placeToasts();
  }

  /** Tam ekran ilerleme çubuğu, süre ve oynat düğmesi. */
  function updateProgress(): void {
    if (!parts || !video) return;
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (!seeking) parts.seek.value = duration > 0 ? String(Math.round((video.currentTime / duration) * 1000)) : '0';
    parts.time.textContent = `${clock(video.currentTime)} / ${clock(duration)}`;
    parts.play.textContent = video.paused ? '▶' : '⏸';
  }

  /** Fare oynayınca tam ekran kontrolleri görünür, hareketsiz kalınca solar (yazı yazarken solmaz). */
  function wake(): void {
    if (!root) return;
    root.classList.remove('idle');
    if (idleTimer !== null) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      const focused = (root?.getRootNode() as ShadowRoot | null)?.activeElement;
      if (focused && /^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName)) return wake();
      root?.classList.add('idle');
    }, IDLE_MS);
  }

  // ---- Sohbet ve kişiler ----

  function showTab(next: 'chat' | 'people'): void {
    tab = next;
    if (!parts) return;
    parts.chatTab.setAttribute('aria-selected', String(next === 'chat'));
    parts.peopleTab.setAttribute('aria-selected', String(next === 'people'));
    parts.chatPanel.hidden = next !== 'chat';
    parts.peoplePanel.hidden = next !== 'people';
    if (next === 'chat') {
      unread = 0;
      renderBadge();
      parts.chatList.scrollTop = parts.chatList.scrollHeight;
    }
  }

  /** Enter: sohbet kutusuna git (tam ekranda hızlı mesaj kutusu). */
  function focusChat(): void {
    if (!parts) return;
    wake();
    if (document.fullscreenElement) {
      parts.fsInput.focus();
    } else if (roomView) {
      showTab('chat');
      parts.chatInput.focus();
    }
  }

  function renderBadge(): void {
    if (!parts) return;
    parts.badge.hidden = unread === 0;
    parts.badge.textContent = unread > 9 ? '9+' : String(unread);
  }

  function chatNode(line: ChatLine): HTMLElement {
    return el(
      'li',
      line.mine ? 'chat-line me' : 'chat-line',
      avatarEl(line.avatar, 'chat-avatar'),
      el(
        'div',
        'chat-body',
        el('div', 'chat-meta', el('span', 'chat-name', line.name), el('time', '', chatTime(line.at))),
        el('p', 'chat-text', line.text),
      ),
    );
  }

  function renderChat(): void {
    if (!parts) return;
    parts.chatList.replaceChildren(el('li', 'chat-empty', t('chatEmpty')), ...chatLines.map(chatNode));
    parts.chatList.scrollTop = parts.chatList.scrollHeight;
  }

  function renderRoom(): void {
    if (!parts || !room) return;
    root?.classList.toggle('no-react', room.noReactions);
    parts.roomChip.textContent = room.roomName ?? t('room', { id: room.roomId });
    parts.invite.value = room.inviteUrl;
    parts.peopleTab.textContent = `👥 ${room.members.length}`;
    parts.peopleTab.title = t('members', { n: room.members.length });
    parts.peopleList.replaceChildren(
      ...room.members.map((m) => {
        const name = m.name + (m.id === room!.myId ? ` (${t('you')})` : '');
        const row = el('li', m.id === room!.myId ? 'person me' : 'person', avatarEl(m.avatar, 'person-avatar'), el('span', 'person-name', name));
        if (m.client === 'ext') row.append(el('span', '', '🎬'));
        if (m.id === room!.hostId) row.append(el('span', '', '👑'));
        return row;
      }),
    );
    parts.drawReactions();
  }

  // ---- Pinlenmiş anlar ----
  let pins: Array<Pin & { removable: boolean }> = [];
  /** Pin notu kutusu açık mı (📌 ya da P'ye basıldı). */
  let pinning = false;

  /** Pin şeritlerini çizer (videonun altı + tam ekran): tıklayınca oraya gidilir, kendi pininde × ile kaldırılır. */
  function renderPins(): void {
    if (!parts) return;
    const duration = video && Number.isFinite(video.duration) ? video.duration : 0;
    for (const row of [parts.pinRow, parts.fsPins]) {
      if (pins.length === 0 || duration <= 0) {
        row.replaceChildren();
        continue;
      }
      const marks = pins.map((pin) => {
        const who = pin.by.name + (pin.note ? `: ${pin.note}` : '');
        const mark = button('pin-mark', '📌', t('pinTitle', { time: clock(pin.at), who }), () => {
          if (video) video.currentTime = pin.at;
        });
        const wrap = el('span', 'pin-wrap', mark);
        if (pin.removable) wrap.append(button('pin-x', '×', t('pinRemove'), () => actions.send({ t: 'unpin', id: pin.id })));
        wrap.style.left = `${Math.min(100, (pin.at / duration) * 100)}%`;
        return wrap;
      });
      row.replaceChildren(el('div', 'pin-track'), el('div', 'pin-now'), ...marks);
    }
    moveNow();
  }

  /** Şeritte videonun şu anki yerini gösteren çizgi. */
  function moveNow(): void {
    if (!parts || !video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const left = `${Math.min(100, (video.currentTime / video.duration) * 100)}%`;
    for (const mark of [parts.pinRow, parts.fsPins].map((row) => row.querySelector<HTMLElement>('.pin-now'))) if (mark) mark.style.left = left;
  }
  setInterval(moveNow, 1000);

  /** Pin not kutusunu açar/kapatır (Enter pinler, Esc vazgeçer). */
  function setPinning(on: boolean): void {
    pinning = on;
    if (!parts) return;
    parts.pinForm.hidden = !on;
    if (on) {
      wake();
      parts.pinNote.focus();
    } else {
      parts.pinNote.blur();
    }
  }

  function setRate(value: number): void {
    rate = value;
    if (!parts) return;
    for (const select of [parts.speed, parts.fsSpeed]) {
      select.querySelector('option[data-custom]')?.remove();
      if (!SPEEDS.includes(value)) {
        const option = el('option', '', `${value}x`);
        option.value = String(value);
        option.dataset.custom = '';
        select.append(option);
      }
      select.value = String(value);
    }
  }

  // ---- Tam ekran ve mesaj tutamağı ----

  /** ⛶: bu çerçeve (oda görünümüyle birlikte) tam ekran olur; çerçeveye izin yoksa söyleriz. */
  async function enterFullscreen(): Promise<void> {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      toast([t('fullscreenDenied')], 'notice');
    }
  }

  /** Tam ekranda tutamağı kullanıcının yerine (yoksa sağ üste) koyar, mesajları onun yanına dizer. */
  function placeToasts(): void {
    if (!parts || !root) return;
    const s = parts.toasts.style;
    if (!root.classList.contains('fsmode')) {
      s.left = s.right = s.top = s.bottom = '';
      parts.toasts.classList.remove('left');
      return;
    }
    const w = root.clientWidth;
    const h = root.clientHeight;
    const hw = parts.handle.offsetWidth || 260;
    const hh = parts.handle.offsetHeight || 30;
    const x = pos ? Math.min(Math.max(pos.x * w, 8), Math.max(8, w - hw - 8)) : w - hw - 20;
    const y = pos ? Math.min(Math.max(pos.y * h, 8), Math.max(8, h - hh - 8)) : 20;
    parts.handle.style.left = `${x}px`;
    parts.handle.style.top = `${y}px`;
    // Mesajlar tutamağın yanına hizalanır; tutamak alt taraftaysa yukarı doğru büyür.
    const rightSide = x + hw / 2 > w / 2;
    const up = y + hh / 2 > h * 0.6;
    s.left = rightSide ? 'auto' : `${x}px`;
    s.right = rightSide ? `${w - x - hw}px` : 'auto';
    s.top = up ? 'auto' : `${y + hh + 8}px`;
    s.bottom = up ? `${h - y + 8}px` : 'auto';
    parts.toasts.classList.toggle('left', !rightSide);
  }

  function makeDraggable(handle: HTMLElement): void {
    handle.addEventListener('pointerdown', (event) => {
      if (!root || event.button !== 0) return;
      const rr = root.getBoundingClientRect();
      const hr = handle.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      handle.setPointerCapture(event.pointerId);
      const move = (ev: PointerEvent) => {
        pos = { x: (hr.left - rr.left + ev.clientX - startX) / rr.width, y: (hr.top - rr.top + ev.clientY - startY) / rr.height };
        placeToasts();
        wake();
      };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        if (pos) void chrome.storage.local.set({ toastPos: pos });
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
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

  /** 🏠: önce sor (bu sekmede senkron biter, yanlışlıkla basılmasın). */
  function confirmHome(): void {
    const layer = mount();
    if (layer.querySelector('.confirm-home')) return;
    const yes = el('button', 'btn primary', t('backToRoomYes'));
    const no = el('button', 'btn', t('backToRoomNo'));
    const card = el('div', 'note confirm-home', el('b', '', t('backToRoomTitle')), t('backToRoomText'), el('div', 'actions', yes, no));
    yes.addEventListener('click', () => {
      card.remove();
      actions.onBackToRoom();
    });
    no.addEventListener('click', () => card.remove());
    layer.append(card);
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

  // ---- "Filmi başlat" uyarısı (üst çerçevede, video bulunana kadar) ----
  let hintHost: HTMLElement | null = null;
  let hintTimer: ReturnType<typeof setInterval> | null = null;
  let hintDismissed = false;

  function setHint(on: boolean): void {
    if (!on || hintDismissed) {
      hintHost?.remove();
      hintHost = null;
      if (hintTimer !== null) clearInterval(hintTimer);
      hintTimer = null;
      return;
    }
    if (hintHost?.isConnected) return;
    const hostEl = document.createElement('swm-hint');
    hostEl.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:block;pointer-events:none;';
    const shadow = hostEl.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = HINT_CSS;
    const ring = el('div', 'ring');
    const arrow = el('div', 'arrow', '👇');
    const ok = el('button', '', t('hintOk'));
    const card = el(
      'div',
      'card',
      el('div', 'head', el('span', 'logo', createLogo(document)), t('hintTitle')),
      el('p', '', t('hintText')),
      el('p', 'tip', t('hintTip')),
      ok,
    );
    card.style.pointerEvents = 'auto';
    ok.addEventListener('click', () => {
      hintDismissed = true;
      setHint(false);
    });
    shadow.append(style, ring, arrow, card);
    (document.fullscreenElement ?? document.documentElement).append(hostEl);
    hintHost = hostEl;
    // Oynatıcının yeri değişebilir (kaydırma, sonradan yüklenme): çerçeve, ok ve kart onu izler.
    const layout = () => {
      const player = likelyPlayer();
      const r = player?.getBoundingClientRect();
      const visible = !!r && r.width > 0 && r.bottom > 0 && r.top < innerHeight;
      ring.hidden = arrow.hidden = !visible;
      const cardH = card.offsetHeight || 190;
      if (!visible || !r) {
        // Oynatıcı bulunamadı: kart üstte dursun (ortadaki bir oynat düğmesini kapatmasın).
        card.style.top = '16px';
        return;
      }
      Object.assign(ring.style, { left: `${r.left - 6}px`, top: `${r.top - 6}px`, width: `${r.width + 12}px`, height: `${r.height + 12}px` });
      arrow.style.left = `${r.left + r.width / 2}px`;
      if (r.top - 70 - cardH >= 12) {
        // Yer varsa kart oynatıcının üstünde, ok aşağıyı gösterir.
        arrow.textContent = '👇';
        arrow.style.top = `${r.top - 62}px`;
        card.style.top = `${r.top - 70 - cardH}px`;
      } else if (innerHeight - r.bottom - 70 - cardH >= 12) {
        // Oynatıcı yukarıdaysa kart altında, ok yukarıyı gösterir.
        arrow.textContent = '👆';
        arrow.style.top = `${r.bottom + 14}px`;
        card.style.top = `${r.bottom + 70}px`;
      } else {
        // Oynatıcı ekranı kaplıyor: kart oynatıcının üst kısmında (ortadaki oynat düğmesini kapatmasın);
        // ok yok, parlayan çerçeve yeri gösteriyor.
        arrow.hidden = true;
        card.style.top = `${Math.max(16, r.top + 16)}px`;
      }
    };
    layout();
    hintTimer = setInterval(() => (hostEl.isConnected ? layout() : setHint(false)), 500);
  }

  document.addEventListener('fullscreenchange', place);
  addEventListener('resize', position);
  addEventListener('scroll', position, { passive: true, capture: true });
  document.addEventListener('mousemove', () => host && wake(), { passive: true, capture: true });

  return {
    /** Sitenin içindeki çerçeve: arayüzü site gösterir, burada sadece "İzlemeye başla". */
    setEmbedded(): void {
      embeddedMode = true;
    },

    /** Oda görünümü aç/kapa (videonun yeri content'te focus.ts ile ayarlanır). */
    setRoomView(on: boolean): void {
      roomView = on;
      if (on) setHint(false);
      position();
    },

    /** Video henüz bulunmadı: "Filmi başlat" kartı (sadece üst çerçeve). */
    setHint,

    /** Katmanı bu videonun üstüne yerleştir. */
    follow(next: HTMLVideoElement): void {
      video = next;
      mount();
      position();
      renderPins();
    },

    setRoom(info: RoomInfo): void {
      room = info;
      renderRoom();
    },

    /** Odanın hızını seçicilerde göster. */
    setRate,

    /** Senkron göstergesi: odadan ne kadar uzaktayız (ms); bilinmiyorsa null. */
    setSync(diffMs: number | null): void {
      if (!parts) return;
      const abs = diffMs === null ? null : Math.abs(diffMs);
      parts.dot.className = `dot ${abs === null ? '' : abs < 250 ? 'good' : abs < 1000 ? 'ok' : 'bad'}`;
      parts.syncText.textContent = abs === null ? t('syncUnknown') : t('syncShort', { ms: Math.round(abs) });
      parts.syncText.parentElement!.title = abs === null ? t('syncUnknown') : t('syncDiff', { ms: Math.round(abs) });
    },

    /** Pinlenmiş anlar: arka plan değişince yollar. */
    setPins(next: Array<Pin & { removable: boolean }>): void {
      pins = next;
      renderPins();
    },

    /** Gelen tepki: sol altta avatar + isim + emoji/özel emoji kartı; aynı kişinin aynı tepkisi "×2" olur. */
    reaction(info: { byId: string; name: string; avatar?: string; emoji?: string; sticker?: string }): void {
      mount();
      if (!parts) return;
      const feed = parts.feed;
      const key = `${info.byId}|${info.emoji ?? info.sticker}`;
      const existing = [...feed.children].find((c) => (c as HTMLElement).dataset.key === key) as HTMLElement | undefined;
      if (existing) {
        const count = Number(existing.dataset.count ?? '1') + 1;
        existing.dataset.count = String(count);
        existing.querySelector('.r-count')!.textContent = `×${count}`;
        existing.classList.remove('bump');
        void existing.offsetWidth;
        existing.classList.add('bump');
        expire(existing);
        return;
      }
      let content: HTMLElement;
      if (info.sticker) {
        const data = stickers.get(info.sticker);
        if (!data) return;
        content = stickerImg(data, 'r-sticker');
      } else {
        content = el('span', 'r-emoji', info.emoji ?? '');
      }
      while (feed.childElementCount >= MAX_CARDS) feed.firstElementChild?.remove();
      const card = el('div', 'r-card', avatarEl(info.avatar), el('span', 'r-name', info.name), content, el('span', 'r-count'));
      card.dataset.key = key;
      card.dataset.count = '1';
      feed.append(card);
      expire(card);
    },

    /** Oda ayarı: video bitince sıradakine kendiliğinden geçilsin mi. */
    autoNext(): boolean {
      return room?.autoNext !== false;
    },

    /** Video bitti, otomatik devam kapalı: "▶ Sıradakini başlat" kartı (sırada video varsa). */
    nextCard(title: string, startNext: () => void): void {
      if ((room?.queueLength ?? 0) === 0) return;
      const layer = mount();
      layer.querySelector('.end')?.remove();
      const next = el('button', 'btn primary', t('startNext'));
      const close = el('button', 'btn', t('close'));
      const card = el('div', 'note end', el('b', '', t('videoEnded')), el('div', 'end-title', title), el('div', 'actions', next, close));
      const timer = setTimeout(() => card.remove(), 60_000);
      const done = () => {
        clearTimeout(timer);
        card.remove();
      };
      close.addEventListener('click', done);
      next.addEventListener('click', () => {
        done();
        startNext();
      });
      layer.append(card);
      wake();
    },

    /** Odaya özel emoji eklendi (girişte de odadakiler tek tek gelir). */
    addSticker(id: string, data: string): void {
      stickers.set(id, data);
      // Benim eklediğim mi? (eklentinin kendi listesinde varsa ✕ ile kaldırabilirim)
      void chrome.storage.local.get('myStickers').then(({ myStickers }) => {
        if (Array.isArray(myStickers) && myStickers.includes(data)) mineStickers.add(id);
        parts?.drawReactions();
      });
      parts?.drawReactions();
    },

    removeSticker(id: string): void {
      stickers.delete(id);
      mineStickers.delete(id);
      parts?.drawReactions();
    },

    clearStickers(): void {
      stickers.clear();
      parts?.drawReactions();
    },

    /** Odaya girince: önceki mesajlar (sitedeki gibi sohbet geçmişi). */
    chatHistory(lines: ChatLine[]): void {
      chatLines = lines.slice(-MAX_LINES);
      renderChat();
    },

    chat(line: ChatLine): void {
      mount();
      chatLines.push(line);
      if (chatLines.length > MAX_LINES) chatLines = chatLines.slice(-MAX_LINES);
      if (parts) {
        const list = parts.chatList;
        const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
        list.append(chatNode(line));
        while (list.children.length > MAX_LINES + 1) list.children[1]?.remove();
        if (atBottom || line.mine) list.scrollTop = list.scrollHeight;
      }
      // Panel görünmüyorsa (tam ekran, oda görünümü yok) mesaj ekrana düşer.
      if (document.fullscreenElement || !roomView) toast([el('b', '', line.name), ' ', line.text], line.mine ? 'me' : '');
      else if (tab !== 'chat' && !line.mine) {
        unread++;
        renderBadge();
      }
    },

    /** "Herkes hazır": oda birilerini bekliyorsa üstte bant gösterir. */
    setWaiting(names: string[], me: boolean): void {
      if (names.length === 0 && !parts) return;
      mount();
      if (!parts) return;
      parts.waiting.hidden = names.length === 0;
      parts.waiting.textContent = me ? t('waitingForYou') : t('waitingFor', { names: names.join(', ') });
    },

    notice(kind: 'joined' | 'left' | 'slow' | 'speed' | 'locked', name: string): void {
      const text = kind === 'slow' ? t('slowDown') : kind === 'speed' ? t('speedLocked') : kind === 'locked' ? t('hostLocked') : t(kind, { name });
      toast([text], 'notice');
    },

    /** Ortak geçiş sorusu: "Ali yeni bir sayfa açtı, gidelim mi?" Evet → git, Hayır → burada kal. */
    /** `bare`: bu sayfada senkron durmuşken sorulur; sadece kart görünür. */
    askFollow(kind: 'page' | 'room' | 'home', name: string, hostName: string, answer: (yes: boolean) => void, bare = false): void {
      const layer = mount();
      layer.classList.toggle('bare', bare);
      layer.querySelector('.ask-follow')?.remove();
      const title = kind === 'page' ? t('askPageTitle', { name }) : kind === 'room' ? t('askRoomTitle', { name }) : t('askHomeTitle', { name });
      const text = kind === 'page' ? t('askPageText', { host: hostName }) : kind === 'room' ? t('askRoomText') : t('askHomeText');
      const yes = el('button', 'btn primary', kind === 'page' ? t('askGo') : t('askBack'));
      const no = el('button', 'btn', t('askStay'));
      const card = el('div', 'note ask-follow', el('b', '', title), text, el('div', 'actions', yes, no));
      const done = (value: boolean) => {
        card.remove();
        layer.classList.remove('bare');
        answer(value);
      };
      yes.addEventListener('click', () => done(true));
      no.addEventListener('click', () => done(false));
      layer.append(card);
      wake();
    },

    /** Başka bir siteden gelen davet işareti: sormadan odaya sokma. */
    askJoin(onYes: () => void): void {
      const layer = mount();
      const yes = el('button', 'btn primary', t('joinYes'));
      const no = el('button', 'btn', t('joinNo'));
      const card = el('div', 'note', el('b', '', t('joinTitle')), t('joinText'), el('div', 'actions', yes, no));
      yes.addEventListener('click', () => {
        card.remove();
        onYes();
      });
      no.addEventListener('click', () => {
        card.remove();
        this.unmount();
      });
      layer.append(card);
    },

    /** Oda kapandı: nedenini birkaç saniye göster, sonra katman kalksın. */
    farewell(reason: 'kicked' | 'version' | 'room_full'): void {
      const layer = mount();
      layer.querySelector('.note')?.remove();
      const key = reason === 'kicked' ? 'endedKicked' : reason === 'version' ? 'endedVersion' : 'endedFull';
      layer.append(el('div', 'note', el('b', '', t(`${key}Title`)), t(key)));
      farewellUntil = Date.now() + FAREWELL_MS;
    },

    /** Odaya girince "İyi seyirler" açılışı. */
    intro(): void {
      const layer = mount();
      layer.querySelector('.swm-intro')?.remove();
      layer.append(createIntro(document, t('intro')));
    },

    /** Tarayıcı otomatik oynatmayı engellerse videonun üstünde "İzlemeye başla" gösterir. */
    askToStart(onStart: () => void): void {
      const layer = mount();
      if (layer.querySelector('.start')) return;
      const start = el('button', 'btn primary', t('startWatching'));
      const box = el('div', 'start', el('div', '', t('autoplayBlocked')), start);
      start.addEventListener('click', () => {
        box.remove();
        onStart();
      });
      layer.append(box);
    },

    unmount(): void {
      // Kapanış açıklaması okunabilsin: süresi dolana kadar beklet.
      const wait = farewellUntil - Date.now();
      if (wait > 0) {
        setTimeout(() => this.unmount(), wait);
        return;
      }
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
