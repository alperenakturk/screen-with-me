/**
 * Card SRC1: Vimeo search from the room's link box (the ⠿ Sources picker). The Worker asks the Vimeo API with the
 * `VIMEO_TOKEN` secret that only it knows (`/api/vimeo/search`); this file holds the pure parts both sides share: the
 * address of the API call, turning Vimeo's JSON into our answer (only public videos that may be embedded, as our
 * Vimeo player needs) and the client's check of that answer. No token, address or field of Vimeo's answer other than
 * the ones below ever reaches a page.
 */

/** Results per search (one page of Vimeo's answer; it may hold fewer after the embeddable filter). */
export const VIMEO_RESULTS = 12;
/** Asked for a few more than shown: some come back private or not embeddable and are dropped. */
export const VIMEO_ASK = 20;
const TITLE_MAX = 200;
const USER_MAX = 80;
/** A Vimeo video id: digits only (`vimeo.com/76979871`). */
export const VIMEO_ID = /^\d{1,12}$/;
/** Thumbnails come only from Vimeo's image host (the page's CSP allows exactly this host). */
export const VIMEO_THUMB_HOST = 'i.vimeocdn.com';

export interface VimeoResult {
  id: string;
  title: string;
  /** The uploader's display name. */
  user: string;
  /** Seconds; null when unknown. */
  duration: number | null;
  /** A thumbnail on `i.vimeocdn.com`, or null. */
  thumb: string | null;
}

/**
 * - `off`: the server has no `VIMEO_TOKEN` (local, CI, or before the owner adds it): the tile says "not available yet".
 * - `busy`: this address searched too often in the last minute (shared with the other searches).
 * - `failed`: anything else (network, a Vimeo error).
 */
export type VimeoError = 'off' | 'busy' | 'failed';
export type VimeoAnswer = { items: VimeoResult[] } | { error: VimeoError };

/** The fields asked from Vimeo: nothing more than the answer needs (smaller and faster). */
const FIELDS = 'uri,name,duration,user.name,pictures.sizes,privacy.view,privacy.embed,is_playable';

/** The Vimeo API address for a search (the words already normalized; the token goes in a header, never here). */
export function vimeoSearchUrl(query: string): string {
  const url = new URL('https://api.vimeo.com/videos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(VIMEO_ASK));
  url.searchParams.set('sort', 'relevant');
  url.searchParams.set('fields', FIELDS);
  return url.toString();
}

const text = (value: unknown, max: number): string =>
  typeof value === 'string' ? Array.from(value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, max).join('') : '';

/** A thumbnail address on Vimeo's image host (https only), else null. */
export function cleanVimeoThumb(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 500) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === VIMEO_THUMB_HOST && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

/** The picture closest to 295 px wide (the list shows it at about 120 px; a little extra for sharp screens). */
function pickThumb(sizes: unknown): string | null {
  if (!Array.isArray(sizes)) return null;
  let best: { width: number; link: string } | null = null;
  for (const size of sizes) {
    const width = typeof size?.width === 'number' ? size.width : 0;
    const link = cleanVimeoThumb(size?.link);
    if (!link || width <= 0) continue;
    if (!best || Math.abs(width - 295) < Math.abs(best.width - 295)) best = { width, link };
  }
  return best?.link ?? null;
}

/**
 * Vimeo's `/videos` answer → our results: only videos anybody may see and any site may embed (`privacy.view` =
 * `anybody`, `privacy.embed` = `public`) that can play now, at most `VIMEO_RESULTS`. Everything else is dropped.
 */
export function parseVimeoSearch(body: unknown): VimeoResult[] {
  const data = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return [];
  const out: VimeoResult[] = [];
  const seen = new Set<string>();
  for (const video of data) {
    if (out.length >= VIMEO_RESULTS) break;
    const id = typeof video?.uri === 'string' ? video.uri.match(/^\/videos\/(\d{1,12})$/)?.[1] : undefined;
    if (!id || seen.has(id)) continue;
    if (video.privacy?.view !== 'anybody' || video.privacy?.embed !== 'public' || video.is_playable === false) continue;
    const title = text(video.name, TITLE_MAX);
    if (!title) continue;
    seen.add(id);
    const duration = typeof video.duration === 'number' && Number.isFinite(video.duration) && video.duration > 0 ? Math.round(video.duration) : null;
    out.push({ id, title, user: text(video.user?.name, USER_MAX), duration, thumb: pickThumb(video.pictures?.sizes) });
  }
  return out;
}

/** The page's check of our Worker's answer (a broken or strange answer becomes `failed`, never a crash). */
export function parseVimeoAnswer(body: unknown): VimeoAnswer {
  const value = body as { items?: unknown; error?: unknown } | null;
  if (value && (value.error === 'off' || value.error === 'busy' || value.error === 'failed')) return { error: value.error };
  if (!value || !Array.isArray(value.items)) return { error: 'failed' };
  const items: VimeoResult[] = [];
  for (const item of value.items.slice(0, VIMEO_RESULTS)) {
    if (typeof item?.id !== 'string' || !VIMEO_ID.test(item.id)) continue;
    const title = text(item.title, TITLE_MAX);
    if (!title) continue;
    const duration = typeof item.duration === 'number' && Number.isFinite(item.duration) && item.duration > 0 ? Math.round(item.duration) : null;
    items.push({ id: item.id, title, user: text(item.user, USER_MAX), duration, thumb: cleanVimeoThumb(item.thumb) });
  }
  return { items };
}
