import { ROOM_ID_PATTERN } from '@swm/shared/protocol';

export { Room } from './room.ts';

/**
 * Giriş noktası. Gelen bağlantıyı oda ID'sine göre doğru Durable Object'e
 * yönlendirir. Aynı ID'ye sahip herkes dünyanın neresinde olursa olsun
 * aynı Room nesnesine bağlanır.
 */
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') return new Response('ok');

    // Kayıtlı odalar listesi için küçük bilgi / kayıt kaldırma (Durable Object cevaplar).
    const info = url.pathname.match(/^\/api\/rooms\/([^/]+)\/(info|unsave)$/);
    if (info) {
      if (!ROOM_ID_PATTERN.test(info[1]!)) return new Response('Invalid room id', { status: 400 });
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
      const room = env.ROOMS.get(env.ROOMS.idFromName(roomId));
      return room.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
