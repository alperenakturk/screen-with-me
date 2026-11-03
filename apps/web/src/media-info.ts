import type { QueueItem } from '@swm/shared/protocol';
import { t } from './i18n.ts';

/** Sunucunun sonradan bildirdiği başlıklar (öğe ID'sine göre). */
const lateTitles = new Map<string, string>();

export function rememberTitle(itemId: string, title: string): void {
  lateTitles.set(itemId, title);
}

/** Sıra öğesinin ekranda görünecek adı. */
export function itemTitle(item: QueueItem): string {
  const title = item.title ?? lateTitles.get(item.id);
  if (title) return title;
  if (item.media.kind === 'test') return t('syncTestTitle');
  if (item.media.kind === 'tiktok') return item.media.user ? `TikTok · @${item.media.user}` : 'TikTok';
  if (item.media.kind === 'vimeo') return `Vimeo · ${item.media.id}`;
  return item.media.kind === 'youtube' ? `YouTube · ${item.media.id}` : item.media.url;
}

/** YouTube için küçük resim; diğerleri için null. */
export function itemThumbnail(item: QueueItem): string | null {
  return item.media.kind === 'youtube' ? `https://i.ytimg.com/vi/${item.media.id}/mqdefault.jpg` : null;
}

export function formatTime(seconds: number): string {
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Videonun açılabilir linki (izleme sonu kartında başlığa tıklanınca). Test sayacının linki yok. */
export function mediaUrl(media: QueueItem['media']): string | null {
  if (media.kind === 'youtube') return `https://www.youtube.com/watch?v=${media.id}`;
  if (media.kind === 'test') return null;
  if (media.kind === 'tiktok') return media.user ? `https://www.tiktok.com/@${media.user}/video/${media.id}` : `https://www.tiktok.com/embed/v2/${media.id}`;
  if (media.kind === 'vimeo') return `https://vimeo.com/${media.id}${media.hash ? `/${media.hash}` : ''}`;
  return media.url;
}
