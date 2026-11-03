import { extractRoomId, friendlyRoomName, newRoomId } from '@swm/shared/room-id';
import { parseMediaInput } from '@swm/shared/media';
import { el } from './dom.ts';
import { cleanRoomName, ROOM_NAME_MAX } from '@swm/shared/protocol';
import { forgetSaved, isFull, MAX_SAVED, savedRooms, type SavedRoom } from './saved-rooms.ts';
import { forgetLastRoom, lastRoom, load, sessionSave } from './storage.ts';
import { t, translate } from './i18n.ts';

/**
 * Ana sayfa ("Vitrin"): solda başlık ve tek adımlık form (isteğe bağlı video linki + Oda oluştur), sağda temanın
 * renkleriyle çizilmiş canlı bir oda önizlemesi (maskot köşesinden bakar). Altında tema seçici: tıklayınca sayfa
 * hemen o temaya geçer, oda da öyle açılır. Sonra kayıtlı odalar, üç adım, iki kapı (link / eklenti) ve odada neler var.
 */
export function renderHome(app: HTMLElement): void {
  app.innerHTML = `
    <section class="home-hero">
      <div class="home-intro">
        <span class="home-pill" data-i18n="home.pill"></span>
        <div id="continue" class="home-continue" hidden></div>
        <h1 class="home-title" data-i18n="home.title"></h1>
        <p class="home-lead" data-i18n="home.lead"></p>
        <form id="start-form" class="start-form">
          <input id="start-link" autocomplete="off" data-i18n-placeholder="home.linkPlaceholder" data-i18n-title="home.linkPlaceholder" />
          <button class="btn primary big" data-i18n="createRoom"></button>
        </form>
        <p id="start-error" class="error small" data-i18n="home.badLink" hidden></p>
        <label class="start-save"><input id="start-save" type="checkbox" /> <span data-i18n="home.save"></span></label>
        <input id="create-name" class="start-name" maxlength="${ROOM_NAME_MAX}" autocomplete="off" data-i18n-placeholder="roomNamePlaceholder" hidden />
        <p id="create-full" class="error small" hidden></p>
        <p class="start-join muted">
          <span data-i18n="home.invited"></span>
          <button id="join-toggle" type="button" class="link-btn" data-i18n="home.joinCode"></button>
        </p>
        <form id="join" class="row join-form" hidden>
          <input id="join-input" data-i18n-placeholder="joinPlaceholder" autocomplete="off" />
          <button class="btn" data-i18n="join"></button>
        </form>
        <p id="join-error" class="error" data-i18n="invalidRoom" hidden></p>
      </div>
      <!-- Card 15 (owner's pick A, "two screens, one moment"): a laptop and a phone in the same room, the same video at the
           same second (one shared animation), a sync line between them and a message passing from one to the other. -->
      <div class="home-preview two-screens" aria-hidden="true">
        <div class="theme-mascot preview-mascot"></div>
        <div class="ts-laptop">
          <div class="ts-screen">
            <span class="preview-sync" data-i18n="home.demoSync"></span>
            <i class="preview-sun"></i><i class="preview-hill h1"></i><i class="preview-hill h2"></i><span class="ts-bar"><i></i></span>
            <span class="preview-emoji e1">😂</span><span class="preview-emoji e3">😍</span>
          </div>
          <div class="ts-base"></div>
        </div>
        <div class="ts-phone">
          <div class="ts-screen"><i class="preview-sun"></i><i class="preview-hill h1"></i><i class="preview-hill h2"></i><span class="ts-bar"><i></i></span><span class="preview-emoji e2">🔥</span></div>
        </div>
        <span class="ts-sync"></span>
        <span class="ts-bubble mine" data-i18n="home.demoChat"></span>
        <span class="ts-bubble other"><b>Sam</b> <span data-i18n="home.demoSame"></span></span>
        <span class="ts-people"><img src="/avatars/wizard.svg" alt="" class="talking" /><img src="/avatars/elf.svg" alt="" /><img src="/avatars/captain.svg" alt="" /><span data-i18n="home.demoPeople"></span></span>
      </div>
    </section>

    <!-- Card 15: three short features right under the hero, the theme picker after them. -->
    <section class="home-strip">
      <div><span class="strip-icon" aria-hidden="true">📱</span><b data-i18n="home.s.noApp"></b><span class="muted" data-i18n="home.s.noAppText"></span></div>
      <div><span class="strip-icon" aria-hidden="true">🎙</span><b data-i18n="home.s.voice"></b><span class="muted" data-i18n="home.s.voiceText"></span></div>
      <div><span class="strip-icon" aria-hidden="true">🎮</span><b data-i18n="home.s.games"></b><span class="muted" data-i18n="home.s.gamesText"></span></div>
    </section>

    <section id="recent" class="recent home-recent" hidden>
      <h3 data-i18n="savedRooms"></h3>
      <ul id="recent-list"></ul>
      <p class="muted small" data-i18n="savedRoomsHint"></p>
    </section>

    <p class="home-how-row phone-only"><button id="home-how" type="button" class="link-btn" aria-expanded="false" data-i18n="home.how"></button></p>

    <section class="home-steps">
      <h2 data-i18n="home.steps"></h2>
      <ol>
        <li><b class="step-n">1</b><div><h3 data-i18n="home.step1"></h3><p class="muted" data-i18n="home.step1Text"></p></div></li>
        <li><b class="step-n">2</b><div><h3 data-i18n="home.step2"></h3><p class="muted" data-i18n="home.step2Text"></p></div></li>
        <li><b class="step-n">3</b><div><h3 data-i18n="home.step3"></h3><p class="muted" data-i18n="home.step3Text"></p></div></li>
      </ol>
    </section>

    <section class="home-doors">
      <div class="home-door">
        <span class="door-icon yt" aria-hidden="true">▶</span>
        <h3 data-i18n="home.doorLink"></h3>
        <p class="muted" data-i18n="home.doorLinkText"></p>
      </div>
      <div class="home-door">
        <span class="door-icon ext" aria-hidden="true">🧩</span>
        <h3 data-i18n="home.doorExt"></h3>
        <p class="muted" data-i18n="home.doorExtText"></p>
        <p class="muted small mobile-only" data-i18n="home.doorExtMobile"></p>
        <a class="btn" href="/eklenti.html" target="_blank" rel="noopener" data-i18n="home.doorExtGo"></a>
      </div>
      <div class="home-door">
        <span class="door-icon games" aria-hidden="true">🎮</span>
        <h3 data-i18n="home.doorGames"></h3>
        <p class="muted" data-i18n="home.doorGamesText"></p>
        <span class="door-games" aria-hidden="true">❌⭕ · 🔴🟡 · ✏️ · ❓</span>
      </div>
    </section>

    <section class="home-features">
      <b data-i18n="home.features"></b>
      <span>🎙 <span data-i18n="home.f.voice"></span></span>
      <span>🖥️ <span data-i18n="home.f.screen"></span></span>
      <span>🎮 <span data-i18n="home.f.games"></span></span>
      <span>😂 <span data-i18n="home.f.react"></span></span>
      <span>📱 <span data-i18n="home.f.phone"></span></span>
    </section>
  `;
  translate(app);
  // On a phone the home page is an app start screen (0.9.92.5, pick 11A, phone.css `in-home`): create, join with a
  // code and the saved rooms; the introduction opens with "How does it work?".
  document.documentElement.classList.add('in-home');
  const how = app.querySelector<HTMLButtonElement>('#home-how')!;
  how.addEventListener('click', () => {
    const open = document.documentElement.classList.toggle('home-intro-open');
    how.setAttribute('aria-expanded', String(open));
    if (open) app.querySelector('.home-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Oda kur: link isteğe bağlı (odada ilk açılan video olur); "kaydet" seçiliyse ad zorunlu.
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => app.querySelector<T>(sel)!;
  const linkInput = $<HTMLInputElement>('#start-link');
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
    const link = linkInput.value.trim();
    // Linkin geçerli olduğu burada anlaşılsın (odaya girip orada hata görmesin).
    const badLink = link !== '' && parseMediaInput(link) === null;
    $('#start-error').hidden = !badLink;
    if (badLink) return;
    const id = newRoomId();
    if (saveBox.checked) {
      if (isFull()) return;
      const name = cleanRoomName(nameInput.value);
      if (!name) {
        nameInput.focus();
        return;
      }
      // Odaya girince (yönetici olarak) bu adla kaydedilir; bkz. room.ts welcome.
      sessionSave(`create:${id}`, name);
    }
    if (link) sessionSave(`start:${id}`, link);
    location.assign(`/r/${id}`);
  });

  const joinForm = $<HTMLFormElement>('#join');
  const joinInput = $<HTMLInputElement>('#join-input');
  $('#join-toggle').addEventListener('click', () => {
    joinForm.hidden = !joinForm.hidden;
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
 * "Continue where you left off" (0.9.93.2, owner): the last room this browser was in, with its name, who is there and
 * what is on now (`/api/rooms/:id/info`); ✕ forgets it. Saved by the room (`lastRoom`). Card 5 (owner's bug: a long
 * title ran out of the card): one thin line above the title, the whole line a link back in, cut with an ellipsis, the
 * full text in `title`.
 */
function renderContinue(app: HTMLElement): void {
  const box = app.querySelector<HTMLElement>('#continue')!;
  const last = lastRoom();
  if (!last) return void (box.hidden = true);
  const fresh = Date.now() - last.at < CONTINUE_MS;
  const name = el('b', { class: 'continue-name' }, last.name ?? friendlyRoomName(last.id));
  const status = el('span', { class: 'continue-status' }, ago(last.at));
  const go = el('a', { class: 'continue-link', href: `/r/${last.id}` }, el('span', { class: 'continue-label' }, `↩ ${t('home.continue')}:`), ' ', name, el('span', { class: 'continue-sep' }, ' · '), status);
  const sync = () => (go.title = `${t('home.continueGo')}: ${go.textContent?.replace(/^↩ /, '') ?? ''}`);
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
      const parts = [info.count ? `🟢 ${t('onlineNow', { n: info.count })}` : ago(last.at)];
      if (info.playing) parts.push(t('home.continueNow', { title: info.playing }));
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
