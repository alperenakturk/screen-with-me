// ERR1 (CF-7): one way to fail. A request whose handling throws gets a small JSON answer (never a stack or Cloudflare's
// HTML 1101 page) and one structured log line: the route with its ids masked, the error's name, and whether the
// runtime marked it retryable / overloaded. Never an IP, room id, name or message text.

/** The route without ids: `/api/rooms/abc123/ws` → `/api/rooms/:id/ws`. */
export function routeOf(pathname: string): string {
  return pathname.replace(/^(\/api\/[a-z-]+)\/[^/]+/, '$1/:id').slice(0, 80);
}

interface DoError {
  name?: unknown;
  retryable?: unknown;
  overloaded?: unknown;
}

/** One structured log line for an error (`console.error`, Workers Logs). */
export function logError(msg: string, error: unknown, extra: Record<string, string> = {}): void {
  const e = (error ?? {}) as DoError;
  console.error(
    JSON.stringify({
      msg,
      ...extra,
      error: error instanceof Error ? error.name : typeof error,
      ...(e.retryable === true ? { retryable: true } : {}),
      ...(e.overloaded === true ? { overloaded: true } : {}),
    }),
  );
}

/** The answer for a request that failed inside the Worker or an object (no details, no stack). */
export function failed(error: unknown): Response {
  const overloaded = (error as DoError | null)?.overloaded === true;
  return Response.json({ error: overloaded ? 'busy' : 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '2' } });
}

/**
 * A Durable Object call, tried once more when the runtime says the error is retryable (an object reset, a lost
 * connection) and not overloaded (retrying an overloaded object only adds to its load). Only requests without a body
 * are retried (a body is read once); the second failure goes to the caller.
 */
export async function stubFetch(stub: { fetch(request: Request): Promise<Response> }, request: Request): Promise<Response> {
  const again = request.body === null ? request.clone() : null;
  try {
    return await stub.fetch(request);
  } catch (error) {
    const e = error as DoError | null;
    if (!again || e?.retryable !== true || e?.overloaded === true) throw error;
    logError('object retried', error);
    return stub.fetch(again);
  }
}
