import { describe, expect, it } from 'vitest';
import { PODCAST_ART, cleanArt, parseDuration, parseEpisodesAnswer, parseFeed, parseItunesLookup, parseItunesSearch, parseShowsAnswer } from './podcasts.ts';

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"><channel>
<title>Night Radio</title>
<item><title><![CDATA[Episode 2: Stars & <b>moons</b>]]></title><pubDate>Tue, 03 Nov 2026 08:00:00 GMT</pubDate>
<enclosure url="https://cdn.example.com/ep2.mp3?x=1&amp;y=2" length="1" type="audio/mpeg"/><itunes:duration>1:02:03</itunes:duration></item>
<item><title>Episode 1 &#8211; Hello</title><pubDate>Mon, 02 Nov 2026 08:00:00 GMT</pubDate>
<enclosure type='audio/x-m4a' url='http://cdn.example.com/ep1.m4a'/><itunes:duration>300</itunes:duration></item>
<item><title>A video episode</title><enclosure url="https://cdn.example.com/ep0.mp4" type="video/mp4"/></item>
<item><title>No file</title></item>
<item><title>Bad link</title><enclosure url="javascript:alert(1)" type="audio/mpeg"/></item>
<item><enclosure url="https://cdn.example.com/notitle.mp3" type="audio/mpeg"/></item>
</channel></rss>`;

describe('Podcast feeds', () => {
  it('reads the newest audio episodes, decoding titles and links', () => {
    const episodes = parseFeed(FEED);
    expect(episodes).toEqual([
      { title: 'Episode 2: Stars & moons', url: 'https://cdn.example.com/ep2.mp3?x=1&y=2', duration: 3723, date: Date.UTC(2026, 10, 3, 8) },
      { title: 'Episode 1 – Hello', url: 'http://cdn.example.com/ep1.m4a', duration: 300, date: Date.UTC(2026, 10, 2, 8) },
    ]);
    expect(parseFeed(FEED, 1)).toHaveLength(1);
    expect(parseFeed('not xml')).toEqual([]);
  });

  it('durations in every shape podcasts use', () => {
    expect(parseDuration('1:02:03')).toBe(3723);
    expect(parseDuration('62:03')).toBe(3723);
    expect(parseDuration('3723')).toBe(3723);
    expect(parseDuration('soon')).toBe(0);
    expect(parseDuration(null)).toBe(0);
  });
});

describe('Apple’s answers', () => {
  const search = {
    results: [
      { collectionId: 123, collectionName: 'Night Radio', artistName: 'Some Host', feedUrl: 'https://feeds.example.com/night', artworkUrl600: 'https://is1-ssl.mzstatic.com/image/thumb/a/600x600bb.jpg' },
      { collectionId: 124, collectionName: 'No feed' },
      { collectionId: 125, collectionName: 'Bad art', feedUrl: 'https://f.example.com', artworkUrl600: 'https://evil.example.com/x.jpg' },
      { collectionId: 'x', collectionName: 'Bad id', feedUrl: 'https://f.example.com' },
    ],
  };
  it('search: shows with a feed, art only from Apple’s image servers', () => {
    expect(parseItunesSearch(search)).toEqual([
      { id: '123', title: 'Night Radio', author: 'Some Host', art: 'https://is1-ssl.mzstatic.com/image/thumb/a/600x600bb.jpg' },
      { id: '125', title: 'Bad art', author: '', art: null },
    ]);
    expect(parseItunesSearch(null)).toEqual([]);
    expect(cleanArt('https://a.mzstatic.com/x"onerror=1')).toBeNull();
  });
  it('lookup: the feed address', () => {
    expect(parseItunesLookup(search)).toEqual({ feed: 'https://feeds.example.com/night', title: 'Night Radio', art: 'https://is1-ssl.mzstatic.com/image/thumb/a/600x600bb.jpg' });
    expect(parseItunesLookup({ results: [{ feedUrl: 'file:///etc/passwd' }] })).toBeNull();
    expect(parseItunesLookup({ results: [] })).toBeNull();
  });
  it('the room keeps a poster only from Apple’s image servers, like PODCAST_ART', async () => {
    const { cleanMedia } = await import('./protocol.ts');
    const art = 'https://is1-ssl.mzstatic.com/image/thumb/a/600x600bb.jpg';
    expect(PODCAST_ART.test(art)).toBe(true);
    expect(cleanMedia({ kind: 'html5', url: 'https://a.b/e.mp3', poster: art })).toEqual({ kind: 'html5', url: 'https://a.b/e.mp3', poster: art });
    expect(cleanMedia({ kind: 'html5', url: 'https://a.b/e.mp3', poster: 'https://evil.example/x.jpg' })).toEqual({ kind: 'html5', url: 'https://a.b/e.mp3' });
    expect(cleanMedia({ kind: 'page', url: 'https://a.b/', poster: art })).toEqual({ kind: 'page', url: 'https://a.b/' });
  });

  it('the Worker’s answers are checked again on the page', () => {
    expect(parseShowsAnswer({ error: 'busy' })).toEqual({ error: 'busy' });
    expect(parseShowsAnswer({ items: [{ id: '1', title: 'A', art: 'https://x.com/a.jpg' }, { id: 'bad', title: 'B' }] })).toEqual({ items: [{ id: '1', title: 'A', author: '', art: null }] });
    expect(parseEpisodesAnswer({ error: 'none' })).toEqual({ error: 'none' });
    expect(parseEpisodesAnswer({ show: { title: 'S' }, items: [{ title: 'E', url: 'javascript:x' }, { title: 'F', url: 'https://a.b/f.mp3', duration: 5 }] })).toEqual({
      show: { title: 'S', art: null },
      items: [{ title: 'F', url: 'https://a.b/f.mp3', duration: 5, date: 0 }],
    });
    expect(parseEpisodesAnswer(7)).toEqual({ error: 'failed' });
  });
});
