// Bağlantı testi (/baglanti): "odada Bağlanıyor…'da kalıyorum" diyen biri bu sayfayı açar, sonuç ekranının görüntüsünü
// ya da kopyaladığı metni yollar. Sayfa nasıl geldi (HTTP/3 = UDP mi, HTTP/2 = TCP mi), sunucuya düz istek gidiyor mu,
// odanın canlı bağlantısı (WebSocket) açılıyor mu, sunucu cevap veriyor mu ölçülür. Hiçbir şey kaydedilmez.

import { PROTOCOL_VERSION } from '@swm/shared/protocol';
import { newRoomId } from '@swm/shared/room-id';
import { el } from './dom.ts';
import { t } from './i18n.ts';

interface Row {
  label: string;
  ok: boolean | null;
  detail: string;
}

const TIMEOUT_MS = 10_000;

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
      el('div', { class: 'row' }, copy, el('a', { class: 'btn primary', href: '/' }, t('diag.home'))),
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

  void (async () => {
    // 1) Sayfa hangi yoldan geldi: h3 (HTTP/3, UDP) ya da h2/http/1.1 (TCP). Oda bağlantısı her zaman TCP'dir.
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const pageProtocol = nav?.nextHopProtocol || '?';
    done(add(t('diag.page')), true, pageProtocol);

    // 2) Sunucuya düz istek (odanın bilgisi).
    const http = add(t('diag.http'));
    const id = `diag${newRoomId().slice(0, 8)}`;
    const httpStart = performance.now();
    try {
      const response = await fetch(`/api/rooms/${id}/info`, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
      const entry = performance.getEntriesByName(response.url).at(-1) as PerformanceResourceTiming | undefined;
      done(http, response.ok, `${response.status} · ${Math.round(performance.now() - httpStart)} ms · ${entry?.nextHopProtocol || '?'}`);
    } catch (error) {
      done(http, false, String((error as Error).name || error));
    }

    // 3) Odanın canlı bağlantısı: açılıyor mu, sunucu "hoş geldin" diyor mu, ping'e cevap geliyor mu.
    const open = add(t('diag.ws'));
    const welcome = add(t('diag.welcome'));
    const ping = add(t('diag.ping'));
    const wsStart = performance.now();
    const ws = new WebSocket(`${location.origin.replace(/^http/, 'ws')}/api/rooms/${id}/ws`);
    const finish = (row: Row, ok: boolean, detail: string) => row.ok === null && done(row, ok, detail);
    const timer = setTimeout(() => {
      finish(open, false, t('diag.timeout', { s: TIMEOUT_MS / 1000 }));
      finish(welcome, false, '—');
      finish(ping, false, '—');
      ws.close();
      conclude();
    }, TIMEOUT_MS);
    let pingAt = 0;
    ws.addEventListener('open', () => {
      done(open, true, `${Math.round(performance.now() - wsStart)} ms`);
      ws.send(JSON.stringify({ t: 'hello', v: PROTOCOL_VERSION, name: 'Test' }));
    });
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as { t: string };
      if (message.t === 'welcome') {
        done(welcome, true, `${Math.round(performance.now() - wsStart)} ms`);
        pingAt = performance.now();
        ws.send(JSON.stringify({ t: 'ping', c: Date.now() }));
      } else if (message.t === 'pong' && pingAt) {
        done(ping, true, `${Math.round(performance.now() - pingAt)} ms`);
        clearTimeout(timer);
        ws.close();
        conclude();
      }
    });
    ws.addEventListener('close', (event) => {
      if (open.ok === null) {
        clearTimeout(timer);
        finish(open, false, `${t('diag.closed')} (${event.code})`);
        finish(welcome, false, '—');
        finish(ping, false, '—');
        conclude();
      }
    });

    function conclude(): void {
      const wsOk = open.ok === true && ping.ok === true;
      verdict.textContent = wsOk ? t('diag.allGood') : http.ok ? t('diag.blocked') : t('diag.noServer');
      verdict.classList.toggle('bad', !wsOk);
      const net = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType;
      const summary = [
        `ScreenWithMe ${t('diag.title')} · ${new Date().toISOString()}`,
        ...rows.map((row) => `${row.ok ? 'OK ' : 'ERR'} ${row.label}: ${row.detail}`),
        `net: ${net ?? '?'} · ${navigator.userAgent}`,
      ].join('\n');
      copy.removeAttribute('disabled');
      copy.onclick = () => {
        void navigator.clipboard?.writeText(summary).then(() => (copy.textContent = t('copied')));
      };
    }
  })();
}
