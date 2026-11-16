# Rave (competitor profile)

_Field research, 15 Nov 2026 (Research session). Method: web search excerpts; the vendor site was not reachable from
the cloud session unless said. **WEAK** = single / vendor / SEO source, **GUESS** = inference. Related: overview.md,
`../competitors-how.md` §2 (Rave v. Apple, the dated lawsuit story; not repeated here), `../market-and-competitors-2026.md`,
`../mobile-app.md`._

## At a glance
| | |
|---|---|
| What | Mobile-first co-watching app (formerly **WeMesh**) by Rave Inc., Hamilton, Ontario: watch videos and listen to music in sync with friends or strangers [1][2] |
| Platforms | Android (Google Play, live); iOS **off the App Store since 13 Aug 2025**; Windows / Mac apps (Mac signing revoked by Apple in Aug 2025); Chromebook and Android TV named in store text [1][3][4] |
| Services | YouTube, Netflix, Disney+, Prime Video, HBO Max, Google Drive videos, music; streaming services through logins inside the app [1][5] |
| Talk | Text chat + voice chat in rooms [6] |
| Games | none found |
| Account | A Rave account for everyone (Google / Facebook / Twitter sign-in in older guides) [7] |
| Phone | The phone app *is* the product; no web version found [3][8] |
| Price | Free with ads; a subscription removes ads ($1.99 / month on a 2022 US App Store snapshot, **WEAK**) [9] |
| Size / ratings | Rave claims **225 M+ downloads** (May 2026, vendor) [2]; Play 4.0–4.4★ with 724–916 K ratings, 50 M+ installs (aggregator snapshots) [9] |
| Status 2026 | Android 8.2.44 (21 May 2026) [10]; suing Apple in 5 countries; US case moved to N.D. California on 3 Nov 2026 (`../competitors-how.md` §2) |

## Product and platforms
- **Company:** Rave Inc. (Hamilton, Ontario); NowSecure lists the iOS publisher as Rave Media, Inc. for WeMesh
  (`sh.weme.wemesh`) [11]. Android package: `com.wemesh.android` [10].
- **Android:** listed and updated (8.2.44 on 21 May 2026 per APKPure; publisher says Android 10+) [10][3].
- **iOS:** the original "Rave – Watch Party" (id929775122, rated 17+) is unavailable in the App Store storefronts that
  monitors checked (seen Aug 2026) [3][4]. Old installs may keep working (**GUESS**) [3].
- **Desktop:** Windows and Mac apps are listed (SourceForge) [7]; Apple also revoked Rave's Developer ID in Aug 2025,
  so the Mac app shows a malware warning (Rave's complaint; `../competitors-how.md` §2). Store text also names
  Chromebooks and Android TV, and once said "coming soon to Mac and Windows" [5].
- **Web:** no official browser version found; competitors (Kosmi) market themselves as "the Rave alternative that works
  in your browser" (**WEAK**, competitor page) [8].

## Supported services and how
- **Services named in listings:** Netflix, Disney+, YouTube, Prime Video, HBO Max "& more"; Google Drive for your own
  files; music listening [1][5][6]. Older press: a partnership with Viki (TV Technology) [12].
- **How streaming services work:** each viewer signs into the streaming service **inside the Rave app** (an in-app
  login / web view flow); troubleshooting guides say to "refresh the Netflix sign-in through the normal in-app flow"
  [5][13]. All viewers need a Rave account **and** access to the same service [7]. So, like Teleparty, it uses each
  person's own subscription and the service's own player; it does not re-stream the film (GUESS: from the login flow;
  no technical write-up).
- **Sync:** pause by anyone pauses everyone (review) [5]; mechanism not published. Sync drift across regions and
  crashes are reported (**WEAK**, competitor page) [8].
- **Breakage:** App Store reviews describe Netflix stuck on loading / black screen after an iOS update and a Netflix
  outage of about four months [14]. GUESS: DRM players in phone web views break whenever the service changes, which is
  the cost of the in-app-login model.

## Room features
- **Sync + chat:** text and voice chat while the video plays [6].
- **Public and private rooms:** a room ("a rave") can be public (strangers join from the app's list) or private;
  visibility is a room setting; invites go out by SMS link or to Rave friends [6].
- **Friends list** inside the app [6].
- **Music:** listen to music together (store text) [1]. RaveDJ (song mashups) appears to be a separate product [15].
- **Moderation:** Rave says it uses machine-learning flagging plus manual review and has tightened its safety
  protocols since the removal (`../competitors-how.md` §2, [16]). AppleInsider (7 May 2026) reads Rave's own press
  material as admitting public rooms were under-moderated, and notes Reddit complaints fell over the six months before
  [16]. A 2025 Reddit anecdote says strangers entered a room and could not be removed (**WEAK**) [17].
- **Not found:** reactions / custom emoji, cameras, screen share, games, queue, votes.

## Onboarding and accounts
- **Host:** install the app → sign in / create a Rave account → pick a source (YouTube, Netflix…) → sign into that
  service in the app if needed → create a room, choose public or private → share the link [6][7].
- **Guest:** install the app (Android; iPhone users cannot install it now) → create an account → sign into the same
  streaming service → open the invite [3][7].
- Friction against Sidelit: an install, an account and (on iPhone) no way in at all.

## Phone experience
- Android is the strongest platform: a native app built for phones from the start (WeMesh, mid-2010s, **GUESS** on the year; first mobile
  watch-party app, `../market-and-competitors-2026.md`).
- iPhone: none for new users since Aug 2025 [3].
- Ads in the free version interrupt watching (review sites) [9].

## Pricing, limits, ads and income
- **Ads:** Rave's own complaint says it "relied mostly on advertising revenue" (`../competitors-how.md`, MacRumors).
- **Premium:** a monthly subscription removes ads; $1.99 / month on a US App Store snapshot from 2022 (**WEAK**,
  dated) [9]; a subscription tracker says "plan-based pricing, monthly billing" and cancelling in account settings on
  rave.io [18]. No 2025–2026 price found.
- **Data sale:** see Privacy — watch-history-based audience segments are part of the income model (**WEAK**) [19].
- **Limits:** room size not found.

## Privacy
- **Data policy (a mirror copy of Rave's data page, WEAK until checked on rave.io)** [19]:
  - Collected: name, handle, e-mail, IP address, **advertising identifiers**, **watch history**.
  - Use: "market verticals" derived from watch history and shared "for monetization purposes".
  - Agreeing to the policy means agreeing to the **sale** of your data; everyone (incl. California users) can opt out
    of collection, and thus sale, in the settings menu.
- **Trackers (Exodus Privacy, Android):** 27 trackers in 6.1.32 (Oct 2024) incl. Amazon Advertisement; 25 in 6.0.46;
  12 in 5.1.11; earlier reports 8 (2021) and 23 (2019) [20]. Exodus shows bundled SDKs, not what is sent.
- **Network (NowSecure, iOS 8.1.2):** connections to Amazon, Facebook and Google hosts [11].
- **Account deletion:** not found.

## Store ratings and recurring complaints
| Store | Numbers | Date / source |
|---|---|---|
| Google Play | 4.4★ / 724 K reviews / 50 M+ downloads; 4.2★ / 878.8 K; 4.04★ / 916 K | three aggregator snapshots, seen 15 Nov 2026 [9] |
| App Store | removed (Aug 2025); listing rated 17+ | [3][4] |
| Vendor claim | 225 M+ downloads | Rave press release, 7 May 2026 [2] |
| Earlier note | 25 M+ downloads, 4.5★ | `../market-and-competitors-2026.md` (aggregator, **WEAK**) |
| Trustpilot | not found | — |

Complaint themes:
1. **Netflix / streaming breaks** (loading, black screen, months-long outages) [14].
2. **Ads** in the free version [9].
3. **Strangers and moderation** in public rooms [16][17].
4. **Sync drift and crashes** (**WEAK**, competitor page) [8].
5. **iPhone users locked out** since Aug 2025 [3].

## Recent changes (2025–2026)
- **13 Aug 2025:** iOS app removed, Mac Developer ID revoked (details and both sides: `../competitors-how.md` §2).
- **21 May 2026:** Android 8.2.44 [10].
- **7 May 2026 (new beyond §2):** the press release claims **225 M+ downloads** [2]; counsel per country — Axinn,
  Veltrop & Harkrider + Saiber (US), DMG Advocates (Canada), VMCA Advogados (Brazil), Hausfeld Advocaten (Netherlands),
  EPAM (Russia) [21]. In Canada this is a **leave application** to the Competition Tribunal (permission to bring a
  case), not yet a case; no decision found as of 15 Nov 2026 [21][22].
- **Aug 2026:** still on Google Play, still missing from the App Store storefronts checked [3].
- **3 Nov 2026:** US case transferred to N.D. California (`../competitors-how.md` §2). No later ruling found; Brazil,
  Netherlands and Russia: no procedural news found.

## Against Sidelit
- **Where they are ahead:**
  - Huge install base (25–225 M downloads) and Play-store discovery.
  - Native Android app built for phones; voice chat in the app.
  - Netflix / Disney+ / Prime / Max today (with each person's login), plus music.
  - Public rooms give new users someone to watch with (also their biggest risk).
- **Where Sidelit is ahead:**
  - Works on iPhone (phone site) and every desktop browser; nothing to install for YouTube / Shorts / TikTok / files.
  - No account, no ads, no data sale, no trackers.
  - Private-link rooms only: no strangers, a small moderation surface (the reason Rave lost iOS).
  - Cameras, screen share, reactions / custom emoji, games, queue, votes, pins, saved rooms, recap.
  - Any HTML5 video on desktop via the extension.

## Ideas worth taking
1. **Play your own Google Drive video.** Rave lists Drive for "your own videos"; many people keep home videos and
   lectures there. A pasted Drive share link resolving to Google's own embed / preview player (only files the owner
   shared; no download tricks). Needs a player check and a CSP host in `_headers`. Effort M. Fit: lane B.
2. **Moderation basics before any app store** (report, block, a word filter, a contact): already a recommendation in
   `../competitors-how.md` §2; Rave is the proof. Effort M. Fit: lane A (before a store app, after 1.0 for iOS).
3. **Never public rooms; say so.** A short "rooms are private links, no strangers" line in help / privacy explains
   our safety stance against the Rave story. Effort S. Fit: lane A copy (owner checks wording).
4. **Listen together (audio-only room mode).** Rave's music use shows rooms are not only for films; our player already
   plays direct files and YouTube, and SoundCloud is researched (`../more-players.md`). Effort M–L. Fit: after 1.0.
5. **Friends / recent rooms on the phone home.** Rave's friends list makes re-joining easy; we have saved rooms —
   surface "your saved rooms" first on the phone home screen (no account, local). Effort S. Fit: lane A.
6. *Conflicts with our rules, listed only to reject:* ad-funded free tier and data sale (no ads), mandatory account
   (no account), public stranger rooms (store and safety risk).

## What could not be checked
- rave.io itself, its real privacy policy URL and date, current Premium price and room limits (hosts blocked).
- Google Play live rating, Data safety section, and the exact install band.
- Whether the Windows app is still distributed and how the Mac app behaves after the revocation.
- Court dockets (PACER, Competition Tribunal); any ruling after 3 Nov 2026.
- Moderation numbers (reports handled, bans) — none published in the excerpts.

## Sources
1. [App Store: Rave - Watch Party (UAE listing text)](https://apps.apple.com/ae/app/rave-watch-party/id929775122) — seen 15 Nov 2026
2. [Rave press release (EN)](https://cdn.saverave.com/press/Rave_Press_Release_EN.pdf) — 7 May 2026 (vendor, **WEAK** for the download claim)
3. [Kosmi blog: How to install Rave on iOS](https://blog.kosmi.io/p/how-to-install-rave-on-ios-and-iphone) — 2025, updated Aug 2026 (**WEAK**, competitor)
4. [AppGoblin: Rave Android](https://appgoblin.info/apps/com.wemesh.android); [AppGoblin iOS](https://appgoblin.info/apps/929775122) — seen 15 Nov 2026 (**WEAK**)
5. [alternativeto: Rave](https://www.alternativeto.net/software/rave/about/); [documentarytube guide](https://www.documentarytube.com/?p=277003) — seen 15 Nov 2026 (**WEAK**)
6. [Tom's Guide: Rave app is like Netflix Party for mobile](https://www.tomsguide.com/news/rave-app-is-like-netflix-party-for-mobile-how-to-use-it) — 2020
7. [SourceForge: Rave for macOS](https://sourceforge.net/app/rave/mac/); [privacysavvy guide](https://privacysavvy.com/geoblocking/streaming/watch-movies-together-online/); [itweb](https://itweb.co.za/article/rave-app-hopes-to-unite-lone-video-watchers/Pero3qZlLrJ7Qb6m) — seen 15 Nov 2026
8. [Kosmi: Rave alternative](https://kosmi.io/rave-alternative/) — seen 15 Nov 2026 (**WEAK**, competitor)
9. [grand-screen: Rave](https://grand-screen.com/apps/rave-watch-party/); [mobileappdaily review](https://mobileappdaily.com/product-review/rave); [onclarity](https://www.onclarity.com/leaderboard/insight/rave); [App Store PA (2022 price)](https://apps.apple.com/pa/app/rave-watch-party/id929775122?l=en-GB) — seen 15 Nov 2026 (**WEAK**)
10. [APKPure: com.wemesh.android](https://apkpure.com/com-wemesh-android/com.wemesh.android) — update 21 May 2026
11. [NowSecure: WeMesh iOS](https://www.nowsecure.com/marc-app/wemesh-wemesh-inc-ios/) — seen 15 Nov 2026
12. [TV Technology: Viki gets social with Rave](https://www.tvtechnology.com/the-wire-blog/7541-507541) — older
13. [justuseapp forum: Netflix login in Rave](https://forums.justuseapp.com/en/post/QV5TW8KFS5/i-m-on-phone-and-i-have-an-issue-when-i-go-to-play-a-movie-in-netflix-i-can-t-login) — seen 15 Nov 2026 (**WEAK**)
14. [App Store reviews (UAE)](https://apps.apple.com/ae/app/rave-watch-party/id929775122) — seen 15 Nov 2026
15. [RaveDJ on Patreon](https://www.patreon.com/ravedj) — seen 15 Nov 2026
16. [AppleInsider: SharePlay is not why Rave was kicked off](https://appleinsider.com/articles/26/05/07/shareplay-is-not-why-co-streaming-app-rave-was-kicked-off-the-app-store) — 7 May 2026
17. A Reddit thread about strangers in Rave rooms (seen via a mirror; not linked) — 2025 (**WEAK**)
18. [ReSubs: Rave subscription](https://resubs.app/it/subscriptions/rave) — seen 15 Nov 2026 (**WEAK**)
19. [Rave data page (mirror of rave.io/data.html)](https://dcmpx.remotevs.com/io/rave/SL/data.html) — seen 15 Nov 2026 (**WEAK**, mirror)
20. [Exodus Privacy: com.wemesh.android reports](https://reports.exodus-privacy.eu.org/en/reports/517203) ([other](https://reports.exodus-privacy.eu.org/en/reports/479569)) — Oct 2024 and earlier
21. [BusinessWire: Rave sues Apple in five countries](https://secure.businesswire.com/news/home/20260506587441/en/Rave-Sues-Apple-in-Five-Countries-Over-App-Store-Removal) — 6–7 May 2026
22. [BetaKit: Rave takes fight to Canada's Competition Tribunal](https://betakit.com/rave-takes-fight-with-apple-over-app-store-removal-to-canadas-competition-tribunal/) — May 2026
