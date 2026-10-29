// Worker'ın gizli değişkenleri (wrangler types bunları bilmez; panelden ya da `wrangler secret put` ile eklenir).
interface Env {
  /** Cloudflare Realtime (SFU) uygulamasının kimliği: yoksa sesli sohbet kapalı. */
  REALTIME_APP_ID?: string;
  /** Cloudflare Realtime uygulamasının gizli anahtarı (istemciye hiç gitmez). */
  REALTIME_APP_SECRET?: string;
  /** "off": sesli sohbet her yerde kapanır (bütçe freni / acil durum). */
  VOICE?: string;
  /** Connections per IP and minute (Workers rate limiting binding; missing in old configs = no limit). */
  CONNECT_LIMIT?: RateLimit;
  /** YouTube Data API v3 key (repo secret, passed by the deploy job): without it the link box only takes links. */
  YOUTUBE_API_KEY?: string;
  /** YouTube searches per IP and minute that reach YouTube (cache hits are free). */
  SEARCH_LIMIT?: RateLimit;
}
