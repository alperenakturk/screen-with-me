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

### Simplify the room (0.9.94 "Next" 1) ⏳ owner's pick first
- Why: a newcomer on a computer sees too many places at once; film time, save room, recap, shortcuts, sync test and
  room rules are spread over the settings dialog, the profile menu and the toolbar.
- Done when: the option the owner picked is built on computer + phone (recommended C: one "⋯ More" menu in the top
  bar with the same items and order as the phone's ⋯ sheet; the settings dialog keeps "My screen" only); nothing is
  lost (every feature still reachable in ≤ 2 clicks); Research's option D (a "first view" until the first
  video plays: add a video, invite, chat, join voice) is on the option page too (`research/newcomers-help-shorts.md` §1); `store/src/room.html` copy updated; no scrollbars at 1024×640.
- Tests: new harness checks (every moved item opens from the new place, computer + phone); `phone/run.cjs`,
  `yt-room/run.cjs`, `room-extras/run.cjs`, `invite/run.cjs` still pass; owner's hand test on his laptop.
- Owner's pick: question 1 on https://claude.ai/artifact/9AJXCNuwBojdibzZaX1baw (A light touch / B newcomer mode / C one "More" menu / D first view until something plays). Waiting.

### Help / FAQ page, English + Turkish (0.9.94 "Next" 2)
- Why: newcomers and store reviewers need one place for "how does it work", the extension's permissions and
  troubleshooting (voice does not connect, hotspot, Brave shields, autoplay).
- Done when: `/help` (EN, `?lang=tr` for Turkish, like `privacy.html`) with sections: how it works, the extension and
  why it asks each permission, voice / camera / streams, phones, troubleshooting (links to `/baglanti`), privacy
  summary, in the order users ask first (Research §2–3: 3 steps, who needs the extension, what it can and cannot
  see, "not in sync / video not found" checklist, connection, phones, voice and IP); in-product hints link to their
  answer; linked from the footer, the profile menu, the phone ⋯ sheet and the extension page; same numbers as the
  code (limits, retention); a non-Turkish reader understands the English text (0.9.94 gate).
- Tests: static page check in a harness (loads, both languages, every in-page link resolves, CSP has no errors);
  a "same numbers" spot check against `protocol.ts` limits.
- Owner's pick: none needed (Claude writes it; the owner reads the Turkish version).

### "Send feedback" button (0.9.94 "Next" 3) ⏳ owner's pick first
- Why: the closed beta and the launch need an easy way for people to tell us what broke (ROADMAP §2 closed beta, §7
  feedback loop).
- Done when: a "Send feedback" entry in the ⋯ menu, the profile menu and the Help page opens a short form (what
  happened, optional e-mail, an unticked "attach technical info" box: site + extension version, browser, transport,
  last `/baglanti` result; never room id, names or chat; Research §2) and the message reaches the place the
  owner picked; per-IP rate limit, no IP stored; privacy policy updated (EN + TR).
- Tests: unit test for the validation; e2e for the endpoint (accepts, rejects too long / too many); harness opens the
  form on computer + phone.
- Owner's pick: question 2 on https://claude.ai/artifact/9AJXCNuwBojdibzZaX1baw (A in-site form → a `feedback` issue in the private repo, needs a GitHub token
  secret from the owner / B e-mail only / C Google Form). Waiting.

### Shorts: a feed from one channel + Discover by region (0.9.94 "Next" 4) ⏳ owner's pick first (region)
- Why: owner, 1 Nov 2026: type a channel name or link and get its Shorts; Discover should show the viewer's country's
  popular Shorts instead of a mixed list.
- Done when: the ♾ window accepts a channel link / @handle / name and starts a feed of that channel's Shorts (uploads
  playlist, the `like` path's code reused; cached per channel and day); Discover uses the region the owner picked
  (recommended A: the connection's country from Cloudflare, not stored, with a "🌍 Country ▾" chip of about 10
  countries + "World"; one pool per kind + country + day); quota cost per new query written down; privacy policy
  mentions the country use.
- Tests: unit tests for channel input parsing; Worker unit / e2e with `YOUTUBE_API_KEY` off (`off` answer) and the
  region parameter validated; `shorts-rail/run.cjs` still passes; owner's hand test with a real channel.
- Owner's pick: question 4 on https://claude.ai/artifact/9AJXCNuwBojdibzZaX1baw (A viewer's country, changeable / B by site language / C ask every time). Waiting.

### Thanks page (0.9.94 "Next" 5) ⏳ owner's pick first
- Why: owner, 1 Nov 2026: credit the people who helped by testing.
- Done when: `/thanks` (EN, `?lang=tr` Turkish) with the names the owner sends (only people who said yes) and a short
  thank-you text; linked from the footer and the Help page; if the owner picks A, the feedback form later gets an
  unticked "Credit me on the Thanks page" box (with the beta).
- Tests: static page check in the same harness as Help.
- Owner's pick: question 3 on https://claude.ai/artifact/9AJXCNuwBojdibzZaX1baw (A hand-made list now + opt-in box in the beta / B no names). Waiting; the owner
  also sends the list of names.

### Shorts scrolling, really good: measure and preload (0.9.94, alongside)
- Why: owner, 29 Oct 2026: "working is not enough, make it great"; the 0.9.94 gate needs the switch measurement
  written down (preload if > 300 ms).
- Done when: the owner and a friend measured the switch gap with `?olcum=1` in real Chrome (5+ switches, numbers in
  `STATUS.md`); if the average is > 300 ms a hidden preload player for the next Short is built (YouTube's rules
  checked: nothing of ours over the player); otherwise the measurement is recorded and the card closes.
- Tests: owner's hand measurement first; for a preload player a harness with a fake YouTube player (like the TikTok
  stand-in) checks the next Short is cued before the switch; `shorts-rail/run.cjs` still passes.
- Owner's pick: none needed for the code; the owner's measurement is the first step (hand test).

## Proposed

(Security and Research add cards here.)

_Planner, 2 Nov 2026: Research's "Simplify the room: a first view", "Help / FAQ ordered by what users ask first" and "Send feedback with opt-in diagnostics" were folded into the Ready cards above (their details are in `research/newcomers-help-shorts.md`)._

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
### Hidden test panel `?debug=1` (Planner's proposal, from the ideas list; owner decides)
- Why: the owner tests from his phone without a computer; it gathers `/baglanti`, `?olcum=1`, `?tvlab=1`, version,
  transport, sync stats, recent errors (copy button), feature switches and "start as a first-time visitor".
- Done when: `?debug=1` once in a tab shows the panel; normal users never see it; no personal data in it.
- Tests: harness opens it and checks each part; a normal visit shows nothing.
- Owner's pick: proposed for 0.9.94 before the Shorts measurement card (https://claude.ai/artifact/9AJXCNuwBojdibzZaX1baw, "Ideas"). Waiting.

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
