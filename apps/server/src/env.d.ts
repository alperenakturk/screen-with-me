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
  /** Feedback (card 9): a fine-grained GitHub token (Issues: write on this repository only); without it feedback is off. */
  FEEDBACK_GITHUB_TOKEN?: string;
  /** The repository feedback issues go to (`owner/name`, default this repository). */
  FEEDBACK_REPO?: string;
  /** Feedback bursts per IP and minute. */
  FEEDBACK_LIMIT?: RateLimit;
  /** Saved-room lookups (`/info`, `unsave`) per IP and minute. */
  ROOM_INFO_LIMIT?: RateLimit;
  /** The running version's metadata (`version_metadata` binding; answered by `/api/version`). */
  CF_VERSION_METADATA?: WorkerVersionMetadata;
}
