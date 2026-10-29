import { describe, expect, it } from 'vitest';
import { parseMediaInput, parseMediaList, sameMedia, samePage } from './media.ts';

describe('samePage', () => {
  it('ignores the #fragment and a trailing slash', () => {
    expect(samePage('https://a.example/x/', 'https://a.example/x#swm=abcd')).toBe(true);
    expect(samePage('https://a.example/x?ep=1', 'https://a.example/x?ep=2')).toBe(false);
    expect(samePage('https://a.example/x', 'https://b.example/x')).toBe(false);
  });
});

describe('parseMediaInput', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=abc', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=xyz', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['  dQw4w9WgXcQ  ', 'dQw4w9WgXcQ'],
  ])('%s → YouTube %s', (input, id) => {
    expect(parseMediaInput(input)).toEqual({ kind: 'youtube', id });
  });

  it('marks Shorts links as vertical (short)', () => {
    expect(parseMediaInput('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toEqual({ kind: 'youtube', id: 'dQw4w9WgXcQ', short: true });
    expect(parseMediaInput('youtube.com/shorts/dQw4w9WgXcQ?feature=share')).toEqual({ kind: 'youtube', id: 'dQw4w9WgXcQ', short: true });
  });

  it('accepts direct video links', () => {
    expect(parseMediaInput('https://example.com/movie.mp4')).toEqual({
      kind: 'html5',
      url: 'https://example.com/movie.mp4',
    });
    expect(parseMediaInput('https://cdn.example.com/a/b/clip.WEBM?token=1')).toMatchObject({ kind: 'html5' });
  });

  it('treats any other web address as a page to watch with the extension', () => {
    expect(parseMediaInput('https://film-site.example/dizi/bolum-1')).toEqual({
      kind: 'page',
      url: 'https://film-site.example/dizi/bolum-1',
    });
    expect(parseMediaInput('film-site.example/izle')).toMatchObject({ kind: 'page', url: 'https://film-site.example/izle' });
  });

  it.each(['', 'hello world', 'merhaba', 'https://www.youtube.com/watch?v=short', 'https://www.youtube.com/', 'javascript:alert(1)', 'ftp://x.example/a'])(
    'rejects %j',
    (input) => {
      expect(parseMediaInput(input)).toBeNull();
    },
  );
});

describe('sameMedia', () => {
  it('compares by content', () => {
    expect(sameMedia({ kind: 'youtube', id: 'a' }, { kind: 'youtube', id: 'a' })).toBe(true);
    expect(sameMedia({ kind: 'youtube', id: 'a' }, { kind: 'youtube', id: 'b' })).toBe(false);
    expect(sameMedia(null, null)).toBe(true);
    expect(sameMedia(null, { kind: 'html5', url: 'x' })).toBe(false);
  });
});

describe('parseMediaList', () => {
  it('reads many links separated by spaces, new lines or commas', () => {
    const { media, skipped } = parseMediaList('https://youtu.be/aaaaaaaaaaa\nhttps://www.youtube.com/shorts/bbbbbbbbbbb, https://cdn.example/v.mp4');
    expect(media).toEqual([
      { kind: 'youtube', id: 'aaaaaaaaaaa' },
      { kind: 'youtube', id: 'bbbbbbbbbbb', short: true },
      { kind: 'html5', url: 'https://cdn.example/v.mp4' },
    ]);
    expect(skipped).toBe(0);
  });

  it('drops duplicates and film pages', () => {
    const { media, skipped } = parseMediaList('https://youtu.be/aaaaaaaaaaa https://youtu.be/aaaaaaaaaaa https://film.example/watch https://youtu.be/ccccccccccc');
    expect(media.map((m) => (m.kind === 'youtube' ? m.id : m.kind))).toEqual(['aaaaaaaaaaa', 'ccccccccccc']);
    expect(skipped).toBe(1);
  });

  it('keeps searches and single links out', () => {
    expect(parseMediaList('funny cats compilation').media).toEqual([]);
    expect(parseMediaList('programming javascript').media).toEqual([]);
    expect(parseMediaList('https://youtu.be/aaaaaaaaaaa').media).toEqual([]);
  });

  it('stops at the limit', () => {
    const ids = Array.from({ length: 40 }, (_, i) => `https://youtu.be/${String(i).padStart(11, 'x')}`);
    const { media, skipped } = parseMediaList(ids.join(' '));
    expect(media).toHaveLength(30);
    expect(skipped).toBe(10);
  });
});
