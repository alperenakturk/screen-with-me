# MASCOT2: four new mascot directions (owner's feedback, 10 Nov 2026)

_Design session. Owner: "the mascot design is bad, let's change it." Review sheet: `mascot-2/index.html` (open it from
the repo and screenshot it). The drawings are made by `mascot-2/draw.mjs` and the sheet by `mascot-2/index.mjs`. No
product code changed._

## Why today's Glowbeam reads as weak
- It is the logo's light cone turned sideways, so it repeats the logo instead of adding a character.
- It has no limbs or posture: a pointed teardrop can't wave, sit or hold anything, so moods rest on two dots and a line.
- It is all gold with no outline, so its edge disappears on gold, sunset or light scenes.
- The left point reads as an arrow, a pin or a fish rather than a face.
- The face is small for the body, so at 32 px and below it is just a blob.
- Costumes have nothing to sit on: a hat on a cone looks pasted on.

## The four directions
Every direction keeps the D1 family trait: two dark ink eyes with a top-left glint, like the logo's. Each one has a
front pose, a happy pose, a Sinema costume (the usher cap), and its own ≤ 32 px cut checked at 64 / 32 / 24 / 16. Each
is shown on five backgrounds (Gece, Okyanus, Neon, Günbatımı and a light card) and in the home art in Glowbeam's
place. All are our own characters: no known character's silhouette, palette or prop.

| | Direction | What it is | Strengths | Risks |
|---|---|---|---|---|
| **A** | **Lumi, the night moth** (recommended) | A plush moth drawn to the screen's light. Night-indigo wings with a gold rim and a play mark each, and a cream-gold body with the face. | The strongest silhouette at 16 px (the wings). It tells "night + light" without repeating the logo. Antennae and wings give many poses, and costumes sit on the head. Reads on every background tested. | Some people dislike bugs, so it is kept plush and round, with no legs drawn. |
| **B** | **Pip, the lamp sprout** | A round night-indigo creature with a glowing bud growing from its head, lighting its face from the side ("side-lit" as a picture). | The most character-like and huggable; the side light is literally the product name. Cream eye whites read well. | A dark body needs its light rim on dark themes (drawn). The bud must keep its leaves so it never reads as a lit fuse. |
| **C** | **Stub, the ticket** | A cinema ticket that came along: a notched card, a perforation and a play mark on its stub. | Says "cinema / watching together" at once, and is the simplest to animate (tilt, bounce). The 16 px cut still reads as a ticket. | A flatter personality. A rectangle mascot can feel like an icon rather than a friend. |
| **D** | **Glowbeam 2 (evolution)** | Today's Glowbeam grown into a character: an ink outline, a light-drop body, arms, a bigger face, and the beam as a soft tail. | The smallest change: same name, same colours, the theme costumes carry over. The outline fixes the gold-on-gold problem. | It reads as a water drop, a common mascot shape, and is the least distinctive. |

**Logo fit:** A, B and C use the logo's gold and night colours and its eye style, so D1 stays as it is. If A wins, an
optional later tweak is two tiny wing arcs behind the logo's eyes; it is not needed for launch.

**If one is picked (a card for lane A):**
- `packages/shared/src/logo.ts` `mascotTree` gets the picked shapes.
- `docs/internal/design/themes/` costumes are redrawn over the new head anchor (`head` in `draw.mjs`).
- The home art's `placeGlowbeam` keeps its place.
- The intro's spring-out animation keeps its beats.
