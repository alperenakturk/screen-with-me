# MASCOT3: Stub, the final set (Design, 10 Nov 2026)

The owner picked **C, Stub**: a cinema ticket that came along (MASCOT2, `mascot-2.md`). The D1 logo does not change. Stub keeps the logo's trait: two dark ink eyes (`#140d33`) with a top-left glint, on the D1 light (cream → gold → amber).

Review page: `mascot-3/index.html` (open it locally). `mascot-3/draw.mjs` remakes everything.

## The set (`mascot-3/svg/`, all on the 64 × 64 grid of today's mascot)
| File | Use |
|---|---|
| `stub-default.svg` | default mood |
| `stub-happy.svg` | `happy` (home, feedback thanks) |
| `stub-watching.svg` | `watching` |
| `stub-waiting.svg` | `waiting` |
| `stub-wow.svg` | `wow` |
| `stub-sorry.svg` | new: a little sorry; the result card after a loss |
| `stub-small.svg` | the ≤ 32 px cut: the ticket fills the box, with a thick outline, the perforation and big eyes without glints. Readable at 16 px on dark and on light (see the page). Use it below ~40 px: bot labels, small badges. |
| `stub-referee.svg`, `-cheer.svg`, `-gasp.svg` | the games' referee (`games/referee.ts` moods plain / cheer / gasp): a striped referee cap; a whistle in plain and gasp. Quiz, Draw & Guess, Last Heart and Classics (`match.ts`'s `cl-ref-mascot`), and Sea Battle's cheers. Reads at 44 px. |
| `stub-opponent.svg` | the bot opponent's avatar (Classics `cl-bot-avatar`, Sea Battle): a face close-up with a red sweatband and a "game face". Made for a circle crop (viewBox zoomed on the face). |
| `stub-win.svg` | the result card after a win: cheering, with sparkles |
| `stub-sorry.svg` | the result card after a loss |
| `stub-home-pose.svg` | the home's big pose: happy, holding an **usher's torch**. The torch is the light's source in the 15c "light beam" art: an usher lighting the way. |
| `stub-home.svg` | the full home art (the 15c scene) with Stub and the beam re-anchored at the torch |

## Theme costumes (`mascot-3/costumes/<theme>.svg`)
- **Format:** the same 240 × 240 canvas as `docs/internal/design/themes/glowbeam-<theme>.svg`, with Stub in `<g transform="translate(26 58) scale(2.6)">`. The home page lifts exactly that group, so `home.ts`'s costume code works unchanged.
- **Every costume holds the usher's torch in the right hand**, so the home beam has one fixed source in every theme. The left arm, the mood and the hat give each theme its character.

| Theme | Costume |
|---|---|
| Night (`gece`) | sleepy, nightcap with a pom-pom, crescent moon, popcorn bucket |
| Ocean (`okyanus`) | wow, see-through diving mask and snorkel, bubbles, waves |
| Sunset (`gunbatimi`) | happy, sunglasses pushed up on the top edge, beach umbrella, low sun |
| Neon (`neon`) | happy, headphones in the new Neon coral, a neon music-note sign (matches `neon.css`) |
| Moonlit Nights (`lokum`) | fez with a tassel, moon over the water, tulip |
| Arabian Nights (`binbirgece`) | happy, feathered cap, riding a flying carpet, an oil lamp, stars |
| Picture Palace (`sinema`) | watching, usher's cap, film reel, projector light |
| Drive-In (`acikhava`) | wow, see-through 3D glasses, popcorn box, road strip |
| Night Express (`tren`) | conductor's cap, signal lantern, rails |
| Matinee (`matinee`, light) | happy and waving, straw boater with a rust band, afternoon window. No glow (it would muddy the light paper); the dark outline `#9a4f16` carries the shape. |

Ocean Liner (`gemi`) is dropped (owner, option B), so it has no costume.

## Integration (lane A + Game Studio)
1. **`packages/shared/src/logo.ts`:**
   - Replace `mascotTree` with Stub, keeping `MascotOptions` (`mood`, `small`) and the moods. Add `sorry`.
   - The shapes are in `draw.mjs`: `stub()` (body, arms, legs, glow), `FACES` and `small()`.
   - The ids still come from `id`, as today.
   - Then run `make-icons.mjs` for the mascot SVGs.
2. **Theme mascots:**
   - Copy `mascot-3/costumes/<theme>.svg` over `docs/internal/design/themes/glowbeam-<theme>.svg` (or point `scripts/theme-art.mjs`'s loop at `mascot-3/costumes/`). Then run `node scripts/theme-art.mjs`.
   - Add `matinee` to the loop; drop `gemi`.
3. **Home light (`apps/web/src/home.ts`):**
   - `LAMP` moves to the torch lens: `{ x: GLOW.x + 0.908 * GLOW.size, y: GLOW.y + 0.561 * GLOW.size }` (today 0.597 / 0.605).
   - The no-costume fallback (`createMascot(... { mood: 'happy' })`) needs the torch too. Either add a `torch` option to `mascotTree` or use `stub-home-pose.svg`'s shapes.
4. **Games (Game Studio):** `apps/web/src/games/art/snack-bar/glowbeam.svg` is the one picture behind `resultGlowbeam()`, `referee()` and the bot icons in `match.ts` / `sea.ts` / `duel.ts`.
   - Replace it with `stub-default.svg`.
   - Then swap per use:
     - the referee by mood: `stub-referee*.svg`;
     - the bot avatar: `stub-opponent.svg`;
     - the bot labels: `stub-small.svg`;
     - the result card: `stub-win.svg` or `stub-sorry.svg` by outcome.
   - Snack Bar's `glowbeam-cashier.svg` needs a Stub cashier (Game Studio's art, or ask Design).
   - Texts that say "Glowbeam" ("2 players · or vs Glowbeam", "Glowbeam reacts" in the Test Lab) change with the mascot's name (below).
5. **Checks after:**
   - the home at 1366 and 1920 in every theme (the beam starts at the torch);
   - the empty room;
   - a referee line and a bot game at phone size;
   - the favicon is the D1 logo and stays.

## Scene redraws (NP3, lane A, `scripts/theme-art.mjs`)
The rule from `themes-2.md` point 3: landmarks only in the **right 45 %** (x ≥ 880 of 1600) or the **bottom 25 %** (y ≥ 675 of 900). The hero text column (left ~55 %, top 75 %) gets only sky, water, stars or soft light. Check with `SIZE=1920x1080 ONLY=home node docs/internal/design/themes-2/audit.cjs` and at 1366.

- **Moonlit Nights (`lokumScene`).** The left side holds the tile panel (`x -10…130`, full height), the marble column (`x 122…180`, `y 196…810`), the arch (`M176 230 Q320 60 560 -30`) and the kandil (`kandil(262, 190, …)`). Together they are what sat behind "Free · no account" and the slogan (3.5:1 at 1920).
  - Move the whole group to the right edge (mirror it: tile panel at `x 1470…1610`, column at `x 1420…1478`, the arch sweeping left to about `x 1040` at the top, the kandil at `x ~1338`).
  - Move the cypress pair and the brass lantern (now `x 1372…1590`) to sit in front of the panel, or drop the second cypress.
  - The moon (`1180, 280`) stays.
  - The left keeps the moonlit water, the far shore lights below `y 668` and the parapet.
- **Drive-In (`acikhavaScene`).** The machine room and the sign mast are on the left ("Makine dairesi ve tabela direği (sol)"): the lit tower with chevrons, 4.2:1 at 1920.
  - Move them to `x ≥ 1300`, next to the screen.
  - The bulb chain between masts runs across the middle: hang it only between masts on the right, or let it sag along `y ≥ 690`.
  - The cars stay along the bottom.
- **Night Express (`trenScene`).** The deco clock tower (`towerA`, drawn at `translate(13 80) scale(.9)`, so `x 0…250`, `y ~200…800`) put the clock face exactly behind "same moment." (2.2:1).
  - Move it to `translate(1090 80) scale(.9)`, left of the locomotive (`x 1346…1600`). Keep its signal post.
  - The headlight cone already runs low (`y 752…790`), which is fine.
  - The left keeps stars, the far city (bottom) and the viaduct.
- **Arabian Nights and Picture Palace** also had home failures (the dune and palm behind the Shorts card; the beams across the title). The hero scrim token from `themes-2.md` is enough there. A redraw is optional: keep the palm at `x ≥ 880`.

## Neon's new look (`mascot-3/neon.css`)
**Problem:** the stock magenta + cyan grid read as "AI-made".

**New look:** one warm neon sign on a dark brick wall:
- a coral-red tube (`#ff5a7a`) and an amber second light;
- faint brick courses instead of the grid;
- the sign's glow at the top right;
- no drifting aura.

**Contrast:** all AA. Text 16.5:1, muted 7.9 (7.4 on surface-2), button text 6.2 (7.5 on hover), links 6.3, field border 3.6.

**Matching pieces:** the costume uses the same coral, and the theme swatch becomes `['#0c0809', '#ff5a7a']`.

## Name ideas (for the owner, via the Planner)
| Name | Why | TR |
|---|---|---|
| **Stub (recommended)** | What he is: the part of the ticket you keep. Short, friendly, one syllable, easy in both languages. | Stub |
| Tiki | A soft, playful "ticket"; reads the same in Turkish | Tiki |
| Admit | From "ADMIT ONE" on old tickets; a bit formal | Admit |
| Matty | From "matinee"; warm, but less obvious | Matty |
