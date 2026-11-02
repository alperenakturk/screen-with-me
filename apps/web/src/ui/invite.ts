import { qrSvg } from '@swm/shared/qr';
import { canShareSheet } from '../device.ts';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { load, save } from '../storage.ts';

import { AUTO_INVITE_KEY, autoInviteOn } from './invite-option.ts';

/**
 * The invite window (0.9.93.1, owner: "an invite screen when I enter the room, with a QR code, like other watch
 * sites"): the room's link with Copy, the phone's share sheet, WhatsApp, a QR code a friend next to you can scan with
 * their phone's camera, and "show this when I'm alone in a room". Opens by itself when someone enters a room where
 * nobody else is (room.ts, once per page) and from 🔗 Invite. Esc, ✕ or a click outside closes it.
 */
export function openInviteDialog(url: string): void {
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
    share.addEventListener('click', () => void navigator.share({ title: 'ScreenWithMe', text: t('invite.shareText'), url }).catch(() => {}));
    actions.append(share);
  }
  actions.append(
    el('a', { class: 'btn', href: `https://wa.me/?text=${encodeURIComponent(message)}`, target: '_blank', rel: 'noopener noreferrer' }, `💬 WhatsApp`),
  );

  const qr = el('img', { class: 'invite-qr', alt: t('invite.qrAlt'), width: '168', height: '168' });
  qr.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg(url))}`;

  const auto = el('input', { type: 'checkbox', id: 'invite-auto' });
  auto.checked = autoInviteOn();
  auto.addEventListener('change', () => save(AUTO_INVITE_KEY, auto.checked ? '1' : '0'));

  const close = el('button', { type: 'button', class: 'icon-btn invite-close', title: t('close'), 'aria-label': t('close') }, '✕');
  const dialog = el(
    'div',
    { class: 'invite-dialog card', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('invite.title') },
    el('div', { class: 'invite-head' }, el('h3', {}, `🍿 ${t('invite.title')}`), close),
    el('p', { class: 'muted small invite-sub' }, t('invite.sub')),
    el('div', { class: 'invite-row' }, field, copy),
    actions,
    el('div', { class: 'invite-qr-box' }, qr, el('p', { class: 'muted small' }, t('invite.qr'))),
    el('label', { class: 'invite-auto small muted' }, auto, el('span', {}, t('invite.auto'))),
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
