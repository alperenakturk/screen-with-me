// Card LABLOCK: `POST /api/lab/check` with `{code}` or `{pass}` says whether this browser may open the 🐞 Test Lab.
// Only our own pages ask (Origin), every ask counts against `ROOM_INFO_LIMIT` per address (`lab:` key), the body is
// read capped. The code lives only in the Worker secret `LAB_CODE`; without it (and without `SWM_LAB_OPEN`) the lab is
// shut. A local test server (`wrangler dev --var SWM_LAB_OPEN:1`) accepts any code, so the harnesses need no secret.
import { LAB_BODY_MAX, labCodeMatches, labPassValid, makeLabPass } from '@swm/shared/lab-pass';
import { readCapped } from './fallback.ts';

const answer = (body: { ok: boolean; pass?: string; error?: string }, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function labCheck(request: Request, url: URL, env: Env, ipKey: () => Promise<string>): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const origin = request.headers.get('Origin');
  let own = false;
  try {
    const host = origin ? new URL(origin).hostname : '';
    own = origin === url.origin || host === 'localhost' || host === '127.0.0.1';
  } catch {
    own = false;
  }
  if (!own) return new Response('Forbidden origin', { status: 403 });
  const size = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(size) && size > LAB_BODY_MAX) return new Response('Too large', { status: 413 });
  if (env.ROOM_INFO_LIMIT && !(await env.ROOM_INFO_LIMIT.limit({ key: `lab:${await ipKey()}` })).success) {
    return answer({ ok: false, error: 'busy' }, 429);
  }
  const text = await readCapped(request, LAB_BODY_MAX).catch(() => null);
  if (text === null) return new Response('Too large', { status: 413 });
  let body: { code?: unknown; pass?: unknown } = {};
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    return answer({ ok: false }, 400);
  }
  if (env.SWM_LAB_OPEN === '1') return answer({ ok: true });
  const secret = env.LAB_CODE;
  if (await labPassValid(body?.pass, secret)) return answer({ ok: true });
  if (await labCodeMatches(body?.code, secret)) return answer({ ok: true, pass: await makeLabPass(secret!) });
  return answer({ ok: false });
}
