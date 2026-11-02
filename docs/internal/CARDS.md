# Job cards (the board)

Owner's rule (2 Nov 2026): one board for every session. The **Planner** writes and orders cards; the **Developer** takes
the top **Ready** card, moves it to **In progress**, and when it is live adds `Done: <PR link>` and moves it to
**Done**. **Security** and **Research** add their suggestions under **Proposed**; the Planner and the owner decide
whether they become Ready. Roles and rules: `CLAUDE.md` "Sessions as an office". The order follows `ROADMAP.md`
"Focus: now / next / frozen"; the owner's tick view is https://claude.ai/artifact/EtqKiBo8k5vgR422rq14K5.

Card format:

```
### <short title>
- Why: <one line>
- Done when: <what can be checked>
- Tests: <unit / e2e / harness / owner's hand test>
- Owner's pick: <link or "none needed">
```

## In progress

### Phone: next speed steps (0.9.93 "Now" 2)
- Why: the phone room should open and react fast on mid-range phones.
- Done when: voice / stream / TV code loads only when needed, phones get a lighter stylesheet, and an automatic phone
  speed test (4× slower CPU) runs against the built site with agreed budgets.
- Tests: the speed test itself in CI; `scripts/harness/phone/run.cjs` still passes.
- Owner's pick: none needed.

## Ready

### Owner's hand tests 0.9.92.3 – 0.9.93.5 (0.9.93 "Now" 3)
- Why: the 0.9.93 gate needs them.
- Done when: every box in `STATUS.md` "Owner's hand tests" for these versions is ticked or turned into a bug card.
- Tests: the owner's own (computer, phone, Shorts, first-time path, hotspot).
- Owner's pick: none needed.

## Proposed

(Security and Research add cards here.)

### Simplify the room: a "first view" until something plays (Research, 0.9.94 "Next" 1)
- Why: every competitor's first room view is player + add a video + invite (+ chat); ours shows the full dock, the
  Together card, three tabs, pins, film time, votes, recap. Details: `research/newcomers-help-shorts.md` §1.
- Done when: until the room's first video plays, a computer and a phone show only: add a video (search / link), invite,
  chat, join voice; games, pins, film time, votes, recap, saved room, speed sit under ⋯ (or appear once something
  plays). The owner picks the exact list on an option page (ROADMAP §1 item 3).
- Tests: harness check per layout (computer, phone) that only those controls are visible in an empty room and the rest
  appear after play; first-tips still find their anchors.
- Owner's pick: needed (which features stay visible; option page by the Planner).

### Help / FAQ page, ordered by what users ask first (Research, 0.9.94 "Next" 2)
- Why: competitors' help starts with "how to start", "who needs the extension", "it doesn't sync", "permissions";
  nobody explains permissions well. Details: `research/newcomers-help-shorts.md` §2–3.
- Done when: `/help` (EN first, TR variant) answers in this order: 3 steps; who needs the extension (only film pages;
  YouTube / TikTok / links and phones need nothing); what the extension can and cannot see; "not in sync / video not
  found" checklist (update, other video extensions / VPN, reload, 🎯 Pick video, 👁 Show the page, Sync everyone to me);
  connection problems → `/baglanti`; phones; voice, cameras and IP; ads inside YouTube come from YouTube; privacy link.
  In-product hints (`.net-hint`, video not found, blocked WebRTC) link to their answer. No film / service names.
- Tests: e2e / harness that `/help` loads in EN and TR and every in-product help link lands on an existing anchor; a
  non-Turkish reader check (owner).
- Owner's pick: none needed for the order; copy follows the slogan rules.

### "Send feedback" with opt-in diagnostics (Research, 0.9.94 "Next" 3)
- Why: every support thread starts with "which browser / version?"; Teleparty's e-mail-only support ends up on
  Trustpilot; Discord's form is one-way. Details: `research/newcomers-help-shorts.md` §2.
- Done when: "Send feedback" in the profile menu / ⋯ and on `/help` opens a small form (text, optional e-mail, an
  unticked "attach technical info": site + extension version, browser, transport ws/http, last `/baglanti` result; no
  room id, names or chat); a Worker endpoint stores it with a rate limit; the owner can read the list; the privacy
  policy names it.
- Tests: e2e (send, rate limit, nothing attached when unticked); unit for the payload builder.
- Owner's pick: where the owner reads them (stored list vs. e-mail), and whether GitHub issue templates come too.

### Extension permission explainer (Research)
- Why: scanners rate "all websites" access as critical; users and guides struggle with "read and change site data";
  trust is a top complaint (Teleparty, Rave). Details: `research/newcomers-help-shorts.md` §3.
- Done when: the extension page and the "Filme git" card say in two plain lines why the extension asks for every site,
  that it does nothing outside a room, and link to the FAQ answer; the same text is ready for the store's permission
  justifications (ROADMAP 0.9.97).
- Tests: harness / e2e that the text and link are present (EN + TR).
- Owner's pick: none needed.

### "Scroll Shorts together" page / home-page door (Research)
- Why: people search for "watch YouTube Shorts / TikTok together"; the only competitor with pages for it (TandemParty)
  needs a host computer + extension and only the host scrolls; ours works on phones, no install, anyone swipes.
  Details: `research/newcomers-help-shorts.md` §4.
- Done when: a home-page door (and a small English-first page) "Scroll Shorts together" creates a room that opens
  straight into the Shorts view with 🎲 Discover; no service is named beyond YouTube Shorts / TikTok.
- Tests: e2e / harness: the door creates a room in the Shorts view with a feed starting.
- Owner's pick: copy and whether it is a page or only a home door.

Cards from `security-review-2.md` (2 Nov 2026, `main` at 0.9.93.5), most severe first. Each card names its finding id
(H = high, M = medium, L = low); the details, file:line references and attack scenarios are in the review.

### Security: the HTTP fallback must not be able to crash a room (H1, M1)
- Severity: high
- Why: one person with the room link can reset the room's Durable Object (everyone drops) with a chunked POST body
  that is read uncapped, or with fallback sessions that never poll while repeated `hello`s queue every sticker and
  chat image (16 MB allowed per session).
- Done when: fallback POST bodies are read as a stream and stopped at `SEND_BODY_BYTES` (no body read for
  `open` / `close`); `QUEUE_BYTES` is 2–4 MB and the total per `PollHub` is capped; a session that does not poll within
  ~10 s of `open` is closed; a second `hello` on a joined connection is refused (or may not change the `cid`).
- Tests: e2e (chunked oversize POST → 413 and the room still answers; a session that never polls is closed; a second
  `hello` is refused), `fallback.mjs` and the hotspot harness still pass.
- Owner's pick: none needed.

### Security: cap queue votes (M1)
- Severity: medium
- Why: `voters` grows without a cap and without checking the voter is present; with rotated browser ids it can pass
  the storage value limit and freeze the room's queue.
- Done when: voters per item are capped (e.g. `MAX_MEMBERS`) and only people in the room count; the second-`hello`
  fix from the card above is in.
- Tests: e2e (many votes from one connection with changing ids count once / stay capped).
- Owner's pick: none needed.

### Privacy: YouTube privacy-enhanced embed, loaded only when needed (H2)
- Severity: high
- Why: the player uses `www.youtube.com` and the API is preloaded on every room page, so YouTube sets cookies before
  anyone chose a video, while the policy says "none of their cookies"; this also matters for the YouTube API audit.
- Done when: `YT.Player` uses `host: 'https://www.youtube-nocookie.com'`, `iframe_api` loads only when a YouTube item
  is about to play, and the policy describes the YouTube embed like the TikTok one.
- Tests: harness (no request to `www.youtube.com` on a room page with nothing playing; YouTube plays from the
  no-cookie host); existing room / Shorts harnesses; owner's hand test of YouTube playback.
- Owner's pick: none needed.

### Privacy: rewrite the privacy policy for KVKK + GDPR (H3, M7)
- Severity: high
- Why: the policy has no data controller, legal basis, rights and how to use them, transfers abroad, minimum age,
  complaint authority or exact date, and several facts are incomplete ("never shared with anyone", where names are
  kept, browser-id purposes, room info shown before joining, device labels, local keys, third-party requests, Life
  Poker); the Web Store data form has the same gaps.
- Done when: `privacy.html` (TR + EN, same content) covers every item in `security-review-2.md` §3 H3 and M7 with a
  dated change line; `docs/internal/web-store.md` lists voice / camera / chat images and `scripting`; a one-page breach
  plan exists in `docs/internal/`; the owner has had it read by a lawyer before the store submission.
- Tests: review against the stored-data table in `security-review-2.md`; owner's read-through.
- Owner's pick: needed (controller name / address, minimum age, contact address, lawyer).

### Privacy: a secret in the IP hash (M5)
- Severity: medium
- Why: the IP hash is an unsalted SHA-256, so every IPv4 address can be recovered from it; the policy calls it
  scrambled.
- Done when: `ipKey` is an HMAC with a Worker secret (rotated daily or a daily derived key), rate limits still work,
  and the policy describes it as it is (incl. chat images counted per IP).
- Tests: unit (same IP same day → same key, different day → different key), e2e emoji / image limits still pass.
- Owner's pick: none needed.

### Privacy: no search words in our logs (M6)
- Severity: medium
- Why: Workers Logs keep `/api/youtube/search?q=<words>` with the caller's IP metadata, which contradicts the policy's
  "by the words, not by person".
- Done when: search words travel in a POST body (or are otherwise kept out of logged URLs), and the policy names our
  own logs and their retention.
- Tests: e2e `search.mjs`; a local check that the logged URL has no `q`.
- Owner's pick: none needed.

### Security: a daily YouTube quota budget (M3)
- Severity: medium
- Why: scripts without an `Origin` may search, limited only to 10 / min / IP, so one IP can spend the whole day's
  quota in ~10 minutes and turn search / Shorts feed / Discover off for everyone.
- Done when: a global daily unit budget (one Durable Object or KV counter) and a per-IP daily cap guard search, pool
  and like; the "quota" answer is used when the budget is out.
- Tests: unit for the budget logic; e2e `search.mjs` still passes.
- Owner's pick: none needed (the per-IP number can be tuned later).

### Security: rate-limit the cheap routes that wake Durable Objects (M4)
- Severity: medium
- Why: `/api/version` creates a new object per call, `/api/rooms/:id/info` and fallback `send/poll/close` with any
  `sid` reach objects without a limit; a loop can spend the daily Durable Object allowance.
- Done when: `/api/version` needs a token from the deploy job (or is strictly limited), `/info` and all fallback
  requests have per-IP limits, the Worker checks `sid` against `^[0-9a-f]{32}$` before forwarding.
- Tests: e2e (bad `sid` answered by the Worker; `/info` limit), deploy job's `wait-live.mjs` still works.
- Owner's pick: none needed.

### Security: make-host only by the real host (M2)
- Severity: medium
- Why: during the host's 20 s reload grace the oldest guest counts as host and can hand the role to themselves for good.
- Done when: `make-host` is refused unless the sender's key is `hostKey`.
- Tests: e2e `host.mjs` (host reloads, oldest guest's `make-host` → `not_host`, host returns as host).
- Owner's pick: none needed.

### Security: TV link hardening before the TV leaves the lab (M8)
- Severity: medium (only while `?tvlab=1` hides the TV)
- Why: a TV token is the whole person including host rights, a QR shown by someone else can phish it, and pairing
  codes can be guessed (limit keyed on a browser id the client chooses).
- Done when: a `tv:true` connection may only send ping / tv / listen-only voice / react; the phone confirms before
  pairing; `tv-link` is limited per IP hash and per room (plus a Worker rate limit); codes are 8 digits.
- Tests: e2e `tv.mjs` (TV connection's `kick` / `make-host` / `settings` refused; brute-force attempts limited),
  harness `tv/run.cjs`.
- Owner's pick: none needed (part of the TV version after 1.0).

### Security: one text cleaner for names, chat and titles (L1)
- Severity: low
- Why: zero-width and right-to-left control characters pass, so a guest can look exactly like the host or reverse
  the text of a message.
- Done when: one shared sanitizer (removes `\p{Cc}`, `\p{Cf}` except ZWJ inside emoji, lone surrogates; cuts by code
  point) is used for names, room names, chat, pin notes, titles (also URL file names and oEmbed) and guesses.
- Tests: unit in `protocol.test.ts` (U+200B, U+202E, U+2066, split surrogate pair).
- Owner's pick: none needed.

### Security: safer media links (L4)
- Severity: low
- Why: `html5` / `page` items accept `http:`, user-info, `localhost` and private IPs, so one guest can make every
  viewer's browser request a device on their own network; `page` titles are chosen by the client.
- Done when: `html5` needs `https:`, user-info is refused, IP literals / private / `.local` hosts are refused, the
  page's host is shown next to a client-given title.
- Tests: unit (`cleanMedia` cases); e2e queue tests still pass.
- Owner's pick: none needed.

### Security: room abuse limits (L2, L3, L5)
- Severity: low
- Why: signal floods per connection reset on reconnect, `ready:false` lets a guest pause a host-only room again
  after a reconnect, and 51 sockets that never say `hello` make a room "full" for 150 s.
- Done when: signal limits are per person and target pair (a few offers per minute per pair); the wait cooldown is
  keyed by person / IP hash; "full" counts joined members and unjoined sockets close after ~15 s.
- Tests: e2e (`voice.mjs`, `wait.mjs` additions; unjoined sockets closed).
- Owner's pick: none needed.

### Security: game rules for every player (L6)
- Severity: low
- Why: any Draw & Guess player can reset or start the game, `undo` re-sends all strokes 8 times a second, the Quiz
  50/50 joker leaks the answer with a second identity, Poker's `people` grows without a cap and anyone can deal.
- Done when: host / opener checks on Draw `reset` / `start` and Poker `start`; `undo` ≤ 1/s; one hidden 50/50 pair
  per question; Poker `people` capped; (optional) game objects accept only a short-lived ticket from the room.
- Tests: e2e `draw.mjs`, `quiz.mjs` and a Poker e2e case.
- Owner's pick: none needed.

### Security: small hygiene fixes (L7, L8)
- Severity: low
- Why: the TikTok resolver's later hops may use `http:`, another port or user-info; recaps older than 90 days stay in
  storage until read; the room's reset leaves in-memory tokens that are written back.
- Done when: every TikTok hop needs `https:`, no port, no user-info, and bodies are cancelled; recaps are pruned in
  the alarm / on load; `deleteAll` also clears `tvTokens`, `memberIds`, `counted`.
- Tests: unit for the TikTok URL check; e2e recap test.
- Owner's pick: none needed.

### Privacy: a privacy link where people join (L9)
- Severity: low
- Why: the policy is only in the footer, which phones, the film page overlay and the Shorts view hide.
- Done when: the join card and the settings / ⋯ menu link to `privacy.html` in the page's language.
- Tests: phone harness check for the link.
- Owner's pick: none needed.

### Repo: dependency and workflow hygiene (L10)
- Severity: low
- Why: `npm audit` reports dev-only advisories in `undici` (via `wrangler`), there is no Dependabot, the workflow has
  no `permissions:` block, and there is no `SECURITY.md` (ROADMAP §3).
- Done when: `wrangler` updated and `npm audit` clean; `.github/dependabot.yml` (npm + actions, weekly);
  `permissions: contents: read` in `test.yml`; `SECURITY.md` with the contact address; owner turns on branch
  protection and secret scanning for `main`.
- Tests: CI green; `npm audit` 0.
- Owner's pick: needed only for the GitHub settings (branch protection, secret scanning).

## Done

### Root cause of the live e2e first-attempt failures
- Done: https://github.com/alperenakturk/screen-with-me/pull/113, https://github.com/alperenakturk/screen-with-me/pull/114
  (deploys restarted test rooms mid-test; the deploy job now waits for the new version).
