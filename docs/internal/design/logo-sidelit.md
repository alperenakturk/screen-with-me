# Sidelit logo and mascot

_Design session, 3 Nov 2026. Status: **owner picked** the main logo **D1 "Night gold"** and the mascot **N1
"Glowbeam"** (Turkish UI name "Işıkçık") on the round 2 page https://claude.ai/artifact/JvAkJKL7p44pWLe1JGvP9v.
The mid-tone colourway is **pending: T1 deep teal recommended**. The product name is not final (Sidelit is the lead
candidate, `name-ideas.md` "Round 3"); whether the Developer applies this now or after the name decision is the
owner's call._

History: direction C "Sidelit: light from the side" was picked on https://claude.ai/artifact/5dAZoG6shDuxN454YBm6ZZ.
Round 1 had 14 versions and 4 mascots built on today's purple (https://claude.ai/artifact/Ep81ucBirYmLvZioEAMURQ;
usage page https://claude.ai/artifact/HbAmcU9TCBnr9FujujLHBa). The owner asked for no purple / ScreenWithMe look, no
washed-out tones, deeper dark versions, mid-tones and fresh mascots → round 2.

## Concept
On a deep night square, a white play triangle casts a warm light to the right; two eyes sit in that light. The screen
is the triangle, the light is the moment you share, the eyes are the friend beside you. The mascot is that light
itself, alive, with the same eyes. **The eyes are the family trait** (owner: "the eyes stay in every case").

## Files (this folder: `sidelit/`)
| File | What | Use |
|---|---|---|
| `logo-d1.svg` | full drawing, 64×64 grid, rounded square (rx 16) | everything 33 px and up |
| `logo-d1-small.svg` | the simple cut | 32 px and below (favicon, toolbar, 16/24/32 icons) |
| `logo-d1-bleed.svg` | full drawing without the rounded corners | phone home-screen / PWA maskable icons, round social avatars (the platform masks it) |
| `mascot-n1.svg` | Glowbeam, full | 33 px and up |
| `mascot-n1-small.svg` | Glowbeam, simple cut (no glow, no glint, no mouth) | 24–32 px |
| `mascot-n1-expressions.svg` | default / happy / waiting / wow / watching | empty states, invites, notices |

The SVGs are the source of truth for the shapes below. Ids are prefixed `sl`; give every inline copy unique ids (the
site can show several logos on one page, as `logo.ts` already does with a counter).

## Logo D1: exact shapes (64×64 grid, drawing order)
Everything is clipped to `<rect width="64" height="64" rx="16"/>` (rx 0 for the bleed version).

**Full drawing (≥ 33 px)**
1. Background: rect 64×64, linear gradient (0,0)→(64,64): `#22174f` → `#08061a`.
2. Vignette: rect 64×64, radial gradient centre (34,28) r 54: black, opacity 0 at 50 % → 0.4 at 100 %.
3. Light cone: `M29 27 L64 8 L64 56 L29 37 Z`, linear gradient x 29→64: `#fff3d6` 100 % at 0, `#ffc65a` 92 % at 0.35,
   `#ff8f3a` 12 % at 1.
4. Bloom at the triangle tip: circle (31,32) r 13, radial `#fff3d6` 70 % → 0 %.
5. Play triangle: `M12 20 L31 32 L12 44 Z`, fill and stroke (width 4, `stroke-linejoin: round`) with a linear
   gradient x 12→32: `#ffffff` → `#fff0d0` (its tip is warmed by its own light).
6. Eyes: ellipses (44,32) and (53,32), rx 2.6, ry 3.6, `#140d33`. Glints: circles (43.1,30.6) and (52.1,30.6),
   r 0.75, white, opacity 0.9 (top-left: they look towards the screen).

**Simple cut (≤ 32 px)**: no vignette, no bloom, no glints.
- Cone `M31 25 L64 2 L64 62 L31 39 Z`, stops `#fff3d6` 100 % / `#ffc65a` 95 % at 0.45 / `#ff8f3a` 70 % (flatter, so
  the light still reads at 16 px).
- Triangle `M10 17 L32 32 L10 47 Z`, stroke width 5.
- Eyes (44,32) and (55,32), rx 3.6, ry 5.2.

## Mascot N1 Glowbeam: exact shapes
No box; it stands on any surface (dark is best).
- Glow: circle (40,32) r 23, radial `#ffc65a` 45 % → 0 % (full only).
- Body (a beam with a round head): `M5 32 L28 17.5 A17 17 0 1 1 28 46.5 Z`, fill and stroke (width 2, round join),
  linear gradient x 4→60: `#fff3d6` → `#ffc65a` at 0.45 → `#ff9440`.
- Eyes: ellipses (38,30) and (47,30), rx 2.8, ry 3.9, `#1a1036`; glints r 0.84 at (37.2,28.5) and (46.2,28.5).
- Mouth: `M39.5 38 Q42.5 40.4 45.5 38`, stroke `#1a1036` 1.6, round caps.
- Simple cut (≤ 32 px): body `M4 32 L27 15 A18.5 18.5 0 1 1 27 49 Z`, eyes (37,31) and (48,31) rx 3.6 ry 5.2, no
  glow, glints or mouth.

**Expressions** (`mascot-n1-expressions.svg`; only eyes and mouth change, the body never does):
| Name | Eyes | Mouth | Where |
|---|---|---|---|
| default | as above | small smile | logo pair, invite card |
| happy | upward arcs `M35.4 30.5 Q38 28 40.6 30.5` (and +9 x) | wide smile `M38.5 37.5 Q42.5 42 46.5 37.5` | someone joined, a game won |
| waiting | downward arcs `… Q38 32.6 …` | flat line `M40.5 38.5 L44.5 38.5` | empty room, loading, "waiting for everyone" |
| wow | as default | small "o": ellipse (42.5,39) rx 1.7 ry 2.1 | "3-2-1, together", a new video |
| watching | default eyes moved 1.2 left | small smile | "watching with you" states |

Motion (when used): a slow 2.4 s bob of 6 px; the glow may breathe between 35 % and 50 %. Never with
`prefers-reduced-motion`.

## Colours
| Token | Hex | Use |
|---|---|---|
| Night top | `#22174f` | background gradient start |
| Night bottom | `#08061a` | background gradient end; dark surfaces |
| Eye ink | `#140d33` (logo) / `#1a1036` (mascot) | eyes, mouth |
| Light cream | `#fff3d6` | bloom, light start, wordmark on dark |
| Light gold | `#ffc65a` | the main light colour; buttons on dark |
| Light amber | `#ff8f3a` (logo) / `#ff9440` (mascot) | light end |
| Triangle warm tip | `#fff0d0` | triangle gradient end |
| White | `#ffffff` | triangle |
| Mid-tone (pending) | T1 deep teal `#1a8088` → `#0b4750`, eyes `#05333a`, light `#fff6dc` / `#ffd27a` / `#ffad4a` | store tiles, social, promo (only if the owner confirms) |

Wordmark: "Sidelit" in **Bricolage Grotesque ExtraBold** (Google Fonts, SIL OFL, free to embed), tracking −1.5 %,
cream `#fff3d6` on dark, night `#08061a` on light. Lockup: icon height = 1.4 × cap height; gap = 25 % of the icon.

## Rules
- **Clear space:** at least ¼ of the icon's width on every side (16 units on the 64 grid).
- **Minimum sizes:** logo 16 px (simple cut up to 32 px, full drawing from 33 px); wordmark lockup ≥ 20 px tall;
  mascot ≥ 24 px (smaller → use the logo).
- **Light surfaces:** the logo keeps its night square; it is never redrawn light-on-white (the owner rejected
  washed-out / white tones). The mascot works on light surfaces as it is.
- **Don't:** flip the light to the left (it always falls to the right, the eyes are always in it); stretch or rotate;
  put the eyes outside the light; use the triangle and cone without the square on busy photos; use the full drawing
  at 32 px or below; recolour the light per theme (gold everywhere; the moonlight / coral / lilac variants were
  not chosen); bring back the old purple `#8f74ff → #5b3cf0`.

## Applying it (Developer card, when the owner says so)
- `packages/shared/src/logo.ts`: replace the purple face with D1 (shapes above) and keep its job (one source for site,
  extension overlay and `make-icons.mjs`). Add a `small` option for the simple cut; the animated `play` ↔ `pause`
  parts can stay (pause bars in the triangle's place, same gradient).
- `scripts/make-icons.mjs`: 16 / 32 / 48 px from the simple cut (48 may use the full drawing; check it), 128 + store
  from the full drawing, PWA `maskable` + apple-touch from the bleed version.
- The current mascot (purple face) appears in themes and the intro animation; replace it with N1 in the same card or a
  follow-up (`scripts/theme-art.mjs`, intro).
- Store screenshots (`store/src`) and the Web Store tile follow once the name is final.
