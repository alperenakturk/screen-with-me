# Job cards (the board)

One board for every session (owner, 2 Nov 2026). The **Planner** writes, orders and routes cards and assigns versions;
a **Developer** or **Game Studio** takes the top **Ready** card of its lane, moves it to **In progress**, and when it is
live writes `Done: <PR link>`. **Security** and **Research** add suggestions under **Proposed**; the Planner and the
owner decide whether they become Ready. Roles, who edits what and how the owner is asked: `CLAUDE.md` §4. What to work
on now: `ROADMAP.md` "Focus: now / next / frozen". The owner's tick view is the Planner's board Artifact (`CLAUDE.md` §2).

**A finished card leaves this file in the same PR that writes its `Done:` line**: it moves verbatim to
`docs/internal/archive/cards-done.md` (DOCS2, 11 Nov 2026). CI (`scripts/check-docs.mjs`) proves no card heading or
backticked identifier is lost in a move.

Card format:

```
### <ID>. <short title> (<who asked, date>; <lane>)
- Why: <one line>
- Done when: <what can be checked, including its Test Lab hook or scenario>
- Tests: <unit / e2e / harness / owner's hand test>
- Owner's pick: <link or "none needed">
```

## Lanes

| Lane | Role | Owns (files) | Where its work stands |
|---|---|---|---|
| A | 🔨 Developer: room / site | the site, the room page and the room server, their tests and reference sections | `STATUS.md` task queue "Lane A" |
| B (+ B2) | 🔨 Developer: players, Shorts, extension, ops | players, Shorts, the extension, CI and the shared test tooling | QA1 below |
| W | 🔨 Developer: game windows (opened by the Planner when needed) | `apps/web/src/games/stage.ts`, game-window head / drag / fit, `catalog.ts` sizes, the game-window rules in `room.css` | idle (0.9.97.121 live) |
| Games 2 | 🎮 Game Studio 2 (opened 15 Nov 2026) | the Quiz and Window Garden files only (QZ2, WG2) | its PRs |
| Games | 🎮 Game Studio | the games' code, art, sounds, tutorials, server objects, `docs/internal/design/games/` | `STATUS.md` task queue "Game Studio" |
| — | 🛡️ Security · 🔎 Research · 🎨 Design | their own docs; cards go to Proposed | — |

Two sessions never edit the same lines; the Planner splits work by files.

## In progress

(see `STATUS.md` "Task queue")

## Ready

### YTQ1. PRIORITY: a bigger YouTube API quota through YouTube's audit (owner, 15 Nov 2026; Research + B2, owner submits)
- Why: the default quota is 10,000 units a day. One `search.list` costs 100 units, so roughly 100 searches a day across
  every room. The video and Shorts feeds (SH2), search and the Sources picker all depend on it. YouTube grants more
  quota for free after its "YouTube API Services Audit and Quota Extension" review. The owner: "important and urgent".
- What:
  1. **Research** (first, short): the current audit form and its requirements, how long reviews take, what gets
     rejected (Developer Policies, Required Minimum Functionality, branding, privacy, data storage limits), and whether
     the workers.dev address is acceptable or the own domain should come first. Write `research/youtube-audit.md`.
  2. **B2** (the pack):
     - a compliance self-check against the Developer Policies, with screenshots: no overlays on the player, YouTube
       branding, the privacy policy's YouTube section with the Google Privacy Policy link, the API data we store and
       for how long, and deletion;
     - fix anything that fails;
     - a quota-need estimate from our own usage numbers (QUOTA3 counters);
     - the form's answers drafted in English.
  3. **Owner:** submits the form from the Google Cloud project that owns `YOUTUBE_API_KEY` (his Google account). The
     Planner gives him the click-by-click steps with the drafted answers.
  3b. **Owner's picks (15 Nov 2026):**
     - The official YouTube logo, linked to YouTube, shows next to our YouTube result lists (search, Discover, feeds),
       never over the player. This replaces the earlier "text only" pick, for the audit. B2 builds it; Design checks
       the size and spacing rules.
     - The own domain comes first: `sidelit.app` (the owner buys it on Cloudflare; then `custom-domain.md`).
  4. Meanwhile the code stays quota-light (SH2 rules: cheap calls first, cache searches, no search per video).
- Done when: the audit pack is in `docs/internal/youtube-audit/`, every self-check item passes, and the owner has
  submitted. Later: the granted quota is recorded in `costs.md`.
- Tests: the self-check list ticked with shots; QUOTA3 counters show daily use.
- Owner's pick: "important and urgent" (Planner chat, 15 Nov 2026).

### SH1. Shorts view fixes: the way back on a phone, the first seconds, who is talking (owner, 15 Nov 2026; lane A)
- Why: three things the owner found in the Shorts view.
- What:
  0. **Urgent, the computer too (owner, 15 Nov 2026 evening):** the owner finds no "📱 Shorts view" button on a
     computer either after "↩ Room view". Today `#shorts-enter` sits in the toolbar under the video and shows only while
     a Short plays. Find why he can't see it (hidden layout, toolbar folded, SIMP1) and make the way back obvious on
     every device. Ship this first, alone if needed.
  1. **The way back on a phone:** after "↩ Room view" a phone has no way back into the Shorts view. `.shorts-enter` is
     hidden in `html.ph-room`, and `shortsOff:<room>` stays in session storage. While a Short plays, give the phone a
     clear "📱 Shorts view" entry in the Room tab (the strip under the video), and keep the computer's button.
  2. **The first 2–3 seconds:** when the next Short starts by itself, the owner misses its first 2–3 seconds. Find out
     why (preload, `command()` seek, the start being swallowed, the late-join offset) and fix it, so every viewer sees a
     Short from 0:00 together. Add a `sync-engine.test.ts` scenario if the sync engine is involved.
  3. **Who is talking:** in the Shorts bar's faces (and the phone strip's faces), a person who is speaking in voice
     gets a visible ring around their round avatar (a green glow and a slight grow), driven by the existing voice
     level.
     - It respects reduced motion (ring only, no grow).
     - It shows for yourself too, so you know your mic is going out.
  4. **TikTok, small (Research `research/tiktok-shorts.md` §6):**
     - Accept short `vm.`/`vt.tiktok.com` links when pasting many links; the Worker resolves them one by one.
     - When a TikTok plays, the ♾ window says that TikTok has no public feed and points to pasting or sharing links.
     - A harness swipes through a queue that mixes YouTube Shorts and TikToks.
     - No TikTok search or feed: TikTok offers none legally.
- Done when:
  - On a phone you can leave and re-enter the Shorts view any number of times.
  - An auto-advanced Short starts at 0:00 for everyone (a harness measures `currentTime` at start).
  - A speaking avatar lights up in the Shorts bar on a computer and a phone.
  - Test Lab hook `shorts.state` reports the view, the start offset and the speakers.
- Tests: the shorts-rail / shorts-door harnesses, a phone harness for the way back, a unit scenario for the start, and
  the owner's hand test.
- Owner's pick: his three points (Planner chat, 15 Nov 2026).
- Progress (lane A, 16 Nov 2026): items 0/1 live (#447, 0.9.97.137); item 3 (speaking ring) in #471, waiting for Game Studio's state-matrix hover fix; item 2 (start together, ready-based lead-in) in #486; item 4 (TikTok small) and the `shorts.state` start offset not started.

### VC1. Voice: a deafen button, and the YouTube volume slider (owner, 15 Nov 2026; lane A, after SH1)
- Why: the owner wants a Discord-like "deafen" in voice, and on YouTube he can't drag the volume, because one click
  jumps it.
- What:
  1. **🎧 Deafen:** in voice, next to 🎙, a headphones button turns off what you hear from voice (everyone's voice,
     the stream's sound if any). It also mutes your own mic, like Discord, and shows the state to others (a crossed 🎧
     on your face). It is kept per room over a reload. The film's sound is untouched.
  2. **Volume dragging:** find why dragging the volume on a YouTube video doesn't work and one click jumps it. Check
     our rail's `#dock-vol`, an overlay or pointer capture over YouTube's own slider, and touch vs mouse. Make it drag
     smoothly on a computer and a phone. Never put anything of ours over YouTube's player.
- Done when:
  - Deafen silences voice for you only, shows to others, and survives a reload.
  - Volume drags smoothly.
  - Test Lab hook `voice.deafen`.
- Tests: voice e2e (deafen state), a harness for the volume drag, the owner's hand test.
- Owner's pick: his message (Planner chat, 15 Nov 2026).

### MSG1. Delete a chat message for everyone; the host can delete others' (owner, 15 Nov 2026; lane A, after VC1)
- Why: there is no way to take back a message.
- What:
  - **Delete your own message:** in the message's menu (hover ⋯ on a computer, long-press on a phone), "🗑 Delete for
    everyone". It asks once. The server removes the text, any image and its reactions from the room's history and tells
    every client. In its place everyone sees a muted line: "Alex deleted a message".
  - **The host deletes anyone's message:** the same menu item on others' messages, only for the (acting) host. The line
    reads "The host deleted Sam's message" (or "Alex (host) deleted Sam's message").
  - Private messages: the sender can delete; the line shows only to the two people.
  - **Server rules:** validate the message id, check it is the sender's or the caller is host, and rate-limit. The
    deleted content is gone from the stored history (not just hidden), and replies or pins that quote it show "deleted
    message". Old clients ignore the new message type (optional field, no protocol bump unless needed).
  - Texts in `i18n.ts` / `i18n-tr.ts`.
  - The privacy page notes that deleted messages are removed from the room's history (both languages).
- Done when:
  - Your own and the host's deletes work for everyone, live and after a reload, with the right line.
  - A non-host can't delete others' messages (server-enforced, unit test).
  - Test Lab hook `chat.delete`.
- Tests: room server unit tests (permissions, history removal, rate limit), e2e with three clients (sender, host,
  other), phone long-press harness, the owner's hand test.
- Owner's pick: his message (Planner chat, 15 Nov 2026).

### EC1. "Video ended" card in the middle of the screen, not in the chat (owner, 15 Nov 2026; lane A, small, after SR2)
- Why: with YouTube the "Video ended / ▶ Start next / Close" card sits in the chat panel (5B, 0.9.92.9), where it reads
  like a chat message and is easy to miss. The owner wants it in the middle of the screen, in a normal clean design.
- What:
  - `ui/end-card.ts` `showNextCard`: the card opens as a **centered dialog** over the room view (the same dialog kind as
    Settings: `role="dialog"`, a light dim behind it, focus on "▶ Start next", Esc / Close / a click outside closes it,
    the 60 s auto-close stays). Same place for YouTube, video files, fullscreen and the extension overlay; take
    `.end-card` out of `NOTICES` / `placeNotices` in `room.ts`.
  - Design: "Video ended" small and muted, the video's title in plain text (at most 2 lines, then …; the link only as
    a small ↗ next to it, no dotted underline), the two buttons side by side and full width on a phone (≥ 44 px).
    Fits at 1366, 1920, tablet and phone without scrolling; Design gives it one look before merge.
  - YouTube RMF: the card only appears after the video has ended, is a page dialog (not a layer attached to the
    player), and never covers the player while it plays. The Shorts view keeps its own place (BH12).
- Done when: the card shows centered on computer and phone, YouTube and a video file, normal and fullscreen; Close,
  Esc, outside click and Start next work; Test Lab hook `endcard.show`; shots reviewed (QA1).
- Tests: the room harness that covers the end card, `scripts/shots.cjs` for the end card at the 4 sizes.
- Owner's pick: his message with a screenshot (Planner chat, 15 Nov 2026).
- Progress (lane A, 16 Nov 2026): built in #465 (branch `claude/ec1-end-card`, main merged, texts in `ui/lab-texts.ts`); red only on the state-matrix games-window drag / hover flake (Game Studio fixing); merge once that is green.

### SH3. Shorts view on a computer: the chat in a panel you can open and close (owner's friend, 15 Nov 2026; lane A, after SH1)
- Why: in the Shorts view on a computer, 💬 opens only a box to send a message; you can't read the chat. A friend of
  the owner asked to see it, with a panel that opens and closes.
- What: 💬 in the Shorts view (computer) toggles a chat panel beside the upright video, in the empty space on the
  right: the room's chat list (newest at the bottom), the message box and 😀, ✕ to close. It never covers the video
  (nothing over the YouTube player); the open / closed choice is remembered per room (`shortsChat:<room>`); unread
  count on 💬 while closed. The phone keeps its 💬 sheet (PH1).
- Done when: open / close, send, read, unread count at 1366 and 1920 and on a sideways tablet; Test Lab hook
  `shorts.chat`.
- Tests: Shorts view harness (panel open, no overlap with the player), shots (QA1).
- Owner's pick: his message (Planner chat, 15 Nov 2026).

### VC3. Voice that can't connect says so (VPN, strict networks) (owner, 16 Nov 2026; lane A, with VC1)
- Why: with a VPN (or a strict school / work network) voice "connects" but nobody hears anybody: voice goes directly
  between people, and these networks block the direct path. The owner chose a clear warning for now, no relay server
  (TURN) yet.
- What: watch each voice link; when one can't connect within ~10 s (ICE failed / never connected), show the person a
  plain note: "Your voice isn't reaching the others. A VPN or this network may be blocking it — turn the VPN off and try
  again." (TR too), with a small ⓘ in the people list on the link that failed. No technical words. Clears itself when the
  link works. The help page gets a short "Voice and VPNs" entry.
- Done when: a forced ICE failure shows the note and the ⓘ; a good link shows nothing; Test Lab hook `voice.blocked`.
- Tests: voice harness with a forced failed link; texts check.
- Owner's pick: "warning only for now" (Planner chat, 16 Nov 2026). A relay (Cloudflare TURN, 1,000 GB/month free) can
  come later as its own card if VPN users ask for it.

Game Studio cards (GMP, GW2, GP1, GT1, QZ2, WG2): `docs/internal/cards-games.md`.

## Proposed

Security and Research suggestions: `docs/internal/cards-proposed.md`.

## Done

Every finished card: `docs/internal/archive/cards-done.md` (and the release notes in `CHANGELOG.md`).
