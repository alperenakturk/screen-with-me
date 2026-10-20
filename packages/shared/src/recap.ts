import type { Avatar } from './protocol.ts';

/**
 * Oturum özeti ("blend"): sunucu odada olanları sayar (StatsTracker), biri özeti açınca sayaçlar
 * bir Recap'e dönüşür ve sıfırlanır. İstemci bundan her seferinde farklı birkaç ilginç kart seçer
 * (chooseFacts). Kişiler kalıcı anahtarla sayılır ama özete sadece ad/avatar girer.
 */

export interface PersonStats {
  name: string;
  avatar?: Avatar;
  chat: number;
  reactions: number;
  pins: number;
  pauses: number;
  seeks: number;
  /** Emoji → kaç kez (özel emojiler '🖼️' altında). */
  emoji: Record<string, number>;
}

export interface StatsData {
  since: number;
  /** Son sayım anı; oda boşken null (boş odada geçen süre sayılmaz). */
  tick: number | null;
  watchMs: number;
  /** Videoda ilerlenen süre (hızla çarpılmış): ortalama hız = videoMs / watchMs. */
  videoMs: number;
  videos: number;
  titles: string[];
  lastItem: string | null;
  peak: number;
  people: Record<string, PersonStats>;
}

export interface RecapPerson {
  name: string;
  avatar?: Avatar;
  chat: number;
  reactions: number;
  pins: number;
  pauses: number;
  seeks: number;
  /** En çok attığı emoji (varsa). */
  top?: string;
  sad: number;
  laugh: number;
}

export interface Recap {
  id: string;
  from: number;
  to: number;
  watchSec: number;
  videoSec: number;
  videos: number;
  titles: string[];
  peak: number;
  chat: number;
  reactions: number;
  pins: number;
  pauses: number;
  seeks: number;
  /** Odanın en çok kullandığı emojiler (en fazla 3). */
  emojis: Array<[string, number]>;
  people: RecapPerson[];
}

const SAD = new Set(['😢', '💔', '😭']);
const LAUGH = new Set(['😂', '🤡', '💀']);
export const STICKER_MARK = '🖼️';
const MAX_PEOPLE = 30;

export function emptyStats(now: number): StatsData {
  return { since: now, tick: now, watchMs: 0, videoMs: 0, videos: 0, titles: [], lastItem: null, peak: 0, people: {} };
}

type Who = { name: string; avatar?: Avatar };

export class StatsTracker {
  data: StatsData;

  constructor(data?: StatsData | null, now = Date.now()) {
    this.data = data && typeof data.since === 'number' && data.people ? data : emptyStats(now);
  }

  /**
   * Oynarken geçen süreyi ekler. Oda durumu her değişmeden ÖNCE eski durumla çağrılır.
   * `present`: odada biri var mı (yoksa sayım durur, dönünce kaldığı yerden başlar).
   */
  tick(now: number, playing: boolean, rate: number, present: boolean): void {
    const d = this.data;
    if (d.tick !== null && playing && now > d.tick) {
      const ms = Math.min(now - d.tick, 6 * 3600_000);
      d.watchMs += ms;
      d.videoMs += ms * rate;
    }
    d.tick = present ? now : null;
  }

  private person(key: string, who: Who): PersonStats {
    let p = this.data.people[key];
    if (!p) {
      // Çok kalabalık odada sayaçlar şişmesin.
      if (Object.keys(this.data.people).length >= MAX_PEOPLE) {
        return { name: who.name, chat: 0, reactions: 0, pins: 0, pauses: 0, seeks: 0, emoji: {} };
      }
      p = { name: who.name, chat: 0, reactions: 0, pins: 0, pauses: 0, seeks: 0, emoji: {} };
      this.data.people[key] = p;
    }
    p.name = who.name;
    if (who.avatar) p.avatar = who.avatar;
    return p;
  }

  chat(key: string, who: Who): void {
    this.person(key, who).chat++;
  }

  reaction(key: string, who: Who, emoji: string | null): void {
    const p = this.person(key, who);
    p.reactions++;
    const mark = emoji ?? STICKER_MARK;
    p.emoji[mark] = (p.emoji[mark] ?? 0) + 1;
  }

  pin(key: string, who: Who): void {
    this.person(key, who).pins++;
  }

  action(key: string, who: Who, action: string): void {
    if (action === 'pause') this.person(key, who).pauses++;
    else if (action === 'seek') this.person(key, who).seeks++;
  }

  /** Yeni bir video açıldı (aynı öğe tekrar sayılmaz). */
  video(itemId: string, title: string | null): void {
    if (this.data.lastItem === itemId) return;
    this.data.lastItem = itemId;
    this.data.videos++;
    if (title) this.data.titles = [...this.data.titles.filter((x) => x !== title), title].slice(-5);
  }

  /** Başlık sonradan bulunduysa listeye ekler. */
  title(itemId: string, title: string): void {
    if (this.data.lastItem === itemId && !this.data.titles.includes(title)) this.data.titles = [...this.data.titles, title].slice(-5);
  }

  people(count: number): void {
    if (count > this.data.peak) this.data.peak = count;
  }

  /** Gösterecek bir şey yok mu (1 dk'dan az izleme ve hiç etkileşim yok)? */
  isEmpty(): boolean {
    const d = this.data;
    const any = Object.values(d.people).some((p) => p.chat + p.reactions + p.pins > 0);
    return d.watchMs < 60_000 && !any;
  }

  recap(now: number, id: string): Recap {
    const d = this.data;
    const people = Object.values(d.people).map((p): RecapPerson => {
      const sorted = Object.entries(p.emoji).sort((a, b) => b[1] - a[1]);
      const out: RecapPerson = {
        name: p.name,
        chat: p.chat,
        reactions: p.reactions,
        pins: p.pins,
        pauses: p.pauses,
        seeks: p.seeks,
        sad: Object.entries(p.emoji).reduce((n, [e, c]) => n + (SAD.has(e) ? c : 0), 0),
        laugh: Object.entries(p.emoji).reduce((n, [e, c]) => n + (LAUGH.has(e) ? c : 0), 0),
      };
      if (p.avatar) out.avatar = p.avatar;
      if (sorted[0]) out.top = sorted[0][0];
      return out;
    });
    const totals: Record<string, number> = {};
    for (const p of Object.values(d.people)) for (const [e, c] of Object.entries(p.emoji)) totals[e] = (totals[e] ?? 0) + c;
    const sum = (k: 'chat' | 'reactions' | 'pins' | 'pauses' | 'seeks') => people.reduce((n, p) => n + p[k], 0);
    return {
      id,
      from: d.since,
      to: now,
      watchSec: Math.round(d.watchMs / 1000),
      videoSec: Math.round(d.videoMs / 1000),
      videos: d.videos,
      titles: [...d.titles],
      peak: d.peak,
      chat: sum('chat'),
      reactions: sum('reactions'),
      pins: sum('pins'),
      pauses: sum('pauses'),
      seeks: sum('seeks'),
      emojis: Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 3),
      people,
    };
  }

  /** Özet açıldı: yeni dönem başlar (açık video yeni dönemde tekrar sayılmaz). */
  reset(now: number, present: boolean): void {
    const lastItem = this.data.lastItem;
    this.data = emptyStats(now);
    this.data.lastItem = lastItem;
    this.data.tick = present ? now : null;
  }
}

/** Özetteki kartlar. 'time' hep ilk, 'summary' hep son; aradakiler her seferinde rastgele. */
export type Fact =
  | { kind: 'time' }
  | { kind: 'videos' }
  | { kind: 'speed'; rate: number }
  | { kind: 'talker'; person: RecapPerson }
  | { kind: 'reactor'; person: RecapPerson }
  | { kind: 'sad'; person: RecapPerson }
  | { kind: 'laugh'; person: RecapPerson }
  | { kind: 'emoji'; emoji: string; count: number }
  | { kind: 'pins'; person: RecapPerson }
  | { kind: 'pauser'; person: RecapPerson }
  | { kind: 'seeker'; person: RecapPerson }
  | { kind: 'crowd' }
  | { kind: 'summary' };

const top = (people: RecapPerson[], key: keyof Pick<RecapPerson, 'chat' | 'reactions' | 'pins' | 'pauses' | 'seeks' | 'sad' | 'laugh'>) =>
  [...people].sort((a, b) => b[key] - a[key])[0];

/** Bu özete uyan ilginç kartlardan en fazla `count` tanesini rastgele seçer. */
export function chooseFacts(recap: Recap, random: () => number = Math.random, count = 4): Fact[] {
  const many = recap.people.length >= 2;
  const options: Fact[] = [];
  const add = (ok: boolean, fact: () => Fact) => ok && options.push(fact());
  const rate = recap.watchSec > 0 ? Math.round((recap.videoSec / recap.watchSec) * 100) / 100 : 1;
  add(recap.videos >= 2, () => ({ kind: 'videos' }));
  add(recap.watchSec >= 120 && Math.abs(rate - 1) >= 0.05, () => ({ kind: 'speed', rate }));
  const talker = top(recap.people, 'chat');
  add(many && !!talker && talker.chat >= 3, () => ({ kind: 'talker', person: talker! }));
  const reactor = top(recap.people, 'reactions');
  add(!!reactor && reactor.reactions >= 3, () => ({ kind: 'reactor', person: reactor! }));
  const sad = top(recap.people, 'sad');
  add(!!sad && sad.sad >= 2, () => ({ kind: 'sad', person: sad! }));
  const laugh = top(recap.people, 'laugh');
  add(!!laugh && laugh.laugh >= 3, () => ({ kind: 'laugh', person: laugh! }));
  const emoji = recap.emojis[0];
  add(!!emoji && emoji[1] >= 3, () => ({ kind: 'emoji', emoji: emoji![0], count: emoji![1] }));
  const pinner = top(recap.people, 'pins');
  add(!!pinner && pinner.pins >= 1, () => ({ kind: 'pins', person: pinner! }));
  const pauser = top(recap.people, 'pauses');
  add(many && !!pauser && pauser.pauses >= 3, () => ({ kind: 'pauser', person: pauser! }));
  const seeker = top(recap.people, 'seeks');
  add(!!seeker && seeker.seeks >= 3, () => ({ kind: 'seeker', person: seeker! }));
  add(recap.peak >= 3, () => ({ kind: 'crowd' }));
  // Karıştır (Fisher–Yates) ve ilk birkaçını al: her açılışta sürpriz olsun.
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j]!, options[i]!];
  }
  return [{ kind: 'time' }, ...options.slice(0, count), { kind: 'summary' }];
}

/** Kayıtlı olmayan odada kaç özet tutulur / kayıtlı odada kaç tane ve ne kadar süre. */
export const RECAPS_KEEP = 3;
export const RECAPS_KEEP_SAVED = 10;
export const RECAP_MAX_AGE_MS = 90 * 86_400_000;
