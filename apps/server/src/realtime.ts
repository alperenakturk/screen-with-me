// Cloudflare Realtime (SFU) ile konuşan ince katman. Herkes kendi sesini bir kez Cloudflare'e yollar, Cloudflare
// odadakilere dağıtır; kim neyi yayınlıyor bilgisini oda (Durable Object) tutar. Uygulama anahtarı sadece burada
// (Worker'ın gizli değişkeni): istemciye hiç gitmez, istemci başkasının oturumuna dokunamaz.
// API: https://developers.cloudflare.com/realtime/sfu/https-api/

const BASE = 'https://rtc.live.cloudflare.com/v1/apps';

export interface RealtimeConfig {
  appId: string;
  secret: string;
}

/** Ayarlı ve kapatılmamışsa yapılandırma (yoksa sesli sohbet görünmez). */
export function realtimeConfig(env: Env): RealtimeConfig | null {
  if (env.VOICE === 'off' || !env.REALTIME_APP_ID || !env.REALTIME_APP_SECRET) return null;
  return { appId: env.REALTIME_APP_ID, secret: env.REALTIME_APP_SECRET };
}

interface TrackResult {
  mid?: string;
  trackName?: string;
  errorCode?: string;
}

interface SfuResponse {
  sessionId?: string;
  sessionDescription?: { type: 'offer' | 'answer'; sdp: string };
  requiresImmediateRenegotiation?: boolean;
  tracks?: TrackResult[];
  errorCode?: string;
}

async function call(config: RealtimeConfig, method: string, path: string, body?: unknown): Promise<SfuResponse> {
  const response = await fetch(`${BASE}/${config.appId}${path}`, {
    method,
    headers: { authorization: `Bearer ${config.secret}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as SfuResponse;
  if (!response.ok || data.errorCode) throw new Error(`realtime ${response.status} ${data.errorCode ?? ''}`.trim());
  return data;
}

export async function newSession(config: RealtimeConfig): Promise<string> {
  const data = await call(config, 'POST', '/sessions/new');
  if (!data.sessionId) throw new Error('realtime: oturum yok');
  return data.sessionId;
}

/** Kendi akışımı yayınla: teklifi verir, Cloudflare'in cevabını döner. */
export async function publish(config: RealtimeConfig, session: string, sdp: string, mid: string, track: string): Promise<string> {
  const data = await call(config, 'POST', `/sessions/${session}/tracks/new`, {
    sessionDescription: { type: 'offer', sdp },
    tracks: [{ location: 'local', mid, trackName: track }],
  });
  if (data.tracks?.some((t) => t.errorCode) || data.sessionDescription?.type !== 'answer') throw new Error('realtime: yayın kabul edilmedi');
  return data.sessionDescription.sdp;
}

/** Başkasının akışını çek: Cloudflare yeni bir teklif döner (cevap renegotiate ile gider) ve akışın mid'ini verir. */
export async function pull(config: RealtimeConfig, session: string, fromSession: string, track: string) {
  const data = await call(config, 'POST', `/sessions/${session}/tracks/new`, {
    tracks: [{ location: 'remote', sessionId: fromSession, trackName: track }],
  });
  const result = data.tracks?.[0];
  if (!result?.mid || result.errorCode) throw new Error('realtime: akış çekilemedi');
  return {
    mid: result.mid,
    renegotiate: data.requiresImmediateRenegotiation === true,
    sdp: data.sessionDescription?.sdp,
    sdpType: data.sessionDescription?.type,
  };
}

export async function renegotiate(config: RealtimeConfig, session: string, sdp: string): Promise<void> {
  await call(config, 'PUT', `/sessions/${session}/renegotiate`, { sessionDescription: { type: 'answer', sdp } });
}

export async function closeTracks(config: RealtimeConfig, session: string, mids: string[]): Promise<void> {
  await call(config, 'PUT', `/sessions/${session}/tracks/close`, { tracks: mids.map((mid) => ({ mid })), force: true });
}
