# Games on phones: first look for card GPH1 (19 Nov 2026)

A fresh reviewer read the games sweep's phone shots (`SIZES=iphone,pixel,small LANGS=en`, upright; Quiz and Five
Frames solo left out, Game Studio 2 owns them) and listed what a person sees. The automated sweep passed all 624
checks on those shots. GPH1 part 1 (`claude/games-phones`) added the missing check (nothing drawn over a control) and
fixed item 1. The rest is open for the next Game Studio session, roughly in this order.

## Ranked
1. **Fixed (part 1).** Duel in play: the other player's card lay over the letter keys C–H and M–Q, and the status line
   covered row 7. Taps landed on the card.
2. **Last Heart with six players:** only two of the five other players show, and whose turn it is may be hidden.
   "Sam is thinking…" wraps into a narrow column. About 350 px stay empty under the table. The five board cards take
   about 60 % of the width, pushed left, and a lone ♠ floats after "Blinds 2/4".
3. **Banners and toasts over the art** in Snack Bar and Window Garden:
   - Snack Bar: "Closed until the film plays" covers the popcorn machine and Glowbeam. On the small phone the
     "Paused" pill is only an icon.
   - Snack Bar busy: "New badge" covers the +3 chip and the SNACK sign, and touches the "?".
   - Window Garden: "Resting until the film plays" covers the window frame and the moon. On the small phone the pot
     card has a big gap and the plant strip is cut at both edges.
4. **Board sizes are inconsistent:**
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

## Shared causes
- No common board gutter or size rule.
- Floating status, toast and banner layers placed absolutely without reserved space (Duel, Snack Bar, Window Garden).
- The lobby cards' label and pill rows wrap badly at 360 px.

## Sideways phones
`SIZES=iphoneSide,smallSide` (part 1 added them; they run only when named) shows the room's upright phone layout
drawn at about 45 % in the middle of a wide screen: text 6–9 px, 19 px controls, the page scrolls. The reference says
"Games have no sideways-phone rules any more". Find out whether this is Playwright's emulation or real (the owner's
phone sideways), and ask the Planner whether sideways is in GPH1's scope before building.
