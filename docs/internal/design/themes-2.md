# THEME2: theme readability audit and replacements (Design, 10 Nov 2026)

This audit answers the owner's feedback (10 Nov):
- "In most themes except the main colour ones our texts can't be read… looks AI-made… delete themes that don't fit and add alternatives."
- "General colour / font mismatches."

Fonts are covered separately in `fonts.md` (FONT1). Lane A implements whatever is picked here.

## How it was measured
- Script: `themes-2/audit.cjs`, run against `npm run dev`. It opens every theme in English at 1366 × 768, plus home at 1920 × 1080, on five screens:
  - home;
  - the empty room;
  - the Room rules dialog;
  - the games hall;
  - a game window (Classics).
- For every visible text (5 screens × ~60 texts × 10 themes) it records the colour, the size and the kind (body / muted / button / link).
  - Text behind an open modal is skipped: it is dimmed on purpose.
  - Text covered by a window is skipped too.
- Then it hides all text, takes a second screenshot and samples the real pixels behind each text box, scene pictures included.
- **p10** is the contrast at the worst 10 % spot behind the text. AA is **4.5** (3 for large text).
- Contact sheets:
  - `themes-2/sheet-home.jpg`, `sheet-room.jpg`, `sheet-dialog.jpg`, `sheet-games.jpg` and `sheet-game.jpg` (10 themes each);
  - `themes-2/home-1920-scenes.jpg` (the four worst scene homes at 1920).
- Token contrasts below are the plain token pairs. Semi-transparent surfaces are composited on `--bg`.

## Findings in one paragraph
**Inside the room, every theme passes AA.** Body text is 11–17:1, muted 6.7–9:1, and buttons and links are ≥ 4.7:1 on every screen at 1366, including dialogs, the games hall and the game window. The problems are elsewhere:

1. **The home page of the scene themes.** Landmarks of the picture sit right behind the hero text:
   - Ocean Liner: a light sky with clouds;
   - Night Express: a clock tower behind "same moment.";
   - Drive-In: a lit tower and string lights;
   - Moonlit Nights: a lamp and a column;
   - Arabian Nights: dunes and a palm behind the save box and the Shorts card;
   - Picture Palace: projector beams across the title.

   This is the "can't read" the owner sees, and it gets worse on wider screens because the scene is `cover`-scaled from the bottom centre.
2. **Home and room disagree on colour.** The home hero hard-codes the brand gold (`--hm-gold`, `.hm-btn.primary` gold gradient) in every theme, while the room uses the theme's `--accent`. In Night the home button is gold and the room's Invite is purple; in Ocean it is gold vs cyan; in Neon gold vs pink. The "this part!" pill in the hero art is purple in all themes. That is the "colour mismatch".
3. **"Looks AI-made".**
   - Six of ten themes are the same dark navy-purple with a warm accent: Night, Moonlit Nights, Arabian Nights, Picture Palace, Drive-In, Night Express. Only the picture differs.
   - The plain themes all use the same recipe: blurred colour glows in the corners plus star dust plus a drifting "aura". Neon's magenta-cyan grid is the most stock-looking.
   - Every home has the same orange glow and the same sunset-gradient screens.
   - The palettes don't read as chosen, they read as generated.
4. **Field and card borders are faint everywhere.** `--border` on `--surface` is 1.36–1.68:1 in eight themes (Ocean Liner 2.5, Moonlit 2.05). Inputs need 3:1 (WCAG 1.4.11): the search box and chat box edges nearly vanish.

## Per theme

Token contrasts are measured on the solid / composited surface. "Worst on screen" is the lowest p10 at 1366, and also at 1920 where it differs.

| Theme | body / surface | muted / surface | muted / surface-2 | button text / button | link (accent) / surface | border / surface | Worst on screen | Verdict |
|---|---|---|---|---|---|---|---|---|
| Night (gece) | 14.9 | 6.7 | 5.9 | 5.4 (`--accent-btn`) | 4.7 | 1.36 | 4.66 link "2 players · or vs Glowbeam" (game window) | **Keep.** Tokens: field border; home colours from the theme |
| Ocean (okyanus) | 14.3 | 7.0 | 5.9 | 8.1 | 7.8 | 1.48 | 4.90 "How it works" (home) | **Keep.** Tokens only |
| Sunset (gunbatimi) | 15.4 | 7.1 | 6.5 | 7.0 | 6.8 | 1.36 | **1.62 "How it works"** on the bottom sun glow (home, 1366 and 1920) | **Keep, fix with tokens:** move the sun glow (`--art` 50 % 104 %) off the link, or give `.hm-how` link the card backdrop |
| Neon (neon) | 16.9 | 7.0 | 6.5 | 5.7 | 6.0 | 1.40 | 4.72 "Add to queue" | Readable. **Drop or redo** for the "AI look": the magenta + cyan grid is the most generic palette in the set |
| Moonlit Nights (lokum) | 15.6 | 9.0 | 7.8 | 8.6 | 8.4 | 2.05 | **3.54 "Free · no account" / 3.57 "How it works" / 4.17 body** at 1920 (lamp, column, tile strip) | **Keep, fix:** hero scrim (below) + keep the lamp and column out of the left 45 % |
| Arabian Nights (binbirgece) | 15.9 | 8.4 | 7.5 | 10.1 | 10.9 | 1.65 | **2.05 Shorts card text, 4.24 save line** (dune and palm) at 1366 | **Keep, fix:** hero scrim + Shorts card on `--surface` |
| Picture Palace (sinema) | 16.5 | 7.7 | 7.0 | 9.9 | 10.5 | 1.55 | 5.20, passes; beams cross the title (busy, not failing) | **Keep, fix:** hero scrim |
| Drive-In (acikhava) | 16.3 | 7.8 | 7.1 | 7.9 | 8.1 | 1.67 | **4.20 Shorts card** at 1920 (lit tower behind the text) | Fixable (move the tower to the right third). **Drop recommended:** same night-city mood as Picture Palace and Night Express |
| Ocean Liner (gemi) | 14.9 | 9.1 | 7.9 | 6.2 | 5.5 | 2.51 | **1.11–1.6** slogan, body, "Join with a code", Shorts card; 1.24 "same moment." (light sky, clouds) at both sizes | **Drop.** A light picture under white text; the text-shadow patch already in `styles.css` doesn't save it. A fix means redrawing the scene dark |
| Night Express (tren) | 16.6 | 7.8 | 7.1 | 9.7 | 10.6 | 1.68 | **2.19 "same moment."** at 1920 (the clock face behind it); busy at 1366 | Fixable (tower to the right third + scrim). **Drop recommended:** the third night-city theme |

## What would make the set better
1. **Fewer themes that differ more.** Keep 7–8 that each look clearly different in value and hue, instead of ten shades of dark navy. Add the first **light** theme: people watch in daylight too, and today there is none.
2. **One colour story per theme, home included.**
   - The home slogan accent and the main button take `--accent` / `--accent-btn` / `--on-accent` from the theme, as the room already does.
   - The brand gold stays in the logo, and is the accent of Night (the brand theme) and Graphite.
   - The hero art's fixed purple pill uses `--accent`.
3. **A quiet zone for text on scene themes.** Add one token, `--hero-scrim`: a left-to-right gradient from `--bg` at ~80 % to transparent at ~55 % of the width, under `.hm-first`'s text column only.
   - On a phone it becomes a top-to-bottom gradient.
   - Scenes are redrawn (`scripts/theme-art.mjs`) so landmarks live in the **right 45 % and the bottom 25 %**, never behind the text column.
   - The audit must pass at 1366 and 1920: `SIZE=1920x1080 ONLY=home`.
4. **Visible field borders.** Add a new token `--field-border: color-mix(in srgb, var(--muted) 60%, var(--surface))` for inputs, selects and toggles' off state. It gives 3.2–4.1:1 in every dark theme. Card borders may stay soft.
5. **Less stock decoration on plain themes.** Drop the drifting `--aura` blobs and the corner glows from Night and Ocean, and keep one gentle gradient and the star dust. The glow is what reads as "AI".

## Replacement theme ideas (all AA everywhere)
Palette cards: `themes-2/palettes.svg` (built by `palettes.mjs`). Contrasts are computed like the table above.

| Idea | Kind | bg | surface | surface-2 | border | text | muted | accent | on-accent | Contrasts (body · muted · muted on s-2 · button · link · field border) |
|---|---|---|---|---|---|---|---|---|---|---|
| **Matinee** | the first light theme: warm paper, rust accent, no picture | `#f4ede1` | `#fffaf1` | `#efe5d4` | `#8a7a64` | `#1f1a14` | `#5c5244` | `#b03f1c` | `#ffffff` | 16.6 · 7.4 · 6.1 · 5.9 · 5.7 · 4.0 |
| **Pine** | scene: a pine forest at night with a sheet screen between trees, campfire glow at the bottom right; landmarks in the right 45 % only | `#0b1611` | `#12231b` | `#1a3025` | `#2f4d3e` | `#ecf3ec` | `#a2bcab` | `#f0b85a` | `#1f1504` | 14.5 · 8.1 · 6.9 · 10.0 · 9.1 · 3.8 (60 % mix) |
| **Graphite** | plain: neutral grey, brand gold accent, no glows, no stars; for people who want no decoration | `#111113` | `#1b1b1f` | `#25252a` | `#45454e` | `#f2f2f4` | `#a8a8b3` | `#ffc65a` | `#1d1405` | 15.4 · 7.3 · 6.5 · 11.7 · 11.0 · 3.5 (60 % mix) |

Notes for lane A:
- Matinee is the only light theme, so it needs a check of every hard-coded white or dark spot. Known ones:
  - `home.css` (12 hex colours: the hero art, the gold);
  - the video's black letterbox (stays black);
  - the toast and hint bubbles;
  - the game boards' own colours (games keep their art).
- The audit script then shows what is left.
- Matinee sets `color-scheme: light` and uses `--danger: #b3261e` (6.3:1 on surface) and `--ok: #1d7a4f` (5.1:1).
- Pine needs a new scene and a costume for the picked mascot. Graphite and Matinee need no art.
- Phones offer plain themes only today. Matinee and Graphite are plain, so phones gain both.

## Proposed set (recommended)
**Keep:**
- Night (brand; gold home, purple room, unified as in point 2);
- Ocean;
- Sunset (link fix);
- Moonlit Nights (scrim + redraw);
- Arabian Nights (scrim);
- Picture Palace (scrim).

**Drop:**
- Ocean Liner (unreadable);
- Drive-In and Night Express (third copies of the night-city mood);
- Neon (the stock look).

**Add:** Matinee, Graphite and Pine.

That makes 9 themes: 5 plain (one light) and 4 scenes, each a different colour family:
- blue-violet, teal, plum-orange, warm paper and grey (plain);
- indigo-gold, sand, cinema black-gold and forest green (scenes).

A saved `theme` value of a dropped theme falls back to Night: nothing a user saved breaks.

## Options for the owner (the Planner asks)
**Q1. The theme set:**
- **A (recommended):** drop Ocean Liner, Drive-In, Night Express and Neon; add Matinee (light), Graphite and Pine. 9 themes, each clearly different.
- **B:** drop only Ocean Liner, fix the others (scrim + redraws), and add Matinee. 10 themes, still mostly dark navy.
- **C:** fewer and calmer: keep Night, Ocean, Sunset and Picture Palace, and add Matinee and Graphite. 6 themes, no other scene work.

**Q2. The home page's colours:**
- **A (recommended):** the home follows the theme (button and slogan in the theme's accent); gold stays in the logo and Night.
- **B:** keep the gold home in every theme (one brand look on the front page); only the hero art's pill follows the theme.
