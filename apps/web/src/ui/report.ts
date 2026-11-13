// SAFE1 (owner, 13 Nov 2026): "🚩 Report" from the person menu. A lazy chunk that reuses the feedback dialog's look
// (`feedback.css`). It posts to `/api/feedback` with `kind: 'report'` (Worker: a GitHub issue in the private repository,
// labelled `report`; the same Origin check, body cap and limits as feedback). It sends the room id, the person's shown
// name, the last chat lines they sent, a reason and an optional note: what the room already saw, never an id or IP.
// The person sees exactly what is sent before sending.
import { REPORT_NOTE_MAX, type FeedbackAnswer, type ReportReason } from '@swm/shared/feedback';
import { el } from '../dom.ts';
import { lang } from '../i18n.ts';
import './feedback.css';

const TEXT = {
  en: {
    title: 'Report {name}',
    close: 'Close',
    why: 'What is wrong?',
    spam: 'Spam or flooding',
    abuse: 'Harassment or hate',
    sexual: 'Sexual or shocking',
    other: 'Something else',
    note: 'Anything to add? (optional)',
    see: 'See what is sent',
    sent: 'Room, their shown name and their last {n} chat lines. Never your or their browser ID or internet address.',
    abuseLink: 'How we handle reports (72 hours)',
    blockTip: 'To stop seeing them right away, use 🔇 Block for me in their menu.',
    cancel: 'Cancel',
    send: 'Send report',
    sending: 'Sending…',
    thanks: 'Thanks. The Sidelit team will look at it.',
    busy: "You've sent a few already. Please try again in an hour.",
    off: 'Reports are switched off right now. You can write to',
    failed: "Couldn't send it. Check the connection and try again.",
  },
  tr: {
    title: '{name} adlı kişiyi bildir',
    close: 'Kapat',
    why: 'Sorun ne?',
    spam: 'Spam ya da mesaj yağmuru',
    abuse: 'Taciz ya da nefret',
    sexual: 'Cinsel ya da rahatsız edici',
    other: 'Başka bir şey',
    note: 'Eklemek istediğin bir şey var mı? (isteğe bağlı)',
    see: 'Neler gönderilir',
    sent: 'Oda, ekranda görünen adı ve sohbetteki son {n} satırı. Senin ya da onun tarayıcı kimliği ya da internet adresi asla gönderilmez.',
    abuseLink: 'Bildirimleri nasıl ele alıyoruz (72 saat)',
    blockTip: 'Onu hemen görmemek için menüsündeki 🔇 Benim için engelle düğmesini kullan.',
    cancel: 'Vazgeç',
    send: 'Bildirimi gönder',
    sending: 'Gönderiliyor…',
    thanks: 'Teşekkürler. Sidelit ekibi inceleyecek.',
    busy: 'Az önce birkaç tane gönderdin. Bir saat sonra tekrar dener misin?',
    off: 'Bildirim şu an kapalı. Şu adrese yazabilirsin:',
    failed: 'Gönderilemedi. Bağlantını kontrol edip tekrar dene.',
  },
} as const;

const CONTACT = 'screenwithme.app@gmail.com';
const REASONS: Array<[ReportReason, string]> = [
  ['spam', '📢'],
  ['abuse', '😠'],
  ['sexual', '🔞'],
  ['other', '💬'],
];

let openNow: HTMLElement | null = null;

export interface ReportTarget {
  room: string;
  /** Their shown name and their last chat lines (oldest first). */
  name: string;
  lines: string[];
  /** Already blocked for me: no "use Block" tip. */
  blocked?: boolean;
  /** The result (`ok`, `busy`, `off`, `failed`), for the Test Lab. */
  done?: (result: string) => void;
}

/** Opens the report dialog (one at a time); focus returns to where it was when it closes. */
export function openReport(target: ReportTarget): void {
  if (openNow) return;
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const tx = TEXT[lang() === 'tr' ? 'tr' : 'en'];
  let picked: ReportReason | null = null;
  const chips = REASONS.map(([value, icon]) => {
    const chip = el('button', { type: 'button', class: 'fb-chip', role: 'radio', 'aria-checked': 'false', 'data-reason': value }, `${icon} ${tx[value]}`);
    chip.addEventListener('click', () => {
      picked = value;
      for (const c of chips) c.setAttribute('aria-checked', String(c === chip));
      refresh();
    });
    return chip;
  });
  const area = el('textarea', { id: 'report-note', maxlength: String(REPORT_NOTE_MAX), rows: '3' });
  const preview = el('pre', { class: 'fb-preview' });
  const details = el('details', { class: 'fb-details' }, el('summary', {}, tx.see), el('p', { class: 'muted small' }, tx.sent.replace('{n}', String(target.lines.length))), preview);
  const note = el('p', { class: 'fb-note', role: 'alert', hidden: 'hidden' });
  const cancel = el('button', { type: 'button', class: 'btn' }, tx.cancel);
  const send = el('button', { type: 'submit', class: 'btn primary', id: 'report-send' }, tx.send);
  const closeX = el('button', { type: 'button', class: 'icon-btn', title: tx.close, 'aria-label': tx.close }, '✕');
  const links = el(
    'p',
    { class: 'fb-privacy muted small' },
    target.blocked ? '' : `${tx.blockTip} `,
    el('a', { href: `/terms.html?lang=${lang()}#abuse`, target: '_blank', rel: 'noopener' }, tx.abuseLink),
  );
  const form = el(
    'form',
    { class: 'fb-form' },
    el('div', { class: 'fb-chips', role: 'radiogroup', 'aria-label': tx.why }, ...chips),
    el('label', { for: 'report-note', class: 'fb-label' }, tx.note),
    area,
    details,
    note,
    links,
    el('div', { class: 'fb-buttons' }, cancel, send),
  );
  const title = tx.title.replace('{name}', target.name);
  const dialog = el('div', { class: 'feedback-dialog report-dialog card', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, el('div', { class: 'invite-head' }, el('h3', {}, title), closeX), form);
  const backdrop = el('div', { class: 'dialog-backdrop feedback-backdrop' }, dialog);

  let busy = false;
  const body = () => ({ kind: 'report', reason: picked, room: target.room, name: target.name, lines: target.lines, note: area.value.trim() || undefined });
  function refresh(): void {
    const b = body();
    preview.textContent = [`room: ${b.room}`, `name: ${b.name}`, ...b.lines.map((l) => `> ${l}`), ...(b.note ? [`note: ${b.note}`] : [])].join('\n');
    send.disabled = busy || !picked || note.dataset.state === 'off';
  }
  function showNote(state: 'busy' | 'off' | 'failed' | null): void {
    note.dataset.state = state ?? '';
    note.hidden = !state;
    if (!state) return note.replaceChildren();
    if (state === 'off') note.replaceChildren(`${tx.off} `, el('span', { class: 'fb-contact' }, CONTACT), '.');
    else note.textContent = tx[state];
  }
  const finish = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey, true);
    openNow = null;
    if (opener?.isConnected) opener.focus();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopImmediatePropagation();
      finish();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, summary, a[href]')].filter((n) => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  area.addEventListener('input', refresh);
  closeX.addEventListener('click', finish);
  cancel.addEventListener('click', finish);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) finish();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (send.disabled || !picked) return;
    busy = true;
    showNote(null);
    send.textContent = tx.sending;
    area.readOnly = true;
    refresh();
    fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body()) })
      .then(async (res) => ((await res.json().catch(() => ({ error: 'failed' }))) as FeedbackAnswer))
      .catch((): FeedbackAnswer => ({ error: 'failed' }))
      .then((answer) => {
        busy = false;
        send.textContent = tx.send;
        area.readOnly = false;
        const result = 'ok' in answer ? 'ok' : answer.error === 'busy' || answer.error === 'off' ? answer.error : 'failed';
        target.done?.(result);
        if (result === 'ok') {
          const done = el('button', { type: 'button', class: 'btn primary' }, tx.close);
          done.addEventListener('click', finish);
          form.replaceWith(el('div', { class: 'fb-sent' }, el('h4', {}, tx.thanks), target.blocked ? '' : el('p', { class: 'muted' }, tx.blockTip), done));
          done.focus();
          return;
        }
        showNote(result as 'busy' | 'off' | 'failed');
        refresh();
      });
  });

  document.addEventListener('keydown', onKey, true);
  // First look: a note left over from "Block for me" must not sit over the dialog.
  for (const note of document.querySelectorAll('.hint-bubble')) note.remove();
  document.body.append(backdrop);
  openNow = backdrop;
  refresh();
  chips[0]!.focus();
}
