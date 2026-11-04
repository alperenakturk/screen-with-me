// "Send feedback" (card 9, owner's pick A: an in-site form that becomes a GitHub issue in the private repo). Shared by
// the site's form and the Worker's endpoint: what a feedback message may contain and how it becomes an issue.
// Security review 3 R3-7: the text goes into a code fence and `@` mentions / `#123` references are neutralised so a
// message can never ping anyone or link issues; the optional e-mail only goes into the issue body; nothing about the
// room (id, names, chat) and no IP is ever part of it.

/** The longest message (characters). */
export const FEEDBACK_TEXT_MAX = 2000;
/** The longest e-mail address. */
export const FEEDBACK_EMAIL_MAX = 200;
/** The largest request body the Worker reads (bytes, read as a stream). */
export const FEEDBACK_BODY_MAX = 8192;
/** Per address and hour, and for everyone per UTC day (the Worker's `FeedbackGate`). */
export const FEEDBACK_PER_IP_HOUR = 3;
export const FEEDBACK_PER_DAY = 50;

/** The optional technical details, only when the person ticks "attach technical info". */
export interface FeedbackInfo {
  site?: string;
  extension?: string;
  browser?: string;
  transport?: string;
  /** The last connection test's result (`/connection` "Copy the result"), shortened. */
  diag?: string;
}

/** What kind of message (the dialog's three chips; required). */
export const FEEDBACK_KINDS = ['bug', 'idea', 'other'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
const KIND_LABEL: Record<FeedbackKind, string> = { bug: '🐞 Something broke', idea: '💡 An idea', other: '💬 Something else' };

export interface Feedback {
  kind: FeedbackKind;
  text: string;
  email?: string;
  info?: FeedbackInfo;
}

/** Answers of `/api/feedback`: `ok`, or why not (`off`: no token on this server; `busy`: a limit). */
export type FeedbackAnswer = { ok: true } | { error: 'off' | 'busy' | 'bad' | 'failed' };

const INFO_LIMITS: Record<keyof FeedbackInfo, number> = { site: 40, extension: 40, browser: 80, transport: 10, diag: 1500 };
const EMAIL = /^[^\s@<>()[\]\\,;:"`]+@[^\s@<>()[\]\\,;:"`]+\.[a-z]{2,}$/i;

/** Plain text: no control characters except new lines and tabs, trimmed, cut to `max`. */
function clean(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f\u200b-\u200f\u2028-\u202e]/g, '').trim().slice(0, max);
}

/** Validates what a client sent and copies it into a new object (never trust the shape). Null when unusable. */
export function validateFeedback(input: unknown): Feedback | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const kind = FEEDBACK_KINDS.find((k) => k === raw.kind);
  if (!kind) return null;
  const text = clean(raw.text, FEEDBACK_TEXT_MAX);
  if (text.replace(/\s/g, '').length < 3) return null;
  const out: Feedback = { kind, text };
  const email = clean(raw.email, FEEDBACK_EMAIL_MAX);
  if (email) {
    if (!EMAIL.test(email)) return null;
    out.email = email;
  }
  if (raw.info && typeof raw.info === 'object') {
    const info: FeedbackInfo = {};
    for (const [key, max] of Object.entries(INFO_LIMITS) as Array<[keyof FeedbackInfo, number]>) {
      const value = clean((raw.info as Record<string, unknown>)[key], max);
      if (value) info[key] = value;
    }
    if (Object.keys(info).length) out.info = info;
  }
  return out;
}

/**
 * Makes text safe inside an issue: `@name` can't mention anyone and `#123` / `GH-123` can't link an issue (a zero-width
 * joiner after the sign), and a run of backticks can't close our code fence.
 */
export function neutralise(text: string): string {
  return text
    .replace(/@(?=[A-Za-z0-9-])/g, '@\u200d')
    .replace(/#(?=\d)/g, '#\u200d')
    .replace(/\bGH-(?=\d)/gi, (m) => `${m}\u200d`)
    .replace(/`{3,}/g, (m) => m.split('').join('\u200d'));
}

/** The issue's title and body (Markdown) for a validated message. */
export function buildIssue(feedback: Feedback, now = new Date()): { title: string; body: string; labels: string[] } {
  const first = neutralise(feedback.text.split('\n')[0]!.slice(0, 70)).replace(/[`*_[\]<>]/g, '');
  const lines = [`**Feedback from the site** · ${KIND_LABEL[feedback.kind]}`, '', '```text', neutralise(feedback.text), '```'];
  if (feedback.email) lines.push('', `Reply to: \`${feedback.email}\` (remove this address when the issue is closed, at the latest after 90 days)`);
  if (feedback.info) {
    lines.push('', '<details><summary>Technical info (attached by the sender)</summary>', '', '```text');
    for (const [key, value] of Object.entries(feedback.info)) lines.push(`${key}: ${neutralise(String(value))}`);
    lines.push('```', '', '</details>');
  }
  lines.push('', `_Sent ${now.toISOString().slice(0, 16).replace('T', ' ')} UTC through the in-site form._`);
  return { title: `${feedback.kind === 'bug' ? 'Bug' : feedback.kind === 'idea' ? 'Idea' : 'Feedback'}: ${first || 'no subject'}`, body: lines.join('\n'), labels: ['feedback', `feedback:${feedback.kind}`] };
}
