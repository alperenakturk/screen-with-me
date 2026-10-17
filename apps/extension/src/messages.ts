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
import type { ClientMessage, Member, PlaybackState, QueueItem, Reaction } from '@swm/shared/protocol';

export const PORT_NAME = 'swm';

/** Çerçeve → arka plan */
export type FrameMessage =
  | { type: 'candidate'; score: number }
  | { type: 'send'; message: ClientMessage }
  | { type: 'join'; roomId: string };

/** Arka plan → çerçeve */
export type BackgroundMessage =
  | { type: 'activate'; state: PlaybackState; offset: number; synced: boolean }
  | { type: 'deactivate' }
  | { type: 'state'; state: PlaybackState }
  | { type: 'clock'; offset: number; synced: boolean }
  | { type: 'reaction'; emoji: Reaction; name: string }
  | { type: 'chat'; name: string; text: string; mine: boolean };

/** Arka plan → sekmedeki tüm çerçeveler: "bu sekmede oda var, videonu bildir". */
export const PROBE = 'swm-probe';

/** Popup → arka plan */
export type PopupRequest =
  | { type: 'status'; tabId: number }
  | { type: 'set-name'; name: string }
  | { type: 'create'; tabId: number }
  | { type: 'join'; tabId: number; input: string }
  | { type: 'leave'; tabId: number }
  | { type: 'react'; tabId: number; emoji: Reaction }
  | { type: 'chat'; tabId: number; text: string }
  | { type: 'go-to-room-page'; tabId: number }
  | { type: 'share-this-page'; tabId: number };

export interface PopupStatus {
  name: string | null;
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
  };
}

export type PopupResponse = { ok: true; status?: PopupStatus } | { ok: false; error: string };
