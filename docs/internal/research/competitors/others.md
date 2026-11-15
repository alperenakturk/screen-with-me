# Other competitors, Nov 2026 (compact profiles)

_Field research, 15 Nov 2026 (Research session). Method: web search excerpts; vendor sites, stores, Reddit and
Trustpilot were not reachable from the cloud session. **WEAK** = single / vendor / SEO source, **GUESS** = inference.
Related: overview.md, `watch2gether.md`, `../market-and-competitors-2026.md`, `../competitors-how.md`,
`../newcomers-help-shorts.md` §4, `../rakip-analizi.md`. Teleparty, Kosmi, Rave, Hyperbeam, Scener and SyncUp have their own profiles in this
folder (`teleparty.md`, `kosmi.md`, `rave.md`, `hyperbeam.md`, `scener.md`, `syncup.md`) and are not repeated here
beyond a short pointer._

## Ranking by relevance to Sidelit
"Relevance" = how likely a Sidelit user would otherwise pick it, how close the product is, and how much we can learn.

| # | Product | Why it matters to Sidelit (one line) | Status Nov 2026 |
|---|---|---|---|
| 1 | **Discord Watch Together / Activities** | Where young friend groups already sit with voice on; the default "just watch YouTube together" | active; Discord teen-by-default + age checks from Mar 2026 |
| 2 | **GroupTube** | Nearly our pitch: free, no login, YouTube + voice / video + **games** + **phone apps** | active, v1.10 "Apps & Games" Feb 2026 |
| 3 | **SyncUp** | Free, no sign-up, "1000+ sites" + extension for Netflix / Disney+; fights for the same search words | launched Feb 2026 |
| 4 | **TandemParty** | The only other "scroll Shorts / TikTok together" product | active (vendor pages) |
| 5 | **Apple SharePlay** | Zero-setup for iPhone couples on FaceTime; DRM apps that opted in | active (iOS 26, visionOS 26) |
| 6 | **TikTok Shared Feed / Instagram Blend** | The platforms' own answer to "watch short videos with a friend" (not live) | TikTok Jan 2026; Blend Apr 2025, simpler Apr 2026 |
| 7 | **TwoSeven** | Any-site extension + video chat, the older version of our extension idea | listed, ext. v3.0.21 Sep 2025 |
| 8 | **Synclify** | Open-source any-site extension with overlay, reactions, chat: a technical twin | alpha, v0.6.2 Oct 2026 |
| 9 | **Hearo** | Mobile-first watch-together apps with ads; shows the phone app demand | active |
| 10 | **WatchParty.me** | Open-source rooms + paid virtual browser; the "VBrowser" answer to DRM | updated Nov 2025 |
| 11 | **Syncplay** | Best-known sync logic (ready state, readiness override) for local files | v1.7.6 Aug 2026 |
| 12 | **OpenTogetherTube / CyTube** | Free open-source rooms; CyTube = community channels with moderation | maintained, small |
| 13 | **Google Meet live sharing / YouTube Watch With / YouTube on Quest** | Google's own co-watch is narrow; "Watch With" is creator reactions, not friends | active, narrow |
| 14 | **Plex Watch Together** | A big co-watch feature cut from new apps; its users are looking | removed on most new apps since Feb 2025 |
| 15 | **Bigscreen (VR)** | Social cinema in VR; a different place, not a direct rival | quiet |
| 16 | **Turkish / European small tools** (WatchBuddy, Cowa) and **2026 newcomers** (Cliqroom, SyncFlix, SyncCouch, WEVER party, Couch, Vemos) | The field keeps filling with small tools; none is large | various |
| — | **Metastream** | Dead on Chrome (Manifest V2); its users need a new home | dead extension, web app only |

## 1. Discord Watch Together / Activities
- **What:** an Activity inside a Discord voice channel or call: YouTube's embedded player, synced for everyone [1][2].
- **Platforms:** Discord desktop, browser and mobile apps [1]. **Services:** YouTube only; no YouTube sign-in, so ads
  play even for YouTube Premium users [2][3].
- **Limits:** playback 180 min in a group / 30 min alone (Discord support, via `../competitors-how.md`); "up to 25
  viewers" and "needs a boosted server" appear only in third-party guides (WEAK) [2].
- **Price / account:** free; Discord account required; other Activities partly Nitro [3]. **Size:** > 200 M monthly
  users (market doc); no Watch Together figure.
- **2025–2026:** no change to Watch Together itself found [3]. Discord announced **"teen-by-default" settings for all
  accounts worldwide from early March 2026**, with face-scan or ID age checks for full access [4][5]; how many users
  left is not known.
- **Why it matters:** it is the default for gamers and Discord groups and has the voice SFU we lack. Its gaps are ours
  to fill: anything that is not YouTube, no ads, no account, and (after Mar 2026) no age check for a simple watch.
- **Idea worth taking:** a "**Watch on Sidelit**" link that drops cleanly into a Discord chat (rich preview, one click
  to the room, room name in the preview) and a help line "use it next to your Discord call". Effort S; lane A / Design.
- **Sources:** [1][2][3][4][5].

## 2. GroupTube (group.tube)
- **What:** free YouTube watch-together site with integrated voice and video calls; search via the official YouTube
  API [6][7]. **Platforms:** web, **iOS app** ("GroupTube – Meet, Watch, Play", 18+, iOS 14+) and Android app [8][9];
  Chrome extension ~3 K users, 4.3★ [10].
- **Services:** YouTube only; Twitch, Spotify and Apple Music "coming soon" [7]. **Games:** release 1.10 "Apps &
  Games" (21 Feb 2026), "Game & Movie Night" marketing; which games is not known [11].
- **Account:** none needed; optional accounts on the alpha site (name, image, group membership) [12].
- **Price:** free (no paid tier found). **Size:** claims 15,000+ / 25,000+ groups (vendor, WEAK) [6][12].
- **Status:** active, ships often; publishes "Watch2Gether alternative" / "Teleparty alternative" SEO pages [13].
- **Why it matters:** the closest to Sidelit's site + phone pitch (free, no login, voice, games, phone) and it already
  has store apps. Where we are ahead: any-site extension, Shorts / TikTok, server-time sync, table games now.
- **Idea worth taking:** **groups as a lightweight "home"** (a saved room that friends return to, shown as the group's
  name on the home page) and **version notes as public pages** (`/version/1.4`) that also feed SEO. Effort S–M;
  lane A / Design. (No accounts: our saved rooms already do the "group" part.)
- **Sources:** [6]–[13].

## 3. SyncUp (syncup.tv) (full profile: `syncup.md`)
- **What:** web rooms for YouTube, Twitch, Kick and "1000+ sites"; a free extension (Chrome, Firefox, Edge) adds
  Netflix and Disney+ with each person's own subscription [14][15][16].
- **Talk:** **no built-in voice**; it tells users to keep Discord / FaceTime / Zoom open; "no chat logs, no microphone
  access" [16]. **Account:** none. **Price:** free [14][16]. **Size:** small (5 Product Hunt followers when indexed)
  [16]. **Launched:** Product Hunt 10 Feb 2026 [14].
- **Marketing:** a blog of "SyncUp vs Teleparty / Watch2Gether" and "best watch party apps 2026" posts; self-reported
  "200 ms" sync accuracy (WEAK) [17][18].
- **Why it matters:** same promise as ours ("free, no sign-up, many sites") and it competes for the same search words.
  Where we are ahead: voice / cams / games / Shorts; overlay inside iframes. Where they are ahead: Kick / Twitch and
  per-service adapters for DRM sites today.
- **Idea worth taking:** **publish a measured sync number** ("people stay within X ms") from our own sync test, with
  the method, instead of an unproven claim. Effort S; lane A (Test Lab already measures drift).
- **Sources:** [14]–[18].

## 4. TandemParty
- **What:** host installs an extension on a computer and scrolls the real YouTube Shorts / TikTok feed; the clip
  changes for everyone; friends join from a link on any device without installing (vendor, WEAK) [19].
- **Platforms:** host on desktop Chrome; guests any browser. **Price / size / account:** not found.
- **Why it matters:** the only direct rival to our Shorts "scroll together" view and TikTok player; it owns SEO pages
  for "watch YouTube Shorts / TikTok together" (`../newcomers-help-shorts.md` §4).
- **Idea worth taking:** **landing pages per use** ("Watch Shorts together", "Watch TikToks together") that open a
  room straight into that view. Effort S; Design / lane A.
- **Sources:** [19].

## 5. Apple SharePlay
- **What:** FaceTime / Messages feature: apps that adopt the GroupActivities API play in sync for everyone on the call
  [20][21]. **Platforms:** iPhone, iPad, Mac, Apple TV, Vision Pro; not watchOS; no Android [21].
- **Services:** Disney+, Paramount+, Twitch, TikTok and others; Netflix and Prime Video absent; YouTube Premium added
  support in 2023 (search excerpts, older coverage) [22][23]. Each person needs their own subscription.
- **Price / account:** free with an Apple ID. **2025–2026:** visionOS 26 adds sharing with nearby people in the same
  room (WWDC 2025); iOS 26 still documents SharePlay; Apple promoted SharePlay apps again (7 Aug 2026) [21][24].
- **Why it matters:** for iPhone-only couples it is "already there". Its gaps: Android friends, Netflix / Prime, the
  web, mixed groups.
- **Idea worth taking:** Apple's design guide asks apps to **keep Picture in Picture working** so people can chat
  while watching; our phone site could keep PiP for direct files / YouTube where allowed. Effort M; lane B.
- **Sources:** [20]–[24].

## 6. TikTok Shared Feed and Instagram Blend
- **TikTok Shared Feed:** announced 8 Dec 2025, live by 15 Jan 2026: two accounts share a daily feed of **15 videos**
  in DMs, picked from both people's activity; plus Shared Collections [25][26][27].
- **Instagram Blend:** since Apr 2025, a shared Reels feed in a 1:1 or group DM, refreshed daily; from Apr 2026 it can
  be started from a suggested post inside a chat (WEAK, one German source) [28][29].
- **Not live sync:** both are "together, at different times" [26]. **Account:** each platform's; free; billions of
  users.
- **Why it matters:** they meet "short videos with my friend" without any third party; Sidelit's edge is watching the
  **same clip at the same moment** with voice and reactions, and across platforms.
- **Idea worth taking:** a small **daily ritual**: "today's pick" shown to a saved room's returning friends (from the
  room's own queue / pins, no algorithm, no account). Effort M; lane A; owner's product call.
- **Sources:** [25]–[29].

## 7. TwoSeven (twoseven.xyz)
- **What:** web rooms + extension; YouTube, Netflix, Prime Video, Crunchyroll, Vimeo, and video found "on many other
  sites"; video and text chat [30][31]. **Account:** sign-in for the extension flow [30].
- **Price:** free with limits + subscriptions (a directory says "$3–87 / month", WEAK) [30]. **Size:** Chrome
  100–200 K users across listings; v3.0.21, 29 Sep 2025 [30]. Earlier doc: 3.3–3.6★.
- **Why it matters:** the closest older product to our extension (any site + video chat). Its blog explains why its
  "screen share" is not a re-broadcast, a trust topic we share [32].
- **Idea worth taking:** a plain **"what our extension can and cannot see" page** like TwoSeven's explainer posts.
  Effort S; Design / lane B (already noted in `../newcomers-help-shorts.md`).
- **Sources:** [30]–[32].

## 8. Synclify
- **What:** Firefox (and GitHub) extension: "watch videos in sync" on any streaming site via a room code; shared
  play / pause / seek, optional shared volume, live chat, emoji reactions, a player overlay with its own controls;
  free, ad-free, GPL-3.0; v0.5.0 (9 Apr 2026) → v0.6.2 (1 Oct 2026) [33][34]. Permissions name an analytics host
  (`eu.i.posthog.com`) despite "no tracking" (GUESS from the listing) [34].
- **Why it matters:** a one-person open-source twin of our extension; shows the idea is now easy to copy, so our edge
  must be the room (voice, games, phone, sync quality).
- **Idea worth taking:** **shared volume as an option** (host can level everyone's volume for a music video). Effort
  S; lane B.
- **Sources:** [33][34].

## 9. Hearo
- **What:** iOS and Android apps for watching together (Quarter Time, LLC); ads + in-app purchases [35][36].
- **Size / ratings:** Android 4.24★ from 11.6 K ratings (Aug 2025); iOS 4.25★ from 3.8 K (aggregator, WEAK) [35].
- **Why it matters:** proof that phone users want an app-shaped experience; ad-funded, so not our model.
- **Idea worth taking:** none new beyond our app-like phone site; keep the PWA install path visible. Effort S; lane A.
- **Sources:** [35][36].

## 10. WatchParty.me
- **What:** open-source (howardchung/watchparty, ~660 GitHub stars) web rooms: YouTube, raw URLs, own files, screen
  share, chat, video chat; **paid "Plus" virtual browser (VBrowser)** up to $5 / month [37][38].
- **Status:** releases through 9 Nov 2025 [37]. **Account:** not needed for basic rooms (GUESS).
- **Why it matters:** the honest version of the cloud-browser idea: it costs money per hour, so it is paid. Confirms
  that a free, ad-free product should not run cloud browsers.
- **Idea worth taking:** **watch a file from your own computer** (each person picks the same file locally, Sidelit
  syncs it; nothing uploaded). Effort M; lane A.
- **Sources:** [37][38].

## 11. Syncplay
- **What:** desktop client (Windows, Linux, BSD, macOS) syncing local players (mpv, VLC, MPC-HC / BE, IINA, memento);
  each person has the file; Apache-2.0; public servers [39].
- **Releases:** 1.7.4 (9 Apr 2025, "readiness override"), 1.7.5 (27 Mar 2026: memento player, manual reconnect,
  macOS 15+), 1.7.6 (4 Aug 2026: M3U8 fixes) [39][40].
- **Why it matters:** the reference for "everyone ready" sync; anime and film clubs use it. Not a rival for casual
  groups.
- **Idea worth taking:** **readiness override**: the host can start even when one person never presses ready (we
  have everyone-ready; check we have a clear host override and a manual "reconnect" button). Effort S; lane A.
- **Sources:** [39][40].

## 12. OpenTogetherTube and CyTube
- **OpenTogetherTube:** AGPL-3.0, self-hostable with Docker; YouTube, Vimeo, direct files; Dailymotion support was
  removed in v0.14.1 ("broken"); ~470 stars (WEAK, undated) [41].
- **CyTube (cytu.be, calzoneman/sync):** Node.js; any number of **channels** with playlists, chat, and admin tools
  (mute, kick, IP ban); YouTube, Vimeo, Dailymotion, SoundCloud, Google Drive; other iframes play but cannot sync [42].
  Used by long-running communities.
- **Why they matter:** free and account-free like us, but plain; communities pick CyTube for its moderation and
  persistent channels.
- **Idea worth taking (CyTube):** **moderator roles** beyond one host (a trusted helper can kick / manage the queue).
  Effort M; lane A. (Protocol change, needs a card.)
- **Sources:** [41][42].

## 13. Google: Meet live sharing, YouTube "Watch With", YouTube on Quest
- **Meet live sharing:** co-watch YouTube in a Meet call; the host needs **YouTube Premium**; not on iOS, not in
  desktop browsers, not on work / school accounts (Google help, undated) [43].
- **YouTube "Watch With":** creators react live over another video; at Made on YouTube (23 Sep 2026) extended from
  livestreams to eligible long-form videos, roll-out "later this year". It is creator commentary, **not** friends
  co-watching [44][45].
- **YouTube on Meta Quest:** co-watch beta since 13 Nov 2024, up to 8 people as avatars, mutual followers only, 2D
  only [46].
- **Why it matters:** YouTube has no general "watch with friends" on web or phone in 2026; the gap Sidelit fills on
  YouTube stays open. Watch With may teach viewers the phrase "watch with".
- **Idea worth taking:** none to copy; keep YouTube's rules (nothing over the player) as YouTube's own features grow.
- **Sources:** [43]–[46].

## 14. Plex Watch Together
- **What:** synced viewing of Plex libraries and Plex's free catalogue. Since Feb 2025 it is **not in the new Plex
  apps on most devices**; Tizen TVs reportedly got it back; complaint threads run to Sep 2026; an r/selfhosted thread
  passed 1,700 upvotes (reported Oct 2026) [47][48][49].
- **Why it matters:** home-media users lost a feature; some will look for a browser tool that syncs a file or a page.
  The community points to third-party Plex clients (Plezy) and Jellyfin SyncPlay [47].
- **Idea worth taking:** none new; the "watch a local file" idea (§10) serves them.
- **Sources:** [47]–[49].

## 15. Bigscreen (VR)
- **What:** free social VR cinema on Quest, PC VR (not PSVR); rooms up to 12; YouTube together with up to 15 on
  Quest; Paramount rentals (old, $4–5); hardware business (Beyond 2, 107 g; VRChat edition Sep 2025) [50][51].
- **Status:** "uncertain future" for the app per a Substack review (WEAK) [52].
- **Why it matters:** low: a different device and crowd.
- **Sources:** [50]–[52].

## 16. Turkish, European and 2026 newcomers
- **WatchBuddy | Watch Together** (iOS, 2026): syncs playback of links users supply; free + $1.99 / month or $19.99 /
  year; copyright "keyiflerolsun" (GUESS: a Turkish developer, from the handle) [53][54]. Too new to rate.
- **Cowa** (cowa.kuhntec.de, GUESS German): web app + extension, privacy policy says minimal data and no ad profiling
  [55]. No size found.
- **No large Turkish product found**; Turkish guides still list Teleparty, W2G, Scener, Kast and Vemos [56].
- **2026 newcomers:** Cliqroom (Product Hunt 9 Feb 2026, built-in voice) [57]; SyncFlix (Android, Mar 2026, local
  files + voice) [58]; SyncCouch (Chrome, Apr 2026) [58]; WEVER party (iOS, updated Jan 2026) [58]; Couch / Couchspace
  (screen-share rooms; Netflix blocks the share) [59]; Vemos (YouTube, no sign-up, no ads, per Product Hunt) [60].
- **Why they matter:** each is tiny, but together they show the "free, no account" space is crowded; Sidelit must win
  on quality, breadth (extension + phone + games) and being found.

## Metastream (dead)
- Chrome extension on Manifest V2, "no longer supported"; Electron app stopped (Widevine licence); the web app
  (`app.getmetastream.com`) remains; forks exist [61][62]. Its users are a natural audience for "Metastream
  alternative" pages (already in the market doc's SEO list).

## What could not be checked
- Any vendor site, store page or forum (blocked); Discord's Mar 2026 roll-out outcome and any Watch Together change;
  GroupTube's games and Play numbers; SyncUp's and TandemParty's sizes; SharePlay's current app list; Plex's official
  plan; real usage of every 2026 newcomer.

## Sources
1. [Discord blog: Activities](https://discord.com/blog/server-activities-games-voice-watch-together) — seen 15 Nov 2026
2. [Wisechecker: Watch Together guide](https://wisechecker.com/discord-watch-together-activity/) — WEAK; [peakbot 2026 guide](https://peakbot.pro/blog/discord-activities-apps-guide-2026) — WEAK
3. [Beebom 2022](https://beebom.com/how-watch-youtube-videos-discord/); [Discord support thread on ads, Aug 2024](https://support.discord.com/hc/en-us/community/posts/25481167604247-Cancelling-Nitro-after-seeing-my-first-ad-in-app)
4. [TechCrunch, 9 Feb 2026](https://techcrunch.com/2026/02/09/discord-to-roll-out-age-verification-next-month-for-full-access-to-its-platform/)
5. [Malwarebytes, Feb 2026](https://www.malwarebytes.com/blog/news/2026/02/discord-will-limit-profiles-to-teen-appropriate-mode-until-you-verify-your-age)
6. [group.tube](https://group.tube) — vendor, seen 15 Nov 2026
7. [GroupTube: watch YouTube together](https://group.tube/watch-youtube-together) — vendor
8. [App Store: GroupTube](https://apps.apple.com/app/id6742074994) — seen 15 Nov 2026
9. [GroupTube 1.4 notes](https://group.tube/version/1.4) — vendor
10. [extscope: GroupTube extension](https://extscope.org/extension/oleimghoinacbieboodiomckfmhccbao) — seen 15 Nov 2026
11. [Product Hunt: GroupTube launches](https://www.producthunt.com/products/grouptube/launches) — 21 Feb 2026
12. [alpha.group.tube](https://alpha.group.tube) — vendor
13. [GroupTube: Teleparty alternative](https://group.tube/teleparty-alternative) — vendor
14. [Product Hunt: SyncUp](https://www.producthunt.com/products/syncup-watch-together/launches) — 10 Feb 2026
15. [AlternativeTo: SyncUp](https://alternativeto.net/software/syncup/about/) — seen 15 Nov 2026
16. [Product Hunt: SyncUp post](https://www.producthunt.com/posts/syncup-watch-together) — Feb 2026
17. [SyncUp blog: best apps 2026](https://syncup.tv/blog/best-watch-party-apps-2026) — vendor, WEAK
18. [DEV: SyncUp vs Teleparty](https://dev.to/roan_degraaf_9434e8e98ca/syncup-vs-teleparty-which-watch-party-tool-should-you-use-3959) — vendor-written, WEAK
19. [TandemParty: Shorts](https://tandemparty.com/en/clips/youtube-shorts), [TikTok](https://tandemparty.com/en/clips/tiktok) — vendor, via `../newcomers-help-shorts.md`
20. [MacRumors: SharePlay third-party apps](https://www.macrumors.com/2021/10/25/ios-15-1-shareplay-third-party-apps/) — Oct 2021
21. [Apple HIG: SharePlay](https://developer.apple.com/design/human-interface-guidelines/shareplay.md); [WWDC25 session 318](https://developer.apple.com/videos/play/wwdc2025/318) — 2025
22. [PhoneArena: SharePlay apps](https://www.phonearena.com/news/apple-promotes-apps-for-shareplay_id136534); [MacRumors: Disney+ SharePlay](https://www.macrumors.com/2021/12/15/disney-plus-shareplay) — 2021
23. [YouTube Premium SharePlay (mirror of 2023 report)](https://rtenews.vercel.app/2023/04/10/youtube-premium-shareplay-and-enhanced-1080p) — Apr 2023, WEAK mirror
24. [iClarified: Apple highlights SharePlay apps](https://www.iclarified.com/83465/apple-highlights-apps-with-support-for-shareplay) — 7 Aug 2026
25. [TikTok newsroom, 8 Dec 2025](https://newsroom.tiktok.com/new-ways-for-friends-and-families-to-discover-share-and-connect-on-tiktok)
26. [TikTok newsroom, 15 Jan 2026](https://newsroom.tiktok.com/new-ways-for-friends-and-families-to-discover-and-discover?lang=en-GB)
27. [TechCrunch, 8 Dec 2025](https://techcrunch.com/2025/12/08/tiktok-adds-a-space-for-organizing-content-with-others-teases-shared-feeds); [minter.io guide, Mar 2026](https://minter.io/blog/how-to-use-tiktoks-shared-feed-feature/)
28. [TechCrunch: Instagram Blend, 17 Apr 2025](https://techcrunch.com/2025/04/17/instagrams-new-blend-feature-creates-a-custom-reels-feed-for-you-and-your-friends/)
29. [Metricool: Instagram Blend (DE), update Apr 2026](https://metricool.com/de/instagram-blend/) — WEAK
30. [Chrome Web Store: TwoSeven Extension](https://chromewebstore.google.com/detail/twoseven-extension/cjdnfmjmdligcpfcekfmenlhiopehjkd?hl=zh-TW) — v3.0.21, 29 Sep 2025; [AlternativeTo: TwoSeven](https://alternativeto.net/software/twoseven/about)
31. [Firefox: TwoSeven Extension (New)](https://addons.mozilla.org/en-US/android/addon/twosevenxyz-extension) — seen 15 Nov 2026
32. [TwoSeven blog: screen share](https://blog.twoseven.xyz/) — undated
33. [Firefox: Synclify](https://addons.mozilla.org/addon/synclify/) — v0.5.0, 9 Apr 2026
34. [Firefox (ko): Synclify](https://addons.mozilla.org/ko/firefox/addon/synclify) — v0.6.2, 1 Oct 2026; [GitHub Synclify](https://github.com/Synclify/Synclify)
35. [AppGoblin: Hearo](https://appgoblin.info/apps/live.hearo) — Aug 2025, WEAK
36. [App Store: Hearo](https://apps.apple.com/app/id1385627895) — seen 15 Nov 2026
37. [newreleases: howardchung/watchparty](https://newreleases.io/project/github/howardchung/watchparty/release/2021-05-30) — releases to 9 Nov 2025; [ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fhowardchung%2Fwatchparty)
38. [AlternativeTo: WatchParty](https://alternativeto.net/software/watchparty/about) — seen 15 Nov 2026
39. [syncplay.pl news](https://syncplay.pl/news/) and [author page](https://syncplay.pl/author/etoh/) — 2025–2026
40. [newreleases: Syncplay v1.7.6](https://newreleases.io/project/github/Syncplay/syncplay/release/v1.7.6) — 2026
41. [GitHub: dyc3/opentogethertube releases](https://www.github.com/dyc3/opentogethertube/releases); [AlternativeTo](https://alternativeto.net/software/opentogethertube/about) — undated
42. [calzoneman/sync README](https://raw.githubusercontent.com/calzoneman/sync/3.0/README.md); [AlternativeTo: CyTube](https://alternativeto.net/software/cytube/about) — seen 15 Nov 2026
43. [Google Meet help: co-watch YouTube](https://support.google.com/meet/answer/12429722) — undated
44. [GIGAZINE, 24 Sep 2026](https://gigazine.net/news/20260924-youtube-watch-with/); [YouTube blog: new Live tools](https://blog.youtube/news-and-events/new-youtube-live-tools-for-fan-funding-dubbing-and-more/)
45. [Social Media Today: Watch With expands](https://www.socialmediatoday.com/news/youtube-expands-watch-with-to-more-creators/829854/) — 2026
46. [Meta blog: YouTube co-watch on Quest](https://www.meta.com/blog/youtube-co-watch-party-vr-mixed-reality/); [MIXED](https://mixed-news.com/en/youtube-co-watching-launch/) — Nov 2024
47. [Android Authority: Plex Watch Together removed](https://www.androidauthority.com/plex-watch-together-removed-3529939/) — Feb 2025; [AlternativeTo news](https://alternativeto.net/news/2025/2/plex-ends-support-for-watch-together-feature)
48. [Plex forum: Add Watch Together to new experience](https://forums.plex.tv/t/add-watch-together-to-new-plex-experience/906941/56) — 2025–2026
49. [Noted.lol poll](https://noted.lol/is-plex-losing-touch-with-the-self-hosting-community/) — Oct 2026
50. [Road to VR: Bigscreen tag](https://www.roadtovr.com/tag/bigscreen-vr/); [UploadVR: Beyond weight](https://uploadvr.com/bigscreen-beyond-weight-specs/)
51. [vr.org: best VR headset for movies 2026](https://vr.org/best-vr-headset-for-movies) — WEAK
52. [Viewport360: Bigscreen Beta](https://viewport360.substack.com/p/bigscreen-beta-remains-a-low-key) — WEAK
53. [App Store: WatchBuddy](https://apps.apple.com/app/id6758553756) — 2026
54. [WatchBuddy-tv mirror](https://vat.pages.dev/WatchBuddy-tv) — WEAK
55. [Cowa privacy policy](https://cowa.kuhntec.de/privacy) — seen 15 Nov 2026
56. [Webtekno: watch-together apps (TR)](https://www.webtekno.com/birlikte-bir-seyler-izlemek-icin-en-iyi-uygulamalar-h111743.html) — undated
57. [Product Hunt: Cliqroom](https://www.producthunt.com/products/cliqroom/launches/cliqroom) — 9 Feb 2026; [AlternativeTo: Cliqroom](https://www.alternativeto.net/software/cliqroom/about/)
58. [AppGoblin: SyncFlix](https://appgoblin.info/apps/com.admin.bloc_watch_together); [CWS: SyncCouch](https://chromewebstore.google.com/detail/fknanflliokicihmllkbhbhbogjnmnhm); [SourceForge: WEVER party](https://sourceforge.net/app/watch-together-wever-party/) — 2026
59. [Product Hunt: Couch](https://www.producthunt.com/posts/couch) — undated
60. [AlternativeTo: Teleparty alternatives (Vemos)](https://alternativeto.net/software/netflix-party/) — seen 15 Nov 2026, WEAK
61. [Tooltivity: Metastream Remote (MV2)](https://tooltivity.com/extensions/no-longer-supported-v2-manifest/metastream-remote) — WEAK
62. [GitHub: samuelmaddock/metastream](https://awesome.ecosyste.ms/projects/github.com%2Fsamuelmaddock%2Fmetastream) — seen 15 Nov 2026
