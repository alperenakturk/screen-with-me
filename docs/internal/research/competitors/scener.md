# Scener (competitor profile)

_Field research, 15 Nov 2026 (Research session). Method: web search excerpts; the vendor site was not reachable from
the cloud session unless said (other hosts failed with ENOTFOUND, so scener.com was not tried). **WEAK** = single /
vendor / SEO source, **GUESS** = inference. Related: overview.md._

## At a glance
| | |
|---|---|
| What | A "virtual movie theater": a Chrome extension + website that syncs each person's own streaming player, with video / audio / text chat, private rooms and big public "theaters" [1][2][3] |
| Platforms | Chrome extension (desktop); website; iPhone app (beta May 2022; iOS 15+), app page still live [4][5][6] |
| Services | Netflix, Disney+, Prime Video, HBO Max, Hulu, Funimation, YouTube, Vimeo (US list; varies by country); **each guest needs their own subscription** [2][7] |
| Talk | Text chat free; **video and audio chat are Premium**; up to 10 people on camera [2][8] |
| Games | None |
| Account | Required (a free Scener account for every participant) [9] |
| Phone | Join / watch from the app; hosting is desktop-only (WEAK); app hosts YouTube and Tubi parties [6][10] |
| Price | Free + **Premium $5.79 / month or $39.99 / year** (vendor page) [8]; 2026 guides cite $4.99 or $9.99 (WEAK) [10][11] |
| Size / ratings | Chrome Web Store ~1 M users, ~3.0–3.1★ from ~352–357 ratings (WEAK trackers) [12][13]; $2.1 M seed (Oct 2020) [14] |
| Status 2026 | **Alive but quiet:** extension v7.1.9 updated 6 Aug 2026 (WEAK, via search summary) [15]; v7.1.8 on 16 Jul 2026 [13]; no 2025–2026 press; two SEO blogs claim it shut down (unconfirmed) [10][16] |

## Product and platforms
- Seattle company, launched 2018, incubated by **RealNetworks** and Jason Calacanis' LAUNCH accelerator [17][18].
- **Seed $2.1 M, early Oct 2020**, led by SeaChange (with Glaser Investments, The Syndicate) [14][19].
- People: Joe Braidwood (co-founder, COO, 2020); David Baron (CEO, 2022 release) [17][20].
- Positioning: "virtual theater" for co-watching, creators and studio events; later a "social TV" app [3][5].
- **iPhone app (12 May 2022, free beta, US):** universal search across services, Roku remote control, two-person
  synced parties with chat on the phone while the TV plays [5][21]. Today's mobile page: start and join parties,
  host **YouTube and Tubi** parties in a single-screen view; premium services "coming soon" (vendor) [6].
- Android: no app found.

## Supported services and how
- **Extension model, own subscriptions:** the extension syncs each viewer's own player; the FAQ says each guest needs
  their own account for most services, and support varies by country [7]. YouTube and Vimeo need no account; Hulu and
  Funimation were listed as needing ad-free tiers [7]. Same model as Teleparty and Sidelit's planned 1.x adapters
  (no stream relay, DRM untouched).
- **Studio partnerships (the differentiator):**
  - **HBO (May 2020):** official co-viewing deal for HBO Now / HBO Go, not HBO Max at launch [17][22].
  - **HBO Max events:** Doom Patrol S3 live watch party (23 Sep 2021); **DMZ** virtual premiere with creators and
    cast (15 Mar 2022) [20][23].
  - **Comic-Con@Home** exclusive watch-party affiliate (2020) and again in 2021 (two virtual theaters, classic films)
    [24][25][26].
  - **RiffTrax** live riff events (2020) [24][27].
- Sync: GUESS: server-driven timestamp sync through each person's player (same family as ours); details not public.
- Video chat ran on Agora's SDK (Agora success story, WEAK) [28].

## Room features
- **Private rooms:** up to **10 people with video, audio and text chat** [8].
- **Theaters:** up to **10 co-hosts on camera** and up to **1 million** text-only viewers (2020) [24].
- Text chat for everyone; reactions not confirmed.
- 2026 store copy (via search summary, WEAK): skip intros, playback adjustment, custom profile pictures [15].
- No games, no queue / playlist found, no screen share (by design: own players).
- Moderation: hosts and co-hosts on stage; other tools not found.
- Requirements: webcam for video chat, headphones recommended (vendor FAQ) [8].

## Onboarding and accounts
- **Host:** install the Chrome extension → sign up → pick a service and title → open a private room or theater →
  share the link [1][9].
- **Guest:** install the extension (desktop) **and** create a free Scener account **and** have their own subscription
  to the service [7][9]. Three hurdles before the film starts.
- Phone guests can join from the app; joining a room is "only possible from a laptop or desktop" per an older help
  page (conflict; WEAK) [10][29].

## Phone experience
- iPhone app since 2022 (beta), TV control on Roku, two-person sync [5][21]. Current page: YouTube and Tubi parties in
  one screen; big services not yet [6].
- No Android app found. GUESS: the phone app is a companion, not a full room.

## Pricing, limits, ads and income
- **Free:** synced parties, text chat, theaters as a viewer [8].
- **Premium: $5.79 / month or $39.99 / year** (scener.com/premium, seen 15 Nov 2026): video chat, audio chat, "no
  ads", early access to new features [8][2].
- 2026 third-party guides disagree: "$4.99 / month for groups larger than 4" and "$9.99 / month" (both WEAK) [10][11].
- "No ads" as a Premium perk implies the free tier shows ads (GUESS) [8].
- Income: Premium + studio / event partnerships (HBO, Comic-Con, RiffTrax) [20][22][24].

## Privacy
- Policy text not retrieved; data collection not confirmed.
- An account is required for everyone, so e-mail / profile data are held by Scener (GUESS).
- Account deletion: a Product Hunt reviewer says that after deleting the account Scener "no longer acknowledges my
  account" yet kept charging for ~8 months [30]; PissedConsumer reviewers say they could not cancel online or reach
  support [31]. Treat as a small sample (3–4 reviews).

## Store ratings and recurring complaints
| Store | Number | Date |
|---|---|---|
| Chrome Web Store (via ExtScope) | ~1 M users, 3.1★, 352 ratings, MV3 [12] | seen 15 Nov 2026, WEAK |
| Chrome Web Store (via Extension Auditor) | 1,000,000 users, 3.0★, 357 ratings, v7.1.8, updated 16 Jul 2026 [13] | seen 15 Nov 2026, WEAK |
| PissedConsumer | 1.0★ from 3 reviews [31] | seen 15 Nov 2026 |
| App Store / Google Play | no rated listing found | seen 15 Nov 2026 |
| Trustpilot | no Scener page found | seen 15 Nov 2026 |

Complaint themes:
1. **Billing after cancelling / cannot cancel / no support** [30][31] (matches the 2023 themes in `rakip-analizi.md`).
2. **"Not working" spells** (2023 store reviews noted in older research; a late-2023 to Mar-2024 cluster could not be
   tied to Scener's listing for sure) [32].
3. **Friction:** extension + account + subscription for every guest (GUESS from the flow; the FAQ itself warns to pick
   a service everyone has) [7].
4. Status confusion: SEO blogs tell readers Scener "shut down" or was "acquired in 2022 and wound down" [10][16].

## Recent changes (2025–2026)
- **Not dead:** the Chrome extension shipped v7.1.8 (16 Jul 2026) and v7.1.9 (6 Aug 2026), both WEAK (trackers /
  search summary) [13][15]. This **corrects** `market-and-competitors-2026.md` ("dormant since Sep 2023").
- Premium page still sells $5.79 / $39.99 [8]; mobile page promotes YouTube / Tubi parties [6].
- No press, funding, partnership or acquisition news found for 2023–2026. The "acquired in 2022" claim has no source
  behind it (WEAK, competitor blog) [16].
- Competitors (WatchAlong, SyncUp, Kosmi) run "Scener alternative" pages [16][33][34].

## Against Sidelit
- Where they are ahead:
  - **Big DRM services today** (Netflix, Disney+, Prime Video, HBO Max, Hulu) with own subscriptions [7].
  - **Studio relationships and event history** (HBO, HBO Max premieres, Comic-Con@Home, RiffTrax) [20][22][24].
  - **Theater mode at scale** (10 on stage, up to 1 M watching) [24].
  - A Chrome Web Store listing with ~1 M installs [12].
- Where Sidelit is ahead:
  - **No account for anyone**; Scener needs one per guest.
  - **Voice and cameras free** (Scener: Premium).
  - **Any HTML5 video site** through the extension, not a fixed list; YouTube, Shorts, TikTok and files on the site
    with no install.
  - **Phone site** that runs a full room; Scener's phone app is a companion.
  - Games, reactions, custom emoji, queue, pins, votes, saved rooms, recap; HTTP fallback; English + Turkish.
  - Visible, active development vs a quiet product with billing complaints.

## Ideas worth taking
1. **Premiere / event mode** (later "cinema mode"): one stage of up to 4 cameras (we already cap cams at 4) and a large
   text-only audience with slow-mode chat. Why: Scener's theaters were its press magnet (Comic-Con, RiffTrax). Effort L.
   Fit: lane A, after 1.0 (server load and moderation first).
2. **Creator / community nights without studios:** a "host a public watch night" guide for YouTube creators (their
   own video, our room link in the description). Why: Scener's spikes came from hosted events. Effort S (copy) to M
   (scheduled room + countdown). Fit: lane A + Research.
3. **Cancellation-proof by design:** say on the help page that Sidelit has no account, no subscription and nothing to
   cancel. Why: billing-after-cancel is the top complaint for Scener (and Teleparty). Effort S. Fit: lane A copy.
4. **Per-guest service check** for the coming DRM adapters: before start, each person sees "you need your own
   <service> account" and a ready tick only once their player loads. Why: Scener's FAQ warns hosts to pick a service
   everyone has; we can show it in the ready wait. Effort M. Fit: lane B, after 1.0.
5. **Skip-intro sync** for the DRM adapters: when one person presses skip intro, everyone jumps together. Why: listed
   as a 2026 Scener feature (WEAK). Effort M. Fit: lane B, after 1.0 (only via the site's own player, never bypassing
   anything).
6. **Phone as a TV remote** (Scener 2022 idea): the phone controls the room while the TV shows the film. We already
   plan Google Cast after 1.0; this frames it. Effort L. Fit: after 1.0.

## What could not be checked
- scener.com pages directly (FAQ "how many people can join" answer cut off; privacy policy; current Premium list).
- Official Chrome Web Store rating and date (only trackers / search summaries).
- Whether the iPhone app is still in the App Store; any Android app.
- Who owns or funds Scener now; any acquisition (no source found).
- How the sync works technically.

## Sources
1. [Chrome Web Store: Scener](https://chromewebstore.google.com/detail/scener/lkhjgdkpibcepflmlgahofcmeagjmecc) — seen 15 Nov 2026 (search excerpt)
2. [Scener FAQ](https://scener.com/faq) — seen 15 Nov 2026 (search excerpt), vendor
3. [Seattle Met: the virtual movie theater is becoming a thing](https://www.seattlemet.com/arts-and-culture/2020/10/how-the-virtual-movie-theater-is-becoming-a-thing-seattle-scener) — Oct 2020
4. [MacTech: Scener app in beta for iPhone](https://www.mactech.com/2022/05/13/scener-an-app-for-sharing-entertainment-available-in-beta-form-for-the-iphone) — 13 May 2022
5. [BusinessWire: Scener launches mobile app](https://www.businesswire.com/news/home/20220512006025/en/) — 12 May 2022
6. [Scener: mobile app](https://www.scener.com/mobile-app) — seen 15 Nov 2026, vendor
7. [Scener FAQ (services, own accounts, countries)](https://scener.com/faq) — seen 15 Nov 2026, vendor
8. [Scener Premium](https://scener.com/premium) — seen 15 Nov 2026, vendor
9. [Nerds and Beyond: Comic-Con@Home and Scener 2021](https://nerdsandbeyond.com/?p=128338) — 2021
10. [agoodmovietowatch: best streaming services to host a watch party 2026](https://agoodmovietowatch.com/cord-cutting/best-watch-party-streaming-services/) — 2026, WEAK
11. [Watchly Party: best watch party apps 2026](https://watchlyparty.com/best-watch-party-apps) — 2026, WEAK
12. [ExtScope: Scener](https://www.extscope.org/extension/lkhjgdkpibcepflmlgahofcmeagjmecc) — seen 15 Nov 2026, WEAK
13. [Extension Auditor: Scener scan](https://extensionauditor.com/scan/scener-lkhjgdkpibcepflmlgahofcmeagjmecc) — seen 15 Nov 2026, WEAK
14. [VentureBeat: Scener raises $2.1 million](https://venturebeat.com/business/scener-raises-2-1-million-for-virtual-theater-parties-that-ease-social-isolation) — Oct 2020
15. [Chrome Web Store: Scener (v7.1.9, 6 Aug 2026 per search summary)](https://chromewebstore.google.com/detail/scener/lkhjgdkpibcepflmlgahofcmeagjmecc) — seen 15 Nov 2026, WEAK
16. [WatchTogether: best watch party websites 2026](https://watchtogether.watch/blog/best-watch-party-websites) and [WatchAlong: Scener alternatives](https://watchalong.me/blog/scener-alternatives/) — 2025–2026, WEAK (competitors)
17. [Yahoo / Variety: HBO and Scener set social co-view deal](https://www.yahoo.com/entertainment/hbo-scener-set-social-co-163332350.html) — May 2020
18. [Yahoo: Scener supports 10 platforms, raises $2.1 M](https://news.yahoo.com/watch-party-startup-scener-now-163042686.html) — Oct 2020
19. [PRWeb: Scener raises $2.1 M led by SeaChange](https://www.prweb.com/releases/scener-raises-2-1-million-in-seed-funding-led-by-seachange-debuts-virtual-theater-as-new-creator-community-for-streaming-entertainment-844125548.html) — Oct 2020
20. [BusinessWire: HBO Max and Scener DMZ virtual premiere](https://www.businesswire.com/news/home/20220315006328/en) — 15 Mar 2022
21. [GeekWire: Scener launches new app](https://www.geekwire.com/2022/social-tv-platform-scener-launches-new-app-to-enhance-how-viewers-stream-across-services/) — May 2022
22. [Built In: Scener partners with HBO](https://builtin.com/articles/scener-hbo-virtual-viewing-parties) — May 2020
23. [Scener and HBO Max: Doom Patrol S3 watch party](https://journalofcyberpolicy.com/?p=27625) — Sep 2021, WEAK
24. [GeekWire: Scener sees huge growth, Comic-Con screenings](https://www.geekwire.com/2020/scener-sees-huge-growth-social-streaming-startup-set-host-virtual-comic-con-screenings/) — Jul 2020
25. [Bleeding Cool: Comic-Con@Home and Scener](https://bleedingcool.com/tv/comic-conhome-scener-teaming-for-watch-party-virtual-screenings) — Jul 2020
26. [Nerds and Beyond: Comic-Con@Home 2021 with Scener](https://nerdsandbeyond.com/?p=128338) — Jul 2021
27. [AV Club: RiffTrax going online](https://dev.avclub.com/the-rifftrax-crew-on-going-online-and-upside-down-durin-1844443286) — 2020
28. [Agora: Scener success story](https://www.agora.io/en/success-stories/scener) — undated, WEAK (vendor)
29. [Scener: watch party tips](https://www.scener.com/watch-party-tips) — seen 15 Nov 2026, vendor
30. [Product Hunt: Scener reviews](https://www.producthunt.com/products/scener/reviews) — seen 15 Nov 2026
31. [PissedConsumer: Scener](https://www.pissedconsumer.com/scener/RT-F.html) — seen 15 Nov 2026, WEAK (3 reviews)
32. [Chrome Web Store reviews page (extension not identified)](https://chromewebstore.google.com/detail/khdnaopfklkdcloiinccnaflffmfcioa/reviews?hl=en) — 2023–2024, WEAK
33. [SyncUp: Scener alternative](https://syncup.tv/scener-alternative) — seen 15 Nov 2026, WEAK (competitor)
34. [Kosmi blog: best Scener alternative](https://blog.kosmi.io/p/kosmiio-is-the-best-scener-alternative) — undated, WEAK (competitor)
