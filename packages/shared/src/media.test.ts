import { describe, expect, it } from 'vitest';
import { parseMediaInput, sameMedia } from './media.ts';

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
  });

  it.each(['', 'hello world', 'https://www.youtube.com/watch?v=short', 'https://www.youtube.com/', 'javascript:alert(1)'])(
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
