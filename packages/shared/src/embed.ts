// Film sayfasındaki senkron motoru ile site arasındaki mesajlar. Film kendi sekmesinde oynarken
// sitenin oda sayfası sayfanın üstünde katman olarak çalışır (bkz. shell.ts); oda bağlantısını site
// tutar, eklenti sadece site ile film çerçevesi arasında bu mesajları taşır.

import type { ClientMessage, PlaybackState } from './protocol.ts';

/** Film çerçevesindeki senkron motorunun odaya gönderebileceği mesajlar (site bunları kendi bağlantısından yollar). */
const RELAYABLE = new Set<ClientMessage['t']>(['play', 'pause', 'seek', 'rate', 'next', 'ready']);

export function isRelayable(message: ClientMessage): boolean {
  return RELAYABLE.has(message.t);
}

/** Sitenin film videosuna verdiği komutlar (tam ekran kontrolleri, pin şeridi, hız menüsü). */
export type EmbedControl =
  | { action: 'play' }
  | { action: 'pause' }
  | { action: 'seek'; time: number }
  | { action: 'rate'; rate: number }
  | { action: 'sync-all' }
  /** Sesli sohbette biri konuşuyor: film sesi kısılsın / eski hâline dönsün (odaya bir şey gitmez). */
  | { action: 'duck'; on: boolean };

/** Film videosunun durumu (sitedeki ilerleme çubuğu ve pin şeridi için). */
export interface EmbedStatus {
  time: number;
  duration: number;
  paused: boolean;
  rate: number;
}

/** Site → film çerçevesi. */
export type EmbedRequest =
  | { type: 'state'; state: PlaybackState }
  | { type: 'clock'; offset: number; synced: boolean }
  | { type: 'control'; control: EmbedControl }
  /** Odada artık bu film yok: film sayfasındaki motor dursun (video orada durur, odaya bir şey gitmez). */
  | { type: 'detach' };

/** Film çerçevesi → site. */
export type EmbedReply =
  | { type: 'send'; message: ClientMessage }
  | { type: 'status'; status: EmbedStatus }
  /** Film sayfasında basılan kısayol (1–8 emoji, Enter mesaj, P pin): site kendi kısayolu gibi işler. */
  /** `up`: tuş bırakıldı (sadece bas-konuş tuşu için gelir). */
  | { type: 'key'; key: string; up?: boolean }
  /** Film sitesinin kendi tam ekran düğmesine basıldı: site kendi tam ekranını açsın. */
  | { type: 'fullscreen' }
  /** Fare film sayfasında oynadı: tam ekran kontrolleri belirsin (yoksa site fareyi hiç görmez). */
  | { type: 'activity' };

/** Bas-konuş tuşu: basılı tutulunca mikrofon açılır (sesli sohbette "bas-konuş" seçiliyse). */
export function isPushToTalkKey(key: string): boolean {
  return key.toLowerCase() === 'v';
}

/** Film sayfasından siteye iletilen kısayol tuşları. */
export function isForwardedKey(key: string): boolean {
  return key === 'Enter' || key.toLowerCase() === 'p' || /^[1-8]$/.test(key) || isPushToTalkKey(key);
}
