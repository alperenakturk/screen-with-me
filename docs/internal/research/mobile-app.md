# Research: a phone app for Sidelit (PWA → Play → App Store → native)

_Research session, 13 Nov 2026, Job 11 from the Planner. The owner: "Others built an app, we can build an app too.
Research this properly." Read-only. Not legal advice. From this cloud session apps.apple.com, Google Play pages, app
trackers and competitor sites could not be opened (blocked hosts); store ratings come from search excerpts and are
marked WEAK. Official policy text was read directly where it opened (developers.google.com, developer.apple.com) and
is quoted. Earlier notes: `docs/internal/apps.md` (store path, 29 Oct), `research/market-and-competitors-2026.md`._

## Verdict in five lines
1. **The app in the screenshots is most likely Teleparty's phone app** (WEAK; see §1). Its "Browse" tab shows
   YouTube's own mobile site in a web view: that pattern does not fit YouTube's rules for us (§3.1). We play YouTube
   only in the official embedded player; keep it that way.
2. **Phone watch-party apps are not doing well:** Teleparty iOS ~1.7–2.8★ (WEAK), Rave thrown off the App Store
   (Aug 2025), Kosmi iOS too few ratings to show, Scener's app can't host. An app is a channel, not a moat.
3. **Cheapest real step: a better PWA** (wake lock, share target, push on Android, English manifest, install hint).
   Same code, no review, works today.
4. **Then Google Play via a Trusted Web Activity** (one-time $25, our own domain required, 12 testers × 14 days for a
   new personal account). Then **iOS via Capacitor** ($99 / year, needs report / block for chat first: guideline 1.2).
5. **Truly native: not before real users ask for something the web can't do** (background voice, SharePlay-like
   system features). Not for 1.0.

## 1. Who builds phone watch-party apps

**The screenshots.** Bottom tabs Profile / Browse / Party, a "Free user" badge, an activity feed ("created the
party 🎉"), an input row starting with an invite button. Teleparty's own support page says "on mobile go to the party
tab; click the invite button in the bottom left corner" (search excerpt of
[teleparty.com/support](https://teleparty.com/support)), and Teleparty sells Premium ($6.59 / month,
`market-and-competitors-2026.md`), which matches "Free user". **Probably Teleparty's iOS / Android app (WEAK: the
store page could not be opened).** Teleparty has two iOS listings ("Teleparty - Watch Party" id1620026075, iOS 17.6+,
free with in-app purchases, 16+; "Teleparty - Watch TV Together" id6471985961) and an Android app
(`com.teleparty.android`, called an open beta on one support page).

| App | Phone apps | What you can watch on a phone, and how | Store rating (WEAK) | Repeated complaints |
|---|---|---|---|---|
| **Teleparty** | iOS + Android | services in an **in-app browser** (the screenshot's "Browse"); each person needs their own subscription | iOS ~2.5★ / 960 or 1.7★ / 300 (two trackers), ~2.8★ in another | video won't play, can't host after cancelling Premium, billing ([App Store reviews via search](https://apps.apple.com/us/app/teleparty-watch-party/id1620026075?see-all=reviews&platform=iphone), [mwm.ai](https://mwm.ai/apps/teleparty-watch-party/1620026075)) |
| **Rave** (WeMesh) | Android (iOS removed Aug 2025, suing Apple since May 2026) | YouTube, Drive, own library; streaming services through their sites inside the app | Android 4.47★ / ~101 K (older snapshot) | few content options, clunky UI, privacy / moderation ([MacRumors](https://macrumors.com/2026/05/07/apple-rave-app-store-lawsuit/), [AppleInsider](https://appleinsider.com/articles/26/05/07/shareplay-is-not-why-co-streaming-app-rave-was-kicked-off-the-app-store), [Common Sense](https://www.commonsensemedia.org/app-reviews/rave-watch-together)) |
| **Kosmi** | iOS | web rooms; screen share for anything else | too few ratings to show; ~55 K downloads | "screen sharing unusable", "completely broken" ([App Store](https://apps.apple.com/us/app/kosmi/id1547460222), [mwm.ai](https://spark.mwm.ai/en/apps/kosmi/1547460222)) |
| **Hearo** | iOS + Android | services in an **in-app browser**, voice / text chat | iOS ~4.3★ average (tracker) | Netflix: "video format unsupported" / "watch it in the Netflix app" ([App Store](https://apps.apple.com/app/id1385627895), [justuseapp](https://justuseapp.com/en/app/1385627895/hearo-super-watch-parties/reviews)) |
| **Scener** | iOS (join only) | hosting needs the desktop extension | — | dormant since 2023 |
| **Discord** | iOS + Android | Watch Together = YouTube in the official player inside an Activity; streams = screen share | big app, not comparable | ads, lag (see market doc) |
| **SharePlay** | Apple only | native apps that adopt it | — | Apple-only |
| Web-only (W2G, SyncUp, WatchAlong…) | none, mobile web | YouTube embed in the phone browser | — | ads (W2G) |

**Patterns.** (a) **In-app browser of the streaming site** (Teleparty, Hearo, Rave): works for services that allow
playback in a mobile web view and breaks for DRM-heavy ones (Netflix on a phone web view often refuses; Hearo's
reviews). (b) **Own player with the official YouTube embed** (Discord, the web-only tools, us). (c) **Screen share**
(Kosmi, Discord). Nobody solves "Netflix on a phone in sync" well; the complaints are about exactly that.

## 2. Our options, cheapest first
Effort assumes one owner + AI sessions, the site as it is (app-like phone room since 0.9.92.x, `device.ts`,
`phone.css`, `manifest.webmanifest`, `sw.js`).

### (i) A better PWA (cost 0, days)
What a PWA can do in 2026:

| Capability | Android (Chrome) | iOS / iPadOS (Safari, home-screen app) |
|---|---|---|
| Install | install prompt + menu | Share → Add to Home Screen only (we can show a hint) |
| Push notifications | ✅ | ✅ since 16.4, **only for home-screen apps**, permission only after a tap; no images / action buttons ([magicbell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide), WEAK). The EU removal in the 17.4 beta was reversed before release ([TechCrunch](https://techcrunch.com/2024/03/01/apple-reverses-decision-about-blocking-web-apps-on-iphones-in-the-eu/)) |
| Keep the screen on (Wake Lock) | ✅ | ✅ in Safari; in home-screen apps fixed in **Safari / iOS 18.4** ([release notes](https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes), [WebKit 254545](https://webkit.org/b/254545)) |
| Fullscreen | element fullscreen ✅ | no element fullscreen on iPhone (our `.pseudo-fs` covers it); standalone has no browser bar anyway |
| Background audio (voice while the screen is off / app switched) | partly (tab keeps running for a while) | **no**: WebRTC and media pause when the app goes to the background (WEAK, common knowledge, not verified here) |
| Share target ("Share → Sidelit" from the YouTube app) | ✅ `share_target` in the manifest | ❌ |
| Picture-in-picture from the home-screen app | ✅ | broken in home-screen apps ([WebKit 303885](https://bugs.webkit.org/show_bug.cgi?id=303885)) |

**Our gaps today** (from the files): the manifest says `"lang": "tr"` (English first: should be `en`), no
`screenshots` (Chrome's richer install sheet), no `shortcuts`, no `share_target`, no wake lock while a video plays,
no push, no "add to home screen" hint on iOS. All are small. Push needs a small Worker part (VAPID keys, storing a
subscription per browser; no account needed) and a privacy-policy line.
**Updates:** instant (the site). **Review risk:** none.

### (ii) Android: Trusted Web Activity on Google Play (cost $25 once, ~1 week + a 2-week test)
- A TWA is Chrome without its bar, showing our PWA; generated with **Bubblewrap** (Google's CLI) or **PWABuilder**
  (GUI on top of Bubblewrap). The site must pass Chrome's PWA checks, and **Digital Asset Links**
  (`/.well-known/assetlinks.json` with the signing-key fingerprint, Play's key and the upload key differ) must be on
  **our own domain**; if verification fails it opens as a Custom Tab with a URL bar
  ([Chrome TWA quick start](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start/),
  [Android TWA overview](https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities)).
- **Cost:** Google Play developer account, one-time **$25**. New **personal** accounts must run a closed test with
  **12 testers for 14 days** before production (third-party guides agree, WEAK; Google's page not reachable here);
  Google's developer identity verification applies. An organisation account avoids the 12-tester rule but needs a
  D-U-N-S number.
- **Play policy:** the spam policy targets apps that wrap **someone else's** site without permission
  ([Spam](https://support.google.com/googleplay/android-developer/answer/9899034)); wrapping our own site is the
  intended TWA use. The IP policy forbids apps that "encourage or facilitate infringement, such as unauthorized
  streaming" ([Intellectual Property](https://support.google.com/googleplay/android-developer/answer/9888072)): our
  neutral wording and "YouTube only in its official player" matter here. Selling anything digital would need Play
  Billing (we sell nothing).
- **Updates:** the site updates the app; a new Play build only for icon / name / manifest changes.
- **What it adds over the PWA:** a store listing (discovery, trust), the Play badge on the site. Same features.

### (iii) Capacitor (or similar) for Android + iOS (cost $99 / year for Apple + $25; 3–6 weeks for the first iOS release)
- A native shell with a WKWebView / Android WebView; MIT licence. Load the live site (one codebase, no app update for
  site changes) or bundle the files (then absolute API / WebSocket addresses).
- **iOS needs:** Apple Developer Program **$99 / year**
  ([Apple](https://developer.apple.com/programs/whats-included/)); a Mac or a cloud build service; microphone and
  camera usage texts; privacy labels; `playsinline` for YouTube; the "audio" background mode only if voice should keep
  running with the screen locked (and then Apple asks why).
- **Native extras that make it "an app"** (guideline 4.2): push (APNs), universal links (`/r/ROOM` opens the app),
  keep-awake, the native share sheet, a share extension ("Share → Sidelit" from the YouTube app), background voice.
- **Review risks (Apple, quoted below):** 4.2 "repackaged website", 1.2 user content (report / block / filter /
  contact), 5.2.2 / 5.2.3 third-party content. Rooms with voice, cameras, games and sync are real features, but a
  reviewer who sees "it is the same as the website" can still reject; native extras above are the answer. Rave shows
  that social video rooms get extra scrutiny.
- **Updates:** site changes go live without review if the shell loads the live site. Apple tolerates this for web
  content but **not for changing the app's purpose**; new native features need a new build and review.

### (iv) Truly native (Swift / Kotlin, or React Native / Flutter) — months, not now
Only native gives: background voice that survives everything, CallKit-like voice, system-level share, SharePlay,
Picture-in-Picture of our own player, a native YouTube embed tuned per platform. For a one-person team it doubles the
product (two more codebases next to the site, the extension and the server). Every feature today is web-first and
tested by our harnesses; native code would not be. **Not before 1.0, and only for a concrete feature users ask for.**

| | Effort | Money | Review | Updates |
|---|---|---|---|---|
| (i) PWA polish | days | 0 | none | instant |
| (ii) Play TWA | ~1 week + 14-day test | $25 once | low | instant (site) |
| (iii) Capacitor iOS (+ Android) | 3–6 weeks first time | $99 / year (+ $25) | medium (4.2, 1.2) | site instant, native parts per review |
| (iv) Native | months | same fees | medium | every change through review |

## 3. The rules that decide it

### 3.1 YouTube (developers.google.com, read directly)
- **Only the official embedded player.** In a web view, "use one of the OS-provided WebView types" (Android `WebView`
  / Custom Tabs, iOS `WKWebView` / `SFSafariViewController`); the app must send its identity: the HTTP `Referer` with
  **the app's store ID as the domain** (header or `baseUrl`), or `origin` in `SFSafariViewController`
  ([Required Minimum Functionality](https://developers.google.com/youtube/terms/required-minimum-functionality)).
  Google's own iOS helper library is exactly this: the IFrame player in a web view
  ([iOS helper](https://developers.google.com/youtube/data/guides/ios_youtube_helper)). → A Capacitor / TWA app with our
  current player is the allowed shape; we must add the app-ID Referer in a Capacitor shell (a TWA is Chrome, the
  site's own Referer stays).
- **Size and overlays:** viewport ≥ **200 × 200 px**, 480 × 270 recommended for 16:9; "You must not display overlays,
  frames, or other visual elements in front of any part of a YouTube embedded player, including player controls";
  autoplay only when more than half of the player is visible; one autoplaying player per screen (same page). Our rule
  "nothing of ours over the YouTube player" already matches.
- **Background play is forbidden:** Developer Policies III.I.9: must not "create, include, or promote features that
  play content, including audio or video components, from a background player"; III.I.7: must not "separate, isolate,
  or modify the audio or video components"
  ([Developer Policies](https://developers.google.com/youtube/terms/developer-policies)). → An app may keep **our
  voice chat** in the background, never the YouTube sound.
- **"Browse YouTube inside the app" like the screenshot:** no sentence of the API terms names web views of youtube.com,
  but III.F.1 "must not change or interfere with user interfaces in YouTube Applications", III.I.4 / III.I.6 (must not
  "modify, build upon, or block any portion or functionality of a YouTube player"), III.E.6 (no scraping), and
  YouTube's own Terms (no access by automated means; the older text: no access "through any technology or means other
  than the video playback pages of the Service itself, the Embeddable Player, or other explicitly authorized means"
  ([2017 archive](https://web-wp.archive.org/web/20170811164130/https:/www.youtube.com/t/terms); current
  [terms](https://www.youtube.com/t/terms) not opened here)). Syncing youtube.com in a web view means injecting a
  script that drives YouTube's own page: a modification of a YouTube Application. **Do not do it.** Practical blocker
  too: Google sign-in is refused inside embedded web views (`disallowed_useragent`, since 2021
  ([Google](https://developers.googleblog.com/2021/06/upcoming-security-changes-to-googles-oauth-2.0-authorization-endpoint.html))),
  so people can't use their own YouTube account there. → Our replacement for "Browse": **our search (YouTube Data API,
  with "Results from YouTube" + Terms link, card Y1) and Shorts / Discover feeds**, which we already have, plus a
  "Share → Sidelit" path from the real YouTube app (Android share target / iOS share extension).
- **Apps must be remotely updatable** (III.B.1 "Non-website API Clients, like mobile apps … must be capable of being
  remotely updated"): a shell that loads the live site satisfies it.
- **Charging:** III.F.3.1 "must not charge users to watch content in an embedded YouTube player" (we don't).
- The YouTube API audit (store-and-youtube-audit.md) will ask about every client: list the apps in the form when we
  apply.

### 3.2 Apple App Store Review Guidelines ([read directly](https://developer.apple.com/app-store/review/guidelines/))
- **4.2:** "Your app should include features, content, and UI that elevate it beyond a repackaged website. If your app
  is not particularly useful, unique, or 'app-like,' it doesn't belong on the App Store." 4.2.2: not "web clippings,
  content aggregators, or a collection of links". Forum reports: reviewers apply "if it runs in a browser as web
  pages, it's not enough", and push / sharing alone were judged "not robust enough" once (WEAK, anecdotal,
  [forums](https://developer.apple.com/forums/thread/113837)).
- **4.7:** HTML5 / JS mini apps and games not in the binary are allowed; "You are responsible for all such software …"
  (our games are fine; they are our own code from our site).
- **5.2.2:** "If your app uses, accesses, monetizes access to, or displays content from a third-party service, ensure
  that you are specifically permitted to do so under the service's terms of use. Authorization must be provided upon
  request." **5.2.3:** no saving / converting / downloading media from YouTube etc.; "Streaming of audio/video content
  may also violate Terms of Use". → The official YouTube embed under the API terms is our permission; a youtube.com
  web view would not be. Film pages (any site) stay desktop + extension only; the app says so (as the phone site does).
- **1.2 user content:** "a method for filtering objectionable material", "a mechanism to report offensive content and
  timely responses", "the ability to block abusive users", "published contact information". We have host kick / ban
  and private rooms; **missing: report, block-for-me, a filter** (chat, images, custom emojis, names). Needed before
  an iOS submission; useful on the web too.
- **5.1.1(v):** "If your app supports account creation, you must also offer account deletion within the app." We have
  no accounts; if they ever come, deletion inside the app is required.
- **2.5.6:** web browsing must use WebKit (any iOS shell does).
- **4.8** login services: not relevant without accounts.

### 3.3 Google Play
See §2 (ii): own site in a TWA is fine; the spam policy hits wrapping others' sites; the IP policy forbids
facilitating unauthorized streaming; the same user-content expectations (report / block) appear in Play's UGC policy
(not opened here; same direction as Apple 1.2).

### 3.4 Our own invariants (unchanged by an app)
No accounts (no sign-in, no Sign in with Apple, no deletion flow needed), no DRM bypass, never name piracy sites, the
extension stays desktop only (film pages are not in any app), nothing of ours over the YouTube player, no YouTube
sound in the background, free and no ads (so no Play Billing / in-app purchase).

## 4. Recommendation

**Before 1.0 (now → store submission):**
1. **PWA polish card** (first concrete step, no money, no domain needed): manifest `lang: en` + `screenshots` +
   `shortcuts` (Create room, Join with a code); `share_target` so "Share → Sidelit" from the YouTube / TikTok app on
   Android opens the link in a room (new or last); Screen Wake Lock while a video plays in a room (release on pause /
   leave); an iOS "Add to Home Screen" hint on the phone home after the first room. Harness: the phone harness checks
   the manifest fields and the wake-lock call with a stub.
2. **Report + block-for-me in the room** (Apple 1.2, Play UGC, good for the web anyway): report a message / image /
   name to us (reuses the feedback path, no data kept beyond the report), "hide this person for me" (chat, emojis,
   camera). Planner + owner decide the wording.
3. Keep "no YouTube web view, no background YouTube sound" written in CLAUDE.md as rules.

**Right after 1.0 (own domain exists):**
4. **Google Play TWA** (`assetlinks.json` on the domain, Bubblewrap, $25, 12 testers × 14 days: the six testers on
   the Thanks page + friends).
5. **Web push** for invites / film time (Android PWA + TWA + iOS home-screen apps), Worker part + privacy line.

**Later (1.x), only if Play shows demand:**
6. **iOS via Capacitor** loading the live site: app-ID Referer for YouTube, push via APNs, universal links, share
   extension, voice in the background (our voice only). $99 / year, a Mac / cloud build. Submit with a demo room and
   the 1.2 tools in place.
7. Native only for a specific feature the web can't give.

**Owner decisions (to the Planner):** spend $25 (Play) after the domain; $99 / year (Apple) later or not; whether
push notifications are wanted at all (a new data type: a push subscription per browser).

## 5. Patterns from the screenshots we can use on the phone site now (patterns only, our own look)
- **A bottom tab bar on the phone: Room / Search / Me.** Room = today's phone room; Search = our YouTube search +
  Shorts Discover + podcasts as one screen (replaces "Browse" legally); Me = name, avatar, theme, sounds, language,
  move to another device, help. Today these hide behind ⋯ and ＋ sheets; three tabs make them findable with the
  thumb. Fits `phone-room.ts` (sheets → tab panels).
- **One input row with every action:** invite · message box · 📷 · 🎙 · 😀 (and ＋ for images / video). We already have
  😀 and ＋ beside the box and 🎙 / 📷 in the faces strip; one row lowers thumb travel. Keep it on one line at 360 px.
- **Room events in the feed** ("Alex created the room", "started playing …") as quiet centred lines: we have them as
  hidden room actions; on a phone, showing the first few by default makes a fresh room feel alive.
- **A profile screen with a few switches** (sounds, notifications if push comes, "fullscreen when turned"): our
  ⚙️ My screen rows, moved to the Me tab on phones.
- Not to take: the "Free user" / Premium badge, in-app web browsing of video sites, sign-in.

## Proposed cards (for the Planner)
1. **PWA polish** (§4.1): manifest (en, screenshots, shortcuts, share target), wake lock while playing, iOS install
   hint. Done when: Android "Share → Sidelit" opens a room with the link; the screen stays on while a video plays;
   phone harness checks.
2. **Report and block-for-me** (§4.2): Apple 1.2 / Play UGC prerequisite.
3. **Phone bottom tabs Room / Search / Me + one action row** (§5): Design first (option page in text to the Planner),
   then the Developer.
4. **After the domain: Google Play TWA** (§4.4) and **web push** (§4.5).
5. **Later: iOS Capacitor shell** (§4.6), only after Play numbers.

## What could not be checked
Store pages and live ratings (apps.apple.com, Google Play, trackers blocked), Teleparty's app itself (to confirm the
screenshots), Google's own page for the 12-tester rule, current YouTube Terms text, and background audio of WebRTC in
iOS home-screen apps (needs a real iPhone: the owner can test by joining voice in the home-screen app and locking the
screen). The owner's `agent-reach` skill can read recent Reddit / app-review threads ("teleparty app iphone",
"watch party app android 2026") to firm up §1.
