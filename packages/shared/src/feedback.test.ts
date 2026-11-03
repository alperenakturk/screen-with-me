import { describe, expect, it } from 'vitest';
import { FEEDBACK_TEXT_MAX, buildIssue, neutralise, validateFeedback } from './feedback.ts';

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
});
