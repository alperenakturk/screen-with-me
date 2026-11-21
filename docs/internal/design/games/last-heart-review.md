# Last Heart: play-through review (card LH4)

🎮 Game Studio "Last Heart", 21 Nov 2026. A full play-through of Last Heart (code name `poker`) on the local server
(`wrangler dev` with the lab flag, a playing video file, the Test Lab's 🤖 friends), at 2 and 6 players, at a laptop
(1366 × 768), a big monitor (1920 × 1080), an upright tablet (820 × 1180), a sideways tablet (1180 × 820) and a phone
(iPhone 13), plus a read of the rules engine (`packages/shared/src/games/poker.ts`), the table object
(`apps/server/src/poker.ts`) and the page (`apps/web/src/games/poker.ts`, `poker.css`, the `.pk` rules in `room.css`).

Severity: **B** = a bug a player meets, **R** = a rules question or a rule that reads wrong, **L** = layout,
**F** = feel (animation, sound). Status is filled in as the fixes land.

## Rules engine and table object

The engine held up: blinds (heads-up dealer = small blind), the big blind's option, raises reopening the betting (a
short all-in does not), side pots, an all-in board running out by itself, shields, the odd point after the dealer,
disqualify / free fold refunds and their 3-player rule. Life is conserved over a plain hand (3 × 100 in, 300 after).
The unit tests (`poker.test.ts`) cover all of these. What reads wrong:

| # | Sev | What | Where | Status |
|---|---|---|---|---|
| 1 | B | **Any special move resets the turn clock.** `changed()` sets `endsAt = deadline()` after every change, so a rival's Shield, Peek or Disqualify out of turn gives the player to act a fresh 30 s. Five rivals can stretch one turn by minutes. The clock should restart only when the turn passes (someone else to act, a new street or hand). | server `changed()` | fixed #594 |
| 2 | R | **"+8" is what was taken from the middle, not what was won.** The result line and the seat say "+8" while the winner's life went 96 → 104 (+4 over the hand, +8 against the life left after betting). Players read "+8" as the change in their life. Say "takes 8 from the middle" (EN / TR), keep the number. | page `result()`, `statusText()` | fixed #594 |
| 3 | B | **A loser's best cards glow gold** at the showdown (the seat uses `p.best` for everyone; the shared cards only for winners), so the losing hand looks like it won. Only winners' cards glow; a loser's best five get a quiet outline. | page rival seats | fixed #594 |
| 4 | B | **The feed drops a repeated line.** "Sam checked" on the flop and again on the turn shows once (`feed[last] !== line`). The new street itself never shows in the feed ("Flop", "Turn"…). | page `render()` | fixed #594 |
| 5 | B | **The raise slider is rebuilt by every state.** A rival's move while I drag the slider ends my drag (the whole table is re-rendered). Keep the actions row when only others' details change. | page `render()` | fixed #594 |
| 6 | R | A time-out shows "Time ran out for Sam" but not what that did (checked or folded). | page `describe()` | fixed #594 |
| 7 | R | A peeked card is forgotten on a reload (it came once, only to me). Minor: the peek costs 5 life. The server could keep the peek with the hand and send it again in `cards`. | server / page | later |
| 8 | R | A player who left stays dealt in every hand (4 s per turn, then check / fold) until they run out or the game ends. Expected for a short drop; a long one slows a 6-player table. Leave as is (a reload keeps the seat). | server | as is |

## Layout (in the video's place unless said)

| # | Sev | What | Where | Status |
|---|---|---|---|---|
| 9 | L | **The table doesn't fill the video's place** (GFIT1). It is laid out at its design size (878 × 428) and scaled: at 1366 there are ≈ 100 px empty bands above and below, at 1920 ≈ 130 px. The root has no `data-fill`. | `poker.ts` root, `poker.css` | round table |
| 10 | L | **The shared cards are the smallest thing on the table**: 34 px wide at 1366, 50 px at 1920 (my seat box is twice their area and half empty at 1920). The board is the game; it should be the biggest thing after my own two cards. | `poker.css` | round table |
| 11 | L | **Card faces break at small sizes.** The rank and the suit are fixed 14 px / 26 px on a card whose width changes (26–52 px): on a phone my two 38 px cards show only a big suit, the rank hidden under it; at 34 px the "3" of a heart touches the suit. The face should scale with the card. | `room.css` `.pk-card` | fixed #594 |
| 12 | L | Upright tablet (820 wide): the table is scaled to 0.96, small print ≈ 12 px; most of the box's height goes to rows that could be one line. | `poker.css` LH2 block | round table |
| 13 | L | Phone (Games tab): fine at 2 and 6 players (GPH1); the shared cards leave the right third of their box empty at 2 players. | `poker.css` PH2 block | as is |
| 14 | L | At the showdown the result is said twice at once: in the status strip and in the gold toast over it. | page `announce()` | fixed #594 |
| 15 | L | Fold has a red outline on touch screens only (a hover style that sticks after a tap). | `room.css` `.pk-fold:hover` | fixed #594 |

## Feel: animation and sound

| # | Sev | What | Status |
|---|---|---|---|
| 16 | F | Nothing moves but a card turning face up (`flipIn`). No deal (cards appear), no life going into the middle (the flask level jumps), no pot going to the winner, life bars jump. The page rebuilds every node on each state, so CSS transitions never run. | #596 |
| 17 | F | Sounds: my turn, the last 5 s, a win / loss at the showdown, the game's end. Silent: the deal, a rival's call / raise / all-in, a fold, the flop / turn / river, special moves (a disqualify or peek happens without a sound). | #596 |

## The table's look

The table is a set of dark cards (rivals, the middle, me) on the room's background with a faint red glow. It reads as
a form more than a table: no surface the cards lie on, the rivals in a list, my seat a big box with empty space.
The owner picked **A** (21 Nov 2026), built in the round-table PR. A nicer table was a design pick for the owner (sent to the Planner with mockups, `last-heart/` pictures):

- **A. Round table** (recommended): a dark wine table filling the play area, rivals around its top edge with what
  they put in lying in front of them, the flask and five big shared cards in the middle, my seat at the bottom edge;
  the narrow side column holds the turn, the actions, the special moves and the feed.
- **B. Clean rows**: the same side column, the play area in three rows (rivals strip, big board with the flask, my
  hand), no table drawn.
- **C. As now, bigger**: today's layout filling the space, only the cards and the board bigger.

Whatever the pick, the fixes above (1–6, 9–11, 14–17) don't depend on it and land first.

## Plan

1. Rules and page fixes 1–6, 14, 15 with unit tests (server clock rule in the engine-facing code, the feed and
   result texts), the e2e extended (a move out of turn keeps the clock).
2. Animations and sounds (16, 17): keep nodes between states (cards, flask, life bars) so they can move; a deal slide,
   life flowing to the middle, the pot flying to the winner, sounds for the deal, a call / raise, a fold, a street and
   each special move; all quiet under "reduce motion".
3. The table design (9–13 with the owner's pick), filling the video's place (`data-fill`), card faces that scale.
4. Test Lab hook (a showdown on demand), harness checks, first look at 4 sizes, EN + TR.
