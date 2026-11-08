// Card UPTIME2: the uptime check inside our own Worker, on a Cloudflare cron trigger (wrangler.jsonc `triggers.crons`).
// GitHub's scheduled workflow (`.github/workflows/monitor.yml`) is best-effort: it ran 1 of ~12 planned runs on
// 8 Nov 2026, so it stays only as the outside backup. Each run calls our own code in-process (the static site through
// the `ASSETS` binding, `/api/version` and a room object's `/info` through the Worker's router), tries a failure once
// more after a minute, and keeps one issue labelled `outage` in the private feedback repository (the owner watches it):
// opened on a repeated failure, its text updated while the site stays down, closed when it is back. At most one GitHub
// call a run (two only when GitHub refuses a new issue's label). The book lives in `FeedbackGate` under its own key,
// apart from the feedback counters: the uptime check never takes or gives a feedback slot, and feedback never blocks it. Without `FEEDBACK_GITHUB_TOKEN` / `FEEDBACK_REPO` it only logs. Honest limit: running inside Cloudflare,
// it cannot see an outage of Cloudflare itself, nor a problem only some networks have reaching workers.dev.
import {
  UPTIME_CHECK_MS,
  UPTIME_RETRY_MS,
  cleanBook,
  decideUptime,
  nextBook,
  uptimeBody,
  uptimeRequest,
  type UptimeAction,
  type UptimeCheck,
} from '@swm/shared/uptime';

/** The fixed one-time room the outside check joins too (never saved; it deletes itself a day after its last use). */
const UPTIME_ROOM = 'uptime-check';
/** In-process requests need some address; nothing goes to the network. */
const INSIDE = 'https://uptime.internal';
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const GITHUB_TIMEOUT_MS = 8000;

type Serve = (request: Request) => Promise<Response>;

async function timed(name: string, fn: () => Promise<string>): Promise<UptimeCheck> {
  const start = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const detail = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`no answer in ${UPTIME_CHECK_MS / 1000} s`)), UPTIME_CHECK_MS);
      }),
    ]);
    return { name, ok: true, detail, ms: Date.now() - start };
  } catch (error) {
    return { name, ok: false, detail: error instanceof Error ? error.message : String(error), ms: Date.now() - start };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** The three checks, each on its own (one failing never hides another). */
export async function runChecks(env: Env, serve: Serve): Promise<UptimeCheck[]> {
  return [
    await timed('Home page', async () => {
      if (!env.ASSETS) throw new Error('no ASSETS binding');
      const res = await env.ASSETS.fetch(new Request(`${INSIDE}/`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const version = (await res.text()).match(/footer-version">v([\d.]+)/)?.[1];
      if (!version) throw new Error('the page has no version in its footer');
      return `v${version}`;
    }),
    await timed('Server version', async () => {
      const res = await serve(new Request(`${INSIDE}/api/version`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { worker?: string; object?: string };
      if (typeof body.object !== 'string') throw new Error('no answer from a Durable Object');
      return body.worker ? `version ${body.worker.slice(0, 8)}` : 'answered (no version id here)';
    }),
    await timed('Room object', async () => {
      const res = await serve(new Request(`${INSIDE}/api/rooms/${UPTIME_ROOM}/info`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { count?: unknown };
      if (typeof body.count !== 'number') throw new Error('the room answered without a count');
      return `answered (${body.count} inside)`;
    }),
  ];
}

/**
 * The GitHub call of a run (one; a second only when GitHub refused an open's label with 422, then without the label).
 * Returns whether it worked and, for an open, the new issue's number.
 */
async function callGitHub(env: Env, action: UptimeAction, body: string): Promise<{ done: boolean; opened: number | null }> {
  const send = (label: boolean) => {
    const request = uptimeRequest(action, body, label)!;
    return fetch(`https://api.github.com/repos/${env.FEEDBACK_REPO}/issues${request.path}`, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${env.FEEDBACK_GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'sidelit-uptime',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.data),
      signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
    }).catch(() => null);
  };
  if (action.kind === 'none') return { done: true, opened: null };
  let res = await send(true);
  if (action.kind === 'open' && res?.status === 422) {
    console.error(JSON.stringify({ msg: 'uptime: the outage label was refused, opening without it' }));
    res = await send(false);
  }
  if (!res || !res.ok) {
    console.error(JSON.stringify({ msg: 'uptime: GitHub refused or did not answer', action: action.kind, status: res?.status ?? null }));
    return { done: false, opened: null };
  }
  if (action.kind !== 'open') return { done: true, opened: null };
  const made = (await res.json().catch(() => null)) as { number?: unknown } | null;
  return { done: true, opened: typeof made?.number === 'number' ? made.number : null };
}

export interface UptimeRun {
  healthy: boolean;
  retried: boolean;
  checks: UptimeCheck[];
  action: UptimeAction['kind'] | 'log-only';
}

/** One cron run. `wait` is injectable for the tests (a real run waits a minute before its second try). */
export async function runUptime(env: Env, serve: Serve, wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))): Promise<UptimeRun> {
  let checks = await runChecks(env, serve);
  let retried = false;
  if (checks.some((c) => !c.ok)) {
    retried = true;
    await wait(UPTIME_RETRY_MS);
    checks = await runChecks(env, serve);
  }
  const healthy = checks.every((c) => c.ok);
  const now = Date.now();
  console.log(JSON.stringify({ msg: 'uptime', healthy, retried, checks: checks.map((c) => `${c.ok ? 'ok' : 'FAIL'} ${c.name}: ${c.detail} (${c.ms} ms)`) }));
  if (!env.FEEDBACK_GITHUB_TOKEN || !REPO.test(env.FEEDBACK_REPO ?? '')) {
    // No token (local runs, CI): only the log line above.
    return { healthy, retried, checks, action: 'log-only' };
  }
  const gate = env.FEEDBACK.get(env.FEEDBACK.idFromName('gate'));
  const book = cleanBook(await gate.uptimeBook());
  const action = decideUptime(book, healthy);
  const downSince = healthy ? book.downSince : (book.downSince ?? now);
  const { done, opened } = await callGitHub(env, action, uptimeBody(checks, healthy, now, downSince, 'the live Worker (screen-with-me)'));
  const next = nextBook(book, healthy, now, action, done, opened);
  if (next.issue !== book.issue || next.downSince !== book.downSince) await gate.saveUptimeBook(next);
  return { healthy, retried, checks, action: action.kind };
}
