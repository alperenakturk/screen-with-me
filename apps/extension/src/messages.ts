// Eklentinin parçaları arasındaki mesajlar.
//
//   popup  ⇄  arka plan (background)  ⇄  sunucu
//                     ⇅
//            sekmedeki çerçeveler (content)
//
// Arka plan her sekme için bir oda bağlantısı tutar. Sekmedeki her çerçeve
// (sayfa ve içindeki iframe'ler) kendi bulduğu en iyi videoyu bildirir; arka
// plan en iyisini "etkin" seçer, senkron o çerçevede çalışır.

import type { ConnectionStatus } from '@swm/shared/connection';
import type { EmbedControl, EmbedStatus } from '@swm/shared/embed';
import type { Avatar, BanEntry, ClientMessage, Member, Pin, PlaybackState, QueueItem, Reaction } from '@swm/shared/protocol';

/** Çerçevelerin "oda var mı" diye baktığı yer (chrome.storage.session). */
export const SESSIONS_KEY = 'sessions';

export const PORT_NAME = 'swm';
/** Sitenin "filmi burada göster" bağlantısı (site-bridge ⇄ arka plan). */
export const EMBED_PORT_NAME = 'swm-embed';

/** Çerçeve → arka plan */
export type FrameMessage =
  /** Ortak geçiş sorusuna cevap ("gidelim mi?"): evet → git, hayır → burada kal. */
  | { type: 'follow-answer'; yes: boolean }
  /**
   * `size` tanı içindir: en iyi videonun ekrandaki boyutu, örn. "1280×720".
   * `embedDepth`: çerçeve bizim sitenin içinde (film sitenin içinde açıldı); 1 = film sayfasının kendisi.
   */
  | { type: 'candidate'; score: number; size?: string; embedDepth?: number }
  /** Sitenin içindeki çerçeve: videonun durumu (sitedeki ilerleme çubuğu için). */
  | { type: 'status'; status: EmbedStatus }
  /** Sitenin içindeki çerçeve: kısayol tuşu ya da film sitesinin tam ekran düğmesi siteye iletilsin. */
  | { type: 'key'; key: string }
  | { type: 'fullscreen' }
  | { type: 'send'; message: ClientMessage }
  /** Çubuktaki 🏠: sekme sitedeki odaya dönsün. */
  | { type: 'go-room' }
  /** Oda görünümü aç/kapa (tercih kaydedilir, sekmedeki tüm çerçevelere duyurulur). */
  | { type: 'roomview'; on: boolean }
  | { type: 'join'; roomId: string };

/** Sayfa üstü çubukta gösterilen oda bilgisi. */
export interface RoomInfo {
  roomId: string;
  inviteUrl: string;
  members: Member[];
  myId: string | null;
  /** Oda yöneticisinin üye ID'si (👑). */
  hostId: string | null;
  queueLength: number;
  /** Video bitince sıradakine kendiliğinden geçilsin mi (oda ayarı). */
  autoNext: boolean;
  /** Yönetici emojileri kapattı. */
  noReactions: boolean;
  /** Kaydedilmiş odanın adı (varsa). */
  roomName?: string;
}

export interface ChatLine {
  id: string;
  /** Avatarıyla birlikte, örn. "🦊 Ali". */
  name: string;
  text: string;
  mine: boolean;
}

/** Arka plan → çerçeve */
export type BackgroundMessage =
  | { type: 'activate'; state: PlaybackState; offset: number; synced: boolean }
  | { type: 'deactivate' }
  /**
   * Oda görünümü: film kendi sekmesinde, sayfanın üstü bizim oda kabuğuyla kaplanır. `active`: videonun
   * olduğu çerçeve mi (o boşluğa yerleşir ve kabuğu çizer); değilse sadece içindeki oynatıcı çerçevesini büyütür.
   */
  | { type: 'roomview'; on: boolean; active: boolean }
  /** Bu sekmede oda yok: çerçeve uykuya dönsün. */
  | { type: 'idle' }
  | { type: 'state'; state: PlaybackState }
  | { type: 'clock'; offset: number; synced: boolean }
  /** Sitenin kontrollerinden gelen komut (sadece sitenin içindeki çerçeveye). */
  | { type: 'control'; control: EmbedControl }
  | { type: 'room'; room: RoomInfo }
  | { type: 'reaction'; byId: string; name: string; avatar?: Avatar; emoji?: Reaction; sticker?: string }
  /** Odaya özel emoji eklendi (etkinleşince odadakilerin hepsi de tek tek gelir). */
  | { type: 'sticker'; id: string; data: string }
  | { type: 'stickers-clear' }
  /**
   * Ortak geçiş sorusu: biri yeni sayfa açtı (page), odada başka bir video açtı (room) ya da
   * odaya döndü (home). Evet diyen gider, hayır diyen kalır.
   */
  | { type: 'ask-follow'; kind: 'page' | 'room' | 'home'; name: string; host?: string }
  | { type: 'sticker-removed'; id: string }
  /** Açık videonun pinleri (`removable`: kendi pinim ya da yöneticiyim). */
  | { type: 'pins'; pins: Array<Pin & { removable: boolean }> }
  | { type: 'chat'; line: ChatLine }
  /** "Ayşe katıldı / ayrıldı" bildirimi (isim avatarıyla birlikte); "slow": çok hızlı mesaj atıldı. */
  | { type: 'notice'; kind: 'joined' | 'left' | 'slow' | 'locked'; name: string }
  /** Odaya yeni girildi: "İyi seyirler" açılış animasyonu. */
  | { type: 'intro' }
  /** Film sayfasında ilk kez: nasıl kullanılır rehberi (`afterIntro`: açılıştan sonra göster). */
  | { type: 'guide'; afterIntro: boolean }
  /** Oda bağlantısı kapandı (çıkarıldın / oda dolu / eklenti eski): kısa bir açıklama göster. */
  | { type: 'ended'; reason: 'kicked' | 'version' | 'room_full' }
  /** "Herkes hazır": oda bunları bekliyor (boş: bekleme yok). `me`: beklenen bensem. */
  | { type: 'waiting'; names: string[]; me: boolean };

/** Arka plan → sekmedeki tüm çerçeveler: "bu sekmede oda var, videonu bildir". */
export const PROBE = 'swm-probe';

/**
 * ScreenWithMe sitesi → eklenti (site-bridge üzerinden): "bu sekme şu odaya
 * katılsın". Sekme odaya bağlanır, eklenti onu odanın sayfasına kendisi götürür.
 */
export interface SiteJoinMessage {
  type: 'site-join';
  roomId: string;
  /** Odada açık sayfa: sekme bağlantıyı beklemeden hemen oraya gider (hız için). */
  url?: string;
}

/** Sitenin pencereye attığı mesajın biçimi (window.postMessage). */
export const SITE_MESSAGE_SOURCE = 'screenwithme-site';
/** Eklentinin siteye cevabı: "sekmeyi ben götürüyorum" (site kendi bağlantısını kapatır). */
export const EXTENSION_MESSAGE_SOURCE = 'screenwithme-extension';

/** Popup → arka plan */
export type PopupRequest =
  | { type: 'status'; tabId: number }
  | { type: 'set-name'; name: string; avatar: Avatar }
  | { type: 'create'; tabId: number }
  | { type: 'join'; tabId: number; input: string }
  | { type: 'leave'; tabId: number }
  | { type: 'react'; tabId: number; emoji: Reaction }
  | { type: 'chat'; tabId: number; text: string }
  | { type: 'go-to-room-page'; tabId: number }
  | { type: 'share-this-page'; tabId: number }
  | { type: 'reload'; tabId: number }
  | { type: 'go-room'; tabId: number }
  | { type: 'kick'; tabId: number; memberId: string }
  | { type: 'unban'; tabId: number; banId: string };

export interface PopupStatus {
  name: string | null;
  avatar: Avatar | null;
  tabUrl: string | null;
  /** Bu sekmedeki oda az önce kapandıysa nedeni. */
  ended: 'kicked' | 'version' | 'room_full' | null;
  session: null | {
    roomId: string;
    inviteUrl: string;
    connection: ConnectionStatus;
    members: Member[];
    myId: string | null;
    hostId: string | null;
    /** Odadan kalıcı olarak çıkarılanlar (sadece yöneticiye gelir). */
    bans: BanEntry[];
    item: QueueItem | null;
    queueLength: number;
    /** Sekme, odada açık olan sayfada mı? */
    onRoomPage: boolean;
    /** Bu sekmede senkronlanan bir video bulundu mu? */
    hasVideo: boolean;
    /** Tanı için: sekmede arka plana bağlı çerçeve sayısı ve en iyi videonun boyutu (piksel). */
    frames: number;
    bestVideo: string | null;
  };
}

export type PopupResponse = { ok: true; status?: PopupStatus } | { ok: false; error: string };
