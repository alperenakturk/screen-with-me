// "Send feedback" dialog (card 9; look and words: docs/internal/design/feedback-and-thanks.md §1). A lazy chunk with its
// own texts and styles, opened from ⋯ More, the profile menu and the Help page (via `/#feedback`). It posts to
// `/api/feedback` (Worker: a GitHub issue in the private repository). Nothing about the room is ever sent; the
// technical details only when the person ticks the box (unticked by default), and they can see the exact lines first.
import { FEEDBACK_TEXT_MAX, type FeedbackAnswer, type FeedbackInfo, type FeedbackKind } from '@swm/shared/feedback';
import { el } from '../dom.ts';
import { lang } from '../i18n.ts';
import { createMascot } from '@swm/shared/logo';
import './feedback.css';

const TEXT = {
  en: {
    title: 'Send feedback',
    close: 'Close',
    type: 'Type',
    bug: 'Something broke',
    idea: 'An idea',
    other: 'Something else',
    what: 'What happened?',
    placeholder: "Tell us what you saw or what you'd like. Please don't include passwords or private details.",
    email: 'E-mail (optional, for a reply)',
    attach: 'Attach technical details (version, browser, connection)',
    see: 'See what is sent',
    privacy: 'Goes to the Sidelit team only. We keep your e-mail just to reply, and delete it within 90 days.',
    privacyLink: 'Privacy',
    cancel: 'Cancel',
    send: 'Send',
    sending: 'Sending…',
    thanks: 'Thanks! We got it.',
    thanksLine: "We read every message. If you left an e-mail, we'll answer there.",
    busy: "You've sent a few already. Please try again in an hour.",
    off: 'Feedback is switched off right now. You can write to',
    failed: "Couldn't send it. Check the connection and try again.",
    badEmail: 'That e-mail address looks wrong.',
  },
  tr: {
    title: 'Geri bildirim gönder',
    close: 'Kapat',
    type: 'Tür',
    bug: 'Bir şey bozuldu',
    idea: 'Bir fikir',
    other: 'Başka bir şey',
    what: 'Ne oldu?',
    placeholder: 'Ne gördüğünü ya da ne istediğini yaz. Lütfen şifre ya da özel bilgi yazma.',
    email: 'E-posta (isteğe bağlı, yanıt için)',
    attach: 'Teknik bilgileri ekle (sürüm, tarayıcı, bağlantı)',
    see: 'Neler gönderilir',
    privacy: 'Sadece Sidelit ekibine gider. E-postanı yalnızca yanıt vermek için tutarız ve 90 gün içinde sileriz.',
    privacyLink: 'Gizlilik',
    cancel: 'Vazgeç',
    send: 'Gönder',
    sending: 'Gönderiliyor…',
    thanks: 'Teşekkürler! Aldık.',
    thanksLine: 'Her mesajı okuyoruz. E-posta bıraktıysan oradan yanıt veririz.',
    busy: 'Az önce birkaç tane gönderdin. Bir saat sonra tekrar dener misin?',
    off: 'Geri bildirim şu an kapalı. Şu adrese yazabilirsin:',
    failed: 'Gönderilemedi. Bağlantını kontrol edip tekrar dene.',
    badEmail: 'Bu e-posta adresi yanlış görünüyor.',
  },
} as const;

const CONTACT = 'screenwithme.app@gmail.com';
const DRAFT_KEY = 'feedbackDraft';
const KINDS: Array<[FeedbackKind, string]> = [
  ['bug', '🐞'],
  ['idea', '💡'],
  ['other', '💬'],
];

/** The technical details, exactly what is sent when the box is ticked (no room id, names or chat). */
export function technicalInfo(): FeedbackInfo {
  const ua = navigator.userAgent;
  const browser =
    (/Edg\/(\d+)/.exec(ua) && `Edge ${/Edg\/(\d+)/.exec(ua)![1]}`) ||
    (/OPR\/(\d+)/.exec(ua) && `Opera ${/OPR\/(\d+)/.exec(ua)![1]}`) ||
    (/Firefox\/(\d+)/.exec(ua) && `Firefox ${/Firefox\/(\d+)/.exec(ua)![1]}`) ||
    (/Chrome\/(\d+)/.exec(ua) && `Chrome ${/Chrome\/(\d+)/.exec(ua)![1]}`) ||
    (/Version\/(\d+).*Safari/.exec(ua) && `Safari ${/Version\/(\d+).*Safari/.exec(ua)![1]}`) ||
    'other';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'other';
  const info: FeedbackInfo = {
    site: document.querySelector('.footer-version')?.textContent?.trim() || '?',
    extension: document.documentElement.dataset.swmExtension || 'none',
    browser: `${browser} · ${os} · ${innerWidth}×${innerHeight}`,
  };
  const transport = document.documentElement.dataset.swmTransport;
  if (transport) info.transport = transport;
  try {
    const diag = localStorage.getItem('diagLast');
    if (diag) info.diag = diag;
  } catch {
    // No storage: no connection test result.
  }
  return info;
}

let openNow: HTMLElement | null = null;

/** Opens the dialog (one at a time); focus returns to `opener` when it closes. */
export function openFeedback(opener?: HTMLElement | null, kind?: FeedbackKind): void {
  if (openNow) return;
  const tx = TEXT[lang() === 'tr' ? 'tr' : 'en'];
  const draft = readDraft();
  let picked: FeedbackKind | null = kind ?? draft.kind ?? null;

  const chips = KINDS.map(([value, icon]) => {
    const chip = el('button', { type: 'button', class: 'fb-chip', role: 'radio', 'aria-checked': String(picked === value), 'data-kind': value }, `${icon} ${tx[value]}`);
    chip.addEventListener('click', () => {
      picked = value;
      for (const c of chips) c.setAttribute('aria-checked', String(c === chip));
      refresh();
    });
    return chip;
  });
  const area = el('textarea', { id: 'fb-text', maxlength: String(FEEDBACK_TEXT_MAX), placeholder: tx.placeholder, rows: '4' });
  area.value = draft.text ?? '';
  const counter = el('div', { class: 'fb-counter muted small' });
  const email = el('input', { id: 'fb-email', type: 'email', autocomplete: 'email', maxlength: '200', placeholder: tx.email, 'aria-label': tx.email });
  email.value = draft.email ?? '';
  const attach = el('input', { type: 'checkbox', id: 'fb-attach' });
  const preview = el('pre', { class: 'fb-preview' });
  const details = el('details', { class: 'fb-details' }, el('summary', {}, tx.see), preview);
  const note = el('p', { class: 'fb-note', role: 'alert', hidden: 'hidden' });
  const cancel = el('button', { type: 'button', class: 'btn' }, tx.cancel);
  const send = el('button', { type: 'submit', class: 'btn primary', id: 'fb-send' }, tx.send);
  const closeX = el('button', { type: 'button', class: 'icon-btn', title: tx.close, 'aria-label': tx.close }, '✕');
  const privacy = el('p', { class: 'fb-privacy muted small' }, `${tx.privacy} `, el('a', { href: `/privacy.html?lang=${lang()}#feedback`, target: '_blank', rel: 'noopener' }, tx.privacyLink));

  const form = el(
    'form',
    { class: 'fb-form' },
    el('div', { class: 'fb-chips', role: 'radiogroup', 'aria-label': tx.type }, ...chips),
    el('label', { for: 'fb-text', class: 'fb-label' }, tx.what),
    area,
    counter,
    email,
    el('label', { class: 'fb-attach' }, attach, el('span', {}, tx.attach)),
    details,
    note,
    privacy,
    el('div', { class: 'fb-buttons' }, cancel, send),
  );
  const dialog = el('div', { class: 'feedback-dialog card', role: 'dialog', 'aria-modal': 'true', 'aria-label': tx.title }, el('div', { class: 'invite-head' }, el('h3', {}, tx.title), closeX), form);
  const backdrop = el('div', { class: 'dialog-backdrop feedback-backdrop' }, dialog);

  let busy = false;
  function refresh(): void {
    const len = area.value.length;
    counter.textContent = `${len} / ${FEEDBACK_TEXT_MAX}`;
    preview.textContent = Object.entries(technicalInfo())
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    send.disabled = busy || !picked || area.value.replace(/\s/g, '').length < 3 || note.dataset.state === 'off';
    saveDraft({ kind: picked ?? undefined, text: area.value, email: email.value });
  }
  function showNote(state: 'busy' | 'off' | 'failed' | 'badEmail' | null): void {
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
    opener?.focus();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopImmediatePropagation();
      finish();
      return;
    }
    if (event.key !== 'Tab') return;
    // Keep the focus inside the dialog.
    const items = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, input, summary, a[href]')].filter((n) => n.offsetParent !== null);
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
  email.addEventListener('input', refresh);
  closeX.addEventListener('click', finish);
  cancel.addEventListener('click', finish);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) finish();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (send.disabled || !picked) return;
    if (email.value.trim() && !email.checkValidity()) return showNote('badEmail');
    busy = true;
    showNote(null);
    send.textContent = tx.sending;
    send.classList.add('sending');
    for (const field of [area, email]) field.readOnly = true;
    refresh();
    const body = { kind: picked, text: area.value, email: email.value.trim() || undefined, info: attach.checked ? technicalInfo() : undefined };
    fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(async (res) => ((await res.json().catch(() => ({ error: 'failed' }))) as FeedbackAnswer))
      .catch((): FeedbackAnswer => ({ error: 'failed' }))
      .then((answer) => {
        busy = false;
        send.textContent = tx.send;
        send.classList.remove('sending');
        for (const field of [area, email]) field.readOnly = false;
        if ('ok' in answer) {
          clearDraft();
          const glow = el('div', { class: 'fb-glow' });
          glow.append(createMascot(document, { mood: 'happy' }));
          const done = el('button', { type: 'button', class: 'btn primary' }, tx.close);
          done.addEventListener('click', finish);
          form.replaceWith(el('div', { class: 'fb-sent' }, glow, el('h4', {}, tx.thanks), el('p', { class: 'muted' }, tx.thanksLine), done));
          done.focus();
          return;
        }
        showNote(answer.error === 'busy' ? 'busy' : answer.error === 'off' ? 'off' : 'failed');
        refresh();
      });
  });

  document.addEventListener('keydown', onKey, true);
  document.body.append(backdrop);
  openNow = backdrop;
  refresh();
  (chips.find((c) => c.getAttribute('aria-checked') === 'true') ?? chips[0]!).focus();
}

interface Draft {
  kind?: FeedbackKind;
  text?: string;
  email?: string;
}
function readDraft(): Draft {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? '{}') as Draft;
  } catch {
    return {};
  }
}
function saveDraft(draft: Draft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // No storage: the draft is lost on close.
  }
}
function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear.
  }
}
