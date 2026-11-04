# Job cards (the board)

Owner's rule (2 Nov 2026): one board for every session. The **Planner** writes and orders cards; the **Developer** takes
the top **Ready** card, moves it to **In progress**, and when it is live adds `Done: <PR link>` and moves it to
**Done**. **Security** and **Research** add their suggestions under **Proposed**; the Planner and the owner decide
whether they become Ready. Roles and rules: `CLAUDE.md` "Sessions as an office". The order follows `ROADMAP.md`
"Focus: now / next / frozen". The owner's tick view is the Planner's test board Artifact https://claude.ai/artifact/NWZG7GLH4JzAnZt1rNgrJo
(owner, 4 Nov 2026: the hidden page on our site needed a deploy for every update, so it is removed again; the
Artifact updates at once).

**How the owner is asked (owner, 4 Nov 2026):** no more option pages or other web pages for him. The only page he uses
is the test board (the Planner keeps it current with what he tested and what is next). Every preference or design
question is asked **in the Planner's chat** with clickable choices (the chat's question tool, the recommended choice
first, with a side preview of each option: a short sketch or description). Design, Game Studio, Research and the
Developers therefore send the Planner the questions as text: question, 2–4 options (one marked recommended), and a
short preview per option. They do not publish Artifacts for the owner.

**The test board stays current by itself (owner, 4 Nov 2026):** the Planner adds, updates and removes board items
without asking: a fix that went live becomes a test, a test the owner reported passing is removed or marked, a
question he answered disappears. Then the Planner tells him in a line what changed. **Everyone talks to the owner in
Turkish** (all sessions; among themselves English is fine; everything written to the repo stays English).

Card format:

```
### <short title>
- Why: <one line>
- Done when: <what can be checked>
- Tests: <unit / e2e / harness / owner's hand test>
- Owner's pick: <link or "none needed">
```

## In progress

## Ready

### 15e. Home art: the light lands on every screen; a bigger, balanced first screen (owner, 4 Nov 2026; lane A)
- Owner (screenshot of the live 0.9.97.28 home art): "the bright part should cover the tablet screen, the phone screen
  and so on properly, it doesn't look natural now"; "the whole art could look bigger and move closer to the left; the
  home page should be symmetric, well proportioned and clean".
- What we see in the screenshot: Glowbeam's cone hits the laptop's left edge and then shows again as a flat grey
  trapezoid behind the laptop, ending in a hard vertical edge at the far right; the tablet and the phone sit outside
  the light, the phone overlaps the laptop's base, the faces row floats in the middle under the laptop, and there is a
  wide empty band between the text column and the art.
- What:
  1. **One light that lands on the screens.** The cone opens from Glowbeam's lamp and its glow falls on the three
     screens themselves (each screen gets a soft lit sheen / bloom matching the cone's colour, brightest on the nearest
     device); no flat trapezoid behind the devices and no hard cut-off edge; the cone fades out softly past the last
     device.
  2. **A tidy device group.** Laptop, tablet and phone in one composed group with even gaps (no device covering
     another's screen or base, or a small deliberate overlap only at the frames); the sync pill, the chat bubble and
     the faces row placed on the group's grid (e.g. the faces row left-aligned under the laptop, the bubble by the
     phone), not floating.
  3. **Bigger, closer, balanced.** The art about 15 % bigger again and moved left so the gap between the text and the
     art matches the outer margins; text column and art vertically centred on the same line; equal left / right
     margins on 1920×1080 and 1366×768; the sideways tablet the same; upright tablet and phone keep their one-column
     layouts but use the same lit screens.
- Same rules as before: `aria-hidden` art, still with reduced motion, theme costumes, no empty boxes.
- Who: lane A builds it; if the light needs drawing help, ask the Design session for the glow shapes (no option page:
  the owner said what he wants).
- Done when: on the five home sizes the cone visibly lights all three screens with no hard edge or grey slab; no
  device hides another's screen; the art is bigger and the page looks balanced (equal outer margins, centred line);
  EN + TR; phone-speed budget green.
- Tests: home harness (screenshots of the five sizes for the owner; the cone has no hard edge inside the art box; the
  three screens lie inside the lit area; device boxes do not overlap screens; left / right margins within 24 px of
  each other at 1920 and 1366).
- Owner's pick: none needed.

### 15d. Home: bigger devices, the theme picker back at the top right, Glowbeam's themed hat, a black box bug (owner, 4 Nov 2026; lane A)
- Owner (screenshot of the live 15c home art): "the laptop, tablet and phone could be a bit bigger"; "the theme picker
  should come back to the top right, on the home page before a room is opened, and stay in the same place on the other
  pages"; "Glowbeam should have its hat too, now that themes exist: the hat changes with the theme".
- Bug in the same screenshot: a black rectangle with a thin green cross sits over Glowbeam's head at the top left of
  the art (looks like an empty image / video box or a debug shape). Find it and remove it; add a check that no element
  of the art is an empty box.
- What: the three devices about 15–20 % larger in the art box at every home size without crowding the text (phone:
  keep the art on top and the text clear); 🎨 back at the top right of the top bar on the home page and the other
  non-room pages (help, privacy, thanks, extension, connection), opening the same theme picker as the profile menu's
  "Change theme" (it undoes 6g.4 for those pages only; the room keeps it in the profile menu); the home art's Glowbeam
  wears the current theme's costume / hat (`docs/internal/design/themes/` mascots, `theme-art.mjs`), switching with the
  theme.
- Done when: the five home sizes show bigger devices and no stray box; 🎨 sits in the same top-right spot on every
  non-room page; changing the theme changes Glowbeam's hat on the home art; EN + TR; phone-speed budget green.
- Tests: home harness (device sizes, no empty / black box in the art, 🎨 present and in the same spot on home + help,
  the mascot changes with the theme).
- Done: #257 (0.9.97.28), Developer A: devices 17 % bigger, Glowbeam in the theme's costume, 🎨 back, no empty box.

### 15c. Home art: a computer, a tablet and a phone + real avatars (owner, 4 Nov 2026; Design, then lane A)
- Owner (on a screenshot of today's home art): "this screen's design should have the phone and the tablet too, as we
  said", and the faces row under the screen (the three plain colour circles + "3 watching · 2 in voice") should be
  **three random avatars from the Themed avatar page**: "I don't like it with plain colours".
- What: Glowbeam's light falls on **three devices** showing the same moment (a computer / laptop screen, a tablet, a
  phone; one shared picture and progress bar, the "In sync · 30 ms" pill and the chat bubble kept); the faces row uses
  three different drawn avatars picked at random from the Themed page (`AVATAR_PAGES`, `/avatars/<id>.svg`) on each
  page load, two with the green "in voice" ring, the "3 watching · 2 in voice" line kept. Same theme rules as today
  (scene themes, reduced motion = still), `aria-hidden` art.
- Who: the Design session draws the devices into the art (one direction, no option page: the owner already said what he
  wants) and writes build notes in `docs/internal/design/home-15b.md` (a "15c" section); then lane A builds it.
- Done when: the art shows all three devices at every home size (1920×1080, 1366×768, sideways tablet 1180×820,
  upright tablet 820×1180, phone 390×844) without crowding the text or the buttons; three different themed avatars,
  a new pick on reload; EN + TR; phone-speed budget green.
- Tests: home harness (devices present and inside the art box at the five sizes; three distinct avatar ids from the
  Themed page; two voice rings), sweep screenshots of the home page.


## Owner's test round 2 (4 Nov 2026, 0.9.97.22): results and new cards
Passed (owner, alone): Enter opens the message box at once, no strip in YouTube fullscreen, T in fullscreen opens
cinema mode, the YouTube rail slides in beside the player, the new menus, the new avatars. Games / streams: the owner
reports if a drop happens again over time.

**Run order:** lane B: R15 ✅. Lane A: R16 ✅ → R17 ✅ → R18 ✅ → BH5 ✅ → BH6 (+ R20's copy once the owner picks the squid). Lane B: R21 ✅ → BH7 ✅ → R24 → R26 (important) → R25 → DL1 → DL2 → DL4 → DL5. Game Studio: … → DL3. Lane A: 15e ✅ → R22 + R23 → 15f → R27. Design: R20. Planner's decision on "same browser, same name" below (R19).

### R15. YouTube fullscreen: messages over the video again, never a side column (owner; lane B)
- Owner (screenshot of YouTube fullscreen with the dark column on the right after writing a message): "messages don't
  need to go there; they can come over the video the old way. YouTube won't say anything, and if it does we'll change
  it. Never open a stupid menu on the side like this."
- What: in YouTube fullscreen on a computer the `#fs-side` column (cards 2a / 6d / R3) never opens. Messages come
  down over the video from the top right, left of the rail, like every other player (`ui/toasts.ts`); notes (waiting,
  countdown, game invite) sit on the video as for video files; cameras float over the video in their one window as in
  other fullscreens. This overrides the owner's earlier pick D (card 2a) for fullscreen only; Shorts (YouTube's own
  bar, nothing of ours on the player) and the windowed room view stay as they are.
- Note for the YouTube API audit (ROADMAP §4): our toasts over the player in fullscreen are the owner's call; if
  Google's review objects, we change it then.
- Done when: writing / receiving a message, a note or a camera in YouTube fullscreen never narrows the player; the
  messages show over the video and never cover YouTube's own bottom bar.
- Tests: `yt-room` / `yt-fs-side` harness updated (the player keeps its full width with a message, a note and a camera;
  the toast sits inside the video, above its bottom bar).
- Done: #251 (0.9.97.26), Developer B: no side column in YouTube fullscreen; messages over the video left of the rail.

### R16. Fix: a private message to someone in the same browser says "they aren't in the room" (owner's bug; lane A)
- Owner: in the same Chrome he joined as "alperen" and "alperen 2" (two people, as designed: a different name is a
  different person), then sent a private message to the other one and got `private_gone`.
- Cause (Planner's reading): `sendPrivate` compares `keyOf` (the browser key), so another person in the same browser
  counts as "myself". It must compare the person (`Member.pk` / `personOf`: browser + name), and deliver to that
  person's connections only, never to the other names of the same browser.
- Done when: a DM between two names of one browser reaches the other name only; a DM to my own name is still refused.
- Tests: e2e `private.mjs` gets the same-browser case (fails on 0.9.97.22).
- Done: #249 (0.9.97.24), Developer A: the person key is browser + name.

### R17. Fix: two tabs in the same room stop seeing each other after a while (owner's bug, "a big problem"; lane A)
- Owner: two tabs (A and B) of the same Chrome in one room (different names); after a while neither shows the other.
- Look at: same-browser connections replacing each other (`hello.prev` / `swm:prev:<room>` handover, `memberIds`
  giving an id back, `4005 replaced` for the same `cid`), ghost pruning (`pruneStale`, background-tab timers), the
  people list's "one person's two tabs count once" (`personOf` with different names), and the HTTP fallback.
- Done when: the root cause is found and fixed; two tabs with different names stay two people for 30 min including a
  backgrounded tab, a reload of one tab and a deploy (object restart).
- Tests: an e2e that reproduces it (fails before the fix), plus a long-running harness check with one hidden tab.
- Done: #249 (0.9.97.24), Developer A: each tab keeps its own name in sessionStorage; the 30-minute hidden-tab run is the owner's hand test.

### R18. Fix: nothing of the room before I'm let in (owner's bug + rule: "the order of things is very important"; lane A)
- Owner: with "Ask before letting people in" on, he joined from another browser; while he waited at the door the
  first-time tips (and other first-time things) appeared on the locked screen. They must come only after he is in.
- What: everything that belongs to being in the room waits for the first `welcome`: first-time tips
  (`room.ts` calls `showFirstTips()` at start, before any welcome), the invite window, the intro (R7 already waits),
  sounds, toasts, the extension update bubble, the language ask, the "continue" record (`lastRoom`) and anything
  else that runs at start. The door screen shows only the door. The same for a refused / kicked / full room.
- Done when: a knocker sees nothing but the door card until let in; after "Let in" the normal first-time path runs in
  its usual order (intro → tips; invite window only when alone).
- Tests: knock harness checks that no tip, invite window, toast or sound fires while waiting, and the tips come after.
- Done: #249 (0.9.97.24), Developer A: tips, `lastRoom` and the extension bubble wait for the first welcome.

### BH5. Bug hunt: the order of things on every path (owner's request; lane A, after R18)
- Owner: "pay attention to this in general and do a detailed logic-order test to find new bugs like this."
- What: list every path into and out of a room (first visit, invite link, `#back` from the film page, reload, a new
  tab, the door (wait / let in / refused), kicked, banned, full room, wrong protocol, connection lost / HTTP fallback,
  a TV, the film page shell, a phone, Shorts view, a game open on arrival, film time set) and, for each, what may show
  and in which order (join card, intro, tips, invite window, toasts, sounds, dialogs, notes, voice prompts, the
  extension cards). Write the table to `docs/internal/order-of-things.md`, then check each row in a harness and fix
  what comes too early, twice or never. Small PRs, a failing test first for each fix.
- Done when: the table exists, every row has a check, every wrong order found is fixed or listed for the owner.
- Done: #252 (0.9.97.25), Developer A: `order-of-things.md`, harness `order`, three fixes (refused-at-the-door card, no Continue after a kick, invite + tips after the intro).

### DL. 🐞 Sidelit Test Lab: a powerful debug mode that grows with the product (owner, 4 Nov 2026; lane B leads, Game Studio + lane A add their parts)
- Owner: "a very detailed debug mode, for now and the future: test everything in the games, the video things, whatever
  you think may clash; strong, detailed, and it changes as new features and ideas come. The goal is to find bugs fast
  and raise the speed and number of tests. BE VERY CAREFUL THAT THE DEBUG MODE ITSELF IS NOT BUGGY."
- Owner's picks (4 Nov 2026, in the Planner's chat): **a right-hand drawer + a command box**; **anyone with the hidden
  switch** (`?debug=1`, as today) for now, but **lock it with a code before the app / store release** (ROADMAP §7);
  **fake friends on the live site, at most 5**; **order: status + fake friends + log first**.
- Builds on the hidden test panel of card 12 (`debug-lab.ts`, lazy `ui/debug-panel.ts`, `?debug=1` / `?debug=0`).
- **Look:** a drawer on the right of the room (🐞 or Ctrl+Shift+D; it never covers the video's controls; on a phone a
  bottom sheet) with tabs 📊 Status · 👥 Fake friends · 🎬 Video & network · 🎮 Games · 🧪 Scenarios · 🖥 Screen · 📜 Log,
  plus a command box (Ctrl+K: type "add 3 friends", "bloom now", Enter) listing every command with its short help.
  A "🐞 This is a bug" button bundles the last 2 minutes (state, log, versions, errors) into one text to copy.
- **Rules that keep it safe and bug-free (all steps):**
  - Off = not loaded at all (lazy chunk, outside the room's size budget); a test proves nothing changes with it off.
  - No new power on the live server: fake friends are ordinary clients (normal rate limits, ≤ 5, a 🤖 in their name,
    only in the room the lab opened them in, all leave when the lab closes or the tab goes); anything that needs server
    help (skip a quiz question, set a dama position on the table) works only against `wrangler dev` / a test server.
  - No monkey-patching: features expose small named hooks (`debugHooks.register('snackBar', {...})`); the lab only
    calls those; a missing hook shows "not available here".
  - Every command: a name, a one-line help, where it works, and an undo where it changes something; every run is
    wrapped so a failing command writes a red line in the log and never breaks the room.
  - Game cheats run on a sandbox save (a snapshot of the real `localStorage` save first; "Restore my real saves").
  - The log never shows cids, IP hashes or tokens; the bug bundle shows exactly what it contains before copying.
  - Every lab tool has its own harness check in CI; the lab's own harness also runs with the lab off.
- **Steps (one PR each, in this order):**
  1. **DL1 (lane B):** drawer + command box + 📊 Status (versions, transport, clock offset, live sync-drift graph, voice
     / stream peer states, recent errors) + 📜 Log (in / out room messages, filtered, redacted) + "🐞 This is a bug".
  2. **DL2 (lane B):** 👥 Fake friends: add 1–5 (name + random avatar), each can write, react, play / pause / seek,
     stall ("not ready"), leave and come back, knock at the door, take the host role; a "chatty" mode at a set pace.
  3. **DL3 (Game Studio):** 🎮 Games: open any game at once; Snack Bar (coins, customers, receipt, badges, place),
     Window Garden (grow / bloom now, hybrid seed, night / rain, visitors), Five Frames (show the answer, set the day),
     Classics (a dama position, bot level, force a win / draw on the local test server), Quiz / Draw & Guess (skip,
     end, pick the word: test server only), tip jar fill; time ×10 for the side games; sandbox saves.
  4. **DL4 (lane B):** 🎬 Video & network: drop my connection, force the HTTP fallback, "the server restarted"
     (reconnect with the same id), drift +3 s, stall for N s, slow network, ads on the film page harness; 🖥 Screen
     (lane A): theme / language / reduced-motion switcher, phone / tablet size windows, "first-time visitor", outline
     the islands / hole / hidden boxes.
  5. **DL5 (lane B):** 🧪 Scenarios: one-click scripted checks with ✓ / ✗ per step (room entry order, knock, fullscreen
     messages, Enter after a click, private message, two names in one browser …), runnable with the fake friends.
- **Rule from DL1 on (for every new card):** "Done when" includes its lab hook or scenario, so the lab grows with each
  feature (Developers / Game Studio add it in the same PR).
- Done when (whole card): the owner can test every two-person flow alone with fake friends, reach every game state in
  a few clicks, cause each network / video accident on purpose, and copy one bug text; all lab harnesses green; with
  the lab off the room's size and behaviour are unchanged.
- Owner's pick: recorded above.

### R25. Fullscreen messages lower than the message box (owner, 4 Nov 2026; lane B)
- Owner (screenshot of R21 live, a YouTube video in fullscreen: the message "Alperen2 sELAN" sits right beside the
  rail's 💬, at the same height as the message box that 💬 opens): "put it not right next to where you write a message
  but further down, so the sent messages never block me while I write".
- What: in fullscreen and with the side panel hidden, incoming messages start below the rail's message window (a
  band that begins where the open message box ends, about 45–55 % down the video), stacking downwards and still never
  over the player's bottom bar; with the message box open no message overlaps it, ever. Size and timing stay as R21.
- Done when: at 1366×768 and 1920×1080 (YouTube, video file, film page) a message never overlaps the open message box
  or its button, and never the bottom bar.
- Tests: `yt-fs-side` (box vs. message rectangles with the box open), embed harness.
- Owner's pick: none needed.

### R26. Enter opens the message box after a click on the YouTube player (owner, 4 Nov 2026; lane B, important)
- Owner: "when I click on the YouTube player and then press Enter, the side menu's chat doesn't react; the shortcut
  doesn't work; if I click the side menu first and then press Enter it works. This is important; test it in the
  extension too."
- Why: a click on the YouTube frame moves the keyboard focus into YouTube's iframe, so our page never hears the key.
- What: after a click on the player (YouTube, Vimeo, TikTok frames; on the film page the film's own frame), the room's
  shortcuts work again at once: Enter opens the message box, the emoji keys, P, M, T … (e.g. take the focus back to
  our page right after the frame got it, `window` blur → refocus, without breaking YouTube's own clicks, seek bar,
  settings menu or captions; on the film page the extension already forwards keys, check it really does after a click
  in the film). YouTube's own keyboard shortcuts may be lost; ours win.
- Done when: click the YouTube video → Enter → the message box has the cursor, in the window and in fullscreen; the
  same on a video file, Vimeo and on a film page with the extension; YouTube's play / pause by click, seek bar and
  settings still work.
- Tests: yt-room / yt-fs-side (click in the frame, then Enter), embed harness (click in the film, then Enter).
- Owner's pick: none needed.

### 15f. Home art: further left, pictures fill the screens (owner, 4 Nov 2026; lane A)
- Owner (screenshot of the live 15e art, the empty space left of Glowbeam circled, and red lines along the top and
  left inside each screen): "the Sidelit logo + all the computer, tablet and phone art should slide to the left"; "in
  the places I marked the orange picture should reach too; it looks odd now, like a shadowed layer between the frame
  and the screen's colour".
- What: the whole art (Glowbeam + devices + faces + bubble) moves left so the empty band left of Glowbeam goes away
  (keep the text column clear and the page balanced); each screen's picture fills its screen up to the bezel: no dark
  inner band / inset shadow between the frame and the orange picture (the sheen stays, on top of the picture).
- Done when: at the five home sizes the art starts close to the text column with no empty band; the orange picture
  touches the bezel on every side of all three screens; the 15e checks stay green.
- Tests: home harness (art's left edge vs. the text column, picture rect = screen rect).
- Owner's pick: none needed.

### R27. Avatar picker without tabs: one mixed list (owner, 4 Nov 2026; lane A)
- Owner: "remove the things in the top menu; it should be plain, without categories, all avatars mixed together; no
  categories needed for now".
- What: the avatar dialog (site and extension) shows one grid of every avatar (themed + genres + armadillo), mixed
  (a fixed shuffled order, not random per open, so a person finds theirs again), no tab row; the grid scrolls only if it
  must (the owner's rule: lists that grow may scroll). Random picks for new people stay from the themed set unless
  that is simpler to change; say which in the PR.
- Done when: no tabs in the picker on computer and phone; every avatar is in the one list exactly once; picking still
  needs "OK" / double-click.
- Tests: unit (every drawn avatar listed once), avatar harness / screenshot.
- Owner's pick: none needed.

### R24. Remove the hidden test board page from the site (owner, 4 Nov 2026; lane B)
- Owner: "testing on the site turned out silly: every board update waits for a deploy; delete that page, the Planner
  goes back to the Artifact".
- What: delete `apps/web/public/o-…/` (the whole folder), its `_headers` lines, the `owner-board` harness and any CI /
  CLAUDE.md mention (the 0.9.97.29 note becomes "removed in …"). Nothing else changes.
- Done when: the address answers 404 (or the home page fallback) after the deploy; CI green.
- Tests: CI; a quick fetch of the old address after the deploy.
- Owner's pick: none needed.

### R22. Remove the "Opera Night" theme (owner, 4 Nov 2026; lane A)
- Owner (in A's chat): remove the Opera Night theme completely.
- What: the theme leaves every picker, the theme art and the code; a saved Opera Night becomes Gece once, like a
  removed avatar.
- Done when: no Opera Night anywhere (pickers, previews, files); a browser that had it saved opens in Gece.
- Tests: theme-previews harness, a unit / harness check for the saved-theme swap.
- Owner's pick: none needed.

### R23. Stream controls fit beside the faces in the Together card (owner, 4 Nov 2026; lane A)
- Owner (in A's chat): while a stream is on, the Together card's stream controls (stop, quality…) push the chat far
  down; put them into the empty top-right area of the card next to the faces. Before a stream starts nothing changes.
- Done when: with a stream on at 1366×768 and 1920×1080 the chat panel keeps (almost) the same height as without one;
  the controls are all reachable; phones keep their own layout.
- Tests: `voice/live.mjs` (layout check), room harness screenshot.
- Owner's pick: none needed.

### BH7. A name changed on the main site does not reach the film page (lane B, after R21)
- Found by B while building R21: the embed harness check "a name changed on the main site also applies on the film
  page" fails on main too (the film page still shows the old name: "Sam" instead of "Riley"). Not related to R21.
- What: find why the overlay site on the film page does not pick up the new name (suspects: the shared settings sync
  `site:name`, and the per-room / per-tab `me:<room>` copies since R17 being read before the synced default) and fix
  it so that a rename in the room on the main site shows on the film page for everyone, for that room only (rooms stay
  independent, 0.9.88).
- Done when: the embed harness check passes again; same-browser and tab-name harnesses stay green.
- Tests: embed harness (the existing check), `same-browser`.
- Owner's pick: none needed.

### R21. Chat messages over a fullscreen video: bigger text, lower on the right side (owner, 4 Nov 2026; lane B)
- Owner (screenshot, a video in fullscreen with a message "Alperen selam basılsın ya" in the very top right corner):
  "the text should be bigger, and it should come out from a clearly visible place on the right side of the screen,
  not the very top right".
- What: in fullscreen (YouTube, video files and the film page) a chat message over the video uses bigger text (about
  1.5× today's toast: name + text ≥ 20 px on 1920×1080, scaling with the screen, ≥ 16 px on a 1366×768 laptop) on a
  slightly larger, readable card; it appears on the right side, vertically around the upper-middle of the video (about
  25–40 % down from the top), left of the rail, not in the corner; newer messages stack below or above it without
  covering the player's own bottom bar; same fade timing. Window mode with the side panel hidden follows the same
  place. Phones keep their own layouts.
- Done when: at 1920×1080 and 1366×768, in YouTube fullscreen and in video-file fullscreen, a message shows at the
  new place with the bigger text, never in the top 15 % or over the bottom bar, and never under the rail.
- Tests: `yt-fs-side` / `yt-room` (toast box position and font size at both sizes), the embed harness for the film page.
- Owner's pick: none needed.

### R20. Redraw two sea-cartoon parody avatars (owner, 4 Nov 2026; Design, then lane A)
- Owner (screenshot of the series parody page), first "remove these completely, they aren't nice", then changed his
  mind: **keep them; redraw the sponge** ("change only the sponge, the others are okay") **and the squid** ("change it
  too, it's very creepy now"). The pink starfish stays as it is.
- What: Design redraws `sponge` and `squid` in `docs/internal/design/avatars-2/full/` (same ids, same style rules as
  R14: our flat style, a hint of the character, friendly faces, no logos or exact costumes; the squid must not look
  creepy: softer eyes, a kinder mouth, warmer colour). Then lane A runs `scripts/avatars.mjs` so the site and the
  extension get the new files (no id change, nothing to migrate).
- Done when: the owner OKs the two new faces on Design's preview; they are live in the picker.
- Tests: the avatar sweep screenshot of the series page.
- Owner's pick (4 Nov 2026, Design's page https://claude.ai/artifact/6GRmQNs9ntXHJr6cQ6bs9s, round 2): **Sponge C** (waving, both hands up) · **Squid D** (bored, lids half down, soft blue). Design ships the files in #250, lane A copies them.
- **Changed again (4 Nov 2026):** Developer A flagged that Sponge C and Squid D read as the exact original characters at avatar size (store impersonation / copyright risk). Owner: "if they look that close and there will be copyright trouble, remove them completely." So R20 = **remove** `sponge`, `squid` and `starfish` (same show, same risk; Planner's call for the set), with the one-time themed replacement for saved ones; A also sweeps the other parody avatars for the same risk and lists any for softening.

### BH6. Small bug batch: saved-room "yours" mark + the untested order paths (lane A, after BH5)
- From BH4 (STATUS idea 11): after "Make host" (or after acting as host while the host was away) the old host's saved-
  room row stays marked as theirs and its ✕ shows the "removing also unsaves" warning; clear `mine` when `members`
  names another host, without flicker before the members arrive.
- From BH5 (`order-of-things.md`): the two paths without a test: the `version` error (an old client sees only the
  "refresh the page" screen: no tips, intro or invite) and the TV guards (a harness check if cheap, else a note why).
- Done when: each fix has a test that failed first; the order doc lists a test for every path.

### R19. Same browser, same name and avatar = one person (Planner's decision, owner's question)
- Owner: in the same Chrome he opened the room twice with the same name and avatar and saw one person.
- Decision (Planner): this is on purpose and stays. A browser with the same name is the same person: their room tab
  and their film-page tab, or two tabs they opened by mistake, must count once (people count, host rights, voice, the
  person menu). R11 fixed the real bug: two *different browsers* with the same name and avatar are two people. To test
  as two people alone, use another browser, a private window, or a different name in the same browser (R16 / R17 make
  that case work fully).
- No code. If the owner disagrees, this becomes a card.

## Owner's test round 1 (3 Nov 2026, 0.9.97.5): results and new cards

The owner tested the solo list (home, join, empty room, YouTube, film page, popup). Passed: the home page, the continue
line, the footer links, English first + remembered TR, the intro, the 🔒 Privacy link, friendly room names, the invite
window + QR, the empty room's rail, Share, ⋯ More windows, `?`, 🔍 + YouTube attribution, paste / drop a link, the
rail at the edge (window + fullscreen), YouTube captions / quality, keyboard Tab + dialog focus, the extension page's
two lines, the popup's logo, film-page fullscreen emojis / messages. Both repo secrets are added (live in 0.9.97.5; the owner still tries the
feedback form and the usage command). Not yet tried: games, move to another device, phone-only, together tests. The Developer
who takes a card below also ticks the matching hand tests in `STATUS.md`.

**Owner's open items from this round (try later, he asked to note them):** the YouTube usage command answered 403
(the value he typed is likely not the stored `USAGE_TOKEN`; he will make a new one once, save it, update the secret,
and try after the next deploy). The feedback form works (an issue came in). Dependabot #216 / #217: the owner asked the
Planner to merge them once main is green.

**Run order (rebalanced 4 Nov 2026, updated 03:30 UTC):** lane B: R1 ✅ → R2 ✅ → R3 ✅ → R4 ✅ → R5 ✅ → R6 ✅ → R8 ✅ →
BH2 ✅ (#239 stream after reload, #240 rail slide, #241 Five Frames streak; 0.9.97.17 / .18 / .20). Lane A: R3-6 ✅ →
R3-8 ✅ → R11 ✅ → R12 ✅ → R14 ✅ → R13 ✅ → BH1 ✅ → R7 ✅ → R9 ✅ → R10 ✅ → BH3 ✅ (#242, .19) → C1 ✅ (#243, .21) →
BH4 ✅ (#244, .22: lane A code sweep, one bug). Design: R14 ✅. Both lanes are empty until the owner's next round.
Main's runs cancel each other: never merge into main while another deploy runs; whoever merges second takes the next
free version number.

### BH2. Bug hunt: lane B's harness pass + feature sweep (lane B, after R8)
- Why: before the council review and 1.0, every harness must be green on main and lane B's features read against their
  cards for edge cases.
- Done when: sweep (100 screens), phone, tablet, a11y, yt-room, cinema, embed (headful), voice, live, games-gallery,
  side-games-polish, room-more and invite all pass on main; each regression is root-caused and fixed (no skips); the
  side games, stream resume, rail, film-page edge and games hall are swept for edge cases; the ~200 ms rail-before-the-
  player item (low). Findings that change owner-picked behaviour go to "Proposed".
- Tests: the harnesses themselves, new regression checks per fix.

### BH3. Consistency + server-side bug hunt (lane A, after R7 / R9 / R10)
- Why: ROADMAP §5 "Consistency": the same numbers in code, privacy policy, help page, UI and store texts; the new
  server paths (knock, private messages, person key, stream / game resume, fallback pacing) need edge-case cover.
- Done when: every user-readable limit and retention matches the code (EN + TR policy and help, UI, `web-store.md`); the
  help harness also checks the privacy policy's numbers; edge cases (reconnect during a knock, a private message to
  someone who left, host handover while people knock, TV + knock…) each have a test and a fix if broken; old Turkish
  names in English-first places are listed (not renamed yet).
- Tests: help harness, new e2e checks.

### BH1. Bug hunt: stale voice-harness checks + one retry warning (lane A)
- Why: `scripts/harness/voice/run.mjs` has two checks that fail on main too (the sine-wav energy check and the pre-6g
  "free tiles" check); `handover.mjs` once passed only on its retry in live e2e.
- Done when: each has a written root cause and a fix in the test or the code (no skips); the voice harness passes;
  handover passes on the first attempt three deploys in a row.
- Tests: the voice harness, live e2e.

### R1. Fix: opening a game throws people out of the room / the stream (owner's bug, urgent; lane B)
- Why: owner: pressing a game can throw you out of the site and out of a running stream; back in, the game opens only
  on the second try. Friends also saw someone "randomly gone, or thrown out and straight back" while streaming:
  probably the same root (a room connection closed and reopened). Check 0.9.96.24's "close a connection without
  hello after 15 s" and 0.9.96.25's "one hello per game object" first.
- Done when: opening, joining and closing each game (Together + On the side) with two people, one streaming and both
  in voice, never drops a room connection, the stream or voice; the game opens on the first press. The root cause is
  written on the card.
- Tests: e2e (a game opened while another member streams: no close event on any room socket; `trace.mjs` logs
  closes), harness for the first-press open, owner's hand test with a friend.
- Done: 0.9.97.8 (https://github.com/alperenakturk/screen-with-me/pull/225). **Root cause:** opening a game never closed a room connection (two people, voice + a
  stream, all five room games, locally: no close). What closed them was the deploys: each one restarts the room's
  object and closes every room connection (the owner tested while ~10 versions went live). Voice came back with the
  same member id (0.9.91.16), but the page ended the stream and the watching on every welcome ("randomly gone, or
  thrown out and straight back"), and a game pressed while the connection was down was lost (`send` dropped it), so it
  opened only on the second press. Now the stream and the watching resume (`LiveP2p.resume`, grace for a missing
  member), and a table asked for meanwhile goes out after the welcome. Not the 15 s no-hello rule (the room's hello
  goes out on open) nor the one-hello rule (game pages send one hello per socket).

### R2. Fix: Enter opens the chat at once (owner's bug, important; lane B)
- Why: owner: in the room, the first Enter opens an empty side panel, only the second opens the message box.
- Done when: one Enter puts the cursor in the message box wherever the chat lives (side panel, side panel hidden,
  fullscreen, cinema mode, Shorts); never an empty panel.
- Tests: harness (one key press → `document.activeElement` is the message box in each view).
- Done: 0.9.97.11 (https://github.com/alperenakturk/screen-with-me/pull/231). Two causes: in cinema mode the side panel is off screen, and Enter focused its hidden chat
  box (nothing happened); in fullscreen and cinema the rail's message window opened while the resting rail was still
  `visibility: hidden`, so its box could not take the focus (an empty window, the second Enter put the cursor in). Now
  Enter opens the rail's message window where the panel is not on screen (`fullscreen.openChat()`), and that window
  focuses its box again a frame / 120 ms later. Harness `scripts/harness/enter-chat/run.cjs` (8 checks; 2 fail on
  0.9.97.8). Shorts keep their own message box (unchanged).

### R3. Fix: YouTube fullscreen shows a big black strip on the right (owner's bug; lane B)
- Why: a friend's YouTube fullscreen had a wide black strip from the side column (screenshot in the Planner's
  session; the owner also still sees a dark strip with nothing going on). 0.9.93.20 / card 6d meant the column opens
  only for a note, cameras or a message.
- Done when: in YouTube fullscreen the player fills the width beside the resting rail unless the side column really
  shows something; the column never stays open empty (also after a camera / message / note went away, a stream ended,
  or the friend's window size changed).
- Tests: `yt-room` harness: fullscreen with nothing, after a message (8 s), after cameras off; screenshot check of the
  right edge.
- Done: 0.9.97.12 (PR below). Cause: the column opened for the camera box whenever it was on screen, also when the
  person had dragged the cameras onto the player (a place they chose: the cameras stayed there and the column beside
  stayed open and empty, a black strip) and when the box held only cameras hidden "for me". Now only camera tiles that
  show count, and once the column had time to place them (700 ms) cameras sitting outside it don't hold it open (until
  the cameras or their places change); the camera box's tiles are watched too. Harness
  `scripts/harness/yt-fs-side/run.cjs` (6 checks; the dragged-camera one fails on 0.9.97.9).

### R4. Fix: T (cinema mode) works in fullscreen too (owner; lane B)
- Why: owner: in fullscreen T switches cinema mode on behind the fullscreen, so nothing visible happens.
- Done when: T in fullscreen leaves fullscreen and opens cinema mode; T / Esc in cinema mode leave it as before.
- Tests: cinema harness.
- Done: 0.9.97.12 (PR below). The T key (and the rail's ⋯ → Cinema mode) did nothing visible in fullscreen: the key
  handler skipped fullscreen, the menu turned cinema on behind it. Now turning cinema on from fullscreen leaves
  fullscreen first, and T in fullscreen always means "cinema mode". Cinema harness: a new check (fails on 0.9.97.11).

### R5. Film page: the rail's edge a little wider (owner; lane B)
- Why: owner: on the film page out of fullscreen the mouse has to go very far right to open the rail.
- Done when: the rail opens when the mouse reaches about the last 40 px of the film (Developer picks the number; still
  no jump when the mouse only passes); fullscreen unchanged.
- Tests: embed harness under `xvfb-run`.
- Done: 0.9.97.13 (PR below). The overlay only hears the thin 14 px gutter beside the film (the film's own frames get the
  mouse inside it), so the extension's film frame now tells the site when the mouse enters / leaves the last 40 px of
  the synced video (`FILM_EDGE`, `{type:'activity', edge}`, sent at once on the change, not throttled); the site treats
  it like its own edge strip (`fullscreen.poke(edge)` → `setNear`, still after OPEN_MS 140 ms, so a mouse passing by
  doesn't make the film jump). Fullscreen unchanged (the same signal there). Older extensions send no `edge`: the
  gutter as before. Embed harness (headful, `xvfb-run`): a new check, fails on 0.9.97.12.

### R6. Invite window: "show this when I'm alone" moves to Settings (owner; lane B)
- Why: owner: the invite window should always open by itself; the tick box does not belong in it. Whoever wants it
  off finds it in Settings.
- Done when: no tick box in the invite window; ⚙️ My screen has "Open the invite window when I'm alone in a room"
  (default on, the same `opt:autoInvite`).
- Tests: invite harness.
- Done: 0.9.97.13 (PR below). The tick box left the invite window; ⚙️ My screen has "Open the invite window when I'm alone
  in a room" (`#opt-autoinvite`, the same `opt:autoInvite`, on by default). Invite harness updated.

### R7. The intro for invited people too (owner; lane B)
- Why: owner: people who open an invite link should also see the Sidelit intro (light burst + Glowbeam).
- Done when: the intro plays once for everyone who enters a room from its link (first entry in that tab), not only for
  the one who created it; still not on a reload, in the shell or on a TV; reduced motion as before.
- Tests: intro harness (a fresh browser opening `/r/<id>` sees it).
- Done (0.9.97.16, built by lane B, shipped by lane A): the intro played only when the join step was not skipped, and
  from the start of the room page, so since R12 someone waiting at the door ran it out behind the waiting card, and a
  first entry through `#back` (the extension's "open the room") never got it. Now `startRoom` works out `introDue`
  (not a TV, not the shell, `in:<room>` not yet set in this tab) and plays it on the first `welcome`. Intro harness: an
  invited fresh browser sees it, a reload doesn't, a `#back` first entry does once, a knocker sees it after being let in.

### R8. Faster games tutorial and theme previews (owner; lane B)
- Why: owner: the "How to play" cards appear late, and the theme picker's previews load slowly.
- Done when: the how-to-play cards show with the game window (preload the chunk / art when the games window opens);
  the theme previews appear at once when the theme window opens (small preview images or preload on hover / open).
  The room page's JS / CSS budgets still pass.
- Tests: harness timing (cards visible ≤ 150 ms after the game opens; previews painted when the window opens).
- Done: https://github.com/alperenakturk/screen-with-me/pull/237 (0.9.97.15): the games hall imports the three side games' chunks when it opens (art and
  cards are inlined in them); the profile menu / "Change theme" / 🎨 fetch every offered theme's preview pictures.

### R9. One place for each thing: ⋯ More and the profile menu (owner: "you choose"; lane B)
- Why: owner: Feedback, Help, Privacy, Recap show in both menus; rarely used things can live in Settings.
- Planner's pick (the owner left it to us): **⋯ More = the room** (Film time (host), Save the room, Room rules, Today's
  recap, Sync test, Keyboard shortcuts). **Profile = me** (name, avatar, theme, language, Move to another device, then
  one small line: Help · Feedback · Privacy). "⟳ Reconnect" leaves the profile menu (the room-name dot and the "can't
  reach the room" card already reconnect). Nothing shows twice on a computer. On a phone ⋯ keeps its own one list
  (it is the only menu there), but without doubles. The 🔒 Privacy link stays reachable from the join card and the
  profile (L9).
- Done when: as above; Help / room-more / phone harnesses updated.
- Tests: room-more harness, phone harness.
- Done (0.9.97.16): ⋯ More = Film time (host), Save the room, Today's recap, Keyboard shortcuts (computer), Sync test,
  Room rules (`roomMoreItems`; Feedback / Help / Privacy left it). The profile menu = language, 📲 Move, name, avatar,
  theme, saved recaps, and one small line Help · Feedback · Privacy (`.profile-links`, ids kept). "⟳ Reconnect" is gone
  (the room-name dot and the "can't reach the room" card reconnect); its "Today's recap" button and ⌨️ stay in the
  page hidden for ⋯ More to press. The phone's ⋯ lost its "Language" tile (⋯ → Profile has English / Türkçe), so each
  tile shows once. Harnesses: room-more (the ⋯ list, the profile's line, nothing in both), phone (one list, ⋯ → Profile
  has language + privacy), feedback and help (opened from the profile line).

### R10. Room games: the window title is not cut in a narrow window (lane B, small)
- Why: B noticed "Tic-tac-… · started by Alex" in a narrow free window (outside GP's scope).
- Done when: the game's name always shows in full; "started by …" shortens or goes first.
- Tests: games harness at the smallest free-window size.
- Done (0.9.97.16): the head was one line, "name · started by …" as one cut string beside six buttons, so the name went
  first ("Tic-tac-to…" even at the default 400 px). Now the name and "· started by …" are two parts (the name never
  shrinks, the rest is cut first, the tooltip has it all), and a table's window under 460 px wraps its head: the title
  on its own row, the buttons on the next (the side games keep their one-row head, card GP). Checked at the free
  window's real sizes (400 / 280 / 180 px); games-gallery harness: a narrow window keeps the name whole and inside.

### R11. Fix: two people with the same name and avatar count as one (owner's bug; lane A)
- Why: owner: joining his own room from a second browser with the same name and avatar showed one person. Two people
  may share a name and a picture.
- Done when: people are told apart by their browser id (`cid`, never sent to clients; the server can send each member
  an opaque per-room person key), not by name + avatar: the people count, Together faces, People list, camera tiles,
  join sounds, "+N", per-person volume and the solo games' "others" all count two people; the same person's two tabs
  (same cid) still count once. Stored per-person settings keyed by name + avatar keep working (fall back to them).
- Tests: e2e (two cids, same name + avatar → count 2; one cid, two tabs → 1), unit for the person key.
- Done (0.9.97.7): the server gives every member `pk`, an opaque per-room person key (the first 8 bytes of SHA-256 of a
  random per-room salt, storage `personSalt`, and the browser key; the same for one browser's tabs and its paired TV,
  different in another room, never the cid). Shared `personOf(m)` (pk, else name + avatar as before) and `personKey`
  (the join sounds' `JoinFilter`) group people: the room title's count, the Together faces, the camera tiles' "one per
  person" and "my other tab", the games hub's "who is at this table", the solo games' others, the TV faces and the
  debug panel. What is stored per person (volume, hidden / pinned cameras, tile places) stays keyed by name + avatar.
  The People list shows connections as before. Tests: e2e `people.mjs` (two browsers, same name + avatar → two keys;
  one browser's two tabs → one; no cid on the wire; another room → another key), unit `personOf`, `JoinFilter`.

### R12. "Ask before letting people in" (owner's idea; Planner: yes; lane A)
- Why: owner asked for room security options. A room link can leak (a screenshot, a group chat); a knock really helps.
  A room password does not add much (it travels with the link through the same chat, and adds friction), so no
  password.
- Done when: a host switch "Ask before letting people in" (default off) in the invite window and in Room rules. When
  on, a newcomer (a browser id not seen in this room before) waits on the join card ("Waiting for the host to let you
  in…") and the host gets a card with name + avatar: Let in / Refuse. Refused = the same as a kick (ban by cid). People
  already in, the host's own tabs and reconnects within 24 h pass straight in. No host connected → the newcomer waits
  (with a note), never let in by default. Server-side check (nothing joins before the host's yes); limits so a flood of
  knocks cannot spam the host.
- Tests: e2e (knock → let in / refuse / host away), harness for the cards, owner's hand test with a friend.
- Done (0.9.97.9): `settings.knock` (host; Room rules `#opt-knock` and the invite window's `#invite-door`). The server
  decides in `join()` before anyone gets a name or a seat (`mustKnock`): a browser id not in `admitted` (24 h after it
  was last in, ≤ 500, storage) waits as a knocker (no `welcome`, no member); turning the switch on admits everyone
  present. The host's tabs get `{t:'knocks', list}` (name + avatar, cleaned) and answer `{t:'knock-answer', id,
  allow}`: yes → admitted + joined, no → banned like a kick (4003). Knockers get `{t:'knock-wait', hostHere}`; nobody
  is let in without the host; ≤ 8 at the door and ≤ 2 per IP hash (`knock_busy`, 4010), each waits ≤ 10 min (4011).
  Tests: e2e `knock.mjs` (12), harness `scripts/harness/knock/run.cjs` (6).

### R13. Private messages in the chat (owner's idea; lane A, after R12)
- Why: owner: sometimes you want to tell one friend something without the whole room.
- Done when: in the chat (and the person menu) "Message privately" sends `{t:'chat', to}` only to that person's
  connections and back to me; it shows in both chats marked "🔒 Private · to Alex" / "from Alex"; never in the room's
  stored 50-message history, never to other members, the host or a TV; same limits and `cleanText` as chat. Phone +
  computer.
- Tests: e2e (a third member never receives it, not in the history after a reload), harness.
- Done (0.9.97.14): `{t:'chat', text, to}` (text only). The server sends it to the recipient's connections (not their
  TV) and the sender's, never into the history or to anyone else, `private_gone` for myself / someone gone. In the chat a
  press on someone's name, on a private bubble's label or "🔒 Message privately" in the person menu writes to them only
  (bar "🔒 Only Alex will see this", ✕ / Esc back); bubbles say "🔒 Private · to / from Alex". Tests: e2e `private.mjs`
  (9), harness `scripts/harness/private/run.cjs` (13, computer + iPhone).

### R14. Better parody avatars + two new anime characters (owner; Design, then a Developer card)
- Why: owner wants every parody avatar redrawn more detailed and cuter, two new anime parodies (a calm genius student
  with a notebook; a messy-haired detective crouching in a chair with sweets), and the white-haired monster hunter
  (`hunter`) moved from Series to Game.
- Rules (CLAUDE.md "Avatars", store + copyright): parodies only hint at a style: no names, logos, exact costumes or
  real actors' likeness; the ids and labels stay generic.
- Done when: Design's option page shows the redrawn set; the owner picks; a Developer card ships them
  (`scripts/avatars.mjs`, `DRAWN_AVATARS`, `AVATAR_PAGES`, i18n labels).
- Owner's pick (3 Nov 2026, https://claude.ai/artifact/Akp2qt2WPXzxVENiAZ8Hha): **1: A** (today's line, more detail;
  not the sticker style) · **2: A** (near-copies made our own). Note: "fit our style, but still look like the character,
  not something unrelated": recognisable by silhouette, hair, colours and props; the distinctive costume parts are ours.
- Design done (PR #229, review sheet https://claude.ai/artifact/FsBkvfQUPZ6w2yscbX18cd): 33 SVGs in
  `docs/internal/design/avatars-2/full/`, steps in `avatars-2.md` "For the Developer". **Developer part: lane A, right
  after R12, before R13** (copy via `scripts/avatars.mjs`, `DRAWN_AVATARS` notebookgenius 📓 / sweetsleuth 🍰,
  `AVATAR_PAGES` both on page 3 and hunter to page 4, i18n labels; check the picker, 28 px chat, seats, join card).
- Done (0.9.97.10): `scripts/avatars.mjs` copies `docs/internal/design/avatars-2/full/*.svg` over its parody drawings
  (31 redrawn + 2 new in `apps/web/public/avatars/`; the extension has no avatar copies since the shell), `DRAWN_AVATARS`
  + `AVATAR_PAGES` (Film 8 · Series 14 · Anime 9 · Game 2), EN + TR labels. Checked in Chromium: the picker's four
  Parody tabs and a sheet at 28 / 52 / 84 px.

## Run order to the owner's test round (owner, 3 Nov 2026: "do all of 1–11, I test everything at the end")

Two Developer lanes so the work moves faster; lane B lives mostly in new files (games, players) and rebases on lane A.
Each card still ships with its tests; hand tests go to `STATUS.md` for the owner's one big test round at the end.

**Lane A (Developer, `session_015Fyri2WkmxwEfieZ1jto4L`):** 6d → 6e empty-room rail → **R3-1** (high, right after 6e) →
6c Sidelit (0.9.95) → 6f Glowbeam mascots + intro → 9 feedback button (with R3-7) → 10 Shorts channel + country → 11 thanks page → 12 debug panel → **6g owner's feedback batch** →
14 cinema mode → 16 design sweep → **15b new home page** (after the owner's pick) → T tablet → A11y accessibility → **Y1 → Y2 → Y3** (YouTube audit prep) → security
cards (M2, M3, M4, M5, M6, L1, L4, L2+L3+L5, L6, L7+L8, L9, L10, R3-2, R3-5, R3-6, R3-8; M8 stays with the frozen TV;
R3-3 goes with the domain) → the Security session's new findings → bug-hunt findings. Everything here lands by
**0.9.99** (owner, 3 Nov 2026: version plan in `ROADMAP.md`).
**Lane B (Developer B, `session_015Fyri6bkmZm4WdgzAWHpMc`):** 🍿 Snack Bar → GG games gallery window → 🌱 Window Garden → 🔤 Five
Frames (the daily word game) → move-to-device code → **GP side games polish** → P2 podcasts (P1 Vimeo done in 0.9.93.21).
**Not in this round:** 13 Shorts measurement (needs the owner's real Chrome; part of his test round), Shorts door
(0.9.95+ growth), G1–G5 (launch), the privacy policy rewrite + terms (the "official work" step after the test round).
**After both lanes:** Planner runs the council review (harsh feedback on the whole app), then a bug hunt. **Gate (owner, 3 Nov 2026):** the council waits until the owner has done his solo hand tests (the Planner's list of things that will not change) and added the two repo secrets `FEEDBACK_GITHUB_TOKEN` and `USAGE_TOKEN`; his test results go into the council's brief.


_Order agreed with the owner on 2 Nov 2026. Cards 1–5 close the 0.9.93 gate (owner-reported bugs + hand tests); the
rest is 0.9.94. The owner's picks on https://claude.ai/artifact/9AJXCNuwBojdibzZaX1baw: 1 = C + D, 2 = A, 3 = A, 4 = A, ideas as proposed._

### 6c. Rename the product to Sidelit + the new logo and mascot (owner's decision, 3 Nov 2026; after 6b, before 15)
- Why: owner: "change it straight to Sidelit now: the notes, the READMEs, the logo, the site, everything". The name
  is his call (council + research: `name-ideas.md` round 3, `research/name-sidelit-check.md` 🟡, trademark / domain
  checks still to do by the owner before 1.0). Logo D1 "night gold", mid-tone T1 deep teal (only where a second colour
  helps; if two colours confuse, the main logo alone), mascot N1 Glowbeam: `docs/internal/design/logo-sidelit.md`
  (Design session).
- Done when: every user-facing text says Sidelit (site pages, titles, meta / Open Graph, manifest + PWA name, i18n EN
  + TR, help / privacy / extension pages, invite texts, the extension's name, popup, store texts in `web-store.md`,
  `store/src` shots, README.md + README.tr.md); `logo.ts` + `make-icons.mjs` draw D1 (with the ≤ 32 px simple cut),
  icons / favicon / apple-touch / maskable regenerated, the mascot N1 replaces the old face where the mascot appears
  (home preview, empty states, theme mascots only if cheap, else a follow-up card); docs and CLAUDE.md say Sidelit
  for the product ("formerly ScreenWithMe" once in README / CLAUDE.md). **Unchanged on purpose:** the live address
  (`screen-with-me.swm-server.workers.dev` until the own domain), the repo name, storage keys, message `source`
  strings, protocol, the extension id: nothing a user has saved breaks.
- Tests: all harnesses / e2e pass; a grep check in CI (or a unit test) that no user-facing string says "ScreenWithMe"
  except the "formerly" lines; icons readable at 16 px (screenshot); owner's hand test (home, room, extension popup,
  phone home-screen icon).
- Owner's pick: done (Sidelit, D1, T1, N1). **Release it as 0.9.95** (owner, 3 Nov 2026: "make it official, I'm
  speeding up the launch"); the remaining 0.9.94 cards keep their place after it.
- Done: 0.9.95 (PR below). Sidelit in every user-facing text (site, help / privacy / extension pages, i18n EN + TR,
  manifest, the extension's name and pages, store texts, `store/src`, READMEs with one "formerly" line); `logo.ts` draws
  D1 (`small` ≤ 32 px, `bleed`, the animated pause bars) and N1 (`mascotSvg` / `createMascot`, five moods);
  `make-icons.mjs` renders the PNGs with Chromium (16 / 32 simple cut, 48 / 128 full, PWA, maskable + apple-touch bleed
  on night) and writes `logo.svg`, `logo-small.svg` (favicon), `mascot.svg`, `mascot-waiting.svg`; the wordmark is
  Bricolage Grotesque ExtraBold self-hosted (`public/fonts/`, OFL licence beside it, no Google Fonts call); N1 on the
  home preview and (waiting) in the empty room. `scripts/check-name.mjs` runs in CI. Kept: the live address, repo,
  storage keys, `source` strings, protocol, extension id, publisher e-mail, and the zip / folder name
  `screenwithme-extension` (an unpacked extension's id comes from its folder; renaming it would lose people's
  settings). Follow-up for the Planner: the costumed theme mascots (`theme-art.mjs`, theme pickers) still wear the old
  purple face; N1 in costume would be its own card. Tests: all site harnesses, popup, embed (112 checks, headful).

### 6g. Owner's feedback batch (owner, 3 Nov 2026; lane A, right after 12)
- Why: the owner's screenshots and notes after 0.9.96.2.
- Done when:
  1. **The empty room's rail behaves like the rail with a video:** it opens when the mouse reaches the right edge and
     closes when it leaves (edge mode, the same timings), on the site and the film page; never "always out" anywhere
     on a computer (the owner: "it should not behave differently in each place"). Video-only buttons stay dimmed.
  2. **No "Games" in ⋯ More on a computer:** the rail's 🎮 is the one way in (owner: "not in two places"). Phones keep
     Games in ⋯ (they have no rail).
  3. **The join card picks a random themed avatar** (from the "Themed" page) for someone who has never chosen one;
     a chosen or saved avatar is kept.
  4. **No theme picker on the home page:** everyone starts on Gece; the theme is changed inside (⚙️ My screen / the
     profile menu), which already exists. A saved theme still applies.
  5. **Glowbeam's costumes sit right:** apply the Design session's fixed `glowbeam-<theme>.svg` files (the Gece
     nightcap sits too far right; Design checks all 11) when they land.
  6. **🔍 Search is an icon only:** a well-drawn search icon in our line-icon style (`ui/icons.ts`), no "Search"
     text, so the link box keeps its width; the button keeps its name for screen readers ("Search", `aria-label`).
  7. **Cameras start in the frame (one window), like Meet** (owner, 3 Nov 2026): no camera tiles and no "Pop out"
     button inside the Together card any more (the chat keeps its height); when the first camera turns on, the
     cameras open in the one window (`group` layout, the default for everyone, `opt:camLayout`), sized for its
     cameras side by side. The window's top buttons switch to the free layout; in the free layout the tiles start
     attached under the pill (the top bar of the cameras) and the person pulls one off by hand. An old saved `free`
     choice is kept only if the person picked it themselves (otherwise the new default applies once).
- Tests: voice harness (first camera opens the one window, no tiles in the card, switching to free keeps the tiles
  attached under the pill); room-more harness (no Games on a computer, Games on a phone); yt-room / embed (empty room rail rests and
  opens at the edge); home harness (no theme strip, Gece on a fresh browser); unit or harness for the random themed
  avatar; screenshots of the 11 mascots.
- Owner's pick: none needed.
- Done: 0.9.96.6 (PR below).
  1. The empty room's rail rests and comes at the right edge like the rail with a video (`fullscreen.ts` `railFixed` is
     now only "no video and no edge mode", i.e. touch screens without a mouse; the CSS rule that kept `.rail-bare` out
     is gone). Video-only buttons stay dimmed.
  2. ⋯ More on a computer has no Games (`room-more.ts`: `desktop` → no 🎮); phones keep it.
  3. The join card already gives a browser without a saved avatar a random one from the "Themed" page
     (`randomAvatar`, `AVATAR_PAGES[0]`); now covered by the room-more harness.
  4. No theme picker on the home page (`home.ts`; its texts `home.themes*` removed); Gece stays the default
     (`currentTheme`), a saved theme still applies; the home harness checks both.
  5. Design's fixed `glowbeam-<theme>.svg` (PR #182) copied by `theme-art.mjs` (8 changed); all 11 checked in a
     screenshot.
  6. 🔍 is a drawn lens only (`icons.ts` `search`), no text; `aria-label` / title "Search" stay.
  7. Cameras start in their own one window on the page (like Meet): no tiles and no "Pop out" / "⤓ back to the card"
     in the Together card (`cam-float.ts` never uses the card place; `opt:camFloat` is no longer read); the layout
     defaults to the one window (`group`), a saved `free` is kept (it was only ever saved by the person's own press);
     the window's switch goes to free tiles, which start attached under the pill.
  Tests: room-more, home, one-rail, cam-fs (cameras start in the one window, none in the card), yt-room,
  games-gallery, garden; the voice harnesses' pop-out / put-back steps changed to the new flow.

### 15b. New home page, tablet too (owner, 3 Nov 2026: "redo the home page; today's is okay, but it must look right on a tablet"; lane A, after 16)
- Why: the owner wants a fresh home design that works on computer, tablet and phone; the theme picker goes away
  (6g.4).
- Done when: the Design session's clickable options page → the owner's pick → built for computer, tablet (upright +
  sideways) and phone, EN + TR, no scroll inside sections, reduced motion respected.
- Tests: home harness at 1920×1080, 1366×768, 1180×820, 820×1180, 390×844; phone-speed budget.
- Owner's pick (3 Nov 2026, https://claude.ai/artifact/AMuQiAM7itZuXchbzKDRUS): **1 A** "light beam" (Glowbeam
  shines its light on the shared screen), **2 A** a short intro section under the first screen, **3 A** no video link
  box on the home page anywhere (videos are added in the room). Build notes: `docs/internal/design/home-15b.md`
  (Design session), including sweep-1 #10 (beam over the heading) and #11 (empty phone space).
- Done: 0.9.96.12 (PR below). `home.ts` + a lazy `home.css` built from Design's direction A: first screen (pill, slogan,
  line, Create room / Join with a code, save box, continue line; Glowbeam's light on the shared screen; three feature
  cards), then "How it works" (steps, extension card, saved rooms, Help). No link box, theme strip, doors or chips; no
  🎨 on the home page. Computer / sideways tablet two columns, upright tablet centred with the art on top, phone (this
  replaces 0.9.92.5's start screen). Sinema gets the text backdrop; reduced motion stills the bar and the beam. The home
  texts moved out of `i18n.ts` (room JS 140.1 → 138.3 kB, CSS 36.8 → 34.8 kB). Home harness rewritten (5 sizes × EN +
  TR, create with a saved name, join box, continue line, contrast, reduced motion, Sinema); room-extras and phone home
  checks updated; phone speed, sweep pass. Found and fixed on the way: a 200-character video title pushed the continue
  line out of the column.

### 6f. Glowbeam mascots per theme + the Sidelit intro (lane A, right after 6c; from the Design session)
- Why: card 6c brings the new name and logo; the theme mascots and the intro animation still show the old face and
  logo. Design delivered both (PR #161): `docs/internal/design/themes/` (11 `glowbeam-<theme>.svg`, drop-in for
  `<id>-maskot.svg`, steps for `theme-art.mjs` in its README) and `docs/internal/design/intro/` (storyboard with timings,
  easings, keyframe SVGs and a reduced-motion still). Preview: https://claude.ai/artifact/6Ce98qjeANVeUota34uLec
- Done when: every theme shows its Glowbeam (eyes always visible); the intro follows the storyboard on the existing
  sound beats (0 / 0.72 / 1.1–1.4 s, `INTRO_MS` 2700) on the site and in the extension; `logo.ts` has `light` and `eyes`
  as separate parts; reduced motion = the still frame fading in and out; "Enjoy the show!" in EN + TR.
- Tests: home + theme harness screenshots of all 11 themes; an intro harness checks the parts appear on the beats and
  that reduced motion shows no movement; size budget still green.
- Owner's pick: none needed (direction picked: D1 + N1).
- Done: 0.9.95.6 (https://github.com/alperenakturk/screen-with-me/pull/168, together with 6e). Intro: `intro.ts` rebuilt from `preview.html` 1:1 (same timings and
  curves, classes prefixed `swm-intro-`, sizes scaled from the logo's `--s`); the logo's `logo-light` (cone + bloom) and
  `logo-eyes` groups from `logo.ts` animate; Glowbeam is `createMascot` (happy; default in the reduced-motion still);
  no pause bars any more. Themes: `theme-art.mjs` copies `docs/internal/design/themes/glowbeam-<theme>.svg` to
  `<theme>-maskot.svg` (the old purple-face drawing code is gone), so the home preview, theme strip, theme dialog and the
  empty room show each theme's Glowbeam; 6c's single-mascot override is removed. Test: `scripts/harness/intro/run.cjs`
  (light off at 0.3 s, burst + eyes by 1.15 s, Glowbeam out and logo slid by 1.5 s, line by 1.8 s, faded by 2.65 s,
  removes itself; reduced motion: only the frame fades, every part in place). The film page uses the same site intro.

### 6e. The rail in the empty room too (owner, 3 Nov 2026; lane A, after 6d)
- Why: owner: before any video, people should already be able to open the camera, join voice, open a game or emojis.
- Done when: in `.room.fresh` the right rail shows 😀, 🎮, 🎙, 📷, ⋯; video controls (play / pause, speed, next, pin,
  sync, ⛶) are dimmed and only show "add a video first" when pressed. Changes card 6's "D" on this point only.
- Tests: room-more / fresh harness: rail visible in an empty room, 🎮 opens the games, 🎙 joins, play / speed disabled.
- Owner's pick: done.
- Done: 0.9.95.6 (https://github.com/alperenakturk/screen-with-me/pull/168, together with 6f). `.room.fresh` no longer hides `#fs-dock`: the empty room has the rail (😀, 🎮, 🎙, 📷, ⋯, ⛶);
  the controls that need a video (⛶, speed chips, sync, next, ⏯, 📌 once a video has a length) carry `aria-disabled`, are
  dimmed and answer a press with "Add a video first" (`NEEDS_VIDEO` in `fullscreen.ts`, a capture-phase click). Found
  on the way: the rail's "mouse left the rail" timer sent its outside press even when no rail window was open, so a
  window opened elsewhere within 450 ms (⋯ More → Games) closed again; it now fires only with a rail window open.
  Tests: `room-more` (rail and its buttons in the fresh room, ⛶ / 2× answer "Add a video first" and change nothing, 🎮
  opens the games, 🎙 starts joining voice, ⋯ → Games stays open; failed before), `one-rail`, `yt-room`, `phone`,
  `room-extras`, `embed` (headful).

### GG. Games gallery window with covers (owner, 3 Nov 2026; lane B, after Snack Bar)
- Why: owner: pressing games should open its own window where every game shows as a card with its cover, and the
  player picks from there.
- Done when: 🎮 opens a window (free window / side panel / phone sheet, no scrolling) with cards + covers for XOX,
  Connect Four, Draw & Guess, Quiz (room games) and Snack Bar, Window Garden, the word game ("play on the side"); a
  card opens its game the same way as today; covers from the Design session.
- Tests: harness: the gallery opens from the rail, the phone ⋯ and the Shorts bar; every card opens its game; fits at
  340×300 and 360×460.
- Owner's pick (3 Nov 2026, https://claude.ai/artifact/XsUvwg9YL6KugDVP6VggMR): layout **B, two tabs** ("Together" / "On the
  side"), covers ~160 px, the side tab shows each game's progress, reopens on the last tab.

### T. Tablet layout (lane A; 0.9.95 gate)
- Why: ROADMAP §1 "Tablet support": iPad / Android tablets upright and sideways get their own layout (today tablets
  fall between phone and computer).
- Done when: room, Shorts view, games, cameras, rail and fullscreen fit 768–1366 px touch screens upright and sideways
  without scrolling; iPad fullscreen and split view handled; no extension on tablets (site only).
- Tests: a `scripts/harness/tablet` (iPad + Galaxy Tab emulation, both orientations); owner's real tablet later.
- Design: `docs/internal/design/tablet.md` (Design session, PR #173): sideways keeps the computer layout (taller video,
  games in the video's place, 44 px touch targets); the Shorts bar in one row; check the Android tablet's resting rail
  (opacity 0, the touch 30 % rule does not apply). Accessibility notes for card A11y: `docs/internal/design/a11y-1.md`.
- Owner's pick (3 Nov 2026, https://claude.ai/artifact/GXitrW7UaKsiWHBtWzk4Mw): upright tablet = **B**, a tablet
  layout: the video on top, two columns below (chat; Together + Queue / People), no page scroll, the rail beside the
  video, never over it.
- Done: 0.9.96.10 (PR below). `device.ts` `isTabletUpright()` (touch, no mouse, not the phone layout, upright by width
  like `sideways`, ≥ 701 px) → `<html class="tablet-up">`; `tablet.css` is a lazy stylesheet loaded only on a touch
  screen without a mouse. Upright: the page never scrolls, the link box on one row, the video card as wide as the
  window but ≤ 52 % of the height, the rail beside it; below, `.side` is a grid (chat 1.5 fr with its own card; Together,
  then the Queue / People tabs in 1 fr; `.tabs-card` is `display: contents`, no Chat tab). `ui/tabs.ts` has a split mode
  (the chat always shown, the tabs pick Queue / People; `chatShown` for the chat sound). Games open in the video's place
  (`games/stage.ts` treats an upright tablet as wide). Sideways and upright: the rail at full opacity (the idle rule
  hid it on Android tablets) with 44 px buttons; the Shorts bar is icons only on one row. "Fullscreen when turned
  sideways" is now off unless chosen (sideways is the computer layout). Cameras keep card 6g's one window (the design
  note predates it). Room JS budget raised to 145 kB (140.1). Harness `scripts/harness/tablet/run.cjs` (iPad 820×1180 ↔
  1180×820, Android 768×1024: 90 checks); `phone` harness's theme checks updated for 6g.

### A11y. Accessibility pass (lane A; 0.9.95 gate)
- Why: ROADMAP §1 "Accessibility": WCAG AA contrast (with the new Sidelit colours), keyboard tour, focus states,
  screen-reader labels, reduced motion.
- Done when: an automated contrast + label check (axe-core in a harness, dev-only dependency) passes on home, join,
  room, settings, help; every control reachable and visible with the keyboard; reduced motion respected everywhere.
- Tests: the axe harness in CI; a keyboard-tour harness.
- Owner's pick: none needed.
- Done: 0.9.96.13 (PR below), from Design's `a11y-1.md`. Keyboard: a "Skip to the content / the video" link first
  (K1); a Tab press wakes the resting rail so its buttons come right after the video (K2, `fullscreen.ts`); the ⋯ More
  menu follows the menu-button pattern (`ui/menu-keys.ts`: first item focused, ↑ ↓ Home End, Esc back to ⋯) (K3);
  every `.dialog-backdrop` dialog keeps Tab inside and gives the focus back to its button (`ui/dialog-focus.ts`) (K4);
  a focus ring on the video (K5); the first tips are named and their "Next" takes the focus unless you are typing
  (K6). Names / roles: the games hall is a named dialog of buttons (S1), the XOX board a "Game board" group whose cells
  say "Row 1, column 2, empty" (S2), the chat list a real list with a polite live region (S4), the room name is the
  page's `h1` (S6). Contrast: the primary button's hover gets darker (4.3:1 → over 4.5:1; Neon, with dark text,
  lighter). Targets: the connection dot 24 px, "Show activity" 28 px. Kept on purpose: the mic / camera buttons name
  the action ("Mute" / "Unmute"), so no `aria-pressed` (S8), and red = off stays the owner's pick. Also the
  Planner-approved fix: a "can't be played" note sits above the message box on a computer and no longer makes the room
  scroll (a new `room-error` screen in the sweep). Harness `scripts/harness/a11y/run.cjs` (axe on home, help, join,
  room, settings, invite, games hall, tic-tac-toe, first tips, computer + phone; keyboard tour) runs in CI (axe-core
  and Playwright installed for that step only).

### P1. Vimeo player without the extension (lane B)
- Why: owner's idea (2 Nov 2026), Research's #1 (`research/more-players.md`): full control via player.js.
- Done when: Vimeo links play on the site in sync (play / pause / seek / time; rate fixed at 1× unless PRO), CSP +
  privacy policy updated, title from oEmbed.
- Tests: a harness with a fake player speaking player.js's postMessage protocol (like `tiktok/run.cjs`); owner's real check.
- Owner's pick: done (owner: "do all of 1–11").

### GP. Side games polish (owner, 3 Nov 2026; lane B, after the move code, before P2)
- Why: owner, on Snack Bar / Window Garden / Five Frames: "make them sweeter and more polished", "the fonts feel
  small", "give a visual tutorial when each game starts, this is important", "each game should open at its ideal
  size", and Five Frames "is not clear".
- Done when:
  1. **Ideal size:** every game opened in the side window (solo games and the room games) opens at the size its
     content needs (`SOLO_CATALOG` size / fit, room games too), never with a large empty area or a cut layout; it
     stays resizable in proportion.
  2. **Bigger, clearer text:** body text ≥ 15 px, numbers and titles larger; checked at 1366×768 and on a phone.
  3. **Visual tutorial on first open:** 2–4 short cards with simple pictures (Design draws them) the first time a game
     opens (per game, `localStorage`), "?" in the game's head shows it again; skippable; EN + TR.
  4. **Sweeter look:** the Design session's polish for the three games (motion, small sounds kept quiet, rewards).
  5. **Five Frames:** green = right letter in the right place, yellow = in the word but elsewhere, grey = not in the
     word (owner's request; our own shades that fit the theme + a ✓ / • mark for colour-blind players, a small
     legend under the board); a row flips letter by letter, fast (about 250 ms per letter), like the familiar daily
     games, after Enter; typing pops each letter; reduced motion = no flip. Own name and board shape stay.
  6. **Credits out of the game:** the word-list credits link leaves the game; the credits stay in
     `/third-party-notices.txt` (Apache 2.0 for the Zemberek list needs them) and get a small "Licenses" link in the
     footer and on the Help page.
- Tests: harnesses per game (opening size at 1366×768 and 1920×1080, tutorial once, no scroll); Five Frames unit
  tests for colours with repeated letters; reduced motion; owner's hand test.
- Owner's pick: none needed (Design delivers the look; the colours are the owner's request).

### P2. Podcasts (lane B)
- Why: Research's #2: iTunes Search (free, no key) → RSS → the episode is an audio file our `html5` kind already syncs.
- Done when: a podcast search (words in the link box with a "Podcasts" source) lists episodes; one plays in sync for
  everyone with an audio-only view (cover art, no video box); CSP `media-src` widened only as needed (security review).
- Tests: unit (RSS parsing), harness with a local RSS + mp3; owner's real check.
- Owner's pick: done.
- Done: 0.9.96.5 (https://github.com/alperenakturk/screen-with-me/pull/185). "🎧 Podcasts" on the link box's YouTube
  results → shows (Worker `/api/podcasts/search`, iTunes Search) → newest 30 episodes (`/api/podcasts/episodes`: Apple
  lookup → the feed address from Apple's answer only, read ≤ 4 MB) → ▶ Play now / queue. An episode is `html5` with an
  optional `poster` (only `*.mzstatic.com`), shown as the player's poster; CSP `img-src` + `*.mzstatic.com` only
  (`media-src` was already open). Unit `podcasts.test.ts`, e2e `podcasts.mjs`, harness `podcasts/run.cjs` (11).

### 3. Owner's hand tests 0.9.92.3 – 0.9.93.5 (0.9.93 "Now" 3)
- Why: the 0.9.93 gate needs them.
- Done when: every box in `STATUS.md` "Owner's hand tests" for these versions is ticked or turned into a bug card.
  The owner works from the ordered PDF checklist (2 Nov 2026) and sends results to the Planner.
- Tests: the owner's own (computer, phone, Shorts, first-time path, hotspot).
- Owner's pick: none needed.

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
- Done: 0.9.96 (PR below). Built from Design's `feedback-and-thanks.md` §1 and R3-7. Shared `feedback.ts` (validation:
  a type 🐞 / 💡 / 💬, 3–2000 characters, optional e-mail, whitelisted details; `neutralise` for `@`, `#123`, `GH-1` and
  fences; `buildIssue`: text in a ```` ```text ```` fence, labels `feedback` + `feedback:<type>`, the e-mail line with
  the 90-day note). Worker `POST /api/feedback` (`apps/server/src/feedback.ts`): own Origin required (403 without),
  body read as a stream ≤ 8 KB (413), `FEEDBACK_LIMIT` burst binding (3 / min / IP), then `FeedbackGate` (one Durable
  Object, migration `v7`: 3 per IP hash per hour, 50 per UTC day, hashes kept an hour) → `{error:'off'}` without
  `FEEDBACK_GITHUB_TOKEN`, else a GitHub issue. Site: `ui/feedback.ts` + `feedback.css` (lazy chunk with its own EN / TR
  texts) from ⋯ More (computer + phone, before Help), the profile menu (`#profile-feedback`) and the Help page
  (`/#feedback` opens it over the home page); details unticked by default with the exact lines shown; `/baglanti`
  keeps its last short result in `diagLast` for it. Privacy policy `#feedback` / `#feedback-tr` (90 days). The deploy
  step alone gets the token (R3-2 style). Tests: unit `feedback.test.ts`, e2e `feedback.mjs` (live: refusals only, never
  creates an issue; local: `off` + the hourly limit), harness `scripts/harness/feedback/run.cjs` (19 checks).

### 10. Shorts: a feed from one channel + Discover by region (0.9.94 "Next" 4)
- Why: owner, 1 Nov 2026: type a channel and get its Shorts; Discover should show the viewer's country.
- Done when: the ♾ window accepts a channel link / @handle / name and starts that channel's Shorts feed (uploads
  playlist, reusing the `like` path; cached per channel and day); Discover uses the connection's country from
  Cloudflare (`cf.country`, never stored) with a "🌍 Country ▾" chip of about 10 countries + "World" (one pool per
  kind + country + day); quota cost per new query written down; privacy policy mentions the country use.
- Tests: unit tests for channel input parsing; Worker e2e with `YOUTUBE_API_KEY` off and the region validated;
  `shorts-rail/run.cjs` still passes; owner's hand test with a real channel.
- Owner's pick: A, viewer's country, changeable (2 Nov 2026).
- Done: 0.9.96.1 (PR below). Shared `youtube-search.ts`: `parseChannelInput` (channel links `youtube.com/@name`,
  `/channel/UC…`, also with `/shorts`; bare `@name`; bare `UC…`), `channelParam` / `parseChannelParam`, `POOL_REGIONS` (12
  countries), `isPoolRegionChoice`, `poolRegion` (auto → `cf.country`, else en → US / tr → TR; `world` = no region).
  Worker: `/api/youtube/pool` takes `region` (auto / world / a code; the pool's cache key is per kind + region + language
  + day, `yt-pool2`; the country is never stored), new `/api/youtube/channel?c=UC…|@handle` (channels.list by id or
  `forHandle` → uploads playlist → playlistItems → videos.list: **3 units a page**, cached per channel + day, `yt-chan1`;
  `next` = the playlist's page token). Pool pages stay 101 units per new kind + region + day. Site: ♾ window — a channel
  link / @handle starts that channel's feed (`FeedSource` `channel`), words stay a topic search; Discover has a 🌍 country
  select (my country / world / 12, names from `Intl.DisplayNames`, `opt:poolRegion`). A plain channel name is not taken
  as a channel on purpose: it can't be told from a topic and a channel-name search costs 100 units. Privacy policy:
  the country use under "YouTube search". Tests: unit `youtube-channel.test.ts`, e2e `search.mjs` (region / channel input
  checks; local `off`), `shorts-rail` harness.

### 11. Thanks page (0.9.94 "Next" 5)
- Why: owner, 1 Nov 2026: credit the people who helped by testing.
- Done when: `/thanks` (EN, `?lang=tr`) with the names the owner sends (only people who said yes) and a short
  thank-you; linked from the footer and the Help page; the feedback form gets an unticked "Credit me on the Thanks
  page" box when the closed beta starts.
- Tests: static page check in the same harness as Help.
- Owner's pick: A (2 Nov 2026). Names who said yes (owner, 3 Nov 2026): Tecem Öztürk, Feyza Hacıalioğlu, Ömer Tuğrul
  Bakan, Ahmet Faruk Uğurluoğlu, Nevin Senem Kanar, Mert Arı (exactly as written, Turkish letters kept).
- Done: 0.9.96.2 (PR below). `apps/web/public/thanks.html` (`/thanks`, EN + TR blocks via `lang.js`, `?lang=tr`): the
  night-gold page with a happy Glowbeam (`mascot-happy.svg`, written by `make-icons.mjs`; still with reduced motion), a
  short thank-you, the six names in the owner's order (`lang="tr"`, letters kept) and "Want to help too? Send feedback"
  → `/#feedback`. Linked from the footer (`data-thanks-link`, follows the language) and a line on the Help page. Fits
  1366×768 and 390×844 without scrolling. The "Credit me" box in the feedback form waits for the closed beta. Test:
  `scripts/harness/help/run.cjs` (Thanks checks, EN + TR, computer + phone).

### 12. Hidden test panel `?debug=1` (0.9.94, before the Shorts measurement)
- Why: the owner tests from his phone without a computer; it gathers `/baglanti`, `?olcum=1`, `?tvlab=1`, version,
  transport, sync stats, recent errors (copy button), feature switches and "start as a first-time visitor".
- Done when: `?debug=1` once in a tab shows the panel; `?debug=0` hides it; normal users never see it; no personal data.
- Tests: harness opens it and checks each part; a normal visit shows nothing.
- Owner's pick: agreed 2 Nov 2026 (ideas list).
- Done: 0.9.96.3 (PR below). `apps/web/src/debug-lab.ts` (tiny, loaded by `app.ts`): `?debug=1` → `sessionStorage`
  `swm:debug` (this tab, survives reloads), `?debug=0` or "Turn the panel off" clears it; the word leaves the address; not
  in the film-page overlay. Only then are errors recorded (`error` / `unhandledrejection`, newest 20 in `swm:debugErrors`)
  and the lazy chunk `ui/debug-panel.ts` + `debug-panel.css` loaded: a 🐞 button bottom left (red ring after an error)
  opening the panel: site / extension version, connection (WebSocket / HTTP fallback), browser · OS, screen, device
  classes, language; in a room the sync numbers (`setDebugRoom` in `room.ts`: behind the room, jumps, people, what plays);
  switches TV lab (`opt:tvLab`) and Shorts switch timing (`olcum`, this tab), ⟳ Reload, 📶 Connection test
  (`/baglanti?room=`), 🌱 Start as a first-time visitor (after a confirm: name, avatar, every room's name, tips, "continue
  where you left off", the extension-update and sticker notes, this tab's `in:` / `tab:` marks; never the browser id
  `cid`); recent errors with Clear; "📋 Copy report" (versions, device, connection, sync, last connection test, errors;
  never names, ids or chat). EN + TR texts in the chunk; Esc closes it. Normal visits download nothing (+0.5 kB on the
  room page for the switch). Test: `scripts/harness/debug/run.cjs` (35 checks).

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
- Done: 0.9.96.7 (PR below), built from Design's `docs/internal/design/cinema-mode.md`. ⇥ became 🎞 Cinema mode (rail ⋯,
  **T**, the shortcuts card; Esc leaves when nothing else is open, caught in the capture phase so a window's own Esc
  goes first). `.room.cinema` (+ `.side-hidden` kept as an alias) and `html.cinema-on`; remembered per tab
  (`sessionStorage` `cinema:<room>`, `opt:sideHidden` no longer read); computer only (`hasMouse()`, not `html.phone`),
  not in the shell or the Shorts view. The theater is fixed over the page on a near-black layer
  (`color-mix(var(--bg) 18 %, #000)` at 94 %, 300 ms fade, none with reduced motion); the video is the largest 16:9 beside
  the rail (`--cw: min(100vw − 110px, (100dvh − 80px) × 16/9)`: 1366×768 → 1223×688, 1920×1080 → 1778×1000); top bar and
  footer hidden, the top bar comes back while the mouse is on `#cinema-edge` (8 px at the top) or on it, 400 ms grace;
  chat comes as a strip of at most two pills under the video (toasts with `top: 100% + 8px`, never on the player) and a
  count on 💬 (`#dock-chat .cinema-badge`); "everyone ready" / the game invite sit at the strip's left end; a 1.8 s hint
  the first two times (`cinemaHint`). Test: `scripts/harness/cinema/run.cjs` (25 checks); yt-room updated.

### 16. Design bug sweep (0.9.94, end of the step)
- Why: owner, 2 Nov 2026: go through the whole design for mistakes; the owner should not have to find each one.
- Done when: the Developer screenshots every screen (home, join, empty room, YouTube, file, Shorts, games, settings,
  dialogs, invite, film page, `/baglanti`, privacy) at 1920×1080, 1366×768, 1024×640, 390×844 and sideways, in EN and
  TR, in a plain and a scene theme; every problem found (overflow, cut text, overlap, scrollbars, misalignment,
  contrast, mixed languages, inconsistent icons) is listed in `STATUS.md` and fixed or turned into a card; the list
  of screenshots is attached to the PR.
- Tests: the screenshot harness itself, kept for later sweeps; all harnesses pass.
- Owner's pick: none needed.
- Planner (3 Nov 2026): the Design session prepares a first list from the live site in
  `docs/internal/design/sweep-1.md`; start from it, then add your own screenshots.
- Owner's pick (3 Nov 2026) on sweep-1 item 8 (https://claude.ai/artifact/7GjPa4yVqDrYWAJ4fqe1fS): **A**, one English
  friendly room name for everyone, in every language ("the same name for everyone"). No change to `friendlyRoomName`;
  item 8 is closed.
- Done: 0.9.96.8 (sweep-1 fixes) and 0.9.96.9 (sweep-2 fixes + `scripts/harness/sweep/run.cjs`, 100 screenshots, all
  checks pass); the full list with what happened to each item is in `STATUS.md` "Design sweep (card 16)". Open small
  items there (XOX board height on a phone, the film page's hole size, Snack Bar's smallest text for lane B).
- Done: part 3, 0.9.96.11 (Planner, 3 Nov 2026): XOX / Connect Four centred on a phone, the film page's room view
  grows like the bigger room, a sideways phone's empty room keeps faces + chat, and a 0.9.96.9 regression fixed (the
  black loading background painted the film page's hole: islands over the film were black boxes). Embed harness under
  xvfb 111/111, phone harness + a sideways empty-room check, sweep 100 screens pass.

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

Cards from `security-review-3.md` (3 Nov 2026, `main` at 0.9.93.18), most severe first (R3 = review 3). Details,
file:line references, scenarios and the owner's Cloudflare / GitHub / Google steps are in the review.

### Security: no uncapped request body in a room (R3-1)
- Severity: high
- Why: `POST /api/rooms/:id/unsave` reads the whole body inside the room object; one chunked ~100 MB request from
  anyone with the room link resets the room and drops everyone (the H1 crash through another door).
- Done when: the Worker refuses an `unsave` POST without `Content-Length` or above ~1 KB; the object reads it with a
  capped reader (shared with `fallback.ts`); a per-IP limit on `/info` + `/unsave` (with the M4 card); a code comment
  states the rule "no Durable Object reads a request body without a cap".
- Tests: e2e (chunked oversize `unsave` → refused and the room still answers; a normal unsave by the host still works).
- Owner's pick: none needed.
- Done: 0.9.95.2 (PR below). Worker: an `unsave` POST without `Content-Length` → 411, above 1 KB → 413, any other method
  → 405; `/info` + `unsave` share the new `ROOM_INFO_LIMIT` binding (60 per IP and minute, Workers Free); an `unsave`
  POST without an `Origin` → 403 (browsers always send one on a POST). Room object:
  `readCapped(request, 1024)` (exported from `fallback.ts`, its comment states the rule); `TvLink /deliver` capped too.
  Test: e2e `saved.mjs` (chunked body refused, 4 KB body refused, the room still answers; the host's unsave still works).

### Security: secrets only in the deploy step (R3-2)
- Severity: medium
- Why: the Cloudflare token and the YouTube key sit in the environment of `npm ci`, the build and the live e2e, so a
  compromised dependency's install script or build plugin could read them and deploy to the account.
- Done when: the three secrets are set only on the "Deploy to Cloudflare" step (step-level `env:`, never job- or
  workflow-level); the key check uses `secrets` in an `if:`; the workflow has `permissions: contents: read`.
  Planner note (3 Nov 2026): the repo is private on GitHub Free, which has no Environments with branch rules for private
  repos, so the `production` environment part waits until the repo is public or paid; step-level secrets need no owner
  action.
- Tests: CI green on a PR; the next merge deploys and the live e2e passes; the install / build steps' environment has
  no `CLOUDFLARE_*` / `YOUTUBE_*` (a quick `env | grep -c` step that prints 0, removed afterwards).
- Owner's pick: none needed now (the environment part later).
- Done (0.9.97.4): the deploy job has no job-level `env:`; `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and
  `YOUTUBE_API_KEY` (with `FEEDBACK_GITHUB_TOKEN` / `USAGE_TOKEN`) are set only on "Deploy to Cloudflare" (the live
  e2e keeps `USAGE_TOKEN` for its read check). "Check keys" turns `secrets.X != ''` into an output (`steps.keys.outputs.ok`)
  that the later steps' `if:` read. Instead of a one-off `env | grep -c` step, "Install and build" keeps a permanent
  guard: it fails if any deploy secret is in its environment. `permissions: contents: read` came with L10.
  The `production` environment waits for a public / paid repo.

### Y1. YouTube branding + Terms link next to search results (audit prep, from Research)
- Why: YouTube Developer Policies III.F.2 / III.A.1: every feature showing YouTube API results must make clear they come
  from YouTube and link YouTube's Terms of Service; the audit (`research/store-and-youtube-audit.md`) marks it 🟡.
- Done when: the link-box search results, Shorts search (＋ Add), 🎲 Discover and ✨ More like this show a small
  "from YouTube" mark per YouTube's brand guidelines (their logo file unchanged, never altered or recoloured) and a
  "YouTube Terms of Service" link (opens in a new tab); EN + TR; computer + phone; the Help page says the same.
- Tests: harness or e2e checks the mark + link exist in each of the four places; screenshot at phone width.
- Owner's pick: none needed.
- Done: 0.9.96.13 (with A11y, PR #197). "Results from YouTube · YouTube Terms of Service" (link to
  https://www.youtube.com/t/terms, new tab) under the link box's search results (`ui/search.ts` `attribution()`), in the
  Shorts view's ＋ Add window and in the ♾ window that holds 🎲 Discover and ✨ More like this (`room.ts`, `.yt-attrib`);
  EN + TR; the Help page says the same. Text attribution for now: YouTube's own logo file (brand guidelines: unchanged)
  is not in the repo; Design can add it from YouTube's brand resources if the audit asks for the logo. Planner's small
  fix with it: `scripts/e2e/room.mjs` no longer fails when YouTube's oEmbed doesn't answer (it waits 8 s, then says the
  room kept its fallback title). Harness `scripts/harness/yt-attrib/run.cjs` (stubbed search; computer + phone, EN +
  TR, 13 checks).

### Y2. Stored YouTube titles never older than 30 days (audit prep, from Research)
- Why: YouTube allows keeping non-authorized API data (titles) at most 30 days; a saved room's queue, `history` and
  `lastRoom` can live longer while the room is used.
- Done when: every stored YouTube title carries the time it was fetched; older than 30 days → refreshed on next use
  (oEmbed / videos.list) or dropped to a neutral "YouTube video"; search / pool / like caches stay ≤ 24 h (already);
  the privacy policy line about retention matches.
- Tests: unit (a 31-day-old title is refreshed or dropped, a 29-day one kept); e2e on a saved room with a fake clock or
  a seeded old record.
- Owner's pick: none needed.
- Done: 0.9.96.14 (PR below). `QueueItem.titleAt` (optional, no protocol bump) records when a title was looked up;
  `room-logic.ts` `TITLE_MAX_AGE_MS` (30 days), `staleTitle`, `freshItem`, `freshRoom`. The room object's
  `freshenTitles()` runs when someone joins (before `welcome`): YouTube titles older than 30 days or of unknown age
  are dropped from the room, the played list and its title cache, saved recaps older than 30 days lose their titles,
  and the playing item plus the next 10 queued are looked up again (oEmbed); meanwhile the page shows "YouTube · id".
  Search / pool / like caches were already ≤ 24 h. Privacy policy (EN + TR) says so. Tests: unit (29-day kept, 31-day
  and unknown-age dropped, other kinds untouched, `setItemTitle` records the time); a seeded e2e is not possible (e2e
  can't write a room's storage), local full e2e passes.
  With it: `scripts/e2e/handover.mjs`'s test clients open a socket once more when it drops with 1006 before
  `welcome`, as the site does (0.9.96.13's live run failed on its first attempt there: Cloudflare restarted the room's
  object right after the deploy).

### Y3. Usage counters for the YouTube quota form (audit prep, from Research)
- Why: the quota increase form asks for real daily usage; we have no numbers today.
- Done when: the Worker counts per UTC day the search / pool / like / oEmbed calls that reached YouTube and the units
  they cost (no query text, no IP, no room id), readable by the owner (e.g. `/api/youtube/usage` behind a secret header,
  or Workers Analytics Engine if free); kept ≤ 90 days.
- Tests: unit (counter adds the right units per call kind); e2e: a search raises the counter, the route without the
  header is refused.
- Owner's pick: none needed.
- Done: 0.9.96.15 (PR below). Shared `yt-usage.ts` (`UNIT_COST`: search.list 100, videos / channels / playlistItems 1,
  oEmbed 0; `addUsage`, `pruneUsage` (90 days), `cleanUsage`); the `YoutubeUsage` Durable Object (binding `USAGE`,
  migration `v9`, one instance `usage`) keeps per UTC day and kind (search / pool / like / channel / oembed) the
  requests that reached YouTube, the API calls by method and their units. `youtube.ts` counts every `callYouTube`
  (cache hits and refused requests count nothing), the room object counts its oEmbed title lookups. The owner reads
  `GET /api/youtube/usage` with the header `X-Usage-Token: <USAGE_TOKEN>` (a repo secret uploaded with the deploy;
  without it the route always answers 403). No words, ids, IPs or rooms are stored. Privacy policy (EN + TR) says so.
  Tests: unit `yt-usage.test.ts`; e2e `search.mjs` (refused without / with a wrong key; with the key in the live run,
  the counters read). A search raising the counter is not checked live: the e2e search is cached 24 h, and a fresh
  query would spend 101 units per deploy.

### Security: custom-domain hardening checklist (R3-3)
- Severity: medium (do it together with the domain purchase)
- Why: on `workers.dev` there is no WAF, rate-limiting rule, bot protection or HSTS setting; when the domain comes,
  the old address and preview URLs must not stay open beside it.
- Done when: `wrangler.jsonc` has the custom domain, `"workers_dev": false`, `"preview_urls": false`;
  `allowedOrigin`, the extension's `SITE_URL` and the CSP name the new origin; production `localhost` origins are
  gone; `_headers` sends HSTS; the owner has turned on Always Use HTTPS, minimum TLS 1.2, DNSSEC and one rate-limiting
  rule on `/api/*` (Bot Fight Mode only after a test that WebSockets, the fallback and the extension still connect).
- Tests: live e2e against the new domain; the old `workers.dev` address no longer answers (or redirects); embed
  harness with the extension built for the new origin.
- Owner's pick: needed (the domain itself, and the zone settings in the dashboard).

### Privacy: YouTube leftovers (R3-5)
- Severity: low
- Why: the YouTube API script still comes from `www.youtube.com` (with the person's YouTube cookies where third-party
  cookies are allowed) while the policy says the player is "loaded from youtube-nocookie.com"; the CSP keeps
  `frame-src https://www.youtube.com` and `script-src https://s.ytimg.com`, probably unused.
- Done when: the policy (EN + TR) says the player code comes from youtube.com and the video frame from
  youtube-nocookie.com; the two CSP hosts are dropped if the YouTube harness still plays without them.
- Tests: `scripts/harness/yt-privacy/run.cjs` + `yt-room` with the trimmed CSP, no CSP violations in the console.
- Owner's pick: none needed.
- Done (0.9.97.5): the privacy policy (EN + TR) says the video frame comes from youtube-nocookie.com and the player code
  (IFrame Player API) from youtube.com, which may carry youtube.com cookies where third-party cookies are allowed;
  `_headers` drops `https://s.ytimg.com` from `script-src` and `https://www.youtube.com` from `frame-src`. The
  `yt-privacy` harness now records every `securitypolicyviolation` and checks there is none with the player loaded
  (run against `wrangler dev`, which serves `_headers`: green). With it, a live-e2e fix: `callYouTube` retries once
  after 400 ms on a 5xx or no answer and logs only the call's name and status (`search.mjs` failed its first live
  attempt on the 0.9.97.3 deploy with YouTube's "failed").
  Also: the 0.9.97.4 deploy (the first with the owner's `USAGE_TOKEN`) failed `search.mjs` "the owner's key reads them"
  on both attempts although the Worker had the secret; most likely whitespace around the pasted secret (a header loses
  it, the stored value keeps it). `youtubeUsage` now trims both sides, and the check prints the status.

### Security: fallback sessions per IP (R3-6)
- Severity: low
- Why: in a room with many custom emojis and chat images, two or three idle fallback sessions from one IP keep the
  object's 24 M budget full, so real hotspot users are closed with `1009 overflow`.
- Done when: at most ~3 fallback sessions per IP hash per object; a broadcast string counts once across sessions (or
  join images are sent after the first poll, in pages).
- Tests: e2e `fallback.mjs` (a 4th session from one IP refused; a second IP still joins a full-emoji room);
  hotspot harness still passes.
- Owner's pick: none needed.
- Done (0.9.97.6): `PollHub` keeps each session's IP hash (`X-SWM-Ip`, set only by the Worker) and refuses a 4th open
  session from one address in one object with `429 {code:'busy'}` (`FALLBACK_PER_IP` 3; the client's open fails and the
  room reconnects as after any failed open). Tests: e2e `fallback.mjs` (3 open, the 4th 429, again after one closes);
  harness `hotspot` green again (it had broken with card 6: it waited for the hidden people count and clicked the
  hidden sync-test button). R3-8 was done with L6.

### Security: requirements for the feedback endpoint (R3-7, with card 9)
- Severity: low (preventive)
- Why: card 9 writes user text into GitHub issues with a token; without limits it can flood the repo, ping people with
  `@` mentions or leak more than intended.
- Done when: fine-grained token = Issues: write on this repo only, with an expiry; `Origin` required; per-IP limit
  (≈ 3 / hour) and a global daily cap (≈ 50); body size capped while reading; text in a code block, `@` / `#123`
  neutralised; no IP, room id, names or chat stored; the optional e-mail and its retention named in the privacy
  policy; Turnstile only if spam appears.
- Tests: unit (payload builder escapes `@user`, `#1`, long text cut); e2e with the token off (`off`), limits, oversize
  body refused.
- Owner's pick: none needed (the owner creates the token when card 9 asks).

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
- Owner's pick (2 Nov 2026, https://claude.ai/artifact/S9PHD4qRh8uaM2ehzHka6T): controller "Alperen Aktürk", contact screenwithme.app@gmail.com (the support
  address of the own domain later; no postal address); minimum age 13+, with "under 16 you need a parent's
  permission"; a lawyer reads policy + terms before the store submission if the owner can find one (not blocking);
  the up-to-3 names on the join card stay and the policy says so (M7). Planner: before the YouTube API audit (0.9.98).

### Privacy: a secret in the IP hash (M5)
- Severity: medium
- Why: the IP hash is an unsalted SHA-256, so every IPv4 address can be recovered from it; the policy calls it
  scrambled.
- Done when: `ipKey` is an HMAC with a Worker secret (rotated daily or a daily derived key), rate limits still work,
  and the policy describes it as it is (incl. chat images counted per IP).
- Tests: unit (same IP same day → same key, different day → different key), e2e emoji / image limits still pass.
- Owner's pick: none needed.
- Done: 0.9.96.19 (PR below). Shared `ip-hash.ts` (`hashIp` = HMAC-SHA-256 of the IP, 16 hex digits; `ipHashKey`,
  `newIpHashKey`); the `IpKeys` object (binding `IPKEYS`, migration `v10`, one instance) makes a random 32-byte key
  per UTC day and overwrites the old one, so no owner secret is needed and past days' hashes can't be matched to an
  address by anyone. The Worker (`ip-key.ts` `ipKey`) fetches it once per isolate and day; if the object can't be
  reached it hashes with an isolate-local random key for that moment (the site keeps working). Every rate limit and
  `X-SWM-Ip` use it; per-day counts keyed by it (emoji / image uploads, the YouTube share) restart with the new key at
  00:00 UTC. Privacy policy (EN + TR): what is counted (connections, emoji and chat images, searches) and how the
  daily keyed code works. Tests: unit `ip-hash.test.ts` (same day same code, another key another code, not the plain
  SHA-256); local full e2e (emoji / image limits) green.

### Privacy: no search words in our logs (M6)
- Severity: medium
- Why: Workers Logs keep `/api/youtube/search?q=<words>` with the caller's IP metadata, which contradicts the policy's
  "by the words, not by person".
- Done when: search words travel in a POST body (or are otherwise kept out of logged URLs), and the policy names our
  own logs and their retention.
- Tests: e2e `search.mjs`; a local check that the logged URL has no `q`.
- Owner's pick: none needed.
- Done: 0.9.96.20 (PR below). `POST /api/youtube/search` and `POST /api/podcasts/search` take the words as a form body
  (`q`, at most `WORDS_BODY_MAX` 2 KB, `readWords` in `youtube.ts`); a GET is 405, words only in the address count as
  none (400). Language, `short` and `page` stay in the address (no words). The site sends them with shared
  `wordsRequest(q)` (link-box search, Shorts ＋ Add, the ♾ topic feed, podcasts). Cache keys unchanged. Discover /
  More like this / channel carry no typed words (a category, a video id, a channel link or @handle) and stay GET.
  Privacy policy (EN + TR): our own Workers Logs (time, address, status, errors) kept at most 7 days, never with search
  words. Tests: e2e `search.mjs` + `podcasts.mjs` (GET with `q` → 405, `q` only in the address → 400, too large body
  → 400), harness `phone/run.cjs` checks the page's search request is a POST with no `q` in the address, harness
  `podcasts/run.cjs` reads the words from the body.

### Security: a daily YouTube quota budget (M3)
- Severity: medium
- Why: scripts without an `Origin` may search, limited only to 10 / min / IP, so one IP can spend the whole day's
  quota in ~10 minutes and turn search / Shorts feed / Discover off for everyone.
- Done when: a global daily unit budget (one Durable Object or KV counter) and a per-IP daily cap guard search, pool
  and like; the "quota" answer is used when the budget is out.
- Tests: unit for the budget logic; e2e `search.mjs` still passes.
- Owner's pick: none needed (the per-IP number can be tuned later).
- Done: 0.9.96.17 (PR below). Shared `yt-usage.ts`: `DAILY_UNIT_BUDGET` 9000 of YouTube's 10 000 units a day,
  `IP_DAILY_UNITS` 2000 per address (≈ 20 searches), `EXPECTED_UNITS` per request kind, `unitsToday`, `budgetCheck`.
  The `YoutubeUsage` object answers `POST /spend {ip, cost}` before each uncached request to YouTube (search, Discover,
  More like this, channel): today's counted units + units allowed but not yet counted + the cost must fit the budget
  (else `quota`), and the address's share today (else `busy`). The per-address numbers live in the object's memory
  only (the same scrambled IP hash as the rate limits, never stored), reset each UTC day. If the object can't be
  reached the request goes (YouTube's own quota is the backstop). Tests: unit `yt-usage.test.ts` (budget, per-address
  share, today's sum); e2e `search.mjs` unchanged and green (no key locally / in CI, so the budget path is not reached
  there; live searches go through it).

### Security: rate-limit the cheap routes that wake Durable Objects (M4)
- Severity: medium
- Why: `/api/version` creates a new object per call, `/api/rooms/:id/info` and fallback `send/poll/close` with any
  `sid` reach objects without a limit; a loop can spend the daily Durable Object allowance.
- Done when: `/api/version` needs a token from the deploy job (or is strictly limited), `/info` and all fallback
  requests have per-IP limits, the Worker checks `sid` against `^[0-9a-f]{32}$` before forwarding.
- Tests: e2e (bad `sid` answered by the Worker; `/info` limit), deploy job's `wait-live.mjs` still works.
- Owner's pick: none needed.
- Done: 0.9.96.18 (PR below). `/info` + `unsave` already counted against `ROOM_INFO_LIMIT` (R3-1). `/api/version` now
  counts against it too (its own key `version:<ip hash>`, 60 a minute; `wait-live.mjs` asks every 3 s = 20). The HTTP
  fallback's `send` / `poll` / `close` are checked by the Worker before any object wakes: a known step (else 400), a
  `sid` matching `^[0-9a-f]{32}$` (else 400), and the new `FALLBACK_LIMIT` (1200 per IP and minute; one batch is in
  flight at a time, so a fast network sends at most ~10 a second while drawing). The client (`socket.ts`) treats a 429
  as "wait 1.5 s and try again", keeping the batch, never as a failure. Tests: unit `socket.test.ts` (429 on send and
  poll: the message arrives, the socket stays open; fails on the old code), e2e `fallback.mjs` (malformed / missing
  `sid`, unknown step → 400).

### Security: make-host only by the real host (M2)
- Severity: medium
- Why: during the host's 20 s reload grace the oldest guest counts as host and can hand the role to themselves for good.
- Done when: `make-host` is refused unless the sender's key is `hostKey`.
- Tests: e2e `host.mjs` (host reloads, oldest guest's `make-host` → `not_host`, host returns as host).
- Owner's pick: none needed.
- Done: 0.9.96.16 (PR below). `makeHost` in the room object also needs the sender's key to be `hostKey`, so the guest
  who acts as host during the 20 s reload grace gets `not_host`; after the grace a join settles the role as before.
  e2e `host.mjs` covers it (fails on the old code).

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
- Done: 0.9.96.21 (PR below). `protocol.ts` `cleanText(x, max)`: `\p{Cc}` → space, `\p{Cf}` removed except a ZWJ
  between two pictographs and flag tag characters after 🏴, lone surrogates dropped, spaces collapsed, cut by code
  point. Used by `cleanName`, `cleanRoomName`, `cleanChatText`, `cleanTitle`, pin notes and Draw & Guess guesses;
  the server's `resolveTitle` (oEmbed answers, file names) runs its result through `cleanTitle`. Tests: unit
  `protocol.test.ts` (6: U+200B, U+202E, U+2066/2069, BOM, ZWJ emoji and the England flag kept, split surrogates,
  code-point cut, titles, pin notes); local full e2e green.

### Security: safer media links (L4)
- Severity: low
- Why: `html5` / `page` items accept `http:`, user-info, `localhost` and private IPs, so one guest can make every
  viewer's browser request a device on their own network; `page` titles are chosen by the client.
- Done when: `html5` needs `https:`, user-info is refused, IP literals / private / `.local` hosts are refused, the
  page's host is shown next to a client-given title.
- Tests: unit (`cleanMedia` cases); e2e queue tests still pass.
- Owner's pick: none needed.
- Done: 0.9.96.22 (PR below). `protocol.ts` `isPublicMedia`: `html5` needs `https:`; `html5` and `page` refuse
  user-info, IP literals (v4 / v6, also hex forms the URL parser turns into dotted ones), single-label hosts and
  `localhost` / `.local` / `.internal` / `.lan` / `.home.arpa` / `.intranet`. The room refuses such a `load` /
  `enqueue` with the new error `bad_link` (EN + TR text), except on a local test server (`devHost`: the request's
  host is `localhost` / `127.0.0.1`, so the harnesses keep playing files from localhost). A film page's client-given
  title gets its site's name (`withHost`: "Title · site.example"). Tests: unit `protocol.test.ts` (3), e2e `links.mjs`
  (live: private address, http file, user-info refused, a public https file queued; local: local links still taken);
  locally checked the refusal through the HTTP fallback with another `Host`.

### Security: room abuse limits (L2, L3, L5)
- Severity: low
- Why: signal floods per connection reset on reconnect, `ready:false` lets a guest pause a host-only room again
  after a reconnect, and 51 sockets that never say `hello` make a room "full" for 150 s.
- Done when: signal limits are per person and target pair (a few offers per minute per pair); the wait cooldown is
  keyed by person / IP hash; "full" counts joined members and unjoined sockets close after ~15 s.
- Tests: e2e (`voice.mjs`, `wait.mjs` additions; unjoined sockets closed).
- Owner's pick: none needed.
- Done: 0.9.96.24 (PR below). L2: besides the old per-connection limit, signals (`signal`, `live-signal`) count per
  person (browser, `personSignalLimit` 120 burst / 12 a second) and per pair of people (`pairSignalLimit` 40 / 2 a
  second), so a reconnect no longer refills the budget; `RateLimiter` remembers at most 4000 keys. L3: the 30 s "don't
  make the room wait again" is copied to the person (`waitCooldowns`, from `WaitTracker.cooldowns()` when a wait ends or
  a member leaves) and handed to a new member id of the same browser (`holdOff`). L5: "full" counts joined people
  (`MAX_MEMBERS`) and at most 30 connections waiting for `hello` (`MAX_UNJOINED`); one that has not said `hello`
  15 s after opening (`UNJOINED_MS`) is closed with 4008 `no_hello` on the next arrival and in `pruneStale`. Tests:
  e2e `abuse.mjs` (a burst of 100 signals cut to 40, a reconnect gets 3; a silent socket closed with 4008), `wait.mjs`
  (a reconnect does not reset the cooldown); harness `voice/live.mjs` green; `voice/run.mjs` passes its connection
  checks (its two failing checks fail on main too: the fake-mic energy check with a sine wav and the "free tiles" check
  that predates 6g's one-window default; for the bug hunt).

### Security: game rules for every player (L6)
- Severity: low
- Why: any Draw & Guess player can reset or start the game, `undo` re-sends all strokes 8 times a second, the Quiz
  50/50 joker leaks the answer with a second identity, Poker's `people` grows without a cap and anyone can deal.
- Done when: host / opener checks on Draw `reset` / `start` and Poker `start`; `undo` ≤ 1/s; one hidden 50/50 pair
  per question; Poker `people` capped; (optional) game objects accept only a short-lived ticket from the room.
  Review 3 (R3-8): game, draw, quiz and poker objects accept `hello` only once per connection, as the room does.
- Tests: e2e `draw.mjs`, `quiz.mjs` and a Poker e2e case.
- Owner's pick: none needed.
- Done (0.9.96.25): Draw & Guess `start` / `reset`, Quiz `start` and Poker `start` only from the game's host (the first
  player / seat still connected; the same person who picks the settings, `not_host` otherwise; the Start button is
  dimmed for the others and the note says "X picks the settings and starts the game"); Draw `undo` has its own limiter
  (`RateLimiter(3, 1)`); the Quiz 50/50 reuses the pair already hidden for that question; Poker keeps at most
  `MAX_PEOPLE` 60 people (the longest-unseen without a seat or a connection go); game, draw, quiz and poker objects
  answer a second `hello` on a connection with `bad` (R3-8). Not done (optional in the card): a room ticket for game
  objects. Tests: e2e `draw.mjs` (host start / reset, second hello, undo burst), `quiz.mjs` (host start, second hello,
  one 50/50 pair), `poker.mjs` (host deals).

### Security: small hygiene fixes (L7, L8)
- Severity: low
- Why: the TikTok resolver's later hops may use `http:`, another port or user-info; recaps older than 90 days stay in
  storage until read; the room's reset leaves in-memory tokens that are written back.
- Done when: every TikTok hop needs `https:`, no port, no user-info, and bodies are cancelled; recaps are pruned in
  the alarm / on load; `deleteAll` also clears `tvTokens`, `memberIds`, `counted`.
- Tests: unit for the TikTok URL check; e2e recap test.
- Owner's pick: none needed.
- Done (0.9.97.1): every TikTok redirect hop must pass `isTikTokHop` (shared `media.ts`: `https:`, no port, no
  user-info, a `tiktok.com` host) and each answer's body is cancelled; saved recaps past `RECAP_MAX_AGE_MS` leave
  storage when the room object loads and on every alarm (`pruneRecaps`, shared `freshRecaps`); the empty-room reset also
  clears `tvTokens`, `memberIds` and `counted`. Tests: unit `media.test.ts` (`isTikTokHop`), `recap.test.ts`
  (`freshRecaps`; a live 90-day e2e is not practical); full local e2e green.

### Privacy: a privacy link where people join (L9)
- Severity: low
- Why: the policy is only in the footer, which phones, the film page overlay and the Shorts view hide.
- Done when: the join card and the settings / ⋯ menu link to `privacy.html` in the page's language.
- Tests: phone harness check for the link.
- Owner's pick: none needed.
- Done (0.9.97.2): "🔒 Privacy" (`data-privacy-link`, `/privacy.html?lang=<page language>`) under the join card's
  button (`#join-privacy`), in the profile menu next to Help (`#profile-privacy`) and last in ⋯ More (computer and
  phone, `room-more.ts`, presses `#profile-privacy`, an anchor, so the film page's overlay lets it open). Tests:
  harness `room-more` (join link + ⋯ list + phone order), `phone` (⋯ has the privacy tile).

### Repo: dependency and workflow hygiene (L10)
- Severity: low
- Why: `npm audit` reports dev-only advisories in `undici` (via `wrangler`), there is no Dependabot, the workflow has
  no `permissions:` block, and there is no `SECURITY.md` (ROADMAP §3).
- Done when: `wrangler` updated and `npm audit` clean; `.github/dependabot.yml` (npm + actions, weekly);
  `permissions: contents: read` in `test.yml`; `SECURITY.md` with the contact address; owner turns on branch
  protection and secret scanning for `main`.
- Tests: CI green; `npm audit` 0.
- Owner's pick: needed only for the GitHub settings. Planner, 2 Nov 2026: on a private repo with GitHub Free,
  branch protection / rulesets and secret scanning are not available (paid plans, or free once the repo is public);
  the owner turns on the free parts (Dependabot alerts + security updates) now; branch rules come with the public repo
  or a GitHub Pro decision.
- Done (0.9.97.3): `npm audit fix` (wrangler 4.151 → 4.157, its miniflare / undici with it), `npm audit` 0;
  `.github/dependabot.yml` (npm with dev tools grouped, GitHub Actions, weekly); `permissions: contents: read` at the top
  of `test.yml`; `SECURITY.md` (the publisher address, what to send, 7-day answer, scope). Left for the owner: Dependabot
  alerts + security updates in the repo settings (STATUS hand tests).

### 🍿 Snack Bar: first solo side game (0.9.95; owner picked it, 2 Nov 2026)
- Why: the owner wants something to play alone while watching with friends; an idle game fits low attention and
  "progress over time". Details: `research/solo-games-accounts.md` Part A.
- Done when: 🎮 has a "Play on the side" entry that opens Snack Bar in a free window / side panel / phone sheet without
  scrolling; income only while the room's video plays, capped "while you were away" bonus, +10 % per other person in
  the room (more in voice), prestige "new cinema"; silent by default; never takes the room's keys or focus; save is
  one versioned JSON in `localStorage`; lazy chunk; EN + TR strings; original look, no film names.
- Tests: unit (economy: income per watched second, cap, together bonus, prestige, save migration); harness (fits at
  phone / small free window sizes without scrollbars, room keys 1–8 / Enter still reach the room).
- Look (owner, 3 Nov 2026, https://claude.ai/artifact/WSxxSneo6NT5Y5JcVKXxLi): **A "counter scene"** (illustrated counter
  lit from the left, Glowbeam as cashier, bought items appear on the counter, upgrade rows with level bars).
- Owner's pick (2 Nov 2026): yes, the flagship, "detailed, sweet and on our theme; I'm excited about it". Not silent:
  it gets its own cute sounds (game family in `sounds.ts`, the Sounds setting and volume apply; never during speech
  ducking). Name "Snack Bar" works in English first; TR label "Büfe". Build in 0.9.95 (Focus: new features frozen
  until then); the Planner makes a clickable look-and-feel option page first.

### 🌱 Window Garden: cozy collection game (0.9.95, after Snack Bar; owner, 2 Nov 2026)
- Why: owner: "basic but meaningful, a collection feel, sweet and cozy, with sweet sounds".
- Done when: a second "Play on the side" game: plants grow over watched minutes, water now and then, seeds / rare
  plants after a film ends or a full evening together, an album of every plant found (the collection); silent-ish
  cozy sounds; same rules as Snack Bar (free window / sheet without scrolling, never takes the room's keys, one
  versioned save in `localStorage`, lazy chunk, EN + TR).
- Tests: unit (growth, seed drops, album, save migration); harness (fits small windows and phones, no scrollbars).
- Owner's pick: done (idea); look **A "window sill"** (3 Nov 2026).

### 🔤 Daily word game, English + Turkish (0.9.95, third; owner, 2 Nov 2026) ⏳ word lists first
- Why: owner: instead of random logic puzzles, a word game like the popular daily five-letter one, in English and
  Turkish; "or something similar that is easier to make".
- Done when: our own name and look (never the original's name, colours or layout: trademark); a daily word the same
  for everyone (seed by date), 6 tries, letter hints, on-screen keyboard with Turkish letters, a share line without
  spoilers; works offline. Word lists: Research finds openly licensed EN and TR lists (answers ~1–2k common words,
  allowed guesses larger) with licenses we may ship (MIT / CC0 / CC BY); if no good TR list exists, the fallback is a
  word-free daily game of the same shape (e.g. a colour / emoji code breaker), owner picks.
- Tests: unit (scoring with repeated letters, Turkish İ/ı and other letters, date seed); harness (fits a phone).
- Research (2 Nov 2026, `research/word-game.md`): EN guesses = ENABLE (public domain), EN answers = 12dicts common
  words (public domain) ∩ 5 letters + a hand pass; TR = Zemberek-NLP lexicon (Apache 2.0, 4,619 five-letter lemmas,
  ~1–1.5k hand-picked answers, rule "no suffixes"); no TDK lists; credits line + `THIRD-PARTY-NOTICES`. To stay clear of
  the original's trademark and its "copyrighted gameplay" claims: own name (no "-dle"), no 5×6 square grid (e.g. a
  ticket / film-strip row per guess, 7 tries), theme colours + ✓ / • instead of green / yellow, no QWERTY strip right
  under the board, share text without coloured squares ("🍿 Word of the day #12 · 4/7"); tr-locale İ/ı handling.
- Owner's pick: board **A "ticket row"** (3 Nov 2026); name **Five Frames** (TR **Beş Kare**), owner 3 Nov 2026.

### Move my things to another device (Research)
- Why: browser-only saves (game progress, saved rooms, emoji collection) are lost on a new phone; accounts are costly.
  Details: `research/solo-games-accounts.md` Part B, option B.
- Done when: "Move to another device" shows a 6-digit code + QR; the other device enters / scans it and receives the
  blob once via a short-lived Durable Object (TV pairing pattern, nothing stored, 10 min expiry, rate-limited); the
  privacy policy mentions it.
- Tests: e2e (code → transfer → expiry, wrong code, rate limit); unit (blob versioning / merge).
- Owner's pick: part of accounts A (2 Nov 2026): next after the side games (0.9.95+), before 1.0 if time allows.
- Done: 0.9.96.4 (https://github.com/alperenakturk/screen-with-me/pull/174). Profile menu → 📲 or `/#move=<code>`;
  `MoveLink` (migration v8, `guardSocket` / `CONNECT_LIMIT`, 10 min, nothing stored; the sender presses Send first);
  `move.ts` pack / merge (games keep the save that got further). e2e `move.mjs`, unit `move.test.ts`, harness
  `move/run.cjs` (13). The same PR fixed poker.mjs's first-attempt live failure (the next hand now also moves on with
  any message).

### Accounts: owner's decision (decided 2 Nov 2026)
- Why: idle games and cross-device saves raise accounts; they touch the "no account" promise, GDPR / KVKK, Apple's
  in-app deletion rule and security. Details: `research/solo-games-accounts.md` Part B.
- Done when: the owner picked on an option page: A (browser only) / B (move code) / D (optional passkey account after
  1.0) / E (e-mail accounts), recorded in ROADMAP; research recommends A now, B next, D only if users ask.
- Tests: none (decision).
- Owner's pick (2 Nov 2026): **A, step by step, no account now**: progress in the browser, then the move-to-device
  code, an optional passkey account only after 1.0 and only if users ask; "no account" stays on the home page.
### More players without the extension: which services and how (Research first; owner's idea, 2 Nov 2026)
- Why: Watch2Gether's search box has a source picker (YouTube, Vimeo, Dailymotion, SoundCloud-like audio, podcasts,
  web radio…); embeds play on our site for everyone without the extension.
- Done when: Research lists candidate services with: official embed / player API, can we play / pause / seek / read the
  time (sync), search API and its cost, terms (overlays, commercial use, audits), CSP hosts, and a ranked shortlist;
  the owner picks which to build and when (not before 0.9.95).
- Tests: none (research); each built service later gets its harness like `tiktok/run.cjs`.
- Research (2 Nov 2026, `research/more-players.md`), ranked: 1 Vimeo (player.js, full control, rate only on PRO
  videos → 1×), 2 podcasts (iTunes Search → RSS → audio file in today's `html5` kind), 3 SoundCloud (Widget API, links
  only, 1×), 4 Dailymotion (needs a Player ID from the owner's free account), 5 Twitch (after the domain move:
  `parent=`), 6 web radio (CSP `media-src https:` needs a security look). Not recommended: Spotify, Apple Music,
  Streamable, Kick, Mixcloud, Bilibili.
- Owner's pick: needed (which, and when: not before 0.9.95); Planner's proposal: Vimeo + podcasts first.

### Logo: direction C "Sidelit, light from the side" + mascot family (Design session; owner, 3 Nov 2026)
- Why: owner picked direction C on https://claude.ai/artifact/5dAZoG6shDuxN454YBm6ZZ and "the mascot's eyes stay in
  every case"; he wants many versions of C (small to big changes), the mascot fitted to it, and usage examples.
- Done when: the owner picked a version and a mascot variant on the Design session's page; then a Developer card
  updates `logo.ts`, `make-icons.mjs` (icons, favicon, small 16–32 px version), the store tile and `store/src` shots.
- Tests: the Developer's card: icons regenerate, favicon readable at 16 px, harness screenshots of the top bar.
- Owner's pick (3 Nov 2026, round 2): D1 night gold + T1 deep teal + N1 Glowbeam; built by card 6c. Replaced the "touch up today's mascot" pick if he chooses a C
  version; works with either name (Sidelit or ScreenWithMe).

### G1–G5. Growth after 1.0 (owner agreed 3 Nov 2026; ROADMAP §7 "Growth plan")
- G1 Store listing for search words + reviews from the first 20 users (with the store submission).
- G2 Search pages (EN first): Shorts together, W2G without ads, free Teleparty alternative, TikTok with friends.
- G3 A weekly 15–30 s clip (TikTok / Reels / Shorts); tools: `hyperframes` / `video-use` / `earshot` on the owner's
  computer (his catalogue).
- G4 Communities + a Product Hunt day; copy polished with `humanizer`.
- G5 Every room a referral: shareable recap image, one-click "Add to Chrome" on the film card (store link once listed).
- Done when / tests: each becomes its own Ready card when 1.0 is near; the Planner details them then.
- Owner's pick: agreed (3 Nov 2026).

## Done

### 6d. Fix: an empty side column in YouTube fullscreen (owner's bug, 3 Nov 2026; after 6b, before 6c)
- Why: owner's screenshot: in YouTube fullscreen the column from card 2a (`#fs-side`) stays as a wide empty strip
  when there are no notes, cameras or messages, pushing the video left.
- Done when: the column takes space only while it has something to show (notes / camera tiles; messages without making
  the video jump on every toast), else the player is full width beside the resting rail; still nothing over the player.
- Tests: harness: fullscreen with nothing to show → player ≈ full width; camera on → column appears; fails first.
- Owner's pick: none needed.
- Done: 0.9.93.20 (https://github.com/alperenakturk/screen-with-me/pull/150). `room.ts` `updateFsSide`: `.theater.fs-side-open` only while `#fs-side-notices` shows
  a note, the camera box is up or a message toast is on screen (a message keeps it `SIDE_LINGER_MS` 8 s, so a chat
  doesn't make the video jump); closed, the player's `right` is just the rail's gutter and the column fades out (0.22 s).
  Test: `scripts/harness/yt-room/run.cjs` (fullscreen with nothing to show: no column, player full width; a message
  opens it; when the messages are gone it closes again; failed on 0.9.93.17) and `cam-fs` (YouTube fullscreen: the
  cameras are in the column).

### 15. Home page, nicer and "works on your phone" (0.9.94, owner's request)
- Why: owner, 2 Nov 2026: improve the home page; it should show it works on a phone too and feel less like a
  screenshot.
- Done when: the direction the owner picks is built (Planner prepares an option page with 2–3 directions); the hero
  shows a computer and a phone in the same room; EN first, TR; fits without scrolling on the first screen at
  1366×768; the phone home (0.9.92.5 app start screen) is unchanged unless the pick says so; Lighthouse performance
  not worse than today.
- Tests: harness screenshots at 1920, 1366, 1024, 390 px; no console errors; owner's hand test.
- Owner's pick (2 Nov 2026, https://claude.ai/artifact/FVzrwoffrJPB5atVv2xQfn): hero **A "two screens, one moment"**
  (a laptop and a phone side by side, the same video moving at the same second, a sync line between them, chat bubbles
  passing from one to the other; the slogan stays); **gently alive** motion (the video runs, bubbles drift; still with
  `prefers-reduced-motion`); right under it **a strip of 3 short features** ("No app" · "Together in voice and
  camera" · "Games in the room"), the theme picker after it; **"Continue where you left off" as one thin line above
  the title** (card 5's overflow fix goes with it).
- Done: 0.9.93.19 (PR below). `home.ts` `.home-preview.two-screens`: a laptop (`.ts-laptop`) and a phone (`.ts-phone`)
  draw the same scene and run one shared progress animation (the same second on both), a dashed sync line with a moving
  dot between them (`.ts-sync`), my message drifting over the laptop and a friend's answer passing over to the phone
  (`.ts-bubble`), faces under the laptop; everything stands still with `prefers-reduced-motion`. `.home-strip`: "No app"
  · "Together in voice and camera" · "Games in the room" (EN + TR) between the hero and the theme picker. The phone
  home (app start screen) is unchanged: the strip is hidden there like the rest of the introduction. No new images
  or scripts (CSS only), so the page weighs the same. Test: new `scripts/harness/home/run.cjs` (49 checks: 1920, 1366,
  1024 and 390 px in EN + TR, hero fits the first screen, laptop + phone + sync line, the two progress bars in step,
  strip under the hero, phone home unchanged, no sideways scroll, no console errors, reduced motion).

### 6b. Settings sections opened alone are squeezed (owner's bug, 3 Nov 2026; after card 2b)
- Why: since 0.9.93.13 (card 6) ⚙️ → My screen and the ⋯ More sections (film time, save, rules) put the section into
  the hidden section list's narrow column: rows wrapped word by word, the right side of the dialog was empty and the
  list scrolled inside (owner's screenshot).
- Done when: alone, the section uses the whole dialog, rows keep the title + description + switch layout, nothing
  scrolls inside at 1366×768; a harness measures it and fails on the old main first.
- Done: 0.9.93.18 (PR below). `#settings-dialog.solo .settings-window` is one column (620 px wide, as tall as its
  content up to the window). Test: new `scripts/harness/settings-solo/run.cjs` (48 checks: every solo section, EN + TR,
  1366×768 and 1920×1080: the section's width, no row title over 2 lines, no inner scroll; 36 of them failed on the old
  main).

### 2b. Film page: the rail opens and closes at the edge (owner's B, 3 Nov 2026; after card 8)
- Why: the owner's pick on https://claude.ai/artifact/AKcDGhoFsNjhQryjhukfeD (B, his original wish): the film page's rail
  should come and go like the site's, never over the film.
- Done when: the mouse at the film's right edge opens the column and the film narrows to make room; the mouse leaving
  closes it and the film widens again; smooth, and a mouse passing by doesn't make the film jump.
- Done: 0.9.93.17 (PR below). Resting film = a 14 px gutter of our overlay (`#rail-edge` hears the mouse there); opens
  after 140 ms at the edge, closes 450 ms after leaving; the film follows the player's `right` transition (layout
  reported every step and at `transitionend`). Film-page specifics: the overlay often never hears the mouse leave, so
  the film frames' moves count as leaving, a stale `:hover` no longer holds the rail, and Chrome's replayed last
  position after the film widens is ignored. Test: `scripts/harness/embed/run.mjs` under `xvfb-run -a` (headful, real
  mouse: opens at the edge, film narrows, closes on the film and widens, a passing mouse doesn't open it, the rail's
  windows still work); headless runs pin the rail and skip those checks (headless Chrome misroutes the mouse there).

### 8. Extension permission explainer (0.9.94, with the Help page; from Research)
- Why: scanners rate "all websites" access as critical; users and guides struggle with "read and change site data";
  trust is a top complaint (Teleparty, Rave). Details: `research/newcomers-help-shorts.md` §3.
- Done when: the extension page and the "Filme git" card say in two plain lines why the extension asks for every site,
  that it does nothing outside a room, and link to the FAQ answer; the same text is ready for the store's permission
  justifications (ROADMAP 0.9.97).
- Tests: harness / e2e that the text and link are present (EN + TR).
- Owner's pick: none needed. Owner agreed 2 Nov 2026.
- Done: 0.9.93.16 (PR below). Two plain lines (EN + TR) with a link to `help.html#permissions` ("What it can and
  cannot see"): on the extension page under "What does it do?" (`#why-all-sites`, `#why-all-sites-tr`) and on the "Go
  to the film" install card (`.external-why`, i18n `externalWhy` / `externalWhyMore`; under 760 px tall only the link,
  so the card never overflows its box). The same text is ready as the store's short permission note
  (`docs/internal/web-store.md`, next to the `<all_urls>` justification). Test: `scripts/harness/help/run.cjs` (now 37
  checks: both languages on the extension page and the card, the link, the card fits at 1366×768 and 1024×640).

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
- Done: 0.9.93.15 (PR below). `apps/web/public/help.html` (EN, Turkish with `?lang=tr` or the saved language, like
  `privacy.html`): how it works (3 steps), who needs the extension, what the extension can and cannot see (each
  permission), not in sync / video not found, can't connect (links `/baglanti`), voice / cameras / streams and the IP
  note, phones, privacy in short, contact. Linked from the footer, the profile menu (❔ `#profile-help`), ⋯ More on
  the computer and the phone ("Help and FAQ"), the extension page's footer and the "can't reach the room" card
  (`#connection`). `lang.js` maps a section link to the Turkish block's `-tr` id. Test: new
  `scripts/harness/help/run.cjs` (29 checks: served with the real `_headers` CSP, no errors in both languages, every
  contents link resolves and scrolls, no sideways scroll on a phone, the numbers match `protocol.ts` / `room.ts`, the
  room's links in both languages, ⋯ opens it in a new tab).

### 6a. Privacy: YouTube privacy-enhanced embed, loaded only when needed (H2; 0.9.94, before the Help page)
- Severity: high
- Why: the player uses `www.youtube.com` and the API is preloaded on every room page, so YouTube sets cookies before
  anyone chose a video, while the policy says "none of their cookies"; this also matters for the YouTube API audit.
- Done when: `YT.Player` uses `host: 'https://www.youtube-nocookie.com'`, `iframe_api` loads only when a YouTube item
  is about to play, and the policy describes the YouTube embed like the TikTok one.
- Tests: harness (no request to `www.youtube.com` on a room page with nothing playing; YouTube plays from the
  no-cookie host); existing room / Shorts harnesses; owner's hand test of YouTube playback.
- Owner's pick: none needed.
- Done: 0.9.93.14 (PR below). `players/youtube.ts`: `YT.Player` with `host: 'https://www.youtube-nocookie.com'`; the
  room no longer preloads `iframe_api` (it loads with the first YouTube item; the TV test page still loads it when it
  tests YouTube). Privacy policy: a "YouTube videos" section (EN + TR, like TikTok's), date 3 November 2026. Test: new
  `scripts/harness/yt-privacy/run.cjs` (no request to youtube.com / ytimg.com in a room with nothing playing, computer
  and phone; the player iframe is youtube-nocookie.com/embed; the API loads with the first video). The cloud's proxy
  blocks youtube-nocookie.com, so the YouTube harnesses route it to www.youtube.com (`scripts/harness/via-youtube.cjs`);
  real browsers use the no-cookie host.


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
- Done: 0.9.93.13 (PR below). C: `ui/room-more.ts` `roomMoreItems` is the one list (🎮 games, ⏰ film time for the host,
  💾 save, ✨ recap, ⌨️ shortcuts on a computer, 🧪 sync test (dimmed while something plays: it would replace it), 👑
  rules); the computer's `#room-more` ⋯ right of Invite opens it as a menu (`createRoomMoreMenu`), the phone's ⋯ sheet
  shows the same tiles in the same order after its invite / queue / people; the settings dialog opens one section
  alone (`open(section, solo)`, `#settings-dialog.solo` hides the section list), ⚙️ = "My screen" only; recap and
  shortcuts left the profile menu; ⋯ → Games opens the games hall under ⋯ through an invisible `#more-game` anchor (an
  `extraButtons` of the games stage). D: `.room.fresh` until the room's first item (any `state.item`), on a computer
  the rail, Share, the queue / people tabs and the empty card's sync test are hidden. Tests: new
  `scripts/harness/room-more/run.cjs` (fresh vs playing, every ⋯ item opens, ⚙️ solo, 1024×640, phone order);
  `one-rail` (a fresh room has no rail), `phone` (tiles by name), `yt-room`, `room-extras`, `invite` pass;
  `store/src/room.html` has the ⋯.


### 5. Home page: "Continue where you left off" overflows (0.9.93, owner's bug)
- Why: owner, 2 Nov 2026 (screenshot): a long video title runs out of the card under the room preview.
- Done when: the card's lines are one line each with an ellipsis (full title in `title`), the card never overlaps the
  preview at any width from 860 px up, and on phones.
- Tests: a harness check with a 200-character title at 1920, 1366, 1024 and 390 px; owner's hand test.
- Owner's pick: none needed.
- Done: 0.9.93.12 (PR below), in the shape the Planner gave (so card 15 only restyles around it): one thin line above
  the title (`.home-continue`, a pill; the whole line `a.continue-link` back into the room, cut with an ellipsis, the
  full text in its `title`; ✕ forgets it). Test: `room-extras` checks a 200-character title and room name at 1920, 1366,
  1024 and 390 px (one line, inside the left column, above the title, never over the preview).


### 4. Invite window: a real WhatsApp button and a QR tab (0.9.93, owner's feedback)
- Why: owner, 2 Nov 2026: the WhatsApp button shows a speech-bubble emoji; the QR text "A friend next to you can scan
  it with their phone's camera" reads badly.
- Done when: the WhatsApp button carries WhatsApp's own glyph (inline SVG, green as in WhatsApp's brand guidelines for
  share buttons, text "WhatsApp"); the window has two tabs "Link" and "QR"; the QR tab shows only the QR code (big)
  with "Copy image" (PNG to the clipboard, falls back to download) and no explanation sentence; EN + TR; fits without
  scrolling at 1024×640 and on a phone.
- Tests: `invite/run.cjs` updated (+ tab switch, copy image, no scroll); owner's hand test.
- Owner's pick: done (owner's words); the WhatsApp glyph follows WhatsApp's brand rules.
- Done: 0.9.93.11 (PR below). `ui/invite.ts`: tabs "Link" / "QR code" (`.invite-tabs`, `role=tablist`); the WhatsApp
  button carries WhatsApp's glyph (Simple Icons path, CC0, inline SVG) on WhatsApp green #25D366 with dark text for
  contrast; the QR tab shows the code big (`min(240px, 42dvh, 70vw)`, white frame) and "Copy image" (`qrPng`: 512 px
  PNG via a canvas → `ClipboardItem`; without an image clipboard it downloads `screenwithme-invite-qr.png`); the old
  explanation sentence (`invite.qr`) is gone; EN + TR. Test: `invite/run.cjs` (glyph + green, tabs, the QR tab's only
  text is "Copy image", a PNG on the clipboard, both tabs without scrolling at 1024×640, the QR tab on an iPhone 13).


### 2a. Nothing of ours over the YouTube player by itself (owner picked D, 2 Nov 2026; with card 2)
- Why: the same rule covers the see-through `#rail-edge` strip over the player's right edge, flying emojis over the
  video in the room view, the "3-2-1" countdown and notes over the video, and the dock / toasts / cameras over a YouTube
  player in fullscreen. Details and a recommendation per item (split layout: cameras and messages in a column
  beside the player, also in fullscreen): `research/youtube-overlay-rail.md` "Follow-up (Job 3)".
- Done when: the owner's D below is built; a harness asserts that, with nobody dragging anything, no element of ours
  intersects the YouTube iframe's box in the room view, Shorts view and fullscreen (popups only while open).
- Tests: harness overlap check in the room view, Shorts view and fullscreen.
- Owner's pick (2 Nov 2026, https://claude.ai/artifact/S9PHD4qRh8uaM2ehzHka6T): **D, like Watch2Gether**: on YouTube
  nothing of ours sits over the player by itself: `#rail-edge` goes (the edge is found from a thin gutter beside the
  player + document mousemove), flying emojis rise beside the video from the sender's face, the 3-2-1 countdown and
  notes sit above the video or in `.yt-notices`, in fullscreen the player shrinks for a side column with the camera
  strip (1–4 tiles) and the newest messages; automatic tile columns and reset positions never land on the player.
  Allowed: the person drags a camera window over the player themselves, and our popups (emojis, ⋯, settings) may
  open over it while open. The small remaining audit risk is accepted in writing (this card). Video files and film
  pages keep today's behaviour.
- Done: 0.9.93.10 (PR below). YouTube only (video files and film pages unchanged): `#rail-edge` moved off the player
  into a 14 px gutter beside it (`--edge-gutter`, the resting player ends there); emojis rise from the sender's face
  (`reactions.showFrom` + `reactionAnchor`, brought back from 0.9.92.9; with the side panel hidden or in fullscreen from
  the rail's 😀, which opens for a moment via `fullscreen.showRail()`); the 3-2-1 countdown is one of the notes
  (`NOTICES`, a card above the message box); fullscreen on a computer (`.theater.yt-fs`) has a column `#fs-side`
  between the player and the rail with the notes (`#fs-side-notices`), the cameras (`cam-float.ts` `sideColumn()`:
  automatic tile places, the pill and the one window default there; a place the person dragged is kept) and the
  newest messages at its bottom; "who paused" is hidden there. Tests: `yt-room` checks nothing of ours meets the
  YouTube frame resting, in the room view, fullscreen and the Shorts view (plus emojis, notes, messages, the gutter);
  `cam-fs` checks both camera layouts sit in the column in YouTube fullscreen. Also: `draw.mjs` waited for the words
  but read the previous state (the server sends `choices` just before `state`; live they can arrive apart): it now
  waits for the next round's "choose" state (0.9.93.9 deploy, first-attempt failure).


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
- Done: 0.9.93.9 (PR below). The rail (`fs-dock`) is now on every computer page: `renderDock` also docks with no player
  (`rail-bare`: the empty room or a film card on the site, always out, 📌 / ⛶ dimmed) and marks every docked theater
  `side-rail`, so the YouTube column rules apply to all players (the video / empty card / overlays end at the rail,
  never under it). The toolbar under the video is hidden on the film page too; there the rail is a column that stays
  out (`railFixed`: the film is fitted once, left of it, instead of on every edge visit), ⋯ is back (speed, sync, next;
  not the side-panel item) and 🎮 is on it; the hole and its islands are the `#player` box left of the rail. Video files
  and the sync test follow YouTube: the rail comes at the right edge and the video makes room. Tests: new
  `scripts/harness/one-rail/run.cjs` (13 checks: empty room, file, fullscreen, sync test), `embed/run.mjs` (no toolbar,
  rail beside the film's video box in the room view and fullscreen, stays out while the film plays), `phone/run.cjs`,
  `yt-room`, `sound`. `store/src/room.html` shows the rail.


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
- Done: 0.9.93.8 (PR below). `send` bodies are read as a stream and stopped at `SEND_BODY_BYTES` (`readCapped`; other
  bodies are cancelled unread); a session may queue 11 M characters (one full join into a room with 24 custom emojis +
  12 chat images is ≈ 10.1 M, so 2–4 MB would have closed real joins) and all sessions of an object 24 M together
  (`HUB_BYTES`); a session that has not polled 10 s after `open` is closed (sweep every 5 s); a second `hello` on a
  joined connection gets `bad_message`. Tests: `fallback.mjs` (chunked 2.5 MB body → 413 and the room still answers,
  a never-polling session closed after 10 s, second hello refused), hotspot harness.


### 1b. Security: cap queue votes (M1; with 1a)
- Severity: medium
- Why: `voters` grows without a cap and without checking the voter is present; with rotated browser ids it can pass
  the storage value limit and freeze the room's queue.
- Done when: voters per item are capped (e.g. `MAX_MEMBERS`) and only people in the room count; the second-`hello`
  fix from the card above is in.
- Tests: e2e (many votes from one connection with changing ids count once / stay capped).
- Owner's pick: none needed.
- Done: 0.9.93.8 (same PR). Votes keep only people in the room (pruned on every vote) and at most `MAX_MEMBERS` per
  item. Test: `fallback.mjs` (rotated ids count once, a second person adds one, back to 1 when they leave).


### 1. Fix: the rail never hides in YouTube fullscreen (0.9.93 "Now" 1, owner's bug)
- Why: owner, 2 Nov 2026 (screenshot, after 0.9.93.5): in fullscreen, with the mouse moved to the middle of the video,
  the right rail (💬 😀 📌 🎮 🎙 📷 ⋯ ⛶, mic and camera red because not in voice) stays however long he waits.
- Done when: in fullscreen and in the window the rail rests (`.dock-idle`) `HIDE_MS` after the mouse leaves the right
  edge, whatever was pressed before (rail buttons, Esc, shortcuts, emoji, the message box empty); root cause written in
  `STATUS.md`; the same check on the film page's rail.
- Tests: a `yt-room` harness check that fails on 0.9.93.5 first (enter fullscreen, move to the centre, wait 1 s →
  rail hidden), also after pressing 🎙 / 📷 outside voice and after ⋯ → Esc; owner's hand test.
- Owner's pick: none needed.
- Done: 0.9.93.7 (PR below). Root cause: a touch-screen laptop reports a coarse primary pointer, so the room took it
  for a tablet (rail always on screen by CSS, and a pressed rail button's focus held it in the non-edge mode). A mouse
  anywhere now keeps the computer behaviour (`hasMouse()`), focus only holds the rail for keyboard users, the hover
  flag is double-checked. `yt-room` (simulated touch laptop, fails on 0.9.93.6) and `embed/run.mjs` checks pass.


### Phone: next speed steps (0.9.93 "Now" 2)
- Why: the phone room should open and react fast on mid-range phones.
- Done when: voice / stream / TV code loads only when needed, phones get a lighter stylesheet, and an automatic phone
  speed test (4× slower CPU) runs against the built site with agreed budgets.
- Tests: the speed test itself in CI; `scripts/harness/phone/run.cjs` still passes.
- Owner's pick: none needed.
- Done: 0.9.93.6 (PR below). Lazy: TV room + remote + `tv.css`, invite window + QR, first-time tips, image tools. Room
  page JS 142.1 → 134.5 kB, CSS 35.7 → 34.0 kB gzipped; `scripts/size-budget.mjs` in CI; phone speed test
  `scripts/harness/phone-speed/run.cjs` (4× CPU, 4G): home 556 / join 478 / in room 369 ms. Voice / live stay in the
  room chunk; a phone-only stylesheet was not worth it (most rules shared). Phone harness passes.


### Root cause of the live e2e first-attempt failures
- Done: https://github.com/alperenakturk/screen-with-me/pull/113, https://github.com/alperenakturk/screen-with-me/pull/114
  (deploys restarted test rooms mid-test; the deploy job now waits for the new version).
