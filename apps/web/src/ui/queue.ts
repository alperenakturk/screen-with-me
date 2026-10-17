import type { ClientMessage, QueueItem } from '@wb/shared/protocol';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { itemThumbnail, itemTitle } from '../media-info.ts';

/** "Sıradakiler" paneli: listeyi çizer, butonlar sunucuya komut yollar. */
export function createQueuePanel(root: HTMLElement, send: (message: ClientMessage) => void) {
  const title = root.querySelector<HTMLElement>('#queue-title')!;
  const list = root.querySelector<HTMLOListElement>('#queue')!;
  const empty = root.querySelector<HTMLElement>('#queue-empty')!;
  let items: QueueItem[] = [];

  function button(label: string, text: string, onClick: () => void, disabled = false): HTMLButtonElement {
    const b = el('button', { type: 'button', class: 'icon-btn', title: label, 'aria-label': label }, text);
    b.disabled = disabled;
    b.addEventListener('click', onClick);
    return b;
  }

  function render(): void {
    title.textContent = t('queue', { n: items.length });
    empty.hidden = items.length > 0;
    list.replaceChildren(
      ...items.map((item, index) => {
        const thumb = itemThumbnail(item);
        return el(
          'li',
          { class: 'queue-item' },
          thumb ? el('img', { class: 'thumb', src: thumb, alt: '', loading: 'lazy' }) : el('div', { class: 'thumb placeholder' }, '▶'),
          el(
            'div',
            { class: 'queue-text' },
            el('span', { class: 'queue-title', title: itemTitle(item) }, itemTitle(item)),
            el('span', { class: 'muted small' }, t('addedBy', { name: item.by })),
          ),
          el(
            'div',
            { class: 'queue-actions' },
            button(t('playItem'), '▶', () => send({ t: 'jump', id: item.id })),
            button(t('moveUp'), '↑', () => send({ t: 'move', id: item.id, to: index - 1 }), index === 0),
            button(t('moveDown'), '↓', () => send({ t: 'move', id: item.id, to: index + 1 }), index === items.length - 1),
            button(t('remove'), '✕', () => send({ t: 'dequeue', id: item.id })),
          ),
        );
      }),
    );
  }

  return {
    set(next: QueueItem[]): void {
      items = next;
      render();
    },
    get length(): number {
      return items.length;
    },
    render,
  };
}
