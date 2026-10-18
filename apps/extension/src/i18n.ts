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
  shareThisPage: 'Bu sayfayı herkese aç',
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
  avatarPageTheme: 'Temalı',
  avatarPageAnimals: 'Hayvanlar',
  avatarPageParody: 'Parodi',
  speedLocked: 'Hız odayla ortak: değiştirmek için ScreenWithMe çubuğundaki hız menüsünü kullan.',
  joinTitle: 'Bir izleme odasına davet edildin',
  joinText: 'Bu sayfa seni bir ScreenWithMe odasına katılmaya çağırıyor. Katılırsan bu sekmedeki video odadakilerle senkron olur.',
  joinYes: 'Katıl',
  joinNo: 'Hayır',
  endedKickedTitle: 'Odadan çıkarıldın',
  endedKicked: 'Oda yöneticisi seni bu odadan çıkardı.',
  endedVersionTitle: 'Eklentiyi güncelle',
  endedVersion: 'ScreenWithMe’nin yeni sürümü var. Eklentiyi güncelleyip sayfayı yenile.',
  endedFullTitle: 'Oda dolu',
  endedFull: 'Bu oda şu an dolu, biraz sonra tekrar dene.',
  reloadHint: 'Eklenti bu sekme açıldıktan sonra kuruldu ya da güncellendi; videoyu bulması için sayfayı bir kez yenile.',
  reloadPage: 'Sayfayı yenile',
  shareHint: 'Odadaki herkes bu sayfaya geçer.',
  diagTitle: 'Tanı',
  siteTitle: 'Zaten ScreenWithMe’desin!',
  siteText:
    'Burada eklentiye gerek yok: oda kurmak, sohbet, emoji ve ayarların hepsi bu sayfada. Eklenti, başka bir sitede film ya da dizi açtığında işe yarar; o sayfadayken bu simgeye tıkla.',
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
  shareThisPage: 'Open this page for everyone',
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
  avatarPageTheme: 'Themed',
  avatarPageAnimals: 'Animals',
  avatarPageParody: 'Parody',
  speedLocked: 'Speed is shared with the room: use the speed menu in the ScreenWithMe bar to change it.',
  joinTitle: "You've been invited to a watch room",
  joinText: 'This page invites you to join a ScreenWithMe room. If you join, the video in this tab syncs with everyone in the room.',
  joinYes: 'Join',
  joinNo: 'No',
  endedKickedTitle: 'You were removed',
  endedKicked: 'The room host removed you from this room.',
  endedVersionTitle: 'Update the extension',
  endedVersion: 'A new version of ScreenWithMe is out. Update the extension and reload the page.',
  endedFullTitle: 'Room is full',
  endedFull: 'This room is full right now, try again in a bit.',
  reloadHint: 'The extension was installed or updated after this tab was opened; reload the page once so it can find the video.',
  reloadPage: 'Reload page',
  shareHint: 'Everyone in the room moves to this page.',
  diagTitle: 'Diagnostics',
  siteTitle: "You're already on ScreenWithMe!",
  siteText:
    "No extension needed here: rooms, chat, reactions and settings are all on this page. The extension helps when you open a film or show on another website; click this icon on that page.",
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
