# Short-video research: random YouTube Shorts, Instagram Reels, TikTok

Research for the owner, 30 Oct 2026. No feature code changed. Visual version with mock-ups:
https://claude.ai/artifact/9WCUYzbs1o1XQdzSwhBSsy

**Method and limits.** Web research (official docs found through search; sources at the end). The cloud sandbox
cannot reach `tiktok.com`, `instagram.com`, `developers.google.com` or `developers.tiktok.com`, and the YouTube API
key is a repo secret, so no live proof of concept was possible. Facts marked *(verify)* come from memory of the
official docs and must be checked against the live page before building. Nothing was logged into; no piracy sites.

## Summary

| Question | Possible? | Cost / limits | Legal risk | Effort | Recommendation |
|---|---|---|---|---|---|
| 1. Random / popular YouTube Shorts feed | **Yes** | 1 unit (chart) or 101 units (search) per page, shared daily pool keeps it ≈ 5–15 % of the quota | Low (label it as our pick, keep YouTube attribution) | S–M (1–2 days) | **Build it** (daily pool + category chips + "more like this") |
| 2. Instagram Reels scrolled together (extension) | Partly (one reel at a time; the personal feed can't be shared) | Each person needs their own Instagram login | **Medium–high** (Meta terms on automated access; history of acting against extensions) | L + high upkeep | **Not now.** Owner tests the existing film-page path with one public reel link |
| 3. TikTok | **Yes, via the official Embed Player** (links only, no discovery feed) | No quota; oEmbed for titles; no rate change | Low (official embed) | M (2–3 days) | **Build it after Q1**: TikTok links play in the Shorts view next to YouTube Shorts |

Separate finding worth the owner's attention (YouTube API audit, ROADMAP §4): YouTube's *Required Minimum
Functionality* forbids overlays "in front of any part of a YouTube embedded player". Today the Shorts view puts our
transparent click catcher (`#fs-catcher`, "one remote") and flying emojis over the YouTube frame. Review this before
the compliance audit (e.g. emojis rise *beside* the video, the catcher only over our own bar area).

---

## 1. A random / popular YouTube Shorts feed (no topic needed)

### What the YouTube Data API v3 offers

| Source | Call | Quota | Shorts yield | Notes |
|---|---|---|---|---|
| Popular chart | `videos.list?chart=mostPopular&regionCode=TR&videoCategoryId=…&maxResults=50&part=contentDetails,player&maxWidth=100` | **1 unit per page** (50 items; ≈ 200 items max per chart *(verify)*) | **Low, unknown** | Since 21 Jul 2025 the chart no longer mirrors "Trending"; it draws from the Trending Music, Movies and Gaming charts (Trending page retired). No Shorts filter. We'd keep only upright + ≤ 180 s items. Must be measured. |
| Popular search | `search.list?type=video&videoDuration=short&order=viewCount&publishedAfter=<7 days ago>&regionCode=TR&relevanceLanguage=tr&q=%23shorts&videoEmbeddable=true&safeSearch=moderate` + `videos.list` for shape/duration | **101 units per page** (≈ 1 % of the day) | High (same path as today's ♾ feed) | `q` is optional, but `#shorts` improves the yield. `videoDuration=short` = under 4 min, so the shape check stays. `order` can be `viewCount`, `date`, `rating`, `relevance`. |
| By category | the search above + `videoCategoryId` (e.g. 10 Music, 17 Sports, 20 Gaming, 23 Comedy, 24 Entertainment, 15 Pets & Animals, 26 Howto & Style, 28 Science & Tech) | 101 per page; `videoCategories.list?regionCode=TR` is 1 unit (cache it) | High | Category ids differ slightly per region; ask once and cache. |
| "More like this" (same channel) | `channels.list?id=<channel>&part=contentDetails` → uploads playlist → `playlistItems.list` (+ `videos.list` for shape) | **1 + 1 + 1 units** | Medium (channel mixes long videos and Shorts) | Cheapest "more like this". The `UUSH…` "Shorts-only playlist" trick is **undocumented**: don't rely on it. |
| "More like this" (similar) | search with words from the current video's title (+ its channel or category) | 101 | Medium | `relatedToVideoId` was **removed on 7 Aug 2023**; there is no official "related videos" any more. |
| Curated playlists | `playlistItems.list?playlistId=…` | 1 unit per 50 | As curated | E.g. playlists the owner curates for launch themes. Cheapest of all. |

How we tell Shorts apart (already in the code, 0.9.91.12): `videos.list` `player` with `maxWidth` → embed taller than
wide **and** ≤ 180 s (Shorts can be up to 3 min since Oct 2024). There is no official `isShort` field.

### Staying within the quota: one shared daily pool

- The Worker builds **pools** keyed by `(kind, region/language, category, day)` and stores them in the Workers cache
  (or KV / a Durable Object) for 24 h. Every room draws from the same pool, so a feed costs one search **per pool per
  day**, not per room.
- Example budget: 2 languages (TR, EN) × 6 chips (Popular + 5 categories) × 2 pages = 24 searches ≈ **2 400 units
  (24 %)**, or 1 page each ≈ 12 %. Chart-based pools cost ~0. Topic search (today's ♾) keeps the rest.
- Refill lazily (the first person who opens a chip that day pays) or with a Cron Trigger shortly after YouTube's
  quota reset (midnight Pacific).
- "Random" = each room shuffles its own draw from the pool and skips what it has seen (`seen` already exists in
  `shorts-feed.ts`).
- Data retention: API data may be kept at most **30 days** (we keep 24 h); never store statistics beyond that.

### What the terms allow (YouTube API Services Terms + Developer Policies)

- **No scraping** of youtube.com (no reading the Shorts feed page, no unofficial "related" endpoints).
- Search results must not be **modified or replaced**; we may present our own pool as "Popüler Shorts" (our pick),
  not as "YouTube's trending". Don't invent our own popularity metrics from API data (derived metrics are forbidden).
- Play only through the official embedded player, unmodified; **no overlays in front of the player** (see the summary
  finding).
- Show YouTube attribution and link to YouTube's terms / Google privacy (already in our privacy policy).
- A higher quota needs Google's API compliance audit (already on ROADMAP, owner).

### Recommendation

Build **"🎲 Keşfet"** in the Shorts bar: chips *Popüler · Müzik · Oyun · Komedi · Hayvanlar · Spor* + today's topic
box + a **"Bunun gibi"** button on the stage (same channel first, title words second). Server: one `/api/youtube/pool`
endpoint, cached per day. First step: measure how many Shorts `chart=mostPopular` returns for TR / US (one call,
1 unit) — if it is decent, the "Popüler" chip is free.

## 2. Instagram Reels scrolled together through the extension

### Official embed

- Meta's oEmbed (`/instagram_oembed`, needs a Meta app + token, 1 000 calls/h) or the plain
  `instagram.com/reel/<code>/embed/` iframe with `embed.js`.
- The embed has **no player API**: no play / pause / seek / events through `postMessage`. It cannot be synced.
- Many reels don't even play inline: private or age-restricted accounts, reels with copyrighted music, and NSFW ones
  show "View on Instagram". → **The site alone cannot do Reels.**

### The extension approach (like film pages)

What would work technically:
- Each person is logged into **their own** Instagram account in their tab (logged-out viewers hit a login wall within
  seconds/minutes on the feed; single reel links are less blocked).
- A single reel page `instagram.com/reel/<code>/` is just a `page` item for us today: the extension opens it in
  everyone's tab, finds the `<video>` (MSE / blob source, but the element is a normal `<video>`), and the sync engine
  works on it. **This may already work with no new code** — needs a test in the owner's Chrome.

What does not:
- **"Who scrolls, everyone follows" can't use Instagram's own feed:** the Reels feed is personal (each account gets a
  different next reel). We would have to read the leader's current reel id (URL `/reels/<code>/` changes on scroll)
  and navigate everyone else's tab to the same `/reel/<code>/` page. That is a site-specific adapter that watches
  Instagram's SPA, and every follower's tab is navigated automatically.
- Instagram's DOM uses obfuscated class names and changes often → high upkeep; autoplay is muted until a click.

Legal / policy:
- Instagram's Terms: no accessing or collecting information "in unauthorized ways" / by automated means without
  permission; Meta's Automated Data Collection Terms (Oct 2024) forbid bots and scrapers without written permission.
  Sending the leader's reel id to our server and auto-navigating others is not scraping, but it is close enough that
  Meta could object. Meta has acted against extensions before (e.g. "Unfollow Everything", 2021).
- Chrome Web Store: our single purpose ("sync any HTML5 video") still fits, but reading which reel someone watches is
  browsing activity → must be a prominent user-facing feature + privacy policy update.
- Meta itself is pushing Reels watch parties on TV (Instagram for TV, Aug 2026), so a third-party competitor on top of
  Instagram's site is a likely target.

### Recommendation

**Not now.** Ask the owner to test one public reel link through today's film-page path (paste
`instagram.com/reel/…` in the room). If it syncs, mention nothing in public texts until it's reliable. A "follow the
leader" Reels adapter belongs to the after-1.0 "big services" research (one site at a time, terms first).

## 3. TikTok

### Official Embed Player v1 (good news)

- `https://www.tiktok.com/player/v1/<videoId>?…` in an iframe (`allow="autoplay; fullscreen"`).
- Query parameters *(verify the full list)*: `controls`, `progress_bar`, `play_button`, `volume_control`,
  `fullscreen_button`, `timestamp`, `loop` (default 0), `autoplay` (default 0), `music_info`, `description`, `rel`,
  `native_context_menu`, `closed_caption`.
- **postMessage API**: messages `{ "x-tiktok-player": true, type, value }`. Host → player: `play`, `pause`,
  `seekTo` (seconds; confirmed), `mute`, `unMute` *(verify names)*. Player → host: `onPlayerReady`, `onStateChange`
  (init / ended / playing / paused / buffering), `onCurrentTime` (seconds, duration), `onMute`, `onError` (e.g.
  autoplay blocked, 3002).
- That is enough for a `PlayerAdapter` like our YouTube one: play / pause / seek / position / ended. No playback
  rate → the room stays at 1× while a TikTok plays. Commands sent before the player is ready can be dropped (wait for
  `onPlayerReady`, video.js notes it builds lazily).
- **oEmbed** `https://www.tiktok.com/oembed?url=<video link>` (no key): title, author, thumbnail → queue titles.

### What is not possible

- **No discovery feed:** TikTok's public APIs don't offer "popular" or "random" videos (Display API = a logged-in
  user's own videos; Research API = approved academics only). Scraping is forbidden by TikTok's terms. → TikTok in
  our room = **links people paste** (one or many; `parseMediaList` already handles lists).
- Short links (`vm.tiktok.com/…`) need a redirect resolve (oEmbed may accept them *(verify)*).
- Region availability (TikTok is banned in some countries) → the item shows an error card there.

### Extension overlay on tiktok.com

Possible like Instagram (the For You feed is personal, the same follow-the-link problem, logged-out web shows
login prompts), but **not needed**: the official embed already works on our site without the extension.

### Work needed

`media.ts` link detection (`tiktok.com/@user/video/<id>`, `/v/`, `vm.`), `{kind:'tiktok', id}` (optional new media
kind: old clients must ignore it → check `PROTOCOL_VERSION` rules), `players/tiktok.ts` adapter, Worker oEmbed proxy
(cached), CSP: `frame-src https://www.tiktok.com`, thumbnail hosts, tests with a fake player + the owner's real-browser
check (the cloud cannot reach TikTok). Keep TikTok's own controls and branding visible (like YouTube's bar).

### Recommendation

**Yes, after Q1.** "Paste TikTok links → they play in the living room next to YouTube Shorts, everyone scrolls
together." Low legal risk (official embed, no API key), medium effort.

## Design ideas for the Shorts view

1. **Keşfet chips** in the ♾ feed panel: 🔥 Popüler · 🎵 Müzik · 🎮 Oyun · 😂 Komedi · 🐾 Hayvanlar · ⚽ Spor, then the
   topic box. One tap starts an endless feed from the shared pool.
2. **"✨ Bunun gibi"** next to 🔁 on the stage: more from this channel, then similar titles. A small note shows the
   source ("Ali'nin seçtiği kanaldan").
3. **Mixed "Sıradaki" strip** under the seats on wide screens: next 5 thumbnails with a platform badge (YouTube /
   TikTok), tap to vote ▲.
4. **TikTok in the living room**: the same seats and bubbles; the TikTok frame keeps its own bar; a tiny "TikTok"
   source label above the video, not on it.
(Reels "follow the leader" card was mocked in the report page only to show why it is not recommended now.)

## Sources

- YouTube Data API — videos.list: https://developers.google.com/youtube/v3/docs/videos/list
- YouTube Data API revision history (mostPopular change 21 Jul 2025; relatedToVideoId removed 7 Aug 2023):
  https://developers.google.com/youtube/data/revision_history · https://developers.google.com/youtube/v3/revision_history
- Quota costs: https://developers.google.com/youtube/v3/determine_quota_cost
- Search guide (order values, cost): https://outlierkit.com/resources/youtube-search-api/
- YouTube API Services Developer Policies: https://developers.google.com/youtube/terms/developer-policies
- Developer Policies guide: https://developers.google.com/youtube/terms/developer-policies-guide
- Required Minimum Functionality (no overlays): https://developers.google.com/youtube/terms/required-minimum-functionality
- 30-day storage, enforcement example: https://teratail.com/questions/261315
- Trending page removal: https://www.documentarytube.com/blog/youtubes-trending-page-and-trending-now-are-gone-heres-what-replaced-them-in/
- Instagram oEmbed: https://developers.facebook.com/docs/instagram/oembed ·
  https://developers.facebook.com/documentation/instagram-platform/oembed
- Reels embeds falling back to "View on Instagram": https://community.shopify.com/t/instagram-reel-embed-issue/398544 ·
  https://spotlightwp.com/instagram-reels-are-now-playable-in-spotlight/
- Instagram scraping / automated access: https://help.instagram.com/740480200552298 ·
  https://opentermsarchive.org/en/memos/instagram-blocks-data-retrieval-and-clarifies-what-information-it-retrieves/
- Logged-out Reels viewing (anecdotal): https://www.lilachbullock.com/watch-instagram-reels-without-account/
- Instagram TV Reels watch parties: https://www.tubefilter.com/2026/08/27/instagram-for-tv-reels-connected-app-ad/amp/
- TikTok Embed Player: https://developers.tiktok.com/doc/embed-player · https://developers.tiktok.com/docs/en/embed-player
- TikTok player, lazy build note: https://videojs.org/docs/framework/html/reference/components/tiktok-video
- TikTok /player/v1 in practice: https://github.com/murilo1008/clipfyai-league-2.0/pull/2
- TikTok terms on scraping (summary): https://conductatlas.com/platform/tiktok/tiktok-terms-of-service/prohibition-on-scraping-and-data-extraction/
- Chrome Web Store program policies: https://developer.chrome.com/docs/webstore/program-policies/policies
- Teleparty supported services: https://dev.teleparty.com/
