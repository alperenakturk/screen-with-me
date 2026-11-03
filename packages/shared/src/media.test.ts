import { describe, expect, it } from 'vitest';
import { isTikTokHop, isTikTokShortLink, parseMediaInput, parseMediaList, parseTikTok, parseVimeo, sameMedia, samePage } from './media.ts';
import { cleanMedia, countdownMedia, isValidMedia, maxRateFor } from './protocol.ts';

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

describe('TikTok links (0.9.91.18)', () => {
  it('reads video links, with the @handle when there is one', () => {
    expect(parseMediaInput('https://www.tiktok.com/@scout2015/video/6718335390845095173')).toEqual({ kind: 'tiktok', id: '6718335390845095173', user: 'scout2015' });
    expect(parseMediaInput('tiktok.com/@a.b_c/video/7234567890123456789?is_from_webapp=1&sender_device=pc')).toEqual({ kind: 'tiktok', id: '7234567890123456789', user: 'a.b_c' });
    expect(parseMediaInput('https://m.tiktok.com/v/6718335390845095173.html')).toEqual({ kind: 'tiktok', id: '6718335390845095173' });
    expect(parseMediaInput('https://www.tiktok.com/embed/v2/6718335390845095173')).toEqual({ kind: 'tiktok', id: '6718335390845095173' });
    expect(parseMediaInput('https://www.tiktok.com/player/v1/6718335390845095173')).toEqual({ kind: 'tiktok', id: '6718335390845095173' });
  });
  it('never turns other TikTok pages into film pages', () => {
    expect(parseMediaInput('https://www.tiktok.com/@scout2015')).toBeNull();
    expect(parseMediaInput('https://www.tiktok.com/foryou')).toBeNull();
  });
  it('knows short share links (the server resolves them)', () => {
    expect(isTikTokShortLink('https://vm.tiktok.com/ZMabc123/')).toBe(true);
    expect(isTikTokShortLink('vt.tiktok.com/ZSxyz789')).toBe(true);
    expect(isTikTokShortLink('https://vm.tiktok.com/')).toBe(false);
    expect(isTikTokShortLink('https://evil.com/vm.tiktok.com/ZMabc123')).toBe(false);
    expect(parseTikTok(new URL('https://www.tiktok.com/@x/video/7000000000000000001'))).toEqual({ kind: 'tiktok', id: '7000000000000000001', user: 'x' });
  });
  it('compares and lists TikTok links like the others', () => {
    expect(sameMedia({ kind: 'tiktok', id: '7000000000000000001' }, { kind: 'tiktok', id: '7000000000000000001', user: 'x' })).toBe(true);
    expect(sameMedia({ kind: 'tiktok', id: '7000000000000000001' }, { kind: 'youtube', id: 'dQw4w9WgXcQ' })).toBe(false);
    const list = parseMediaList('https://www.tiktok.com/@a/video/7000000000000000001 https://youtu.be/dQw4w9WgXcQ');
    expect(list.media.map((m) => m.kind)).toEqual(['tiktok', 'youtube']);
  });
  it('validates TikTok media and its speed', () => {
    expect(isValidMedia({ kind: 'tiktok', id: '123' })).toBe(false);
    expect(cleanMedia({ kind: 'tiktok', id: '7000000000000000001', user: 'bad user!' })).toEqual({ kind: 'tiktok', id: '7000000000000000001' });
    expect(maxRateFor({ kind: 'tiktok', id: '7000000000000000001' })).toBe(1);
    expect(maxRateFor({ kind: 'youtube', id: 'dQw4w9WgXcQ' })).toBe(2);
  });
});

describe('Vimeo links (card P1)', () => {
  it('reads video links, with the unlisted hash when there is one', () => {
    expect(parseMediaInput('https://vimeo.com/76979871')).toEqual({ kind: 'vimeo', id: '76979871' });
    expect(parseMediaInput('vimeo.com/76979871/')).toEqual({ kind: 'vimeo', id: '76979871' });
    expect(parseMediaInput('https://www.vimeo.com/76979871?share=copy')).toEqual({ kind: 'vimeo', id: '76979871' });
    expect(parseMediaInput('https://vimeo.com/123456789/abcdef1234')).toEqual({ kind: 'vimeo', id: '123456789', hash: 'abcdef1234' });
    expect(parseMediaInput('https://vimeo.com/channels/staffpicks/76979871')).toEqual({ kind: 'vimeo', id: '76979871' });
    expect(parseMediaInput('https://vimeo.com/groups/shortfilms/videos/76979871')).toEqual({ kind: 'vimeo', id: '76979871' });
    expect(parseMediaInput('https://vimeo.com/showcase/1234/video/76979871')).toEqual({ kind: 'vimeo', id: '76979871' });
    expect(parseMediaInput('https://player.vimeo.com/video/76979871')).toEqual({ kind: 'vimeo', id: '76979871' });
    expect(parseMediaInput('https://player.vimeo.com/video/123456789?h=abcdef1234&badge=0')).toEqual({ kind: 'vimeo', id: '123456789', hash: 'abcdef1234' });
    expect(parseVimeo(new URL('https://evil.com/76979871'))).toBeNull();
  });
  it('leaves other Vimeo pages as film pages', () => {
    expect(parseMediaInput('https://vimeo.com/staffpicks')?.kind).toBe('page');
    expect(parseMediaInput('https://vimeo.com/showcase/1234')?.kind).toBe('page');
    expect(parseMediaInput('https://vimeo.com/123/not-a-hash!')?.kind).toBe('page');
  });
  it('is validated, compared, listed, 1× and counted down like a normal video', () => {
    expect(cleanMedia({ kind: 'vimeo', id: '76979871', hash: 'abcdef12', extra: 1 })).toEqual({ kind: 'vimeo', id: '76979871', hash: 'abcdef12' });
    expect(cleanMedia({ kind: 'vimeo', id: '76979871', hash: '<script>' })).toEqual({ kind: 'vimeo', id: '76979871' });
    expect(isValidMedia({ kind: 'vimeo', id: 'abc' })).toBe(false);
    expect(isValidMedia({ kind: 'vimeo', id: '1234567890123' })).toBe(false);
    expect(sameMedia({ kind: 'vimeo', id: '1' }, { kind: 'vimeo', id: '1', hash: 'abcdef' })).toBe(true);
    expect(sameMedia({ kind: 'vimeo', id: '1' }, { kind: 'tiktok', id: '1' })).toBe(false);
    expect(parseMediaList('https://vimeo.com/1 vimeo.com/2 https://youtu.be/dQw4w9WgXcQ').media).toHaveLength(3);
    expect(maxRateFor({ kind: 'vimeo', id: '1' })).toBe(1);
    expect(countdownMedia({ kind: 'vimeo', id: '1' })).toBe(true);
  });
});

describe('isTikTokHop', () => {
  it('follows only https TikTok addresses on the default port without user-info', () => {
    expect(isTikTokHop(new URL('https://www.tiktok.com/@a/video/123'))).toBe(true);
    expect(isTikTokHop(new URL('https://vm.tiktok.com/ZMabc/'))).toBe(true);
    expect(isTikTokHop(new URL('http://www.tiktok.com/@a/video/123'))).toBe(false);
    expect(isTikTokHop(new URL('https://www.tiktok.com:8443/x'))).toBe(false);
    expect(isTikTokHop(new URL('https://user:pw@www.tiktok.com/x'))).toBe(false);
    expect(isTikTokHop(new URL('https://tiktok.com.evil.example/x'))).toBe(false);
    expect(isTikTokHop(new URL('https://nottiktok.com/x'))).toBe(false);
  });
});
