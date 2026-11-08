// Card UPTIME2: the uptime check that runs inside our own Worker on a Cloudflare cron trigger (GitHub's scheduled
// workflow ran 1 of ~12 planned runs on 8 Nov 2026). Pure parts, shared by the Worker and its unit test: what one run
// should do with the outage issue, and the issue's text. The Worker keeps one small "book" between runs.

/** How often the cron trigger runs (wrangler.jsonc `triggers.crons`); said in the issue text. */
export const UPTIME_EVERY_MIN = 15;
/** A failed run checks again this long later before it counts as down (a deploy restarting objects is not an outage). */
export const UPTIME_RETRY_MS = 60_000;
/** One check may take this long. */
export const UPTIME_CHECK_MS = 10_000;
/** The label of the outage issue (the same one `.github/workflows/monitor.yml` uses in the public repository). */
export const UPTIME_LABEL = 'outage';

export interface UptimeCheck {
  name: string;
  ok: boolean;
  detail: string;
  ms: number;
}

/** What the Worker remembers between runs. */
export interface UptimeBook {
  /** The open outage issue's number, or null. */
  issue: number | null;
  /** When the site was first seen down (ms), or null while it is up. */
  downSince: number | null;
}

export const EMPTY_BOOK: UptimeBook = { issue: null, downSince: null };

/**
 * What one run does with GitHub: at most one call. Down without an issue → open one; down with one → edit its text;
 * up with one → close it (the closing edit carries the "back up" text, so it is still one call); up without → nothing.
 */
export type UptimeAction = { kind: 'none' } | { kind: 'open' } | { kind: 'edit'; issue: number } | { kind: 'close'; issue: number };

export function decideUptime(book: UptimeBook, healthy: boolean): UptimeAction {
  if (healthy) return book.issue === null ? { kind: 'none' } : { kind: 'close', issue: book.issue };
  return book.issue === null ? { kind: 'open' } : { kind: 'edit', issue: book.issue };
}

/**
 * The book after a run. `issue` is the number GitHub gave when one was opened (null if that call failed: the next run
 * tries to open it again). A failed edit or close keeps the issue, so the next run tries again.
 */
export function nextBook(book: UptimeBook, healthy: boolean, now: number, action: UptimeAction, done: boolean, opened: number | null = null): UptimeBook {
  const downSince = healthy ? null : (book.downSince ?? now);
  if (action.kind === 'open') return { issue: done ? opened : null, downSince };
  if (action.kind === 'close') return { issue: done ? null : action.issue, downSince };
  return { issue: book.issue, downSince };
}

/** Only the parts of a book we wrote ourselves (storage may hold anything after a change). */
export function cleanBook(value: unknown): UptimeBook {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const issue = Number.isInteger(raw.issue) && (raw.issue as number) > 0 ? (raw.issue as number) : null;
  const downSince = typeof raw.downSince === 'number' && Number.isFinite(raw.downSince) ? raw.downSince : null;
  return { issue, downSince };
}

const stamp = (ms: number) => new Date(ms).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

/** The issue's text: the latest checks, since when, and where to look. Plain text from our own checks only. */
export function uptimeBody(checks: UptimeCheck[], healthy: boolean, now: number, downSince: number | null, site: string): string {
  const lines = checks.map((c) => `- ${c.ok ? '✓' : '✗'} ${c.name}: ${c.detail} (${c.ms} ms)`);
  const head = healthy
    ? `Back up at ${stamp(now)}${downSince !== null ? ` (down since ${stamp(downSince)})` : ''}.`
    : `The live site failed its uptime check twice, ${UPTIME_RETRY_MS / 1000} s apart${downSince !== null ? `, down since ${stamp(downSince)}` : ''}. Latest check (${stamp(now)}):`;
  return [
    head,
    '',
    ...lines,
    '',
    `Site: ${site}`,
    healthy ? '' : "What to look at: the last deploy in Actions, Cloudflare's dashboard (Workers → screen-with-me → Logs / Metrics) and https://www.cloudflarestatus.com.",
    '',
    `_Opened, updated and closed by the Worker's own uptime check (cron every ${UPTIME_EVERY_MIN} minutes, \`apps/server/src/uptime.ts\`). It runs inside Cloudflare, so it cannot see an outage of Cloudflare itself; \`.github/workflows/monitor.yml\` checks from outside, best-effort._`,
  ]
    .filter((line, i, all) => !(line === '' && all[i - 1] === ''))
    .join('\n');
}

/** The issue's title; it says "[outage]" itself, so the issue is findable even where the label could not be made. */
export const UPTIME_TITLE = '[outage] Live site is down';

export interface UptimeRequest {
  /** Path under `/repos/<owner>/<name>/issues`. */
  path: string;
  method: 'POST' | 'PATCH';
  data: Record<string, unknown>;
}

/**
 * The GitHub call for an action (none for 'none'). `label` false = open without the `outage` label: a fine-grained
 * token may be refused (422) when the label doesn't exist yet and it can't create it; the alert must still go out.
 */
export function uptimeRequest(action: UptimeAction, body: string, label = true): UptimeRequest | null {
  if (action.kind === 'none') return null;
  if (action.kind === 'open') return { path: '', method: 'POST', data: { title: UPTIME_TITLE, body, ...(label ? { labels: [UPTIME_LABEL] } : {}) } };
  if (action.kind === 'edit') return { path: `/${action.issue}`, method: 'PATCH', data: { body } };
  return { path: `/${action.issue}`, method: 'PATCH', data: { body, state: 'closed', state_reason: 'completed' } };
}
