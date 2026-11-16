# SyncUp (competitor profile)

_Field research, 15 Nov 2026 (Research session). Method: web search excerpts; the vendor site (syncup.tv), Product
Hunt, AlternativeTo, Firefox Add-ons, dev.to and the app stores were not reachable from the cloud session, so every fact
below comes from search-engine excerpts of those pages. **WEAK** = single / vendor / SEO source, **GUESS** = inference.
Related: overview.md, `no-extension-sources.md` (how each of SyncUp's no-extension sources can be played), and
`../market-and-competitors-2026.md` §2 ("SyncUp … the closest positioning to ours")._

The owner flagged SyncUp as the closest product to Sidelit. It is: a free website with no sign-up for guests, a
companion extension for the big subscription services, and a paste-a-link box that plays many sites without the
extension. The big differences are a paid tier (SyncUp Plus), a 5-person free room cap, store apps on iOS / Android,
and a server-side extractor (yt-dlp) behind its "1000+ sites" claim.

## At a glance
| | |
|---|---|
| What | Website for watching video in sync (rooms with a 6-character code) + a "free browser extension" for DRM services [1][3][8] |
| Platforms | Web (desktop + phone browsers); extension for Chrome, Firefox, Edge, Opera, Brave (some pages also say Safari) [3]; iOS app and Android app [10][11] |
| Services | Without extension: YouTube, Twitch (live + VODs), Kick, SoundCloud, YouTube Music, "1000+ HTML5 sites" (via yt-dlp) [3][5][6]. With extension: Netflix, Disney+, HBO Max, Prime Video, Hulu, Paramount+, Peacock, Crunchyroll, Apple TV+ [3] |
| Talk | Text chat with emoji and floating reactions; voice chat in the room (free: 1 hour a day); **no webcam** [7][9] |
| Games | None found |
| Account | Not needed to create or join a room; "certain features" need an account (Plus, persistence) [12][13] |
| Phone | Native apps (iOS + Android) share rooms with the website; DRM services are desktop-only [3][10][11] |
| Price | Free core. **SyncUp Plus $3.99 / month or $39.99 / year**, 7-day trial; app stores also list a "Movie Night Pass" in-app purchase [5][9][11] |
| Size / ratings | Very small: Product Hunt ~5 followers; Google Play "1K+" downloads, no star rating shown; App Store "not enough ratings"; Firefox add-on no ratings; Chrome listing no rating [1][10][11][14] |
| Status 2026 | Active, solo developer (Roan de Graaf, RDG Labs, Amersfoort, the Netherlands); launched on Product Hunt 10 Feb 2026; Plus launched 17 Apr 2026; extension 1.2.9 in Jul 2026 [1][2][9][10][14] |

## Product and platforms
- **Who makes it.** The site's structured data names the founder "Roan de Graaf"; the iOS app lists developer Roan de
  Graaf with copyright "RDG Labs"; the Google Play listing shows publisher RDG Labs with an address in Amersfoort,
  Netherlands [10][11]. The About page title is "A Free Watch Party App by One Dev" and the site calls its maintainer a
  solo developer who ships often [10]. The Firefox add-on is published under the name "Basishoef" (likely the same
  person's AMO handle, **GUESS**) [14]. The maker also writes on dev.to (Feb 2026: "SyncUp vs Teleparty: Which Watch
  Party Tool Should You Use?", "The complete guide to hosting virtual watch parties in 2026"); those comparisons are
  the maker's own and promotional (**WEAK**) [15].
- **When.** Product Hunt launch 10 Feb 2026; the maker's post says he built it because watching with far-away friends
  "was too much friction" [1]. An earlier version of the Firefox add-on (1.2.8) was live in Feb 2026 [14].
- **Infrastructure.** The "Introducing SyncUp Plus" post (17 Apr 2026) says SyncUp "has run off a single home server
  since day one" and that Plus is there to "fund real infrastructure" [9]. **GUESS:** sync, rooms, voice relay and the
  yt-dlp extractor all ran on that one machine.
- **Apps.** iOS "SyncUp: Watch Party Together" (id 6800900406, age 4+, in-app purchases "SyncUp+" and "Movie Night
  Pass") and Android `tv.syncup.syncup_mobile` (rated Everyone, 1K+ downloads) [10][11]. The package name style
  (`syncup_mobile`) suggests a Flutter app (**GUESS**).
- **Marketing.** A large set of SEO pages: "watch-<service>-together" pages for YouTube, Twitch, Kick, Crunchyroll, HBO
  Max, Prime Video, Apple TV+, Paramount+, Disney+ ("Disney+ GroupWatch Ended in 2023: What Works Now"), plus
  "<competitor>-alternative" pages (Watch2Gether, Teleparty, Rave, Scener, Synctube) and listicles ("Best Watch Party
  Apps 2026: 8 Tested, 4 No Signup") [4][6][16]. It publishes an `llms-full.txt` for AI search engines [5].

## Supported services and how
SyncUp's own extension page and FAQ have a "when do you need the extension?" split [3]:

| Needs the extension (desktop only) | Works without it (web, phone, apps) |
|---|---|
| Netflix, Disney+, HBO Max, Prime Video, Hulu, Paramount+, Peacock, Crunchyroll, Apple TV+ | YouTube, Twitch, Kick, SoundCloud, YouTube Music, "1000+ HTML5 sites" |

- **DRM services: the user's own subscription.** "Every viewer needs their own active subscription"; the extension
  "leaves the video where it is and syncs the player" [3]. Same model as Teleparty and as Sidelit's post-1.0 plan
  (command the site's own player, never bypass DRM). Mobile: "streaming services are desktop-only for now" [3].
- **YouTube / YouTube Music.** **GUESS (strong):** the official YouTube IFrame Player API; a `music.youtube.com/watch?v=`
  link carries a normal YouTube video id, so it plays in the same embed (see `no-extension-sources.md` §YouTube Music).
- **Twitch.** The Twitch page says it handles live streams, VODs and past broadcasts and "displays the Twitch chat
  alongside the stream" [6]. **GUESS (strong):** the official Twitch embed (`Twitch.Player` with `parent=syncup.tv`)
  plus the Twitch chat embed; Twitch's developer terms require its embeddable player for Twitch video [17].
- **Kick.** Listed as "native" with watch-kick-together pages [6]. **GUESS:** live channels through the official
  `player.kick.com` iframe (no control API exists, nothing to sync on a live stream); Kick VODs / clips possibly through
  yt-dlp (yt-dlp has Kick extractors), which would play Kick's HLS files in SyncUp's own player. Not confirmed.
- **SoundCloud.** **GUESS (strong):** the official SoundCloud widget and its Widget API (play / pause / seek /
  position; no key needed for the widget).
- **"1000+ HTML5 sites" without the extension: a server-side extractor.** SyncUp's own pages (search excerpts) say
  "1000+ Supported Websites via yt-dlp": paste a URL from Vimeo, Dailymotion, Twitter / X, Reddit, TikTok, Bilibili
  "and hundreds more" and it "extracts a playable stream automatically" [5][7]. Free users get **50 yt-dlp extractions
  a day**; Plus removes the cap [7][9]. `llms-full.txt` adds a shared playback speed 0.25×–2× and "subtitle tracks
  from external video URLs (including auto-generated captions)" [5], both typical yt-dlp outputs (formats + subtitle
  lists) played in SyncUp's own HTML5 player (**GUESS**).
  - **Proxy or direct?** Not stated anywhere found. **GUESS:** many extracted media URLs are signed for the IP that
    requested them (YouTube's `googlevideo.com` URLs are; many CDNs sign by IP or expiry), so a viewer's browser can
    only play them if SyncUp either proxies the bytes or extracts per viewer. An open-source project with the same
    design (Next.js + FastAPI, yt-dlp resolution, "DASH/HLS proxying with segment prefetch", "1800+ sites") shows the
    usual shape [18]; it is **not** SyncUp's code. With one home server, heavy proxying would be costly, which may
    explain the 50-a-day cap (**GUESS**).
  - **Legal note.** In Germany the Hamburg courts held youtube-dl circumvents YouTube's "rolling cipher" protection
    (LG Hamburg Mar 2023, OLG Hamburg Nov 2024, final) [19]; SyncUp is Dutch. Details in `no-extension-sources.md`.
- **Local files.** "P2P local file sharing (stream files directly from your device)" [1][2] (**GUESS:** WebRTC from the
  host's browser, like Sidelit's screen share but with the file).
- **How sync works.** Vendor claims "real-time sync within 200 ms" and "when anyone plays, pauses, or seeks, all viewers
  update instantly" [2][7] (**WEAK**, vendor only); who may control playback is set by the host [7].

## Room features
- **Chat and voice:** at launch the maker deliberately left chat to Discord / FaceTime / Zoom ("Why SyncUp Doesn't Have
  Built-in Chat or Voice Calls", blog, early 2026) [2][7]. Since then the product added text chat with emoji, floating
  reactions over the video, chat GIFs (Plus) and **HD voice chat in the room** (free 1 hour a day, unlimited with Plus);
  **no webcams** ("just voice, which keeps bandwidth low") [7][9]. The old blog post contradicts the current pages.
- **Roles:** Host, Moderator, Viewer; the host can hand over the host role and decides who controls playback [7].
- **Queue:** shared playlist with a synchronized queue; shared playback speed 0.25×–2×; fullscreen [5].
- **Subtitles:** pulled from the source URL where yt-dlp finds them [5].
- **Room size:** free rooms up to **5 people**; Plus up to **50**, and if *any* member has Plus the whole room gets 50;
  when that member cancels the room returns to 5 after a 1-hour grace period [7][9].
- **Persistence:** free rooms expire after 30 days idle; Plus rooms and playlists persist; Plus adds custom room
  branding, room passwords, "analytics" and larger uploads [9].
- **Join:** a 6-character room code or link [6].
- Not found: games, screen share, cameras, a TikTok / Shorts vertical view, themes.

## Onboarding and accounts
- **Host:** open syncup.tv, create a room (free, "no account required", "about 10 seconds"), paste a link, share the
  code / link [2][6]. For a DRM service, install the extension on desktop.
- **Guest:** open the link (any browser, no app needed) or type the code; for DRM services the guest also needs the
  extension and the subscription [3][10].
- **Accounts:** the privacy policy says SyncUp can be used without an account; the terms say "certain features" need
  one (credentials kept by the user) [12][13]. Plus needs an account (**GUESS**: payment and the room perk are tied to a
  person). Sign-in methods were not found.

## Phone experience
Native apps on iOS and Android with built-in voice and text chat; the apps and the website share the same rooms, and a
room link opens in any phone browser [7][10][11]. Phones get YouTube, Twitch, Kick, SoundCloud, YouTube Music and the
yt-dlp sites; DRM services are desktop-only [3]. Store listings show no rating yet [10][11].

## Pricing, limits, ads and income
| | Free | SyncUp Plus |
|---|---|---|
| Price | 0 | $3.99 / month or $39.99 / year, 7-day trial [9] |
| Room size | 5 | 50 (room-wide if one member has Plus) [9] |
| Voice | 1 hour / day | unlimited, "HD" [9] |
| yt-dlp extractions | 50 / day | unlimited [7][9] |
| Room retention | expires after 30 days idle | persists [9] |
| Extras | — | branding, room passwords, analytics, GIFs, larger uploads [9] |

App stores also sell a "Movie Night Pass" (price not found; **GUESS:** a one-off Plus-like pass for one evening) [11].
No ads found. Income = subscriptions; the stated reason is moving off a home server [9].

## Privacy
- Google Analytics, only after consent in a cookie banner; analytics cookies kept up to 2 years; essential cookies for
  authentication, session and security [12]. Search metadata dated the policy pages ~9–10 months old (**WEAK**).
- Early listings: "minimal data collection, no chat logs, no microphone access required" [2]; the "no microphone" line
  predates voice chat.
- iOS privacy label lists usage data linked to the user's identity (developer-supplied) [11].
- Account deletion, data retention for chat and voice routing (P2P or relayed) were not found.

## Store ratings and recurring complaints
- Product Hunt: launched 10 Feb 2026, ~5 followers; review pages had no review text in excerpts [1][2].
- AlternativeTo: "Free, Proprietary", no comments or reviews [2].
- Firefox Add-ons: 1.2.9 (mid-Jul 2026), permission "access your data for all websites", developer says it collects no
  data; no ratings [14].
- Chrome Web Store: listing "SyncUp" (id `mhhgdnnlijgebfpbmdddlnambhkfgmkf`, tagline "Watch videos together in sync
  with friends"), no rating shown [14b].
- Google Play 1K+ downloads, no rating; App Store not enough ratings [10][11].
- Reddit: no threads found by search. **No recurring complaints could be found**: the product is too small for reviews.

## Recent changes (2025–2026)
- 10 Feb 2026: Product Hunt launch, sync only, chat left to Discord [1].
- Early 2026: extension for Chrome / Firefox / Edge (later Opera, Brave) with nine DRM services [3][14].
- By spring 2026: text chat, reactions, voice; roles [7].
- 17 Apr 2026: SyncUp Plus ($3.99), 5-person free cap, voice hour, extraction cap [9].
- 2026: iOS and Android apps; Firefox add-on 1.2.9 (Jul 2026) [10][11][14].

## Against Sidelit
- **Where they are ahead:**
  - Twitch (live + VODs with Twitch chat beside), Kick, SoundCloud and many more sites play **without the extension**,
    on phones too; Sidelit's site plays YouTube (incl. YouTube Music watch links), Shorts, TikTok, Vimeo, podcasts and
    direct files.
  - Extension already in the Chrome, Firefox and Edge stores, with nine DRM services by each viewer's subscription
    (Sidelit: unpacked install until 1.0, DRM after 1.0, no Firefox extension).
  - Native iOS / Android apps; shared playback speed and subtitles from the source; P2P local file playback.
  - SEO: per-service and per-competitor landing pages, `llms-full.txt`.
- **Where Sidelit is ahead:**
  - No cap and no paywall: 50 people per room for everyone (SyncUp free: 5), no voice time limit (SyncUp free: 1 h a
    day), no account for anything, no analytics in Sidelit's privacy policy (SyncUp: Google Analytics with consent).
  - Cameras (4) and screen share; SyncUp has voice only.
  - Games (Classics, Sea Battle, Draw & Guess, Quiz, Last Heart, side games); Shorts / TikTok "scroll together" view;
    themes, drawn avatars, pins, votes, saved rooms, session recap.
  - The extension covers *any* HTML5 video in the page's own player, iframes included, without extracting or proxying
    anything; SyncUp's 1000+ sites depend on yt-dlp (legal and breakage risk, see `no-extension-sources.md`).
  - Sync engine with everyone-ready wait and "3-2-1 together"; HTTP fallback when WebSockets are blocked.

## Ideas worth taking
1. **Twitch without the extension (live + VODs, Twitch chat beside it).** SyncUp proves the demand. Official embed,
   `parent` = our hostname. Effort M. Lane B. Details and limits: `no-extension-sources.md`.
2. **SoundCloud links** through the official widget, 1× lock. Effort S–M. Lane B.
3. **Say "YouTube Music links work"** (they already do for `watch?v=` links) and accept YouTube / YouTube Music
   playlist and album links → the queue. Effort S. Lane B (+ lane A copy).
4. **A "Do I need the extension?" table** on the extension page and in help: services that play on the site vs. on the
   film page. Effort S. Lane A. Neutral wording, no service named unless it really works (CLAUDE.md §6).
5. **Shared playback speed for the room** (0.25×–2× where the player allows; Sidelit already has `maxRateFor`). Check
   whether the room UI exposes it to everyone. Effort S. Lane A.
6. **Local file together (P2P)**: the host picks a file, it streams to the room over WebRTC. Effort L. After 1.0; legal
   wording needed (only your own files).
7. **Per-service "watch X together" landing pages + `llms.txt`**: matches growth card G2. Effort S each. After 1.0
   (G2). Only services that really work.
8. Not to copy: the 5-person cap, the voice-hour cap, Plus perks (conflict: no paywall), Google Analytics (conflict:
   privacy stance), **server-side yt-dlp extraction / proxying** (conflict: no re-broadcasting, legal risk).

## What could not be checked
- Any page of syncup.tv, Product Hunt, AlternativeTo, AMO, Chrome Web Store, App Store, Google Play or dev.to directly
  (blocked hosts); all facts are search excerpts and may be outdated or paraphrased by the search engine.
- Whether extracted streams are proxied; how Kick VODs play; the Movie Night Pass price; account sign-in methods;
  Chrome Web Store user count; Reddit opinions (no threads found); voice routing (P2P or server).
- The "200 ms" sync claim (vendor only).

## Sources
1. [SyncUp - Watch together (Product Hunt launches)](https://www.producthunt.com/products/syncup-watch-together/launches) — launched 10 Feb 2026; seen 15 Nov 2026
2. [SyncUp - Watch together (Product Hunt reviews)](https://www.producthunt.com/products/syncup-watch-together/reviews) and [AlternativeTo: SyncUp](https://alternativeto.net/software/syncup/about) — seen 15 Nov 2026 (**WEAK**, vendor text)
3. [Watch Netflix, Disney+ & HBO Max Together (Free Extension)](https://syncup.tv/extension) and [FAQ](https://syncup.tv/faq) — seen 15 Nov 2026 (vendor)
4. [Watch Together Online: Every Platform SyncUp Supports (2026)](https://syncup.tv/watch-together) — seen 15 Nov 2026 (vendor)
5. [syncup.tv/llms-full.txt](https://syncup.tv/llms-full.txt) and [syncup.tv home](https://syncup.tv/) — seen 15 Nov 2026 (vendor)
6. [Watch Twitch Together: Synced Streams & VODs](https://syncup.tv/watch-twitch-together), [Watch Kick Together](https://syncup.tv/watch-kick-together), [Watch YouTube Together](https://syncup.tv/watch-youtube-together) — seen 15 Nov 2026 (vendor)
7. [SyncUp vs Watch2Gether](https://syncup.tv/blog/syncup-vs-watch2gether), [Watch HBO Max Together](https://syncup.tv/watch-hbo-max-together), [Why SyncUp Doesn't Have Built-in Chat or Voice Calls](https://syncup.tv/blog/why-syncup-no-built-in-chat) — seen 15 Nov 2026 (vendor)
8. [Synctube alternative](https://syncup.tv/synctube-alternative) — seen 15 Nov 2026 (vendor)
9. [SyncUp Plus](https://syncup.tv/plus), [blog](https://syncup.tv/blog) ("Introducing SyncUp Plus", 17 Apr 2026), [Hyperbeam Alternatives: 8 Watch Party Tools Compared](https://blog.send.win/hyperbeam-alternatives-watch-party-tools-compared/) — seen 15 Nov 2026 (**WEAK** third party for the grace period)
10. [About SyncUp: A Free Watch Party App by One Dev](https://syncup.tv/about) and [SyncUp: Watch Party (Google Play)](https://play.google.com/store/apps/details?id=tv.syncup.syncup_mobile) — seen 15 Nov 2026
11. [SyncUp: Watch Party Together (App Store)](https://apps.apple.com/us/app/syncup-watch-party-together/id6800900406) — seen 15 Nov 2026
12. [Privacy Policy](https://syncup.tv/privacy), [Cookie Policy](https://syncup.tv/cookies) — seen 15 Nov 2026
13. [Terms](https://syncup.tv/terms) — seen 15 Nov 2026
14. [SyncUp (Firefox Add-ons)](https://addons.mozilla.org/en-GB/firefox/addon/syncup/) — 1.2.9, Jul 2026; seen 15 Nov 2026. 14b. [SyncUp (Chrome Web Store)](https://chromewebstore.google.com/detail/syncup/mhhgdnnlijgebfpbmdddlnambhkfgmkf) — seen 15 Nov 2026
15. [SyncUp vs Teleparty (dev.to, maker)](https://dev.to/roan_degraaf_9434e8e98ca/syncup-vs-teleparty-which-watch-party-tool-should-you-use-3959), [The complete guide to hosting virtual watch parties in 2026 (dev.to, maker)](https://dev.to/roan_degraaf_9434e8e98ca/the-complete-guide-to-hosting-virtual-watch-parties-in-2026-18ni) — Feb 2026 (**WEAK**, promotional)
16. [Best Watch Party Apps 2026](https://syncup.tv/blog/best-watch-party-apps-2026), [Teleparty alternative](https://syncup.tv/teleparty-alternative), [Disney+ GroupWatch Ended in 2023](https://syncup.tv/watch-disney-plus-together) — seen 15 Nov 2026 (vendor)
17. [Embedding Clips in Extensions Overlay (Twitch dev forum, cites the embeddable-player clause)](https://discuss.dev.twitch.com/t/embedding-clips-in-extensions-overlay/32713) — seen 15 Nov 2026 (**WEAK**)
18. [rennerdo30/watch-together (GitHub)](https://github.com/rennerdo30/watch-together) — seen 15 Nov 2026 (unrelated project, same design)
19. [TorrentFreak: Court Rejects Appeal of Youtube-dl Hosting Provider Uberspace](https://torrentfreak.com/court-rejects-appeal-of-youtube-dl-hosting-provider-uberspace-241127-1/) — 27 Nov 2024; [heise: OLG Hamburg](https://heise.de/-10179284) — Nov 2024
