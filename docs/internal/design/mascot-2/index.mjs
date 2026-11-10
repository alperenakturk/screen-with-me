// Builds index.html: the MASCOT2 review sheet (static; the Planner screenshots it).
import { writeFileSync } from 'node:fs';
const M = [
  ['lumi', 'A · Lumi, the night moth', 'A plush moth drawn to the screen\'s light. Night-indigo wings with a gold rim and a play mark each; the cream-gold body carries the face.'],
  ['pip', 'B · Pip, the lamp sprout', 'A round night creature with a glowing bud growing from its head; the bud lights its face from the side ("side-lit", the name told as a picture).'],
  ['stub', 'C · Stub, the ticket', 'A cinema ticket that came along: notched card, perforation, a play mark on its stub. Says "cinema" without any brand.'],
  ['glow2', 'D · Glowbeam 2 (evolution)', 'Today\'s Glowbeam grown into a character: an ink outline, a light-drop body, arms, a bigger face, the beam as a soft tail behind it.'],
];
const BG = [['#120d2e', 'Gece (night)'], ['#0e3a4c', 'Okyanus'], ['#3a1030', 'Neon'], ['#ff9a6a', 'Günbatımı'], ['#fff6e0', 'light card']];
const img = (f, s, extra = '') => `<img src="svg/${f}" width="${s}" height="${s}" alt="" ${extra}>`;
const row = ([id, title, idea]) => `<section class="m"><h2>${title}</h2><p>${idea}</p>
<div class="poses"><figure>${img(`${id}-front.svg`, 140)}<figcaption>front</figcaption></figure><figure>${img(`${id}-happy.svg`, 140)}<figcaption>happy</figcaption></figure><figure>${img(`${id}-costume.svg`, 140)}<figcaption>Sinema costume</figcaption></figure><figure class="sizes">${img(`${id}-small.svg`, 64)}${img(`${id}-small.svg`, 32)}${img(`${id}-small.svg`, 24)}${img(`${id}-small.svg`, 16)}<figcaption>small cut 64 · 32 · 24 · 16</figcaption></figure><figure class="sizes">${img('logo-d1.svg', 40)}${img(`${id}-small.svg`, 40)}<figcaption>beside the D1 logo</figcaption></figure></div>
<div class="bgs">${BG.map(([c, n]) => `<figure style="background:${c}">${img(`${id}-front.svg`, 72)}${img(`${id}-small.svg`, 24)}<figcaption style="color:${c === '#fff6e0' || c === '#ff9a6a' ? '#1d1430' : '#e9e4ff'}">${n}</figcaption></figure>`).join('')}</div>
<div class="home">${img(`${id}-home.svg`, 560, 'style="width:560px;height:auto"')}</div></section>`;
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>MASCOT2 directions</title>
<style>body{margin:0;background:#0d0a22;color:#ece7ff;font:15px/1.45 'Segoe UI',Helvetica,Arial,sans-serif;padding:24px}
h1{font-size:26px;margin:0 0 6px}h2{font-size:20px;margin:0 0 4px;color:#ffc65a}p{margin:0 0 12px;color:#c9c0ea;max-width:900px}
.m{background:#18123a;border:1px solid #2e2660;border-radius:16px;padding:18px;margin:0 0 20px}
.poses,.bgs{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px}figure{margin:0;text-align:center}
figcaption{font-size:12px;color:#b9b0dc;margin-top:4px}.sizes{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;justify-content:center;max-width:220px}
.sizes figcaption{width:100%}.bgs figure{padding:10px 14px;border-radius:12px;display:flex;gap:10px;align-items:center;flex-direction:column}
.weak{background:#18123a;border:1px solid #2e2660;border-radius:16px;padding:18px;margin-bottom:20px;display:flex;gap:18px;align-items:center}.weak ul{margin:0;padding-left:18px}</style>
<h1>MASCOT2: four directions for Sidelit's mascot</h1><p>Each keeps the D1 family trait (two dark ink eyes with a top-left glint), works on dark and light themes and has its own ≤ 32 px cut. All are our own characters.</p>
<div class="weak">${img('glowbeam-today.svg', 110)}<div><b>Today's Glowbeam, why it reads as weak</b><ul>
<li>It is the logo's light cone turned sideways, so it repeats the logo instead of adding a character.</li>
<li>No limbs or posture: a pointed teardrop can't wave, sit or hold anything, so moods rest on two dots and a line.</li>
<li>It is all gold with no outline: on gold, sunset or light scenes its edge disappears.</li>
<li>The left point reads as an arrow, a pin or a fish rather than a face.</li>
<li>The face is small for the body, so at 32 px and below it is just a blob.</li>
<li>Costumes have nothing to sit on: a hat on a cone looks pasted on.</li></ul></div></div>
${M.map(row).join('\n')}</html>\n`;
writeFileSync(new URL('./index.html', import.meta.url), html);
console.log('✓ index.html');
