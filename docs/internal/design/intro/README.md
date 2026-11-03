# Sidelit intro animation: storyboard (design source)

_Design session, 3 Nov 2026. Replaces today's intro (`packages/shared/src/intro.ts`: the purple face pops, blinks and
its play mouth turns into pause) with logo D1 + Glowbeam, on the same sound beats (`intro-sound.ts`, variant F:
0 / 0.72 / 1.1–1.4 s) and the same total time `INTRO_MS` 2700. Live prototype with replay and a reduced-motion switch:
https://claude.ai/artifact/6Ce98qjeANVeUota34uLec. Keyframes: `frame-*.svg` (480 × 270, the video's place) and `reduced-motion.svg`._

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
