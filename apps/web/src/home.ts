import { extractRoomId, friendlyRoomName, newRoomId } from '@swm/shared/room-id';
import { createMascot } from '@swm/shared/logo';
import { el } from './dom.ts';
import { AVATAR_PAGES, cleanRoomName, ROOM_NAME_MAX } from '@swm/shared/protocol';
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

/** Three different themed avatars for the art's faces, picked again on every load (card 15c). */
function artFaces(): string[] {
  const pool = [...AVATAR_PAGES[0]];
  const picked: string[] = [];
  while (picked.length < 3 && pool.length) picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!);
  return picked;
}

/**
 * Glowbeam's light falls on a laptop, a tablet and a phone showing the same moment (card 15c, Design's
 * `home-15c/preview.html`): one picture (`#hm-pic`) clipped into each screen, a progress bar per device (`.hm-prog`, the
 * same 6 s animation), the sync pill on the laptop, the chat bubble and three themed faces (the first two in voice).
 *
 * Card 15e (the owner's screenshot of 0.9.97.28): one cone of light from Glowbeam's lamp (`LAMP`) whose glow falls on
 * all three screens, each with a soft lit sheen, the nearest (the laptop) brightest; no slab and no hard edge: the cone
 * is blurred, fades with distance from the lamp and is faded out at the art's edges by a mask (`#hm-fade`), so it may
 * spill a little past the art's box (`overflow: visible`) without ever ending in a line. The devices stand in one row
 * on one line with even gaps (`GAP`), nothing covers another; the faces and the bubble sit on a row under them, the
 * faces from the laptop's left edge, the bubble ending at the phone's right edge. The view box is the drawn content's
 * box (Glowbeam's box at x 0, the phone's right edge at `W`), so the page's margins measure the art itself.
 */
const DEV_X = 185; // the device row's left edge (the laptop's base)
const DEV_Y = 8;
const DEV_K = 1.3; // the device drawings' scale (15c's devices × 1.3)
const GAP = 16; // between the laptop's base, the tablet and the phone, in the drawings' units
const ROW_Y = 272; // the faces + bubble row
const ART_W = 890;
const ART_H = 314;
/** Glowbeam's box (the costume's 197.6 grid, 175 units) and its lamp, the tip the light comes from. */
const GLOW = { x: 0, y: 45.3, size: 175 };
const LAMP = { x: GLOW.x + 0.597 * GLOW.size, y: GLOW.y + 0.605 * GLOW.size };
function scene(): string {
  const [a, b, c] = artFaces();
  const face = (x: number, id: string | undefined, voice: boolean) =>
    `<g transform="translate(${x} 18)"><image class="hm-face" href="/avatars/${id}.svg" data-avatar="${id}" x="-15" y="-15" width="30" height="30" clip-path="url(#hm-face)"/><circle class="hm-ring${voice ? ' voice' : ''}" r="16" fill="none" stroke="${voice ? '#3ee08f' : '#ffffff26'}" stroke-width="${voice ? 3 : 2}"/></g>`;
  // The devices in their own units: the laptop's base -18 … 308 (the body 0 … 290), all standing on y = 192.
  const tabletX = 326 + GAP;
  const phoneX = tabletX + 120 + GAP;
  // A soft lit sheen over a screen, brighter on the side facing the lamp (`level`: the laptop 1, the farthest less).
  const sheen = (x: number, y: number, w: number, h: number, rx: number, clip: string, level: number) =>
    `<rect class="hm-sheen" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="url(#hm-sheen)" opacity="${level}" clip-path="url(#${clip})"/>`;
  return `<svg class="hm-scene" viewBox="0 0 ${ART_W} ${ART_H}" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="hm-light" gradientUnits="userSpaceOnUse" cx="${LAMP.x}" cy="${LAMP.y}" r="900"><stop offset="0" stop-color="#ffd98a" stop-opacity=".62"/><stop offset=".3" stop-color="#ffc65a" stop-opacity=".3"/><stop offset=".7" stop-color="#ffc65a" stop-opacity=".1"/><stop offset="1" stop-color="#ffc65a" stop-opacity="0"/></radialGradient>
      <radialGradient id="hm-fade-g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".72" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
      <mask id="hm-fade" maskUnits="userSpaceOnUse" x="-70" y="-90" width="${ART_W + 160}" height="${ART_H + 180}"><rect x="-70" y="-90" width="${ART_W + 160}" height="${ART_H + 180}" fill="url(#hm-fade-g)"/></mask>
      <filter id="hm-soft" filterUnits="userSpaceOnUse" x="-120" y="-200" width="${ART_W + 400}" height="${ART_H + 400}"><feGaussianBlur stdDeviation="14"/></filter>
      <linearGradient id="hm-sheen" x1="0" y1="0" x2="1" y2=".55"><stop offset="0" stop-color="#fff4d6" stop-opacity=".7"/><stop offset=".55" stop-color="#fff4d6" stop-opacity=".12"/><stop offset="1" stop-color="#fff4d6" stop-opacity="0"/></linearGradient>
      <linearGradient id="hm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb070"/><stop offset="1" stop-color="#ff7a5a"/></linearGradient>
      <radialGradient id="hm-halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffc65a" stop-opacity=".45"/><stop offset="1" stop-color="#ffc65a" stop-opacity="0"/></radialGradient>
      <symbol id="hm-pic" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice">
        <rect width="160" height="100" fill="url(#hm-sky)"/>
        <circle cx="86" cy="38" r="15" fill="#fff3d6" opacity=".88"/>
        <path d="M0 74 Q40 54 82 70 T160 64 V100 H0Z" fill="#4b2f8f"/>
        <path d="M0 84 Q56 70 106 86 T160 80 V100 H0Z" fill="#2c1c63"/>
      </symbol>
      <clipPath id="hm-clip-l"><rect x="12" y="12" width="266" height="156" rx="8"/></clipPath>
      <clipPath id="hm-clip-t"><rect x="9" y="11" width="102" height="140" rx="7"/></clipPath>
      <clipPath id="hm-clip-p"><rect x="6" y="12" width="52" height="96" rx="7"/></clipPath>
      <clipPath id="hm-face"><circle r="15"/></clipPath>
    </defs>
    <g class="hm-light" mask="url(#hm-fade)">
      <path class="hm-beam" d="M${LAMP.x} ${LAMP.y} L${LAMP.x + 1000} ${LAMP.y - 1300} L${LAMP.x + 1000} ${LAMP.y + 900} Z" fill="url(#hm-light)" filter="url(#hm-soft)"/>
    </g>
    <g class="hm-devices" transform="translate(${DEV_X} ${DEV_Y}) scale(${DEV_K})">
    <g class="hm-device" data-device="laptop" transform="translate(18 0)">
      <rect width="290" height="180" rx="14" fill="#140f30" stroke="#ffffff24" stroke-width="2"/>
      <use class="hm-screen" href="#hm-pic" x="12" y="12" width="266" height="156" clip-path="url(#hm-clip-l)"/>
      ${sheen(12, 12, 266, 156, 8, 'hm-clip-l', 1)}
      <rect x="28" y="150" width="234" height="5" rx="2.5" fill="#ffffff2e"/>
      <rect class="hm-prog" x="28" y="150" width="234" height="5" rx="2.5" fill="#ffc65a"/>
      <g class="hm-pill-art"><rect x="22" y="22" width="132" height="24" rx="12" fill="#0f5a3c"/>
      <text x="88" y="38.5" text-anchor="middle" font-size="12.5" font-weight="700" fill="#c9ffe6" data-art="artSync"></text></g>
      <path d="M-18 180 H308 L298 192 H-8Z" fill="#2a2450"/>
    </g>
    <g class="hm-device" data-device="tablet" transform="translate(${tabletX} 30)">
      <rect width="120" height="162" rx="14" fill="#140f30" stroke="#ffffff24" stroke-width="2"/>
      <use class="hm-screen" href="#hm-pic" x="9" y="11" width="102" height="140" clip-path="url(#hm-clip-t)"/>
      ${sheen(9, 11, 102, 140, 7, 'hm-clip-t', 0.75)}
      <rect x="18" y="138" width="84" height="4" rx="2" fill="#ffffff2e"/>
      <rect class="hm-prog" x="18" y="138" width="84" height="4" rx="2" fill="#ffc65a"/>
    </g>
    <g class="hm-device" data-device="phone" transform="translate(${phoneX} 72)">
      <rect width="64" height="120" rx="13" fill="#140f30" stroke="#ffffff30" stroke-width="2"/>
      <use class="hm-screen" href="#hm-pic" x="6" y="12" width="52" height="96" clip-path="url(#hm-clip-p)"/>
      ${sheen(6, 12, 52, 96, 7, 'hm-clip-p', 0.55)}
      <rect x="12" y="98" width="40" height="3.5" rx="1.75" fill="#ffffff2e"/>
      <rect class="hm-prog" x="12" y="98" width="40" height="3.5" rx="1.75" fill="#ffc65a"/>
      <rect x="25" y="5" width="14" height="3" rx="1.5" fill="#ffffff26"/>
    </g>
    </g>
    <g class="hm-faces" transform="translate(${DEV_X} ${ROW_Y})">
      ${face(16, a, true)}${face(52, b, true)}${face(88, c, false)}
      <text x="112" y="23" font-size="14" fill="#c9c0ea" data-art="artPeople"></text>
    </g>
    <g class="hm-bubble" transform="translate(${ART_W - 140} ${ROW_Y})">
      <rect width="140" height="40" rx="20" fill="#6a4cf2"/>
      <text x="70" y="25.5" text-anchor="middle" font-size="14" font-weight="600" fill="#fff" data-art="artChat"></text>
    </g>
    <circle class="hm-halo" cx="${LAMP.x}" cy="${LAMP.y}" r="80" fill="url(#hm-halo)"/>
  </svg>`;
}

/**
 * Card 15d: the art's Glowbeam wears the shown theme's costume: the Glowbeam group (body + hat / glasses, Design's
 * `docs/internal/design/themes/`, the 64 grid at `translate(26 58) scale(2.6)`) of `/themes/<theme>-maskot.svg`,
 * without the theme's canvas props (moon, popcorn…). Until it arrives (or if it fails) the plain happy Glowbeam shows.
 */
const GLOW_GROUP = '<g transform="translate(26 58) scale(2.6)">';
const costumes = new Map<string, Promise<string | null>>();
function costume(theme: string): Promise<string | null> {
  let found = costumes.get(theme);
  if (!found) {
    found = fetch(`/themes/${theme}-maskot.svg`)
      .then((r) => (r.ok ? r.text() : null))
      .then((svg) => (svg ? glowGroup(svg, theme) : null))
      .catch(() => null);
    costumes.set(theme, found);
  }
  return found;
}
/** The Glowbeam group of a theme mascot, its ids made unique for the page. */
function glowGroup(svg: string, theme: string): string | null {
  const start = svg.indexOf(GLOW_GROUP);
  if (start < 0) return null;
  let depth = 0;
  for (const m of svg.slice(start).matchAll(/<(\/?)g[\s>]/g)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) {
      const end = svg.indexOf('>', start + m.index!) + 1;
      return svg.slice(start, end).replace(/\bid="([^"]+)"/g, `id="hmg-${theme}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#hmg-${theme}-$1)`).replace(/href="#([^"]+)"/g, `href="#hmg-${theme}-$1"`);
    }
  }
  return null;
}
let glowTicket = 0;
function placeGlowbeam(app: HTMLElement): void {
  const scene = app.querySelector('.hm-scene');
  if (!scene) return;
  const theme = document.documentElement.dataset.theme || 'gece';
  const ticket = ++glowTicket;
  if (!scene.querySelector('.hm-glow')) {
    const glow = createMascot(document, { mood: 'happy' });
    glow.classList.add('hm-glow');
    // The plain Glowbeam in the costume box's place (its 240 canvas inside the 197.6 grid, 15d's numbers × size / 185.3).
    const f = GLOW.size / 185.3;
    for (const [k, v] of Object.entries({ x: GLOW.x + 14.6 * f, y: GLOW.y + 34.1 * f, width: 156 * f, height: 156 * f })) glow.setAttribute(k, String(v));
    scene.append(glow);
  }
  void costume(theme).then((group) => {
    if (!group || ticket !== glowTicket || !scene.isConnected) return;
    // The 64 grid plus room for hats above it: grid (-6, -14) to (70, 62) in the mascot's 240 canvas.
    const svg = new DOMParser().parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg" class="hm-glow" data-costume="${theme}" viewBox="10.4 21.6 197.6 197.6" x="${GLOW.x}" y="${GLOW.y}" width="${GLOW.size}" height="${GLOW.size}">${group}</svg>`,
      'image/svg+xml',
    ).documentElement;
    if (svg.nodeName !== 'svg') return;
    scene.querySelector('.hm-glow')?.replaceWith(document.importNode(svg, true));
  });
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
  // Glowbeam at the source of the light, in the art's own coordinates (card 15d: in the shown theme's costume).
  placeGlowbeam(app);
  window.addEventListener('themechange', () => placeGlowbeam(app));
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
