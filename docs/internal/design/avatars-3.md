# Genre avatars: the "Genres / Türler" tab (owner, 4 Nov 2026)

_Design session. After Research's IP audit (`research/ip-audit.md`) the owner removed the parody avatars and asked for
our own genre archetypes in their place. Pick page (all 18 at real size, EN + TR names, multi-select, Turkish paste
text "Tür avatarları seçimim: …"): https://claude.ai/artifact/Gv2uDG8EWX8XE23ALk47gB (copy: `avatars-3/preview.html`)._

**Owner's pick (4 Nov 2026): all except merfolk (17).** Developer A wired them in with card R20 (0.9.97.30, #262).
`scripts/avatars.mjs` ships every file in `avatars-3/svg/`, so the merfolk drawing lives in `avatars-3/unused/`.

## Rules followed
- Each avatar is a genre type, never a character. No character's exact colours, outfit, signature prop or name.
  - The hero wears our own teal suit, orange cape and a gold Glowbeam-like spark in a diamond, not a letter, a shield
    star or a bat.
  - The alien is lilac with two eyes, not green with three.
  - The merfolk has dark hair and a teal-and-gold top.
  - The cowboy wears denim and a teal neckerchief.
  - The spy wears a navy turtleneck, not a black suit and tie.
  - The fairy has dark curls and a lavender dress.
- Skin tones run from light to deep, with a different tone on almost every face. Women, men, a child (the astronaut)
  and older people (the inventor, the cowboy, the chef) are mixed.
- No duplicates of the themed page: there is no wizard or knight here, because `wizard`, `sorceress`, `warrior`, `elf`
  and `dwarf` are already there.
- Same badge and helpers as `avatars-2/full.mjs`: a 64 × 64 circle, a radial background, light on the face, two
  highlights in each eye and a rim light on the shoulders. Ids are prefixed per file (`<id>-c`, `<id>-bg`, `<id>-sk`).

## The 18
| id | EN | TR | emoji for `DRAWN_AVATARS` |
|---|---|---|---|
| `detective` | Detective | Dedektif | 🕵️ |
| `pirate` | Pirate | Korsan | 🏴‍☠️ |
| `astronaut` | Astronaut | Astronot | 🧑‍🚀 |
| `inventor` | Inventor | Mucit | 🔧 |
| `ninja` | Ninja | Ninja | 🥷 |
| `cowboy` | Cowboy | Kovboy | 🤠 |
| `vampire` | Vampire | Vampir | 🧛 |
| `robot` | Robot | Robot | 🤖 |
| `hero` | Hero | Kahraman | 🦸 |
| `mermaid` | Merfolk | Denizkızı | 🧜 |
| `explorer` | Explorer | Kaşif | 🧭 |
| `chef` | Chef | Şef | 🧑‍🍳 |
| `rocker` | Rocker | Rockçı | 🎸 |
| `ghost` | Ghost | Hayalet | 👻 |
| `alien` | Alien | Uzaylı | 👽 |
| `samurai` | Samurai | Samuray | ⚔️ |
| `fairy` | Fairy | Peri | 🧚 |
| `spy` | Spy | Casus | 🕶️ |

None of these ids clashes with a themed or removed parody id. A saved removed id therefore never turns into a different
picture: it falls back the way the removal card says.

## Files
- `avatars-3/draw.mjs` is the generator. `node docs/internal/design/avatars-3/draw.mjs` writes `avatars-3/svg/<id>.svg`
  for the picked ones and `avatars-3/unused/<id>.svg` for `NOT_PICKED`; it exports `GENRES`, `NAMES` and `NOT_PICKED`.
- `avatars-3/svg/*.svg` are the 17 shipped drawings; `avatars-3/unused/mermaid.svg` is the one not picked.
- `avatars-3/preview.mjs` builds the pick page `preview.html`.

## For Developer A (done in #262)
1. Copy the picked `svg/<id>.svg` files the way `scripts/avatars.mjs` copies `avatars-2/full/`, or point it at this
   folder.
2. Add each id to `DRAWN_AVATARS`, using the emoji above.
3. Add a "Genres" page to `AVATAR_PAGES` and the tab `{ key: 'genre', pages: [n] }` in `AVATAR_TABS`, with i18n
   "Genres" / "Türler".
4. Add `avatar.<id>` names from the table.
5. Check the picker, the chat at 28 px, the faces strip, the Shorts seats at 52 / 80 px and the join card at 84 px.
   The drawings were checked at 28, 36, 52 and 96 px.
