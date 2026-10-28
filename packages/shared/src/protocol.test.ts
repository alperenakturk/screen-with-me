import { describe, expect, it } from 'vitest';
import { AVATAR_PAGES, AVATAR_TABS, DRAWN_AVATARS, avatarPageOf, avatarText, cleanChatText, expectedPosition, parseClientMessage, type PlaybackState } from './protocol.ts';

const playing: PlaybackState = {
  item: { id: 'a1', media: { kind: 'youtube', id: 'dQw4w9WgXcQ' }, title: null, by: 'Ali' },
  paused: false,
  position: 10,
  rate: 1,
  updatedAt: 1_000_000,
};

describe('expectedPosition', () => {
  it('advances while playing, scaled by rate', () => {
    expect(expectedPosition(playing, 1_002_000)).toBe(12);
    expect(expectedPosition({ ...playing, rate: 2 }, 1_002_000)).toBe(14);
  });

  it('stays put while paused', () => {
    expect(expectedPosition({ ...playing, paused: true }, 1_009_000)).toBe(10);
  });
});

describe('parseClientMessage', () => {
  const parse = (m: unknown) => parseClientMessage(JSON.stringify(m));

  it('accepts valid messages and cleans names', () => {
    expect(parse({ t: 'hello', v: 2, name: '  Ali   Veli ' })).toEqual({ t: 'hello', v: 2, name: 'Ali Veli' });
    expect(parse({ t: 'seek', position: 3.5, at: 123 })).toEqual({ t: 'seek', position: 3.5, at: 123 });
    expect(parse({ t: 'enqueue', media: { kind: 'youtube', id: 'dQw4w9WgXcQ' } })).toEqual({
      t: 'enqueue',
      media: { kind: 'youtube', id: 'dQw4w9WgXcQ' },
    });
    expect(parse({ t: 'move', id: 'abc', to: 3 })).toEqual({ t: 'move', id: 'abc', to: 3 });
    expect(parse({ t: 'next', from: 'abc' })).toEqual({ t: 'next', from: 'abc' });
    expect(parse({ t: 'react', emoji: '🔥' })).toEqual({ t: 'react', emoji: '🔥' });
    expect(parse({ t: 'chat', text: ' selam\n\nnasılsın ' })).toEqual({ t: 'chat', text: 'selam nasılsın' });
  });

  it('lets large connection offers through for voice and live streams only', () => {
    const sdp = 'v=0\r\n' + 'a=x\r\n'.repeat(1500);
    for (const t of ['signal', 'live-signal']) {
      expect(parse({ t, to: 'abc12345', data: { sdp: { type: 'offer', sdp } } })).toEqual({ t, to: 'abc12345', data: { sdp: { type: 'offer', sdp } } });
    }
    expect(parse({ t: 'chat', text: 'x'.repeat(5000) })).toBeNull();
  });

  it('keeps the optional ad flag on ready messages', () => {
    expect(parse({ t: 'ready', ready: false, ad: true })).toEqual({ t: 'ready', ready: false, ad: true });
    expect(parse({ t: 'ready', ready: true })).toEqual({ t: 'ready', ready: true });
    expect(parse({ t: 'ready', ready: true, ad: 'evet' })).toEqual({ t: 'ready', ready: true });
  });

  it('accepts pages with a cleaned title, and drops titles for other media', () => {
    expect(parse({ t: 'load', media: { kind: 'page', url: 'https://film.example/izle' }, title: '  Film\n  İzle ' })).toEqual({
      t: 'load',
      media: { kind: 'page', url: 'https://film.example/izle' },
      title: 'Film İzle',
    });
    expect(parse({ t: 'load', media: { kind: 'youtube', id: 'dQw4w9WgXcQ' }, title: 'fake' })).toEqual({
      t: 'load',
      media: { kind: 'youtube', id: 'dQw4w9WgXcQ' },
    });
    expect(parse({ t: 'load', media: { kind: 'page', url: 'chrome://settings' } })).toBeNull();
  });

  it('validates voice and rtc messages (only rtc may carry a big SDP)', () => {
    expect(parse({ t: 'voice', on: true, mic: true, track: 'a1b2' })).toEqual({ t: 'voice', on: true, mic: true, track: 'a1b2' });
    expect(parse({ t: 'voice', on: 'yes' })).toBeNull();
    expect(parse({ t: 'voice', on: false, track: '../x' })).toEqual({ t: 'voice', on: false });
    const sdp = 'v=0\r\n' + 'a=x\r\n'.repeat(1500);
    expect(parse({ t: 'rtc', id: 1, op: 'publish', sdp, mid: '0', track: 'mic1' })).toMatchObject({ op: 'publish', mid: '0' });
    expect(parse({ t: 'rtc', id: 2, op: 'publish', sdp: 'hello', mid: '0', track: 'mic1' })).toBeNull();
    expect(parse({ t: 'rtc', id: 3, op: 'pull', from: 'abc12345' })).toEqual({ t: 'rtc', id: 3, op: 'pull', from: 'abc12345' });
    expect(parse({ t: 'rtc', id: 0, op: 'session' })).toBeNull();
    expect(parse({ t: 'rtc', id: 4, op: 'close', mids: ['1', 'x y'] })).toEqual({ t: 'rtc', id: 4, op: 'close', mids: ['1'] });
    expect(parse({ t: 'signal', to: 'abc12345', data: { sdp: { type: 'offer', sdp } } })).toMatchObject({ t: 'signal', to: 'abc12345' });
    expect(parse({ t: 'signal', to: 'abc12345', data: { candidate: { candidate: 'candidate:1 1 udp 1 1.2.3.4 5 typ host', sdpMid: '0', sdpMLineIndex: 0, evil: 1 } } })).toEqual({
      t: 'signal',
      to: 'abc12345',
      data: { candidate: { candidate: 'candidate:1 1 udp 1 1.2.3.4 5 typ host', sdpMid: '0', sdpMLineIndex: 0 } },
    });
    expect(parse({ t: 'signal', to: 'abc12345', data: { sdp: { type: 'pranswer', sdp } } })).toBeNull();
    expect(parse({ t: 'signal', to: 'abc12345', data: { html: '<b>' } })).toBeNull();
    // Büyük ama rtc olmayan mesaj hâlâ reddedilir.
    expect(parse({ t: 'chat', text: 'a'.repeat(6000) })).toBeNull();
  });

  it('accepts only the listed emoji gaps and the home message', () => {
    expect(parse({ t: 'settings', reactionGap: 3 })).toEqual({ t: 'settings', reactionGap: 3 });
    expect(parse({ t: 'settings', reactionGap: 7 })).toBeNull();
    expect(parse({ t: 'settings', reactionGap: '3' })).toBeNull();
    expect(parse({ t: 'home', extra: 'x' })).toEqual({ t: 'home' });
  });

  it('accepts a known avatar and silently drops an unknown one', () => {
    expect(parse({ t: 'hello', v: 3, name: 'Ali', avatar: 'elf' })).toEqual({ t: 'hello', v: 3, name: 'Ali', avatar: 'elf' });
    expect(parse({ t: 'hello', v: 3, name: 'Ali', avatar: '<img src=x>' })).toEqual({ t: 'hello', v: 3, name: 'Ali' });
  });

  it('accepts rename, kick and a valid client id', () => {
    expect(parse({ t: 'hello', v: 3, name: 'Ali', cid: 'abcd1234efgh' })).toEqual({ t: 'hello', v: 3, name: 'Ali', cid: 'abcd1234efgh' });
    expect(parse({ t: 'hello', v: 3, name: 'Ali', cid: 'x' })).toEqual({ t: 'hello', v: 3, name: 'Ali' });
    expect(parse({ t: 'rename', name: ' Veli ', avatar: 'dwarf' })).toEqual({ t: 'rename', name: 'Veli', avatar: 'dwarf' });
    expect(parse({ t: 'rename', name: '' })).toBeNull();
    expect(parse({ t: 'kick', id: 'abc12345' })).toEqual({ t: 'kick', id: 'abc12345' });
    expect(parse({ t: 'kick', id: '../x' })).toBeNull();
    expect(parse({ t: 'unban', id: 'abc12345' })).toEqual({ t: 'unban', id: 'abc12345' });
    expect(parse({ t: 'unban', id: 42 })).toBeNull();
  });

  it('accepts drawn avatars from every avatar page, and shows them as emoji in text', () => {
    expect(parse({ t: 'rename', name: 'Ali', avatar: 'wizard' })).toEqual({ t: 'rename', name: 'Ali', avatar: 'wizard' });
    expect(parse({ t: 'rename', name: 'Ali', avatar: 'swordsman' })).toEqual({ t: 'rename', name: 'Ali', avatar: 'swordsman' });
    expect(parse({ t: 'rename', name: 'Ali', avatar: 'speedster' })).toEqual({ t: 'rename', name: 'Ali', avatar: 'speedster' });
    expect(parse({ t: 'rename', name: 'Ali', avatar: 'toString' })).toEqual({ t: 'rename', name: 'Ali' });
    expect(avatarText('wizard')).toBe('🧙');
    expect(avatarText('🦊')).toBe('🦊');
    expect(avatarText(undefined)).toBe('');
  });

  it('puts every drawn avatar on exactly one page, and every tab page exists', () => {
    const all = AVATAR_PAGES.flat() as readonly string[];
    for (const id of Object.keys(DRAWN_AVATARS)) expect(all.filter((a) => a === id)).toHaveLength(1);
    expect(new Set(all).size).toBe(all.length);
    expect(AVATAR_TABS.flatMap((tab) => tab.pages).sort()).toEqual(AVATAR_PAGES.map((_, i) => i));
    expect(avatarPageOf('chemist')).toBe(2);
    expect(avatarPageOf('cavecreature')).toBe(1);
    expect(avatarPageOf('airmonk')).toBe(3);
    expect(avatarPageOf('nope')).toBe(0);
  });

  it('accepts partial settings (host modes, schedule) and votes', () => {
    expect(parse({ t: 'settings', waitForAll: false })).toEqual({ t: 'settings', waitForAll: false });
    expect(parse({ t: 'settings', hostOnly: true, lockQueue: false })).toEqual({ t: 'settings', hostOnly: true, lockQueue: false });
    expect(parse({ t: 'settings', startsAt: 1_900_000_000_000 })).toEqual({ t: 'settings', startsAt: 1_900_000_000_000 });
    expect(parse({ t: 'settings', startsAt: null })).toEqual({ t: 'settings', startsAt: null });
    expect(parse({ t: 'settings', hostOnly: 'yes' })).toBeNull();
    expect(parse({ t: 'settings' })).toBeNull();
    expect(parse({ t: 'vote', id: 'abc123def456', up: true })).toEqual({ t: 'vote', id: 'abc123def456', up: true });
    expect(parse({ t: 'vote', id: 'abc123def456' })).toBeNull();
  });

  it('accepts starting a known in-room game or ending it, nothing else', () => {
    expect(parse({ t: 'game', kind: 'draw', id: 'x' })).toEqual({ t: 'game', kind: 'draw' });
    expect(parse({ t: 'game', end: true, kind: 'xox' })).toEqual({ t: 'game', end: true });
    expect(parse({ t: 'game', kind: 'chess' })).toBeNull();
    expect(parse({ t: 'game' })).toBeNull();
  });

  it('accepts the built-in sync test as media', () => {
    expect(parse({ t: 'load', media: { kind: 'test', url: 'ignored' } })).toEqual({ t: 'load', media: { kind: 'test' } });
  });

  it('accepts pins with an optional, cleaned and shortened note', () => {
    expect(parse({ t: 'pin' })).toEqual({ t: 'pin' });
    expect(parse({ t: 'pin', note: '  burayı	 anlamadım ' })).toEqual({ t: 'pin', note: 'burayı anlamadım' });
    expect(parse({ t: 'pin', note: 'x'.repeat(200) })).toEqual({ t: 'pin', note: 'x'.repeat(60) });
    expect(parse({ t: 'pin', note: 42 })).toEqual({ t: 'pin' });
    expect(parse({ t: 'unpin', id: 'abc123def456' })).toEqual({ t: 'unpin', id: 'abc123def456' });
    expect(parse({ t: 'unpin', id: '<script>' })).toBeNull();
  });

  it('accepts emojis from every reaction page, nothing else', () => {
    expect(parse({ t: 'react', emoji: '😂' })).toEqual({ t: 'react', emoji: '😂' });
    expect(parse({ t: 'react', emoji: '💩' })).toEqual({ t: 'react', emoji: '💩' });
    expect(parse({ t: 'react', emoji: '👻' })).toEqual({ t: 'react', emoji: '👻' });
    expect(parse({ t: 'react', emoji: '🍕' })).toBeNull();
  });

  it('accepts real-sized stickers but keeps other messages small', () => {
    // 160 px webp ya da küçük bir GIF birkaç on KB eder; genel 4 KB sınırına takılmamalı.
    const data = 'data:image/webp;base64,' + 'A'.repeat(50_000);
    expect(parse({ t: 'sticker-add', data })).toEqual({ t: 'sticker-add', data });
    expect(parse({ t: 'sticker-add', data: 'data:image/gif;base64,' + 'A'.repeat(300_000) })).toBeNull();
    expect(parse({ t: 'chat', text: 'x', pad: 'A'.repeat(50_000) })).toBeNull();
  });

  it('accepts an image in chat (with or without text), but only raster data URLs of sticker size', () => {
    const image = 'data:image/webp;base64,' + 'A'.repeat(150_000);
    expect(parse({ t: 'chat', text: '', image })).toEqual({ t: 'chat', text: '', image });
    expect(parse({ t: 'chat', text: '  look  ', image })).toEqual({ t: 'chat', text: 'look', image });
    expect(parse({ t: 'chat', text: 'x', image: 'data:image/svg+xml;base64,AAAA' })).toBeNull();
    expect(parse({ t: 'chat', text: 'x', image: 'https://example.com/a.png' })).toBeNull();
    expect(parse({ t: 'chat', text: '', image: 'data:image/png;base64,' + 'A'.repeat(300_000) })).toBeNull();
    // Without an image, a chat message still needs text and stays small.
    expect(parse({ t: 'chat', text: '' })).toBeNull();
  });

  it('strips unknown fields from media', () => {
    expect(parse({ t: 'load', media: { kind: 'youtube', id: 'dQw4w9WgXcQ', evil: '<script>' } })).toEqual({
      t: 'load',
      media: { kind: 'youtube', id: 'dQw4w9WgXcQ' },
    });
  });

  it.each([
    'not json',
    '[]',
    JSON.stringify({ t: 'hello', v: 1, name: '   ' }),
    JSON.stringify({ t: 'seek', position: -1, at: 1 }),
    JSON.stringify({ t: 'seek', position: Number.MAX_VALUE, at: 1 }),
    JSON.stringify({ t: 'rate', rate: 16, position: 1, at: 1 }),
    JSON.stringify({ t: 'load', media: { kind: 'youtube', id: '<script>' } }),
    JSON.stringify({ t: 'load', media: { kind: 'html5', url: 'javascript:alert(1)' } }),
    JSON.stringify({ t: 'move', id: 'abc', to: 1.5 }),
    JSON.stringify({ t: 'move', id: 'abc', to: -1 }),
    JSON.stringify({ t: 'dequeue', id: '../../etc' }),
    JSON.stringify({ t: 'react', emoji: '🍕' }),
    JSON.stringify({ t: 'chat', text: '   ' }),
    JSON.stringify({ t: 'nuke' }),
    JSON.stringify({ t: 'hello', v: 1, name: 'x'.repeat(5000) }),
  ])('rejects %s', (raw) => {
    expect(parseClientMessage(raw)).toBeNull();
  });

  it('truncates long names and chat messages', () => {
    expect(parse({ t: 'hello', v: 1, name: 'x'.repeat(100) })).toEqual({ t: 'hello', v: 1, name: 'x'.repeat(32) });
    expect(cleanChatText('ğ'.repeat(400))).toBe('ğ'.repeat(300));
  });
});
