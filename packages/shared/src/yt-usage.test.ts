import { describe, expect, it } from 'vitest';
import { addUsage, cleanUsage, pruneUsage, unitsOf, usageDay, USAGE_DAYS } from './yt-usage.ts';

const day = 86_400_000;
const now = Date.UTC(2026, 10, 3, 12);

describe('YouTube usage counters (card Y3)', () => {
  it('prices each call kind', () => {
    expect(unitsOf({ search: 1, videos: 1 })).toBe(101);
    expect(unitsOf({ videos: 1, channels: 1, playlistItems: 1 })).toBe(3);
    expect(unitsOf({ oembed: 1 })).toBe(0);
  });

  it('adds requests, calls and units per UTC day and kind', () => {
    let book = addUsage({}, 'search', { search: 1, videos: 1 }, now);
    book = addUsage(book, 'search', { search: 1 }, now + 1000);
    book = addUsage(book, 'oembed', { oembed: 1 }, now);
    const today = book[usageDay(now)]!;
    expect(today.search).toEqual({ requests: 2, calls: { search: 2, videos: 1 }, units: 201 });
    expect(today.oembed).toEqual({ requests: 1, calls: { oembed: 1 }, units: 0 });
  });

  it('a new UTC day starts at zero', () => {
    const book = addUsage(addUsage({}, 'pool', { search: 1 }, now), 'pool', { search: 1 }, now + day);
    expect(book[usageDay(now)]!.pool!.requests).toBe(1);
    expect(book[usageDay(now + day)]!.pool!.requests).toBe(1);
  });

  it(`keeps at most ${USAGE_DAYS} days`, () => {
    const book = { [usageDay(now - USAGE_DAYS * day)]: {}, [usageDay(now - (USAGE_DAYS - 1) * day)]: {}, [usageDay(now)]: {} };
    expect(Object.keys(pruneUsage(book, now))).toHaveLength(2);
  });

  it('accepts only known kinds and small counts by method', () => {
    expect(cleanUsage({ kind: 'like', calls: { videos: 2 } })).toEqual({ kind: 'like', calls: { videos: 2 } });
    expect(cleanUsage({ kind: 'other', calls: {} })).toBeNull();
    expect(cleanUsage({ kind: 'search', calls: { videos: 1000 } })).toBeNull();
    expect(cleanUsage({ kind: 'search', calls: { 'a b': 1 } })).toBeNull();
  });
});
