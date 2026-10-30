# PlayWithMe games hub: design proposal

> 30 Oct 2026, phase 1 (design only, no feature code). Visual proposal with mock-ups (desktop, film page, phone):
> https://claude.ai/artifact/X9SSF7WNJ8bU4dYAfwvZQF. **Status (30 Oct 2026): the owner picked D**, plus game
> improvements and a new game (see "Phase 2" at the end). Existing system: `CLAUDE.md` "PlayWithMe"; game ideas and the shared
> UI rules: `docs/internal/oyun-fikirleri.md`.

## The owner's wishes

1. **Take the game out of the video frame:** play while the video keeps playing (floating / docked / side window),
   on the film page too (a friend's request).
2. **Nicer game designs.**
3. **Several sessions at once:** two people play XOX while others play something else; people move between games
   freely.
4. **New games fit in easily**, and an update or a new game is announced inside the games section ("what's new").
5. **A small hub**, and everything works well on phones.

Today: a room holds one game (`RoomGame`, `Room` DO field `game`), it opens in the video's place (`games/stage.ts`,
`#game-stage` inside `.player-wrap`), others get an invite card, "▶ Videoya dön" minimizes it. The games themselves
already run in their own Durable Objects (`Game` for XOX / Connect Four, `Draw`, `Quiz`) keyed by an id the room
hands out. That last fact makes wish 3 cheap on the server.

## Shared foundations (the same in every concept)

### Tables (wish 3)
- The room holds up to **4 tables** instead of one game. A table = one game instance = one existing game DO (its id).
- Anyone may open a table (at most one open table per person, unless `settings.gamesHostOnly` later); the opener or
  the host closes it. A table nobody is at for 2 min closes by itself (the room's single alarm, never `setTimeout`).
- People sit or watch at any table and move between them freely; the hub shows who is where.

### Game catalog + "What's new" (wish 4)
- `packages/shared/src/games/catalog.ts`: one entry per game: `kind`, line icon, min / max players, the placements it
  fits (see concept D) and its minimum size, `since` (version it arrived), `news: [{ version, tr, en }]`.
- The 🎮 menu, the hub, invite cards and announcements are all drawn from the catalog. A new game = catalog entry +
  rules file + mount function + its server DO (or a `kind` on an existing one).
- What's new is client-only: the newest catalog version I have seen is `localStorage` `opt:gamesSeen`. Newer entries
  → a yellow dot on 🎮, a short "Yeni / New" card at the top of the hub, a `NEW` / `UPDATED` badge on that game for
  two releases. Seen once = gone. Nothing goes to the server.

### Shared game look (wish 2)
- Line icons for the games in the same style as `ui/icons.ts` (XOX grid, Connect Four board, pencil, question bubble)
  instead of the emoji pairs.
- One UI kit (`apps/web/src/games/ui.ts` + CSS, as planned in `oyun-fikirleri.md`): player strip (turn glows, score),
  timer bar from server time, result / podium screen, the fixed emoji row. Colors from theme tokens.
- Every game gets a **compact** layout (≈ 280–360 px wide) and a **large** one, chosen by the container's size
  (container queries), so the same game works docked, floating, on the stage and on a phone.

### Server and protocol (all concepts)
```
Room DO:   tables: RoomTable[]            // max 4, in storage
           RoomTable { id, kind, by: Member, at, owner (persistent key, never sent) }
Client →   { t: 'table', open: kind }     // new table
           { t: 'table', close: id }      // opener or host
           { t: 'at', table: id | null, play?: true }   // "I'm at this table" (for the hub)
Server →   { t: 'tables', list }          // full list on every change
           welcome.tables, Member.table?  // who is where
Game DOs:  unchanged (each table id = its own object; seats stay inside the game DO)
```
- **No `PROTOCOL_VERSION` bump:** all fields are optional. For old clients the room keeps sending `game` = the newest
  table, and an old `{t:'game', kind}` opens a table.
- Limits: 4 tables, 1 open table per person, table messages count against a small separate limiter (not the
  playback `commandLimit`). New error codes `tables_full`, `table_own`.
- `freezeIfLongEmpty` closes all tables, as it closes the game today.
- The room never talks to the game DOs (no DO-to-DO calls); "who sits where" in the hub comes from clients' `at`
  messages, the game DO stays the source of truth for seats and moves.

## Concept A: Games tab in the right rail
A fourth tab next to Chat / Queue / People: **Games**. The hub (tables, what's new) and the game itself live in the
320 px rail; "⤢" enlarges a game to the stage as today.
- **Desktop:** the video never shrinks. **Film page:** the rail is the site's own area, no islands; but fullscreen
  has no rail, so in fullscreen a game needs a dock button + a small window anyway. **Phone:** fits the app layout
  (video on top, tabs below) very well.
- **Effort:** 2/5. **Risks:** 320 px is too narrow for Draw & Guess; while the Games tab is open the chat is hidden;
  hiding the side panel (⇥) hides the game.

## Concept B: Floating game window
The game is a free window over the page, like the camera windows (`ui/cam-float.ts`): drag, resize from the corner,
"−" turns it into a pill ("Connect Four · your turn"); the hub is the window's first screen.
- **Desktop:** the video keeps playing under / next to it. **Film page:** the window is an island; works in
  fullscreen next to the dock. **Phone:** a half-height bottom sheet instead of dragging.
- **Effort:** 3/5. **Risks:** the window covers part of the film (subtitles); with camera windows the screen gets
  crowded; the island must update every frame while dragging in the shell.

## Concept C: Tables lobby on the stage
🎮 opens a stage in the video's place as today, but it is a **lobby**: table cards, "new table", what's new; the film
keeps playing small in a corner (picture-in-picture). Strongest "game hall" feeling.
- **Desktop:** good. **Film page:** we cannot shrink the film site's player into a corner, so the lobby covers the
  film; wish 1 is not met there. **Phone:** full-screen lobby with a small video strip on top.
- **Effort:** 3/5. **Risks:** the game still takes the video's place, which is exactly what the friend asked to change.

## Concept D: Hub + placements (recommended)
🎮 opens a small **hub** popover (bottom sheet on phones): what's new, the room's tables (who sits, whose turn,
Sit / Watch / Open), "new table". Sitting down opens the game in a **game window** with three placements, switched
from the window's header and remembered per game kind (`localStorage` `gamePlace:<kind>`):
- **Side:** the stage splits: video on the left (smaller, fully visible), game on the right.
- **Floating:** small window over the video (concept B's window).
- **Stage:** large, in the video's place (today's behaviour).
Defaults come from the catalog: XOX / Connect Four → side, Draw & Guess / Quiz → stage.
- **Film page:** *side* narrows the hole (`.player-wrap` gets narrower, the game sits next to it in the site's own
  area; `focus.ts` already fits the film video into whatever hole the site reports); *floating* is an island;
  in **fullscreen** the dock gets a 🎮 button and the game opens floating left of the dock.
- **Phone (upright):** *side* becomes **below**: video on top, game under it in the place of the chat (the app layout
  from 0.9.91.2); "Large" makes the game full screen with the video as a strip. Sideways: video left, game right.
  The hub is a bottom sheet. Touch targets ≥ 44 px.
- **Effort:** 4/5, in safe steps. **Risks:** three placements = three times the testing (desktop, film page, phone);
  the video gets smaller in side mode (hence the per-game defaults); resizing the hole can make the film site's
  player jump for a frame (measure, as with the 0.9.90 scroll fix).

## Comparison

| Concept | With the video | Film page | Phone | Room for games | Effort |
|---|---|---|---|---|---|
| A Games tab | yes | not in fullscreen | very good | narrow (320 px) | 2/5 |
| B Floating window | yes | yes (island) | bottom sheet | small window | 3/5 |
| C Tables lobby | small film | film covered | good | plenty | 3/5 |
| **D Hub + placements** | **yes** | **yes (side, floating, fullscreen)** | **best** | **per game** | **4/5** |

## Recommendation: D
The friend's request is "play while the video plays". D is the only concept that meets it everywhere: on the site,
on the film page, in fullscreen and on phones. It combines the good parts of the others (B's floating window, C's
hub of tables, A's phone layout), and every game opens at a size that suits it. It costs the most, but each step
below ships as its own release.

### Build order if D is chosen (each step a release, four-part versions)
1. **Catalog + what's new + game line icons.** Works with today's single game; no risk.
2. **Tables on the server.** Room holds up to 4 tables, backward compatible. e2e: XOX and Quiz at the same time,
   moving between tables, closing, old-client `game` field (`scripts/e2e/roomgame.mjs` grows).
3. **Hub popover.** Tables, who is where, Sit / Watch / Open, new table; invite card "Ali opened an XOX table · Sit".
4. **Game window + placements.** Stage (today) + side first, then floating; film page hole narrowing; 🎮 in the
   fullscreen dock. Embed harness checks.
5. **Phones.** Below / large, sideways split, hub bottom sheet; new checks in `scripts/harness/phone/run.cjs`.
6. **New game look.** Shared player strip, timer bar, podium; the four games redrawn in compact and large layouts.

Tests to keep green on every step: `scripts/e2e/roomgame.mjs`, `xox.mjs`, `draw.mjs`, `quiz.mjs`, the phone harness.

## Phase 2 (owner's choice: D, 30 Oct 2026)

The owner also asked, in the same message: improve the existing games; in Quiz and Draw & Guess the person who sets
the game up picks the language (Turkish / English); many more quiz questions and topics, so every game feels
different; a one-time 50:50 joker per player in the quiz (the quiz stays everyone-for-themselves for now); in Quiz and
Draw & Guess the first right answer is worth clearly more, drawer and guesser points are balanced mathematically,
late answers and answers after many wrong tries score less; a nicer look for all games (XOX and Connect Four play
fine as they are); and a basic **poker with "life" instead of money** (everyone starts at 100 %, spends it like
chips, special moves such as "sacrifice 10 % of your life to disqualify a player this hand, their bets are
refunded" or "fold this hand for free"), in a version with jokers and one without, at a table that is not a casino.

### Task queue (continue from the first unfinished item)
1. ✅ **0.9.91.6 Quiz + Draw & Guess.** Host settings (first player still connected = host; language, quiz topic and
   length 5 / 10 / 15, Draw & Guess rounds 1 / 2 / 3, then a podium); quiz bank 98 → 406 questions in 11 topics
   (bilingual entries, true / false questions, recently asked ones skipped on rematches); 50:50 joker; points in
   `packages/shared/src/games/scoring.ts` (quiz: speed 50–150 + first three 50 / 25 / 10 + streak up to 30; draw:
   `200 × time(0.3–1) × 0.8^(rank−1) × tries(−10 % per wrong guess after two free, ≥ 0.5)`, drawer = guessers'
   average × share who guessed); shared game pieces `apps/web/src/games/ui.ts` (settings rows, podium). Quiz and
   draw protocol versions 2.
2. ✅ **0.9.91.8 Hub step 1–3.** `packages/shared/src/games/catalog.ts` (`GAME_CATALOG`: players, default place;
   `GAME_NEWS` newest first, `unseenNews`, `compareVersions`); the room holds `tables` (≤ `MAX_TABLES` 4, storage
   `tables`, the old single `game` is read once), `{t:'table', open|close}`, `{t:'at', table}` (member field `table`),
   `{t:'tables', tables, opened?, closed?, by?}`, `welcome.tables`; one table per person (a new one replaces my old one
   when nobody else is at it, else `table_own`), `tables_full`, a table nobody has open closes after `TABLE_EMPTY_MS`
   (2 min, the room's single alarm); old `{t:'game'}` messages still work (open a table / close my newest), `game` is
   still sent (newest table). Site `games/stage.ts` = the hub (🎮 popover: what's new, tables with faces + Join / Show /
   ✕, new-table grid with NEW / UPDATED badges; `opt:gamesSeen`, a yellow dot on 🎮 until the hub is closed once),
   stage head "Game hall · Back to video · Leave table · Close table", line icons `gamepad`, `game-*` in `ui/icons.ts`.
   Test: `scripts/e2e/roomgame.mjs` (rewritten for tables).
3. ✅ **0.9.91.8 (same release) placements.** Head switch side / float / stage (`gamePlace:<kind>`, defaults from
   `GAME_CATALOG.place`): side = `.theater.game-side` grid, the stage right after `.player-wrap` (outside the hole, so
   on the film page the hole narrows and the film refits); float = absolute in `.player-wrap` (an island on the film
   page), dragged by its head, spot `gameFloat:spot` as a share; stage = as before. Fullscreen turns side into float.
   ≤ 860 px: below the video (`.below`, fixed from the video's bottom, `--game-top`) or full screen. Small windows use
   a compact XOX / Connect Four layout (`@container game (max-width: 560px)`). Fixed: the empty seat's "?" used the
   site-wide `.empty` class and jumped to the stage's corner (now `.vacant`).
4. ✅ **0.9.91.8 (same release) Life poker.** Rules and engine in `packages/shared/src/games/poker.ts` (pure,
   `poker.test.ts`: hand ranking incl. jokers as wild cards and five of a kind, side pots, the table engine
   `PokerEngine`: blinds 2/4 rising every 5 hands, no-limit betting, short all-ins, the board running out, shields
   at the showdown, the game ending with one player left). Moves once per game: disqualify (10 life burned, needs 3+
   in the hand, refunds the target), free fold (own turn, refunds my bets), shield (5, a showdown loser gets half
   back), peek (5, one of a rival's cards, only to me). Server object `Poker` (`apps/server/src/poker.ts`, binding
   `POKERS`, migration `v6`, `/api/poker/:id/ws`): seats in the lobby (≤ 6, others watch, `sit`), host = first
   connected seat (jokers on / off), private `cards` only to their owner, turn 30 s (4 s when the player is away),
   showdown 6 s, timers via the storage alarm. Site `games/poker.ts`: a glass flask for the pot, life bars, paper
   cards, move cards with costs, a raise slider with quick picks; two columns in a wide window. Test:
   `scripts/e2e/poker.mjs`.
5. ✅ **0.9.91.9 Look.** XOX marks drawn by CSS (two glowing strokes that draw in, a ring that turns in; the cell's
   `aria-label` says the mark), a faint preview of my mark / disc on the cell or column under the mouse on my turn
   (`board.dataset.me`), winning cells in the mark's color, player cards glow in their color on their turn; quiz
   options slide in once per question (`.fresh`), the right one pulses at the reveal; podium steps rise. Shared
   pieces stay in `games/ui.ts` (settings rows, podium).
6. ✅ **0.9.91.10 Free window (owner's feedback on 0.9.91.9: "side is too narrow, the small window must leave the
   video's frame, come into fullscreen and fit each game").** Placements are now two: **float** and **stage** (a saved
   `side` reads as float). The float window is `position: fixed` on `<body>` (inside the theater while it is
   fullscreen, real or `.fake-fs`, so it stays visible and free there), dragged by its head anywhere on the screen
   (`gameFloat:spot`, a share of the free room, 8 px from the edges), resized from its corner (`.game-resize`,
   per game `gameFloat:size:<kind>`; a double click on the head resets it). Each game opens at its own size
   (`GAME_CATALOG.size`, e.g. quiz 760×560) and needs `fit` (e.g. quiz 640×500): a smaller window keeps that layout
   and scales the whole window down (`transform: scale`, `.scaled`) instead of squeezing it into scrollbars. On the
   film page it carries `data-island` (the room's island loop picks it up where it covers the hole). Compact XOX /
   Connect Four now leave 230 px for players, status, actions and emojis (the emoji row was cut off).

## Phase 3 (owner's feedback on 0.9.91.10, 30 Oct 2026)
"Never make me scroll inside a game: fit it on one screen (fullscreen, in the video's place, free window). The free
window grows and shrinks in proportion only. Emojis I send must always show, even over a game or in an empty room
(drop the extra emoji bars of XOX / Connect Four). The quiz froze after it ended. Poker needs a proper name, a
'How to play' and must be clear and quick: whose turn, the clock, who used a move, no long waits for the result.
Draw & Guess needs richer drawing (fill, …)."

### Task queue (continue from the first unfinished item)
1. Fit every game on one screen with no scrollbars (auto-fit scaler for the game body in every placement), the free
   window resizes in proportion; CLAUDE.md rule "no scrolling unless truly needed".
2. Room emojis fly over games and in an empty room; XOX / Connect Four emoji bars removed.
3. Quiz: the screen stops responding after the game ends (find and fix).
4. Poker: new name, "How to play", clear turn / clock / move announcements, faster result; quiz joker announced.
5. Draw & Guess: richer drawing tools (fill, colors, sizes, undo).
6. Tests, release, PR, merge, deploy, report.
