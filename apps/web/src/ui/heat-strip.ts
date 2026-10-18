import { HEAT_BUCKET_S, HEAT_MIN_TOTAL, type HeatMap } from '@swm/shared/heat';
import { el } from '../dom.ts';
import { formatTime } from '../media-info.ts';
import { t } from '../i18n.ts';

/**
 * Zaman çizelgesinde tepkiler: videonun altında ince bir şerit. Emojilerin yoğun olduğu
 * yerler daha parlak; en çok tepki alan 3 anın üstünde soluk küçük bir emoji durur, tıklayınca
 * oraya gidilir. Göze batmasın diye ince ve soluk; yeni bir "en çok" an çıkınca emoji bir iki
 * kez hafifçe zıplar (fark edilsin). Birkaç tepki olmadan görünmez.
 */
export function createHeatStrip(
  containers: HTMLElement[],
  heat: HeatMap,
  getDuration: () => number,
  onSeek: (seconds: number) => void,
) {
  let lastTops = '';

  function render(): void {
    const duration = getDuration();
    const show = heat.size >= HEAT_MIN_TOTAL && duration > 0;
    const marks = show ? heat.marks() : [];
    const max = Math.max(1, ...marks.map((m) => m.n));
    const tops = show ? heat.top(3) : [];
    const topsKey = tops.map((m) => m.s).join(',');
    const pulse = topsKey !== lastTops && lastTops !== '';
    lastTops = topsKey;
    const pct = (s: number) => `${Math.min(100, (s / duration) * 100)}%`;

    for (const container of containers) {
      container.hidden = !show;
      if (!show) {
        container.replaceChildren();
        continue;
      }
      const track = el(
        'div',
        { class: 'heat-track' },
        ...marks.map((m) => {
          const bar = el('div', { class: 'heat-bar' });
          bar.style.left = pct(m.s);
          bar.style.width = `max(3px, ${(HEAT_BUCKET_S / duration) * 100}%)`;
          bar.style.opacity = String(0.25 + 0.75 * (m.n / max));
          return bar;
        }),
      );
      const buttons = tops.map((m) => {
        const label = t('heatTop', { time: formatTime(m.s), emoji: m.emoji, n: m.n });
        const button = el('button', { type: 'button', class: pulse ? 'heat-top pulse' : 'heat-top', title: label, 'aria-label': label }, m.emoji);
        button.style.left = pct(m.s + HEAT_BUCKET_S / 2);
        button.addEventListener('click', () => onSeek(m.s));
        return button;
      });
      container.replaceChildren(track, ...buttons);
    }
  }

  return { render };
}
