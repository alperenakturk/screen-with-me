# Sidelit intro animation: storyboard (design source)

_Design session, 3 Nov 2026. Replaces today's intro (`packages/shared/src/intro.ts`: the purple face pops, blinks and
its play mouth turns into pause) with logo D1 + Glowbeam, on the same sound beats (`intro-sound.ts`, variant F:
0 / 0.72 / 1.1–1.4 s) and the same total time `INTRO_MS` 2700. Live prototype with replay and a reduced-motion switch:
https://claude.ai/artifact/6Ce98qjeANVeUota34uLec. **`preview.html` is the reference the build must match 1:1** (owner, 3 Nov 2026: "the light beam coming out and bursting"). Keyframes: `frame-*.svg` (480 × 270, the video's place) and `reduced-motion.svg`._

## Beats
| Time | Sound (F, warm pad) | Picture |
|---|---|---|
| 0.00 s | first swell | Dark backdrop fades in (6 % of the run). Logo D1 pops in `scale(.35) rotate(-8deg) → 1`, 0.7 s, `cubic-bezier(.2,1.4,.4,1)`. **Light off**: only the night box and the white triangle. |
| 0.72 s | beat 2 | **The light switches on**: the cone grows from the triangle's tip, `scaleX(0 → 1)` with `transform-origin: 29px 32px` (view-box), 0.38 s, `cubic-bezier(.2,.9,.3,1)`; the bloom comes with it. The eyes fade in at 0.78 s and blink once at 0.95 s (`scaleY .12`, 0.28 s). |
| 1.10 s | beat 3 starts | The logo slides 62 px left (0.3 s). **Glowbeam slides out of the light** to its right: from `translateX(-70px) scale(.35)`, opacity 0, to its place, 0.34 s, `cubic-bezier(.2,1.5,.4,1)`, in the **happy** pose. |
| 1.25–1.40 s | beat 3 lands | The line rises: `translateY(12px) → 0`, opacity 0 → 1, 0.5 s. EN "Enjoy the show!" (`introText`; TR stays "İyi seyirler!"). |
| 1.4–2.16 s | tail | Hold. |
| 2.16–2.7 s | — | The whole intro fades out (the last 20 %), then removes itself (as today: click to close, `setTimeout` safety). |

Sizes: logo 120 px and Glowbeam 108 px at a 720 px wide stage; scale with `min(26vmin, 140px)` as today. Glowbeam gets
a soft gold drop shadow `0 10px 24px rgb(255 198 90 / .35)` instead of today's purple one. Backdrop:
`radial-gradient(circle at center, rgb(43 30 110 / .9), rgb(8 8 14 / .95) 70%)`.

## Structure for the code
The logo needs its light as its own group: `g.light` (cone + bloom) between the box and the triangle, and `g.eyes`
(the two eyes, glints optional at this size). `logo.ts` gets these parts as `LogoPart` values (`light`, `eyes`,
`play`) the same way it has `eyes` / `play` / `pause` today; the pause bars are no longer used by the intro.
Glowbeam is a second inline SVG (`mascot/glowbeam-happy.svg` in `../side-games/`), wrapped in `.swm-intro-glow`.

## Reduced motion
`prefers-reduced-motion: reduce`: no pop, no light sweep, no blink, no slide. One still frame (`reduced-motion.svg`:
logo with the light on, Glowbeam beside it in the default pose, the line) fades in and out with the same 2.7 s opacity
curve. The sound plays as today (reduced motion does not mute).

## The film page (extension overlay)
Same element (`createIntro`), inside the closed shadow DOM; nothing changes there except the drawing.

## The light burst, exactly (what the owner liked)
- The cone and its bloom are **one group** (`g.light`: the cone path `M29 27 L64 8 L64 56 L29 37 Z` with the cream → gold
  → amber gradient, plus the bloom circle at (31, 32) r 13, radial cream 70 % → 0). The group grows **from the
  triangle's tip** (`transform-box: view-box; transform-origin: 29px 32px`), `scaleX(0 → 1)`, 0.38 s from 0.72 s, easing
  `cubic-bezier(.2,.9,.3,1)`: very fast at the start, soft at the end, so it reads as a burst out of the triangle. Its
  opacity reaches 1 at 60 % of that time. Because the bloom sits inside the group, the glow at the tip flares with the
  cone (it starts squeezed and opens out).
- The eyes (`g.eyes`, `transform-box: fill-box`) fade in 0.2 s from 0.78 s (inside the fresh light) and blink once at
  0.95 s (`scaleY(.12)` at 50 %, 0.28 s).
- Glowbeam springs **out of the light**: from `translateX(-70px) scale(.35)`, opacity 0, to its place, 0.34 s from
  1.1 s, easing `cubic-bezier(.2,1.5,.4,1)` (overshoots a little and settles), with a gold drop shadow
  `drop-shadow(0 10px 24px rgb(255 198 90 / .35))`. At the same moment the logo slides 62 px left (0.3 s, ease).
- The logo's entry at 0 s overshoots too: `scale(.35) rotate(-8deg) → none`, 0.7 s, `cubic-bezier(.2,1.4,.4,1)`.
- Sizes in the preview (720 px wide stage): the pair box 260 × 120; logo 120 × 120 at left 70 (8 after the slide);
  Glowbeam 108 × 108 at left 150, top 6; the line 18–28 px Bricolage ExtraBold, 16 px under the pair.

## Exact CSS from `preview.html`
```css
.intro{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
 background:radial-gradient(circle at center,rgb(43 30 110 / .9),rgb(8 8 14 / .95) 70%);animation:fade 2.7s ease forwards}
.pair{position:relative;width:260px;height:120px}
.logo{position:absolute;left:70px;top:0;width:120px;height:120px;animation:pop .7s cubic-bezier(.2,1.4,.4,1) both,slideL .3s ease 1.1s forwards}
.logo svg,.glow svg{display:block;width:100%;height:100%}
.logo .light{transform-box:view-box;transform-origin:29px 32px;animation:on .38s cubic-bezier(.2,.9,.3,1) .72s both}
.logo .eyes{transform-box:fill-box;transform-origin:center;animation:eyesIn .2s ease .78s both,blink .28s ease .95s}
.glow{position:absolute;left:150px;top:6px;width:108px;height:108px;opacity:0;animation:out .34s cubic-bezier(.2,1.5,.4,1) 1.1s forwards}
.glow svg{filter:drop-shadow(0 10px 24px rgb(255 198 90 / .35))}
.txt{color:#fff;font:800 clamp(18px,3.4vw,28px) var(--display);opacity:0;transform:translateY(12px);animation:txt .5s ease 1.25s forwards}
@keyframes fade{0%{opacity:0}6%{opacity:1}80%{opacity:1}100%{opacity:0}}
@keyframes pop{from{transform:scale(.35) rotate(-8deg);opacity:0}to{transform:none;opacity:1}}
@keyframes slideL{to{transform:translateX(-62px)}}
@keyframes on{from{transform:scaleX(0);opacity:0}60%{opacity:1}to{transform:scaleX(1);opacity:1}}
@keyframes eyesIn{from{opacity:0}to{opacity:1}}
@keyframes blink{50%{transform:scaleY(.12)}}
@keyframes out{from{opacity:0;transform:translateX(-70px) scale(.35)}to{opacity:1;transform:none}}
@keyframes txt{to{opacity:1;transform:none}}
.reduced .logo,.reduced .logo .light,.reduced .logo .eyes,.reduced .glow,.reduced .txt{animation:none;opacity:1;transform:none}
.reduced .logo{transform:translateX(-62px)}
@media (prefers-reduced-motion: reduce){.logo,.logo .light,.logo .eyes,.glow,.txt{animation:none!important;opacity:1!important}.logo{transform:translateX(-62px)!important}.glow,.txt{transform:none!important}}
```
In the product, prefix the classes (`.swm-intro …`) as `intro.ts` does today; the timings and curves stay exactly these.
The SVG markup of the logo with its `light` and `eyes` groups is in `preview.html` (inside `<template id="tpl">`).
