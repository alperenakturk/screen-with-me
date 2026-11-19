import { debugHooks } from '../debug-lab.ts';
import { isPhoneLayout } from '../device.ts';

/**
 * Card TG1 (owner, 19 Nov 2026, "the card gets shorter"): a side game's free window lines up with the side panel down to
 * the chat's message box, so at 1366 a tall one (Five Frames) covered the Together card's "Join voice" and "Share".
 * While a game window lies over the side panel, the card is compact (`.together-card.compact`, room.css): the title,
 * small faces and the counts share one row, the buttons one more, so they stay clear above the window. Back to full when
 * the window closes or moves off the panel. Computers and tablets only (the phone room has its own strip).
 */
export function watchTogetherCompact(card: HTMLElement): void {
  /** Test Lab: `on` / `off` hold the card that way, null follows the game window. */
  let forced: boolean | null = null;
  let watched: HTMLElement | null = null;

  const overPanel = (): boolean => {
    const stage = document.getElementById('game-stage');
    const side = card.closest<HTMLElement>('.side');
    if (!stage || stage.hidden || !side || isPhoneLayout()) return false;
    const g = stage.getBoundingClientRect();
    const s = side.getBoundingClientRect();
    if (g.width < 1 || s.width < 1) return false;
    // Over at least half of the panel's width, anywhere in its height.
    const across = Math.min(g.right, s.right) - Math.max(g.left, s.left);
    return across > s.width / 2 && g.top < s.bottom && g.bottom > s.top;
  };

  const update = () => {
    const on = forced ?? overPanel();
    if (card.classList.contains('compact') !== on) card.classList.toggle('compact', on);
  };

  const watch = () => {
    const stage = document.getElementById('game-stage');
    if (stage && stage !== watched) {
      watched = stage;
      new MutationObserver(update).observe(stage, { attributes: true, attributeFilter: ['hidden', 'style', 'data-place'] });
    }
    update();
  };
  // The game window comes with the games chunk, the first time a game opens.
  new MutationObserver(watch).observe(document.body, { childList: true });
  addEventListener('resize', update);
  watch();

  debugHooks.register('together', () => ({
    commands: [
      {
        id: 'together.compact',
        tab: 'video',
        run: (arg?: string) => {
          const want = arg?.trim();
          if (want === 'on' || want === 'off') forced = want === 'on';
          else if (want === 'auto') forced = null;
          update();
          const join = document.getElementById('voice-join');
          const share = document.getElementById('live-share');
          const clear = (b: HTMLElement | null) => {
            const r = b?.getBoundingClientRect();
            if (!b || !r || r.width < 1) return 'hidden';
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return b.contains(hit) ? 'clear' : 'covered';
          };
          const text = JSON.stringify({
            compact: card.classList.contains('compact'),
            forced,
            gameOverPanel: overPanel(),
            cardHeight: Math.round(card.getBoundingClientRect().height),
            join: clear(join),
            share: clear(share),
          });
          return { en: text, tr: text };
        },
      },
    ],
  }));
}
