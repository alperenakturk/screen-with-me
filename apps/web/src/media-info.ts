import type { QueueItem } from '@swm/shared/protocol';

/** Sunucunun sonradan bildirdiği başlıklar (öğe ID'sine göre). */
const lateTitles = new Map<string, string>();

export function rememberTitle(itemId: string, title: string): void {
  lateTitles.set(itemId, title);
}

/** Sıra öğesinin ekranda görünecek adı. */
export function itemTitle(item: QueueItem): string {
  const title = item.title ?? lateTitles.get(item.id);
  if (title) return title;
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
