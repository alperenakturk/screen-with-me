# Five Frames Duel (card FFDUEL)

A table game in the games hall: two players race to the same five-letter word, each on their own board, in the
language the table picks (English or Turkish). It is the solo Five Frames turned into a race with a friend.

## Rules (Game Studio's calls)

- **The word:** the table's first game is the **day's word** (the same as the solo game; "Word of the day #N"). Every
  rematch is a **practice word**, picked at random by the server, never the day's word. Reason: the day's word should
  be shared once, and a rematch on the same word would be pointless.
- **Guesses:** the solo game's checks: five letters of the language, a word from the list, no repeat, seven tries.
  A refused word costs nothing.
- **Winning:** the **first to solve wins at once**; the other board stops. If one runs out of tries, the other plays
  on and wins by finding the word. If **both use all seven tries without the word, it is a draw**: both used the same
  number of tries, so "fewer guesses" can't decide it, and we keep it simple instead of inventing a score of marks.
- **Two winning guesses at the same moment:** the server handles one message at a time, so the one it gets first wins;
  the other player is told "too late, the game was already decided". Everyone sees the same winner.
- **Language:** either seated player picks EN / TR while waiting; a change asks both to press Ready again.
- **Seats:** the first two people sit; a reload or a dropped connection keeps the seat and the board (the browser id);
  someone else can take a seat only between games (a free seat, or one whose player left).

## Hidden information (the Sea Battle / Last Heart pattern)

The server (`apps/server/src/duel.ts`) holds the word and every guess. Until the game is over a player gets their own
words, and the other board only as marks (✓ right place, • in the word, × not in it); watchers get marks only. The word
and every word on both boards go to everyone once the game is over. The e2e (`scripts/e2e/duel.mjs`) checks every
message a player and a watcher got: none names the word or the other player's letters before the end.

## Look

The solo game's ticket look: my seven tickets on the left, the other player's marks in a small grid on the right (a
watcher sees both players' grids), the alphabetical letter tray under them while the game is on, Glowbeam and one
status line ("Find the word before Sam does!"). On a phone the other board becomes a strip under mine (one column per
guess, five squares down) so everything fits the screen. The result card (the one every table uses) shows the winner,
the word, and "Play again".

## Load

One message per guess (plus Ready / language), far under the per-connection limit (QUOTA1a, 20 a second).

## Ideas for later (owner's pick)

- A cover of its own in the games hall (it uses the solo Five Frames cover now).
- Glowbeam as a second player (a bot that guesses from the marks, easy / medium).
- A best-of-three match with a small scoreboard.
- A "hard mode" (marks you got must be used in the next guess).
