import { describe, expect, it } from 'vitest';
import { MOVE_MAX_CHARS, MOVE_VERSION, decodeMove, encodeMove, mergeMove, packMove, progressOf, type MoveKey } from './move.ts';
import { freshSnack, saveSnack } from './games/snack-bar.ts';
import { freshGarden, saveGarden } from './games/garden.ts';
import { freshFrames, saveFrames } from './games/five-frames.ts';

const store = (data: Partial<Record<string, string>>) => (key: MoveKey) => data[key] ?? null;
const snack = (lifetime: number) => saveSnack({ ...freshSnack(), lifetime, earned: lifetime, coins: lifetime });

describe('Move: pack and read', () => {
  it('packs only the allowed keys, versioned', () => {
    const blob = packMove(store({ snackBar: snack(5), name: 'Alex', other: 'x' } as Record<string, string>), 42);
    expect(blob).toEqual({ v: MOVE_VERSION, at: 42, items: { snackBar: snack(5), name: 'Alex' } });
    expect(decodeMove(encodeMove(blob))).toEqual(blob);
  });

  it('refuses anything that is not a move of this version, drops unknown keys', () => {
    for (const raw of [null, 5, '', '{', '[]', JSON.stringify({ v: 2, items: {} }), JSON.stringify({ v: 1 })]) expect(decodeMove(raw)).toBeNull();
    expect(decodeMove(JSON.stringify({ v: 1, at: 'x', items: { name: 'A', evil: 'x', avatar: 7, snackBar: '' } }))).toEqual({ v: 1, at: 0, items: { name: 'A' } });
    expect(decodeMove('x'.repeat(MOVE_MAX_CHARS + 1))).toBeNull();
  });

  it('drops the oldest emoji images when everything would be too big', () => {
    const image = `data:image/webp;base64,${'A'.repeat(200_000)}`;
    const images = Array.from({ length: 6 }, (_, i) => image + i);
    const blob = packMove(store({ stickerCollection: JSON.stringify(images), name: 'Alex' }));
    expect(encodeMove(blob).length).toBeLessThanOrEqual(MOVE_MAX_CHARS);
    const kept = JSON.parse(blob.items.stickerCollection!) as string[];
    expect(kept.length).toBe(4);
    expect(kept.at(-1)).toBe(images.at(-1));
    expect(blob.items.name).toBe('Alex');
  });
});

describe('Move: merge on the new device', () => {
  it('a game keeps the save that got further', () => {
    const here = store({ snackBar: snack(100) });
    expect(mergeMove(here, { v: 1, at: 0, items: { snackBar: snack(50) } })).toEqual({});
    expect(mergeMove(here, { v: 1, at: 0, items: { snackBar: snack(500) } })).toEqual({ snackBar: snack(500) });
    expect(mergeMove(store({}), { v: 1, at: 0, items: { snackBar: snack(0) } })).toEqual({ snackBar: snack(0) });
  });

  it('garden and Five Frames progress are compared too', () => {
    const g = freshGarden();
    g.album = { fern: 2 };
    expect(progressOf('windowGarden', saveGarden(g))).toBeGreaterThan(progressOf('windowGarden', saveGarden(freshGarden())));
    const f = freshFrames();
    f.stats.tr.played = 3;
    expect(mergeMove(store({ fiveFrames: saveFrames(freshFrames()) }), { v: 1, at: 0, items: { fiveFrames: saveFrames(f) } })).toEqual({ fiveFrames: saveFrames(f) });
    expect(progressOf('fiveFrames', null)).toBe(-1);
  });

  it('saved rooms are joined: no doubles, the newer name, mine kept, at most 20', () => {
    const here = JSON.stringify([{ id: 'abcd', name: 'Old name', at: 1, mine: true }, { id: 'zzzz', name: 'Z', at: 5 }]);
    const there = JSON.stringify([{ id: 'abcd', name: 'New name', at: 9 }, { id: 'qqqq', name: 'Q', at: 3 }, { id: '!!', name: 'bad', at: 1 }]);
    const out = mergeMove(store({ savedRooms: here }), { v: 1, at: 0, items: { savedRooms: there } });
    expect(JSON.parse(out.savedRooms!)).toEqual([
      { id: 'abcd', name: 'New name', at: 9, mine: true },
      { id: 'zzzz', name: 'Z', at: 5 },
      { id: 'qqqq', name: 'Q', at: 3 },
    ]);
    const many = JSON.stringify(Array.from({ length: 30 }, (_, i) => ({ id: `room${i}`, name: 'R', at: i })));
    expect(JSON.parse(mergeMove(store({}), { v: 1, at: 0, items: { savedRooms: many } }).savedRooms!)).toHaveLength(20);
  });

  it('the emoji collection is joined, only images, at most 12', () => {
    const a = JSON.stringify(['data:image/png;base64,AAA', 'data:image/png;base64,BBB']);
    const b = JSON.stringify(['data:image/png;base64,BBB', 'data:image/gif;base64,CCC', 'javascript:alert(1)']);
    expect(JSON.parse(mergeMove(store({ stickerCollection: a }), { v: 1, at: 0, items: { stickerCollection: b } }).stickerCollection!)).toEqual([
      'data:image/png;base64,AAA',
      'data:image/png;base64,BBB',
      'data:image/gif;base64,CCC',
    ]);
    const lots = JSON.stringify(Array.from({ length: 20 }, (_, i) => `data:image/png;base64,${i}`));
    expect(JSON.parse(mergeMove(store({}), { v: 1, at: 0, items: { stickerCollection: lots } }).stickerCollection!)).toHaveLength(12);
  });

  it('my name and avatar only fill what is empty here', () => {
    expect(mergeMove(store({ name: 'Sam' }), { v: 1, at: 0, items: { name: 'Alex', avatar: 'wizard' } })).toEqual({ avatar: 'wizard' });
  });
});
