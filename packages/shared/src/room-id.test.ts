import { describe, expect, it } from 'vitest';
import { extractRoomId, newRoomId, pageInviteUrl, roomIdFromHash } from './room-id.ts';

describe('room ids', () => {
  it('generates valid, unambiguous ids', () => {
    for (let i = 0; i < 50; i++) {
      const id = newRoomId();
      expect(id).toMatch(/^[a-km-np-z2-9]{10}$/);
      expect(extractRoomId(id)).toBe(id);
    }
  });

  it.each([
    ['https://screen-with-me.swm-server.workers.dev/r/abc12345', 'abc12345'],
    ['screen-with-me.swm-server.workers.dev/r/abc12345?x=1', 'abc12345'],
    ['https://film.example/izle#swm=abc12345', 'abc12345'],
    ['  abc12345 ', 'abc12345'],
  ])('extracts the room from %s', (input, id) => {
    expect(extractRoomId(input)).toBe(id);
  });

  it.each(['', 'a b', 'https://x.example/r/<script>', 'abc'])('rejects %j', (input) => {
    expect(extractRoomId(input)).toBeNull();
  });
});

describe('page invites', () => {
  it('puts the room in the #fragment, replacing any existing one', () => {
    expect(pageInviteUrl('https://film.example/izle?ep=3#t=40', 'abc12345')).toBe('https://film.example/izle?ep=3#swm=abc12345');
  });

  it('reads the room back from the fragment', () => {
    expect(roomIdFromHash('#swm=abc12345')).toBe('abc12345');
    expect(roomIdFromHash('#t=40&swm=abc12345')).toBe('abc12345');
    expect(roomIdFromHash('#swm=no')).toBeNull();
    expect(roomIdFromHash('#other=1')).toBeNull();
  });
});
