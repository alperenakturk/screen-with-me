// Çiz-Bil: biri çizer, diğerleri tahmin eder. 2–8 kişi; sıra herkese gelir. Çizen üç kelimeden birini seçer, süre
// içinde çizer; doğru bilen erken bildiyse çok, geç bildiyse az puan alır, çizen de her bilen için puan alır. Süre
// ilerledikçe kelimenin birkaç harfi açılır. Sunucu (ayrı Durable Object `Draw`) her şeyi doğrular; kelime sadece
// çizene gider (tur bitince herkese). Bu dosya mesajlar, doğrulama ve saf kurallar (tahmin eşleştirme, ipucu, puan).

import { CLIENT_ID, cleanName, isAvatar, type Avatar } from '../protocol.ts';

/** Geriye uyumsuz değişiklikte artar (eski sayfa "yenile" uyarısı alır). */
export const DRAW_PROTOCOL_VERSION = 1;
export const DRAW_MAX_PLAYERS = 8;
/** Çizim süresi, kelime seçme süresi, tur sonu gösterimi. */
export const DRAW_ROUND_MS = 80_000;
export const DRAW_CHOOSE_MS = 15_000;
export const DRAW_REVEAL_MS = 6_000;
/** Kalem renkleri ve kalınlıkları (çizgide sadece sıra numarası gider). Beyaz silgi gibi kullanılır. */
export const DRAW_COLORS = ['#1b1b1f', '#ffffff', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#6d4c41', '#ec407a'] as const;
export const DRAW_SIZES = [4, 10, 24] as const;
/** Tuval: 1000 × 750 (4:3) mantıksal birim; noktalar bu ızgarada tam sayı. */
export const DRAW_W = 1000;
export const DRAW_H = 750;
/** Bir çizgi parçasında en fazla nokta (parça parça yollanır). */
export const STROKE_MAX_POINTS = 120;

export type DrawLang = 'tr' | 'en';
export type DrawPhase = 'lobby' | 'choose' | 'draw' | 'reveal';

/** Çizgi parçası: renk ve kalınlık sırası, noktalar [x0, y0, x1, y1, …]. */
export interface Stroke {
  c: number;
  w: number;
  p: number[];
}

export interface DrawPlayer {
  id: string;
  name: string;
  avatar?: Avatar;
  score: number;
  /** Bu turda bildi mi. */
  guessed: boolean;
  online: boolean;
}

export type DrawClientMessage =
  | { t: 'hello'; v: number; name: string; avatar?: Avatar; cid?: string; lang?: DrawLang }
  /** Oyunu başlat (lobide, en az 2 kişi). */
  | { t: 'start' }
  /** Çizen kelimesini seçer (0–2). */
  | { t: 'choose'; index: number }
  | { t: 'stroke'; s: Stroke }
  | { t: 'clear' }
  | { t: 'guess'; text: string }
  /** Oyunu bitirip lobiye dön, puanları sıfırla. */
  | { t: 'reset' }
  | { t: 'ping' };

export type DrawServerMessage =
  | { t: 'welcome'; you: string; now: number }
  | {
      t: 'state';
      phase: DrawPhase;
      players: DrawPlayer[];
      drawer: string | null;
      /** Gizli kelime: harfler "_", açılanlar görünür, boşluk korunur. */
      hint: string;
      /** Kelimenin kendisi: sadece çizene, tur sonunda herkese. */
      word?: string;
      /** Bu evrenin bitiş anı (sunucu saati). */
      endsAt: number | null;
      round: number;
      lang: DrawLang;
    }
  /** Sadece çizene: seçebileceği üç kelime. */
  | { t: 'choices'; words: string[] }
  | { t: 'stroke'; s: Stroke }
  /** Geç gelene o ana kadarki çizim. */
  | { t: 'strokes'; list: Stroke[] }
  | { t: 'clear' }
  /** Yanlış tahmin (herkese) ya da bilenlerin kendi aralarındaki mesajı (`secret`: sadece bilenlere ve çizene). */
  | { t: 'guess'; from: string; name: string; text: string; secret?: boolean }
  | { t: 'correct'; from: string; name: string; points: number }
  /** Sadece tahmin edene: çok yaklaştın. */
  | { t: 'close'; text: string }
  | { t: 'error'; code: DrawErrorCode }
  | { t: 'pong'; now: number };

export type DrawErrorCode = 'version' | 'bad' | 'full' | 'rate' | 'not_drawer' | 'too_few';

const isInt = (x: unknown, min: number, max: number): x is number => Number.isInteger(x) && (x as number) >= min && (x as number) <= max;

export function cleanStroke(x: unknown): Stroke | null {
  const s = x as Stroke | null;
  if (!s || typeof s !== 'object' || !isInt(s.c, 0, DRAW_COLORS.length - 1) || !isInt(s.w, 0, DRAW_SIZES.length - 1)) return null;
  if (!Array.isArray(s.p) || s.p.length < 2 || s.p.length > STROKE_MAX_POINTS * 2 || s.p.length % 2 !== 0) return null;
  for (let i = 0; i < s.p.length; i += 2) if (!isInt(s.p[i], 0, DRAW_W) || !isInt(s.p[i + 1], 0, DRAW_H)) return null;
  return { c: s.c, w: s.w, p: s.p.slice() };
}

/** İstemciden gelen mesajı doğrular ve yeni nesneye kopyalar; geçersizse null. */
export function parseDrawMessage(raw: string): DrawClientMessage | null {
  if (raw.length > 4000) return null;
  let m: Record<string, unknown>;
  try {
    m = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!m || typeof m !== 'object') return null;
  switch (m.t) {
    case 'hello': {
      const name = cleanName(m.name);
      if (typeof m.v !== 'number' || name === null) return null;
      const hello: Extract<DrawClientMessage, { t: 'hello' }> = { t: 'hello', v: m.v, name };
      if (isAvatar(m.avatar)) hello.avatar = m.avatar;
      if (typeof m.cid === 'string' && CLIENT_ID.test(m.cid)) hello.cid = m.cid;
      if (m.lang === 'tr' || m.lang === 'en') hello.lang = m.lang;
      return hello;
    }
    case 'choose':
      return isInt(m.index, 0, 2) ? { t: 'choose', index: m.index } : null;
    case 'stroke': {
      const s = cleanStroke(m.s);
      return s ? { t: 'stroke', s } : null;
    }
    case 'guess': {
      if (typeof m.text !== 'string') return null;
      const text = m.text.replace(/\s+/g, ' ').trim().slice(0, 40);
      return text ? { t: 'guess', text } : null;
    }
    case 'start':
    case 'clear':
    case 'reset':
    case 'ping':
      return { t: m.t };
    default:
      return null;
  }
}

/** Karşılaştırma için: küçük harf (dile göre), fazla boşluk yok. */
export function normalizeGuess(text: string, lang: DrawLang): string {
  return text.toLocaleLowerCase(lang === 'tr' ? 'tr' : 'en').replace(/\s+/g, ' ').trim();
}

/** Türkçe harfleri sadeleştir (klavyesinde Türkçe harf olmayan da bilebilsin: "kopek" = "köpek"). */
export function plainLetters(text: string): string {
  return text.replace(/[çğıöşüâîû]/g, (ch) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' })[ch] ?? ch);
}

export function isCorrect(guess: string, word: string, lang: DrawLang): boolean {
  const g = normalizeGuess(guess, lang);
  const w = normalizeGuess(word, lang);
  return g === w || plainLetters(g) === plainLetters(w);
}

/** Bir harf eksik/fazla/farklı mı (uzun kelimelerde "çok yaklaştın"). */
export function isClose(guess: string, word: string, lang: DrawLang): boolean {
  const a = plainLetters(normalizeGuess(guess, lang));
  const b = plainLetters(normalizeGuess(word, lang));
  if (b.length < 4 || a === b || Math.abs(a.length - b.length) > 1) return false;
  // Levenshtein ≤ 1
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Gizli kelime: açılmamış harfler "_", aralarında boşluk; kelime araları üç boşluk gibi görünsün diye "  ". */
export function maskWord(word: string, revealed: readonly number[] = []): string {
  return [...word].map((ch, i) => (ch === ' ' ? ' ' : revealed.includes(i) ? ch : '_')).join(' ');
}

/** Açılacak harflerin sırası (her tur rastgele): kelimenin yarıdan azı açılır, en fazla 3. */
export function revealOrder(word: string, random: () => number = Math.random): number[] {
  const letters = [...word].map((ch, i) => (ch === ' ' ? -1 : i)).filter((i) => i >= 0);
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [letters[i], letters[j]] = [letters[j]!, letters[i]!];
  }
  const count = Math.min(3, Math.floor((letters.length - 1) / 2));
  return letters.slice(0, count);
}

/** Harf açılma anları (turun %40, %60, %80'inde). */
export function revealTimes(start: number, count: number): number[] {
  return [0.4, 0.6, 0.8].slice(0, count).map((k) => start + Math.round(DRAW_ROUND_MS * k));
}

/** Doğru bilenin puanı: erken bilen çok alır (50–150), çizen her bilen için 25. */
export function guessPoints(remainingMs: number): number {
  return 50 + Math.round((100 * Math.max(0, Math.min(remainingMs, DRAW_ROUND_MS))) / DRAW_ROUND_MS);
}
export const DRAWER_POINTS = 25;

/** Oyun kodu: oda kimlikleriyle aynı biçim. */
export const DRAW_ID_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;
