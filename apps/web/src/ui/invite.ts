import './invite.css';
import { qrSvg } from '@swm/shared/qr';
import { canShareSheet } from '../device.ts';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { load, save } from '../storage.ts';


/** WhatsApp's glyph (the Simple Icons path, CC0; the shape WhatsApp's brand resources show for share buttons). */
const WHATSAPP_PATH =
  'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';

function whatsappGlyph(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('wa-glyph');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', WHATSAPP_PATH);
  path.setAttribute('fill', 'currentColor');
  svg.append(path);
  return svg;
}

/** The QR code as a PNG (white margin, crisp squares), for "Copy image". */
async function qrPng(img: HTMLImageElement, size = 512): Promise<Blob | null> {
  if (!img.complete) await new Promise((resolve) => img.addEventListener('load', resolve, { once: true }));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, size, size);
  g.imageSmoothingEnabled = false;
  const pad = Math.round(size * 0.06);
  g.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/**
 * The invite window (0.9.93.1, owner: "an invite screen when I enter the room, with a QR code, like other watch
 * sites"): two tabs (card 4, owner's feedback). "Link": the room's link with Copy, the phone's share sheet and
 * WhatsApp (its own glyph and green); "QR": only the code, big, with "Copy image". Below both: "show this when I'm
 * alone in a room". Opens by itself when someone enters a room where nobody else is (room.ts, once per page) and from
 * 🔗 Invite. Esc, ✕ or a click outside closes it.
 */
export function openInviteDialog(url: string, door?: { on: boolean; set: (on: boolean) => void }): void {
  if (document.querySelector('.invite-dialog')) return;
  const message = t('invite.message', { url });

  const field = el('input', { class: 'invite-link', readonly: 'readonly', value: url, 'aria-label': t('invite.linkLabel') });
  const copyText = el('span', {}, t('invite.copy'));
  const copy = el('button', { type: 'button', class: 'btn primary invite-copy' }, copyText);
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // No clipboard (blocked): the link is selected in its box, ready for Ctrl+C.
      field.focus();
      field.select();
      return;
    }
    copyText.textContent = t('copied');
    copy.classList.add('done');
    setTimeout(() => {
      copyText.textContent = t('invite.copy');
      copy.classList.remove('done');
    }, 1600);
  });
  field.addEventListener('focus', () => field.select());

  const actions = el('div', { class: 'invite-actions' });
  if (canShareSheet()) {
    const share = el('button', { type: 'button', class: 'btn' }, `📤 ${t('share')}`);
    share.addEventListener('click', () => void navigator.share({ title: 'Sidelit', text: t('invite.shareText'), url }).catch(() => {}));
    actions.append(share);
  }
  actions.append(
    el('a', { class: 'btn invite-wa', href: `https://wa.me/?text=${encodeURIComponent(message)}`, target: '_blank', rel: 'noopener noreferrer' }, whatsappGlyph(), el('span', {}, 'WhatsApp')),
  );

  const qr = el('img', { class: 'invite-qr', alt: t('invite.qrAlt'), width: '240', height: '240' });
  qr.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg(url))}`;
  const copyImageText = el('span', {}, t('invite.copyImage'));
  const copyImage = el('button', { type: 'button', class: 'btn invite-copy-image' }, copyImageText);
  copyImage.addEventListener('click', async () => {
    const png = await qrPng(qr);
    if (!png) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      copyImageText.textContent = t('copied');
      setTimeout(() => (copyImageText.textContent = t('invite.copyImage')), 1600);
    } catch {
      // No image clipboard (Firefox, blocked): save it instead.
      const link = el('a', { href: URL.createObjectURL(png), download: 'sidelit-invite-qr.png' });
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 4000);
      copyImageText.textContent = t('invite.saved');
      setTimeout(() => (copyImageText.textContent = t('invite.copyImage')), 1600);
    }
  });

  // Two tabs: the link (and its ways to send it) or the QR code alone.
  const linkPane = el('div', { class: 'invite-pane', id: 'invite-pane-link', role: 'tabpanel' }, el('p', { class: 'muted small invite-sub' }, t('invite.sub')), el('div', { class: 'invite-row' }, field, copy), actions);
  const qrPane = el('div', { class: 'invite-pane invite-qr-pane', id: 'invite-pane-qr', role: 'tabpanel', hidden: 'hidden' }, qr, copyImage);
  const tabLink = el('button', { type: 'button', class: 'invite-tab', role: 'tab', 'aria-selected': 'true', 'aria-controls': 'invite-pane-link', 'data-tab': 'link' }, t('invite.tabLink'));
  const tabQr = el('button', { type: 'button', class: 'invite-tab', role: 'tab', 'aria-selected': 'false', 'aria-controls': 'invite-pane-qr', 'data-tab': 'qr' }, t('invite.tabQr'));
  const showTab = (which: 'link' | 'qr') => {
    tabLink.setAttribute('aria-selected', String(which === 'link'));
    tabQr.setAttribute('aria-selected', String(which === 'qr'));
    linkPane.hidden = which !== 'link';
    qrPane.hidden = which !== 'qr';
  };
  tabLink.addEventListener('click', () => showTab('link'));
  tabQr.addEventListener('click', () => showTab('qr'));

  const close = el('button', { type: 'button', class: 'icon-btn invite-close', title: t('close'), 'aria-label': t('close') }, '✕');
  const dialog = el(
    'div',
    { class: 'invite-dialog card', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('invite.title') },
    el('div', { class: 'invite-head' }, el('h3', {}, `🍿 ${t('invite.title')}`), close),
    el('div', { class: 'invite-tabs', role: 'tablist' }, tabLink, tabQr),
    // R12 (host only): "Ask before letting people in", the same switch as in Room rules.
    ...(door ? [doorRow(door)] : []),
    linkPane,
    qrPane,
  );
  const backdrop = el('div', { class: 'dialog-backdrop' }, dialog);
  const finish = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') finish();
  };
  close.addEventListener('click', finish);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) finish();
  });
  document.addEventListener('keydown', onKey);
  document.body.append(backdrop);
  copy.focus();
}

/** R12: the host's "Ask before letting people in" switch in the invite window. */
function doorRow(door: { on: boolean; set: (on: boolean) => void }): HTMLElement {
  const box = el('input', { type: 'checkbox', role: 'switch', class: 'switch', id: 'invite-door' }) as HTMLInputElement;
  box.checked = door.on;
  box.addEventListener('change', () => door.set(box.checked));
  return el('label', { class: 'set-row invite-door' }, el('span', { class: 'set-text' }, el('b', {}, t('settings.knock')), el('span', {}, t('settings.knock.d'))), box);
}
