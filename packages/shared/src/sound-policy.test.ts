import { describe, expect, it } from 'vitest';
import { BURST_MAX, FILM_SOFTEN, JoinFilter, SOUNDS, SoundLimiter, familyOf, parseVolume, soundGain, type SoundId } from './sound-policy.ts';

describe('sound families (owner chose A for voice + room, B for games)', () => {
  it('maps every group to its family', () => {
    for (const id of Object.keys(SOUNDS) as SoundId[]) {
      const { group } = SOUNDS[id];
      expect(familyOf(id)).toBe(group === 'game' ? 'B' : 'A');
    }
  });
  it('has the quiet extras the owner asked for', () => {
    for (const id of ['hint', 'locked', 'guessWrong', 'guessOther'] as const) expect(SOUNDS[id].level).toBeLessThanOrEqual(0.5);
  });
});

describe('soundGain', () => {
  const base = { on: true, volume: 70, filmPlaying: false };
  it('is silent when switched off or at 0 %', () => {
    expect(soundGain('chat', { ...base, on: false })).toBe(0);
    expect(soundGain('chat', { ...base, volume: 0 })).toBe(0);
  });
  it('softens room sounds while the film plays, never game or microphone sounds', () => {
    expect(soundGain('roomJoin', { ...base, filmPlaying: true })).toBeCloseTo(soundGain('roomJoin', base) * FILM_SOFTEN);
    expect(soundGain('win', { ...base, filmPlaying: true })).toBe(soundGain('win', base));
    expect(soundGain('micOff', { ...base, filmPlaying: true })).toBe(soundGain('micOff', base));
  });
  it('scales with the volume', () => {
    expect(soundGain('win', { ...base, volume: 100 })).toBeCloseTo(SOUNDS.win.level);
    expect(soundGain('win', { ...base, volume: 50 })).toBeCloseTo(SOUNDS.win.level / 2);
  });
});

describe('parseVolume', () => {
  it('defaults to 70 and clamps', () => {
    expect(parseVolume(null)).toBe(70);
    expect(parseVolume('abc')).toBe(70);
    expect(parseVolume('150')).toBe(100);
    expect(parseVolume('-3')).toBe(0);
    expect(parseVolume('42')).toBe(42);
  });
});

describe('SoundLimiter', () => {
  it('plays one sound when six people join voice at once', () => {
    const limiter = new SoundLimiter();
    const played = [0, 50, 100, 150, 200, 250].filter((t) => limiter.allow('voiceJoin', t));
    expect(played).toEqual([0]);
    expect(limiter.allow('voiceJoin', 3000)).toBe(true);
  });
  it('limits any mix of sounds to a burst', () => {
    const limiter = new SoundLimiter();
    const ids: SoundId[] = ['roomJoin', 'chat', 'streamStart', 'gameInvite', 'homeCall', 'filmTime'];
    expect(ids.filter((id, i) => limiter.allow(id, i * 10)).length).toBe(BURST_MAX);
    expect(limiter.allow('homeCall', 2100)).toBe(true);
  });
  it('lets quick game moves through', () => {
    const limiter = new SoundLimiter();
    expect(limiter.allow('place', 0)).toBe(true);
    expect(limiter.allow('place', 400)).toBe(true);
    expect(limiter.allow('win', 420)).toBe(true);
    // A quick XOX game: five pieces and the result within two seconds, after a burst of room sounds.
    for (const id of ['roomJoin', 'chat', 'streamStart', 'gameInvite'] as const) limiter.allow(id, 500);
    expect([600, 900, 1200, 1500, 1800].every((t) => limiter.allow('place', t))).toBe(true);
    expect(limiter.allow('homeCall', 1900)).toBe(false);
  });
  it('ticks once per second', () => {
    const limiter = new SoundLimiter();
    expect([0, 1000, 2000, 3000].every((t) => limiter.allow('tick', t))).toBe(true);
    expect(limiter.allow('tick', 3300)).toBe(false);
  });
});

describe('JoinFilter', () => {
  const ali = { id: 'a1', name: 'Ali', avatar: 'wizard' };
  const ayse = { id: 'b1', name: 'Ayşe', avatar: 'robot' };
  const me = { id: 'm', name: 'Ben', avatar: 'cat' };
  it('ignores the first list and myself', () => {
    const f = new JoinFilter();
    f.seed([me, ali]);
    expect(f.update([me, ali], 'm', 1000)).toBe(0);
  });
  it('counts a new person once', () => {
    const f = new JoinFilter();
    f.seed([me]);
    expect(f.update([me, ali], 'm', 1000)).toBe(1);
    expect(f.update([me, ali], 'm', 2000)).toBe(0);
  });
  it('does not count a reload (left and back within 30 s)', () => {
    const f = new JoinFilter();
    f.seed([me, ali]);
    expect(f.update([me], 'm', 600_000)).toBe(0);
    expect(f.update([me, { ...ali, id: 'a2' }], 'm', 605_000)).toBe(0);
  });
  it('counts someone who comes back after a long time', () => {
    const f = new JoinFilter();
    f.seed([me, ali]);
    f.update([me], 'm', 10_000);
    expect(f.update([me, { ...ali, id: 'a3' }], 'm', 100_000)).toBe(1);
  });
  it('does not count the second tab of someone already here', () => {
    const f = new JoinFilter();
    f.seed([me, ali]);
    expect(f.update([me, ali, { ...ali, id: 'a2' }, ayse], 'm', 1000)).toBe(1);
  });
});

describe('JoinFilter with person keys (R11)', () => {
  it('counts a second person with the same name and avatar as a new arrival', () => {
    const filter = new JoinFilter();
    filter.seed([{ id: 'a', pk: 'k1', name: 'Alex', avatar: 'wizard' }]);
    const fresh = filter.update([{ id: 'a', pk: 'k1', name: 'Alex', avatar: 'wizard' }, { id: 'b', pk: 'k2', name: 'Alex', avatar: 'wizard' }], 'a', 1000);
    expect(fresh).toBe(1);
    const tab = filter.update([{ id: 'a', pk: 'k1', name: 'Alex', avatar: 'wizard' }, { id: 'b', pk: 'k2', name: 'Alex', avatar: 'wizard' }, { id: 'c', pk: 'k1', name: 'Alex', avatar: 'wizard' }], 'a', 2000);
    expect(tab).toBe(0);
  });
});
