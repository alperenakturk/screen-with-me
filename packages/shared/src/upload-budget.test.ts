import { describe, expect, it } from 'vitest';
import { takeUpload, UPLOAD_MAX_BYTES, UPLOAD_MAX_ADDRESSES, type UploadState } from './upload-budget.ts';

const DAY = 86_400_000;
const limits = { perIp: 1000, perDay: 2500 };

describe('upload budget (R4-1)', () => {
  it('lets uploads through until the address has used its day', () => {
    let state: UploadState | undefined;
    let answer;
    ({ answer, state } = takeUpload(state, 'aa', 600, 5, limits));
    expect(answer).toBe('ok');
    ({ answer, state } = takeUpload(state, 'aa', 400, 6, limits));
    expect(answer).toBe('ok');
    const refused = takeUpload(state, 'aa', 1, 7, limits);
    expect(refused.answer).toBe('ip');
    expect(refused.state).toEqual(state);
  });

  it('counts the address across every room (one counter, not per room)', () => {
    let { state } = takeUpload(undefined, 'aa', 900, 0, limits);
    ({ state } = takeUpload(state, 'bb', 900, 0, limits));
    expect(takeUpload(state, 'aa', 200, 0, limits).answer).toBe('ip');
    expect(takeUpload(state, 'bb', 100, 0, limits).answer).toBe('ok');
  });

  it('stops everyone once the day total is reached', () => {
    let { state } = takeUpload(undefined, 'aa', 1000, 0, limits);
    ({ state } = takeUpload(state, 'bb', 1000, 0, limits));
    expect(takeUpload(state, 'cc', 600, 0, limits).answer).toBe('day');
    expect(takeUpload(state, 'cc', 500, 0, limits).answer).toBe('ok');
  });

  it('starts over on a new UTC day', () => {
    const { state } = takeUpload(undefined, 'aa', 1000, 10, limits);
    expect(takeUpload(state, 'aa', 1, 20, limits).answer).toBe('ip');
    const next = takeUpload(state, 'aa', 1000, DAY + 1, limits);
    expect(next.answer).toBe('ok');
    expect(next.state.perIp).toEqual({ aa: 1000 });
  });

  it('refuses bad keys and sizes without counting them', () => {
    expect(takeUpload(undefined, 'a b', 10, 0, limits).answer).toBe('bad');
    expect(takeUpload(undefined, '', 10, 0, limits).answer).toBe('bad');
    expect(takeUpload(undefined, 'aa', 0, 0, limits).answer).toBe('bad');
    expect(takeUpload(undefined, 'aa', 1.5, 0, limits).answer).toBe('bad');
    expect(takeUpload(undefined, 'aa', UPLOAD_MAX_BYTES + 1, 0).answer).toBe('bad');
    expect(takeUpload(undefined, 'aa', 10, 0, limits).state.total).toBe(10);
  });

  it('keeps counting the total when too many addresses arrive in one day', () => {
    const perIp: Record<string, number> = {};
    for (let i = 0; i < UPLOAD_MAX_ADDRESSES; i++) perIp[`k${i}`] = 1;
    const state: UploadState = { day: 0, total: UPLOAD_MAX_ADDRESSES, perIp };
    const next = takeUpload(state, 'new', 5, 0, { perIp: 10, perDay: 1e9 });
    expect(next.answer).toBe('ok');
    expect(next.state.total).toBe(UPLOAD_MAX_ADDRESSES + 5);
    expect(Object.keys(next.state.perIp)).toHaveLength(UPLOAD_MAX_ADDRESSES);
  });
});
