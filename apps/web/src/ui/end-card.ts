import type { Pin } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { formatTime } from '../media-info.ts';
import { t } from '../i18n.ts';

export interface EndStats {
  title: string;
  /** Başlığa tıklanınca açılacak link (yoksa düz yazı). */
  url?: string | null;
  /** Videonun süresi (saniye). */
  duration: number;
  people: number;
  reactions: number;
  pins: Pin[];
}

const AUTO_CLOSE_MS = 30_000;

/**
 * İzleme sonu kartı: video bitince oynatıcının üstünde süre, kişi, tepki ve pinlenen anlar.
 * "Görsel olarak indir" paylaşılabilir bir PNG yapar. 30 sn sonra kendiliğinden kapanır.
 */
export function showEndCard(container: HTMLElement, stats: EndStats, startNext?: () => void): void {
  container.querySelector('.end-card')?.remove();
  const close = el('button', { type: 'button', class: 'btn small-btn' }, t('close'));
  const download = el('button', { type: 'button', class: startNext ? 'btn small-btn' : 'btn small-btn primary' }, t('endDownload'));
  const next = el('button', { type: 'button', class: 'btn small-btn primary' }, t('startNext'));
  const card = el(
    'div',
    { class: 'end-card', role: 'dialog', 'aria-label': t('endTitle') },
    el('div', { class: 'end-emoji' }, '🎬'),
    el('h3', {}, t('endTitle')),
    el('p', { class: 'end-name' }, stats.url ? el('a', { href: stats.url, target: '_blank', rel: 'noopener noreferrer', title: t('endOpenLink') }, stats.title) : stats.title),
    el('div', { class: 'end-stats' }, ...statLines(stats).map((line) => el('span', {}, line))),
    stats.pins.length
      ? el('ul', { class: 'end-pins' }, ...stats.pins.slice(0, 5).map((p) => el('li', {}, `📌 ${formatTime(p.at)} · ${p.by.name}${p.note ? `: ${p.note}` : ''}`)))
      : '',
    el('div', { class: 'end-actions' }, ...(startNext ? [next] : []), download, close),
  );
  const timer = setTimeout(() => card.remove(), AUTO_CLOSE_MS);
  close.addEventListener('click', () => {
    clearTimeout(timer);
    card.remove();
  });
  download.addEventListener('click', () => downloadImage(stats));
  next.addEventListener('click', () => {
    clearTimeout(timer);
    card.remove();
    startNext?.();
  });
  container.append(card);
}

function statLines(stats: EndStats): string[] {
  return [
    `⏱ ${t('endTogether', { time: formatLong(stats.duration) })}`,
    `👥 ${t('endPeople', { n: stats.people })}`,
    `😂 ${t('endReactions', { n: stats.reactions })}`,
    `📌 ${t('endPins', { n: stats.pins.length })}`,
  ];
}

/** 6720 → "1 sa 52 dk", 300 → "5 dk". */
function formatLong(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m >= 60 ? t('leftHM', { h: Math.floor(m / 60), m: m % 60 }) : t('endMinutes', { m: Math.max(1, m) });
}

/** Kartı 1200×630 paylaşılabilir görsel olarak indirir (davet önizlemesiyle aynı oran). */
function downloadImage(stats: EndStats): void {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 1200, 630);
  g.addColorStop(0, '#1b1450');
  g.addColorStop(1, '#4a2470');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = '#fff';
  ctx.font = '700 44px system-ui, sans-serif';
  ctx.fillText(`🎬 ${t('endTitle')}`, 70, 110);
  ctx.font = '800 54px system-ui, sans-serif';
  ctx.fillText(clip(ctx, stats.title, 1060), 70, 190);
  ctx.font = '600 34px system-ui, sans-serif';
  statLines(stats).forEach((line, i) => ctx.fillText(line, 70 + (i % 2) * 540, 280 + Math.floor(i / 2) * 56));
  ctx.font = '500 28px system-ui, sans-serif';
  ctx.fillStyle = 'rgb(255 255 255 / 0.85)';
  stats.pins.slice(0, 3).forEach((p, i) => ctx.fillText(clip(ctx, `📌 ${formatTime(p.at)} · ${p.by.name}${p.note ? `: ${p.note}` : ''}`, 1060), 70, 430 + i * 44));
  ctx.fillStyle = '#b9a6ff';
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillText('ScreenWithMe', 70, 590);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'screenwithme.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, 'image/png');
}

function clip(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
  return `${s}…`;
}
