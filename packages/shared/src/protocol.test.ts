import { describe, expect, it } from 'vitest';
import { cleanChatText, expectedPosition, parseClientMessage, type PlaybackState } from './protocol.ts';

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

  it('accepts a known avatar and silently drops an unknown one', () => {
    expect(parse({ t: 'hello', v: 3, name: 'Ali', avatar: '🦊' })).toEqual({ t: 'hello', v: 3, name: 'Ali', avatar: '🦊' });
    expect(parse({ t: 'hello', v: 3, name: 'Ali', avatar: '<img src=x>' })).toEqual({ t: 'hello', v: 3, name: 'Ali' });
  });

  it('accepts rename, kick and a valid client id', () => {
    expect(parse({ t: 'hello', v: 3, name: 'Ali', cid: 'abcd1234efgh' })).toEqual({ t: 'hello', v: 3, name: 'Ali', cid: 'abcd1234efgh' });
    expect(parse({ t: 'hello', v: 3, name: 'Ali', cid: 'x' })).toEqual({ t: 'hello', v: 3, name: 'Ali' });
    expect(parse({ t: 'rename', name: ' Veli ', avatar: '🐼' })).toEqual({ t: 'rename', name: 'Veli', avatar: '🐼' });
    expect(parse({ t: 'rename', name: '' })).toBeNull();
    expect(parse({ t: 'kick', id: 'abc12345' })).toEqual({ t: 'kick', id: 'abc12345' });
    expect(parse({ t: 'kick', id: '../x' })).toBeNull();
    expect(parse({ t: 'unban', id: 'abc12345' })).toEqual({ t: 'unban', id: 'abc12345' });
    expect(parse({ t: 'unban', id: 42 })).toBeNull();
  });

  it('accepts emojis from every reaction page, nothing else', () => {
    expect(parse({ t: 'react', emoji: '😂' })).toEqual({ t: 'react', emoji: '😂' });
    expect(parse({ t: 'react', emoji: '💩' })).toEqual({ t: 'react', emoji: '💩' });
    expect(parse({ t: 'react', emoji: '👻' })).toEqual({ t: 'react', emoji: '👻' });
    expect(parse({ t: 'react', emoji: '🍕' })).toBeNull();
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
