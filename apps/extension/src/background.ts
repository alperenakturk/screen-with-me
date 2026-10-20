// Eklentinin arka planı (service worker). Her sekme için ayrı bir oda
// bağlantısı tutar; sunucudan gelenleri sekmedeki etkin çerçeveye, oradan
// gelenleri sunucuya iletir. Odada bir sayfa açıldığında sekmeyi oraya götürür.
//
// Chrome bu betiği boştayken kapatabilir. WebSocket'teki düzenli ping onu
// açık tutar; yine de kapanırsa hangi sekmenin hangi odada olduğu
// chrome.storage.session'da saklanır ve yeniden açılınca bağlantılar kurulur.

import { ServerClock } from '@swm/shared/clock';
import { RoomConnection, type ConnectionStatus } from '@swm/shared/connection';
import { frameVerdict, isForwardedKey, isRelayable, type EmbedReply, type EmbedRequest, type FrameVerdict } from '@swm/shared/embed';
import { samePage } from '@swm/shared/media';
import {
  CLIENT_ID,
  ROOM_ID_PATTERN,
  SYSTEM_MEMBER_ID,
  isStickerData,
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
  type PinList,
  type PlaybackState,
  type QueueItem,
  type ServerMessage,
} from '@swm/shared/protocol';
import { extractRoomId, newRoomId } from '@swm/shared/room-id';
import { SITE_URL } from './config.ts';
import {
  EMBED_PORT_NAME,
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
  /** Çerçeve bizim sitenin içinde (gömülü film); 1 = film sayfasının kendisi. */
  embedDepth?: number;
}

/**
 * "Film sitenin içinde": sitedeki oda sayfası film sayfasını kendi oynatıcı alanında
 * (iframe) açtı. Oda bağlantısı sitede kalır (aynı kişi odada iki kez görünmesin);
 * burada sadece site ile çerçevedeki senkron motoru arasında mesaj taşınır.
 */
interface Embed {
  tabId: number;
  roomId: string;
  /** Sitenin köprüsüyle bağlantı (site-bridge). */
  port: chrome.runtime.Port;
  url: string;
  state: PlaybackState | null;
  offset: number;
  synced: boolean;
  activeFrame: number | null;
  activated: boolean;
}

const embeds = new Map<number, Embed>();

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
  /** Son oynatma hareketini yapan (kendi geçişlerimde soru sorulmasın). */
  lastBy: Member | null;
  /** Cevap bekleyen ortak geçiş: hangi öğe için ve ne tür. */
  pendingFollow: { itemId: string | null; kind: 'page' | 'room' | 'home' } | null;
  /** Eklentiyle filmdeyken ayrılanlar (isim → zaman): siteden dönerse "odaya döndü" sorusu. */
  extLeft: Map<string, number>;
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
  /** Odanın son mesajları (film sayfasındaki sohbet panelinde geçmiş olarak gösterilir). */
  chatLog: ChatLine[];
  /** Açık videonun pinlenmiş anları (çubuktaki pin şeridi için). */
  pins: PinList | null;
  /** Oda ayarı: video bitince sıradakine kendiliğinden geç. */
  autoNext: boolean;
  /** Oda ayarı: emojiler kapalı. */
  noReactions: boolean;
  /** Kaydedilmiş odanın adı. */
  roomName: string | null;
  /** Çerçevelere en son duyurulan oda görünümü durumu (aynısını tekrar yollamamak için). */
  roomViewSent: string | null;
  /** Odanın özel emojileri (kimlik → data: adresi); çerçeve etkinleşince hepsi yollanır. */
  stickers: Map<string, string>;
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
  const saved: Array<{ tabId: number; roomId: string; followedItemId?: string | null; embed?: true }> = [...sessions.values()].map(
    ({ tabId, roomId, followedItemId }) => ({ tabId, roomId, followedItemId }),
  );
  // Gömülü filmler de yazılır: sitenin içindeki çerçeveler "bir oda var" görüp bağlansın.
  for (const { tabId, roomId } of embeds.values()) saved.push({ tabId, roomId, embed: true });
  await chrome.storage.session.set({ [SESSIONS_KEY]: saved });
}

async function restore(): Promise<void> {
  const { [SESSIONS_KEY]: saved } = await chrome.storage.session.get(SESSIONS_KEY);
  if (!Array.isArray(saved)) return;
  for (const entry of saved as { tabId: number; roomId: string; followedItemId?: string | null; embed?: boolean }[]) {
    // Gömülü filmi site kendisi yeniden kurar (köprü yeniden bağlanınca).
    if (entry.embed) continue;
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
  // Sitenin içindeki film bırakılıp ayrı sekmeye geçiliyor: gömülü senkron biter.
  endEmbed(tabId, false);
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
    lastBy: null,
    pendingFollow: null,
    extLeft: new Map(),
    // Bağlantı açılmadan verilir: hoş geldin mesajı erken gelse de ilk video kaybolmasın.
    pendingLoad: options.load ?? null,
    bans: [],
    outbox: [],
    navigatingTo: null,
    intro: options.intro ?? false,
    chatLog: [],
    pins: null,
    autoNext: true,
    noReactions: false,
    roomName: null,
    roomViewSent: null,
    stickers: new Map(),
    tabUrl: tab?.url ?? null,
  };
  session.connection = new RoomConnection({
    serverUrl: SITE_URL,
    roomId,
    name,
    ...(avatar ? { avatar } : {}),
    cid,
    client: 'ext',
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
      session.pins = message.pins ?? null;
      session.autoNext = message.settings?.autoNext !== false;
      session.noReactions = message.settings?.noReactions === true;
      session.roomName = message.settings?.saved && message.settings.name ? message.settings.name : null;
      session.chatLog = message.chat.map((m) => chatLine(session, m));
      // Özel emojiler welcome'dan sonra tek tek gelir; benimkileri bu odaya da yükle.
      session.stickers.clear();
      toActive(session, { type: 'stickers-clear' });
      void registerMyStickers(session);
      if (session.pendingLoad) {
        session.connection.send({ t: 'load', ...session.pendingLoad });
        session.pendingLoad = null;
      } else {
        void follow(session);
      }
      for (const queued of session.outbox.splice(0)) session.connection.send(queued);
      pushState(session);
      pushRoom(session);
      pushRoomView(session);
      break;
    case 'state':
      session.state = message.state;
      session.lastBy = message.by;
      void follow(session);
      pushState(session);
      pushRoomView(session);
      if (session.pins && session.pins.itemId !== message.state.item?.id) {
        session.pins = null;
        pushPins(session);
      }
      break;
    case 'queue':
      session.queue = message.queue;
      pushRoom(session);
      break;
    case 'members': {
      // Katılan/ayrılanları videonun üstünde kısaca göster.
      const before = new Map(session.members.map((m) => [m.id, m]));
      const after = new Set(message.members.map((m) => m.id));
      const now = Date.now();
      for (const m of session.members) {
        if (after.has(m.id)) continue;
        toActive(session, { type: 'notice', kind: 'left', name: withAvatar(m) });
        if (m.client === 'ext') session.extLeft.set(m.name, now);
      }
      for (const m of message.members) {
        if (before.has(m.id) || m.id === session.myId) continue;
        // Filmden çıkıp hemen siteden giren: 🏠 ile odaya döndü → "sen de dönmek ister misin?"
        const leftAt = session.extLeft.get(m.name);
        if (m.client !== 'ext' && leftAt !== undefined && now - leftAt < 20_000 && session.activated) {
          session.extLeft.delete(m.name);
          session.pendingFollow = { itemId: null, kind: 'home' };
          toActive(session, { type: 'ask-follow', kind: 'home', name: withAvatar(m) });
          continue;
        }
        toActive(session, { type: 'notice', kind: 'joined', name: withAvatar(m) });
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
      toActive(session, {
        type: 'reaction',
        byId: message.by.id,
        name: message.by.name,
        ...(message.by.avatar ? { avatar: message.by.avatar } : {}),
        ...(message.emoji ? { emoji: message.emoji } : {}),
        ...(message.sticker ? { sticker: message.sticker } : {}),
      });
      break;
    case 'pins':
      session.pins = message.pins;
      pushPins(session);
      break;
    case 'settings':
      session.autoNext = message.settings.autoNext !== false;
      session.noReactions = message.settings.noReactions === true;
      session.roomName = message.settings.saved && message.settings.name ? message.settings.name : null;
      pushRoom(session);
      break;
    case 'sticker':
      session.stickers.set(message.sticker.id, message.sticker.data);
      toActive(session, { type: 'sticker', id: message.sticker.id, data: message.sticker.data });
      break;
    case 'sticker-removed':
      session.stickers.delete(message.id);
      toActive(session, { type: 'sticker-removed', id: message.id });
      break;
    case 'chat': {
      const line = chatLine(session, message.message);
      session.chatLog = [...session.chatLog, line].slice(-50);
      toActive(session, { type: 'chat', line });
      break;
    }
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
      // Yönetici modu: hareketim kabul edilmedi; video odanın durumuna dönsün ve nedeni görünsün.
      if (message.code === 'not_host') {
        if (session.state && session.activated) toActive(session, { type: 'state', state: session.state });
        toActive(session, { type: 'notice', kind: 'locked', name: '' });
      }
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

  // Başkası geçiş yaptıysa ve ben şu an filmi izliyorsam önce sor: evet diyen gider, hayır diyen kalır.
  const someoneElse = session.lastBy !== null && session.lastBy.id !== session.myId && session.lastBy.id !== SYSTEM_MEMBER_ID;
  if (item.media.kind === 'page') {
    // Siteden gelirken sekme zaten oraya gönderildiyse ikinci kez yönlendirme (sayfa baştan yüklenmesin).
    const going = session.navigatingTo !== null && samePage(session.navigatingTo, item.media.url);
    session.navigatingTo = null;
    if (going || (tab.url && samePage(tab.url, item.media.url))) return;
    if (someoneElse && session.activeFrame !== null) {
      session.pendingFollow = { itemId: item.id, kind: 'page' };
      toActive(session, { type: 'ask-follow', kind: 'page', name: withAvatar(session.lastBy!), host: hostOf(item.media.url) });
      return;
    }
    await chrome.tabs.update(session.tabId, { url: item.media.url });
  } else if (someoneElse && session.activeFrame !== null) {
    session.pendingFollow = { itemId: item.id, kind: 'room' };
    toActive(session, { type: 'ask-follow', kind: 'room', name: withAvatar(session.lastBy!) });
  } else {
    const roomUrl = `${SITE_URL}/r/${session.roomId}`;
    endSession(session.tabId);
    if (!tab.url || !samePage(tab.url, roomUrl)) await chrome.tabs.update(session.tabId, { url: roomUrl });
  }
}

/** "www.ornek.com" → "ornek.com" (soru metninde gösterilir). */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Sekmeyi sitedeki odaya götürür; eklentinin bağlantısı kapanır (aynı kişi iki kez görünmesin). */
async function goToRoom(session: Session): Promise<void> {
  // #back: site isim/avatar adımını atlayıp doğrudan odaya girsin (kişi zaten odadaydı).
  const roomUrl = `${SITE_URL}/r/${session.roomId}#back`;
  endSession(session.tabId);
  await chrome.tabs.update(session.tabId, { url: roomUrl });
}

function chatLine(session: Session, message: ChatMessage): ChatLine {
  return {
    id: message.id,
    name: message.by.name,
    ...(message.by.avatar ? { avatar: message.by.avatar } : {}),
    text: message.text,
    mine: message.by.id === session.myId,
    at: message.at,
  };
}

/**
 * Oda görünümü (hep açık): film kendi sekmesinde oynarken sayfa sitedeki odaya dönüşür. Çerçeve yok,
 * sitenin hiçbir başlığına dokunulmaz; her sitede çalışır. Video henüz bulunmadıysa (çoğu oynatıcı
 * videoyu "oynat"a basınca oluşturur) üst çerçeve "Filmi başlat" kartı gösterir.
 */
function roomViewMessage(session: Session, frameId: number): Extract<BackgroundMessage, { type: 'roomview' }> {
  const on = session.activated && session.activeFrame !== null;
  const hint = frameId === 0 && !on && session.state?.item?.media.kind === 'page' && onRoomPage(session);
  return { type: 'roomview', on, active: frameId === session.activeFrame, hint };
}

/** Oda görünümünü sekmedeki tüm çerçevelere duyurur (etkin çerçeve odayı çizer, üsttekiler büyütür). */
function pushRoomView(session: Session): void {
  const top = roomViewMessage(session, 0);
  const key = `${top.on}:${top.hint}:${session.activeFrame}`;
  if (session.roomViewSent === key) return;
  session.roomViewSent = key;
  for (const [frameId, frame] of frames.get(session.tabId) ?? []) {
    if (!frame.embedDepth) post(frame.port, roomViewMessage(session, frameId));
  }
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
    autoNext: session.autoNext,
    noReactions: session.noReactions,
    ...(session.roomName ? { roomName: session.roomName } : {}),
  };
  toActive(session, { type: 'room', room });
  pushPins(session);
}

/** Kendi özel emojilerimi (eklentide saklı) bağlandığım odaya yükler. */
async function registerMyStickers(session: Session): Promise<void> {
  const { myStickers } = await chrome.storage.local.get('myStickers').catch(() => ({ myStickers: [] }));
  if (!Array.isArray(myStickers)) return;
  for (const data of myStickers) {
    if (isStickerData(data)) session.connection.send({ t: 'sticker-add', data });
  }
}

/** Çubuktaki pin şeridi için pinleri etkin çerçeveye yollar (kendi pinim / yönetici bilgisiyle). */
function pushPins(session: Session): void {
  if (!session.activated) return;
  const host = session.myId !== null && session.myId === session.hostId;
  const pins = (session.pins?.pins ?? []).map((pin) => ({ ...pin, removable: host || pin.by.id === session.myId }));
  toActive(session, { type: 'pins', pins });
}

// ---- Çerçeveler ----

function probe(tabId: number): void {
  chrome.tabs.sendMessage(tabId, { type: PROBE }).catch(() => {});
}

function clockMessage(session: Session): BackgroundMessage {
  return { type: 'clock', offset: session.clock.now() - Date.now(), synced: session.clock.synced };
}

function toActive(session: Session, message: BackgroundMessage): void {
  // Etkin olmayan (ör. odanın sayfası dışındaki) çerçeve çubuk açmasın; "kapandı" bildirimi ve
  // "takip et?" sorusu hariç (yeni video gelince bu sayfadaki senkron soru gitmeden durmuş oluyor).
  if (session.activeFrame === null || (!session.activated && message.type !== 'ended' && message.type !== 'ask-follow')) return;
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
    pushRoomView(session);
    return;
  }
  if (!session.activated) {
    const clock = clockMessage(session) as Extract<BackgroundMessage, { type: 'clock' }>;
    post(frame.port, { type: 'activate', state: session.state, offset: clock.offset, synced: clock.synced });
    session.activated = true;
    pushRoom(session);
    pushRoomView(session);
    for (const [id, data] of session.stickers) post(frame.port, { type: 'sticker', id, data });
    post(frame.port, { type: 'chat-history', lines: session.chatLog });
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
    if (frame.embedDepth) continue;
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
  pushRoomView(session);
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
      if (message.embedDepth) frame.embedDepth = message.embedDepth;
      const session = sessions.get(tabId);
      const embed = embeds.get(tabId);
      if (embed && frame.embedDepth) {
        // Film sayfasının kendisinde eklenti çalıştı: sayfa çerçevede gerçekten açıldı (engellenmedi).
        if (frame.embedDepth === 1) post(embed.port, { type: 'frame' });
        chooseEmbedActive(embed);
      } else if (session && !frame.embedDepth) {
        chooseActive(session);
        // Sonradan yüklenen çerçeve (oynatıcı iframe'i) de oda görünümünü bilsin.
        post(port, roomViewMessage(session, frameId));
      } else {
        // Bu sekmede (bu çerçeve için) oda yoksa çerçeve boşuna video aramasın.
        post(port, { type: 'idle' });
      }
      break;
    }
    case 'send': {
      const embed = embeds.get(tabId);
      if (embed) {
        // Oda bağlantısı sitede: sadece oynatma mesajlarını siteye ver, o yollar.
        if (embed.activeFrame === frameId && isRelayable(message.message)) post(embed.port, { type: 'send', message: message.message });
        break;
      }
      const session = sessions.get(tabId);
      if (session && session.activeFrame === frameId) sendOrQueue(session, message.message);
      break;
    }
    case 'status': {
      const embed = embeds.get(tabId);
      if (embed?.activeFrame === frameId) post(embed.port, { type: 'status', status: message.status });
      break;
    }
    case 'key':
    case 'fullscreen': {
      // Odak ya da ⛶ düğmesi videonun olmadığı çerçevede de olabilir (film sayfası, video iç çerçevede).
      const embed = embeds.get(tabId);
      if (!embed || !frame.embedDepth) break;
      if (message.type === 'fullscreen') post(embed.port, { type: 'fullscreen' });
      else if (isForwardedKey(message.key)) post(embed.port, { type: 'key', key: message.key });
      break;
    }
    case 'follow-answer': {
      const session = sessions.get(tabId);
      const pending = session?.pendingFollow ?? null;
      if (!session || !pending) break;
      session.pendingFollow = null;
      if (!message.yes) break;
      const item = session.state?.item;
      if (pending.kind === 'page' && item && item.id === pending.itemId && item.media.kind === 'page') {
        await chrome.tabs.update(session.tabId, { url: item.media.url });
      } else {
        await goToRoom(session);
      }
      break;
    }
    case 'go-room': {
      // Film bitti ya da başka bir şey izlenecek: sekme sitedeki odaya döner (site bağlantısı devralır).
      const session = sessions.get(tabId);
      if (session) await goToRoom(session);
      break;
    }
  }
}

// ---- Film sitenin içinde (gömülü) ----

function post(port: chrome.runtime.Port, message: BackgroundMessage | EmbedReply): void {
  try {
    port.postMessage(message);
  } catch {
    // Çerçeve/site kapanmış olabilir.
  }
}

/**
 * Sayfa başka bir sitenin içinde açılmaya izin veriyor mu? Başlıklara önceden bakarız
 * (X-Frame-Options, CSP frame-ancestors). Başlıkları değiştirmiyoruz; sadece açılamayacak
 * sayfada hata ekranı göstermeden hemen ayrı sekmeye düşmek için. Çerez gönderilmez,
 * gövde indirilmez (başlıklar gelince istek kesilir). Bakılamazsa denenir: asıl karar
 * çerçevedeki el sıkışmadır.
 */
async function precheck(url: string): Promise<FrameVerdict> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(url, { credentials: 'omit', redirect: 'follow', signal: controller.signal, cache: 'no-store' });
    return frameVerdict(response.headers, response.url || url, SITE_URL);
  } catch {
    return frameVerdict(new Headers(), url, SITE_URL);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

function endEmbed(tabId: number, save = true): void {
  const embed = embeds.get(tabId);
  if (!embed) return;
  embeds.delete(tabId);
  // Sitenin içindeki çerçeveler uyusun (video aramayı, senkronu bıraksın).
  for (const frame of frames.get(tabId)?.values() ?? []) if (frame.embedDepth) post(frame.port, { type: 'idle' });
  if (save) void persist();
}

/** Gömülü filmin çerçeveleri arasından en iyi videoyu seçer (sadece sitenin içindekiler). */
function chooseEmbedActive(embed: Embed): void {
  let best: number | null = null;
  let bestScore = 0;
  for (const [frameId, frame] of frames.get(embed.tabId) ?? []) {
    if (!frame.embedDepth) continue;
    if (frame.score > bestScore) {
      best = frameId;
      bestScore = frame.score;
    }
  }
  if (best === embed.activeFrame) return;
  if (embed.activeFrame !== null) {
    const old = frames.get(embed.tabId)?.get(embed.activeFrame);
    if (old) post(old.port, { type: 'deactivate' });
  }
  embed.activeFrame = best;
  embed.activated = false;
  pushEmbedState(embed);
}

function pushEmbedState(embed: Embed): void {
  if (!embed.state || embed.activeFrame === null) return;
  const frame = frames.get(embed.tabId)?.get(embed.activeFrame);
  if (!frame) return;
  if (embed.activated) {
    post(frame.port, { type: 'state', state: embed.state });
    return;
  }
  post(frame.port, { type: 'activate', state: embed.state, offset: embed.offset, synced: embed.synced });
  embed.activated = true;
}

function embedFrame(embed: Embed): chrome.runtime.Port | null {
  if (embed.activeFrame === null || !embed.activated) return null;
  return frames.get(embed.tabId)?.get(embed.activeFrame)?.port ?? null;
}

async function handleEmbed(tabId: number, port: chrome.runtime.Port, request: EmbedRequest): Promise<void> {
  await ready;
  const embed = embeds.get(tabId);
  if (request.type === 'start') {
    if (!ROOM_ID_PATTERN.test(request.roomId) || !/^https?:\/\//.test(request.url)) return;
    // Bu sekmede eklentinin kendi oda bağlantısı varsa kapanır: bağlantıyı site tutuyor.
    endSession(tabId);
    endEmbed(tabId, false);
    const next: Embed = { tabId, roomId: request.roomId, port, url: request.url, state: null, offset: 0, synced: false, activeFrame: null, activated: false };
    if (!request.resume) {
      const verdict = await precheck(request.url);
      if (verdict !== 'ok') {
        post(port, { type: 'blocked', reason: verdict });
        await persist();
        return;
      }
    }
    // Kontrol sürerken site vazgeçmiş olabilir (başka video, sayfa kapandı).
    if (!activeEmbedPorts.has(port)) return;
    embeds.set(tabId, next);
    // Çerçeveler bağlanmadan önce "oda var" yazılmış olsun.
    await persist();
    if (!request.resume) post(port, { type: 'try' });
    // Arka plan yeniden başladıysa çerçeveler uykuda olabilir: uyandır.
    probe(tabId);
    return;
  }
  if (!embed || embed.port !== port) return;
  switch (request.type) {
    case 'state':
      embed.state = request.state;
      pushEmbedState(embed);
      break;
    case 'clock': {
      embed.offset = request.offset;
      embed.synced = request.synced;
      const frame = embedFrame(embed);
      if (frame) post(frame, { type: 'clock', offset: request.offset, synced: request.synced });
      break;
    }
    case 'control': {
      const frame = embedFrame(embed);
      if (frame) post(frame, { type: 'control', control: request.control });
      break;
    }
    case 'stop':
      endEmbed(tabId);
      break;
  }
}

const activeEmbedPorts = new Set<chrome.runtime.Port>();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== EMBED_PORT_NAME) return;
  const tabId = port.sender?.tab?.id;
  // Sadece sitenin kendi sayfası (üst çerçeve) film açtırabilir.
  if (tabId === undefined || port.sender?.origin !== SITE_ORIGIN || port.sender.frameId !== 0) {
    port.disconnect();
    return;
  }
  activeEmbedPorts.add(port);
  let queue = Promise.resolve();
  port.onMessage.addListener((request: EmbedRequest) => {
    queue = queue.then(() => handleEmbed(tabId, port, request)).catch(() => {});
  });
  port.onDisconnect.addListener(() => {
    activeEmbedPorts.delete(port);
    if (embeds.get(tabId)?.port === port) endEmbed(tabId);
  });
});

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
    const embed = embeds.get(tabId);
    if (embed && embed.activeFrame === frameId) {
      embed.activeFrame = null;
      chooseEmbedActive(embed);
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  const session = sessions.get(tabId);
  if (!session) return;
  // Sekme sitedeki oda sayfasına döndüyse (geri tuşu dahil) 🏠 gibi: film bağlantısı kapanır,
  // site kendi bağlantısıyla devralır (aynı kişi iki kez görünmesin, "filmde" sanılmasın).
  if (info.url && info.url.startsWith(`${SITE_URL}/r/`)) {
    endSession(tabId);
    return;
  }
  if (info.url) {
    session.tabUrl = info.url;
    // Odanın sayfasına dönüldü ya da ayrıldı: senkronu aç/kapat.
    pushState(session);
  }
  if (info.status === 'complete') probe(tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  endSession(tabId);
  endEmbed(tabId);
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

    case 'go-room': {
      const session = sessions.get(request.tabId);
      if (session) await goToRoom(session);
      return { ok: true };
    }

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

// Eklenti yeni kurulunca açık ScreenWithMe sekmelerini yenile: site eklentiyi ancak sayfa
// yeniden yüklenince görür. Böylece "eklenti gerekiyor" uyarısı kendiliğinden kalkar
// (yenilenen oda sayfası isim sormadan odaya döner).
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason !== 'install') return;
  void chrome.tabs.query({ url: `${SITE_ORIGIN}/*` }).then((tabs) => {
    for (const tab of tabs) if (tab.id !== undefined) void chrome.tabs.reload(tab.id);
  });
});

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
    // Film sayfasındaki 🏠 (tek seferlik mesaj: uyuyan arka planı da uyandırır).
    if ((request as { type?: string }).type === 'go-room-tab' && tabId !== undefined) {
      respond({ ok: true });
      void ready.then(async () => {
        const session = sessions.get(tabId);
        if (session) await goToRoom(session);
      });
      return false;
    }
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
