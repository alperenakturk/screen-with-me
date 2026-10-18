import { ServerClock } from '@swm/shared/clock';
import { RoomConnection, type ConnectionStatus } from '@swm/shared/connection';
import { INTRO_CSS, createIntro } from '@swm/shared/intro';
import { parseMediaInput } from '@swm/shared/media';
import type { PlayerAdapter } from '@swm/shared/player';
import {
  AVATARS,
  CLIENT_ID,
  SYSTEM_MEMBER_ID,
  cleanName,
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
import { formatTime, itemTitle, rememberTitle } from './media-info.ts';
import { createHtml5Player } from './players/html5.ts';
import { createYouTubePlayer, loadYouTubeApi } from './players/youtube.ts';
import { load, save, saveIdentity } from './storage.ts';
import { createChatPanel } from './ui/chat.ts';
import { createQueuePanel } from './ui/queue.ts';
import { createFullscreen } from './ui/fullscreen.ts';
import { createPeoplePanel } from './ui/people.ts';
import { createReactions } from './ui/reactions.ts';
import { createSettingsPanel } from './ui/settings.ts';
import { createTabs } from './ui/tabs.ts';
import { createToasts } from './ui/toasts.ts';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/**
 * Odaya giriş iki adımlıdır: önce isim, sonra avatar. İkisi de tarayıcıda
 * saklanır ve bir dahakine hazır gelir. "Odaya gir" tıklaması aynı zamanda
 * tarayıcının sesli oynatma izni için gereken etkileşimdir.
 */
export function renderRoom(app: HTMLElement, roomId: string): void {
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
      <div id="avatar-picker" class="avatar-picker big" role="radiogroup"></div>
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
  const renderPicker = () => {
    picker.replaceChildren(
      ...AVATARS.map((option) => {
        const button = el('button', { type: 'button', class: 'avatar-option', role: 'radio', 'aria-checked': String(option === avatar) }, option);
        button.addEventListener('click', () => {
          avatar = option;
          renderPicker();
        });
        button.addEventListener('dblclick', enter);
        return button;
      }),
    );
    preview.textContent = `${avatar} ${name}`;
  };
  renderPicker();
  renderTexts();
  window.addEventListener('langchange', renderTexts);

  function enter(): void {
    if (avatar !== load('avatar')) saveIdentity(name, avatar);
    window.removeEventListener('langchange', renderTexts);
    startRoom(app, roomId, name, avatar);
  }
  app.querySelector('#enter')!.addEventListener('click', enter);
  app.querySelector('#back')!.addEventListener('click', () => {
    window.removeEventListener('langchange', renderTexts);
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
            <div id="waiting-banner" class="waiting-banner" role="status" hidden></div>
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
              <p id="external-host" class="external-host"></p>
              <div id="external-ext" class="stack external-box">
                <p data-i18n="externalHasExt"></p>
                <button id="external-go" type="button" class="btn primary big" data-i18n="externalGoJoin"></button>
              </div>
              <div id="external-noext" class="stack external-box">
                <p data-i18n="externalNoExt"></p>
                <ol class="external-steps">
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
          <div class="toolbar">
            <div class="reaction-bar" role="group"></div>
            <div class="toolbar-right">
              <button id="sync-all" type="button" class="btn small-btn">🔄 <span data-i18n="syncAll"></span></button>
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
        <section class="card invite-card">
          <span class="invite-label" data-i18n="invite"></span>
          <div class="row">
            <input id="invite" readonly />
            <button id="copy" type="button" class="btn primary" data-i18n="copy"></button>
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
            <ul id="chat-list" class="chat-list"></ul>
            <form id="chat-form" class="row chat-form">
              <input id="chat-input" autocomplete="off" data-i18n-placeholder="chatPlaceholder" />
              <button class="btn primary" data-i18n="send"></button>
            </form>
          </div>

          <div class="tab-panel" data-panel="queue" hidden>
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
            <form id="rename-form" class="row">
              <input id="rename-input" maxlength="32" autocomplete="nickname" />
              <button class="btn" data-i18n="save"></button>
            </form>
            <div id="settings-avatars" class="avatar-picker"></div>
            <h4 data-i18n="settings.theme"></h4>
            <div id="settings-themes" class="theme-grid" role="radiogroup"></div>
            <h4 data-i18n="settings.room"></h4>
            <label class="check-row"><input type="checkbox" id="opt-events" /> <span data-i18n="settings.showEvents"></span></label>
            <label class="check-row"><input type="checkbox" id="opt-reactions" /> <span data-i18n="settings.showReactions"></span></label>
            <label class="check-row"><input type="checkbox" id="opt-wait" /> <span data-i18n="settings.waitForAll"></span></label>
            <p id="opt-wait-hint" class="muted small"></p>
          </div>
        </section>
      </aside>
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

  let myId: string | null = null;
  let members: Member[] = [];
  let hostId: string | null = null;
  const kickedIds = new Set<string>();
  /** "Herkes hazır": oda kimleri bekliyor, yönetici özelliği açtı mı. */
  let waitingIds: string[] = [];
  let roomSettings: RoomSettings = { waitForAll: true };
  let status: ConnectionStatus = 'connecting';
  let errorText: (() => string) | null = null;
  let roomState: PlaybackState | null = null;

  const send = (message: ClientMessage) => connection.send(message);
  const queue = createQueuePanel(app, send);
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
  const reactions = createReactions(app, send);

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
    cid: clientId(),
    clock,
    onMessage: handleMessage,
    onStatus: (next) => {
      status = next;
      renderStatus();
    },
  });
  connection.connect();

  // Açılış: logo belirir, duraklat → oynat olur, "İyi seyirler!" (oda arkada hazırlanırken).
  if (!document.getElementById('swm-intro-css')) {
    document.head.append(el('style', { id: 'swm-intro-css' }, INTRO_CSS));
  }
  $('.player-wrap').append(createIntro(document, t('introText')));

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
        break;
      case 'state': {
        void applyState(message.state);
        const { action, by, state } = message;
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
      case 'reaction':
        if (settings.options.showReactions) reactions.show(message.emoji, withAvatar(message.by));
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
          current?.player.pause();
          $('#kicked').hidden = false;
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
   * Kimseyi habersiz yönlendirmeyiz; ne olacağını anlatıp tek tuşla göndeririz.
   * Eklenti kuruluysa sekmeyi o götürür (oda orada devam eder); değilse kurulum
   * adımları gösterilir.
   */
  function showExternal(item: QueueItem, url: string): void {
    const hasExtension = document.documentElement.dataset.swmExtension !== undefined;
    $('#external-title').textContent = itemTitle(item);
    $('#external-host').textContent = hostOf(url);
    $('#external-ext').hidden = !hasExtension;
    $('#external-noext').hidden = hasExtension;
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
  const extDialog = $<HTMLDialogElement>('#ext-dialog');
  let pendingAdd: (() => void) | null = null;
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
    engine.syncEveryoneToMe();
    syncAllEl.disabled = true;
    setTimeout(() => (syncAllEl.disabled = false), 1500);
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
    toggle.disabled = myId === null || myId !== hostId;
    $('#opt-wait-hint').textContent = toggle.disabled ? t('settings.hostOnly') : '';
  }
  $<HTMLInputElement>('#opt-wait').addEventListener('change', (event) => {
    send({ t: 'settings', waitForAll: (event.target as HTMLInputElement).checked });
  });

  /** Oda hareketlerini sohbete gri satır olarak yazar (ayarlardan kapatılabilir). */
  function addActivity(text: () => string): void {
    if (settings.options.showEvents) chat.system(text);
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
    Object.assign(window, { __swm: { engine, clock, player: () => current?.player ?? null } });
  }
}
