// Worker'ın gizli değişkenleri (wrangler types bunları bilmez; panelden ya da `wrangler secret put` ile eklenir).
interface Env {
  /** Cloudflare Realtime (SFU) uygulamasının kimliği: yoksa sesli sohbet kapalı. */
  REALTIME_APP_ID?: string;
  /** Cloudflare Realtime uygulamasının gizli anahtarı (istemciye hiç gitmez). */
  REALTIME_APP_SECRET?: string;
  /** "off": sesli sohbet her yerde kapanır (bütçe freni / acil durum). */
  VOICE?: string;
}
