import { describe, expect, it } from 'vitest';
import { cleanFeedIn, cleanFeedSource, FEED_MEMORY_DAYS, FEED_MEMORY_MAX, freshIds, pruneMemory, readMemory, rememberPlayed, sameFeed, type FeedInfo, type FeedMemoryEntries } from './feed.ts';
import { cleanText, parseClientMessage } from './protocol.ts';

const DAY = 86_400_000;
const id = (n: number) => `vid${String(n).padStart(8, '0')}`;

describe('feed (card SH2)', () => {
  it('validates a feed into a new object and cleans its texts', () => {
    const raw = { kind: 'shorts', label: 'cats​', source: { kind: 'topic', q: ' cats ', region: 'JP', extra: 1 }, paused: 'yes', x: 1 };
    expect(cleanFeedIn(raw, cleanText)).toEqual({ kind: 'shorts', label: 'cats', source: { kind: 'topic', q: 'cats', region: 'JP' }, paused: false });
    expect(cleanFeedIn({ ...raw, kind: 'films' }, cleanText)).toBeNull();
    expect(cleanFeedIn({ ...raw, label: '   ' }, cleanText)).toBeNull();
    expect(cleanFeedIn({ ...raw, source: { kind: 'topic', q: '' } }, cleanText)).toBeNull();
    expect(cleanFeedIn({ ...raw, source: { kind: 'topic', q: 'x', region: 'XX' } }, cleanText)?.source).toEqual({ kind: 'topic', q: 'x' });
    expect(cleanFeedIn({ ...raw, source: { kind: 'like', id: 'nope' } }, cleanText)).toBeNull();
    expect(cleanFeedIn({ ...raw, kind: 'videos', source: { kind: 'channel', c: '@someone', order: 'popular' } }, cleanText)?.source).toEqual({ kind: 'channel', c: '@someone', order: 'popular' });
    expect(cleanFeedIn({ ...raw, source: { kind: 'channel', c: 'not a channel' } }, cleanText)).toBeNull();
    expect(cleanFeedIn({ ...raw, source: { kind: 'chanOf', id: id(1), order: 'weird' } }, cleanText)?.source).toEqual({ kind: 'chanOf', id: id(1) });
    expect(cleanFeedIn({ ...raw, source: { kind: 'pool', pool: 'music' } }, cleanText)?.source).toEqual({ kind: 'pool', pool: 'music', region: 'auto' });
  });

  it('parses the feed messages', () => {
    expect(parseClientMessage(JSON.stringify({ t: 'feed', feed: null }))).toEqual({ t: 'feed', feed: null });
    expect(parseClientMessage(JSON.stringify({ t: 'feed', feed: { kind: 'videos', label: 'Popular', source: { kind: 'pool', pool: 'popular', region: 'TR' }, paused: true } }))).toEqual({
      t: 'feed',
      feed: { kind: 'videos', label: 'Popular', source: { kind: 'pool', pool: 'popular', region: 'TR' }, paused: true },
    });
    expect(parseClientMessage(JSON.stringify({ t: 'feed', feed: { kind: 'videos' } }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ t: 'feed-played', ids: ['x'] }))).toEqual({ t: 'feed-played' });
  });

  it('tells a pause from a steer', () => {
    const running: FeedInfo = { kind: 'shorts', label: 'cats', source: { kind: 'topic', q: 'cats' }, paused: false, by: 'a', steers: 0 };
    expect(sameFeed(running, { ...running, paused: true })).toBe(true);
    expect(sameFeed(running, { ...running, source: { kind: 'topic', q: 'cats', region: 'JP' } })).toBe(false);
    expect(sameFeed(null, running)).toBe(false);
  });

  it('remembers played ids once, newest last, at most FEED_MEMORY_MAX for FEED_MEMORY_DAYS', () => {
    let memory: FeedMemoryEntries = [];
    memory = rememberPlayed(memory, id(1), 0);
    memory = rememberPlayed(memory, id(2), 1);
    memory = rememberPlayed(memory, id(1), 2);
    expect(memory).toEqual([
      [id(2), 1],
      [id(1), 2],
    ]);
    expect(rememberPlayed(memory, 'bad id', 3)).toBe(memory);
    // Old ones go after 30 days.
    expect(pruneMemory(memory, 2 + FEED_MEMORY_DAYS * DAY)).toEqual([[id(1), 2]]);
    // The cap keeps the newest.
    let big: FeedMemoryEntries = [];
    for (let n = 0; n < FEED_MEMORY_MAX + 5; n++) big.push([id(n), n]);
    big = pruneMemory(big, FEED_MEMORY_MAX + 5);
    expect(big).toHaveLength(FEED_MEMORY_MAX);
    expect(big[0]![0]).toBe(id(5));
  });

  it('reads stored memory defensively', () => {
    expect(readMemory('x', 0)).toEqual([]);
    expect(readMemory([[id(1), 5], ['bad', 1], [id(2), 'x'], null], 10)).toEqual([[id(1), 5]]);
  });

  it('a new feed skips played and queued ids', () => {
    expect(freshIds([id(1), id(2), id(2), id(3)], new Set([id(1)]))).toEqual([id(2), id(3)]);
  });
});

// Card FC1: words carry a country (also "auto") and a kind chip; anything else is dropped.
describe('topic feeds combine (FC1)', () => {
  const clean = (text: string, max: number) => text.slice(0, max);
  it('keeps the country and the kind chip', () => {
    expect(cleanFeedSource({ kind: 'topic', q: 'hay', region: 'JP', pool: 'popular' }, clean)).toEqual({ kind: 'topic', q: 'hay', region: 'JP', pool: 'popular' });
    expect(cleanFeedSource({ kind: 'topic', q: 'hay', region: 'auto' }, clean)).toEqual({ kind: 'topic', q: 'hay', region: 'auto' });
  });
  it('drops an unknown kind or country', () => {
    expect(cleanFeedSource({ kind: 'topic', q: 'hay', region: 'XX', pool: 'cooking' }, clean)).toEqual({ kind: 'topic', q: 'hay' });
  });
});
