import { isValidMedia, type Media } from './protocol.ts';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

const TIKTOK_HOSTS = new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com']);
/** Short share links (`vm.tiktok.com/ZMxxxx/`): only the server can follow them to the video (`/api/tiktok/resolve`). */
const TIKTOK_SHORT_HOSTS = new Set(['vm.tiktok.com', 'vt.tiktok.com']);

/**
 * A TikTok video link → `{kind:'tiktok'}` (0.9.91.18): `tiktok.com/@user/video/<id>`, `/v/<id>(.html)`,
 * `/embed/v2/<id>`, `/player/v1/<id>`. Null for anything else (profiles, short links, photo posts).
 */
export function parseTikTok(url: URL): Media | null {
  if (!TIKTOK_HOSTS.has(url.hostname.toLowerCase())) return null;
  const video = url.pathname.match(/^\/@([A-Za-z0-9._]{1,40})\/video\/(\d{8,25})\b/);
  if (video) return { kind: 'tiktok', id: video[2]!, user: video[1]! };
  const other = url.pathname.match(/^\/(?:v|embed\/v2|embed|player\/v1)\/(\d{8,25})\b/);
  return other ? { kind: 'tiktok', id: other[1]! } : null;
}

const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);

/**
 * A Vimeo video link → `{kind:'vimeo'}` (card P1): `vimeo.com/<id>`, `vimeo.com/<id>/<hash>` (unlisted),
 * `vimeo.com/channels/<name>/<id>`, `/groups/<name>/videos/<id>`, `/showcase/<n>/video/<id>`, `/album/<n>/video/<id>`,
 * `player.vimeo.com/video/<id>?h=<hash>`. Null for anything else (profiles, showcases, live events).
 */
export function parseVimeo(url: URL): Media | null {
  const host = url.hostname.toLowerCase();
  if (!VIMEO_HOSTS.has(host)) return null;
  const path = url.pathname.replace(/\/+$/, '');
  const match =
    host === 'player.vimeo.com'
      ? path.match(/^\/video\/(\d{1,12})()$/)
      : path.match(/^\/(?:channels\/[\w-]+\/|groups\/[\w-]+\/videos\/|(?:showcase|album)\/\d+\/video\/)?(\d{1,12})(?:\/([0-9a-f]{6,20}))?$/i);
  if (!match) return null;
  const hash = match[2] || url.searchParams.get('h') || '';
  const media: Media = /^[0-9a-f]{6,20}$/i.test(hash) ? { kind: 'vimeo', id: match[1]!, hash } : { kind: 'vimeo', id: match[1]! };
  return isValidMedia(media) ? media : null;
}

/** Is this a TikTok short share link (vm. / vt.tiktok.com) the server has to resolve first? */
export function isTikTokShortLink(input: string): boolean {
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
    return TIKTOK_SHORT_HOSTS.has(url.hostname.toLowerCase()) && /^\/[A-Za-z0-9]{5,20}\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

/** May the server follow a TikTok redirect to this address? Only https on TikTok's own hosts, the default port and
 * no user-info (security review 2, L7). */
export function isTikTokHop(url: URL): boolean {
  return url.protocol === 'https:' && url.port === '' && url.username === '' && url.password === '' && /(^|\.)tiktok\.com$/.test(url.hostname.toLowerCase());
}

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
  // TikTok videos play on our site through TikTok's official embed player (0.9.91.18), not as a film page.
  if (TIKTOK_HOSTS.has(host)) {
    const tiktok = parseTikTok(url);
    return tiktok && isValidMedia(tiktok) ? tiktok : null;
  }
  // Vimeo videos play on our site through Vimeo's own player (card P1); other Vimeo pages stay film pages.
  if (VIMEO_HOSTS.has(host)) {
    const vimeo = parseVimeo(url);
    if (vimeo) return vimeo;
  }
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
  const tokens = input.split(/[\s,]+/).filter((token) => /^(https?:\/\/|www\.|youtu\.be\/|(m\.)?youtube\.com\/|(www\.)?tiktok\.com\/|(www\.)?vimeo\.com\/)/i.test(token));
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
  if (a.kind === 'tiktok' || b.kind === 'tiktok') return a.kind === 'tiktok' && b.kind === 'tiktok' && a.id === b.id;
  if (a.kind === 'vimeo' || b.kind === 'vimeo') return a.kind === 'vimeo' && b.kind === 'vimeo' && a.id === b.id;
  if (a.kind === 'test' || b.kind === 'test') return a.kind === b.kind;
  if ((a.kind === 'html5' || a.kind === 'page') && b.kind === a.kind) return a.url === b.url;
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
