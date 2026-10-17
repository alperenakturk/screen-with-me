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
import type { Avatar, ClientMessage, Member, PlaybackState, QueueItem, Reaction } from '@swm/shared/protocol';

/** Çerçevelerin "oda var mı" diye baktığı yer (chrome.storage.session). */
export const SESSIONS_KEY = 'sessions';

export const PORT_NAME = 'swm';

/** Çerçeve → arka plan */
export type FrameMessage =
  /** `size` tanı içindir: en iyi videonun ekrandaki boyutu, örn. "1280×720". */
  | { type: 'candidate'; score: number; size?: string }
  | { type: 'send'; message: ClientMessage }
  | { type: 'join'; roomId: string };

/** Sayfa üstü çubukta gösterilen oda bilgisi. */
export interface RoomInfo {
  roomId: string;
  inviteUrl: string;
  members: Member[];
  myId: string | null;
  queueLength: number;
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
  /** Bu sekmede oda yok: çerçeve uykuya dönsün. */
  | { type: 'idle' }
  | { type: 'state'; state: PlaybackState }
  | { type: 'clock'; offset: number; synced: boolean }
  | { type: 'room'; room: RoomInfo }
  | { type: 'reaction'; emoji: Reaction; name: string }
  | { type: 'chat'; line: ChatLine }
  /** "Ayşe katıldı / ayrıldı" bildirimi (isim avatarıyla birlikte). */
  | { type: 'notice'; kind: 'joined' | 'left'; name: string };

/** Arka plan → sekmedeki tüm çerçeveler: "bu sekmede oda var, videonu bildir". */
export const PROBE = 'swm-probe';

/**
 * ScreenWithMe sitesi → eklenti (site-bridge üzerinden): "bu sekme şu odaya
 * katılsın". Sekme odaya bağlanır, eklenti onu odanın sayfasına kendisi götürür.
 */
export interface SiteJoinMessage {
  type: 'site-join';
  roomId: string;
}

/** Sitenin pencereye attığı mesajın biçimi (window.postMessage). */
export const SITE_MESSAGE_SOURCE = 'screenwithme-site';

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
  | { type: 'share-this-page'; tabId: number };

export interface PopupStatus {
  name: string | null;
  avatar: Avatar | null;
  tabUrl: string | null;
  session: null | {
    roomId: string;
    inviteUrl: string;
    connection: ConnectionStatus;
    members: Member[];
    myId: string | null;
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
