# THEME2 ready set: Matinee, Graphite, Pine Woods

These are drop-in files for the three replacement themes in `../../themes-2.md`. Lane A copies them in if the owner picks Q1 A or B. Nothing here is product code. `node build.mjs` remakes every file.

| File | Goes to |
|---|---|
| `themes.css` | Paste the three `:root[data-theme='…']` blocks after the other theme blocks in `apps/web/src/styles.css`. The comment at its end holds the `themes.ts` lines (`THEMES`, `PLAIN_THEMES`) and the `i18n.ts` / `i18n-tr.ts` names. |
| `pine.svg` | `apps/web/public/themes/pine.svg` (via `scripts/theme-art.mjs`'s `files`, like the other scenes) |
| `glowbeam-matinee.svg`, `glowbeam-graphite.svg`, `glowbeam-pine.svg` | `apps/web/public/themes/<id>-maskot.svg`. Copy them to `docs/internal/design/themes/` too, so the loop in `theme-art.mjs` picks them up. |
| `preview.html` | A local look: the costumes on each theme's background, and Pine's scene with the hero-text zone marked. |

The ids are English (`matinee`, `graphite`, `pine`), as CLAUDE.md §3 asks for new names. The Turkish UI names are Matine, Grafit and Çam Ormanı.

## Contrast (WCAG 2.x)
Every pair below passes AA:

| Pair | Matinee | Graphite | Pine Woods |
|---|---|---|---|
| text on surface | 16.6 | 15.4 | 14.7 |
| muted on surface | 7.4 | 7.3 | 8.2 |
| muted on surface-2 | 6.1 | 6.5 | 6.9 |
| button text on accent | 5.9 | 11.7 | 10.0 |
| button text on accent-hover | 4.9 | 12.8 | 11.7 |
| accent (links) on surface | 5.7 | 11.0 | 9.1 |
| field border on surface | 4.0 | 3.8 | 4.5 |

Pine's surface is semi-transparent (0.88), like the other scene themes; its numbers are on the surface composited over `--bg`.

Matinee extras:
- danger 6.3:1, ok 5.1:1, warn 5.7:1;
- `color-scheme: light`.

## Notes
- **Pine's scene follows the new layout rule.**
  - Landmarks (pines, the sheet screen, the projector, the moon, the campfire) sit only in the right 45 % (x ≥ 880 of 1600) or the bottom 25 % (y ≥ 675 of 900).
  - The hero text column gets only sky, faint stars and a low tree line.
  - Run the audit at 1366 and 1920 after adding it: `SIZE=1920x1080 ONLY=home node ../audit.cjs`.
- **The costumes are today's Glowbeam (N1)**, with the same 240 canvas and placement as `docs/internal/design/themes/`. If the owner picks a new mascot (MASCOT2), these are redrawn on it.
  - Matinee: straw boater with a rust band, an "ADMIT" ticket, an afternoon window.
  - Graphite: a pencil tucked over the head, a drawn underline.
  - Pine Woods: a knitted bobble hat, a marshmallow on a stick, a little campfire.
- **Matinee is the only light theme.** After adding it, run the design sweep and fix any hard-coded white or dark spots: `home.css` (the gold hero), toasts and hint bubbles. The video letterbox stays black, and the games keep their own boards.
- **`--field-border` is a new token.** Use it for inputs, selects and a toggle's off state. For the existing themes it can be `color-mix(in srgb, var(--muted) 60%, var(--surface))`, which gives 3.2–4.1:1 (`../../themes-2.md`).
