import { describe, expect, it } from 'vitest';
import { chooseFacts, StatsTracker } from './recap.ts';

const ali = { name: 'Ali' };
const ayse = { name: 'Ayşe', avatar: 'elf' as const };

describe('StatsTracker', () => {
  it('sadece oda oynarken ve biri varken geçen süreyi sayar', () => {
    const s = new StatsTracker(null, 0);
    s.tick(10_000, false, 1, true); // durmuştu: sayılmaz
    s.tick(70_000, true, 1.5, true); // 60 sn oynadı, 1.5x
    s.tick(80_000, true, 1, false); // 10 sn daha, sonra oda boşaldı
    s.tick(500_000, true, 1, true); // boşken geçen süre sayılmaz
    const r = s.recap(500_000, 'x');
    expect(r.watchSec).toBe(70);
    expect(r.videoSec).toBe(100);
  });

  it('kişileri sayar ama özete kimlik koymaz', () => {
    const s = new StatsTracker(null, 0);
    s.chat('c:aaa', ali);
    s.reaction('c:aaa', ali, '😂');
    s.reaction('c:aaa', ali, '😂');
    s.reaction('c:bbb', ayse, '😢');
    s.reaction('c:bbb', ayse, null);
    s.action('c:bbb', ayse, 'pause');
    const r = s.recap(1000, 'x');
    expect(JSON.stringify(r)).not.toContain('c:aaa');
    expect(r.people.find((p) => p.name === 'Ali')).toMatchObject({ chat: 1, reactions: 2, top: '😂', laugh: 2 });
    expect(r.people.find((p) => p.name === 'Ayşe')).toMatchObject({ sad: 1, pauses: 1, avatar: 'elf' });
    expect(r.emojis[0]).toEqual(['😂', 2]);
  });

  it('aynı videoyu iki kez saymaz; sıfırlayınca yeni dönem başlar', () => {
    const s = new StatsTracker(null, 0);
    s.video('a', 'Bir');
    s.video('a', 'Bir');
    s.video('b', null);
    s.title('b', 'İki');
    expect(s.recap(1, 'x')).toMatchObject({ videos: 2, titles: ['Bir', 'İki'] });
    s.reset(5, true);
    expect(s.isEmpty()).toBe(true);
    s.video('b', 'İki');
    expect(s.recap(6, 'y').videos).toBe(0);
  });
});

describe('chooseFacts', () => {
  it('ilk kart süre, son kart özet; aradakiler uygun olanlardan', () => {
    let now = 0;
    const s = new StatsTracker(null, 0, () => now);
    s.tick(0, false, 1, true);
    s.tick(600_000, true, 1.25, true);
    now = 600_000;
    for (let i = 0; i < 4; i++) s.chat('c:aaa', ali);
    s.chat('c:bbb', ayse);
    const facts = chooseFacts(s.recap(600_000, 'x'), () => 0.5, 10);
    expect(facts[0]!.kind).toBe('time');
    expect(facts.at(-1)!.kind).toBe('summary');
    const kinds = facts.map((f) => f.kind);
    expect(kinds).toContain('speed');
    expect(kinds).toContain('talker');
    expect(kinds).not.toContain('sad');
  });
});

describe('oturum', () => {
  it('uzun aradan sonra yeni oturum başlar, kısa arada aynı oturum sürer', () => {
    let now = 1000;
    const s = new StatsTracker(null, 0, () => now);
    s.activity();
    s.chat('c:aaa', ali);
    now = 3 * 3600_000; // 3 saat sonra: aynı oturum
    s.chat('c:aaa', ali);
    expect(s.recap(3 * 3600_000, 'x').chat).toBe(2);
    s.activity(8 * 3600_000); // 5 saat ara: yeni oturum
    expect(s.data.since).toBe(8 * 3600_000);
    expect(s.isEmpty()).toBe(true);
  });
});
