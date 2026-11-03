// Hidden test panel (card 12). Tiny on purpose: loaded with every page (app.ts); the panel itself (ui/debug-panel.ts)
// is a lazy chunk that only loads in a tab where it was switched on.

const KEY = 'swm:debug';
const ERRORS_KEY = 'swm:debugErrors';
const MAX_ERRORS = 20;

export interface DebugError {
  at: number;
  msg: string;
  where: string;
}

export interface DebugRoom {
  drift: number | null;
  jumps: number;
  people: number;
  kind: string | null;
}

let roomSource: (() => DebugRoom) | null = null;

/** The room hands the panel a way to read its live numbers (sync engine, people, what plays). */
export function setDebugRoom(source: (() => DebugRoom) | null): void {
  roomSource = source;
}

export function debugRoom(): DebugRoom | null {
  return roomSource ? roomSource() : null;
}

function session(key: string, value?: string | null): string | null {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else if (value !== undefined) sessionStorage.setItem(key, value);
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function debugErrors(): DebugError[] {
  try {
    const list = JSON.parse(session(ERRORS_KEY) ?? '[]') as unknown;
    return Array.isArray(list) ? (list as DebugError[]) : [];
  } catch {
    return [];
  }
}

export function clearDebugErrors(): void {
  session(ERRORS_KEY, null);
}

function keep(msg: string, where: string): void {
  const list = [{ at: Date.now(), msg: msg.slice(0, 300), where: where.slice(0, 160) }, ...debugErrors()];
  session(ERRORS_KEY, JSON.stringify(list.slice(0, MAX_ERRORS)));
  dispatchEvent(new Event('swm-debug-error'));
}

/** Turns the panel off in this tab (same as `?debug=0`). */
export function debugOff(): void {
  session(KEY, null);
  clearDebugErrors();
  document.querySelector('#debug-panel-root')?.remove();
}

/**
 * `?debug=1` once in a tab switches the panel on for that tab (it survives reloads), `?debug=0` switches it off; the
 * word is removed from the address. Normal visits load nothing and record nothing. Not in the film-page overlay.
 */
export function startDebugLab(inShell: boolean): void {
  const params = new URLSearchParams(location.search);
  const value = params.get('debug');
  if (value !== null) {
    if (value === '1') session(KEY, '1');
    else debugOff();
    params.delete('debug');
    const rest = params.toString();
    history.replaceState(history.state, '', `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`);
  }
  if (inShell || session(KEY) !== '1') return;
  addEventListener('error', (event) => {
    const where = event.filename ? `${event.filename.replace(location.origin, '')}:${event.lineno}:${event.colno}` : '';
    keep(String(event.message || event.error || 'error'), where);
  });
  addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as { message?: unknown } | undefined;
    keep(String(reason?.message ?? reason ?? 'rejection'), 'promise');
  });
  void import('./ui/debug-panel.ts').then(({ mountDebugPanel }) => mountDebugPanel());
}
