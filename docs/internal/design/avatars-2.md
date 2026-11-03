# Parody avatars, round 2 (card R14)

_Design session, 3 Nov 2026. Owner: redraw every parody avatar (AVATAR_PAGES 1–4) so it is more detailed, cuter and
nicer; add two anime parodies; move `hunter` from Series to Game. Option page (Turkish):
https://claude.ai/artifact/Akp2qt2WPXzxVENiAZ8Hha (copy: `avatars-2/options.html`). Samples: eight faces in each
direction, in `avatars-2/A/` and `avatars-2/B/` (64 × 64 round badges, unique ids per file), drawn by
`avatars-2/samples.py`. The full set follows the owner's pick._

## Questions on the page
1. **Style.**
   - **A, "today's line, more detail":** the same proportions with light on the face, irises with two highlights,
     brows, a nose and hair strands.
   - **B, "cute sticker" (recommended):** a big head, big shiny eyes, blush and a dark 1.5 px outline (`#2a1838`).
   B reads at 28 px in the chat (checked at 32 and 24 px). It is the "cuter" the owner asked for, and it moves the
   characters further from their originals.
2. **The near-copies** (yellow sponge, pink starfish, squid, blue hedgehog; also the tie-and-shirt kind of detail):
   - **A, "make them our own" (recommended):** keep the style hint and swap distinctive costume parts for ours, e.g.
     the sponge gets a sailor cap instead of a shirt and tie.
   - **B:** keep them as close as today.
   This is a store / copyright question, so it is the owner's.

## Rules for the full set (either direction)
- Hint at a style only: no names, logos, exact costumes, real actors' likeness or signature marks (e.g. no forehead
  scar on `wizardboy`). Labels stay generic.
- Each avatar keeps its own two-stop background (`[inner, outer]`, as today) plus one small motif from its world:
  - code digits (`hacker`);
  - stars (`wizardboy`);
  - a swirl (`scientist`);
  - bubbles (`sponge`).
  Motifs stay at the edge, never behind the face.
- At 24 px the face must still read: eyes ≥ 6 px tall in the 64 grid (B), no detail thinner than 0.8 px.
- Gradient ids are prefixed per avatar (`<id>bg`, `<id>sk`, …), so inline SVGs on one page never share an id. Today's
  badges all use `id="bg"`, which made every badge green when several were inlined in one HTML.

## New avatars (anime page)
| id | EN label | TR label | Emoji (`DRAWN_AVATARS`) | Hint |
|---|---|---|---|---|
| `notebookgenius` | Notebook genius | Defterli dahi | 📓 | neat brown hair with a side part, a beige school blazer with a dark red tie, calm half-closed eyes, a plain black notebook |
| `sweetsleuth` | Sweet-tooth sleuth | Tatlıcı dedektif | 🍰 | messy black hair, tired eyes with shadows, a plain white top, thumb at the lip, a slice of strawberry cake and sugar cubes |

`hunter` moves from page 2 (Series) to page 4 (Game) in `AVATAR_PAGES`. Its id is unchanged, so saved avatars keep
working, and the test "every drawn avatar is on exactly one page" still holds.

## For the developer (after the pick)
- Port the picked direction into `scripts/avatars.mjs` (the samples' helpers: `bhead`, `beyes`, `bbody`, `bblush`,
  `bmouth` for B; `aface`, `aeyes`, … for A), with a unique id prefix per avatar.
- Add the two ids to `DRAWN_AVATARS`, `AVATAR_PAGES[3]` and the i18n `avatar.<id>` labels (EN + TR); move `hunter`.
- Regenerate with `node scripts/avatars.mjs`.
- Check the avatar picker, the chat at 28 px, the faces strip and the Shorts seats at 52 / 80 px.
- Themed avatars (page 0) are not part of R14. If B is picked, they can follow later for one family look.
