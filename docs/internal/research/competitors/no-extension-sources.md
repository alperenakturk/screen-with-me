# Sources without the extension: YouTube, Twitch, Kick, SoundCloud, YouTube Music, "any HTML5 site"

_Field research, 15 Nov 2026 (Research session). Method: web search excerpts; the providers' developer sites
(dev.twitch.tv, developers.soundcloud.com, help.kick.com, developers.google.com) could not be opened from the cloud
session, so facts are search excerpts of those pages plus forums. **WEAK** = single / vendor / SEO source, **GUESS** =
inference. Builds on `../more-players.md` (2 Nov 2026) and `../competitors-how.md` §4 (14 Nov 2026); the trigger is
SyncUp's "works without the extension" list (`syncup.md`). Not legal advice._

**What our sync engine needs** (unchanged from `more-players.md`): play, pause, seek, the current time, ideally a rate
(else lock 1× via `maxRateFor`), an "ended" signal, a player that plays after one tap on phones. A new kind = a
`PlayerAdapter` in `apps/web/src/players/`, link parsing in `packages/shared/src/media.ts`, `cleanMedia` in
`protocol.ts` (optional new kind, no protocol bump), CSP hosts in `apps/web/public/_headers` (today `frame-src`
allows `www.youtube-nocookie.com`, `www.tiktok.com`, `player.vimeo.com`; `media-src *`), a privacy-policy line (each
third-party player sets its own cookies), a fake-player harness (the cloud cannot reach these hosts) and the owner's
real-browser check. Vimeo (card P1) is the model: it talks the provider's postMessage protocol directly, no
third-party script.

## Changes to `more-players.md` (2 Nov 2026)
| Row | 2 Nov said | Now (15 Nov) |
|---|---|---|
| Vimeo, podcasts | proposed | **built** (`players/vimeo.ts`, podcasts via iTunes Search → html5) |
| SoundCloud | "REST API reportedly not open to new apps (weak)" | **Changed:** SoundCloud opened self-service app registration "in May" (year not stated; an API Evangelist post of 19 Jun 2026 covers it, so likely May 2026, **GUESS**) but **only for Artist Pro subscribers** (paid) [S3][S4]. The widget itself needs no key, so "links only" still stands. Widget API surface **confirmed** [S1]. |
| Twitch | `parent=` must name our domain; min ≈ 400 × 300; "best after the domain move" | Min size **confirmed: 400 × 300**, and size + visibility gate autoplay [T1]. **Changed:** no need to wait for the own domain: `parent` is simply the page's hostname, which works on `*.workers.dev` today and changes with no code if read from `location.hostname` (or `site.config.json`). Seek quirks **confirmed** (seek works only while playing; ignored right after `ready`) [T3]. **New:** Twitch's developer terms require its embeddable player for Twitch video, so no playing Twitch's HLS in our own `<video>` [T5]. |
| Kick | iframe only, no JS API, live only | **Confirmed**: the official help documents only `autoplay`, `muted`, `allowfullscreen` [K1]; no official VOD / clip embed found [K2]. **New:** Kick's terms bar scraping and "any technology or means other than those provided or authorized" [K4], so VODs via its unofficial API in our player are a ToS risk. |
| YouTube Music | not covered | **New:** already works for `music.youtube.com/watch?v=` links (`media.ts` lists the host) — see below. |

## YouTube (incl. Shorts) — have it
- **API:** the official IFrame Player API (already `players/youtube.ts`): `playVideo`, `pauseVideo`, `seekTo`,
  `getCurrentTime`, `setPlaybackRate` (Sidelit allows up to 2×), `onStateChange` incl. ENDED. Shorts are the same video
  ids in the same player (our Shorts view).
- **Terms that bind us** (we are a YouTube API client): Required Minimum Functionality (nothing over the player), no
  background play, no separating audio from video [Y1]. Error 150 / 101 = the owner disabled embedding; error 153 = the
  request carried no Referer / client identification (matters for a future app web view) [Y2].
- **CSP:** have it. **Phone:** first play needs a tap on iOS (have it).
- **For Sidelit:** nothing new. SyncUp's YouTube is the same embed (**GUESS**).

## YouTube Music links — mostly have it
- **Mapping:** a `music.youtube.com/watch?v=<id>` link carries an ordinary 11-character YouTube video id, and
  `packages/shared/src/media.ts` already accepts the host (`YOUTUBE_HOSTS`) and reads `v=`, so it plays in our
  YouTube player today. "Art tracks" (auto-generated "<artist> - Topic" uploads) are normal video ids too (**GUESS**
  from how the ids look; not re-verified).
- **What does not work today:** `music.youtube.com/playlist?list=…` (playlists, albums as `OLAK5uy_…` lists) and
  `/browse/…` album pages: `parseMedia` returns `null` for any other YouTube path. A playlist → queue feature would use
  the Data API `playlistItems.list` (1 unit per 50 items; we already call it for the ♾ feed in
  `apps/server/src/youtube.ts`). `browse/MPREb_…` album ids are YouTube Music internal ids with no public API (**GUESS**);
  only the `list=` form is mappable.
- **Terms / music:** some label music videos and art tracks have embedding disabled → error 150 in the embed; the room
  should skip to the next item with a toast (check that the existing error path does this for every item). Content ID
  claims do not change the embed beyond that. **Do not** build an "audio only / hide the video" listen mode: the YouTube
  policies forbid separating audio and background play, and RMF forbids covering the player [Y1].
- **Phone:** same as YouTube; music keeps stopping when the phone locks (that is YouTube Premium's background play, not
  ours to offer).
- **For Sidelit:** effort **S**: help / extension-page copy "YouTube Music links work", plus optional
  `list=` → queue (cap at our 30-link paste limit `MEDIA_LIST_MAX`, or a few pages). Risk low. No domain dependence.

## Twitch (live, VODs, clips)
- **Embed:** `Twitch.Player` / `Twitch.Embed` from `https://embed.twitch.tv/embed/v1.js` (or the bare iframe
  `https://player.twitch.tv/?channel=…|video=v…&parent=<host>`), clips at `https://clips.twitch.tv/embed?clip=<slug>&parent=<host>`.
  `parent` is required and must list every domain the embed sits on; HTTPS only (self-signed / localhost fail) [T1][T2].
- **Control (Player API):** `play`, `pause`, `seek(seconds)`, `getCurrentTime`, `getDuration`, `setChannel`,
  `setVideo`, `setMuted`, `setVolume`; events `READY`, `PLAY`, `PLAYING`, `PAUSE`, `ENDED`, `ONLINE`, `OFFLINE` (names
  from the docs and community wrappers, not re-verified) [T1][T3]. **No playback rate** → lock 1×. Seek works only
  while playing and is ignored right after `READY`; VOD seeks snap to segments (~up to 4 s, weak) [T3].
- **Clips:** no JS API found for the clip iframe (third-party guides, **WEAK**) → "start together", no drift control.
- **Live:** nothing to seek; everyone watches the live edge. Viewers differ by a few seconds of buffer (**GUESS**);
  a "same moment" nudge could compare `getCurrentTime` but live latency is Twitch's.
- **Terms:** minimum **400 × 300** px, and the player must be visible for autoplay [T1]; one site owner reports Twitch
  blocking their domain after breaching the minimum size (anecdotal) [T4]. Twitch's developer terms require its
  embeddable player (no other player for Twitch video) [T5]. Mature-content channels show a click-through per viewer
  [T6]. Twitch ads (pre-rolls) play inside the embed and pause one viewer → the engine's everyone-ready wait covers it.
  Autoplay rules in the developer agreement were updated 1 Nov 2023 (wording not re-verified) [T7].
- **CSP:** `frame-src https://player.twitch.tv https://clips.twitch.tv` (+ `https://www.twitch.tv` if we show Twitch
  chat like SyncUp); `script-src https://embed.twitch.tv` only if we load `v1.js` instead of speaking the iframe's
  postMessage protocol directly (**GUESS** that the Vimeo-style direct approach works: `v1.js` itself talks to the
  iframe by postMessage).
- **Phone:** works in mobile browsers; **portrait phones are ~360–430 CSS px wide**, so a 400-px-wide player does not
  fit on the narrowest phones → rotate to sideways or accept no autoplay (risk).
- **Domain:** works on `screen-with-me.swm-server.workers.dev` now with `parent=location.hostname`; when the own
  domain arrives, both hosts work automatically. Inside the extension shell the ancestor chain includes the film page and
  `chrome-extension://`, which `parent` cannot list → Twitch plays only in the room view on our site (**GUESS**, fine).
- **For Sidelit:** effort **M** (adapter for live + VOD, link parsing for `twitch.tv/<channel>`, `/videos/<id>`,
  `clips.twitch.tv/<slug>` and `twitch.tv/<channel>/clip/<slug>`, size rules, fake-player harness). Risks: min size on
  phones, seek quirks, ads per viewer, mature gate. Value: SyncUp lists Twitch first after YouTube.

## Kick
- **Embed:** `https://player.kick.com/<channel>` iframe with `autoplay`, `muted`, `allowfullscreen` (defaults: autoplay
  off, fullscreen on) [K1]. **No JS API, no postMessage events documented** [K1][K2]. VOD (`kick.com/video/<uuid>`) and
  clip URLs exist on the site, but no official embed form for them was found [K3].
- **Official public API** (`docs.kick.com`, OAuth app) covers channels / livestreams metadata; a public videos endpoint
  was still "planned" in a KickDevDocs issue; playback (`.m3u8`) URLs come only from reverse-engineered internal APIs
  (**WEAK**) [K2].
- **Terms:** Kick's ToS (as summarised by a compliance tracker) bar scraping, robots, and access "through any technology
  or means other than those provided or authorized by the Service" [K4] → playing Kick VODs from unofficial `.m3u8`
  URLs in our own player is a ToS risk; SyncUp may do it via yt-dlp (**GUESS**).
- **CSP:** `frame-src https://player.kick.com`. **Phone:** the iframe plays in mobile browsers (muted autoplay).
- **For Sidelit:** **live only, effort S**: a "live channel" kind (Kick, and the same kind for Twitch live) where the
  room just shows the official player, with no sync beyond "same channel" and a "Live" badge instead of a seek bar. VODs:
  **no** until Kick offers an embed with a control API. Value low–medium.

## SoundCloud
- **Widget:** iframe `https://w.soundcloud.com/player/?url=<track or playlist URL>&…` — takes the normal
  `soundcloud.com/<artist>/<track>` link, **no API key**. **Widget API** (`https://w.soundcloud.com/player/api.js`,
  `SC.Widget(iframe)`, postMessage): `play`, `pause`, `toggle`, `seekTo(ms)`, `setVolume(0–100)`, `getPosition`,
  `getDuration`, `getCurrentSound`, `skip(index)` for playlists; events `READY`, `PLAY`, `PAUSE`, `FINISH`, `SEEK`,
  `PLAY_PROGRESS` (fires every few hundred ms), `LOAD_PROGRESS` [S1][S2]. **No rate** → lock 1×.
- **Quirk:** a `seekTo` before the first play can be ignored; play → pause → seek primes it (community report, **WEAK**)
  [S2]. Getters are async (callbacks).
- **Terms / API:** the widget shows SoundCloud's own branding and attribution (keep it). REST API (search) needs an app,
  now self-service but **Artist Pro only** [S3][S4] → links only, no search. Some tracks are not embeddable or
  geo-blocked (the widget shows an error; **GUESS**: no error event, detect by `READY` + `getCurrentSound` empty).
- **CSP:** `frame-src https://w.soundcloud.com`; `script-src https://w.soundcloud.com` only if we load `api.js`
  (else speak its postMessage protocol directly like Vimeo; **GUESS** it is a simple `{method, value}` JSON protocol).
  Artwork in the queue: `img-src https://i1.sndcdn.com` (oEmbed / widget artwork host, **GUESS**).
- **Phone:** plays after one tap; iOS volume is the hardware's (like Vimeo).
- **For Sidelit:** effort **S–M** (adapter close to `vimeo.ts`, link parsing incl. `on.soundcloud.com` short links,
  which need the server to follow the redirect like TikTok's `vm.` links). Risk low. No domain dependence.

## "Any HTML5 site" without the extension: the honest options
SyncUp's "1000+ sites" is a **server-side yt-dlp extractor** (its own pages, see `syncup.md`). On a website a page from
another site cannot be framed and read (most sites send `X-Frame-Options` / `frame-ancestors`, and the browser hides a
cross-origin frame's video from us), so without an extension there are only these routes:

| Option | How | Fits Sidelit's rules? | Effort |
|---|---|---|---|
| **A. Direct media files** (have it) | a link ending in `.mp4 .webm .ogv .ogg .mov .m4v` plays in our `html5` kind (`VIDEO_FILE` in `media.ts`; CSP `media-src *`) | **Yes**: the viewer's browser fetches the file from the site that published it; nothing passes through us | — |
| **A+. More file types** | add `.m3u8` (HLS: native in Safari, hls.js elsewhere, Apache-2.0, a licence line + a lazy chunk) and audio files `.mp3 .m4a .aac .opus .flac` (if not already handled by the podcast path) | **Yes**, same as A; HLS from other origins needs that host's CORS for hls.js (Safari native does not) | S–M |
| **B. Open metadata discovery** | the Worker fetches the pasted page's HTML once (capped, like `readCapped`) and reads the publisher's own `og:video` / `twitter:player:stream` / JSON-LD `contentUrl`; if that is a direct file, play it as A | **Probably**: reads public metadata the site publishes for link previews; no cipher, no proxy of video. Needs SSRF guards (no private IPs), a size cap, a rate limit, a security look; some sites' ToS bar automated access (**GUESS** low–medium risk). Hit rate unknown (**GUESS** low: big sites rarely publish a playable file) | M |
| **C. Server-side extraction** (yt-dlp style) | a server runs yt-dlp per link, returns stream URLs; many are IP-signed, so it must also **proxy** the bytes | **No.** Workers cannot run yt-dlp (needs a Python server); proxying = re-broadcasting the film through us (rule: no re-broadcasting) and bandwidth costs; legal: OLG Hamburg (Nov 2024, final) held youtube-dl circumvents YouTube's "rolling cipher", hosting it = liability [X1]; YouTube's policies forbid separating / downloading streams [Y1]; Kick's ToS bar it [K4]; breaks weekly when sites change; Chrome Web Store "neutral tool" story weakens | L |
| **D. Page proxy** | serve the third-party page through our domain so we can read its `<video>` | **No.** Copies the site under our origin (cookies, logins, scripts with our origin's rights = security hole), violates most ToS, CSP chaos | L |
| **E. Virtual browser** (Hyperbeam / Kosmi style) | a cloud browser opens the page; everyone sees its video stream | **No.** Re-broadcasting by definition; paid by the minute; DRM shows black | L |
| **F. The extension** (have it) | the site's own player on each viewer's computer | **Yes**, the rule-fitting answer on computers; phones have no extension | — |

So on phones "any HTML5 site" honestly means **A / A+ (files) and the official embeds** (YouTube, TikTok, Vimeo, and
the ones above). B is an optional experiment; C, D, E are out.

## Ranked recommendation for the Proposed card "More players without the extension"
1. **YouTube Music: say it works + playlist / album `list=` links → queue.** S, low risk, no new host, reuses
   `playlistItems` and the queue. Lane B (link parsing, server route) + lane A (help text).
2. **SoundCloud links** (official widget, 1× lock, no key). S–M, low risk; CSP `w.soundcloud.com`. Lane B.
3. **More direct file types** (A+): `.m3u8` via a lazy hls.js chunk (licence line in `third-party-notices.txt`) and audio
   files in the `html5` kind. S–M, low risk, helps "any site that publishes a file" on phones. Lane B.
4. **Twitch VODs + live (and clips as "start together")** through the official embed, `parent=location.hostname`
   (works on workers.dev today; no wait for the own domain). M; risks: 400 × 300 minimum on portrait phones, seek
   quirks, per-viewer ads, mature gate. Lane B. Twitch chat beside it: later, optional.
5. **A "live channel" kind** shared by Twitch live and **Kick live** (Kick: iframe only, no API, no VODs). S once 4
   exists. Lane B.
6. **Open metadata discovery (B)** in the Worker. M, needs a security review first (SSRF, caps); only if 1–5 ship and
   people paste page links on phones. Lane B + Security.
7. Still from `more-players.md`: Dailymotion (needs a Player ID), web radio (CSP review). Unchanged.
8. **Never:** server-side extraction / yt-dlp, page proxy, virtual browser (re-broadcasting, legal, cost), and any
   audio-only mode over YouTube.
Each built source gets its Test Lab hook / fake-player harness (like `tiktok/run.cjs`), its CSP hosts, a privacy-policy
line in both languages, and appears in the "Do I need the extension?" help table only once it really works.

## What could not be checked
Official pages of dev.twitch.tv (event names, the exact Developer Agreement wording), developers.soundcloud.com (the
API terms on attribution / commercial use, error events), help.kick.com and docs.kick.com, YouTube's policy pages (read
through search excerpts only). Whether YouTube Music album `browse` ids map to a public playlist id. Twitch's current
autoplay rules. Every "GUESS" above should be checked against the official reference before building.

## Sources
- [Y1] [Complying with YouTube's Developer Policies](https://developers.google.com/youtube/terms/developer-policies-guide) and [YouTube API Services – Developer Policies](https://developers.google.com/youtube/terms/developer-policies) — seen 15 Nov 2026
- [Y2] [YouTube Embedded Players and Player Parameters](https://developers.google.com/youtube/player_parameters); [Fix: YouTube embed Error 152 / 153](https://startdebugging.net/2026/09/fix-youtube-embed-video-unavailable-error-152-153-in-flutter-youtube-player-iframe/) — Sep 2026 (**WEAK**)
- [T1] [Twitch: Embedding Video and Clips](https://dev.twitch.tv/docs/embed/video-and-clips/) — seen 15 Nov 2026
- [T2] [Twitch: Embedding Everything](https://dev.twitch.tv/docs/embed/everything) — seen 15 Nov 2026
- [T3] [Embed player seek works only when the video is playing (Twitch dev forum)](https://discuss.dev.twitch.com/t/embed-player-seek-works-only-when-the-video-is-playing/28757); [Embed player & seek function](https://discuss.dev.twitch.com/t/embed-player-seek-function/5927) — forum (**WEAK**)
- [T4] [Twitch blocks every domain where I embed my channel](https://discuss.dev.twitch.tv/t/twitch-blocks-every-domain-where-i-embed-my-channel/35369) — forum, anecdotal (**WEAK**)
- [T5] [Embedding Clips in Extensions Overlay](https://discuss.dev.twitch.com/t/embedding-clips-in-extensions-overlay/32713) — forum quoting the developer agreement (**WEAK**)
- [T6] [Non-Interactive Embed requires Interaction for channels set to Mature](https://discuss.dev.twitch.tv/t/non-interactive-embed-requires-interaction-for-channels-set-to-mature/10078) — forum
- [T7] [Update Regarding Twitch Video Embed Autoplay Functionality](https://discuss.dev.twitch.com/t/update-regarding-twitch-video-embed-autoplay-functionality/49232) — 2023
- [K1] [Kick help: How to embed your Kick livestream](https://help.kick.com/en/articles/8010826-how-to-embed-your-kick-livestream) — seen 15 Nov 2026
- [K2] [KickEngineering/KickDevDocs issue 125](https://github.com/KickEngineering/KickDevDocs/issues/125); [KICK.com Streaming REST API (unofficial)](https://github.com/mattseabrook/KICK.com-Streaming-REST-API) — seen 15 Nov 2026 (**WEAK**)
- [K3] [Kick VOD download and clip workflow 2026](https://autoclip.dev/blog/kick-vod-download-and-clip-workflow) — 2026 (**WEAK**, URL shapes only)
- [K4] [ConductAtlas: Kick ToS, prohibition on scraping](https://conductatlas.com/platform/kick/kick-terms-of-service/prohibition-on-scraping-service-content/) and [unauthorized content access methods](https://conductatlas.com/platform/kick/kick-terms-of-service/provision/CA-P-061273/prohibition-on-unauthorized-content-access-methods/) — seen 15 Nov 2026 (**WEAK**, third-party summary)
- [S1] [SoundCloud Widget API](https://developers.soundcloud.com/docs/api/html5-widget) — seen 15 Nov 2026
- [S2] [Getting started with the SoundCloud API using JavaScript and the official widget](https://www.desarrollolibre.net/blog/javascript/getting-started-with-the-soundcloud-api-with-javascript); [Simo Ahava: GTM SoundCloud integration](https://simoahava.com/analytics/google-tag-manager-soundcloud-integration) — (**WEAK**)
- [S3] [SoundCloud: Get an API key](https://developers.soundcloud.com/docs/api/register-app); [API Credentials from Your Terminal, and OpenAPI on GitHub](https://developers.soundcloud.com/blog/api-credentials-cli-openapi-github) — seen 15 Nov 2026
- [S4] [API Evangelist: SoundCloud shows what programmatic API onboarding should look like](https://apievangelist.com/2026/06/19/soundcloud-shows-what-programmatic-api-onboarding-should-look-like/) — 19 Jun 2026
- [X1] [TorrentFreak: Court Rejects Appeal of Youtube-dl Hosting Provider Uberspace](https://torrentfreak.com/court-rejects-appeal-of-youtube-dl-hosting-provider-uberspace-241127-1/) — 27 Nov 2024; [heise: OLG Hamburg, Uberspace liable](https://heise.de/-10179284) — Nov 2024
- SyncUp's own claims ("1000+ sites via yt-dlp", 50 extractions a day): see `syncup.md` sources 5, 7, 9.
