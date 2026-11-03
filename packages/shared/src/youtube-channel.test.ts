import { describe, expect, it } from 'vitest';
import { channelParam, isPoolRegionChoice, parseChannelInput, parseChannelParam, poolRegion } from './youtube-search.ts';

const ID = 'UCabcdefghijklmnopqrstuv';

describe('channel input (card 10)', () => {
  it('reads links, @handles and ids', () => {
    expect(parseChannelInput('@SomeChannel')).toEqual({ handle: 'SomeChannel' });
    expect(parseChannelInput('https://www.youtube.com/@some.channel/shorts')).toEqual({ handle: 'some.channel' });
    expect(parseChannelInput('youtube.com/@abc')).toEqual({ handle: 'abc' });
    expect(parseChannelInput('https://m.youtube.com/channel/' + ID + '/videos')).toEqual({ id: ID });
    expect(parseChannelInput(ID)).toEqual({ id: ID });
  });

  it('leaves words, other sites and bad handles alone', () => {
    expect(parseChannelInput('cute cats')).toBeNull();
    expect(parseChannelInput('https://example.com/@cats')).toBeNull();
    expect(parseChannelInput('@a')).toBeNull();
    expect(parseChannelInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseChannelInput('https://www.youtube.com/c/legacy')).toBeNull();
  });

  it('round-trips the query value and refuses anything else', () => {
    expect(parseChannelParam(channelParam({ handle: 'x_y.z' }))).toEqual({ handle: 'x_y.z' });
    expect(parseChannelParam(channelParam({ id: ID }))).toEqual({ id: ID });
    expect(parseChannelParam('@<script>')).toBeNull();
    expect(parseChannelParam('cats')).toBeNull();
  });
});

describe('Discover region (card 10)', () => {
  it('validates the choice', () => {
    expect(isPoolRegionChoice('auto')).toBe(true);
    expect(isPoolRegionChoice('world')).toBe(true);
    expect(isPoolRegionChoice('DE')).toBe(true);
    expect(isPoolRegionChoice('de')).toBe(false);
    expect(isPoolRegionChoice('ZZ')).toBe(false);
  });

  it('uses the connection country for auto, with a fallback', () => {
    expect(poolRegion('auto', 'NL', 'en')).toBe('NL');
    expect(poolRegion('auto', undefined, 'en')).toBe('US');
    expect(poolRegion('auto', 'XX', 'tr')).toBe('TR');
    expect(poolRegion('auto', 'T1', 'en')).toBe('US');
    expect(poolRegion('JP', 'NL', 'tr')).toBe('JP');
    expect(poolRegion('world', 'NL', 'tr')).toBe('world');
  });
});
