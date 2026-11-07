# Costs and free limits (card OPS1)

Sidelit runs for free today: Cloudflare's Workers **Free** plan, YouTube's free API quota and GitHub's free Actions for
a public repository. This page lists every limit we lean on, how close we are, how to read today's usage, and what
breaks when a limit runs out. Update it when a plan, a limit in the code or our usage changes.

**Cloudflare's numbers below are from its documentation as we know it (Nov 2026); check them on the pages linked in
each row before relying on them** (this cloud session can't reach `developers.cloudflare.com`). Our own numbers are
from the code and checked by the help harness where noted.

## Cloudflare Workers (Free plan)

| Limit | Free plan | What uses it | When it runs out |
| --- | --- | --- | --- |
| Worker requests | 100 000 a day (resets 00:00 UTC) | every `/api/*` request: room / game sockets, the HTTP fallback's polls, search, info, version, probe. Static files (the site) don't count | new requests get Cloudflare's error 1027 page until midnight UTC: nobody can join a room; rooms already open keep their sockets |
| CPU time | 10 ms per request | short handlers; Durable Objects do the work | a request over it fails (we have not seen this) |
| Subrequests | 50 per request | YouTube / podcast / oEmbed calls (2–3 each) | that request fails |
| Static assets | free, not counted | the website (HTML, JS, CSS, images) | — |
| Rate-limit bindings | included | `CONNECT_LIMIT` 60 / min, `SEARCH_LIMIT` 10 / min, `ROOM_INFO_LIMIT` 60 / min, `FEEDBACK_LIMIT` 3 / min, `FALLBACK_LIMIT` 1200 / min (per IP hash, `wrangler.jsonc`) | per address only: that address gets 429 |
| Workers Logs (`observability`) | about 200 000 events a day, kept a few days on Free (the privacy policy says ≤ 7 days) | one line per request | logging stops for the day; the site keeps working |

Docs: https://developers.cloudflare.com/workers/platform/limits/ · https://developers.cloudflare.com/workers/platform/pricing/

## Durable Objects (Free plan, SQLite)

| Limit | Free plan | What uses it | When it runs out |
| --- | --- | --- | --- |
| Requests | 100 000 a day | each socket opened, each HTTP-fallback request, each alarm; **incoming WebSocket messages count 20 : 1** (20 messages = 1 request) | objects refuse work until midnight UTC: rooms, games and voice signalling stop |
| Duration | 13 000 GB-s a day | time objects stay awake in memory. WebSocket Hibernation lets an idle room sleep, so an open room costs little between messages | as above |
| Rows read | 5 million a day | every `storage.get` | as above |
| Rows written | 100 000 a day | every `storage.put` / `delete`: room state on play / pause / seek, chat, queue, pins, stats, game moves, the upload / feedback / usage counters | as above. **This is the limit we would hit first in a busy evening** (a room writes on most user actions) |
| Stored data | 5 GB for the account | see "Storage per room" | new writes fail (rooms can't save state, images, chat) until old rooms are deleted |

Objects we run (12 classes): `Room` (one per room), `Game`, `Draw`, `Quiz`, `Poker`, `Sea` (one per table), `TvLink`
(also one throw-away object per `/api/version` call, used by the deploy's wait and the uptime check), `FeedbackGate`,
`MoveLink`, `YoutubeUsage`, `IpKeys`, `UploadGate` (one each).

Docs: https://developers.cloudflare.com/durable-objects/platform/pricing/ · https://developers.cloudflare.com/durable-objects/platform/limits/

### Storage per room (from the code)
- A room deletes itself 24 h after it empties; a saved room 30 days after (`room.ts` alarm). Game tables 24 h.
- Largest parts of one room: custom emojis ≤ `MAX_STICKERS` 24 × `STICKER_MAX_CHARS` 280 000 characters ≈ 6.7 MB,
  chat images ≤ `MAX_CHAT_IMAGES` 12 × 280 000 ≈ 3.4 MB. Everything else (chat 50 messages, queue, 50 pins, 30 played
  items, 30 saved positions, recaps, ≤ 500 admitted browsers, ≤ 200 member ids, ≤ 50 TV tokens) stays well under
  200 kB. **A full room is ≈ 10 MB; a typical room without images ≈ 10–50 kB.**
- Images are the only way to fill the 5 GB: the daily upload budget lets at most `UPLOAD_BYTES_PER_DAY` 400 MB in a
  day for everyone (`UPLOAD_BYTES_PER_IP_DAY` 20 MB per address, `UploadGate`). One-time rooms drop theirs after a day,
  so the risk is **saved rooms full of images**: in the worst case 400 MB a day kept 30 days ≈ 12 GB, more than the
  free 5 GB. Realistic use is far below; watch "Stored data" on the dashboard. If it climbs: lower
  `UPLOAD_BYTES_PER_DAY`, or keep images in saved rooms for fewer days.

## YouTube Data API v3

| Limit | Value | Our guard |
| --- | --- | --- |
| Daily quota | 10 000 units, resets at midnight Pacific time | we spend at most `DAILY_UNIT_BUDGET` 9000 a day, one address at most `IP_DAILY_UNITS` 2000 (`yt-usage.ts`, the `YoutubeUsage` object) |
| A search (link box, Shorts search, a Discover page, "More like this" by title) | 101 units | answers cached 24 h per words + language; Discover pools shared per day |
| A channel page / "More like this" by channel | 3–4 units | cached per day |
| Titles (oEmbed) | free, not counted in the quota | counted by us only for the quota form |

When it runs out: search, Discover and the Shorts feed answer `quota` ("Today's YouTube searches are used up…"); pasted
YouTube links still play. A higher quota needs Google's API compliance audit (ROADMAP §4, the owner).

**Reading today's usage:** `curl -H "X-Usage-Token: <USAGE_TOKEN>" https://screen-with-me.swm-server.workers.dev/api/youtube/usage`
(the owner's secret; 90 days of counts per day and kind, units included). Google's own view: Google Cloud console →
APIs & Services → YouTube Data API v3 → Quotas.

## GitHub (public repository, free)

| Limit | Value | What uses it | When it runs out |
| --- | --- | --- | --- |
| Actions minutes | free for standard runners on a public repository | CI on every PR, deploy + live e2e on main, the uptime check every 30 min (≈ 1 min each, 48 a day) | — |
| Concurrent jobs | 20 on the free plan | PR runs of several sessions at once | jobs queue, nothing fails |
| Scheduled workflows | GitHub turns a schedule off after 60 days without any activity in the repository | the uptime check | it stops checking; any push turns it back on (GitHub also e-mails a warning) |
| `GITHUB_TOKEN` API calls | 1000 an hour per repository | the uptime check's issue calls (≤ 3 a run), the tag job | — |
| Feedback issues | our own cap: `FEEDBACK_PER_DAY` 50 a day, 3 per address an hour | "Send feedback" (a fine-grained token, private repository) | the form says "try again later" |

## Today's usage

This session can't read Cloudflare's or Google's dashboards (no account token here; that is on purpose). What we know:
- **Room and game objects:** a few rooms a day (the owner and testers), far below every Durable Object limit; each
  deploy's live e2e opens ≈ 40 test rooms (deleted after a day).
- **YouTube:** the e2e search check spends ≈ 101 units per deploy (cached when the words repeat); the owner reads the
  real numbers with the usage call above.
- **GitHub Actions:** free (public repository).
- **Uptime check:** 48 runs a day, each ≤ 2 page loads, 2 `/api/version` calls and 2 room joins (only on a retry);
  it always joins the same one-time room `uptime-check` with the same browser id, so it keeps one small room alive and
  stays far below every per-address limit (`CONNECT_LIMIT` and `ROOM_INFO_LIMIT` are 60 a minute).

To see Cloudflare's numbers: dash.cloudflare.com → Workers & Pages → `screen-with-me` → Metrics (requests, errors,
CPU) and → Durable Objects (requests, duration, rows, stored data); Account → Billing → Billable usage shows the day's
totals against the free plan.

## If we grow

- **Workers Paid** (about 5 $ a month, the owner) raises everything above by orders of magnitude: 10 million requests
  a month included, Durable Objects 1 million requests and 5 GB-month included, then pay as you go. There is **no
  spending cap**, so set the usage notifications below first.
- Load test with many rooms before a launch push (ROADMAP §6 "Capacity and cost").

## Alerts the owner can turn on (no code)

1. **Cloudflare usage notifications:** dash.cloudflare.com → Notifications → Add → "Usage-based billing" (or "Workers
   usage" / "Durable Objects usage" where offered) → pick the product and a threshold (e.g. 80 % of the free daily
   requests) → e-mail. Free.
2. **Cloudflare health:** Notifications → "Workers: error rate" (if offered on Free) for a spike in 5xx answers.
3. **Google Cloud budget / quota alert:** console.cloud.google.com → Monitoring → Alerting → a policy on "YouTube Data
   API quota usage" above 80 %, or simply check the Quotas page weekly.
4. **GitHub:** watch the repository (Watch → Custom → Issues) so the `outage` issue from the uptime check reaches the
   owner's e-mail / phone.
