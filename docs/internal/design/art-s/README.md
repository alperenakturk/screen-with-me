# ART-S: scene art against the UI (Design, 11 Nov 2026)

This answers five findings from B2's full sweep (0.9.97.121). Everything was reproduced locally with `shots.cjs`: the scene themes on home, join and room at 1366, 1920 and tablet, the Sea Battle lobby, and Window Garden.

## Why it happened, and the rule going forward
My NP3 notes (`../mascot-3.md`) put the scene landmarks in "the right 45 % or the bottom 25 %". On the home page the right half holds the hero art: the devices, the faces row and the "this part!" bubble. So that rule moved the clash rather than removing it.

The rule that works on every screen:
- **Big landmarks only in the bottom quarter** (scene y ≥ 675 of 900), where the room's panels end and the home's feature row sits.
- **The sky band above the content** (scene y ≤ 110; the home title starts at about 105, the join card at about 143, the hero art at about 234 at 1366) takes only light and small things: a beam, a moon or a lamp kept clear of the art.
- **Nothing tall and discrete near the left or right edge.** In the room the scene shows only in the narrow gutters beside the panels, so a reel or a moon there pokes out as a stray sliver. A continuous edge (a wall, a column) is fine.

## The fixes
### Picture Palace (`sinema`) and Moonlit Nights (`lokum`): `theme-art.patch` for `scripts/theme-art.mjs`
Lane A applies it with `git apply docs/internal/design/art-s/theme-art.patch`, then runs `node scripts/theme-art.mjs`. The result is the two files in `scenes/`.

| Finding | Fix |
|---|---|
| 1. The Picture Palace reel and the Moonlit Nights column and lantern collide with the hero's phone mockup and the "this part!" bubble | **Picture Palace:**<br>• The reel leaves the right wall and sits on the floor at the bottom right (centre 1532, 842, r 54), right of the feature cards, with a short ribbon into the aisle.<br>• The fan sconces move down to y 600–690.<br><br>**Moonlit Nights:**<br>• The mirrored group moves 130 to the right: the column is now the screen's right edge (x 1550–1608) and the tile panel is off-canvas.<br>• The kandil hangs short (bottom at y ~190).<br>• The cypress is gone. |
| 2. In the room, scene pieces poke out between panels (the reel's gold arc; the moon and the column top) | • The reel is now below every panel (y 788–896) and shows whole in the bottom strip.<br>• The moon moves to (1310, 175, r 42), behind the side panel at every desktop size.<br>• The column is a continuous edge in the right gutter. |
| 3. The projector beam runs through the semi-transparent join card | • The booth window is gone (it also sat behind the home title).<br>• The beam enters from the left along the ceiling, from (−60, 78) to (1600, 40), half-width 72, in the band above all content.<br>• The gold stage lines move up to y 116–128, right of the text column. |
| 4. Cinema-seat heads read as broken avatar circles | • `head()` draws head, neck and shoulders as one silhouette.<br>• Only a short highlight sits on the upper left of the head (a full ring read as an avatar slot, a full arc as headphones).<br>• Some heads wear a bun or a cap so they read as people (`kind` 1 and 2). |
| 4b. The Moonlit Nights moon is cut by the join card | The moon at (1310, 175) clears the card at 1366, 1920 and tablet landscape. On tablet portrait it is off-canvas. |

Images: `sinema-home-1366.jpg`, `lokum-home-1366.jpg`, `sinema-room-1366.jpg`, `lokum-room-1366.jpg`, `sinema-join-1366.jpg`, `lokum-join-1366.jpg`, `sinema-join-tab-p.jpg`, `lokum-home-tab-p.jpg` and `seat-heads-before-after.jpg`. Each is before (main) beside after (these scenes on the live code).

### 5a. The Sea lobby's ticket mascot is muddy brown in dark themes (Game Studio)
The Sea lobby's "Play Stub" label and Classics' bot label show `stub-small.svg` at 22 px. Its gradient's amber end and the thick dark outline turned brown at that size.

The small cut is redrawn in `../mascot-3/draw.mjs`:
- a flat, bright gold card (`#ffe09a` → `#ffc24f`);
- a thin `#8a4a14` outline;
- the perforation as three cream dots;
- big ink eyes.

**Game Studio:** copy `../mascot-3/svg/stub-small.svg` over `apps/web/src/games/art/stub/small.svg`. See `stub-small-before-after.png`, at 22 px in Night, Neon, Ocean and Matinee.

### 5b. The garden window is washed out in Matinee (Game Studio)
Three causes, all from ART-L's values:
- the wall was almost the panel's cream and the frame faint;
- the dusk sky was upside down (peach on top);
- the moon, cream at an opacity, had been caught by ART-L's "faint marks → ink" rule.

**Game Studio:** add `garden-matinee.css` to `apps/web/src/games/garden.css`. It replaces the existing `.wg-scene` and `.wg-scene-art` Matinee lines there. It is scoped to the garden scene and sets:
- a wainscot wall `#d6c6aa`;
- a dark wood frame `#7a6550`;
- the sky the right way round, blue `#5f7fb3` above and `#f0c08e` below;
- the moon's cut-out disc in the sky's colour at the moon (`#7388ae`);
- the moon kept cream.

ART-L's own table (`../games/art-l/tint.mjs` and `matinee-art.css`) is corrected to the same sky order. **Game Studio:** update the two `--als-*` lines in `how-to-play.css` to `--als-1a2150: #5f7fb3; --als-2a2257: #f0c08e;`. See `garden-matinee-before-after.png`.

## Files
- `theme-art.patch`: lane A's patch for `scripts/theme-art.mjs`. It applies cleanly on main at 7e2c059.
- `scenes/sinema.svg`, `scenes/lokum.svg`: what the patched script writes, for review.
- `garden-matinee.css`: Game Studio's garden block.
- `shots.cjs`: the reproduction, re-runnable with `PLAN=`, the theme list and an optional CSS file.
- The before/after images listed above.

## Follow-up: the reel is gone (11 Nov 2026, after 0.9.97.122)
Lane A noticed that in Picture Palace at 1366 the reel peeked out at the bottom right, behind the side panel and the send button. Since ART-S the room's panels reach almost to the bottom of the screen, so the floor strip the reel stood in is gone.

`reel-trim.patch` (for `scripts/theme-art.mjs` on main at 8e4a0363; it applies cleanly):
- **The film reel and its ribbon are removed.** There is no free strip left anywhere in the room for a discrete object, and the cinema still reads from the seats, the sconces and the projector's light.
- **The two fan sconces are a little smaller and move inward** (centre x 226 and its mirror at 1374, rays r 42). On a tablet the scene is cropped and the room's gutters show scene x < ~176 and > ~1424. The sconces sat there and showed as half fans at the screen edges; now they stay behind the panels.

Checked:
- room at 1366, 1920, tablet landscape and tablet portrait;
- home at 1366, 1920 and both tablets;
- join at 1366.

`scenes/sinema.svg` is the result. Before/after: `reel-trim-room-1366.jpg`, `reel-trim-room-tablet.jpg`.

Apply with `git apply docs/internal/design/art-s/reel-trim.patch && node scripts/theme-art.mjs`.
