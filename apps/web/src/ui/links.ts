import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { confirmDialog } from './confirm.ts';

/**
 * Links in chat (owner's feedback, 0.9.88): web addresses in a message become clickable. A click first asks "you are
 * leaving this page", then opens the address in a new tab; the room tab stays open. Only http(s) addresses (and
 * `www.…`, opened as https) count; anything else stays plain text. Text is never written as HTML.
 */
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
/** Punctuation that usually ends a sentence rather than an address. */
const TRAILING = /[.,!?;:)\]}'"…]+$/;

/** A safe absolute address for a match, or null. */
export function linkTarget(match: string): string | null {
  try {
    const url = new URL(/^www\./i.test(match) ? `https://${match}` : match);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

/** Splits text into text nodes and link elements. */
export function linkify(text: string, open: (url: string) => void): Array<string | HTMLElement> {
  const parts: Array<string | HTMLElement> = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0].replace(TRAILING, '');
    const href = raw ? linkTarget(raw) : null;
    if (!href) continue;
    const start = match.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    const link = el('a', { href, class: 'chat-link', rel: 'noopener noreferrer nofollow', target: '_blank' }, raw);
    link.addEventListener('click', (event) => {
      event.preventDefault();
      open(href);
    });
    parts.push(link);
    last = start + raw.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** "You are leaving this page" → opens in a new tab. `beforeOpen` lets the film-page overlay tell the extension. */
export async function openExternalLink(url: string, beforeOpen?: () => void): Promise<void> {
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    // Keep the whole address.
  }
  const ok = await confirmDialog({
    icon: '🔗',
    title: t('link.leaveTitle'),
    text: t('link.leaveText', { host }),
    yes: t('link.open'),
    extra: el('p', { class: 'link-url small' }, url),
  });
  if (!ok) return;
  beforeOpen?.();
  window.open(url, '_blank', 'noopener,noreferrer');
}
