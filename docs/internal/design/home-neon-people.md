# TH3: a Neon home that looks neon, four neutral people, other screens (Design, 15 Nov 2026)

Card TH3, from the owner's screenshots of the home page. Lane A builds parts 1 and 2 now, and part 3 once the owner
has picked.

Files in `home-neon-people/`:
- `neon-home.css`: the Neon rules, ready to move into `apps/web/src/home.css`.
- `screens.mjs`: the three screen ideas, each as the inside of the `#hm-pic` symbol.
- Images:
  - `neon-before.jpg` / `neon-after.jpg` (1366);
  - `neon-after-sizes.jpg` (1920 TR, phone 390 TR + EN);
  - `people-themes.jpg`: the 4 people in Night EN, Matinee TR, Picture Palace EN and Neon TR;
  - `screens-options.jpg`: today + the 3 ideas, Night.

## 1. Neon: lit tubes on a dark wall
Today the Neon home is the Night layout with a coral accent: nothing glows. The proposal (`neon-home.css`, 15 rules,
all under `html.in-home[data-theme='neon']`, so the room and the other themes don't change):

| Piece | Today | Neon |
|---|---|---|
| Wordmark "Sidelit" (header), slogan line "same moment." | coral text | tube letters: core `#ffd3dc` (14.8:1 on `--bg`) with a three-step coral `text-shadow` halo |
| "Free · no account · no ads" pill | filled tag | outlined tube: coral 1 px edge, outer + inner glow, core-coloured text |
| Create room | flat coral | the same fill and ink (6.2:1), plus a halo |
| Join with a code | plain border | coral tube edge, soft glow |
| Device frames | dark, faint edge | laptop and phone in coral tubes, the tablet in amber (the theme's two lights), `drop-shadow` pairs |
| Stub's light | gold cone | the same cone, coral (CSS sets the gradient stops' `stop-color`) |
| Sync pill, progress bars, chat bubble | flat | a small glow each; the sync pill gets a mint tube edge |
| Feature cards | white 9 % edge | coral edge at 45 % + a faint glow |

Calm by design:
- **Static.** There is no animation, flicker or buzz, so nothing for `prefers-reduced-motion` to switch off.
- **Text is never drawn in the glow colour.** Glowing text uses the pale core. The body text stays `--text` (17.5:1)
  and `--muted`.
- **Focus rings stay.** `:focus-visible` uses a 2 px core-coloured outline, offset 3 px, so it is clear against the
  glow.
- **Performance:** about 8 `drop-shadow` filters on small SVG shapes and box-shadows on 6 boxes, all on the home page
  only. No blur layers are added.

## 2. The people under the devices: four, neutral, the same in every theme
Today `artFaces()` picks 3 random avatars from page 0 of `AVATAR_PAGES`. That page holds `janissary`, `veiled`,
`samurai`, `horseman`: avatars tied to one culture. That is what the owner saw.

New rule:
- **4 faces in the order woman, man, woman, man**; the first two have the green voice ring.
- **They come from a fixed neutral pool**, picked again on every load as today:
  - women: `detective`, `rocker`, `astronaut`;
  - men: `driver` (3D-glasses film fan), `chef`, `explorer`, `spy`.
- All are existing avatars, so none needs drawing. They have mixed skin tones and outfits that aren't tied to a
  country, faith or history.
- The shot uses detective · driver · rocker · chef.
- **Never in this row:** `janissary`, `veiled`, `samurai`, `horseman`, `ninja`, `cowboy`, and the fantasy and monster
  ones (wizard, elf, vampire …), which read as costumes, not friends. The avatars stay in the picker as they are; this
  only limits the home art.

Layout in `scene()`:
- faces at x 16, 52, 88, 124 (one more 36-unit step);
- the text starts at x 148 instead of 112.

There is room up to the bubble, which starts at x 565 in the row's units. The longest line, Turkish, ends near x 330.

Texts (`TEXT.en` / `TEXT.tr` in `home.ts`):
- `artPeople`: EN "4 watching · 2 in voice", TR "4 kişi izliyor · 2'si seste".

The phone layout hides the texts already, and the faces row stays.

## 3. The device screens: ideas (owner's pick)
All screens are the same `#hm-pic` symbol in all three devices.
- **Today's sunset stays until the owner picks.**
- **Each idea has one small moving part on the progress bars' 6 s clock.** All three screens show it at the same spot
  at the same time: the art's "same moment" made visible.
- With `prefers-reduced-motion`, the moving part stays still in the middle.
- No images and no fonts: under 1 KB of SVG each.

See `screens-options.jpg`. Text for the Planner's question:

**Q. What should the three screens on the home page show?**
- **A (recommended): today's sunset + a hot-air balloon.**
  - Preview: the same orange sky, sun and purple hills; a small red-and-gold balloon drifts slowly across.
  - It is at the same point on the laptop, the tablet and the phone at every moment.
  - It keeps what the owner likes and shows the product's point.
- **B: a city at night.**
  - Preview: deep blue sky, a pale moon, a dark skyline with warm windows; three windows light up one after another,
    in step on all three screens.
  - It is the calmest, and pairs well with Neon and the night themes.
- **C: a lake at dawn.**
  - Preview: light blue-to-peach sky, teal mountains, still water with the sun's reflection; a white paper boat
    crosses.
  - It is the freshest, and the only light, cool picture, so it suits Matinee best.
- **D: keep today's sunset as it is**, with nothing moving.

## Notes for lane A
- **Neon:** copy `neon-home.css` into `home.css`.
  - Class names were checked on main (`.brand .wordmark`, `.hm-slogan b`, `.hm-pill`, `.hm-btn.primary` /
    `.secondary`, `.hm-feat > div`, `.hm-device`, `#hm-light`, `#hm-halo`, `.hm-pill-art`, `.hm-prog`, `.hm-bubble`).
  - The `.hm-device > rect:first-child` selectors rely on the frame being each device group's first `<rect>`; keep
    that order, or give the frames a `hm-frame` class.
- **People:**
  - Change `artFaces()` to the two pools above. It must return 4 ids, alternating woman / man.
  - Add a fourth `face(124, d, false)`, move the text to x 148, and update both `artPeople` strings.
  - `lab-friends.ts` also uses `AVATAR_PAGES[0]`; that's the room's fake friends and out of scope.
- **Screens (after the pick):** replace the symbol's inside with the picked entry from `screens.mjs`.
  - Animate `.hm-move` with the same 6 s `animation` as `.hm-prog` (a `translateX` from −60 to +60 units, linear).
  - For B, step `.hm-move-windows` rects' `opacity` with `steps()`.
  - Under `@media (prefers-reduced-motion: reduce)`, use `animation: none`.
- **Test Lab hook:** `home.art` should cycle the theme and freeze the art clock at 0.5, so `scripts/shots.cjs` takes the
  same frame every time.
- **Check:**
  - `scripts/shots.cjs` home at 4 sizes in every theme, EN + TR;
  - the contrast job (Neon: the core text, both buttons, the pill).
