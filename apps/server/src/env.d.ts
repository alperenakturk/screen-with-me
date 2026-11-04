// Worker'ın gizli değişkenleri (wrangler types bunları bilmez; panelden ya da `wrangler secret put` ile eklenir).
interface Env {
  /** Cloudflare Realtime (SFU) uygulamasının kimliği: yoksa sesli sohbet kapalı. */
  REALTIME_APP_ID?: string;
  /** Cloudflare Realtime uygulamasının gizli anahtarı (istemciye hiç gitmez). */
  REALTIME_APP_SECRET?: string;
  /** "off": sesli sohbet her yerde kapanır (bütçe freni / acil durum). */
  VOICE?: string;
  /**
   * CI diet: `wrangler dev --var SWM_LOCAL_UNPACED:1` (CI's local server only, never in wrangler.jsonc or live) lets a
   * localhost run skip the per-IP connection limit, so the e2e files need no minute-long pauses between them.
   */
  SWM_LOCAL_UNPACED?: string;
  /** Security R4-1, local tests only (`wrangler dev --var UPLOAD_IP_BYTES:<n>`): a lower per-address daily image budget. */
  UPLOAD_IP_BYTES?: string;
  /** Security R4-10: "on" turns the hidden TV version's server side on (pairing, `tv-link`, a TV's hello); off otherwise. */
  TV?: string;
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
  /** Card Y3: the owner's key for `GET /api/youtube/usage` (header `X-Usage-Token`); without it the route is refused. */
  USAGE_TOKEN?: string;
  /** The running version's metadata (`version_metadata` binding; answered by `/api/version`). */
  CF_VERSION_METADATA?: WorkerVersionMetadata;
}
