import { REACTIONS, type ClientMessage, type Reaction } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';

const MAX_ON_SCREEN = 30;

/**
 * Emoji tepkileri: alttaki butonlar tepki yollar, gelen tepkiler videonun
 * üstünde aşağıdan yukarı süzülür. Katman tıklamaları engellemez.
 */
export function createReactions(root: HTMLElement, send: (message: ClientMessage) => void) {
  // Biri video altında, biri tam ekran kontrollerinde olmak üzere birden fazla emoji çubuğu olabilir.
  const bars = root.querySelectorAll<HTMLElement>('.reaction-bar');
  const layer = root.querySelector<HTMLElement>('#reactions-layer')!;

  for (const bar of bars) {
    for (const emoji of REACTIONS) {
      const button = el('button', { type: 'button', class: 'reaction-btn', title: t('react') }, emoji);
      button.addEventListener('click', () => send({ t: 'react', emoji }));
      bar.append(button);
    }
  }

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
      for (const button of root.querySelectorAll<HTMLButtonElement>('.reaction-btn')) button.title = t('react');
    },
  };
}
