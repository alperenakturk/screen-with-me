import { cleanTitle, type Media } from '@swm/shared/protocol';

const TIMEOUT_MS = 2500;
const MAX_TITLE_LENGTH = 200;

/**
 * Sıra listesinde göstermek için videonun başlığını bulur.
 * YouTube için resmi oEmbed servisi kullanılır (anahtar gerektirmez).
 * Bulunamazsa null döner; başlık sadece süs, hiçbir şey ona bağlı değil.
 */
export async function resolveTitle(media: Media): Promise<string | null> {
  // Security L1: titles from oEmbed answers and file names go through the same cleaner as typed text.
  const raw = await lookUpTitle(media);
  return raw === null ? null : cleanTitle(raw);
}

async function lookUpTitle(media: Media): Promise<string | null> {
  if (media.kind === 'test') return null;
  if (media.kind === 'html5') return titleFromUrl(media.url);
  // Sayfaların başlığını sunucu çekmez (rastgele sitelere istek atmamak için);
  // eklenti sekme başlığını yollar, yoksa alan adı gösterilir.
  if (media.kind === 'page') return hostOf(media.url);
  if (media.kind === 'tiktok') return tiktokTitle(media.id, media.user);
  if (media.kind === 'vimeo') return vimeoTitle(media.id, media.hash);

  const videoUrl = `https://www.youtube.com/watch?v=${media.id}`;
  try {
    const response = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(videoUrl)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    const title = typeof data === 'object' && data !== null ? (data as { title?: unknown }).title : null;
    return typeof title === 'string' ? title.slice(0, MAX_TITLE_LENGTH) : null;
  } catch {
    return null;
  }
}

/** Vimeo's official oEmbed (no key); an unlisted video needs its hash in the link. */
async function vimeoTitle(id: string, hash?: string): Promise<string | null> {
  try {
    const link = `https://vimeo.com/${id}${hash ? `/${hash}` : ''}`;
    const response = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(link)}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    const title = typeof data === 'object' && data !== null ? (data as { title?: unknown }).title : null;
    return typeof title === 'string' && title.trim() ? title.trim().slice(0, MAX_TITLE_LENGTH) : null;
  } catch {
    return null;
  }
}

function hostOf(raw: string): string | null {
  try {
    return new URL(raw).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function titleFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const file = url.pathname.split('/').filter(Boolean).pop();
    const name = file ? decodeURIComponent(file) : url.hostname;
    return name.slice(0, MAX_TITLE_LENGTH);
  } catch {
    return null;
  }
}

/**
 * TikTok's official oEmbed (no key): the caption, or "@user" when there is none. It needs the full link with the
 * @handle; links without one get no title (the queue shows "TikTok · …").
 */
async function tiktokTitle(id: string, user?: string): Promise<string | null> {
  if (!user) return null;
  try {
    const link = `https://www.tiktok.com/@${user}/video/${id}`;
    const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(link)}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return `@${user}`;
    const data: unknown = await response.json();
    const title = typeof data === 'object' && data !== null ? (data as { title?: unknown }).title : null;
    const text = typeof title === 'string' ? title.replace(/\s+/g, ' ').trim() : '';
    return (text || `@${user}`).slice(0, MAX_TITLE_LENGTH);
  } catch {
    return `@${user}`;
  }
}
