import { INTRO_CSS, createIntro } from '@swm/shared/intro';
import { createLogo } from '@swm/shared/logo';
import { fileToSticker } from '@swm/shared/sticker-file';
import { CHAT_MAX_LENGTH, PIN_NOTE_MAX, REACTION_PAGES, avatarText, isDrawnAvatar, cleanChatText, type ClientMessage, type Pin } from '@swm/shared/protocol';
import { t } from './i18n.ts';
import type { ChatLine, RoomInfo } from './messages.ts';

/** Hızlı mesaj kısa mesajlar içindir (popup ile aynı). */
const QUICK_CHAT_MAX = Math.min(120, CHAT_MAX_LENGTH);
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
/** Ekranda aynı anda en fazla bu kadar tepki kartı; kart bu kadar kalır. */
const MAX_CARDS = 5;
const CARD_MS = 3200;
/** Bir tepkiden sonra kısa bekleme (art arda basıp ekranı doldurmasın). */
const COOLDOWN_MS = 1100;
/** Uzun bir sütun olmasın: en fazla bu kadar mesaj aynı anda görünür, kısa sürede kaybolur. */
const MAX_TOASTS = 4;
const TOAST_MS = 5000;
/** Fare bu kadar hareketsiz kalınca buton (ve açıksa çubuk) solar. */
const IDLE_MS = 3000;
/** "Odadan çıkarıldın" gibi kapanış açıklamaları bu kadar ekranda kalır. */
const FAREWELL_MS = 6000;

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
.root { position: fixed; pointer-events: none; z-index: 2147483647; overflow: hidden;
  font: 14px/1.4 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #ecedf1; }

/* Gelen tepkiler: sol altta avatar + isim + emoji kartları (ortada uçuşup dikkat dağıtmasın) */
.feed { position: absolute; left: 12px; bottom: 56px; display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
  max-width: calc(100% - 24px); }
.card { display: flex; align-items: center; gap: 7px; padding: 4px 10px 4px 4px; border-radius: 999px; background: rgb(10 10 18 / .74);
  border: 1px solid rgb(255 255 255 / .12); font-size: 13px; animation: card-in .25s ease-out; }
.card.leaving { animation: card-out .35s ease-in forwards; }
.card.bump .r-emoji, .card.bump .r-sticker { animation: bump .3s ease; }
.r-av { width: 26px; height: 26px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; font-size: 17px; flex: none; }
.r-av img { width: 100%; height: 100%; display: block; }
.r-name { font-weight: 600; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.r-emoji { font-size: 24px; line-height: 1; }
.r-sticker { height: 36px; max-width: 72px; object-fit: contain; border-radius: 6px; display: block; }
.r-count { font-weight: 700; color: #ffd27a; }
.r-count:empty { display: none; }
@keyframes card-in { from { opacity: 0; transform: translateX(-16px); } }
@keyframes card-out { to { opacity: 0; transform: translateX(-16px); } }
@keyframes bump { 50% { transform: scale(1.35); } }
.reactions.cooling .reaction:not(.add) { opacity: .45; pointer-events: none; }
.reaction img { width: 20px; height: 20px; object-fit: contain; border-radius: 3px; display: block; margin: auto; }
.reaction.add { font-weight: 700; color: #b9bccc; border: 1px dashed rgb(255 255 255 / .3); }

/* Mesajlar ve bildirimler: sağ üstteki ScreenWithMe çubuğunun hemen altında belirip kaybolur.
   (top değeri çubuğun yüksekliğine göre JS ile ayarlanır.) */
.toasts { position: absolute; right: 12px; top: 56px; display: flex; flex-direction: column; align-items: flex-end;
  gap: 6px; max-width: min(420px, calc(100% - 24px)); transition: top .2s; }
.toast { background: rgb(0 0 0 / .72); border: 1px solid rgb(255 255 255 / .12); padding: 6px 12px; border-radius: 12px;
  font-size: 16px; overflow-wrap: anywhere; text-align: right; animation: in .2s ease-out; }
.toast b { color: #a48dff; }
.toast.me b { color: #3ccf8e; }
.toast.notice { font-size: 13.5px; color: #c9cbd3; font-style: italic; padding: 4px 11px; }
.toast.leaving { animation: out .4s ease-in forwards; }
@keyframes in { from { opacity: 0; transform: translateX(10px); } }
@keyframes out { to { opacity: 0; transform: translateY(-6px); } }

/* Sağ üst: buton ve kompakt çubuk */
.fab, .bar { position: absolute; top: 12px; right: 12px; pointer-events: auto; transition: opacity .25s; }
.fab { display: flex; align-items: center; gap: 6px; background: rgb(15 16 20 / .85); border: 1px solid rgb(255 255 255 / .18);
  color: #fff; border-radius: 999px; padding: 5px 11px 5px 5px; font: inherit; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 16px rgb(0 0 0 / .4); }
.logo { display: block; width: 22px; height: 22px; }
.logo svg { display: block; width: 100%; height: 100%; }
.badge { background: #7c5cff; border-radius: 999px; padding: 0 6px; font-size: 11px; }
.bar { width: min(490px, calc(100% - 24px)); display: flex; flex-direction: column; gap: 8px; padding: 8px;
  border-radius: 12px; background: rgb(15 16 20 / .88); border: 1px solid rgb(255 255 255 / .12);
  box-shadow: 0 6px 24px rgb(0 0 0 / .45); backdrop-filter: blur(6px); }
.idle .fab, .idle .bar { opacity: 0; pointer-events: none; }
/* Boyutlandırma: sağ alt köşeden sürükle (kare, dikdörtgen...). Uzunsa içinde sohbet geçmişi görünür. */
.bar { position: absolute; min-width: 280px; min-height: 84px; }
.resize { position: absolute; right: 2px; bottom: 2px; width: 14px; height: 14px; cursor: nwse-resize; touch-action: none;
  background: linear-gradient(135deg, transparent 50%, rgb(255 255 255 / .35) 50%, rgb(255 255 255 / .35) 60%, transparent 60%,
  transparent 72%, rgb(255 255 255 / .35) 72%, rgb(255 255 255 / .35) 82%, transparent 82%); border-radius: 0 0 10px 0; }
.log { display: none; flex: 1; min-height: 0; overflow-y: auto; flex-direction: column; gap: 3px; padding: 6px 8px; border-radius: 8px;
  background: rgb(255 255 255 / .04); font-size: 13px; }
.bar.tall .log { display: flex; }
.log .line b { margin-right: 5px; }
.log .line.me b { color: #a48dff; }
.log:empty::before { content: attr(data-empty); color: #8b8f9c; font-size: 12px; }
.bar .reactions { flex-wrap: wrap; }
.row { display: flex; align-items: center; gap: 4px; min-width: 0; }
.row > * { flex: none; }
.row > .spacer { flex: 1; min-width: 2px; }
/* Dar yerde (ya da odada çok kişi varken) emojiler daralır; sağdaki düğmeler ve ✕ dışarı taşmaz */
.row > .reactions { flex: 0 1 auto; min-width: 0; overflow: hidden; display: flex; gap: 4px; }
.row > form { flex: 1; }
.reaction { width: 28px; height: 28px; border-radius: 999px; background: rgb(255 255 255 / .06);
  border: 1px solid rgb(255 255 255 / .12); font-size: 15px; cursor: pointer; padding: 0; }
.reaction:hover { background: rgb(255 255 255 / .16); }
.icon { min-width: 28px; height: 28px; border-radius: 8px; background: rgb(255 255 255 / .06); color: #fff;
  border: 1px solid rgb(255 255 255 / .12); font: inherit; font-size: 13px; cursor: pointer; padding: 0 6px; white-space: nowrap;
  display: inline-flex; align-items: center; justify-content: center; gap: 3px; }
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

/* "Herkes hazır" bekleme bandı (üst orta) */
.waiting { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); padding: 7px 14px; border-radius: 999px;
  background: rgb(0 0 0 / .78); border: 1px solid rgb(255 255 255 / .15); font-size: 16px; font-weight: 600;
  white-space: nowrap; max-width: 50%; overflow: hidden; text-overflow: ellipsis; }

/* Otomatik oynatma engellenince */
.start { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; background: rgb(0 0 0 / .7); pointer-events: auto; font-size: 17px; text-align: center; padding: 16px; }
.start button { font: inherit; font-weight: 600; color: #fff; background: #7c5cff; border: 0; border-radius: 10px;
  padding: 12px 22px; cursor: pointer; }
/* Film sitenin içinde açıldı: çubuğu, mesajları site gösteriyor; burada sadece "İzlemeye başla". */
.root.embedded > :not(.start) { display: none !important; }

/* Emoji sayfaları: yanındaki küçük ▲▼ ile diğer emojiler */
.reactions { display: flex; gap: 4px; }
.reactions > * { flex: none; }
.pager { display: flex; flex-direction: column; gap: 2px; margin-left: 2px; }
.pager button { width: 18px; height: 13px; padding: 0; border-radius: 4px; font-size: 7px; line-height: 1; color: #fff; cursor: pointer;
  background: rgb(255 255 255 / .06); border: 1px solid rgb(255 255 255 / .12); }
.pager button:hover { background: rgb(255 255 255 / .18); }
/* Ortada kısa bilgi kartı: katılma onayı, "çıkarıldın" gibi kapanış nedenleri */
.note { position: absolute; left: 50%; top: 18%; transform: translateX(-50%); width: min(380px, calc(100% - 24px));
  pointer-events: auto; background: rgb(15 16 20 / .94); border: 1px solid rgb(255 255 255 / .16); border-radius: 14px;
  padding: 16px 18px; text-align: center; font-size: 15px; box-shadow: 0 12px 40px rgb(0 0 0 / .5); animation: in .25s ease-out; }
.note b { display: block; font-size: 16px; margin-bottom: 6px; }
.note .actions { display: flex; gap: 8px; justify-content: center; margin-top: 12px; }
.note button { font: inherit; font-weight: 600; color: #fff; background: rgb(255 255 255 / .08); border: 1px solid rgb(255 255 255 / .18);
  border-radius: 9px; padding: 8px 16px; cursor: pointer; }
.note button.primary { background: #7c5cff; border-color: #7c5cff; }

/* Sürüklenebilir çubuk: tutamak ve mesajların sola/yukarı dizilmesi */
.fab { touch-action: none; }
.grip { cursor: grab; color: #9a9fad; font-size: 16px; padding: 0 3px 0 1px; user-select: none; touch-action: none; }
.grip:active { cursor: grabbing; }
.toasts.left { align-items: flex-start; }
.toasts.left .toast { text-align: left; }

/* İlk kez gelene rehber: kart + düğmeyi gösteren zıplayan ok */
.guide { position: relative; left: auto; top: auto; transform: none; text-align: left; width: min(380px, calc(100vw - 32px));
  max-height: calc(100vh - 32px); overflow-y: auto; font: 14px/1.4 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #ecedf1; }
.guide > b { padding-right: 32px; }
.end .end-title { color: #d8d2ff; font-weight: 600; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.end .end-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 13.5px; margin-bottom: 6px; }
.end .end-pin { font-size: 12.5px; text-align: left; color: #c9cbd3; }
.guide label { justify-content: flex-start; }
.guide label input { flex: none; width: 16px; height: 16px; margin: 0; accent-color: #7c5cff; }
.guide .guide-x { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; padding: 0; border-radius: 8px; font-size: 14px; }
.fab.glow { animation: glow 1.2s ease-in-out infinite; }
@keyframes glow { 50% { box-shadow: 0 0 0 4px rgb(164 141 255 / .55), 0 0 18px 4px rgb(164 141 255 / .45); } }
.guide ul { margin: 8px 0 0; padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; font-size: 14px; }
.guide li { display: flex; gap: 8px; align-items: flex-start; }
.guide li span:first-child { flex: none; width: 22px; text-align: center; }
.guide label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #c9cbd3; margin-top: 12px; cursor: pointer; }
.guide .actions { justify-content: flex-end; margin-top: 10px; }
.pointer { position: absolute; font-size: 30px; color: #a48dff; filter: drop-shadow(0 2px 6px rgb(0 0 0 / .6));
  animation: bob 0.9s ease-in-out infinite; pointer-events: none; }
@keyframes bob { 50% { transform: translateY(-8px); } }
/* Pinlenmiş anlar: çubuğun altında ince şerit; 📌'e tıklayınca oraya gidilir */
.pins { position: relative; height: 22px; margin: -4px 2px -2px; }
.pin-track { position: absolute; left: 0; right: 0; bottom: 4px; height: 3px; border-radius: 2px; background: rgb(255 255 255 / .12); }
.pin-now { position: absolute; bottom: 2px; width: 2px; height: 7px; border-radius: 1px; background: #fff; opacity: .6; }
.pin-wrap { position: absolute; bottom: 0; transform: translateX(-50%); display: flex; align-items: flex-end; }
.pin-mark { background: none; border: 0; padding: 0; font-size: 13px; line-height: 1; cursor: pointer; }
.pin-mark:hover { transform: scale(1.3); }
.pin-x { display: none; width: 14px; height: 14px; padding: 0; border-radius: 999px; border: 1px solid rgb(255 255 255 / .25);
  background: #222; color: #fff; font-size: 10px; line-height: 11px; cursor: pointer; }
.pin-wrap:hover .pin-x { display: block; }
form.pinning input { border-color: #e9b949; }
${INTRO_CSS}
`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}

/** 75 → "1:15", 3725 → "1:02:05". */
function clock(seconds: number): string {
  const s = Math.floor(seconds);
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
function avatarEl(avatar: string | undefined): HTMLElement {
  const box = el('span', 'r-av');
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

export interface OverlayActions {
  send: (message: ClientMessage) => void;
  onRate: (rate: number) => void;
  /** 🏠 Odaya dön: film bitti ya da başka bir şey izlenecek. */
  onBackToRoom: () => void;
}

/**
 * Videonun tam üstüne oturan saydam katman: uçuşan emojiler, sağ üstte
 * beliren mesajlar ve sağ üstte fare oynayınca çıkan ScreenWithMe butonuyla
 * açılan kompakt çubuk (emoji, hızlı mesaj, hız, odadakiler, davet).
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
  /** Film sitenin içinde (iframe) açık: sadece "İzlemeye başla" kartı gösterilir. */
  let embeddedMode = false;
  let rate = 1;
  let barOpen = false;
  let unread = 0;
  let reactionPage = 0;
  /** Kapanış açıklaması bu ana kadar ekranda kalır. */
  let farewellUntil = 0;
  /** Sayfaya sabitlenen rehber kartı (açıksa). */
  let guideHost: HTMLElement | null = null;
  /**
   * Düğme/çubuğun kullanıcının sürüklediği yeri (videoya göre oran, sol üst köşe). null:
   * varsayılan sağ üst. Mesajlar hep onun altında (alttaysa üstünde) akar. Hatırlanır.
   */
  let pos: { x: number; y: number } | null = null;
  let suppressClick = false;
  /** Çubuğun kullanıcı boyutu (px); null: varsayılan. Hatırlanır. */
  let size: { w: number; h: number } | null = null;
  void chrome.storage.local
    .get('barSize')
    .then(({ barSize }) => {
      const z = barSize as { w?: unknown; h?: unknown } | undefined;
      if (z && typeof z.w === 'number' && typeof z.h === 'number') {
        size = { w: z.w, h: z.h };
        applySize();
      }
    })
    .catch(() => {});
  void chrome.storage.local
    .get('barPos')
    .then(({ barPos }) => {
      const p = barPos as { x?: unknown; y?: unknown } | undefined;
      if (p && typeof p.x === 'number' && typeof p.y === 'number') {
        pos = { x: p.x, y: p.y };
        layout();
      }
    })
    .catch(() => {});

  // Çubuğa yazarken basılan tuşlar sitenin ve başka eklentilerin kısayollarını
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
        if (type === 'keydown' && event.key === 'Escape') {
          if (pinning) setPinning(false);
          else setBar(false);
        }
      },
      true,
    );
  }

  // ---- Tepkiler: üç emoji sayfası + özel emoji (GIF/resim) sayfaları ----
  type Item = { emoji: (typeof REACTION_PAGES)[number][number] } | { sticker: string } | { add: true };
  const stickers = new Map<string, string>();
  let coolUntil = 0;
  /** 🖼️'ye basınca şerit özel emojilere (ve "+ Ekle"ye) döner; tekrar basınca emojilere. */
  let stickerMode = false;
  function reactionPages(): Item[][] {
    if (!stickerMode) return REACTION_PAGES.map((p) => p.map((emoji) => ({ emoji })));
    const ids = [...stickers.keys()];
    const list: Item[][] = [];
    for (let i = 0; i === 0 || i < ids.length; i += 7) list.push([...ids.slice(i, i + 7).map((sticker) => ({ sticker })), { add: true }]);
    return list;
  }
  /** Tepki yolla; ardından kısa bekleme (art arda basıp ekranı doldurmasın). "+" dosya seçtirir. */
  function fire(item: Item): void {
    if ('add' in item) {
      parts?.file.click();
      return;
    }
    if (Date.now() < coolUntil) return;
    coolUntil = Date.now() + COOLDOWN_MS;
    actions.send('emoji' in item ? { t: 'react', emoji: item.emoji } : { t: 'react', sticker: item.sticker });
    parts?.reactions.classList.add('cooling');
    setTimeout(() => parts?.reactions.classList.remove('cooling'), COOLDOWN_MS);
  }

  // Kısayollar (odadayken): 1–8 emoji, Enter hızlı mesaj. Çoğu oynatıcı rakamlarla videoyu
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
        if (!item || 'add' in item) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        swallowed.add(event.code);
        if (!event.repeat) fire(item);
        wake();
      } else if (event.key.toLowerCase() === 'p') {
        event.preventDefault();
        event.stopImmediatePropagation();
        swallowed.add(event.code);
        setPinning(true);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        event.stopImmediatePropagation();
        swallowed.add(event.code);
        setBar(true);
        parts.input.focus();
      }
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
    const floats = el('div', 'feed');
    const toasts = el('div', 'toasts');

    const badge = el('span', 'badge');
    badge.hidden = true;
    const fab = el('button', 'fab', el('span', 'logo', createLogo(document)), 'ScreenWithMe', badge);
    fab.type = 'button';
    fab.addEventListener('click', () => {
      if (!suppressClick) setBar(true);
    });
    makeDraggable(fab);

    // 1. satır: emojiler (▲▼ ile sayfa) | senkron · odadakiler · davet · kapat
    const reactions = el('span', 'reactions');
    const drawReactions = () => {
      const all = reactionPages();
      if (reactionPage >= all.length) reactionPage = 0;
      reactions.replaceChildren(
        ...all[reactionPage]!.map((item, i) => {
          if ('add' in item) return button('reaction add', '+', t('stickerAdd'), () => fire(item));
          const b = button('reaction', 'emoji' in item ? item.emoji : '', `${t('react')} (${i + 1})`, () => fire(item));
          if ('sticker' in item) b.append(stickerImg(stickers.get(item.sticker) ?? '', ''));
          return b;
        }),
      );
    };
    drawReactions();
    const turn = (step: number) => {
      const count = reactionPages().length;
      reactionPage = (reactionPage + step + count) % count;
      drawReactions();
    };
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
        actions.send({ t: 'sticker-add', data });
      } catch (error) {
        const code = error instanceof Error && (error.message === 'type' || error.message === 'too_big') ? error.message : 'broken';
        toast([code === 'type' ? t('stickerType') : code === 'too_big' ? t('stickerBig') : t('stickerBroken')], '');
      }
    });
    const pager = el('span', 'pager', button('', '▲', t('moreReactions'), () => turn(-1)), button('', '▼', t('moreReactions'), () => turn(1)));
    // Özel emojiler her zaman bir tık uzakta: 🖼️ şeridi özel emojilere çevirir (😀 geri döner).
    const stickerToggle = button('icon sticker-toggle', '🖼️', t('stickerOpen'), () => {
      stickerMode = !stickerMode;
      reactionPage = 0;
      stickerToggle.textContent = stickerMode ? '😀' : '🖼️';
      stickerToggle.title = stickerMode ? t('stickerBack') : t('stickerOpen');
      drawReactions();
    });
    // Fare tekerleğiyle de sayfa değişir.
    reactions.addEventListener('wheel', (event) => {
      event.preventDefault();
      turn(event.deltaY > 0 ? 1 : -1);
    }, { passive: false });
    const dot = el('span', 'dot');
    // Odadakiler: sayı görünür, isimler üstüne gelince.
    const members = el('span', 'icon members', '👥');
    const copy = button('icon', '🔗', t('copyInvite'), async () => {
      if (!room) return;
      await copyText(room.inviteUrl);
      copy.textContent = '✓';
      setTimeout(() => (copy.textContent = '🔗'), 1500);
    });
    // 📌: bu anı pinle (hızlı mesaj kutusu not moduna geçer, Enter pinler).
    const pin = button('icon', '📌', t('pinHint'), () => setPinning(!pinning));
    // Odaya dönmeden önce sor: bu sekmede senkron biter, yanlışlıkla basılmasın.
    const home = button('icon', '🏠', t('backToRoom'), () => {
      const layer = mount();
      if (layer.querySelector('.confirm-home')) return;
      const yes = el('button', 'primary', t('backToRoomYes'));
      const no = el('button', '', t('backToRoomNo'));
      const card = el('div', 'note confirm-home', el('b', '', t('backToRoomTitle')), t('backToRoomText'), el('div', 'actions', yes, no));
      yes.addEventListener('click', () => {
        card.remove();
        actions.onBackToRoom();
      });
      no.addEventListener('click', () => card.remove());
      layer.append(card);
    });
    const close = button('icon', '✕', t('close'), () => setBar(false));
    // Tutamak: sürükleyerek çubuğu taşı, çift tıkla eski yerine (sağ üst) al.
    const grip = el('span', 'grip', '⠿');
    grip.title = t('dragHint');
    makeDraggable(grip);
    grip.addEventListener('dblclick', () => {
      pos = null;
      void chrome.storage.local.remove('barPos');
      layout();
    });

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
      if (pinning) {
        const note = cleanChatText(input.value.slice(0, PIN_NOTE_MAX));
        actions.send(note ? { t: 'pin', note } : { t: 'pin' });
        input.value = '';
        setPinning(false);
        return;
      }
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
    // Sohbet geçmişi (çubuk uzatılınca görünür) ve boyutlandırma tutamağı
    const log = el('div', 'log');
    log.dataset.empty = t('logEmpty');
    const resize = el('span', 'resize');
    resize.title = t('resizeHint');
    makeResizable(resize);
    resize.addEventListener('dblclick', () => {
      size = null;
      void chrome.storage.local.remove('barSize');
      applySize();
    });
    // 3. satır: pin şeridi (pin varken görünür)
    const pinRow = el('div', 'pins');
    pinRow.hidden = true;

    const bar = el(
      'div',
      'bar',
      el('div', 'row', grip, reactions, pager, stickerToggle, el('span', 'spacer'), dot, members, copy, pin, home, close),
      log,
      el('div', 'row', form, speed),
      pinRow,
      resize,
    );
    bar.hidden = true;

    const waiting = el('div', 'waiting');
    waiting.hidden = true;

    container.append(floats, toasts, waiting, fab, bar, file);
    return { floats, toasts, waiting, fab, badge, bar, dot, members, input, speed, pinRow, form, reactions, drawReactions, file, log };
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
    layout();
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

  /** Bu videoda gelen tepki sayısı (izleme sonu kartı için). */
  let reactionCount = 0;

  // ---- Pinlenmiş anlar ----
  let pins: Array<Pin & { removable: boolean }> = [];
  let nowMark: HTMLElement | null = null;
  /** Hızlı mesaj kutusu pin notu modunda mı (📌 ya da P'ye basıldı). */
  let pinning = false;

  /** Pin şeridini çizer: her pin 📌; tıklayınca oraya gidilir, kendi pininde × ile kaldırılır. */
  function renderPins(): void {
    if (!parts) return;
    const row = parts.pinRow;
    const duration = video && Number.isFinite(video.duration) ? video.duration : 0;
    const show = pins.length > 0 && duration > 0;
    row.hidden = !show;
    nowMark = null;
    if (!show) {
      row.replaceChildren();
      return;
    }
    nowMark = el('div', 'pin-now');
    const marks = pins.map((pin) => {
      const who = pin.by.name + (pin.note ? `: ${pin.note}` : '');
      const mark = button('pin-mark', '📌', t('pinTitle', { time: clock(pin.at), who }), () => {
        // Videoyu oraya sarınca motor bunu kullanıcı sarması sayıp odaya yayar.
        if (video) video.currentTime = pin.at;
      });
      const wrap = el('span', 'pin-wrap', mark);
      if (pin.removable) wrap.append(button('pin-x', '×', t('pinRemove'), () => actions.send({ t: 'unpin', id: pin.id })));
      wrap.style.left = `${Math.min(100, (pin.at / duration) * 100)}%`;
      return wrap;
    });
    row.replaceChildren(el('div', 'pin-track'), nowMark, ...marks);
    moveNow();
  }

  /** Şeritte videonun şu anki yerini gösteren çizgi. */
  function moveNow(): void {
    if (!nowMark || !video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    nowMark.style.left = `${Math.min(100, (video.currentTime / video.duration) * 100)}%`;
  }
  setInterval(() => barOpen && moveNow(), 1000);

  /** Hızlı mesaj kutusunu pin notu moduna alır/çıkarır. */
  function setPinning(on: boolean): void {
    pinning = on;
    if (!parts) return;
    parts.form.classList.toggle('pinning', on);
    parts.input.placeholder = on ? t('pinPlaceholder') : t('chatPlaceholder');
    parts.input.maxLength = on ? PIN_NOTE_MAX : QUICK_CHAT_MAX;
    if (on) {
      setBar(true);
      parts.input.focus();
    }
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
    applySize();
    wake();
  }

  /** Düğme ve çubuğu kullanıcının seçtiği yere (yoksa sağ üste) koyar, mesajları ona göre dizer. */
  function layout(): void {
    if (!parts || !root) return;
    const w = root.clientWidth;
    const h = root.clientHeight;
    for (const node of [parts.fab, parts.bar]) {
      if (!pos) {
        node.style.left = node.style.top = node.style.right = '';
        continue;
      }
      const nw = node.offsetWidth || (node === parts.bar ? 470 : 140);
      const nh = node.offsetHeight || (node === parts.bar ? 84 : 34);
      node.style.right = 'auto';
      node.style.left = `${Math.min(Math.max(pos.x * w, 4), Math.max(4, w - nw - 4))}px`;
      node.style.top = `${Math.min(Math.max(pos.y * h, 4), Math.max(4, h - nh - 4))}px`;
    }
    placeToasts();
  }

  /** Mesajları buton/çubuk hangisi görünüyorsa onun altına (alt yarıdaysa üstüne) koyar. */
  function placeToasts(): void {
    if (!parts || !root) return;
    const anchor = barOpen ? parts.bar : parts.fab;
    const s = parts.toasts.style;
    if (!pos) {
      const height = anchor.getBoundingClientRect().height || (barOpen ? 84 : 34);
      s.left = s.bottom = '';
      s.right = '12px';
      s.top = `${12 + height + 8}px`;
      parts.toasts.classList.remove('left', 'up');
      return;
    }
    const rr = root.getBoundingClientRect();
    const ar = anchor.getBoundingClientRect();
    const ax = ar.left - rr.left;
    const ay = ar.top - rr.top;
    const rightSide = ax + ar.width / 2 > rr.width / 2;
    const up = ay + ar.height / 2 > rr.height * 0.6;
    s.left = rightSide ? 'auto' : `${ax}px`;
    s.right = rightSide ? `${rr.width - ax - ar.width}px` : 'auto';
    s.top = up ? 'auto' : `${ay + ar.height + 8}px`;
    s.bottom = up ? `${rr.height - ay + 8}px` : 'auto';
    parts.toasts.classList.toggle('left', !rightSide);
    parts.toasts.classList.toggle('up', up);
  }

  /** Düğmeyi/tutamağı sürükleyerek çubuğun yerini değiştirme (5 px'ten azı tıklama sayılır). */
  /** Kullanıcı boyutunu çubuğa uygular (videodan büyük olamaz); uzunsa sohbet geçmişi açılır. */
  function applySize(): void {
    if (!parts || !root) return;
    const bar = parts.bar;
    if (!size) {
      bar.style.width = '';
      bar.style.height = '';
      bar.classList.remove('tall');
    } else {
      const box = root.getBoundingClientRect();
      const w = Math.min(Math.max(size.w, 280), Math.max(280, box.width - 16));
      const h = Math.min(Math.max(size.h, 84), Math.max(84, box.height - 16));
      bar.style.width = `${w}px`;
      bar.style.height = `${h}px`;
      bar.classList.toggle('tall', h >= 170);
    }
    layout();
  }

  function makeResizable(handle: HTMLElement): void {
    handle.addEventListener('pointerdown', (event) => {
      if (!parts || event.button !== 0) return;
      event.stopPropagation();
      const start = parts.bar.getBoundingClientRect();
      const sx = event.clientX;
      const sy = event.clientY;
      handle.setPointerCapture(event.pointerId);
      const move = (ev: PointerEvent) => {
        size = { w: start.width + ev.clientX - sx, h: start.height + ev.clientY - sy };
        applySize();
        wake();
      };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        if (size) void chrome.storage.local.set({ barSize: size });
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  }

  function makeDraggable(handle: HTMLElement): void {
    handle.addEventListener('pointerdown', (event) => {
      if (!root || !parts || event.button !== 0) return;
      const target = barOpen ? parts.bar : parts.fab;
      const rr = root.getBoundingClientRect();
      const tr = target.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const offX = tr.left - rr.left;
      const offY = tr.top - rr.top;
      let moved = false;
      handle.setPointerCapture(event.pointerId);
      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!moved && Math.hypot(dx, dy) < 5) return;
        moved = true;
        pos = { x: (offX + dx) / rr.width, y: (offY + dy) / rr.height };
        layout();
        wake();
      };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        if (!moved) return;
        // Sürükleme bitti: ardından gelen tıklama çubuğu açmasın.
        suppressClick = true;
        setTimeout(() => (suppressClick = false), 0);
        void chrome.storage.local.set({ barPos: pos });
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  }

  function renderBadge(): void {
    if (!parts) return;
    parts.badge.hidden = unread === 0;
    parts.badge.textContent = unread > 9 ? '9+' : String(unread);
  }

  function renderRoom(): void {
    if (!parts || !room) return;
    const names = room.members.map((m) => {
      const name = (m.avatar ? `${avatarText(m.avatar)} ${m.name}` : m.name) + (m.id === room!.hostId ? ' 👑' : '');
      return m.id === room!.myId ? `${name} (${t('you')})` : name;
    });
    parts.members.textContent = `👥 ${room.members.length}`;
    parts.members.title = `${t('members', { n: room.members.length })}\n${names.join('\n')}`;
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
    /** Sitenin içindeki çerçeve: arayüzü site gösterir, burada çubuk açılmaz. */
    setEmbedded(): void {
      embeddedMode = true;
    },

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

    /** Pinlenmiş anlar: arka plan değişince yollar. */
    setPins(next: Array<Pin & { removable: boolean }>): void {
      pins = next;
      renderPins();
    },

    /** Gelen tepki: sol altta avatar + isim + emoji/özel emoji kartı; aynı kişinin aynı tepkisi "×2" olur. */
    reaction(info: { byId: string; name: string; avatar?: string; emoji?: string; sticker?: string }): void {
      reactionCount++;
      mount();
      if (!parts) return;
      const feed = parts.floats;
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
      const card = el('div', 'card', avatarEl(info.avatar), el('span', 'r-name', info.name), content, el('span', 'r-count'));
      card.dataset.key = key;
      card.dataset.count = '1';
      feed.append(card);
      expire(card);
    },

    resetStats(): void {
      reactionCount = 0;
    },

    /** Film bitti: süre, kişi, tepki ve pinler; özet panoya kopyalanabilir. 30 sn sonra kapanır. */
    endCard(duration: number, title: string): void {
      const layer = mount();
      layer.querySelector('.end')?.remove();
      const minutes = Math.max(1, Math.round(duration / 60));
      const time = minutes >= 60 ? t('endHM', { h: Math.floor(minutes / 60), m: minutes % 60 }) : t('endM', { m: minutes });
      const people = room?.members.length ?? 1;
      const lines = [`⏱ ${time}`, `👥 ${t('endPeople', { n: people })}`, `😂 ${t('endReactions', { n: reactionCount })}`, `📌 ${t('endPins', { n: pins.length })}`];
      const pinLines = pins.slice(0, 4).map((p) => `📌 ${clock(p.at)} · ${p.by.name}${p.note ? `: ${p.note}` : ''}`);
      const copy = el('button', 'primary', t('endCopy'));
      const close = el('button', '', t('close'));
      const card = el('div', 'note end', el('b', '', `🎬 ${t('endTitle')}`), el('div', 'end-title', title), el('div', 'end-stats', ...lines.map((l) => el('span', '', l))), ...pinLines.map((l) => el('div', 'end-pin', l)), el('div', 'actions', copy, close));
      const timer = setTimeout(() => card.remove(), 30_000);
      close.addEventListener('click', () => {
        clearTimeout(timer);
        card.remove();
      });
      copy.addEventListener('click', async () => {
        const text = [`🎬 ${t('endTitle')}: ${title}`, lines.join(' · '), ...pinLines, room?.inviteUrl ?? ''].filter(Boolean).join('\n');
        await copyText(text);
        copy.textContent = '✓';
      });
      layer.append(card);
      wake();
    },

    /** Odaya özel emoji eklendi (girişte de odadakiler tek tek gelir). */
    addSticker(id: string, data: string): void {
      stickers.set(id, data);
      parts?.drawReactions();
    },

    clearStickers(): void {
      stickers.clear();
      parts?.drawReactions();
    },

    chat(line: ChatLine): void {
      mount();
      if (parts) {
        const log = parts.log;
        const row = el('div', line.mine ? 'line me' : 'line', el('b', '', line.name), line.text);
        log.append(row);
        while (log.childElementCount > 60) log.firstElementChild?.remove();
        log.scrollTop = log.scrollHeight;
      }
      // Geçmiş görünüyorsa mesaj zaten orada: ayrıca ekrana düşmesin.
      if (!(barOpen && parts?.bar.classList.contains('tall'))) toast([el('b', '', line.name), ' ', line.text], line.mine ? 'me' : '');
      if (!barOpen && !line.mine) {
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

    /** Başka bir siteden gelen davet işareti: sormadan odaya sokma. */
    askJoin(onYes: () => void): void {
      const layer = mount();
      const yes = el('button', 'primary', t('joinYes'));
      const no = el('button', '', t('joinNo'));
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

    /**
     * Film sayfasına ilk gelene kısa rehber: kontrollerin yeri (okla), eklenti simgesi,
     * senkron için herkesin filmi açması. "Bir daha gösterme" işaretlenirse onNeverAgain.
     */
    guide(onNeverAgain: () => void): void {
      mount();
      if (!parts || guideHost) return;
      wake();
      // Kart videonun içinde değil, sayfanın sağ üst köşesinde sabit durur: küçük oynatıcıda
      // da "Anladım" ve ✕ görünür kalsın (önceden tam ekran yapmadan kapatılamıyordu).
      const hostEl = document.createElement('swm-guide');
      hostEl.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;display:block;';
      const shadow = hostEl.attachShadow({ mode: 'closed' });
      const style = document.createElement('style');
      style.textContent = CSS;
      const never = el('input');
      never.type = 'checkbox';
      const ok = el('button', 'primary', t('guideOk'));
      const x = button('guide-x', '✕', t('close'), () => close());
      const item = (icon: string, text: string) => el('li', '', el('span', '', icon), el('span', '', text));
      const card = el(
        'div',
        'note guide',
        x,
        el('b', '', t('guideTitle')),
        el('ul', '', item('👉', t('guideBar')), item('⌨️', t('guideKeys')), item('🧩', t('guideIcon')), item('✋', t('guideDrag')), item('🍿', t('guideSync')), item('⏭️', t('guideAd'))),
        el('label', '', never, t('guideNever')),
        el('div', 'actions', ok),
      );
      shadow.append(style, card);
      // Tam ekrandaysa kart da tam ekran öğesinin içine (yoksa görünmez).
      (document.fullscreenElement ?? document.documentElement).append(hostEl);
      guideHost = hostEl;
      // Videonun üstündeki ScreenWithMe düğmesi kart açıkken parlar: kontroller orada.
      parts.fab.classList.add('glow');
      const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') close();
      };
      addEventListener('keydown', onKey, true);
      function close(): void {
        if (never.checked) onNeverAgain();
        hostEl.remove();
        guideHost = null;
        parts?.fab.classList.remove('glow');
        removeEventListener('keydown', onKey, true);
      }
      ok.addEventListener('click', close);
      // Fare hareketsiz kalınca düğme solmasın diye rehber açıkken çubuk görünür kalır.
      const keep = setInterval(() => (hostEl.isConnected ? wake() : clearInterval(keep)), 1000);
    },

    /** Oda kapandı: nedenini birkaç saniye göster, sonra çubuk kalksın. */
    farewell(reason: 'kicked' | 'version' | 'room_full'): void {
      const layer = mount();
      layer.querySelector('.note')?.remove();
      const key = reason === 'kicked' ? 'endedKicked' : reason === 'version' ? 'endedVersion' : 'endedFull';
      layer.append(el('div', 'note', el('b', '', t(`${key}Title`)), t(key)));
      farewellUntil = Date.now() + FAREWELL_MS;
    },

    /** Odaya girince "İyi seyirler" açılışı (videonun üstünde). */
    intro(): void {
      const layer = mount();
      layer.querySelector('.swm-intro')?.remove();
      layer.append(createIntro(document, t('intro')));
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
