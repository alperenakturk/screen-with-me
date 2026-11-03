// Hidden test panel (card 12): the owner tests from his phone without a computer, so the useful facts and switches
// sit in one panel. Only loads in a tab where `?debug=1` switched it on (debug-lab.ts). It never shows names, the
// browser id or chat; the copied report holds versions, the device, the connection, sync numbers and errors.
import { el } from '../dom.ts';
import { lang } from '../i18n.ts';
import { load, save } from '../storage.ts';
import { clearDebugErrors, debugErrors, debugOff, debugRoom } from '../debug-lab.ts';
import './debug-panel.css';

const TEXT = {
  en: {
    open: 'Test panel',
    title: 'Test panel',
    close: 'Close',
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
    copy: '📋 Copy report',
    copied: '✓ Copied',
    copyFailed: 'Copy failed',
    hide: 'Turn the panel off',
    hideNote: '`?debug=0` also turns it off.',
  },
  tr: {
    open: 'Test paneli',
    title: 'Test paneli',
    close: 'Kapat',
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
    copy: '📋 Raporu kopyala',
    copied: '✓ Kopyalandı',
    copyFailed: 'Kopyalanamadı',
    hide: 'Paneli kapat',
    hideNote: '`?debug=0` de kapatır.',
  },
};

type Text = (typeof TEXT)['en'];

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

function report(tx: Text): string {
  const lines = ['Sidelit test report', new Date().toISOString(), ''];
  for (const [k, v] of facts(tx)) lines.push(`${k}: ${v}`);
  const sync = syncFacts(tx);
  if (sync) for (const [k, v] of sync) lines.push(`${k}: ${v}`);
  try {
    const diag = localStorage.getItem('diagLast');
    if (diag) lines.push('', 'Connection test:', diag);
  } catch {
    // No storage.
  }
  const errors = debugErrors();
  lines.push('', `${tx.errors} (${errors.length}):`);
  for (const e of errors) lines.push(`${new Date(e.at).toLocaleTimeString()} ${e.msg}${e.where ? ` (${e.where})` : ''}`);
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
    for (const key of Object.keys(sessionStorage)) if (key.startsWith('in:') || key.startsWith('tab:')) sessionStorage.removeItem(key);
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

export function mountDebugPanel(): void {
  if (document.querySelector('#debug-panel-root')) return;
  const tx = TEXT[lang() === 'tr' ? 'tr' : 'en'];
  const root = el('div', { id: 'debug-panel-root' });
  const fab = el('button', { type: 'button', class: 'debug-fab', title: tx.open, 'aria-label': tx.open, 'aria-expanded': 'false' }, '🐞');
  const panel = el('section', { class: 'debug-panel', role: 'dialog', 'aria-label': tx.title });
  panel.hidden = true;
  const deviceBox = el('div');
  const syncBox = el('div');
  const errorBox = el('ul', { class: 'debug-errors' });
  const errorTitle = el('h4', {});

  function draw(): void {
    deviceBox.replaceChildren(table(facts(tx)));
    const sync = syncFacts(tx);
    syncBox.hidden = !sync;
    if (sync) syncBox.replaceChildren(el('h4', {}, tx.sync), table(sync));
    const errors = debugErrors();
    errorTitle.textContent = `${tx.errors} (${errors.length})`;
    errorBox.replaceChildren(
      ...(errors.length
        ? errors.map((e) => el('li', {}, el('time', {}, new Date(e.at).toLocaleTimeString()), ` ${e.msg}`, e.where ? el('small', {}, ` ${e.where}`) : null))
        : [el('li', { class: 'muted' }, tx.noErrors)]),
    );
  }

  const closeButton = el('button', { type: 'button', class: 'icon-btn debug-close', 'aria-label': tx.close }, '✕');
  const copyButton = el('button', { type: 'button', class: 'btn primary debug-copy' }, tx.copy);
  const clearButton = el('button', { type: 'button', class: 'btn debug-small debug-clear' }, tx.clear);
  const reloadButton = el('button', { type: 'button', class: 'btn debug-small debug-reload' }, tx.reload);
  const firstButton = el('button', { type: 'button', class: 'btn debug-small debug-first' }, tx.firstTime);
  const offButton = el('button', { type: 'button', class: 'btn debug-small debug-off' }, tx.hide);
  const room = roomIdInPath();
  const connLink = el('a', { class: 'btn debug-small debug-conn', href: `/baglanti${room ? `?room=${encodeURIComponent(room)}` : ''}` }, tx.connTest);

  panel.append(
    el('header', { class: 'debug-head' }, el('h3', {}, `🐞 ${tx.title}`), closeButton),
    el('div', { class: 'debug-body' },
      el('h4', {}, tx.device),
      deviceBox,
      syncBox,
      el('h4', {}, tx.switches),
      toggle(tx.tvLab, load('opt:tvLab') === '1', (on) => save('opt:tvLab', on ? '1' : '0'), 'debug-tvlab'),
      toggle(tx.measure, measureOn(), setMeasure, 'debug-measure'),
      el('p', { class: 'muted small' }, tx.reloadNote),
      el('div', { class: 'debug-actions' }, reloadButton, connLink, firstButton),
      el('div', { class: 'debug-errors-head' }, errorTitle, clearButton),
      errorBox,
    ),
    el('footer', { class: 'debug-foot' }, copyButton, offButton, el('p', { class: 'muted small' }, tx.hideNote)),
  );
  root.append(panel, fab);
  document.body.append(root);

  let timer = 0;
  function setOpen(open: boolean): void {
    panel.hidden = !open;
    fab.setAttribute('aria-expanded', String(open));
    clearInterval(timer);
    if (open) {
      draw();
      timer = window.setInterval(draw, 1000);
    }
  }
  fab.addEventListener('click', () => setOpen(fab.getAttribute('aria-expanded') !== 'true'));
  closeButton.addEventListener('click', () => setOpen(false));
  // Esc closes the panel first (capture phase: the room's own Esc handlers never see this one).
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && fab.getAttribute('aria-expanded') === 'true') {
      event.stopPropagation();
      setOpen(false);
      fab.focus();
    }
  }, true);
  addEventListener('swm-debug-error', () => {
    fab.classList.add('has-error');
    if (!panel.hidden) draw();
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
  offButton.addEventListener('click', () => {
    clearInterval(timer);
    debugOff();
  });
  copyButton.addEventListener('click', () => {
    const done = (ok: boolean) => {
      copyButton.textContent = ok ? tx.copied : tx.copyFailed;
      setTimeout(() => (copyButton.textContent = tx.copy), 1800);
    };
    if (!navigator.clipboard) return done(false);
    navigator.clipboard.writeText(report(tx)).then(
      () => done(true),
      () => done(false),
    );
  });
}
