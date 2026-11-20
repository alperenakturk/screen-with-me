# Games on phones: first look for card GPH1 (19 Nov 2026)

A fresh reviewer read the games sweep's phone shots (`SIZES=iphone,pixel,small LANGS=en`, upright; Quiz and Five
Frames solo left out, Game Studio 2 owns them) and listed what a person sees. The automated sweep passed all 624
checks on those shots. GPH1 part 1 (`claude/games-phones`) added the missing check (nothing drawn over a control) and
fixed item 1; part 2 (`claude/games-phones-2`) fixed items 2 and 3 and the board gutter, and added Lab `games.phoneSweep`. The rest is open for the next Game Studio session, roughly in this order.

## Ranked
1. **Fixed (part 1).** Duel in play: the other player's card lay over the letter keys C–H and M–Q, and the status line
   covered row 7. Taps landed on the card.
2. **Fixed (part 2).** **Last Heart with six players:** only two of the five other players show, and whose turn it is may be hidden.
   "Sam is thinking…" wraps into a narrow column. About 350 px stay empty under the table. The five board cards take
   about 60 % of the width, pushed left, and a lone ♠ floats after "Blinds 2/4".
3. **Fixed (part 2)**, except the pot card's gap (kept: WG2 holds its height steady). **Banners and toasts over the art** in Snack Bar and Window Garden:
   - Snack Bar: "Closed until the film plays" covers the popcorn machine and Glowbeam. On the small phone the
     "Paused" pill is only an icon.
   - Snack Bar busy: "New badge" covers the +3 chip and the SNACK sign, and touches the "?".
   - Window Garden: "Resting until the film plays" covers the window frame and the moon. On the small phone the pot
     card has a big gap and the plant strip is cut at both edges.
4. **Gutter fixed (part 2)**; Sea Battle's sizes and chess's jump at the start are open. **Board sizes are inconsistent:**
   - Chess in play, Four in a Row, backgammon and tic-tac-toe on the Pixel run edge to edge with no gutter, and Four's
     blue base bleeds off both sides.
   - Sea Battle's lobby board is about 65 % wide, its six-player board about 80 %.
   - Chess grows from about 928 to 1070 device px when play starts, so the whole layout jumps.
   - A shared gutter and size rule is needed.
5. **The small phone's top bar is cut:** "No video yet" at the top edge, and the bottom of Search / Invite under
   "Back to video". This shows on every game, likely the room's phone layout (lane A); check before fixing.
6. **Text cut or wrapped:**
   - The Classics status reads "someone in the room needs to…", and names are cut to "Robi…".
   - The Duel score is cut to "Robin 0 – …" on the small phone.
   - "Play against Stub (our bot):" wraps, with a stray colon.
   - In the Duel lobby, "Best of three" wraps and the "Games" label floats.
7. **Wasted height:**
   - On the Pixel the empty video band is about 360 px tall, with Glowbeam stranded in it.
   - The gap above the picker and the lobby cards.
   - A lone backgammon "Roll" button sits in dead space above the status bar.
   - The empty lower third of the garden scene.
8. **The active player's ring is clipped** at the right edge (Classics player cards).
9. **Lobby controls left in play:**
   - Sea Battle keeps the bot difficulty buttons mid-game.
   - "Their sea" shows twice.
   - The Classics bot row is off-centre.
10. **Small things:**
    - Tic-tac-toe cells read as a button grid (no grid lines).
    - Draw & Guess's first two brush dots look the same.
    - The side games' head lacks the "?" that tables have.

## Part 2's first look (20 Nov 2026), still open
- Tall phones (Pixel) leave 200–250 px empty under Last Heart, Snack Bar (it still says "+4 more") and the boards in play.
- Last Heart: the shared cards fill only ⅔ of the pot box on a Pixel; "Bedelsiz çekil" wraps (TR, 360 px).
- Classics: "Robin (yo…" / "Robi…" in the players' row; Four in a Row's stand reaches both edges at 360 px.
- Not phones: in a computer's free window the closed / resting notes still lie over the art; at 1366 a side game's
  window covers the side panel; the tablet's Last Heart lobby stacks its Deck options.

## Part 3a (`claude/games-phones-3`, 20 Nov 2026)
Fixed: chess's jump at the start (waiting keeps the playing rows), "Robin (yo…" (the tab hides "(you)"), the waiting
status cut in "…" (the empty seat says it), Four's stand at 360 px, tic-tac-toe's grid lines, Sea Battle's colon, its
idle level and the doubled "Their sea", "Bedelsiz çekil" (now "Bedava çekil", one line), Last Heart's small shared
cards on a tall phone. Left as they are: Sea Battle's placing board on a 360 × 640 phone (≈ 60 % wide; the height is
shared by the bar, the head, the status and three buttons), backgammon's Roll under a width-bound board, Snack Bar's
list on a tall phone (it shows every stand that fits). Not phones: Sea Battle in battle on an upright tablet fails the
sweep's fair-size check (217 px sea in 714 × 433; not in CI's tablet list, older than this part).

## Part 3b (`claude/games-phones-4`, 20 Nov 2026)
Quiz running: the top bar's three columns overlapped ("Quest|Nature and animals" under the ½ joker) and a tall phone
left a third empty: fixed. Five Frames on a 360 × 640 phone: ticket rows ≈ 20 px with 13 px tiles: the word picker
joins the head's row. Computer: the free window's closed / resting notes no longer cover the art; Five Frames' "?"
is the pills' 24 px. Left: the side panel covered by a side game's window at 1366 and the tablet's Last Heart lobby
(both not phones, a tablet batch).

## Shared causes
- No common board gutter or size rule.
- Floating status, toast and banner layers placed absolutely without reserved space (Duel, Snack Bar, Window Garden).
- The lobby cards' label and pill rows wrap badly at 360 px.

## Sideways phones
`SIZES=iphoneSide,smallSide` (part 1 added them; they run only when named) shows the room's upright phone layout
drawn at about 45 % in the middle of a wide screen: text 6–9 px, 19 px controls, the page scrolls. The reference says
"Games have no sideways-phone rules any more". Find out whether this is Playwright's emulation or real (the owner's
phone sideways), and ask the Planner whether sideways is in GPH1's scope before building.
