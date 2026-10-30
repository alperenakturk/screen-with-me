import type { Recap } from './recap.ts';

// Sunucu ile istemciler (site ve ileride eklenti) arasındaki mesaj formatı.
// Bu dosya hem tarayıcıda hem Cloudflare sunucusunda çalışır, bu yüzden
// DOM'a veya Node'a özel hiçbir şey kullanmaz.

export const PROTOCOL_VERSION = 3;

export const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{4,32}$/;
export const NAME_MAX_LENGTH = 32;
export const CHAT_MAX_LENGTH = 300;
export const QUEUE_MAX_LENGTH = 100;
export const MIN_RATE = 0.25;
/** HTML5 videolar 4x'e kadar; YouTube en fazla 2x (YOUTUBE_MAX_RATE). */
export const MAX_RATE = 4;
export const YOUTUBE_MAX_RATE = 2;
/** Bir mesajın en fazla kaç bayt olabileceği (kötü niyetli büyük mesajlara karşı). */
export const MAX_MESSAGE_BYTES = 4096;
/**
 * Emoji tepkileri, sekizli sayfalar halinde (arayüzde ↑↓ ile sayfa değişir).
 * İlk sayfa her zamanki; sonrakiler daha absürt/eğlenceli. Sunucu listede
 * olmayanı kabul etmez. Sona sayfa eklemek eski istemcileri bozmaz.
 */
export const REACTION_PAGES = [
  ['😂', '😮', '😍', '😱', '👏', '🔥', '😢', '💀'],
  ['🤮', '💩', '🥵', '🤡', '🤯', '😴', '🙄', '🥴'],
  ['😡', '🍿', '🎉', '👀', '💔', '🙏', '😈', '👻'],
] as const;

export const REACTIONS = REACTION_PAGES.flat();

export type Reaction = (typeof REACTION_PAGES)[number][number];

/**
 * Çizilmiş avatarlar (public/avatars/<kimlik>.svg; scripts/avatars.mjs çizer). Değer,
 * metin geçen yerlerde (sohbet satırı, bildirim) kullanılan emoji karşılığı.
 */
export const DRAWN_AVATARS = {
  wizard: '🧙',
  warrior: '⚔️',
  elf: '🧝',
  dwarf: '⛏️',
  janissary: '🎖️',
  horseman: '🏹',
  veiled: '🧕',
  scientist: '🧪',
  sidekick: '😰',
  chemist: '⚗️',
  lawyer: '⚖️',
  swordsman: '🗡️',
  sorceress: '🧙‍♀️',
  strawhat: '👒',
  cook: '🍳',
  greenblade: '🍃',
  hunter: '🐺',
  hacker: '💻',
  dragonqueen: '🐉',
  jester: '🃏',
  nightguard: '🦇',
  catburglar: '🐈‍⬛',
  goth: '🖤',
  cavecreature: '💍',
  earthgirl: '🪨',
  airmonk: '🌀',
  waterfriend: '💧',
  sponge: '🧽',
  starfish: '⭐',
  squid: '🦑',
  pinecap: '🌲',
  sweaterkid: '🧶',
  cartoonist: '✏️',
  armadillo: '🐾',
  timetraveler: '⏳',
  wizardboy: '⚡',
  redhead: '🍫',
  wizardgirl: '📚',
  director: '🎬',
  diva: '🎭',
  driver: '🚗',
  captain: '⚓',
  conductor: '🚂',
  speedster: '💨',
} as const;

export type DrawnAvatar = keyof typeof DRAWN_AVATARS;

/**
 * Avatar sayfaları: 0) temalara ait karakterler, 1-4) parodiler (sadece tarzı andırır, isim yok):
 * film, dizi, anime, oyun. Sunucu bunların dışındakini kabul etmez; yeni avatar eklemek eski
 * istemcileri bozmaz (onlarda emoji yerine kimlik görünür). Hayvan emojileri 0.9.57'de kalktı
 * (seçmiş olanın kayıtlı avatarı geçersiz sayılır, rastgele temalı karakter verilir).
 */
export const AVATAR_PAGES = [
  [
    'wizard', 'sorceress', 'warrior', 'elf', 'dwarf',
    'janissary', 'horseman', 'veiled', 'director', 'diva', 'driver', 'captain', 'conductor',
  ],
  ['hacker', 'jester', 'nightguard', 'catburglar', 'cavecreature', 'wizardboy', 'redhead', 'wizardgirl'],
  [
    'scientist', 'sidekick', 'chemist', 'lawyer', 'hunter', 'dragonqueen', 'goth',
    'sponge', 'starfish', 'squid', 'pinecap', 'sweaterkid', 'cartoonist', 'armadillo', 'timetraveler',
  ],
  ['strawhat', 'swordsman', 'cook', 'greenblade', 'airmonk', 'waterfriend', 'earthgirl'],
  ['speedster'],
] as const;

/**
 * Seçicideki sekmeler: Temalı, Parodi; Parodi'nin altında Film / Dizi / Anime / Oyun.
 * Her sekme AVATAR_PAGES'teki sayfa numaralarını tutar.
 */
export const AVATAR_TABS = [
  { key: 'theme', pages: [0] },
  { key: 'parody', pages: [1, 2, 3, 4], subs: ['film', 'series', 'anime', 'game'] },
] as const;

/** Avatarın bulunduğu sayfa (yoksa 0). */
export function avatarPageOf(avatar: string | null | undefined): number {
  return Math.max(0, AVATAR_PAGES.findIndex((p) => (p as readonly string[]).includes(avatar ?? '')));
}

export const AVATARS = AVATAR_PAGES.flat();

export type Avatar = (typeof AVATAR_PAGES)[number][number];

export function isAvatar(x: unknown): x is Avatar {
  return typeof x === 'string' && (AVATARS as readonly string[]).includes(x);
}

export function isDrawnAvatar(x: unknown): x is DrawnAvatar {
  return typeof x === 'string' && Object.prototype.hasOwnProperty.call(DRAWN_AVATARS, x);
}

/** Metin içinde gösterilecek hali: çizilmiş avatarın emoji karşılığı (eski kayıtlarda emoji olabilir: kendisi). */
export function avatarText(avatar: string | undefined | null): string {
  if (!avatar) return '';
  return isDrawnAvatar(avatar) ? DRAWN_AVATARS[avatar] : avatar;
}

/** Yeni gelen için rastgele: temalı karakterlerden. */
export function randomAvatar(): Avatar {
  const pool = AVATAR_PAGES[0];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

/** Yöneticinin seçebileceği emoji aralıkları (sn): 0 serbest (varsayılan). */
export const REACTION_GAPS = [0, 1, 3, 5, 10] as const;
export type ReactionGap = (typeof REACTION_GAPS)[number];

export const TITLE_MAX_LENGTH = 200;

export type Media =
  /** `short`: YouTube Shorts linkinden (youtube.com/shorts/…) geldi; oda dikey "Shorts görünümüne" geçer. */
  | { kind: 'youtube'; id: string; short?: true }
  /** Doğrudan video dosyası (.mp4 vb.); sitede oynar. */
  | { kind: 'html5'; url: string }
  /** Videonun içinde olduğu bir web sayfası; eklentiyle, herkes kendi sekmesinde açarak izler. */
  | { kind: 'page'; url: string }
  /** Senkron testi: sitenin çizdiği 12 sn'lik sayaç (dosya yok); iki ekran aynı sayıyı göstermeli. */
  | { kind: 'test' };

/** Sıradaki ya da şu an oynayan bir video. */
export interface QueueItem {
  id: string;
  media: Media;
  /** Sunucunun bulduğu başlık (bulamazsa null). */
  title: string | null;
  /** Ekleyen kişinin adı. */
  by: string;
  /** Sıradakiler için 👍 sayısı (sıra buna göre dizilir; yoksa 0). */
  votes?: number;
}

/**
 * Odanın oynatma durumu. Sunucu tutar, herkes buna uyar.
 * `position`, `updatedAt` anındaki saniyedir. Video oynuyorsa o andan
 * beri geçen süre eklenerek şu anki konum hesaplanır (bkz. expectedPosition).
 */
export interface PlaybackState {
  item: QueueItem | null;
  paused: boolean;
  position: number;
  rate: number;
  /** Sunucu saatine göre milisaniye. */
  updatedAt: number;
}

/** Bağlantının nereden geldiği: sitedeki oda sayfası mı, eklentiyle film sayfası mı. */
export type ClientKind = 'web' | 'ext';

export interface Member {
  id: string;
  name: string;
  /** Eski istemciler avatar yollamaz; o zaman yoktur. */
  avatar?: Avatar;
  /** 'ext': eklentiyle bir sayfada (filmde) izliyor. Eski istemcilerde yok (site sayılır). */
  client?: ClientKind;
  /** Sesli sohbette (yoksa seste değil). `track`: yayınladığı ses akışı (diğerleri bununla dinler). */
  voice?: MemberVoice;
  /** Film sayfasında reklam izliyor (oda onu beklemez; bitince yetişir). */
  ad?: boolean;
  /** Yayın yapıyor (ekran paylaşımı ya da kamera; odada aynı anda tek yayın). */
  live?: LiveKind;
  /** Yayını izliyor. */
  watching?: boolean;
  /** A TV paired to this person (same name and avatar): it shows the room, the person's phone is its remote. */
  tv?: boolean;
}

/** Yayın türü: ekran/pencere/sekme paylaşımı ya da kamera. */
export type LiveKind = 'screen' | 'camera';

/** Odanın içinde oynanan oyunlar (PlayWithMe): XOX, Dört Taş, Çiz-Bil, Bilgi yarışması. */
export const ROOM_GAME_KINDS = ['xox', 'four', 'draw', 'quiz'] as const;
export type RoomGameKind = (typeof ROOM_GAME_KINDS)[number];
/**
 * Odada açık oyun (aynı anda tek). Oyunun kendisi ayrı bir sunucu nesnesinde yürür (`id` onun kimliği; oda verir,
 * kimse ayrı oyun odası kurmaz); oda sadece hangi oyunun açık olduğunu ve kimin açtığını tutar.
 */
export interface RoomGame {
  kind: RoomGameKind;
  id: string;
  by: Member;
  /** Açıldığı an (sunucu saati). */
  at: number;
}
/**
 * Yayını aynı anda en fazla bu kadar kişi izler: yayıncı her izleyiciye ayrı kopya yollar (720p ~2 Mbit/s; 4 izleyici
 * ev internetinin yükleme hızının sınırı).
 */
export const LIVE_MAX_VIEWERS = 4;

export interface MemberVoice {
  /** Mikrofonu açık mı (sessize aldıysa false; yine de odayı dinler). */
  mic: boolean;
  /** Kamerası açık mı (görüntülü sohbet, eşler arası; yoksa kapalı). */
  cam?: boolean;
  /** Yayın hazır olunca gelir: diğerleri bu üyenin sesini bununla çeker. */
  track?: string;
}

/** Sesli sohbette aynı anda en fazla bu kadar kişi (SFU'da herkes herkesi çeker; maliyet ve kalabalık). */
export const VOICE_MAX = 10;
/** Eşler arası seste en fazla bu kadar kişi: herkes herkese ayrı akış yollar, ev internetinin yükleme hızı yetmez. */
export const VOICE_MAX_P2P = 6;
/**
 * Aynı anda en fazla bu kadar kamera: her kamera seste olan herkese ayrı kopya yollar, her izleyici de hepsini çözer
 * (dizüstü ısınır, yavaş internet yetmez).
 */
export const CAM_MAX = 4;

/**
 * Sesli sohbetin taşınma yolu. `p2p`: eşler arası (kartsız, ücretsiz; sunucu sadece bağlantı mesajlarını
 * aktarır). `sfu`: Cloudflare Realtime (sunucuda anahtar varsa; IP'ler gizli, daha çok kişi).
 */
export type VoiceMode = 'p2p' | 'sfu';

/** Eşler arası bağlantı kurmak için iki tarayıcı arasında taşınan mesaj (WebRTC teklif/cevap ya da ağ adayı). */
export type Signal =
  | { sdp: { type: 'offer' | 'answer'; sdp: string } }
  | { candidate: { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null } };
/** SDP (WebRTC bağlantı tarifi) birkaç KB olabilir: sadece `rtc` mesajları bu kadar büyük olabilir. */
export const RTC_MESSAGE_MAX = 24_000;
const SDP_MAX = 20_000;

/**
 * Sesli sohbetin bağlantı işleri (istemci → sunucu → Cloudflare Realtime). Cloudflare oturumunu sunucu açar ve
 * bağlantıya bağlar; istemci başkasının oturumuna dokunamaz, sadece odadaki birinin sesini (üye kimliğiyle) çekebilir.
 */
export type RtcRequest =
  /** Bu bağlantı için Cloudflare oturumu aç (yoksa). */
  | { op: 'session' }
  /** Kendi mikrofon akışımı yayınla: teklif SDP'si + akışın mid'i ve adı. */
  | { op: 'publish'; sdp: string; mid: string; track: string }
  /** Odadaki bir üyenin sesini çek (Cloudflare yeni bir teklif döner, cevap `renegotiate` ile gider). */
  | { op: 'pull'; from: string }
  /** Cloudflare'in teklifine cevap. */
  | { op: 'renegotiate'; sdp: string }
  /** Artık dinlemediğim akışları kapat (çıkan kişi). */
  | { op: 'close'; mids: string[] };

export type RtcResult =
  | { ok: true; sdp?: string; sdpType?: 'offer' | 'answer'; renegotiate?: boolean; mid?: string }
  | { ok: false; error: 'voice_unavailable' | 'voice_full' | 'not_in_voice' | 'no_track' | 'upstream' | 'rate_limited' };

export interface RoomSettings {
  /** Videosu takılan biri olduğunda oda onu kısa süre beklesin mi? */
  waitForAll: boolean;
  /** Sadece yönetici oynat/durdur/sar/hız/yeni video yapabilsin (sıradakine geçiş herkese açık). */
  hostOnly?: boolean;
  /** Sıraya ekleme/silme/taşıma sadece yöneticide (oylama serbest). */
  lockQueue?: boolean;
  /** Planlı başlangıç (sunucu saati, ms): o an gelince oda kendiliğinden oynar. */
  startsAt?: number;
  /** Video bitince sıradakine kendiliğinden geçilsin mi? (yoksa açık; false: "başlat" düğmesi çıkar) */
  autoNext?: boolean;
  /** Kaydedilmiş oda: 30 gün saklanır, videoların kaldığı yer ve pinleri hatırlanır. */
  saved?: boolean;
  /** Yönetici emojileri kapattı (dikkat dağılmasın): kimse tepki atamaz. */
  noReactions?: boolean;
  /** Bir kişinin iki emojisi arasındaki en kısa süre (sn; yoksa/0: serbest, art arda atılabilir). */
  reactionGap?: ReactionGap;
  /** Kaydedilmiş odanın adı (yönetici verir). */
  name?: string;
  /** Shorts bitince sıradakine geçmek yerine başa sarsın (sadece Shorts videolarında). */
  loop?: boolean;
  /** Yayını (ekran paylaşımı / kamera) sadece yönetici açabilsin. */
  liveHostOnly?: boolean;
}

/** Odadan çıkarılmış (yasaklı) biri. `id` yasağı kaldırmak içindir; tarayıcı kimliği gizli kalır. */
export interface BanEntry {
  id: string;
  name: string;
  avatar?: Avatar;
}

/** Oda adına yapılan (kişiden gelmeyen) hareketlerin "yapanı". */
export const SYSTEM_MEMBER_ID = 'system';

export interface ChatMessage {
  id: string;
  /** May be empty when the message is only an image. */
  text: string;
  by: Member;
  /** Sunucu saati (ms). */
  at: number;
  /** Image sent with the message (0.9.88): its id; the data arrives separately as `chat-image`. */
  image?: string;
}

export type PlaybackAction = 'load' | 'next' | 'play' | 'pause' | 'seek' | 'rate';

export type QueueChange =
  | { kind: 'add'; item: QueueItem; by: Member }
  | { kind: 'remove'; item: QueueItem; by: Member }
  | { kind: 'move'; item: QueueItem; by: Member };

/** İstemci → sunucu. `at`, istemcinin tahmin ettiği sunucu saatidir. */
export type ClientMessage =
  /**
   * `cid`: tarayıcıda saklanan kalıcı kimlik. Sayfa yenilense de aynı kalır;
   * oda yöneticisinin yenileyince yöneticiliği kaybetmemesi ve atılan kişinin
   * hemen geri girememesi için kullanılır. Hesap değildir, sadece rastgele bir kod.
   */
  /** `prev`: my member id on the connection this one replaces (reconnect): the server drops that one at once. */
  /** `tv`: the link token a TV got when a phone paired it (the TV joins as that person's second device). */
  | { t: 'hello'; v: number; name: string; avatar?: Avatar; cid?: string; client?: ClientKind; prev?: string; tv?: string }
  /** Pair a TV that shows this code (`TV_CODE`) to me: the TV joins this room as my second device. */
  | { t: 'tv-link'; code: string }
  /** Between a person's phone / computer and their paired TV (the server relays it only within the same person). */
  | { t: 'tv'; op: TvOp; value?: number | boolean }
  /** İsim ya da avatar değiştir. */
  | { t: 'rename'; name: string; avatar?: Avatar }
  /** (Sadece oda yöneticisi) birini odadan çıkar; yönetici kaldırana kadar geri giremez. */
  | { t: 'kick'; id: string }
  /** (Sadece oda yöneticisi) bir yasağı kaldır (`id`: BanEntry.id). */
  | { t: 'unban'; id: string }
  /**
   * "Herkes hazır": videom takıldı (ready=false) ya da tekrar oynayabilir (ready=true).
   * Sunucu takılan biri olduğunda odayı kısa süre bekletir. `ad`: film sayfasında reklam oynuyor; oda bu kişiyi
   * beklemez (reklamı herkes farklı anda görür), kişiler listesinde "reklamda" yazar, reklam bitince kişi yetişir.
   */
  | { t: 'ready'; ready: boolean; ad?: boolean }
  /** (Sadece oda yöneticisi) oda ayarlarını değiştir. */
  /** Yalnızca gelen alanlar değişir; startsAt: null planı kaldırır. */
  | { t: 'settings'; waitForAll?: boolean; hostOnly?: boolean; lockQueue?: boolean; autoNext?: boolean; loop?: boolean; saved?: boolean; noReactions?: boolean; liveHostOnly?: boolean; reactionGap?: ReactionGap; name?: string; startsAt?: number | null }
  /** Sıradaki bir videoya oy ver (up) ya da oyunu geri al. */
  | { t: 'vote'; id: string; up: boolean }
  | { t: 'ping'; c: number }
  /** Bugünün özeti: oturumun başından şimdiye (sadece isteyene gelir, sayaç sıfırlanmaz). */
  | { t: 'recap' }
  /** Şu anki oturumun özetini kaydet (oturum bitince silinmesin). */
  | { t: 'recap-save' }
  /** Bu odanın önceki özetleri. */
  | { t: 'recaps' }
  /** Film sayfasından odaya dönüyorum: filmdeki diğerlerine "sen de dön" diye sorulur. */
  | { t: 'home' }
  /** Sesli sohbete katıl / ayrıl / mikrofonu aç-kapa. `track`: yayın hazır olunca adı. */
  | { t: 'voice'; on: boolean; mic?: boolean; track?: string; cam?: boolean }
  /** Sesli sohbetin bağlantı işi; cevap aynı `id` ile `{t:'rtc'}` olarak gelir. */
  | ({ t: 'rtc'; id: number } & RtcRequest)
  /** Eşler arası seste: bir üyeye bağlantı mesajı (sunucu sadece ikisi de seste ise iletir). */
  | { t: 'signal'; to: string; data: Signal }
  /** Yayın aç/kapa (odada aynı anda tek yayın). */
  | { t: 'live'; on: boolean; kind?: LiveKind }
  /** Yayını izle/bırak (en fazla LIVE_MAX_VIEWERS). */
  | { t: 'live-watch'; on: boolean }
  /** (Sadece yönetici) odadaki yayını durdur. */
  | { t: 'live-stop' }
  /** Yayın bağlantı mesajı (sunucu sadece yayıncı ile izleyicisi arasında iletir). */
  | { t: 'live-signal'; to: string; data: Signal }
  /** Odada oyun aç (`kind`) ya da açık oyunu bitir (`end`; sadece açan ya da yönetici). */
  | { t: 'game'; kind?: RoomGameKind; end?: boolean }
  /** Hemen aç (şu an oynayanın yerine). `title` sadece sayfalar için kullanılır (sekmenin başlığı). */
  | { t: 'load'; media: Media; title?: string }
  /** Sıraya ekle. Oda boşsa hemen açılır. */
  | { t: 'enqueue'; media: Media; title?: string }
  | { t: 'dequeue'; id: string }
  | { t: 'move'; id: string; to: number }
  /** Sıradaki bir öğeyi hemen oynat. */
  | { t: 'jump'; id: string }
  /**
   * Sıradakine geç. `from`, geçilecek (şu an oynayan) öğenin ID'si; aynı anda gelen istekler bir kez uygulanır.
   * `end`: video kendiliğinden bitti (oda "döngü"deyse Shorts sıradakine geçmez, başa sarar).
   */
  | { t: 'next'; from: string; end?: true }
  /** Bir önceki videoya dön (Shorts'ta ↑): şu an oynayan, sıranın başına geri girer. */
  | { t: 'prev'; from: string }
  | { t: 'play'; position: number; at: number }
  | { t: 'pause'; position: number; at: number }
  | { t: 'seek'; position: number; at: number }
  | { t: 'rate'; rate: number; position: number; at: number }
  | { t: 'react'; emoji: Reaction; sticker?: undefined }
  /** Odadaki bir özel emojiyle (GIF/resim) tepki ver. */
  | { t: 'react'; sticker: string; emoji?: undefined }
  /** Odaya özel emoji ekle (küçültülmüş resim ya da GIF, data: adresi). Kimliğini sunucu hesaplar. */
  | { t: 'sticker-add'; data: string }
  /** Özel emojiyi odadan kaldır (ekleyen ya da yönetici). */
  | { t: 'sticker-remove'; id: string }
  /** Remove every custom emoji from the room (host only). */
  | { t: 'sticker-clear' }
  /** Videonun şu anını pinle (an'ı sunucu hesaplar); isteğe bağlı kısa not. */
  | { t: 'pin'; note?: string }
  /** Pini kaldır (kendi pinin ya da yöneticiysen herhangi biri). */
  | { t: 'unpin'; id: string }
  /** `image`: a picture sent in chat (0.9.88, `isChatImageData`); then `text` may be empty. */
  | { t: 'chat'; text: string; image?: string };

export type ErrorCode =
  | 'bad_message'
  | 'not_joined'
  | 'version'
  | 'room_full'
  | 'rate_limited'
  | 'queue_full'
  /** Oda yöneticisi seni çıkardı (ya da kısa süre önce çıkarılmıştın). */
  | 'kicked'
  /** Bu işlem sadece oda yöneticisine açık. */
  | 'not_host'
  /** Sesli sohbet dolu (VOICE_MAX) ya da bu sunucuda kapalı. */
  | 'voice_full'
  | 'voice_unavailable'
  /** Aynı anda açık kamera sınırı (CAM_MAX) dolu. */
  | 'cam_full'
  /** Odada zaten bir yayın var / yayının izleyici sınırı dolu. */
  | 'live_busy'
  | 'live_full'
  /** Yayını sadece yönetici açabilir (`settings.liveHostOnly`) / yönetici yayınını durdurdu. */
  | 'live_host'
  | 'live_stopped'
  /** Odada başka biri oyun açmış (önce o bitmeli; açan ya da yönetici değiştirebilir). */
  | 'game_busy'
  /** Odada açık sayfayı (filmi) hâlâ izleyenler var: herkes odaya dönmeden yeni video açılamaz. */
  | 'others_watching'
  /** Özet için henüz yeterince şey olmadı. */
  | 'recap_empty'
  /** No TV is waiting with that code (wrong, used or expired) / the TV's link token is no longer valid. */
  | 'tv_code'
  | 'tv_token';

/** Sunucu → istemci. */
export type ServerMessage =
  | {
      t: 'welcome';
      you: string;
      state: PlaybackState;
      queue: QueueItem[];
      members: Member[];
      /** Oda yöneticisinin üye ID'si. */
      hostId: string | null;
      chat: ChatMessage[];
      /** Eski sunucular yollamaz. */
      settings?: RoomSettings;
      /** Şu an beklenenler (üye ID'leri). */
      waiting?: string[];
      /** Açık videonun pinlenmiş anları. */
      pins?: PinList;
      /** Sesli sohbet bu sunucuda açık mı (kapatıldıysa ya da eski sunucuysa yok/false). */
      voice?: boolean;
      /** Sesin taşınma yolu (yoksa p2p). */
      voiceMode?: VoiceMode;
      /** Odada açık oyun (yoksa yok). */
      game?: RoomGame;
    }
  | { t: 'pong'; c: number; s: number }
  | { t: 'state'; state: PlaybackState; action: PlaybackAction; by: Member; /** Kayıtlı odada video kaldığı yerden açıldıysa o saniye. */ resumed?: number }
  | { t: 'queue'; queue: QueueItem[]; change: QueueChange | null }
  /** Video beklemeden yayınlanır; başlığı sonradan bulununca bu mesaj gelir. */
  | { t: 'title'; itemId: string; title: string }
  | { t: 'members'; members: Member[]; hostId: string | null }
  /** Sesli sohbet bağlantı işinin cevabı (`id` isteğinki). */
  | ({ t: 'rtc'; id: number } & RtcResult)
  /** Eşler arası seste bir üyeden gelen bağlantı mesajı. */
  | { t: 'signal'; from: string; data: Signal }
  /** Yayının bağlantı mesajı (yayıncıdan izleyiciye ya da tersi). */
  | { t: 'live-signal'; from: string; data: Signal }
  /** Biri odadan çıkarıldı (herkese duyurulur). */
  | { t: 'kicked'; who: Member; by: Member }
  /** Yasaklılar listesi (sadece yöneticiye; değişince ve yönetici değişince gelir). */
  | { t: 'bans'; bans: BanEntry[] }
  /** Oda takılan birini bekliyor (boş liste: bekleme bitti). */
  | { t: 'waiting'; ids: string[] }
  | { t: 'settings'; settings: RoomSettings }
  /** emoji ya da sticker (odadaki özel emojinin kimliği) gelir. */
  | { t: 'reaction'; emoji?: Reaction; sticker?: string; by: Member }
  /** Biri film sayfasından odaya döndü (gönderen hariç herkese). */
  | { t: 'home'; by: Member }
  /** Odada oyun açıldı (`game`) ya da bitti (`null`); `by`: bitireni. */
  | { t: 'game'; game: RoomGame | null; by?: Member }
  /** Odaya bir özel emoji eklendi (girişte de odadakiler tek tek gelir). */
  /** `mine`: only in the copy sent to the person who added it (so they can remove it after a reload). */
  | { t: 'sticker'; sticker: Sticker; mine?: boolean }
  /** Bir özel emoji odadan kaldırıldı. */
  | { t: 'sticker-removed'; id: string }
  /** Açık videonun pinleri değişti (tam liste). */
  | { t: 'pins'; pins: PinList }
  | { t: 'chat'; message: ChatMessage }
  /** Data of a chat image (sent before its message, and one by one after `welcome` for the history). */
  | { t: 'chat-image'; id: string; data: string }
  | { t: 'error'; code: ErrorCode }
  /** Relayed from my paired TV / my phone (`TvOp`); `present` comes from the server: my TV joined (true) or left. */
  | { t: 'tv'; op: TvOp | 'present' | 'linked'; value?: number | boolean }
  | { t: 'recap'; recap: Recap; by: Member }
  | { t: 'recaps'; recaps: Recap[] };

/** Verilen sunucu saatinde videonun kaçıncı saniyede olması gerektiği. */
export function expectedPosition(state: PlaybackState, serverNow: number): number {
  if (state.paused) return state.position;
  const elapsed = Math.max(0, serverNow - state.updatedAt) / 1000;
  return state.position + elapsed * state.rate;
}

// ---- Doğrulama ----
// Sunucu, istemciden gelen hiçbir şeye körü körüne güvenmez. Geçerli bulunan
// veriler de yeni nesnelere kopyalanır; böylece fazladan alanlar sızmaz.

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const ITEM_ID = /^[A-Za-z0-9_-]{1,32}$/;
/** Tarayıcının kalıcı kimliği (bkz. hello.cid). */
export const CLIENT_ID = /^[A-Za-z0-9_-]{8,40}$/;

// ---- TV (0.9.91.x): a TV shows the room, a paired phone is its remote ----
/** The pairing code a TV shows (typed on the phone or read from its QR). */
export const TV_CODE = /^\d{6}$/;
/** The link token a TV gets when paired (random, from the room). */
export const TV_TOKEN = /^[a-f0-9]{32}$/;
/**
 * Phone ⇄ TV operations: `unlink` (the TV leaves), `chat` (show messages on the TV: value boolean), `volume` (friends'
 * voices on the TV, 0–100), `voice` (the TV listens to voice: boolean), `play` (play / pause toggle from the remote),
 * `state` (the TV reports: value = its volume; sent when it joins and after each change).
 */
export const TV_OPS = ['unlink', 'chat', 'volume', 'voice', 'play', 'state'] as const;
export type TvOp = (typeof TV_OPS)[number];

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isPosition(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0 && x < 1e6;
}

function isTimestamp(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x > 0;
}

function isItemId(x: unknown): x is string {
  return typeof x === 'string' && ITEM_ID.test(x);
}

export function isValidRate(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= MIN_RATE && x <= MAX_RATE;
}

export function isReaction(x: unknown): x is Reaction {
  return typeof x === 'string' && (REACTIONS as readonly string[]).includes(x);
}

export const ROOM_NAME_MAX = 40;

/** Oda adı: boşluklar sadeleşir, en fazla ROOM_NAME_MAX karakter. */
export function cleanRoomName(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const name = x.replace(/\s+/g, ' ').trim().slice(0, ROOM_NAME_MAX);
  return name.length > 0 ? name : null;
}

export function cleanName(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const name = x.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX_LENGTH);
  return name.length > 0 ? name : null;
}

/**
 * Özel emojiler (sticker): kullanıcının eklediği resim/GIF, `data:image/...;base64,` olarak.
 * Sadece raster biçimler (SVG yok: betik taşıyabilir). Oda başına en fazla MAX_STICKERS;
 * dolunca en eskisi gider. Kimlik verinin SHA-256 özetinin ilk 12 hanesi (iki taraf da hesaplar).
 */
export const STICKER_MAX_CHARS = 280_000;
export const MAX_STICKERS = 24;
/** Largest raw client message: an image plus a full chat text (JSON-escaped). */
const BIG_MESSAGE_MAX = STICKER_MAX_CHARS + 6 * CHAT_MAX_LENGTH + 64;
const STICKER_DATA = /^data:image\/(?:png|gif|webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;
const STICKER_ID = /^[0-9a-f]{12}$/;

export interface Sticker {
  id: string;
  data: string;
}

export function isStickerData(x: unknown): x is string {
  return typeof x === 'string' && x.length <= STICKER_MAX_CHARS && STICKER_DATA.test(x);
}

/**
 * Images in chat (0.9.88): the same raster formats and size limit as custom emojis (photos are scaled to ≤1024 px WebP
 * in the browser first, which also drops EXIF/GPS). Id = `stickerId(data)`. A room keeps the images of its chat history,
 * at most MAX_CHAT_IMAGES; they are deleted with the room.
 */
export const MAX_CHAT_IMAGES = 12;

export function isChatImageData(x: unknown): x is string {
  return isStickerData(x);
}

export function isStickerId(x: unknown): x is string {
  return typeof x === 'string' && STICKER_ID.test(x);
}

export async function stickerId(data: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(digest).slice(0, 6), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Pin notu en fazla bu kadar karakter; bir videoda en fazla MAX_PINS pin. */
export const PIN_NOTE_MAX = 60;
export const MAX_PINS = 50;

/** Videonun pinlenmiş bir anı. `by` pinleyen (sadece isim/avatar; kimlik bilgisi gitmez). */
export interface Pin {
  id: string;
  /** Videonun kaçıncı saniyesi. */
  at: number;
  note?: string;
  by: { id: string; name: string; avatar?: Avatar };
}

/** Bir videonun pinleri (video değişince sıfırlanır). */
export interface PinList {
  itemId: string;
  pins: Pin[];
}

export function cleanChatText(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  // Kontrol karakterlerini at, boşlukları sadeleştir.
  const text = x.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length === 0) return null;
  return Array.from(text).slice(0, CHAT_MAX_LENGTH).join('');
}

export function cleanMedia(x: unknown): Media | null {
  if (!isObject(x)) return null;
  if (x.kind === 'test') return { kind: 'test' };
  if (x.kind === 'youtube') {
    if (typeof x.id !== 'string' || !YOUTUBE_ID.test(x.id)) return null;
    return x.short === true ? { kind: 'youtube', id: x.id, short: true } : { kind: 'youtube', id: x.id };
  }
  if (x.kind === 'html5' || x.kind === 'page') {
    if (typeof x.url !== 'string' || x.url.length > 2048) return null;
    try {
      const url = new URL(x.url);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      return { kind: x.kind, url: url.toString() };
    } catch {
      return null;
    }
  }
  return null;
}

export function cleanTitle(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const title = x.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return title ? Array.from(title).slice(0, TITLE_MAX_LENGTH).join('') : null;
}

export function isValidMedia(x: unknown): x is Media {
  return cleanMedia(x) !== null;
}

/** Ses akışının adı (istemci verir; Cloudflare'de oturum içinde benzersiz). */
export function isTrackName(x: unknown): x is string {
  return typeof x === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(x);
}

function isSdp(x: unknown): x is string {
  return typeof x === 'string' && x.length <= SDP_MAX && x.startsWith('v=0');
}

function isMid(x: unknown): x is string {
  return typeof x === 'string' && /^[A-Za-z0-9]{1,8}$/.test(x);
}

/** Bağlantı mesajını doğrular ve yeni nesneye kopyalar (sadece bilinen alanlar, makul boyut). */
export function cleanSignal(x: unknown): Signal | null {
  if (!isObject(x)) return null;
  if (isObject(x.sdp)) {
    const { type, sdp } = x.sdp;
    return (type === 'offer' || type === 'answer') && isSdp(sdp) ? { sdp: { type, sdp } } : null;
  }
  if (isObject(x.candidate)) {
    const { candidate, sdpMid, sdpMLineIndex } = x.candidate;
    if (typeof candidate !== 'string' || candidate.length > 1000) return null;
    const out: { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null } = { candidate };
    if (sdpMid === null || (typeof sdpMid === 'string' && sdpMid.length <= 16)) out.sdpMid = sdpMid;
    if (sdpMLineIndex === null || (typeof sdpMLineIndex === 'number' && Number.isInteger(sdpMLineIndex) && sdpMLineIndex >= 0 && sdpMLineIndex < 64)) out.sdpMLineIndex = sdpMLineIndex;
    return { candidate: out };
  }
  return null;
}

function cleanRtc(m: Record<string, unknown>): ClientMessage | null {
  const id = m.id;
  if (typeof id !== 'number' || !Number.isInteger(id) || id < 1 || id > 1e9) return null;
  switch (m.op) {
    case 'session':
      return { t: 'rtc', id, op: 'session' };
    case 'publish':
      return isSdp(m.sdp) && isMid(m.mid) && isTrackName(m.track) ? { t: 'rtc', id, op: 'publish', sdp: m.sdp, mid: m.mid, track: m.track } : null;
    case 'pull':
      return isItemId(m.from) ? { t: 'rtc', id, op: 'pull', from: m.from } : null;
    case 'renegotiate':
      return isSdp(m.sdp) ? { t: 'rtc', id, op: 'renegotiate', sdp: m.sdp } : null;
    case 'close': {
      const mids = Array.isArray(m.mids) ? m.mids.filter(isMid).slice(0, VOICE_MAX) : [];
      return mids.length ? { t: 'rtc', id, op: 'close', mids } : null;
    }
    default:
      return null;
  }
}

export function parseClientMessage(raw: string): ClientMessage | null {
  // Only a custom emoji or a chat image is this big; their data length is checked again below.
  if (raw.length > BIG_MESSAGE_MAX) return null;
  let m: unknown;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(m)) return null;
  // Sadece özel emoji ve sesli sohbetin SDP'si büyük olabilir.
  if (raw.length > MAX_MESSAGE_BYTES && m.t !== 'sticker-add' && !(m.t === 'chat' && m.image !== undefined) && !((m.t === 'rtc' || m.t === 'signal' || m.t === 'live-signal') && raw.length <= RTC_MESSAGE_MAX)) return null;

  switch (m.t) {
    case 'hello': {
      const name = cleanName(m.name);
      if (typeof m.v !== 'number' || name === null) return null;
      // Avatar ve kalıcı kimlik isteğe bağlı: geçersizse sessizce yok sayılır, katılım engellenmez.
      const hello: Extract<ClientMessage, { t: 'hello' }> = { t: 'hello', v: m.v, name };
      if (isAvatar(m.avatar)) hello.avatar = m.avatar;
      if (typeof m.cid === 'string' && CLIENT_ID.test(m.cid)) hello.cid = m.cid;
      if (m.client === 'web' || m.client === 'ext') hello.client = m.client;
      if (isItemId(m.prev)) hello.prev = m.prev;
      if (typeof m.tv === 'string' && TV_TOKEN.test(m.tv)) hello.tv = m.tv;
      return hello;
    }
    case 'tv-link':
      return typeof m.code === 'string' && TV_CODE.test(m.code) ? { t: 'tv-link', code: m.code } : null;
    case 'tv': {
      if (!(TV_OPS as readonly unknown[]).includes(m.op)) return null;
      const out: Extract<ClientMessage, { t: 'tv' }> = { t: 'tv', op: m.op as TvOp };
      if (typeof m.value === 'boolean') out.value = m.value;
      else if (typeof m.value === 'number' && Number.isFinite(m.value)) out.value = Math.max(0, Math.min(100, Math.round(m.value)));
      return out;
    }
    case 'rename': {
      const name = cleanName(m.name);
      if (name === null) return null;
      return isAvatar(m.avatar) ? { t: 'rename', name, avatar: m.avatar } : { t: 'rename', name };
    }
    case 'kick':
    case 'unban':
    case 'unpin':
      return isItemId(m.id) ? { t: m.t, id: m.id } : null;
    case 'ready':
      if (typeof m.ready !== 'boolean') return null;
      return typeof m.ad === 'boolean' ? { t: 'ready', ready: m.ready, ad: m.ad } : { t: 'ready', ready: m.ready };
    case 'settings': {
      const out: Extract<ClientMessage, { t: 'settings' }> = { t: 'settings' };
      for (const key of ['waitForAll', 'hostOnly', 'lockQueue', 'autoNext', 'loop', 'saved', 'noReactions', 'liveHostOnly'] as const) {
        if (typeof m[key] === 'boolean') out[key] = m[key] as boolean;
      }
      if ((REACTION_GAPS as readonly unknown[]).includes(m.reactionGap)) out.reactionGap = m.reactionGap as ReactionGap;
      const name = cleanRoomName(m.name);
      if (name) out.name = name;
      if (m.startsAt === null) out.startsAt = null;
      else if (isTimestamp(m.startsAt)) out.startsAt = m.startsAt;
      return Object.keys(out).length > 1 ? out : null;
    }
    case 'vote':
      return isItemId(m.id) && typeof m.up === 'boolean' ? { t: 'vote', id: m.id, up: m.up } : null;
    case 'recap':
    case 'recap-save':
    case 'recaps':
    case 'home':
      return { t: m.t };
    case 'voice': {
      if (typeof m.on !== 'boolean') return null;
      const out: Extract<ClientMessage, { t: 'voice' }> = { t: 'voice', on: m.on };
      if (typeof m.mic === 'boolean') out.mic = m.mic;
      if (isTrackName(m.track)) out.track = m.track;
      if (typeof m.cam === 'boolean') out.cam = m.cam;
      return out;
    }
    case 'rtc':
      return cleanRtc(m);
    case 'signal':
    case 'live-signal': {
      const data = cleanSignal(m.data);
      return isItemId(m.to) && data ? { t: m.t, to: m.to, data } : null;
    }
    case 'live':
      if (typeof m.on !== 'boolean') return null;
      return m.on && (m.kind === 'screen' || m.kind === 'camera') ? { t: 'live', on: true, kind: m.kind } : { t: 'live', on: false };
    case 'live-watch':
      return typeof m.on === 'boolean' ? { t: 'live-watch', on: m.on } : null;
    case 'live-stop':
      return { t: 'live-stop' };
    case 'game':
      if (m.end === true) return { t: 'game', end: true };
      return (ROOM_GAME_KINDS as readonly unknown[]).includes(m.kind) ? { t: 'game', kind: m.kind as RoomGameKind } : null;
    case 'ping':
      return isTimestamp(m.c) ? { t: 'ping', c: m.c } : null;
    case 'load':
    case 'enqueue': {
      const media = cleanMedia(m.media);
      if (!media) return null;
      const title = media.kind === 'page' ? cleanTitle(m.title) : null;
      return title ? { t: m.t, media, title } : { t: m.t, media };
    }
    case 'dequeue':
    case 'jump':
      return isItemId(m.id) ? { t: m.t, id: m.id } : null;
    case 'move':
      if (!isItemId(m.id) || !Number.isInteger(m.to) || (m.to as number) < 0 || (m.to as number) >= QUEUE_MAX_LENGTH) return null;
      return { t: 'move', id: m.id, to: m.to as number };
    case 'next':
      if (!isItemId(m.from)) return null;
      return m.end === true ? { t: 'next', from: m.from, end: true } : { t: 'next', from: m.from };
    case 'prev':
      return isItemId(m.from) ? { t: 'prev', from: m.from } : null;
    case 'play':
    case 'pause':
    case 'seek':
      if (!isPosition(m.position) || !isTimestamp(m.at)) return null;
      return { t: m.t, position: m.position, at: m.at };
    case 'rate':
      if (!isValidRate(m.rate) || !isPosition(m.position) || !isTimestamp(m.at)) return null;
      return { t: 'rate', rate: m.rate, position: m.position, at: m.at };
    case 'react':
      if (isReaction(m.emoji)) return { t: 'react', emoji: m.emoji };
      return isStickerId(m.sticker) ? { t: 'react', sticker: m.sticker } : null;
    case 'sticker-add':
      return isStickerData(m.data) ? { t: 'sticker-add', data: m.data } : null;
    case 'sticker-remove':
      return isStickerId(m.id) ? { t: 'sticker-remove', id: m.id } : null;
    case 'sticker-clear':
      return { t: 'sticker-clear' };
    case 'pin': {
      if (m.note === undefined) return { t: 'pin' };
      const note = cleanChatText(m.note);
      return note ? { t: 'pin', note: Array.from(note).slice(0, PIN_NOTE_MAX).join('') } : { t: 'pin' };
    }
    case 'chat': {
      const text = cleanChatText(m.text);
      if (m.image !== undefined) return isChatImageData(m.image) ? { t: 'chat', text: text ?? '', image: m.image } : null;
      return text ? { t: 'chat', text } : null;
    }
    default:
      return null;
  }
}

/** İnce hız ayarı: ±0.05 adım, MIN_RATE–MAX_RATE arası, iki basamağa yuvarlı. */
export function stepRate(rate: number, direction: 1 | -1): number {
  return Math.min(MAX_RATE, Math.max(MIN_RATE, Math.round((rate + direction * 0.05) * 100) / 100));
}
