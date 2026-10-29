import type { ClientMessage, QueueItem } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { itemThumbnail, itemTitle } from '../media-info.ts';
import { load, save } from '../storage.ts';

/** Oy verdiğim öğeler (tarayıcıda; sunucu sadece sayıyı yollar). */
const VOTES_KEY = 'myVotes';

/**
 * "Sıradakiler" paneli: listeyi çizer, butonlar sunucuya komut yollar. 👍 ile oy verilir; sıra
 * oya göre dizilir (en çok oy alan önce oynar). Yönetici modlarında kilitli butonlar kapalıdır.
 */
export function createQueuePanel(
  root: HTMLElement,
  send: (message: ClientMessage) => void,
  can: { play: () => boolean; edit: () => boolean } = { play: () => true, edit: () => true },
) {
  // Sekmedeki küçük sayı (sırada kaç video var).
  const count = root.querySelector<HTMLElement>('#queue-count')!;
  const list = root.querySelector<HTMLOListElement>('#queue')!;
  const empty = root.querySelector<HTMLElement>('#queue-empty')!;
  let items: QueueItem[] = [];
  const voted = new Set<string>(readVotes());

  function button(label: string, text: string, onClick: () => void, disabled = false): HTMLButtonElement {
    const b = el('button', { type: 'button', class: 'icon-btn', title: label, 'aria-label': label }, text);
    b.disabled = disabled;
    b.addEventListener('click', onClick);
    return b;
  }

  function toggleVote(item: QueueItem): void {
    const up = !voted.has(item.id);
    if (up) voted.add(item.id);
    else voted.delete(item.id);
    save(VOTES_KEY, JSON.stringify([...voted].slice(-200)));
    send({ t: 'vote', id: item.id, up });
    render();
  }

  function render(): void {
    count.textContent = items.length ? String(items.length) : '';
    empty.hidden = items.length > 0;
    const play = can.play();
    const edit = can.edit();
    list.replaceChildren(
      ...items.map((item, index) => {
        const thumb = itemThumbnail(item);
        const votes = item.votes ?? 0;
        const vote = el(
          'button',
          { type: 'button', class: voted.has(item.id) ? 'vote-btn on' : 'vote-btn', title: t('voteHint'), 'aria-label': t('voteHint'), 'aria-pressed': String(voted.has(item.id)) },
          '👍',
          votes ? el('span', {}, String(votes)) : '',
        );
        vote.addEventListener('click', () => toggleVote(item));
        return el(
          'li',
          { class: 'queue-item' },
          thumb
            ? el('img', { class: 'thumb', src: thumb, alt: '', loading: 'lazy' })
            : el('div', { class: 'thumb placeholder' }, item.media.kind === 'page' ? '🌐' : '▶'),
          el(
            'div',
            { class: 'queue-text' },
            el('span', { class: 'queue-title', title: itemTitle(item) }, itemTitle(item)),
            el('span', { class: 'muted small' }, t('addedBy', { name: item.by })),
          ),
          el(
            'div',
            { class: 'queue-actions' },
            vote,
            button(t('playItem'), '▶', () => send({ t: 'jump', id: item.id }), !play),
            button(t('moveUp'), '↑', () => send({ t: 'move', id: item.id, to: index - 1 }), index === 0 || !edit),
            button(t('moveDown'), '↓', () => send({ t: 'move', id: item.id, to: index + 1 }), index === items.length - 1 || !edit),
            button(t('remove'), '✕', () => send({ t: 'dequeue', id: item.id }), !edit),
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
    /** What plays next ("Next" and the end of a video open the head of the queue). */
    get first(): QueueItem | null {
      return items[0] ?? null;
    },
    render,
  };
}

function readVotes(): string[] {
  try {
    const list = JSON.parse(load(VOTES_KEY) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
