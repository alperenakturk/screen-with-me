import { describe, expect, it } from 'vitest';
import { watchIceBlocked, type IceSource } from './ice-watch.ts';

function fakePc() {
  const listeners: Record<string, ((event: { candidate?: unknown }) => void)[]> = {};
  const pc = {
    iceGatheringState: 'new' as RTCIceGatheringState,
    addEventListener(type: string, listener: (event: { candidate?: unknown }) => void) {
      (listeners[type] ??= []).push(listener);
    },
  };
  const fire = (type: string, event: { candidate?: unknown } = {}) => listeners[type]?.forEach((l) => l(event));
  const complete = () => {
    pc.iceGatheringState = 'complete';
    fire('icecandidate', { candidate: null });
    fire('icegatheringstatechange');
  };
  return { pc: pc as IceSource, fire, complete };
}

describe('watchIceBlocked', () => {
  it('reports a browser that gathers no candidate at all', () => {
    const { pc, complete } = fakePc();
    let blocked = 0;
    watchIceBlocked(pc, () => blocked++);
    complete();
    complete();
    expect(blocked).toBe(1);
  });

  it('stays quiet when at least one candidate was gathered', () => {
    const { pc, fire, complete } = fakePc();
    let blocked = 0;
    watchIceBlocked(pc, () => blocked++);
    fire('icecandidate', { candidate: { candidate: 'candidate:1 1 udp 1 abc.local 5000 typ host' } });
    complete();
    expect(blocked).toBe(0);
  });

  it('waits for gathering to finish', () => {
    const { pc, fire } = fakePc();
    let blocked = 0;
    watchIceBlocked(pc, () => blocked++);
    fire('icegatheringstatechange');
    expect(blocked).toBe(0);
  });
});
