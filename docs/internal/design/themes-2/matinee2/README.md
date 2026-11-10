# MATINEE2: a calmer Matinee (Design, 10 Nov 2026)

The owner wrote on 10 Nov, on 0.9.97.113:
> "The Matinee theme is far too bright, it tires the eyes … the video's place comes in black: the jump is very harsh."

This folder is the fix: one stylesheet (`matinee2.css`), measured on the live code with `npm run dev`.

## What was wrong
- **Glare.**
  - The cards, the side panel, dialogs and the game cards were near-white `#fffaf1` (luminance 0.96) on a light page `#f4ede1` (0.85).
  - 28–59 % of every room screen was near-white (luminance > 0.85).
- **A black slab.** The video's place was `#000` with a 1 px light border, straight on light paper: the biggest possible jump. Two layers painted it:
  - `.player-wrap`;
  - `#player` itself (`room.css` `.player`).

## The fix
1. **Calmer paper** (token block in `matinee2.css`, replaces the one in `styles.css`):
   - page `#e8dfcf` (0.74);
   - surfaces `#f1eadd` (0.83), one gentle step above the page, not white;
   - `surface-2` `#e2d7c5`;
   - softer borders;
   - the bright "window light" in `--art` is gone, leaving one quiet gradient and the paper grain.
   - Ink and accents are a shade deeper so they stay AA on the darker paper: accent `#9a3517`, danger, ok, warn.
2. **A framed screen instead of a black slab** (rules for `room.css`; they replace card NP1's `.player-wrap > .empty` block). The eye now steps paper → mat → frame → screen:
   - **Mat:** the card the video sits in (`.theater`) becomes `--mat` `#ddd1bc`, one step darker than the paper, like a picture mat.
   - **Frame:** a 2 px dark warm line (`--bezel` `#4a3d30`), two faint rings that blend it into the mat, and a low soft shadow.
   - **Screen:** a deep warm umber (`--screen` `#231c16`) instead of `#000`, softly lit in the middle (`--screen-lit` `#43382c`) with a gentle inner vignette. `#player` gets `background: transparent` in Matinee so the tone shows.
   - **Playing:** the bars around a film are the screen tone, a warm near-black that reads as part of the frame. The film's own picture (and any black bars inside it) is untouched. The inset vignette paints below the video, never over it.
   - **Fullscreen:** keeps true black. Nothing light is around it there.
   - **Empty room:** the words keep their own dark palette, now matched to the umber.
3. **Games:**
   - A table in the video's place and a free window both use the theme's surfaces, so they get the calmer paper automatically.
   - A side game's free window floats over the framed screen and reads fine.

## Numbers (live page, Matinee)
| Screen (1366 × 768 unless phone) | Mean luminance before → after | Near-white area before → after |
|---|---|---|
| empty room | 0.47 → 0.40 | 28 % → 1 % |
| playing | 0.54 → 0.46 | 33 % → 1 % |
| Settings | 0.39 → 0.33 | 32 % → 1 % |
| games hall | 0.52 → 0.45 | 31 % → 1 % |
| a table in the video's place | 0.80 → 0.68 | 59 % → 2 % |
| phone, empty room | 0.49 → 0.42 | 49 % → 1 % |

**Contrast** (`THEMES=matinee CSS=themes-2/matinee2/matinee2.css node themes-2/audit.cjs`, real pixels behind every text): **0 failures** on home, room, Room rules, games hall and a Classics window. The worst spot is 5.3:1 (before: 4.95).

Token pairs on page / surface / surface-2 / mat:

| Token | page | surface | surface-2 | mat |
|---|---|---|---|---|
| text | 12.2 | 13.5 | 11.3 | 10.7 |
| muted | 6.4 | 7.1 | 6.0 | 5.6 |
| accent (links) | 5.5 | 6.1 | 5.1 | 4.8 |
| danger | ≥ 5.1 | | | |
| ok | ≥ 5.2 | | | |
| warn | ≥ 5.2 | | | |
| field border | ≥ 3.4 | | | |

- White on the accent button: 7.3 (6.1 on hover).
- Empty-room words on the screen: 14.5, muted 9.1.

## Files
- `matinee2.css`: the proposal. It has two parts: the token block for `styles.css`, and the room rules for `room.css`.
- `before-after-room-empty.jpg`, `-room-playing.jpg`, `-game-video-place.jpg`, `-settings.jpg` (1366), and `before-after-phone.jpg` (empty, playing, a game, Settings).
- `shots.cjs`: every room state in Matinee, with an optional override stylesheet:
  - home;
  - empty;
  - playing, with the side panel open and closed;
  - fullscreen;
  - the games hall;
  - a table in the video's place;
  - a side game's free window;
  - Settings and Invite;
  - four phone states.
- `../audit.cjs` gained `THEMES=` and `CSS=` so a proposal can be measured before it ships.

## For W (implementing)
- Move the token block over the `matinee` block in `styles.css`. The new tokens `--mat`, `--bezel`, `--screen` and `--screen-lit` are used only by the Matinee rules.
- Put the room rules in `room.css` in place of card NP1's block.
- Then run the design sweep at the five sizes in `en+matinee`, and the audit line above.
- Check by hand:
  - a YouTube film (its iframe sits on the screen tone);
  - the extension overlay. The room rules are scoped `:root[data-theme='matinee']:not(.shell-film)`, because without that they would outrank `html.shell-film .player-wrap { background: transparent }` and paint over the film page's hole. Keep that scope, and check the hole with the embed harness.
