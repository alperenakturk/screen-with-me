# Glowbeam in the themes (design sources)

_Design session, 3 Nov 2026. Replaces the old purple-face theme mascots (`scripts/theme-art.mjs` → 
`apps/web/public/themes/<theme>-maskot.svg`) with Glowbeam (mascot N1, `../logo-sidelit.md`) after the rename (card
6c). Preview with the intro: https://claude.ai/artifact/6Ce98qjeANVeUota34uLec._

Each file is 240 × 240, the same canvas as today's `<theme>-maskot.svg`, so CSS and `themes.ts` need no size change.
Glowbeam sits at `translate(26 58) scale(2.6)` on its 64 grid (head centre ≈ 130, 141; head radius ≈ 44); props are
drawn in the same 64 grid (hats over the head, glasses over the eyes) or in canvas space (moon, reel, lantern…).
**The eyes always show**: glasses and the diving mask are see-through, sunglasses are pushed up on the head.

| Theme id | Name (EN) | Pose | Props | File |
|---|---|---|---|---|
| `gece` | Night | waiting (sleepy) | nightcap with pom-pom, crescent moon, popcorn bucket | `glowbeam-gece.svg` |
| `okyanus` | Ocean | wow | see-through diving mask, snorkel, bubbles, waves | `glowbeam-okyanus.svg` |
| `gunbatimi` | Sunset | happy | sunglasses up on the head, low sun, striped umbrella, sand | `glowbeam-gunbatimi.svg` |
| `neon` | Neon | happy | headphones, neon pink outline (blurred stroke), notes | `glowbeam-neon.svg` |
| `lokum` | Moonlit Nights | default | fez with tassel, moon over the water, tulip | `glowbeam-lokum.svg` |
| `binbirgece` | Arabian Nights | happy | small cap with a feather, flying carpet, oil lamp, stars | `glowbeam-binbirgece.svg` |
| `sinema` | Cinema | watching | beret, projector beam, film reel | `glowbeam-sinema.svg` |
| `opera` | Opera Night | default | top hat with a rose, red curtains | `glowbeam-opera.svg` |
| `acikhava` | Drive-In | wow | see-through 3D glasses, popcorn box, a road strip | `glowbeam-acikhava.svg` |
| `gemi` | Ocean Liner | happy | captain's cap, life ring, waves | `glowbeam-gemi.svg` |
| `tren` | Night Express | default | conductor's cap, lantern, rails | `glowbeam-tren.svg` |

To apply: port each body into the matching `*Mascot()` function in `scripts/theme-art.mjs` (or copy the files to
`apps/web/public/themes/<id>-maskot.svg` and drop the old functions), regenerate, and check the home theme strip, the
theme dialog and the empty room at phone size. Scenes (`<theme>.svg`) stay as they are; the old purple accents in
them can be retuned later.
