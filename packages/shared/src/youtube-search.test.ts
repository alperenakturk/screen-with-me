import { describe, expect, it } from 'vitest';
import {
  feedSearchParams,
  decodeEntities,
  formatDuration,
  isQuotaError,
  normalizeQuery,
  parseDurations,
  parseIsoDuration,
  parseSearchAnswer,
  cleanPageToken,
  shortsOnly,
  parseSearchItems,
  parseUpright,
  SEARCH_QUERY_MAX,
  SEARCH_RESULTS,
  isPoolKind,
  POOL_CATEGORY,
  poolWindow,
  parseVideoItems,
  titleWords,
} from './youtube-search.ts';

describe('normalizeQuery', () => {
  it('trims, collapses spaces and lower-cases (Turkish İ/I too)', () => {
    expect(normalizeQuery('  Lofi   HİP  hop \n')).toBe('lofi hip hop');
    expect(normalizeQuery('IRMAK')).toBe('ırmak');
  });
  it('is null for empty input and cuts long input', () => {
    expect(normalizeQuery('   ')).toBeNull();
    expect(normalizeQuery('a'.repeat(300))).toHaveLength(SEARCH_QUERY_MAX);
  });
});

describe('durations', () => {
  it.each([
    ['PT4M5S', 245],
    ['PT1H2M3S', 3723],
    ['PT59S', 59],
    ['P1DT1H', 90000],
    ['PT0S', null],
    ['P0D', null],
    ['garbage', null],
    [42, null],
  ])('%s → %s', (input, seconds) => {
    expect(parseIsoDuration(input)).toBe(seconds);
  });
  it('formats as m:ss / h:mm:ss', () => {
    expect(formatDuration(245)).toBe('4:05');
    expect(formatDuration(3723)).toBe('1:02:03');
    expect(formatDuration(9)).toBe('0:09');
  });
});

describe('decodeEntities', () => {
  it('decodes the escapes YouTube uses', () => {
    expect(decodeEntities('Rock &amp; Roll &quot;live&quot; &#39;99 &#x1F600; &lt;b&gt;')).toBe('Rock & Roll "live" \'99 😀 <b>');
    expect(decodeEntities('&unknown; &#0;')).toBe('&unknown; &#0;');
  });
});

const search = {
  items: [
    { id: { videoId: 'dQw4w9WgXcQ' }, snippet: { title: 'Never &amp; Ever', channelTitle: 'Chan', liveBroadcastContent: 'none' } },
    { id: { videoId: 'dQw4w9WgXcQ' }, snippet: { title: 'duplicate' } },
    { id: { videoId: 'bad id' }, snippet: { title: 'bad' } },
    { id: { channelId: 'UC123' }, snippet: { title: 'a channel' } },
    { id: { videoId: 'abcdefghijk' }, snippet: { title: 'Live\nnow', channelTitle: 'Live chan', liveBroadcastContent: 'live' } },
    'junk',
  ],
};

describe('parseSearchItems', () => {
  it('keeps only well-formed, unique videos, with durations', () => {
    const durations = parseDurations({ items: [{ id: 'dQw4w9WgXcQ', contentDetails: { duration: 'PT3M33S' } }, { id: 'x' }] });
    expect(parseSearchItems(search, durations)).toEqual([
      { id: 'dQw4w9WgXcQ', title: 'Never & Ever', channel: 'Chan', duration: 213, live: false },
      { id: 'abcdefghijk', title: 'Live now', channel: 'Live chan', duration: null, live: true },
    ]);
  });
  it('returns nothing for unexpected shapes and stops at the limit', () => {
    expect(parseSearchItems(null)).toEqual([]);
    expect(parseSearchItems({ items: 'x' })).toEqual([]);
    const many = { items: Array.from({ length: 30 }, (_, i) => ({ id: { videoId: `vid${String(i).padStart(8, '0')}` }, snippet: { title: `t${i}` } })) };
    expect(parseSearchItems(many)).toHaveLength(SEARCH_RESULTS);
  });
});

describe('isQuotaError', () => {
  it('recognises the daily quota error only', () => {
    expect(isQuotaError({ error: { code: 403, errors: [{ reason: 'quotaExceeded' }] } })).toBe(true);
    expect(isQuotaError({ error: { code: 403, errors: [{ reason: 'forbidden' }] } })).toBe(false);
    expect(isQuotaError('nope')).toBe(false);
  });
});

describe('parseSearchAnswer', () => {
  it('accepts known errors and well-formed items', () => {
    expect(parseSearchAnswer({ error: 'quota' })).toEqual({ error: 'quota' });
    expect(parseSearchAnswer({ error: 'other' })).toEqual({ error: 'failed' });
    expect(parseSearchAnswer({ items: [{ id: 'dQw4w9WgXcQ', title: 'T', channel: 'C', duration: 10, live: false }, { id: '<script>' }] })).toEqual({
      items: [{ id: 'dQw4w9WgXcQ', title: 'T', channel: 'C', duration: 10, live: false }],
    });
    expect(parseSearchAnswer(null)).toEqual({ error: 'failed' });
  });
});

describe('Shorts feed helpers', () => {
  it('accepts only clean page tokens', () => {
    expect(cleanPageToken('CBkQAA')).toBe('CBkQAA');
    expect(cleanPageToken('a b')).toBeNull();
    expect(cleanPageToken('x'.repeat(101))).toBeNull();
    expect(cleanPageToken(5)).toBeNull();
  });

  it('keeps only real shorts', () => {
    const item = (id: string, duration: number | null, live = false) => ({ id, title: id, channel: '', duration, live });
    expect(shortsOnly([item('aaaaaaaaaaa', 45), item('bbbbbbbbbbb', 600), item('ccccccccccc', null), item('ddddddddddd', 30, true)]).map((i) => i.id)).toEqual(['aaaaaaaaaaa']);
  });

  it('carries the next page token through the answer', () => {
    expect(parseSearchAnswer({ items: [], next: 'CBkQAA' })).toEqual({ items: [], next: 'CBkQAA' });
    expect(parseSearchAnswer({ items: [], next: 'bad token!' })).toEqual({ items: [] });
  });
});

describe('Shorts in search results (0.9.91.12)', () => {
  const search = { items: [{ id: { videoId: 'aqz-KE-bpKQ' }, snippet: { title: 'Upright' } }, { id: { videoId: 'dQw4w9WgXcQ' }, snippet: { title: 'Wide' } }, { id: { videoId: 'abcdefghijk' }, snippet: { title: 'Long upright' } }] };
  const videos = {
    items: [
      { id: 'aqz-KE-bpKQ', contentDetails: { duration: 'PT45S' }, player: { embedWidth: '100', embedHeight: '178' } },
      { id: 'dQw4w9WgXcQ', contentDetails: { duration: 'PT50S' }, player: { embedWidth: 100, embedHeight: 56 } },
      { id: 'abcdefghijk', contentDetails: { duration: 'PT10M' }, player: { embedWidth: '100', embedHeight: '178' } },
    ],
  };
  it('marks only upright videos of a Short’s length', () => {
    const items = parseSearchItems(search, parseDurations(videos), 12, parseUpright(videos));
    expect(items.map((i) => [i.id, i.short === true])).toEqual([
      ['aqz-KE-bpKQ', true],
      ['dQw4w9WgXcQ', false],
      ['abcdefghijk', false],
    ]);
  });
  it('ignores broken player sizes', () => {
    expect([...parseUpright({ items: [{ id: 'aqz-KE-bpKQ', player: { embedWidth: 'x', embedHeight: '10' } }, { id: 'bad', player: { embedWidth: 1, embedHeight: 2 } }] })]).toEqual([]);
  });
  it('the client keeps the mark', () => {
    const answer = parseSearchAnswer({ items: [{ id: 'aqz-KE-bpKQ', title: 'a', channel: 'b', duration: 45, live: false, short: true }, { id: 'dQw4w9WgXcQ', title: 'c', channel: 'd', duration: 50, live: false, short: 'yes' }] });
    expect('items' in answer && answer.items.map((i) => i.short)).toEqual([true, undefined]);
  });
});

describe('Discover pools and "more like this" (0.9.91.17)', () => {
  it('knows its pool kinds and their categories', () => {
    expect(isPoolKind('music')).toBe(true);
    expect(isPoolKind('cats')).toBe(false);
    expect(POOL_CATEGORY.popular).toBeNull();
    expect(POOL_CATEGORY.animals).toBe('15');
  });
  it('uses the same UTC day for every room', () => {
    const w = poolWindow(Date.UTC(2026, 9, 31, 23, 59));
    expect(w.day).toBe('2026-10-31');
    expect(w.publishedAfter).toBe('2026-10-17T00:00:00Z');
    expect(poolWindow(Date.UTC(2026, 9, 31, 0, 1)).day).toBe('2026-10-31');
  });
  it('reads videos.list items like search results (shape and duration)', () => {
    const body = {
      items: [
        { id: 'aaaaaaaaaaa', snippet: { title: 'Up &amp; down', channelTitle: 'Ch' }, contentDetails: { duration: 'PT45S' }, player: { embedWidth: '56', embedHeight: '100' } },
        { id: 'bbbbbbbbbbb', snippet: { title: 'Wide', channelTitle: 'Ch' }, contentDetails: { duration: 'PT45S' }, player: { embedWidth: 100, embedHeight: 56 } },
        { id: 'bad id', snippet: { title: 'x' } },
      ],
    };
    const items = parseVideoItems(body);
    expect(items.map((i) => i.id)).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb']);
    expect(items[0]).toMatchObject({ title: 'Up & down', duration: 45, short: true });
    expect(items[1]!.short).toBeUndefined();
  });
  it('takes plain words from a title', () => {
    expect(titleWords('Funniest cat ever 😂 #shorts #cats @someone')).toBe('Funniest cat ever');
    expect(titleWords('Kediler çok komik! Bölüm 2', 3)).toBe('Kediler çok komik');
    expect(titleWords('#shorts 😂')).toBeNull();
  });
});

// Card FC1: the country really reaches the request, with its own language, and words + kind + country combine.
describe('feedSearchParams (FC1)', () => {
  it('a Japan Shorts pool asks in Japanese, ordered by views (not the page language)', () => {
    const p = feedSearchParams({ shape: 'shorts', region: 'JP', pageLang: 'tr', pool: 'popular', publishedAfter: '2026-11-03T00:00:00Z' });
    expect(p).toEqual({ q: '#shorts', regionCode: 'JP', relevanceLanguage: 'ja', videoDuration: 'short', order: 'viewCount', publishedAfter: '2026-11-03T00:00:00Z' });
  });
  it('each spot-check country gets its language', () => {
    const langOf = (region: string) => feedSearchParams({ shape: 'shorts', region, pageLang: 'en' }).relevanceLanguage;
    expect(['JP', 'TR', 'US', 'BR', 'DE'].map(langOf)).toEqual(['ja', 'tr', 'en', 'pt', 'de']);
    expect(langOf('IN')).toBe('hi');
    expect(langOf('ZZ')).toBe('en');
  });
  it('the world has no regionCode and keeps the page language', () => {
    const p = feedSearchParams({ shape: 'shorts', region: 'world', pageLang: 'tr' });
    expect(p.regionCode).toBeUndefined();
    expect(p.relevanceLanguage).toBe('tr');
  });
  it('Japan + "hay": Japanese Shorts about hay, by relevance', () => {
    const p = feedSearchParams({ shape: 'shorts', words: 'hay', region: 'JP', pageLang: 'tr' });
    expect(p).toEqual({ q: 'hay #shorts', regionCode: 'JP', relevanceLanguage: 'ja', videoDuration: 'short' });
  });
  it('Popular + Japan + "hay": the most viewed of those', () => {
    const p = feedSearchParams({ shape: 'shorts', words: 'hay', region: 'JP', pageLang: 'en', pool: 'popular' });
    expect(p.order).toBe('viewCount');
    expect(p.videoCategoryId).toBeUndefined();
    expect(p.q).toBe('hay #shorts');
  });
  it('Music + Brazil + words: the music category, relevance order; videos have no Shorts filter', () => {
    const p = feedSearchParams({ shape: 'videos', words: 'samba', region: 'BR', pageLang: 'en', pool: 'music' });
    expect(p).toEqual({ q: 'samba', regionCode: 'BR', relevanceLanguage: 'pt', videoCategoryId: '10' });
  });
  it('a kind without words is ordered by views (that kind\'s chart)', () => {
    expect(feedSearchParams({ shape: 'shorts', region: 'DE', pageLang: 'en', pool: 'animals' })).toMatchObject({ videoCategoryId: '15', order: 'viewCount', relevanceLanguage: 'de' });
  });
});
