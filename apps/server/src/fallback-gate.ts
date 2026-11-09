import { DurableObject } from 'cloudflare:workers';
import { limitOf } from './limits.ts';

// QUOTA2 (CF-2): open HTTP-fallback sessions per address, across every room and table. A held poll keeps its object
// awake (billed duration) and each session costs a request a message, so one address could hold hundreds of them in
// different objects. One small object per address (keyed by the IP hash, so there is no single gate for everyone)
// keeps a lease per open session: the Worker takes one on `open`, the object that holds the session gives it back
// when the session ends and renews it from its alarm while it lives. A lease that is never given back (an object
// restarted and forgot its sessions) runs out by itself after `LEASE_MS`.

/** A lease lives this long unless renewed (the holding object renews every `RENEW_MS`). */
export const LEASE_MS = 30 * 60_000;
export const RENEW_MS = 10 * 60_000;
/** The lease id the Worker hands the object with a new session. */
export const LEASE_HEADER = 'X-SWM-Lease';
export const LEASE_PATTERN = /^[0-9a-f]{32}$/;

type Leases = Record<string, number>;

export class FallbackGate extends DurableObject<Env> {
  private async leases(now: number): Promise<Leases> {
    const all = (await this.ctx.storage.get<Leases>('leases')) ?? {};
    for (const [id, until] of Object.entries(all)) if (until <= now) delete all[id];
    return all;
  }

  /** A new session: true when the address still has room (`FALLBACK_SESSIONS_PER_IP`). */
  async take(lease: string, now = Date.now()): Promise<boolean> {
    if (!LEASE_PATTERN.test(lease)) return false;
    const all = await this.leases(now);
    if (Object.keys(all).length >= limitOf(this.env, 'FALLBACK_SESSIONS_PER_IP')) {
      await this.ctx.storage.put('leases', all);
      return false;
    }
    all[lease] = now + LEASE_MS;
    await this.ctx.storage.put('leases', all);
    return true;
  }

  async release(leases: string[], now = Date.now()): Promise<void> {
    const all = await this.leases(now);
    for (const id of leases) delete all[id];
    if (Object.keys(all).length) await this.ctx.storage.put('leases', all);
    else await this.ctx.storage.delete('leases');
  }

  async renew(leases: string[], now = Date.now()): Promise<void> {
    const all = await this.leases(now);
    for (const id of leases) if (LEASE_PATTERN.test(id)) all[id] = now + LEASE_MS;
    await this.ctx.storage.put('leases', all);
  }
}

/** The gate of one address (IP hash). */
export function gateOf(env: Env, ip: string): DurableObjectStub<FallbackGate> {
  return env.FBGATE.get(env.FBGATE.idFromName(ip));
}

/** What a `PollHub` uses to give leases back and renew them (failures are only logged: never break a session). */
export interface LeaseHooks {
  release(ip: string, leases: string[]): Promise<void>;
  renew(ip: string, leases: string[]): Promise<void>;
}

export function leaseHooks(env: Env): LeaseHooks | undefined {
  if (!env.FBGATE) return undefined;
  const run = async (what: string, job: () => Promise<void>) => {
    try {
      await job();
    } catch (error) {
      console.error(JSON.stringify({ msg: 'fallback gate', what, error: error instanceof Error ? error.name : 'error' }));
    }
  };
  return {
    release: (ip, leases) => run('release', () => gateOf(env, ip).release(leases)),
    renew: (ip, leases) => run('renew', () => gateOf(env, ip).renew(leases)),
  };
}

/**
 * QUOTA2: a quiet session's poll can be answered sooner and the page told to wait before the next one, so its object
 * is not held awake by that session the whole time. Off by default (`FALLBACK_IDLE_GAP_MS` 0): Durable Objects are
 * billed until about 10 s after their last request, so only a wait longer than that saves anything, and while the page
 * waits, what others do in the room reaches it that much later. Worker variables (all ms): `FALLBACK_IDLE_AFTER_MS`
 * (no news for this long = idle, default 120 000), `FALLBACK_IDLE_HOLD_MS` (the idle poll's hold, default 5 000),
 * `FALLBACK_IDLE_GAP_MS` (the wait the page is asked for, default 0 = off).
 */
export interface IdlePolls {
  after: number;
  hold: number;
  gap: number;
}

function msVar(env: object, name: string, fallback: number): number {
  const raw = (env as Record<string, unknown>)[name];
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function idlePolls(env: object): IdlePolls {
  return { after: msVar(env, 'FALLBACK_IDLE_AFTER_MS', 120_000), hold: msVar(env, 'FALLBACK_IDLE_HOLD_MS', 5_000), gap: msVar(env, 'FALLBACK_IDLE_GAP_MS', 0) };
}

/** What every object passes its `PollHub`: the lease hooks and the idle-poll settings. */
export function hubOptions(env: Env): { leases?: LeaseHooks; idle: () => IdlePolls } {
  return { leases: leaseHooks(env), idle: () => idlePolls(env) };
}
