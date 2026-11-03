import { DRAW_ID_PATTERN } from '@swm/shared/games/draw';
import { GAME_ID_PATTERN } from '@swm/shared/games/protocol';
import { POKER_ID_PATTERN } from '@swm/shared/games/poker';
import { QUIZ_ID_PATTERN } from '@swm/shared/games/quiz';
import { ROOM_ID_PATTERN, TV_CODE } from '@swm/shared/protocol';
import { IP_HEADER, ROOM_HEADER } from './ip.ts';
import { tiktokResolve } from './tiktok.ts';
import { youtubeLike, youtubePool, youtubeSearch } from './youtube.ts';

export { Draw } from './draw.ts';
export { Game } from './game.ts';
export { Poker } from './poker.ts';
export { Quiz } from './quiz.ts';
export { Room } from './room.ts';
export { TvLink } from './tv-link.ts';

/**
 * Browsers always send `Origin` with a WebSocket; only our own site (and local development) may open connections, so
 * another website can't make its visitors join or spam rooms (security review 1, O1). Without `Origin` it is not a
 * browser (tests, tools), and such a client could fake the header anyway.
 */
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

async function ipKey(request: Request): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`swm-ip:${ip}`));
  return Array.from(new Uint8Array(digest).slice(0, 8), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Checks every new connection (a WebSocket upgrade or an HTTP fallback `open`): right origin, and at most
 * `CONNECT_LIMIT` new connections per IP and minute (a script reconnecting with fresh browser ids gets nowhere).
 * Returns the request to forward (with the IP hash header set by us, never by the client) or an error response.
 */
async function guardSocket(request: Request, url: URL, env: Env): Promise<Request | Response> {
  if (!allowedOrigin(request, url)) return new Response('Forbidden origin', { status: 403 });
  const key = await ipKey(request);
  if (env.CONNECT_LIMIT && !(await env.CONNECT_LIMIT.limit({ key })).success) return new Response('Too many connections', { status: 429 });
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
  } else {
    if (!allowedOrigin(request, url)) return new Response('Forbidden origin', { status: 403 });
    forwarded = new Request(request);
    forwarded.headers.delete(IP_HEADER);
  }
  if (forwarded instanceof Response) return forwarded;
  // The room learns its own id (it hands it to a TV it pairs); never from the client.
  if (roomId) forwarded.headers.set(ROOM_HEADER, roomId);
  else forwarded.headers.delete(ROOM_HEADER);
  return stub.fetch(forwarded);
}

/**
 * Giriş noktası. Gelen bağlantıyı oda ID'sine göre doğru Durable Object'e
 * yönlendirir. Aynı ID'ye sahip herkes dünyanın neresinde olursa olsun
 * aynı Room nesnesine bağlanır.
 */
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') return new Response('ok');

    // Which version of the code answers: the Worker and a freshly started Durable Object, as a new test room would be
    // (objects restart on the new code a while after a deploy, closing their connections). The deploy job runs the
    // live e2e only once both say the new id. TvLink stores nothing, so these probe objects leave nothing behind.
    if (url.pathname === '/api/version') {
      const probe = env.TVLINKS.get(env.TVLINKS.idFromName(`version-${crypto.randomUUID()}`));
      const object = await (await probe.fetch('https://version/version')).text();
      return Response.json({ worker: env.CF_VERSION_METADATA?.id ?? '', object }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Connection probe (HTTP fallback, `/baglanti`): does a WebSocket open on this network at all? Answers "ok" and
    // waits for the client to close. `?bytes=N` on a plain request answers N bytes (diagnostics: large answers).
    if (url.pathname === '/api/probe') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        const bytes = Math.min(Math.max(Number(url.searchParams.get('bytes')) || 0, 0), 512_000);
        return new Response('x'.repeat(bytes), { headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain' } });
      }
      const guarded = await guardSocket(request, url, env);
      if (guarded instanceof Response) return guarded;
      const { 0: client, 1: server } = new WebSocketPair();
      server.accept();
      server.send('ok');
      server.addEventListener('message', () => server.close(1000, 'done'));
      return new Response(null, { status: 101, webSocket: client });
    }

    // YouTube search from the room's link box (the API key never leaves the Worker). Pages of other sites may not
    // use it as their free search: a browser sends their `Origin`.
    if (url.pathname === '/api/youtube/search' || url.pathname === '/api/youtube/pool' || url.pathname === '/api/youtube/like') {
      if (!allowedOrigin(request, url)) return new Response('Forbidden origin', { status: 403 });
      const handler = url.pathname.endsWith('/pool') ? youtubePool : url.pathname.endsWith('/like') ? youtubeLike : youtubeSearch;
      return handler(request, url, env, () => ipKey(request));
    }
    if (url.pathname === '/api/tiktok/resolve') {
      if (!allowedOrigin(request, url)) return new Response('Forbidden origin', { status: 403 });
      return tiktokResolve(request, url, env, () => ipKey(request));
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
      if (env.ROOM_INFO_LIMIT && !(await env.ROOM_INFO_LIMIT.limit({ key: await ipKey(request) })).success) {
        return new Response('Too many requests', { status: 429 });
      }
      return env.ROOMS.get(env.ROOMS.idFromName(info[1]!)).fetch(request);
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
    // Life poker.
    const poker = url.pathname.match(/^\/api\/poker\/([^/]+)\/ws$/);
    if (poker) {
      if (!POKER_ID_PATTERN.test(poker[1]!)) return new Response('Invalid game id', { status: 400 });
      return connect(request, url, env, env.POKERS.get(env.POKERS.idFromName(poker[1]!)));
    }

    // A TV waiting to be paired: it shows this code and listens here until a phone in a room types it.
    const tv = url.pathname.match(/^\/api\/tv\/([^/]+)\/ws$/);
    if (tv) {
      if (!TV_CODE.test(tv[1]!)) return new Response('Invalid code', { status: 400 });
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
      const guarded = await guardSocket(request, url, env);
      if (guarded instanceof Response) return guarded;
      return env.TVLINKS.get(env.TVLINKS.idFromName(tv[1]!)).fetch(guarded);
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
