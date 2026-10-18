// Eklentinin metinleri.

const tr = {
  tagline: 'Bu sekmedeki videoyu arkadaşlarınla aynı anda izle.',
  yourName: 'Adın',
  namePlaceholder: 'Örn. Alperen',
  save: 'Kaydet',
  edit: 'Değiştir',
  createHere: 'Bu sayfada oda oluştur',
  createHint: 'Videonun olduğu sayfadayken bas. Arkadaşların davet linkiyle aynı sayfaya gelir.',
  or: 'veya',
  joinPlaceholder: 'Oda linki veya kodu',
  join: 'Katıl',
  invite: 'Davet linki',
  copy: 'Kopyala',
  copied: 'Kopyalandı',
  room: 'Oda: {id}',
  members: 'Odadakiler ({n})',
  you: 'sen',
  nowPlaying: 'Odada açık',
  nothingPlaying: 'Odada henüz bir şey açılmadı.',
  notOnRoomPage: 'Bu sekme odanın sayfasında değil.',
  goToRoomPage: 'Odanın sayfasına git',
  shareThisPage: 'Bu sayfayı odada aç',
  noVideo: 'Bu sayfada henüz video bulunamadı. Videoyu başlatınca algılanır.',
  videoFound: 'Video bulundu, senkron açık.',
  leave: 'Odadan çık',
  chatPlaceholder: 'Hızlı mesaj…',
  send: 'Gönder',
  'status.connecting': 'Bağlanıyor…',
  'status.open': 'Bağlı',
  'status.reconnecting': 'Bağlantı koptu, tekrar deneniyor…',
  'status.closed': 'Bağlantı kapalı',
  'error.room': 'Geçerli bir oda linki veya kodu gir.',
  'error.page': 'Bu sekmede oda oluşturulamaz (normal bir web sayfası açık olmalı).',
  'error.name': 'Önce adını yaz.',
  autoplayBlocked: 'Tarayıcın otomatik oynatmayı engelledi.',
  startWatching: 'İzlemeye başla',
  diag: 'Tanı: {frames} çerçeve bağlı · seçilen video: {video}',
  yourAvatar: 'Avatarın',
  react: 'Tepki gönder',
  speed: 'Hız',
  joined: '{name} odaya katıldı',
  left: '{name} ayrıldı',
  syncDiff: 'Senkron: odadan {ms} ms uzakta',
  syncUnknown: 'Senkron ölçülüyor…',
  waitingFor: '⏳ {names} bekleniyor…',
  waitingForYou: '⏳ Videon yükleniyor, herkes seni bekliyor…',
  close: 'Kapat',
  copyInvite: 'Davet linkini kopyala',
  chatEmpty: 'Henüz mesaj yok.',
  moreReactions: 'Diğer emojiler',
  slowDown: 'Biraz yavaş: çok hızlı mesaj gönderiyorsun.',
  intro: 'İyi seyirler!',
  'error.site': 'Burası zaten ScreenWithMe: odanı bu sayfada, sitenin kendisinde kurabilirsin.',
  kick: 'Odadan çıkar',
  kickConfirm: '{name} odadan çıkarılsın mı? Sen yasağı kaldırana kadar geri giremez.',
  bans: 'Çıkarılanlar',
  unban: 'Yasağı kaldır',
};

type Key = keyof typeof tr;

const en: Record<Key, string> = {
  tagline: 'Watch the video in this tab together with your friends.',
  yourName: 'Your name',
  namePlaceholder: 'e.g. Alex',
  save: 'Save',
  edit: 'Change',
  createHere: 'Create a room on this page',
  createHint: 'Press it on the page with the video. Your friends land on the same page via the invite link.',
  or: 'or',
  joinPlaceholder: 'Room link or code',
  join: 'Join',
  invite: 'Invite link',
  copy: 'Copy',
  copied: 'Copied',
  room: 'Room: {id}',
  members: 'In the room ({n})',
  you: 'you',
  nowPlaying: 'Open in the room',
  nothingPlaying: 'Nothing is open in the room yet.',
  notOnRoomPage: "This tab isn't on the room's page.",
  goToRoomPage: "Go to the room's page",
  shareThisPage: 'Open this page in the room',
  noVideo: 'No video found on this page yet. It is detected once you start it.',
  videoFound: 'Video found, sync is on.',
  leave: 'Leave room',
  chatPlaceholder: 'Quick message…',
  send: 'Send',
  'status.connecting': 'Connecting…',
  'status.open': 'Connected',
  'status.reconnecting': 'Connection lost, retrying…',
  'status.closed': 'Disconnected',
  'error.room': 'Enter a valid room link or code.',
  'error.page': "A room can't be created in this tab (open a normal web page).",
  'error.name': 'Enter your name first.',
  autoplayBlocked: 'Your browser blocked autoplay.',
  startWatching: 'Start watching',
  diag: 'Diagnostics: {frames} frames connected · chosen video: {video}',
  yourAvatar: 'Your avatar',
  react: 'Send a reaction',
  speed: 'Speed',
  joined: '{name} joined',
  left: '{name} left',
  syncDiff: 'Sync: {ms} ms from the room',
  syncUnknown: 'Measuring sync…',
  waitingFor: '⏳ Waiting for {names}…',
  waitingForYou: '⏳ Your video is loading, everyone is waiting for you…',
  close: 'Close',
  copyInvite: 'Copy invite link',
  chatEmpty: 'No messages yet.',
  moreReactions: 'More emojis',
  slowDown: "Slow down: you're sending messages too fast.",
  intro: 'Enjoy the show!',
  'error.site': 'This is ScreenWithMe itself: create your room right here on the website.',
  kick: 'Remove from room',
  kickConfirm: "Remove {name} from the room? They can't come back until you unban them.",
  bans: 'Removed',
  unban: 'Unban',
};

// Dil sitedekiyle aynı: site-bridge sitedeki seçimi 'lang' olarak buraya yazar.
// Varsayılan İngilizce. Okuma bitene kadar İngilizce kullanılır; arayüzü
// hemen çizen yerler (popup) önce langReady'yi bekler.
let dict: Record<Key, string> = en;

function use(lang: unknown): void {
  dict = lang === 'tr' ? tr : en;
}

export const langReady: Promise<void> = chrome.storage.local
  .get('lang')
  .then((stored) => use(stored.lang))
  .catch(() => {});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.lang) use(changes.lang.newValue);
});

export function t(key: Key, params: Record<string, string | number> = {}): string {
  return dict[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
}

export function isKey(key: string): key is Key {
  return key in tr;
}
