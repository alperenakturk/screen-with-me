# Teleparty (competitor profile)

_Field research, 15 Nov 2026 (Research session). Method: web search excerpts; the vendor site was not reachable from
the cloud session unless said (`ww1.teleparty.com` failed with ENOTFOUND). **WEAK** = single / vendor / SEO source,
**GUESS** = inference. Related: overview.md, `../market-and-competitors-2026.md`, `../competitors-how.md` §3 (phone
YouTube), `../mobile-app.md`._

## At a glance
| | |
|---|---|
| What | Watch-party extension that syncs each person's own streaming player and adds a chat; formerly "Netflix Party" (2016), renamed Teleparty in 2020 [1][2] |
| Platforms | Extension for Chrome, Edge, Opera (official) [3]; Firefox listing frozen since Apr 2024 [9]; Mac App Store listing [12]; Android app (beta) [3][10]; iOS app (2025, tied to Premium) [5][11] |
| Services | Free: Netflix, YouTube, Disney+, Hulu, HBO Max, Prime Video. Premium: Apple TV, Crunchyroll, Paramount+, Peacock, ESPN+, Funimation, JioHotstar, Star+ and more ("23 extra") [4][5] |
| Talk | Text chat, emoji reactions, GIFs; camera + microphone only for Premium users [5][6][7] |
| Games | none found |
| Account | None to join a free party; Premium needs an account [3][5] |
| Phone | Android beta app; iOS app behind Premium; desktop extension is the main product [3][5][11] |
| Price | Free tier + Premium $6.59 / month or $47.88 / year (support FAQ); App Store shows $6.95 / month, $49.95–49.99 / year [3][7][11] |
| Size / ratings | CWS 10 M+ users, 4.1★ (17,392 ratings); Edge 2 M+ users; Firefox 3.1–3.4★, ~47–55 K users; Play 4.2★, 5 M installs; iOS 2.5–2.6★; Trustpilot ~2 / 5 (11 reviews) [8][9][10][11][13] |
| Status 2026 | Active; extension 5.5.9 (Mar 2026) → 5.6.3 (Apr) → 5.7.x (Jun) [8]; v5.8.5 seen 8 Oct 2026 (`../../rakip-analizi.md`) |

## Product and platforms
- **Company:** Teleparty Inc. (CEO Shaurya Jain); lockdowns in March 2020 turned a niche couples' tool into a mass
  product (Parrot Analytics, Aug 2021) [14]. The iOS app's publisher is shown as **WP Interactive Media, Inc.** [11]
  (GUESS: the same group, a separate publishing entity).
- **Desktop extension:** Chrome, Microsoft Edge and Opera are the officially supported browsers [3]. Third-party
  guides still say "Firefox and Safari are not supported" while a Firefox listing exists [9][15]; the Firefox add-on was
  last updated 8 Apr 2024 and one tracker says it was removed on 18 Mar 2024 (conflict, **WEAK**) [9].
- **Mac App Store:** "Teleparty - Watch TV Together" (macOS 12+, free with in-app purchases, v5.4.8 on a mirror) is
  described as a browser extension [12] (GUESS: a Safari web-extension wrapper, which would give them Safari on Mac).
  A second Mac listing of the iOS app needs macOS 14.6 and Apple silicon [12].
- **Android:** "Teleparty - Watch Parties" (`com.teleparty.android`), officially a beta that "does not support all of
  our browser extension features" [3]; ~5 M installs [10].
- **iOS:** "Teleparty - Watch Party" (id1620026075), iOS 17.6+, free with in-app purchases, released Jun 2025 per
  trackers [11]. The Chrome Web Store text says Premium users can "unlock our iOS app" [5] — i.e. the iPhone app is a
  Premium feature, while older support text still calls iOS a closed beta (conflict) [11].
- **Party size:** up to 1,000 people in one party (official support excerpt) [3]; a 2026 comparison page says
  "unlimited" (**WEAK**) [7].

## Supported services and how
- **List (official comparison page, seen 15 Nov 2026)** [4]:
  - Free tier (6): Netflix, YouTube, Disney+, Hulu, HBO Max, Amazon Prime Video.
  - Premium tier: Apple TV, Crunchyroll, Paramount+, Peacock, ESPN+, Funimation, JioHotstar, Star+ and others; the CWS
    listing says "23 extra streaming services" [5]. Our Oct 2026 note counted 9 free + 23 Premium
    (`../../rakip-analizi.md`), so the free list changes over time.
  - A Mar 2024 App Store text named 19 services with Pluto TV and Tubi among the free ones [4] (not in the 2026 list,
    unconfirmed).
  - New service in 2026: Migu (China Mobile video) with 5.7.x in Jun 2026 (**WEAK**, aggregator) [8].
  - Not every service is available in every country (support) [3].
- **Who pays for what:** only the **host** needs Premium to start a party on a Premium service; guests join with the
  free extension [3][16]. **Every viewer needs their own subscription** to the streaming service; Teleparty gives no
  access to content [15][16].
- **How sync works:** the extension runs inside the service's own web player and relays play / pause / seek and
  position through Teleparty's server; DRM playback stays inside the service's player, nothing is re-streamed
  (GUESS from the product description and from how Sidelit's content script works; no technical write-up found) [15].
  Release notes are per-service fixes ("ad-based plans" on Amazon and Paramount+ in 5.1.8; Prime, Disney+ ad tiers in
  5.1.7) [17], which shows the cost: each service's player and ad breaks need their own adapter.
- **Phone:** to join on a phone, the guest needs the app and must be "logged into the streaming service … via our app"
  [16]. Netflix and other DRM services do not play in phone web views, so phone parties mostly cover what plays there
  (see `../competitors-how.md` §3 for the in-app YouTube web view; not repeated here).

## Room features
- **Sync:** host-driven playback sync for the whole party; frequent complaints about drift on episode changes (Hulu)
  and Prime [9] (`../market-and-competitors-2026.md`).
- **Chat:** text chat beside the video; Teleparty says it does **not store chat history** (privacy text, 2021) [18].
- **Reactions:** emoji reactions, emojis and GIFs since 2022 (v4.6.0) [6]; "custom reactions" are Premium [5].
- **Identity:** user icon + nickname; custom profile icons and badges are Premium perks [6][16].
- **Voice / camera:** only Premium users can turn on camera and microphone; others in the party see and hear them
  (`../competitors-how.md` table) [5].
- **Queue / playlist, games, screen share, votes:** none found.
- **Moderation:** host controls exist on desktop; on Android "host controls" are limited (**WEAK**) [16]. No kick /
  ban documentation found.

## Onboarding and accounts
- **Host (free service):** install the extension → open the film on the service → click the extension icon → "Start
  the party" → copy the link [2][15].
- **Guest:** install the extension → open the link (it opens the service's page) → be logged into the same service →
  click the extension icon if asked [2][15]. Everyone needs the extension; that is a known friction
  (`../../rakip-analizi.md`).
- **Premium service:** host signs in and pays; guests stay free [3].
- **Phone guest:** install the app, log into the streaming service inside it [16].

## Phone experience
- Android: beta app, not all features; reviewers say starting parties, host controls and video chat may be limited
  (**WEAK**) [16].
- iOS: Premium app since 2025, 2.5–2.6★ [5][11].
- Phone YouTube is a web view of YouTube's mobile site (`../competitors-how.md` §3).
- Netflix-class DRM services: the official line is that syncing is for the desktop extension [3].

## Pricing, limits, ads and income
- **Premium:** $6.59 / month or $3.99 / month billed yearly ($47.88) on the support FAQ [3]; App Store: $6.95 / month,
  $49.95 or $49.99 / year [11]; 7-day trial on the annual plan (`../../rakip-analizi.md`). Prices vary by store and
  region.
- **What Premium unlocks:** hosting on Premium services, camera / microphone, custom reactions, icons and badges, the
  iOS app [5][6].
- **Ads:** no ads in the extension found; income = subscriptions (GUESS: plus partnerships; the MIDiA case study is
  behind a login) [14].
- **Limits:** up to 1,000 people per party [3].

## Privacy
- **Policy (Firefox copy, effective 2 Jul 2021):** no stored chat messages; by using the service you authorise them to
  "gather, parse, and retain data related to the provision of the Service" [18].
- **Third-party summaries:** logs IP addresses while in use, may store browser and device data; cookies and tracking
  in part for Google Analytics; anonymised, aggregated data "for any purpose"; new uses with "reasonable efforts" to
  inform (**WEAK**, Deleteme) [19].
- **Permissions:** read and change data on the sites you visit [19]; extscope rates the permissions "medium risk" [8].
- **Ad partners:** none named in the excerpts found; the live CWS "privacy practices" block could not be read.
- **Incident:** one Trustpilot reviewer reports a pop-up "I'm watching you" through the plugin while not in a party
  (single review, unverified) [13].
- **Account deletion:** not found.

## Store ratings and recurring complaints
| Store | Numbers | Date / source |
|---|---|---|
| Chrome Web Store | 4.1★, 17,392 ratings, 10,000,000+ users | extscope, seen 15 Nov 2026 [8]; same in Jun 2026 (market doc) |
| Edge Add-ons | 2,000,000+ users; "(792)" shown (GUESS: rating count), average not seen | seen 15 Nov 2026 [20] |
| Firefox AMO | 3.1★ / 52 reviews, ~47,417 users; another snapshot 3.4★ / 46, 54,535 users | seen 15 Nov 2026 [9] |
| Google Play | 4.2★, 8,761–11 K ratings, ~4–5 M installs | grand-screen (updated 5 Sep 2025), AppGoblin [10] |
| App Store (iOS) | 2.6★ / 262 ratings (AppGoblin, Mar 2026); 2.5★ / 156 (App Pricing Lab); mwm.ai 1.7★ / 300 and 2.5★ / 960 (conflicting) | [11] |
| Trustpilot | ~2 / 5, 11 reviews | seen 15 Nov 2026 [13]; 2.2 in Jun 2026 (market doc) |

Complaint themes:
1. **Billing / cancelling:** "Unable to cancel subscription!" (Trustpilot, 12 Jul 2025); a trial user could not cancel
   because the site said they were not a member; one says they were charged for two years and had to go to the bank
   [13]. iOS reviews mention monetisation (**WEAK**) [12].
2. **Sync breaks** after service updates, on episode changes (Hulu), with ad tiers (Prime, Paramount+) [9][17].
3. **Everyone must install the extension**; desktop only for most services (`../../rakip-analizi.md`).
4. **Weak phone apps:** iOS 2.5★, Android beta [3][11].

## Recent changes (2025–2026)
- **Jun 2025:** iOS app released (trackers) [11]; 12 Jul 2025 billing complaint on Trustpilot [13].
- **5 Sep 2025:** last Android update seen by an aggregator [10].
- **Mar → Apr 2026:** extension 5.5.9 → 5.6.3 [8]; 5.5.2+ note: popup video-selection wording, chat logging bug [17].
- **Jun 2026:** 5.7.x, Disney+ playback fixes, Migu support (**WEAK**) [8].
- **8 Oct 2026:** 5.8.5 seen on CWS (`../../rakip-analizi.md`). Their changelog lives at teleparty.com/changelog
  (not reachable) [17].
- Nothing found on new features (games, queue) in 2025–2026; the product changes by service fixes and store apps.

## Against Sidelit
- **Where they are ahead:**
  - Netflix, Disney+, Prime, Max, Hulu and 20+ DRM services today (Sidelit: after 1.0).
  - 10 M users, store presence on Chrome / Edge / Mac / Play / App Store, brand known since 2020.
  - Native phone apps (even if weak) and an iOS presence.
  - Parties up to 1,000 people.
- **Where Sidelit is ahead:**
  - Free and complete: voice (6), cameras (4), screen share, custom emoji without a paywall; no account, nothing to
    cancel (their top complaint theme).
  - Any HTML5 video on any site, iframes included, not a fixed list.
  - Room features they lack: queue, pins, votes, saved rooms, recap, host / kick / ban, games, themes, ready-wait
    start.
  - Phone site that works with no install for YouTube / Shorts / TikTok / files.
  - Clear privacy story (no tracking to sell, no Google Analytics) — keep it that way.

## Ideas worth taking
1. **A public "Works with" page with a tested-on date per site / player.** Teleparty's comparison page is a clear,
   scannable list and the reason people pick it. Ours would list player stacks and legal demo sites, never piracy
   sites, and "any HTML5 video" as the headline. Effort S. Fit: lane B (+ Design for the page).
2. **Ad-break scenario in the embed harness.** Their release notes are mostly "fixed sync on ad-based plans". A
   harness case where one viewer gets a mid-roll ad (Video.js / JW Player demo with an ad plugin) and the room waits,
   then resumes together. Effort M. Fit: lane B.
3. **"Only the host needs X" pattern, applied to the extension.** A guest without the extension should still get into
   the room (chat, voice) with a one-click install path and a clear "you'll see the film when the extension is in"
   state, instead of a dead end. Effort M. Fit: lane B / lane A.
4. **"No account, nothing to cancel" as a store-listing line.** Their biggest complaint is billing; ours is the
   opposite. Copy is the owner's choice (slogan rule), so it goes to the Planner as a question. Effort S. Fit: Design /
   owner.
5. **Show the room's people limit in the UI and docs.** "Up to 1,000" is a selling point for them; we should state
   our own limits (voice 6, cameras 4, room size) plainly. Effort S. Fit: lane A.
6. **Mac Safari via a web-extension wrapper (after 1.0).** Their Mac App Store listing suggests the extension ships to
   Safari. Ties to `docs/internal/browser-support.md`. Effort L. Fit: after 1.0.
7. *Conflicts with our rules, listed only to reject:* paywalled cameras / custom reactions (paywall) and Premium-only
   services (paywall).

## What could not be checked
- teleparty.com support, comparison, Premium and changelog pages, the privacy policy's current text, the CWS "privacy
  practices" block and permission list (hosts blocked; search excerpts only).
- Exact current free / Premium service list (the 23 extra names), and whether Tubi / Pluto TV are still free.
- Edge average rating; current Firefox availability.
- Account deletion, ad / analytics partners beyond Google Analytics, the "browsing history" removal story in
  `../../rakip-analizi.md` §5 (no 2025–2026 source found).
- Whether Teleparty's sync really runs in-page (no technical write-up).

## Sources
1. [KnowYourMeme: Netflix Party](https://knowyourmeme.com/memes/sites/netflix-party) — seen 15 Nov 2026
2. [What Hi-Fi: Netflix Party is now Teleparty](https://www.whathifi.com/advice/how-to-use-netflix-party-watch-netflix-with-friends-online) — seen 15 Nov 2026
3. [Teleparty support (system requirements, Premium FAQ)](https://ww1.teleparty.com/support) and [dev mirror](https://dev.teleparty.com/support) — excerpts seen 15 Nov 2026
4. [Teleparty comparison page](https://www.teleparty.com/comparison) — excerpt seen 15 Nov 2026; [App Store JP, Mac listing text 2024](https://apps.apple.com/jp/app/id6471985961)
5. [Chrome Web Store: Netflix Party is now Teleparty](https://chromewebstore.google.com/detail/oocalimimngaihdkbihfgmpkcpnmlaoa) — excerpt seen 15 Nov 2026
6. [Softpedia: Teleparty 4.6.0 changelog](https://www.softpedia.com/progChangelog/Netflix-Party-Changelog-251069.html) — 2022; [eskimo.travel guide](https://www.eskimo.travel/en/blog/how-to-use-teleparty) — seen 15 Nov 2026 (**WEAK**)
7. [streamsharer comparison 2026](https://streamsharer.pages.dev/teleparty-alternative) — 2026 (**WEAK**, competitor page)
8. [extscope: Teleparty](https://www.extscope.org/extension/oocalimimngaihdkbihfgmpkcpnmlaoa) — seen 15 Nov 2026 (**WEAK**, aggregator)
9. [Firefox AMO listing](https://addons.mozilla.org/en-US/firefox/addon/netflix-party-is-now-teleparty/) and [reviews](https://addons.mozilla.org/en-US/firefox/addon/netflix-party-is-now-teleparty/reviews/); [firefox-stats](https://firefox-stats.com/d/teleparty-firefox) — seen 15 Nov 2026
10. [AppGoblin: com.teleparty.android](https://appgoblin.info/apps/com.teleparty.android); [grand-screen](https://grand-screen.com/apps/teleparty-watch-parties/); [AppBrain dev](https://www.appbrain.com/dev/Teleparty/) — seen 15 Nov 2026 (**WEAK**)
11. [App Store: Teleparty - Watch Party](https://apps.apple.com/app/id1620026075); [AppGoblin iOS](https://appgoblin.info/apps/1620026075) (Mar 2026); [App Pricing Lab](https://apppricinglab.com/app/apple/1620026075); [documentarytube iPhone guide](https://www.documentarytube.com/blog/how-to-enjoy-netflix-party-on-ipad-and-iphone-what-works-now/) — seen 15 Nov 2026
12. [App Store: Teleparty - Watch TV Together (Mac)](https://apps.apple.com/us/app/teleparty-watch-tv-together/id6471985961?mt=12); [iphoneaddict mirror](https://iphoneaddict.fr/apps/mac/divertissement/teleparty-watch-tv-together-76.html) — seen 15 Nov 2026
13. [Trustpilot: teleparty.com](https://uk.trustpilot.com/review/teleparty.com) and [pt](https://pt.trustpilot.com/review/teleparty.com) — reviews incl. 12 Jul 2025, seen 15 Nov 2026
14. [Parrot Analytics: can virtual socializing apps outlast the pandemic](https://www.parrotanalytics.com/press/can-virtual-socializing-apps-outlast-the-pandemic-2/) — Aug 2021; [MIDiA case study](https://midiaresearch.com/case-studies/teleparty) — login only
15. [TechRadar: how to use Teleparty](https://www.techradar.com/how-to/how-to-use-netflix-party-to-watch-tv-and-movies-together-online); [treblab guide](https://treblab.com/blogs/news/what-is-teleparty) — seen 15 Nov 2026
16. [eskimo.travel: how to use Teleparty](https://www.eskimo.travel/blog/how-to-use-teleparty); [Teleparty support](https://ww1.teleparty.com/support) — seen 15 Nov 2026 (**WEAK** for the Android limits)
17. [Chrome Web Store release notes excerpt](https://chromewebstore.google.com/detail/netflix-party-is-now-tele/oocalimimngaihdkbihfgmpkcpnmlaoa) — seen 15 Nov 2026
18. [Firefox AMO: privacy policy](https://addons.mozilla.org/firefox/addon/netflix-party-is-now-teleparty/privacy/) — effective 2 Jul 2021
19. [Deleteme: is Teleparty safe](https://joindeleteme.com/is-site-safe/is-teleparty-safe/) — seen 15 Nov 2026 (**WEAK**)
20. [Edge Add-ons: Teleparty](https://microsoftedge.microsoft.com/addons/detail/teleparty-formerly-netf/igbncjcgfkfnfgbaieiimpfkobabmkce) — seen 15 Nov 2026
