import { describe, expect, it } from 'vitest';
import { parseMediaInput, sameMedia, samePage } from './media.ts';

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
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['  dQw4w9WgXcQ  ', 'dQw4w9WgXcQ'],
  ])('%s → YouTube %s', (input, id) => {
    expect(parseMediaInput(input)).toEqual({ kind: 'youtube', id });
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
