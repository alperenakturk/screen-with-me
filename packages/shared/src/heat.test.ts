import { describe, expect, it } from 'vitest';
import { HeatMap } from './heat.ts';

describe('HeatMap (zaman çizelgesinde tepkiler)', () => {
  it('10 sn dilimlerde sayar ve en sık emojiyi verir', () => {
    const heat = new HeatMap('v1');
    heat.add(61, '😂');
    heat.add(65.5, '😂');
    heat.add(69.9, '🔥');
    heat.add(130, '😮');
    expect(heat.size).toBe(4);
    expect(heat.marks()).toEqual([
      { s: 60, n: 3, emoji: '😂' },
      { s: 130, n: 1, emoji: '😮' },
    ]);
  });

  it('en güçlü anları seçer; birbirine çok yakın olanlardan sadece birini', () => {
    const heat = new HeatMap('v1');
    for (let i = 0; i < 5; i++) heat.add(100, '😂');
    for (let i = 0; i < 3; i++) heat.add(115, '🔥'); // 100'e 30 sn'den yakın: atlanır
    for (let i = 0; i < 2; i++) heat.add(400, '😮');
    heat.add(900, '👏'); // tek tepki: an sayılmaz
    expect(heat.top(3).map((m) => m.s)).toEqual([100, 400]);
  });

  it('video değişince sıfırlanır, aynı videoda sıfırlanmaz', () => {
    const heat = new HeatMap('v1');
    heat.add(5, '😂');
    expect(heat.reset('v1')).toBe(false);
    expect(heat.size).toBe(1);
    expect(heat.reset('v2')).toBe(true);
    expect(heat.size).toBe(0);
  });

  it('sunucudan gelen geçmişi yükler; geçersiz anları yok sayar', () => {
    const heat = new HeatMap();
    heat.load({ itemId: 'v9', marks: [{ s: 20, n: 4, emoji: '🔥' }] });
    heat.add(-3, '😂');
    heat.add(Number.NaN, '😂');
    expect(heat.itemId).toBe('v9');
    expect(heat.snapshot()).toEqual({ itemId: 'v9', marks: [{ s: 20, n: 4, emoji: '🔥' }] });
  });
});
