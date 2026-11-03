// "Send feedback" (card 9): `POST /api/feedback` turns a message from the site's form into a GitHub issue in the private
// repository, labelled `feedback`. Security review 3 R3-7:
// - the token (`FEEDBACK_GITHUB_TOKEN`, a fine-grained token with Issues: write on this repository only, with an
//   expiry) lives only in the Worker; without it the answer is `{error: 'off'}`;
// - a browser `Origin` from our own site is required; the body is read as a stream up to `FEEDBACK_BODY_MAX`;
// - per address `FEEDBACK_PER_IP_HOUR` per hour and for everyone `FEEDBACK_PER_DAY` per UTC day (`FeedbackGate`, one
//   small object), on top of the `FEEDBACK_LIMIT` burst binding; the address is only a short hash, kept for an hour;
// - the text goes into a code fence with mentions / issue links neutralised (`buildIssue`); no IP, room or names.
import { DurableObject } from 'cloudflare:workers';
import { FEEDBACK_BODY_MAX, FEEDBACK_PER_DAY, FEEDBACK_PER_IP_HOUR, buildIssue, validateFeedback, type FeedbackAnswer } from '@swm/shared/feedback';
import { readCapped } from './fallback.ts';

/** The repository the issues go to (owner/name); `FEEDBACK_REPO` can point a test deployment elsewhere. */
const DEFAULT_REPO = 'alperenakturk/screen-with-me';

const answer = (body: FeedbackAnswer, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function sendFeedback(request: Request, url: URL, env: Env, ipKey: () => Promise<string>): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  // Only our own pages (or a local dev server) may send: a missing Origin is refused too (curl, scripts).
  const origin = request.headers.get('Origin');
  let own = false;
  try {
    const host = origin ? new URL(origin).hostname : '';
    own = origin === url.origin || host === 'localhost' || host === '127.0.0.1';
  } catch {
    own = false;
  }
  if (!own) return new Response('Forbidden origin', { status: 403 });
  const size = Number(request.headers.get('Content-Length') ?? NaN);
  if (Number.isFinite(size) && size > FEEDBACK_BODY_MAX) return new Response('Too large', { status: 413 });
  const text = await readCapped(request, FEEDBACK_BODY_MAX).catch(() => null);
  if (text === null) return new Response('Too large', { status: 413 });
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  const feedback = validateFeedback(parsed);
  if (!feedback) return answer({ error: 'bad' }, 400);
  const key = await ipKey();
  if (env.FEEDBACK_LIMIT && !(await env.FEEDBACK_LIMIT.limit({ key })).success) return answer({ error: 'busy' }, 429);
  const gate = env.FEEDBACK.get(env.FEEDBACK.idFromName('gate'));
  const allowed = await gate.fetch('https://gate/take', { method: 'POST', body: key });
  if (allowed.status !== 200) return answer({ error: 'busy' }, 429);
  if (!env.FEEDBACK_GITHUB_TOKEN) return answer({ error: 'off' });
  const issue = buildIssue(feedback);
  const github = await fetch(`https://api.github.com/repos/${env.FEEDBACK_REPO || DEFAULT_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.FEEDBACK_GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'sidelit-feedback',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(issue),
  }).catch(() => null);
  if (!github || !github.ok) {
    console.log(`feedback: GitHub answered ${github?.status ?? 'nothing'}`);
    return answer({ error: 'failed' }, 502);
  }
  return answer({ ok: true });
}

interface GateState {
  /** UTC day number and how many were let through that day. */
  day: number;
  count: number;
  /** Address hash → times (ms) let through within the last hour. */
  recent: Record<string, number[]>;
}

/**
 * Counts feedback for everyone: at most `FEEDBACK_PER_IP_HOUR` per address hash and hour, `FEEDBACK_PER_DAY` per UTC
 * day. One instance (`gate`); its state is small (at most a day's worth of hashes, pruned to the last hour).
 */
export class FeedbackGate extends DurableObject<Env> {
  override async fetch(request: Request): Promise<Response> {
    if (new URL(request.url).pathname !== '/take' || request.method !== 'POST') return new Response('Not found', { status: 404 });
    const key = (await readCapped(request, 64).catch(() => null)) ?? '';
    if (!/^[0-9a-f]{1,32}$/.test(key)) return new Response('bad', { status: 400 });
    const now = Date.now();
    const day = Math.floor(now / 86_400_000);
    const saved = (await this.ctx.storage.get<GateState>('gate')) ?? { day, count: 0, recent: {} };
    const state: GateState = saved.day === day ? saved : { day, count: 0, recent: saved.recent };
    for (const [hash, times] of Object.entries(state.recent)) {
      const fresh = times.filter((t) => now - t < 3_600_000);
      if (fresh.length) state.recent[hash] = fresh;
      else delete state.recent[hash];
    }
    const mine = state.recent[key] ?? [];
    if (state.count >= FEEDBACK_PER_DAY || mine.length >= FEEDBACK_PER_IP_HOUR) return new Response('busy', { status: 429 });
    state.count += 1;
    state.recent[key] = [...mine, now];
    await this.ctx.storage.put('gate', state);
    return new Response('ok');
  }
}
