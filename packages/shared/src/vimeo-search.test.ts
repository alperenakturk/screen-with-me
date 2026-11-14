import { describe, expect, it } from 'vitest';
import { VIMEO_RESULTS, cleanVimeoThumb, parseVimeoAnswer, parseVimeoSearch, vimeoSearchUrl } from './vimeo-search.ts';

const video = (id: number, extra: Record<string, unknown> = {}) => ({
  uri: `/videos/${id}`,
  name: `Video ${id}`,
  duration: 125,
  user: { name: 'Studio' },
  privacy: { view: 'anybody', embed: 'public' },
  is_playable: true,
  pictures: {
    sizes: [
      { width: 100, link: `https://i.vimeocdn.com/video/${id}-a?mw=100` },
      { width: 295, link: `https://i.vimeocdn.com/video/${id}-a?mw=295` },
      { width: 1280, link: `https://i.vimeocdn.com/video/${id}-a?mw=1280` },
    ],
  },
  ...extra,
});

describe('Vimeo search (card SRC1)', () => {
  it('the API address holds the words and the fields, never a token', () => {
    const url = new URL(vimeoSearchUrl('big buck bunny'));
    expect(url.origin).toBe('https://api.vimeo.com');
    expect(url.pathname).toBe('/videos');
    expect(url.searchParams.get('query')).toBe('big buck bunny');
    expect(url.searchParams.get('fields')).toContain('privacy.embed');
    expect(url.toString()).not.toMatch(/token|access/i);
  });

  it('keeps only public, embeddable, playable videos with our fields', () => {
    const items = parseVimeoSearch({
      data: [
        video(1),
        video(2, { privacy: { view: 'unlisted', embed: 'public' } }),
        video(3, { privacy: { view: 'anybody', embed: 'whitelist' } }),
        video(4, { is_playable: false }),
        video(5, { uri: '/users/5' }),
        video(6, { name: '' }),
        video(1),
        video(7, { duration: 0, user: {}, pictures: null, secret: 'x', link: 'https://vimeo.com/7' }),
      ],
    });
    expect(items.map((i) => i.id)).toEqual(['1', '7']);
    expect(items[0]).toEqual({ id: '1', title: 'Video 1', user: 'Studio', duration: 125, thumb: 'https://i.vimeocdn.com/video/1-a?mw=295' });
    expect(items[1]).toEqual({ id: '7', title: 'Video 7', user: '', duration: null, thumb: null });
    expect(Object.keys(items[1]!).sort()).toEqual(['duration', 'id', 'thumb', 'title', 'user']);
  });

  it('caps the count and the text lengths; strange answers give nothing', () => {
    const many = parseVimeoSearch({ data: Array.from({ length: 40 }, (_, i) => video(i + 1, { name: 'x'.repeat(500), user: { name: 'y'.repeat(500) } })) });
    expect(many).toHaveLength(VIMEO_RESULTS);
    expect(many[0]!.title).toHaveLength(200);
    expect(many[0]!.user).toHaveLength(80);
    expect(parseVimeoSearch(null)).toEqual([]);
    expect(parseVimeoSearch({ data: 'no' })).toEqual([]);
  });

  it('thumbnails only from https://i.vimeocdn.com', () => {
    expect(cleanVimeoThumb('https://i.vimeocdn.com/video/1-a?mw=295')).toBe('https://i.vimeocdn.com/video/1-a?mw=295');
    expect(cleanVimeoThumb('http://i.vimeocdn.com/video/1')).toBeNull();
    expect(cleanVimeoThumb('https://evil.example/video/1')).toBeNull();
    expect(cleanVimeoThumb('https://i.vimeocdn.com.evil.example/x')).toBeNull();
    expect(cleanVimeoThumb('https://user:pw@i.vimeocdn.com/x')).toBeNull();
    expect(cleanVimeoThumb('javascript:alert(1)')).toBeNull();
  });

  it('the page checks our answer: errors pass, bad items drop, junk is "failed"', () => {
    expect(parseVimeoAnswer({ error: 'off' })).toEqual({ error: 'off' });
    expect(parseVimeoAnswer({ error: 'quota' })).toEqual({ error: 'failed' });
    expect(parseVimeoAnswer('nope')).toEqual({ error: 'failed' });
    const answer = parseVimeoAnswer({
      items: [
        { id: '12', title: 'Fine', user: 'A', duration: 61.4, thumb: 'https://i.vimeocdn.com/x' },
        { id: '12abc', title: 'Bad id' },
        { id: '13', title: '' },
        { id: '14', title: 'Odd thumb', thumb: 'https://other.example/x', duration: -3 },
      ],
    });
    expect(answer).toEqual({
      items: [
        { id: '12', title: 'Fine', user: 'A', duration: 61, thumb: 'https://i.vimeocdn.com/x' },
        { id: '14', title: 'Odd thumb', user: '', duration: null, thumb: null },
      ],
    });
  });
});
