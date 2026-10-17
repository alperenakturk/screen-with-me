import { load, save } from './storage.ts';

export type Lang = 'tr' | 'en';

const tr = {
  tagline: 'Arkadaşlarınla aynı anda izle. Hesap yok, kurulum yok.',
  createRoom: 'Oda oluştur',
  or: 'veya',
  joinPlaceholder: 'Oda linki veya kodu',
  join: 'Katıl',
  invalidRoom: 'Geçerli bir oda linki veya kodu gir.',
  yourName: 'Adın',
  namePlaceholder: 'Örn. Alperen',
  enterRoom: 'Odaya gir',
  nameHint: 'Adın bu tarayıcıda saklanır, bir dahakine hazır gelir.',
  roomCode: 'Oda: {id}',
  mediaPlaceholder: 'YouTube linki veya doğrudan video linki (.mp4) yapıştır',
  playNow: 'Şimdi aç',
  addToQueue: 'Sıraya ekle',
  invalidMedia: 'Bu linki tanıyamadım. Bir YouTube veya doğrudan video linki dene.',
  queue: 'Sıradakiler ({n})',
  queueEmpty: 'Sıra boş. Bir link yapıştırıp "Sıraya ekle"ye bas.',
  addedBy: 'ekleyen: {name}',
  nowPlaying: 'Şimdi oynuyor',
  skip: 'Sonraki',
  playItem: 'Şimdi oynat',
  moveUp: 'Yukarı taşı',
  moveDown: 'Aşağı taşı',
  remove: 'Sıradan çıkar',
  react: 'Tepki gönder',
  fullscreen: 'Tam ekran (emojiler görünür)',
  exitFullscreen: 'Tam ekrandan çık (çift tık)',
  playPause: 'Oynat / durdur (boşluk)',
  quickChatPlaceholder: 'Hızlı mesaj… (Enter)',
  chat: 'Sohbet',
  chatPlaceholder: 'Bir şey yaz…',
  send: 'Gönder',
  chatEmpty: 'Henüz mesaj yok.',
  'action.next': 'Sıradaki videoya geçildi: {title}',
  'queue.add': '{name} sıraya ekledi: {title}',
  'queue.remove': '{name} sıradan çıkardı: {title}',
  'queue.move': '{name} sırayı düzenledi',
  'error.rate_limited': 'Biraz yavaş: çok hızlı mesaj gönderiyorsun.',
  'error.queue_full': 'Sıra dolu (en fazla 100 video).',
  invite: 'Davet linki',
  copy: 'Kopyala',
  copied: 'Kopyalandı',
  members: 'Odadakiler ({n})',
  you: 'sen',
  speed: 'Hız',
  activity: 'Son hareketler',
  emptyTitle: 'Henüz video yok',
  emptyBody: 'Yukarıya bir YouTube linki yapıştır, odadaki herkesin ekranında aynı anda açılır.',
  'status.connecting': 'Bağlanıyor…',
  'status.open': 'Bağlı',
  'status.reconnecting': 'Bağlantı koptu, tekrar deneniyor…',
  'status.closed': 'Bağlantı kapalı',
  'action.load': '{name} yeni video açtı: {title}',
  'action.play': '{name} oynattı',
  'action.pause': '{name} durdurdu',
  'action.seek': '{name} {time} anına sardı',
  'action.rate': '{name} hızı {rate}x yaptı',
  joined: '{name} odaya katıldı',
  left: '{name} ayrıldı',
  autoplayBlocked: 'Tarayıcın otomatik oynatmayı engelledi.',
  startPlayback: 'İzlemeye başla',
  playerError: 'Bu video oynatılamıyor (sahibi başka sitelerde oynatılmasını kapatmış olabilir).',
  'error.room_full': 'Oda dolu.',
  'error.version': 'Sitenin yeni sürümü var, sayfayı yenile.',
  'error.bad_message': 'Sunucu bir isteği reddetti.',
  'error.not_joined': 'Odaya henüz katılmadın.',
  home: 'Ana sayfa',
  adblockTip: 'İpucu: reklamlar için tarayıcına uBlock Origin kurabilirsin.',
};

type Key = keyof typeof tr;

const en: Record<Key, string> = {
  tagline: 'Watch in sync with your friends. No accounts, no setup.',
  createRoom: 'Create room',
  or: 'or',
  joinPlaceholder: 'Room link or code',
  join: 'Join',
  invalidRoom: 'Enter a valid room link or code.',
  yourName: 'Your name',
  namePlaceholder: 'e.g. Alex',
  enterRoom: 'Enter room',
  nameHint: 'Your name is saved in this browser for next time.',
  roomCode: 'Room: {id}',
  mediaPlaceholder: 'Paste a YouTube link or a direct video link (.mp4)',
  playNow: 'Play now',
  addToQueue: 'Add to queue',
  invalidMedia: "I couldn't recognise that link. Try a YouTube or direct video link.",
  queue: 'Up next ({n})',
  queueEmpty: 'The queue is empty. Paste a link and press "Add to queue".',
  addedBy: 'added by {name}',
  nowPlaying: 'Now playing',
  skip: 'Next',
  playItem: 'Play now',
  moveUp: 'Move up',
  moveDown: 'Move down',
  remove: 'Remove from queue',
  react: 'Send a reaction',
  fullscreen: 'Fullscreen (shows reactions)',
  exitFullscreen: 'Exit fullscreen (double-click)',
  playPause: 'Play / pause (space)',
  quickChatPlaceholder: 'Quick message… (Enter)',
  chat: 'Chat',
  chatPlaceholder: 'Say something…',
  send: 'Send',
  chatEmpty: 'No messages yet.',
  'action.next': 'Moved on to the next video: {title}',
  'queue.add': '{name} queued {title}',
  'queue.remove': '{name} removed {title}',
  'queue.move': '{name} reordered the queue',
  'error.rate_limited': "Slow down a little, you're sending too fast.",
  'error.queue_full': 'The queue is full (max 100 videos).',
  invite: 'Invite link',
  copy: 'Copy',
  copied: 'Copied',
  members: 'In the room ({n})',
  you: 'you',
  speed: 'Speed',
  activity: 'Recent activity',
  emptyTitle: 'No video yet',
  emptyBody: "Paste a YouTube link above and it opens on everyone's screen at the same time.",
  'status.connecting': 'Connecting…',
  'status.open': 'Connected',
  'status.reconnecting': 'Connection lost, retrying…',
  'status.closed': 'Disconnected',
  'action.load': '{name} opened {title}',
  'action.play': '{name} pressed play',
  'action.pause': '{name} paused',
  'action.seek': '{name} jumped to {time}',
  'action.rate': '{name} set speed to {rate}x',
  joined: '{name} joined',
  left: '{name} left',
  autoplayBlocked: 'Your browser blocked autoplay.',
  startPlayback: 'Start watching',
  playerError: "This video can't be played here (the owner may have disabled embedding).",
  'error.room_full': 'The room is full.',
  'error.version': 'A new version is available, please refresh.',
  'error.bad_message': 'The server rejected a request.',
  'error.not_joined': "You haven't joined the room yet.",
  home: 'Home',
  adblockTip: 'Tip: install uBlock Origin in your browser to block ads.',
};

const dictionaries: Record<Lang, Record<Key, string>> = { tr, en };

function detect(): Lang {
  const saved = load('lang');
  if (saved === 'tr' || saved === 'en') return saved;
  return navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

let current: Lang = detect();

export function lang(): Lang {
  return current;
}

export function t(key: Key, params: Record<string, string | number> = {}): string {
  return dictionaries[current][key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
}

export type { Key as I18nKey };

export function isKey(key: string): key is Key {
  return key in tr;
}

/** data-i18n="anahtar" ve data-i18n-placeholder="anahtar" olan öğelerin metnini günceller. */
export function translate(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = el.dataset.i18n!;
    if (isKey(key)) el.textContent = t(key);
  }
  for (const el of root.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]')) {
    const key = el.dataset.i18nPlaceholder!;
    if (isKey(key)) el.placeholder = t(key);
  }
}

export function setLang(next: Lang): void {
  current = next;
  save('lang', next);
  document.documentElement.lang = next;
  translate();
  window.dispatchEvent(new Event('langchange'));
}
