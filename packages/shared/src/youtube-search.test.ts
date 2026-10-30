import { describe, expect, it } from 'vitest';
import {
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
