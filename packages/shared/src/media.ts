import { isValidMedia, type Media } from './protocol.ts';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

/**
 * Kullanıcının yapıştırdığı metni bir videoya çevirir.
 * Kabul edilenler: YouTube linkleri (watch, youtu.be, shorts, embed, live),
 * çıplak 11 karakterlik YouTube ID'si ve doğrudan video linkleri (.mp4, .webm...).
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

  const media: Media = { kind: 'html5', url: url.toString() };
  return isValidMedia(media) ? media : null;
}

export function sameMedia(a: Media | null, b: Media | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind === 'youtube' && b.kind === 'youtube') return a.id === b.id;
  if (a.kind === 'html5' && b.kind === 'html5') return a.url === b.url;
  return false;
}
