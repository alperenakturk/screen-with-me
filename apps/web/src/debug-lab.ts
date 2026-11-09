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
  /** The room's 👑 Make host message (the lab's fake friends, DL2); the server refuses anyone but the host. */
  makeHost?: (id: string) => void;
  /** 🎬 Video & network (DL4): this tab's own connection and player only (never the server). */
  lab?: RoomLab;
}

/** What the lab's 🎬 tab may do to this tab (card DL4): accidents on my side only, every one of them undoable. */
export interface RoomLab {
  /** My connection drops and stays down `ms` (then the room's normal reconnect). */
  drop(ms: number): void;
  /** Reconnect now with my member id, the way the room comes back after a deploy. */
  restart(): void;
  /** Every room message in and out waits `ms` (0 = off). */
  latency(ms: number): void;
  latencyMs(): number;
  /** New connections over the HTTP fallback (true) or the normal way (false); reconnects now. */
  forceHttp(on: boolean): void;
  forcedHttp(): boolean;
  transport(): string | null;
  /** My video `seconds` off the room (the drift correction must bring it back); false without a video. */
  drift(seconds: number): boolean;
  /** My video counts as stuck for `ms` (the room waits for me); false without a video. */
  stall(ms: number): boolean;
  /** Adds a link to the queue like the link box does. */
  addLink(url: string): void;
  /** QUOTA1a: this tab sends `count` real pings at once (the room's message ceiling should close and reconnect it). */
  flood(count: number): void;
  /** The room's connection address (`…/api/rooms/<id>/ws`), for extra test connections. */
  socketUrl(): string;
  /** IMG2: the room's chat images run out now (a local lab server only; others refuse). */
  ageImages(): void;
  // 🧪 Scenarios (DL5): what the room shows, and the room's own UI paths.
  playback(): { item: boolean; paused: boolean };
  memberId(): string | null;
  members(): { id: string; name: string }[];
  /** Presses 🧪 Sync test (an empty room plays it). */
  syncTest(): void;
  isHost(): boolean;
  knockOn(): boolean;
  /** "Ask before letting people in" (host only; false when I'm not the host). */
  knock(on: boolean): boolean;
  /** The person menu's "🔒 Message privately" (false when that member is not here). */
  openPrivate(memberId: string): boolean;
  /** Writes in the chat box and sends it (to the private person when the box is private). */
  write(text: string): void;
}

let roomSource: (() => DebugRoom) | null = null;

// ---- 🐞 Test Lab (card DL): the hook API features use to offer the lab commands and status lines ----
// The lab is a lazy chunk (ui/test-lab.ts) that loads only in a tab where `?debug=1` switched it on. Features never
// import it: they register a *factory* here, which runs only when the lab mounts, so with the lab off a registration is
// one stored function and nothing else happens (no objects built, no listeners, no timers).

/** The lab's tabs. A command shows in its tab and in the command box (Ctrl+K). */
export type LabTab = 'status' | 'friends' | 'video' | 'games' | 'scenarios' | 'screen' | 'log';

/**
 * A lab text (card LABTR): plain English, or `{ en, tr }` so the lab follows the page's language. Write the pair inline
 * (`title: { en: 'Drop my connection for 6 s', tr: 'Bağlantımı 6 sn kopar' }`): scripts/check-texts.mjs checks that
 * every `{ en, tr }` object has both. Plain words that say what you will see, no jargon (the owner reads them).
 */
export type LabText = string | { en: string; tr: string };

/** An error whose message the lab shows in the page's language (`throw labFail({ en, tr })`). */
export function labFail(text: LabText): Error {
  return Object.assign(new Error(typeof text === 'string' ? text : text.en), { lab: text });
}

/** One side of a lab text (to build a pair out of several). */
export function labText(text: LabText, l: 'en' | 'tr'): string {
  return typeof text === 'string' ? text : text[l];
}

/** A direct (voice / camera / stream) connection's state for 📊 Status: 🟢 connected, 🟡 on its way, 🔴 broken. */
export function labPeer(id: string, state: string, ice: string): LabText {
  const mark = state === 'connected' ? '🟢' : state === 'failed' || state === 'closed' || state === 'disconnected' ? '🔴' : '🟡';
  const word = { connected: ['connected', 'bağlı'], connecting: ['connecting', 'bağlanıyor'], new: ['starting', 'başlıyor'], failed: ['broken', 'koptu'], disconnected: ['lost for now', 'şimdilik koptu'], closed: ['closed', 'kapandı'] }[state] ?? [state, state];
  // The raw states stay in English only (for the bug report); Turkish says it in plain words (owner: no jargon).
  return { en: `${mark} ${id.slice(0, 4)} ${word[0]} (${state}/${ice})`, tr: `${mark} ${id.slice(0, 4)} ${word[1]}` };
}

export interface LabCommand {
  /** Unique, dotted: "snackBar.coins", "friends.add". The command box matches it and the title (both languages). */
  id: string;
  /** Short title that says what happens: "Snack Bar: +10K coins". */
  title: LabText;
  /** One line of help shown under the title: what you will see. */
  help: LabText;
  tab: LabTab;
  /** Where it works, shown as a tag: "in a room", "test server only"… */
  where?: LabText;
  /** `true` when it can run now, otherwise the reason it can't ("not in a room", "no Snack Bar save"). */
  available?: () => true | LabText;
  /** Runs the command. A thrown error or rejected promise becomes a red line in the lab's log, never a broken room. */
  run: (arg?: string) => unknown;
  /** Puts back what `run` changed; offered as "Undo" right after a run. Commands that change nothing have none. */
  undo?: () => unknown;
}

export interface LabHooks {
  commands?: LabCommand[];
  /** Extra lines for 📊 Status, read about once a second while it shows. */
  status?: () => [label: LabText, value: LabText][];
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

/** Card LABLOCK: the pass the Worker gave for the owner's code, kept 30 days in this browser (`lab-pass.ts`). */
const PASS_KEY = 'swm:labPass';

function local(key: string, value?: string | null): string | null {
  try {
    if (value === null) localStorage.removeItem(key);
    else if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** A local dev or test server (`npm run dev`, `wrangler dev`, the harnesses): the lab is open without a code there. */
function localServer(): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
}

/**
 * May this browser open the lab? Locally always; on the live site only with the owner's code (`?debug=<code>`, which
 * gets a 30-day pass) or with a pass from before (`?debug=1`, and every reload of a lab tab). The check is the
 * Worker's `POST /api/lab/check`; the code is never stored here, only the pass.
 */
async function labAllowed(code: string | null): Promise<boolean> {
  if (localServer()) return true;
  const pass = local(PASS_KEY);
  const body = code && code !== '1' ? { code } : pass ? { pass } : null;
  if (!body) return false;
  try {
    const response = await fetch('/api/lab/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const answer = (await response.json()) as { ok?: unknown; pass?: unknown };
    if (answer.ok === true) {
      if (typeof answer.pass === 'string') local(PASS_KEY, answer.pass);
      return true;
    }
    // An old pass the Worker no longer takes (expired, or a new code): forget it.
    if ('pass' in body && response.ok) local(PASS_KEY, null);
    return false;
  } catch {
    return false;
  }
}

function mountLab(): void {
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

/**
 * `?debug=<code>` (live) or `?debug=1` (a local server, or a browser holding a pass) once in a tab switches the lab on
 * for that tab (it survives reloads, each one checked again on live), `?debug=0` switches it off; the word is removed
 * from the address. Without the code nothing loads: no 🐞, no chunk. Normal visits record nothing. Not in the
 * film-page overlay.
 */
export function startDebugLab(inShell: boolean): void {
  const params = new URLSearchParams(location.search);
  const value = params.get('debug');
  if (value !== null) {
    params.delete('debug');
    const rest = params.toString();
    history.replaceState(history.state, '', `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`);
    if (value === '0' || value === '') debugOff();
  }
  if (inShell) return;
  const asked = value !== null && value !== '0' && value !== '';
  if (!asked && session(KEY) !== '1') return;
  if (localServer()) {
    // Synchronous as before, so the room and the games already see the lab when they start.
    session(KEY, '1');
    mountLab();
    return;
  }
  void labAllowed(asked ? value : null).then((ok) => {
    if (!ok) {
      session(KEY, null);
      return;
    }
    session(KEY, '1');
    mountLab();
  });
}
