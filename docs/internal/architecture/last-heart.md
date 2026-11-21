# Last Heart (life poker): how it works

Area file of `reference.md` (card LH4, 21 Nov 2026). Code name `poker`. Older facts about its layouts (PH2, LH2,
LH3, GPH1, GFIT1) are still in `reference.md` under those card names.

- **Files.** Rules: `packages/shared/src/games/poker.ts` (`PokerEngine`, pure; tests `poker.test.ts`). Table object:
  `apps/server/src/poker.ts` (Durable Object `Poker`, binding `POKERS`, `/api/poker/:id/ws`). Page:
  `apps/web/src/games/poker.ts` + `poker.css` (its chunk); the base `.pk` rules are still in `room.css`. e2e:
  `scripts/e2e/poker.mjs`.
- **Rules.** Hold'em for 2–6, life as chips (100 each), blinds 2 / 4 up every 5 hands, special moves once per game
  (`MOVE_COST`: disqualify 10, free fold 0, shield 5, peek 5), optional jokers. A move never puts its user out.
- **The hand's result** (`HandResult`): `won` = what each winner took from the middle (their own share included),
  `shielded`, and since LH4 `net` = the change in life over the hand (won + shield − put in; moves not counted). The
  state sends `won` and `net` per player; the result line says "takes N from the middle", each shown seat "+4" / "−12".
  `net` is optional (old stored state, old servers): the page falls back to "+won".
- **The turn clock** (`endsAt`): `POKER_TURN_MS` 30 s, 4 s when the player is away, the showdown pause 5 s (2.5 s when
  nothing was shown). It restarts only when `pokerTurnKey` (hand, street, seat to act) changes: a special move out of
  turn keeps it (LH4; it used to give the player to act a fresh 30 s).
- **The page renders in place** (LH4): the table's parts (status strip, rival seats by id, the flask, five board
  places, the feed, my hand, actions, moves) are built once (`tableView`) and each is rebuilt only when what it shows
  changes (`patch` with a key). A rival's move no longer ends a drag of the raise slider; life bars (`setLife`) and the
  flask's liquid (`setFlask`, a `scaleY` eased in poker.css) are the same nodes and move to their new value. The lobby
  and "how to play" replace the table (it is built again after).
- **Feed.** The last 4 lines of the hand: each event once (keyed by hand, board size and event, so "Sam checked" on two
  streets shows twice), each new street with its cards ("Flop: 7♦ K♥ 5♥"), a time-out with what it did.
- **Card faces** scale with the card (`container-type: inline-size`; rank 40 cqw top-left, suit 48 cqw bottom-right).
  At the showdown the winners' best five glow gold (`.best`), a loser's get a quiet outline (`.kept`).
- **Texts.** Old ones in `i18n.ts` / `i18n-tr.ts` (`poker.*`); new ones in the chunk's own `TEXT` (`say()`).
- **Test Lab.** `poker.end` (local lab server: I win), `poker.compact` (five 🤖 friends, the hand starts),
  `poker.showdown` (LH4: my turns check / call by themselves until this hand's showdown), `poker.referee`.
