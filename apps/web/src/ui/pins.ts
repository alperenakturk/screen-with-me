import { PIN_NOTE_MAX, type ClientMessage, type Pin, type PinList } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { formatTime } from '../media-info.ts';
import { t } from '../i18n.ts';
import { isTyping } from './reactions.ts';

/**
 * Videonun önemli anlarını pinleme: 📌 (ya da P) o anı pinler, istenirse kısa not eklenir.
 * Pin kimseye bildirim olarak gitmez; şeritte (video altı + tam ekranda ilerleme çubuğu
 * üstü) işaret olarak durur, fare oynayınca belirginleşir. İşarete tıklayınca oraya gidilir;
 * kendi pinini (yönetici hepsini) × ile kaldırır. Video değişince pinler sıfırlanır.
 */
export function createPins(options: {
  strips: HTMLElement[];
  form: HTMLFormElement;
  getDuration: () => number;
  onSeek: (seconds: number) => void;
  myId: () => string | null;
  isHost: () => boolean;
  send: (message: ClientMessage) => void;
}) {
  const { strips, form } = options;
  const input = form.querySelector('input')!;
  input.maxLength = PIN_NOTE_MAX;
  let itemId: string | null = null;
  let pins: Pin[] = [];

  function render(): void {
    const duration = options.getDuration();
    const show = pins.length > 0 && duration > 0;
    for (const strip of strips) {
      strip.hidden = !show;
      if (!show) {
        strip.replaceChildren();
        continue;
      }
      strip.replaceChildren(
        el('div', { class: 'pin-track' }),
        ...pins.map((pin) => {
          const who = pin.by.name + (pin.note ? `: ${pin.note}` : '');
          const label = t('pinTitle', { time: formatTime(pin.at), who });
          const mark = el('button', { type: 'button', class: 'pin-mark', title: label, 'aria-label': label }, '📌');
          mark.style.left = `${Math.min(100, (pin.at / duration) * 100)}%`;
          mark.addEventListener('click', () => options.onSeek(pin.at));
          const wrap = el('span', { class: 'pin-wrap' }, mark);
          wrap.style.left = mark.style.left;
          mark.style.left = '';
          if (pin.by.id === options.myId() || options.isHost()) {
            const remove = el('button', { type: 'button', class: 'pin-remove', title: t('pinRemove'), 'aria-label': t('pinRemove') }, '×');
            remove.addEventListener('click', () => options.send({ t: 'unpin', id: pin.id }));
            wrap.append(remove);
          }
          return wrap;
        }),
      );
    }
  }

  function open(): void {
    form.hidden = false;
    input.value = '';
    input.focus();
  }
  function close(): void {
    form.hidden = true;
    input.blur();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const note = input.value.trim();
    options.send(note ? { t: 'pin', note } : { t: 'pin' });
    close();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
  input.addEventListener('blur', () => setTimeout(() => {
    if (document.activeElement !== input) form.hidden = true;
  }, 150));
  // Klavye: P pin kutusunu açar (yazı yazarken değil).
  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 'p' || event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
    if (!itemId && options.getDuration() <= 0) return;
    event.preventDefault();
    open();
  });

  return {
    open,
    render,
    /** Sunucudan gelen tam liste (welcome / pins). */
    set(list: PinList | null): void {
      itemId = list?.itemId ?? itemId;
      pins = list?.pins ?? [];
      render();
    },
    /** Açık video değişti: başka videonun pinleri silinir. */
    reset(nextItemId: string | null): void {
      if (nextItemId === itemId) return;
      itemId = nextItemId;
      pins = [];
      render();
    },
  };
}
