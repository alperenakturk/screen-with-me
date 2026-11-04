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

## Owner's pick (3 Nov 2026) and the full set
The owner picked **1: A** and **2: A**. His note: "it should fit our style, but still look like the character, not
something unrelated." Review sheet, one section per picker tab with today's face beside each:
https://claude.ai/artifact/FsBkvfQUPZ6w2yscbX18cd (copy: `avatars-2/review.html`).

**The set:** `avatars-2/full/<id>.svg`, 33 files: the 31 parody ids plus `notebookgenius` and `sweetsleuth`, all
64 × 64 and self-contained.
- Ids are prefixed per avatar, so several can be inlined on one page.
- `avatars-2/full.mjs` makes them. It is a copy of `scripts/avatars.mjs` with these changes:
  - refined helpers: light on the face, a nose shade, irises with two highlights, a rim light on the shoulders, a
    shade under the chin, a thin inner ring;
  - one small motif per avatar (`MOTIF`);
  - the hand-drawn files in `avatars-2/A/` used as they are (hacker, wizardboy, scientist, sponge, strawhat,
    speedster and the two new ones).

**The near-copies, made our own but recognisable:**

| id | What changed |
|---|---|
| `sponge` | sailor cap instead of shirt and tie |
| `starfish` | striped shorts with a gold button instead of the flower print |
| `squid` | a purple striped jumper instead of the brown shirt |
| `pinecap` | a compass instead of the tree on the cap |
| `speedster` | our own drawing |

The others were already style hints and keep their silhouettes, hair, colours and props.

## For the Developer (card from the Planner)
1. Copy `docs/internal/design/avatars-2/full/*.svg` over `apps/web/public/avatars/` and
   `apps/extension/static/avatars/` (if that folder is still written).
2. In `scripts/avatars.mjs`, let the parody ids come from the design folder, the way `theme-art.mjs` copies the
   costumed Glowbeams. That way a later `node scripts/avatars.mjs` doesn't undo the redraw. The themed page (0) stays
   as it is.
3. In `packages/shared/src/protocol.ts`:
   - `DRAWN_AVATARS`: add `notebookgenius: '📓'` and `sweetsleuth: '🍰'`.
   - `AVATAR_PAGES`: add both ids to page 3 (Anime); move `hunter` from page 2 (Series) to page 4 (Game). The ids stay,
     so saved avatars keep working, and the "exactly one page" test holds.
4. In `i18n.ts`, add `avatar.notebookgenius` ("Notebook genius" / "Defterli dahi") and `avatar.sweetsleuth`
   ("Sweet-tooth sleuth" / "Tatlıcı dedektif").
5. Check:
   - the avatar picker's Parody tabs (8 / 14 / 9 / 2 faces);
   - the chat at 28 px, the faces strip, the Shorts seats at 52 / 80 px, the join card at 84 px;
   - the unit test for avatar pages;
   - the size budget (SVGs are static files, not in the JS budget).

## R20: a new sponge and a friendlier squid (owner, 4 Nov 2026)
The owner asked for two faces to change and kept the others: "change only the sponge, the others are okay" and, for the
squid, "change it too, it's very creepy now". `starfish` stays as it is. Pick page (round 2: the final sponge, then
the squid options with the recommended one marked): https://claude.ai/artifact/6GRmQNs9ntXHJr6cQ6bs9s (copy: `avatars-2/r20/preview.html`).

Files are in `avatars-2/r20/`. They are made by `r20/draw.py` with the same badge as `full.mjs`, and their ids are already
prefixed `sponge-` / `squid-`.

**Round 1** (three options each, not kept) was answered as:
- Sponge: C, the waving one, "with both hands in the air".
- Squid: none. They "went too far into cute"; the owner wants the character clearly recognisable, without being creepy.

**Round 2:**
- **Sponge (final): `r20/sponge.svg`.** It keeps the round 1 face: a wavy yellow body with pores, big blue eyes with
  lashes, two front teeth, freckled cheeks, a collar and short brown shorts (no tie). Both hands are up beside the head,
  cheering.
- **Squid (owner to pick): `r20/squid-D|E|F.svg`.** All three are faithful to the character: a long drooping head, a
  large hanging bulbous nose over a flat mouth, heavy half-closed lids, pale teal-green skin and a brown shirt.
  They avoid the creepy parts: no red eyes, small dark pupils with a highlight, and soft light backgrounds.
  - D: bored, both lids half down, on soft blue (recommended).
  - E: unimpressed, one lid lower and the eyes to the side, on sand.
  - F: D with his clarinet, on light lilac.

**After the owner's pick:** copy the chosen file to both `avatars-2/A/<id>.svg` and `avatars-2/full/<id>.svg`.
`full.mjs` takes a hand-drawn file from `A/` first, so the pick survives a re-run. Then Developer A runs
`node scripts/avatars.mjs`.
The ids and avatar pages are unchanged.
