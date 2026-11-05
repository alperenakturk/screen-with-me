# Sea Battle

🎮 Game Studio, 5 Nov 2026. The owner's pick on the next-game question (Planner, 5 Nov): **C, Sea Battle**. "Hide your
fleet, call shots in turns, sink theirs first." Two players at one table, or one against Glowbeam.

Name: **Sea Battle** (TR **Amiral Battı**, the folk name every Turkish player knows; a question below). Never
"Battleship" (a toy company's trademark), no ship silhouettes, sounds or colours copied from any product.

## How a game goes

1. **Placing.** Each player sees their own sea and a fleet laid out at random. They can shuffle it, drag a ship to
   another place, or tap it to turn it. "Ready" locks the fleet. Nobody sees the other fleet, ever: the server holds
   both and sends each player only their own ships and the shots fired so far.
2. **Shooting.** Turns alternate. The player taps a cell on the enemy sea. The server answers for everyone: miss, hit,
   or sunk (a sunk ship is shown whole on the enemy sea). Watchers see both seas with the shots only, never the ships.
3. **The end.** The first fleet sunk loses. Then both fleets are shown to everyone. Rematch swaps who shoots first.

A dropped player keeps the seat and the fleet (the server has them); a reload comes back to the same game.

## Look (CL2 layout)

- The small free window, the board first: on a computer two seas side by side (mine smaller on the left, the enemy's
  big on the right); on a narrow window and a phone one sea at a time with a switch "My sea / Their sea", the turn
  flipping to the enemy's sea when it is my turn.
- One status line with Glowbeam the referee ("Your turn", "Glowbeam is aiming…", "Hit!"), the score, 👁 watchers,
  the bot chips: the same bar as the Classics boards.
- Marks: a miss is a small ring, a hit a gold burst, a sunk ship's cells a dark gold outline. Shapes as well as
  colours, so it reads without colour too. Sounds from the games family (splash for a miss, a low thud for a hit, a
  short fanfare when a ship sinks).
- A cover for the games hall in the Design session's style (night sea, a gold radar sweep, Glowbeam's light as the
  lighthouse).

## Glowbeam the bot

Easy: shoots at random, and once it hits it tries the cells around. Medium: hunts on a checkerboard pattern, then
follows a hit along the line until the ship sinks, and skips cells that cannot hold the smallest ship left. It waits
about 0.7 s a shot (`BOT_DELAY_MS`), like the Classics bot. It places its own fleet at random.

## Server and protocol

- A new room kind `sea` and its own Durable Object `Fleet` (binding `FLEETS`, migration `v12`, `/api/sea/:id/ws`), on
  the pattern of Poker (hidden hands): the state per seat is never broadcast whole. Each connection gets its own view.
- Messages: `place {ships}` (checked: sizes, inside the sea, the touching rule), `ready`, `shot {cell}` (only on my
  turn, only a cell not shot before), `bot {level}`, `sit`, `rematch`, `lab`.
- Pure rules in `packages/shared/src/games/sea.ts` (fleet check, random fleet, shot result, sunk, win), unit tests.
- Limits as the other game objects: one `hello` per connection, `RateLimiter(20, 8)`, an empty game deleted after 24 h.

## Test Lab

`sea.reveal` (show the other fleet in this tab, local lab server only), `sea.oneLeft` (a position where each side has one
ship left), `sea.bot` (fill the empty seat with Glowbeam), plus `games.open.sea` from the hall.

## Tests

Unit (`sea.test.ts`: fleet checks, random fleets always valid, shots, sinking, the win), e2e `sea.mjs` (two people and
against Glowbeam; a watcher and the other player never receive a ship they have not sunk; a shot out of turn or twice is
refused; reload mid-game), harness `scripts/harness/sea/run.cjs` (placing, shooting, phone switch, sounds, axe), the
`games-sweep` entry (computer + phone, EN + TR).

## Questions for the owner

1. **Sea and fleet**
   - **A (recommended):** 10 × 10, five ships: 5, 4, 3, 3, 2 cells. The classic, about 10 minutes against a person.
   - B: 8 × 8, five ships: 4, 3, 3, 2, 2. Quicker (5 minutes), fits a phone better.
   - C: 10 × 10, ten ships: one 4, two 3, three 2, four 1. The way many play it on paper in Turkey; longer.
2. **After a hit**
   - **A (recommended):** shoot again after every hit (a miss passes the turn). Faster, more exciting, good with a bot.
   - B: one shot a turn, hit or miss. Calmer, the classic rule.
   - C: a salvo: as many shots a turn as ships you still have.
3. **May ships touch?**
   - **A (recommended):** no, not even at a corner. Sunk ships then show which cells around them are empty.
   - B: yes, side by side is fine.
4. **Placing the fleet**
   - **A (recommended):** a random fleet to start, then shuffle, drag and turn as you like; "Ready" when done.
   - B: random only (shuffle until you like it). Fastest, simplest on a phone.
5. **The look**
   - **A (recommended):** night sea with a gold radar, Glowbeam as the lighthouse (our night-gold colours).
   - B: a squared notebook page with pencil marks, like the paper game.
   - C: a bright cartoon sea with waves and little boats.
6. **The Turkish name**
   - **A (recommended):** "Amiral Battı" (the name everyone knows).
   - B: "Deniz Savaşı" (a plain translation of Sea Battle).
