import type { FeedKind } from '@swm/shared/feed';
import { debugHooks } from '../debug-lab.ts';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import type { RoomFeed } from './shorts-feed.ts';

/**
 * Card SH2: the room's feed as a row at the top of the Queue ("Up next"), for everyone: what it follows, ⏸ / ▶, 🧭
 * Steer (the feed window) and ✕. With no feed running, two buttons start one: ♾ Shorts feed and ▶ Video feed.
 */
export interface FeedRowDeps {
  /** "Only the host can start a feed" is on and I am not the host: no ✕. */
  locked: () => boolean;
}

/**
 * Card UI4 (owner, 17 Nov 2026): no feed pill above the video any more (FD1's "♾ Feed: … · 12 left · by Sam"); the
 * feed shows only where it lives: this row and the feed drawer.
 */
export function createFeedRow(root: HTMLElement, feed: RoomFeed, open: (kind: FeedKind) => void, deps: FeedRowDeps) {
  const button = (id: string, label: string, text: string, onClick: () => void, cls = 'btn small-btn') => {
    const b = el('button', { type: 'button', class: cls, id, title: label, 'aria-label': label }, text);
    b.addEventListener('click', onClick);
    return b;
  };
  function render(): void {
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
      ...(deps.locked() ? [] : [button('feed-row-stop', t('feed.stop'), '✕', () => feed.stop(), 'icon-btn')]),
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
          });
        },
      },
      {
        // UI4: the feed shows only in the Queue's row and the drawer, never as a pill above the video.
        id: 'ui.feedPill',
        tab: 'status',
        title: { en: 'Feed: no pill above the video', tr: 'Akış: videonun üstünde şerit yok' },
        help: {
          en: 'Writes into the log whether a feed pill shows anywhere (it should not: the feed lives in the Queue\'s row and the feed drawer) and what the Queue\'s feed row says.',
          tr: 'Bir akış şeridinin herhangi bir yerde görünüp görünmediğini (görünmemeli: akış Sıra\'daki satırda ve akış çekmecesinde durur) ve Sıra\'daki akış satırının ne yazdığını kayda yazar.',
        },
        run: () => JSON.stringify({ pill: !!document.querySelector('.feed-pill, #feed-pill'), feed: feed.info?.label ?? null, row: root.textContent }),
      },
    ],
  }));
  return { render };
}
