// The short intro when someone enters a room (card 6f, the Design session's storyboard, owner: "the light beam comes
// out and bursts"; spec and reference: docs/internal/design/intro/README.md + preview.html, built 1:1). On the sound's
// beats (intro-sound.ts, variant F: 0 / 0.72 / 1.1–1.4 s): the Sidelit logo pops in with its light off, the light
// bursts out of the triangle's tip, the eyes open in it and blink, the logo slides left while Glowbeam springs out of
// the light, "Enjoy the show!" rises, and everything fades (2.7 s). Reduced motion: one still frame fading in and out.
// The site uses it in the room (also inside the extension's overlay, which is our site); a click closes it at once.

import { playIntroSound } from './intro-sound.ts';
import { createLogo, createMascot } from './logo.ts';

/** Total time (ms); the element removes itself at the end. */
export const INTRO_MS = 2700;

// Sizes follow the preview's 720 px stage (logo 120, Glowbeam 108 at left 150 / top 6, pair 260 × 120, slide 62 px,
// spring from −70 px), scaled to the logo size `--s` = min(26vmin, 140px) as before.
export const INTRO_CSS = `
.swm-intro { --s: min(26vmin, 140px); position: absolute; inset: 0; z-index: 10; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 16px; pointer-events: auto; cursor: pointer;
  background: radial-gradient(circle at center, rgb(43 30 110 / .9), rgb(8 8 14 / .95) 70%);
  animation: swm-intro-fade ${INTRO_MS}ms ease forwards;
  font-family: 'Sidelit Wordmark', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
.swm-intro-pair { position: relative; width: calc(var(--s) * 260 / 120); height: var(--s); }
.swm-intro-logo { position: absolute; left: calc(var(--s) * 70 / 120); top: 0; width: var(--s); height: var(--s);
  animation: swm-intro-pop .7s cubic-bezier(.2, 1.4, .4, 1) both, swm-intro-slide .3s ease 1.1s forwards; }
.swm-intro-logo svg, .swm-intro-glow svg { display: block; width: 100%; height: 100%; }
.swm-intro .logo-light { transform-box: view-box; transform-origin: 29px 32px;
  animation: swm-intro-on .38s cubic-bezier(.2, .9, .3, 1) .72s both; }
.swm-intro .logo-eyes { transform-box: fill-box; transform-origin: center;
  animation: swm-intro-eyes .2s ease .78s both, swm-intro-blink .28s ease .95s; }
.swm-intro-glow { position: absolute; left: calc(var(--s) * 150 / 120); top: calc(var(--s) * 6 / 120);
  width: calc(var(--s) * 108 / 120); height: calc(var(--s) * 108 / 120); opacity: 0;
  animation: swm-intro-out .34s cubic-bezier(.2, 1.5, .4, 1) 1.1s forwards; }
.swm-intro-glow svg { filter: drop-shadow(0 10px 24px rgb(255 198 90 / .35)); }
.swm-intro-text { color: #fff; font-size: clamp(18px, 3.4vw, 28px); font-weight: 800; opacity: 0;
  transform: translateY(12px); animation: swm-intro-text .5s ease 1.25s forwards; }
@keyframes swm-intro-fade { 0% { opacity: 0; } 6% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
@keyframes swm-intro-pop { from { transform: scale(.35) rotate(-8deg); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes swm-intro-slide { to { transform: translateX(calc(var(--s) * -62 / 120)); } }
@keyframes swm-intro-on { from { transform: scaleX(0); opacity: 0; } 60% { opacity: 1; } to { transform: scaleX(1); opacity: 1; } }
@keyframes swm-intro-eyes { from { opacity: 0; } to { opacity: 1; } }
@keyframes swm-intro-blink { 50% { transform: scaleY(.12); } }
@keyframes swm-intro-out { from { opacity: 0; transform: translateX(calc(var(--s) * -70 / 120)) scale(.35); } to { opacity: 1; transform: none; } }
@keyframes swm-intro-text { to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .swm-intro-logo, .swm-intro .logo-light, .swm-intro .logo-eyes, .swm-intro-glow, .swm-intro-text { animation: none !important; opacity: 1 !important; }
  .swm-intro-logo { transform: translateX(calc(var(--s) * -62 / 120)) !important; }
  .swm-intro-glow, .swm-intro-text, .swm-intro .logo-light { transform: none !important; }
}
`;

/**
 * Builds the intro element. The caller appends `.swm-intro` to a positioned box (and makes sure INTRO_CSS is loaded in
 * that document / shadow root). `sound: false` starts it silent.
 */
export function createIntro(doc: Document, text: string, sound = true): HTMLElement {
  const root = doc.createElement('div');
  root.className = 'swm-intro';
  root.setAttribute('role', 'status');
  const pair = doc.createElement('div');
  pair.className = 'swm-intro-pair';
  const logo = doc.createElement('div');
  logo.className = 'swm-intro-logo';
  logo.append(createLogo(doc));
  const glow = doc.createElement('div');
  glow.className = 'swm-intro-glow';
  // Glowbeam springs out happy; the reduced-motion still shows its default pose (storyboard).
  const still = doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  glow.append(createMascot(doc, { mood: still ? 'default' : 'happy' }));
  pair.append(logo, glow);
  const caption = doc.createElement('div');
  caption.className = 'swm-intro-text';
  caption.textContent = text;
  root.append(pair, caption);
  if (sound) playIntroSound();
  const remove = () => root.remove();
  root.addEventListener('click', remove);
  root.addEventListener('animationend', (event) => {
    if (event.target === root) remove();
  });
  // A background tab may never fire the animation event; don't let it stay.
  setTimeout(remove, INTRO_MS + 500);
  return root;
}
