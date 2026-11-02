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

_Order agreed with the owner on 2 Nov 2026. Cards 1–5 close the 0.9.93 gate (owner-reported bugs + hand tests); the
rest is 0.9.94. The owner's picks on https://claude.ai/artifact/9AJXCNuwBojdibzZaX1baw: 1 = C + D, 2 = A, 3 = A, 4 = A, ideas as proposed._

### 1. Fix: the rail never hides in YouTube fullscreen (0.9.93 "Now" 1, owner's bug)
- Why: owner, 2 Nov 2026 (screenshot, after 0.9.93.5): in fullscreen, with the mouse moved to the middle of the video,
  the right rail (💬 😀 📌 🎮 🎙 📷 ⋯ ⛶, mic and camera red because not in voice) stays however long he waits.
- Done when: in fullscreen and in the window the rail rests (`.dock-idle`) `HIDE_MS` after the mouse leaves the right
  edge, whatever was pressed before (rail buttons, Esc, shortcuts, emoji, the message box empty); root cause written in
  `STATUS.md`; the same check on the film page's rail.
- Tests: a `yt-room` harness check that fails on 0.9.93.5 first (enter fullscreen, move to the centre, wait 1 s →
  rail hidden), also after pressing 🎙 / 📷 outside voice and after ⋯ → Esc; owner's hand test.
- Owner's pick: none needed.

### 1a. Security: the HTTP fallback must not be able to crash a room (H1, M1; Planner: right after card 1)
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


### 1b. Security: cap queue votes (M1; with 1a)
- Severity: medium
- Why: `voters` grows without a cap and without checking the voter is present; with rotated browser ids it can pass
  the storage value limit and freeze the room's queue.
- Done when: voters per item are capped (e.g. `MAX_MEMBERS`) and only people in the room count; the second-`hello`
  fix from the card above is in.
- Tests: e2e (many votes from one connection with changing ids count once / stay capped).
- Owner's pick: none needed.


### 2. One rail everywhere: empty room and the film page (0.9.93 "Now" 1, owner's request)
- Why: owner, 2 Nov 2026: an empty room still shows the old bar under the video (😀 React, Games, Sync, 1×, ⇥, ⛶), and
  the extension's film page shows that bar and a rail at the same time. He wants the same right rail on every page:
  empty room, YouTube, video files, the film page; no bar under the video anywhere on a computer.
- Done when: on a computer the toolbar under the video is gone in every state (empty room, YouTube, file, test, film
  page in the shell); everything it held is in the rail or its ⋯ (Games, Pin, Sync, speed, Next, side panel / cinema
  mode, fullscreen); the empty room's rail shows only what makes sense with no video (😀, 🎮, 🎙 / 📷, ⋯, ⛶ dimmed);
  the rail's look follows Research's verdict "Rail look on YouTube": allowed → the film page's translucent rail over
  the video's edge everywhere; not allowed → everywhere (film page too) a rail that opens and closes, placed by the
  video's size, never covering the video; phones unchanged; `store/src/room.html` copy updated.
- Tests: `yt-room`, `embed/run.mjs` (film page: no toolbar, rail islands), `phone/run.cjs` still pass; new checks for
  the empty room; owner's hand test on the site and the film page.
- Owner's pick: done (one rail everywhere). Research verdict (2 Nov 2026, `research/youtube-overlay-rail.md`): an
  overlay on the YouTube player is **not allowed** (Required Minimum Functionality "Overlays and frames"), so the owner's
  rule applies: everywhere, the film page too, the rail opens and closes beside the video, placed by the video's size,
  never covering it. Extra test: `embed/run.mjs` checks the rail's box never intersects the film video's box.

### 3. Owner's hand tests 0.9.92.3 – 0.9.93.5 (0.9.93 "Now" 3)
- Why: the 0.9.93 gate needs them.
- Done when: every box in `STATUS.md` "Owner's hand tests" for these versions is ticked or turned into a bug card.
  The owner works from the ordered PDF checklist (2 Nov 2026) and sends results to the Planner.
- Tests: the owner's own (computer, phone, Shorts, first-time path, hotspot).
- Owner's pick: none needed.

### 4. Invite window: a real WhatsApp button and a QR tab (0.9.93, owner's feedback)
- Why: owner, 2 Nov 2026: the WhatsApp button shows a speech-bubble emoji; the QR text "A friend next to you can scan
  it with their phone's camera" reads badly.
- Done when: the WhatsApp button carries WhatsApp's own glyph (inline SVG, green as in WhatsApp's brand guidelines for
  share buttons, text "WhatsApp"); the window has two tabs "Link" and "QR"; the QR tab shows only the QR code (big)
  with "Copy image" (PNG to the clipboard, falls back to download) and no explanation sentence; EN + TR; fits without
  scrolling at 1024×640 and on a phone.
- Tests: `invite/run.cjs` updated (+ tab switch, copy image, no scroll); owner's hand test.
- Owner's pick: done (owner's words); the WhatsApp glyph follows WhatsApp's brand rules.

### 5. Home page: "Continue where you left off" overflows (0.9.93, owner's bug)
- Why: owner, 2 Nov 2026 (screenshot): a long video title runs out of the card under the room preview.
- Done when: the card's lines are one line each with an ellipsis (full title in `title`), the card never overlaps the
  preview at any width from 860 px up, and on phones.
- Tests: a harness check with a 200-character title at 1920, 1366, 1024 and 390 px; owner's hand test.
- Owner's pick: none needed.

### 6. Simplify the room (0.9.94 "Next" 1)
- Why: a newcomer sees too much at once; Research found every competitor's first room view is player + add a video +
  invite (`research/newcomers-help-shorts.md` §1).
- Done when (owner picked C + D): one "⋯ More" menu with the same items and order as the phone's ⋯ sheet (film time,
  save room, recap, shortcuts, sync test, room rules); the settings dialog keeps "My screen"; until the room's first
  video plays the room shows only add a video, invite, chat and join voice (the rest appears for everyone when
  something plays, or under ⋯); every feature reachable in ≤ 2 clicks; built after card 2 (the rail is the base);
  `store/src/room.html` updated; no scrollbars at 1024×640; first-tips still find their anchors.
- Tests: harness checks (every moved item opens from its new place; empty vs playing room, computer + phone);
  `phone`, `yt-room`, `room-extras`, `invite` harnesses still pass; owner's hand test.
- Owner's pick: C + D (2 Nov 2026, https://claude.ai/artifact/9AJXCNuwBojdibzZaX1baw).

### 6a. Privacy: YouTube privacy-enhanced embed, loaded only when needed (H2; 0.9.94, before the Help page)
- Severity: high
- Why: the player uses `www.youtube.com` and the API is preloaded on every room page, so YouTube sets cookies before
  anyone chose a video, while the policy says "none of their cookies"; this also matters for the YouTube API audit.
- Done when: `YT.Player` uses `host: 'https://www.youtube-nocookie.com'`, `iframe_api` loads only when a YouTube item
  is about to play, and the policy describes the YouTube embed like the TikTok one.
- Tests: harness (no request to `www.youtube.com` on a room page with nothing playing; YouTube plays from the
  no-cookie host); existing room / Shorts harnesses; owner's hand test of YouTube playback.
- Owner's pick: none needed.


### 7. Help / FAQ page, English + Turkish (0.9.94 "Next" 2)
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


### 8. Extension permission explainer (0.9.94, with the Help page; from Research)
- Why: scanners rate "all websites" access as critical; users and guides struggle with "read and change site data";
  trust is a top complaint (Teleparty, Rave). Details: `research/newcomers-help-shorts.md` §3.
- Done when: the extension page and the "Filme git" card say in two plain lines why the extension asks for every site,
  that it does nothing outside a room, and link to the FAQ answer; the same text is ready for the store's permission
  justifications (ROADMAP 0.9.97).
- Tests: harness / e2e that the text and link are present (EN + TR).
- Owner's pick: none needed. Owner agreed 2 Nov 2026.


### 9. "Send feedback" button (0.9.94 "Next" 3)
- Why: the closed beta and the launch need an easy way for people to tell us what broke (ROADMAP §2, §7).
- Done when: "Send feedback" in ⋯, the profile menu and the Help page opens a short form (what happened, optional
  e-mail, an unticked "attach technical info" box: site + extension version, browser, transport, last `/baglanti`
  result; never room id, names or chat); a Worker endpoint opens a `feedback`-labelled issue in the private repo with
  a fine-grained token (`FEEDBACK_GITHUB_TOKEN` secret, issues: write on this repo only); per-IP rate limit, no IP
  stored; e-mail addresses only in the issue body; privacy policy (EN + TR) names it.
- Tests: unit (payload builder, validation); e2e for the endpoint with the token off (`off` answer) and limits;
  harness opens the form on computer + phone; owner's hand test after the token is set.
- Owner's pick: A, in-site form → GitHub issue (2 Nov 2026). **Owner action:** create the token and add it as a repo
  secret when the Developer asks (steps in the PR).

### 10. Shorts: a feed from one channel + Discover by region (0.9.94 "Next" 4)
- Why: owner, 1 Nov 2026: type a channel and get its Shorts; Discover should show the viewer's country.
- Done when: the ♾ window accepts a channel link / @handle / name and starts that channel's Shorts feed (uploads
  playlist, reusing the `like` path; cached per channel and day); Discover uses the connection's country from
  Cloudflare (`cf.country`, never stored) with a "🌍 Country ▾" chip of about 10 countries + "World" (one pool per
  kind + country + day); quota cost per new query written down; privacy policy mentions the country use.
- Tests: unit tests for channel input parsing; Worker e2e with `YOUTUBE_API_KEY` off and the region validated;
  `shorts-rail/run.cjs` still passes; owner's hand test with a real channel.
- Owner's pick: A, viewer's country, changeable (2 Nov 2026).

### 11. Thanks page (0.9.94 "Next" 5)
- Why: owner, 1 Nov 2026: credit the people who helped by testing.
- Done when: `/thanks` (EN, `?lang=tr`) with the names the owner sends (only people who said yes) and a short
  thank-you; linked from the footer and the Help page; the feedback form gets an unticked "Credit me on the Thanks
  page" box when the closed beta starts.
- Tests: static page check in the same harness as Help.
- Owner's pick: A (2 Nov 2026). **Owner action:** send the list of names who said yes.

### 12. Hidden test panel `?debug=1` (0.9.94, before the Shorts measurement)
- Why: the owner tests from his phone without a computer; it gathers `/baglanti`, `?olcum=1`, `?tvlab=1`, version,
  transport, sync stats, recent errors (copy button), feature switches and "start as a first-time visitor".
- Done when: `?debug=1` once in a tab shows the panel; `?debug=0` hides it; normal users never see it; no personal data.
- Tests: harness opens it and checks each part; a normal visit shows nothing.
- Owner's pick: agreed 2 Nov 2026 (ideas list).

### 13. Shorts scrolling, really good: measure and preload (0.9.94, alongside)
- Why: owner, 29 Oct 2026: "working is not enough, make it great"; the 0.9.94 gate needs the switch measurement
  written down (preload if > 300 ms).
- Done when: the owner and a friend measured the switch gap with `?olcum=1` in real Chrome (5+ switches, numbers in
  `STATUS.md`); if the average is > 300 ms a hidden preload player for the next Short is built (YouTube's rules
  checked: nothing of ours over the player); otherwise the measurement is recorded and the card closes.
- Tests: owner's hand measurement first; for a preload player a harness with a fake YouTube player (like the TikTok
  stand-in) checks the next Short is cued before the switch; `shorts-rail/run.cjs` still passes.
- Owner's pick: none needed for the code; the owner's measurement is the first step (hand test).

### 14. Cinema mode (0.9.94, owner's new feature)
- Why: owner, 2 Nov 2026: the ⇥ "hide the side panel" button should be a real cinema mode: the page around the video
  goes dark, like YouTube. He asked Claude to design it (it was a Phase 2 idea; now pulled into 0.9.94).
- Done when (Planner's design, the owner may change it): ⇥ becomes "Cinema mode" (rail ⋯ and shortcut **T**, like
  YouTube's theater key; also in the shortcuts card); entering it fades the page around the video to near-black in
  300 ms (theme scene, aura and side panel hidden; `prefers-reduced-motion`: no fade), the video grows to the largest
  16:9 that fits the window, the top bar slides away and returns when the mouse reaches the top edge, the rail stays
  beside the video, chat comes in as the existing top-right messages with an unread count on 💬, and the "everyone
  ready" / invite cards keep working; Esc (when nothing else is open) or T or the button leaves; remembered per tab;
  computer only (phones already watch edge to edge); not on the film page in this card.
- Tests: harness: enter / leave with the button, T and Esc; nothing but the video and the rail visible; messages
  arrive as toasts; no page scroll at 1366×768 and 1920×1080; owner's hand test.
- Owner's pick: Claude designs (owner, 2 Nov 2026); the design above is shown to him in the report.

### 15. Home page, nicer and "works on your phone" (0.9.94, owner's request) ⏳ option page first
- Why: owner, 2 Nov 2026: improve the home page; it should show it works on a phone too and feel less like a
  screenshot.
- Done when: the direction the owner picks is built (Planner prepares an option page with 2–3 directions); the hero
  shows a computer and a phone in the same room; EN first, TR; fits without scrolling on the first screen at
  1366×768; the phone home (0.9.92.5 app start screen) is unchanged unless the pick says so; Lighthouse performance
  not worse than today.
- Tests: harness screenshots at 1920, 1366, 1024, 390 px; no console errors; owner's hand test.
- Owner's pick: waiting for the Planner's option page.

### 16. Design bug sweep (0.9.94, end of the step)
- Why: owner, 2 Nov 2026: go through the whole design for mistakes; the owner should not have to find each one.
- Done when: the Developer screenshots every screen (home, join, empty room, YouTube, file, Shorts, games, settings,
  dialogs, invite, film page, `/baglanti`, privacy) at 1920×1080, 1366×768, 1024×640, 390×844 and sideways, in EN and
  TR, in a plain and a scene theme; every problem found (overflow, cut text, overlap, scrollbars, misalignment,
  contrast, mixed languages, inconsistent icons) is listed in `STATUS.md` and fixed or turned into a card; the list
  of screenshots is attached to the PR.
- Tests: the screenshot harness itself, kept for later sweeps; all harnesses pass.
- Owner's pick: none needed.

## Proposed

(Security and Research add cards here.)

_Planner, 2 Nov 2026: Security review 2 (`security-review-2.md`): H1 + M1 became Ready 1a / 1b, H2 became 6a. M3, M5,
M6 and the policy card go before the YouTube API audit (0.9.97 / 0.9.98); M8 before the TV leaves the lab; the rest
before 1.0. Owner questions (policy details, branch protection, names before joining) are being asked._

_Planner, 2 Nov 2026: Research's "first view", "Help / FAQ order" and "Send feedback with diagnostics" were folded
into Ready cards 6, 7 and 9; "Extension permission explainer" became card 8; the debug panel became card 12._

### "Scroll Shorts together" page / home-page door (Research)
- Why: people search for "watch YouTube Shorts / TikTok together"; the only competitor with pages for it (TandemParty)
  needs a host computer + extension and only the host scrolls; ours works on phones, no install, anyone swipes.
  Details: `research/newcomers-help-shorts.md` §4.
- Done when: a home-page door (and a small English-first page) "Scroll Shorts together" creates a room that opens
  straight into the Shorts view with 🎲 Discover; no service is named beyond YouTube Shorts / TikTok.
- Tests: e2e / harness: the door creates a room in the Shorts view with a feed starting.
- Owner's pick: copy and whether it is a page or only a home door. Planner: 0.9.95 (owner agreed 2 Nov 2026).

Cards from `security-review-2.md` (2 Nov 2026, `main` at 0.9.93.5), most severe first. Each card names its finding id
(H = high, M = medium, L = low); the details, file:line references and attack scenarios are in the review.

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
