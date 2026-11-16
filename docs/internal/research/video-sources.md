# Which extra sources are worth adding without the extension (Research, 16 Nov 2026)

_The owner's question (via the Planner, Nov 2026): which video / music sources should the site play **without the extension**,
counting only ones people really use. Builds on `more-players.md` (2 Nov) and `competitors/no-extension-sources.md`
(15 Nov), which hold the API details; this file adds usage numbers, a ranking and the Dailymotion and Vimeo-search
answers. Method: web search excerpts; the providers' developer sites (developers.dailymotion.com and others) do not
resolve from the cloud session, so API facts are search excerpts. **WEAK** = secondary / SEO source, **GUESS** =
inference. Not legal advice. Usage numbers are third-party estimates (Similarweb / Semrush / trackers), not the
companies' own, unless marked "official"._

Effort is compared with `apps/web/src/players/vimeo.ts` (195 lines, postMessage adapter + link parsing + CSP + a
fake-player harness): **S** = smaller or reuses an existing kind, **M** = about the same, **L** = clearly more.

## Summary

| Source | Usage today (source, date) | Synced play with no extension? | Effort | Recommendation |
|---|---|---|---|---|
| **YouTube Music** | YouTube Music + Premium **>150 M subscribers** (official, Alphabet Q3 2026) [M1]; YouTube ~2.7 B monthly users [M1] | **Yes, already**: `music.youtube.com/watch?v=` plays in our YouTube player; playlists / albums don't | **S** | **Add now** (card CR2: `list=` → queue) |
| **Dailymotion** | ~595 M visits / month globally (Semrush via a secondary site, Jul 2026, **WEAK**) [D1]; **#1 entertainment site in Turkey, 22.6 M visits / month, ahead of netflix.com 19.1 M** (Semrush, Apr 2026) [D2] | Yes: official Player (Web SDK / iframe) with play, pause, state / time, events; **needs a Player ID from a free Dailymotion account** [D3][D4]; web seek to verify | **M** | **Next, after YouTube Music** (owner opens the account) |
| **Vimeo search** (playback exists) | vimeo.com ~51–57 M visits / month (Similarweb Nov 2025; Toolmage May 2026) [V1][V2] | Playback yes (card P1); search already built (card SRC1), off until `VIMEO_TOKEN` | **none** (code done) | **Set the token now** (zero code); low value, no more work on it |
| **SoundCloud** | No official MAU; "~76 M monthly listeners" is repeated but stale (2017 roots) [S1][S2] | Yes: Widget API, no key, play / pause / seek / position / finish; no rate → 1× | **S–M** | **Later** (after Dailymotion) |
| **HLS `.m3u8` links** | No usage numbers (a format, not a site); asked for by power users | Yes: our own `<video>` (`html5` kind) + lazy `hls.js` | **S** | **Later** (cheap, small audience) |
| **Twitch** | ~240 M MAU (estimate, **WEAK**) and ~2.1 M average concurrent viewers (TwitchTracker-based, 2026) [T1]; 1.54 B hours watched Aug 2026 [T2] | Partly: official embed + Player API (play / pause / seek / time / ended), no rate; live = no seek; 400 × 300 minimum; `parent=` host | **M** | **Later**; live-only first, VODs after |
| **Kick** | 606 M hours watched Aug 2026, >1 M average viewers Sep 2026 (Streams Charts) [K1][K2]; ~11 % of live streaming hours [K1] | **Live only**, iframe with no JS API; VODs only via unofficial APIs (ToS risk) [K3] | **S** (live view only) | **Never for VODs**; live view only if Twitch live is built |

**Order:** YouTube Music → Dailymotion → SoundCloud → HLS → Twitch live (+ Kick live in the same "live channel" kind).
This moves **Dailymotion up** from 4th (`more-players.md`) and "not covered" (`no-extension-sources.md`): it is the most
visited entertainment site in Turkey, our second language market, and the only candidate whose audience is
mostly **video people watch together** (series, shows, sport clips) rather than music or live streams.

## YouTube Music — add now (S)
- **Usage:** YouTube Music and Premium passed 150 M subscribers (official, Alphabet Q3 2026 earnings; the split is not
  published) [M1]. Free users are on top of that.
- **Sync without the extension:** already works for single tracks (`media.ts` accepts the host and `v=`). Missing:
  `playlist?list=…` and album (`OLAK5uy_…` list) links → queue through the Data API we already call
  (`playlistItems.list`, 1 unit per 50 items).
- **Terms:** the YouTube rules we already follow (RMF: nothing over the player; no audio-only / background mode).
  Some label tracks have embedding off (error 150) → skip with the existing toast.
- **Do:** card CR2 as written; it needs no owner decision.

## Dailymotion — next (M), needs one owner step
- **Usage:** ~556–595 M visits / month globally, May–Jul 2026 (Semrush, via a secondary article, **WEAK**) [D1];
  Dailymotion's ad arm claims 400 M monthly users (vendor) [D1]. **Turkey: the most visited entertainment website,
  22.6 M visits / month, ahead of Netflix (19.1 M) and MSN (16.2 M)** (Semrush top list, Apr 2026) [D2]. Much of the
  Turkish traffic is TV series and shows (**GUESS**; some uploads are unlicensed — public texts must not say "watch
  series on Dailymotion", `CLAUDE.md` §6; we only say "Dailymotion links work").
- **Sync without the extension:** the official player is `geo.dailymotion.com/player/<PLAYER_ID>.js` /
  `…/<PLAYER_ID>.html?video=<id>` (Web SDK: `createPlayer`, `getState` → `videoTime`, play / pause, events) [D3][D4].
  **A Player ID is mandatory** for the current embed and is created in a free Dailymotion account (Partner HQ)
  [D3][D5]. Web `seek` and playback speed are documented for the mobile SDKs and need checking on the web SDK
  (`more-players.md`, **WEAK**); the Web SDK is a script from `geo.dailymotion.com`, so unlike Vimeo we would likely
  load Dailymotion's own script (a CSP `script-src` host) unless the iframe's postMessage protocol is enough.
- **Terms / ads:** Dailymotion shows its own ads inside the player (pre-rolls per viewer) → the engine's everyone-ready
  wait covers it, as with Twitch. No ban on synced playback found (**GUESS**: none, the player is meant for third-party
  sites). Keep its branding; the Player ID ties the embed to the owner's account, so its settings (autoplay, ads
  allowed on our pages) are his. Search: the public Data API `api.dailymotion.com/videos?search=` answers without a key
  (`more-players.md`, **WEAK**) — a later search tile is cheap.
- **Effort M:** adapter like `vimeo.ts` (or a thin wrapper around their SDK), link parsing (`dailymotion.com/video/<id>`,
  `dai.ly/<id>`), CSP (`geo.dailymotion.com`, `www.dailymotion.com`), privacy-policy line in both languages, fake-player
  harness, the owner's real check (computer + phone). The Player ID is not a secret (it is in every embed URL) → it can
  live in `site.config.json`.

## Vimeo search — set the token, nothing more
- **Usage:** vimeo.com ~51 M visits / month (Similarweb, Nov–Dec 2025) [V1], ~57 M (May 2026, Similarweb-based) [V2].
  Vimeo is mostly a hosting tool for businesses and creators; people rarely browse it for something to watch
  together (**GUESS**). Turkey: not in Semrush's Turkish entertainment top list [D2].
- **State:** playback (P1) and search (SRC1, `apps/server/src/vimeo.ts`) are built; search is off until the owner
  creates the `VIMEO_TOKEN` (an unauthenticated app token, scope `public`). Calls count against the app per minute
  (plan-based, e.g. ~25 / min on a free account, **WEAK**) and return 429 when over [V3][V4]; our shared
  `SEARCH_LIMIT` and cache already cap this.
- **Worth it?** Yes, only because the code exists and the token is a 5-minute free step; the value is small. Do not
  spend more build time on Vimeo.

## SoundCloud — later (S–M)
- **Usage:** SoundCloud does not publish MAU; the common "76 M monthly listeners" figure is old and unsourced [S1][S2];
  an app tracker estimates ~12 M app MAU (**WEAK**) [S2]. Strong with DJ mixes and new artists; listening together
  happens, but our rooms are video-first.
- **Sync:** Widget API with no key (`play`, `pause`, `seekTo`, `getPosition`, `FINISH`, `PLAY_PROGRESS`), no rate → 1×;
  links only, because the search API is now limited to paid Artist Pro accounts (`no-extension-sources.md`).
- **Do later:** card CR3's first step, after Dailymotion.

## HLS links, Twitch, Kick — briefly
- **HLS (`.m3u8`):** no site behind it, so no usage numbers; it serves people with their own streams. Our `<video>`
  + lazy `hls.js` (Apache-2.0, a notice line), full sync incl. rate. **S, later.** Never use it to play Twitch or Kick
  streams outside their players (both forbid it) [K3].
- **Twitch:** big (~2.1 M concurrent viewers on average, 2026 [T1]) but live-first: everyone already sits at the same
  live edge, and Twitch has its own chat, so a "watch together" room adds little for live; VODs / clips sync via the
  Player API with seek quirks and a 400 × 300 minimum that does not fit portrait phones. **M, later**, live view first.
- **Kick:** growing fast (record >1 M average viewers, Sep 2026 [K2]) but **no player API and no VOD embed**; the live
  iframe could share the Twitch "live channel" kind. **Never for VODs** (ToS: no access by unauthorised means [K3]).

## Sources
- [M1] Music Business Worldwide, "YouTube Music and Premium surpass 150 million subscribers globally" —
  https://www.musicbusinessworldwide.com/youtube-music-and-premium-surpass-150-million-subscribers-globally/ ; Digital
  Music News, Q1 2026 — https://www.digitalmusicnews.com/2026/04/30/youtube-music-subscribers-q1-2026/
- [D1] SQ Magazine, Dailymotion statistics (cites Semrush, May–Jul 2026; vendor 400 M users) —
  https://sqmagazine.co.uk/dailymotion-statistics/
- [D2] Semrush, Top websites, Turkey, Entertainment (Apr 2026) — https://www.semrush.com/website/top/turkey/entertainment/
- [D3] Dailymotion, Migrate to Player Embed / new embed endpoint — https://developers.dailymotion.com/guides/migrate-player-embed ,
  https://developers.dailymotion.com/migration-guide-new-embed-endpoint
- [D4] Dailymotion, iFrame (Web) and Player Library Script — https://developers.dailymotion.com/docs/iframe-web ,
  https://developers.dailymotion.com/docs/player-library-script
- [D5] Dailymotion, Create a player — https://developers.dailymotion.com/docs/create-a-player
- [V1] Similarweb, vimeo.com (via competitor pages, Nov–Dec 2025) — https://www.similarweb.com/website/streamable.com/competitors
- [V2] Toolmage, Vimeo (May 2026 traffic) — https://www.toolmage.com/en/tool/vimeo/
- [V3] Vimeo Help, API best practices — https://help.vimeo.com/hc/en-us/articles/12427851678097-API-Best-Practices
- [V4] Packagist `omnishow/vimeo` README (rate limits by plan, **WEAK**) — https://packagist.org/packages/omnishow/vimeo
- [S1] Axis Intelligence, SoundCloud statistics — https://axis-intelligence.com/soundcloud-statistics/
- [S2] Headphones Addict, SoundCloud users; AppGoblin — https://headphonesaddict.com/soundcloud-users/ ,
  https://appgoblin.info/apps/336353151
- [T1] Socially In, Twitch statistics 2026 — https://sociallyin.com/twitch-statistics/ ; StreamScheme —
  https://www.streamscheme.com/twitch-statistics/
- [T2] Streamer Guide, Kick vs Twitch hours watched — https://streamer.guide/guides/kick-vs-twitch-viewership
- [K1] Streams Charts, Kick August 2026 recap — https://streamscharts.com/news/kick-august-2026-recap
- [K2] Streams Charts, Kick viewership September 2026 — https://streamscharts.com/news/kick-viewership-september-2026
- [K3] `competitors/no-extension-sources.md` [K1]–[K4] (Kick help and terms), [T5] (Twitch developer terms)
