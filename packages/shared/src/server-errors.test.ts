// ERR1: the Worker's error helpers (apps/server/src/errors.ts) are plain functions; they are tested here with the
// shared unit tests, which CI runs.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { failed, logError, routeOf, stubFetch } from '../../../apps/server/src/errors.ts';

afterEach(() => vi.restoreAllMocks());

const doError = (props: Record<string, boolean>) => Object.assign(new Error('Network connection lost'), props);

describe('ERR1 error helpers', () => {
  it('masks ids in the logged route', () => {
    expect(routeOf('/api/rooms/abc123/ws')).toBe('/api/rooms/:id/ws');
    expect(routeOf('/api/games/x9/ws')).toBe('/api/games/:id/ws');
    expect(routeOf('/api/version')).toBe('/api/version');
  });

  it('answers a failure with small JSON, busy for an overloaded object', async () => {
    const plain = failed(new Error('boom'));
    expect(plain.status).toBe(503);
    expect(await plain.json()).toEqual({ error: 'unavailable' });
    expect(await failed(doError({ overloaded: true })).json()).toEqual({ error: 'busy' });
  });

  it('logs one JSON line with the error name and flags, never the message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logError('route failed', doError({ retryable: true }), { route: '/api/rooms/:id/ws' });
    const line = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(line).toEqual({ msg: 'route failed', route: '/api/rooms/:id/ws', error: 'Error', retryable: true });
    expect(spy.mock.calls[0]![0]).not.toContain('Network connection lost');
  });

  it('retries a bodiless request once for a retryable error, never for an overloaded one', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let calls = 0;
    const flaky = { fetch: async () => (++calls === 1 ? Promise.reject(doError({ retryable: true })) : new Response('ok')) };
    expect(await (await stubFetch(flaky, new Request('https://x/info'))).text()).toBe('ok');
    expect(calls).toBe(2);

    calls = 0;
    const overloaded = { fetch: async () => (++calls, Promise.reject(doError({ retryable: true, overloaded: true }))) };
    await expect(stubFetch(overloaded, new Request('https://x/info'))).rejects.toThrow();
    expect(calls).toBe(1);

    calls = 0;
    const withBody = { fetch: async () => (++calls, Promise.reject(doError({ retryable: true }))) };
    await expect(stubFetch(withBody, new Request('https://x/send', { method: 'POST', body: '[]' }))).rejects.toThrow();
    expect(calls).toBe(1);
  });
});
