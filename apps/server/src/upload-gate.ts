import { DurableObject } from 'cloudflare:workers';
import { takeUpload, UPLOAD_LIMITS, type UploadLimits, type UploadState } from '@swm/shared/upload-budget';
import { readCapped } from './fallback.ts';

/**
 * Security review 4, R4-1: one counter for every image the rooms store (custom emojis, chat images), so an address
 * can't fill the account's storage by spreading uploads over many fresh rooms. One instance (`gate`); `POST /take`
 * with `{key, bytes}` answers 200 `ok` or 429 `ip` / `day`. Its state is today's byte counts per IP hash only (no
 * images, rooms or names), reset when the UTC day changes (`takeUpload` in `@swm/shared/upload-budget`).
 */
export class UploadGate extends DurableObject<Env> {
  override async fetch(request: Request): Promise<Response> {
    if (new URL(request.url).pathname !== '/take' || request.method !== 'POST') return new Response('Not found', { status: 404 });
    let body: { key?: unknown; bytes?: unknown } | null = null;
    try {
      body = JSON.parse((await readCapped(request, 256)) ?? 'null');
    } catch {
      body = null;
    }
    const key = typeof body?.key === 'string' ? body.key : '';
    const bytes = typeof body?.bytes === 'number' ? body.bytes : 0;
    const saved = await this.ctx.storage.get<UploadState>('uploads');
    const { answer, state } = takeUpload(saved, key, bytes, Date.now(), limitsOf(this.env));
    if (answer === 'bad') return new Response('bad', { status: 400 });
    if (answer !== 'ok') return new Response(answer, { status: 429 });
    await this.ctx.storage.put('uploads', state);
    return new Response('ok');
  }
}

/** The limits; a local `wrangler dev --var UPLOAD_IP_BYTES:<n>` may lower the per-address one for a test (never live). */
function limitsOf(env: Env): UploadLimits {
  const local = Number(env.UPLOAD_IP_BYTES);
  return Number.isInteger(local) && local > 0 && local < UPLOAD_LIMITS.perIp ? { ...UPLOAD_LIMITS, perIp: local } : UPLOAD_LIMITS;
}

/**
 * A room asks before it stores an image: true when today's budgets still have room for `bytes`. Fails closed: if the
 * counter can't be reached the image is refused (the sender sees "too many, wait a bit") rather than stored uncounted.
 */
export async function allowUpload(env: Env, key: string, bytes: number): Promise<boolean> {
  try {
    const gate = env.UPLOADS.get(env.UPLOADS.idFromName('gate'));
    const res = await gate.fetch('https://gate/take', { method: 'POST', body: JSON.stringify({ key, bytes }) });
    return res.status === 200;
  } catch {
    return false;
  }
}
