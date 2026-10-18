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
import {
  CLIENT_ID,
  ROOM_ID_PATTERN,
  cleanChatText,
  cleanName,
  avatarText,
  isAvatar,
  type Avatar,
  type BanEntry,
  type ChatMessage,
  type ClientMessage,
  type Media,
  type Member,
  type PlaybackState,
  type QueueItem,
  type ServerMessage,
} from '@swm/shared/protocol';
import { extractRoomId, newRoomId } from '@swm/shared/room-id';
import { SITE_URL } from './config.ts';
import {
  PORT_NAME,
  PROBE,
  SESSIONS_KEY,
  type BackgroundMessage,
  type ChatLine,
  type FrameMessage,
  type PopupRequest,
  type PopupResponse,
  type PopupStatus,
  type RoomInfo,
  type SiteJoinMessage,
} from './messages.ts';

// Sayfalardaki betikler "şu an bir odada mıyım" diye buraya bakabilsin
// (sonradan yüklenen oynatıcı iframe'leri kendiliğinden bağlansın diye).
void chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });

interface Frame {
  port: chrome.runtime.Port;
  score: number;
  size?: string;
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
  hostId: string | null;
  /** Senkronun çalıştığı çerçeve. */
  activeFrame: number | null;
  /** Etkin çerçeveye oda durumu yollandı mı? */
  activated: boolean;
  /** En son hangi öğe için sekme yönlendirildi (aynı öğe için tekrar yönlendirmemek için). */
  followedItemId: string | null;
  /** Oda oluşturulurken bağlantı açılınca gönderilecek ilk video. */
  pendingLoad: { media: Media; title?: string } | null;
  /** Yasaklılar (sadece yöneticiyken dolu). */
  bans: BanEntry[];
  /** Bağlantı açılmadan yazılan mesaj/emojiler; açılınca gönderilir (kaybolmasın). */
  outbox: ClientMessage[];
  /** Sekme şu an bu adrese gidiyor (siteden gelince beklemeden yönlendirildi); tekrar yönlendirme. */
  navigatingTo: string | null;
  /** Video bulununca "İyi seyirler" açılışı gösterilsin mi (eklentiden oda kurunca/katılınca). */
  intro: boolean;
  /** Sekmenin şu anki adresi (odanın sayfasında mıyız?). */
  tabUrl: string | null;
}

/**
 * Sekme odanın sayfasında mı? Odada bir sayfa açıkken başka bir sayfaya gidilirse
 * oradaki video senkronlanmaz (kullanıcının alakasız oynat/durdur'u odaya gitmesin).
 */
function onRoomPage(session: Session): boolean {
  const item = session.state?.item;
  if (!item || item.media.kind !== 'page') return true;
  return !!session.tabUrl && samePage(session.tabUrl, item.media.url);
}

const sessions = new Map<number, Session>();
/** Sekme → çerçeve → bağlantı ve video puanı. Odadan bağımsız tutulur. */
const frames = new Map<number, Map<number, Frame>>();

// ---- Kalıcılık ----

async function getName(): Promise<string | null> {
  const { name } = await chrome.storage.local.get('name');
  return typeof name === 'string' ? cleanName(name) : null;
}

/**
 * Kalıcı kimlik (sitede de aynısı kullanılır; site-bridge aktarır). Böylece
 * siteden film sayfasına geçen oda yöneticisi yöneticiliğini kaybetmez.
 */
async function getCid(): Promise<string> {
  const { cid } = await chrome.storage.local.get('cid');
  if (typeof cid === 'string' && CLIENT_ID.test(cid)) return cid;
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const fresh = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  await chrome.storage.local.set({ cid: fresh });
  return fresh;
}

async function getAvatar(): Promise<Avatar | null> {
  const { avatar } = await chrome.storage.local.get('avatar');
  return isAvatar(avatar) ? avatar : null;
}

/** İsmin önüne avatarı koyar (varsa): "🦊 Ali". */
function withAvatar(member: Member): string {
  return member.avatar ? `${avatarText(member.avatar)} ${member.name}` : member.name;
}

async function persist(): Promise<void> {
  // followedItemId da saklanır: arka plan yeniden başlayınca sekme film ortasında yeniden yüklenmesin.
  const saved = [...sessions.values()].map(({ tabId, roomId, followedItemId }) => ({ tabId, roomId, followedItemId }));
  await chrome.storage.session.set({ [SESSIONS_KEY]: saved });
}

async function restore(): Promise<void> {
  const { [SESSIONS_KEY]: saved } = await chrome.storage.session.get(SESSIONS_KEY);
  if (!Array.isArray(saved)) return;
  for (const entry of saved as { tabId: number; roomId: string; followedItemId?: string | null }[]) {
    const tab = await chrome.tabs.get(entry.tabId).catch(() => null);
    if (tab) await startSession(entry.tabId, entry.roomId, { followedItemId: entry.followedItemId ?? null });
  }
}

/** Son kapanan odanın nedeni (sekme başına): popup kullanıcıya söylesin. */
const endReasons = new Map<number, 'kicked' | 'version' | 'room_full'>();

const ready = restore();

// ---- Oda bağlantısı ----

interface StartOptions {
  /** Bağlantı açılınca gönderilecek ilk video (oda kurarken). */
  load?: { media: Media; title?: string };
  followedItemId?: string | null;
  intro?: boolean;
}

/** Aynı sekme için aynı anda tek oturum kurulsun (çift tıklama hayalet bağlantı bırakmasın). */
const starting = new Map<number, Promise<Session>>();

function startSession(tabId: number, roomId: string, options: StartOptions = {}): Promise<Session> {
  const pending = starting.get(tabId);
  if (pending) return pending.then((s) => (s.roomId === roomId ? s : startSession(tabId, roomId, options)));
  const promise = createSession(tabId, roomId, options).finally(() => starting.delete(tabId));
  starting.set(tabId, promise);
  return promise;
}

async function createSession(tabId: number, roomId: string, options: StartOptions): Promise<Session> {
  const existing = sessions.get(tabId);
  if (existing?.roomId === roomId) return existing;
  endSession(tabId, false);
  endReasons.delete(tabId);

  const name = (await getName()) ?? 'Guest';
  const avatar = (await getAvatar()) ?? undefined;
  const cid = await getCid();
  const tab = await chrome.tabs.get(tabId).catch(() => null);
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
    hostId: null,
    activeFrame: null,
    activated: false,
    followedItemId: options.followedItemId ?? null,
    // Bağlantı açılmadan verilir: hoş geldin mesajı erken gelse de ilk video kaybolmasın.
    pendingLoad: options.load ?? null,
    bans: [],
    outbox: [],
    navigatingTo: null,
    intro: options.intro ?? false,
    tabUrl: tab?.url ?? null,
  };
  session.connection = new RoomConnection({
    serverUrl: SITE_URL,
    roomId,
    name,
    ...(avatar ? { avatar } : {}),
    cid,
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
      session.hostId = message.hostId ?? null;
      session.queue = message.queue;
      session.state = message.state;
      if (session.pendingLoad) {
        session.connection.send({ t: 'load', ...session.pendingLoad });
        session.pendingLoad = null;
      } else {
        void follow(session);
      }
      for (const queued of session.outbox.splice(0)) session.connection.send(queued);
      pushState(session);
      pushRoom(session);
      break;
    case 'state':
      session.state = message.state;
      void follow(session);
      pushState(session);
      break;
    case 'queue':
      session.queue = message.queue;
      pushRoom(session);
      break;
    case 'members': {
      // Katılan/ayrılanları videonun üstünde kısaca göster.
      const before = new Map(session.members.map((m) => [m.id, m]));
      const after = new Set(message.members.map((m) => m.id));
      for (const m of message.members) {
        if (!before.has(m.id) && m.id !== session.myId) toActive(session, { type: 'notice', kind: 'joined', name: withAvatar(m) });
      }
      for (const m of session.members) {
        if (!after.has(m.id)) toActive(session, { type: 'notice', kind: 'left', name: withAvatar(m) });
      }
      session.members = message.members;
      session.hostId = message.hostId ?? null;
      pushRoom(session);
      break;
    }
    case 'title': {
      const item = session.state?.item;
      if (session.state && item?.id === message.itemId) session.state = { ...session.state, item: { ...item, title: message.title } };
      break;
    }
    case 'reaction':
      toActive(session, { type: 'reaction', emoji: message.emoji, name: withAvatar(message.by) });
      break;
    case 'chat':
      toActive(session, { type: 'chat', line: chatLine(session, message.message) });
      break;
    case 'pong':
      toActive(session, clockMessage(session));
      break;
    case 'waiting': {
      const names = message.ids
        .map((id) => session.members.find((m) => m.id === id))
        .filter((m): m is Member => !!m)
        .map(withAvatar);
      toActive(session, { type: 'waiting', names, me: session.myId !== null && message.ids.includes(session.myId) });
      break;
    }
    case 'bans':
      session.bans = message.bans;
      break;
    case 'error':
      // Oda yöneticisi çıkardıysa (ya da yasaklıysa, oda doluysa, sürüm eskiyse) bağlantıyı
      // kapat ve kullanıcıya nedenini söyle (videonun üstünde ve popup'ta).
      if (message.code === 'version' || message.code === 'room_full' || message.code === 'kicked') {
        toActive(session, { type: 'ended', reason: message.code });
        endReasons.set(session.tabId, message.code);
        endSession(session.tabId);
      }
      // Mesaj sessizce kaybolmasın: kullanıcıya yavaşlamasını söyle.
      if (message.code === 'rate_limited') toActive(session, { type: 'notice', kind: 'slow', name: '' });
      break;
  }
}

/** Sunucuya yollar; bağlantı henüz açık değilse sohbet/emoji kuyrukta bekler. */
function sendOrQueue(session: Session, message: ClientMessage): void {
  if (session.connection.send(message)) return;
  if ((message.t === 'chat' || message.t === 'react') && session.outbox.length < 10) session.outbox.push(message);
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
  void persist();
  const tab = await chrome.tabs.get(session.tabId).catch(() => null);
  if (!tab) return;

  if (item.media.kind === 'page') {
    // Siteden gelirken sekme zaten oraya gönderildiyse ikinci kez yönlendirme (sayfa baştan yüklenmesin).
    const going = session.navigatingTo !== null && samePage(session.navigatingTo, item.media.url);
    session.navigatingTo = null;
    if (!going && (!tab.url || !samePage(tab.url, item.media.url))) await chrome.tabs.update(session.tabId, { url: item.media.url });
  } else {
    const roomUrl = `${SITE_URL}/r/${session.roomId}`;
    endSession(session.tabId);
    if (!tab.url || !samePage(tab.url, roomUrl)) await chrome.tabs.update(session.tabId, { url: roomUrl });
  }
}

function chatLine(session: Session, message: ChatMessage): ChatLine {
  return { id: message.id, name: withAvatar(message.by), text: message.text, mine: message.by.id === session.myId };
}

/** Sayfa üstü panel için oda bilgisini etkin çerçeveye yollar. */
function pushRoom(session: Session): void {
  if (!session.activated) return;
  const room: RoomInfo = {
    roomId: session.roomId,
    inviteUrl: `${SITE_URL}/r/${session.roomId}`,
    members: session.members,
    myId: session.myId,
    hostId: session.hostId,
    queueLength: session.queue.length,
  };
  toActive(session, { type: 'room', room });
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
  // Etkin olmayan (ör. odanın sayfası dışındaki) çerçeve çubuk açmasın; "kapandı" bildirimi hariç.
  if (session.activeFrame === null || (!session.activated && message.type !== 'ended')) return;
  const frame = frames.get(session.tabId)?.get(session.activeFrame);
  if (frame) post(frame.port, message);
}

/** Etkin çerçeveye oda durumunu yollar (ilk seferde "etkinleş" mesajıyla). */
function pushState(session: Session): void {
  if (!session.state || session.activeFrame === null) return;
  const frame = frames.get(session.tabId)?.get(session.activeFrame);
  if (!frame) return;
  if (!onRoomPage(session)) {
    // Odanın sayfasında değiliz: senkronu bu sayfada durdur.
    if (session.activated) post(frame.port, { type: 'deactivate' });
    session.activated = false;
    return;
  }
  if (!session.activated) {
    const clock = clockMessage(session) as Extract<BackgroundMessage, { type: 'clock' }>;
    post(frame.port, { type: 'activate', state: session.state, offset: clock.offset, synced: clock.synced });
    session.activated = true;
    pushRoom(session);
    if (session.intro) {
      session.intro = false;
      post(frame.port, { type: 'intro' });
    }
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

async function handleFrame(tabId: number, frameId: number, port: chrome.runtime.Port, message: FrameMessage): Promise<void> {
  await ready;
  const frame = frames.get(tabId)?.get(frameId);
  if (!frame || frame.port !== port) return;
  switch (message.type) {
    case 'join':
      await startSession(tabId, message.roomId);
      break;
    case 'candidate': {
      frame.score = message.score;
      frame.size = message.size;
      const session = sessions.get(tabId);
      // Bu sekmede oda yoksa çerçeve boşuna video aramasın.
      if (session) chooseActive(session);
      else post(port, { type: 'idle' });
      break;
    }
    case 'send': {
      const session = sessions.get(tabId);
      if (session && session.activeFrame === frameId) sendOrQueue(session, message.message);
      break;
    }
  }
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

  // Bir çerçevenin mesajları sırayla işlenir ("katıl" bitmeden "aday" işlenmesin).
  let queue = Promise.resolve();
  port.onMessage.addListener((message: FrameMessage) => {
    queue = queue.then(() => handleFrame(tabId, frameId, port, message)).catch(() => {});
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
  const session = sessions.get(tabId);
  if (!session) return;
  if (info.url) {
    session.tabUrl = info.url;
    // Odanın sayfasına dönüldü ya da ayrıldı: senkronu aç/kapat.
    pushState(session);
  }
  if (info.status === 'complete') probe(tabId);
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
    avatar: await getAvatar(),
    tabUrl: tab?.url ?? null,
    ended: session ? null : (endReasons.get(tabId) ?? null),
    session: session
      ? {
          roomId: session.roomId,
          inviteUrl: `${SITE_URL}/r/${session.roomId}`,
          connection: session.status,
          members: session.members,
          myId: session.myId,
          hostId: session.hostId,
          bans: session.myId !== null && session.myId === session.hostId ? session.bans : [],
          item,
          queueLength: session.queue.length,
          onRoomPage: onRoomPage(session),
          hasVideo: session.activeFrame !== null,
          frames: frames.get(tabId)?.size ?? 0,
          bestVideo: session.activeFrame === null ? null : (frames.get(tabId)?.get(session.activeFrame)?.size ?? null),
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
      // identityAt: sitedeki isimle hangisi daha yeni (site-bridge iki yönlü eşitler).
      const update: Record<string, string | number> = { name, identityAt: Date.now() };
      if (isAvatar(request.avatar)) update.avatar = request.avatar;
      await chrome.storage.local.set(update);
      return { ok: true };
    }

    case 'create': {
      const tab = await chrome.tabs.get(request.tabId);
      // ScreenWithMe sitesinin kendisinde eklentiyle oda kurulmaz; oda sitede kurulur.
      if (tab.url && new URL(tab.url).origin === SITE_ORIGIN) return { ok: false, error: 'site' };
      const load = pageMedia(tab);
      if (!load) return { ok: false, error: 'page' };
      await startSession(request.tabId, newRoomId(), { load, intro: true });
      return { ok: true };
    }

    case 'join': {
      const roomId = extractRoomId(request.input);
      if (!roomId) return { ok: false, error: 'room' };
      await startSession(request.tabId, roomId, { intro: true });
      return { ok: true };
    }

    case 'reload':
      await chrome.tabs.reload(request.tabId);
      return { ok: true };

    case 'leave':
      endSession(request.tabId);
      return { ok: true };

    case 'react': {
      const session = sessions.get(request.tabId);
      if (session) sendOrQueue(session, { t: 'react', emoji: request.emoji });
      return { ok: true };
    }

    case 'chat': {
      const text = cleanChatText(request.text);
      const session = sessions.get(request.tabId);
      if (text && session) sendOrQueue(session, { t: 'chat', text });
      return { ok: true };
    }

    case 'kick':
      sessions.get(request.tabId)?.connection.send({ t: 'kick', id: request.memberId });
      return { ok: true };

    case 'unban':
      sessions.get(request.tabId)?.connection.send({ t: 'unban', id: request.banId });
      return { ok: true };

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

const SITE_ORIGIN = new URL(SITE_URL).origin;

// İsim/avatar değişince (popup'tan ya da siteden) odalardakiler de hemen görsün.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || (!changes.name && !changes.avatar)) return;
  void (async () => {
    const name = await getName();
    if (!name) return;
    const avatar = (await getAvatar()) ?? undefined;
    for (const session of sessions.values()) {
      session.connection.setIdentity(name, avatar);
      session.connection.send(avatar ? { t: 'rename', name, avatar } : { t: 'rename', name });
    }
  })();
});

chrome.runtime.onMessage.addListener((request: PopupRequest | SiteJoinMessage, sender, respond) => {
  if (sender.id !== chrome.runtime.id) return false;

  // ScreenWithMe sitesindeki köprü: "bu sekme şu odaya katılsın". Sadece sitenin
  // kendi adresinden kabul edilir; başka bir site bu isteği yapamaz.
  if (sender.tab) {
    const tabId = sender.tab.id;
    if (request.type === 'site-join' && sender.origin === SITE_ORIGIN && tabId !== undefined && ROOM_ID_PATTERN.test(request.roomId)) {
      const url = typeof request.url === 'string' && /^https?:\/\//.test(request.url) ? request.url : null;
      respond({ ok: true });
      void ready.then(async () => {
        const session = await startSession(tabId, request.roomId);
        // Hız: sayfa belli ise bağlantının açılmasını beklemeden sekmeyi hemen götür.
        if (url) {
          session.navigatingTo = url;
          await chrome.tabs.update(tabId, { url });
        }
        // Hoş geldin mesajı zaten geldiyse takip etmeyi şimdi başlat.
        session.followedItemId = null;
        await follow(session);
      });
    }
    return false;
  }

  // Popup
  handlePopup(request as PopupRequest).then(respond, (error: unknown) => respond({ ok: false, error: String(error) }));
  return true;
});
