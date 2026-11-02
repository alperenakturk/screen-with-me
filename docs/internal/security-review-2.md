# Security and privacy review 2: what changed since 0.9.86

> Date: 2 Nov 2026 · Code reviewed: `main` at 0.9.93.5 (`6c14046`) · Role: 🛡️ Security (read-only).
> Scope, in this order: (1) features added since review 1 (HTTP fallback, `/api/version`, TikTok resolve, YouTube
> search / pool / like, chat images, TV pairing, make-host, the extension's `scripting` permission), (2) every client
> message in the protocol, (3) privacy (KVKK + GDPR, following `kvkk-gdpr-denetim`'s `SKILL.md` read-only) against
> `apps/web/public/privacy.html`, (4) `npm audit` and secrets.
> This document only proposes changes. Each fixable finding is a card under **Proposed** in `CARDS.md`; the Planner
> and the owner decide which become Ready, the Developer fixes them.
> Not legal advice: the privacy notes are a developer's reading of GDPR / KVKK. Show the final policy to a lawyer.

## Summary

| # | Finding | Severity | Area |
|---|---------|----------|------|
| H1 | The HTTP fallback lets one person crash a room's Durable Object (unbounded POST body, 16 MB queue per session, repeated `hello` re-sends every sticker and chat image) | **High** | Availability |
| H2 | YouTube embeds use `www.youtube.com` (cookies) and the API is preloaded on every room page; the policy says "no tracking tools … none of their cookies" | **High** | Privacy, YouTube API audit |
| H3 | The privacy policy lacks the KVKK / GDPR core parts: data controller, legal basis, rights, transfers abroad, minimum age, complaint authority, exact date | **High** | Privacy (needs the owner) |
| M1 | `hello` is accepted again on a joined connection: the browser id (`cid`) can be rotated at will, so every per-person limit is bypassed, and the unbounded `voters` list can wedge a room's storage | Medium | Protocol |
| M2 | During the host's 20 s reload grace the oldest guest can `make-host` themselves and keep the room for good | Medium | Permissions |
| M3 | YouTube quota: requests without an `Origin` (scripts) are allowed, only 10 / min / IP; one IP can spend the whole day's quota in ~10 min | Medium | Cost / availability |
| M4 | Unlimited Durable Object requests: `/api/version` creates a new object per call, `/api/rooms/:id/info`, fallback `send/poll/close` with any `sid`, game ids | Medium | Cost |
| M5 | The IP hash is an unsalted SHA-256 of the IP: every IPv4 hash can be reversed in minutes; the policy calls it "scrambled" | Medium | Privacy |
| M6 | Our own Workers Logs keep request URLs, including YouTube search words; the policy says search is "not by person" and names only Cloudflare's logs | Medium | Privacy |
| M7 | The privacy policy's facts are incomplete (names stored in more places, browser-id purposes, "never shared with anyone", room info endpoint, device labels, local keys, third-party requests, Web Store form) | Medium | Privacy |
| M8 | TV link (behind `?tvlab=1`): a TV token is the full person incl. host rights, a QR can phish it, and pairing codes can be brute-forced (limit keyed on the rotatable `cid`) | Medium (before TV ships) | Permissions |
| L1 | Names, room names, chat, pin notes, titles and guesses keep bidi / zero-width / control characters (host impersonation, reversed text) | Low | Protocol |
| L2 | Signal floods: 80 + 10/s per connection, 24 KB each, reset on reconnect; empty `voice` / `live` flags take slots | Low | Protocol |
| L3 | `ready:false` lets a guest pause a host-only room (cooldown keyed per connection) | Low | Permissions |
| L4 | Media links accept `http:`, user-info, `localhost` and private IPs for `html5` / `page`; `page` titles are client-chosen | Low | Protocol |
| L5 | A room can be filled with sockets that never say `hello` (`> MAX_MEMBERS`, 51) for up to 150 s | Low | Availability |
| L6 | Games: Draw & Guess `reset` / `start` open to every player, `undo` amplification, Quiz 50/50 leaks the answer with two identities, Poker `people` grows without cap, game objects not tied to room membership / bans | Low | Games |
| L7 | TikTok resolver: later hops may be `http:` / other ports / user-info (still TikTok hosts), bodies not cancelled | Low | SSRF hygiene |
| L8 | Retention hygiene: recaps past 90 days are only pruned on read / save; the room's alarm reset leaves in-memory `tvTokens` / `memberIds` that the next write puts back | Low | Privacy |
| L9 | The policy is only linked from the footer, which is hidden in phone rooms, the film page overlay and the Shorts view; nothing at the join step | Low | Privacy |
| L10 | Supply chain / repo: dev-only `npm audit` findings (wrangler → miniflare → undici), no Dependabot, workflow without a `permissions:` block, no `SECURITY.md` | Low | Operations |

What is fine (checked): fallback session ids are 128-bit and per object (no hijacking), every fallback message goes
through the same validation and limits as a WebSocket, `open` counts against `CONNECT_LIMIT`, the Worker sets
`X-SWM-Ip` / `X-SWM-Room` itself; YouTube / TikTok parameters are validated before they reach URLs or cache keys (no
cache poisoning); the TikTok host check is anchored (`(^|\.)tiktok\.com$`) and capped at 3 hops; chat images use a
MIME whitelist, a strict base64 check and the 282 KB message cap before parsing, per-IP buckets survive reconnects;
`make-host` refuses TVs and non-members; `tv` relays only reach the same person; tokens are 128-bit; `cid`s, IP
hashes and owner keys never reach other clients; the extension's `scripting` permission only injects `site-bridge.js`
into our own site's tabs on install, `site-go` checks the sender's origin + top frame, `shell.html` checks the
message origin; the CSP is applied to the SPA fallback (assets are served before the Worker); no analytics, no
`document.cookie`, no external fonts or CDNs; Quiz never sends the right option before the reveal; Poker hole cards
go only to their owner. No secrets in the working tree or the (shallow, 96-commit) history; the YouTube key is only a
GitHub secret, written to a temp file for `wrangler deploy` and removed.

**Recommendations in one line each:**
- Before anything else ships: H1 (cap the fallback's memory, one `hello` per connection) and M1 (same fix + a voters
  cap). Both are small server changes with e2e tests.
- Before the YouTube API compliance audit: H2, M3, M6 and the policy work H3 + M7 + M5.
- Before the TV leaves the lab switch: M8.
- Before 1.0: the rest (L1–L10); L10 is mostly settings on GitHub.

---

## 1. What changed since review 1

### H1 — The HTTP fallback can be used to reset a room (High)

Where: `apps/server/src/fallback.ts:28` (`QUEUE_BYTES = 16_000_000`), `:53-62` (`send` queues until the limit),
`:158-164` (body size only checked when `Content-Length` is present), `:221` (idle close after 45 s);
`apps/server/src/room.ts:405-412` (a repeated `hello` is allowed, only `commandLimit`), `:1054-1059` (every `hello`
re-sends all stickers and chat images).

Scenario A (one request): a `POST ?http=send&sid=x` (or `open` / `close`) with chunked encoding (no
`Content-Length`) is read whole with `request.text()` inside the Durable Object. Cloudflare accepts request bodies up
to ~100 MB; as a JS string that is ~200 MB, past the 128 MB isolate memory limit: the object is reset and everyone in
the room loses the connection.

Scenario B (no unusual HTTP): open ~5 fallback sessions (allowed: 60 / min / IP), send `hello` a few times on each and
never poll. Each `hello` queues up to 24 × 280 KB stickers + 12 × 280 KB chat images ≈ 10 M characters; a session
may hold 16 M characters (≈ 32 MB of UTF-16). Five sessions are past the memory limit. Repeatable every minute by
anyone who has the room link. (Over a WebSocket the repeated `hello` is "only" a bandwidth amplification.)

Fix: read the body as a stream and stop at `SEND_BODY_BYTES` (don't read bodies for `open` / `close`); lower
`QUEUE_BYTES` to 2–4 MB and cap the total queued bytes per `PollHub`; close a session that has not polled within
~10 s of `open`; refuse a second `hello` on a joined connection (also fixes M1).

### `/api/version`, `/api/rooms/:id/info`, other cost routes — M4 (Medium)

- `index.ts:92-95`: every `/api/version` call creates a new `TvLink` object with a random name. No origin check, no
  limit. A curl loop spends the daily Durable Object request allowance (free tier 100 k) or the bill. It also shows
  the deployment's version id (info).
- `index.ts:127-131` + `room.ts:337-352`: `/info` wakes (or creates) a room object for any valid id; no rate limit.
  It returns up to 3 names, the head count, the saved name and what plays to anyone with the id (see M7).
- `index.ts:66-70`: fallback `send` / `poll` / `close` with any `sid` (even a made-up one) reach the object; only
  `open` is rate-limited. Held polls keep the object awake (duration billing).
- The same for game / draw / quiz / poker ids: any id creates an object kept for 24 h.

Fix: protect `/api/version` with a token the deploy job sends (or a strict per-IP limit), per-IP rate limits for
`/info` and for all fallback requests, check `sid` against `^[0-9a-f]{32}$` in the Worker before forwarding.

### YouTube search / pool / like — M3 (Medium)

Where: `index.ts:22-24, 116-120`, `youtube.ts:86, 152, 253-290`, `wrangler.jsonc` (`SEARCH_LIMIT`).

A request without `Origin` is allowed (that is how curl looks), so the only control is 10 calls / min / IP ≈ 1 010
units / min. One IP sending unique queries spends the 10 000-unit day in ~10 min; search, the Shorts feed, Discover
and "More like this" are then off for everyone until YouTube's reset. `like` can cost up to 106 units per call.
`caches.default` is per data centre, so the quota memory and result cache are not global.

Fix: a global daily unit budget in one Durable Object (or KV) with a per-IP daily cap (e.g. 15 new searches a day);
optionally require `Sec-Fetch-Site: same-origin` (forgeable by scripts, but stops casual reuse).

### TikTok resolve — L7 (Low)

The host test is anchored and runs before every hop, at most 3 hops, 4 s each. Remaining looseness: only the first
URL is forced to `https:`; later hops may use `http:`, another port or user-info (`tiktok.ts:22-26, 39-55`). All
targets are still TikTok's hosts, so this is hygiene, not real SSRF. Fix: on every hop require `https:`, no port, no
user-info; `response.body?.cancel()`.

### Chat images — fine (F11 notes)

Whitelisted MIME, strict base64, size cap before parsing, per-IP bucket that survives reconnects, 100 per room and
day. Notes only: the bytes are not checked against the stated type (harmless inside `<img>`); in-memory buckets
reset when the object is evicted; an IPv6 /64 gives many IP keys, so the daily room cap is the real bound (hashing
the /64 prefix would tighten it).

### TV pairing — M8 (Medium, behind `?tvlab=1`)

- A TV connection gets the person's `cid` (`room.ts:969-986`) and may send everything except `rename` / `tv-link`:
  kick, `make-host`, settings, `sticker-clear`… The token slides for 12 h after last use.
- QR phishing: an attacker opens `/api/tv/<code>/ws`, shows a QR for `/tv/<code>` ("scan to put the room on the
  TV"). Whoever scans and picks a room hands the attacker a token that is them, with host rights if they are the
  host, renewable by reconnecting.
- Brute force: `tvLinkLimit` is keyed by `cid`, which can be rotated (M1); `/deliver` answers ok / 404, so each guess
  tells whether a TV waits. ~100 guesses/s over 10⁶ codes; each guess also creates a `TvLink` object (cost).
- Fine: tokens are 128-bit, `/deliver` is not reachable from outside, `tv` ops only reach the same person, `TvLink`
  stores nothing.

Fix before TV ships: allow-list what a `tv:true` connection may send (ping, tv, listen-only voice, react; no host
actions), a confirm on the phone that names the TV, per-IP + per-room limit for `tv-link` (Worker rate limit too),
8-digit codes.

### make-host — M2 (Medium)

`room.ts:1424-1432` with `hostId()` `:1753-1762`: while the real host is away (page reload, 20 s `HOST_GRACE_MS`),
`isHost` is true for the oldest guest. `makeHost` only refuses a target whose key is `hostKey`, so that guest can name
themselves and `hostKey` moves for good; the real host comes back as a guest. Fix: allow `make-host` only when the
sender's key is `this.hostKey`.

### Extension: `scripting` and site-bridge — fine

`background.ts:673-680` injects only `site-bridge.js`, only into `${SITE_ORIGIN}/*` tabs, only on `install`. The
bridge accepts only same-window, same-origin messages; `site-go` checks `sender.origin === SITE_ORIGIN` and
`frameId === 0` and only allows `http(s)` targets. `scripting` needs a justification line in the Web Store form
(`docs/internal/web-store.md`).

## 2. Protocol (every client message)

| Message | Validated | Size | Rate | Permission |
|---|---|---|---|---|
| hello | name, avatar enum, cid/prev/tv regex, `v` exact | 4 KB | cmd | none; **re-sendable on a joined connection (M1)** |
| ping | finite `c` | 4 KB | – | – |
| tv-link | 6 digits | 4 KB | cmd + per `cid` (M8) | not a TV |
| tv | op enum, value 0–100 | 4 KB | cmd + `tvLimit` | same person ✓ |
| rename | name, avatar | 4 KB | cmd | not a TV |
| kick / unban / make-host | id | 4 KB | cmd | host ✓ (make-host: M2) |
| ready | booleans | 4 KB | cmd | none (L3) |
| settings | booleans, enums, name ≤ 40, `startsAt` ≤ 30 days | 4 KB | cmd | host ✓ |
| vote | id | 4 KB | cmd | none; voters unbounded (M1) |
| recap / recap-save / recaps | – | 4 KB | cmd | – |
| home | – | 4 KB | `homeLimit` per `cid` | – |
| voice | booleans, track regex | 4 KB | cmd | `VOICE_MAX`, `CAM_MAX` |
| rtc | SDP ≤ 20 KB | 24 KB | `rtcLimit` | in voice |
| signal | `cleanSignal` | 24 KB | 80 + 10/s per connection (L2) | both in voice ✓ |
| live / live-watch / live-stop | kind enum | 4 KB | cmd | `liveHostOnly`, 1 stream, 4 viewers; stop: host ✓ |
| live-signal | `cleanSignal` | 24 KB | cmd + signal | streamer ⇄ viewer ✓ |
| game / table / at | kind enum, id | 4 KB | cmd | close: opener or host ✓ |
| load / enqueue | `cleanMedia`, title ≤ 200 | URL ≤ 2048 | cmd | hostOnly / lockQueue (L4) |
| dequeue / move / jump / next / prev | id, 0..99 | 4 KB | cmd | hostOnly / lockQueue |
| play / pause / seek / rate | finite, 0..1e6, rate 0.25–4, `at` clamped | 4 KB | cmd | hostOnly |
| react | emoji enum / sticker id | 4 KB | per `cid` + gap | `noReactions` |
| sticker-add | MIME whitelist, base64, ≤ 280 K | ≈ 282 KB | cmd + per IP + 60/day | – |
| sticker-remove / sticker-clear | id | 4 KB | cmd | owner or host / host ✓ |
| pin / unpin | note ≤ 60 code points | 4 KB | cmd, 50 per item | unpin: owner or host ✓ |
| chat | text ≤ 300, C0 removed; image as sticker | ≈ 282 KB | cmd + chat + image per IP + 100/day | – |

`PROTOCOL_VERSION` handling is sound (exact `v`, `not_joined` before `hello`; game objects check their own).

### M1 — Identity rotation on one connection; unbounded `voters` (Medium)

`join()` (`room.ts:960-966`) overwrites `attachment.cid` on every `hello`, and `hello` is accepted on a joined
connection for one `commandLimit` token. Every limit or rule keyed by `cid` (`reactionLimit`, `homeLimit`,
`tvLinkLimit`, one vote per person, one table per person, sticker ownership) can then be bypassed without new
connections. `vote()` (`room.ts:1651-1664`) adds the key to `voters[itemId]` with no cap and no check that the voter
is present: `hello{cid:random}` + `vote` in a loop grows the single `voters` value towards the 2 MB storage value
limit, after which `storage.put` throws in `vote` and `apply()` and the room's queue is stuck until the room is
deleted. Each vote also broadcasts the whole queue (amplification).
Fix: refuse `hello` once `attachment.name !== null` (or refuse a `cid` change); cap voters per item and keep only
voters who are in the room.

### L1 — Invisible and direction characters (Low)

`cleanName` (`protocol.ts:640-644`, also room names and game hellos) only collapses whitespace; `cleanChatText`
(`:706-712`) removes C0 only; titles from URLs (`titles.ts:41-50`, `decodeURIComponent`) and oEmbed are cut but not
cleaned; Draw & Guess guesses likewise. Zero-width (U+200B–U+200F), bidi (U+202A–U+202E, U+2066–U+2069), C1 and
other `\p{Cf}` pass. A guest renamed `Alperen` + U+200B looks exactly like the host in chat and pins; U+202E
reverses the rest of a message. `.slice` on UTF-16 can split a surrogate pair. The site has no `dir=auto` / `<bdi>`.
Fix: one shared sanitizer (remove `\p{Cc}`, `\p{Cf}` except ZWJ inside emoji, lone surrogates; cut by code point)
for names, room names, chat, pin notes, titles and guesses; optionally refuse a name equal to the host's after NFKC
+ case folding.

### L2 — Signal floods and slot squatting (Low)

`signal` skips `commandLimit`: 80 burst + 10/s per connection, 24 KB each (`room.ts:423, 481-489`), reset on
reconnect. A guest can set `voice:on` without media and flood people in voice with offers (their browsers
renegotiate). Empty `voice` / `cam` / `live` flags also take the 6 / 4 / 1 slots until the host acts. Fix: key the
limit by person and target pair, a few offers per minute per pair; smaller cap for candidates.

### L3 — `ready:false` and host-only rooms (Low)

`room.ts:674-688`: a guest can pause the room as SYSTEM for up to 12 s; the 30 s cooldown is per member id, so a
reconnect resets it. Fix: key the cooldown by `keyOf` or the IP hash.

### L4 — Media links (Low)

`protocol.ts:725-733` accepts `http:`, user-info (`https://a@b`), `localhost` and private IPs for `html5` and `page`
(`javascript:`, `data:`, `file:`, `chrome:` are refused ✓). An `html5` item `http://192.168.1.1/…` makes every
viewer's browser request a device on their own network; a `page` item can carry a made-up title ("YouTube – …").
Fix: `https:` only for `html5`, no user-info, refuse IP literals / private / `.local` hosts; show the page's host
next to a client-given title.

### L5 — Unjoined sockets fill a room (Low)

`admit` (`room.ts:372-377`) counts open sockets, not joined members, and uses `>` (51 allowed). 51 sockets that
never send `hello` make the room answer `room_full` until `pruneStale` drops them (150 s). Fix: count joined members
for "full" and close unjoined sockets after ~15 s.

### L6 — Games (Low)

- Draw & Guess: any player can send `reset` (wipes the game and scores, `draw.ts:326-336`) or `start` (`:285`); the
  drawer's `undo` re-broadcasts all strokes (≤ ~300 KB) at up to 8/s.
- Quiz: the 50/50 joker hides a fresh random pair per person (`quiz.ts:250-257`); a second identity's joker plus your
  own reveals the answer 2/3 of the time. Fix: one hidden pair per question.
- Poker (`poker.ts:147-153`, not described in `CLAUDE.md`): every `hello` with a new `cid` adds to `people` and saves
  all data; with rotation the value grows until `save()` fails. `start` (`:203`) has no host / seated check.
- XOX / Connect Four: a spectator can take a seat while its player reloads, resetting the hand (`game.ts:198-207`).
- All game objects accept anyone who knows the id, with no tie to the room's members or bans.
Fix: host / opener checks on `reset` / `start`, `undo` ≤ 1/s, cap Poker `people`, one 50/50 pair per question;
ideally a short-lived ticket from the room to join a game object.

## 3. Privacy (KVKK + GDPR), policy vs. code

Checklist (`kvkk-gdpr-denetim` §A–I): ✅ fine · ⚠️ missing / risky · ❌ problem · ❔ unknown (owner).

| Item | State | Note |
|---|---|---|
| A. Notice reachable where data is collected | ⚠️ | Footer only; hidden on phones, film page, Shorts; not on the join card (L9) |
| A. Controller, purposes, legal basis, transfers, rights, how to apply | ❌ | Only an e-mail address (H3) |
| A. Notice and consent kept apart | ✅ | No consent boxes; the IP notice is information, not consent |
| A. Anonymous use covered | ⚠️ | Yes in spirit, but facts incomplete (M7) |
| A. Date / TR + EN | ⚠️ / ✅ | "October 2026" without a day or history; TR and EN say the same |
| B. Non-essential storage before consent | ❌ | YouTube API + `www.youtube.com` embed set YouTube cookies; policy says none (H2) |
| B. Banner | ❔ | None. With H2 fixed and only functional local storage, a banner may not be needed; the owner / lawyer decides |
| C. Transfers abroad (Cloudflare, Google, TikTok: US) | ❌ | Not described (H3); KVKK art. 9 conditions to check on kvkk.gov.tr |
| C. Fonts / CDNs | ✅ | None |
| C. WebRTC IP exposure | ✅ | Notice before voice / stream + policy (review 1); hiding IPs is Phase 2 |
| D. Public databases / leaked keys | ✅ | Durable Objects only; no secrets in the repo |
| D. Rate limits | ⚠️ | See M3, M4 |
| D. Logs with personal data | ⚠️ | Search words in Workers Logs (M6); IP hash reversible (M5) |
| D. Delete / export own data | ⚠️ | Rooms delete themselves; no written way to ask (H3) |
| E. Breach plan | ❌ | None (H3, ROADMAP §4) |
| F. Marketing e-mail / İYS | ✅ | None |
| G. Children | ❔ | No minimum age stated (H3; the terms of use plan says 13+) |
| H. VERBİS / EU representative | ❔ | Owner checks the current thresholds on kvkk.gov.tr; personal project likely exempt; GDPR art. 27 note |
| I. Extension permissions / Web Store form | ⚠️ | `<all_urls>` is justified; the form's data list is incomplete (M7) |

### What the code stores (server)

| Where | Personal data | Kept |
|---|---|---|
| `room` (queue, `played`) | adder's name | with the room |
| `chat` | 50 messages: id, name, avatar, text | with the room |
| `chatimg:*` | ≤ 12 images of messages in the history | with the room |
| `sticker:*`, `stickerOwners` | ≤ 24 images + uploader `cid` | with the room |
| `voters` | `cid`s per queue item | until the item leaves |
| `pins`, `history` | name, avatar, note, owner `cid` (saved rooms: ≤ 30 videos) | reset per video / until saving is off |
| `stats`, `recaps` | per-`cid` counters, name, avatar; 5 / 20 recaps | 90 days, pruned lazily (L8) |
| `host`, `bans`, `memberIds`, `tvTokens`, `tables` | `cid`s, names, avatars | with the room / 24 h / 12 h |
| game objects | names, avatars, `cid`s, scores | 24 h after empty |
| fallback sessions | messages in memory | 45 s idle |
| whole room | – | 24 h after empty, 30 days if saved |
| Workers Logs | request URLs incl. `?q=` search words, room ids | Cloudflare's log retention |
| IP hash | `SHA-256("swm-ip:" + IP)` first 64 bits, no secret | connection attachment, rate-limit keys |

### H2 — YouTube cookies before any choice (High)

`apps/web/src/players/youtube.ts:50-58` creates `YT.Player` without `host`, so the embed is `www.youtube.com` (it
sets YouTube cookies such as `VISITOR_INFO1_LIVE`); `apps/web/src/room.ts:271` preloads
`https://www.youtube.com/iframe_api` on every desktop room page, before any video is chosen. The policy (EN 71 / 108,
TR 153 / 190) says "No ads, analytics or tracking tools, and none of their cookies" and, unlike TikTok (EN 114), says
nothing about YouTube cookies. Fix: `host: 'https://www.youtube-nocookie.com'` (already in the CSP's `frame-src`),
load the API only when a YouTube item plays, and describe the embed in the policy (privacy-enhanced mode still stores
some data once a video plays). Also needed for the YouTube API compliance audit.

### H3 — Missing KVKK / GDPR core parts (High, needs the owner)

The policy has no named data controller (only `screenwithme.app@gmail.com`, EN 120), no legal basis per purpose, no
list of rights (KVKK art. 11, GDPR art. 15–22) and how to use them, no transfers abroad (Cloudflare, Google /
YouTube, TikTok in the US), no minimum age, no complaint authority (KVKK Board / EU authority), no exact date or
change history, and there is no breach response plan anywhere. These need the owner's decisions (whose name, age
limit) and a lawyer's look before the store submission.

### M5 — Reversible IP hash (Medium)

`apps/server/src/index.ts:33-37`: the prefix is fixed and public, there is no secret. All 2³² IPv4 addresses hash in
minutes, so the value is pseudonymous, not anonymous. The policy (EN 108, TR 190) calls it "shortened, scrambled … in
memory, never stores it"; it also lives in the hibernation attachment and Cloudflare's rate-limit keys, and the
policy does not mention that chat images are counted per IP. Fix: HMAC with a secret (Worker secret, rotated daily
or a daily derived key), and describe it as it is.

### M6 — Search words in our logs (Medium)

`apps/server/wrangler.jsonc` `"observability": {"enabled": true}` keeps request URLs, including
`/api/youtube/search?q=<words>` together with IP / location metadata. This contradicts EN 111 ("by the words, not by
person … nothing that identifies you"). Fix: send the search words in a POST body (or strip `q` from logged URLs, or
turn request logging off for that route) and describe our own logs and their retention in the policy.

### M7 — Policy facts are incomplete (Medium)

- "Data is never sold or shared with anyone" (EN 73, TR 155) is too absolute: Cloudflare processes everything,
  YouTube gets search words and video ids (`youtube.ts`, `titles.ts:21`), TikTok gets links (`tiktok.ts`), people in
  voice get your IP. Say "never sold; shared only with these processors / as described".
- Names are kept in more places than "chat history and ban list" (EN 53): queue and `played`, pins + saved history,
  stats and recaps, TV tokens, game objects.
- The browser id's purposes (EN 64: host and bans) leave out votes, pin and emoji owners, recaps, game seats and
  tables, `memberIds` (24 h reconnect), TV tokens.
- `GET /api/rooms/:id/info` shows up to 3 names + count + what plays to anyone with the link, before joining; the
  policy says names are shown "to the others in the room". Short custom ids (4 characters, e.g. `/r/test`) are
  guessable. Either describe it ("anyone with the link sees who is inside") or show only the count until joining.
- Device **labels** are saved (`opt:micName` etc., `ui/voice-check.ts:22-24`), not only device codes (EN 60); labels
  can contain a person's name and are mirrored to the extension.
- Local keys not mentioned: `lastRoom`, other people's names in `voiceSound` / `camHidden` / `camTiles:*`, `tvPair`,
  `tipsSeen`, `recentReactions`; the policy should say the site stores settings on the device.
- Third-party requests not mentioned: `i.ytimg.com` thumbnails, video-file and film-page hosts (every viewer's
  browser fetches them), the server's YouTube / TikTok oEmbed title lookups.
- Life Poker is not named in the Games section (the general wording covers it).
- Chrome Web Store form (`docs/internal/web-store.md:102, 123-130`): "personal communications" should include voice,
  camera and chat images on film pages; the `storage` justification should cover every mirrored key; add
  `scripting`. The extension text (EN 78 "reads … nothing in other tabs") should say content scripts sleep in every
  frame and the background watches new tabs opened from the film tab (ad tab closing).

### L8 — Retention hygiene (Low)

Recaps are filtered by age only on save / read (`room.ts:627, 633`), so storage can hold recaps older than 90 days.
After `deleteAll` in the alarm (`room.ts:772-795`) in-memory `tvTokens`, `memberIds`, `counted`, `roomId` are not
cleared and the next `put` writes them back (small effect thanks to their own TTLs). Fix: prune recaps in the alarm /
on load; reset all in-memory state with `deleteAll`.

### L9 — Policy link at the join step (Low)

The only link is the footer (`index.html:49`), hidden in phone rooms, the overlay and the Shorts view
(`phone.css:119, 893`, `styles.css:4346, 4558`). Fix: a small "Privacy" link on the join card and in ⋯ / settings.

## 4. Dependencies, secrets, repository

- `npm audit`: 3 findings, **all dev-only** (`npm audit --omit=dev` = 0): `undici` 7.29.1 (high: several DoS, TLS
  and cache advisories) via `miniflare` via `wrangler` 4.151.1 (moderate). Only local `wrangler dev` / deploy use them.
  Fix: update `wrangler` (4.156.2 is out) and re-run the tests.
- Secrets: no keys, tokens or private keys in tracked files or in the reachable history (shallow clone, 96 commits:
  the full history should be scanned once with GitHub secret scanning before the repo goes public). `.gitignore`
  covers `.env*` and `.dev.vars`. The YouTube key travels as a GitHub secret into a temp file that is deleted.
- Repository hygiene (ROADMAP §3): no Dependabot config, `.github/workflows/test.yml` has no `permissions:` block (the
  default token may be broad; set `contents: read`), actions pinned by tag (`@v5`, acceptable; SHA pins are
  stricter), no `SECURITY.md`. Branch protection on `main` is a GitHub setting (owner).
- Info: production also accepts `localhost` / `127.0.0.1` origins (`index.ts:27`; harmless unless a malicious page
  runs on the victim's own localhost); the fallback `sid` travels in the query string and lands in our logs (128-bit,
  logs are owner-only).

## Proposed cards

Added under **Proposed** in `CARDS.md`, most severe first: H1, M1 (with H1's `hello` part), H2, H3 + M7 (policy
rewrite), M5, M6, M3, M4, M2, M8, L1, L4, L2 + L3 + L5 (room abuse limits), L6, L7 + L8 (hygiene), L9, L10.
