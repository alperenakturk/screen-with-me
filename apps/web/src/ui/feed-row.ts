import type { FeedKind } from '@swm/shared/feed';
import { debugHooks } from '../debug-lab.ts';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import type { RoomFeed } from './shorts-feed.ts';

/**
 * Card SH2: the room's feed as a row at the top of the Queue ("Up next"), for everyone: what it follows, ⏸ / ▶, 🧭
 * Steer (the feed window) and ✕. With no feed running, two buttons start one: ♾ Shorts feed and ▶ Video feed.
 */
export interface FeedPill {
  /** The pill's place in our own frame (the bar above the video), never inside the player. */
  root: HTMLElement;
  /** A member's name by member id (who started the feed). */
  who: (id: string) => string | null;
  /** How many of the feed's videos wait in the queue. */
  left: () => number;
  /** "Only the host can start a feed" is on and I am not the host: no ✕. */
  locked: () => boolean;
}

/**
 * Card FD1: while a feed runs, everyone sees a pill above the video: "♾ Feed: 🎵 Music · 12 left · by Sam ⏸ ✕"
 * (✕ stops it for the room; hidden for guests under "Only the host can start a feed"). The label opens the drawer.
 */
export function createFeedRow(root: HTMLElement, feed: RoomFeed, open: (kind: FeedKind) => void, pill: FeedPill) {
  const button = (id: string, label: string, text: string, onClick: () => void, cls = 'btn small-btn') => {
    const b = el('button', { type: 'button', class: cls, id, title: label, 'aria-label': label }, text);
    b.addEventListener('click', onClick);
    return b;
  };
  function renderPill(): void {
    const info = feed.info;
    pill.root.hidden = !info;
    if (!info) return pill.root.replaceChildren();
    const kind = info.kind === 'shorts' ? '♾' : '▶';
    const left = pill.left();
    const name = pill.who(info.by);
    const text = [`${t('feed.pill', { label: info.label })}`, t('feed.left', { n: left }), name ? t('feed.by', { name }) : ''].filter(Boolean).join(' · ');
    const label = el('button', { type: 'button', class: 'btn small-btn primary feed-pill-text', id: 'feed-pill-text', title: t('feed.steerHint') }, `${kind} ${text}`);
    label.addEventListener('click', () => open(info.kind));
    pill.root.classList.toggle('paused', info.paused);
    pill.root.replaceChildren(
      label,
      button('feed-pill-pause', info.paused ? t('feed.resume') : t('feed.pause'), info.paused ? '▶' : '❚❚', () => feed.pause(!info.paused), 'icon-btn'),
      ...(pill.locked() ? [] : [button('feed-pill-stop', t('feed.stop'), '✕', () => feed.stop(), 'icon-btn')]),
    );
  }
  function render(): void {
    renderPill();
    const info = feed.info;
    root.classList.toggle('on', info !== null);
    root.classList.toggle('paused', info?.paused === true);
    if (!info) {
      root.replaceChildren(
        button('feed-open-shorts', t('feed.startShorts'), `♾ ${t('feed.short')}`, () => open('shorts')),
        button('feed-open-videos', t('feed.startVideos'), `▶ ${t('feed.videos')}`, () => open('videos')),
      );
      return;
    }
    const kind = info.kind === 'shorts' ? `♾ ${t('feed.short')}` : `▶ ${t('feed.videos')}`;
    root.replaceChildren(
      el('span', { class: 'feed-qrow-text', id: 'feed-row-text' }, el('b', {}, kind), ' · ', info.label, info.paused ? el('span', { class: 'muted' }, ` (${t('feed.pausedTag')})`) : ''),
      button('feed-row-pause', info.paused ? t('feed.resume') : t('feed.pause'), info.paused ? `▶ ${t('feed.resumeShort')}` : t('feed.pauseShort'), () => feed.pause(!info.paused)),
      button('feed-row-steer', t('feed.steerHint'), `🧭 ${t('feed.steer')}`, () => open(info.kind)),
      ...(pill.locked() ? [] : [button('feed-row-stop', t('feed.stop'), '✕', () => feed.stop(), 'icon-btn')]),
    );
  }
  render();
  // Card SH2: Test Lab `feed.state`: the running feed, how often it was steered and how many played ids it skips.
  debugHooks.register('feed', () => ({
    commands: [
      {
        id: 'feed.state',
        tab: 'status',
        title: { en: 'Feed: what runs, steers, remembered videos', tr: 'Akış: ne açık, yönlendirmeler, hatırlanan videolar' },
        help: {
          en: 'Writes the room’s feed into the log: Shorts or videos, what it follows, paused or not, who runs it, how many times it was steered, and how many played videos this tab knows to skip.',
          tr: 'Odanın akışını kayda yazar: Shorts mu video mu, neyi izliyor, duraklatıldı mı, kim çalıştırıyor, kaç kez yönlendirildi ve bu sekmenin atlayacağı kaç oynatılmış video bildiği.',
        },
        run: () => {
          const info = feed.info;
          return JSON.stringify({
            active: info ? { kind: info.kind, label: info.label, source: info.source, paused: info.paused, mine: feed.runner } : null,
            steers: info?.steers ?? 0,
            remembered: feed.remembered,
            row: root.textContent,
            pill: pill.root.hidden ? null : pill.root.textContent,
          });
        },
      },
    ],
  }));
  return { render };
}
