// Odaya girince kısa açılış: logo belirir, gözler kırpılır, ağızdaki duraklat
// işareti "oynat"a döner, "İyi seyirler!" yazısı çıkar ve hepsi yavaşça kaybolur
// (~2,7 sn). Site ve eklenti katmanı aynı parçayı kullanır; eklentide kapalı
// shadow DOM'un içine, sitede sayfaya eklenir. Tıklayınca hemen kapanır.

import { createLogo } from './logo.ts';

/** Toplam süre (ms); sonunda öğe kendini kaldırır. */
export const INTRO_MS = 2700;

export const INTRO_CSS = `
.swm-intro { position: absolute; inset: 0; z-index: 10; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 18px; pointer-events: auto; cursor: pointer;
  background: radial-gradient(circle at center, rgb(43 30 110 / .78), rgb(8 8 14 / .86) 70%);
  backdrop-filter: blur(4px); animation: swm-intro-fade ${INTRO_MS}ms ease forwards;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
.swm-intro-logo { width: min(26vmin, 140px); height: min(26vmin, 140px); position: relative;
  animation: swm-intro-pop .7s cubic-bezier(.2, 1.4, .4, 1) both; }
.swm-intro-logo svg { display: block; width: 100%; height: 100%; filter: drop-shadow(0 12px 32px rgb(124 92 255 / .55)); }
.swm-intro-logo::after { content: ''; position: absolute; inset: -10%; border-radius: 30%;
  border: 3px solid rgb(164 141 255 / .8); opacity: 0; animation: swm-intro-ring .9s ease-out .95s; }
.swm-intro .logo-eyes, .swm-intro .logo-play, .swm-intro .logo-pause { transform-box: fill-box; transform-origin: center; }
.swm-intro .logo-eyes { animation: swm-intro-blink .32s ease .6s; }
.swm-intro .logo-pause { animation: swm-intro-out .3s ease .95s forwards; }
.swm-intro .logo-play { opacity: 0; transform: scale(.3); animation: swm-intro-in .45s cubic-bezier(.2, 1.6, .4, 1) 1.05s forwards; }
.swm-intro-text { color: #fff; font-size: clamp(20px, 4.2vmin, 34px); font-weight: 800; letter-spacing: .3px;
  text-shadow: 0 4px 18px rgb(0 0 0 / .5); opacity: 0; transform: translateY(14px);
  animation: swm-intro-text .6s ease 1.25s forwards; }
@keyframes swm-intro-fade { 0% { opacity: 0; } 8% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
@keyframes swm-intro-pop { from { transform: scale(.35) rotate(-8deg); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes swm-intro-blink { 50% { transform: scaleY(.12); } }
@keyframes swm-intro-out { to { opacity: 0; transform: scale(.4); } }
@keyframes swm-intro-in { to { opacity: 1; transform: none; } }
@keyframes swm-intro-ring { 0% { opacity: .9; transform: scale(.9); } 100% { opacity: 0; transform: scale(1.35); } }
@keyframes swm-intro-text { to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .swm-intro-logo, .swm-intro-logo::after, .swm-intro .logo-eyes, .swm-intro-text { animation: none; opacity: 1; transform: none; }
  .swm-intro .logo-pause { display: none; }
  .swm-intro .logo-play { animation: none; opacity: 1; transform: none; }
}
`;

/**
 * Açılış öğesini kurar. Çağıran, `.swm-intro`'yu konumlu bir kutunun içine ekler
 * (ve INTRO_CSS'in o belgede/shadow'da yüklü olduğundan emin olur).
 */
export function createIntro(doc: Document, text: string): HTMLElement {
  const root = doc.createElement('div');
  root.className = 'swm-intro';
  root.setAttribute('role', 'status');
  const logo = doc.createElement('div');
  logo.className = 'swm-intro-logo';
  logo.append(createLogo(doc, { animated: true }));
  const caption = doc.createElement('div');
  caption.className = 'swm-intro-text';
  caption.textContent = text;
  root.append(logo, caption);
  const remove = () => root.remove();
  root.addEventListener('click', remove);
  root.addEventListener('animationend', (event) => {
    if (event.target === root) remove();
  });
  // Sekme arka plandaysa animasyon olayı gelmeyebilir; yine de kalmasın.
  setTimeout(remove, INTRO_MS + 500);
  return root;
}
