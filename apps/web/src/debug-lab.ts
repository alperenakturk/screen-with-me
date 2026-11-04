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

// ---- 🐞 Test Lab (card DL): the hook API features use to offer the lab commands and status lines ----
// The lab is a lazy chunk (ui/test-lab.ts) that loads only in a tab where `?debug=1` switched it on. Features never
// import it: they register a *factory* here, which runs only when the lab mounts, so with the lab off a registration is
// one stored function and nothing else happens (no objects built, no listeners, no timers).

/** The lab's tabs. A command shows in its tab and in the command box (Ctrl+K). */
export type LabTab = 'status' | 'friends' | 'video' | 'games' | 'scenarios' | 'screen' | 'log';

export interface LabCommand {
  /** Unique, dotted: "snackBar.coins", "friends.add". The command box matches it and the title. */
  id: string;
  /** Short title, in English (the lab is a developer tool): "Snack Bar: +10K coins". */
  title: string;
  /** One line of help shown under the title. */
  help: string;
  tab: LabTab;
  /** Where it works, shown as a tag: "in a room", "test server only"… */
  where?: string;
  /** `true` when it can run now, otherwise the reason it can't ("not in a room", "no Snack Bar save"). */
  available?: () => true | string;
  /** Runs the command. A thrown error or rejected promise becomes a red line in the lab's log, never a broken room. */
  run: (arg?: string) => unknown;
  /** Puts back what `run` changed; offered as "Undo" right after a run. Commands that change nothing have none. */
  undo?: () => unknown;
}

export interface LabHooks {
  commands?: LabCommand[];
  /** Extra lines for 📊 Status, read about once a second while it shows. */
  status?: () => [label: string, value: string][];
}

type LabFactory = () => LabHooks;
const labFactories = new Map<string, LabFactory>();
const labListeners = new Set<() => void>();

export const debugHooks = {
  /**
   * A feature offers the lab its commands: `debugHooks.register('snackBar', () => ({ commands: [...] }))`. The factory
   * runs only while the lab is open (again after each change). Returns the unregister function (call it when the
   * feature goes away, e.g. a game window closes).
   */
  register(name: string, factory: LabFactory): () => void {
    labFactories.set(name, factory);
    for (const fn of labListeners) fn();
    return () => {
      if (labFactories.get(name) !== factory) return;
      labFactories.delete(name);
      for (const fn of labListeners) fn();
    };
  },
  /** For the lab: the registered features. */
  entries(): [string, LabFactory][] {
    return [...labFactories];
  },
  /** For the lab: told when a feature registers or goes. */
  onChange(fn: () => void): () => void {
    labListeners.add(fn);
    return () => labListeners.delete(fn);
  },
};

/** The lab's log listens here; with the lab off `debugTap` is a single null check. */
let tap: ((dir: 'in' | 'out', message: unknown) => void) | null = null;
export function setDebugTap(fn: typeof tap): void {
  tap = fn;
}
/** The room reports each message it sends (`out`) or gets (`in`). Never throws. */
export function debugTap(dir: 'in' | 'out', message: unknown): void {
  if (!tap) return;
  try {
    tap(dir, message);
  } catch {
    // The lab's log must never break the room.
  }
}

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
  void import('./ui/test-lab.ts').then(({ mountDebugPanel }) => mountDebugPanel());
}
