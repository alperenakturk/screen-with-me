// Eklentinin parçaları arasındaki mesajlar.
//
//   site (ana sayfa)  →  site-bridge  →  arka plan (background)
//   site (kabukta)   ⇄  shell.html   ⇄  arka plan  ⇄  film sekmesindeki çerçeveler (content)
//
// Eklentinin kendi oda bağlantısı yok: odayı her zaman site tutar. Film sekmesinde site,
// eklentinin açtığı katmanın (kabuk) içinde çalışır; arka plan site ile film sayfasındaki
// senkron motoru arasında mesaj taşır.

import type { EmbedControl, EmbedReply, EmbedRequest } from '@swm/shared/embed';
import type { ClientMessage, PlaybackState } from '@swm/shared/protocol';
import type { Rect, ShellLayout } from '@swm/shared/shell';

/** Çerçevelerin "bir sekmede oda var mı" diye baktığı yer (chrome.storage.session): kabuklu sekmeler. */
export const SESSIONS_KEY = 'sessions';

/** Film çerçevesi ⇄ arka plan. */
export const PORT_NAME = 'swm';
/** shell.html ⇄ arka plan. */
export const SHELL_PORT_NAME = 'swm-shell';

/** Çerçeve → arka plan */
export type FrameMessage =
  /** `size` tanı içindir: en iyi videonun ekrandaki boyutu. */
  | { type: 'candidate'; score: number; size?: string }
  /** Videonun durumu (sitedeki ilerleme çubuğu ve pin şeridi için). */
  | { type: 'status'; status: { time: number; duration: number; paused: boolean; rate: number } }
  /** Film sayfasında basılan kısayol ya da film sitesinin tam ekran düğmesi siteye iletilsin. */
  | { type: 'key'; key: string }
  | { type: 'fullscreen' }
  /** Bizim tam ekranımız bitti/başladı (üst çerçeve: Esc vb.). */
  | { type: 'fullscreen-changed'; on: boolean }
  | { type: 'send'; message: ClientMessage };

/** Arka plan → çerçeve */
export type BackgroundMessage =
  | { type: 'activate'; state: PlaybackState; offset: number; synced: boolean }
  /** Senkron bu çerçevede dursun; `pause`: odada artık bu film yok, video da dursun. */
  | { type: 'deactivate'; pause?: boolean }
  /** Bu sekmede oda yok: çerçeve uykuya dönsün. */
  | { type: 'idle' }
  | { type: 'state'; state: PlaybackState }
  | { type: 'clock'; offset: number; synced: boolean }
  /** Sitenin kontrollerinden gelen komut (tam ekran çubuğu, pin şeridi, hız). */
  | { type: 'control'; control: EmbedControl }
  /** Üst çerçeve: odanın katmanını (kabuk) aç. */
  | { type: 'shell-open'; roomId: string }
  /**
   * Katmanın hâli tüm çerçevelere: `active` videolu çerçeve mi. Üst çerçeve `hole`'a göre videoyu
   * yerleştirir; ara çerçeveler videolu iç çerçeveyi kendi alanlarına büyütür.
   */
  /** `fromSite`: yerleşimi site bildirdi (yoksa arka planın yer tutucusu: katman henüz boyanmadı, örtü kalsın). */
  | { type: 'shell-layout'; layout: ShellLayout; active: boolean; fromSite: boolean }
  /** Üst çerçeve: film sayfasını tam ekran yap / çık. */
  | { type: 'shell-fullscreen'; on: boolean };

/** Arka plan → sekmedeki tüm çerçeveler: "bu sekmede oda var, videonu bildir". */
export const PROBE = 'swm-probe';

/** shell.html → arka plan */
export type ShellPortMessage =
  | { type: 'hello' }
  | { type: 'embed'; request: EmbedRequest }
  | { type: 'layout'; layout: ShellLayout }
  | { type: 'navigate'; url: string }
  | { type: 'fullscreen'; on: boolean };

/** Arka plan → shell.html */
export type ShellPortReply =
  /** Bu sekmenin odası: shell.html sitemizi ancak bunu alınca açar (başka bir sayfaya gömülen shell.html hiçbir şey açmaz). */
  | { type: 'room'; roomId: string }
  | { type: 'reply'; reply: EmbedReply }
  | { type: 'page'; url: string }
  | { type: 'video'; found: boolean }
  | { type: 'fullscreen'; on: boolean };

/** Ana site → arka plan (site-bridge üzerinden): "bu sekme film sayfasına gitsin, odanın katmanıyla". */
export interface SiteGoMessage {
  type: 'site-go';
  roomId: string;
  url: string;
}

export type { Rect };
