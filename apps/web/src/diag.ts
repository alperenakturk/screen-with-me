// Connection test (/baglanti): someone who says "the room stays on Bağlanıyor…" opens this page and sends a screenshot
// or the copied text. It measures how the page arrived (HTTP/3 = UDP, HTTP/2 = TCP), a plain request, a larger
// download, a tiny WebSocket (probe), the room's live connection (WebSocket: open, welcome, ping) and the HTTP fallback
// (0.9.92, the same room over plain requests). Together they tell the likely cause apart
// (`docs/internal/hotspot-connection.md` "Telling the causes apart"). Nothing is stored.

import { PROTOCOL_VERSION } from '@swm/shared/protocol';
import { newRoomId } from '@swm/shared/room-id';
import { ROOM_ID_PATTERN } from '@swm/shared/protocol';
import { HttpSocket, openSocket, type SwmSocket } from '@swm/shared/socket';
import { el } from './dom.ts';
import { t } from './i18n.ts';

interface Row {
  label: string;
  ok: boolean | null;
  detail: string;
}

const TIMEOUT_MS = 10_000;
const BIG_BYTES = 200_000;

/** Opened from a room's "can't reach the room" note (0.9.92.8, owner): the way back to that room comes first. */
function backButtons(): HTMLElement[] {
  const room = new URLSearchParams(location.search).get('room') ?? '';
  const again = el('button', { type: 'button', class: 'btn' }, `⟳ ${t('diag.again')}`);
  again.addEventListener('click', () => location.reload());
  if (ROOM_ID_PATTERN.test(room)) return [el('a', { class: 'btn primary', href: `/r/${room}#back` }, `← ${t('diag.backRoom')}`), again];
  return [el('a', { class: 'btn primary', href: '/' }, t('diag.home')), again];
}

export function renderDiag(app: HTMLElement): void {
  const list = el('ul', { class: 'diag-list' });
  const copy = el('button', { type: 'button', class: 'btn', disabled: '' }, t('diag.copy'));
  const verdict = el('p', { class: 'diag-verdict' });
  app.replaceChildren(
    el(
      'section',
      { class: 'card diag' },
      el('h1', {}, t('diag.title')),
      el('p', { class: 'muted' }, t('diag.intro')),
      list,
      verdict,
      el('div', { class: 'row' }, ...backButtons(), copy),
    ),
  );
  const rows: Row[] = [];
  const draw = () =>
    list.replaceChildren(
      ...rows.map((row) =>
        el('li', { class: 'diag-row' }, el('span', { class: 'diag-icon' }, row.ok === null ? '⏳' : row.ok ? '✅' : '❌'), el('b', {}, row.label), el('span', { class: 'muted' }, row.detail)),
      ),
    );
  const add = (label: string): Row => {
    const row: Row = { label, ok: null, detail: '' };
    rows.push(row);
    draw();
    return row;
  };
  const done = (row: Row, ok: boolean, detail: string) => {
    row.ok = ok;
    row.detail = detail;
    draw();
  };
  const ms = (since: number) => `${Math.round(performance.now() - since)} ms`;
  const protocolOf = (url: string) => (performance.getEntriesByName(url).at(-1) as PerformanceResourceTiming | undefined)?.nextHopProtocol || '?';

  void (async () => {
    // 1) How the page came: h3 (HTTP/3, UDP) or h2 / http/1.1 (TCP). WebSockets always use a new TCP connection.
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const pageProtocol = nav?.nextHopProtocol || '?';
    done(add(t('diag.page')), true, pageProtocol);

    // 2) A plain request to the server (the room's info).
    const http = add(t('diag.http'));
    const id = `diag${newRoomId().slice(0, 8)}`;
    let start = performance.now();
    try {
      const response = await fetch(`/api/rooms/${id}/info`, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
      done(http, response.ok, `${response.status} · ${ms(start)} · ${protocolOf(response.url)}`);
    } catch (error) {
      done(http, false, String((error as Error).name || error));
    }

    // 3) A larger answer (many full-size packets): hangs where big packets get lost (MTU problems on tethering).
    const big = add(t('diag.big'));
    start = performance.now();
    try {
      const response = await fetch(`/api/probe?bytes=${BIG_BYTES}`, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
      const size = (await response.text()).length;
      done(big, response.ok && size === BIG_BYTES, `${Math.round(size / 1000)} kB · ${ms(start)} · ${protocolOf(response.url)}`);
    } catch (error) {
      done(big, false, String((error as Error).name || error));
    }

    // 4) A tiny WebSocket that only says "ok" (no room behind it).
    const probe = add(t('diag.probe'));
    start = performance.now();
    const probeOk = await new Promise<boolean>((resolve) => {
      const ws = new WebSocket(`${location.origin.replace(/^http/, 'ws')}/api/probe`);
      const timer = setTimeout(() => {
        done(probe, false, t('diag.timeout', { s: TIMEOUT_MS / 1000 }));
        ws.close();
        resolve(false);
      }, TIMEOUT_MS);
      ws.addEventListener('message', () => {
        clearTimeout(timer);
        done(probe, true, ms(start));
        ws.send('bye');
        resolve(true);
      });
      ws.addEventListener('close', (event) => {
        if (probe.ok !== null) return;
        clearTimeout(timer);
        done(probe, false, `${t('diag.closed')} (${event.code})`);
        resolve(false);
      });
    });

    // 5) The room's live connection over a WebSocket, 6) the same over the HTTP fallback.
    const wsRows = { open: add(t('diag.ws')), welcome: add(t('diag.welcome')), ping: add(t('diag.ping')) };
    const wsOk = await roomTest(openSocket(`${location.origin.replace(/^http/, 'ws')}/api/rooms/${id}/ws`, { force: 'ws', wsOpenMs: TIMEOUT_MS + 1000 }), wsRows);
    const fbRows = { open: add(t('diag.fallback')), welcome: add(t('diag.fallbackWelcome')), ping: add(t('diag.fallbackPing')) };
    const fallbackOk = await roomTest(new HttpSocket(`${location.origin.replace(/^http/, 'ws')}/api/rooms/${id}/ws`), fbRows);

    const verdictKey = wsOk ? 'diag.allGood' : fallbackOk ? 'diag.fallbackGood' : http.ok ? 'diag.blocked' : 'diag.noServer';
    verdict.textContent = t(verdictKey);
    verdict.classList.toggle('bad', !wsOk && !fallbackOk);
    const net = (navigator as Navigator & { connection?: { effectiveType?: string; type?: string } }).connection;
    const summary = [
      `Sidelit ${t('diag.title')} · ${new Date().toISOString()} · ${document.querySelector('.footer-version')?.textContent?.trim() ?? ''}`,
      ...rows.map((row) => `${row.ok ? 'OK ' : 'ERR'} ${row.label}: ${row.detail}`),
      // The page's own entry is often empty (served via the service worker): any HTTP/3 request on the page counts.
      `guess: ${guess(pageProtocol === 'h3' || performance.getEntries().some((e) => (e as PerformanceResourceTiming).nextHopProtocol === 'h3') ? 'h3' : pageProtocol, http.ok === true, big.ok === true, probeOk, wsOk, fallbackOk)}`,
      `net: ${net?.effectiveType ?? '?'}/${net?.type ?? '?'} · ${navigator.userAgent}`,
    ].join('\n');
    copy.removeAttribute('disabled');
    copy.onclick = () => {
      void navigator.clipboard?.writeText(summary).then(() => (copy.textContent = t('copied')));
    };
  })();

  /** Opens, says hello, waits for the welcome, measures one ping; closes. True when all three worked. */
  function roomTest(socket: SwmSocket, row: { open: Row; welcome: Row; ping: Row }): Promise<boolean> {
    return new Promise((resolve) => {
      const start = performance.now();
      let pingAt = 0;
      let settled = false;
      const end = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        for (const r of [row.open, row.welcome, row.ping]) if (r.ok === null) done(r, false, '—');
        try {
          socket.close();
        } catch {
          // Never opened.
        }
        resolve(ok);
      };
      const timer = setTimeout(() => {
        if (row.open.ok === null) done(row.open, false, t('diag.timeout', { s: TIMEOUT_MS / 1000 }));
        end(false);
      }, TIMEOUT_MS);
      socket.addEventListener('open', () => {
        done(row.open, true, ms(start));
        socket.send(JSON.stringify({ t: 'hello', v: PROTOCOL_VERSION, name: 'Test' }));
      });
      socket.addEventListener('message', (event) => {
        let message: { t?: string };
        try {
          message = JSON.parse(event.data) as { t?: string };
        } catch {
          return;
        }
        if (message.t === 'welcome') {
          done(row.welcome, true, ms(start));
          pingAt = performance.now();
          socket.send(JSON.stringify({ t: 'ping', c: Date.now() }));
        } else if (message.t === 'pong' && pingAt) {
          done(row.ping, true, ms(pingAt));
          end(true);
        }
      });
      socket.addEventListener('close', (event) => {
        if (settled) return;
        if (row.open.ok === null) done(row.open, false, `${t('diag.closed')} (${event.code})`);
        end(false);
      });
    });
  }
}

/** A short English guess for the copied text (the owner pastes it; `hotspot-connection.md` explains the cases). */
function guess(page: string, http: boolean, big: boolean, probe: boolean, ws: boolean, fallback: boolean): string {
  if (ws) return 'websocket ok';
  if (!http) return 'server unreachable (no internet, or the address is filtered)';
  if (!fallback) return 'plain requests work but the room does not answer over either way (server problem?)';
  if (!probe && page === 'h3') return 'page over HTTP/3 (UDP), every WebSocket (TCP) hangs: TCP path broken (MTU/MSS black hole or TCP filtering on the tether); fallback used';
  if (!probe) return `WebSockets do not open (${page}): upgrade blocked by a proxy/filter or TCP path broken; fallback used`;
  if (!big) return 'small WebSocket ok, big answers lost: MTU black hole likely; fallback used';
  return 'tiny WebSocket opens but the room one does not: intermittent; fallback used';
}
