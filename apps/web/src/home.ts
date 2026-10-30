import { extractRoomId, newRoomId } from '@swm/shared/room-id';
import { parseMediaInput } from '@swm/shared/media';
import { el } from './dom.ts';
import { cleanRoomName, ROOM_NAME_MAX } from '@swm/shared/protocol';
import { forgetSaved, isFull, MAX_SAVED, savedRooms, type SavedRoom } from './saved-rooms.ts';
import { load, sessionSave } from './storage.ts';
import { t, translate } from './i18n.ts';
import { renderThemeStrip } from './themes.ts';

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
      <div class="home-preview" aria-hidden="true">
        <div class="theme-mascot preview-mascot"></div>
        <div class="preview-card">
          <div class="preview-video">
            <span class="preview-sync" data-i18n="home.demoSync"></span>
            <i class="preview-sun"></i><i class="preview-hill h1"></i><i class="preview-hill h2"></i>
            <span class="preview-emoji e1">😂</span><span class="preview-emoji e2">🔥</span><span class="preview-emoji e3">😍</span>
            <span class="preview-bar"><i></i></span>
          </div>
          <div class="preview-people">
            <img src="/avatars/wizard.svg" alt="" class="talking" /><img src="/avatars/elf.svg" alt="" /><img src="/avatars/captain.svg" alt="" /><img src="/avatars/sorceress.svg" alt="" />
            <span data-i18n="home.demoPeople"></span>
          </div>
        </div>
        <div class="preview-bubbles">
          <span class="preview-bubble mine" data-i18n="home.demoChat"></span>
          <span class="preview-bubble"><b>Deniz</b> <span data-i18n="home.demoPause"></span></span>
        </div>
      </div>
    </section>

    <section class="home-themes">
      <div class="home-themes-head">
        <h2 data-i18n="home.themes"></h2>
        <p class="muted" data-i18n="home.themesText"></p>
      </div>
      <nav id="theme-strip" class="theme-strip all" role="radiogroup" aria-label="Theme"></nav>
    </section>

    <section id="recent" class="recent home-recent" hidden>
      <h3 data-i18n="savedRooms"></h3>
      <ul id="recent-list"></ul>
      <p class="muted small" data-i18n="savedRoomsHint"></p>
    </section>

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
  renderThemeStrip(app.querySelector<HTMLElement>('#theme-strip')!, { all: true });

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
  window.addEventListener('langchange', () => renderRecent(app));
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
