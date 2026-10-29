import { DRAW_ID_PATTERN } from '@swm/shared/games/draw';
import { GAME_ID_PATTERN } from '@swm/shared/games/protocol';
import { QUIZ_ID_PATTERN } from '@swm/shared/games/quiz';
import { ROOM_ID_PATTERN } from '@swm/shared/protocol';
import { IP_HEADER } from './ip.ts';
import { youtubeSearch } from './youtube.ts';

export { Draw } from './draw.ts';
export { Game } from './game.ts';
export { Quiz } from './quiz.ts';
export { Room } from './room.ts';

/**
 * Browsers always send `Origin` with a WebSocket; only our own site (and local development) may open connections, so
 * another website can't make its visitors join or spam rooms (security review 1, O1). Without `Origin` it is not a
 * browser (tests, tools), and such a client could fake the header anyway.
 */
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
 * Checks every WebSocket upgrade: right origin, and at most `CONNECT_LIMIT` new connections per IP and minute (a
 * script reconnecting with fresh browser ids gets nowhere). Returns the request to forward (with the IP hash header
 * set by us, never by the client) or an error response.
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
 * Giriş noktası. Gelen bağlantıyı oda ID'sine göre doğru Durable Object'e
 * yönlendirir. Aynı ID'ye sahip herkes dünyanın neresinde olursa olsun
 * aynı Room nesnesine bağlanır.
 */
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') return new Response('ok');

    // YouTube search from the room's link box (the API key never leaves the Worker). Pages of other sites may not
    // use it as their free search: a browser sends their `Origin`.
    if (url.pathname === '/api/youtube/search') {
      if (!allowedOrigin(request, url)) return new Response('Forbidden origin', { status: 403 });
      return youtubeSearch(request, url, env, () => ipKey(request));
    }

    // Kayıtlı odalar listesi için küçük bilgi / kayıt kaldırma (Durable Object cevaplar).
    const info = url.pathname.match(/^\/api\/rooms\/([^/]+)\/(info|unsave)$/);
    if (info) {
      if (!ROOM_ID_PATTERN.test(info[1]!)) return new Response('Invalid room id', { status: 400 });
      if (request.method !== 'GET' && !allowedOrigin(request, url)) return new Response('Forbidden origin', { status: 403 });
      return env.ROOMS.get(env.ROOMS.idFromName(info[1]!)).fetch(request);
    }

    const match = url.pathname.match(/^\/api\/rooms\/([^/]+)\/ws$/);
    if (match) {
      // Oda ID'si sadece harf, rakam, - ve _ içerebilir; kodlanmış karakterlere gerek yok.
      // (decodeURIComponent bozuk girdide hata fırlatıp 500 döndürüyordu.)
      const roomId = match[1]!;
      if (!ROOM_ID_PATTERN.test(roomId)) return new Response('Invalid room id', { status: 400 });
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }
      const guarded = await guardSocket(request, url, env);
      if (guarded instanceof Response) return guarded;
      return env.ROOMS.get(env.ROOMS.idFromName(roomId)).fetch(guarded);
    }

    // Oda içi oyunlar (PlayWithMe): her oyun ayrı nesne, kimliğini izleme odası verir.
    const game = url.pathname.match(/^\/api\/games\/([^/]+)\/ws$/);
    if (game) {
      if (!GAME_ID_PATTERN.test(game[1]!)) return new Response('Invalid game id', { status: 400 });
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
      const guarded = await guardSocket(request, url, env);
      if (guarded instanceof Response) return guarded;
      return env.GAMES.get(env.GAMES.idFromName(game[1]!)).fetch(guarded);
    }
    // Çiz-Bil (ayrı nesne türü: tur süreleri, çizim akışı).
    const draw = url.pathname.match(/^\/api\/draw\/([^/]+)\/ws$/);
    if (draw) {
      if (!DRAW_ID_PATTERN.test(draw[1]!)) return new Response('Invalid game id', { status: 400 });
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
      const guarded = await guardSocket(request, url, env);
      if (guarded instanceof Response) return guarded;
      return env.DRAWS.get(env.DRAWS.idFromName(draw[1]!)).fetch(guarded);
    }
    // Bilgi yarışması.
    const quiz = url.pathname.match(/^\/api\/quiz\/([^/]+)\/ws$/);
    if (quiz) {
      if (!QUIZ_ID_PATTERN.test(quiz[1]!)) return new Response('Invalid game id', { status: 400 });
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
      const guarded = await guardSocket(request, url, env);
      if (guarded instanceof Response) return guarded;
      return env.QUIZZES.get(env.QUIZZES.idFromName(quiz[1]!)).fetch(guarded);
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
