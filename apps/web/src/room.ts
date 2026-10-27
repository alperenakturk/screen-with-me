import { ServerClock } from '@swm/shared/clock';
import { RoomConnection, type ConnectionStatus } from '@swm/shared/connection';
import { INTRO_CSS, createIntro } from '@swm/shared/intro';
import { isForwardedKey, isRelayable } from '@swm/shared/embed';
import { parseMediaInput, samePage } from '@swm/shared/media';
import { holePath, mergeRects, type Rect, type ShellLayout } from '@swm/shared/shell';
import type { PlayerAdapter } from '@swm/shared/player';
import {
  avatarText,
  SYSTEM_MEMBER_ID,
  cleanName,
  cleanRoomName,
  expectedPosition,
  stepRate,
  YOUTUBE_MAX_RATE,
  isAvatar,
  randomAvatar,
  REACTION_GAPS,
  type Avatar,
  type ReactionGap,
  type ClientMessage,
  type Member,
  type PlaybackState,
  type QueueItem,
  type RoomSettings,
  type ServerMessage,
} from '@swm/shared/protocol';
import { SyncEngine } from '@swm/shared/sync-engine';
import { el } from './dom.ts';
import { t, translate } from './i18n.ts';
import { formatTime, itemTitle, mediaUrl, rememberTitle } from './media-info.ts';
import { createShellPlayer, type ShellPlayer } from './players/shell.ts';
import { createHtml5Player } from './players/html5.ts';
import { createTestPlayer } from './players/test.ts';
import { createYouTubePlayer, loadYouTubeApi } from './players/youtube.ts';
import {
  clientId,
  extensionSupportsShell,
  hasExtension,
  isShell,
  load,
  onExtensionMessage,
  postToExtension,
  save,
  saveIdentity,
  sessionLoad,
  sessionSave,
} from './storage.ts';
import { avatarNode, renderAvatarPicker } from './ui/avatar.ts';
import { createChatPanel } from './ui/chat.ts';
import { createQueuePanel } from './ui/queue.ts';
import { createFullscreen } from './ui/fullscreen.ts';
import { createPeoplePanel } from './ui/people.ts';
import { createReactions, isTyping } from './ui/reactions.ts';
import { createSeats } from './ui/seats.ts';
import { createPins } from './ui/pins.ts';
import { showNextCard } from './ui/end-card.ts';
import { renderRecapHistory, showRecap } from './ui/recap.ts';
import { confirmDialog } from './ui/confirm.ts';
import type { Recap } from '@swm/shared/recap';
import { forgetSaved, rememberSaved } from './saved-rooms.ts';
import { createSettingsPanel } from './ui/settings.ts';
import { createTabs, isTabId } from './ui/tabs.ts';
import { createLive } from './ui/live.ts';
import { createVoice } from './ui/voice.ts';
import { flashHint } from './ui/hint.ts';
import { createToasts } from './ui/toasts.ts';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];

/**
 * Odaya giriş iki adımlıdır: önce isim, sonra avatar. İkisi de tarayıcıda
 * saklanır ve bir dahakine hazır gelir. "Odaya gir" tıklaması aynı zamanda
 * tarayıcının sesli oynatma izni için gereken etkileşimdir.
 */
export function renderRoom(app: HTMLElement, roomId: string, waited = false): void {
  // Film sayfasının üstündeki katman (kabuk): kişi siteden geliyor, isim/avatar sormadan girer.
  // (İsim hiç yoksa katman tam açılır, isim adımı görünsün.)
  if (isShell) {
    const name = cleanName(load('name'));
    const avatar = load('avatar');
    if (name && isAvatar(avatar)) {
      startRoom(app, roomId, name, avatar, { resumed: true });
      return;
    }
    postToExtension({ type: 'layout', layout: { mode: 'open' } });
  }
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

/** Aynı site ve yol mu (sorgu/parça farkı önemsiz)? Film oynarken adres sorgusu değişirse aynı sayfa sayılır. */
function samePath(a: string, b: string): boolean {
  try {
    const x = new URL(a);
    const y = new URL(b);
    return x.origin === y.origin && x.pathname === y.pathname;
  } catch {
    return false;
  }
}

function withAvatar(member: { name: string; avatar?: string }): string {
  return member.avatar ? `${avatarText(member.avatar)} ${member.name}` : member.name;
}

function startRoom(app: HTMLElement, roomId: string, myName: string, myAvatar: Avatar, { resumed = false } = {}): void {
  // Sayfa yenilenirse doğrudan odaya dönülsün (sekmeye özel; yeni sekmede isim yine sorulur).
  sessionSave(`in:${roomId}`, '1');
  // İlk video eklendiğinde beklememek için YouTube oynatıcısını şimdiden indirmeye başla. Film sayfasındaki katmanda
  // değil: orada film sayfanın kendi oynatıcısında, her film sayfası açılışında boşuna ~1 MB inerdi (gerekirse yine yüklenir).
  if (!isShell) loadYouTubeApi().catch(() => {});

  app.innerHTML = `
    <div class="room">
      <div class="stage">
        <form id="media-form" class="media-form">
          <input id="media-input" autocomplete="off" data-i18n-placeholder="mediaPlaceholder" data-i18n-title="mediaLabel" />
          <button class="btn primary" value="enqueue" data-i18n="addToQueue"></button>
          <button class="btn" value="load" data-i18n="playNow"></button>
        </form>
        <p id="media-error" class="error" data-i18n="invalidMedia" hidden></p>
        <p id="media-done" class="muted small" role="status" hidden></p>

        <div id="schedule-banner" class="schedule-banner" role="status" hidden></div>
        <div id="seats-l" class="seats seats-l shorts-only"></div>
        <div id="theater" class="theater">
          <div class="now-playing" id="now-playing" hidden>
            <div class="now-text">
              <span class="muted small" data-i18n="nowPlaying"></span>
              <span id="now-title" class="now-title"></span>
            </div>
            <button id="skip" type="button" class="btn small-btn"><span data-i18n="skip"></span> ⏭</button>
          </div>
          <div class="player-wrap">
            <div id="player" class="player"></div>
            <div id="fs-catcher" class="fs-only fs-catcher"></div>
            <div id="reactions-layer" class="reactions-layer" aria-hidden="true"></div>
            <div id="cam-dock" class="cam-dock" hidden></div>
            <div id="live-window" class="live-window" hidden>
              <video id="live-video" autoplay playsinline></video>
              <div class="live-bar">
                <span id="live-title" class="live-title"></span>
                <button id="live-big" type="button" class="icon-btn" data-i18n-title="live.bigger">⤢</button>
                <button id="live-close" type="button" class="icon-btn" data-i18n-title="close">✕</button>
              </div>
            </div>
            <div id="waiting-banner" class="waiting-banner" role="status" hidden></div>
            <div id="sync-badge" class="sync-badge" role="status" hidden></div>
            <div id="toasts" class="fs-only toasts" aria-live="polite"></div>
            <form id="pin-form" class="pin-form" hidden><span aria-hidden="true">📌</span><input id="pin-note" autocomplete="off" data-i18n-placeholder="pinPlaceholder" /><button class="btn small-btn primary" data-i18n="pinSave"></button></form>
            <div id="toast-handle" class="fs-only toast-handle" data-i18n-title="toastHandleHint"><span data-i18n="toastHandle"></span></div>
            <div id="fs-controls" class="fs-only fs-controls">
              <div class="fs-progress">
                <div class="fs-seek-wrap">
                  <div id="fs-pins" class="pin-strip fs" hidden></div>
                  <input id="fs-seek" type="range" min="0" max="1000" step="1" value="0" data-i18n-title="seekLabel" />
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
            <div id="external" class="overlay external" hidden>
              <p id="external-label" class="muted" data-i18n="externalTitle"></p>
              <p id="external-stray" class="external-stray" data-i18n="strayTitle" hidden></p>
              <h2 id="external-title"></h2>
              <p id="external-host" class="external-host"></p>
              <p id="external-watching" class="external-watching" hidden></p>
              <div id="external-ext" class="stack external-box">
                <p id="external-note" class="external-note" hidden></p>
                <p data-i18n="externalHasExt"></p>
                <button id="external-go" type="button" class="btn primary big" data-i18n="externalGoJoin"></button>
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
              <button id="shorts-enter" type="button" class="btn small-btn shorts-enter" hidden>📱 <span data-i18n="shorts.view"></span></button>
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
        <div id="shorts-nav" class="shorts-nav shorts-only">
          <button id="shorts-prev" type="button" class="shorts-arrow" data-i18n-title="shorts.prev">▲</button>
          <span id="shorts-left" class="shorts-left"></span>
          <button id="shorts-next" type="button" class="shorts-arrow" data-i18n-title="shorts.next">▼</button>
        </div>
        <div id="seats-r" class="seats seats-r shorts-only"></div>
        <div id="shorts-bar" class="shorts-bar shorts-only">
          <form id="shorts-chat" class="shorts-chat">
            <input id="shorts-input" autocomplete="off" maxlength="300" data-i18n-placeholder="chatPlaceholder" data-i18n-title="chat" />
            <button class="btn primary" data-i18n="send"></button>
          </form>
          <div class="reaction-bar shorts-reactions" role="group"></div>
          <button id="shorts-loop" type="button" class="btn small-btn shorts-loop" aria-pressed="false">🔁 <span data-i18n="shorts.loop"></span></button>
          <button id="shorts-exit" type="button" class="btn small-btn" data-i18n-title="shorts.roomViewHint">↩ <span data-i18n="shorts.roomView"></span></button>
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

        <section class="card voice-card" id="voice-card" hidden>
          <div class="voice-row">
            <button id="voice-join" type="button" class="btn primary voice-join">🎙 <span data-i18n="voice.join"></span></button>
            <div id="voice-on" class="voice-on" hidden>
              <button id="voice-mic" type="button" class="btn small-btn voice-mic"></button>
              <button id="voice-cam" type="button" class="btn small-btn voice-cam" hidden>📷</button>
              <button id="voice-leave" type="button" class="btn small-btn" data-i18n="voice.leave"></button>
            </div>
            <div id="voice-people" class="voice-people"></div>
            <span id="voice-limit" class="voice-limit muted small"></span>
          </div>
          <div id="voice-cams" class="voice-cams" hidden>
          </div>
          <p id="voice-hint" class="muted small voice-hint" data-i18n="voice.headphones" hidden></p>
        </section>

        <section class="card live-card" id="live-card" hidden>
          <div class="live-row">
            <span id="live-status" class="live-status small"></span>
            <button id="live-screen" type="button" class="btn small-btn">🖥️ <span data-i18n="live.screen"></span></button>
            <button id="live-camera" type="button" class="btn small-btn">📹 <span data-i18n="live.camera"></span></button>
            <button id="live-watch" type="button" class="btn small-btn primary" hidden></button>
            <button id="live-stop" type="button" class="btn small-btn" data-i18n="live.stop" hidden></button>
            <span id="live-limit" class="voice-limit muted small"></span>
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
            <button type="button" class="tab" role="tab" data-tab="people" data-i18n-title="tab.people">
              <span aria-hidden="true">👥</span><span id="people-count" class="count"></span>
            </button>
            <button type="button" class="tab tab-icon" role="tab" data-tab="settings" id="settings-tab" data-i18n-title="tab.settings">⚙️</button>
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

          <div class="settings profile-panel" id="profile-panel">
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
            <h4>📊 <span data-i18n="recap.title"></span></h4>
            <p class="muted small" data-i18n="recap.explain"></p>
            <button type="button" id="recap-open" class="btn primary recap-open">✨ <span data-i18n="recap.open"></span></button>
            <h4 class="recap-saved-title" data-i18n="recap.savedTitle"></h4>
            <div id="recap-history" class="recap-history"></div>
          </div>

          <div class="tab-panel settings" data-panel="settings" hidden>
            <h4 data-i18n="settings.view"></h4>
            <label class="check-row"><input type="checkbox" id="opt-reactions" /> <span data-i18n="settings.showReactions"></span></label>
            <label class="check-row shell-only"><input type="checkbox" id="opt-closeads" /> <span data-i18n="settings.closeAds"></span></label>
            <label class="check-row shell-only"><input type="checkbox" id="opt-duck" /> <span data-i18n="settings.duck"></span></label>
            <label class="select-row shell-only"><span data-i18n="settings.fsFit"></span>
              <select id="opt-fsfit">
                <option value="cover" data-i18n="settings.fsFit.cover"></option>
                <option value="above" data-i18n="settings.fsFit.above"></option>
              </select>
            </label>
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
              <label class="select-row"><span data-i18n="settings.reactionGap"></span>
                <select id="opt-reactiongap">${REACTION_GAPS.map((gap) => `<option value="${gap}" data-i18n="settings.reactionGap.${gap}"></option>`).join('')}</select>
              </label>
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
  /** Son oynatma hareketini yapan (kendi açtığım sayfaya beklemeden gidilir, başkasınınkine "Filme git"). */
  let lastBy: Member | null = null;
  let members: Member[] = [];
  /** Bu odanın önceki oturum özetleri (ayarlarda listelenir). */
  let recaps: Recap[] = [];
  let hostId: string | null = null;
  const kickedIds = new Set<string>();
  /** "Herkes hazır": oda kimleri bekliyor, yönetici özelliği açtı mı. */
  let waitingIds: string[] = [];
  let roomSettings: RoomSettings = { waitForAll: true };
  /** Sunucunun ayarları geldi mi (welcome) ve kaydedilen odalar listesine en son ne yazıldı. */
  let settingsKnown = false;
  let savedEntry: string | null = null;
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
  // 👤 Profil sağ üstte (en sağda); basınca ad, avatar, tema ve özet düğmenin altında açılan menüde.
  {
    const profileButton = el('button', { type: 'button', class: 'nav-link profile-btn', 'aria-expanded': 'false', 'aria-haspopup': 'true', 'data-i18n-title': 'tab.profile', title: t('tab.profile') }, '👤');
    document.querySelector('.topbar-right')?.append(profileButton);
    const pop = el('div', { class: 'profile-pop', role: 'dialog', 'aria-label': t('tab.profile') });
    pop.hidden = true;
    pop.append($('#profile-panel'));
    app.append(pop);
    const setOpen = (open: boolean) => {
      pop.hidden = !open;
      profileButton.setAttribute('aria-expanded', String(open));
    };
    profileButton.addEventListener('click', () => setOpen(pop.hidden === true));
    // Dışarı tıklayınca ya da Esc ile kapanır (menüden açılan avatar/özet pencereleri dışarı sayılmaz).
    document.addEventListener('pointerdown', (event) => {
      const target = event.target as Element | null;
      if (pop.hidden || !target || pop.contains(target) || profileButton.contains(target)) return;
      if (target.closest('.dialog-backdrop, .recap-backdrop, dialog')) return;
      setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !pop.hidden && !document.querySelector('.dialog-backdrop, .recap-backdrop, dialog[open]')) setOpen(false);
    });
  }
  /** İlk girişte açılacak sekme seçildi mi (önce sekmeler varsayılan sohbetle kurulur; o hatırlanmaz). */
  let tabChosen = false;
  const tabs = createTabs(app, (tab) => {
    chat.setVisible(tab === 'chat');
    // Aynı sekmede yenileyince kalınan sekme korunur.
    if (tabChosen) sessionSave(`tab:${roomId}`, tab);
  });
  /** İlk girişte açılacak sekme: bu sekmede daha önce açılan, yoksa yönetici Ayarlar (oda ayarlarını yapar), diğerleri Sohbet. */
  function chooseFirstTab(host: boolean): void {
    if (tabChosen) return;
    tabChosen = true;
    const remembered = sessionLoad(`tab:${roomId}`);
    if (isTabId(remembered) && !(isShell && remembered === 'queue')) tabs.show(remembered);
    else tabs.show(host && !isShell ? 'settings' : 'chat');
  }
  const settings = createSettingsPanel(app, { name: myName, avatar: myAvatar }, (name, avatar) => {
    myName = name;
    myAvatar = avatar;
    saveIdentity(name, avatar);
    connection.setIdentity(name, avatar);
    send({ t: 'rename', name, avatar });
  });
  // Sesli sohbet (şimdilik sadece sitede; katmanda mikrofon izni film sitesinin adına sorulurdu).
  const voice = createVoice(app, send, () => myId, roomId, isShell);
  const live = createLive(app, send, () => myId, isShell);
  const reactions = createReactions(
    app,
    send,
    () => myId !== null && myId === hostId,
    () => roomSettings.noReactions !== true,
    () => (roomSettings.reactionGap ?? 0) * 1000,
  );
  // Bir pencere (avatar, tema, özet, onay) açıkken kısayollar arkadaki odaya gitmesin: emoji atılıyor, pin kutusu
  // pencerenin arkasında açılıyordu. Pencerenin kendi tuşları (Esc, düğmede Enter) çalışmaya devam eder.
  window.addEventListener(
    'keydown',
    (event) => {
      if (!document.querySelector('.dialog-backdrop, .recap-backdrop') || isTyping(event.target)) return;
      if (isForwardedKey(event.key) || [' ', 'k', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(event.key)) event.stopImmediatePropagation();
    },
    true,
  );
  // Klavye: normal görünümde Enter sohbet kutusuna götürür (tam ekranda fullscreen.ts halleder).
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || document.fullscreenElement || isTyping(event.target)) return;
    if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return;
    event.preventDefault();
    if (shortsOn) {
      $('#shorts-input').focus();
      return;
    }
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
      const loop = roomSettings.loop === true && isShortItem(item);
      if (roomSettings.autoNext !== false || loop) send({ t: 'next', from: itemId, end: true });
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
        // Ayarlar önce: kişi listesi çizilirken kayıt durumu (kaydedilen odalar listesi) doğru bilinsin.
        if (message.settings) roomSettings = message.settings;
        settingsKnown = true;
        voice.welcome(message.voice === true, message.voiceMode ?? 'p2p');
        live.welcome(message.voice === true);
        setMembers(message.members, message.hostId, false);
        chooseFirstTab(message.hostId === message.you);
        waitingIds = message.waiting ?? [];
        renderWaiting();
        queue.set(message.queue);
        chat.set(message.chat);
        lastBy = null;
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
        lastBy = message.by;
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
        renderShorts();
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
        // Bugünün özeti (oturumun başından şimdiye; sadece isteyene gelir). Son kartta "Kaydet".
        const { recap } = message;
        showRecap(recap, { onSave: () => send({ t: 'recap-save' }) });
        break;
      }
      case 'recaps':
        recaps = message.recaps;
        renderRecapHistory($('#recap-history'), recaps);
        break;
      case 'home':
        if (isShell && film !== null) askHome(message.by);
        break;
      case 'reaction': {
        if (!settings.options.showReactions) break;
        // Shorts görünümünde emoji atanın avatarından yükselir (koltuğu yoksa videonun üstünde).
        const shown = shortsOn ? reactions.content(message.emoji, message.sticker) : null;
        if (!shown || !seats.react(message.by, shown)) reactions.show(message.by, message.emoji, message.sticker);
        break;
      }
      case 'chat': {
        const { by, text } = message.message;
        chat.add(message.message);
        // Shorts görünümünde mesaj yazanın avatarından baloncukla çıkar.
        if (shortsOn) seats.say(by, text);
        // Tam ekranda sohbet paneli görünmez; mesaj videonun köşesinde belirir.
        if (fullscreen.isActive()) toasts.show(withAvatar(by), text, by.id === myId);
        break;
      }
      case 'rtc':
        voice.rtc(message);
        break;
      case 'signal':
        voice.signal(message.from, message.data);
        break;
      case 'live-signal':
        live.signal(message.from, message.data);
        break;
      case 'error':
        if (message.code === 'voice_full' || message.code === 'voice_unavailable') {
          voice.error(message.code);
          break;
        }
        if (message.code === 'cam_full') {
          voice.camFull();
          break;
        }
        if (message.code === 'live_busy' || message.code === 'live_full') {
          live.error(message.code);
          break;
        }
        if (message.code === 'kicked') {
          // Oda yöneticisi çıkardı: tekrar bağlanmaya çalışma, bilgilendirme ekranını göster.
          connection.close();
          engine.destroy();
          // Mikrofon da kapansın (ses eklentide çalışıyorsa orada da), yayın da.
          voice.end();
          live.leave();
          // Filmi durdurmak odayı durdururdu (oradaki motor yayardı); sadece bağı kopar.
          if (film) closeCurrent();
          else current?.player.pause();
          $('#kicked').hidden = false;
          break;
        }
        if (message.code === 'not_host' && roomState) {
          // Yönetici modu: yaptığım hareket kabul edilmedi, oynatıcı odanın durumuna döner (film sayfasında hareketi
          // oradaki motor yaptı: durum ona yeniden gider).
          if (film) film.setState(roomState);
          else engine.receive(roomState);
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
    const before = roomState?.item ?? null;
    roomState = state;
    showRate(speedEl, state.rate);
    if (SPEEDS.includes(state.rate)) fullscreen.setRate(state.rate);
    renderNowPlaying();
    const itemId = state.item?.id ?? null;
    if (itemId === currentItemId) {
      engine.receive(state);
      film?.setState(state);
      return;
    }

    // Video değişti: eskisini kapat, yenisini aç.
    currentItemId = itemId;
    renderShorts();
    if (state.item && isShortItem(state.item)) {
      // Shorts'tan Shorts'a: yeni video aşağıdan (daha önce oynayansa yukarıdan) kayarak gelir.
      if (shortsOn && isShortItem(before)) swipe(seenShorts.includes(state.item.id) ? 'down' : 'up');
      if (!seenShorts.includes(state.item.id)) seenShorts.push(state.item.id);
    }
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
      // Kabukta ve film sekmesi bu sayfadaysa video katmanın deliğinde; değilse "Filme git" kartı
      // (kendim açtıysam beklemeden gidilir).
      if (isShell && shellPage !== null && samePage(shellPage, media.url)) startFilm(state.item);
      else showExternal(state.item, media.url, lastBy !== null && lastBy.id === myId);
      reportLayout();
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
    reportLayout();
  }

  // ---- Film (kabuk): film kendi sekmesinde oynar, video bu katmanın deliğinde ----
  /** Film sayfasındaki video (kabukta, odadaki sayfa açık sekmenin sayfasıysa). */
  let film: ShellPlayer | null = null;
  /** Kabukta: film sekmesinin adresi. */
  let shellPage: string | null = null;
  /** Kabukta: film sayfasında delik açıldı mı (sitenin zeminleri ancak o zaman saydam olur). */
  let holeReady = false;
  /** Kabukta: film sayfasında senkronlanacak video bulundu mu (bulunmazsa "Sayfayı göster" önerilir). */
  let videoFound = false;
  /**
   * Oda görünümü üstte ince şeride çekilir, film sayfası olduğu gibi görünür. `page`: "Sayfayı göster" (reklam/pencere
   * kapatmak için); `pick`: elle video seçimi (film sayfasındaki videoların üstünde "Bunu senkronla" düğmeleri).
   */
  let peek: '' | 'page' | 'pick' = '';
  /** Kabukta: film sayfası reklam yönlendirmesiyle başka bir siteye gitti (eklenti söyler): "Filme geri dön". */
  let pageStrayed = false;
  /** Kabukta: film sayfasında reklam oynuyor (eklenti bildirdi; kapanırken işaret kaldırılır). */
  let filmAd = false;
  /** Kabukta: film sayfasında video seçildi (seçim şeridini kapatır). */
  let onPicked: (() => void) | null = null;

  /** Oynatıcı alanındaki videoyu/sayfayı kapatır. */
  function closeCurrent(): void {
    if (current !== null) {
      current.player.destroy();
      current.slot.remove();
      current = null;
    }
    // Film sayfasındaki motor dursun (video orada kendiliğinden durur; odaya "durdur" gitmez).
    if (film) postToExtension({ type: 'embed', request: { type: 'detach' } });
    // Film reklamdayken kapandı: "reklamda" işareti kalmasın.
    if (film && filmAd) send({ t: 'ready', ready: true, ad: false });
    filmAd = false;
    film = null;
    $('.player-wrap').classList.remove('filming');
    renderNowPlaying();
  }

  /** Film sekmesindeki videoyu oynatıcı yapar: komutlar oraya gider, oradaki motorun mesajlarını odaya yollarız. */
  function startFilm(item: QueueItem): void {
    externalEl.hidden = true;
    $('.player-wrap').classList.add('filming');
    const slot = el('div', { class: 'slot film-slot' });
    playerEl.append(slot);
    const player = createShellPlayer({
      onSend: (message) => {
        if (film !== player || !isRelayable(message)) return;
        if (message.t === 'ready') filmAd = message.ad ?? (message.ready ? false : filmAd);
        // Otomatik devam kapalıysa film bitince sıradakine geçilmez: "Sıradakini başlat" kartı.
        if (message.t === 'next' && roomSettings.autoNext === false) {
          if (queue.length > 0) showNextCard($('.player-wrap'), itemTitle(item), mediaUrl(item.media), () => send(message));
          return;
        }
        send(message);
      },
      // Film sayfasında basılan kısayol: sitedeki kısayol dinleyicileri (emoji, Enter, P) aynen işlesin.
      onKey: (key) => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })),
      onFullscreen: () => {
        if (!fullscreen.isActive()) fullscreen.toggle();
      },
      onActivity: () => fullscreen.poke(),
    });
    current = { player, slot };
    film = player;
    if (roomState) player.setState(roomState);
    player.setClock(clock.now() - Date.now(), clock.synced);
    renderNowPlaying();
  }
  // Film çerçevesindeki motor sunucu saatini sitenin ölçümünden alır.
  setInterval(() => film?.setClock(clock.now() - Date.now(), clock.synced), 2000);

  /** Film sayfasında tam ekranda video kontrol çubuğunun üstünde mi dursun (altyazı hiç örtülmez)? Varsayılan: ekranı kaplar. */
  function fitAbove(): boolean {
    return load('opt:fsFit') === 'above';
  }

  /** Kabuktan sitedeki odaya dön (katman kalkar). Filmdeyken diğerlerine de haber gider: onlara "sen de dön" sorulur. */
  function returnToRoom(): void {
    if (film !== null) send({ t: 'home' });
    postToExtension({ type: 'navigate', url: `${location.origin}/r/${roomId}#back` });
  }

  /**
   * Film sayfasının açtığı reklam sekmesi kapatıldı: videonun üstünde küçük not, "Geri aç" (bilerek açılmışsa) ve
   * oturumda bir kez reklam engelleyici önerisi. 8 sn sonra kendisi kalkar.
   */
  let tabNoteTimer = 0;
  function showTabClosed(url: string): void {
    document.getElementById('tab-closed')?.remove();
    const reopen = el('button', { type: 'button', class: 'btn small-btn' }, t('tabClosedReopen'));
    const close = el('button', { type: 'button', class: 'icon-btn', 'aria-label': t('close') }, '✕');
    const text = el('span', {}, `🛡️ ${t('tabClosed', { host: hostOf(url) })}`);
    const card = el('div', { id: 'tab-closed', class: 'home-ask tab-closed', role: 'status' }, text, reopen, close);
    let tipShown = false;
    try {
      tipShown = sessionStorage.getItem('adTipShown') === '1';
      sessionStorage.setItem('adTipShown', '1');
    } catch {
      // Depo kapalı: öneri yine bir kez (bu sayfada) görünür.
    }
    if (!tipShown) {
      const link = el('a', { href: 'https://github.com/uBlockOrigin/uBOL-home', target: '_blank', rel: 'noopener', class: 'small' }, t('tabClosedTip'));
      card.append(link);
    }
    reopen.addEventListener('click', () => {
      postToExtension({ type: 'reopen', url });
      card.remove();
    });
    close.addEventListener('click', () => card.remove());
    $('.player-wrap').append(card);
    clearTimeout(tabNoteTimer);
    tabNoteTimer = window.setTimeout(() => card.remove(), tipShown ? 8000 : 14_000);
  }

  /** Biri filmden odaya döndü: videonun üstünde küçük kart (pencere değil, film durmaz). 20 sn sonra kendisi kalkar. */
  let homeAskTimer = 0;
  const homeAsked = new Map<string, number>();
  function askHome(by: Member): void {
    // Aynı kişinin haberi dakikada bir (sunucu da sınırlar; ikinci sekmeden gelirse yine tek kart).
    const last = homeAsked.get(by.id) ?? 0;
    if (Date.now() - last < 60_000) return;
    homeAsked.set(by.id, Date.now());
    document.getElementById('home-ask')?.remove();
    const yes = el('button', { type: 'button', class: 'btn small-btn primary' }, `🏠 ${t('homeAskYes')}`);
    const no = el('button', { type: 'button', class: 'btn small-btn' }, t('homeAskNo'));
    const card = el('div', { id: 'home-ask', class: 'home-ask', role: 'status' }, el('span', {}, t('homeAsk', { name: withAvatar(by) })), yes, no);
    yes.addEventListener('click', returnToRoom);
    no.addEventListener('click', () => card.remove());
    $('.player-wrap').append(card);
    clearTimeout(homeAskTimer);
    homeAskTimer = window.setTimeout(() => card.remove(), 20_000);
  }

  // ---- Kabuk yerleşimi: katmanın hâli ve videonun deliği eklentiye bildirilir ----
  let sentLayout = '';
  /** "Sayfayı göster" şeridinin yüksekliği (px). */
  const PEEK_HEIGHT = 48;
  let filmSince = 0;
  function reportLayout(): void {
    if (!isShell) return;
    // Film sayfasında oda görünümü hemen gelir: video henüz başlamadıysa eklenti oynatıcının olası yerini
    // deliğe oturtur, kullanıcı ▶'a deliğin içinden basar.
    let layout: ShellLayout;
    if (film === null) {
      layout = { mode: 'open' };
      // Film kapandı (odada başka bir şey açıldı): "Sayfayı göster" de biter.
      if (peek) {
        if (peek === 'pick') postToExtension({ type: 'pick', on: false });
        peek = '';
        document.documentElement.classList.remove('shell-peek');
        document.querySelector<HTMLElement>('.peek-strip')?.setAttribute('hidden', '');
      }
    } else if (peek) layout = { mode: 'bar', height: PEEK_HEIGHT };
    else {
      const wrap = $('.player-wrap');
      const box = wrap.getBoundingClientRect();
      // Tam ekranda kontrol çubuğu (kabukta hep görünür) videonun altını örtüp film sitesinin altyazısını
      // kapatıyordu: delik çubuğun üstünde biter, video ve altyazısı oraya sığar.
      const theater = $('#theater');
      const fake = theater.classList.contains('fake-fs');
      const idle = theater.classList.contains('idle');
      // "Video kontrollerin üstünde" (altyazı hiç örtülmesin): delik çubuğun üstünde biter. Varsayılan: video
      // ekranı kaplar, çubuk üstünde durur ve bekleyince kaybolur (o zaman adacık da olmaz, video tıklanır).
      const bottom = fake && fitAbove() ? box.bottom - $('#fs-controls').offsetHeight : box.bottom;
      const islands: Rect[] = [];
      const floats: Rect[] = [];
      // Adacıklar deliğin içine kırpılır: deliğin dışı zaten katman; dışarı taşan parça evenodd'da iki kez
      // sayılıp katmandan kesilirdi (tam ekranda kontrol çubuğu görünmez oluyordu).
      const add = (list: Rect[], left: number, top: number, right: number, under: number) => {
        const x = Math.max(left, box.left);
        const y = Math.max(top, box.top);
        const w = Math.min(right, box.right) - x;
        const h = Math.min(under, bottom) - y;
        if (w > 1 && h > 1) list.push({ x: Math.floor(x), y: Math.floor(y), w: Math.ceil(w), h: Math.ceil(h) });
      };
      // Deliğin içinde yine görünmesi gerekenler: kartlar, tam ekran kontrolleri, uçuşan emojiler…
      for (const child of wrap.children) {
        if (child.id === 'player' || child.id === 'fs-catcher') continue;
        if (idle && (child.id === 'fs-controls' || child.id === 'toast-handle')) continue;
        if (child.id === 'reactions-layer') {
          // Uçuşan emoji yükselirken de görünsün: bütün yolu (yukarı ~240 px, yana biraz) tek adacık.
          for (const node of child.children) {
            const r = node.getBoundingClientRect();
            add(floats, r.left - 45, r.top - 270, r.right + 45, r.bottom + 30);
          }
          continue;
        }
        const r = child.getBoundingClientRect();
        add(islands, r.left, r.top, r.right, r.bottom);
      }
      // Emojilerin yolları tek alanda birleşir (üst üste binen adacıklar çift-tek kuralında birbirini silerdi);
      // sonra bütün adacıklar çakışmasız hâle getirilir. Sınır 12.
      islands.push(...mergeRects(floats));
      const merged = mergeRects(islands);
      islands.length = 0;
      islands.push(...merged);
      const hole = { x: Math.round(box.left), y: Math.round(box.top), w: Math.round(box.width), h: Math.round(Math.max(0, bottom - box.top)) };
      // Sitenin zeminleri deliği boyamasın (styles.css "shell-film"): yollar ekran ve sahne kartına göre.
      const root = document.documentElement;
      root.style.setProperty('--hole-cut', holePath(innerWidth, innerHeight, hole, []));
      const card = $('#theater').getBoundingClientRect();
      root.style.setProperty('--theater-cut', holePath(card.width, card.height, { ...hole, x: hole.x - card.left, y: hole.y - card.top }, []));
      // Sitenin bir penceresi açıksa (avatar, tema, özet, onay) delik tamamen kapanır: pencere videonun önünde görünsün.
      const modal = document.querySelector('.dialog-backdrop, .recap-backdrop, dialog[open], .profile-pop:not([hidden])') !== null;
      layout = { mode: 'full', hole, islands: modal ? [hole] : islands.slice(0, 12) };
    }
    // Deliğin içi (sitenin zeminleri) ancak eklenti "delik açıldı" deyince saydam olur: film sayfası o an gizlenmiş olur.
    if (layout.mode !== 'full') holeReady = false;
    document.documentElement.classList.toggle('shell-film', layout.mode === 'full' && holeReady);
    const json = JSON.stringify(layout);
    if (json === sentLayout) return;
    sentLayout = json;
    postToExtension({ type: 'layout', layout });
  }

  /**
   * Odada bir web sayfası açık: video o sayfada, herkesin kendi sekmesinde oynar.
   * Kimseyi habersiz yönlendirmeyiz; ne olacağını anlatıp tek tuşla göndeririz.
   * Eklenti kuruluysa sekmeyi o götürür (oda orada devam eder); değilse kurulum
   * adımları gösterilir.
   */
  function showExternal(item: QueueItem, url: string, auto: boolean): void {
    const ext = hasExtension();
    const shellOk = extensionSupportsShell();
    $('#external-title').textContent = itemTitle(item);
    $('#external-host').textContent = hostOf(url);
    renderWatching();
    $('#external-ext').hidden = !ext;
    $('#external-noext').hidden = ext;
    // Eski sürüm eklenti film sayfasında odayı açamaz: güncellemesi gerekir.
    const note = $('#external-note');
    note.hidden = shellOk;
    note.textContent = shellOk ? '' : t('extensionOutdated');
    $<HTMLAnchorElement>('#external-alone').href = url;
    const go = $<HTMLButtonElement>('#external-go');
    // Film sayfası (reklam yönlendirmesiyle) başka bir siteye gitti: oda hâlâ aynı filmde.
    const strayed = isShell && pageStrayed;
    $('#external-label').hidden = strayed;
    $('#external-stray').hidden = !strayed;
    go.hidden = !shellOk;
    go.disabled = false;
    go.textContent = t(strayed ? 'strayBack' : 'externalGoJoin');
    go.onclick = () => {
      go.disabled = true;
      go.textContent = t('externalGoing');
      // Sekme film sayfasına gider; eklenti orada odanın görünümünü videonun etrafına kurar.
      if (isShell) postToExtension({ type: 'navigate', url });
      else postToExtension({ type: 'go', roomId, url });
    };
    // Kendim açtıysam beklemeden gideriz; başkası açtıysa herkes "Filme git" ile kendisi gider.
    if (auto && shellOk) go.click();
  }

  function hostOf(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  // Eklentiden gelenler. Ana sitede: film sayfasına gidilemediyse (eklenti eski/kapalı) düğme geri gelsin.
  // Kabukta: film sekmesinin adresi, orada video bulundu mu, tam ekrandan çıkıldı mı.
  onExtensionMessage((message) => {
    if (message.type === 'going' && !message.ok) {
      const go = $<HTMLButtonElement>('#external-go');
      go.disabled = false;
      go.textContent = t('externalGoJoin');
      showError(() => t('extensionOutdated'));
    } else if (message.type === 'page' && isShell) {
      // Sadece "odadaki sayfa bu mu" sonucu değiştiyse yeniden kur: film sitesi oynarken adresine sorgu/zaman
      // eklese (replaceState) film kapanıp video durmasın.
      const item = roomState?.item;
      const was = shellPage !== null && item?.media.kind === 'page' && samePage(shellPage, item.media.url);
      const now = item?.media.kind === 'page' && samePage(message.url, item.media.url);
      const changed = shellPage === null || (was !== now && !(film !== null && samePath(message.url, shellPage)));
      shellPage = message.url;
      pageStrayed = message.strayed === true;
      // Odadaki sayfa bu mu? Yeniden bak: film başlar ya da "Filme git" kartı çıkar.
      if (changed && roomState?.item?.media.kind === 'page') {
        currentItemId = null;
        void applyState(roomState);
      }
    } else if (message.type === 'hole' && isShell) {
      holeReady = true;
      if (sentLayout.startsWith('{"mode":"full"')) document.documentElement.classList.add('shell-film');
    } else if (message.type === 'video' && isShell) {
      videoFound = message.found;
    } else if (message.type === 'caps' && isShell) {
      voice.caps(message.voice === true, message.cam === true);
    } else if (message.type === 'voice' && isShell) {
      voice.extMessage(message.msg);
    } else if (message.type === 'tab-closed' && isShell) {
      showTabClosed(message.url);
    } else if (message.type === 'picked' && isShell) {
      // Kullanıcı film sayfasında videoyu seçti: oda görünümüne dönülür, video deliğe oturur.
      onPicked?.();
    } else if (message.type === 'fullscreen' && isShell) {
      fullscreen.syncShell(message.on);
    }
  });
  if (isShell) {
    postToExtension({ type: 'shell-ready' });
    // Yerleşim değişince (pencere, tam ekran, kartlar) deliği yeniden bildir.
    const wrap = $('.player-wrap');
    new ResizeObserver(() => reportLayout()).observe(wrap);
    // Tam ekran kontrolleri bekleyince kaybolur (theater.idle): adacıkları da kalksın, video tıklanabilsin.
    new MutationObserver(() => reportLayout()).observe($('#theater'), { attributes: true, attributeFilter: ['class'] });
    // Sesli sohbette biri konuşurken film sesi kısılsın (varsayılan açık). Susunca 1 sn sonra eski hâline döner.
    const duckBox = $<HTMLInputElement>('#opt-duck');
    duckBox.checked = load('opt:duck') !== '0';
    duckBox.addEventListener('change', () => save('opt:duck', duckBox.checked ? '1' : '0'));
    let ducking = false;
    let quietSince = 0;
    setInterval(() => {
      const talk = film !== null && duckBox.checked && voice.speaking();
      if (talk) quietSince = 0;
      else quietSince ||= Date.now();
      const want = talk || (ducking && Date.now() - quietSince < 1000);
      if (want === ducking) return;
      ducking = want;
      postToExtension({ type: 'embed', request: { type: 'control', control: { action: 'duck', on: want } } });
    }, 250);
    // Film sayfasının açtığı reklam sekmeleri kapatılsın mı (eklenti ayarı okur; varsayılan açık).
    const closeAds = $<HTMLInputElement>('#opt-closeads');
    closeAds.checked = load('opt:closeAds') !== '0';
    closeAds.addEventListener('change', () => save('opt:closeAds', closeAds.checked ? '1' : '0'));
    // Sitede bilerek yeni sekmede açılan bağlantılar (sohbetteki link, eklenti sayfası) reklam sayılıp kapatılmasın.
    document.addEventListener(
      'click',
      (event) => {
        const link = (event.target as Element | null)?.closest?.('a[href]');
        if (link instanceof HTMLAnchorElement && (link.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey)) {
          postToExtension({ type: 'open-ok' });
        }
      },
      true,
    );
    document.addEventListener('auxclick', (event) => {
      if ((event.target as Element | null)?.closest?.('a[href]')) postToExtension({ type: 'open-ok' });
    }, true);
    const fit = $<HTMLSelectElement>('#opt-fsfit');
    fit.value = fitAbove() ? 'above' : 'cover';
    fit.addEventListener('change', () => {
      save('opt:fsFit', fit.value === 'above' ? 'above' : 'cover');
      fullscreen.poke();
      reportLayout();
    });
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        reportLayout();
      });
    }).observe(wrap, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class', 'style'] });
    addEventListener('resize', reportLayout);
    setInterval(reportLayout, 1000);
    // Odaya dön: önce sorulur; evet → sekme sitedeki odaya gider (katman kalkar, site kendi sayfasında devam eder).
    const goHome = async () => {
      const yes = await confirmDialog({ icon: '🏠', title: t('shellBackTitle'), text: t('shellBackText'), yes: t('shellBackYes'), no: t('shellBackNo') });
      if (yes) returnToRoom();
    };
    // Sol üstteki logo da odaya dönüş (ana sayfaya değil).
    document.querySelector('.brand')?.addEventListener('click', (event) => {
      event.preventDefault();
      void goHome();
    });
    // Sıra burada yok (sıradakini seçmek için odaya dönülür): açık kalmışsa sohbete geç.
    if (tabs.active === 'queue') tabs.show('chat');
    // Sitenin pencereleri (avatar, tema, özet, onay) açılınca da bildirilsin: videonun arkasında kalmasınlar.
    new MutationObserver(() => reportLayout()).observe(document.body, { childList: true });
    const homeButton = el('button', { type: 'button', class: 'nav-link shell-home' }, `🏠 ${t('shellBack')}`);
    homeButton.addEventListener('click', goHome);
    document.querySelector('.topbar-right')?.prepend(homeButton);
    // 👁 Sayfayı göster: geçiş reklamı, açılır pencere ya da videonun önünü kapatan bir şey varsa film sayfası olduğu
    // gibi görünür (üstte ince şerit kalır), kullanıcı kapatır, "Oda görünümü" ile geri gelir.
    const peekButton = el('button', { type: 'button', class: 'nav-link shell-peek' }, `👁 ${t('peek')}`);
    const peekBack = el('button', { type: 'button', class: 'btn small-btn primary' }, t('peekBack'));
    const peekText = el('span', { class: 'peek-text' }, t('peekStrip'));
    const peekStrip = el('div', { class: 'peek-strip' }, peekText, peekBack);
    peekStrip.hidden = true;
    document.body.append(peekStrip);
    // 🎯 Video seç: otomatik seçim yanlış videoyu (fragman, önizleme, reklam) tuttuysa film sayfası açılır, her videonun
    // üstünde "Bunu senkronla" düğmesi çıkar; seçilince oda görünümüne dönülür.
    const pickButton = el('button', { type: 'button', class: 'nav-link shell-pick' }, `🎯 ${t('pick')}`);
    const setPeek = (mode: typeof peek) => {
      if (peek === 'pick' && mode !== 'pick') postToExtension({ type: 'pick', on: false });
      peek = mode;
      peekStrip.hidden = !mode;
      peekText.textContent = t(mode === 'pick' ? 'pickStrip' : 'peekStrip');
      peekBack.textContent = t(mode === 'pick' ? 'pickCancel' : 'peekBack');
      document.documentElement.classList.toggle('shell-peek', !!mode);
      reportLayout();
      if (mode === 'pick') postToExtension({ type: 'pick', on: true });
    };
    onPicked = () => {
      if (peek !== 'pick') return;
      setPeek('');
      flashHint(pickButton, t('picked'));
    };
    peekButton.addEventListener('click', () => setPeek('page'));
    pickButton.addEventListener('click', () => setPeek('pick'));
    peekBack.addEventListener('click', () => setPeek(''));
    // Esc seçimden/sayfa görünümünden de çıkar.
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && peek) setPeek('');
    });
    homeButton.after(peekButton, pickButton);
    const labelPeek = () => {
      peekButton.textContent = `👁 ${t('peek')}`;
      peekButton.title = t('peekTitle');
      pickButton.textContent = `🎯 ${t('pick')}`;
      pickButton.title = t('pickTitle');
      peekBack.textContent = t(peek === 'pick' ? 'pickCancel' : 'peekBack');
      peekText.textContent = t(peek === 'pick' ? 'pickStrip' : 'peekStrip');
    };
    labelPeek();
    window.addEventListener('langchange', () => {
      homeButton.textContent = `🏠 ${t('shellBack')}`;
      labelPeek();
    });
    // Film açıldı ama 10 sn'dir video bulunamadı: büyük ihtimalle önünde bir reklam/pencere var, düğmeyi öner.
    let hinted = false;
    setInterval(() => {
      // Video seçimi sadece film açıkken anlamlı.
      pickButton.hidden = film === null;
      if (film === null) {
        filmSince = 0;
        return;
      }
      filmSince ||= Date.now();
      if (!hinted && !peek && !videoFound && Date.now() - filmSince > 10_000) {
        hinted = true;
        flashHint(peekButton, t('peekHint'), 7000);
      }
    }, 1000);
  }

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
  }

  function skip(): void {
    const id = roomState?.item?.id;
    if (id) send({ t: 'next', from: id });
  }
  skipEl.addEventListener('click', skip);

  // ---- Shorts görünümü ("Oturma odası"): dikey video ortada, arkadaşlar iki yanında, altta mesaj + emoji.
  // Sıra, sohbet geçmişi ve ayarlar oda görünümünde kalır. ↑/↓ (▲▼, fare tekerleği) önceki/sonraki Shorts. ----
  const roomEl = $('.room');
  const seats = createSeats($('#seats-l'), $('#seats-r'));
  /** Shorts açıkken oda görünümünü seçtim (bu sekmede hatırlanır; "Shorts görünümü" ile geri dönülür). */
  let shortsOff = sessionLoad(`shortsOff:${roomId}`) === '1';
  /** Shorts görünümü açık mı (geçiş animasyonu sürerken bile yeni değer). */
  let shortsOn = false;
  /** Bu sekmede oynayan Shorts'lar: yeni video bunlardan biriyse (↑ ile dönüldü) yukarıdan kayarak gelir. */
  const seenShorts: string[] = [];

  function isShortItem(item: QueueItem | null | undefined): boolean {
    return item?.media.kind === 'youtube' && item.media.short === true;
  }

  function renderShorts(): void {
    const short = isShortItem(roomState?.item);
    const want = short && !shortsOff;
    $('#shorts-enter').hidden = !short || want;
    const left = queue.length;
    const leftEl = $('#shorts-left');
    leftEl.textContent = left > 0 ? String(left) : '';
    leftEl.title = t('shorts.left', { n: left });
    const loop = $('#shorts-loop');
    loop.setAttribute('aria-pressed', String(roomSettings.loop === true));
    loop.title = amHost() ? t('shorts.loopHint') : t('shorts.loopHost');
    if (want === shortsOn) return;
    shortsOn = want;
    // Sınıflar o anki değere göre: art arda iki değişiklikte geç kalan geçiş eski hâli geri getirmesin.
    const apply = () => {
      roomEl.classList.toggle('shorts', shortsOn);
      document.documentElement.classList.toggle('shorts-view', shortsOn);
    };
    // Görünümler arasında yumuşak geçiş (tarayıcı destekliyorsa): video yerinden süzülerek büyür/küçülür.
    // Sayfa çizilmiyorsa (arka plandaki sekme) geçiş hiç başlamayabilir: en geç 0,6 sn'de yine değişir.
    if (!('startViewTransition' in document) || document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      apply();
      return;
    }
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      apply();
    };
    const transition = document.startViewTransition(run);
    // Atlanan geçiş söz (promise) hatası verir; bizim için önemsiz.
    for (const step of [transition.ready, transition.finished, transition.updateCallbackDone]) step.catch(() => {});
    setTimeout(() => {
      if (done) return;
      transition.skipTransition();
      run();
    }, 600);
  }

  function swipe(direction: 'up' | 'down'): void {
    const wrap = $('.player-wrap');
    wrap.classList.remove('swipe-up', 'swipe-down');
    void wrap.offsetWidth; // animasyon baştan başlasın
    wrap.classList.add(`swipe-${direction}`);
  }
  $('.player-wrap').addEventListener('animationend', (event) => {
    if (event.target === event.currentTarget) (event.currentTarget as HTMLElement).classList.remove('swipe-up', 'swipe-down');
  });

  function shortsNext(anchor: HTMLElement): void {
    const id = roomState?.item?.id;
    if (!id) return;
    // Sıra boşken "sıradaki" videoyu durdururdu: geçilecek bir şey yok, kısa not.
    if (queue.length === 0) return flashHint(anchor, t('shorts.noNext'));
    send({ t: 'next', from: id });
  }

  function shortsPrev(anchor: HTMLElement): void {
    const id = roomState?.item?.id;
    if (!id) return;
    if (roomSettings.hostOnly && !amHost()) return flashHint(anchor, t('hostLock'));
    send({ t: 'prev', from: id });
    // Sunucu bir önceki videoyu hatırlamıyorsa hiçbir şey olmaz: kısa not.
    setTimeout(() => {
      if (shortsOn && roomState?.item?.id === id) flashHint(anchor, t('shorts.noPrev'));
    }, 1500);
  }

  $('#shorts-next').addEventListener('click', (event) => shortsNext(event.currentTarget as HTMLElement));
  $('#shorts-prev').addEventListener('click', (event) => shortsPrev(event.currentTarget as HTMLElement));
  document.addEventListener('keydown', (event) => {
    if (!shortsOn || event.repeat || event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
    if (event.key === 'ArrowDown' || event.key === 'PageDown') {
      event.preventDefault();
      shortsNext($('#shorts-next'));
    } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault();
      shortsPrev($('#shorts-prev'));
    }
  });
  // Fare tekerleği (videonun dışında; YouTube çerçevesi tekerleği kendisi alır): bir tık bir video.
  let wheelAt = 0;
  $('.stage').addEventListener(
    'wheel',
    (event) => {
      if (!shortsOn || Math.abs(event.deltaY) < 20 || (event.target as Element).closest('.reaction-bar, .shorts-chat')) return;
      event.preventDefault();
      if (Date.now() - wheelAt < 900) return;
      wheelAt = Date.now();
      if (event.deltaY > 0) shortsNext($('#shorts-next'));
      else shortsPrev($('#shorts-prev'));
    },
    { passive: false },
  );
  $('#shorts-loop').addEventListener('click', (event) => {
    if (!amHost()) return flashHint(event.currentTarget as HTMLElement, t('shorts.loopHost'));
    send({ t: 'settings', loop: roomSettings.loop !== true });
  });
  const setShortsOff = (off: boolean) => {
    shortsOff = off;
    sessionSave(`shortsOff:${roomId}`, off ? '1' : '');
    renderShorts();
  };
  $('#shorts-exit').addEventListener('click', () => setShortsOff(true));
  $('#shorts-enter').addEventListener('click', () => setShortsOff(false));
  $<HTMLFormElement>('#shorts-chat').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = $<HTMLInputElement>('#shorts-input');
    const text = input.value.trim();
    if (!text) return;
    send({ t: 'chat', text });
    input.value = '';
  });

  autoplayEl.querySelector('button')!.addEventListener('click', () => {
    autoplayEl.hidden = true;
    engine.resume();
  });

  // Filmde motor film çerçevesinde çalışır: hız isteği oraya gider.
  // YouTube 2x'ten hızlı oynatmıyor: orada en fazla 2x istenir.
  const requestRate = (wanted: number) => {
    const rate = roomState?.item?.media.kind === 'youtube' ? Math.min(wanted, YOUTUBE_MAX_RATE) : wanted;
    if (film) film.control({ action: 'rate', rate });
    else engine.requestRate(rate);
  };
  speedEl.addEventListener('change', () => requestRate(Number(speedEl.value)));
  // İnce hız ayarı: her basış ±0.05 (hazır seçeneklerin dışındaki hız listede "özel" olarak görünür).
  $('#speed-down').addEventListener('click', () => requestRate(stepRate(roomState?.rate ?? 1, -1)));
  $('#speed-up').addEventListener('click', () => requestRate(stepRate(roomState?.rate ?? 1, 1)));

  // ---- Tam ekran: sadece video kalır, fare oynayınca kontroller ve hızlı mesaj belirir. ----
  const fullscreen = createFullscreen({
    shell: isShell,
    keepControls: fitAbove,
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
  $('#sync-test').addEventListener('click', (event) => {
    // Tek başınayken: senkronlanacak kimse yok, kısa uyarı.
    if (isAlone()) return flashHint(event.currentTarget as HTMLElement, t('syncAlone'));
    send({ t: 'load', media: { kind: 'test' } });
  });
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
  fullscreenEl.hidden = !document.fullscreenEnabled && !isShell;
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
    if (document.visibilityState === 'visible' && wentToInstall && !hasExtension()) {
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
    if (media.kind === 'page' && !hasExtension()) {
      pendingAdd = add;
      extDialog.showModal();
      return;
    }
    // Şimdi açılan film sayfası: sekme o siteye gidecek, önce sor.
    if (media.kind === 'page' && mode === 'load') {
      void confirmDialog({ icon: '🎬', title: t('goFilmTitle'), text: t('goFilmText'), yes: t('goFilmYes') }).then((yes) => {
        if (yes) add();
      });
      return;
    }
    add();
  });

  // ---- Herkesi bana eşitle: kendi konumumu odaya yayar (biri kaydıysa tek tıkla düzelir). ----
  const syncAllEl = $<HTMLButtonElement>('#sync-all');
  syncAllEl.addEventListener('click', () => {
    if (isAlone()) return flashHint(syncAllEl, t('syncAlone'));
    if (film) film.control({ action: 'sync-all' });
    else engine.syncEveryoneToMe();
    syncAllEl.disabled = true;
    setTimeout(() => (syncAllEl.disabled = false), 1500);
  });

  /** Tek kişiyken senkron düğmeleri soluk; basınca "tek başınasın" uyarısı çıkar, üstüne gelince nedeni yazar. */
  function renderAlone(): void {
    const alone = isAlone();
    const all = $<HTMLButtonElement>('#sync-all');
    const test = $<HTMLButtonElement>('#sync-test');
    all.classList.toggle('alone', alone);
    test.classList.toggle('alone', alone);
    const hint = alone ? t('syncAlone') : t('syncAllHint');
    all.title = hint;
    all.setAttribute('aria-label', hint);
    test.title = alone ? t('syncAlone') : '';
  }

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
    voice.relabel();
    live.relabel();
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

  /** Odada benden başka kimse yok: senkron düğmeleri (herkesi eşitle, senkron testi) 2+ kişiyle anlamlı. */
  function isAlone(): boolean {
    return members.length < 2;
  }

  function renderMembers(): void {
    people.set(members, hostId, myId);
    seats.setMembers(members, myId);
    voice.members(members);
    live.members(members);
    $('#people-count').textContent = String(members.length);
    renderAlone();
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
    // Ana sayfadaki "Kaydedilen odalar" listesi: sadece sunucudan ayarlar geldikten sonra (önce varsayılan ayarla
    // "kayıtlı değil" sanılıp liste siliniyordu; bağlantı hiç kurulmazsa oda listeden kayboluyordu) ve sadece değişince
    // (her kişi değişiminde depoya yazıp eklentiye yolluyordu).
    if (!settingsKnown) return;
    const entry = saved ? `${name}|${host}` : '';
    if (entry === savedEntry) return;
    savedEntry = entry;
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
    $<HTMLSelectElement>('#opt-reactiongap').value = String(roomSettings.reactionGap ?? 0);
    app.classList.toggle('no-reactions', roomSettings.noReactions === true);
    for (const id of ['#opt-hostonly', '#opt-lockqueue', '#opt-noreactions', '#opt-reactiongap', '#opt-start', '#opt-start-set', '#opt-start-clear']) {
      $<HTMLInputElement>(id).disabled = !host;
    }
    $('#host-lock').hidden = host || !roomSettings.hostOnly;
    queue.render();
    renderSchedule();
    renderShorts();
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
  $<HTMLSelectElement>('#opt-reactiongap').addEventListener('change', (event) => {
    const gap = Number((event.target as HTMLSelectElement).value);
    if ((REACTION_GAPS as readonly number[]).includes(gap)) send({ t: 'settings', reactionGap: gap as ReactionGap });
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

  // Sayfadan çıkarken (film sayfasına gidiş, odaya dönüş) bağlantıyı hemen kapat: tarayıcı sayfayı
  // önbellekte açık tutarsa kişi odada bir süre iki kez görünüyordu. Geri gelinirse sayfa yenilenir.
  addEventListener('pagehide', () => {
    voice.leave();
    live.leave();
    connection.close();
  });

  // ---- Bağlantıyı yenile (sağ üst ⟳): kopma ya da takılma için, sayfayı yenilemeden. ----
  reconnectEl.onclick = () => {
    if (!$('#kicked').hidden) return;
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
  }

  window.addEventListener('langchange', () => {
    renderStatus();
    renderMembers();
    renderLabels();
    queue.render();
    chat.render();
    reactions.relabel();
    seats.render();
    renderShorts();
    showError(errorText);
    // Davet düğmesinin yazısı ("Kopyala" / telefonda "Paylaş") kendi dinleyicisinde yenilenir.
  });

  renderStatus();
  renderMembers();
  renderLabels();
  queue.set([]);
  chat.set([]);

  // Sadece geliştirme modunda: tarayıcı konsolundan senkronu incelemek için.
  if (import.meta.env.DEV) {
    Object.assign(window, { __swm: { engine, clock, player: () => current?.player ?? null, film: () => film } });
  }
}
