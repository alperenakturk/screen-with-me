import { describe, expect, it } from 'vitest';
import { ROOM_GAME_KINDS } from '../protocol.ts';
import { GAME_CATALOG, GAME_NEWS, LATEST_NEWS, compareVersions, unseenNews } from './catalog.ts';

describe('Games catalog', () => {
  it('every room game is in the catalog', () => {
    expect(Object.keys(GAME_CATALOG).sort()).toEqual([...ROOM_GAME_KINDS].sort());
    for (const info of Object.values(GAME_CATALOG)) expect(info.min).toBeLessThanOrEqual(info.max);
  });

  it('versions compare by number, news is newest first', () => {
    expect(compareVersions('0.9.91.10', '0.9.91.6')).toBeGreaterThan(0);
    expect(compareVersions('0.9.92', '0.9.91.9')).toBeGreaterThan(0);
    expect(compareVersions('0.9.91', '0.9.91.0')).toBe(0);
    for (let i = 1; i < GAME_NEWS.length; i++) expect(compareVersions(GAME_NEWS[i - 1]!.v, GAME_NEWS[i]!.v)).toBeGreaterThanOrEqual(0);
    expect(LATEST_NEWS).toBe(GAME_NEWS[0]!.v);
  });

  it('unseen news: only newer than what I saw', () => {
    expect(unseenNews(LATEST_NEWS)).toEqual([]);
    expect(unseenNews(null).length).toBeGreaterThan(0);
    expect(unseenNews('0.9.91.6').every((n) => compareVersions(n.v, '0.9.91.6') > 0)).toBe(true);
  });
});
