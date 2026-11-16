# Watch2Gether (competitor profile)

_Field research, 15 Nov 2026 (Research session). Method: web search excerpts; the vendor site was not reachable from
the cloud session unless said (`w2g.tv` and `community.w2g.tv` both failed to resolve: they would have to be allowed in
the session's network settings). **WEAK** = single / vendor / SEO source, **GUESS** = inference. Related: overview.md,
`../market-and-competitors-2026.md`, `../competitors-how.md`, `../more-players.md`, `../rakip-analizi.md` (§3.2)._

## At a glance
| | |
|---|---|
| What | The oldest "paste a link, share the room" site for watching together; rooms with a shared player, playlist and chat [1][2] |
| Platforms | Website (w2g.tv); browser extensions for Chrome, Firefox (desktop + Android), Edge and Opera [3][4][5][6]; **no native phone app** [7][8] |
| Services | Built-in "apps" in a source picker: YouTube, Vimeo, Dailymotion, Freesound, Web Radio, Apple Music, Podcasts, KLIPY, Coub, Mixcloud, "Streaming" (owner's observation, `../more-players.md`, 2 Nov 2026); SoundCloud and Twitch named by guides (WEAK) [9][10]; any other HTML5 site via the extension's **W2gSync** [11] |
| Talk | Text chat; webcams + mic for up to **10 people**, turned off when the room has **more than 50** people (peer-to-peer) [12] |
| Games | None found |
| Account | None to create or join a room; a **free account** to make a room permanent (else deleted after 24 h) [13][14] |
| Phone | Browser only; forum reports of iOS / iPad problems [15][16] |
| Price | Free with banner ads (and a default ad video); **PLUS** removes ads in rooms you visit, **PRO** removes them for everyone in rooms you create; billed yearly [17]. PLUS ≈ $2.90 / month ($34.80 / year), PRO ≈ $7.90 / month ($94.80 / year) (WEAK, third-party, possibly old) [18][19] |
| Size / ratings | Chrome Web Store ≈ 1,000,000 users, 3.4–3.5★ from ~106–129 ratings (snapshots, seen 15 Nov 2026) [3][20]; Firefox desktop 4.1★ (77), ~57.9 K users [4] |
| Status 2026 | Active; Chrome extension v10.6 (updated 5 May 2025), Firefox updated 12 May 2025 [3][4]; a UI redesign with a temporary "Beta Features" switch back to the old layout [21][22] |

## Product and platforms
- **Company:** Watch2Gether GmbH, Berlin (register HRB 216937 B, Charlottenburg local court; Turmstraße 20 A, 10559
  Berlin). The GmbH was set up in March 2020 as a spin-off of the sole proprietorship "Watch2Gether e.K." run by Florian
  Sailer [23]. The service itself is far older: guides date it to 2009 [24] (the earlier market doc said ~2011; 2009 is
  the more common date, WEAK).
- **Web first.** Everything happens on w2g.tv: "create your room", share the link, everyone plays the same video in a
  shared player, with a playlist and a chat [1][2].
- **Extensions:** the official extension (Chrome id `cimpffimgeipdhnhjohpbehjkcdpjolg`, publisher Watch2Gether GmbH)
  gives quick access to your rooms, shows who is online, shares the page you are on into a room and enables
  **W2gSync** [3][11]. A separate "Watch2Gether – Launcher" extension has ~2,000 users (v0.3.0, Jan 2023) [20].
- **No native apps:** competitors and guides agree that W2G has no iOS or Android app; it is used in the phone's
  browser [7][8]. Firefox for Android can install the extension [5].
- **Public API:** a documented REST API (on the community forum) creates a room with an API key and returns a
  `streamkey`; rooms open at `w2g.tv/rooms/<streamkey>` with a video preloaded; `sync_update` endpoints change the
  video. Staff mentioned plans for third-party apps inside W2G [25].

## Supported services and how
- **Built-in sources (no extension):** the search box has a source picker; each source plays in its official embedded
  player, so sync uses that player's API [9] (GUESS for the mechanism, consistent with `../more-players.md`). The
  owner saw: YouTube, Vimeo, Freesound, Web Radio, Apple Music, Podcasts, KLIPY, Coub, Dailymotion, Mixcloud,
  "Streaming" (2 Nov 2026). Guides add SoundCloud and Twitch [9][10]; one SEO guide lists TikTok, Instagram, X,
  Facebook (WEAK) [26]. Direct links to video files also play [24].
- **Podcasts / web radio:** listed in the picker (owner's observation); how episodes and stations are searched is not
  documented in anything found. **GUESS:** podcasts as RSS audio files and stations as plain audio streams, like our
  own plan in `../more-players.md`.
- **W2gSync (the extension):** paste the link of a page from an unsupported site into the W2G search bar; the
  extension then finds and controls the HTML5 `<video>` on that site in each person's own tab. **Every user needs the
  extension** and, on sites with a login, **their own login**; each user "links the video output" by hand. Flash is
  not supported; "some sites might not work correctly" [11][27].
- **DRM services:** W2G does not build Netflix / Disney+ / Prime in; its forum points to W2gSync for them, with each
  person's own account [9][27]. No source confirms that it works on those services today (unclear, not tested).
- **Embedding limits:** when YouTube blocks a video from embedding, W2G's answer is "use W2gSync" [11].
- **Sync:** a "Sync System Update" made sync "tighter and more robust", at the cost of small skips when everyone is
  pulled to the same moment [28] (undated).

## Room features
- Shared player and **playlists** (up to 1,000 items per list; import from outside up to 100 items) [29]; suggest /
  add-to-playlist controls [21]; YouTube playlist import via the playlist manager [14].
- **Chat** (not stored: comments and video history are not kept, "designed for the moment") [14].
- **Webcams and mic:** max 10 people at once; above 50 people in the room, cams and audio switch off; staff say the
  cam system is **peer-to-peer** and that a higher number was "being worked on", with no sign it shipped [12].
- **Room size:** no hard limit; sync and chat "for hundreds of users" [12][30].
- **Public rooms:** a forum thread asks about them (unclear if a directory exists) [17].
- Not found: reactions, votes, pins, games, screen share, recap.

## Onboarding and accounts
- **Host:** w2g.tv → "Create your room" → the room opens at once with a link; no sign-up [1][7].
- **Guest:** open the link, pick a name, watch; no sign-up [1].
- **Keeping a room:** temporary rooms are deleted after **24 hours**; with a free account the creator can save a room
  (Settings or the menu's "Save Room"); playlists survive, chat and history do not [13][14]. One paying user reports
  rooms staying temporary (unresolved thread) [13].
- **W2gSync adds steps:** install the extension, paste a page link, every person links their own tab [11].

## Phone experience
- Browser only, no app, no home-screen install documented [7][8]. Forum threads report the site not working on an iPad
  (iOS 13.5, a Plus member) and iOS trouble for a group listening to music together [15][16].
- The extension (and so W2gSync) is not available on phones except Firefox for Android; reviewers there ask for updates
  [5]. A 2025 alternatives article lists "lack of mobile apps" among the reasons people look elsewhere (WEAK) [31].

## Pricing, limits, ads and income
- **Ads** for everyone on the free tier: banners plus an ad video under the player. One forum thread: the ad video made
  the page scroll down by itself until the user turned on an ad blocker; staff said they would talk to the ad network
  [32]. Another thread: ads playing when entering a room [17].
- **PLUS:** no banner ads in any room you visit. **PRO:** no ads for all members of every room you create. Both yearly.
  Media platforms (YouTube) may still show their own ads [17].
- **Prices (WEAK):** PLUS $2.90 / month billed $34.80 / year [18][19]; PRO $7.90 / month billed $94.80 / year [19]
  (a page about two years old). The earlier market doc carries the same numbers; nothing newer was found.
- **Limits:** 10 cams, 50-person cam cut-off, 24 h temporary rooms, 1,000-item playlists, 100-item imports [12][13][29].
- **Income:** ads + PLUS / PRO subscriptions (GUESS: no other source of money found; the API has no price found).

## Privacy
- **Company in Germany → GDPR applies** (GUESS from the Berlin register entry [23]; the privacy policy itself could not
  be read).
- **Extension:** "may be used without entering personal information"; the developer says it stores nothing but a W2G
  session cookie [4][11]. Some users object to the broad permission warning (read page content on all sites) [11].
- **Third parties:** the extension's policy has sections for embedded services such as Twitch and SoundCloud, each with
  its own rules [33]; ads mean an ad network on the page (GUESS: tracking cookies with consent).
- **No account needed** for normal use; Common Sense Media notes it needs no registration and rates it 16+ for
  content found through its sources [34].
- Account deletion: not found.

## Store ratings and recurring complaints
| Store | Rating | Users / count | Seen |
|---|---|---|---|
| Chrome Web Store | 3.5★ (129 ratings); older snapshot 3.4★ (106) | ~1,000,000 users | 15 Nov 2026 [3][20] |
| Firefox (desktop) | 4.1★ (77 reviews); another snapshot 4.2★ (75) | ~57,898 users | 15 Nov 2026 [4] |
| Firefox (Android) | 40–76 reviews across snapshots; recent ones ask for updates | — | 15 Nov 2026 [5] |
| Edge, Opera | listings exist, numbers not found | (earlier doc: Edge ~40 K, WEAK) | [6] |
| App Store / Google Play | no W2G app | — | [7][8] |
| Trustpilot | no page found | — | — |

**Complaint themes:**
1. **Ads**: page jumping, ad video on entering; the main reason people pay or leave [17][32].
2. **Sync drift**: on videos over an hour, after pause / resume [28][35].
3. **The extension "only works with YouTube"**, episodes not changing for both people [20].
4. **Redesign**: more lag, buttons turned into small text links, too much empty space, smaller video; users asked for a
   way back [21][22]. Others liked the less cluttered look [21].
5. **Phones / iPad** not working well, no app [15][16][31].
6. **YouTube embed errors** ("This YouTube video cannot be played") [36].

## Recent changes (2025–2026)
- **May 2025:** extension v10.6 (Chrome, 5 May 2025) and Firefox update (12 May 2025) [3][4]. No newer store update
  found as of Nov 2026.
- **UI redesign** (date not in the excerpts; GUESS 2025): new layout, old one kept under "Beta Features" for a while;
  staff say both run the same code [21][22].
- **Sync System Update** (undated): tighter sync with visible skips [28].
- No 2026 announcement found: no app, no new source, no price change [37].

## Against Sidelit
- **Where they are ahead:** 15+ years of name and SEO; ~1 M Chrome users; many built-in sources (Dailymotion, web
  radio, Mixcloud, Apple Music…; Sidelit already has Vimeo and podcasts) that work **without an extension and on phones**; huge rooms (hundreds);
  10 cams vs our 4; a public API for bots / communities; Firefox, Edge and Opera extensions; Firefox Android support.
- **Where Sidelit is ahead:** no ads and no paid tier at all; saved rooms with no account; server-time sync engine with
  everyone-ready and "3-2-1 together" (their top complaint is drift); the extension overlays the room on the film page
  and works inside iframes (W2gSync needs a manual "link" step per person); Shorts "scroll together" and TikTok player;
  voice + cameras + screen share; table and side games; pins, votes, recap, reactions, custom emoji; an app-like phone
  site; HTTP fallback; English + Turkish UI.

## Ideas worth taking
1. **A source picker with more official players** (Dailymotion, web radio, Mixcloud; Sidelit's ⠿ Sources picker
   already has YouTube, Vimeo and the web, and podcasts are built). W2G's strongest
   point is that most sources need no extension and work on phones. Effort M per player (L for all); fit lane B; order
   already proposed in `../competitors-how.md` §4 and `../more-players.md`.
2. **"Paste a page link → the extension takes over" in one step** (check first: our "Go to the film" card may
   already cover this). W2gSync makes each person link their tab by hand;
   we can turn a pasted non-embeddable link into a "Start watching" card on that page for everyone. Effort S–M; lane B.
3. **A tiny public "create a room" link API** (e.g. `/new?v=<url>` that opens a room with the video queued), for
   Discord bots and community sites, the way W2G's `streamkey` API is used. No key, rate-limited on the server. Effort
   S–M; lane A. (Keep no-account: no API keys tied to accounts.)
4. **Large-room mode:** when a room grows past our voice / cam caps, keep sync + chat working for many viewers and say
   plainly why cams are off (W2G's 10 / 50 rule is easy to explain). Effort S (copy + caps already exist); lane A.
5. **Say "no ads, ever" where W2G users look** (store listing, home page, an "alternative to Watch2Gether" help page
   that is factual, not disparaging). Their ads and redesign complaints are steady. Effort S; Design / after store.
6. **Keep a layout switch during big redesigns** (their "Beta Features" toggle calmed users). Effort S; Design / lane A.
7. **Playlist import from a YouTube playlist link** into our queue (W2G caps imports at 100). Effort S–M; lane A
   (YouTube API quota).
- Conflicts: W2G's PLUS / PRO and ads conflict with "no ads, no paywall"; their account-only permanent rooms conflict
  with "no account" (we already save rooms without one). Not to copy.

## What could not be checked
- w2g.tv, its upgrade page, privacy policy, imprint and community forum (blocked); current exact prices; whether
  W2gSync works on DRM services today; the redesign's date; Edge / Opera numbers; whether a public room directory
  exists; whether TikTok / Instagram / Twitch are built-in sources or need W2gSync; account deletion steps.

## Sources
1. [How to use Watch2Gether? (community)](https://community.w2g.tv/t/how-to-use-watch2gether/736) — undated, seen 15 Nov 2026
2. [Let's meet on Watch2Gether](https://w2g.tv/en/room/) — seen 15 Nov 2026 (search excerpt)
3. [Chrome Web Store: Watch2Gether](https://chromewebstore.google.com/detail/watch2gether/cimpffimgeipdhnhjohpbehjkcdpjolg) — v10.6, 5 May 2025; seen 15 Nov 2026
4. [Firefox Add-ons: Watch2Gether](https://addons.mozilla.org/en-US/firefox/addon/w2g) — updated 12 May 2025; seen 15 Nov 2026
5. [Firefox for Android: Watch2Gether reviews](https://addons.mozilla.org/en-US/android/addon/w2g/reviews/?score=5) — seen 15 Nov 2026
6. [Edge Add-ons: Watch2Gether](https://microsoftedge.microsoft.com/addons/detail/watch2gether/gnngfboppiajgijnilagplgjbifghmml?hl=en-US) — seen 15 Nov 2026; [Opera add-ons](https://addons.opera.com/en-gb/extensions/details/watch2gether/)
7. [GroupTube: Watch2Gether alternative](https://group.tube/blog/alternative-to-watch2gether) — vendor, WEAK; seen 15 Nov 2026
8. [AlternativeTo: Watch2Gether](https://alternativeto.net/software/watch2gether/about/) — seen 15 Nov 2026
9. [W2gSync / built-in apps (community)](https://community.w2g.tv/t/how-to-use-w2gsync/8975) — seen 15 Nov 2026
10. [Educators Technology: Watch2Gether](https://www.educatorstechnology.com/2022/01/watch2gether-watch-videos-together-in.html) — Jan 2022
11. [How to use W2gSync (page 2)](https://community.w2g.tv/t/how-to-use-w2gsync/8975?page=2) — seen 15 Nov 2026
12. [Is there a limit on the number of people in a room?](https://community.w2g.tv/t/is-there-a-limit-on-the-number-of-people-in-a-room/347) — seen 15 Nov 2026
13. [How to make a room permanent](https://community.w2g.tv/t/how-to-make-a-room-permenent/509) and [Permanent rooms](https://community.w2g.tv/t/permanent-rooms/508) — seen 15 Nov 2026
14. [Saving / building playlists](https://community.w2g.tv/t/saving-building-playlists/548) and [How to save a playlist](https://community.w2g.tv/t/how-to-save-a-playlist/139404) — seen 15 Nov 2026
15. [Not working on iPad](https://community.w2g.tv/t/not-working-on-ipad/74026) — seen 15 Nov 2026
16. [iOS Mobile Support](https://community.w2g.tv/t/ios-mobile-support/125793) — seen 15 Nov 2026
17. [Watch2Gether upgrade page](https://w2g.tv/en/upgrade/) (search excerpt), [Ads playing upon entering a room](https://community.w2g.tv/t/ads-playing-upon-entering-a-room/134513), [Is there public rooms?](https://community.w2g.tv/t/is-there-public-rooms/179319) — seen 15 Nov 2026
18. [SyncUp: best watch party apps 2026](https://syncup.tv/blog/best-watch-party-apps-2026) — vendor, WEAK, ~May 2026
19. [ElectronicsHub: What is Watch2Gether?](https://www.electronicshub.org/watch2gether/) — WEAK, ~2024
20. [Chrome Web Store (older snapshot)](https://chrome.google.com/webstore/detail/watch2gether/cimpffimgeipdhnhjohpbehjkcdpjolg) and [Launcher](https://chromewebstore.google.com/detail/ehhgbeedijakegpamedkcbimjekflkma) — seen 15 Nov 2026
21. [UI Update Concerns](https://community.w2g.tv/t/ui-update-concerns/190319) and [Feedback Redesign](https://community.w2g.tv/t/feedback-redesign/74783) — undated
22. [Give us an option to revert…](https://community.w2g.tv/t/give-us-an-option-to-revert-back-to-the-previous-version-of-the-website/191400) — undated
23. [Online-Handelsregister: Watch2Gether GmbH](https://www.online-handelsregister.de/handelsregisterauszug/be/Charlottenburg-Berlin/HRB/216937B/Watch2Gether-GmbH) — register entries 2020
24. [Technicalustad: Watch2Gether alternatives](https://technicalustad.com/watch2gether-alternatives/) — 2025, WEAK
25. [Watch2Gether API Documentation](https://community.w2g.tv/t/watch2gether-api-documentation/133767) — seen 15 Nov 2026
26. [Watch party apps 2026 guide (GitHub Pages)](https://asdqwefz.github.io/inj/blog/best-watch-party-apps-2026.html) — competitor SEO page, WEAK
27. [W2gSync: own logins (community)](https://community.w2g.tv/t/how-to-use-w2gsync/8975) — seen 15 Nov 2026
28. [Sync System Update](https://community.w2g.tv/t/sync-system-update/117897) — undated
29. [FAQ: What are the limitations of Watch2Gether?](https://community.w2g.tv/t/faq-what-are-the-limitations-of-watch2gether/148839) — via `../rakip-analizi.md`, Oct 2026
30. [I need to host a large watch group](https://community.w2g.tv/t/i-need-to-host-a-large-watch-group-can-i/8150) — seen 15 Nov 2026
31. [Technicalustad (mobile apps complaint)](https://technicalustad.com/watch2gether-alternatives/) — 2025, WEAK
32. [Screen keeps scrolling down](https://community.watch2gether.com/t/it-keeps-scrolling-down-with-prompt-on-my-end/2560) — undated
33. [Firefox add-on privacy policy (ru page)](https://addons.mozilla.org/ru/android/addon/w2g/privacy) — seen 15 Nov 2026
34. [Common Sense Media: Watch2Gether](https://www.commonsensemedia.org/website-reviews/watch2gether) — seen 15 Nov 2026
35. [Sync issues with long videos](https://community.w2g.tv/t/sync-issues-when-playing-long-videos-on-watch2gether/196528) and [Video sync issues with YouTube on Chrome](https://community.w2g.tv/t/video-sync-issues-with-youtube-on-chrome/192172) — seen 15 Nov 2026
36. [Recurrent "This YouTube video cannot be played" error](https://community.w2g.tv/t/recurrent-video-playback-issue-this-youtube-video-cannot-be-played-error/198927) — seen 15 Nov 2026
37. Web searches "Watch2Gether 2026 new feature announcement", "Watch2Gether app Android iOS" — no result, 15 Nov 2026
