import type { Media } from '@swm/shared/protocol';

const TIMEOUT_MS = 2500;
const MAX_TITLE_LENGTH = 200;

/**
 * Sıra listesinde göstermek için videonun başlığını bulur.
 * YouTube için resmi oEmbed servisi kullanılır (anahtar gerektirmez).
 * Bulunamazsa null döner; başlık sadece süs, hiçbir şey ona bağlı değil.
 */
export async function resolveTitle(media: Media): Promise<string | null> {
  if (media.kind === 'test') return null;
  if (media.kind === 'html5') return titleFromUrl(media.url);
  // Sayfaların başlığını sunucu çekmez (rastgele sitelere istek atmamak için);
  // eklenti sekme başlığını yollar, yoksa alan adı gösterilir.
  if (media.kind === 'page') return hostOf(media.url);

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
