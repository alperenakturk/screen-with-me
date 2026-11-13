import { describe, expect, it } from 'vitest';
import { FEEDBACK_TEXT_MAX, REPORT_LINES, REPORT_LINE_MAX, REPORT_NOTE_MAX, buildIssue, buildReportIssue, neutralise, validateFeedback, validateReport } from './feedback.ts';

describe('feedback', () => {
  it('accepts a plain message and copies only known fields', () => {
    const fb = validateFeedback({ kind: 'bug', text: '  The video stops after a minute  ', extra: 'x', info: { site: '0.9.95.7', room: 'abc', diag: 'ok' } });
    expect(fb).toEqual({ kind: 'bug', text: 'The video stops after a minute', info: { site: '0.9.95.7', diag: 'ok' } });
  });

  it('refuses empty, too short, wrong types and bad e-mails', () => {
    expect(validateFeedback(null)).toBeNull();
    expect(validateFeedback({ kind: 'idea', text: 'hi' })).toBeNull();
    expect(validateFeedback({ kind: 'idea', text: 'a  b ' })).toBeNull();
    expect(validateFeedback({ kind: 'idea', text: 42 })).toBeNull();
    expect(validateFeedback({ text: 'no kind given' })).toBeNull();
    expect(validateFeedback({ kind: 'spam', text: 'unknown kind' })).toBeNull();
    expect(validateFeedback({ kind: 'idea', text: 'works fine', email: 'not an address' })).toBeNull();
    expect(validateFeedback({ kind: 'idea', text: 'works fine', email: 'a@b.co' })?.email).toBe('a@b.co');
  });

  it('cuts long text and drops control characters', () => {
    const fb = validateFeedback({ kind: 'other', text: `a\u0000b\u202ec${'x'.repeat(FEEDBACK_TEXT_MAX + 50)}` })!;
    expect(fb.text.startsWith('abc')).toBe(true);
    expect(fb.text.length).toBe(FEEDBACK_TEXT_MAX);
  });

  it('neutralises mentions, issue links and fences', () => {
    const out = neutralise('ping @someone about #12 and GH-3 ``` end');
    expect(out).not.toMatch(/@[a-z]/);
    expect(out).not.toMatch(/#\d/);
    expect(out).not.toMatch(/GH-\d/i);
    expect(out).not.toContain('```');
  });

  it('builds an issue with the text fenced, the e-mail and info only when given', () => {
    const issue = buildIssue({ kind: 'bug', text: 'Sound is late @alice #4\nsecond line', email: 'me@example.com', info: { browser: 'Chrome 130' } }, new Date('2026-11-03T10:00:00Z'));
    expect(issue.labels).toEqual(['feedback', 'feedback:bug']);
    expect(issue.title.startsWith('Bug: Sound is late')).toBe(true);
    expect(issue.body).toContain('```text\nSound is late @\u200dalice #\u200d4\nsecond line\n```');
    expect(issue.body).toContain('me@example.com');
    expect(issue.body).toContain('browser: Chrome 130');
    const bare = buildIssue({ kind: 'idea', text: 'Just text here' });
    expect(bare.body).not.toContain('Reply to');
    expect(bare.body).not.toContain('Technical info');
  });

  // SAFE1: a room's 🚩 Report.
  it('accepts a report and copies only known fields (never an id, key or IP)', () => {
    const r = validateReport({ kind: 'report', reason: 'abuse', room: 'abcd1234', name: '  Sam  ', lines: ['hi', 'go away'], note: 'rude', id: 'p1', pk: 'k', cid: 'c', ip: '1.2.3.4' });
    expect(r).toEqual({ kind: 'report', reason: 'abuse', room: 'abcd1234', name: 'Sam', lines: ['hi', 'go away'], note: 'rude' });
    // A report is never read as feedback, and feedback never as a report.
    expect(validateFeedback({ kind: 'report', text: 'some text here' })).toBeNull();
    expect(validateReport({ kind: 'bug', text: 'some text here' })).toBeNull();
  });

  it('refuses a report without a known reason, a valid room or a name', () => {
    const ok = { kind: 'report', reason: 'spam', room: 'abcd1234', name: 'Sam', lines: [] };
    expect(validateReport(ok)).not.toBeNull();
    expect(validateReport({ ...ok, reason: 'nope' })).toBeNull();
    expect(validateReport({ ...ok, room: 'a/b' })).toBeNull();
    expect(validateReport({ ...ok, room: 42 })).toBeNull();
    expect(validateReport({ ...ok, name: '   ' })).toBeNull();
    expect(validateReport({ ...ok, lines: 'not a list' })?.lines).toEqual([]);
  });

  it('caps the report: last lines only, each line, the note', () => {
    const many = Array.from({ length: 20 }, (_, i) => `line ${i} ${'x'.repeat(REPORT_LINE_MAX)}`);
    const r = validateReport({ kind: 'report', reason: 'other', room: 'abcd1234', name: 'Sam', lines: [...many, 42, ''], note: 'n'.repeat(REPORT_NOTE_MAX + 10) })!;
    expect(r.lines.length).toBeLessThanOrEqual(REPORT_LINES);
    expect(r.lines.every((l) => l.length <= REPORT_LINE_MAX)).toBe(true);
    expect(r.lines.at(-1)!.startsWith('line 19')).toBe(true);
    expect(r.note!.length).toBe(REPORT_NOTE_MAX);
  });

  it('builds a report issue with everything fenced and neutralised', () => {
    const issue = buildReportIssue({ kind: 'report', reason: 'spam', room: 'abcd1234', name: '@sam', lines: ['buy #1 ```now'], note: 'see GH-5' }, new Date('2026-11-13T10:00:00Z'));
    expect(issue.labels).toEqual(['report', 'report:spam']);
    expect(issue.title).toBe('Report: spam in room abcd1234');
    expect(issue.body).toContain('```text\n@\u200dsam\n```');
    expect(issue.body).not.toMatch(/#\d/);
    expect(issue.body).not.toMatch(/GH-\d/i);
    expect(issue.body).toContain('2026-11-13 10:00 UTC');
  });
});
