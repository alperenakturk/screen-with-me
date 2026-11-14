# Research: how the others do it (voice costs, Rave v. Apple, Teleparty's in-app YouTube, a "Sources" grid)

_Research session, 14 Nov 2026, Job 12 from the Planner. Read-only. Not legal advice. From this cloud session most
company sites, store pages, court PDFs and the Vimeo / Dailymotion developer sites could not be opened (blocked
hosts); the evidence is search excerpts, press and official pages where they opened. **GUESS** marks an inference;
**WEAK** marks a single or low-quality source. Related: `mobile-app.md` (13 Nov), `market-and-competitors-2026.md`,
`more-players.md`._

## Short answers
1. **They are free with more people because someone pays a server bill, or because they cap like we do.**
   - Discord runs its own SFU paid by Nitro and venture money.
   - Teleparty puts cameras and microphones behind Premium.
   - Watch2Gether turns cameras off above 10 people.
   - Hyperbeam sells its cloud browser by the minute.
   - Rave is ad-funded.
   - Nobody gives a free, ad-free, account-free SFU to everyone. Cloudflare's SFU would cost us nothing up to 1,000 GB a
     month, then $0.05 / GB with no spending cap.
2. **Rave v. Apple.** Apple removed Rave and closed its developer account in Aug 2025, citing "dishonest or fraudulent
   activity". Apple says the cause was repeated violations: pornographic and pirated content, and complaints about
   child sexual abuse material. Rave sued Apple on 7 May 2026 (antitrust, "Sherlocking" for SharePlay) in New Jersey,
   plus Canada, Brazil, the Netherlands and Russia. On 3–4 Nov 2026 the US case was moved to the Northern District of
   California. There is no ruling on the merits.
3. **Teleparty's phone YouTube is a web view of YouTube's own mobile site** (GUESS from the screenshots), synced by
   a script in the page like their extension does. YouTube's API rules don't cover them if they use no YouTube API,
   only YouTube's general Terms; nobody has enforced those against them so far. We are a YouTube API client (search,
   embeds, an audit ahead), so the API rules bind us and the risk is our key and quota. `mobile-app.md` stands.
4. **Sources grid: yes, from official sources only.** Order: YouTube (have), podcasts (have), Vimeo search (have the
   player), Internet Archive and Wikimedia Commons (public domain / open licences, direct files our player already
   plays), Dailymotion (needs a new player), then "paste any link". **No in-app "search the web" browser.**

## 1. Voice and video for free: who pays?

### Our situation
- **Mesh:** every person in voice connects directly to every other person (`VOICE_MAX_P2P` 6, cameras `CAM_MAX` 4).
  Upload grows with the group: 5 others × 300 kbit/s of camera = 1.5 Mbit/s up per person, too much for many home
  lines. That is why caps of about 4–6 cameras are normal for a mesh.
- **SFU:** each person sends once to a server, the server forwards. Upload stays flat, the server pays the download
  traffic (egress). Our code already has an SFU path (Cloudflare Realtime, `VOICE_MAX` 10; reference "Voice chat"),
  turned off because Cloudflare needs a card and has no spending cap (owner, Oct 2026).

### Who does what

| Product | Voice / camera transport | Limits found | Who pays |
|---|---|---|---|
| **Watch2Gether** | WebRTC in the browser; mesh or server **not published** (GUESS: mesh, because of the 10-camera cap) | "If a room hosts more than 10 users, the webcam feature will automatically be disabled"; sync and chat "hundreds of users per room" ([W2G community](https://community.w2g.tv/t/is-there-a-limit-on-the-number-of-people-in-a-room/347), [AlternativeTo](https://alternativeto.net/software/watch2gether/about/)) | ads + an optional "+Plus" subscription ([community](https://community.w2g.tv/t/privacy-and-passwords/64346), price not found) |
| **Teleparty** | not published | "Only Teleparty Premium users can turn on their camera and microphone"; up to 1,000 people in a party (official support excerpt) | **Premium** ($6.59 / month or $47.88 / year, market doc); others in the party can see and hear Premium users ([teleparty.com/support](https://www.teleparty.com/support), [anidachi](https://www.anidachi.app/guides/is-teleparty-free)) |
| **Rave** | not published; vendor not found | not found | **ads**: Rave's own complaint says it "relied mostly on advertising revenue" (Reuters via [MacRumors](https://macrumors.com/2026/05/07/apple-rave-app-store-lawsuit/)) |
| **Kosmi** | not published | "Premium unlocks higher-resolution screen share and bigger rooms" (own pages, no numbers) | **Premium** + Kosmi's own SEO traffic |
| **Hyperbeam** | a **cloud browser**: a server runs the browser and streams the picture to everyone (WebRTC, GUESS from the product) | per participant-minute | sells an API: 10,000 free minutes a month, then $0.007 per participant-minute ([webfolio](https://www.webfolio.to/tools/hyperbeam), WEAK, may be old) |
| **Discord Watch Together** | YouTube's **embedded player** in an Activity; voice on Discord's **own SFU** ("a media relay component called the selective forwarding unit", [Discord engineering](https://discord.com/blog/how-discord-handles-two-and-half-million-concurrent-voice-users-using-webrtc)) | playback 180 min in a group / 30 min alone, no YouTube sign-in ([Discord support](https://support-apps.discord.com/hc/en-us/articles/26502500234519-Watch-Together)) | Nitro subscriptions + venture money; voice is its core product |

### What the server route would cost us (rough sums)
Cloudflare Realtime SFU: **$0.05 per GB leaving Cloudflare, first 1,000 GB a month free**, shared with TURN; traffic
sent into Cloudflare is free ([Cloudflare pricing](https://developers.cloudflare.com/realtime/sfu/pricing/)). Others for
comparison: Agora, first 10,000 minutes a month free, then voice $0.99 / 1,000 participant-minutes
([Agora](https://www.agora.io/en/pricing/agora-rtc)); LiveKit Cloud's free tier could not be confirmed (WEAK).

| Room | Each person downloads | Room egress / hour | Free hours a month (1,000 GB) | Cost per extra hour |
|---|---|---|---|---|
| 10 people, voice only (≈ 32 kbit/s each) | 9 × 32 = 288 kbit/s | ≈ 1.3 GB | ≈ 770 room-hours | ≈ $0.07 |
| 10 people, 4 cameras (≈ 300 kbit/s each) + voice | ≈ 1.5 Mbit/s | ≈ 6.8 GB | ≈ 150 room-hours | ≈ $0.34 |
| 4 people, 4 cameras | ≈ 1 Mbit/s | ≈ 1.8 GB | ≈ 550 room-hours | ≈ $0.09 |

So a small launch would most likely stay inside the free 1,000 GB. Abuse or one popular streamer could not: there is no
spending cap, so the server would need its own daily byte budget (like our YouTube unit budget) before an SFU goes on.
**Suggestion:** keep the mesh; later offer the SFU only for rooms over 6 in voice, behind a server-side daily budget
that falls back to the mesh caps. This is the owner's money decision (card on file, no cap).

## 2. Rave v. Apple (dated)
- **Before:** Rave (Rave Inc., Hamilton, Ontario) is a co-watching app: YouTube, Drive and streaming sites inside the
  app, public rooms with strangers, financed by ads (market doc).
- **13 Aug 2025:** Apple notified Rave in App Store Connect that its Developer Program account had been flagged for
  removal, removed the iOS app and revoked its Developer ID certificates (the Mac app). Stated reason: "dishonest or
  fraudulent activity" (Rave's complaint, via [search excerpt](https://cdn.saverave.com/legal/Federal_Antitrust_Lawsuit_United_States_%28D_N_J%29.pdf);
  [AppleInsider](https://appleinsider.com/articles/26/05/07/shareplay-is-not-why-co-streaming-app-rave-was-kicked-off-the-app-store)).
- **Apple's side** (to Reuters): removed "following repeated guideline violations, which we communicated to the
  developer on multiple occasions", citing **hosting and sharing pornographic and pirated content and user complaints
  about child sexual abuse material**. Rave calls the abuse-material claims "baseless" and points to its own
  machine-learning flagging and manual review ([PYMNTS](https://www.pymnts.com/cpi-posts/small-canadian-tech-firm-mounts-global-antitrust-fight-against-apple-after-app-removal/),
  [PhoneArena](https://www.phonearena.com/news/popular-but-controversial-app-takes-apple-to-court-wants-back-on-the-app-store_id180274)).
- **7 May 2026:** **Rave sued Apple** (Apple did not sue Rave) in the US District Court for the District of New Jersey,
  with parallel actions in Canada (Competition Tribunal), Brazil, the Netherlands and Russia
  ([BusinessWire](https://secure.businesswire.com/news/home/20260506587441/en/Rave-Sues-Apple-in-Five-Countries-Over-App-Store-Removal),
  [BetaKit](https://betakit.com/rave-takes-fight-with-apple-over-app-store-removal-to-canadas-competition-tribunal/)).
  - **Claims:** monopolisation of iPhone app distribution. The removal was a pretext: Rave earned through ads, not
    in-app purchases that pay Apple commission, and competed with **SharePlay** ("Sherlocking"). Also a false malware
    warning on the Mac app.
  - **Asks:** reinstatement and "hundreds of millions of dollars" ([Bloomberg Law](https://news.bloomberglaw.com/antitrust/rave-sues-apple-for-kicking-its-co-viewing-product-off-app-store),
    [MacRumors](https://macrumors.com/2026/05/07/apple-rave-app-store-lawsuit/)).
- **Apple:** "We reject these baseless allegations."
- **3 Nov 2026 (reported 4–5 Nov):** Judge William J. Martini granted Apple's motion and **transferred the case to the
  Northern District of California**, mainly because of the forum clause in Apple's developer agreement
  ([PYMNTS](https://www.pymnts.com/cpi-posts/apple-wins-bid-to-move-rave-antitrust-lawsuit-to-california/),
  [AppleInsider](https://appleinsider.com/articles/26/11/05/raves-anti-sherlocking-suit-delayed-as-apple-gets-it-moved-to-california)).
- **Status:** no ruling on the merits; the docket number and next step were not found (PACER not reachable).
- **For us:** the stated reasons are content safety (strangers' rooms, adult and pirated material), whatever the
  real motive. Our rooms are private links with no public rooms. Before any iOS app we need report, block, a filter
  and a contact (Apple 1.2, `mobile-app.md`), and we never offer public rooms with strangers.

## 3. How Teleparty's phone app shows YouTube inside the app
**What the screenshots show:** YouTube's mobile site (its search bar, Home / Shorts / You tabs) above Teleparty's own
tab bar. That is YouTube's web page (m.youtube.com) loaded in an in-app web view, not an API result list: the YouTube
Data API returns data, never YouTube's own page and tabs. **(GUESS, strong: the app itself could not be opened.)**

**How they likely sync (GUESS):** the same way their desktop extension does. A script injected into the web view
finds the page's `<video>` element and drives play, pause and seek from their party server. iOS (WKWebView user
scripts) and Android (WebView `evaluateJavascript`) both allow this for any page the app opens.

**Is it allowed?**
- **YouTube API Services Terms / Developer Policies** bind *API clients*. If Teleparty's app calls no YouTube API, these
  do not reach it. Our clauses (III.F.1, III.I.4 / III.I.6, III.E.6) are in `mobile-app.md` §3.1.
- **YouTube's Terms of Service** bind every user and arguably the app. A 2017 version said content may be accessed
  only through "the video playback pages of the Service itself, the Embeddable Player, or other explicitly authorized
  means" ([archive](https://web-wp.archive.org/web/20170811164130/https:/www.youtube.com/t/terms)). The current text
  forbids access "using any automated means" and circumventing or interfering with the service (WEAK, not opened here).
  A web view of youtube.com is a browser and arguably a "playback page"; a script that drives YouTube's player from
  outside is the grey part.
- **Enforcement:** Google enforces case by case. No action against Teleparty's app was found. Google sign-in does not
  work inside web views (`disallowed_useragent`), so users watch logged out. That also means no YouTube Premium, so
  people see ads. YouTube is unlikely to mind that.
- **App stores:** Apple 5.2.2 asks for authorisation "upon request" for third-party content. A reviewer may never ask.

**Reconciling with `mobile-app.md`.** Both are true: Teleparty ships it, and it is not allowed *for us*.
- We are a YouTube API client: search, Shorts pools and the IFrame player are under the API terms.
- We are about to apply for the API audit, which reviews the whole product.
- A breach can cost us the API key, i.e. search, Discover and the quota increase.
- Teleparty has none of that to lose for this feature, and a paid business to fund lawyers.
- The owner's surprise is fair: the rule is "not enforced against them so far", not "allowed".
- **Our way to the same comfort:** our own search and Discover screen (Room / Search / Me tabs), plus "Share →
  Sidelit" from the real YouTube app (Android share target, `mobile-app.md` §4).

**Netflix and others on phones.**
- Teleparty's own support page says syncing is for the desktop extension; the Android app is described as a beta
  without all features, and the iOS app as closed beta or limited (sources conflict).
- Netflix does not play in phone browsers; phones must use the Netflix app (GUESS from Netflix's long-standing help
  text, not re-verified).
- A web view of netflix.com cannot play on a phone without DRM support the web view lacks. **They don't break DRM; it
  simply doesn't play.** That matches the complaints ("unsupported video format", "watch it in the Netflix app";
  `mobile-app.md` §1).
- Services that do play in a phone web view (some free, ad-supported sites, YouTube) work the same way as above.

## 4. The owner's idea: a "⠿ Sources" grid next to 🔍 Search
Rules that apply to every source:
- official API or official embed only;
- the official player, with nothing over it where the provider requires that;
- a neutral listing (no film or series names in our texts);
- no piracy sites, ever;
- DRM never bypassed;
- a provider's name appears only if it really works.

| Source | Search (website) | Player | In a later app (PWA / TWA / Capacitor) | Verdict |
|---|---|---|---|---|
| **YouTube** | ✅ Data API, have it (10,000 units / day, 100 per search; our budget 9,000) | ✅ IFrame player, have it | same; Capacitor needs the app-ID Referer (`mobile-app.md` §3.1) | have |
| **Podcasts** (Apple iTunes Search, no key) | ✅ have it | ✅ our html5 player | same | have |
| **Vimeo** | 🟡 the current API documents video search with a `query` (third-party guides; not opened here); rate limits per plan, 429 when exceeded ([Vimeo help](https://help.vimeo.com/hc/en-us/articles/12427783954065-Rate-limits), numbers WEAK); needs an app token in the Worker (a new secret) | ✅ have it (card P1, Vimeo's own player) | same | **add search: 1st new source** (player done, one Worker route, one secret) |
| **Internet Archive** (archive.org) | ✅ open search API (`advancedsearch`), no key (well known, not re-verified here) | ✅ direct MP4 / WebM files: our html5 player; public domain and openly licensed films | same | **add: 2nd** (legal library, no quota, nothing to embed) |
| **Wikimedia Commons** | ✅ MediaWiki API, no key | ✅ WebM / MP4 files: our html5 player; free licences (credit line needed) | same | **3rd** (small but clean) |
| **Dailymotion** | ✅ public search `GET /videos?search=` without a key; results skip videos not playable in the viewer's country ([search excerpts of developers.dailymotion.com](https://developers.dailymotion.com/api/platform-api/getting-started)); official quotas not found | 🟡 iframe embed; apps should use its iOS / Android SDKs ([player docs](https://developer.dailymotion.com/player)); we have **no Dailymotion player** yet (a sync-capable player module + CSP + tests) | in Capacitor, its SDK or the iframe | **4th** (needs a player first: a bigger card) |
| **TikTok** | ❌ no public search API (the Research API is for academics) | ✅ have it (links, official player) | same | keep "paste a link" |
| **Twitch** | 🟡 Helix searches channels / categories, not videos by words; needs app credentials | 🟡 embeds need a `parent` domain; live sync makes little sense | — | not now |
| **"Search the web"** | ❌ no free general web search API to rely on (Bing's API retired 2025, Google's JSON API closed to new users: from memory, WEAK). Results would also be any site, which a neutral store listing can't vouch for | — | an **in-app browser that captures the page address** is a general browser plus link grabbing: Apple 2.5.6 needs WebKit (fine), but 5.2.2 / 5.2.3 and Play's IP policy ("encourages or facilitates infringement, such as unauthorized streaming") make it the riskiest thing we could ship; review risk **high** | **no** |

**On the website** a page from another site cannot be shown in our page and read: most sites forbid framing, and the
browser hides a frame's address from us anyway. "Search the web" can only mean opening a new tab and pasting the link
back, which we already support (paste or drop a link anywhere, the link box). On a computer the extension already
covers "any HTML5 video on any site", legally, in the site's own player.

**Order:**
1. **Vimeo search** in the existing link box: one Worker route, `VIMEO_TOKEN` secret, cached like YouTube search,
   "Results from Vimeo" line. Check Vimeo's API terms for attribution first.
2. **Internet Archive "Free films"** tile: a curated query (feature films, public domain or CC licence), direct files.
3. **Wikimedia Commons** tile (same shape, credit line per file).
4. **Dailymotion**: first a player card (sync, tests), then search.
5. Never a general in-app browser.

The grid itself: tiles = the sources above, each opening the same search box with that source chosen. On a phone it
fits the planned Search tab (`mobile-app.md` §5). Each new host goes into the CSP and the privacy policy (search words
leave our server to that provider).

## What could not be checked
- court PDFs and dockets (saverave.com, PACER);
- the Teleparty app itself;
- vendor sites (W2G, Kosmi, Rave, Hyperbeam pricing page);
- developer.vimeo.com and developers.dailymotion.com (exact quotas and terms);
- LiveKit's own pricing;
- the current YouTube Terms text.

The owner's `agent-reach` could read recent Reddit threads on "teleparty app youtube" and W2G camera limits to firm up
§1 and §3.
