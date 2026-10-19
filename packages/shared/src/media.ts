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
  if (host === 'youtu.be') {
    youtubeId = url.pathname.split('/')[1] ?? null;
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (url.pathname === '/watch') {
      youtubeId = url.searchParams.get('v');
    } else {
      const match = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
      youtubeId = match?.[1] ?? null;
    }
  }

  if (youtubeId !== null) {
    const media: Media = { kind: 'youtube', id: youtubeId };
    return isValidMedia(media) ? media : null;
  }
  if (YOUTUBE_HOSTS.has(host)) return null;
  // "merhaba" gibi düz metinler adres sayılmasın: alan adında nokta olmalı.
  if (!host.includes('.') && host !== 'localhost') return null;

  const media: Media = { kind: VIDEO_FILE.test(url.pathname) ? 'html5' : 'page', url: url.toString() };
  return isValidMedia(media) ? media : null;
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
