import { isValidMedia, type Media } from './protocol.ts';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

/** Doğrudan oynatılabilen video dosyası uzantıları. */
const VIDEO_FILE = /\.(mp4|m4v|webm|ogv|ogg|mov)$/i;

/**
 * Kullanıcının yapıştırdığı metni bir videoya çevirir:
 * - YouTube linkleri (watch, youtu.be, shorts, embed, live) ve çıplak 11 karakterlik ID → sitede oynar
 * - Video dosyası linkleri (.mp4, .webm...) → sitede oynar
 * - Diğer her web adresi → "sayfa": herkes kendi sekmesinde açar, eklenti senkronlar
 */
export function parseMediaInput(input: string): Media | null {
  const text = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return { kind: 'youtube', id: text };

  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  let youtubeId: string | null = null;
  let short = false;
  if (host === 'youtu.be') {
    youtubeId = url.pathname.split('/')[1] ?? null;
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (url.pathname === '/watch') {
      youtubeId = url.searchParams.get('v');
    } else {
      const match = url.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/);
      youtubeId = match?.[2] ?? null;
      short = match?.[1] === 'shorts';
    }
  }

  if (youtubeId !== null) {
    // Shorts linki dikey videodur: oda "Shorts görünümüne" geçer.
    const media: Media = short ? { kind: 'youtube', id: youtubeId, short: true } : { kind: 'youtube', id: youtubeId };
    return isValidMedia(media) ? media : null;
  }
  if (YOUTUBE_HOSTS.has(host)) return null;
  // "merhaba" gibi düz metinler adres sayılmasın: alan adında nokta olmalı.
  if (!host.includes('.') && host !== 'localhost') return null;

  const media: Media = { kind: VIDEO_FILE.test(url.pathname) ? 'html5' : 'page', url: url.toString() };
  return isValidMedia(media) ? media : null;
}

/** At most this many links from one paste go to the queue. */
export const MEDIA_LIST_MAX = 30;

/**
 * Many links pasted at once (0.9.90.7, Shorts step 2: "paste many links"): a list of YouTube / video file links,
 * separated by spaces, new lines or commas. Only tokens that really look like links count (a search such as
 * "funny cats" stays a search; an 11-letter word is never taken for a video id here). Film pages are left out (each
 * one moves everyone's tab, they are added one by one). Duplicates are dropped. Fewer than two links: `[]`.
 */
export function parseMediaList(input: string): { media: Media[]; skipped: number } {
  const tokens = input.split(/[\s,]+/).filter((token) => /^(https?:\/\/|www\.|youtu\.be\/|(m\.)?youtube\.com\/)/i.test(token));
  if (tokens.length < 2) return { media: [], skipped: 0 };
  const media: Media[] = [];
  let skipped = 0;
  for (const token of tokens) {
    const item = parseMediaInput(token);
    if (!item || item.kind === 'page') {
      skipped++;
      continue;
    }
    if (media.some((m) => sameMedia(m, item))) continue;
    if (media.length >= MEDIA_LIST_MAX) {
      skipped++;
      continue;
    }
    media.push(item);
  }
  return media.length >= 2 ? { media, skipped } : { media: [], skipped: 0 };
}

export function sameMedia(a: Media | null, b: Media | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind === 'youtube' && b.kind === 'youtube') return a.id === b.id;
  if (a.kind === 'test' || b.kind === 'test') return a.kind === b.kind;
  if (a.kind !== 'youtube' && b.kind === a.kind) return a.url === b.url;
  return false;
}

/**
 * İki adres aynı sayfa mı? Adres çubuğundaki # kısmı ve sondaki / farkı
 * önemsenmez (siteler bunları kendiliğinden değiştirebiliyor).
 */
export function samePage(a: string, b: string): boolean {
  const normalize = (raw: string) => {
    try {
      const url = new URL(raw);
      url.hash = '';
      return url.toString().replace(/\/$/, '');
    } catch {
      return raw;
    }
  };
  return normalize(a) === normalize(b);
}
