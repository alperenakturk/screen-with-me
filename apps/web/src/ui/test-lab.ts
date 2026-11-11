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
  labFail,
  debugRoom,
  setDebugTap,
  type LabCommand,
  type LabHooks,
  type LabTab,
  type LabText,
} from '../debug-lab.ts';
import { createFriends } from './lab-friends.ts';
import { createVideoLab } from './lab-video.ts';
import { createScenarios } from './lab-scenarios.ts';
import { createTestRound, ROUND_PREFIX } from './lab-round.ts';
import { both, errorText, say } from './lab-text.ts';
import './test-lab.css';

const TEXT = {
  en: {
    open: 'Test Lab',
    title: 'Test Lab',
    close: 'Close',
    tabs: { status: '📊 Status', friends: '👥 Friends', video: '🎬 Video & network', games: '🎮 Games', scenarios: '🧪 Scenarios', screen: '🖥 Screen', log: '📜 Log' },
    device: 'This device',
    site: 'Site version',
    extension: 'Extension',
    none: 'not installed',
    connection: 'Connection',
    connWs: '🟢 good (live connection)',
    connHttp: '🟡 backup way (the live connection would not open)',
    noRoom: 'not in a room',
    browser: 'Browser',
    screen: 'Screen',
    kind: 'Device',
    kinds: { phone: 'phone layout', 'is-touch': 'touch screen', 'has-mouse': 'mouse', 'is-standalone': 'installed app', sideways: 'sideways' },
    language: 'Language',
    sync: 'Sync',
    drift: 'How far my video is from the room',
    jumps: 'Times my video jumped to catch up',
    people: 'People in the room',
    playing: 'Playing',
    nothing: 'nothing',
    graph: 'My video against the room, last 60 s (middle line = together, ± 1 s)',
    switches: 'Switches',
    tvLab: 'TV version (trial)',
    measure: 'Measure how fast Shorts switch',
    reloadNote: 'Switches work after a reload.',
    reload: '⟳ Reload',
    connTest: '📶 Connection test',
    firstTime: '🌱 Start as a first-time visitor',
    firstAsk: 'Forget my name, avatar, first-time tips, "continue where you left off" and the room names I used in this browser, then reload?',
    errors: 'Recent errors',
    noErrors: 'No errors in this tab. 🎉',
    clear: 'Clear',
    bug: '🐞 This is a bug',
    bugTitle: 'Bug report',
    bugHead: 'Sidelit bug report',
    bugLog: 'Log, last 2 minutes',
    bugConn: 'Connection test',
    bugNote: 'This is exactly the text that will be copied: versions, the room\'s state, errors and the last 2 minutes of the log. No names, browser ids or chat images.',
    copy: '📋 Copy',
    copied: '✓ Copied',
    copyFailed: 'Copy failed: select the text and copy it',
    hide: 'Turn the lab off',
    hideNote: '?debug=0 in the address also turns it off.',
    commands: 'Commands',
    searchPlaceholder: 'Type what you want to do… (Enter runs it)',
    noCommands: 'No commands here yet.',
    soon: 'Comes in a later step of the lab.',
    noMatch: 'No command matches.',
    run: 'Run',
    undo: 'Undo',
    unavailable: 'not now',
    filter: 'Filter',
    pings: 'Show pings',
    pause: 'Pause',
    resume: 'Resume',
    logEmpty: 'Nothing logged yet.',
    ran: 'done',
    failed: 'did not work',
    undone: 'undone',
    noUndo: 'nothing to undo',
    done: 'done',
  },
  tr: {
    open: 'Test Lab',
    title: 'Test Lab',
    close: 'Kapat',
    tabs: { status: '📊 Durum', friends: '👥 Arkadaşlar', video: '🎬 Video ve ağ', games: '🎮 Oyunlar', scenarios: '🧪 Senaryolar', screen: '🖥 Ekran', log: '📜 Kayıt' },
    device: 'Bu cihaz',
    site: 'Site sürümü',
    extension: 'Eklenti',
    none: 'kurulu değil',
    connection: 'Bağlantı',
    connWs: '🟢 iyi (canlı bağlantıyla bağlı)',
    connHttp: '🟡 yedek yolla bağlı (canlı bağlantı açılmadı)',
    noRoom: 'odada değil',
    browser: 'Tarayıcı',
    screen: 'Ekran',
    kind: 'Cihaz',
    kinds: { phone: 'telefon düzeni', 'is-touch': 'dokunmatik ekran', 'has-mouse': 'fare', 'is-standalone': 'yüklü uygulama', sideways: 'yan çevrilmiş' },
    language: 'Dil',
    sync: 'Senkron',
    drift: 'Videomun odadan farkı',
    jumps: 'Videomun yetişmek için atladığı sayı',
    people: 'Odadaki kişi',
    playing: 'Oynayan',
    nothing: 'hiçbir şey',
    graph: 'Videom ile oda, son 60 sn (orta çizgi = birlikte, ± 1 sn)',
    switches: 'Anahtarlar',
    tvLab: 'TV sürümü (deneme)',
    measure: 'Shorts geçiş hızını ölç',
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
    bugHead: 'Sidelit hata raporu (Sidelit bug report)',
    bugLog: 'Kayıt, son 2 dakika (Log, last 2 minutes)',
    bugConn: 'Bağlantı testi (Connection test)',
    bugNote: 'Kopyalanacak yazı tam olarak bu: sürümler, odanın durumu, hatalar ve kaydın son 2 dakikası. Ad, tarayıcı kimliği ya da sohbet resmi yok.',
    copy: '📋 Kopyala',
    copied: '✓ Kopyalandı',
    copyFailed: 'Kopyalanamadı: yazıyı seçip kopyala',
    hide: 'Lab\'ı kapat',
    hideNote: 'Adresteki ?debug=0 de kapatır.',
    commands: 'Komutlar',
    searchPlaceholder: 'Ne yapmak istediğini yaz… (Enter çalıştırır)',
    noCommands: 'Burada henüz komut yok.',
    soon: 'Lab\'ın sonraki bir adımında gelecek.',
    noMatch: 'Eşleşen komut yok.',
    run: 'Çalıştır',
    undo: 'Geri al',
    unavailable: 'şu an olmaz',
    filter: 'Süz',
    pings: 'Bağlantı yoklamalarını da göster',
    pause: 'Durdur',
    resume: 'Devam',
    logEmpty: 'Henüz kayıt yok.',
    ran: 'oldu',
    failed: 'olmadı',
    undone: 'geri alındı',
    noUndo: 'geri alınacak bir şey yok',
    done: 'oldu',
  },
};
type Text = (typeof TEXT)['en'];
const currentText = (): Text => TEXT[lang() === 'tr' ? 'tr' : 'en'];
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
    const result: true | LabText | false = command.available();
    return result === true ? true : say(result || { en: 'not available', tr: 'kullanılamaz' });
  } catch (error) {
    return errorText(error);
  }
}

/** A command's result for the log: a `{ en, tr }` pair in the page's language, anything else as short text. */
function resultText(result: unknown): string {
  if (typeof result === 'string') return result;
  if (result && typeof result === 'object' && typeof (result as { en?: unknown }).en === 'string' && typeof (result as { tr?: unknown }).tr === 'string') return say(result as LabText);
  return redact(result);
}

/** Runs a command so that nothing it does can break the room. Resolves with the line written to the log. */
export async function runCommand(command: LabCommand, arg?: string, mode: 'run' | 'undo' = 'run'): Promise<LogLine> {
  const fn = mode === 'run' ? command.run : command.undo;
  const why = mode === 'run' ? availability(command) : true;
  if (why !== true || !fn) {
    addLog({ dir: 'error', type: command.id, text: why === true ? currentText().noUndo : why });
    return log[log.length - 1]!;
  }
  try {
    const result = await Promise.resolve().then(() => fn(arg));
    addLog({ dir: 'lab', type: command.id, text: `${mode === 'run' ? '▶' : '↶'} ${result === undefined ? (mode === 'run' ? currentText().done : currentText().undone) : resultText(result)}` });
    lastRun = mode === 'run' && command.undo ? { command } : null;
  } catch (error) {
    addLog({ dir: 'error', type: command.id, text: `${mode === 'run' ? '▶' : '↶'} ${errorText(error)}` });
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

function deviceKind(tx: Text): string {
  const root = document.documentElement.classList;
  const parts = (Object.keys(tx.kinds) as (keyof Text['kinds'])[]).filter((name) => root.contains(name)).map((name) => tx.kinds[name]);
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
    [tx.connection, root.swmTransport === 'http' ? tx.connHttp : root.swmTransport === 'ws' ? tx.connWs : tx.noRoom],
    [tx.browser, browserName()],
    [tx.screen, `${innerWidth}×${innerHeight} · ×${Math.round(devicePixelRatio * 100) / 100}`],
    [tx.kind, deviceKind(tx)],
    [tx.language, lang() === 'tr' ? 'Türkçe' : 'English'],
  ];
}

function syncFacts(tx: Text): [string, string][] | null {
  const room = debugRoom();
  if (!room) return null;
  return [
    [tx.drift, room.drift === null ? '—' : `${driftMark(room.drift)} ${Math.round(room.drift * 1000)} ms`],
    [tx.jumps, String(room.jumps)],
    [tx.people, String(room.people)],
    [tx.playing, room.kind ?? tx.nothing],
  ];
}

/** Lower case without accents, Turkish ı / İ as i: what the command box compares. */
export function fold(text: string): string {
  return text.trim().toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
}

/** 🟢 together, 🟡 a little apart (the sync closes it), 🔴 far apart (the sync jumps). */
function driftMark(seconds: number): string {
  const off = Math.abs(seconds);
  return off < 0.25 ? '🟢' : off < 1 ? '🟡' : '🔴';
}

function hookStatus(): [string, string][] {
  const rows: [string, string][] = [];
  for (const { name, hooks: h } of hooks()) {
    if (!h.status) continue;
    try {
      for (const row of h.status()) if (Array.isArray(row) && row.length === 2) rows.push([say(row[0]), say(row[1])]);
    } catch (error) {
      rows.push([name, `status failed: ${String((error as Error)?.message ?? error)}`]);
    }
  }
  return rows;
}

/** The bug text: exactly what "Copy" copies (shown first). */
export function bugText(tx: Text = TEXT.en): string {
  const lines = [tx.bugHead, new Date().toISOString(), `Page: ${location.pathname}`, ''];
  for (const [k, v] of facts(tx)) lines.push(`${k}: ${v}`);
  const sync = syncFacts(tx);
  if (sync) for (const [k, v] of sync) lines.push(`${k}: ${v}`);
  for (const [k, v] of hookStatus()) lines.push(`${k}: ${v}`);
  try {
    const diag = localStorage.getItem('diagLast');
    if (diag) lines.push('', `${tx.bugConn}:`, diag);
  } catch {
    // No storage.
  }
  const errors = debugErrors();
  lines.push('', `${tx.errors} (${errors.length}):`);
  for (const e of errors) lines.push(`${new Date(e.at).toLocaleTimeString()} ${e.msg}${e.where ? ` (${e.where})` : ''}`);
  const since = Date.now() - LOG_MS;
  const recent = log.filter((l) => l.at >= since);
  lines.push('', `${tx.bugLog} (${recent.length}):`);
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

function toggle(label: HTMLElement, on: boolean, change: (on: boolean) => void, id: string): HTMLElement {
  const input = el('input', { type: 'checkbox', class: 'switch', role: 'switch', id });
  input.checked = on;
  input.addEventListener('change', () => change(input.checked));
  return el('label', { class: 'debug-switch', for: id }, label, input);
}

// ---------------------------------------------------------------------------------------------------------------------

export function mountDebugPanel(): void {
  if (document.querySelector('#debug-panel-root')) return;
  let tx = currentText();
  // LABTR: the lab follows the page's language. Fixed labels register here and are set again on `langchange`; lists,
  // status lines and commands are drawn from `tx` / `say` each time anyway.
  const labels: (() => void)[] = [];
  function words<T extends Element>(node: T, text: (t: Text) => string, attr?: string): T {
    const apply = () => {
      if (attr) node.setAttribute(attr, text(tx));
      else node.textContent = text(tx);
    };
    apply();
    labels.push(apply);
    return node;
  }
  setDebugTap((dir, message) => {
    const type = typeOf(message);
    addLog({ dir, type, text: redact(message) });
  });
  addEventListener('swm-debug-error', () => {
    const last = debugErrors()[0];
    if (last) addLog({ dir: 'error', type: 'page', text: `${last.msg}${last.where ? ` (${last.where})` : ''}` });
  });

  const root = el('div', { id: 'debug-panel-root' });
  const fab = words(words(el('button', { type: 'button', class: 'debug-fab', 'aria-expanded': 'false' }, '🐞'), (t) => `${t.open} · Ctrl+Shift+D`, 'title'), (t) => t.open, 'aria-label');
  const panel = words(el('section', { class: 'debug-panel lab-drawer', role: 'dialog' }), (t) => t.title, 'aria-label');
  panel.hidden = true;

  // ---- the lab's own commands ----
  let marks = 0;
  const own: LabCommand[] = [
    { id: 'lab.bug', title: { en: 'Lab: this is a bug', tr: 'Lab: bu bir hata' }, help: { en: 'Shows the text to copy for a bug: versions, the room\'s state, errors and the last 2 minutes of the log.', tr: 'Hata için kopyalanacak yazıyı gösterir: sürümler, odanın durumu, hatalar ve kaydın son 2 dakikası.' }, tab: 'status', run: () => openBug() },
    { id: 'lab.mark', title: { en: 'Lab: put a marker in the log', tr: 'Lab: kayda bir işaret koy' }, help: { en: 'A line "— mark N —" in the log, to find this moment later. Undo removes it.', tr: 'Kayda "— mark N —" satırı düşer, bu anı sonra bulmak için. Geri al siler.' }, tab: 'log', run: () => { marks++; addLog({ dir: 'lab', type: 'mark', text: `— mark ${marks} —` }); return `mark ${marks}`; }, undo: () => { let i = log.length - 1; while (i >= 0 && log[i]!.type !== 'mark') i--; if (i >= 0) log.splice(i, 1); for (const fn of logListeners) fn(); } },
    { id: 'lab.clearLog', title: { en: 'Lab: clear the log', tr: 'Lab: kaydı temizle' }, help: { en: 'Empties the lab\'s log. The room is not touched.', tr: 'Lab\'ın kaydını boşaltır. Odaya dokunmaz.' }, tab: 'log', run: () => { log.length = 0; for (const fn of logListeners) fn(); } },
    { id: 'lab.clearErrors', title: { en: 'Lab: clear the errors', tr: 'Lab: hataları temizle' }, help: { en: 'Empties the list of recent errors; 🐞 turns back to normal.', tr: 'Son hatalar listesini boşaltır; 🐞 normale döner.' }, tab: 'status', run: () => { clearDebugErrors(); fab.classList.remove('has-error'); draw(); } },
    { id: 'lab.selfTest', title: { en: 'Lab: self-test (a command that fails)', tr: 'Lab: kendini dene (bozuk bir komut)' }, help: { en: 'Runs a command that fails on purpose: you see a red line in the log and the room keeps working.', tr: 'Bilerek bozulan bir komut çalışır: kayıtta kırmızı bir satır görürsün, oda çalışmaya devam eder.' }, tab: 'log', run: () => { throw labFail({ en: 'self-test: this error is expected', tr: 'kendini deneme: bu hata bekleniyor' }); } },
    { id: 'lab.reload', title: { en: 'Lab: reload the page', tr: 'Lab: sayfayı yenile' }, help: { en: 'Reloads this tab; the lab stays on.', tr: 'Bu sekmeyi yeniler; lab açık kalır.' }, tab: 'status', run: () => location.reload() },
    { id: 'lab.firstVisit', title: { en: 'Lab: start as a first-time visitor', tr: 'Lab: ilk kez gelen biri gibi başla' }, help: { en: 'Forgets my name, avatar, tips and room names in this browser (never the browser id), then reloads.', tr: 'Bu tarayıcıdaki adımı, avatarımı, ipuçlarını ve oda adlarını unutur (tarayıcı kimliğini asla), sonra yeniler.' }, tab: 'screen', run: () => { if (confirm(tx.firstAsk)) { forgetVisits(); location.reload(); } } },
    { id: 'lab.off', title: { en: 'Lab: turn the lab off', tr: 'Lab: lab\'ı kapat' }, help: { en: 'Removes the lab from this tab (same as ?debug=0).', tr: 'Lab\'ı bu sekmeden kaldırır (?debug=0 ile aynı).' }, tab: 'status', run: () => turnOff() },
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
    status: () => (friends.count() ? [[{ en: 'Fake friends', tr: 'Sahte arkadaşlar' }, String(friends.count())]] : []),
  }));
  // 🎬 Video & network (DL4): accidents on this tab's own connection and player.
  const video = createVideoLab();
  const unregisterVideo = debugHooks.register('video', () => ({ commands: video.commands, status: video.status }));
  // 🧪 Scenarios (DL5): scripted two-person checks with the fake friends.
  const scenarios = createScenarios(friends, runById);
  const unregisterScenarios = debugHooks.register('scenarios', () => ({ commands: scenarios.commands }));
  // 🧪 Test round (LAB2): one command per test on the owner's board.
  const round = createTestRound(friends);
  const unregisterRound = debugHooks.register('round', () => ({ commands: round.commands }));

  // ---- head, tabs, body, foot ----
  const closeButton = words(el('button', { type: 'button', class: 'icon-btn debug-close' }, '✕'), (t) => t.close, 'aria-label');
  const tabBar = el('div', { class: 'lab-tabs', role: 'tablist' });
  const tabButtons = new Map<LabTab, HTMLButtonElement>();
  for (const tab of TABS) {
    const b = words(el('button', { type: 'button', role: 'tab', class: 'lab-tab', 'data-tab': tab, 'aria-selected': 'false' }), (t) => t.tabs[tab]);
    b.addEventListener('click', () => show(tab));
    tabButtons.set(tab, b);
    tabBar.append(b);
  }
  const body = el('div', { class: 'debug-body lab-body', role: 'tabpanel' });
  const bugButton = words(el('button', { type: 'button', class: 'btn primary debug-copy lab-bug' }), (t) => t.bug);
  const offButton = words(el('button', { type: 'button', class: 'btn debug-small debug-off' }), (t) => t.hide);
  const cmdButton = el('button', { type: 'button', class: 'btn debug-small lab-cmd-open', title: 'Ctrl+K' }, '⌘ Ctrl+K');
  panel.append(
    el('header', { class: 'debug-head' }, words(el('h3', {}), (t) => `🐞 ${t.title}`), cmdButton, closeButton),
    tabBar,
    body,
    el('footer', { class: 'debug-foot' }, bugButton, offButton, words(el('p', { class: 'muted small' }), (t) => t.hideNote)),
  );

  // ---- Status tab ----
  const deviceBox = el('div');
  const syncBox = el('div');
  const hookBox = el('div');
  const graph = words(el('canvas', { class: 'lab-graph', width: '320', height: '64' }), (t) => t.graph, 'aria-label');
  const errorBox = el('ul', { class: 'debug-errors' });
  const errorTitle = el('h4', {});
  const clearButton = words(el('button', { type: 'button', class: 'btn debug-small debug-clear' }), (t) => t.clear);
  const reloadButton = words(el('button', { type: 'button', class: 'btn debug-small debug-reload' }), (t) => t.reload);
  const firstButton = words(el('button', { type: 'button', class: 'btn debug-small debug-first' }), (t) => t.firstTime);
  const room = roomIdInPath();
  const connLink = words(el('a', { class: 'btn debug-small debug-conn', href: `/connection${room ? `?room=${encodeURIComponent(room)}` : ''}` }), (t) => t.connTest);
  const statusView = el('div', { class: 'lab-view', 'data-view': 'status' },
    words(el('h4', {}), (t) => t.device),
    deviceBox,
    syncBox,
    hookBox,
    words(el('h4', {}), (t) => t.graph),
    graph,
    words(el('h4', {}), (t) => t.switches),
    toggle(words(el('span', {}), (t) => t.tvLab), load('opt:tvLab') === '1', (on) => save('opt:tvLab', on ? '1' : '0'), 'debug-tvlab'),
    toggle(words(el('span', {}), (t) => t.measure), measureOn(), setMeasure, 'debug-measure'),
    words(el('p', { class: 'muted small' }), (t) => t.reloadNote),
    el('div', { class: 'debug-actions' }, reloadButton, connLink, firstButton),
    el('div', { class: 'debug-errors-head' }, errorTitle, clearButton),
    errorBox,
  );

  // ---- Log tab ----
  let paused = false;
  const filterInput = words(words(el('input', { type: 'search', class: 'lab-filter' }), (t) => t.filter, 'placeholder'), (t) => t.filter, 'aria-label');
  const pingsBox = el('input', { type: 'checkbox', id: 'lab-pings' });
  const pauseButton = words(el('button', { type: 'button', class: 'btn debug-small lab-pause' }), (t) => (paused ? t.resume : t.pause));
  const logList = el('ol', { class: 'lab-log' });
  const logView = el('div', { class: 'lab-view', 'data-view': 'log' },
    el('div', { class: 'lab-log-tools' }, filterInput, el('label', { class: 'lab-check', for: 'lab-pings' }, pingsBox, words(el('span', {}), (t) => t.pings)), pauseButton),
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
      el('div', { class: 'lab-command-text' }, el('strong', {}, say(command.title)), el('small', {}, say(command.help)), command.where || why !== true ? el('span', { class: 'lab-tag' }, why === true ? say(command.where) : `${tx.unavailable}: ${why}`) : null),
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
      undoBar.replaceChildren(el('span', {}, `${say(command.title)}: ${back.dir === 'error' ? `${tx.failed}: ${back.text}` : tx.undone}`));
      draw();
    });
    undoBar.replaceChildren(el('span', {}, `${say(command.title)}: ${failedRun ? `${tx.failed}: ${line.text}` : tx.ran}`), ...(undoButton ? [undoButton] : []));
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
            : tab === 'scenarios'
              ? el('div', { class: 'lab-view', 'data-view': 'scenarios' }, scenarios.view((id) => {
                  const c = allCommands().find((x) => x.id === id);
                  if (c) void runAndShow(c);
                }), el('h4', { class: 'lab-round-head' }, say({ en: '🧪 Test round: one per test on the board', tr: '🧪 Test turu: panodaki her test için bir tane' })), el('ul', { class: 'lab-commands lab-round' }, ...allCommands().filter((c) => c.id.startsWith(ROUND_PREFIX)).map(commandRow)))
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
  const cmdBox = words(el('div', { class: 'lab-cmdbox', role: 'dialog', hidden: '' }), (t) => t.commands, 'aria-label');
  const cmdInput = words(words(el('input', { type: 'text', class: 'lab-cmd-input', autocomplete: 'off', spellcheck: 'false' }), (t) => t.searchPlaceholder, 'placeholder'), (t) => t.searchPlaceholder, 'aria-label');
  const cmdList = el('ul', { class: 'lab-cmd-list', role: 'listbox' });
  cmdBox.append(cmdInput, cmdList);
  let picked = 0;
  let matches: LabCommand[] = [];
  function drawCmds(): void {
    const words = fold(cmdInput.value).split(/\s+/).filter(Boolean);
    // LABTR: both languages, so "drop", "kopar" and "baglanti" find net.drop on any page.
    matches = allCommands().filter((c) => {
      const hay = fold(`${c.id} ${both(c.title)} ${both(c.help)}`);
      return words.every((w) => hay.includes(w));
    });
    picked = Math.min(picked, Math.max(0, matches.length - 1));
    cmdList.replaceChildren(
      ...(matches.length
        ? matches.map((c, i) => {
            const why = availability(c);
            const item = el('li', { role: 'option', class: `lab-cmd-item${i === picked ? ' picked' : ''}${why === true ? '' : ' off'}`, 'aria-selected': String(i === picked), 'data-command': c.id },
              el('strong', {}, say(c.title)), el('small', {}, why === true ? say(c.help) : `${tx.unavailable}: ${why}`));
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
  const bugBox = words(el('div', { class: 'lab-bug-box', role: 'dialog', hidden: '' }), (t) => t.bugTitle, 'aria-label');
  const bugArea = words(el('textarea', { class: 'lab-bug-text', readonly: '', spellcheck: 'false' }), (t) => t.bugTitle, 'aria-label');
  const bugCopy = el('button', { type: 'button', class: 'btn primary lab-bug-copy' }, tx.copy);
  const bugClose = words(el('button', { type: 'button', class: 'icon-btn lab-bug-close' }, '✕'), (t) => t.close, 'aria-label');
  bugBox.append(el('header', { class: 'debug-head' }, words(el('h3', {}), (t) => t.bugTitle), bugClose), words(el('p', { class: 'muted small' }), (t) => t.bugNote), bugArea, el('div', { class: 'debug-actions' }, bugCopy));
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
  const offScenarios = scenarios.onChange(() => {
    if (!panel.hidden && current === 'scenarios') show('scenarios');
  });
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
  const onLang = () => {
    tx = currentText();
    for (const apply of labels) apply();
    if (!panel.hidden) show(current);
    if (!cmdBox.hidden) drawCmds();
  };
  addEventListener('langchange', onLang);
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
    offScenarios();
    unregisterScenarios();
    round.close();
    unregisterRound();
    clearInterval(timer);
    clearInterval(sampler);
    sampler = 0;
    setDebugTap(null);
    logListeners.delete(onLog);
    offHooks();
    unregisterOwn();
    document.removeEventListener('keydown', onKey, true);
    removeEventListener('langchange', onLang);
    document.removeEventListener('fullscreenchange', onFullscreen);
    document.documentElement.classList.remove('lab-open');
    // The harness / console handle exists only while the lab is on.
    delete (window as unknown as { __swmLab?: unknown }).__swmLab;
    debugOff();
  }
  offButton.addEventListener('click', turnOff);
  // For the lab's harness (and the owner's console): the same safe paths as the buttons.
  (window as unknown as { __swmLab?: unknown }).__swmLab = { run: (id: string, arg?: string) => { const c = allCommands().find((x) => x.id === id); return c ? runCommand(c, arg) : Promise.reject(new Error(`no command ${id}`)); }, undo: (id: string) => { const c = allCommands().find((x) => x.id === id); return c ? runCommand(c, undefined, 'undo') : Promise.reject(new Error(`no command ${id}`)); }, list: () => allCommands().map((c) => ({ id: c.id, tab: c.tab, title: say(c.title), help: say(c.help), where: c.where ? say(c.where) : null, available: availability(c), undo: !!c.undo })), log: () => log.slice(), bugText: () => bugText(tx), status: () => hookStatus(), sync: () => { const r = debugRoom(); return r ? { drift: r.drift, jumps: r.jumps } : null; } };
}
