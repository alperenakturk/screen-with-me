import { ServerClock } from '@swm/shared/clock';
import { RoomConnection, type ConnectionStatus } from '@swm/shared/connection';
import { INTRO_CSS, createIntro } from '@swm/shared/intro';
import { isRelayable } from '@swm/shared/embed';
import { parseMediaInput } from '@swm/shared/media';
import type { PlayerAdapter } from '@swm/shared/player';
import {
  CLIENT_ID,
  avatarText,
  SYSTEM_MEMBER_ID,
  cleanName,
  cleanRoomName,
  expectedPosition,
  stepRate,
  YOUTUBE_MAX_RATE,
  isAvatar,
  randomAvatar,
  type Avatar,
  type ClientMessage,
  type Member,
  type PlaybackState,
  type QueueItem,
  type RoomSettings,
  type ServerMessage,
} from '@swm/shared/protocol';
import { pageInviteUrl } from '@swm/shared/room-id';
import { SyncEngine } from '@swm/shared/sync-engine';
import { el } from './dom.ts';
import { t, translate } from './i18n.ts';
import { formatTime, itemTitle, mediaUrl, rememberTitle } from './media-info.ts';
import { canEmbed, createEmbedPlayer, type EmbedFailure, type EmbedPlayer } from './players/embed.ts';
import { createHtml5Player } from './players/html5.ts';
import { createTestPlayer } from './players/test.ts';
import { createYouTubePlayer, loadYouTubeApi } from './players/youtube.ts';
import { load, save, saveIdentity, sessionLoad, sessionSave } from './storage.ts';
import { avatarNode, renderAvatarPicker } from './ui/avatar.ts';
import { createChatPanel } from './ui/chat.ts';
import { createQueuePanel } from './ui/queue.ts';
import { createFullscreen } from './ui/fullscreen.ts';
import { createPeoplePanel } from './ui/people.ts';
import { createReactions, isTyping } from './ui/reactions.ts';
import { createPins } from './ui/pins.ts';
import { showNextCard } from './ui/end-card.ts';
import { renderRecapHistory, showRecap, showRecapInvite } from './ui/recap.ts';
import type { Recap } from '@swm/shared/recap';
import { forgetSaved, rememberSaved } from './saved-rooms.ts';
import { createSettingsPanel } from './ui/settings.ts';
import { createTabs } from './ui/tabs.ts';
import { createToasts } from './ui/toasts.ts';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];

/**
 * Odaya giriş iki adımlıdır: önce isim, sonra avatar. İkisi de tarayıcıda
 * saklanır ve bir dahakine hazır gelir. "Odaya gir" tıklaması aynı zamanda
 * tarayıcının sesli oynatma izni için gereken etkileşimdir.
 */
export function renderRoom(app: HTMLElement, roomId: string, waited = false): void {
  // Eklenti filmden odaya dönerken adrese #back koyar: kişi zaten odadaydı, isim/avatar sorma.
  const fromExtension = location.hash === '#back';
  if (fromExtension) history.replaceState(null, '', location.pathname + location.search);
  // Bu sekmede odaya zaten girilmişse (sayfa yenilendi) ya da filmden dönüldüyse isim/avatar
  // adımlarını atla.
  const savedName = cleanName(load('name'));
  const savedAvatar = load('avatar');
  if (savedName && isAvatar(savedAvatar) && (fromExtension || waited || sessionLoad(`in:${roomId}`) === '1')) {
    startRoom(app, roomId, savedName, savedAvatar, { resumed: true });
    return;
  }
  // İsim eklentide seçilmiş ama siteye henüz geçmemiş olabilir (site-bridge birazdan yazar).
  if (fromExtension && !waited) {
    setTimeout(() => renderRoom(app, roomId, true), 800);
    return;
  }

  app.innerHTML = `
    <section class="card join-card">
      <p class="muted step-label" id="room-code"></p>
      <form id="name-form" class="stack">
        <label for="name" class="step-title" data-i18n="yourName"></label>
        <input id="name" maxlength="32" required autocomplete="nickname" data-i18n-placeholder="namePlaceholder" />
        <button class="btn primary big" data-i18n="continue"></button>
        <p class="muted small" data-i18n="nameHint"></p>
      </form>
    </section>
  `;
  translate(app);

  const roomCode = app.querySelector<HTMLElement>('#room-code')!;
  let roomName: string | null = null;
  const renderCode = () => (roomCode.textContent = roomName ? `💾 ${roomName}` : t('roomCode', { id: roomId }));
  renderCode();
  // Kayıtlı odaysa adını göster.
  void fetch(`/api/rooms/${roomId}/info`)
    .then((r) => (r.ok ? (r.json() as Promise<{ saved: boolean; name: string | null }>) : null))
    .then((info) => {
      if (info?.saved && info.name) {
        roomName = info.name;
        renderCode();
      }
    })
    .catch(() => {});
  window.addEventListener('langchange', renderCode);

  const input = app.querySelector<HTMLInputElement>('#name')!;
  input.value = load('name') ?? '';
  input.focus();
  input.select();

  app.querySelector('#name-form')!.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = cleanName(input.value);
    if (name === null) return;
    if (name !== load('name')) saveIdentity(name);
    window.removeEventListener('langchange', renderCode);
    renderAvatarStep(app, roomId, name);
  });
}

/** 2. adım: avatar seçimi. Daha önce seçilen işaretli gelir (yoksa rastgele biri). */
function renderAvatarStep(app: HTMLElement, roomId: string, name: string): void {
  app.innerHTML = `
    <section class="card join-card avatar-card">
      <p class="muted step-label" id="hello"></p>
      <h2 class="step-title" data-i18n="pickAvatar"></h2>
      <div id="avatar-picker" class="avatar-picker big"></div>
      <div id="avatar-preview" class="avatar-preview"></div>
      <button id="enter" type="button" class="btn primary big" data-i18n="enterRoom"></button>
      <button id="back" type="button" class="link-btn" data-i18n="back"></button>
    </section>
  `;
  translate(app);

  const savedAvatar = load('avatar');
  let avatar: Avatar = isAvatar(savedAvatar) ? savedAvatar : randomAvatar();
  const picker = app.querySelector<HTMLElement>('#avatar-picker')!;
  const preview = app.querySelector<HTMLElement>('#avatar-preview')!;
  const hello = app.querySelector<HTMLElement>('#hello')!;
  const renderTexts = () => (hello.textContent = t('helloName', { name }));
  const renderPreview = () => preview.replaceChildren(avatarNode(avatar, 'avatar-glyph'), ` ${name}`);
  const drawPicker = renderAvatarPicker(
    picker,
    () => avatar,
    (option) => {
      avatar = option;
      renderPreview();
    },
    () => enter(),
  );
  renderPreview();
  renderTexts();
  window.addEventListener('langchange', renderTexts);
  window.addEventListener('langchange', drawPicker);

  function enter(): void {
    if (avatar !== load('avatar')) saveIdentity(name, avatar);
    window.removeEventListener('langchange', renderTexts);
    window.removeEventListener('langchange', drawPicker);
    startRoom(app, roomId, name, avatar);
  }
  app.querySelector('#enter')!.addEventListener('click', enter);
  app.querySelector('#back')!.addEventListener('click', () => {
    window.removeEventListener('langchange', renderTexts);
    window.removeEventListener('langchange', drawPicker);
    renderRoom(app, roomId);
  });
}

/**
 * Tarayıcının kalıcı kimliği: rastgele bir kod, hesap değil. Oda yöneticisinin
 * sayfayı yenileyince yöneticiliği kaybetmemesi ve atılanın hemen geri
 * girememesi için sunucuya gönderilir.
 */
function clientId(): string {
  const saved = load('cid');
  if (saved && CLIENT_ID.test(saved)) return saved;
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  save('cid', id);
  return id;
}

/** İsmin önüne avatarı koyar (varsa). */
/** Kalan süre: "2 sa 13 dk", "4 dk 05 sn", "45 sn". */
function formatLeft(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return t('leftHM', { h, m });
  if (m > 0) return t('leftMS', { m, s: String(s % 60).padStart(2, '0') });
  return t('leftS', { s });
}

/** Hızı seçimde gösterir; hazır seçeneklerde yoksa en alta "özel" seçenek olarak ekler. */
function showRate(select: HTMLSelectElement, rate: number): void {
  select.querySelector('option[data-custom]')?.remove();
  if (!SPEEDS.includes(rate)) {
    const option = document.createElement('option');
    option.value = String(rate);
    option.textContent = `${rate}x`;
    option.dataset.custom = '';
    select.append(option);
  }
  select.value = String(rate);
}

function withAvatar(member: { name: string; avatar?: string }): string {
  return member.avatar ? `${avatarText(member.avatar)} ${member.name}` : member.name;
}

function startRoom(app: HTMLElement, roomId: string, myName: string, myAvatar: Avatar, { resumed = false } = {}): void {
  // Sayfa yenilenirse doğrudan odaya dönülsün (sekmeye özel; yeni sekmede isim yine sorulur).
  sessionSave(`in:${roomId}`, '1');
  // İlk video eklendiğinde beklememek için YouTube oynatıcısını şimdiden indirmeye başla.
  loadYouTubeApi().catch(() => {});

  app.innerHTML = `
    <div class="room">
      <div class="stage">
        <form id="media-form" class="media-form">
          <input id="media-input" autocomplete="off" data-i18n-placeholder="mediaPlaceholder" data-i18n-title="mediaLabel" />
          <button class="btn primary" value="enqueue" data-i18n="addToQueue"></button>
          <button class="btn" value="load" data-i18n="playNow"></button>
        </form>
        <p id="media-error" class="error" data-i18n="invalidMedia" hidden></p>

        <div id="schedule-banner" class="schedule-banner" role="status" hidden></div>
        <div id="theater" class="theater">
          <div class="now-playing" id="now-playing" hidden>
            <div class="now-text">
              <span class="muted small" data-i18n="nowPlaying"></span>
              <span id="now-title" class="now-title"></span>
            </div>
            <button id="embed-out" type="button" class="btn small-btn" hidden>↗ <span data-i18n="embedOut"></span></button>
            <button id="skip" type="button" class="btn small-btn"><span data-i18n="skip"></span> ⏭</button>
          </div>
          <div class="player-wrap">
            <div id="player" class="player"></div>
            <div id="fs-catcher" class="fs-only fs-catcher"></div>
            <div id="reactions-layer" class="reactions-layer" aria-hidden="true"></div>
            <div id="waiting-banner" class="waiting-banner" role="status" hidden></div>
            <div id="sync-badge" class="sync-badge" role="status" hidden></div>
            <div id="toasts" class="fs-only toasts" aria-live="polite"></div>
            <form id="pin-form" class="pin-form" hidden><span aria-hidden="true">📌</span><input id="pin-note" autocomplete="off" data-i18n-placeholder="pinPlaceholder" /><button class="btn small-btn primary" data-i18n="pinSave"></button></form>
            <div id="toast-handle" class="fs-only toast-handle" data-i18n-title="toastHandleHint"><span data-i18n="toastHandle"></span></div>
            <div id="fs-controls" class="fs-only fs-controls">
              <div class="fs-progress">
                <div class="fs-seek-wrap">
                  <div id="fs-pins" class="pin-strip fs" hidden></div>
                  <input id="fs-seek" type="range" min="0" max="1000" step="1" value="0" />
                </div>
                <span id="fs-time" class="fs-time">0:00 / 0:00</span>
              </div>
              <div class="fs-row">
                <button id="fs-play" type="button" class="fs-btn">▶</button>
                <div class="reaction-bar fs-reactions" role="group"></div>
                <form id="fs-chat" class="fs-chat">
                  <input id="fs-chat-input" autocomplete="off" data-i18n-placeholder="quickChatPlaceholder" />
                </form>
                <button id="fs-pin" type="button" class="fs-btn">📌</button>
                <button id="fs-skip" type="button" class="fs-btn">⏭</button>
                <select id="fs-speed" class="fs-speed">${SPEEDS.map((s) => `<option value="${s}">${s}x</option>`).join('')}</select>
                <button id="fs-exit" type="button" class="fs-btn">✕</button>
              </div>
            </div>
            <div id="empty" class="empty">
              <div class="theme-mascot" aria-hidden="true"></div>
              <h2 data-i18n="emptyTitle"></h2>
              <ol class="empty-steps">
                <li><span data-i18n="emptyStep1"></span> <button id="empty-invite" type="button" class="btn small-btn primary"></button></li>
                <li data-i18n="emptyBody"></li>
              </ol>
              <button id="sync-test" type="button" class="btn small-btn">🧪 <span data-i18n="syncTest"></span></button>
            </div>
            <div id="embed-loading" class="overlay embed-loading" hidden>
              <div class="embed-spinner" aria-hidden="true"></div>
              <p data-i18n="embedLoading"></p>
              <button id="embed-loading-out" type="button" class="btn small-btn" data-i18n="embedOut"></button>
            </div>
            <div id="external" class="overlay external" hidden>
              <p class="muted" data-i18n="externalTitle"></p>
              <h2 id="external-title"></h2>
              <p id="external-host" class="external-host"></p>
              <p id="external-watching" class="external-watching" hidden></p>
              <div id="external-ext" class="stack external-box">
                <p id="external-note" class="external-note" hidden></p>
                <p data-i18n="externalHasExt"></p>
                <button id="external-go" type="button" class="btn primary big" data-i18n="externalGoJoin"></button>
                <button id="external-embed" type="button" class="link-btn" data-i18n="embedTry" hidden></button>
              </div>
              <div id="external-noext" class="stack external-box">
                <p data-i18n="externalNoExt" class="desktop-only"></p>
                <p data-i18n="externalMobile" class="mobile-only"></p>
                <ol class="external-steps desktop-only">
                  <li><a href="/eklenti.html" target="_blank" rel="noopener" data-i18n="externalStep1"></a></li>
                  <li data-i18n="externalStep2"></li>
                  <li data-i18n="externalStep3"></li>
                </ol>
                <a id="external-alone" class="muted small" target="_blank" rel="noopener noreferrer" data-i18n="externalOpenAlone"></a>
              </div>
            </div>
            <div id="autoplay" class="overlay" hidden>
              <p data-i18n="autoplayBlocked"></p>
              <button type="button" class="btn primary big" data-i18n="startPlayback"></button>
            </div>
          </div>
          <div id="pin-strip" class="pin-strip" hidden></div>
          <div class="toolbar">
            <div class="reaction-bar" role="group"></div>
            <div class="toolbar-right">
              <span id="host-lock" class="host-lock" hidden>🔒 <span data-i18n="hostLock"></span></span>
              <button id="pin-btn" type="button" class="icon-btn tool-btn" data-i18n-title="pin">📌</button>
              <button id="sync-all" type="button" class="icon-btn tool-btn" data-i18n-title="syncAll">🔄</button>
              <div class="speed">
                <button id="speed-down" type="button" class="icon-btn speed-step" data-i18n-title="speedDown">−</button>
                <select id="speed" data-i18n-title="speed">${SPEEDS.map((s) => `<option value="${s}">${s}x</option>`).join('')}</select>
                <button id="speed-up" type="button" class="icon-btn speed-step" data-i18n-title="speedUp">+</button>
              </div>
              <button id="fullscreen" type="button" class="icon-btn big-icon">⛶</button>
            </div>
          </div>
        </div>
        <p id="player-error" class="error" hidden></p>
      </div>

      <aside class="side">
        <section class="card invite-card">
          <p id="room-name" class="room-name" hidden></p>
          <span class="invite-label" data-i18n="invite"></span>
          <div class="row">
            <input id="invite" readonly data-i18n-title="invite" />
            <button id="copy" type="button" class="btn primary"></button>
          </div>
        </section>

        <section class="card tabs-card">
          <nav class="tabs" role="tablist">
            <button type="button" class="tab" role="tab" data-tab="chat">
              <span aria-hidden="true">💬</span><span data-i18n="tab.chat"></span><span id="chat-badge" class="badge" hidden></span>
            </button>
            <button type="button" class="tab" role="tab" data-tab="queue">
              <span aria-hidden="true">🎵</span><span data-i18n="tab.queue"></span><span id="queue-count" class="count"></span>
            </button>
            <button type="button" class="tab" role="tab" data-tab="people">
              <span aria-hidden="true">👥</span><span id="people-count" class="count"></span>
            </button>
            <button type="button" class="tab tab-icon" role="tab" data-tab="settings" id="settings-tab">⚙️</button>
          </nav>

          <div class="tab-panel chat-panel" data-panel="chat">
            <button id="chat-events" type="button" class="chat-events" aria-pressed="false"></button>
            <ul id="chat-list" class="chat-list" role="log" aria-live="polite"></ul>
            <form id="chat-form" class="row chat-form">
              <input id="chat-input" autocomplete="off" data-i18n-placeholder="chatPlaceholder" data-i18n-title="chat" />
              <button class="btn primary" data-i18n="send"></button>
            </form>
          </div>

          <div class="tab-panel" data-panel="queue" hidden>
            <label class="check-row queue-auto"><input type="checkbox" id="opt-autonext" /> <span data-i18n="autoNext"></span></label>
            <p class="muted small queue-hint" data-i18n="voteExplain"></p>
            <ol id="queue" class="queue"></ol>
            <p id="queue-empty" class="muted small" data-i18n="queueEmpty"></p>
          </div>

          <div class="tab-panel" data-panel="people" hidden>
            <ul id="members" class="people"></ul>
            <p id="host-hint" class="muted small"></p>
            <div id="bans" class="bans" hidden>
              <h4 data-i18n="bansTitle"></h4>
              <ul id="bans-list" class="people"></ul>
              <p class="muted small" data-i18n="bansHint"></p>
            </div>
          </div>

          <div class="tab-panel settings" data-panel="settings" hidden>
            <h4 data-i18n="settings.profile"></h4>
            <label for="rename-input" class="muted small" data-i18n="yourNameLabel"></label>
            <form id="rename-form" class="row">
              <input id="rename-input" maxlength="32" autocomplete="nickname" data-i18n-title="yourName" />
              <button class="btn" data-i18n="saveName"></button>
            </form>
            <div id="settings-avatars" class="avatar-current"></div>
            <p class="muted small" data-i18n="avatarAutoSave"></p>
            <h4 data-i18n="settings.theme"></h4>
            <div id="settings-themes" class="theme-current"></div>
            <h4 data-i18n="settings.view"></h4>
            <label class="check-row"><input type="checkbox" id="opt-reactions" /> <span data-i18n="settings.showReactions"></span></label>
            <h4 data-i18n="recap.title"></h4>
            <p class="muted small" data-i18n="recap.explain"></p>
            <button type="button" id="recap-open" class="btn primary recap-open">📊 <span data-i18n="recap.open"></span></button>
            <div id="recap-history" class="recap-history"></div>
            <section class="host-box">
              <h4>👑 <span data-i18n="settings.hostTitle"></span></h4>
              <p id="opt-wait-hint" class="muted small"></p>
              <label class="check-row"><input type="checkbox" id="opt-wait" /> <span data-i18n="settings.waitForAll"></span></label>
              <label class="check-row"><input type="checkbox" id="opt-hostonly" /> <span data-i18n="settings.hostOnlyMode"></span></label>
              <label class="check-row"><input type="checkbox" id="opt-lockqueue" /> <span data-i18n="settings.lockQueue"></span></label>
              <div class="save-box">
                <p id="save-status" class="small"></p>
                <form id="save-form" class="row">
                  <input id="save-name" maxlength="40" autocomplete="off" data-i18n-placeholder="roomNamePlaceholder" />
                  <button class="btn small-btn primary" id="save-submit"></button>
                </form>
                <button type="button" id="save-off" class="btn small-btn" data-i18n="saveOff"></button>
              </div>
              <label class="check-row"><input type="checkbox" id="opt-noreactions" /> <span data-i18n="settings.noReactions"></span></label>
              <div class="schedule-row">
                <label for="opt-start" data-i18n="settings.schedule"></label>
                <div class="row">
                  <input type="datetime-local" id="opt-start" />
                  <button type="button" class="btn small-btn" id="opt-start-set" data-i18n="settings.scheduleSet"></button>
                  <button type="button" class="btn small-btn" id="opt-start-clear" data-i18n="settings.scheduleClear"></button>
                </div>
              </div>
            </section>
          </div>
        </section>
      </aside>
    </div>

    <div id="ext-reload" class="ext-reload" role="status" hidden>
      <span data-i18n="extReloadText"></span>
      <button type="button" class="btn primary small-btn" data-i18n="extReload"></button>
    </div>

    <dialog id="ext-dialog" class="dialog">
      <h3 data-i18n="extDialog.title"></h3>
      <p data-i18n="extDialog.text"></p>
      <div class="dialog-actions">
        <a class="btn primary" href="/eklenti.html" target="_blank" rel="noopener" data-i18n="extDialog.install"></a>
        <button type="button" class="btn" id="ext-add-anyway" data-i18n="extDialog.addAnyway"></button>
        <button type="button" class="btn" id="ext-cancel" data-i18n="extDialog.cancel"></button>
      </div>
    </dialog>

    <div id="kicked" class="kicked-screen" hidden>
      <div class="card">
        <div class="kicked-icon">🚪</div>
        <h2 data-i18n="kickedTitle"></h2>
        <p class="muted" data-i18n="kickedText"></p>
        <a class="btn primary big" href="/" data-i18n="home"></a>
      </div>
    </div>
  `;
  translate(app);

  const $ = <T extends HTMLElement>(selector: string) => app.querySelector<T>(selector)!;
  const playerEl = $('#player');
  const emptyEl = $('#empty');
  const externalEl = $('#external');
  const autoplayEl = $('#autoplay');
  const playerErrorEl = $('#player-error');
  const speedEl = $<HTMLSelectElement>('#speed');
  const nowPlayingEl = $('#now-playing');
  const nowTitleEl = $('#now-title');
  const skipEl = $<HTMLButtonElement>('#skip');
  const statusEl = document.querySelector<HTMLElement>('#status')!;
  const reconnectEl = document.querySelector<HTMLButtonElement>('#reconnect')!;

  let myId: string | null = null;
  let members: Member[] = [];
  /** Bu odanın önceki oturum özetleri (ayarlarda listelenir). */
  let recaps: Recap[] = [];
  let hostId: string | null = null;
  const kickedIds = new Set<string>();
  /** "Herkes hazır": oda kimleri bekliyor, yönetici özelliği açtı mı. */
  let waitingIds: string[] = [];
  let roomSettings: RoomSettings = { waitForAll: true };
  let status: ConnectionStatus = 'connecting';
  let errorText: (() => string) | null = null;
  let roomState: PlaybackState | null = null;

  const send = (message: ClientMessage) => connection.send(message);
  const amHost = () => myId !== null && myId === hostId;
  const queue = createQueuePanel(app, send, {
    play: () => amHost() || !roomSettings.hostOnly,
    edit: () => amHost() || !roomSettings.lockQueue,
  });
  const chatBadge = $('#chat-badge');
  const chat = createChatPanel(app, send, () => myId, (count) => {
    chatBadge.hidden = count === 0;
    chatBadge.textContent = count > 9 ? '9+' : String(count);
  });
  const people = createPeoplePanel(app, send);
  const tabs = createTabs(app, (tab) => chat.setVisible(tab === 'chat'));
  const settings = createSettingsPanel(app, { name: myName, avatar: myAvatar }, (name, avatar) => {
    myName = name;
    myAvatar = avatar;
    saveIdentity(name, avatar);
    connection.setIdentity(name, avatar);
    send({ t: 'rename', name, avatar });
  });
  const reactions = createReactions(app, send, () => myId !== null && myId === hostId, () => roomSettings.noReactions !== true);
  // Klavye: normal görünümde Enter sohbet kutusuna götürür (tam ekranda fullscreen.ts halleder).
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || document.fullscreenElement || isTyping(event.target)) return;
    if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return;
    event.preventDefault();
    tabs.show('chat');
    app.querySelector<HTMLInputElement>('#chat-input')?.focus();
  });

  // ---- Senkron ----
  const clock = new ServerClock();
  const engine = new SyncEngine({
    clock,
    send,
    onAutoplayBlocked: () => (autoplayEl.hidden = false),
    onEnded: (itemId) => {
      // Otomatik devam kapalıysa sıradaki kendiliğinden başlamaz: küçük "Sıradakini başlat" kartı.
      // (İstatistikler video sonunda değil, ayarlardaki oturum özetinde.)
      const item = roomState?.item;
      if (roomSettings.autoNext !== false) send({ t: 'next', from: itemId });
      else if (item && item.id === itemId && queue.length > 0) {
        showNextCard($('.player-wrap'), itemTitle(item), mediaUrl(item.media), () => send({ t: 'next', from: itemId }));
      }
    },
  });
  const connection = new RoomConnection({
    serverUrl: location.origin,
    roomId,
    name: myName,
    avatar: myAvatar,
    cid: clientId(),
    client: 'web',
    clock,
    onMessage: handleMessage,
    onStatus: (next) => {
      status = next;
      renderStatus();
    },
  });
  connection.connect();

  // Açılış: logo belirir, duraklat → oynat olur, "İyi seyirler!" (oda arkada hazırlanırken).
  // Yenileyip geri dönünce tekrar gösterme.
  if (!resumed) {
    if (!document.getElementById('swm-intro-css')) {
      document.head.append(el('style', { id: 'swm-intro-css' }, INTRO_CSS));
    }
    $('.player-wrap').append(createIntro(document, t('introText')));
  }

  function handleMessage(message: ServerMessage): void {
    switch (message.t) {
      case 'welcome':
        myId = message.you;
        setMembers(message.members, message.hostId, false);
        if (message.settings) roomSettings = message.settings;
        waitingIds = message.waiting ?? [];
        renderWaiting();
        queue.set(message.queue);
        chat.set(message.chat);
        void applyState(message.state);
        pins.set(message.pins ?? null);
        // Özel emojiler welcome'dan sonra tek tek gelir; benimkileri bu odaya da yükle.
        reactions.clearStickers();
        reactions.registerMine();
        send({ t: 'recaps' });
        // Ana sayfada "kaydedilen oda" seçilerek kurulduysa: ilk giren (yönetici) adıyla kaydeder.
        {
          const wanted = sessionLoad(`create:${roomId}`);
          if (wanted && message.hostId === message.you && !roomSettings.saved) send({ t: 'settings', saved: true, name: wanted });
          if (wanted) sessionSave(`create:${roomId}`, '');
        }
        break;
      case 'state': {
        // Video değiştiyse tepki sayacı sıfırlanır (applyState roomState'i değiştirmeden önce bak).
        void applyState(message.state);
        pins.reset(message.state.item?.id ?? null);
        const { action, by, state } = message;
        if (message.resumed !== undefined) {
          const at = message.resumed;
          addActivity(() => t('resumedAt', { time: formatTime(at) }));
        }
        // Otomatik bekleme hareketleri "waiting" mesajıyla ayrıca anlatılıyor.
        if (by.id === SYSTEM_MEMBER_ID) break;
        const item = state.item;
        addActivity(() => {
          const title = item ? itemTitle(item) : '';
          return action === 'next'
            ? t('action.next', { title })
            : t(`action.${action}`, { name: displayName(by), title, time: formatTime(state.position), rate: state.rate });
        });
        break;
      }
      case 'title':
        rememberTitle(message.itemId, message.title);
        if (roomState?.item?.id === message.itemId) $('#external-title').textContent = message.title;
        renderNowPlaying();
        queue.render();
        chat.render();
        break;
      case 'queue': {
        queue.set(message.queue);
        renderNowPlaying();
        const change = message.change;
        if (change) addActivity(() => t(`queue.${change.kind}`, { name: displayName(change.by), title: itemTitle(change.item) }));
        break;
      }
      case 'members':
        setMembers(message.members, message.hostId, true);
        break;
      case 'waiting': {
        const before = waitingIds;
        waitingIds = message.ids;
        if (before.length === 0 && waitingIds.length > 0) {
          const names = waitingNames();
          addActivity(() => t('waitStarted', { names }));
        } else if (before.length > 0 && waitingIds.length === 0) {
          addActivity(() => t('waitEnded'));
        }
        renderWaiting();
        break;
      }
      case 'settings':
        roomSettings = message.settings;
        renderWaiting();
        break;
      case 'bans':
        people.setBans(message.bans);
        break;
      case 'kicked': {
        const { who, by } = message;
        kickedIds.add(who.id);
        addActivity(() => t('kickedNotice', { who: withAvatar(who), by: withAvatar(by) }));
        break;
      }
      case 'pins':
        pins.set(message.pins);
        break;
      case 'sticker':
        reactions.addSticker(message.sticker);
        break;
      case 'sticker-removed':
        reactions.removeSticker(message.id);
        break;
      case 'recap': {
        // Oturum özeti açıldı: açan hemen görür, diğerlerine "Gör" kartı çıkar.
        const { recap, by } = message;
        recaps = [...recaps.filter((r) => r.id !== recap.id), recap];
        renderRecapHistory($('#recap-history'), recaps);
        if (by.id === myId) showRecap(recap, displayName(by));
        else showRecapInvite(displayName(by), () => showRecap(recap, displayName(by)));
        break;
      }
      case 'recaps':
        recaps = message.recaps;
        renderRecapHistory($('#recap-history'), recaps);
        break;
      case 'reaction':
        if (settings.options.showReactions) reactions.show(message.by, message.emoji, message.sticker);
        break;
      case 'chat': {
        const { by, text } = message.message;
        chat.add(message.message);
        // Tam ekranda sohbet paneli görünmez; mesaj videonun köşesinde belirir.
        if (fullscreen.isActive()) toasts.show(withAvatar(by), text, by.id === myId);
        break;
      }
      case 'error':
        if (message.code === 'kicked') {
          // Oda yöneticisi çıkardı: tekrar bağlanmaya çalışma, bilgilendirme ekranını göster.
          connection.close();
          engine.destroy();
          // Gömülü filmi durdurmak odayı durdururdu (oradaki motor yayardı); sadece kapat.
          if (embed) closeCurrent();
          else current?.player.pause();
          $('#kicked').hidden = false;
          break;
        }
        if (message.code === 'not_host' && roomState) {
          // Yönetici modu: yaptığım hareket kabul edilmedi, oynatıcı odanın durumuna döner.
          engine.receive(roomState);
        }
        if (message.code === 'recap_empty') {
          showError(() => t('error.recap_empty'));
          break;
        }
        if (message.code === 'others_watching') {
          // Kim hâlâ filmde, onu söyle: herkes çubuktaki 🏠 ile dönünce yeni video açılabilir.
          showError(() => t('error.others_watching', { names: watchingNames() }));
          break;
        }
        showError(() => t(`error.${message.code}`));
        if (message.code === 'version' || message.code === 'room_full') connection.close();
        break;
      case 'pong':
        break;
    }
  }

  // ---- Oynatıcı ----
  let currentItemId: string | null = null;
  let current: { player: PlayerAdapter; slot: HTMLElement } | null = null;
  let mediaToken = 0;

  async function applyState(state: PlaybackState): Promise<void> {
    roomState = state;
    showRate(speedEl, state.rate);
    if (SPEEDS.includes(state.rate)) fullscreen.setRate(state.rate);
    renderNowPlaying();
    const itemId = state.item?.id ?? null;
    if (itemId === currentItemId) {
      engine.receive(state);
      embed?.setState(state);
      return;
    }

    // Video değişti: eskisini kapat, yenisini aç.
    currentItemId = itemId;
    const token = ++mediaToken;
    engine.detach();
    closeCurrent();
    autoplayEl.hidden = true;
    showError(null);
    engine.receive(state);
    emptyEl.hidden = state.item !== null;
    externalEl.hidden = state.item?.media.kind !== 'page';
    if (state.item === null) return;

    const media = state.item.media;
    if (media.kind === 'page') {
      if (wantsEmbed(state.item)) startEmbed(state.item, media.url);
      else showExternal(state.item, media.url);
      return;
    }
    const slot = el('div', { class: 'slot' });
    playerEl.append(slot);
    const onError = () => showError(() => t('playerError'));
    let player: PlayerAdapter;
    try {
      player =
        media.kind === 'youtube'
          ? await createYouTubePlayer(slot, media.id, onError)
          : media.kind === 'test'
            ? createTestPlayer(slot)
            : createHtml5Player(slot, media.url, onError);
    } catch {
      onError();
      slot.remove();
      return;
    }
    if (token !== mediaToken) {
      player.destroy();
      slot.remove();
      return;
    }
    current = { player, slot };
    engine.attach(player);
  }

  // ---- Film sitenin içinde (deneysel, eklentiyle) ----
  /** Şu an oynatıcı alanında açık film sayfası (yoksa null). */
  let embed: EmbedPlayer | null = null;
  /** Bu videolar sitenin içinde açılamadı (ya da kullanıcı ayrı sekmeyi seçti): tekrar deneme. */
  const embedFailed = new Map<string, EmbedFailure>();
  const embedLoadingEl = $('#embed-loading');
  // Seçenek yok: eklenti destekliyorsa film hep odanın içinde ve sadece video olarak açılır.
  // Site izin vermezse (ya da kullanıcı "ayrı sekmede aç" derse) o video için ayrı sekme kartı.
  let embedOn = true;

  function wantsEmbed(item: QueueItem): boolean {
    return embedOn && canEmbed() && !embedFailed.has(item.id);
  }

  /** Oynatıcı alanındaki videoyu/sayfayı kapatır. */
  function closeCurrent(): void {
    if (current !== null) {
      current.player.destroy();
      current.slot.remove();
      current = null;
    }
    embed = null;
    embedLoadingEl.hidden = true;
    $('.player-wrap').classList.remove('embedding');
    renderNowPlaying();
  }

  /**
   * Film sayfasını oynatıcı alanında açar. Önce eklenti başlıklara bakar (yasaksa hemen
   * ayrı sekme kartına düşeriz); açılırsa senkron çerçevenin içinde çalışır, sohbet,
   * emojiler, pinler ve tam ekran sitede kalır.
   */
  function startEmbed(item: QueueItem, url: string): void {
    externalEl.hidden = true;
    embedLoadingEl.hidden = false;
    $('.player-wrap').classList.add('embedding');
    const slot = el('div', { class: 'slot' });
    playerEl.append(slot);
    const player: EmbedPlayer = createEmbedPlayer(slot, {
      roomId,
      url,
      title: itemTitle(item),
      onReady: () => {
        if (embed === player) embedLoadingEl.hidden = true;
      },
      onBlocked: (reason) => {
        if (embed !== player) return;
        embedFailed.set(item.id, reason);
        closeCurrent();
        externalEl.hidden = false;
        showExternal(item, url);
      },
      onSend: (message) => {
        if (embed === player && isRelayable(message)) send(message);
      },
      // Çerçevede basılan kısayol: sitedeki kısayol dinleyicileri (emoji, Enter, P) aynen işlesin.
      onKey: (key) => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })),
      onFullscreen: () => {
        if (!fullscreen.isActive()) fullscreen.toggle();
      },
    });
    current = { player, slot };
    embed = player;
    if (roomState) player.setState(roomState);
    player.setClock(clock.now() - Date.now(), clock.synced);
    renderNowPlaying();
  }
  // Çerçevedeki motor sunucu saatini sitenin ölçümünden alır.
  setInterval(() => embed?.setClock(clock.now() - Date.now(), clock.synced), 2000);

  /** Gömülü filmden vazgeç: ayrı sekmede aç (bugünkü yol). */
  function leaveEmbed(): void {
    const item = roomState?.item;
    if (!item || item.media.kind !== 'page') return;
    embedFailed.set(item.id, 'manual');
    closeCurrent();
    externalEl.hidden = false;
    showExternal(item, item.media.url);
    $<HTMLButtonElement>('#external-go').click();
  }
  $('#embed-out').addEventListener('click', leaveEmbed);
  $('#embed-loading-out').addEventListener('click', leaveEmbed);

  /** "Odanın içinde aç" (ayrı sekmeyi seçtikten sonra geri dönüş): açık sayfayı yeniden göster. */
  function setEmbedOn(next: boolean): void {
    embedOn = next;
    if (next) for (const [id, reason] of embedFailed) if (reason === 'manual') embedFailed.delete(id);
    if (roomState?.item?.media.kind === 'page' && !handedOff) {
      currentItemId = null;
      void applyState(roomState);
    }
  }
  $('#external-embed').addEventListener('click', () => setEmbedOn(true));

  /**
   * Odada bir web sayfası açık: video o sayfada, herkesin kendi sekmesinde oynar.
   * Kimseyi habersiz yönlendirmeyiz; ne olacağını anlatıp tek tuşla göndeririz.
   * Eklenti kuruluysa sekmeyi o götürür (oda orada devam eder); değilse kurulum
   * adımları gösterilir.
   */
  function showExternal(item: QueueItem, url: string): void {
    const hasExtension = document.documentElement.dataset.swmExtension !== undefined;
    $('#external-title').textContent = itemTitle(item);
    $('#external-host').textContent = hostOf(url);
    renderWatching();
    $('#external-ext').hidden = !hasExtension;
    $('#external-noext').hidden = hasExtension;
    // Sitenin içinde açılamadıysa nedenini söyle; hiç denenmediyse denemeyi öner.
    const failure = embedFailed.get(item.id);
    const note = $('#external-note');
    note.hidden = !failure || failure === 'manual';
    note.textContent = failure && failure !== 'manual' ? t(failure === 'timeout' ? 'embedTimeout' : 'embedBlocked') : '';
    $('#external-embed').hidden = !hasExtension || !canEmbed() || embedOn || !!failure;
    $<HTMLAnchorElement>('#external-alone').href = url;
    const go = $<HTMLButtonElement>('#external-go');
    go.disabled = false;
    go.textContent = t('externalGoJoin');
    go.onclick = () => {
      go.disabled = true;
      go.textContent = t('externalGoing');
      // Eklentiye "bu sekme bu odaya katılsın, sayfa da bu" de; sekmeyi eklenti hemen götürür.
      window.postMessage({ source: 'screenwithme-site', type: 'join', roomId, url }, location.origin);
      // Eski sürüm eklenti cevap vermezse adres işaretiyle (#swm=ODA) git.
      setTimeout(() => {
        if (!handedOff && roomState?.item?.id === item.id) location.assign(pageInviteUrl(url, roomId));
      }, 3000);
    };
  }

  function hostOf(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  // Eklentiden gelenler: "sekmeyi ben götürüyorum" (bağlantımızı kapatırız, odada iki kez
  // görünmeyelim) ve eklentide değişen isim/avatar.
  let handedOff = false;
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data as { source?: string; type?: string; name?: unknown; avatar?: unknown } | null;
    if (data?.source !== 'screenwithme-extension') return;
    if (data.type === 'joining' && !handedOff) {
      handedOff = true;
      if (embed) closeCurrent();
      connection.close();
      engine.destroy();
    } else if (data.type === 'identity') {
      const name = cleanName(data.name);
      const avatar = isAvatar(data.avatar) ? data.avatar : myAvatar;
      if (name && (name !== myName || avatar !== myAvatar)) settings.setIdentity(name, avatar);
    }
  });

  function renderNowPlaying(): void {
    const item = roomState?.item ?? null;
    nowPlayingEl.hidden = item === null;
    if (item) {
      nowTitleEl.textContent = itemTitle(item);
      nowTitleEl.title = itemTitle(item);
      // Son odalarda oda adı yerine en son oynayan görünsün.
    }
    skipEl.disabled = queue.length === 0;
    fullscreen.setSkipEnabled(queue.length > 0);
    $('#embed-out').hidden = embed === null;
  }

  function skip(): void {
    const id = roomState?.item?.id;
    if (id) send({ t: 'next', from: id });
  }
  skipEl.addEventListener('click', skip);

  autoplayEl.querySelector('button')!.addEventListener('click', () => {
    autoplayEl.hidden = true;
    engine.resume();
  });

  // Gömülü filmde motor çerçevede çalışır: hız isteği oraya gider.
  // YouTube 2x'ten hızlı oynatmıyor: orada en fazla 2x istenir.
  const requestRate = (wanted: number) => {
    const rate = roomState?.item?.media.kind === 'youtube' ? Math.min(wanted, YOUTUBE_MAX_RATE) : wanted;
    if (embed) embed.control({ action: 'rate', rate });
    else engine.requestRate(rate);
  };
  speedEl.addEventListener('change', () => requestRate(Number(speedEl.value)));
  // İnce hız ayarı: her basış ±0.05 (hazır seçeneklerin dışındaki hız listede "özel" olarak görünür).
  $('#speed-down').addEventListener('click', () => requestRate(stepRate(roomState?.rate ?? 1, -1)));
  $('#speed-up').addEventListener('click', () => requestRate(stepRate(roomState?.rate ?? 1, 1)));

  // ---- Tam ekran: sadece video kalır, fare oynayınca kontroller ve hızlı mesaj belirir. ----
  const fullscreen = createFullscreen({
    theater: $('#theater'),
    getPlayer: () => current?.player ?? null,
    send,
    onSkip: skip,
    onRate: requestRate,
  });
  const toasts = createToasts($('#toasts'), $('#toast-handle'));
  // Önemli anları pinleme: video altında ve tam ekranda ilerleme çubuğunun üstünde işaretler.
  const pins = createPins({
    strips: [$('#pin-strip'), $('#fs-pins')],
    buttons: [$('#pin-btn'), $('#fs-pin')],
    form: $<HTMLFormElement>('#pin-form'),
    getDuration: () => current?.player.getDuration() ?? 0,
    onSeek: (seconds) => current?.player.seek(seconds),
    myId: () => myId,
    isHost: () => myId !== null && myId === hostId,
    send,
  });
  $('#pin-btn').addEventListener('click', () => pins.open());
  // Senkron testi: boş odada 12 sn'lik sayaç açar; oynarken "aynı yerdesiniz" rozeti fark gösterir.
  $('#sync-test').addEventListener('click', () => send({ t: 'load', media: { kind: 'test' } }));
  setInterval(() => {
    const badge = $('#sync-badge');
    const testing = roomState?.item?.media.kind === 'test' && current !== null && clock.synced;
    badge.hidden = !testing;
    if (!testing || !roomState || !current) return;
    const diff = Math.abs(current.player.getTime() - expectedPosition(roomState, clock.now())) * 1000;
    badge.classList.toggle('bad', diff > 300);
    badge.textContent = diff <= 300 ? t('syncGood', { ms: Math.round(diff) }) : t('syncBad', { ms: Math.round(diff) });
  }, 500);
  $('#fs-pin').addEventListener('click', () => pins.open());
  // Süre video yüklenince belli olur; arada bir yeniden çiz.
  setInterval(() => pins.render(), 2000);
  const fullscreenEl = $<HTMLButtonElement>('#fullscreen');
  fullscreenEl.hidden = !document.fullscreenEnabled;
  fullscreenEl.addEventListener('click', () => fullscreen.toggle());

  // ---- Video linki ----
  const mediaInput = $<HTMLInputElement>('#media-input');
  const mediaError = $('#media-error');
  const extDialog = $<HTMLDialogElement>('#ext-dialog');
  let pendingAdd: (() => void) | null = null;

  // Eklentiyi kurmaya gidip dönen: eklenti kurulunca açık sekmeleri kendisi yeniler; olmadıysa
  // (ör. sekme başka pencerede kaldıysa) üstte "kurduysan yenile" bandı çıkar. Yenileyince
  // isim sormadan odaya dönülür ve uyarı kalkar.
  let wentToInstall = false;
  app.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('a[href="/eklenti.html"]')) wentToInstall = true;
  });
  const extReload = $('#ext-reload');
  extReload.querySelector('button')!.addEventListener('click', () => location.reload());
  document.addEventListener('visibilitychange', () => {
    const hasExtension = document.documentElement.dataset.swmExtension !== undefined;
    if (document.visibilityState === 'visible' && wentToInstall && !hasExtension) {
      if (extDialog.open) extDialog.close();
      extReload.hidden = false;
    }
  });
  $('#ext-add-anyway').addEventListener('click', () => {
    extDialog.close();
    pendingAdd?.();
    pendingAdd = null;
  });
  $('#ext-cancel').addEventListener('click', () => {
    extDialog.close();
    pendingAdd = null;
  });

  $<HTMLFormElement>('#media-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const media = parseMediaInput(mediaInput.value);
    mediaError.hidden = media !== null;
    if (media === null) return;
    // Enter'a basılınca ilk buton ("Sıraya ekle") geçerli olur; izlenen video yanlışlıkla değişmez.
    const mode = (event.submitter as HTMLButtonElement | null)?.value === 'load' ? 'load' : 'enqueue';
    const add = () => {
      send({ t: mode, media });
      mediaInput.value = '';
      // Sıraya eklendiyse (video oynarken) sessiz kalmasın: kısa bir onay.
      if (mode === 'enqueue' && roomState?.item) {
        const done = $('#media-done');
        done.textContent = t('queuedNote');
        done.hidden = false;
        setTimeout(() => (done.hidden = true), 2500);
      }
    };
    // YouTube ya da video dosyası değil, bir web sayfası: eklentisi yoksa önce ne gerektiğini anlat.
    const hasExtension = document.documentElement.dataset.swmExtension !== undefined;
    if (media.kind === 'page' && !hasExtension) {
      pendingAdd = add;
      extDialog.showModal();
      return;
    }
    add();
  });

  // ---- Herkesi bana eşitle: kendi konumumu odaya yayar (biri kaydıysa tek tıkla düzelir). ----
  const syncAllEl = $<HTMLButtonElement>('#sync-all');
  syncAllEl.addEventListener('click', () => {
    if (embed) embed.control({ action: 'sync-all' });
    else engine.syncEveryoneToMe();
    syncAllEl.disabled = true;
    setTimeout(() => (syncAllEl.disabled = false), 1500);
  });

  // ---- Davet linki ----
  const inviteEl = $<HTMLInputElement>('#invite');
  const copyEl = $<HTMLButtonElement>('#copy');
  inviteEl.value = `${location.origin}/r/${roomId}`;
  inviteEl.addEventListener('focus', () => inviteEl.select());
  // Telefonda (dokunmatik + paylaşım menüsü varsa) "Paylaş": WhatsApp vb. doğrudan açılır.
  const canShare = typeof navigator.share === 'function' && matchMedia('(pointer: coarse)').matches;
  async function shareInvite(button: HTMLButtonElement, idleText: () => string): Promise<void> {
    if (canShare) {
      try {
        await navigator.share({ title: 'ScreenWithMe', text: t('inviteShareText'), url: inviteEl.value });
        return;
      } catch {
        // Vazgeçildi ya da desteklenmiyor: kopyalamaya düş.
      }
    }
    try {
      await navigator.clipboard.writeText(inviteEl.value);
    } catch {
      inviteEl.select();
      document.execCommand('copy');
    }
    button.textContent = t('copied');
    setTimeout(() => (button.textContent = idleText()), 1500);
  }
  const inviteLabel = () => t(canShare ? 'share' : 'copy');
  const emptyInviteLabel = () => t(canShare ? 'share' : 'copyInvite');
  copyEl.textContent = inviteLabel();
  copyEl.addEventListener('click', () => void shareInvite(copyEl, inviteLabel));
  const emptyInviteEl = $<HTMLButtonElement>('#empty-invite');
  emptyInviteEl.textContent = emptyInviteLabel();
  emptyInviteEl.addEventListener('click', () => void shareInvite(emptyInviteEl, emptyInviteLabel));
  window.addEventListener('langchange', () => {
    copyEl.textContent = inviteLabel();
    emptyInviteEl.textContent = emptyInviteLabel();
  });

  // ---- Arayüz parçaları ----
  function displayName(member: Member): string {
    const name = withAvatar(member);
    return member.id === myId ? `${name} (${t('you')})` : name;
  }

  function setMembers(next: Member[], nextHost: string | null, announce: boolean): void {
    if (announce) {
      const before = new Set(members.map((m) => m.id));
      const after = new Set(next.map((m) => m.id));
      for (const m of next) if (!before.has(m.id) && m.id !== myId) addActivity(() => t('joined', { name: withAvatar(m) }));
      // Atılan kişi için ayrıca "ayrıldı" yazma ("çıkardı" satırı zaten var).
      for (const m of members) if (!after.has(m.id) && !kickedIds.has(m.id)) addActivity(() => t('left', { name: withAvatar(m) }));
      if (nextHost !== hostId && nextHost === myId) addActivity(() => t('youAreHostNow'));
    }
    members = next;
    hostId = nextHost;
    renderMembers();
  }

  function renderMembers(): void {
    people.set(members, hostId, myId);
    $('#people-count').textContent = String(members.length);
    renderWaiting();
    renderWatching();
  }

  /** Eklentiyle hâlâ odadaki sayfada (filmde) olanlar. */
  function watchingNames(): string {
    return members.filter((m) => m.client === 'ext' && m.id !== myId).map(withAvatar).join(', ');
  }

  /** Film kartında: "🎬 Hâlâ filmde: …" (herkes odaya dönünce yeni video açılabilir). */
  function renderWatching(): void {
    const line = $('#external-watching');
    const names = watchingNames();
    line.hidden = !names || roomState?.item?.media.kind !== 'page';
    line.textContent = names ? t('stillWatching', { names }) : '';
  }

  function waitingNames(): string {
    return waitingIds.map((id) => members.find((m) => m.id === id)).filter((m): m is Member => !!m).map(withAvatar).join(', ');
  }

  /** Bekleme bandı (video üstünde) ve ayarlardaki "yüklenen birini bekle" anahtarı. */
  function renderWaiting(): void {
    const banner = $('#waiting-banner');
    const names = waitingNames();
    banner.hidden = waitingIds.length === 0;
    banner.textContent = waitingIds.includes(myId ?? '') ? t('waitingForYou') : t('waitingFor', { names: names || '…' });
    const toggle = $<HTMLInputElement>('#opt-wait');
    toggle.checked = roomSettings.waitForAll;
    toggle.disabled = !amHost();
    // Yönetici kutusu: yöneticiye "senin ayarların", diğerlerine "sadece yönetici değiştirir".
    $('#opt-wait-hint').textContent = toggle.disabled ? t('settings.hostOnly') : t('settings.youAreHost');
    $('.host-box').classList.toggle('mine', !toggle.disabled);
    renderModes();
  }

  /**
   * Kayıt durumu: yöneticiye ad kutusu + kaydet/kaldır, diğerlerine sadece durum. Kayıtlı oda
   * herkesin "kaydedilen odalar" listesine kendiliğinden girer (kendisi çıkarmadıysa).
   */
  function renderSaved(host: boolean): void {
    const saved = roomSettings.saved === true;
    const name = roomSettings.name ?? '';
    $('#save-status').textContent = saved ? t('savedStatus', { name: name || roomId }) : t('notSavedStatus');
    $('#save-form').hidden = !host;
    $('#save-off').hidden = !host || !saved;
    $('#save-submit').textContent = saved ? t('rename') : t('saveRoom');
    const input = $<HTMLInputElement>('#save-name');
    if (document.activeElement !== input) input.value = name;
    const label = $('#room-name');
    label.hidden = !saved;
    label.textContent = saved ? `💾 ${name || roomId}` : '';
    document.title = saved && name ? `${name} · ScreenWithMe` : 'ScreenWithMe';
    if (saved) rememberSaved({ id: roomId, name: name || roomId, at: Date.now(), mine: host });
    else forgetSaved(roomId);
  }

  /** Yönetici modları ve planlı başlangıç: ayar anahtarları, kilit notu, sıra butonları. */
  function renderModes(): void {
    const host = amHost();
    const hostOnly = $<HTMLInputElement>('#opt-hostonly');
    const lockQueue = $<HTMLInputElement>('#opt-lockqueue');
    hostOnly.checked = roomSettings.hostOnly === true;
    lockQueue.checked = roomSettings.lockQueue === true;
    renderSaved(host);
    $<HTMLInputElement>('#opt-noreactions').checked = roomSettings.noReactions === true;
    app.classList.toggle('no-reactions', roomSettings.noReactions === true);
    for (const id of ['#opt-hostonly', '#opt-lockqueue', '#opt-noreactions', '#opt-start', '#opt-start-set', '#opt-start-clear']) {
      $<HTMLInputElement>(id).disabled = !host;
    }
    $('#host-lock').hidden = host || !roomSettings.hostOnly;
    queue.render();
    renderSchedule();
    const autoNext = $<HTMLInputElement>('#opt-autonext');
    autoNext.checked = roomSettings.autoNext !== false;
    autoNext.disabled = !host;
    autoNext.parentElement!.title = host ? '' : t('settings.hostOnly');
  }

  /** Planlı başlangıç bandı: "⏰ 21:00'de başlıyor · 2 sa 13 dk". Saniyede bir yenilenir. */
  let scheduleWasSet = false;
  function renderSchedule(): void {
    const banner = $('#schedule-banner');
    const at = roomSettings.startsAt;
    if (at === undefined) {
      if (scheduleWasSet && roomState?.item && !roomState.paused) addActivity(() => t('scheduleStarted'));
      scheduleWasSet = false;
      banner.hidden = true;
      return;
    }
    scheduleWasSet = true;
    const left = Math.max(0, at - clock.now());
    const time = new Date(at - (clock.now() - Date.now())).toLocaleString(document.documentElement.lang || undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    banner.hidden = false;
    banner.textContent = t('scheduleBanner', { time, left: formatLeft(left) });
  }
  setInterval(() => roomSettings.startsAt !== undefined && renderSchedule(), 1000);

  $<HTMLInputElement>('#opt-hostonly').addEventListener('change', (event) => {
    send({ t: 'settings', hostOnly: (event.target as HTMLInputElement).checked });
  });
  $('#recap-open').addEventListener('click', () => send({ t: 'recap' }));
  $<HTMLInputElement>('#opt-noreactions').addEventListener('change', (event) => {
    send({ t: 'settings', noReactions: (event.target as HTMLInputElement).checked });
  });
  // Odayı kaydet: isim zorunlu. Kayıtlıyken aynı kutu adı değiştirir.
  $<HTMLFormElement>('#save-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = cleanRoomName($<HTMLInputElement>('#save-name').value);
    if (!name) {
      $<HTMLInputElement>('#save-name').focus();
      return;
    }
    send({ t: 'settings', saved: true, name });
  });
  $('#save-off').addEventListener('click', () => {
    if (confirm(t('saveOffConfirm'))) send({ t: 'settings', saved: false });
  });
  $<HTMLInputElement>('#opt-autonext').addEventListener('change', (event) => {
    send({ t: 'settings', autoNext: (event.target as HTMLInputElement).checked });
  });
  $<HTMLInputElement>('#opt-lockqueue').addEventListener('change', (event) => {
    send({ t: 'settings', lockQueue: (event.target as HTMLInputElement).checked });
  });
  $('#opt-start-set').addEventListener('click', () => {
    const value = $<HTMLInputElement>('#opt-start').value;
    const local = value ? new Date(value).getTime() : NaN;
    if (!Number.isFinite(local) || local <= Date.now()) {
      showError(() => t('scheduleInvalid'));
      return;
    }
    // Sunucu saatine çevir (tahmini fark).
    send({ t: 'settings', startsAt: local + (clock.now() - Date.now()) });
  });
  $('#opt-start-clear').addEventListener('click', () => send({ t: 'settings', startsAt: null }));
  $<HTMLInputElement>('#opt-wait').addEventListener('change', (event) => {
    send({ t: 'settings', waitForAll: (event.target as HTMLInputElement).checked });
  });

  /** Oda hareketlerini sohbete gri satır olarak yazar (varsayılan gizli; sohbetteki düğmeyle görünür). */
  function addActivity(text: () => string): void {
    chat.system(text);
  }

  function renderStatus(): void {
    statusEl.hidden = false;
    statusEl.dataset.status = status;
    statusEl.textContent = t(`status.${status}`);
    // Bağlantı koptuysa yenile düğmesi dikkat çeksin.
    reconnectEl.hidden = false;
    reconnectEl.classList.toggle('attention', status === 'reconnecting' || status === 'closed');
  }

  // ---- Bağlantıyı yenile (sağ üst ⟳): kopma ya da takılma için, sayfayı yenilemeden. ----
  reconnectEl.onclick = () => {
    if (handedOff || !$('#kicked').hidden) return;
    reconnectEl.classList.add('spin');
    setTimeout(() => reconnectEl.classList.remove('spin'), 700);
    connection.reconnect();
  };

  function showError(text: (() => string) | null): void {
    errorText = text;
    playerErrorEl.hidden = text === null;
    playerErrorEl.textContent = text?.() ?? '';
  }

  function renderLabels(): void {
    const label = (element: HTMLElement, text: string) => {
      element.title = text;
      element.setAttribute('aria-label', text);
    };
    label(fullscreenEl, t('fullscreen'));
    label($('#fs-play'), t('playPause'));
    label($('#fs-skip'), t('skip'));
    label($('#fs-pin'), t('pinHint'));
    label($('#pin-btn'), t('pinHint'));
    label($('#fs-exit'), t('exitFullscreen'));
    label($('#fs-speed'), t('speed'));
    label($('#settings-tab'), t('tab.settings'));
    label(syncAllEl, t('syncAllHint'));
  }

  window.addEventListener('langchange', () => {
    renderStatus();
    renderMembers();
    renderLabels();
    queue.render();
    chat.render();
    reactions.relabel();
    showError(errorText);
    copyEl.textContent = t('copy');
  });

  renderStatus();
  renderMembers();
  renderLabels();
  queue.set([]);
  chat.set([]);

  // Sadece geliştirme modunda: tarayıcı konsolundan senkronu incelemek için.
  if (import.meta.env.DEV) {
    Object.assign(window, { __swm: { engine, clock, player: () => current?.player ?? null, embed: () => embed } });
  }
}
