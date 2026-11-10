# ART-L: the games' art in Matinee (Design, 10 Nov 2026)

Game Studio's first-look review found that in Matinee (the light theme) the 35 tutorial pictures (`apps/web/src/games/art/tutorial/`) and Window Garden's scene (`apps/web/src/games/art/garden/window-sill.svg`) are dark navy art. They read as dark blocks on the cream page.

**Approach: theme-tinted art, not a second set of files.**
- The art is inlined (`import x from '…svg?raw'`), so CSS custom properties from the page reach it.
- `tint.mjs` rewrites every "chrome" colour in these SVGs into `style="fill:var(--al-<hex>,<hex>)"` (the same for stroke and gradient stops). The attribute stays as well.
- Every theme except Matinee leaves the variables unset, so the art is **pixel-identical** to today. Checked: `after-dark-unchanged.jpg` against a render of the current files, no pixel differs.
- Matinee sets them in one small block, `matinee-art.css`, using the paper tones of `themes-2/matinee2`.

## What changes in Matinee, and what never does
| Role | Before (navy) | Matinee | Variable |
|---|---|---|---|
| Background frame (gradient stops) | `#22174f` → `#120d2c` | `#efe7da` → `#e2d7c4` | `--al-*` |
| Panels, cells, tracks | `#2a2350`, `#3a3458`, `#24212e`, `#16122c` … | light paper steps (`#f7f1e6`, `#ddd1bc`, `#e6dccb`, `#d6c8b0` …) | `--al-*` |
| Selected panel | `#3a2d78` | warm highlight `#f6e4bf` (the gold outline stays) | `--al-3a2d78` |
| Lavender lines | `#8f84d8`, `#3a2e57`, `#a79fc4` | warm greys `#a8997f`, `#b5a68d`, `#8a7c66` | `--al-*` |
| Text drawn on the art | cream `#fff3d6`, lavender `#cfc8ea`, gold `#ffc65a`, green `#3ee08f` | ink `#26201a`, muted `#564b3e`, deep amber `#7a4a00`, deep green `#16653c` (all ≥ 4.7:1 on every paper tone) | `--alt-*` |
| Faint UI marks (cream / lavender **with an opacity**: bars, ghost letters) | cream at 25–90 % | ink at the same opacity | `--alg-*` |
| Cream outlines (Last Heart's shield) | `#fff3d6` stroke | `#564b3e` | `--alk-*` |
| Window Garden: wall | `#120e27` | `#e4d9c6` | `--al-120e27` |
| Window Garden: the window's sky | night navy `#2a2257` → `#1a2150` | soft dusk `#9fb2cc` → `#e6c7a6` (the moon still shows) | `--als-*` |

**Never changes:**
- boards and pieces (chess and dama squares, the Four in a Row board, the Sea Battle water, the backgammon and poker felt);
- solid cream objects (popcorn, cards, dice, pieces);
- the mascot;
- the gold accents and glows;
- the plant colours;
- dark colours used as **strokes**: a drawing on a card, board edges. They stay dark, which reads well on paper.

## Files
| File | What |
|---|---|
| `svg/tutorial/*.svg` (35) | Drop-in replacements for `apps/web/src/games/art/tutorial/*.svg` |
| `svg/garden/window-sill.svg` | Drop-in for `apps/web/src/games/art/garden/window-sill.svg` |
| `matinee-art.css` | The Matinee block (29 variables). It goes into a stylesheet loaded wherever the art shows: e.g. `apps/web/src/games/how-to-play.css` and `garden.css`, or `room.css` once. |
| `tint.mjs` | Remakes the above from the product files. Re-run it after anyone edits the art (it reads `apps/web/src/games/art/`), so new navy colours get their variable. Colours not in its tables are left alone. |
| `render.cjs` | Renders all the pictures on a page colour, with or without the CSS (for checks) |
| `before-matinee.jpg` / `after-matinee.jpg` | All 36 pictures on Matinee's page colour, before and after |
| `after-dark-unchanged.jpg` | The tinted files in a dark theme, identical to today |

## For Game Studio
1. Copy `svg/tutorial/*` and `svg/garden/window-sill.svg` over the product files.
2. Add `matinee-art.css` to the games' stylesheet.
3. Check, in Matinee and in Night:
   - a tutorial card of each game (How to play);
   - Window Garden's main screen.
4. The art can carry the same `var()` approach for any later picture: draw the chrome in the navy colours listed in `tint.mjs`, run it, and Matinee follows.
5. Covers (`art/covers/`) were not in the review. They are pictures framed like posters and can stay dark; `tint.mjs` can take them too if wanted.
