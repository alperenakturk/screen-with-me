import { REACTION_PAGES, type ClientMessage, type Reaction } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';

const MAX_ON_SCREEN = 30;

/**
 * Emoji tepkileri: alttaki butonlar tepki yollar, gelen tepkiler videonun
 * üstünde aşağıdan yukarı süzülür. Katman tıklamaları engellemez.
 * Emojiler sekizli sayfalardır; yanındaki ▲▼ (ya da fare tekerleği) sayfayı değiştirir.
 */
export function createReactions(root: HTMLElement, send: (message: ClientMessage) => void) {
  // Biri video altında, biri tam ekran kontrollerinde olmak üzere birden fazla emoji çubuğu olabilir.
  const bars = root.querySelectorAll<HTMLElement>('.reaction-bar');
  const layer = root.querySelector<HTMLElement>('#reactions-layer')!;
  let page = 0;

  function turn(step: number): void {
    page = (page + step + REACTION_PAGES.length) % REACTION_PAGES.length;
    draw();
  }

  function draw(): void {
    for (const bar of bars) {
      const buttons = REACTION_PAGES[page]!.map((emoji) => {
        const button = el('button', { type: 'button', class: 'reaction-btn', title: t('react') }, emoji);
        button.addEventListener('click', () => send({ t: 'react', emoji }));
        return button;
      });
      const up = el('button', { type: 'button', class: 'reaction-page', title: t('moreReactions'), 'aria-label': t('moreReactions') }, '▲');
      const down = el('button', { type: 'button', class: 'reaction-page', title: t('moreReactions'), 'aria-label': t('moreReactions') }, '▼');
      up.addEventListener('click', () => turn(-1));
      down.addEventListener('click', () => turn(1));
      bar.replaceChildren(...buttons, el('span', { class: 'reaction-pager' }, up, down));
    }
  }

  for (const bar of bars) {
    bar.addEventListener('wheel', (event) => {
      event.preventDefault();
      turn(event.deltaY > 0 ? 1 : -1);
    }, { passive: false });
  }
  draw();

  return {
    show(emoji: Reaction, name: string): void {
      if (layer.childElementCount >= MAX_ON_SCREEN) layer.firstElementChild?.remove();
      const bubble = el('div', { class: 'float-reaction' }, el('span', { class: 'float-emoji' }, emoji), el('span', { class: 'float-name' }, name));
      bubble.style.left = `${8 + Math.random() * 80}%`;
      bubble.style.setProperty('--drift', `${(Math.random() - 0.5) * 60}px`);
      bubble.addEventListener('animationend', () => bubble.remove());
      layer.append(bubble);
    },
    relabel(): void {
      draw();
    },
  };
}
