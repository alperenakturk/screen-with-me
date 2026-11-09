import { DRAW_ID_PATTERN } from '@swm/shared/games/draw';
import { GAME_ID_PATTERN } from '@swm/shared/games/protocol';
import { POKER_ID_PATTERN } from '@swm/shared/games/poker';
import { SEA_ID_PATTERN } from '@swm/shared/games/sea';
import { QUIZ_ID_PATTERN } from '@swm/shared/games/quiz';
import { ROOM_ID_PATTERN, TV_CODE } from '@swm/shared/protocol';
import { MOVE_CODE } from '@swm/shared/move';
import { IP_HEADER, ROOM_HEADER } from './ip.ts';
import { sendFeedback } from './feedback.ts';
import { labCheck } from './lab-check.ts';
import { labServer } from './lab.ts';
import { tiktokResolve } from './tiktok.ts';
import { podcasts } from './podcasts.ts';
import { youtubeChannel, youtubeLike, youtubePool, youtubeSearch } from './youtube.ts';
import { youtubeUsage } from './usage.ts';
import { ipKey } from './ip-key.ts';
import { runUptime } from './uptime.ts';
import { meterRead } from './meter.ts';

export { Draw } from './draw.ts';
export { FeedbackGate } from './feedback.ts';
export { Game } from './game.ts';
export { Poker } from './poker.ts';
export { Sea } from './sea.ts';
export { Quiz } from './quiz.ts';
export { Room } from './room.ts';
export { TvLink } from './tv-link.ts';
import { tvOn } from './tv-switch.ts';
export { MoveLink } from './move-link.ts';
export { YoutubeUsage } from './usage.ts';
export { IpKeys } from './ip-key.ts';
export { UploadGate } from './upload-gate.ts';
export { FallbackGate } from './fallback-gate.ts';
import { LEASE_HEADER, gateOf } from './fallback-gate.ts';
import { failed, logError, routeOf, stubFetch } from './errors.ts';

/**
 * Browsers always send `Origin` with a WebSocket; only our own site (and local development) may open connections, so
 * another website can't make its visitors join or spam rooms (security review 1, O1). Without `Origin` it is not a
 * browser (tests, tools), and such a client could fake the header anyway.
 */

/** How long the probe WebSocket may stay open (R4-7). */
const PROBE_MS = 10_000;

/** The largest `unsave` body (`{"cid":"…"}` is ~40 bytes). */
const UNSAVE_BODY_BYTES = 1024;

function allowedOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get('Origin');
  if (origin === null || origin === url.origin) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/** The HTTP fallback's session ids (`fallback.ts` `newSid`: 16 random bytes in hex). */
const SID_PATTERN = /^[0-9a-f]{32}$/;


/**
 * Checks every new connection (a WebSocket upgrade or an HTTP fallback `open`): right origin, and at most
 * `CONNECT_LIMIT` new connections per IP and minute (a script reconnecting with fresh browser ids gets nowhere).
 * Returns the request to forward (with the IP hash header set by us, never by the client) or an error response.
 */
async function guardSocket(request: Request, url: URL, env: Env): Promise<Request | Response> {
  if (!allowedOrigin(request, url)) return new Response('Forbidden origin', { status: 403 });
  const key = await ipKey(request, env);
  // CI's local server may skip the limit (it protects nothing there); only with the flag AND a localhost address.
  const unpaced = env.SWM_LOCAL_UNPACED === '1' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  if (env.CONNECT_LIMIT && !unpaced && !(await env.CONNECT_LIMIT.limit({ key })).success) return new Response('Too many connections', { status: 429 });
  const forwarded = new Request(request);
  forwarded.headers.set(IP_HEADER, key);
  return forwarded;
}

/**
 * A connection request to one object's `…/ws` address: a WebSocket upgrade, or one request of the HTTP fallback
 * (`?http=open|send|poll|close`, `fallback.ts`; for networks where WebSockets never open). Only `open` starts a new
 * connection (and counts against `CONNECT_LIMIT`); the others belong to a session the object already knows.
 */
async function connect(request: Request, url: URL, env: Env, stub: DurableObjectStub, roomId?: string): Promise<Response> {
  let forwarded: Request | Response;
  const op = url.searchParams.get('http');
  if (op === null) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
    forwarded = await guardSocket(request, url, env);
  } else if (op === 'open') {
    forwarded = await guardSocket(request, url, env);
    if (!(forwarded instanceof Response)) {
      const refused = await takeFallbackLease(forwarded, url, env);
      if (refused) return refused;
    }
  } else {
    if (!allowedOrigin(request, url)) return new Response('Forbidden origin', { status: 403 });
    // Security M4: only a known step with a well-formed session id reaches the object, and at most FALLBACK_LIMIT
    // such requests per IP and minute (a loop of made-up ids used to wake objects for free).
    if (op !== 'send' && op !== 'poll' && op !== 'close') return new Response('Bad step', { status: 400 });
    if (!SID_PATTERN.test(url.searchParams.get('sid') ?? '')) return new Response('Bad session', { status: 400 });
    if (env.FALLBACK_LIMIT && !(await env.FALLBACK_LIMIT.limit({ key: await ipKey(request, env) })).success) return new Response('Too many requests', { status: 429 });
    forwarded = new Request(request);
    forwarded.headers.delete(IP_HEADER);
    forwarded.headers.delete(LEASE_HEADER);
  }
  if (forwarded instanceof Response) return forwarded;
  // The room learns its own id (it hands it to a TV it pairs); never from the client.
  if (roomId) forwarded.headers.set(ROOM_HEADER, roomId);
  else forwarded.headers.delete(ROOM_HEADER);
  return stubFetch(stub, forwarded);
}

/**
 * QUOTA2: a new HTTP-fallback session takes a lease from its address's gate (`fallback-gate.ts`); the lease id goes to
 * the object with the request, which gives it back when the session ends. Over the address's limit: 429 `busy` (the
 * page waits and tries again, as after any failed open). CI's local server (unpaced) skips it; a gate that can't be
 * reached lets the session through (hotspot users must not lose the room because of a counter).
 */
async function takeFallbackLease(forwarded: Request, url: URL, env: Env): Promise<Response | null> {
  forwarded.headers.delete(LEASE_HEADER);
  const ip = forwarded.headers.get(IP_HEADER);
  const unpaced = env.SWM_LOCAL_UNPACED === '1' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  if (!ip || unpaced || !env.FBGATE) return null;
  const lease = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
  try {
    if (!(await gateOf(env, ip).take(lease))) return Response.json({ code: 'busy' }, { status: 429 });
  } catch (error) {
    console.error(JSON.stringify({ msg: 'fallback gate', what: 'take', error: error instanceof Error ? error.name : 'error' }));
    return null;
  }
  forwarded.headers.set(LEASE_HEADER, lease);
  return null;
}

/**
 * Giriş noktası. Gelen bağlantıyı oda ID'sine göre doğru Durable Object'e
 * yönlendirir. Aynı ID'ye sahip herkes dünyanın neresinde olursa olsun
 * aynı Room nesnesine bağlanır.
 */
export default {
  async fetch(request, env): Promise<Response> {
    let response: Response;
    try {
      response = await route(request, env);
    } catch (error) {
      // ERR1: a JSON answer and one structured log line instead of Cloudflare's HTML error page.
      logError('route failed', error, { route: routeOf(new URL(request.url).pathname) });
      response = failed(error);
    }
    return withApiHeaders(request, response);
  },
  // Card UPTIME2: the cron trigger (wrangler.jsonc `triggers.crons`) runs the uptime check against our own code.
  scheduled(_controller, env, ctx): void {
    ctx.waitUntil(runUptime(env, (request) => route(request, env)).then(() => undefined, (error: unknown) => console.error(JSON.stringify({ msg: 'uptime: run failed', error: String(error) }))));
  },
} satisfies ExportedHandler<Env>;

/**
 * Security R4-8: the `_headers` file only covers the static files, so every `/api/*` answer gets `nosniff` here, and
 * `Cache-Control: no-store` unless it chose its own (answers are per person / per moment; the caches we use live in the
 * Worker, not in browsers). A WebSocket upgrade (101) is passed through untouched.
 */
function withApiHeaders(request: Request, response: Response): Response {
  if (response.status === 101 || !new URL(request.url).pathname.startsWith('/api/')) return response;
  const out = new Response(response.body, response);
  out.headers.set('X-Content-Type-Options', 'nosniff');
  if (!out.headers.has('Cache-Control')) out.headers.set('Cache-Control', 'no-store');
  return out;
}

async function route(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') return new Response('ok');

    // Which version of the code answers: the Worker and a freshly started Durable Object, as a new test room would be
    // (objects restart on the new code a while after a deploy, closing their connections). The deploy job runs the
    // live e2e only once both say the new id. TvLink stores nothing, so these probe objects leave nothing behind.
    if (url.pathname === '/api/version') {
      // Security M4: each call starts a fresh object, so it shares the saved-room lookups' limit (its own key).
      if (env.ROOM_INFO_LIMIT && !(await env.ROOM_INFO_LIMIT.limit({ key: `version:${await ipKey(request, env)}` })).success) {
        return new Response('Too many requests', { status: 429 });
      }
      const probe = env.TVLINKS.get(env.TVLINKS.idFromName(`version-${crypto.randomUUID()}`));
      const object = await (await probe.fetch('https://version/version')).text();
      return Response.json({ worker: env.CF_VERSION_METADATA?.id ?? '', object }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Connection probe (HTTP fallback, `/connection`): does a WebSocket open on this network at all? Answers "ok" and
    // waits for the client to close. `?bytes=N` on a plain request answers N bytes, at most 200 kB (diagnostics: large answers).
    if (url.pathname === '/api/probe') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        // Security R4-3: the plain answer (at most 200 kB) counts against the info limit, per address (`probe:` key).
        if (env.ROOM_INFO_LIMIT && !(await env.ROOM_INFO_LIMIT.limit({ key: `probe:${await ipKey(request, env)}` })).success) {
          return Response.json({ error: 'busy' }, { status: 429, headers: { 'Cache-Control': 'no-store' } });
        }
        const bytes = Math.min(Math.max(Number(url.searchParams.get('bytes')) || 0, 0), 200_000);
        return new Response('x'.repeat(bytes), { headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain' } });
      }
      const guarded = await guardSocket(request, url, env);
      if (guarded instanceof Response) return guarded;
      const { 0: client, 1: server } = new WebSocketPair();
      server.accept();
      server.send('ok');
      server.addEventListener('message', () => server.close(1000, 'done'));
      // R4-7: this socket is not hibernatable, so it never stays open for long: closed after PROBE_MS if the client
      // didn't (a client that only opens it to hold a connection gets nothing).
      const timer = setTimeout(() => {
        try {
          server.close(1000, 'time');
        } catch {
          // Already closed.
        }
      }, PROBE_MS);
      server.addEventListener('close', () => clearTimeout(timer));
      return new Response(null, { status: 101, webSocket: client });
    }

    // "Send feedback" (card 9): a GitHub issue in the private repository, see feedback.ts.
    // Card LABLOCK: may this browser open the 🐞 Test Lab (the owner's code, or a pass it got for it)?
    // QUOTA1a: the lab meter of the objects' cost (local test servers only, see meter.ts).
    // ERR1: a request that fails inside the Worker, to see the JSON answer and the log line (local lab server only).
    if (url.pathname === '/api/lab/fail' && labServer(env, request)) throw new Error('lab: a failure on purpose');
    if (url.pathname === '/api/lab/meter') {
      if (!labServer(env, request)) return new Response('Not found', { status: 404 });
      return Response.json(meterRead(url.searchParams.get('reset') === '1'));
    }
    if (url.pathname === '/api/lab/check') return labCheck(request, url, env, () => ipKey(request, env));

    if (url.pathname === '/api/feedback') return sendFeedback(request, url, env, () => ipKey(request, env));

    // Card Y3: the owner's YouTube usage counters (secret header), for the quota form.
    if (url.pathname === '/api/youtube/usage') return youtubeUsage(request, env, () => ipKey(request, env));

    // YouTube search from the room's link box (the API key never leaves the Worker). Pages of other sites may not
    // use it as their free search: a browser sends their `Origin`.
    if (url.pathname === '/api/youtube/search' || url.pathname === '/api/youtube/pool' || url.pathname === '/api/youtube/like' || url.pathname === '/api/youtube/channel') {
      if (!allowedOrigin(request, url)) return new Response('Forbidden origin', { status: 403 });
      const handler = url.pathname.endsWith('/pool') ? youtubePool : url.pathname.endsWith('/like') ? youtubeLike : url.pathname.endsWith('/channel') ? youtubeChannel : youtubeSearch;
      return handler(request, url, env, () => ipKey(request, env));
    }
    // Podcasts from the link box (Apple's iTunes Search + the show's RSS feed, card P2).
    if (url.pathname === '/api/podcasts/search' || url.pathname === '/api/podcasts/episodes') {
      if (!allowedOrigin(request, url)) return new Response('Forbidden origin', { status: 403 });
      return podcasts(request, url, env, () => ipKey(request, env));
    }
    if (url.pathname === '/api/tiktok/resolve') {
      if (!allowedOrigin(request, url)) return new Response('Forbidden origin', { status: 403 });
      return tiktokResolve(request, url, env, () => ipKey(request, env));
    }

    // Kayıtlı odalar listesi için küçük bilgi / kayıt kaldırma (Durable Object cevaplar).
    const info = url.pathname.match(/^\/api\/rooms\/([^/]+)\/(info|unsave)$/);
    if (info) {
      if (!ROOM_ID_PATTERN.test(info[1]!)) return new Response('Invalid room id', { status: 400 });
      if (request.method !== 'GET' && !allowedOrigin(request, url)) return new Response('Forbidden origin', { status: 403 });
      // `unsave` carries a tiny JSON body ({cid}): refuse a body without a declared size or above 1 KB here, before it
      // reaches the room object (a chunked 100 MB body used to reset the room, security review 3 R3-1).
      if (info[2] === 'unsave') {
        if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
        // A browser always sends `Origin` on a POST; a script without one has no business here.
        if (request.headers.get('Origin') === null) return new Response('Forbidden origin', { status: 403 });
        const size = Number(request.headers.get('Content-Length') ?? NaN);
        if (!Number.isFinite(size)) return new Response('Length required', { status: 411 });
        if (size > UNSAVE_BODY_BYTES) return new Response('Too large', { status: 413 });
      }
      if (env.ROOM_INFO_LIMIT && !(await env.ROOM_INFO_LIMIT.limit({ key: await ipKey(request, env) })).success) {
        return new Response('Too many requests', { status: 429 });
      }
      // CF-12: only the Worker sets the internal headers; a client's own copies never reach the room.
      const clean = new Request(request);
      for (const name of [...clean.headers.keys()]) if (name.toLowerCase().startsWith('x-swm-')) clean.headers.delete(name);
      return stubFetch(env.ROOMS.get(env.ROOMS.idFromName(info[1]!)), clean);
    }

    const match = url.pathname.match(/^\/api\/rooms\/([^/]+)\/ws$/);
    if (match) {
      // Oda ID'si sadece harf, rakam, - ve _ içerebilir; kodlanmış karakterlere gerek yok.
      // (decodeURIComponent bozuk girdide hata fırlatıp 500 döndürüyordu.)
      const roomId = match[1]!;
      if (!ROOM_ID_PATTERN.test(roomId)) return new Response('Invalid room id', { status: 400 });
      return connect(request, url, env, env.ROOMS.get(env.ROOMS.idFromName(roomId)), roomId);
    }

    // Oda içi oyunlar (PlayWithMe): her oyun ayrı nesne, kimliğini izleme odası verir.
    const game = url.pathname.match(/^\/api\/games\/([^/]+)\/ws$/);
    if (game) {
      if (!GAME_ID_PATTERN.test(game[1]!)) return new Response('Invalid game id', { status: 400 });
      return connect(request, url, env, env.GAMES.get(env.GAMES.idFromName(game[1]!)));
    }
    // Çiz-Bil (ayrı nesne türü: tur süreleri, çizim akışı).
    const draw = url.pathname.match(/^\/api\/draw\/([^/]+)\/ws$/);
    if (draw) {
      if (!DRAW_ID_PATTERN.test(draw[1]!)) return new Response('Invalid game id', { status: 400 });
      return connect(request, url, env, env.DRAWS.get(env.DRAWS.idFromName(draw[1]!)));
    }
    // Bilgi yarışması.
    const quiz = url.pathname.match(/^\/api\/quiz\/([^/]+)\/ws$/);
    if (quiz) {
      if (!QUIZ_ID_PATTERN.test(quiz[1]!)) return new Response('Invalid game id', { status: 400 });
      return connect(request, url, env, env.QUIZZES.get(env.QUIZZES.idFromName(quiz[1]!)));
    }
    // 🚢 Sea Battle.
    const sea = url.pathname.match(/^\/api\/sea\/([^/]+)\/ws$/);
    if (sea) {
      if (!SEA_ID_PATTERN.test(sea[1]!)) return new Response('Invalid game id', { status: 400 });
      return connect(request, url, env, env.FLEETS.get(env.FLEETS.idFromName(sea[1]!)));
    }
    // Life poker.
    const poker = url.pathname.match(/^\/api\/poker\/([^/]+)\/ws$/);
    if (poker) {
      if (!POKER_ID_PATTERN.test(poker[1]!)) return new Response('Invalid game id', { status: 400 });
      return connect(request, url, env, env.POKERS.get(env.POKERS.idFromName(poker[1]!)));
    }

    // A TV waiting to be paired: it shows this code and listens here until a phone in a room types it.
    const tv = url.pathname.match(/^\/api\/tv\/([^/]+)\/ws$/);
    if (tv) {
      // Security R4-10: the TV is hidden until it ships with M8 done, so its routes are off unless `TV=on`.
      if (!tvOn(env)) return new Response('Not found', { status: 404 });
      if (!TV_CODE.test(tv[1]!)) return new Response('Invalid code', { status: 400 });
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
      const guarded = await guardSocket(request, url, env);
      if (guarded instanceof Response) return guarded;
      return stubFetch(env.TVLINKS.get(env.TVLINKS.idFromName(tv[1]!)), guarded);
    }

    // Moving my things to another device: the sender shows this code and waits here; the receiver types it.
    const move = url.pathname.match(/^\/api\/move\/([^/]+)\/ws$/);
    if (move) {
      if (!MOVE_CODE.test(move[1]!)) return new Response('Invalid code', { status: 400 });
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
      const guarded = await guardSocket(request, url, env);
      if (guarded instanceof Response) return guarded;
      return stubFetch(env.MOVELINKS.get(env.MOVELINKS.idFromName(move[1]!)), guarded);
    }

    return new Response('Not found', { status: 404 });
}
