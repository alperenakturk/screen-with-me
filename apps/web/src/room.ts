import { ServerClock } from '@wb/shared/clock';
import { RoomConnection, type ConnectionStatus } from '@wb/shared/connection';
import { parseMediaInput, sameMedia } from '@wb/shared/media';
import type { PlayerAdapter } from '@wb/shared/player';
import { cleanName, type Media, type Member, type PlaybackState, type ServerMessage } from '@wb/shared/protocol';
import { SyncEngine } from '@wb/shared/sync-engine';
import { t, translate } from './i18n.ts';
import { createHtml5Player } from './players/html5.ts';
import { createYouTubePlayer } from './players/youtube.ts';
import { load, save } from './storage.ts';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const MAX_ACTIVITY = 8;

/** Önce isim sorulur. Bu tıklama aynı zamanda tarayıcının sesli oynatma izni için gereken etkileşimdir. */
export function renderRoom(app: HTMLElement, roomId: string): void {
  app.innerHTML = `
    <section class="card join-card">
      <p class="muted" id="room-code"></p>
      <form id="name-form" class="stack">
        <label for="name" data-i18n="yourName"></label>
        <input id="name" maxlength="32" required autocomplete="nickname" data-i18n-placeholder="namePlaceholder" />
        <button class="btn primary big" data-i18n="enterRoom"></button>
        <p class="muted small" data-i18n="nameHint"></p>
      </form>
    </section>
  `;
  translate(app);

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
    window.removeEventListener('langchange', renderCode);
    startRoom(app, roomId, name);
  });
}

function startRoom(app: HTMLElement, roomId: string, myName: string): void {
  app.innerHTML = `
    <div class="room">
      <div class="stage">
        <form id="media-form" class="row">
          <input id="media-input" autocomplete="off" data-i18n-placeholder="mediaPlaceholder" />
          <button class="btn primary" data-i18n="open"></button>
        </form>
        <p id="media-error" class="error" data-i18n="invalidMedia" hidden></p>
        <div class="player-wrap">
          <div id="player" class="player"></div>
          <div id="empty" class="empty">
            <h2 data-i18n="emptyTitle"></h2>
            <p data-i18n="emptyBody"></p>
          </div>
          <div id="autoplay" class="overlay" hidden>
            <p data-i18n="autoplayBlocked"></p>
            <button type="button" class="btn primary big" data-i18n="startPlayback"></button>
          </div>
        </div>
        <p id="player-error" class="error" hidden></p>
        <div class="controls">
          <label class="speed"><span data-i18n="speed"></span>
            <select id="speed">${SPEEDS.map((s) => `<option value="${s}">${s}x</option>`).join('')}</select>
          </label>
        </div>
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
          <h3 data-i18n="activity"></h3>
          <ul id="activity" class="activity"></ul>
        </section>
      </aside>
    </div>
  `;
  translate(app);

  const $ = <T extends HTMLElement>(selector: string) => app.querySelector<T>(selector)!;
  const playerEl = $('#player');
  const emptyEl = $('#empty');
  const autoplayEl = $('#autoplay');
  const playerErrorEl = $('#player-error');
  const speedEl = $<HTMLSelectElement>('#speed');
  const membersTitleEl = $('#members-title');
  const membersEl = $('#members');
  const activityEl = $('#activity');
  const statusEl = document.querySelector<HTMLElement>('#status')!;

  let myId: string | null = null;
  let members: Member[] = [];
  let status: ConnectionStatus = 'connecting';
  let errorText: (() => string) | null = null;
  const activity: { at: Date; text: () => string }[] = [];

  // ---- Senkron ----
  const clock = new ServerClock();
  const engine = new SyncEngine({
    clock,
    send: (message) => connection.send(message),
    onAutoplayBlocked: () => (autoplayEl.hidden = false),
  });
  const connection = new RoomConnection({
    serverUrl: location.origin,
    roomId,
    name: myName,
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
        void applyState(message.state);
        break;
      case 'state': {
        void applyState(message.state);
        const { action, by, state } = message;
        const key = `action.${action}` as const;
        addActivity(() => t(key, { name: displayName(by), time: formatTime(state.position), rate: state.rate }));
        break;
      }
      case 'members':
        setMembers(message.members, true);
        break;
      case 'error':
        showError(() => t(`error.${message.code}` as const));
        if (message.code === 'version' || message.code === 'room_full') connection.close();
        break;
      case 'pong':
        break;
    }
  }

  // ---- Oynatıcı ----
  let currentMedia: Media | null = null;
  let current: { player: PlayerAdapter; slot: HTMLElement } | null = null;
  let mediaToken = 0;

  async function applyState(state: PlaybackState): Promise<void> {
    if (SPEEDS.includes(state.rate)) speedEl.value = String(state.rate);
    if (sameMedia(state.media, currentMedia)) {
      engine.receive(state);
      return;
    }

    // Video değişti: eskisini kapat, yenisini aç.
    currentMedia = state.media;
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
    emptyEl.hidden = state.media !== null;
    if (state.media === null) return;

    const slot = document.createElement('div');
    slot.className = 'slot';
    playerEl.append(slot);
    const onError = () => showError(() => t('playerError'));
    let player: PlayerAdapter;
    try {
      player =
        state.media.kind === 'youtube'
          ? await createYouTubePlayer(slot, state.media.id, onError)
          : createHtml5Player(slot, state.media.url, onError);
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

  autoplayEl.querySelector('button')!.addEventListener('click', () => {
    autoplayEl.hidden = true;
    engine.resume();
  });

  speedEl.addEventListener('change', () => engine.requestRate(Number(speedEl.value)));

  // ---- Video linki ----
  const mediaInput = $<HTMLInputElement>('#media-input');
  const mediaError = $('#media-error');
  $('#media-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const media = parseMediaInput(mediaInput.value);
    mediaError.hidden = media !== null;
    if (media === null) return;
    connection.send({ t: 'load', media });
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
    return member.id === myId ? `${member.name} (${t('you')})` : member.name;
  }

  function setMembers(next: Member[], announce: boolean): void {
    if (announce) {
      const before = new Map(members.map((m) => [m.id, m]));
      const after = new Map(next.map((m) => [m.id, m]));
      for (const m of next) if (!before.has(m.id) && m.id !== myId) addActivity(() => t('joined', { name: m.name }));
      for (const m of members) if (!after.has(m.id)) addActivity(() => t('left', { name: m.name }));
    }
    members = next;
    renderMembers();
  }

  function renderMembers(): void {
    membersTitleEl.textContent = t('members', { n: members.length });
    membersEl.replaceChildren(
      ...members.map((member) => {
        const li = document.createElement('li');
        li.textContent = displayName(member);
        if (member.id === myId) li.classList.add('me');
        return li;
      }),
    );
  }

  function addActivity(text: () => string): void {
    activity.unshift({ at: new Date(), text });
    activity.length = Math.min(activity.length, MAX_ACTIVITY);
    renderActivity();
  }

  function renderActivity(): void {
    activityEl.replaceChildren(
      ...activity.map((item) => {
        const li = document.createElement('li');
        const time = document.createElement('time');
        time.textContent = item.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        li.append(time, ' ', item.text());
        return li;
      }),
    );
  }

  function renderStatus(): void {
    statusEl.hidden = false;
    statusEl.dataset.status = status;
    statusEl.textContent = t(`status.${status}` as const);
  }

  function showError(text: (() => string) | null): void {
    errorText = text;
    playerErrorEl.hidden = text === null;
    playerErrorEl.textContent = text?.() ?? '';
  }

  window.addEventListener('langchange', () => {
    renderStatus();
    renderMembers();
    renderActivity();
    showError(errorText);
    copyEl.textContent = t('copy');
  });

  renderStatus();
  renderMembers();

  // Sadece geliştirme modunda: tarayıcı konsolundan senkronu incelemek için.
  if (import.meta.env.DEV) {
    Object.assign(window, { __wb: { engine, clock, player: () => current?.player ?? null } });
  }
}

export function formatTime(seconds: number): string {
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
