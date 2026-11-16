# Competitors: overview, feature matrix and ideas worth taking

_Field research, 15 Nov 2026 (🔎 Research session, opened by the Planner at the owner's request). One profile per
competitor in this folder; this file is the summary. Builds on `../market-and-competitors-2026.md` (3 Nov),
`../competitors-how.md` (14 Nov), `../more-players.md` (2 Nov, now corrected by `no-extension-sources.md`) and the old
Turkish `../../rakip-analizi.md` (Oct 2026)._

**Method and limits.** The cloud session could not open any competitor site, store page, Reddit or Trustpilot (hosts not
in the environment's network allowlist; a request to add them was rejected by the environments service). Every fact
comes from web-search excerpts of those pages, press and help centres, with a source and a date in each profile.
**WEAK** = single / vendor / SEO source, **GUESS** = inference. Store numbers are snapshots and drift. Nothing here is
legal advice. No accounts were made, nothing was installed.

| File | Competitor | One line |
|---|---|---|
| [`syncup.md`](syncup.md) | SyncUp (syncup.tv) | Closest positioning to ours: web + extension + apps, one Dutch developer, launched Feb 2026, tiny so far |
| [`kosmi.md`](kosmi.md) | Kosmi | Hangout rooms: shared browser, screen share, voice / video, games; Premium; aggressive "alternative" SEO |
| [`teleparty.md`](teleparty.md) | Teleparty | The giant (CWS 10 M+): each person's own streaming subscription; cameras and 23 extra services behind Premium |
| [`watch2gether.md`](watch2gether.md) | Watch2Gether | The oldest "paste a link" site; many official embed sources, ads, PLUS / PRO, no phone app |
| [`rave.md`](rave.md) | Rave (ex-WeMesh) | Mobile-first, account for all, public rooms, ad-funded; off iOS since Aug 2025 |
| [`hyperbeam.md`](hyperbeam.md) | Hyperbeam | Shared cloud browser; consumer app quiet, the company lives on its API |
| [`scener.md`](scener.md) | Scener | "Virtual theater": accounts for all, cameras behind Premium; alive but quiet (v7.1.9, Aug 2026) |
| [`others.md`](others.md) | ~20 more | Discord Watch Together, GroupTube, TandemParty, SharePlay, TikTok Shared Feed, Synclify, TwoSeven … ranked |
| [`no-extension-sources.md`](no-extension-sources.md) | — | How YouTube, YouTube Music, Twitch, Kick, SoundCloud and "any HTML5 site" can play without an extension, and what each would take for us |

## 1. The five findings that matter most

1. **SyncUp is the one to watch, and it is not like us underneath.** It looks like our positioning (web, no account to
   start, extension only for big services, "1000+ HTML5 sites"), but its "1000+ sites without the extension" is a
   **server-side yt-dlp extractor** that hands a stream to its own player (its own `llms-full.txt`, vendor, seen 15 Nov
   2026; the extraction is confirmed by the vendor text, proxying is a GUESS). That route re-broadcasts video and
   carries legal risk (the Hamburg appeals court ruled against youtube-dl's host in Nov 2024). It also has a paywall
   (Plus $3.99 / month) and caps: 5 people per free room, voice 1 hour a day, 50 extractions a day. It is tiny (Google
   Play 1K+, no ratings). **We match or beat it everywhere except Twitch / Kick / SoundCloud without the extension, and
   iOS / Android store apps.** (`syncup.md`)
2. **Everyone charges for what we give away.** Cameras / voice are paid at Teleparty ($6.59 / month) and Scener
   ($5.79); Kosmi Premium $7.99 (WEAK); SyncUp caps voice at 1 h / day; W2G shows ads to everyone (PLUS / PRO remove
   them); Rave is ad-funded and, per a mirrored data page, sells audience segments (WEAK). **Billing / cancelling is the
   top complaint theme** at Teleparty (Trustpilot ~2 / 5), Scener and Kosmi. "No account, no ads, nothing to cancel"
   is a real, provable difference.
3. **Nobody else does short video in sync, and phones are weak everywhere.** Only TandemParty does Shorts / TikTok
   together (host on a computer); TikTok Shared Feed and Instagram Blend are shared feeds, not synced. W2G has no app,
   Teleparty's Android app is a beta and iOS is Premium-tied (2.5★), Kosmi's app is ~2.5★, Rave is off iOS. Our
   app-like phone site with Shorts / TikTok is a genuine gap in the market.
4. **The extension is a commodity, its reliability is not.** Synclify (one developer, alpha) and W2gSync already sync
   any HTML5 site; W2gSync makes every person link their own tab by hand. Teleparty's release notes are mostly
   ad-tier and player fixes. What wins is the "it just works" path: one link, the overlay arrives on everyone's film
   page, ads don't break the room, and a page that honestly says what works.
5. **Missing sources are our clearest gap, and most are cheap and legal.** YouTube Music `watch` links already play
   (our `media.ts` accepts the host). Twitch's official embed works on our current `workers.dev` address (`parent` =
   `location.hostname`), so it does **not** need to wait for the own domain (corrects `more-players.md`). SoundCloud's
   widget needs no key. Kick has no player API (live iframe only). HLS (`.m3u8`) is not supported by our `html5` kind
   yet. (`no-extension-sources.md`)

Also new since 3 Nov: Scener is **not** dormant (extension v7.1.8 / v7.1.9 in Jul / Aug 2026, WEAK); Rave claims 225 M+
downloads (vendor); Discord made every account "teen by default" from Mar 2026 (age checks for full access);
**GroupTube** (free, no login, YouTube + calls + "Apps & Games", iOS / Android, Feb 2026) is a new close rival on the
"free hangout" side; Plex removed Watch Together from most new apps (Feb 2025). No sizeable Turkish rival was found.

## 2. Feature matrix (them vs Sidelit, Nov 2026)

Legend: ✅ yes · 🟡 partial / paid / limited · ❌ no · ? not found. Sidelit = the live site 0.9.97.x + the unpacked
extension (store listing with 1.0).

| | **Sidelit** | SyncUp | Kosmi | Teleparty | W2G | Rave | Hyperbeam | Scener |
|---|---|---|---|---|---|---|---|---|
| No account for anyone | ✅ | 🟡 (Plus, persistence) | 🟡 (host may sign in, WEAK) | 🟡 (Premium) | ✅ (account to keep a room) | ❌ | 🟡 | ❌ |
| No ads, no paywall | ✅ | ❌ Plus + caps | ❌ Premium | ❌ Premium | ❌ ads + PLUS / PRO | ❌ ads + sub | ❌ Premium / session caps | ❌ Premium |
| Server-time sync + drift correction + ready wait | ✅ | ✅ (claims) | n/a (one stream) | 🟡 (complaints) | 🟡 (drift complaints) | ✅ | n/a | 🟡 |
| Any HTML5 site via extension (incl. iframes) | ✅ | ✅ | via shared browser | 🟡 listed services | ✅ W2gSync (manual link) | ❌ | via cloud browser | ❌ |
| "Many sites" without extension | ❌ (direct files only) | ✅ via yt-dlp extraction (we won't) | via shared browser | ❌ | 🟡 official embeds | 🟡 in-app browser | via cloud browser | ❌ |
| DRM services with each person's own subscription | ❌ → after 1.0 | ✅ (extension, desktop) | 🟡 screen share | ✅ core | ❓ | 🟡 in-app logins | ❌ (black screen) | ✅ |
| YouTube + search | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | via browser | ✅ |
| YouTube Music links | ✅ (`watch` links; playlists ❌) | ✅ | ? | ❌ | ? | ✅ music | via browser | ❌ |
| Twitch / Kick | ❌ | ✅ / ✅ | via browser | ❌ | 🟡 Twitch (WEAK) | ❌ | via browser | ❌ |
| SoundCloud / Vimeo / podcasts | ❌ / ✅ / ✅ | ✅ SoundCloud | ? | ❌ | ✅ many | 🟡 | via browser | 🟡 Vimeo |
| Shorts / TikTok "scroll together" | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Voice | ✅ free (6, p2p) | 🟡 1 h / day free | ✅ | 🟡 Premium | ✅ | ✅ | ✅ | 🟡 Premium |
| Cameras | ✅ free (4) | ❌ | ✅ | 🟡 Premium | ✅ (≤ 10, off > 50) | ❌ | ✅ | 🟡 Premium (10) |
| Screen share | ✅ (1) | ❌ | ✅ (720p free) | ❌ | ❌ | ❌ | (the product) | ❌ |
| Games | ✅ tables + side games | ❌ | ✅ poker, emulators | ❌ | ❌ | ❌ | any web game | ❌ |
| Reactions / custom emoji | ✅ / ✅ free | ✅ / ❌ | ✅ | ✅ / 🟡 Premium | 🟡 | 🟡 | ✅ | ✅ |
| Queue / playlist | ✅ | ✅ | 🟡 | ❌ | ✅ | 🟡 | ❌ | ❌ |
| Saved rooms | ✅ no account | 🟡 30 days idle | ✅ | ❌ | 🟡 account | ✅ | ? | ? |
| Room size (free) | 50 | 5 (50 with Plus) | ? | 1,000 | hundreds | ? | ? | 10 on camera |
| Local file together | ❌ | ✅ P2P | ✅ | ❌ | ❌ | ✅ Drive | via browser | ❌ |
| Phone | ✅ app-like site, no extension | ✅ iOS + Android apps | ✅ apps (~2.5★) | 🟡 Android beta, iOS Premium | 🟡 browser only | ✅ Android (iOS removed) | 🟡 | 🟡 iOS beta |
| Store presence / installed base | ❌ none yet | tiny | mid | 10 M+ | ~1 M (CWS) | 50 M+ installs | small | ~1 M (CWS) |
| Works where WebSockets are blocked | ✅ HTTP fallback | ? | ? | ? | ? | ? | ? | ? |
| English + Turkish UI | ✅ | ? | ? | 🟡 | ✅ many | ✅ many | ? | ? |

## 3. Our clear advantages and disadvantages

**Advantages (provable today):**
1. **Free with no catch:** no account, no ads, no paywall, no caps on voice or people up to 50; competitors' top
   complaint is billing / cancelling.
2. **Shorts / TikTok together** on a phone with no install: nobody else.
3. **One room with everything:** sync + voice + cameras + screen share + table games + side games. Kosmi is the only
   one close, and it is paid and ~2.5★ on Play.
4. **Clean, legal extension:** commands each person's own player, never re-broadcasts, extracts or proxies (SyncUp's
   yt-dlp and Kosmi / Hyperbeam's shared browsers do); no data sale, no analytics trackers in rooms.
5. **Engineering details nobody advertises:** server-time sync with drift correction and "3-2-1 together", the HTTP
   fallback, saved rooms without an account, pins / votes / recap.

**Disadvantages (honest):**
1. **No users, no store listing, no brand** (Teleparty 10 M+, W2G ~1 M, Rave 50 M+ installs).
2. **No DRM services yet** (Teleparty's and Scener's core; SyncUp has them desktop-only).
3. **Fewer no-extension sources** than SyncUp and W2G (Twitch, Kick live, SoundCloud, Dailymotion, web radio, YouTube
   Music playlists, HLS; Vimeo and podcasts are already built).
4. **No store apps** (SyncUp, Kosmi, Rave, GroupTube have iOS / Android apps); our phone site can't be found in app
   stores and has no Picture in Picture.
5. **One-person maintenance** against players that change; the extension idea is easy to copy (Synclify).

## 4. Top 10 ideas worth taking

Ordered by value ÷ effort. "Focus" note: `ROADMAP.md` freezes new features until 0.9.99 / 1.0, so most of these are
for the Planner to order after the gate or after 1.0; the S-size help / text items fit the 1.0 "launch content" work.
Each idea marked 📇 is a Proposed card in [`../../cards-proposed.md`](../../cards-proposed.md).

| # | Idea | Taken from | Why | Effort | Card / lane |
|---|---|---|---|---|---|
| 1 | **"Do I need the extension?" table** in help, on `extension.html` and in the store text: per source, site vs extension vs phone, plus a "Tested players" list with a last-checked date | SyncUp's extension page; Teleparty's service list; TwoSeven | The first question every newcomer has; SyncUp proves the format; it also tells people honestly what does not work yet | S | 📇 CR1 · lane A + Planner (copy) |
| 2 | **YouTube Music playlist / album links → queue**, and say in help that YouTube Music links work | SyncUp | `watch` links already play; playlists are a Data API call we already make; music-together is a use case we get almost free | S | 📇 CR2 · lane B (folds into "More players without the extension") |
| 3 | **Twitch (live + VODs, clips) through the official embed**, now on `workers.dev` via `parent` = our hostname | SyncUp, W2G | The most-asked "without extension" source after YouTube; official, legal; live needs no sync engine at all | M | 📇 CR3 · lane B (folds into "More players") |
| 4 | **SoundCloud links (official widget, 1× lock)** + **HLS / audio files in the `html5` kind** (lazy `hls.js`, Apache-2.0) | SyncUp, W2G | Cheap sources that also work on phones; HLS opens many legal public streams and the legal demo stacks we test against | S–M each | 📇 CR3 · lane B |
| 5 | **"Make a room with this video" link** (`/new?v=<url>`), rate-limited on the server, plus an invite preview that reads well in Discord / WhatsApp | W2G, Discord, GroupTube | One click from a community post or a Discord chat to a ready room; Discord's own Watch Together is YouTube-only with ads and now age checks | S–M | 📇 CR4 · lane A |
| 6 | **Ad-break hold on the film page:** when one person's film plays an ad, the room shows "Sam is in an ad" and (optionally) waits, then starts together; an embed-harness scenario | Teleparty (most release notes are ad-tier sync fixes), SharePlay complaints | Ad tiers are now the default on big services; today the person after the ad just jumps to the room's time (reference "Resilience to ads") | M | 📇 CR5 · lane B |
| 7 | **Subtitles stay free on a phone held sideways:** a Test Lab check that chat, reactions and the rail never cover the bottom band where subtitles sit | Kosmi complaints (chat over subtitles) | A small rule that avoids a top complaint of the closest "hangout" rival | S | 📇 CR6 · lane A |
| 8 | **Honest "alternative" and use-case pages** (EN first): "Watch Twitch together", "Watch Shorts together", "Teleparty alternative, free", "Watch2Gether without ads", each opening straight into the right view; plus `llms.txt` | Kosmi's SEO, SyncUp's `watch-*-together` pages and `llms-full.txt`, TandemParty | Search is how Kosmi grows; our growth plan G2 already wants these; respectful wording, no rival's logo | S–M | Growth card **G2** (extend) · after own domain |
| 9 | **Local file together, nothing uploaded:** each person picks the same file on their own device and the room syncs it (the `html5` kind with a `blob:` URL; a file-name / duration check instead of sending the file) | WatchParty.me, Kosmi, SyncUp (P2P) | Common ask (home videos, a downloaded lecture); keeps our "never re-broadcast" rule because nothing leaves anyone's device | M | 📇 CR7 · lane A (after 1.0) |
| 10 | **Safety kit before any app-store app:** report a person, block, a word filter in chat, an abuse contact in the room | Rave (removed from the App Store over moderation) | Needed before a store app or public rooms; we have kick / ban but no report / block | M | 📇 CR8 · lane A (after 1.0, before `apps.md` work) |

**Smaller ideas noted in the profiles** (not cards yet; the Planner may list them under "Ideas waiting for the owner's
pick"): publish a measured sync number with its method (SyncUp, W2G complaints); a plain "large room" message when
cameras are capped; a "pick up where we left off" prompt in a saved room (Hyperbeam); "pass the remote" in one tap
(Hyperbeam; check against our `hostKey` transfer); Picture in Picture on the phone site (SharePlay); a premiere / event
mode (Scener, after 1.0); helper moderators beyond one host (CyTube); an optional host-set shared volume (Synclify);
"private links only, no strangers" in help (Rave).

**Ideas we deliberately do not take:** server-side extraction (yt-dlp), page proxies and cloud / shared browsers
(re-broadcasting, legal risk, server cost; SyncUp, Kosmi, Hyperbeam), paid tiers or caps (everyone), ads (W2G, Rave),
required accounts (Rave, Scener), public rooms with strangers (Rave), analytics / ad SDKs, Kick beyond a live iframe
(no API, terms forbid scraping). DRM is never bypassed; DRM services come only via each person's own subscription
after 1.0 (`../../VIZYON.md` "Büyük servisler").

## 5. What the owner should decide (via the Planner)

1. **Which sources first, and when** (the "More players without the extension" card): Research's order is now
   YouTube Music playlists → SoundCloud → HLS / audio files → Twitch → a "live channel" kind (Twitch / Kick live) →
   Dailymotion / web radio (Vimeo and podcasts are already built). All are new features, so after the 0.9.98 gate at the earliest.
2. **Whether to publish "alternative" pages that name competitors** (idea 8). Naming rivals is legal when factual and
   respectful, but it is a tone choice for the owner.
3. **Store apps vs the phone site** stays as decided in `../mobile-app.md`; SyncUp and GroupTube show small teams do
   ship store apps, but Rave shows the moderation price.

## 6. What could not be checked

All vendor pages, live store pages and Reddit / Trustpilot threads (blocked here; excerpts only); SyncUp's proxying and
sign-in methods; Kosmi's room limits; W2G's current prices and whether W2gSync works on DRM services; Teleparty's full
list of "23 extra" services; Rave's current price; GroupTube's numbers. To firm these up, a session with the hosts
listed in each profile's "What could not be checked" allowed, or the owner's `agent-reach` on his computer
(queries in `../market-and-competitors-2026.md` §5).
