// Eklentinin parçaları arasındaki mesajlar.
//
//   site (ana sayfa)  →  site-bridge  →  arka plan (background)
//   site (kabukta)   ⇄  shell.html   ⇄  arka plan  ⇄  film sekmesindeki çerçeveler (content)
//
// Eklentinin kendi oda bağlantısı yok: odayı her zaman site tutar. Film sekmesinde site,
// eklentinin açtığı katmanın (kabuk) içinde çalışır; arka plan site ile film sayfasındaki
// senkron motoru arasında mesaj taşır.

import type { EmbedControl, EmbedReply, EmbedRequest, EmbedStatus } from '@swm/shared/embed';
import type { ClientMessage, PlaybackState } from '@swm/shared/protocol';
import type { Rect, ShellLayout, VoiceDown, VoiceUp } from '@swm/shared/shell';

/** Çerçevelerin "bir sekmede oda var mı" diye baktığı yer (chrome.storage.session): kabuklu sekmeler. */
export const SESSIONS_KEY = 'sessions';

/** Film çerçevesi ⇄ arka plan. */
export const PORT_NAME = 'swm';
/** shell.html ⇄ arka plan. */
export const SHELL_PORT_NAME = 'swm-shell';
/** Ses sayfası (offscreen) ⇄ arka plan. */
export const VOICE_PORT_NAME = 'swm-voice';
/** İzin sayfası (mic.html) → arka plan: mikrofon izni verildi mi. */
export const MIC_RESULT = 'swm-mic-result';

/** Arka plan → ses sayfası. */
export type OffscreenIn =
  | { type: 'voice'; tabId: number; roomId: string; msg: VoiceUp }
  /** İzin sekmesinin sonucu. */
  | { type: 'permission'; granted: boolean }
  /** Bu sekmenin odası bitti: ses de biter. */
  | { type: 'end'; tabId: number };

/** Ses sayfası → arka plan. */
export type OffscreenOut = { tabId: number; msg: VoiceDown } | { type: 'need-permission'; cam?: boolean };

/** Çerçeve → arka plan */
export type FrameMessage =
  /** `size` tanı içindir: en iyi videonun ekrandaki boyutu. */
  | { type: 'candidate'; score: number; size?: string }
  /** Videonun durumu (sitedeki ilerleme çubuğu ve pin şeridi için). */
  | { type: 'status'; status: EmbedStatus }
  /** Film sayfasında basılan kısayol ya da film sitesinin tam ekran düğmesi siteye iletilsin. */
  | { type: 'key'; key: string; up?: boolean }
  | { type: 'fullscreen' }
  /**
   * Fare film sayfasında oynadı (oda görünümünde): sitenin tam ekran kontrolleri belirsin. `click`: tıklandı (hemen
   * ardından sekme başka siteye giderse reklam yönlendirmesi sayılır, katman kalkmaz).
   */
  | { type: 'activity'; click?: boolean; edge?: boolean }
  /** Üst çerçeve: delik açıldı (sayfa gizli, video yerinde); site deliğin içini saydam yapabilir. */
  | { type: 'hole' }
  /** Bizim tam ekranımız bitti/başladı (üst çerçeve: Esc vb.). */
  | { type: 'fullscreen-changed'; on: boolean }
  /** Seçim modunda kullanıcı bu çerçevedeki bir videoyu seçti ("🎯 Bunu senkronla"). */
  | { type: 'picked' }
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
  | { type: 'shell-fullscreen'; on: boolean }
  /** Elle video seçimi: videoların üstüne "Bunu senkronla" düğmeleri çizilsin / kalksın. */
  | { type: 'pick'; on: boolean }
  /** Başka bir çerçevedeki video seçildi: bu çerçevenin elle seçimi geçersiz. */
  | { type: 'unpick' };

/** Arka plan → sekmedeki tüm çerçeveler: "bu sekmede oda var, videonu bildir". */
export const PROBE = 'swm-probe';

/** shell.html → arka plan */
export type ShellPortMessage =
  | { type: 'hello' }
  | { type: 'embed'; request: EmbedRequest }
  | { type: 'layout'; layout: ShellLayout }
  | { type: 'navigate'; url: string }
  | { type: 'fullscreen'; on: boolean }
  | { type: 'pick'; on: boolean }
  /** Site bir bağlantıyı yeni sekmede açıyor (sohbetteki link): o sekme reklam sayılıp kapatılmasın. */
  | { type: 'open-ok' }
  /** Kapatılan reklam sekmesini geri aç ("Geri aç"). */
  | { type: 'reopen'; url: string }
  | { type: 'voice'; msg: VoiceUp };

/** Arka plan → shell.html */
export type ShellPortReply =
  /** Bu sekmenin odası: shell.html sitemizi ancak bunu alınca açar (başka bir sayfaya gömülen shell.html hiçbir şey açmaz). */
  | { type: 'room'; roomId: string }
  | { type: 'reply'; reply: EmbedReply }
  | { type: 'page'; url: string; strayed?: boolean }
  | { type: 'video'; found: boolean }
  | { type: 'fullscreen'; on: boolean }
  | { type: 'hole' }
  | { type: 'picked' }
  | { type: 'tab-closed'; url: string }
  | { type: 'voice'; msg: VoiceDown };

/** Ana site → arka plan (site-bridge üzerinden): "bu sekme film sayfasına gitsin, odanın katmanıyla". */
export interface SiteGoMessage {
  type: 'site-go';
  roomId: string;
  url: string;
}

export type { Rect };
