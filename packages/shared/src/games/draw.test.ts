import { describe, expect, it } from 'vitest';
import { DRAW_WORDS } from './draw-words.ts';
import { DRAW_ROUND_MS, cleanStroke, isClose, isCorrect, maskWord, parseDrawMessage, revealOrder, revealTimes } from './draw.ts';

describe('Çiz-Bil kuralları', () => {
  it('tahmin: büyük/küçük harf, Türkçe harfler ve boşluklar önemsiz', () => {
    expect(isCorrect('  KÖPEK ', 'köpek', 'tr')).toBe(true);
    expect(isCorrect('kopek', 'köpek', 'tr')).toBe(true);
    expect(isCorrect('IŞIK', 'ışık', 'tr')).toBe(true);
    expect(isCorrect('deniz  feneri', 'deniz feneri', 'tr')).toBe(true);
    expect(isCorrect('kedi', 'köpek', 'tr')).toBe(false);
    expect(isCorrect('Ice Cream', 'ice cream', 'en')).toBe(true);
  });

  it('çok yaklaştın: bir harf farkı, kısa kelimede değil', () => {
    expect(isClose('kaplumbaa', 'kaplumbağa', 'tr')).toBe(true);
    expect(isClose('zurafa', 'zürafa', 'tr')).toBe(false); // zaten doğru sayılır
    expect(isClose('zürafaa', 'zürafa', 'tr')).toBe(true);
    expect(isClose('at', 'ay', 'tr')).toBe(false);
    expect(isClose('elmalar', 'elma', 'tr')).toBe(false);
  });

  it('gizli kelime ve açılan harfler', () => {
    expect(maskWord('elma')).toBe('_ _ _ _');
    expect(maskWord('elma', [0, 3])).toBe('e _ _ a');
    expect(maskWord('ice cream')).toBe('_ _ _   _ _ _ _ _');
    const order = revealOrder('kaplumbağa', () => 0.3);
    expect(order).toHaveLength(3);
    expect(new Set(order).size).toBe(3);
    expect(revealOrder('at')).toHaveLength(0);
    expect(revealOrder('deniz feneri').every((i) => 'deniz feneri'[i] !== ' ')).toBe(true);
    expect(revealTimes(1000, 2)).toEqual([1000 + DRAW_ROUND_MS * 0.4, 1000 + DRAW_ROUND_MS * 0.6]);
  });

  it('mesaj doğrulama', () => {
    expect(cleanStroke({ c: 0, w: 1, p: [0, 0, 1000, 750] })).toEqual({ c: 0, w: 1, p: [0, 0, 1000, 750] });
    expect(cleanStroke({ c: 99, w: 1, p: [0, 0] })).toBeNull();
    expect(cleanStroke({ c: 0, w: 1, p: [0, 0, 1001, 3] })).toBeNull();
    expect(cleanStroke({ c: 0, w: 1, p: [0] })).toBeNull();
    expect(parseDrawMessage(JSON.stringify({ t: 'guess', text: '  çok   uzun  ' }))).toEqual({ t: 'guess', text: 'çok uzun' });
    expect(parseDrawMessage(JSON.stringify({ t: 'guess', text: '   ' }))).toBeNull();
    expect(parseDrawMessage(JSON.stringify({ t: 'choose', index: 3 }))).toBeNull();
    expect(parseDrawMessage(JSON.stringify({ t: 'hello', v: 1, name: 'Ali', lang: 'xx' }))).toEqual({ t: 'hello', v: 1, name: 'Ali' });
    expect(parseDrawMessage(JSON.stringify({ t: 'settings', lang: 'en', rounds: 3 }))).toEqual({ t: 'settings', lang: 'en', rounds: 3 });
    expect(parseDrawMessage(JSON.stringify({ t: 'settings', rounds: 9 }))).toBeNull();
  });

  it('kelime listeleri: tekrar yok, kısa ve dolu', () => {
    for (const list of Object.values(DRAW_WORDS)) {
      expect(list.length).toBeGreaterThan(100);
      expect(new Set(list).size).toBe(list.length);
      expect(list.every((w) => w.length >= 2 && w.length <= 16)).toBe(true);
    }
  });
});
