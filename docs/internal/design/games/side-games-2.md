# Side games 2: more depth for Snack Bar and Window Garden

🎮 Game Studio, 4 Nov 2026. Owner's ask: "make the plant game and the cinema (Snack Bar) game a bit more detailed,
looking at similar games; give me themed suggestions". This note collects the research and the proposals. The owner
picks on the option page https://claude.ai/artifact/59grFQzivbrh1HZ6NUthdK. **The owner's picks (4 Nov 2026): "Oyun seçimlerim: 1: A · 2: B · 3: A · 4: A · 5: A · 6: A · 7: A · 8: A · 9: A · 10: A · 11: B"** (all of it, with the end-of-film receipt for the golden moment and the film-ended seed whenever a long film ends in the room). Built in 0.9.97.31 except 5 (tip jar) and 8 (cutting gift), which need room messages and come next.

## Ground rules (kept from the owner's earlier picks)

- The game moves only in a room, while the film plays (0.9.97.28). No offline earnings, no streaks, no timers that
  nag, no notifications, no ads, no pay-to-win; nothing ever dies or is lost.
- The film comes first. A side game rewards a glance, not a session: no reflex tapping, no sound spikes, nothing that
  blinks for attention. Optional things are silent, slow and generous.
- Our world: cinema, popcorn, Glowbeam the mascot, the room's themes. Friends make it better, never worse (no "one
  person leaves and everyone loses", as Forest's "Plant Together" does).
- Every effect is shown before it is bought (a common complaint about AdVenture Capitalist upgrades).

## What keeps people coming back (research)

| Pull | Seen in | How it fits us |
| --- | --- | --- |
| A collection with surprise: a clear goal that never quite ends, rare finds | Neko Atsume's cat book, Cookie Clicker achievements | Garden album already; Snack Bar has none yet |
| Visible progress plus walls broken by multipliers and prestige | AdVenture Capitalist, Egg, Inc. (Pecorella, "The Math of Idle Games"; GDC "Quest for Progress") | Snack Bar's milestones and new cinema; prestige should change the rules, not only a number |
| Safety, abundance and softness: no risk, always something small to do | Project Horseshoe "Coziness in Games", Lost Garden "Cozy games", Kinder World ("plants never die") | Already our rule |
| Something to show others | Neko Atsume yards, Tsuki's room | Decorations; a counter / sill card like the recap's PNG |
| Short check-ins | Tsuki's Odyssey, Viridi | A glance during a quiet scene |
| Characters with small stories | Good Pizza, Great Pizza (80+ customers with their own lines) | Customers at the counter |

## What is too much beside a film

- Streaks and "come back tomorrow or lose it" (Chris Wilson on login streaks; Chalmers "Dark Patterns in the Design
  of Games"). Five Frames' streak resets kindly; no new streaks here.
- Expiring events, scarcity and play by appointment.
- Fast or timed tapping. Second-screen research (IBC, Cartoon Network's companion app) shows interactivity pulls the
  eyes off the main screen. A golden thing that drifts by must be slow, silent and missable at no cost.
- Hidden mechanics that need a spreadsheet (Animal Crossing's flower genes): a hybrid table must be small and shown.
- Shared failure, sound or motion spikes, notifications.

## Proposals (one question each on the option page)

### Snack Bar

1. **Customers with a line.** Small drawn guests (in our avatar style) walk up to the counter and say one short line
   ("Big tub, it's a long one!" when the film is ≥ 90 min). A tap serves the one in front for a little more than a
   plain tap. They leave by themselves; missing one costs nothing. From Good Pizza, Great Pizza.
2. **A golden moment.** A: a golden kernel drifts across the scene every 4–8 min for 10 s, a tap = ×7 income for
   30 s, no sound (Cookie Clicker's golden cookie, slowed down). B: at the film's end Glowbeam hands over a receipt
   (served, best stand, time watched) with a golden bucket of coins: a calm close to the evening, nothing to watch
   for during the film. Recommended: B (zero attention during the film).
3. **Every new cinema is a different place.** Prestige opens a drive-in (soda ×2, stars on the sky), a rooftop
   (night bonus), an art-house (candy rare and pricey): a new scene to draw and one rule twist each. From the idle
   design advice to change rules at prestige.
4. **Achievements.** Thirty or so small badges (first nachos, 10 films, 100 serves with a friend in voice…); each one
   gives +1 % income, a few silly ones give nothing. From Cookie Clicker's milk.
5. **Shared tip jar.** Everyone in the room who plays Snack Bar fills one jar with their serves; when it is full,
   everyone gets confetti and +10 % for the rest of the film. Nobody is punished for not playing. From Egg, Inc.
   co-op contracts. Needs a small room message (the room object counts the jar); the only proposal with server work.

### Both games

6. **Decorations.** Looks only: the marquee sign, cup colours, posters, a counter skin per room theme (Snack Bar,
   bought with coins); pots, a curtain, fairy lights on the sill (Garden, bought with "petals" from picked blooms). Some
   garden pieces bring a rare night visitor (a moth, a firefly) into the album, as Neko Atsume's goodies bring cats.

### Window Garden

7. **Hybrid colours.** Two neighbouring pots in bloom at the same time can drop a coloured seed (red + white → pink).
   A fixed table, shown in the album; colours count as new album entries. The 8 plants become about 20 finds. From
   Animal Crossing's hybrids, without hidden genes.
8. **A cutting for a friend.** A bloomed plant can give one cutting to someone in the room; it arrives as a seed in
   their tray with the giver's name. A kind act, no trading. From Kinder World. Needs a small room message.
9. **Glowbeam the grow lamp.** Once per film, put Glowbeam over one pot: +25 % growth until the film ends, and it
   sits in the scene glowing. One small choice per evening; puts the mascot in the game.
10. **Memories and weather.** Each album page remembers the film it bloomed during and who was in the room ("seen
    together" stamp); the sky outside the window follows the room's theme and the real time of day (dusk, night,
    rain on the glass), decoration only.
11. **The "film ended" seed** (STATUS idea 10, asked by the Planner): today it comes only when the garden window is
    open in a ≥ 20 min film's last 10 s, and skipping to the end earns it too. A: keep. B: whenever a ≥ 20 min film
    ends while I am in the room, game open or not (recommended: it matches "only in a room" and never asks to keep a
    window open). C: only when most of the film was really watched.

## Not proposed (and why)

- Managers that run stands (AdVenture Capitalist): our income is already passive; a manager would add nothing.
- Daily specials and calendars: soft, but still a reason to come back on a schedule.
- Plant moods and names: sweet, but the window is small; can come later with the album pages.
- Anything that earns while away, needs real money, or competes with friends (leaderboards).

## Sources

- The Math of Idle Games (Pecorella): https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i ·
  https://blog.kongregate.com/quest-for-progress-the-math-of-idle-games · GDC https://www.gdcvault.com/play/1023863
- Cozy games: https://lostgarden.com/2018/01/24/cozy-games/ ·
  https://www.gamedeveloper.com/design/designing-for-coziness
- Neko Atsume: https://medium.com/ideo-stories/neko-atsume-a-short-story-on-games-cats-addiction-206b74ca032a
- Animal Crossing hybrids: https://www.gamespot.com/amp-articles/animal-crossing-new-horizons-hybrid-flowers-guide-/1100-6475346/
- Good Pizza, Great Pizza: https://www.gamedeveloper.com/design/good-pizza-great-pizza-would-not-exist-if-not-for-costco
- Cookie Clicker: https://www.wikiwand.com/en/articles/Cookie_Clicker · Egg, Inc. contracts:
  https://egg-inc.fandom.com/wiki/Contracts?oldid=9822
- Kinder World: https://apps.apple.com/us/app/-/id1541796687 · Viridi: https://en.wikipedia.org/wiki/Viridi ·
  Forest: https://forestapp.cc
- Dark patterns: https://research.chalmers.se/publication/177148 ·
  https://deceptive.design/articles/level-up-or-game-over-exploring-how-dark-patterns-shape-mobile-games
- Second screen attention: https://ibc.org/more-is-more-investigating-attention-distribution-between-the-television-and-second-screen-applications-/1028.article

The research leans on wikis, store pages and reviews more than developer post-mortems; nothing was found about idle
games played next to a film specifically, so the attention rules come from TV second-screen studies.
