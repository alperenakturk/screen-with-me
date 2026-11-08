import { describe, expect, it } from 'vitest';
import { EMPTY_BOOK, UPTIME_LABEL, UPTIME_TITLE, cleanBook, decideUptime, nextBook, uptimeBody, uptimeRequest } from './uptime.ts';

describe('uptime: one GitHub call a run', () => {
  it('opens one issue when down without one, edits it while down, closes it when back, else nothing', () => {
    expect(decideUptime(EMPTY_BOOK, true)).toEqual({ kind: 'none' });
    expect(decideUptime(EMPTY_BOOK, false)).toEqual({ kind: 'open' });
    expect(decideUptime({ issue: 7, downSince: 1 }, false)).toEqual({ kind: 'edit', issue: 7 });
    expect(decideUptime({ issue: 7, downSince: 1 }, true)).toEqual({ kind: 'close', issue: 7 });
  });

  it('walks a whole outage: up, down (open), still down (edit), back (close), up', () => {
    let book = EMPTY_BOOK;
    const step = (healthy: boolean, now: number, done = true, opened: number | null = null) => {
      const action = decideUptime(book, healthy);
      book = nextBook(book, healthy, now, action, done, opened);
      return action.kind;
    };
    expect(step(true, 1)).toBe('none');
    expect(step(false, 2, true, 42)).toBe('open');
    expect(book).toEqual({ issue: 42, downSince: 2 });
    expect(step(false, 3)).toBe('edit');
    expect(book).toEqual({ issue: 42, downSince: 2 });
    expect(step(true, 4)).toBe('close');
    expect(book).toEqual(EMPTY_BOOK);
    expect(step(true, 5)).toBe('none');
  });

  it('a GitHub call that failed is tried again next run, never a second issue', () => {
    let book = nextBook(EMPTY_BOOK, false, 10, { kind: 'open' }, false);
    expect(book).toEqual({ issue: null, downSince: 10 });
    expect(decideUptime(book, false)).toEqual({ kind: 'open' });
    book = nextBook(book, false, 20, { kind: 'open' }, true, 5);
    expect(book).toEqual({ issue: 5, downSince: 10 });
    book = nextBook(book, true, 30, { kind: 'close', issue: 5 }, false);
    expect(book).toEqual({ issue: 5, downSince: null });
    expect(decideUptime(book, true)).toEqual({ kind: 'close', issue: 5 });
  });

  it('keeps only sane book fields', () => {
    expect(cleanBook(undefined)).toEqual(EMPTY_BOOK);
    expect(cleanBook({ issue: '3', downSince: 'x', extra: 1 })).toEqual(EMPTY_BOOK);
    expect(cleanBook({ issue: 3, downSince: 99 })).toEqual({ issue: 3, downSince: 99 });
    expect(cleanBook({ issue: -1 })).toEqual(EMPTY_BOOK);
  });

  it('writes a text with every check, the time down and where to look', () => {
    const checks = [
      { name: 'Home page', ok: true, detail: 'v0.9.97.92', ms: 12 },
      { name: 'Room object', ok: false, detail: 'HTTP 500', ms: 40 },
    ];
    const down = uptimeBody(checks, false, Date.UTC(2026, 10, 8, 10, 0), Date.UTC(2026, 10, 8, 9, 30), 'https://example.test');
    expect(down).toContain('✗ Room object: HTTP 500 (40 ms)');
    expect(down).toContain('down since 2026-11-08 09:30 UTC');
    expect(down).toContain('cloudflarestatus.com');
    expect(down).toContain('cannot see an outage of Cloudflare itself');
    const up = uptimeBody(checks.map((c) => ({ ...c, ok: true })), true, Date.UTC(2026, 10, 8, 10, 15), Date.UTC(2026, 10, 8, 9, 30), 'https://example.test');
    expect(up.startsWith('Back up at 2026-11-08 10:15 UTC (down since 2026-11-08 09:30 UTC).')).toBe(true);
    expect(up).not.toContain('What to look at');
    expect(up).not.toMatch(/\n\n\n/);
  });

  it('builds the one GitHub call; an open can go without the label and still says [outage]', () => {
    expect(uptimeRequest({ kind: 'none' }, 'x')).toBeNull();
    expect(uptimeRequest({ kind: 'open' }, 'x')).toEqual({ path: '', method: 'POST', data: { title: UPTIME_TITLE, body: 'x', labels: [UPTIME_LABEL] } });
    const bare = uptimeRequest({ kind: 'open' }, 'x', false)!;
    expect(bare.data).toEqual({ title: UPTIME_TITLE, body: 'x' });
    expect(UPTIME_TITLE).toContain('[outage]');
    expect(uptimeRequest({ kind: 'edit', issue: 4 }, 'y')).toEqual({ path: '/4', method: 'PATCH', data: { body: 'y' } });
    expect(uptimeRequest({ kind: 'close', issue: 4 }, 'z')).toEqual({ path: '/4', method: 'PATCH', data: { body: 'z', state: 'closed', state_reason: 'completed' } });
  });
});
