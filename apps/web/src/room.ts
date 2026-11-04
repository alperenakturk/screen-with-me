import { friendlyRoomName } from '@swm/shared/room-id';
import { createRoomMoreMenu, roomMoreItems } from './ui/room-more.ts';
import { ServerClock } from '@swm/shared/clock';
import { RoomConnection, type ConnectionStatus } from '@swm/shared/connection';
import { isForwardedKey, isRelayable } from '@swm/shared/embed';
import { isTikTokShortLink, parseMediaInput, parseMediaList, samePage } from '@swm/shared/media';
import { holePath, mergeRects, type Rect, type ShellLayout } from '@swm/shared/shell';
import type { PlayerAdapter } from '@swm/shared/player';
import {
  avatarText,
  SYSTEM_MEMBER_ID,
  cleanName,
  cleanRoomName,
  expectedPosition,
  stepRate,
  maxRateFor,
  isValidMedia,
  isAvatar,
  randomAvatar,
  REACTION_GAPS,
  personOf,
  type Avatar,
  type ReactionGap,
  type ClientMessage,
  type KnockEntry,
  type Member,
  type Media,
  type PlaybackState,
  type QueueItem,
  type RoomSettings,
  type ServerMessage,
} from '@swm/shared/protocol';
import { SyncEngine } from '@swm/shared/sync-engine';
import { JoinFilter, personKey } from '@swm/shared/sound-policy';
import { channelParam, isPoolRegionChoice, parseChannelInput, POOL_KINDS, POOL_REGIONS, type PoolRegionChoice } from '@swm/shared/youtube-search';
import { canShareSheet, hasMouse, isPhoneLayout, isTouch, onTabletUpright } from './device.ts';
import { el } from './dom.ts';
import { helpHref, lang, t, translate, type I18nKey } from './i18n.ts';
import { formatTime, itemTitle, mediaUrl, rememberTitle } from './media-info.ts';
import { createShellPlayer, type ShellPlayer } from './players/shell.ts';
import { createHtml5Player } from './players/html5.ts';
import { createTestPlayer } from './players/test.ts';
import { createTikTokPlayer } from './players/tiktok.ts';
import { createVimeoPlayer } from './players/vimeo.ts';
import { createYouTubePlayer } from './players/youtube.ts';
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
  roomIdentity,
  saveRoomIdentity,
  saveLastRoom,
  forgetLastRoom,
  lastRoom,
  sessionLoad,
  sessionSave,
} from './storage.ts';
import { avatarNode, openAvatarDialog } from './ui/avatar.ts';
import { autoInviteOn } from './ui/invite-option.ts';
import { listenForShortcutsKey, openShortcuts } from './ui/shortcuts.ts';
import { createChatPanel } from './ui/chat.ts';
import { createQueuePanel } from './ui/queue.ts';
import { createFullscreen } from './ui/fullscreen.ts';
import { createPeoplePanel } from './ui/people.ts';
import { createReactions, isTyping } from './ui/reactions.ts';
import { createSeats } from './ui/seats.ts';
import { createShortsFeed } from './ui/shorts-feed.ts';
import { createPins } from './ui/pins.ts';
import { showNextCard } from './ui/end-card.ts';
import { confirmDialog } from './ui/confirm.ts';
import { openExternalLink } from './ui/links.ts';
import { createSearch } from './ui/search.ts';
import { createShortsSearch } from './ui/shorts-search.ts';
import type { Recap } from '@swm/shared/recap';
import { forgetSaved, rememberSaved } from './saved-rooms.ts';
import { createSettingsPanel } from './ui/settings.ts';
import { createTabs, isTabId } from './ui/tabs.ts';
import { createSettingsDialog } from './ui/settings-dialog.ts';
import { watchFilmEnds } from './games/film-end.ts';
import { createGameStage } from './games/stage.ts';
import type { SoloRoom } from '@swm/shared/games/catalog';
import { createLive } from './ui/live.ts';
import { createVoice } from './ui/voice.ts';
import { flashHint } from './ui/hint.ts';
import { createToasts } from './ui/toasts.ts';
import { playSound, setFilmPlaying } from './sound.ts';
import { clearTvLink, tvLab, tvLink } from './tv-lab.ts';
import { setDebugRoom } from './debug-lab.ts';
import { icon } from './ui/icons.ts';
import type { createTvRemote } from './ui/tv-remote.ts';
import { createPhoneRoom } from './ui/phone-room.ts';
import type { createTvRoom } from './ui/tv-room.ts';
/** "Send feedback" (card 9): its own lazy chunk (texts, styles), so the room page stays within its size budget. */
function openFeedbackDialog(opener: HTMLElement | null): void {
  void import('./ui/feedback.ts').then(({ openFeedback }) => openFeedback(opener));
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];

/** The invite window and its QR encoder load when it is first opened (phone speed, 0.9.93.6). */
function openInvite(url: string, door?: { on: boolean; set: (on: boolean) => void }): void {
  void import('./ui/invite.ts').then(({ openInviteDialog }) => openInviteDialog(url, door));
}

/**
 * The TV version (hidden behind the lab switch since 0.9.91.14) loads only on a device with that switch: the TV's room
 * and the phone remote, with their stylesheet. Loaded before the room starts, so no message is missed.
 */
let tvModules: { room: typeof import('./ui/tv-room.ts'); remote: typeof import('./ui/tv-remote.ts') } | null = null;
async function loadTv(): Promise<void> {
  const [room, remote] = await Promise.all([import('./ui/tv-room.ts'), import('./ui/tv-remote.ts')]);
  tvModules = { room, remote };
}

/**
 * Odaya giriş iki adımlıdır: önce isim, sonra avatar. İkisi de tarayıcıda
 * saklanır ve bir dahakine hazır gelir. "Odaya gir" tıklaması aynı zamanda
 * tarayıcının sesli oynatma izni için gereken etkileşimdir.
 */
export function renderRoom(app: HTMLElement, roomId: string, waited = false): void {
  if (tvLab() && !tvModules) {
    void loadTv().then(() => renderRoom(app, roomId, waited));
    return;
  }
  // TV version: this browser is a TV paired by a phone (`/tv`): it joins as that person, no name step.
  if (new URLSearchParams(location.search).get('tv') === '1' && tvLab()) {
    const link = tvLink();
    if (!link || link.room !== roomId) {
      location.replace('/tv');
      return;
    }
    startRoom(app, roomId, 'TV', 'wizard', { resumed: true, tv: link.token });
    return;
  }
  // Film sayfasının üstündeki katman (kabuk): kişi siteden geliyor, isim/avatar sormadan girer.
  // (İsim hiç yoksa katman tam açılır, isim adımı görünsün.)
  // My name and avatar in this room (rooms are independent, 0.9.88); a room I'm new to starts from the default.
  const mine = roomIdentity(roomId);
  if (isShell) {
    const name = cleanName(mine?.name ?? load('name'));
    const avatar = mine?.avatar ?? load('avatar');
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
  const savedName = cleanName(mine?.name ?? load('name'));
  const savedAvatar = mine?.avatar ?? load('avatar');
  if (savedName && isAvatar(savedAvatar) && (fromExtension || waited || sessionLoad(`in:${roomId}`) === '1')) {
    startRoom(app, roomId, savedName, savedAvatar, { resumed: true });
    return;
  }
  // İsim eklentide seçilmiş ama siteye henüz geçmemiş olabilir (site-bridge birazdan yazar).
  if (fromExtension && !waited) {
    setTimeout(() => renderRoom(app, roomId, true), 800);
    return;
  }

  // One screen (0.9.91.20, owner: "first-time path", PDF item 1): name, the avatar next to it (a tap changes it) and
  // "Odaya gir". Above it, who is waiting and what is on, so an invited friend knows they are in the right place.
  app.innerHTML = `
    <section class="card join-card">
      <p class="muted step-label" id="room-code"></p>
      <div id="join-invite" class="join-invite" hidden>
        <p id="join-waiting" class="join-waiting"></p>
        <p id="join-playing" class="muted small join-playing" hidden></p>
      </div>
      <form id="name-form" class="stack">
        <label for="name" class="step-title" data-i18n="yourName"></label>
        <div class="join-row">
          <button type="button" id="join-avatar" class="join-avatar" data-i18n-title="changeAvatar"></button>
          <input id="name" maxlength="32" required autocomplete="nickname" data-i18n-placeholder="namePlaceholder" />
        </div>
        <button class="btn primary big" data-i18n="enterRoom"></button>
        <p class="muted small" data-i18n="joinHint"></p>
        <p class="muted small join-privacy"><a href="/privacy.html" target="_blank" rel="noopener" id="join-privacy" data-privacy-link>🔒 <span data-i18n="privacy"></span></a></p>
      </form>
    </section>
  `;
  translate(app);

  const roomCode = app.querySelector<HTMLElement>('#room-code')!;
  let roomName: string | null = null;
  let info: { people?: string[]; count?: number; playing?: string | null } | null = null;
  const renderCode = () => {
    roomCode.textContent = roomName ? `💾 ${roomName}` : friendlyRoomName(roomId);
    const people = (info?.people ?? []).filter(Boolean);
    const count = info?.count ?? 0;
    app.querySelector<HTMLElement>('#join-invite')!.hidden = count === 0;
    if (count > 0 && people.length) {
      const others = count - 1;
      app.querySelector('#join-waiting')!.textContent = others > 0 ? t('joinWaitingMany', { name: people[0]!, n: others }) : t('joinWaitingOne', { name: people[0]! });
    }
    const playing = app.querySelector<HTMLElement>('#join-playing')!;
    playing.hidden = !info?.playing;
    playing.textContent = info?.playing ? t('joinPlaying', { title: info.playing }) : '';
  };
  renderCode();
  // Saved room's name, who is inside and what is on (the room answers without a connection).
  void fetch(`/api/rooms/${roomId}/info`)
    .then((r) => (r.ok ? (r.json() as Promise<{ saved: boolean; name: string | null; people?: string[]; count?: number; playing?: string | null }>) : null))
    .then((answer) => {
      if (!answer) return;
      if (answer.saved && answer.name) roomName = answer.name;
      info = answer;
      renderCode();
    })
    .catch(() => {});
  window.addEventListener('langchange', renderCode);

  const input = app.querySelector<HTMLInputElement>('#name')!;
  input.value = mine?.name ?? load('name') ?? '';
  input.focus();
  input.select();

  let avatar: Avatar = isAvatar(savedAvatar) ? savedAvatar : randomAvatar();
  const avatarButton = app.querySelector<HTMLButtonElement>('#join-avatar')!;
  const renderAvatar = () => avatarButton.replaceChildren(avatarNode(avatar, 'avatar-glyph'), el('span', { class: 'join-avatar-edit', 'aria-hidden': 'true' }, '✎'));
  renderAvatar();
  avatarButton.addEventListener('click', () =>
    openAvatarDialog(
      () => avatar,
      (picked) => {
        avatar = picked;
        renderAvatar();
        input.focus();
      },
    ),
  );

  app.querySelector('#name-form')!.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = cleanName(input.value);
    if (name === null) return;
    if (name !== load('name') || avatar !== load('avatar')) saveIdentity(name, avatar);
    window.removeEventListener('langchange', renderCode);
    startRoom(app, roomId, name, avatar);
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

function startRoom(app: HTMLElement, roomId: string, myName: string, myAvatar: Avatar, { resumed = false, tv }: { resumed?: boolean; tv?: string } = {}): void {
  // Card R7: the intro plays on the first entry into this room in this tab, whichever way it came (the join card, an
  // invite link, `#back` from the extension), never on a reload, in the shell or on a TV. Worked out before `in:` is set.
  const introDue = !tv && !isShell && sessionLoad(`in:${roomId}`) !== '1';
  // Sayfa yenilenirse doğrudan odaya dönülsün (sekmeye özel; yeni sekmede isim yine sorulur).
  // (A TV takes its person's name and avatar from the server: nothing of its own is saved.)
  if (!tv) {
    sessionSave(`in:${roomId}`, '1');
    saveRoomIdentity(roomId, myName, myAvatar);
  }
  // YouTube's player API is no longer loaded ahead (card 6a, privacy: no request to YouTube before a YouTube video is
  // chosen); it loads with the first YouTube item.

  app.innerHTML = `
    <div class="room fresh">
      <div class="stage">
        <form id="media-form" class="media-form">
          <input id="media-input" autocomplete="off" data-i18n-placeholder="mediaPlaceholder" data-i18n-title="mediaLabel" />
          <button class="btn media-search" value="search" data-i18n-title="searchButton"></button>
          <button class="btn primary" value="enqueue" data-i18n="addToQueue"></button>
          <button class="btn" value="load" data-i18n="playNow"></button>
        </form>
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
            <div id="live-window" class="live-window" hidden>
              <video id="live-video" autoplay playsinline></video>
              <div class="live-bar">
                <span id="live-title" class="live-title"></span>
                <button id="live-hide-self" type="button" class="icon-btn" data-i18n-title="live.hideSelf" hidden>🙈</button>
                <button id="live-big" type="button" class="icon-btn" data-i18n-title="live.bigger">⤢</button>
                <button id="live-close" type="button" class="icon-btn" data-i18n-title="close">✕</button>
              </div>
            </div>
            <div id="waiting-banner" class="waiting-banner" role="status" hidden></div>
            <div id="sync-badge" class="sync-badge" role="status" hidden></div>
            <div id="action-notice" class="action-notice" role="status" hidden></div>
            <div id="toasts" class="fs-only toasts" aria-live="polite"></div>
            <form id="pin-form" class="pin-form" hidden><span aria-hidden="true">📌</span><input id="pin-note" autocomplete="off" data-i18n-placeholder="pinPlaceholder" /><button class="btn small-btn primary" data-i18n="pinSave"></button></form>
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
                <div class="fs-volume" id="fs-volume-box" hidden>
                  <button id="fs-mute" type="button" class="fs-btn">🔊</button>
                  <input id="fs-volume" type="range" min="0" max="100" step="1" value="100" />
                </div>
                <button id="fs-cc" type="button" class="fs-btn fs-cc" hidden>CC</button>
                <div class="reaction-bar fs-reactions" role="group"></div>
                <form id="fs-chat" class="fs-chat">
                  <input id="fs-chat-input" autocomplete="off" data-i18n-placeholder="quickChatPlaceholder" />
                </form>
                <button id="fs-pin" type="button" class="fs-btn">📌</button>
                <button id="fs-skip" type="button" class="fs-btn">⏭</button>
                <select id="fs-speed" class="fs-speed">${SPEEDS.map((s) => `<option value="${s}">${s}x</option>`).join('')}</select>
                <button id="fs-enter" type="button" class="fs-btn fs-enter">⛶</button>
                <button id="fs-exit" type="button" class="fs-btn">✕</button>
              </div>
            </div>
            <div id="fs-dock" class="fs-dock" role="toolbar" aria-orientation="vertical">
              <div class="dock-group">
                <button id="dock-chat" type="button" class="dock-btn" aria-expanded="false"></button>
                <button id="dock-react" type="button" class="dock-btn" aria-expanded="false"></button>
                <button id="dock-pin" type="button" class="dock-btn"></button>
                <button id="dock-game" type="button" class="dock-btn" aria-haspopup="true" aria-expanded="false"></button>
              </div>
              <div id="dock-voice" class="dock-group" hidden>
                <button id="dock-mic" type="button" class="dock-btn"></button>
                <button id="dock-cam" type="button" class="dock-btn"></button>
                <button id="dock-live" type="button" class="dock-btn"></button>
              </div>
              <div class="dock-group">
                <button id="dock-play" type="button" class="dock-btn" hidden></button>
                <button id="dock-vol" type="button" class="dock-btn" aria-expanded="false" hidden></button>
                <button id="dock-speed" type="button" class="dock-btn dock-text" aria-expanded="false">1×</button>
                <button id="dock-skip" type="button" class="dock-btn"></button>
                <button id="dock-more" type="button" class="dock-btn dock-more" aria-expanded="false"></button>
                <button id="dock-full" type="button" class="dock-btn" hidden></button>
                <button id="dock-exit" type="button" class="dock-btn"></button>
              </div>
              <form id="dock-chat-form" class="dock-pop dock-chat" hidden><input id="dock-chat-input" autocomplete="off" data-i18n-placeholder="quickChatPlaceholder" /></form>
              <div id="dock-react-pop" class="dock-pop" hidden><div class="reaction-bar fs-reactions dock-reactions" role="group"></div></div>
              <div id="dock-vol-pop" class="dock-pop dock-vol" hidden><input id="dock-vol-range" type="range" min="0" max="100" step="1" value="100" /></div>
              <div id="dock-more-pop" class="dock-pop dock-more-pop" hidden>
                <div class="dock-more-speeds" role="group">${SPEEDS.map((s) => `<button type="button" class="dock-speed-opt" data-rate="${s}">${s}×</button>`).join('')}</div>
                <button type="button" class="dock-more-item" data-press="#sync-all"><span aria-hidden="true">🔄</span><span data-i18n="syncAll"></span></button>
                <button type="button" class="dock-more-item" data-press="#skip"><span aria-hidden="true">⏭</span><span data-i18n="skip"></span></button>
                <button type="button" class="dock-more-item" data-press="#side-toggle"><span aria-hidden="true">🎞</span><span id="dock-more-side"></span></button>
                <button type="button" class="dock-more-item desk-only" data-press="#profile-keys"><span aria-hidden="true">⌨️</span><span data-i18n="keys.open"></span></button>
                <button type="button" class="dock-more-item rail-pin-item" id="rail-pin" aria-pressed="false"><span class="rail-pin-box" aria-hidden="true"></span><span data-i18n="rail.pin"></span></button>
              </div>
              <div id="dock-speed-pop" class="dock-pop dock-speeds" hidden>${SPEEDS.map((s) => `<button type="button" class="dock-speed-opt" data-rate="${s}">${s}×</button>`).join('')}</div>
            </div>
            <div id="rail-edge" class="rail-edge" aria-hidden="true"></div>
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
                  <li><a href="/extension.html" target="_blank" rel="noopener" data-i18n="externalStep1"></a></li>
                  <li data-i18n="externalStep2"></li>
                  <li data-i18n="externalStep3"></li>
                </ol>
                <p class="external-why desktop-only"><span data-i18n="externalWhy"></span> <a id="external-why-more" target="_blank" rel="noopener" data-help-link="permissions" data-i18n="externalWhyMore"></a></p>
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
            <div class="reaction-bar tray-bar" role="group"></div>
            <div class="toolbar-right">
              <button id="add-toggle" type="button" class="tool-btn add-toggle" aria-expanded="false" data-i18n-title="addVideo"><span aria-hidden="true">＋</span></button>
              <button id="shorts-enter" type="button" class="btn small-btn shorts-enter" hidden>📱 <span data-i18n="shorts.view"></span></button>
              <span id="host-lock" class="host-lock" hidden>🔒 <span data-i18n="hostLock"></span></span>
              <div class="game-menu-wrap">
                <button id="game-btn" type="button" class="tool-btn labeled game-btn" aria-haspopup="true" aria-expanded="false"><span aria-hidden="true">🎮</span><span class="tool-label" data-i18n="tool.game"></span></button>
                <div id="game-menu" class="game-menu" role="dialog" data-i18n-title="tool.game" data-island hidden></div>
              </div>
              <button id="pin-btn" type="button" class="tool-btn labeled" data-i18n-title="pin"><span aria-hidden="true">📌</span><span class="tool-label" data-i18n="tool.pin"></span></button>
              <button id="sync-all" type="button" class="tool-btn labeled" data-i18n-title="syncAll"><span aria-hidden="true">🔄</span><span class="tool-label" data-i18n="tool.sync"></span></button>
              <div class="speed-wrap">
                <button id="speed-btn" type="button" class="tool-btn labeled speed-btn" aria-haspopup="true" aria-expanded="false" data-i18n-title="speed"><span aria-hidden="true">⏩</span><span id="speed-label" class="speed-label">1×</span></button>
                <div id="speed-pop" class="speed-pop" data-island hidden>
                  <span class="speed-pop-title" data-i18n="speedTitle"></span>
                  <div class="speed">
                    <button id="speed-down" type="button" class="icon-btn speed-step" data-i18n-title="speedDown">−</button>
                    <select id="speed" data-i18n-title="speed">${SPEEDS.map((s) => `<option value="${s}">${s}x</option>`).join('')}</select>
                    <button id="speed-up" type="button" class="icon-btn speed-step" data-i18n-title="speedUp">+</button>
                  </div>
                </div>
              </div>
              <button id="side-toggle" type="button" class="icon-btn tool-btn side-toggle"><span id="side-icon" aria-hidden="true">🎞</span><span id="side-badge" class="badge" hidden></span></button>
              <button id="fullscreen" type="button" class="icon-btn tool-btn">⛶</button>
            </div>
          </div>
        </div>
        <div id="shorts-nav" class="shorts-nav shorts-only">
          <button id="shorts-prev" type="button" class="shorts-arrow" data-i18n-title="shorts.prev">▲</button>
          <span id="shorts-left" class="shorts-left"></span>
          <button id="shorts-next" type="button" class="shorts-arrow" data-i18n-title="shorts.next">▼</button>
          <span id="shorts-measure" class="shorts-measure" data-i18n-title="shorts.measureHint" hidden></span>
        </div>
        <div id="seats-r" class="seats seats-r shorts-only"></div>
        <div id="shorts-bar" class="shorts-bar shorts-only">
          <div class="shorts-chat-wrap">
            <button id="shorts-chat-btn" type="button" class="btn small-btn rail-only" aria-expanded="false" data-i18n-title="shorts.chatHint">💬</button>
            <form id="shorts-chat" class="shorts-chat">
              <input id="shorts-input" autocomplete="off" maxlength="300" data-i18n-placeholder="chatPlaceholder" data-i18n-title="chat" />
              <button class="btn primary" data-i18n="send"></button>
            </form>
          </div>
          <div class="reaction-bar tray-bar shorts-reactions" role="group"></div>
          <div id="shorts-voice" class="shorts-voice" hidden>
            <button id="shorts-mic" type="button" class="cam-ctl"></button>
            <button id="shorts-cam" type="button" class="cam-ctl"></button>
          </div>
          <div class="shorts-add-wrap">
            <button id="shorts-add" type="button" class="btn small-btn shorts-add" aria-expanded="false" data-i18n-title="shorts.addHint">＋ <span data-i18n="shorts.add"></span></button>
            <form id="shorts-add-form" class="shorts-feed-pop shorts-add-pop card" hidden>
              <div class="feed-head phone-only"><b data-i18n="shorts.addLabel"></b><button id="shorts-add-close" type="button" class="icon-btn" data-i18n-title="close">✕</button></div>
              <label class="small desk-label" for="shorts-add-input" data-i18n="shorts.addLabel"></label>
              <div class="feed-topic-row">
                <input id="shorts-add-input" autocomplete="off" data-i18n-placeholder="shorts.addPlaceholder" />
                <button class="btn primary small-btn" data-i18n="shorts.addButton"></button>
              </div>
              <ol id="shorts-add-results" class="shorts-results" hidden></ol>
              <p class="muted small" data-i18n="shorts.addNote"></p>
              <p class="yt-attrib small"><span data-i18n="yt.from"></span> · <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener" data-i18n="yt.terms"></a></p>
            </form>
          </div>
          <div class="game-menu-wrap shorts-game-wrap">
            <button id="shorts-game" type="button" class="btn small-btn shorts-game" aria-haspopup="true" aria-expanded="false" data-i18n-title="tool.game">🎮 <span data-i18n="tool.game"></span></button>
          </div>
          <div class="shorts-feed-wrap">
            <button id="shorts-feed" type="button" class="btn small-btn shorts-feed" aria-pressed="false" data-i18n-title="feed.short">♾ <span id="shorts-feed-label" data-i18n="feed.short"></span></button>
            <form id="shorts-feed-form" class="shorts-feed-pop card" hidden>
              <div class="feed-head phone-only"><b data-i18n="feed.short"></b><button id="shorts-feed-close" type="button" class="icon-btn" data-i18n-title="close">✕</button></div>
              <div id="shorts-feed-now" class="feed-now" hidden><span id="shorts-feed-now-text"></span><button id="shorts-feed-stop" type="button" class="btn small-btn" data-i18n="feed.stop"></button></div>
              <button id="shorts-like" type="button" class="feed-like" data-i18n-title="feed.likeHint"><b data-i18n="feed.like"></b><span class="muted small" data-i18n="feed.likeText"></span></button>
              <p class="small feed-discover-title"><b data-i18n="feed.discover"></b> <span class="muted" data-i18n="feed.discoverHint"></span> <select id="shorts-region" class="feed-region" data-i18n-title="feed.region"></select></p>
              <div id="shorts-pools" class="feed-pools" role="group"></div>
              <label class="small" for="shorts-feed-topic" data-i18n="feed.topicLabel"></label>
              <div class="feed-topic-row">
                <input id="shorts-feed-topic" autocomplete="off" maxlength="80" data-i18n-placeholder="feed.topic" />
                <button class="btn primary small-btn" data-i18n="feed.start"></button>
              </div>
              <p class="muted small" data-i18n="feed.hint"></p>
              <p class="yt-attrib small"><span data-i18n="yt.from"></span> · <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener" data-i18n="yt.terms"></a></p>
            </form>
          </div>
          <button id="shorts-loop" type="button" class="btn small-btn shorts-loop" aria-pressed="false">🔁 <span data-i18n="shorts.loop"></span></button>
          <button id="shorts-exit" type="button" class="btn small-btn" data-i18n-title="shorts.roomViewHint">↩ <span data-i18n="shorts.roomView"></span></button>
          <button id="shorts-more" type="button" class="btn small-btn rail-more" aria-expanded="false" data-i18n-title="shorts.menu">⋯</button>
        </div>
        <p id="player-error" class="error" hidden></p>
      </div>

      <aside class="side">
        <section class="card together-card" id="together">
          <div class="together-head">
            <h3 class="together-title" data-i18n="together"></h3>
            <span id="voice-limit" class="voice-limit muted small"></span>
          </div>
          <div class="together-strip">
            <div id="voice-people" class="voice-people"></div>
            <div id="strip-voice" class="strip-voice phone-only" hidden>
              <button id="strip-live" type="button" class="cam-ctl" hidden></button>
              <button id="strip-mic" type="button" class="cam-ctl"></button>
              <button id="strip-cam" type="button" class="cam-ctl"></button>
            </div>
            <button id="strip-more" type="button" class="cam-ctl strip-more phone-only" aria-haspopup="dialog" data-i18n-title="phone.more">⋯</button>
          </div>
          <div class="together-actions">
            <div id="voice-card" class="voice-row" hidden>
              <button id="voice-join" type="button" class="btn primary voice-join"><span data-i18n="voice.join"></span></button>
              <div id="voice-on" class="voice-on" hidden>
                <button id="voice-mic" type="button" class="btn small-btn voice-mic"></button>
                <button id="voice-cam" type="button" class="btn small-btn voice-cam" hidden></button>
                <button id="voice-leave" type="button" class="btn small-btn" data-i18n="voice.leave"></button>
                <label class="voice-ptt small"><input type="checkbox" id="voice-ptt" /> <span data-i18n="voice.ptt"></span></label>
              </div>
            </div>
            <div class="live-card" id="live-card" hidden>
              <div class="live-share-wrap" id="live-share-wrap">
                <button id="live-share" type="button" class="btn live-share" aria-haspopup="true" aria-expanded="false"><span data-i18n="live.share"></span> <span class="live-caret" aria-hidden="true">▾</span></button>
                <div id="live-menu" class="live-menu" role="menu" hidden>
                  <button id="live-screen" type="button" class="live-menu-item" role="menuitem"><span class="live-menu-icon" aria-hidden="true"></span><b data-i18n="live.screen"></b><span class="muted small" data-i18n="live.screenD"></span></button>
                  <label class="live-menu-check" id="live-with-cam-row"><span class="live-menu-icon" aria-hidden="true"></span><span class="live-check-text" data-i18n="live.withCam"></span><input type="checkbox" class="switch" id="live-with-cam" /></label>
                  <p id="live-menu-note" class="muted small live-menu-note"></p>
                </div>
              </div>
              <div class="live-row" id="live-row">
                <span id="live-status" class="live-status small"></span>
                <button id="live-watch" type="button" class="btn small-btn primary" hidden></button>
                <button id="live-preview" type="button" class="btn small-btn" data-i18n="live.showSelf" hidden></button>
                <button id="live-stop" type="button" class="btn small-btn" data-i18n="live.stop" hidden></button>
                <button id="live-kill" type="button" class="btn small-btn" data-i18n="live.kill" hidden></button>
                <label class="live-quality small" id="live-quality-row" hidden><span data-i18n="live.quality"></span>
                  <select id="live-quality">
                    <option value="text" data-i18n="live.quality.text"></option>
                    <option value="motion" data-i18n="live.quality.motion"></option>
                  </select>
                </label>
                <span id="live-limit" class="voice-limit muted small"></span>
              </div>
            </div>
          </div>
          <p id="voice-ip" class="muted small voice-ip" hidden>🔒 <span data-i18n="ipNotice.line"></span> <button type="button" class="link-btn" id="voice-ip-why" data-i18n="ipNotice.why"></button></p>
          <div id="voice-cams" class="voice-cams" hidden>
          </div>
          <p id="voice-hint" class="muted small voice-hint" data-i18n="voice.headphones" hidden></p>
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
              <span aria-hidden="true">👥</span><span data-i18n="tab.people"></span><span id="people-count" class="count"></span>
            </button>
          </nav>

          <div class="tab-panel chat-panel" data-panel="chat">
            <button id="chat-events" type="button" class="chat-events" aria-pressed="false"></button>
            <ul id="chat-list" class="chat-list" aria-live="polite" aria-relevant="additions"></ul>
            <form id="chat-form" class="chat-form">
              <button type="button" id="chat-react" class="chat-tool phone-only" aria-haspopup="dialog" data-i18n-title="reactTray.hint">😀</button>
              <input id="chat-input" autocomplete="off" data-i18n-placeholder="chatPlaceholder" data-i18n-title="chat" />
              <button type="button" class="chat-attach" id="chat-attach" data-i18n-title="chatImage.add"></button>
              <button type="button" id="chat-plus" class="chat-tool phone-only" aria-haspopup="dialog" data-i18n-title="phone.plus">＋</button>
              <button class="chat-send" id="chat-send" data-i18n-title="send">➤</button>
            </form>
          </div>

          <div class="tab-panel" data-panel="queue" hidden>
            <label class="set-row queue-auto"><span class="set-text"><b data-i18n="autoNext"></b></span><input type="checkbox" role="switch" class="switch" id="opt-autonext" /></label>
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
            <div class="profile-actions">
              <div class="profile-lang" id="profile-lang" role="group" aria-label="Language">
                <span aria-hidden="true">🌐</span>
                <button type="button" data-set-lang="tr">TR</button>
                <button type="button" data-set-lang="en">EN</button>
              </div>
              <button type="button" class="btn small-btn" id="profile-move">📲 <span data-i18n="move.open"></span></button>
              <button type="button" class="btn small-btn desk-only" id="profile-keys" data-i18n-title="keys.open" hidden>⌨️ ?</button>
            </div>
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
            <button type="button" id="recap-open" class="btn primary recap-open" hidden>✨ <span data-i18n="recap.open"></span></button>
            <h4 class="recap-saved-title" data-i18n="recap.savedTitle"></h4>
            <div id="recap-history" class="recap-history"></div>
            <!-- R9: Help, Feedback and Privacy live only here (the room's own things are in ⋯ More). -->
            <p class="profile-links small">
              <a id="profile-help" href="/help.html" target="_blank" rel="noopener" data-help-link data-i18n="help"></a>
              <span aria-hidden="true">·</span>
              <button type="button" class="link-btn" id="profile-feedback" data-i18n="feedback"></button>
              <span aria-hidden="true">·</span>
              <a id="profile-privacy" href="/privacy.html" target="_blank" rel="noopener" data-privacy-link data-i18n="privacy"></a>
            </p>
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
        <a class="btn primary" href="/extension.html" target="_blank" rel="noopener" data-i18n="extDialog.install"></a>
        <button type="button" class="btn" id="ext-add-anyway" data-i18n="extDialog.addAnyway"></button>
        <button type="button" class="btn" id="ext-cancel" data-i18n="extDialog.cancel"></button>
      </div>
    </dialog>

    <div id="settings-dialog" class="dialog-backdrop settings-backdrop" hidden>
      <section class="settings-window" role="dialog" aria-modal="true" aria-labelledby="settings-heading">
        <nav class="settings-nav">
          <h3 id="settings-heading">⚙️ <span data-i18n="tab.settings"></span></h3>
          <button type="button" data-sec="view">🖥️ <span data-i18n="settings.secView"></span></button>
          <button type="button" data-sec="rules">👑 <span data-i18n="settings.secRules"></span></button>
          <button type="button" data-sec="save">💾 <span data-i18n="settings.secSave"></span></button>
          <button type="button" data-sec="schedule" class="host-only">⏰ <span data-i18n="settings.secSchedule"></span></button>
        </nav>
        <div class="settings-main">
          <header class="settings-head">
            <h4 id="settings-title"></h4>
            <button type="button" class="icon-btn settings-close" id="settings-close" data-i18n-title="close">✕</button>
          </header>
          <div class="settings-sec" data-sec="view">
            <p class="muted small" data-i18n="settings.view"></p>
            <div class="set-box">
              <label class="set-row"><span class="set-text"><b data-i18n="settings.showReactions"></b><span data-i18n="settings.showReactions.d"></span></span><input type="checkbox" role="switch" class="switch" id="opt-reactions" /></label>
              <label class="set-row"><span class="set-text"><b data-i18n="invite.auto"></b><span data-i18n="invite.auto.d"></span></span><input type="checkbox" role="switch" class="switch" id="opt-autoinvite" /></label>
              <label class="set-row desk-only"><span class="set-text"><b data-i18n="settings.railPin"></b><span data-i18n="settings.railPin.d"></span></span><input type="checkbox" role="switch" class="switch" id="opt-railpin" /></label>
              <label class="set-row"><span class="set-text"><b data-i18n="settings.actionNotice"></b><span data-i18n="settings.actionNotice.d"></span></span><input type="checkbox" role="switch" class="switch" id="opt-actionnotice" /></label>
              <label class="set-row touch-only rotate-row"><span class="set-text"><b data-i18n="settings.rotateFs"></b><span data-i18n="settings.rotateFs.d"></span></span><input type="checkbox" role="switch" class="switch" id="opt-rotatefs" /></label>
              <label class="set-row"><span class="set-text"><b data-i18n="settings.sounds"></b><span data-i18n="settings.sounds.d"></span></span><input type="checkbox" role="switch" class="switch" id="opt-sounds" /></label>
              <label class="set-row sound-volume-row"><span class="set-text"><b data-i18n="settings.soundVolume"></b><span data-i18n="settings.soundVolume.d"></span></span><input type="range" min="0" max="100" step="5" id="opt-soundvolume" data-i18n-title="settings.soundVolume" /><output id="opt-soundvolume-val" class="sound-volume-val"></output></label>
              <label class="set-row shell-only"><span class="set-text"><b data-i18n="settings.closeAds"></b><span data-i18n="settings.closeAds.d"></span></span><input type="checkbox" role="switch" class="switch" id="opt-closeads" /></label>
              <label class="set-row shell-only"><span class="set-text"><b data-i18n="settings.duck"></b><span data-i18n="settings.duck.d"></span></span><input type="checkbox" role="switch" class="switch" id="opt-duck" /></label>
            </div>
          </div>
          <div class="settings-sec host-box" data-sec="rules" hidden>
            <p id="opt-wait-hint" class="muted small"></p>
            <ul id="rules-summary" class="rules-summary"></ul>
            <div class="set-box host-ui">
              <label class="set-row"><span class="set-text"><b data-i18n="settings.waitForAll"></b><span data-i18n="settings.waitForAll.d"></span></span><input type="checkbox" role="switch" class="switch" id="opt-wait" /></label>
              <label class="set-row"><span class="set-text"><b data-i18n="settings.hostOnlyMode"></b><span data-i18n="settings.hostOnlyMode.d"></span></span><input type="checkbox" role="switch" class="switch" id="opt-hostonly" /></label>
              <label class="set-row"><span class="set-text"><b data-i18n="settings.lockQueue"></b><span data-i18n="settings.lockQueue.d"></span></span><input type="checkbox" role="switch" class="switch" id="opt-lockqueue" /></label>
              <label class="set-row"><span class="set-text"><b data-i18n="settings.countdown"></b><span data-i18n="settings.countdown.d"></span></span><input type="checkbox" role="switch" class="switch" id="opt-countdown" /></label>
              <label class="set-row"><span class="set-text"><b data-i18n="settings.knock"></b><span data-i18n="settings.knock.d"></span></span><input type="checkbox" role="switch" class="switch" id="opt-knock" /></label>
              <label class="set-row"><span class="set-text"><b data-i18n="settings.noReactions"></b><span data-i18n="settings.noReactions.d"></span></span><input type="checkbox" role="switch" class="switch" id="opt-noreactions" /></label>
              <label class="set-row"><span class="set-text"><b data-i18n="settings.liveHostOnly"></b><span data-i18n="settings.liveHostOnly.d"></span></span><input type="checkbox" role="switch" class="switch" id="opt-livehost" /></label>
              <div class="set-row"><span class="set-text"><b data-i18n="settings.clearStickers"></b><span data-i18n="settings.clearStickers.d"></span></span><button type="button" class="btn small-btn" id="opt-clear-stickers" data-i18n="settings.clearStickers.btn"></button></div>
              <label class="set-row"><span class="set-text"><b data-i18n="settings.reactionGap"></b><span data-i18n="settings.reactionGap.d"></span></span>
                <select id="opt-reactiongap">${REACTION_GAPS.map((gap) => `<option value="${gap}" data-i18n="settings.reactionGap.${gap}"></option>`).join('')}</select>
              </label>
            </div>
          </div>
          <div class="settings-sec" data-sec="save" hidden>
            <p id="save-status" class="small"></p>
            <form id="save-form" class="set-inline">
              <input id="save-name" maxlength="40" autocomplete="off" data-i18n-placeholder="roomNamePlaceholder" />
              <button class="btn primary" id="save-submit"></button>
            </form>
            <button type="button" id="save-off" class="btn small-btn" data-i18n="saveOff"></button>
          </div>
          <div class="settings-sec" data-sec="schedule" hidden>
            <p class="schedule-intro" data-i18n="settings.schedule"></p>
            <div class="schedule-now" id="schedule-now" hidden>
              <div class="schedule-now-text"><b id="schedule-now-time"></b><span id="schedule-now-left"></span></div>
              <p class="schedule-warn" id="schedule-warn" data-i18n="schedule.noVideo" hidden></p>
              <div class="schedule-now-actions">
                <button type="button" class="btn small-btn" id="schedule-invite" data-i18n="schedule.invite"></button>
                <button type="button" class="btn small-btn" id="opt-start-clear" data-i18n="settings.scheduleClear"></button>
              </div>
            </div>
            <p class="set-label" data-i18n="schedule.quick"></p>
            <div class="schedule-chips" id="schedule-chips">
              <button type="button" class="chip" data-in="15" data-i18n="schedule.in15"></button>
              <button type="button" class="chip" data-in="30" data-i18n="schedule.in30"></button>
              <button type="button" class="chip" data-in="60" data-i18n="schedule.in60"></button>
              <button type="button" class="chip" data-at="21" data-i18n="schedule.tonight"></button>
            </div>
            <p class="set-label" data-i18n="schedule.custom"></p>
            <div class="set-inline schedule-row">
              <input type="datetime-local" id="opt-start" aria-labelledby="settings-title" />
              <button type="button" class="btn primary" id="opt-start-set" data-i18n="settings.scheduleSet"></button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div id="knock-wait" class="kicked-screen knock-wait" hidden role="status" aria-live="polite">
      <div class="card">
        <div class="kicked-icon">🚪</div>
        <h2 data-i18n="knock.waitTitle"></h2>
        <p class="muted" data-i18n="knock.waitText"></p>
        <p class="muted small" id="knock-away" data-i18n="knock.hostAway" hidden></p>
        <a class="btn big" href="/" data-i18n="home"></a>
      </div>
    </div>
    <div id="knock-cards" class="knock-cards" aria-live="polite"></div>
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
  setFilmPlaying(() => !!roomState?.item && !roomState.paused);
  const joinFilter = new JoinFilter();

  const send = (message: ClientMessage) => connection.send(message);
  // Üst çubukta odanın adı (kayıtlı odada adı, değilse kodu) ve kaç kişi olduğu.
  // Odadayken üst çubuk sade: bağlantı durumu oda adının noktasında (basınca yeniden bağlanır), tema/dil/⟳ profil
  // menüsünde (styles.css `in-room`).
  document.documentElement.classList.add('in-room');
  // The room's name is the page's heading (card A11y, S6).
  const roomTitleName = el('h1', { class: 'room-title-name' });
  const roomTitleCount = el('span', { class: 'room-title-count' });
  const roomTitleDot = el('button', { type: 'button', class: 'room-title-dot' });
  const roomTitleStatus = el('span', { class: 'room-title-status' });
  document.querySelector('.topbar .brand')?.after(el('div', { class: 'room-title' }, roomTitleDot, roomTitleStatus, roomTitleName, roomTitleCount));
  // Card A11y (K1): in the room the first Tab stop skips to the video (the top bar, link box and video follow).
  const skipLink = document.querySelector<HTMLAnchorElement>('#skip-link');
  if (skipLink) {
    skipLink.dataset.i18n = 'skipToVideo';
    skipLink.textContent = t('skipToVideo');
    skipLink.href = '#theater';
    skipLink.onclick = (event) => {
      event.preventDefault();
      const target = document.getElementById('theater');
      target?.setAttribute('tabindex', '-1');
      target?.focus();
    };
  }
  function drawRoomTitle(): void {
    // An unsaved room shows its friendly name (0.9.93.2; the same for everyone, worked out from the id).
    roomTitleName.textContent = roomSettings.saved && roomSettings.name ? roomSettings.name : friendlyRoomName(roomId);
    // People, not connections: the same person's site tab + film tab count once; two people with the same name and
    // avatar count twice (R11: the server's person key).
    const people = new Set(members.map(personOf)).size;
    roomTitleCount.textContent = people ? `· ${t(people === 1 ? 'peopleOne' : 'peopleCount', { n: people })}` : '';
    tvRoom?.title(roomTitleName.textContent);
  }
  addEventListener('langchange', drawRoomTitle);
  const amHost = () => myId !== null && myId === hostId;
  const queue = createQueuePanel(app, send, {
    play: () => amHost() || !roomSettings.hostOnly,
    edit: () => amHost() || !roomSettings.lockQueue,
  });
  const chatBadge = $('#chat-badge');
  const chat = createChatPanel(app, send, () => myId, (count) => {
    chatBadge.hidden = count === 0;
    chatBadge.textContent = count > 9 ? '9+' : String(count);
  }, (url) => void openExternalLink(url, () => isShell && postToExtension({ type: 'open-ok' })));
  const people = createPeoplePanel(app, send, (member) => void askMakeHost(member));
  /** Sağ üstteki profil düğmesi (kendi avatarım); kimlik değişince yeniden çizilir. */
  let drawProfileButton = () => {};
  // 👤 Profil sağ üstte (en sağda); basınca ad, avatar, tema ve özet düğmenin altında açılan menüde.
  {
    const profileButton = el('button', { type: 'button', class: 'nav-link profile-btn', 'aria-expanded': 'false', 'aria-haspopup': 'true', 'data-i18n-title': 'tab.profile', title: t('tab.profile') });
    drawProfileButton = () => profileButton.replaceChildren(avatarNode(myAvatar, 'profile-avatar'));
    drawProfileButton();
    document.querySelector('.topbar-right')?.append(profileButton);
    // ⚙️ Settings: the only entry point, right of the profile picture (owner's request, 0.9.87).
    document.querySelector('.topbar-right')?.append(
      el('button', { type: 'button', id: 'settings-open', class: 'nav-link settings-btn', 'data-i18n-title': 'tab.settings', title: t('tab.settings'), 'aria-label': t('tab.settings') }, '⚙️'),
    );
    const pop = el('div', { class: 'profile-pop', role: 'dialog', 'aria-label': t('tab.profile') });
    pop.hidden = true;
    pop.append($('#profile-panel'));
    app.append(pop);
    // Dil, ayarlar ve bağlantıyı yenile: üst çubuktan buraya taşındı.
    const langRow = $('#profile-lang');
    const drawLang = () => {
      for (const button of langRow.querySelectorAll<HTMLButtonElement>('[data-set-lang]')) button.setAttribute('aria-pressed', String(button.dataset.setLang === lang()));
    };
    langRow.addEventListener('click', (event) => {
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-set-lang]');
      if (!button) return;
      // Üst çubuktaki (odada gizli) TR/EN düğmesine basılmış gibi: app.ts dili değiştirir ve işaretler.
      document.querySelector<HTMLButtonElement>(`.topbar [data-lang="${button.dataset.setLang}"]`)?.click();
      drawLang();
    });
    drawLang();
    $('#profile-keys').addEventListener('click', () => openShortcuts());
    $('#profile-feedback').addEventListener('click', () => openFeedbackDialog($('#profile-feedback')));
    // Move my things to another device (its window is a lazy chunk).
    $('#profile-move').addEventListener('click', () => {
      setOpen(false);
      void import('./ui/move-device.ts').then(({ openMoveDialog }) => openMoveDialog());
    });
    const setOpen = (open: boolean) => {
      // Right edge under the profile picture (⚙️ sits to its right since 0.9.87).
      if (open) pop.style.right = `${Math.max(12, innerWidth - profileButton.getBoundingClientRect().right)}px`;
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
      if (event.key === 'Escape' && !pop.hidden && !document.querySelector('.dialog-backdrop:not([hidden]), .recap-backdrop, dialog[open]')) setOpen(false);
    });
  }
  /** İlk girişte açılacak sekme seçildi mi (önce sekmeler varsayılan sohbetle kurulur; o hatırlanmaz). */
  let tabChosen = false;
  const tabs = createTabs(
    app,
    (tab, chatShown) => {
      chat.setVisible(chatShown);
    // Aynı sekmede yenileyince kalınan sekme korunur.
      if (tabChosen) sessionSave(`tab:${roomId}`, tab);
    },
    () => document.documentElement.classList.contains('tablet-up'),
  );
  onTabletUpright(() => tabs.refresh());
  /** İlk girişte açılacak sekme: bu sekmede daha önce açılan, yoksa Sohbet (ayarlar artık ⚙️ penceresinde). */
  function chooseFirstTab(): void {
    if (tabChosen) return;
    tabChosen = true;
    const remembered = sessionLoad(`tab:${roomId}`);
    tabs.show(isTabId(remembered) && !(isShell && remembered === 'queue') ? remembered : 'chat');
  }
  // ⚙️ Settings (top right, next to the profile picture) opens the centered dialog.
  const settingsDialog = createSettingsDialog(app, amHost);
  // The button lives in the top bar, outside `app`.
  // Card 6 (owner's pick C): ⚙️ is "My screen" only; the room's own settings open from "⋯ More".
  document.getElementById('settings-open')?.addEventListener('click', () => settingsDialog.open('view', true));
  const moreItems = (desktop: boolean) =>
    roomMoreItems({
      openSettings: (section) => settingsDialog.open(section, true),
      press: (selector) => requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(selector)?.click()),
      games: () => requestAnimationFrame(() => (desktop ? pressMoreGame() : document.querySelector<HTMLButtonElement>('#game-btn')?.click())),
      isHost: amHost,
      hasItem: () => roomEl.classList.contains('has-item'),
      desktop,
    });
  const settings = createSettingsPanel(app, { name: myName, avatar: myAvatar }, (name, avatar) => {
    myName = name;
    myAvatar = avatar;
    drawProfileButton();
    // Only this room: another room keeps its own name and avatar.
    saveRoomIdentity(roomId, name, avatar);
    connection.setIdentity(name, avatar);
    send({ t: 'rename', name, avatar });
  });
  // Başkası durdurunca/sarınca videonun üstünde kısa not: herkes videonun neden durduğunu görsün (hareketler sohbette
  // varsayılan gizli). Art arda gelenlerde sonuncusu kalır.
  let noticeTimer: ReturnType<typeof setTimeout> | null = null;
  function showActionNotice(by: { name: string; avatar?: Avatar }, text: string): void {
    if (!settings.options.actionNotice) return;
    const box = $('#action-notice');
    box.replaceChildren(avatarNode(by.avatar, 'action-notice-avatar'), el('span', {}, text));
    box.hidden = false;
    box.classList.remove('fade');
    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      box.classList.add('fade');
      noticeTimer = setTimeout(() => (box.hidden = true), 400);
    }, 2600);
  }
  // Sesli sohbet (şimdilik sadece sitede; katmanda mikrofon izni film sitesinin adına sorulurdu).
  /** Cameras for the Shorts seats (set once the seats exist; voice may report before that). */
  let showSeatCams: (cams: Map<string, MediaStream>) => void = () => {};
  let seatCams = new Map<string, MediaStream>();
  const voice = createVoice(app, send, () => myId, roomId, isShell, {
    onCams: (cams) => {
      seatCams = cams;
      showSeatCams(cams);
      phoneRoom?.setCams(cams);
    },
    isHost: () => myId !== null && myId === hostId,
    kick: (member) => {
      if (confirm(t('kickConfirm', { name: member.name }))) send({ t: 'kick', id: member.id });
    },
    makeHost: (member) => void askMakeHost(member),
    messagePrivately: (member) => openPrivate(member),
  });
  /** Hand the host role to someone (0.9.93.2): asked first, it can't be taken back. */
  async function askMakeHost(member: Member): Promise<void> {
    const yes = await confirmDialog({ icon: '👑', title: t('makeHostTitle', { name: member.name }), text: t('makeHostText'), yes: t('makeHost') });
    if (yes) send({ t: 'make-host', id: member.id });
  }
  const live = createLive(app, send, () => myId, isShell, () => amHost());
  // The phone layout (0.9.92.3): the same room as an app screen; sheets borrow the room's own panels.
  const phoneRoom: ReturnType<typeof createPhoneRoom> | null = isShell ? null : createPhoneRoom({ root: app, openSettings: (section) => settingsDialog.open(section, true), myId: () => myId, moreItems: () => moreItems(false) });
  phoneRoom?.setCams(seatCams);
  // Odanın içindeki oyunlar: 🎮 → oyun seç → oyun videonun yerinde açılır (ayrı oyun odası yok).
  // "⋯ More → Games" on a computer (card 6): the games hall opens next to the 🎮 pressed, so an invisible one waits
  // under ⋯ More (the toolbar's 🎮 is hidden on a computer and the rail is not out in a fresh room).
  const moreGameButton = el('button', { type: 'button', id: 'more-game', class: 'more-game-btn', tabindex: '-1', 'aria-hidden': 'true' });
  const moreGameWrap = el('div', { class: 'game-menu-wrap more-game-wrap' }, moreGameButton);
  document.body.append(moreGameWrap);
  function pressMoreGame(): void {
    const r = document.getElementById('room-more')?.getBoundingClientRect();
    if (r) {
      moreGameWrap.style.top = `${Math.round(r.bottom + 6)}px`;
      moreGameWrap.style.right = `${Math.max(8, Math.round(innerWidth - r.right))}px`;
    }
    moreGameButton.click();
  }
  /**
   * What a solo side game needs (Snack Bar): is the room's video playing, how many other people are here (by name +
   * avatar, my other tabs and TVs left out) and how many of them are in voice with me.
   */
  function soloContext(): SoloRoom {
    const mine = members.find((m) => m.id === myId);
    const self = mine ? personOf(mine) : personOf({ name: myName, avatar: myAvatar });
    const others = new Map<string, boolean>();
    for (const m of members) {
      const key = personOf(m);
      if (m.tv || m.id === myId || key === self) continue;
      others.set(key, (others.get(key) ?? false) || !!m.voice);
    }
    const playing = !!roomState?.item && !roomState.paused && roomState.updatedAt <= clock.now();
    const state = roomState;
    const item = state?.item
      ? {
          id: state.item.id,
          duration: current?.player.getDuration() ?? 0,
          position: state.position + (state.paused ? 0 : Math.max(0, (clock.now() - state.updatedAt) / 1000) * state.rate),
          title: state.item.title ?? '',
        }
      : null;
    const names = [...new Set(members.filter((m) => !m.tv && m.id !== myId && personOf(m) !== self).map((m) => m.name))];
    return { playing, others: others.size, voiceOthers: mine?.voice ? [...others.values()].filter(Boolean).length : 0, item, names };
  }
  const games = createGameStage({
    wrap: $('.player-wrap'),
    button: $<HTMLButtonElement>('#game-btn'),
    menu: $('#game-menu'),
    // The Shorts bar's 🎮 (0.9.91.13): there a game opens as a free window.
    extraButtons: [$<HTMLButtonElement>('#shorts-game'), $<HTMLButtonElement>('#dock-game'), moreGameButton],
    send,
    me: () => ({ id: myId, name: myName, avatar: myAvatar }),
    amHost,
    members: () => members,
    activity: (text) => addActivity(text),
    hint: (text) => flashHint($('#game-btn'), text),
    room: soloContext,
  });
  // Films that end while I'm in the room give Window Garden's seed even with the game closed (owner's pick 11 B).
  watchFilmEnds(() => soloContext().item);
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
      if (!document.querySelector('.dialog-backdrop:not([hidden]), .recap-backdrop') || isTyping(event.target)) return;
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
      setShortsChat(true);
      return;
    }
    // Card R2: where the side panel is off screen (cinema mode) the rail's message box is the chat; focusing the hidden
    // chat box did nothing, so a second Enter was needed.
    const input = app.querySelector<HTMLInputElement>('#chat-input');
    const panelShown = !!input && input.getClientRects().length > 0 && !roomEl.classList.contains('cinema');
    if (!panelShown && fullscreen.openChat()) return;
    tabs.show('chat');
    input?.focus();
  });

  /** R13: the person menu's "Message privately": the chat tab, writing to them only. */
  function openPrivate(member: Member): void {
    if (shortsOn) setShortsOff(true);
    tabs.show('chat');
    chat.privateTo(member);
  }

  // ---- Senkron ----
  const clock = new ServerClock();
  const engine = new SyncEngine({
    clock,
    send,
    // A TV is a weak device: calmer drift correction, and it never makes the room wait (ui/tv-room.ts).
    relaxed: tv !== undefined,
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
  // Hidden test panel (card 12): its live numbers; never names or ids.
  setDebugRoom(() => ({ ...engine.syncStats(), people: new Set(members.filter((m) => !m.tv).map(personOf)).size, kind: roomState?.item?.media.kind ?? null }));
  /** TV version: the room on a TV (this browser was paired), and this device as my TV's remote (phone / computer). */
  let tvRoom: ReturnType<typeof createTvRoom> | null = null;
  let tvRemote: ReturnType<typeof createTvRemote> | null = null;
  /** My TV is here: my own player stays muted (the TV plays the film's sound). */
  let mutedForTv = false;
  const connection = new RoomConnection({
    serverUrl: location.origin,
    roomId,
    name: myName,
    avatar: myAvatar,
    cid: clientId(),
    client: 'web',
    ...(tv ? { tv } : {}),
    clock,
    onMessage: handleMessage,
    onStatus: (next) => {
      status = next;
      renderStatus();
    },
    // Birkaç denemede hiç bağlanılamazsa (bazı mobil hatlar/okul ağları oda bağlantısını geçirmiyor) ne olduğunu ve
    // ne yapılabileceğini söyle; bağlanınca kalkar.
    onFailures: (count) => {
      netHint.hidden = count < 2;
    },
    // Networks where WebSockets never open (phone hotspots): the room runs over the HTTP fallback (0.9.92). Nothing
    // changes for the person; the page only notes it (tests, `/connection`).
    onTransport: (transport) => {
      document.documentElement.dataset.swmTransport = transport;
      if (transport === 'http') console.info('[Sidelit] WebSocket did not open on this network: using the HTTP fallback');
    },
  });
  const retryButton = el('button', { type: 'button', class: 'btn small-btn primary' }, `⟳ ${t('netHint.retry')}`);
  retryButton.addEventListener('click', () => connection.reconnect());
  const netHint = el(
    'div',
    { class: 'net-hint card', role: 'alert' },
    el('b', {}, `📶 ${t('netHint.title')}`),
    el('span', {}, t('netHint.text')),
    // 0.9.92.8 (owner): try again right here, or run the connection test, which links back to this room.
    el(
      'div',
      { class: 'row net-hint-actions' },
      retryButton,
      el('a', { class: 'btn small-btn', href: `/connection?room=${encodeURIComponent(roomId)}` }, t('netHint.test')),
      // Card 7: the help page's connection section, in a new tab so the room keeps trying.
      el('a', { class: 'btn small-btn', href: helpHref('connection'), target: '_blank', rel: 'noopener', id: 'net-hint-help' }, t('netHint.help')),
    ),
  );
  netHint.hidden = true;
  document.body.append(netHint);
  connection.connect();

  // The Sidelit intro (card 6f) while the room gets ready; not again after a reload. Its own small chunk (loaded right
  // after joining, it starts its sound with the picture), so the room page stays within its size budget.
  // Card R7: it starts with the room's first welcome, so someone who waited at the door (R12) sees it once let in
  // instead of it running out behind the waiting screen. The chunk is fetched now so it starts at once.
  let introPending = introDue;
  const intro = introDue ? import('@swm/shared/intro') : null;
  // BH5: the invite window and the first-time tips wait for the intro to be gone (it is over the video, they would
  // sit on top of it).
  let introOver: Promise<void> = Promise.resolve();
  const playIntro = () => {
    if (!introPending || !intro) return;
    introPending = false;
    introOver = intro.then(({ INTRO_CSS, createIntro }) => {
      if (!document.getElementById('swm-intro-css')) document.head.append(el('style', { id: 'swm-intro-css' }, INTRO_CSS));
      const node = createIntro(document, t('introText'));
      $('.player-wrap').append(node);
      return new Promise<void>((done) => {
        const gone = new MutationObserver(() => {
          if (node.isConnected) return;
          gone.disconnect();
          done();
        });
        gone.observe(node.parentElement ?? document.body, { childList: true });
      });
    });
  };
  // R18: everything that belongs to being in the room waits for the first welcome (never while waiting at the door, or
  // for someone refused, kicked or turned away by a full room).
  let joinedOnce = false;
  /** BH5: this tab was removed from the room (kicked or refused at the door). */
  let removedHere = false;
  const firstJoined = () => {
    if (joinedOnce) return;
    joinedOnce = true;
    document.documentElement.dataset.swmJoined = '1';
    dispatchEvent(new Event('swm-joined'));
    // First time in any room: three short tips (invite, add a video, join voice). Not on the film page or a TV.
    if (!resumed && !isShell && !tv) void introOver.then(() => import('./ui/first-tips.ts')).then(({ showFirstTips }) => showFirstTips());
  };

  /** R12: one card per person waiting at the door (host only): who it is, Let in / Refuse. */
  function drawKnocks(list: KnockEntry[]): void {
    const box = $('#knock-cards');
    const fresh = list.some((k) => !box.querySelector(`[data-knock="${k.id}"]`));
    box.replaceChildren(
      ...list.map((k) => {
        const answer = (allow: boolean) => () => send({ t: 'knock-answer', id: k.id, allow });
        const allow = el('button', { type: 'button', class: 'btn primary small-btn knock-allow' }, t('knock.allow'));
        const refuse = el('button', { type: 'button', class: 'btn small-btn knock-refuse' }, t('knock.refuse'));
        allow.addEventListener('click', answer(true));
        refuse.addEventListener('click', answer(false));
        return el(
          'div',
          { class: 'knock-card card', 'data-knock': k.id, role: 'group', 'aria-label': t('knock.asks', { name: k.name }) },
          avatarNode(k.avatar, 'knock-avatar'),
          el('span', { class: 'knock-text' }, t('knock.asks', { name: k.name })),
          el('span', { class: 'knock-actions' }, allow, refuse),
        );
      }),
    );
    if (fresh) playSound('roomJoin');
  }

  function handleMessage(message: ServerMessage): void {
    switch (message.t) {
      case 'welcome':
        myId = message.you;
        playIntro();
        firstJoined();
        // R12: let in (or no door at all): the waiting card goes.
        $('#knock-wait').hidden = true;
        // Ayarlar önce: kişi listesi çizilirken kayıt durumu (kaydedilen odalar listesi) doğru bilinsin.
        if (message.settings) roomSettings = message.settings;
        settingsKnown = true;
        voice.welcome(message.voice === true, message.voiceMode ?? 'p2p');
        live.welcome(message.voice === true);
        setMembers(message.members, message.hostId, false);
        maybeAutoInvite(message.members);
        rememberRoom();
        games.setTables(message.tables ?? (message.game ? [message.game] : []), {}, false);
        games.rejoined();
        chooseFirstTab();
        waitingIds = message.waiting ?? [];
        renderWaiting();
        queue.set(message.queue);
        chat.set(message.chat);
        lastBy = null;
        void applyState(message.state);
        pins.set(message.pins ?? null);
        // Özel emojiler welcome'dan sonra tek tek gelir. Nothing of mine is uploaded automatically (security review 1).
        reactions.clearStickers();
        send({ t: 'recaps' });
        tvRoom?.reportState();
        // Opened from a TV's QR (or a code typed before the room was open): pair it now.
        try {
          const pending = JSON.parse(sessionLoad('tvPair') ?? 'null') as { code: string; at: number } | null;
          sessionSave('tvPair', '');
          if (pending && Date.now() - pending.at < 10 * 60_000) tvRemote?.pairNow(pending.code);
        } catch {
          // Nothing waiting.
        }
        // Ana sayfada "kaydedilen oda" seçilerek kurulduysa: ilk giren (yönetici) adıyla kaydeder.
        {
          const wanted = sessionLoad(`create:${roomId}`);
          if (wanted && message.hostId === message.you && !roomSettings.saved) send({ t: 'settings', saved: true, name: wanted });
          if (wanted) sessionSave(`create:${roomId}`, '');
          // Ana sayfada link yapıştırılarak kurulduysa: oda boşken o video açılır (link kutusunun yolundan geçer:
          // sayfa linkinde eklenti sorusu vb. aynen çalışsın).
          const start = sessionLoad(`start:${roomId}`);
          if (start) {
            sessionSave(`start:${roomId}`, '');
            if (!message.state.item) {
              mediaInput.value = start;
              $<HTMLFormElement>('#media-form').requestSubmit();
            }
          }
        }
        break;
      case 'state': {
        lastBy = message.by;
        void applyState(message.state);
        showCountdown(message.state);
        pins.reset(message.state.item?.id ?? null);
        const { action, by, state } = message;
        if (message.resumed !== undefined) {
          const at = message.resumed;
          addActivity(() => t('resumedAt', { time: formatTime(at) }));
        }
        // Otomatik bekleme hareketleri "waiting" mesajıyla ayrıca anlatılıyor.
        if (by.id === SYSTEM_MEMBER_ID) break;
        const item = state.item;
        if (by.id !== myId && (action === 'play' || action === 'pause' || action === 'seek' || action === 'rate')) {
          showActionNotice(by, t(`action.${action}`, { name: displayName(by), title: '', time: formatTime(state.position), rate: state.rate }));
        }
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
        games.membersChanged();
        break;
      case 'tv':
        tvRoom?.message(message);
        tvRemote?.message(message);
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
      case 'settings': {
        // "Film time" reached: the server clears the plan when the time comes (a host clearing it early is quiet).
        const planned = roomSettings.startsAt;
        if (planned !== undefined && message.settings.startsAt === undefined && clock.now() >= planned - 2000) playSound('filmTime');
        roomSettings = message.settings;
        renderWaiting();
        break;
      }
      case 'bans':
        people.setBans(message.bans);
        break;
      case 'knock-wait':
        // R12: this room asks first; wait at the door until the host answers.
        $('#knock-wait').hidden = false;
        $('#knock-away').hidden = message.hostHere;
        break;
      case 'knocks':
        drawKnocks(message.list);
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
        reactions.addSticker(message.sticker, message.mine === true);
        break;
      case 'sticker-removed':
        reactions.removeSticker(message.id);
        break;
      case 'recap': {
        // Bugünün özeti (oturumun başından şimdiye; sadece isteyene gelir). Son kartta "Kaydet".
        const { recap } = message;
        // The recap's code is loaded when it is first needed (0.9.92.5, speed).
        void import('./ui/recap.ts').then(({ showRecap }) => showRecap(recap, { onSave: () => send({ t: 'recap-save' }) }));
        break;
      }
      case 'recaps':
        recaps = message.recaps;
        void import('./ui/recap.ts').then(({ renderRecapHistory }) => renderRecapHistory($('#recap-history'), recaps));
        break;
      case 'home':
        if (isShell && film !== null) askHome(message.by);
        break;
      case 'game':
        // Old single-game message: the room now sends `tables` too, which carries everything.
        break;
      case 'tables':
        games.setTables(message.tables, { ...(message.opened ? { opened: message.opened } : {}), ...(message.closed ? { closed: message.closed } : {}), ...(message.by ? { by: message.by } : {}) });
        break;
      case 'reaction': {
        if (!settings.options.showReactions) break;
        // Shorts görünümünde emoji atanın avatarından yükselir (koltuğu yoksa videonun üstünde).
        // In the Shorts view emojis rise from the seats beside the video, never over it (YouTube's rules, 0.9.91.18).
        if (shortsOn) {
          const shown = reactions.content(message.emoji, message.sticker);
          if (shown) seats.react(message.by, shown);
        }
        // YouTube (card 2a, owner's D): nothing of ours over the player by itself, so the emoji rises from the sender's
        // face beside the video (or the rail's 😀). Video files and film pages keep emojis over the video.
        else if ($('#theater').classList.contains('yt-rail') && !isShell) reactions.showFrom(reactionAnchor(message.by), message.by, message.emoji, message.sticker);
        else reactions.show(message.by, message.emoji, message.sticker);
        break;
      }
      case 'chat-image':
        chat.setImage(message.id, message.data);
        break;
      case 'chat': {
        const { by } = message.message;
        // Shorts bubbles and corner messages show a picture as 🖼️ (+ its caption).
        const plain = message.message.image ? `🖼️ ${message.message.text}`.trim() : message.message.text;
        const text = message.message.to ? `🔒 ${plain}` : plain;
        chat.add(message.message);
        // Shorts görünümünde mesaj yazanın avatarından baloncukla çıkar.
        if (shortsOn) seats.say(by, text);
        // Tam ekranda (ya da sağ panel gizliyken) sohbet paneli görünmez; mesaj videonun köşesinde belirir.
        if (fullscreen.isActive() || roomEl.classList.contains('cinema')) toasts.show(withAvatar(by), text, by.id === myId);
        if (roomEl.classList.contains('cinema') && by.id !== myId) side.unread();
        // A sound only when the message is nowhere on my screen (another tab, or another panel tab is open).
        const seen = !document.hidden && (fullscreen.isActive() || roomEl.classList.contains('cinema') || shortsOn || tabs.chatShown);
        if (by.id !== myId && !seen) playSound('chat');
        if (by.id !== myId && document.hidden) {
          hiddenUnread++;
          drawTabTitle();
        }
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
        if (message.code === 'game_busy' || message.code === 'tables_full' || message.code === 'table_own') {
          games.refused(message.code);
          break;
        }
        if (message.code === 'cam_full') {
          voice.camFull();
          break;
        }
        if (message.code === 'live_busy' || message.code === 'live_full' || message.code === 'live_host' || message.code === 'live_stopped') {
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
          // BH5: refused at the door is one screen, never the waiting card behind it; and the home page never offers
          // to continue in a room that removed me (pagehide would remember it again).
          $('#knock-wait').hidden = true;
          removedHere = true;
          if (lastRoom()?.id === roomId) forgetLastRoom();
          $('#kicked').hidden = false;
          break;
        }
        if (message.code === 'not_host' && roomState) {
          // Yönetici modu: yaptığım hareket kabul edilmedi, oynatıcı odanın durumuna döner (film sayfasında hareketi
          // oradaki motor yaptı: durum ona yeniden gider).
          if (film) film.setState(roomState);
          else engine.receive(roomState);
        }
        if (message.code === 'tv_token') {
          // This TV's link ended (unlinked, or expired): back to the pairing screen for a new code.
          connection.close();
          clearTvLink();
          location.replace('/tv');
          break;
        }
        if (message.code === 'tv_code' || (message.code === 'rate_limited' && tvRemote)) {
          tvRemote?.error(t(message.code === 'tv_code' ? 'error.tv_code' : 'error.rate_limited'));
          if (message.code === 'tv_code') break;
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
        if (message.code === 'private_gone') chat.privateGone();
        showError(() => t(`error.${message.code}`));
        if (message.code === 'version' || message.code === 'room_full' || message.code === 'knock_busy') connection.close();
        break;
      case 'pong':
        break;
    }
  }

  // ---- Oynatıcı ----
  let currentItemId: string | null = null;
  /** `own`: our bar is this player's remote (the sync test); otherwise the player shows its own controls. */
  let current: { player: PlayerAdapter; slot: HTMLElement; youtube: boolean; own: boolean } | null = null;
  let mediaToken = 0;

  async function applyState(state: PlaybackState): Promise<void> {
    const before = roomState?.item ?? null;
    roomState = state;
    showRate(speedEl, state.rate);
    $('#speed-label').textContent = `${state.rate}×`;
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
    // YouTube → YouTube (every scroll in Shorts): the same player opens the next video, no new iframe. Since
    // 0.9.91.18 every YouTube video (Shorts too) shows YouTube's own bar, so any YouTube player can be reused.
    const next = state.item?.media;
    if (current?.youtube && next?.kind === 'youtube' && current.player.load && !film) {
      const { player } = current;
      const load = current.player.load.bind(current.player);
      engine.detach();
      autoplayEl.hidden = true;
      showError(null);
      engine.receive(state);
      emptyEl.hidden = true;
      externalEl.hidden = true;
      await load(next.id);
      if (token !== mediaToken || current?.player !== player) return;
      engine.attach(player);
      measureSwitch(state, player, token);
      reportLayout();
      return;
    }
    engine.detach();
    closeCurrent();
    autoplayEl.hidden = true;
    showError(null);
    engine.receive(state);
    emptyEl.hidden = state.item !== null;
    tvRoom?.empty(state.item === null ? t('tv.emptyNone') : state.item.media.kind === 'page' ? t('tv.emptyPage') : null);
    // Phones hide the link box while something plays (the toolbar's ＋ brings it back).
    $('.room').classList.toggle('has-item', state.item !== null);
    // Card 6 (owner's pick D): until the room's first video plays, only add a video, invite, chat and join voice show.
    if (state.item !== null) $('.room').classList.remove('fresh');
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
          : media.kind === 'tiktok'
            ? await createTikTokPlayer(slot, media.id, onError)
            : media.kind === 'vimeo'
              ? await createVimeoPlayer(slot, media.id, media.hash, onError)
              : media.kind === 'test'
                ? createTestPlayer(slot)
                : createHtml5Player(slot, media.url, onError, media.poster);
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
    // Our bar is the remote of the sync test only. YouTube (Shorts too, 0.9.91.18) keeps its own bar: YouTube's rules
    // forbid anything of ours in front of its player (owner: "in Shorts too, its player; our menu is at the bottom").
    current = { player, slot, youtube: media.kind === 'youtube', own: media.kind === 'test' };
    // YouTube: our rail sits beside the video, never on it (0.9.92.8, YouTube's rule, owner's pick 2A / 4A).
    $('#theater').classList.toggle('yt-rail', media.kind === 'youtube');
    engine.attach(player);
    if (mutedForTv) player.setMuted?.(true);
    measureSwitch(state, player, token);
    reportLayout();
  }

  /**
   * "Does everyone land on the next Short together?" (0.9.91.18, ROADMAP; measured in the owner's Chrome, the cloud
   * can't play YouTube): with `?measure=1` (or the old `?olcum=1`) once in this tab, the Shorts view shows how long after the room switched
   * (server time) this video really started moving. Two people compare their numbers; the difference is how far
   * apart they landed. Nothing is sent anywhere.
   */
  const measureOn = (() => {
    try {
      // The tab's storage key stays `olcum` (kept on purpose: nothing saved may break).
      const query = new URLSearchParams(location.search);
      if (query.has('measure') || query.has('olcum')) sessionStorage.setItem('olcum', '1');
      return sessionStorage.getItem('olcum') === '1';
    } catch {
      return false;
    }
  })();
  const measured: number[] = [];
  function measureSwitch(state: PlaybackState, player: PlayerAdapter, token: number): void {
    if (!measureOn || !state.item || state.paused) return;
    const from = player.getTime();
    const started = Date.now();
    const look = () => {
      if (token !== mediaToken) return;
      if (!player.isPaused() && player.getTime() > from + 0.05) {
        const lag = Math.max(0, Math.round(clock.now() - state.updatedAt));
        measured.push(lag);
        if (measured.length > 5) measured.shift();
        const average = Math.round(measured.reduce((a, b) => a + b, 0) / measured.length);
        const badge = $('#shorts-measure');
        badge.hidden = false;
        badge.textContent = `⏱ ${lag} ms · ø ${average}`;
        return;
      }
      if (Date.now() - started < 15_000) setTimeout(look, 40);
    };
    look();
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
      $('#theater').classList.remove('yt-rail');
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
      onKey: (key, up) => document.dispatchEvent(new KeyboardEvent(up ? 'keyup' : 'keydown', { key, bubbles: true, cancelable: true })),
      onFullscreen: () => {
        if (!fullscreen.isActive()) fullscreen.toggle();
      },
      onActivity: (edge) => fullscreen.poke(edge),
    });
    current = { player, slot, youtube: false, own: false };
    $('#theater').classList.remove('yt-rail');
    film = player;
    if (roomState) player.setState(roomState);
    player.setClock(clock.now() - Date.now(), clock.synced);
    renderNowPlaying();
  }
  // Film çerçevesindeki motor sunucu saatini sitenin ölçümünden alır.
  setInterval(() => film?.setClock(clock.now() - Date.now(), clock.synced), 2000);

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
    playSound('homeCall');
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
      // Card 2: the rail is a column beside the film, so the film is fitted into the player's box left of it (never
      // under the rail); islands are clipped to that box too (the rail outside it is part of the overlay anyway).
      const box = $('#theater').classList.contains('side-rail') ? $('#player').getBoundingClientRect() : wrap.getBoundingClientRect();
      // Option A (0.9.91.1): the film always fills the hole with its own player bar; in fullscreen our dock on the
      // right is an island, nothing of ours covers the bottom of the film.
      const bottom = box.bottom;
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
        if (child.id === 'player') continue;
        // Free camera tiles (0.9.90.5): their box covers the video and lets clicks through; each tile and the pill is
        // its own island.
        if (child.classList.contains('free')) {
          for (const node of child.querySelectorAll<HTMLElement>('[data-island]')) {
            const r = node.getBoundingClientRect();
            if (r.width > 0) add(islands, r.left, r.top, r.right, r.bottom);
          }
          continue;
        }
        // The film player is clicked through the hole: our catcher and bar belong to the site's own players only.
        if (child.id === 'fs-catcher' || child.id === 'fs-controls' || child.id === 'rail-edge') continue;
        // The dock and its open window (message box, emojis, speed) to its left.
        if (child.id === 'fs-dock') {
          // Hidden with the film's own bar (0.9.91.5): then the film takes the clicks there, and a mouse move on the
          // film brings the dock back (the film page reports it).
          if ($('#theater').classList.contains('dock-idle')) continue;
          for (const node of [child, ...child.querySelectorAll<HTMLElement>('.dock-pop:not([hidden])')]) {
            const r = node.getBoundingClientRect();
            if (r.width > 0) add(islands, r.left, r.top, r.right, r.bottom);
          }
          continue;
        }
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
      // Deliğin dışından deliğin üstüne açılan küçük pencereler (emoji tepsisi, hız, oyun menüsü, kamera pencereleri).
      for (const node of document.querySelectorAll<HTMLElement>('[data-island]')) {
        if (wrap.contains(node) || node.closest('[hidden]')) continue;
        const r = node.getBoundingClientRect();
        if (r.width > 0) add(islands, r.left, r.top, r.right, r.bottom);
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
      const modal = document.querySelector('.dialog-backdrop:not([hidden]), .recap-backdrop, dialog[open], .profile-pop:not([hidden])') !== null;
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
  /** The film card on screen, so it can be drawn again when the extension arrives (see below). */
  let externalShown: { item: QueueItem; url: string } | null = null;
  // Installed while this room was open (0.9.91.20): the extension's bridge comes into this tab by itself, and the card
  // turns into "Go to the film" without a reload.
  new MutationObserver(() => {
    if (!hasExtension() || !externalShown || externalEl.hidden) return;
    showExternal(externalShown.item, externalShown.url, false);
    flashHint($('#external-go'), t('extensionArrived'), 5000);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-swm-extension'] });

  function showExternal(item: QueueItem, url: string, auto: boolean): void {
    externalShown = { item, url };
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
      else {
        postToExtension({ type: 'go', roomId, url });
        // An extension that was updated/reloaded while this tab was open leaves a dead bridge behind that never
        // answers; without this the button would stay on "Taking you to the film…" forever.
        if (goTimer !== null) clearTimeout(goTimer);
        goTimer = setTimeout(() => {
          goTimer = null;
          if (go.disabled) extensionStale();
        }, 4000);
      }
    };
    // Kendim açtıysam beklemeden gideriz; başkası açtıysa herkes "Filme git" ile kendisi gider.
    if (auto && shellOk) go.click();
  }

  let goTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * The extension couldn't take this tab to the film. Almost always the extension was updated or reloaded while
   * this page was open (Chrome cuts the old page off from it), so reloading the page is the fix — not reinstalling.
   */
  function extensionStale(): void {
    const note = $('#external-note');
    note.hidden = false;
    note.textContent = t('extensionStale');
    const go = $<HTMLButtonElement>('#external-go');
    go.hidden = false;
    go.disabled = false;
    go.textContent = `⟳ ${t('reloadPage')}`;
    go.onclick = () => location.reload();
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
    if (message.type === 'going') {
      if (goTimer !== null) clearTimeout(goTimer);
      goTimer = null;
      if (!message.ok) extensionStale();
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
    // Card 2b: the film's box narrows and widens with the rail (a CSS transition): report every step, so the film follows.
    new ResizeObserver(() => reportLayout()).observe($('#player'));
    // …and once more when the slide ends, so the last step is never lost.
    $('#player').addEventListener('transitionend', () => reportLayout());
    // Tam ekran kontrolleri bekleyince kaybolur (theater.idle): adacıkları da kalksın, video tıklanabilsin.
    new MutationObserver(() => reportLayout()).observe($('#theater'), { attributes: true, attributeFilter: ['class'] });
    // Araç çubuğundan açılan pencereler (tepsi, hız, oyun menüsü) deliğin üstüne biner: açılınca hemen bildir.
    new MutationObserver(() => reportLayout()).observe($('.toolbar'), { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
    // Lower the film while someone in voice is really talking (off by default since 0.9.83, owner's decision:
    // a click used to lower it too). Back to normal 1 s after they stop. New key so the old default doesn't stick.
    const duckBox = $<HTMLInputElement>('#opt-duck');
    duckBox.checked = load('opt:duck2') === '1';
    duckBox.addEventListener('change', () => save('opt:duck2', duckBox.checked ? '1' : '0'));
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
    // If the room view scrolls anyway (very small window), the hole moves: follow it every frame while scrolling.
    // The layout below is sized so that it normally fits the window and never scrolls (the film video can only
    // follow the hole a few frames late, which looked like the video sliding out of its frame).
    let scrollFrame = 0;
    addEventListener(
      'scroll',
      () => {
        if (scrollFrame) return;
        scrollFrame = requestAnimationFrame(() => {
          scrollFrame = 0;
          reportLayout();
        });
      },
      { passive: true },
    );
    // Yüzen kamera penceresi sürüklenirken/boyutlanırken (cam-float.ts) adacık hemen yer değiştirsin.
    addEventListener('swm-layout', reportLayout);
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
    // Windows that stay in the page and only lose `hidden` (⚙️ settings, the person menu…) too, at once: otherwise the
    // once-a-second check found them and the film covered the window for up to a second (owner's report).
    const MODAL = '.dialog-backdrop, .recap-backdrop, dialog, .profile-pop';
    new MutationObserver((mutations) => {
      if (mutations.some((m) => m.target instanceof Element && m.target.matches(MODAL))) reportLayout();
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden', 'open'] });
    /** Icon + label (the label hides on phones). */
    const toolLabel = (button: HTMLElement, icon: string, text: string) =>
      button.replaceChildren(el('span', { 'aria-hidden': 'true' }, icon), el('span', { class: 'shell-tool-text' }, text));
    const homeButton = el('button', { type: 'button', class: 'nav-link shell-home' });
    toolLabel(homeButton, '🏠', t('shellBack'));
    homeButton.title = t('shellBack');
    homeButton.addEventListener('click', goHome);
    // The film-page tools sit together in the middle of the top bar (owner: easier to notice than among the buttons
    // on the right). The group takes the free space between the room title and the right-hand buttons.
    const shellTools = el('div', { class: 'shell-tools', role: 'toolbar' }, homeButton);
    document.querySelector('.topbar-right')?.before(shellTools);
    // 👁 Sayfayı göster: geçiş reklamı, açılır pencere ya da videonun önünü kapatan bir şey varsa film sayfası olduğu
    // gibi görünür (üstte ince şerit kalır), kullanıcı kapatır, "Oda görünümü" ile geri gelir.
    const peekButton = el('button', { type: 'button', class: 'nav-link shell-peek' });
    const peekBack = el('button', { type: 'button', class: 'btn small-btn primary' }, t('peekBack'));
    const peekText = el('span', { class: 'peek-text' }, t('peekStrip'));
    const peekStrip = el('div', { class: 'peek-strip' }, peekText, peekBack);
    peekStrip.hidden = true;
    document.body.append(peekStrip);
    // 🎯 Video seç: otomatik seçim yanlış videoyu (fragman, önizleme, reklam) tuttuysa film sayfası açılır, her videonun
    // üstünde "Bunu senkronla" düğmesi çıkar; seçilince oda görünümüne dönülür.
    const pickButton = el('button', { type: 'button', class: 'nav-link shell-pick' });
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
    shellTools.append(peekButton, pickButton);
    const labelPeek = () => {
      toolLabel(peekButton, '👁', t('peek'));
      peekButton.title = t('peekTitle');
      toolLabel(pickButton, '🎯', t('pick'));
      pickButton.title = t('pickTitle');
      peekBack.textContent = t(peek === 'pick' ? 'pickCancel' : 'peekBack');
      peekText.textContent = t(peek === 'pick' ? 'pickStrip' : 'peekStrip');
    };
    labelPeek();
    window.addEventListener('langchange', () => {
      toolLabel(homeButton, '🏠', t('shellBack'));
      homeButton.title = t('shellBack');
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
  // ---- Endless Shorts feed (0.9.91): a topic keeps the queue full of Shorts (YouTube search, Shorts only). ----
  const feedButton = $<HTMLButtonElement>('#shorts-feed');
  const feedForm = $<HTMLFormElement>('#shorts-feed-form');
  const feedTopic = $<HTMLInputElement>('#shorts-feed-topic');
  const feed = createShortsFeed({
    roomId,
    queueItems: () => queue.items,
    current: () => roomState?.item ?? null,
    canAdd: () => !(roomSettings.lockQueue && !amHost()),
    add: (media) => send({ t: 'enqueue', media }),
    remove: (itemId) => send({ t: 'dequeue', id: itemId }),
    note: (text) => flashHint(shortsOn ? feedButton : mediaInput, text, 5000),
    changed: () => renderFeed(),
  });
  function renderFeed(): void {
    const topic = feed.topic;
    feedButton.classList.toggle('on', topic !== null);
    feedButton.setAttribute('aria-pressed', String(topic !== null));
    $('#shorts-feed-label').textContent = topic ?? t('feed.short');
    feedButton.title = topic ? t('feed.stopHint', { topic }) : t('feed.hint');
    // A running feed is shown at the top of its window with a stop button (0.9.92.6, owner: pressing ♾ used to stop
    // it without a word; now it always opens the window, the feed stops only from there).
    $('#shorts-feed-now').hidden = topic === null;
    $('#shorts-feed-now-text').textContent = topic ? t('feed.now', { topic }) : '';
  }
  feedButton.addEventListener('click', () => {
    feedForm.hidden = !feedForm.hidden;
    renderFeed();
    // Not on a phone: the keyboard would cover the window before the person chose anything.
    if (!feedForm.hidden && !isPhoneLayout()) feedTopic.focus();
  });
  $('#shorts-feed-stop').addEventListener('click', () => {
    feed.stop();
    feedForm.hidden = true;
  });
  $('#shorts-feed-close').addEventListener('click', () => (feedForm.hidden = true));
  // "🎲 Keşfet" (0.9.91.18): one tap starts an endless feed from today's shared pool of a category.
  const pools = $('#shorts-pools');
  // Card 10 (owner's pick A): Discover shows the viewer's country by default ("🌍 Auto": the server uses the
  // connection's country, never stored), or a chosen one, or the whole world. Remembered in this browser.
  const regionSelect = $<HTMLSelectElement>('#shorts-region');
  const savedRegion = load('opt:poolRegion');
  let poolRegion: PoolRegionChoice = isPoolRegionChoice(savedRegion) ? savedRegion : 'auto';
  regionSelect.addEventListener('change', () => {
    poolRegion = isPoolRegionChoice(regionSelect.value) ? regionSelect.value : 'auto';
    save('opt:poolRegion', poolRegion);
  });
  const renderPools = () => {
    const names = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames([lang()], { type: 'region' }) : null;
    regionSelect.replaceChildren(
      el('option', { value: 'auto' }, `🌍 ${t('feed.regionAuto')}`),
      el('option', { value: 'world' }, `🌐 ${t('feed.regionWorld')}`),
      ...POOL_REGIONS.map((code) => el('option', { value: code }, names?.of(code) ?? code)),
    );
    regionSelect.value = poolRegion;
    pools.replaceChildren(
      ...POOL_KINDS.map((kind) => {
        const chip = el('button', { type: 'button', class: 'feed-pool', 'data-pool': kind }, t(`pool.${kind}`));
        chip.addEventListener('click', () => {
          feedForm.hidden = true;
          feed.start(t(`pool.${kind}`), { kind: 'pool', pool: kind, region: poolRegion });
        });
        return chip;
      }),
    );
  };
  renderPools();
  window.addEventListener('langchange', renderPools);
  // "✨ Bunun gibi": more from the playing Short's channel, then Shorts with similar titles.
  $('#shorts-like').addEventListener('click', () => {
    const media = roomState?.item?.media;
    feedForm.hidden = true;
    if (media?.kind !== 'youtube' || !media.short) return flashHint(feedButton, t('feed.likeNone'), 4000);
    feed.start(t('feed.likeLabel'), { kind: 'like', id: media.id });
  });
  feedForm.addEventListener('submit', (event) => {
    event.preventDefault();
    feedForm.hidden = true;
    // Card 10: a channel link or @handle follows that channel's Shorts; words stay a topic search.
    const channel = parseChannelInput(feedTopic.value);
    if (channel) feed.start('id' in channel ? t('feed.channel') : `@${channel.handle}`, { kind: 'channel', c: channelParam(channel) });
    else feed.start(feedTopic.value);
    feedTopic.value = '';
  });
  document.addEventListener('pointerdown', (event) => {
    if (!feedForm.hidden && !(event.target as Element).closest?.('.shorts-feed-wrap')) feedForm.hidden = true;
    if (!shortsAddForm.hidden && !(event.target as Element).closest?.('.shorts-add-wrap')) setShortsAdd(false);
  });
  // Add to the queue from the Shorts bar (0.9.91.5, owner: without going back to the room view). Links only, one or
  // many (searching is the ♾ feed's job); the same paths as the link box.
  const shortsAdd = $<HTMLButtonElement>('#shorts-add');
  const shortsAddForm = $<HTMLFormElement>('#shorts-add-form');
  const shortsAddInput = $<HTMLInputElement>('#shorts-add-input');
  const setShortsAdd = (open: boolean) => {
    shortsAddForm.hidden = !open;
    shortsAdd.setAttribute('aria-expanded', String(open));
    if (open) {
      feedForm.hidden = true;
      shortsAddInput.focus();
    }
  };
  shortsAdd.addEventListener('click', () => setShortsAdd(shortsAdd.getAttribute('aria-expanded') !== 'true'));
  $('#shorts-add-close').addEventListener('click', () => setShortsAdd(false));
  // Like the ♾ window: a press elsewhere or Esc closes it (on a phone its button is in the ⋯ sheet, 0.9.92.4).
  document.addEventListener('pointerdown', (event) => {
    if (!shortsAddForm.hidden && !(event.target as Element).closest?.('.shorts-add-wrap')) setShortsAdd(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !shortsAddForm.hidden) setShortsAdd(false);
  });
  const shortsSearch = createShortsSearch($('#shorts-add-results'), (id) => {
    addMedia({ kind: 'youtube', id, short: true }, 'enqueue');
    flashHint(shortsAdd, t('queuedNote'), 2000);
  });
  shortsAddForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (isTikTokShortLink(shortsAddInput.value)) {
      void resolveTikTok(shortsAddInput.value, shortsAdd).then((media) => {
        if (!media) return;
        shortsAddInput.value = '';
        setShortsAdd(false);
        addMedia(media, 'enqueue');
        flashHint(shortsAdd, t('queuedNote'), 2500);
      });
      return;
    }
    const list = parseMediaList(shortsAddInput.value);
    const one = list.media.length === 1 ? list.media[0]! : parseMediaInput(shortsAddInput.value);
    if (list.media.length < 2 && one === null) {
      // Words: a search of YouTube Shorts only (0.9.91.12); the box stays open to add from the list.
      if (shortsAddInput.value.trim()) void shortsSearch.search(shortsAddInput.value);
      return;
    }
    shortsSearch.clear();
    shortsAddInput.value = '';
    setShortsAdd(false);
    if (list.media.length >= 2) addMany(list.media, list.skipped, 'enqueue');
    else addMedia(one!, 'enqueue');
    flashHint(shortsAdd, list.media.length >= 2 ? t('queuedMany', { n: list.media.length, skipped: list.skipped }) : t('queuedNote'), 2500);
  });
  addEventListener('langchange', renderFeed);
  renderFeed();

  const seats = createSeats($('#seats-l'), $('#seats-r'));
  showSeatCams = (cams) => seats.setCams(cams, myId);
  showSeatCams(seatCams);
  /** Shorts açıkken oda görünümünü seçtim (bu sekmede hatırlanır; "Shorts görünümü" ile geri dönülür). */
  let shortsOff = sessionLoad(`shortsOff:${roomId}`) === '1';
  /** Shorts görünümü açık mı (geçiş animasyonu sürerken bile yeni değer). */
  let shortsOn = false;
  /** Bu sekmede oynayan Shorts'lar: yeni video bunlardan biriyse (↑ ile dönüldü) yukarıdan kayarak gelir. */
  const seenShorts: string[] = [];

  /** Upright videos open the Shorts view: YouTube Shorts and every TikTok (0.9.91.18). */
  function isShortItem(item: QueueItem | null | undefined): boolean {
    return (item?.media.kind === 'youtube' && item.media.short === true) || item?.media.kind === 'tiktok';
  }

  /** Thumbnails of the next short already fetched (0.9.90.7): the cued player shows it at once after a scroll. */
  const warmed = new Set<string>();
  function warmNextShort(): void {
    const next = queue.first?.media;
    if (next?.kind !== 'youtube' || warmed.has(next.id)) return;
    warmed.add(next.id);
    new Image().src = `https://i.ytimg.com/vi/${encodeURIComponent(next.id)}/hqdefault.jpg`;
  }

  function renderShorts(): void {
    const short = isShortItem(roomState?.item);
    if (short) warmNextShort();
    feed.tick();
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
    // Owner (30 Oct 2026): someone opened a Short while I watched in fullscreen; the Short played in fullscreen and
    // I never noticed the Shorts view. Leave fullscreen so the view switches (the TV keeps its pinned fullscreen).
    if (shortsOn && fullscreen.isActive() && !document.documentElement.classList.contains('tv-mode')) fullscreen.toggle();
    // Sınıflar o anki değere göre: art arda iki değişiklikte geç kalan geçiş eski hâli geri getirmesin.
    const apply = () => {
      roomEl.classList.toggle('shorts', shortsOn);
      document.documentElement.classList.toggle('shorts-view', shortsOn);
      if (!shortsOn) document.documentElement.classList.remove('topbar-peek');
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
    // Oyun açıkken oklar oyunundur (video değişmesin).
    if (!shortsOn || games.isOpen() || event.repeat || event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
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
      if (!shortsOn || games.isOpen() || Math.abs(event.deltaY) < 20 || (event.target as Element).closest('.reaction-bar, .shorts-chat')) return;
      event.preventDefault();
      if (Date.now() - wheelAt < 900) return;
      wheelAt = Date.now();
      if (event.deltaY > 0) shortsNext($('#shorts-next'));
      else shortsPrev($('#shorts-prev'));
    },
    { passive: false },
  );
  // Phones: swipe up = next short, swipe down = previous (on the video or around it; not on the chat or emoji bar).
  let touchStart: { x: number; y: number; at: number } | null = null;
  $('.stage').addEventListener(
    'touchstart',
    (event) => {
      const touch = event.touches[0];
      touchStart =
        shortsOn && !games.isOpen() && event.touches.length === 1 && touch && !(event.target as Element).closest('.reaction-bar, .shorts-chat, input, button')
          ? { x: touch.clientX, y: touch.clientY, at: Date.now() }
          : null;
    },
    { passive: true },
  );
  $('.stage').addEventListener(
    'touchend',
    (event) => {
      const start = touchStart;
      touchStart = null;
      const touch = event.changedTouches[0];
      if (!start || !touch || Date.now() - start.at > 800) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      // A real vertical swipe: long enough and more up/down than sideways.
      if (Math.abs(dy) < 60 || Math.abs(dy) < Math.abs(dx) * 1.5) return;
      if (dy < 0) shortsNext($('#shorts-next'));
      else shortsPrev($('#shorts-prev'));
    },
    { passive: true },
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
  // ---- Shorts rail (0.9.92.2, owner chose C): on wide screens the bar is a column right of the video, so the message
  // box is a small window opened by 💬 (or Enter), and on short screens the top bar folds away (⋯ brings it back). ----
  const shortsChatWrap = $('.shorts-chat-wrap');
  function setShortsChat(open: boolean): void {
    shortsChatWrap.classList.toggle('open', open);
    $('#shorts-chat-btn').setAttribute('aria-expanded', String(open));
    if (open) $('#shorts-input').focus();
  }
  $('#shorts-chat-btn').addEventListener('click', () => setShortsChat(!shortsChatWrap.classList.contains('open')));
  $('#shorts-input').addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setShortsChat(false);
    $('#shorts-input').blur();
  });
  const rootEl = document.documentElement;
  const foldedTop = matchMedia('(min-width: 861px) and (max-height: 899px)');
  const peekTop = (on: boolean) => {
    rootEl.classList.toggle('topbar-peek', on);
    $('#shorts-more').setAttribute('aria-expanded', String(on));
  };
  $('#shorts-more').addEventListener('click', () => peekTop(!rootEl.classList.contains('topbar-peek')));
  document.addEventListener('pointerdown', (event) => {
    const target = event.target as Element | null;
    if (!target) return;
    if (shortsChatWrap.classList.contains('open') && !shortsChatWrap.contains(target)) setShortsChat(false);
    if (rootEl.classList.contains('topbar-peek') && !target.closest('.topbar, #shorts-more, .profile-pop, .dialog-backdrop, .recap-backdrop, dialog')) {
      peekTop(false);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && rootEl.classList.contains('topbar-peek') && !document.querySelector('.profile-pop:not([hidden]), .dialog-backdrop:not([hidden])')) peekTop(false);
  });
  // The mouse at the very top of a folded screen shows the top bar too (as a fullscreen video's bar does).
  document.addEventListener('pointermove', (event) => {
    if (event.clientY <= 2 && shortsOn && foldedTop.matches && !rootEl.classList.contains('topbar-peek')) peekTop(true);
  });
  // A window opened from the rail (emojis, add, feed, games, the message box) stays on screen: it opens right of the
  // rail and slides back in when the window is too small for it.
  const shortsBar = $('#shorts-bar');
  const RAIL_POPS = '.react-tray, .shorts-feed-pop, .game-menu, #shorts-chat';
  let fitting = 0;
  const fitRailPops = () => {
    cancelAnimationFrame(fitting);
    fitting = requestAnimationFrame(() => {
      for (const pop of shortsBar.querySelectorAll<HTMLElement>(RAIL_POPS)) {
        pop.style.translate = '';
        if (!shortsOn || pop.offsetParent === null || getComputedStyle(pop).position !== 'absolute') continue;
        const box = pop.getBoundingClientRect();
        const dx = Math.min(0, innerWidth - 8 - box.right);
        const dy = box.bottom > innerHeight - 8 ? Math.max(8 - box.top, innerHeight - 8 - box.bottom) : box.top < 8 ? 8 - box.top : 0;
        if (dx || dy) pop.style.translate = `${dx}px ${dy}px`;
      }
    });
  };
  // childList too: search results arrive after the window opened and make it taller.
  new MutationObserver(fitRailPops).observe(shortsBar, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class'] });
  addEventListener('resize', fitRailPops);
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
    const rate = Math.min(wanted, maxRateFor(roomState?.item?.media));
    if (film) film.control({ action: 'rate', rate });
    else engine.requestRate(rate);
  };
  speedEl.addEventListener('change', () => requestRate(Number(speedEl.value)));
  // Hız düğmesi "⏩ 1×": basınca küçük pencere (hazır hızlar + ince ayar). Dışarı tıklayınca / Esc ile kapanır.
  {
    const button = $<HTMLButtonElement>('#speed-btn');
    const pop = $('#speed-pop');
    const setOpen = (open: boolean) => {
      pop.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
    };
    button.addEventListener('click', () => setOpen(pop.hidden === true));
    document.addEventListener('pointerdown', (event) => {
      const target = event.target as Element | null;
      if (!pop.hidden && target && !pop.contains(target) && !button.contains(target)) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !pop.hidden) setOpen(false);
    });
  }
  // İnce hız ayarı: her basış ±0.05 (hazır seçeneklerin dışındaki hız listede "özel" olarak görünür).
  $('#speed-down').addEventListener('click', () => requestRate(stepRate(roomState?.rate ?? 1, -1)));
  $('#speed-up').addEventListener('click', () => requestRate(stepRate(roomState?.rate ?? 1, 1)));

  // ---- Tam ekran: sadece video kalır, fare oynayınca kontroller ve hızlı mesaj belirir. ----
  const fullscreen = createFullscreen({
    shell: isShell,
    theater: $('#theater'),
    getPlayer: () => current?.player ?? null,
    // Our bar is the remote only for Shorts and the sync test; everything else keeps its own controls (option A) and
    // gets the dock in fullscreen.
    ownControls: () => current?.own === true,
    onActive: () => reportLayout(),
    landscape: () => !isShortItem(roomState?.item),
    send,
    onSkip: skip,
    onRate: requestRate,
  });
  const toasts = createToasts($('#toasts'), $('#fs-chat'), $('#fs-dock'));
  if (tv) {
    // The room on a TV: always "fullscreen", the remote's basics only (see ui/tv-room.ts).
    fullscreen.pin();
    tvRoom = tvModules!.room.createTvRoom({
      theater: $('#theater'),
      togglePlay: () => {
        const player = current?.player;
        if (!player) return;
        if (player.isPaused()) void player.play();
        else player.pause();
      },
      react: (emoji) => send({ t: 'react', emoji }),
      tell: (op, value) => send(value === undefined ? { t: 'tv', op } : { t: 'tv', op, value }),
      voice,
      myId: () => myId,
      syncStats: () => engine.syncStats(),
      leave: () => {
        connection.close();
        voice.leave();
        clearTvLink();
        location.replace('/tv');
      },
    });
  } else if (!isShell && tvModules) {
    // This device as my TV's remote: "📺" pairs a TV, the card appears while my TV is in the room.
    tvRemote = tvModules!.remote.createTvRemote({
      send,
      voice,
      onPresent: (present) => {
        mutedForTv = present;
        current?.player.setMuted?.(present);
      },
    });
    $('.side').prepend(tvRemote.card);
    const tvButton = el('button', { type: 'button', id: 'tv-btn', class: 'btn small-btn tv-pair-btn' }, el('span', { 'aria-hidden': 'true' }, '📺'), el('span', { class: 'invite-text' }));
    const labelTv = () => {
      (tvButton.lastElementChild as HTMLElement).textContent = t('tv.button');
      tvButton.title = t('tv.buttonTitle');
    };
    labelTv();
    addEventListener('langchange', labelTv);
    tvButton.addEventListener('click', () => tvRemote?.open());
    // Pairing a TV is a phone's job (it becomes the remote, owner's feedback): no TV button on a computer.
    if (isTouch()) document.querySelector('.topbar-right')?.prepend(tvButton);
  }
  // 5B (0.9.92.9, owner's pick): with YouTube the room's notes and cards (everyone-ready wait, sync badge, game
  // invite, "start the next one") sit in the chat panel just above the message box (next to the newest lines), or
  // above the video while the side panel is hidden, never over the player. Fullscreen, the Shorts view, video files and film pages keep them on the video.
  const noticeChat = el('div', { class: 'yt-notices' });
  $('#chat-list').after(noticeChat);
  const noticeTop = el('div', { class: 'yt-notices yt-notices-top' });
  $('.player-wrap').before(noticeTop);
  const NOTICES = '#waiting-banner, #sync-badge, #game-invite, .end-card, .countdown';
  function placeNotices(): void {
    const wrap = $('.player-wrap');
    const youtube = $('#theater').classList.contains('yt-rail') && !isShell && !document.documentElement.classList.contains('shorts-view');
    // Card R15 (owner): in fullscreen the notes sit on the video, YouTube too, as for video files.
    const target = !youtube || fullscreen.isActive() ? wrap : roomEl.classList.contains('side-hidden') ? noticeTop : noticeChat;
    for (const box of [wrap, noticeChat, noticeTop]) {
      if (box === target) continue;
      for (const node of box.querySelectorAll<HTMLElement>(`:scope > :is(${NOTICES})`)) target.append(node);
    }
    // Card A11y / sweep (Planner-approved): on a computer with the side panel the "can't be played" line sits above
    // the message box too; under the video it made the room scroll by its height.
    const errInChat = !isShell && !isPhoneLayout() && innerWidth > 860 && !roomEl.classList.contains('side-hidden') && !fullscreen.isActive() && !shortsOn;
    if (errInChat && playerErrorEl.parentElement !== noticeChat) noticeChat.append(playerErrorEl);
    else if (!errInChat && playerErrorEl.parentElement !== errHome) errHome.insertBefore(playerErrorEl, errNext);
  }
  const errHome = playerErrorEl.parentElement!;
  const errNext = playerErrorEl.nextSibling;
  addEventListener('resize', placeNotices);
  const watchNotices = new MutationObserver(placeNotices);
  watchNotices.observe($('.player-wrap'), { childList: true });
  watchNotices.observe($('#theater'), { attributes: true, attributeFilter: ['class'] });
  watchNotices.observe(roomEl, { attributes: true, attributeFilter: ['class'] });
  watchNotices.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('fullscreenchange', placeNotices);


  /**
   * Where a YouTube emoji rises from (card 2a): the sender's face when the faces are on screen; in fullscreen or with
   * the side panel hidden, the rail's 😀 (the rail shows for a moment); otherwise the faces row itself.
   */
  function reactionAnchor(by: Member): HTMLElement {
    const visible = (node: HTMLElement | null) => (node && node.getBoundingClientRect().width > 0 ? node : null);
    if (fullscreen.isActive() || roomEl.classList.contains('cinema')) {
      fullscreen.showRail();
      const react = visible($('#dock-react'));
      if (react) return react;
    }
    const face = visible(document.querySelector<HTMLElement>(`#voice-people .voice-face[data-voice-id="${CSS.escape(by.id)}"]`));
    return face ?? visible($('#voice-people')) ?? visible($('#dock-react')) ?? $('.together-card');
  }

  // Cinema mode (card 14, Design's notes `docs/internal/design/cinema-mode.md`): the old ⇥ "hide the side panel". The
  // page around the video goes dark, the video takes the largest 16:9 beside the rail, the top bar waits at the top
  // edge, chat comes as a strip under the video with a count on 💬. Rail ⋯ / T toggle it, Esc leaves; this tab only;
  // computers only (phones already watch edge to edge), not on the film page or in the Shorts view.
  const cinemaKey = `cinema:${roomId}`;
  const cinemaOk = () => !isShell && !isPhoneLayout() && hasMouse() && !shortsOn;
  let sideHidden = !isShell && sessionLoad(cinemaKey) === '1';
  const side = (() => {
    const button = $<HTMLButtonElement>('#side-toggle');
    const badge = el('span', { class: 'badge cinema-badge' });
    $('#dock-chat').append(badge);
    const edge = el('div', { id: 'cinema-edge', class: 'cinema-edge', 'aria-hidden': 'true' });
    const topbar = document.querySelector<HTMLElement>('.topbar');
    document.body.append(edge);
    let unread = 0;
    let peekTimer = 0;
    button.hidden = isShell;
    const render = () => {
      const on = sideHidden && cinemaOk();
      roomEl.classList.toggle('side-hidden', on);
      roomEl.classList.toggle('cinema', on);
      document.documentElement.classList.toggle('cinema-on', on);
      $('#side-icon').textContent = '🎞';
      const label = t(on ? 'sideShow' : 'sideHide');
      button.title = label;
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', String(on));
      badge.hidden = !on || unread === 0;
      badge.textContent = unread > 9 ? '9+' : String(unread);
      $('#dock-more-side').textContent = label;
    };
    const set = (on: boolean) => {
      if (on && !cinemaOk()) return;
      // Card R4: cinema mode is a view of the page, so from fullscreen it first leaves fullscreen (it used to switch on
      // unseen behind the fullscreen video).
      if (on && fullscreen.isActive()) fullscreen.toggle();
      sideHidden = on;
      unread = 0;
      sessionSave(cinemaKey, on ? '1' : '0');
      render();
      const seen = Number(load('cinemaHint') ?? 0);
      if (on && seen < 2) {
        save('cinemaHint', String(seen + 1));
        flashHint($('.player-wrap'), t('cinemaHint'), 1800);
      }
    };
    button.addEventListener('click', () => set(!sideHidden));
    $('#dock-chat').addEventListener('click', () => {
      unread = 0;
      render();
    });
    const busy = () => document.querySelector('.dialog-backdrop:not([hidden]), .dock-pop:not([hidden]), .profile-pop:not([hidden]), .room-more-pop:not([hidden]), .react-tray:not([hidden]), .game-menu:not([hidden])') !== null;
    // Capture phase: Esc leaves only when nothing else is open (a window's own Esc runs after and closes it first).
    addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      if (event.key.toLowerCase() === 't' && !event.repeat && cinemaOk() && !busy()) {
        event.preventDefault();
        // In fullscreen T always means "cinema mode" (out of fullscreen into it).
        set(fullscreen.isActive() ? true : !sideHidden);
      } else if (fullscreen.isActive()) {
        return;
      } else if (event.key === 'Escape' && sideHidden && roomEl.classList.contains('cinema') && !busy()) {
        event.preventDefault();
        set(false);
      }
    }, true);
    const peek = (on: boolean) => {
      clearTimeout(peekTimer);
      if (on) document.documentElement.classList.add('cinema-peek');
      else
        peekTimer = window.setTimeout(() => {
          if (topbar?.matches(':hover') || document.querySelector('.profile-pop:not([hidden]), .room-more-pop:not([hidden])')) peek(false);
          else document.documentElement.classList.remove('cinema-peek');
        }, 400);
    };
    edge.addEventListener('mouseenter', () => peek(true));
    topbar?.addEventListener('mouseenter', () => peek(true));
    topbar?.addEventListener('mouseleave', () => peek(false));
    edge.addEventListener('mouseleave', () => peek(false));
    addEventListener('langchange', render);
    addEventListener('resize', render);
    render();
    return {
      unread(): void {
        unread++;
        render();
      },
      render,
    };
  })();
  // Önemli anları pinleme: video altında ve tam ekranda ilerleme çubuğunun üstünde işaretler.
  const pins = createPins({
    strips: [$('#pin-strip'), $('#fs-pins')],
    buttons: [$('#pin-btn'), $('#fs-pin'), $('#dock-pin')],
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
  $('#dock-pin').addEventListener('click', () => pins.open());
  // Süre video yüklenince belli olur; arada bir yeniden çiz.
  setInterval(() => pins.render(), 2000);
  const fullscreenEl = $<HTMLButtonElement>('#fullscreen');
  fullscreenEl.hidden = !document.fullscreenEnabled && !isShell;
  fullscreenEl.addEventListener('click', () => fullscreen.toggle());

  // ---- Video linki ----
  const mediaInput = $<HTMLInputElement>('#media-input');
  const extDialog = $<HTMLDialogElement>('#ext-dialog');
  let pendingAdd: (() => void) | null = null;

  // Eklentiyi kurmaya gidip dönen: eklenti kurulunca açık sekmeleri kendisi yeniler; olmadıysa
  // (ör. sekme başka pencerede kaldıysa) üstte "kurduysan yenile" bandı çıkar. Yenileyince
  // isim sormadan odaya dönülür ve uyarı kalkar.
  let wentToInstall = false;
  // Every extension link opens in a new tab (the top bar's too), so the room tab never leaves the room.
  document.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('a[href="/extension.html"]')) wentToInstall = true;
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

  const mediaForm = $<HTMLFormElement>('#media-form');
  mediaForm.querySelector('.media-search')?.append(icon('search'));
  // Words instead of a link: search YouTube (the results open under the box).
  const search = createSearch(
    mediaForm,
    mediaInput,
    (id, _title, mode, short) => addMedia(short ? { kind: 'youtube', id, short: true } : { kind: 'youtube', id }, mode),
    // "📱 Shorts akışı" on the results: the feed fills the queue with Shorts about these words.
    (query) => feed.start(query),
    // "🎧 Podcasts" on the results (card P2): an episode is an audio file with its cover art.
    (media, title, mode) => addMedia(media, mode, title),
  );
  // Phones (0.9.91.2): while something plays the link box folds into ＋ under the video, the video and chat get the room.
  const addToggle = $<HTMLButtonElement>('#add-toggle');
  const setAdding = (on: boolean) => {
    roomEl.classList.toggle('adding', on);
    addToggle.setAttribute('aria-expanded', String(on));
    if (on) mediaInput.focus();
  };
  addToggle.addEventListener('click', () => setAdding(!roomEl.classList.contains('adding')));
  mediaForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const mode = (event.submitter as HTMLButtonElement | null)?.value === 'load' ? 'load' : 'enqueue';
    // Many links at once (0.9.90.7): all of them go to the queue (with "Şimdi aç" the first one opens now).
    const list = parseMediaList(mediaInput.value);
    if (list.media.length >= 2) {
      search.close();
      addMany(list.media, list.skipped, mode);
      return;
    }
    // TikTok app share links (vm.tiktok.com/…): the server follows them to the video first (0.9.91.18).
    if (isTikTokShortLink(mediaInput.value)) {
      void resolveTikTok(mediaInput.value, mediaInput).then((media) => {
        if (!media) return;
        search.close();
        mediaInput.value = '';
        addMedia(media, mode);
      });
      return;
    }
    const media = parseMediaInput(mediaInput.value);
    if (media === null) {
      if (mediaInput.value.trim()) void search.search(mediaInput.value);
      // 🔍 with an empty box (0.9.92.8): it says what to type.
      else mediaInput.focus();
      return;
    }
    search.close();
    // Enter counts as the first button (🔍): words search, a link goes to the queue; the playing video never changes by
    // accident (only "Şimdi aç" loads it).
    addMedia(media, mode);
  });

  /**
   * A link pasted anywhere in the room (Ctrl+V outside a text box) or dropped on the page goes to the queue the same
   * way as through the link box (0.9.93.1): no need to find the box first. A dropped link used to navigate the tab
   * away from the room. Not on the film page (no link box there).
   */
  function takeLink(text: string): boolean {
    if (isShell || (!parseMediaInput(text) && parseMediaList(text).media.length < 2 && !isTikTokShortLink(text))) return false;
    mediaInput.value = text.trim();
    mediaForm.requestSubmit(mediaForm.querySelector<HTMLButtonElement>('button[value=enqueue]'));
    return true;
  }
  document.addEventListener('paste', (event) => {
    if (isTyping(event.target) || document.querySelector('.dialog-backdrop:not([hidden])')) return;
    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (text && takeLink(text)) event.preventDefault();
  });
  const draggingLink = (event: DragEvent) => {
    const types = event.dataTransfer?.types ?? [];
    return types.includes('text/uri-list') && !types.includes('Files');
  };
  document.addEventListener('dragover', (event) => {
    if (!isShell && draggingLink(event) && !isTyping(event.target)) event.preventDefault();
  });
  document.addEventListener('drop', (event) => {
    if (isShell || !draggingLink(event) || isTyping(event.target)) return;
    const text = event.dataTransfer?.getData('text/uri-list').split('\n').find((line) => line && !line.startsWith('#')) ?? '';
    event.preventDefault();
    takeLink(text);
  });

  /**
   * Messages that came while this tab was in the background show in its title, "(3) …" (0.9.93.1), so a friend's
   * message is noticed from another tab; back on the tab the count goes.
   */
  let baseTitle = document.title;
  let hiddenUnread = 0;
  function drawTabTitle(): void {
    document.title = hiddenUnread ? `(${hiddenUnread}) ${baseTitle}` : baseTitle;
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !hiddenUnread) return;
    hiddenUnread = 0;
    drawTabTitle();
  });

  /**
   * "3-2-1, together" (0.9.93.2): the server started this video a few seconds ahead (`updatedAt` in the future); the
   * engine holds the player at the start meanwhile and this shows the seconds over the video, then "Together!".
   */
  let countdownEl: HTMLElement | null = null;
  let countdownTimer: ReturnType<typeof setInterval> | null = null;
  function showCountdown(state: PlaybackState): void {
    const stop = () => {
      if (countdownTimer !== null) clearInterval(countdownTimer);
      countdownTimer = null;
    };
    const left = () => (state.paused || !state.item ? 0 : state.updatedAt - clock.now());
    if (left() <= 0) {
      stop();
      countdownEl?.remove();
      countdownEl = null;
      return;
    }
    stop();
    countdownEl?.remove();
    const number = el('b', { class: 'countdown-n' });
    const box = el('div', { class: 'countdown', role: 'status', 'aria-live': 'polite' }, number, el('span', { class: 'countdown-sub' }, t('countdown.sub')));
    countdownEl = box;
    $('.player-wrap').append(box);
    let shown = '';
    const draw = () => {
      const ms = left();
      const text = ms > 0 ? String(Math.ceil(ms / 1000)) : t('countdown.go');
      if (text !== shown) {
        shown = text;
        number.textContent = text;
        number.classList.remove('pop');
        void number.offsetWidth;
        number.classList.add('pop');
        box.classList.toggle('go', ms <= 0);
      }
      if (ms <= -900) {
        stop();
        box.remove();
        if (countdownEl === box) countdownEl = null;
      }
    };
    draw();
    countdownTimer = setInterval(draw, 100);
  }

  /** "Continue where you left off" on the home page (0.9.93.2): this room, with its saved name if it has one. */
  function rememberRoom(): void {
    if (!tv && !removedHere) saveLastRoom(roomId, roomSettings.saved && roomSettings.name ? roomSettings.name : null);
  }

  /** A TikTok short share link → the video, through the server (`/api/tiktok/resolve`); null with a note if not. */
  async function resolveTikTok(link: string, anchor: HTMLElement): Promise<Media | null> {
    try {
      const response = await fetch(`/api/tiktok/resolve?u=${encodeURIComponent(link.trim())}`);
      const body = (response.ok ? await response.json() : null) as { media?: unknown } | null;
      if (body && isValidMedia(body.media)) return body.media;
    } catch {
      // network: the note below
    }
    flashHint(anchor, t('tiktokResolveFailed'), 5000);
    return null;
  }

  /** Sends the links one by one, a little apart (the server allows about 4 commands a second). */
  function addMany(list: Media[], skipped: number, mode: 'load' | 'enqueue'): void {
    mediaInput.value = '';
    setAdding(false);
    list.forEach((media, i) => setTimeout(() => send({ t: i === 0 && mode === 'load' ? 'load' : 'enqueue', media }), i * 300));
    const done = $('#media-done');
    done.textContent = t(skipped ? 'queuedManySkipped' : 'queuedMany', { n: list.length, skipped });
    done.hidden = false;
    setTimeout(() => (done.hidden = true), 4000);
  }

  function addMedia(media: Media, mode: 'load' | 'enqueue', title?: string): void {
    const add = () => {
      send(title ? { t: mode, media, title } : { t: mode, media });
      mediaInput.value = '';
      setAdding(false);
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
  }

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

  // ---- Davet linki: üst çubukta "🔗 Davet et" (basınca link kopyalanır; telefonda paylaşım menüsü) ----
  const inviteUrl = `${location.origin}/r/${roomId}`;
  // Telefonda (dokunmatik + paylaşım menüsü varsa) "Paylaş": WhatsApp vb. doğrudan açılır.
  const canShare = canShareSheet();
  async function shareInvite(button: HTMLButtonElement, idleText: () => string, text: HTMLElement = button): Promise<void> {
    if (canShare) {
      try {
        await navigator.share({ title: 'Sidelit', text: t('inviteShareText'), url: inviteUrl });
        return;
      } catch (error) {
        // Closed, or shared and then the phone came back here (Android reports that as an abort too): nothing else
        // should pop up (0.9.92.6: the grey "Davet linki" box used to follow the share sheet).
        if ((error as DOMException)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      // No clipboard: on a computer the link is shown to copy by hand; a phone already had its share sheet.
      if (!canShare) window.prompt(t('invite'), inviteUrl);
      return;
    }
    text.textContent = t('copied');
    button.classList.add('done');
    setTimeout(() => {
      text.textContent = idleText();
      button.classList.remove('done');
    }, 1500);
  }
  const inviteLabel = () => t('inviteButton');
  const emptyInviteLabel = () => t(canShare ? 'share' : 'copyInvite');
  const inviteText = el('span', { class: 'invite-text' }, inviteLabel());
  const copyEl = el('button', { type: 'button', id: 'invite-btn', class: 'btn primary small-btn invite-btn', title: inviteUrl }, el('span', { 'aria-hidden': 'true' }, '🔗'), inviteText);
  document.querySelector('.topbar-right')?.prepend(copyEl);
  // Card 6 (owner's pick C): "⋯ More" right of Invite holds the room's less-used things (the phone's ⋯ has the same).
  if (!tv) {
    const moreButton = el('button', { type: 'button', id: 'room-more', class: 'nav-link room-more-btn', 'aria-haspopup': 'true', 'aria-expanded': 'false', title: t('more.button'), 'aria-label': t('more.button') }, '⋯');
    copyEl.after(moreButton);
    createRoomMoreMenu(moreButton, () => moreItems(true));
  }
  // ? opens the keyboard shortcuts card (0.9.93.2; not on a TV, whose remote has its own keys).
  if (!tv) listenForShortcutsKey();
  // 0.9.93.1: 🔗 Invite opens the invite window (link, copy, share, WhatsApp, QR); ⋯ → Invite on a phone presses it too.
  // R12: the host also gets "Ask before letting people in" in the invite window.
  const door = () => (amHost() ? { on: roomSettings.knock === true, set: (on: boolean) => send({ t: 'settings', knock: on }) } : undefined);
  copyEl.addEventListener('click', () => openInvite(inviteUrl, door()));
  /**
   * Alone in the room on entering it (not after a reload, the film page or a TV): the invite window opens by itself
   * once the opening animation is over (owner: "like other watch sites, even a QR code"). "Show this when I'm alone in
   * a room" in the window turns it off.
   */
  let invitedOnce = false;
  function maybeAutoInvite(present: Member[]): void {
    if (invitedOnce) return;
    invitedOnce = true;
    if (resumed || isShell || tv || !autoInviteOn()) return;
    if (present.some((m) => m.id !== myId && !m.tv)) return;
    // The first-time tips wait for it (they start with "invite" too).
    document.documentElement.classList.add('invite-pending');
    const soonest = new Promise((done) => setTimeout(done, 1700));
    void Promise.all([soonest, introOver]).then(() => {
      document.documentElement.classList.remove('invite-pending');
      // Someone came in meanwhile, or another window is already open (name, avatar, a confirm): not now.
      if (members.some((m) => m.id !== myId && !m.tv) || document.querySelector('.dialog-backdrop:not([hidden])')) return;
      openInvite(inviteUrl, door());
    });
  }
  const emptyInviteEl = $<HTMLButtonElement>('#empty-invite');
  emptyInviteEl.textContent = emptyInviteLabel();
  emptyInviteEl.addEventListener('click', () => void shareInvite(emptyInviteEl, emptyInviteLabel));
  window.addEventListener('langchange', () => {
    inviteText.textContent = inviteLabel();
    voice.relabel();
    live.relabel();
    emptyInviteEl.textContent = emptyInviteLabel();
  });

  // ---- Arayüz parçaları ----
  function displayName(member: Member): string {
    // A paired TV is its person on another screen: marked so it doesn't read as a second person.
    const name = `${withAvatar(member)}${member.tv ? ' 📺' : ''}`;
    return member.id === myId ? `${name} (${t('you')})` : name;
  }

  function setMembers(next: Member[], nextHost: string | null, announce: boolean): void {
    if (!announce) joinFilter.seed(next);
    else {
      membersSounds(next);
      const before = new Set(members.map((m) => m.id));
      const after = new Set(next.map((m) => m.id));
      for (const m of next) if (!before.has(m.id) && m.id !== myId) addActivity(() => t('joined', { name: withAvatar(m) }));
      // Atılan kişi için ayrıca "ayrıldı" yazma ("çıkardı" satırı zaten var).
      for (const m of members) if (!after.has(m.id) && !kickedIds.has(m.id)) addActivity(() => t('left', { name: withAvatar(m) }));
      if (nextHost !== hostId && nextHost === myId) addActivity(() => t('youAreHostNow'));
      else if (nextHost !== hostId && hostId !== null && nextHost) {
        const host = next.find((m) => m.id === nextHost);
        if (host) addActivity(() => t('hostChanged', { name: withAvatar(host) }));
      }
      // Voice join / leave go into the room activity like play / pause (owner's feedback, 0.9.88). Someone who leaves
      // the room while in voice only gets the "left" line.
      const wasInVoice = new Set(members.filter((m) => m.voice).map((m) => m.id));
      for (const m of next) {
        if (m.voice && !wasInVoice.has(m.id) && before.has(m.id)) addActivity(() => t('voiceJoined', { name: displayName(m) }));
        if (!m.voice && wasInVoice.has(m.id)) addActivity(() => t('voiceLeft', { name: displayName(m) }));
      }
    }
    members = next;
    hostId = nextHost;
    renderMembers();
    tvRoom?.members(members);
    tvRemote?.voiceChanged();
  }

  /**
   * Sounds of member changes (CLAUDE.md "Sound effects"): someone really new in the room; voice join / leave of others
   * only while I'm in voice; someone else's stream starting, and the end of the stream I'm watching. My other tab
   * (same name + avatar) never counts as someone else.
   */
  /** People in voice whose connection just dropped (their reconnect keeps the id): coming back is no "join". */
  const voiceAway = new Map<string, number>();
  function membersSounds(next: Member[]): void {
    if (joinFilter.update(next, myId, Date.now()) > 0) playSound('roomJoin');
    const now = Date.now();
    for (const old of members) if (old.voice && !next.some((m) => m.id === old.id)) voiceAway.set(old.id, now);
    const meNow = next.find((m) => m.id === myId);
    const meBefore = members.find((m) => m.id === myId);
    const mine = meNow ? personKey(meNow) : null;
    const before = new Map(members.map((m) => [m.id, m]));
    for (const m of next) {
      const old = before.get(m.id);
      if (!old || m.id === myId || personKey(m) === mine) continue;
      if (meNow?.voice && meBefore?.voice) {
        if (m.voice && !old.voice && now - (voiceAway.get(m.id) ?? 0) > 30_000) playSound('voiceJoin');
        if (!m.voice && old.voice) playSound('voiceLeave');
      }
      if (m.live && !old.live) playSound('streamStart');
    }
    for (const old of members) {
      if (!old.live || old.id === myId || !meBefore?.watching) continue;
      if (!next.find((m) => m.id === old.id)?.live) playSound('streamStop');
    }
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
    drawRoomTitle();
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
    // Oda kuralları: yöneticiye "senin ayarların" + anahtarlar, diğerlerine "yönetici belirliyor" + kısa özet (soluk,
    // basılamayan anahtar kalabalığı yerine).
    const host = !toggle.disabled;
    const hostName = members.find((m) => m.id === hostId)?.name ?? '';
    $('#opt-wait-hint').textContent = host ? t('settings.youAreHost') : t('settings.rulesBy', { name: hostName || '👑' });
    $('.host-box').classList.toggle('mine', host);
    $('.host-ui').hidden = !host;
    $('#rules-summary').hidden = host;
    settingsDialog.render();
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
    input.placeholder = friendlyRoomName(roomId);
    drawRoomTitle();
    baseTitle = `${saved && name ? name : friendlyRoomName(roomId)} · Sidelit`;
    drawTabTitle();
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
    $<HTMLInputElement>('#opt-countdown').checked = roomSettings.countdown !== false;
    $<HTMLInputElement>('#opt-knock').checked = roomSettings.knock === true;
    $<HTMLInputElement>('#opt-livehost').checked = roomSettings.liveHostOnly === true;
    live.settings(roomSettings.liveHostOnly === true);
    $<HTMLSelectElement>('#opt-reactiongap').value = String(roomSettings.reactionGap ?? 0);
    app.classList.toggle('no-reactions', roomSettings.noReactions === true);
    for (const id of ['#opt-hostonly', '#opt-lockqueue', '#opt-countdown', '#opt-knock', '#opt-noreactions', '#opt-livehost', '#opt-clear-stickers', '#opt-reactiongap', '#opt-start', '#opt-start-set', '#opt-start-clear']) {
      $<HTMLInputElement>(id).disabled = !host;
    }
    // Yönetici olmayana kuralların kısa özeti.
    const rule = (on: boolean, key: I18nKey) =>
      el('li', { class: on ? 'on' : '', 'aria-label': `${t(key)}: ${t(on ? 'settings.on' : 'settings.off')}` }, el('span', { 'aria-hidden': 'true' }, on ? '✓' : '–'), t(key));
    const gap = roomSettings.reactionGap ?? 0;
    $('#rules-summary').replaceChildren(
      rule(roomSettings.waitForAll, 'settings.waitForAll'),
      rule(roomSettings.hostOnly === true, 'settings.hostOnlyMode'),
      rule(roomSettings.knock === true, 'settings.knock'),
      rule(roomSettings.lockQueue === true, 'settings.lockQueue'),
      rule(roomSettings.countdown !== false, 'settings.countdown'),
      rule(roomSettings.noReactions === true, 'settings.noReactions'),
      rule(roomSettings.liveHostOnly === true, 'settings.liveHostOnly'),
      el('li', { class: gap ? 'on' : '' }, el('span', { 'aria-hidden': 'true' }, '⏱'), `${t('settings.reactionGap')}: ${t(`settings.reactionGap.${gap}` as I18nKey)}`),
    );
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
      $('#schedule-now').hidden = true;
      return;
    }
    scheduleWasSet = true;
    const left = Math.max(0, at - clock.now());
    const time = scheduleTime(at);
    banner.hidden = false;
    banner.textContent = roomState?.item ? t('scheduleBanner', { time, left: formatLeft(left) }) : t('scheduleBannerEmpty', { time, left: formatLeft(left) });
    // The settings section shows the same plan as a card (with "copy invite with the time" and "clear").
    $('#schedule-now').hidden = false;
    $('#schedule-now-time').textContent = t('schedule.at', { time });
    $('#schedule-now-left').textContent = t('schedule.left', { left: formatLeft(left) });
    $('#schedule-warn').hidden = !!roomState?.item;
  }
  /** Server time → the person's local clock, e.g. "Sat 21:00". */
  function scheduleTime(at: number): string {
    return new Date(at - (clock.now() - Date.now())).toLocaleString(document.documentElement.lang || undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }
  /** Plan a start at a local time (ms); converted to server time. */
  function scheduleAt(local: number): void {
    if (!Number.isFinite(local) || local <= Date.now()) {
      showError(() => t('scheduleInvalid'));
      return;
    }
    send({ t: 'settings', startsAt: local + (clock.now() - Date.now()) });
  }
  setInterval(() => roomSettings.startsAt !== undefined && renderSchedule(), 1000);

  $<HTMLInputElement>('#opt-hostonly').addEventListener('change', (event) => {
    send({ t: 'settings', hostOnly: (event.target as HTMLInputElement).checked });
  });
  $('#recap-open').addEventListener('click', () => send({ t: 'recap' }));
  $<HTMLInputElement>('#opt-countdown').addEventListener('change', (event) => {
    send({ t: 'settings', countdown: (event.target as HTMLInputElement).checked });
  });
  $<HTMLInputElement>('#opt-knock').addEventListener('change', (event) => {
    send({ t: 'settings', knock: (event.target as HTMLInputElement).checked });
  });
  $<HTMLInputElement>('#opt-noreactions').addEventListener('change', (event) => {
    send({ t: 'settings', noReactions: (event.target as HTMLInputElement).checked });
  });
  $<HTMLInputElement>('#opt-livehost').addEventListener('change', (event) => {
    send({ t: 'settings', liveHostOnly: (event.target as HTMLInputElement).checked });
  });
  $('#opt-clear-stickers').addEventListener('click', () => {
    void confirmDialog({ icon: '🖼️', title: t('settings.clearStickers'), text: t('settings.clearStickers.confirm'), yes: t('settings.clearStickers.btn') }).then((yes) => {
      if (yes) send({ t: 'sticker-clear' });
    });
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
    scheduleAt(value ? new Date(value).getTime() : NaN);
  });
  // Quick choices: in 15 / 30 / 60 minutes (rounded to the next 5 minutes) or tonight at 21:00 (tomorrow if past).
  $('#schedule-chips').addEventListener('click', (event) => {
    const chip = (event.target as Element).closest<HTMLButtonElement>('.chip');
    if (!chip) return;
    const step = 5 * 60_000;
    if (chip.dataset.in) {
      scheduleAt(Math.ceil((Date.now() + Number(chip.dataset.in) * 60_000) / step) * step);
      return;
    }
    const at = new Date();
    at.setHours(Number(chip.dataset.at), 0, 0, 0);
    if (at.getTime() <= Date.now() + 60_000) at.setDate(at.getDate() + 1);
    scheduleAt(at.getTime());
  });
  $('#opt-start-clear').addEventListener('click', () => {
    send({ t: 'settings', startsAt: null });
    $('#schedule-now').hidden = true;
  });
  // Copies an invite that says when the film starts (the slogan the owner chose + the time + the link).
  $('#schedule-invite').addEventListener('click', async () => {
    const at = roomSettings.startsAt;
    if (at === undefined) return;
    const text = t('schedule.inviteText', { time: scheduleTime(at), url: inviteUrl });
    const button = $<HTMLButtonElement>('#schedule-invite');
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = t('copied');
      setTimeout(() => (button.textContent = t('schedule.invite')), 1500);
    } catch {
      window.prompt(t('invite'), text);
    }
  });
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
    // Odada üst çubukta sadece oda adının noktası: yeşil bağlı, sarı bağlanıyor, kırmızı koptu; bağlı değilken yanında
    // kısa yazı. Noktaya basınca yeniden bağlanır.
    const text = t(`status.${status}`);
    roomTitleDot.dataset.status = status;
    roomTitleDot.title = `${text} · ${t('reconnect')}`;
    roomTitleDot.setAttribute('aria-label', roomTitleDot.title);
    roomTitleStatus.textContent = status === 'open' ? '' : text;
  }

  // Sayfadan çıkarken (film sayfasına gidiş, odaya dönüş) bağlantıyı hemen kapat: tarayıcı sayfayı
  // önbellekte açık tutarsa kişi odada bir süre iki kez görünüyordu. Geri gelinirse sayfa yenilenir.
  addEventListener('pagehide', () => {
    // R18: only a room I was really in becomes "Continue where you left off".
    if (joinedOnce) rememberRoom();
    voice.leave();
    live.leave();
    connection.close();
  });

  // ---- Bağlantıyı yenile (sağ üst ⟳): kopma ya da takılma için, sayfayı yenilemeden. ----
  function reconnectNow(): void {
    if (!$('#kicked').hidden) return;
    reconnectEl.classList.add('spin');
    roomTitleDot.classList.add('spin');
    setTimeout(() => {
      reconnectEl.classList.remove('spin');
      roomTitleDot.classList.remove('spin');
    }, 700);
    connection.reconnect();
  }
  reconnectEl.onclick = reconnectNow;
  roomTitleDot.addEventListener('click', reconnectNow);

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
    label($('#chat-send'), t('send'));
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
