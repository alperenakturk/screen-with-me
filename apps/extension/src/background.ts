// Eklentinin arka planı (service worker). Her sekme için ayrı bir oda
// bağlantısı tutar; sunucudan gelenleri sekmedeki etkin çerçeveye, oradan
// gelenleri sunucuya iletir. Odada bir sayfa açıldığında sekmeyi oraya götürür.
//
// Chrome bu betiği boştayken kapatabilir. WebSocket'teki düzenli ping onu
// açık tutar; yine de kapanırsa hangi sekmenin hangi odada olduğu
// chrome.storage.session'da saklanır ve yeniden açılınca bağlantılar kurulur.

import { ServerClock } from '@swm/shared/clock';
import { RoomConnection, type ConnectionStatus } from '@swm/shared/connection';
import { samePage } from '@swm/shared/media';
import { cleanChatText, cleanName, type Media, type Member, type PlaybackState, type QueueItem, type ServerMessage } from '@swm/shared/protocol';
import { extractRoomId, newRoomId } from '@swm/shared/room-id';
import { SITE_URL } from './config.ts';
import { PORT_NAME, PROBE, type BackgroundMessage, type FrameMessage, type PopupRequest, type PopupResponse, type PopupStatus } from './messages.ts';

interface Frame {
  port: chrome.runtime.Port;
  score: number;
}

interface Session {
  tabId: number;
  roomId: string;
  connection: RoomConnection;
  clock: ServerClock;
  status: ConnectionStatus;
  myId: string | null;
  state: PlaybackState | null;
  queue: QueueItem[];
  members: Member[];
  /** Senkronun çalıştığı çerçeve. */
  activeFrame: number | null;
  /** Etkin çerçeveye oda durumu yollandı mı? */
  activated: boolean;
  /** En son hangi öğe için sekme yönlendirildi (aynı öğe için tekrar yönlendirmemek için). */
  followedItemId: string | null;
  /** Oda oluşturulurken bağlantı açılınca gönderilecek ilk video. */
  pendingLoad: { media: Media; title?: string } | null;
}

const sessions = new Map<number, Session>();
/** Sekme → çerçeve → bağlantı ve video puanı. Odadan bağımsız tutulur. */
const frames = new Map<number, Map<number, Frame>>();

// ---- Kalıcılık ----

async function getName(): Promise<string | null> {
  const { name } = await chrome.storage.local.get('name');
  return typeof name === 'string' ? cleanName(name) : null;
}

async function persist(): Promise<void> {
  const saved = [...sessions.values()].map(({ tabId, roomId }) => ({ tabId, roomId }));
  await chrome.storage.session.set({ sessions: saved });
}

async function restore(): Promise<void> {
  const { sessions: saved } = await chrome.storage.session.get('sessions');
  if (!Array.isArray(saved)) return;
  for (const entry of saved as { tabId: number; roomId: string }[]) {
    const tab = await chrome.tabs.get(entry.tabId).catch(() => null);
    if (tab) await startSession(entry.tabId, entry.roomId);
  }
}

const ready = restore();

// ---- Oda bağlantısı ----

async function startSession(tabId: number, roomId: string): Promise<Session> {
  const existing = sessions.get(tabId);
  if (existing?.roomId === roomId) return existing;
  endSession(tabId, false);

  const name = (await getName()) ?? 'Misafir';
  const clock = new ServerClock();
  const session: Session = {
    tabId,
    roomId,
    clock,
    connection: undefined as unknown as RoomConnection,
    status: 'connecting',
    myId: null,
    state: null,
    queue: [],
    members: [],
    activeFrame: null,
    activated: false,
    followedItemId: null,
    pendingLoad: null,
  };
  session.connection = new RoomConnection({
    serverUrl: SITE_URL,
    roomId,
    name,
    clock,
    onMessage: (message) => onServer(session, message),
    onStatus: (status) => (session.status = status),
  });
  sessions.set(tabId, session);
  session.connection.connect();
  await persist();
  probe(tabId);
  chooseActive(session);
  return session;
}

function endSession(tabId: number, save = true): void {
  const session = sessions.get(tabId);
  if (!session) return;
  session.connection.close();
  for (const frame of frames.get(tabId)?.values() ?? []) post(frame.port, { type: 'deactivate' });
  sessions.delete(tabId);
  if (save) void persist();
}

function onServer(session: Session, message: ServerMessage): void {
  if (sessions.get(session.tabId) !== session) return;
  switch (message.t) {
    case 'welcome':
      session.myId = message.you;
      session.members = message.members;
      session.queue = message.queue;
      session.state = message.state;
      if (session.pendingLoad) {
        session.connection.send({ t: 'load', ...session.pendingLoad });
        session.pendingLoad = null;
      } else {
        void follow(session);
      }
      pushState(session);
      break;
    case 'state':
      session.state = message.state;
      void follow(session);
      pushState(session);
      break;
    case 'queue':
      session.queue = message.queue;
      break;
    case 'members':
      session.members = message.members;
      break;
    case 'title': {
      const item = session.state?.item;
      if (session.state && item?.id === message.itemId) session.state = { ...session.state, item: { ...item, title: message.title } };
      break;
    }
    case 'reaction':
      toActive(session, { type: 'reaction', emoji: message.emoji, name: message.by.name });
      break;
    case 'chat':
      toActive(session, {
        type: 'chat',
        name: message.message.by.name,
        text: message.message.text,
        mine: message.message.by.id === session.myId,
      });
      break;
    case 'pong':
      toActive(session, clockMessage(session));
      break;
    case 'error':
      if (message.code === 'version' || message.code === 'room_full') endSession(session.tabId);
      break;
  }
}

/**
 * Odayı takip et: odada bir sayfa açıldıysa sekmeyi oraya götür. YouTube veya
 * doğrudan video açıldıysa onlar sitede oynar; sekme siteye gider ve oradan
 * site devam eder (eklentinin bağlantısı kapanır, aynı kişi iki kez görünmesin).
 */
async function follow(session: Session): Promise<void> {
  const item = session.state?.item;
  if (!item || session.followedItemId === item.id) return;
  session.followedItemId = item.id;
  const tab = await chrome.tabs.get(session.tabId).catch(() => null);
  if (!tab) return;

  if (item.media.kind === 'page') {
    if (!tab.url || !samePage(tab.url, item.media.url)) await chrome.tabs.update(session.tabId, { url: item.media.url });
  } else {
    endSession(session.tabId);
    await chrome.tabs.update(session.tabId, { url: `${SITE_URL}/r/${session.roomId}` });
  }
}

// ---- Çerçeveler ----

function post(port: chrome.runtime.Port, message: BackgroundMessage): void {
  try {
    port.postMessage(message);
  } catch {
    // Çerçeve kapanmış olabilir.
  }
}

function probe(tabId: number): void {
  chrome.tabs.sendMessage(tabId, { type: PROBE }).catch(() => {});
}

function clockMessage(session: Session): BackgroundMessage {
  return { type: 'clock', offset: session.clock.now() - Date.now(), synced: session.clock.synced };
}

function toActive(session: Session, message: BackgroundMessage): void {
  if (session.activeFrame === null) return;
  const frame = frames.get(session.tabId)?.get(session.activeFrame);
  if (frame) post(frame.port, message);
}

/** Etkin çerçeveye oda durumunu yollar (ilk seferde "etkinleş" mesajıyla). */
function pushState(session: Session): void {
  if (!session.state || session.activeFrame === null) return;
  const frame = frames.get(session.tabId)?.get(session.activeFrame);
  if (!frame) return;
  if (!session.activated) {
    const clock = clockMessage(session) as Extract<BackgroundMessage, { type: 'clock' }>;
    post(frame.port, { type: 'activate', state: session.state, offset: clock.offset, synced: clock.synced });
    session.activated = true;
  } else {
    post(frame.port, { type: 'state', state: session.state });
  }
}

/** Sekmedeki çerçeveler arasından en büyük/en uygun videoya sahip olanı seçer. */
function chooseActive(session: Session): void {
  let best: number | null = null;
  let bestScore = 0;
  for (const [frameId, frame] of frames.get(session.tabId) ?? []) {
    if (frame.score > bestScore) {
      best = frameId;
      bestScore = frame.score;
    }
  }
  if (best === session.activeFrame) return;
  if (session.activeFrame !== null) {
    const old = frames.get(session.tabId)?.get(session.activeFrame);
    if (old) post(old.port, { type: 'deactivate' });
  }
  session.activeFrame = best;
  session.activated = false;
  pushState(session);
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PORT_NAME) return;
  const tabId = port.sender?.tab?.id;
  const frameId = port.sender?.frameId ?? 0;
  if (tabId === undefined) {
    port.disconnect();
    return;
  }
  let tabFrames = frames.get(tabId);
  if (!tabFrames) frames.set(tabId, (tabFrames = new Map()));
  tabFrames.set(frameId, { port, score: 0 });

  port.onMessage.addListener(async (message: FrameMessage) => {
    await ready;
    const frame = frames.get(tabId)?.get(frameId);
    if (!frame || frame.port !== port) return;
    switch (message.type) {
      case 'join':
        await startSession(tabId, message.roomId);
        break;
      case 'candidate': {
        frame.score = message.score;
        const session = sessions.get(tabId);
        if (session) chooseActive(session);
        break;
      }
      case 'send': {
        const session = sessions.get(tabId);
        if (session && session.activeFrame === frameId) session.connection.send(message.message);
        break;
      }
    }
  });

  port.onDisconnect.addListener(() => {
    const tabFrames = frames.get(tabId);
    if (tabFrames?.get(frameId)?.port === port) tabFrames.delete(frameId);
    const session = sessions.get(tabId);
    if (session && session.activeFrame === frameId) {
      session.activeFrame = null;
      chooseActive(session);
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'complete' && sessions.has(tabId)) probe(tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  endSession(tabId);
  frames.delete(tabId);
});

// ---- Popup ----

async function status(tabId: number): Promise<PopupStatus> {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  const session = sessions.get(tabId);
  const item = session?.state?.item ?? null;
  return {
    name: await getName(),
    tabUrl: tab?.url ?? null,
    session: session
      ? {
          roomId: session.roomId,
          inviteUrl: `${SITE_URL}/r/${session.roomId}`,
          connection: session.status,
          members: session.members,
          myId: session.myId,
          item,
          queueLength: session.queue.length,
          onRoomPage: !item || item.media.kind !== 'page' || (!!tab?.url && samePage(tab.url, item.media.url)),
          hasVideo: session.activeFrame !== null,
        }
      : null,
  };
}

function pageMedia(tab: chrome.tabs.Tab): { media: Media; title?: string } | null {
  if (!tab.url || !/^https?:/.test(tab.url)) return null;
  return { media: { kind: 'page', url: tab.url }, ...(tab.title ? { title: tab.title } : {}) };
}

async function handlePopup(request: PopupRequest): Promise<PopupResponse> {
  await ready;
  switch (request.type) {
    case 'status':
      return { ok: true, status: await status(request.tabId) };

    case 'set-name': {
      const name = cleanName(request.name);
      if (!name) return { ok: false, error: 'name' };
      await chrome.storage.local.set({ name });
      return { ok: true };
    }

    case 'create': {
      const tab = await chrome.tabs.get(request.tabId);
      const load = pageMedia(tab);
      if (!load) return { ok: false, error: 'page' };
      const session = await startSession(request.tabId, newRoomId());
      session.pendingLoad = load;
      session.followedItemId = null;
      return { ok: true };
    }

    case 'join': {
      const roomId = extractRoomId(request.input);
      if (!roomId) return { ok: false, error: 'room' };
      await startSession(request.tabId, roomId);
      return { ok: true };
    }

    case 'leave':
      endSession(request.tabId);
      return { ok: true };

    case 'react':
      sessions.get(request.tabId)?.connection.send({ t: 'react', emoji: request.emoji });
      return { ok: true };

    case 'chat': {
      const text = cleanChatText(request.text);
      if (text) sessions.get(request.tabId)?.connection.send({ t: 'chat', text });
      return { ok: true };
    }

    case 'go-to-room-page': {
      const item = sessions.get(request.tabId)?.state?.item;
      if (item?.media.kind === 'page') await chrome.tabs.update(request.tabId, { url: item.media.url });
      return { ok: true };
    }

    case 'share-this-page': {
      const session = sessions.get(request.tabId);
      const tab = await chrome.tabs.get(request.tabId);
      const load = pageMedia(tab);
      if (!session || !load) return { ok: false, error: 'page' };
      session.connection.send({ t: 'load', ...load });
      return { ok: true };
    }
  }
}

chrome.runtime.onMessage.addListener((request: PopupRequest, sender, respond) => {
  // Sadece eklentinin kendi sayfalarından (popup) gelen istekler.
  if (sender.id !== chrome.runtime.id || sender.tab) return false;
  handlePopup(request).then(respond, (error: unknown) => respond({ ok: false, error: String(error) }));
  return true;
});
