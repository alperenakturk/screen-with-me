// GHOST / GD1: the game objects' dead-connection check (apps/server/src/ghost.ts) is plain functions over the sockets'
// attachments; tested here with the shared unit tests, which CI runs.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GHOST_CODE, GHOST_MS, closeAsGone, closeGhosts, nextGhostCheck, noteClose, touch, wasGhost } from '../../../apps/server/src/ghost.ts';

afterEach(() => vi.restoreAllMocks());

/** A socket stand-in: an attachment and the closes it got. */
function sock(seen?: number) {
  let att: Record<string, unknown> | null = seen === undefined ? null : { seen };
  const closed: number[] = [];
  const sent: string[] = [];
  return {
    closed,
    sent,
    serializeAttachment: (a: unknown) => void (att = a as Record<string, unknown>),
    deserializeAttachment: () => (att ? { ...att } : null),
    close: (code?: number) => void closed.push(code ?? 1000),
    send: (data: string) => void sent.push(data),
  };
}

describe('ghost connections', () => {
  it('keeps a socket heard within GHOST_MS and closes one silent past it', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const now = 1_000_000;
    const live = sock(now - GHOST_MS + 1000);
    const dead = sock(now - GHOST_MS - 1000);
    const gone = closeGhosts([live, dead], now);
    expect(gone).toEqual([dead]);
    expect(dead.closed).toEqual([GHOST_CODE]);
    expect(live.closed).toEqual([]);
    expect(wasGhost(dead)).toBe(true);
    // Closed once: the next alarm doesn't run its leave again.
    expect(closeGhosts([live, dead], now + 500)).toEqual([]);
  });

  it("counts the runtime's keepalive answer as heard (a hidden tab's free keepalive)", () => {
    const now = 1_000_000;
    const ws = sock(now - GHOST_MS - 60_000);
    expect(closeGhosts([ws], now, GHOST_MS, () => now - 10_000)).toEqual([]);
    expect(nextGhostCheck([ws], () => now - 10_000)).toBe(now - 10_000 + GHOST_MS + 1);
  });

  it('notes a message time at most every 5 s and never on an unattached socket', () => {
    const ws = sock(100);
    touch(ws, 3000);
    expect(ws.deserializeAttachment()!.seen).toBe(100);
    touch(ws, 6000);
    expect(ws.deserializeAttachment()!.seen).toBe(6000);
    const bare = sock();
    touch(bare, 9000);
    expect(bare.deserializeAttachment()).toBeNull();
  });

  it('a socket given up on is marked, gets its last word and is not closed again as a ghost', () => {
    const ws = sock(0);
    closeAsGone(ws, 1008, 'flood', '{"t":"error","code":"rate"}');
    expect(ws.sent).toEqual(['{"t":"error","code":"rate"}']);
    expect(ws.closed).toEqual([1008]);
    expect(closeGhosts([ws], GHOST_MS * 10)).toEqual([]);
  });

  it('GD1: logs abnormal closes with the table kind and code only', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    for (const code of [1000, 1001, 1005]) noteClose('sea', code);
    expect(log).not.toHaveBeenCalled();
    noteClose('sea', 1006);
    expect(log).toHaveBeenCalledWith('[game drop] sea: closed 1006');
  });
});
