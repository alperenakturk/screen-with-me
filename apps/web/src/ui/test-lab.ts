// 🐞 Sidelit Test Lab (card DL, DL1; grows from card 12's test panel). Only loads in a tab where `?debug=1` switched it
// on (debug-lab.ts); a normal visit never downloads this file. A drawer on the right (on a phone a bottom sheet; in
// fullscreen on the left, so the rail stays free) with tabs, a command box (Ctrl+K) and "🐞 This is a bug".
//
// Safety rules (the owner: "the debug mode itself must not be buggy"):
// - every command runs through `runCommand`: a throw or a rejected promise is a red line in the log, never a broken room;
// - features offer commands and status lines through `debugHooks` (no monkey-patching); a factory that throws is skipped;
// - the log keeps no browser ids, IP hashes, tokens or image data (`redact`); the bug text is shown before it is copied;
// - nothing here talks to the server by itself: commands use the room's own paths.
import { el } from '../dom.ts';
import { lang } from '../i18n.ts';
import { load, save } from '../storage.ts';
import {
  clearDebugErrors,
  debugErrors,
  debugHooks,
  debugOff,
  debugRoom,
  setDebugTap,
  type LabCommand,
  type LabHooks,
  type LabTab,
} from '../debug-lab.ts';
import { createFriends } from './lab-friends.ts';
import { createVideoLab } from './lab-video.ts';
import './test-lab.css';

const TEXT = {
  en: {
    open: 'Test Lab',
    title: 'Test Lab',
    close: 'Close',
    tabs: { status: '📊 Status', friends: '👥 Friends', video: '🎬 Video & network', games: '🎮 Games', scenarios: '🧪 Scenarios', screen: '🖥 Screen', log: '📜 Log' },
    device: 'This device',
    site: 'Site',
    extension: 'Extension',
    none: 'not installed',
    connection: 'Connection',
    noRoom: 'not in a room',
    browser: 'Browser',
    screen: 'Screen',
    kind: 'Device',
    language: 'Language',
    sync: 'Sync',
    drift: 'Behind the room',
    jumps: 'Jumps',
    people: 'People',
    playing: 'Playing',
    nothing: 'nothing',
    graph: 'Drift, last 60 s (± 1 s)',
    switches: 'Switches',
    tvLab: 'TV version (lab)',
    measure: 'Shorts switch timing',
    reloadNote: 'Switches apply after a reload.',
    reload: '⟳ Reload',
    connTest: '📶 Connection test',
    firstTime: '🌱 Start as a first-time visitor',
    firstAsk: 'Forget my name, avatar, first-time tips, "continue where you left off" and the room names I used in this browser, then reload?',
    errors: 'Recent errors',
    noErrors: 'No errors in this tab. 🎉',
    clear: 'Clear',
    bug: '🐞 This is a bug',
    bugTitle: 'Bug report',
    bugNote: 'This is exactly the text that will be copied: versions, the room\'s state, errors and the last 2 minutes of the log. No names, browser ids or chat images.',
    copy: '📋 Copy',
    copied: '✓ Copied',
    copyFailed: 'Copy failed: select the text and copy it',
    hide: 'Turn the lab off',
    hideNote: '`?debug=0` also turns it off.',
    commands: 'Commands',
    searchPlaceholder: 'Type a command… (Enter runs it)',
    noCommands: 'No commands here yet.',
    soon: 'Comes in a later step of the lab.',
    noMatch: 'No command matches.',
    run: 'Run',
    undo: 'Undo',
    unavailable: 'not available',
    filter: 'Filter',
    pings: 'Pings',
    pause: 'Pause',
    resume: 'Resume',
    logEmpty: 'Nothing logged yet.',
    ran: 'ran',
    failed: 'failed',
    undone: 'undone',
  },
  tr: {
    open: 'Test Lab',
    title: 'Test Lab',
    close: 'Kapat',
    tabs: { status: '📊 Durum', friends: '👥 Arkadaşlar', video: '🎬 Video ve ağ', games: '🎮 Oyunlar', scenarios: '🧪 Senaryolar', screen: '🖥 Ekran', log: '📜 Kayıt' },
    device: 'Bu cihaz',
    site: 'Site',
    extension: 'Eklenti',
    none: 'kurulu değil',
    connection: 'Bağlantı',
    noRoom: 'odada değil',
    browser: 'Tarayıcı',
    screen: 'Ekran',
    kind: 'Cihaz',
    language: 'Dil',
    sync: 'Senkron',
    drift: 'Odanın gerisinde',
    jumps: 'Atlamalar',
    people: 'Kişi',
    playing: 'Oynayan',
    nothing: 'hiçbir şey',
    graph: 'Kayma, son 60 sn (± 1 sn)',
    switches: 'Anahtarlar',
    tvLab: 'TV sürümü (deneme)',
    measure: 'Shorts geçiş ölçümü',
    reloadNote: 'Anahtarlar sayfa yenilenince geçerli olur.',
    reload: '⟳ Yenile',
    connTest: '📶 Bağlantı testi',
    firstTime: '🌱 İlk kez gelen biri gibi başla',
    firstAsk: 'Bu tarayıcıdaki adım, avatarım, ilk ipuçları, "kaldığın yerden devam et" ve odalarda kullandığım adlar unutulsun ve sayfa yenilensin mi?',
    errors: 'Son hatalar',
    noErrors: 'Bu sekmede hata yok. 🎉',
    clear: 'Temizle',
    bug: '🐞 Bu bir hata',
    bugTitle: 'Hata raporu',
    bugNote: 'Kopyalanacak yazı tam olarak bu: sürümler, odanın durumu, hatalar ve kaydın son 2 dakikası. Ad, tarayıcı kimliği ya da sohbet resmi yok.',
    copy: '📋 Kopyala',
    copied: '✓ Kopyalandı',
    copyFailed: 'Kopyalanamadı: yazıyı seçip kopyala',
    hide: 'Lab\'ı kapat',
    hideNote: '`?debug=0` de kapatır.',
    commands: 'Komutlar',
    searchPlaceholder: 'Bir komut yaz… (Enter çalıştırır)',
    noCommands: 'Burada henüz komut yok.',
    soon: 'Lab\'ın sonraki bir adımında gelecek.',
    noMatch: 'Eşleşen komut yok.',
    run: 'Çalıştır',
    undo: 'Geri al',
    unavailable: 'şu an kullanılamaz',
    filter: 'Süz',
    pings: 'Ping\'ler',
    pause: 'Durdur',
    resume: 'Devam',
    logEmpty: 'Henüz kayıt yok.',
    ran: 'çalıştı',
    failed: 'başarısız',
    undone: 'geri alındı',
  },
};
type Text = (typeof TEXT)['en'];
const TABS: LabTab[] = ['status', 'friends', 'video', 'games', 'scenarios', 'screen', 'log'];

// ---------------------------------------------------------------------------------------------------------------------
// Log: room messages in / out, lab command runs and errors. Kept for LOG_MS, at most LOG_MAX lines.
const LOG_MS = 2 * 60 * 1000;
const LOG_MAX = 600;
const TEXT_MAX = 300;

export interface LogLine {
  at: number;
  dir: 'in' | 'out' | 'lab' | 'error';
  type: string;
  text: string;
}

const SECRET_KEYS = /^(cid|ip|iphash|token|tvtoken|key|secret|hash|pk|sid|password|code)$/i;

/** A copy of a message without browser ids, IP hashes, tokens or image data, as short text. */
export function redact(message: unknown): string {
  const seen = new WeakSet<object>();
  const walk = (value: unknown, key: string, depth: number): unknown => {
    if (SECRET_KEYS.test(key)) return '•••';
    if (typeof value === 'string') {
      if (value.startsWith('data:')) return `[data ${value.length} chars]`;
      return value.length > 120 ? `${value.slice(0, 120)}…` : value;
    }
    if (!value || typeof value !== 'object') return value;
    if (seen.has(value) || depth > 5) return '…';
    seen.add(value);
    if (Array.isArray(value)) return value.length > 12 ? [...value.slice(0, 12).map((v) => walk(v, '', depth + 1)), `+${value.length - 12}`] : value.map((v) => walk(v, '', depth + 1));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = walk(v, k, depth + 1);
    return out;
  };
  let text: string;
  try {
    text = JSON.stringify(walk(message, '', 0));
  } catch {
    text = String(message);
  }
  return text.length > TEXT_MAX ? `${text.slice(0, TEXT_MAX)}…` : text;
}

const log: LogLine[] = [];
const logListeners = new Set<() => void>();
function addLog(line: Omit<LogLine, 'at'>): void {
  const now = Date.now();
  log.push({ at: now, ...line });
  while (log.length > LOG_MAX || (log.length && log[0]!.at < now - LOG_MS)) log.shift();
  for (const fn of logListeners) fn();
}
function typeOf(message: unknown): string {
  return message && typeof message === 'object' && typeof (message as { t?: unknown }).t === 'string' ? (message as { t: string }).t : '?';
}

// ---------------------------------------------------------------------------------------------------------------------
// Commands: the lab's own and every feature's (debugHooks). A run is always wrapped.

let lastRun: { command: LabCommand } | null = null;

function hooks(): { name: string; hooks: LabHooks }[] {
  const out: { name: string; hooks: LabHooks }[] = [];
  for (const [name, factory] of debugHooks.entries()) {
    try {
      out.push({ name, hooks: factory() ?? {} });
    } catch (error) {
      addLog({ dir: 'error', type: name, text: `hooks failed: ${String((error as Error)?.message ?? error)}` });
    }
  }
  return out;
}

function allCommands(): LabCommand[] {
  const list: LabCommand[] = [];
  const ids = new Set<string>();
  for (const { hooks: h } of hooks()) {
    for (const command of h.commands ?? []) {
      if (!command || typeof command.id !== 'string' || ids.has(command.id)) continue;
      ids.add(command.id);
      list.push(command);
    }
  }
  return list;
}

function availability(command: LabCommand): true | string {
  if (!command.available) return true;
  try {
    const result = command.available();
    return result === true ? true : String(result || 'not available');
  } catch (error) {
    return String((error as Error)?.message ?? error);
  }
}

/** Runs a command so that nothing it does can break the room. Resolves with the line written to the log. */
export async function runCommand(command: LabCommand, arg?: string, mode: 'run' | 'undo' = 'run'): Promise<LogLine> {
  const fn = mode === 'run' ? command.run : command.undo;
  const why = mode === 'run' ? availability(command) : true;
  if (why !== true || !fn) {
    addLog({ dir: 'error', type: command.id, text: why === true ? 'no undo' : why });
    return log[log.length - 1]!;
  }
  try {
    const result = await Promise.resolve().then(() => fn(arg));
    addLog({ dir: 'lab', type: command.id, text: `${mode === 'run' ? '▶' : '↶'} ${result === undefined ? (mode === 'run' ? 'done' : 'undone') : redact(result)}` });
    lastRun = mode === 'run' && command.undo ? { command } : null;
  } catch (error) {
    addLog({ dir: 'error', type: command.id, text: `${mode === 'run' ? '▶' : '↶'} ${String((error as Error)?.message ?? error)}` });
    lastRun = null;
  }
  return log[log.length - 1]!;
}

// ---------------------------------------------------------------------------------------------------------------------
// Facts (from card 12's panel) and status lines.

function browserName(): string {
  const ua = navigator.userAgent;
  const pick = (re: RegExp, name: string) => {
    const m = re.exec(ua);
    return m ? `${name} ${m[1]}` : null;
  };
  const browser =
    pick(/Edg\/(\d+)/, 'Edge') ?? pick(/OPR\/(\d+)/, 'Opera') ?? pick(/Firefox\/(\d+)/, 'Firefox') ?? pick(/Chrome\/(\d+)/, 'Chrome') ?? pick(/Version\/(\d+).*Safari/, 'Safari') ?? 'other';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'other';
  return `${browser} · ${os}`;
}

function deviceKind(): string {
  const root = document.documentElement.classList;
  const parts = ['phone', 'is-touch', 'has-mouse', 'is-standalone', 'sideways'].filter((name) => root.contains(name));
  return parts.length ? parts.join(' · ') : '—';
}

function roomIdInPath(): string | null {
  const match = /^\/r\/([^/]+)\/?$/.exec(location.pathname);
  return match ? decodeURIComponent(match[1]!) : null;
}

function facts(tx: Text): [string, string][] {
  const root = document.documentElement.dataset;
  return [
    [tx.site, document.querySelector('.footer-version')?.textContent?.trim() || '?'],
    [tx.extension, root.swmExtension || tx.none],
    [tx.connection, root.swmTransport === 'http' ? 'HTTP fallback' : root.swmTransport === 'ws' ? 'WebSocket' : tx.noRoom],
    [tx.browser, browserName()],
    [tx.screen, `${innerWidth}×${innerHeight} · ×${Math.round(devicePixelRatio * 100) / 100}`],
    [tx.kind, deviceKind()],
    [tx.language, lang()],
  ];
}

function syncFacts(tx: Text): [string, string][] | null {
  const room = debugRoom();
  if (!room) return null;
  return [
    [tx.drift, room.drift === null ? '—' : `${Math.round(room.drift * 1000)} ms`],
    [tx.jumps, String(room.jumps)],
    [tx.people, String(room.people)],
    [tx.playing, room.kind ?? tx.nothing],
  ];
}

function hookStatus(): [string, string][] {
  const rows: [string, string][] = [];
  for (const { name, hooks: h } of hooks()) {
    if (!h.status) continue;
    try {
      for (const row of h.status()) if (Array.isArray(row) && row.length === 2) rows.push([String(row[0]), String(row[1])]);
    } catch (error) {
      rows.push([name, `status failed: ${String((error as Error)?.message ?? error)}`]);
    }
  }
  return rows;
}

/** The bug text: exactly what "Copy" copies (shown first). */
export function bugText(tx: Text = TEXT.en): string {
  const lines = ['Sidelit bug report', new Date().toISOString(), `Page: ${location.pathname}`, ''];
  for (const [k, v] of facts(tx)) lines.push(`${k}: ${v}`);
  const sync = syncFacts(tx);
  if (sync) for (const [k, v] of sync) lines.push(`${k}: ${v}`);
  for (const [k, v] of hookStatus()) lines.push(`${k}: ${v}`);
  try {
    const diag = localStorage.getItem('diagLast');
    if (diag) lines.push('', 'Connection test:', diag);
  } catch {
    // No storage.
  }
  const errors = debugErrors();
  lines.push('', `${tx.errors} (${errors.length}):`);
  for (const e of errors) lines.push(`${new Date(e.at).toLocaleTimeString()} ${e.msg}${e.where ? ` (${e.where})` : ''}`);
  const since = Date.now() - LOG_MS;
  const recent = log.filter((l) => l.at >= since);
  lines.push('', `Log, last 2 minutes (${recent.length}):`);
  for (const l of recent) lines.push(`${new Date(l.at).toLocaleTimeString()} ${l.dir.padEnd(5)} ${l.type} ${l.text}`);
  return lines.join('\n');
}

/** Keys that make the site treat this browser as one that has been here before (never the browser id `cid`). */
function forgetVisits(): void {
  let rooms: string[] = [];
  try {
    const list = JSON.parse(load('meRooms') ?? '[]') as unknown;
    if (Array.isArray(list)) rooms = list.filter((x): x is string => typeof x === 'string');
  } catch {
    // Nothing to forget.
  }
  for (const room of rooms) save(`me:${room}`, '');
  for (const key of ['meRooms', 'name', 'avatar', 'tipsSeen', 'lastRoom', 'extUpdateSeen', 'stickerNote']) save(key, '');
  try {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith('in:') || key.startsWith('tab:') || key.startsWith('me:')) sessionStorage.removeItem(key);
  } catch {
    // No tab storage.
  }
}

function measureOn(): boolean {
  try {
    return sessionStorage.getItem('olcum') === '1';
  } catch {
    return false;
  }
}

function setMeasure(on: boolean): void {
  try {
    if (on) sessionStorage.setItem('olcum', '1');
    else sessionStorage.removeItem('olcum');
  } catch {
    // No tab storage.
  }
}

function table(rows: [string, string][]): HTMLElement {
  const list = el('dl', { class: 'debug-facts' });
  for (const [k, v] of rows) list.append(el('dt', {}, k), el('dd', {}, v));
  return list;
}

function toggle(label: string, on: boolean, change: (on: boolean) => void, id: string): HTMLElement {
  const input = el('input', { type: 'checkbox', class: 'switch', role: 'switch', id });
  input.checked = on;
  input.addEventListener('change', () => change(input.checked));
  return el('label', { class: 'debug-switch', for: id }, el('span', {}, label), input);
}

// ---------------------------------------------------------------------------------------------------------------------

export function mountDebugPanel(): void {
  if (document.querySelector('#debug-panel-root')) return;
  const tx = TEXT[lang() === 'tr' ? 'tr' : 'en'];
  setDebugTap((dir, message) => {
    const type = typeOf(message);
    addLog({ dir, type, text: redact(message) });
  });
  addEventListener('swm-debug-error', () => {
    const last = debugErrors()[0];
    if (last) addLog({ dir: 'error', type: 'page', text: `${last.msg}${last.where ? ` (${last.where})` : ''}` });
  });

  const root = el('div', { id: 'debug-panel-root' });
  const fab = el('button', { type: 'button', class: 'debug-fab', title: `${tx.open} · Ctrl+Shift+D`, 'aria-label': tx.open, 'aria-expanded': 'false' }, '🐞');
  const panel = el('section', { class: 'debug-panel lab-drawer', role: 'dialog', 'aria-label': tx.title });
  panel.hidden = true;

  // ---- the lab's own commands ----
  let marks = 0;
  const own: LabCommand[] = [
    { id: 'lab.bug', title: 'Lab: this is a bug', help: 'Shows the bug text (versions, state, errors, last 2 min of log) to copy.', tab: 'status', run: () => openBug() },
    { id: 'lab.mark', title: 'Lab: put a marker in the log', help: 'A line "— mark N —" in the log, to find a moment later. Undo removes it.', tab: 'log', run: () => { marks++; addLog({ dir: 'lab', type: 'mark', text: `— mark ${marks} —` }); return `mark ${marks}`; }, undo: () => { let i = log.length - 1; while (i >= 0 && log[i]!.type !== 'mark') i--; if (i >= 0) log.splice(i, 1); for (const fn of logListeners) fn(); } },
    { id: 'lab.clearLog', title: 'Lab: clear the log', help: 'Empties the lab\'s log (the room is not touched).', tab: 'log', run: () => { log.length = 0; for (const fn of logListeners) fn(); } },
    { id: 'lab.clearErrors', title: 'Lab: clear the errors', help: 'Empties the list of recent errors.', tab: 'status', run: () => { clearDebugErrors(); fab.classList.remove('has-error'); draw(); } },
    { id: 'lab.selfTest', title: 'Lab: self-test (a failing command)', help: 'Runs a command that throws: the log gets a red line and the room keeps working.', tab: 'log', run: () => { throw new Error('self-test: this error is expected'); } },
    { id: 'lab.reload', title: 'Lab: reload the page', help: 'Reloads this tab (the lab stays on).', tab: 'status', run: () => location.reload() },
    { id: 'lab.firstVisit', title: 'Lab: start as a first-time visitor', help: 'Forgets name, avatar, tips and room names in this browser (never the browser id), then reloads.', tab: 'screen', run: () => { if (confirm(tx.firstAsk)) { forgetVisits(); location.reload(); } } },
    { id: 'lab.off', title: 'Lab: turn the lab off', help: 'Removes the lab from this tab (same as ?debug=0).', tab: 'status', run: () => turnOff() },
  ];
  const unregisterOwn = debugHooks.register('lab', () => ({ commands: own }));
  // 👥 Fake friends (DL2): ordinary clients in this room, all gone when the lab is turned off or the tab closes.
  const runById = (id: string, arg?: string): Promise<unknown> => {
    const c = allCommands().find((x) => x.id === id);
    return c ? runCommand(c, arg).then((line) => (line.dir === 'error' ? Promise.reject(new Error(line.text)) : line.text)) : Promise.reject(new Error(`no command ${id}`));
  };
  const friends = createFriends(roomIdInPath(), addLog, runById);
  const unregisterFriends = debugHooks.register('friends', () => ({
    commands: friends.commands,
    status: () => (friends.count() ? [['Fake friends', String(friends.count())]] : []),
  }));
  // 🎬 Video & network (DL4): accidents on this tab's own connection and player.
  const video = createVideoLab();
  const unregisterVideo = debugHooks.register('video', () => ({ commands: video.commands, status: video.status }));

  // ---- head, tabs, body, foot ----
  const closeButton = el('button', { type: 'button', class: 'icon-btn debug-close', 'aria-label': tx.close }, '✕');
  const tabBar = el('div', { class: 'lab-tabs', role: 'tablist' });
  const tabButtons = new Map<LabTab, HTMLButtonElement>();
  for (const tab of TABS) {
    const b = el('button', { type: 'button', role: 'tab', class: 'lab-tab', 'data-tab': tab, 'aria-selected': 'false' }, tx.tabs[tab]);
    b.addEventListener('click', () => show(tab));
    tabButtons.set(tab, b);
    tabBar.append(b);
  }
  const body = el('div', { class: 'debug-body lab-body', role: 'tabpanel' });
  const bugButton = el('button', { type: 'button', class: 'btn primary debug-copy lab-bug' }, tx.bug);
  const offButton = el('button', { type: 'button', class: 'btn debug-small debug-off' }, tx.hide);
  const cmdButton = el('button', { type: 'button', class: 'btn debug-small lab-cmd-open', title: 'Ctrl+K' }, '⌘ Ctrl+K');
  panel.append(
    el('header', { class: 'debug-head' }, el('h3', {}, `🐞 ${tx.title}`), cmdButton, closeButton),
    tabBar,
    body,
    el('footer', { class: 'debug-foot' }, bugButton, offButton, el('p', { class: 'muted small' }, tx.hideNote)),
  );

  // ---- Status tab ----
  const deviceBox = el('div');
  const syncBox = el('div');
  const hookBox = el('div');
  const graph = el('canvas', { class: 'lab-graph', width: '320', height: '64', 'aria-label': tx.graph });
  const errorBox = el('ul', { class: 'debug-errors' });
  const errorTitle = el('h4', {});
  const clearButton = el('button', { type: 'button', class: 'btn debug-small debug-clear' }, tx.clear);
  const reloadButton = el('button', { type: 'button', class: 'btn debug-small debug-reload' }, tx.reload);
  const firstButton = el('button', { type: 'button', class: 'btn debug-small debug-first' }, tx.firstTime);
  const room = roomIdInPath();
  const connLink = el('a', { class: 'btn debug-small debug-conn', href: `/connection${room ? `?room=${encodeURIComponent(room)}` : ''}` }, tx.connTest);
  const statusView = el('div', { class: 'lab-view', 'data-view': 'status' },
    el('h4', {}, tx.device),
    deviceBox,
    syncBox,
    hookBox,
    el('h4', {}, tx.graph),
    graph,
    el('h4', {}, tx.switches),
    toggle(tx.tvLab, load('opt:tvLab') === '1', (on) => save('opt:tvLab', on ? '1' : '0'), 'debug-tvlab'),
    toggle(tx.measure, measureOn(), setMeasure, 'debug-measure'),
    el('p', { class: 'muted small' }, tx.reloadNote),
    el('div', { class: 'debug-actions' }, reloadButton, connLink, firstButton),
    el('div', { class: 'debug-errors-head' }, errorTitle, clearButton),
    errorBox,
  );

  // ---- Log tab ----
  const filterInput = el('input', { type: 'search', class: 'lab-filter', placeholder: tx.filter, 'aria-label': tx.filter });
  const pingsBox = el('input', { type: 'checkbox', id: 'lab-pings' });
  const pauseButton = el('button', { type: 'button', class: 'btn debug-small lab-pause' }, tx.pause);
  const logList = el('ol', { class: 'lab-log' });
  let paused = false;
  const logView = el('div', { class: 'lab-view', 'data-view': 'log' },
    el('div', { class: 'lab-log-tools' }, filterInput, el('label', { class: 'lab-check', for: 'lab-pings' }, pingsBox, tx.pings), pauseButton),
    logList,
  );
  const HIDDEN_TYPES = new Set(['ping', 'pong', 'clock', 'time']);
  function drawLog(): void {
    if (paused || current !== 'log') return;
    const words = filterInput.value.trim().toLowerCase();
    const lines = log.filter((l) => (pingsBox.checked || !HIDDEN_TYPES.has(l.type)) && (!words || `${l.dir} ${l.type} ${l.text}`.toLowerCase().includes(words)));
    const atBottom = logList.scrollTop + logList.clientHeight >= logList.scrollHeight - 8;
    logList.replaceChildren(
      ...(lines.length
        ? lines.slice(-250).map((l) => el('li', { class: `lab-line ${l.dir}` }, el('time', {}, new Date(l.at).toLocaleTimeString()), el('b', {}, ` ${l.dir === 'in' ? '⇣' : l.dir === 'out' ? '⇡' : l.dir === 'lab' ? '🐞' : '⚠'} ${l.type} `), l.text))
        : [el('li', { class: 'muted' }, tx.logEmpty)]),
    );
    if (atBottom) logList.scrollTop = logList.scrollHeight;
  }
  filterInput.addEventListener('input', drawLog);
  pingsBox.addEventListener('change', drawLog);
  pauseButton.addEventListener('click', () => {
    paused = !paused;
    pauseButton.textContent = paused ? tx.resume : tx.pause;
    if (!paused) drawLog();
  });

  // ---- command lists (one per tab; the command box lists them all) ----
  function commandRow(command: LabCommand): HTMLElement {
    const why = availability(command);
    const runButton = el('button', { type: 'button', class: 'btn debug-small lab-run', 'data-command': command.id }, tx.run);
    runButton.disabled = why !== true;
    runButton.addEventListener('click', () => void runAndShow(command));
    return el('li', { class: 'lab-command', 'data-command': command.id },
      el('div', { class: 'lab-command-text' }, el('strong', {}, command.title), el('small', {}, command.help), command.where || why !== true ? el('span', { class: 'lab-tag' }, why === true ? command.where! : `${tx.unavailable}: ${why}`) : null),
      runButton,
    );
  }
  const undoBar = el('div', { class: 'lab-undo', hidden: '' });
  async function runAndShow(command: LabCommand, arg?: string): Promise<void> {
    const line = await runCommand(command, arg);
    showResult(line, command);
  }
  function showResult(line: LogLine, command: LabCommand): void {
    const failedRun = line.dir === 'error';
    undoBar.hidden = false;
    undoBar.className = `lab-undo ${failedRun ? 'error' : ''}`;
    const undoButton = lastRun?.command === command ? el('button', { type: 'button', class: 'btn debug-small lab-undo-btn' }, tx.undo) : null;
    undoButton?.addEventListener('click', async () => {
      const back = await runCommand(command, undefined, 'undo');
      undoBar.replaceChildren(el('span', {}, `${command.title}: ${back.dir === 'error' ? `${tx.failed}: ${back.text}` : tx.undone}`));
      draw();
    });
    undoBar.replaceChildren(el('span', {}, `${command.title}: ${failedRun ? `${tx.failed}: ${line.text}` : tx.ran}`), ...(undoButton ? [undoButton] : []));
    draw();
  }
  function commandView(tab: LabTab): HTMLElement {
    const commands = allCommands().filter((c) => c.tab === tab);
    return el('div', { class: 'lab-view', 'data-view': tab },
      commands.length ? el('ul', { class: 'lab-commands' }, ...commands.map(commandRow)) : el('p', { class: 'muted' }, `${tx.noCommands} ${tx.soon}`),
    );
  }

  // ---- drawing ----
  let current: LabTab = 'status';
  try {
    const saved = sessionStorage.getItem('lab:tab') as LabTab | null;
    if (saved && TABS.includes(saved)) current = saved;
  } catch {
    // No tab storage.
  }
  function draw(): void {
    if (panel.hidden) return;
    if (current === 'status') {
      deviceBox.replaceChildren(table(facts(tx)));
      const sync = syncFacts(tx);
      syncBox.hidden = !sync;
      if (sync) syncBox.replaceChildren(el('h4', {}, tx.sync), table(sync));
      const extra = hookStatus();
      hookBox.hidden = !extra.length;
      hookBox.replaceChildren(table(extra));
      const errors = debugErrors();
      errorTitle.textContent = `${tx.errors} (${errors.length})`;
      errorBox.replaceChildren(
        ...(errors.length
          ? errors.map((e) => el('li', {}, el('time', {}, new Date(e.at).toLocaleTimeString()), ` ${e.msg}`, e.where ? el('small', {}, ` ${e.where}`) : null))
          : [el('li', { class: 'muted' }, tx.noErrors)]),
      );
      drawGraph();
    } else if (current === 'log') drawLog();
  }
  function show(tab: LabTab): void {
    current = tab;
    try {
      sessionStorage.setItem('lab:tab', tab);
    } catch {
      // No tab storage.
    }
    for (const [t, b] of tabButtons) b.setAttribute('aria-selected', String(t === tab));
    const view =
      tab === 'status'
        ? statusView
        : tab === 'log'
          ? logView
          : tab === 'friends'
            ? el('div', { class: 'lab-view', 'data-view': 'friends' }, friends.view((id, arg) => {
                const c = allCommands().find((x) => x.id === id);
                if (c) void runAndShow(c, arg);
              }), el('h4', {}, tx.commands), commandView(tab))
            : commandView(tab);
    const commands = tab === 'status' || tab === 'log' ? commandView(tab) : null;
    body.replaceChildren(view, ...(commands && commands.querySelector('.lab-commands') ? [el('h4', {}, tx.commands), commands] : []), undoBar);
    draw();
  }

  // Drift graph: one sample per 500 ms, 60 s, ± 1 s around 0.
  const drift: (number | null)[] = [];
  function sampleDrift(): void {
    const room = debugRoom();
    drift.push(room ? room.drift : null);
    if (drift.length > 120) drift.shift();
  }
  function drawGraph(): void {
    const ctx = graph.getContext('2d');
    if (!ctx) return;
    const w = graph.width;
    const h = graph.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffc65a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    drift.forEach((d, i) => {
      if (d === null) {
        started = false;
        return;
      }
      const x = (i / 119) * w;
      const y = h / 2 - Math.max(-1, Math.min(1, d)) * (h / 2 - 2);
      if (started) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
      started = true;
    });
    ctx.stroke();
  }

  // ---- the command box (Ctrl+K) ----
  const cmdBox = el('div', { class: 'lab-cmdbox', role: 'dialog', 'aria-label': tx.commands, hidden: '' });
  const cmdInput = el('input', { type: 'text', class: 'lab-cmd-input', placeholder: tx.searchPlaceholder, 'aria-label': tx.searchPlaceholder, autocomplete: 'off', spellcheck: 'false' });
  const cmdList = el('ul', { class: 'lab-cmd-list', role: 'listbox' });
  cmdBox.append(cmdInput, cmdList);
  let picked = 0;
  let matches: LabCommand[] = [];
  function drawCmds(): void {
    const words = cmdInput.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    matches = allCommands().filter((c) => words.every((w) => `${c.id} ${c.title} ${c.help}`.toLowerCase().includes(w)));
    picked = Math.min(picked, Math.max(0, matches.length - 1));
    cmdList.replaceChildren(
      ...(matches.length
        ? matches.map((c, i) => {
            const why = availability(c);
            const item = el('li', { role: 'option', class: `lab-cmd-item${i === picked ? ' picked' : ''}${why === true ? '' : ' off'}`, 'aria-selected': String(i === picked), 'data-command': c.id },
              el('strong', {}, c.title), el('small', {}, why === true ? c.help : `${tx.unavailable}: ${why}`));
            item.addEventListener('mousedown', (event) => {
              event.preventDefault();
              picked = i;
              void runPicked();
            });
            return item;
          })
        : [el('li', { class: 'muted' }, tx.noMatch)]),
    );
  }
  async function runPicked(): Promise<void> {
    const command = matches[picked];
    if (!command) return;
    closeCmd();
    if (panel.hidden) setOpen(true);
    await runAndShow(command);
  }
  function openCmd(): void {
    cmdBox.hidden = false;
    cmdInput.value = '';
    picked = 0;
    drawCmds();
    cmdInput.focus();
  }
  function closeCmd(): void {
    cmdBox.hidden = true;
  }
  cmdInput.addEventListener('input', () => {
    picked = 0;
    drawCmds();
  });
  cmdInput.addEventListener('keydown', (event) => {
    // The room's shortcuts never see what is typed here.
    event.stopPropagation();
    if (event.key === 'ArrowDown') picked = Math.min(matches.length - 1, picked + 1);
    else if (event.key === 'ArrowUp') picked = Math.max(0, picked - 1);
    else if (event.key === 'Enter') {
      event.preventDefault();
      void runPicked();
      return;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeCmd();
      return;
    } else return;
    event.preventDefault();
    drawCmds();
  });
  cmdInput.addEventListener('blur', () => setTimeout(closeCmd, 120));
  cmdButton.addEventListener('click', openCmd);

  // ---- the bug text ----
  const bugBox = el('div', { class: 'lab-bug-box', role: 'dialog', 'aria-label': tx.bugTitle, hidden: '' });
  const bugArea = el('textarea', { class: 'lab-bug-text', readonly: '', 'aria-label': tx.bugTitle, spellcheck: 'false' });
  const bugCopy = el('button', { type: 'button', class: 'btn primary lab-bug-copy' }, tx.copy);
  const bugClose = el('button', { type: 'button', class: 'icon-btn lab-bug-close', 'aria-label': tx.close }, '✕');
  bugBox.append(el('header', { class: 'debug-head' }, el('h3', {}, tx.bugTitle), bugClose), el('p', { class: 'muted small' }, tx.bugNote), bugArea, el('div', { class: 'debug-actions' }, bugCopy));
  function openBug(): string {
    bugArea.value = bugText(tx);
    bugBox.hidden = false;
    bugCopy.textContent = tx.copy;
    bugCopy.focus();
    return `${bugArea.value.split('\n').length} lines`;
  }
  bugClose.addEventListener('click', () => {
    bugBox.hidden = true;
    bugButton.focus();
  });
  bugCopy.addEventListener('click', () => {
    const done = (ok: boolean) => {
      bugCopy.textContent = ok ? tx.copied : tx.copyFailed;
      if (!ok) bugArea.select();
    };
    if (!navigator.clipboard) return done(false);
    navigator.clipboard.writeText(bugArea.value).then(
      () => done(true),
      () => done(false),
    );
  });
  bugButton.addEventListener('click', () => void openBug());

  // ---- open / close, keys ----
  root.append(panel, cmdBox, bugBox, fab);
  document.body.append(root);
  // Real fullscreen shows only the fullscreen element: the lab goes into it while it lasts (left side there).
  const onFullscreen = () => {
    const fs = document.fullscreenElement;
    if (fs && fs !== document.documentElement) {
      fs.append(root);
      root.classList.add('lab-in-fs');
    } else if (root.parentElement !== document.body) {
      document.body.append(root);
      root.classList.remove('lab-in-fs');
    } else root.classList.remove('lab-in-fs');
  };
  document.addEventListener('fullscreenchange', onFullscreen);
  let timer = 0;
  let sampler = window.setInterval(sampleDrift, 500);
  function setOpen(open: boolean): void {
    panel.hidden = !open;
    fab.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('lab-open', open);
    clearInterval(timer);
    if (open) {
      show(current);
      timer = window.setInterval(draw, 1000);
    }
  }
  fab.addEventListener('click', () => setOpen(fab.getAttribute('aria-expanded') !== 'true'));
  closeButton.addEventListener('click', () => setOpen(false));
  const onLog = () => {
    if (!panel.hidden && current === 'log') drawLog();
  };
  logListeners.add(onLog);
  const offFriends = friends.onChange(() => {
    if (!panel.hidden && current === 'friends') show('friends');
  });
  const offHooks = debugHooks.onChange(() => {
    if (!panel.hidden && current !== 'status' && current !== 'log') show(current);
  });
  function onKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 'd') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(!!panel.hidden);
      if (!panel.hidden) fab.focus();
    } else if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === 'k') {
      event.preventDefault();
      event.stopPropagation();
      if (cmdBox.hidden) openCmd();
      else closeCmd();
    } else if (event.key === 'Escape' && !bugBox.hidden) {
      event.stopPropagation();
      bugBox.hidden = true;
    } else if (event.key === 'Escape' && !panel.hidden && panel.contains(document.activeElement)) {
      // Esc closes the drawer first only while the focus is in it (the room's own Esc stays the room's).
      event.stopPropagation();
      setOpen(false);
      fab.focus();
    }
  }
  document.addEventListener('keydown', onKey, true);
  addEventListener('swm-debug-error', () => {
    fab.classList.add('has-error');
    draw();
  });
  if (debugErrors().length) fab.classList.add('has-error');
  clearButton.addEventListener('click', () => {
    clearDebugErrors();
    fab.classList.remove('has-error');
    draw();
  });
  reloadButton.addEventListener('click', () => location.reload());
  firstButton.addEventListener('click', () => {
    if (!confirm(tx.firstAsk)) return;
    forgetVisits();
    location.reload();
  });
  function turnOff(): void {
    friends.close();
    offFriends();
    unregisterFriends();
    video.close();
    unregisterVideo();
    clearInterval(timer);
    clearInterval(sampler);
    sampler = 0;
    setDebugTap(null);
    logListeners.delete(onLog);
    offHooks();
    unregisterOwn();
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('fullscreenchange', onFullscreen);
    document.documentElement.classList.remove('lab-open');
    // The harness / console handle exists only while the lab is on.
    delete (window as unknown as { __swmLab?: unknown }).__swmLab;
    debugOff();
  }
  offButton.addEventListener('click', turnOff);
  // For the lab's harness (and the owner's console): the same safe paths as the buttons.
  (window as unknown as { __swmLab?: unknown }).__swmLab = { run: (id: string, arg?: string) => { const c = allCommands().find((x) => x.id === id); return c ? runCommand(c, arg) : Promise.reject(new Error(`no command ${id}`)); }, log: () => log.slice(), bugText: () => bugText(tx), status: () => hookStatus(), sync: () => { const r = debugRoom(); return r ? { drift: r.drift, jumps: r.jumps } : null; } };
}
