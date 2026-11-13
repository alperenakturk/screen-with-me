// "Send feedback" (card 9, owner's pick A: an in-site form that becomes a GitHub issue in the private repo). Shared by
// the site's form and the Worker's endpoint: what a feedback message may contain and how it becomes an issue.
// Security review 3 R3-7: the text goes into a code fence and `@` mentions / `#123` references are neutralised so a
// message can never ping anyone or link issues; the optional e-mail only goes into the issue body; nothing about the
// room (id, names, chat) and no IP is ever part of it.

import { ROOM_ID_PATTERN } from './protocol.ts';

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

/**
 * SAFE1 (owner, 13 Nov 2026): "🚩 Report" from the person menu goes through the same `/api/feedback` path, labelled
 * `report`. It carries only what everyone in the room already saw: the room id, the reported person's shown name, the
 * last few chat lines they sent, a reason and an optional note. Never a browser id (`cid`), person key, IP or e-mail.
 */
export const REPORT_REASONS = ['spam', 'abuse', 'sexual', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
const REASON_LABEL: Record<ReportReason, string> = { spam: '📢 Spam or flooding', abuse: '😠 Harassment or hate', sexual: '🔞 Sexual or shocking content', other: '💬 Something else' };
/** The note, the shown name and each chat line (characters); how many of their last lines go along. */
export const REPORT_NOTE_MAX = 500;
export const REPORT_NAME_MAX = 40;
export const REPORT_LINE_MAX = 300;
export const REPORT_LINES = 5;

export interface Report {
  kind: 'report';
  reason: ReportReason;
  room: string;
  name: string;
  lines: string[];
  note?: string;
}

/** Validates a report and copies it into a new object (the server never trusts the shape). Null when unusable. */
export function validateReport(input: unknown): Report | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  if (raw.kind !== 'report') return null;
  const reason = REPORT_REASONS.find((r) => r === raw.reason);
  if (!reason) return null;
  if (typeof raw.room !== 'string' || !ROOM_ID_PATTERN.test(raw.room)) return null;
  const name = clean(raw.name, REPORT_NAME_MAX).replace(/\s+/g, ' ');
  if (!name) return null;
  const lines = Array.isArray(raw.lines)
    ? raw.lines
        .slice(-REPORT_LINES)
        .map((line) => clean(line, REPORT_LINE_MAX))
        .filter(Boolean)
    : [];
  const out: Report = { kind: 'report', reason, room: raw.room, name, lines };
  const note = clean(raw.note, REPORT_NOTE_MAX);
  if (note) out.note = note;
  return out;
}

/** The issue for a validated report: everything fenced and neutralised, labelled `report`. */
export function buildReportIssue(report: Report, now = new Date()): { title: string; body: string; labels: string[] } {
  const fence = (text: string) => ['```text', neutralise(text), '```'];
  const lines = [`**Report from a room** · ${REASON_LABEL[report.reason]}`, '', `Room: \`${report.room}\``, '', 'Reported person (shown name):', ...fence(report.name)];
  lines.push('', `Their last chat lines (${report.lines.length}):`, ...fence(report.lines.length ? report.lines.join('\n') : '(none)'));
  if (report.note) lines.push('', 'Note from the reporter:', ...fence(report.note));
  lines.push('', `_Sent ${now.toISOString().slice(0, 16).replace('T', ' ')} UTC through the room's 🚩 Report. Handle within 72 hours (terms.html#abuse); delete this issue within 90 days._`);
  return { title: `Report: ${report.reason} in room ${report.room}`, body: lines.join('\n'), labels: ['report', `report:${report.reason}`] };
}
