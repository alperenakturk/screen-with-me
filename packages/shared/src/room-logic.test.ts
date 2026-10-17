import { describe, expect, it } from 'vitest';
import type { QueueItem } from './protocol.ts';
import { applyRoomAction, initialRoom, setItemTitle, type RoomData } from './room-logic.ts';

const now = 2_000_000;
const item = (id: string): QueueItem => ({ id, media: { kind: 'youtube', id: 'dQw4w9WgXcQ' }, title: id, by: 'Ali' });

function roomWith(current: string | null, queue: string[]): RoomData {
  const room = initialRoom(now - 10_000);
  return {
    state: { ...room.state, item: current ? item(current) : null, paused: current === null, position: 5, updatedAt: now - 10_000 },
    queue: queue.map(item),
  };
}

const ids = (data: RoomData) => data.queue.map((q) => q.id);

describe('load', () => {
  it('starts the video immediately, playing from 0, keeping the speed', () => {
    const room = roomWith('a', ['b']);
    room.state.rate = 1.5;
    const update = applyRoomAction(room, { t: 'load', item: item('x') }, now);
    expect(update.stateAction).toBe('load');
    expect(update.data.state).toMatchObject({ paused: false, position: 0, rate: 1.5, updatedAt: now });
    expect(update.data.state.item?.id).toBe('x');
    expect(ids(update.data)).toEqual(['b']);
  });
});

describe('enqueue', () => {
  it('plays right away when nothing is playing', () => {
    const update = applyRoomAction(roomWith(null, []), { t: 'enqueue', item: item('x') }, now);
    expect(update.stateAction).toBe('load');
    expect(update.data.state.item?.id).toBe('x');
    expect(update.queueChanged).toBe(false);
  });

  it('adds to the end otherwise', () => {
    const update = applyRoomAction(roomWith('a', ['b']), { t: 'enqueue', item: item('c') }, now);
    expect(update.stateAction).toBeNull();
    expect(ids(update.data)).toEqual(['b', 'c']);
    expect(update.change).toMatchObject({ kind: 'add', item: { id: 'c' } });
  });

  it('refuses when the queue is full', () => {
    const full = roomWith('a', Array.from({ length: 100 }, (_, i) => `q${i}`));
    const update = applyRoomAction(full, { t: 'enqueue', item: item('z') }, now);
    expect(update.error).toBe('queue_full');
    expect(update.data.queue).toHaveLength(100);
  });
});

describe('queue editing', () => {
  it('removes an item', () => {
    const update = applyRoomAction(roomWith('a', ['b', 'c', 'd']), { t: 'dequeue', id: 'c' }, now);
    expect(ids(update.data)).toEqual(['b', 'd']);
    expect(update.change).toMatchObject({ kind: 'remove', item: { id: 'c' } });
  });

  it('moves an item, clamping the target', () => {
    const room = roomWith('a', ['b', 'c', 'd']);
    expect(ids(applyRoomAction(room, { t: 'move', id: 'd', to: 0 }, now).data)).toEqual(['d', 'b', 'c']);
    expect(ids(applyRoomAction(room, { t: 'move', id: 'b', to: 99 }, now).data)).toEqual(['c', 'd', 'b']);
  });

  it('ignores unknown ids', () => {
    const update = applyRoomAction(roomWith('a', ['b']), { t: 'dequeue', id: 'nope' }, now);
    expect(update.queueChanged).toBe(false);
    expect(update.stateAction).toBeNull();
  });

  it('jumps to a queued item', () => {
    const update = applyRoomAction(roomWith('a', ['b', 'c']), { t: 'jump', id: 'c' }, now);
    expect(update.data.state.item?.id).toBe('c');
    expect(ids(update.data)).toEqual(['b']);
  });
});

describe('next', () => {
  it('advances to the first queued item', () => {
    const update = applyRoomAction(roomWith('a', ['b', 'c']), { t: 'next', from: 'a' }, now);
    expect(update.stateAction).toBe('next');
    expect(update.data.state).toMatchObject({ paused: false, position: 0 });
    expect(update.data.state.item?.id).toBe('b');
    expect(ids(update.data)).toEqual(['c']);
  });

  it('applies only once when several players report the end', () => {
    const first = applyRoomAction(roomWith('a', ['b', 'c']), { t: 'next', from: 'a' }, now);
    const second = applyRoomAction(first.data, { t: 'next', from: 'a' }, now);
    expect(second.stateAction).toBeNull();
    expect(second.data.state.item?.id).toBe('b');
  });

  it('pauses at the end when the queue is empty', () => {
    const update = applyRoomAction(roomWith('a', []), { t: 'next', from: 'a' }, now);
    expect(update.stateAction).toBe('pause');
    expect(update.data.state).toMatchObject({ paused: true, position: 15 });
  });
});

describe('setItemTitle', () => {
  it('fills the title of the playing item and queued items', () => {
    const room = roomWith('a', ['b']);
    expect(setItemTitle(room, 'a', 'Film')?.state.item?.title).toBe('Film');
    expect(setItemTitle(room, 'b', 'Dizi')?.queue[0]?.title).toBe('Dizi');
  });

  it('returns null when the item is gone', () => {
    expect(setItemTitle(roomWith('a', ['b']), 'zzz', 'X')).toBeNull();
  });
});

describe('playback', () => {
  it('uses the client timestamp, but only up to 2s in the past', () => {
    const room = roomWith('a', []);
    expect(applyRoomAction(room, { t: 'pause', position: 20, at: now - 150 }, now).data.state.updatedAt).toBe(now - 150);
    expect(applyRoomAction(room, { t: 'pause', position: 20, at: now - 60_000 }, now).data.state.updatedAt).toBe(now - 2000);
    expect(applyRoomAction(room, { t: 'pause', position: 20, at: now + 60_000 }, now).data.state.updatedAt).toBe(now);
  });

  it('applies play, pause, seek and rate', () => {
    const room = roomWith('a', []);
    room.state.paused = true;
    expect(applyRoomAction(room, { t: 'play', position: 5, at: now }, now).data.state).toMatchObject({ paused: false, position: 5 });
    expect(applyRoomAction(room, { t: 'seek', position: 99, at: now }, now).data.state).toMatchObject({ paused: true, position: 99 });
    expect(applyRoomAction(room, { t: 'rate', rate: 2, position: 11, at: now }, now).data.state).toMatchObject({ rate: 2, position: 11 });
  });

  it('ignores playback commands when nothing is loaded', () => {
    const update = applyRoomAction(roomWith(null, []), { t: 'play', position: 5, at: now }, now);
    expect(update.stateAction).toBeNull();
  });
});
