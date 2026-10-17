import { ServerClock } from '@swm/shared/clock';
import { RoomConnection, type ConnectionStatus } from '@swm/shared/connection';
import { parseMediaInput } from '@swm/shared/media';
import type { PlayerAdapter } from '@swm/shared/player';
import {
  AVATARS,
  cleanName,
  isAvatar,
  randomAvatar,
  type Avatar,
  type ClientMessage,
  type Member,
  type PlaybackState,
  type QueueItem,
  type ServerMessage,
} from '@swm/shared/protocol';
import { pageInviteUrl } from '@swm/shared/room-id';
import { SyncEngine } from '@swm/shared/sync-engine';
import { el, rememberOpen } from './dom.ts';
import { t, translate } from './i18n.ts';
import { formatTime, itemTitle, rememberTitle } from './media-info.ts';
import { createHtml5Player } from './players/html5.ts';
import { createYouTubePlayer, loadYouTubeApi } from './players/youtube.ts';
import { load, save } from './storage.ts';
import { createChatPanel } from './ui/chat.ts';
import { createQueuePanel } from './ui/queue.ts';
import { createFullscreen } from './ui/fullscreen.ts';
import { createReactions } from './ui/reactions.ts';
import { createToasts } from './ui/toasts.ts';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const MAX_ACTIVITY = 12;

/** Önce isim sorulur. Bu tıklama aynı zamanda tarayıcının sesli oynatma izni için gereken etkileşimdir. */
export function renderRoom(app: HTMLElement, roomId: string): void {
  app.innerHTML = `
    <section class="card join-card">
      <p class="muted" id="room-code"></p>
      <form id="name-form" class="stack">
        <label for="name" data-i18n="yourName"></label>
        <input id="name" maxlength="32" required autocomplete="nickname" data-i18n-placeholder="namePlaceholder" />
        <span class="label" data-i18n="yourAvatar"></span>
        <div id="avatar-picker" class="avatar-picker" role="radiogroup"></div>
        <button class="btn primary big" data-i18n="enterRoom"></button>
        <p class="muted small" data-i18n="nameHint"></p>
      </form>
    </section>
  `;
  translate(app);

  // Avatar: bir kez seçilir, tarayıcıda saklanır (yoksa rastgele biri önerilir).
  const savedAvatar = load('avatar');
  let avatar: Avatar = isAvatar(savedAvatar) ? savedAvatar : randomAvatar();
  const picker = app.querySelector<HTMLElement>('#avatar-picker')!;
  const renderPicker = () =>
    picker.replaceChildren(
      ...AVATARS.map((option) => {
        const button = el('button', { type: 'button', class: 'avatar-option', role: 'radio', 'aria-checked': String(option === avatar) }, option);
        button.addEventListener('click', () => {
          avatar = option;
          renderPicker();
        });
        return button;
      }),
    );
  renderPicker();

  const roomCode = app.querySelector<HTMLElement>('#room-code')!;
  const renderCode = () => (roomCode.textContent = t('roomCode', { id: roomId }));
  renderCode();
  window.addEventListener('langchange', renderCode);

  const input = app.querySelector<HTMLInputElement>('#name')!;
  input.value = load('name') ?? '';
  input.focus();
  input.select();

  app.querySelector('#name-form')!.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = cleanName(input.value);
    if (name === null) return;
    save('name', name);
    save('avatar', avatar);
    window.removeEventListener('langchange', renderCode);
    startRoom(app, roomId, name, avatar);
  });
}

/** İsmin önüne avatarı koyar (varsa). */
function withAvatar(member: { name: string; avatar?: string }): string {
  return member.avatar ? `${member.avatar} ${member.name}` : member.name;
}

function startRoom(app: HTMLElement, roomId: string, myName: string, myAvatar: Avatar): void {
  // İlk video eklendiğinde beklememek için YouTube oynatıcısını şimdiden indirmeye başla.
  loadYouTubeApi().catch(() => {});

  app.innerHTML = `
    <div class="room">
      <div class="stage">
        <form id="media-form" class="media-form">
          <input id="media-input" autocomplete="off" data-i18n-placeholder="mediaPlaceholder" />
          <button class="btn primary" value="enqueue" data-i18n="addToQueue"></button>
          <button class="btn" value="load" data-i18n="playNow"></button>
        </form>
        <p id="media-error" class="error" data-i18n="invalidMedia" hidden></p>

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
            <div id="toasts" class="fs-only toasts" aria-live="polite"></div>
            <div id="fs-controls" class="fs-only fs-controls">
              <div class="fs-progress">
                <input id="fs-seek" type="range" min="0" max="1000" step="1" value="0" />
                <span id="fs-time" class="fs-time">0:00 / 0:00</span>
              </div>
              <div class="fs-row">
                <button id="fs-play" type="button" class="fs-btn">▶</button>
                <div class="reaction-bar fs-reactions" role="group"></div>
                <form id="fs-chat" class="fs-chat">
                  <input id="fs-chat-input" autocomplete="off" data-i18n-placeholder="quickChatPlaceholder" />
                </form>
                <button id="fs-skip" type="button" class="fs-btn">⏭</button>
                <select id="fs-speed" class="fs-speed">${SPEEDS.map((s) => `<option value="${s}">${s}x</option>`).join('')}</select>
                <button id="fs-exit" type="button" class="fs-btn">✕</button>
              </div>
            </div>
            <div id="empty" class="empty">
              <h2 data-i18n="emptyTitle"></h2>
              <p data-i18n="emptyBody"></p>
            </div>
            <div id="external" class="overlay external" hidden>
              <p class="muted" data-i18n="externalTitle"></p>
              <h2 id="external-title"></h2>
              <a id="external-open" class="btn primary big"></a>
              <p id="external-hint" class="muted small"></p>
            </div>
            <div id="autoplay" class="overlay" hidden>
              <p data-i18n="autoplayBlocked"></p>
              <button type="button" class="btn primary big" data-i18n="startPlayback"></button>
            </div>
          </div>
          <div class="toolbar">
            <div class="reaction-bar" role="group"></div>
            <div class="toolbar-right">
              <label class="speed"><span data-i18n="speed"></span>
                <select id="speed">${SPEEDS.map((s) => `<option value="${s}">${s}x</option>`).join('')}</select>
              </label>
              <button id="fullscreen" type="button" class="icon-btn big-icon">⛶</button>
            </div>
          </div>
        </div>
        <p id="player-error" class="error" hidden></p>
      </div>

      <aside class="side">
        <section class="card">
          <h3 data-i18n="invite"></h3>
          <div class="row">
            <input id="invite" readonly />
            <button id="copy" type="button" class="btn" data-i18n="copy"></button>
          </div>
        </section>
        <section class="card">
          <h3 id="members-title"></h3>
          <ul id="members" class="members"></ul>
        </section>
        <section class="card">
          <h3 id="queue-title"></h3>
          <ol id="queue" class="queue"></ol>
          <p id="queue-empty" class="muted small" data-i18n="queueEmpty"></p>
        </section>
        <details id="chat-panel" class="card panel">
          <summary><span data-i18n="chat"></span><span id="chat-badge" class="badge" hidden></span></summary>
          <ul id="chat-list" class="chat-list"></ul>
          <form id="chat-form" class="row">
            <input id="chat-input" autocomplete="off" data-i18n-placeholder="chatPlaceholder" />
            <button class="btn" data-i18n="send"></button>
          </form>
        </details>
        <details id="activity-panel" class="card panel">
          <summary data-i18n="activity"></summary>
          <ul id="activity" class="activity"></ul>
        </details>
      </aside>
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
  const membersTitleEl = $('#members-title');
  const membersEl = $('#members');
  const activityEl = $('#activity');
  const statusEl = document.querySelector<HTMLElement>('#status')!;

  let myId: string | null = null;
  let members: Member[] = [];
  let status: ConnectionStatus = 'connecting';
  let errorText: (() => string) | null = null;
  let roomState: PlaybackState | null = null;
  const activity: { at: Date; text: () => string }[] = [];

  const send = (message: ClientMessage) => connection.send(message);
  const queue = createQueuePanel(app, send);
  const chat = createChatPanel(app, send, () => myId);
  const reactions = createReactions(app, send);
  rememberOpen($<HTMLDetailsElement>('#activity-panel'), 'panel:activity', load, save);

  // ---- Senkron ----
  const clock = new ServerClock();
  const engine = new SyncEngine({
    clock,
    send,
    onAutoplayBlocked: () => (autoplayEl.hidden = false),
    onEnded: (itemId) => send({ t: 'next', from: itemId }),
  });
  const connection = new RoomConnection({
    serverUrl: location.origin,
    roomId,
    name: myName,
    avatar: myAvatar,
    clock,
    onMessage: handleMessage,
    onStatus: (next) => {
      status = next;
      renderStatus();
    },
  });
  connection.connect();

  function handleMessage(message: ServerMessage): void {
    switch (message.t) {
      case 'welcome':
        myId = message.you;
        setMembers(message.members, false);
        queue.set(message.queue);
        chat.set(message.chat);
        void applyState(message.state);
        break;
      case 'state': {
        void applyState(message.state);
        const { action, by, state } = message;
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
        renderActivity();
        break;
      case 'queue': {
        queue.set(message.queue);
        renderNowPlaying();
        const change = message.change;
        if (change) addActivity(() => t(`queue.${change.kind}`, { name: displayName(change.by), title: itemTitle(change.item) }));
        break;
      }
      case 'members':
        setMembers(message.members, true);
        break;
      case 'reaction':
        reactions.show(message.emoji, withAvatar(message.by));
        break;
      case 'chat': {
        const { by, text } = message.message;
        chat.add(message.message);
        // Tam ekranda sohbet paneli görünmez; mesaj videonun köşesinde belirir.
        if (fullscreen.isActive()) toasts.show(withAvatar(by), text, by.id === myId);
        break;
      }
      case 'error':
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
    if (SPEEDS.includes(state.rate)) {
      speedEl.value = String(state.rate);
      fullscreen.setRate(state.rate);
    }
    renderNowPlaying();
    const itemId = state.item?.id ?? null;
    if (itemId === currentItemId) {
      engine.receive(state);
      return;
    }

    // Video değişti: eskisini kapat, yenisini aç.
    currentItemId = itemId;
    const token = ++mediaToken;
    engine.detach();
    if (current !== null) {
      current.player.destroy();
      current.slot.remove();
      current = null;
    }
    autoplayEl.hidden = true;
    showError(null);
    engine.receive(state);
    emptyEl.hidden = state.item !== null;
    externalEl.hidden = state.item?.media.kind !== 'page';
    if (state.item === null) return;

    const media = state.item.media;
    if (media.kind === 'page') {
      showExternal(state.item, media.url);
      return;
    }
    const slot = el('div', { class: 'slot' });
    playerEl.append(slot);
    const onError = () => showError(() => t('playerError'));
    let player: PlayerAdapter;
    try {
      player = media.kind === 'youtube' ? await createYouTubePlayer(slot, media.id, onError) : createHtml5Player(slot, media.url, onError);
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

  /**
   * Odada bir web sayfası açık: video o sayfada, herkesin kendi sekmesinde oynar.
   * Eklenti kuruluysa sayfaya oda işaretiyle (#swm=ODA) gidilir, eklenti oradan
   * devam eder. Kurulu değilse sayfa linki ve kurulum yardımı gösterilir.
   */
  function showExternal(item: QueueItem, url: string): void {
    const hasExtension = document.documentElement.dataset.swmExtension !== undefined;
    const target = pageInviteUrl(url, roomId);
    $('#external-title').textContent = itemTitle(item);
    const open = $<HTMLAnchorElement>('#external-open');
    open.href = hasExtension ? target : url;
    open.target = hasExtension ? '_self' : '_blank';
    open.rel = 'noopener noreferrer';
    open.textContent = t(hasExtension ? 'externalGoJoin' : 'externalOpen');
    const hint = $('#external-hint');
    if (hasExtension) {
      hint.textContent = t('externalRedirecting');
      // Eklentiye "bu sekme bu odaya katılsın" de; sekmeyi sayfaya eklenti götürür.
      // Adresteki işarete (#swm=) güvenmez: bazı siteler yönlendirirken onu siler.
      const askExtension = () => window.postMessage({ source: 'screenwithme-site', type: 'join', roomId }, location.origin);
      open.onclick = (event) => {
        event.preventDefault();
        askExtension();
      };
      askExtension();
      // Eski sürüm eklenti bu mesajı tanımıyorsa adres işaretiyle git.
      setTimeout(() => {
        if (roomState?.item?.id === item.id) location.assign(target);
      }, 4000);
    } else {
      hint.replaceChildren(t('externalNeedExtension'), ' ', el('a', { href: '/eklenti.html', target: '_blank' }, t('installExtension')));
    }
  }

  function renderNowPlaying(): void {
    const item = roomState?.item ?? null;
    nowPlayingEl.hidden = item === null;
    if (item) {
      nowTitleEl.textContent = itemTitle(item);
      nowTitleEl.title = itemTitle(item);
    }
    skipEl.disabled = queue.length === 0;
    fullscreen.setSkipEnabled(queue.length > 0);
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

  speedEl.addEventListener('change', () => engine.requestRate(Number(speedEl.value)));

  // ---- Tam ekran: sadece video kalır, fare oynayınca kontroller ve hızlı mesaj belirir. ----
  const fullscreen = createFullscreen({
    theater: $('#theater'),
    getPlayer: () => current?.player ?? null,
    send,
    onSkip: skip,
    onRate: (rate) => engine.requestRate(rate),
  });
  const toasts = createToasts($('#toasts'));
  const fullscreenEl = $<HTMLButtonElement>('#fullscreen');
  fullscreenEl.hidden = !document.fullscreenEnabled;
  fullscreenEl.addEventListener('click', () => fullscreen.toggle());

  // ---- Video linki ----
  const mediaInput = $<HTMLInputElement>('#media-input');
  const mediaError = $('#media-error');
  $<HTMLFormElement>('#media-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const media = parseMediaInput(mediaInput.value);
    mediaError.hidden = media !== null;
    if (media === null) return;
    // Enter'a basılınca ilk buton ("Sıraya ekle") geçerli olur; izlenen video yanlışlıkla değişmez.
    const mode = (event.submitter as HTMLButtonElement | null)?.value === 'load' ? 'load' : 'enqueue';
    send({ t: mode, media });
    mediaInput.value = '';
  });

  // ---- Davet linki ----
  const inviteEl = $<HTMLInputElement>('#invite');
  const copyEl = $<HTMLButtonElement>('#copy');
  inviteEl.value = `${location.origin}/r/${roomId}`;
  inviteEl.addEventListener('focus', () => inviteEl.select());
  copyEl.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(inviteEl.value);
    } catch {
      inviteEl.select();
      document.execCommand('copy');
    }
    copyEl.textContent = t('copied');
    setTimeout(() => (copyEl.textContent = t('copy')), 1500);
  });

  // ---- Arayüz parçaları ----
  function displayName(member: Member): string {
    const name = withAvatar(member);
    return member.id === myId ? `${name} (${t('you')})` : name;
  }

  function setMembers(next: Member[], announce: boolean): void {
    if (announce) {
      const before = new Set(members.map((m) => m.id));
      const after = new Set(next.map((m) => m.id));
      for (const m of next) if (!before.has(m.id) && m.id !== myId) addActivity(() => t('joined', { name: withAvatar(m) }));
      for (const m of members) if (!after.has(m.id)) addActivity(() => t('left', { name: withAvatar(m) }));
    }
    members = next;
    renderMembers();
  }

  function renderMembers(): void {
    membersTitleEl.textContent = t('members', { n: members.length });
    membersEl.replaceChildren(...members.map((m) => el('li', { class: m.id === myId ? 'me' : '' }, displayName(m))));
  }

  function addActivity(text: () => string): void {
    activity.unshift({ at: new Date(), text });
    activity.length = Math.min(activity.length, MAX_ACTIVITY);
    renderActivity();
  }

  function renderActivity(): void {
    activityEl.replaceChildren(
      ...activity.map((item) =>
        el('li', {}, el('time', {}, item.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })), ' ', item.text()),
      ),
    );
  }

  function renderStatus(): void {
    statusEl.hidden = false;
    statusEl.dataset.status = status;
    statusEl.textContent = t(`status.${status}`);
  }

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
    label($('#fs-exit'), t('exitFullscreen'));
    label($('#fs-speed'), t('speed'));
  }

  window.addEventListener('langchange', () => {
    renderStatus();
    renderMembers();
    renderActivity();
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
    Object.assign(window, { __swm: { engine, clock, player: () => current?.player ?? null } });
  }
}
