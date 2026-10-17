import { describe, expect, it } from 'vitest';
import { WAIT_COOLDOWN_MS, WAIT_MAX_MS, WaitTracker } from './waiting.ts';

const present = new Set(['ali', 'ayse', 'can']);

describe('WaitTracker', () => {
  it('starts waiting when someone stalls while the room plays, resumes when they are ready', () => {
    const w = new WaitTracker();
    w.setReady('ayse', false);
    expect(w.decide(0, true, true, present)).toEqual({ kind: 'start', ids: ['ayse'] });
    expect(w.decide(1000, true, false, present)).toEqual({ kind: 'none' });
    w.setReady('ayse', true);
    expect(w.decide(2000, true, false, present)).toEqual({ kind: 'resume', timedOut: false });
    expect(w.waitingSince).toBeNull();
  });

  it('does not start when the room is paused or the feature is off', () => {
    const w = new WaitTracker();
    w.setReady('ayse', false);
    expect(w.decide(0, true, false, present)).toEqual({ kind: 'none' });
    expect(w.decide(0, false, true, present)).toEqual({ kind: 'none' });
  });

  it('gives up after the maximum wait and does not let the same person block again for a while', () => {
    const w = new WaitTracker();
    w.setReady('ayse', false);
    w.decide(0, true, true, present);
    expect(w.decide(WAIT_MAX_MS, true, false, present)).toEqual({ kind: 'resume', timedOut: true });
    w.setReady('ayse', false);
    expect(w.decide(WAIT_MAX_MS + 1000, true, true, present)).toEqual({ kind: 'none' });
    expect(w.decide(WAIT_MAX_MS + WAIT_COOLDOWN_MS + 1, true, true, present)).toEqual({ kind: 'start', ids: ['ayse'] });
  });

  it('tracks several people and updates the list', () => {
    const w = new WaitTracker();
    w.setReady('ayse', false);
    w.setReady('can', false);
    expect(w.decide(0, true, true, present)).toEqual({ kind: 'start', ids: ['ayse', 'can'] });
    w.setReady('can', true);
    expect(w.decide(500, true, false, present)).toEqual({ kind: 'update', ids: ['ayse'] });
  });

  it('forgets people who left, and a manual action cancels the wait', () => {
    const w = new WaitTracker();
    w.setReady('ayse', false);
    w.decide(0, true, true, present);
    expect(w.decide(500, true, false, new Set(['ali']))).toEqual({ kind: 'resume', timedOut: false });

    w.setReady('can', false);
    w.decide(60_000, true, true, present);
    expect(w.cancel()).toBe(true);
    expect(w.decide(60_500, true, true, present)).toEqual({ kind: 'none' });
  });
});
