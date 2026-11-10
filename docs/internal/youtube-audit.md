# YouTube API Services: audit and quota extension pack (card YTA, 7 Nov 2026)

A higher daily quota than YouTube's default (10 000 units) needs Google's **YouTube API Services – Audit and Quota
Extension Form** (https://support.google.com/youtube/contact/yt_api_form). Every quota request goes through a
compliance audit. The form is per API client (we have one: the Sidelit website's Worker). This page has:
- our answer to every question the form asks, ready to paste (§2);
- how and where we use the API, with the unit math (§3);
- how we follow the Developer Policies (§4);
- the gaps still open, as ranked fix cards (§5);
- the screencast shot list (§6);
- what only the owner can do (§7).

Sources: our earlier research `research/store-and-youtube-audit.md` (3 Nov 2026, the Developer Policies were read
directly then), the code at 0.9.97.72, and a web search on 7 Nov 2026. `developers.google.com` and
`support.google.com` can't be opened from the cloud session, so the policy wording below comes from that research and
from search excerpts: open the form and the pages on submission day and check the questions match (§7, step 3).
Not legal advice.

---

## 1. Facts to have at hand

| Fact | Value |
|---|---|
| Product | Sidelit, a free watch-party website + browser extension; no ads, no accounts, no payments |
| Product URL | `https://screen-with-me.swm-server.workers.dev/` (the own domain once bought, §7) |
| Privacy policy | `/privacy.html` (EN + TR; YouTube section; Google Privacy Policy and YouTube Terms linked) |
| Terms of use | `/terms.html` (EN + TR; "By playing or searching YouTube videos in Sidelit you agree to the YouTube Terms of Service") |
| Contact | screenwithme.app@gmail.com (the publisher e-mail; a support address on the own domain later) |
| API client type | public web app; server-side API key (Cloudflare Worker secret `YOUTUBE_API_KEY`), never sent to browsers |
| Google sign-in / OAuth | none; we never touch authorized (user) data |
| APIs | YouTube Data API v3 (search.list, videos.list, channels.list, playlistItems.list); YouTube IFrame Player API (embedded player, privacy-enhanced youtube-nocookie.com); YouTube oEmbed (titles, no Data API units) |
| Our own daily unit guard | `DAILY_UNIT_BUDGET` 9 000 units a UTC day for everyone, `IP_DAILY_UNITS` 2 000 per address (`packages/shared/src/yt-usage.ts`); a refused call answers "quota" / "busy" and links still work |
| Usage numbers | counted per UTC day and kind for 90 days (card Y3): `GET /api/youtube/usage` with header `X-Usage-Token: <USAGE_TOKEN>` (the owner's secret; never in the repo) |

## 2. The form, question by question

The form's exact wording changes from time to time; these are its questions as of our research (Google's quota page +
the form's known fields). Paste the answer under the closest question.

**Organization / business**
- *Organization name:* Sidelit (a personal project of Alperen Aktürk, Turkey).
- *Website:* the product URL (§1).
- *Contact e-mail:* screenwithme.app@gmail.com.
- *Do you monetize?* No. Free, no ads, no paid tiers, no data sales. Donations may come after 1.0, never inside a room
  or near the player.

**API client**
- *Name of the API client:* Sidelit (website).
- *Google Cloud project number:* 👤 the owner copies it from the Cloud console (the project that holds the API key).
- *Is the client public or internal?* Public, anyone with a browser.
- *Does it let users sign in with Google / access their YouTube account?* No.
- *Describe your API client (what it does):*

```
Sidelit is a free website where friends watch a video together in sync. One person creates a room and shares the
link; everyone's player plays, pauses and seeks together, and they chat, react and talk while they watch. YouTube
videos play in YouTube's own embedded player (privacy-enhanced mode, YouTube's own controls), driven by the IFrame
Player API so that everyone in the room stays at the same moment. Sidelit has no accounts, no ads and no payments.
```

- *Explain in detail how you use YouTube API Services today:*

```
1. Search (search.list + videos.list, 101 units): a user types words into the room's link box and presses Enter
   (never while typing). We show up to 12 embeddable videos with their title, channel and length, labelled
   "Results from YouTube · YouTube Terms of Service". Picking one plays it in the YouTube embedded player for the room.
   Answers are cached for 24 hours per words + language, and each address may make at most 10 searches a minute.
2. Shorts feed (search.list with videoDuration=short + videos.list, 101 units a page): a room can watch Shorts
   together; when fewer than 3 are queued, the next page of results for the room's topic is fetched. Cached per words
   + page for 24 hours.
3. Discover (search.list with videoCategoryId, order=viewCount, safeSearch=strict + videos.list, 101 units a page):
   one shared list of popular Shorts per category, region, language and UTC day, cached for that day and shared by
   every room.
4. "More like this" (videos.list + channels.list + playlistItems.list + videos.list, 4 units; a title-word search,
   101 units, only on a second page): Shorts from the same channel as the one playing.
5. Following a channel (channels.list + playlistItems.list + videos.list, 3 units a page): a channel link or @handle
   pasted by a user; its newest uploads as a Shorts feed, cached per channel and day.
6. Titles (YouTube oEmbed, no Data API units): the title of a pasted YouTube link, shown in the room's queue; a stored
   title is looked up again or dropped after 30 days.
7. Playback: the YouTube IFrame Player API in privacy-enhanced mode; we call play, pause, seekTo, setPlaybackRate
   and cueVideoById so that everyone in a room sees the same moment. YouTube's own controls stay on.
Our server counts, per UTC day and feature, how many requests reached YouTube and their units (no search words,
video ids, addresses or rooms), and stops itself at 9 000 units a day.
```

- *Which API / service needs more quota?* YouTube Data API v3.
- *How much quota do you need, per day?* see §3 (we suggest **50 000 units a day**, the math is there; the owner may
  ask more after launch with real numbers).
- *Why do you need it / what happens with the current quota?* 

```
Search and Shorts pages cost 101 units each, so the default 10,000 units allow about 95 searches a day for all our
users together. Our own guard stops search at 9,000 units, after which users can still paste links but can't search
until YouTube's daily reset. With a public launch we expect several hundred searches a day (the math is below); every
answer is already cached for 24 hours, shared lists are fetched once a day, and each address is rate-limited, so the
extra quota goes to new searches only.
```

- *Workarounds if you get less:* keep the 24 h cache, lower `DAILY_UNIT_BUDGET` to fit, make users paste links when
  search is used up (already built), shrink Shorts pages from 25 to 15 results.
- *Do you store YouTube data? For how long?* see §4 (caching); nothing longer than 30 days, most of it 24 hours.
- *Do you combine YouTube data with other data / show it with other content?* The room shows the YouTube player next
  to the room's chat, people and queue (our own content), never on top of the player; YouTube titles appear in the
  room's queue next to videos from other sources (Vimeo, files) with their source shown.
- *Number of users / expected users:* 👤 the owner fills in today's real number (a small test group before launch);
  the forecast is in §3.
- *Screencast / screenshots of the API client:* §6.
- *Links to privacy policy and terms:* §1.

## 3. Units: today, and what we ask for

Costs (YouTube Data API v3): search.list 100, videos / channels / playlistItems .list 1 (`UNIT_COST` in `yt-usage.ts`).

| Feature (kind) | Calls per request | Units | Cached |
|---|---|---|---|
| Search (`search`) | search + videos | 101 | 24 h per words + language |
| Shorts feed page (`search`, short=1) | search + videos | 101 | 24 h per words + page |
| Discover page (`pool`) | search + videos | 101 | per kind + region + language + UTC day, shared |
| More like this (`like`) | videos + channels + playlistItems + videos | 4 (101 for a title search page) | per video + language |
| Channel page (`channel`) | channels + playlistItems + videos | 3 | per channel + UTC day |
| Title (`oembed`) | oEmbed | 0 | 30 days max |

**Today:** 👤 read the real days from `/api/youtube/usage` (§1) and paste them into the form as a small table (date,
search units, pool units, like units, channel units, total). Before launch they are a few hundred units a day.

**What we ask for (math for a first public year, to replace with real numbers when we have them):**
- 1 000 daily users; one in three searches twice: ≈ 650 searches × 101 ≈ **65 600** units.
- Shorts feeds: 150 feed sessions × 3 new pages × 101 ≈ **45 500**, minus caching (popular topics repeat): ≈ **25 000**.
- Discover: 6 kinds × 8 regions × 2 languages × 1.5 pages ≈ 144 pages × 101 ≈ **14 500** (worst case, shared by all).
- More like this + channels: ≈ **2 000**.
- Total ≈ **107 000** a day at 1 000 daily users.

**Ask:** **50 000 units a day** to start (about half the 1 000-user forecast, which a launch reaches slowly), with a
follow-up request once real numbers exceed 80 % of it. Our guard (`DAILY_UNIT_BUDGET`) is raised to 45 000 with the
new quota (90 %, the headroom covers counting gaps), the per-address share to 5 000.

## 4. How we follow the policies

| Rule (Developer Policies / Terms / RMF) | What Sidelit does | Where | State |
|---|---|---|---|
| Show that YouTube is the source of API results (branding) | "Results from YouTube · YouTube Terms of Service" under every list of API results: search, Shorts search, Discover, More like this, channel | card Y1, `.yt-attrib` (`ui/search.ts`, `room.ts`), harness `yt-attrib` | ✅ (see gap 5 for the logo) |
| Link the YouTube Terms of Service; users agree to them | the attribution line links them; our terms say "you agree to the YouTube Terms of Service" | `terms.html` (EN + TR) | ✅ |
| Privacy policy: uses YouTube API Services, links Google's Privacy Policy, explains what is collected | "YouTube videos" + "YouTube search" sections; retention table | `privacy.html` | ✅ |
| Cached non-authorized data ≤ 30 days, kept fresh | search / feed answers 24 h; Discover and channels per UTC day; a stored title ≤ 30 days (`titleAt`, `freshenTitles`) | card Y2, `youtube.ts` `cached` | ✅ |
| No authorized data, so no OAuth revocation link needed | no sign-in with Google | — | ✅ |
| Deletion on request | we keep no YouTube data per person; room data (titles) goes with the room (24 h empty, 30 days saved); the contact e-mail is in the privacy policy | `privacy.html` | ✅ |
| Embedded player: YouTube's own controls, nothing blocked | `controls: 1`, no settings / ads blocked; privacy-enhanced host | `players/youtube.ts` | ✅ |
| Player identifies itself (HTTP Referer) | site-wide `Referrer-Policy: strict-origin-when-cross-origin` (what YouTube asks for) | `public/_headers` | ✅ |
| No overlays in front of the player (RMF) | room view: our rail is a column beside the player; emojis rise from people's faces; notes sit above the chat; Shorts view: nothing of ours over the player | 0.9.93.10, 0.9.91.18, R15 | 🟡 fullscreen and games, gaps 1–3 |
| Player at least 200 × 200 px, controls fully shown | every room layout keeps the player well above it | — | 🟡 phone game preview, gap 1 |
| Autoplay only when the player is visible | a room starts a video when someone presses play (or the queue moves on); the player is on screen | — | 🟡 same cases as gaps 1–2 |
| No charging for embedded playback, no ads next to the player | free, no ads | — | ✅ |
| API key kept private, per-user limits | key only on the server; per-address limits and a daily budget | M3, `youtube.ts` | ✅ |
| Usage counted without personal data | counts per day and kind, 90 days | Y3 | ✅ |

## 5. Gaps (ranked fix cards for the Planner; not fixed in this card)

1. **🔴 Phone game preview shrinks the YouTube player to 92 × 52 px.** While a room game is open on a phone the
   theater becomes a small preview at the game's head and the video keeps playing (`phone.css` "Games on a phone",
   0.9.92.5). RMF: at least 200 × 200 px. *Fix options (owner's call):* A) while the item is YouTube, hide the picture
   completely behind a "▶ Back to the video" tile (no frame on screen, so nothing is below the minimum; the room keeps
   playing, so sync is not touched) (recommended); B) keep a ≥ 200 × 200 player above the game (less room for the game).
2. **🔴 A game window can sit over the YouTube player on a computer** ("float" window dragged anywhere, or the
   "stage" place inside `.player-wrap`). RMF: nothing in front of any part of the player. *Fix:* while the item is
   YouTube, the stage place moves the game beside / below the player, and the float window is kept clear of the
   player's box (snapped aside like the cameras' "column"). Harness: the overlap check `yt-room` already has, run with
   a game open.
3. **🟡 Fullscreen over YouTube: chat messages, notes, "who paused", floating cameras and our countdown appear over
   the video** (R15, R21, R25; the owner chose this, "never open a menu on the side"). This is the *owner's call* the
   Planner flagged: RMF forbids "overlays … in front of any part of an embedded player". Options:
   A) keep it, accept the audit risk; B) in YouTube fullscreen only, put messages / notes / cameras in a column beside
   the player again (as in 0.9.93.10–0.9.97.25) and keep the overlays for other players (recommended for the audit);
   C) turn them off in YouTube fullscreen (chat only from 💬).
4. **🟡 The own domain** (the form asks for the product URL and policy URLs; workers.dev works but looks temporary).
   ROADMAP §6.
5. **🟢 YouTube logo in the attribution.** We say "Results from YouTube" in text; the branding guidelines prefer the
   YouTube logo / "Developed with YouTube" mark next to results. *Fix:* add the official logo asset to `.yt-attrib`
   (from YouTube's brand resources, unchanged colours and clear space).
   *Checked 10 Nov 2026 (YT5):* brand.youtube's logo and icon pages set a minimum height of **100 px** (digital) and a
   clear space of the icon's triangle all round; the API branding guidelines require that minimum, a link to YouTube on
   any logo, and that a logo is never the most prominent element on the page. A 100 px logo under a compact results
   list would be the panel's biggest element, a smaller one breaks the minimum: the choice went to the owner (Planner).
   Files: brand.youtube → YouTube logo → download (full colour, white or #212121 text, red #FF0033; PNG / AI / EPS).
6. **🟢 A written statement for the auditor about sync control** (we drive play / pause / seek / rate through the
   official IFrame API for synchronised group viewing). No code; it is in §2 point 7 already. Keep the screencast
   showing YouTube's own controls working.

## 6. Screencast shot list (2–4 minutes, 1080p, no music needed)

Record on a computer in Chrome, logged out of YouTube, with a second window (or phone) as the friend.
1. The home page; the product URL in the address bar (3 s).
2. "Create room" → the room. Type words in the link box, press Enter: the results list with "Results from YouTube ·
   YouTube Terms of Service" visible; click the Terms link (it opens youtube.com/t/terms) and come back.
3. Pick a result: it plays in YouTube's embedded player with YouTube's own controls; use the settings wheel (quality)
   and captions to show nothing is blocked.
4. The friend's window: both pause / play / seek together.
5. Shorts: open 🎲 Discover → a category → the Shorts view; the attribution line in the window; swipe to the next
   Short; show that nothing of ours is over the player.
6. ✨ More like this on a Short (the attribution line again).
7. The privacy policy's YouTube section and the terms' YouTube line (scroll to them).
8. (Optional) the usage counter answer in a terminal: the units per day, to show we measure our use.
Do **not** show fullscreen with chat over the video or a game over the player until gaps 1–3 are decided.

## 7. Only the owner

1. **Which Google account:** the one that owns the Google Cloud project with the `YOUTUBE_API_KEY` (the form is sent
   from it and Google answers there). Note the project number (Cloud console → project info).
2. **Read today's usage:** `curl -H "X-Usage-Token: <USAGE_TOKEN>" https://screen-with-me.swm-server.workers.dev/api/youtube/usage`
   (the token is in KeePass, entry `Cloudflare – USAGE_TOKEN (YouTube usage counter)`); paste the days into the form.
3. **Open the form** (https://support.google.com/youtube/contact/yt_api_form), check its questions against §2, and
   tell the Planner if a question is new (we add the answer).
4. **Decide gaps 1–3** (Planner asks); wait for those fixes before recording.
5. **The own domain** (optional for the form, recommended): buy it, point the site to it, then submit with the new
   URLs.
6. **Record the screencast** (§6), upload it as unlisted to YouTube or attach it, and paste the link.
7. **Submit**, then forward Google's e-mails to the Planner (they may ask follow-up questions; answers go through us).
