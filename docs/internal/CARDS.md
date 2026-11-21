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
### STORE2. PRIORITY: Chrome Web Store submission by ~25 Nov (owner, 21 Nov 2026; lane B, owner submits)
- Why: the owner wants the extension in the store before Spotify Wrapped (~3 Dec); review can take days to 3 weeks.
  This moves the store step ahead of 1.0 (ROADMAP "Then"), owner's pick.
- What: bring `docs/internal/web-store.md` and `npm run store` up to date with the live version (listing texts EN +
  TR, screenshots from `store/src/`, permissions justification, privacy fields, the public-text rules of CLAUDE.md §6);
  a pre-submission check redone from `docs/internal/store-checklist.md` (STORE1 dry run, 7 Nov) (manifest, permissions, no remote code, privacy page, support contact); a step-by-step
  Turkish list for the owner (Developer Dashboard → upload zip → fields to paste → submit), including the Brave / Edge
  hand test right before. No `PROTOCOL_VERSION` bump while the review runs (CLAUDE.md §7).
- Done when: the store zip + screenshots + texts are ready on `main`, the checklist passes, the owner's steps are
  sent to the Planner; the owner submits.
- Owner's pick: "Hemen gönder" (Planner chat, 21 Nov 2026).

### CAM3. Camera: start framed, resize from any edge, a real grid (owner, 21 Nov 2026; lane A, first)
- Why: some browsers start in the free camera mode (an old saved choice); the framed window resizes only from its
  bottom-right corner; with 4 people the tiles sat 3 in a row + 1 alone below, wasting space; heads were cut.
- What: (1) reset everyone's saved camera mode once (new storage key or migration): every browser, old or new, starts
  in the framed mode; free mode stays a choice. (2) The framed window (and free tiles) resize from every edge and
  corner, keeping the ratio. (3) Grid like Google Meet, done better: never more tiles in a lower row than an upper
  one, rows fill top-left first and shrink downwards (2 = side by side or stacked by the window's shape; 3 = a row or
  a column; 4 = 2×2; 5 = 3+2; 6 = 3+3 or 2+2+2 …), the layout picked from the window's aspect ratio to give each tile
  the biggest size; faces never cut (object-fit cover with a centre-top focus, or contain when a tile is very off-ratio).
  Read how Meet / Zoom / Discord tile first and note it in the reference.
- Done when: 1–8 cameras at 3 window shapes give the rule above (a unit test over the layout function); resize from
  all 8 handles; a fresh and an old profile both start framed; Test Lab `camera.grid` (fake cameras 1–8); harness in
  `site`; first look.
- Owner's pick: his message (Planner chat, 21 Nov 2026).

### VC4. Voice 8, cameras 6, a chat note past that (owner, 21 Nov 2026; lane A, with CAM3)
- Why: 5 in voice and 4 cameras ran without trouble; the owner wants more room.
- What: voice limit 6 → 8, camera limit 4 → 6 (server + client constants); when a room goes past what we
  recommend, one plain chat note says the connection may suffer with many cameras and how many we recommend. The
  "Seste 1/6 · 📷 0/4" counter leaves the Together card (TG2).
- Done when: 8 voices / 6 cameras accepted, the 9th / 7th refused with the existing message; the note once per room;
  e2e; reference updated.

### PTT1. Push-to-talk: any key, and research talking from another tab (owner, 21 Nov 2026; lane A, with CAM3)
- Why: a friend's push-to-talk stopped when he switched tabs; the key is fixed to V.
- What: (1) the push-to-talk key can be changed (press-a-key picker in the voice settings, saved per browser, Esc
  cancels, common shortcuts refused). (2) Research and write in the reference: browsers never see keys of an
  unfocused tab (Discord's web app has the same limit; its desktop app has global keys). Options: the extension's
  `chrome.commands` global shortcut (toggle only, no key-up), a Document Picture-in-Picture mini window with a
  hold-to-talk button. Build the best one that is safe, or put the finding to the Planner if it needs a pick.
- Done when: the key changes and works; Test Lab `voice.pttKey`; e2e or harness; the research note in the reference.

### TG2. A cleaner Together card + a sound settings icon (owner, 21 Nov 2026; lane A, with CAM3)
- Why: the owner finds the card wordy (screenshot 21 Nov: "Birlikte" title, "Seste 1/6 · 📷 0/4", "Ayrıl" in
  text, "Bas-konuş (V)" checkbox wrapping, "Paylaş ▾").
- What: no "Together" title; no voice / camera counter (VC4's chat note replaces it); Leave as an icon button with
  a name (tooltip + aria); Share as an icon only; push-to-talk moves into a new 🔊 sound settings button (Discord-like
  popover: push-to-talk on/off and key, input / output device, mic volume, noise suppression if we have it). Keep
  44 px targets on phones and the TG1 compact layout. The profile menu keeps avatar and name; Developer decides what
  else stays there and tells the Planner.
- Done when: the new card at 1366 / 1920 / phone; all actions reachable by keyboard; Test Lab `together.layout`;
  first look with the old and new screenshot.

### GN1. A chat message when someone opens a game table (owner, 21 Nov 2026; lane A2)
- Why: when a game is already open, a new table or a newcomer is easy to miss.
- What: opening a shared table posts a system line in the chat: the game's cover, "Alex opened Sea Battle", a Join
  button (one per table, not repeated; gone or greyed when the table closes or is full). Replaces nothing else.
- Done when: two people: one opens a table, the other joins from the chat line; Test Lab `chat.gameInvite`; e2e.

### EMO1. A hands emoji page (owner, 21 Nov 2026; lane A2)
- Why: the owner wants hand / finger gestures (👍 👏 🙌 👋 🤞 🫶 …) as their own page in the reaction picker.
- What: a new "Hands" tab in the reactions / emoji picker (👍 👏 🙌 👋 🤞 🫶 ✌️ 👌 🤙 🤘 👊 🙏 …), skin-tone choice if cheap;
  EN + TR names. Owner's pick: "El işaretleri sayfası" (Planner chat, 21 Nov 2026).
- Done when: the tab shows and sends; Test Lab hook; harness step.

### RC2. Session recap: quiet sound, cinema look, a button after 2 hours (owner, 21 Nov 2026; lane A2)
- Why: the recap starts terribly loud; the owner wants a more cinema-like design; it should not appear by itself.
- What: (1) volume: start low (−18 dB or so) with a fade-in; (2) offer 3–4 royalty-free, licence-checked music
  options (short previews in the PR) and send them to the Planner: the owner picks; (3) a cinema look (curtains,
  marquee lights, film grain, credits roll) with 2–3 directions as images to the Planner before building; (4) after 2
  hours together a "✨ Session recap" button shows for the host and everyone; it can be played once per session;
  pressing it prepares and starts (no second press if preparing is fast). Ideas for later (not now): film data, see LB1.
- Done when: the button rule, the once-per-session rule, the volume; Test Lab `recap.button` (fake 2 h); e2e; the
  owner's picks recorded.
- Owner's pick: music and look (Planner asks with the options).

### FR1. Rate the film together (host, extension) (owner, 21 Nov 2026; lane A2, after RC2)
- Why: while watching a film through the extension, the host can start a short fun poll that gets people talking.
- What: a "⭐ Rate the film" button in the rail, host only, film page (extension) only. Everyone gets the same few
  fixed questions one after another: stars 0.5–5 (half stars, Letterboxd-like), "Who liked it most?", "Who liked it
  least?", and 1–2 more conversation starters; then a results card (average stars, picks with names) that invites
  "why?" in chat. Nice design; EN + TR; no film title is sent anywhere outside the room.
- Done when: two people on a demo film page answer and see the results; Test Lab `film.rate`; e2e; first look.

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

### DM1. Dailymotion links play in sync without the extension (owner, 17 Nov 2026; lane A, after CR2)
- Why: Dailymotion is the most visited entertainment site in Turkey (research `docs/internal/research/video-sources.md`).
- What: a `dailymotion` media kind like Vimeo's (`players/vimeo.ts` as the model): links `dailymotion.com/video/<id>`
  and `dai.ly/<id>`; the official player with the owner's Player ID (from `site.config.json`, not a secret); play,
  pause, seek, time and ended through the engine's `command()`; Dailymotion's own ads covered by the everyone-ready
  wait; CSP hosts in `_headers`; privacy page line in both languages; public texts only say "Dailymotion links work".
  First verify web seek and whether the iframe's postMessage is enough without their SDK script.
- Done when: a Dailymotion link plays, pauses and seeks in sync for two people on a computer and a phone; Test Lab
  hook `player.dailymotion`; fake-player harness in the `site` job; the owner's real check.
- Owner step: a free Dailymotion account and a player (Player ID), given to the Planner (not a secret).
- Owner's pick: "Dailymotion ekleyelim" (Planner chat, 17 Nov 2026).

## Proposed
### LB1. Research: Letterboxd / film data (owner, 21 Nov 2026; Research)
- Question: can users connect Letterboxd (or we read film data) for recap comments and film suggestions? Check
  Letterboxd's API terms (access is by application), TMDB / Wikidata as alternatives, privacy, and what we may show.
  Output: `docs/internal/research/film-data.md` + a Proposed card.


Security and Research suggestions: `docs/internal/cards-proposed.md`.

## Done

Every finished card: `docs/internal/archive/cards-done.md` (and the release notes in `CHANGELOG.md`).
