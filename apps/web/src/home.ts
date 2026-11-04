import { extractRoomId, friendlyRoomName, newRoomId } from '@swm/shared/room-id';
import { createMascot } from '@swm/shared/logo';
import { el } from './dom.ts';
import { cleanRoomName, ROOM_NAME_MAX } from '@swm/shared/protocol';
import { forgetSaved, isFull, MAX_SAVED, savedRooms, type SavedRoom } from './saved-rooms.ts';
import { forgetLastRoom, lastRoom, load, sessionSave } from './storage.ts';
import { helpHref, lang, t, translate } from './i18n.ts';
import './home.css';

/**
 * The home page (card 15b, the owner's picks 1A "Light beam", 2A a short intro section, 3A no video link box;
 * Design's notes in docs/internal/design/home-15b.md). One first screen that never scrolls inside: the slogan, Create
 * room / Join with a code, the save box and the continue line beside (or under) Glowbeam's light falling on a shared
 * screen, three feature cards at its foot; under it "How it works" (three steps, the extension, saved rooms, help).
 * Its texts live here (not in i18n.ts: the home page is a lazy chunk and the room page's budget is nearly full), and so
 * do its styles (home.css).
 */
const TEXT = {
  en: {
    pill: 'Free · no account · no ads',
    slogan1: 'Different screens,',
    slogan2: 'same moment.',
    sub: 'Watch a video with friends anywhere, in sync. Talk, see each other and play in the same room.',
    create: 'Create room',
    join: 'Join with a code',
    save: 'Save the room (a name and a link that stays)',
    cont: 'Continue',
    contGo: 'Open',
    contTitle: 'Go back in',
    now: 'Now: {title}',
    inside: '{n} inside',
    f1: 'No app',
    f1s: 'A link, on a computer or a phone',
    f2: 'Voice and camera',
    f2s: 'Talk while you watch',
    f3: 'Games in the room',
    f3s: 'XOX, Draw & Guess, quiz',
    peek: 'How it works',
    how: 'How it works',
    s1: 'Create a room',
    s1s: 'One click, no account.',
    s2: 'Send the link',
    s2s: 'Friends join from their browser, nothing to install.',
    s3: 'Watch together',
    s3s: 'Pause for one, pause for all.',
    ext: 'Video on any site',
    exts: 'With the extension, the room opens on top of the site the video is on; everyone in their own tab, at the same second.',
    extGo: 'Get the extension',
    saved: 'Your saved rooms',
    help: 'Questions?',
    helpGo: 'Help and FAQ',
    artSync: 'In sync · 30 ms',
    artChat: 'this part! 😄',
    artPeople: '3 watching · 2 in voice',
  },
  tr: {
    pill: 'Ücretsiz · hesap yok · reklam yok',
    slogan1: 'Ayrı ekranlar,',
    slogan2: 'aynı an.',
    sub: 'Arkadaşlarınla nerede olursanız olun aynı videoyu aynı anda izle. Aynı odada konuş, birbirinizi gör, oyna.',
    create: 'Oda oluştur',
    join: 'Kodla katıl',
    save: 'Odayı kaydet (adı ve linki hep aynı kalır)',
    cont: 'Devam et',
    contGo: 'Aç',
    contTitle: 'Odaya dön',
    now: 'Şu an: {title}',
    inside: 'içeride {n} kişi',
    f1: 'Uygulama yok',
    f1s: 'Bir link; bilgisayarda ya da telefonda',
    f2: 'Ses ve kamera',
    f2s: 'İzlerken konuşun',
    f3: 'Odada oyunlar',
    f3s: 'XOX, Çiz-Bil, bilgi yarışması',
    peek: 'Nasıl çalışır',
    how: 'Nasıl çalışır',
    s1: 'Oda oluştur',
    s1s: 'Tek tık, hesap yok.',
    s2: 'Linki gönder',
    s2s: 'Arkadaşların tarayıcıdan katılır, kurulacak bir şey yok.',
    s3: 'Birlikte izleyin',
    s3s: 'Biri durdurunca herkes durur.',
    ext: 'Her sitede video',
    exts: 'Eklentiyle oda, videonun olduğu sitenin üstünde açılır; herkes kendi sekmesinde, aynı saniyede.',
    extGo: 'Eklentiyi al',
    saved: 'Kaydettiğin odalar',
    help: 'Sorun mu var?',
    helpGo: 'Yardım ve SSS',
    artSync: 'Senkron · 30 ms',
    artChat: 'işte bu kısım! 😄',
    artPeople: "3 kişi izliyor · 2'si seste",
  },
} as const;
type TextKey = keyof (typeof TEXT)['en'];
/** A home text in the page's language, with `{name}` filled in. */
function h(key: TextKey, values: Record<string, string | number> = {}): string {
  const table: Record<string, string> = lang() === 'tr' ? TEXT.tr : TEXT.en;
  return (table[key] ?? TEXT.en[key]).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
}

/** Glowbeam's light falls on the shared screen (Design's `#sceneA`, 640 × 380); Glowbeam itself is `createMascot`. */
function scene(): string {
  return `<svg class="hm-scene" viewBox="0 0 640 380" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="hm-beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd27a" stop-opacity=".75"/><stop offset="1" stop-color="#ffc65a" stop-opacity=".06"/></linearGradient>
      <linearGradient id="hm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb070"/><stop offset="1" stop-color="#ff7a5a"/></linearGradient>
      <radialGradient id="hm-halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffc65a" stop-opacity=".45"/><stop offset="1" stop-color="#ffc65a" stop-opacity="0"/></radialGradient>
    </defs>
    <path class="hm-beam" d="M120 190 L600 40 L600 340 Z" fill="url(#hm-beam)"/>
    <g transform="translate(250 66)">
      <rect width="350" height="220" rx="16" fill="#140f30" stroke="#ffffff22" stroke-width="2"/>
      <rect x="12" y="12" width="326" height="170" rx="10" fill="url(#hm-sky)"/>
      <circle cx="250" cy="70" r="28" fill="#fff3d6" opacity=".85"/>
      <path d="M12 140 Q90 100 170 132 T338 118 V182 H12Z" fill="#4b2f8f"/>
      <path d="M12 158 Q120 130 220 160 T338 150 V182 H12Z" fill="#2c1c63"/>
      <rect x="30" y="196" width="290" height="5" rx="2.5" fill="#ffffff22"/>
      <rect class="hm-prog" x="30" y="196" width="290" height="5" rx="2.5" fill="#ffc65a"/>
      <rect x="24" y="24" width="138" height="26" rx="13" fill="#0f5a3c"/>
      <text x="93" y="42" text-anchor="middle" font-size="13" font-weight="700" fill="#c9ffe6" data-art="artSync"></text>
    </g>
    <g transform="translate(450 252)">
      <rect width="170" height="44" rx="22" fill="#6a4cf2"/>
      <text x="85" y="28" text-anchor="middle" font-size="15" font-weight="600" fill="#fff" data-art="artChat"></text>
    </g>
    <g transform="translate(270 300)">
      <circle cx="0" cy="22" r="18" fill="#2fb3a3" stroke="#3ee08f" stroke-width="3"/><circle cx="40" cy="22" r="18" fill="#ff8a7a" stroke="#3ee08f" stroke-width="3"/><circle cx="80" cy="22" r="18" fill="#7c5cff"/>
      <text x="110" y="28" font-size="15" fill="#c9c0ea" data-art="artPeople"></text>
    </g>
    <circle cx="100" cy="190" r="92" fill="url(#hm-halo)"/>
  </svg>`;
}

export function renderHome(app: HTMLElement): void {
  app.innerHTML = `
    <section class="hm-first">
      <div class="hm-main">
        <div class="hm-text">
          <span class="hm-pill" data-h="pill"></span>
          <h1 class="hm-slogan"><span data-h="slogan1"></span> <b data-h="slogan2"></b></h1>
          <p class="hm-sub" data-h="sub"></p>
          <form id="start-form" class="hm-cta">
            <button class="hm-btn primary" data-h="create"></button>
            <button id="join-toggle" type="button" class="hm-btn secondary" aria-expanded="false" data-h="join"></button>
          </form>
          <form id="join" class="hm-join" hidden>
            <input id="join-input" data-i18n-placeholder="joinPlaceholder" autocomplete="off" />
            <button class="btn" data-i18n="join"></button>
          </form>
          <p id="join-error" class="error" data-i18n="invalidRoom" hidden></p>
          <label class="hm-save"><input id="start-save" type="checkbox" /> <span data-h="save"></span></label>
          <input id="create-name" class="hm-name" maxlength="${ROOM_NAME_MAX}" autocomplete="off" data-i18n-placeholder="roomNamePlaceholder" hidden />
          <p id="create-full" class="error small" hidden></p>
          <div id="continue" class="hm-cont" hidden></div>
        </div>
        <div class="hm-art" aria-hidden="true">${scene()}</div>
      </div>
      <div class="hm-feat">
        <div><span aria-hidden="true">📱</span><b data-h="f1"></b><em data-h="f1s"></em></div>
        <div><span aria-hidden="true">🎙</span><b data-h="f2"></b><em data-h="f2s"></em></div>
        <div><span aria-hidden="true">🎮</span><b data-h="f3"></b><em data-h="f3s"></em></div>
      </div>
      <a class="hm-peek" href="#how"><span data-h="peek"></span> ↓</a>
    </section>

    <section id="how" class="hm-how">
      <h2 data-h="how"></h2>
      <ol class="hm-steps">
        <li><b class="hm-n">1</b><div><h3 data-h="s1"></h3><p data-h="s1s"></p></div></li>
        <li><b class="hm-n">2</b><div><h3 data-h="s2"></h3><p data-h="s2s"></p></div></li>
        <li><b class="hm-n">3</b><div><h3 data-h="s3"></h3><p data-h="s3s"></p></div></li>
      </ol>
      <div class="hm-ext">
        <span class="hm-ext-icon" aria-hidden="true">🧩</span>
        <div><h3 data-h="ext"></h3><p data-h="exts"></p></div>
        <a class="btn" href="/extension.html" target="_blank" rel="noopener" data-h="extGo"></a>
      </div>
      <section id="recent" class="recent home-recent" hidden>
        <h3 data-h="saved"></h3>
        <ul id="recent-list"></ul>
        <p class="muted small" data-i18n="savedRoomsHint"></p>
      </section>
      <p class="hm-help"><span data-h="help"></span> <a id="hm-help" data-h="helpGo"></a></p>
    </section>
  `;
  // Glowbeam (happy) at the source of the light, in the art's own coordinates.
  const glow = createMascot(document, { mood: 'happy' });
  for (const [k, v] of Object.entries({ x: '22', y: '112', width: '156', height: '156' })) glow.setAttribute(k, v);
  app.querySelector('.hm-scene')?.append(glow);
  const draw = () => {
    for (const node of app.querySelectorAll<HTMLElement>('[data-h]')) node.textContent = h(node.dataset.h as TextKey);
    for (const node of app.querySelectorAll<SVGTextElement>('[data-art]')) node.textContent = h(node.dataset.art as TextKey);
    app.querySelector<HTMLAnchorElement>('#hm-help')!.href = helpHref();
    translate(app);
  };
  draw();
  document.documentElement.classList.add('in-home');
  // The first screen is the window minus the top bar.
  const top = document.querySelector<HTMLElement>('.topbar');
  const fit = () => document.documentElement.style.setProperty('--hm-top', `${top?.offsetHeight ?? 64}px`);
  fit();
  addEventListener('resize', fit);

  // Create a room; with "Save the room" a name is needed (carried to the room, see room.ts welcome).
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => app.querySelector<T>(sel)!;
  const saveBox = $<HTMLInputElement>('#start-save');
  const nameInput = $<HTMLInputElement>('#create-name');
  const full = $('#create-full');
  saveBox.addEventListener('change', () => {
    nameInput.hidden = !saveBox.checked;
    full.textContent = t('savedFull', { n: MAX_SAVED });
    full.hidden = !(saveBox.checked && isFull());
    if (saveBox.checked) nameInput.focus();
  });
  $('#start-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const id = newRoomId();
    if (saveBox.checked) {
      if (isFull()) return;
      const name = cleanRoomName(nameInput.value);
      if (!name) {
        nameInput.focus();
        return;
      }
      sessionSave(`create:${id}`, name);
    }
    location.assign(`/r/${id}`);
  });

  const joinForm = $<HTMLFormElement>('#join');
  const joinInput = $<HTMLInputElement>('#join-input');
  const joinToggle = $('#join-toggle');
  joinToggle.addEventListener('click', () => {
    joinForm.hidden = !joinForm.hidden;
    joinToggle.setAttribute('aria-expanded', String(!joinForm.hidden));
    if (!joinForm.hidden) joinInput.focus();
  });
  joinForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const id = extractRoomId(joinInput.value);
    $('#join-error').hidden = id !== null;
    if (id !== null) location.assign(`/r/${id}`);
  });

  renderRecent(app);
  renderContinue(app);
  window.addEventListener('langchange', () => {
    draw();
    renderRecent(app);
    renderContinue(app);
  });
  // The Help page's "Send feedback" (card 9) comes here as `/#feedback`: the dialog opens over the home page.
  if (location.hash === '#feedback') {
    history.replaceState(null, '', location.pathname + location.search);
    void import('./ui/feedback.ts').then(({ openFeedback }) => openFeedback(null));
  }
}

/** Rooms are deleted a day after they empty unless saved: an older unsaved room isn't offered. */
const CONTINUE_MS = 24 * 60 * 60 * 1000;

/**
 * "Continue where you left off" (0.9.93.2, owner): the last room this browser was in, with its name and how many are
 * inside (`/api/rooms/:id/info`); ✕ forgets it. Saved by the room (`lastRoom`). Card 15b: one line under the save box,
 * "↺ Continue: Velvet Otter · 3 inside · Open", cut with an ellipsis, the full text in `title`.
 */
function renderContinue(app: HTMLElement): void {
  const box = app.querySelector<HTMLElement>('#continue')!;
  const last = lastRoom();
  if (!last) return void (box.hidden = true);
  const fresh = Date.now() - last.at < CONTINUE_MS;
  const name = el('b', { class: 'continue-name' }, last.name ?? friendlyRoomName(last.id));
  const status = el('span', { class: 'continue-status' }, ago(last.at));
  const go = el(
    'a',
    { class: 'continue-link', href: `/r/${last.id}` },
    el('span', { class: 'continue-label' }, `↺ ${h('cont')}:`),
    ' ',
    name,
    el('span', { class: 'continue-sep' }, ' · '),
    status,
    el('span', { class: 'continue-sep' }, ' · '),
    el('u', { class: 'continue-go' }, h('contGo')),
  );
  const sync = () => (go.title = `${h('contTitle')}: ${go.textContent?.replace(/^↺ /, '') ?? ''}`);
  sync();
  const forget = el('button', { type: 'button', class: 'icon-btn', title: t('close'), 'aria-label': t('close') }, '✕');
  forget.addEventListener('click', () => {
    forgetLastRoom();
    box.hidden = true;
  });
  box.replaceChildren(go, forget);
  box.hidden = !fresh;
  void fetch(`/api/rooms/${last.id}/info`)
    .then((r) => (r.ok ? (r.json() as Promise<{ saved: boolean; name: string | null; count?: number; playing?: string | null }>) : null))
    .then((info) => {
      if (!info) return;
      if (!fresh && !info.saved) return;
      if (info.saved && info.name) name.textContent = info.name;
      const parts = [info.count ? h('inside', { n: info.count }) : ago(last.at)];
      if (info.playing) parts.push(h('now', { title: info.playing }));
      status.textContent = parts.join(' · ');
      sync();
      box.hidden = false;
    })
    .catch(() => {});
}

/**
 * Kaydedilen odalar: ad, ne zaman girildi, şu an kaç kişi içeride (sunucudan). ✕ listeden çıkarır;
 * yöneticisi olduğun odada önce sorar, çünkü oda kaydı da kalkar.
 */
function renderRecent(app: HTMLElement): void {
  const box = app.querySelector<HTMLElement>('#recent')!;
  const list = app.querySelector<HTMLElement>('#recent-list')!;
  const rooms = savedRooms();
  box.hidden = rooms.length === 0;
  list.replaceChildren(...rooms.map((room) => savedRow(app, room)));
}

function savedRow(app: HTMLElement, room: SavedRoom): HTMLElement {
  const status = el('span', { class: 'muted small' }, ago(room.at));
  const link = el('a', { href: `/r/${room.id}`, class: 'recent-link' }, el('b', {}, `${room.mine ? '👑 ' : ''}${room.name}`), status);
  const remove = el('button', { type: 'button', class: 'icon-btn', title: t('remove'), 'aria-label': t('remove') }, '✕');
  remove.addEventListener('click', async () => {
    if (room.mine) {
      if (!confirm(t('unsaveHostConfirm', { name: room.name }))) return;
      const cid = load('cid');
      await fetch(`/api/rooms/${room.id}/unsave`, { method: 'POST', body: JSON.stringify({ cid }) }).catch(() => null);
    }
    forgetSaved(room.id, true);
    renderRecent(app);
  });
  // Oda hâlâ kayıtlı mı, adı değişti mi, içeride kimse var mı?
  void fetch(`/api/rooms/${room.id}/info`)
    .then((r) => (r.ok ? (r.json() as Promise<{ saved: boolean; name: string | null; online: number }>) : null))
    .then((info) => {
      if (!info) return;
      if (!info.saved) {
        status.textContent = t('savedGone');
        link.classList.add('gone');
        return;
      }
      if (info.online > 0) status.textContent = `🟢 ${t('onlineNow', { n: info.online })}`;
    })
    .catch(() => {});
  return el('li', {}, link, remove);
}

/** "az önce", "5 dk önce", "3 sa önce", "2 gün önce". */
function ago(at: number): string {
  const min = Math.round((Date.now() - at) / 60000);
  if (min < 1) return t('agoNow');
  if (min < 60) return t('agoMin', { n: min });
  if (min < 60 * 24) return t('agoHour', { n: Math.round(min / 60) });
  return t('agoDay', { n: Math.round(min / 1440) });
}
