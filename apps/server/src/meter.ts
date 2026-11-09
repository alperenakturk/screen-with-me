// QUOTA1a: a lab-only meter of what the Durable Objects cost on the Free plan (requests, rows written, awake time).
// Only on a local test server (`SWM_LAB_SERVER` = '1'); live never turns it on. `wrangler dev` runs the Worker and its
// objects in one process, so the counters live in this module and the Worker's `/api/lab/meter` reads them
// (`scripts/harness/do-load/run.cjs` measures a busy evening with it).

/** An object that gets no request for this long is taken as hibernated (Cloudflare: about 10 s). */
const IDLE_MS = 10_000;

interface Count {
  /** Requests the object was billed for: HTTP fetches, WebSocket messages that reached it, alarms. */
  requests: number;
  /** WebSocket messages among them (Cloudflare bills them 20:1 against the request quota). */
  messages: number;
  /** Storage rows written (each key put or deleted). */
  rows: number;
  /** Time awake, ms: each request keeps the object up until `IDLE_MS` after it. */
  awakeMs: number;
}

const counts = new Map<string, Count>();
/** Per object id: when its current awake stretch ends. */
const awakeUntil = new Map<string, number>();

function count(kind: string): Count {
  let c = counts.get(kind);
  if (!c) counts.set(kind, (c = { requests: 0, messages: 0, rows: 0, awakeMs: 0 }));
  return c;
}

function hit(kind: string, id: string, message: boolean): void {
  const c = count(kind);
  c.requests++;
  if (message) c.messages++;
  const now = Date.now();
  const until = awakeUntil.get(id) ?? 0;
  c.awakeMs += now >= until ? IDLE_MS : now + IDLE_MS - until;
  awakeUntil.set(id, now + IDLE_MS);
}

type Metered = {
  fetch?: (...args: never[]) => unknown;
  webSocketMessage?: (...args: never[]) => unknown;
  alarm?: (...args: never[]) => unknown;
};

/** Starts metering one object (call it in the constructor). Does nothing unless the lab variable is set. */
export function meterObject(object: Metered, ctx: DurableObjectState, env: { SWM_LAB_SERVER?: string }, kind: string): void {
  if (env.SWM_LAB_SERVER !== '1') return;
  const id = `${kind}:${ctx.id.toString()}`;
  const target = object as Record<string, unknown>;
  for (const name of ['fetch', 'webSocketMessage', 'alarm'] as const) {
    const original = object[name] as ((...args: unknown[]) => unknown) | undefined;
    if (typeof original !== 'function') continue;
    target[name] = function (this: unknown, ...args: unknown[]) {
      hit(kind, id, name === 'webSocketMessage');
      return original.apply(object, args);
    };
  }
  const storage = ctx.storage as unknown as Record<string, (...args: unknown[]) => unknown>;
  const put = storage.put!.bind(ctx.storage);
  const del = storage.delete!.bind(ctx.storage);
  const rows = (keyOrEntries: unknown) =>
    Array.isArray(keyOrEntries) ? keyOrEntries.length : typeof keyOrEntries === 'object' && keyOrEntries ? Object.keys(keyOrEntries).length : 1;
  try {
    storage.put = (...args: unknown[]) => {
      count(kind).rows += rows(args[0]);
      return put(...args);
    };
    storage.delete = (...args: unknown[]) => {
      count(kind).rows += rows(args[0]);
      return del(...args);
    };
  } catch {
    // A runtime whose storage can't be wrapped: requests and awake time are still counted.
  }
}

/** The counters so far (`?reset=1` starts them again). */
export function meterRead(reset: boolean): Record<string, Count> {
  const out = Object.fromEntries(counts);
  const copy = JSON.parse(JSON.stringify(out)) as Record<string, Count>;
  if (reset) {
    counts.clear();
    awakeUntil.clear();
  }
  return copy;
}
