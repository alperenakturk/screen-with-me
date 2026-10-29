// Odanın içindeki Çiz-Bil (oyun sahnesinde): tuval, kalem araçları (sadece çizende), tahmin kutusu ve akış,
// oyuncular ve puanlar. Sunucu (Draw nesnesi) turları yürütür; burası gelen durumu çizer, çizeni dinler.
// Çizim 1000×750'lik ızgarada tam sayı noktalar olarak, 50 ms'de bir parça parça gider.

import {
  DRAW_CHOOSE_MS,
  DRAW_COLORS,
  DRAW_H,
  DRAW_MAX_PLAYERS,
  DRAW_PROTOCOL_VERSION,
  DRAW_REVEAL_MS,
  DRAW_ROUND_MS,
  DRAW_SIZES,
  DRAW_W,
  STROKE_MAX_POINTS,
  type DrawClientMessage,
  type DrawServerMessage,
  type Stroke,
} from '@swm/shared/games/draw';
import type { Avatar } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { t, translate } from '../i18n.ts';
import { clientId } from '../storage.ts';
import { avatarNode } from '../ui/avatar.ts';
import { playSound } from '../sound.ts';

type State = Extract<DrawServerMessage, { t: 'state' }>;

/** Oyunu `app`'in içine kurar; dönen işlev bağlantıyı ve zamanlayıcıları kapatır. */
export function mountDraw(app: HTMLElement, gameId: string, name: string, avatar: Avatar): () => void {
  app.innerHTML = `
    <div class="xox-page draw-page">
      <div class="draw-main">
        <div class="draw-left">
          <div class="draw-top">
            <span id="draw-round" class="muted small"></span>
            <b id="draw-hint" class="draw-hint" aria-live="polite"></b>
            <span id="draw-timer" class="draw-timer"></span>
          </div>
          <div class="draw-bar" aria-hidden="true"><i id="draw-time"></i></div>
          <div class="draw-canvas-wrap">
            <canvas id="draw-canvas" width="${DRAW_W}" height="${DRAW_H}"></canvas>
            <div id="draw-overlay" class="draw-overlay" hidden></div>
          </div>
          <div id="draw-tools" class="draw-tools" hidden></div>
        </div>
        <aside class="card draw-side">
          <ul id="draw-players" class="draw-players"></ul>
          <div id="draw-feed" class="draw-feed" aria-live="polite"></div>
          <form id="draw-form" class="row draw-form">
            <input id="draw-input" maxlength="40" autocomplete="off" />
            <button class="btn primary" data-i18n="draw.send"></button>
          </form>
        </aside>
      </div>
    </div>`;
  translate(app);
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => app.querySelector<T>(sel)!;

  // ---- Tuval ----
  const canvas = $<HTMLCanvasElement>('#draw-canvas');
  const ctx = canvas.getContext('2d')!;
  const clearCanvas = () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, DRAW_W, DRAW_H);
  };
  clearCanvas();
  function paint(s: Stroke): void {
    ctx.strokeStyle = ctx.fillStyle = DRAW_COLORS[s.c] ?? '#000';
    const width = DRAW_SIZES[s.w] ?? 4;
    if (s.p.length === 2) {
      ctx.beginPath();
      ctx.arc(s.p[0]!, s.p[1]!, width / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(s.p[0]!, s.p[1]!);
    for (let i = 2; i < s.p.length; i += 2) ctx.lineTo(s.p[i]!, s.p[i + 1]!);
    ctx.stroke();
  }

  // ---- Araçlar (çizende) ----
  let color = 0;
  let size = 1;
  const tools = $('#draw-tools');
  const colorButtons = DRAW_COLORS.map((c, i) => {
    const b = el('button', { type: 'button', class: 'draw-color', 'aria-label': t(i === 1 ? 'draw.eraser' : 'draw.color', { n: i + 1 }) });
    b.style.setProperty('--c', c);
    if (i === 1) b.textContent = '⌫';
    b.addEventListener('click', () => {
      color = i;
      renderTools();
    });
    return b;
  });
  const sizeButtons = DRAW_SIZES.map((w, i) => {
    const b = el('button', { type: 'button', class: 'draw-size', 'aria-label': t('draw.size', { n: i + 1 }) }, el('i'));
    b.style.setProperty('--w', `${Math.max(4, w * 0.6)}px`);
    b.addEventListener('click', () => {
      size = i;
      renderTools();
    });
    return b;
  });
  const clearButton = el('button', { type: 'button', class: 'btn small-btn' }, t('draw.clear'));
  clearButton.addEventListener('click', () => {
    clearCanvas();
    send({ t: 'clear' });
  });
  tools.append(el('div', { class: 'draw-colors' }, ...colorButtons), el('div', { class: 'draw-sizes' }, ...sizeButtons), clearButton);
  function renderTools(): void {
    colorButtons.forEach((b, i) => b.classList.toggle('on', i === color));
    sizeButtons.forEach((b, i) => b.classList.toggle('on', i === size));
  }
  renderTools();

  // Çizen fareyle/parmakla çizer: noktalar biriktirilir, 50 ms'de bir parça olarak gider (bir önceki parçanın son
  // noktasıyla başlar: çizgi kopmaz).
  let drawing = false;
  let pending: number[] = [];
  let lastPoint: [number, number] | null = null;
  const point = (event: PointerEvent): [number, number] => {
    const r = canvas.getBoundingClientRect();
    return [
      Math.max(0, Math.min(DRAW_W, Math.round(((event.clientX - r.left) / r.width) * DRAW_W))),
      Math.max(0, Math.min(DRAW_H, Math.round(((event.clientY - r.top) / r.height) * DRAW_H))),
    ];
  };
  function flush(): void {
    if (pending.length < 2) return;
    const s: Stroke = { c: color, w: size, p: pending };
    send({ t: 'stroke', s });
    pending = lastPoint && drawing ? [...lastPoint] : [];
  }
  const flusher = window.setInterval(() => {
    if (pending.length >= 4 || (!drawing && pending.length >= 2)) flush();
  }, 50);
  const iDraw = () => !!state && state.phase === 'draw' && state.drawer === me;
  canvas.addEventListener('pointerdown', (event) => {
    if (!iDraw()) return;
    canvas.setPointerCapture(event.pointerId);
    drawing = true;
    const p = point(event);
    lastPoint = p;
    pending = [...p];
    paint({ c: color, w: size, p: [...p] });
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drawing || !lastPoint) return;
    const p = point(event);
    if (Math.abs(p[0] - lastPoint[0]) + Math.abs(p[1] - lastPoint[1]) < 3) return;
    paint({ c: color, w: size, p: [...lastPoint, ...p] });
    lastPoint = p;
    pending.push(...p);
    if (pending.length >= STROKE_MAX_POINTS * 2) flush();
  });
  const stop = () => {
    if (!drawing) return;
    drawing = false;
    flush();
    pending = [];
    lastPoint = null;
  };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);

  // ---- Akış (tahminler, bilenler) ----
  const feed = $('#draw-feed');
  function say(node: HTMLElement): void {
    feed.append(node);
    while (feed.children.length > 80) feed.firstElementChild?.remove();
    feed.scrollTop = feed.scrollHeight;
  }
  const line = (cls: string, ...children: (string | Node)[]) => say(el('div', { class: `draw-line ${cls}` }, ...children));

  // ---- Durum ----
  let state: State | null = null;
  let me: string | null = null;
  let offset = 0;
  let choices: string[] = [];
  let lastPhase = '';
  let lastHint = '';
  let lastTick = 0;
  /** My guess was "close": its echo in the guess list plays no second sound. */
  let closeAt = 0;
  const players = $('#draw-players');
  const overlay = $('#draw-overlay');
  const input = $<HTMLInputElement>('#draw-input');
  const nameOf = (id: string | null) => state?.players.find((p) => p.id === id)?.name ?? '';

  function render(): void {
    if (!state) return;
    const s = state;
    const drawerName = nameOf(s.drawer);
    // Oyuncular: puana göre.
    players.replaceChildren(
      ...[...s.players]
        .sort((a, b) => b.score - a.score)
        .map((p) =>
          el(
            'li',
            { class: `draw-player${p.online ? '' : ' away'}${p.id === s.drawer ? ' drawer' : ''}${p.guessed ? ' guessed' : ''}` },
            avatarNode(p.avatar, 'draw-avatar'),
            el('span', { class: 'draw-pname' }, p.id === me ? `${p.name} (${t('games.you')})` : p.name),
            el('span', { class: 'draw-badge', 'aria-hidden': 'true' }, p.id === s.drawer && s.phase !== 'lobby' ? '✏️' : p.guessed ? '✅' : ''),
            el('b', { class: 'draw-score' }, String(p.score)),
          ),
        ),
    );
    $('#draw-round').textContent = s.phase === 'lobby' ? t('draw.players', { n: s.players.filter((p) => p.online).length, max: DRAW_MAX_PLAYERS }) : t('draw.round', { n: s.round });
    // İpucu: çizene kelimenin kendisi, diğerlerine "_ _ a _".
    const hint = $('#draw-hint');
    hint.textContent = s.phase === 'draw' ? (s.word ?? s.hint) : s.phase === 'reveal' ? (s.word ?? '') : '';
    hint.classList.toggle('mine', s.phase === 'draw' && !!s.word);
    // Araçlar ve tuvalin imleci sadece çizende.
    const drawingNow = s.phase === 'draw' && s.drawer === me;
    tools.hidden = !drawingNow;
    canvas.classList.toggle('can-draw', drawingNow);
    // Üstteki pencere (lobi, kelime seçimi, tur sonu).
    overlay.replaceChildren();
    overlay.hidden = s.phase === 'draw';
    if (s.phase === 'lobby') {
      const online = s.players.filter((p) => p.online).length;
      const go = el('button', { type: 'button', class: 'btn primary' }, t('draw.start'));
      go.disabled = online < 2;
      go.addEventListener('click', () => send({ t: 'start' }));
      overlay.append(el('h3', {}, t('games.draw.title')), el('p', {}, t('draw.rules')), go, el('p', { class: 'muted small' }, online < 2 ? t('draw.needTwo') : t('draw.ready', { n: online })));
    } else if (s.phase === 'choose') {
      if (s.drawer === me && choices.length) {
        overlay.append(
          el('h3', {}, t('draw.pick')),
          el(
            'div',
            { class: 'draw-choices' },
            ...choices.map((w, i) => {
              const b = el('button', { type: 'button', class: 'btn primary' }, w);
              b.addEventListener('click', () => send({ t: 'choose', index: i }));
              return b;
            }),
          ),
        );
      } else overlay.append(el('h3', {}, t('draw.choosing', { name: drawerName })));
    } else if (s.phase === 'reveal') {
      const guessed = s.players.filter((p) => p.guessed).map((p) => p.name);
      overlay.append(
        el('p', { class: 'muted' }, t('draw.wordWas')),
        el('h3', { class: 'draw-reveal' }, s.word ?? ''),
        el('p', {}, guessed.length ? t('draw.whoGuessed', { names: guessed.join(', ') }) : t('draw.nobody')),
      );
    }
    input.placeholder = s.phase !== 'draw' ? t('draw.chat') : s.drawer === me || s.players.find((p) => p.id === me)?.guessed ? t('draw.secretChat') : t('draw.guessHere');
    // Sounds: my turn to draw, and a new hint letter (not for the drawer, who sees the word).
    if (lastPhase !== '' && s.phase !== lastPhase && s.phase === 'choose' && s.drawer === me) playSound('roundMine');
    if (s.phase === 'draw' && lastPhase === 'draw' && !s.word && s.hint !== lastHint) playSound('hint');
    lastHint = s.hint;
    if (s.phase !== lastPhase) {
      if (s.phase === 'draw') line('system', t('draw.isDrawing', { name: drawerName }));
      if (s.phase === 'reveal' && s.word) line('system', `${t('draw.wordWas')} ${s.word}`);
      lastPhase = s.phase;
    }
    tick();
  }

  // Süre çubuğu: sunucu saatine göre.
  function tick(): void {
    const s = state;
    const bar = $('#draw-time');
    const timer = $('#draw-timer');
    if (!s || s.endsAt === null || s.phase === 'lobby') {
      bar.style.width = '0%';
      timer.textContent = '';
      return;
    }
    const left = Math.max(0, s.endsAt - (Date.now() + offset));
    const total = s.phase === 'draw' ? DRAW_ROUND_MS : s.phase === 'choose' ? DRAW_CHOOSE_MS : DRAW_REVEAL_MS;
    bar.style.width = `${Math.min(100, (left / total) * 100)}%`;
    bar.classList.toggle('low', s.phase === 'draw' && left < 15_000);
    timer.textContent = `${Math.ceil(left / 1000)}`;
    // The last 5 seconds of a drawing round tick once a second.
    const secs = Math.ceil(left / 1000);
    if (s.phase === 'draw' && secs >= 1 && secs <= 5 && secs !== lastTick) playSound('tick');
    lastTick = s.phase === 'draw' && secs <= 5 ? secs : 0;
  }
  const ticker = window.setInterval(tick, 250);

  $('#draw-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    send({ t: 'guess', text });
    input.value = '';
  });

  // ---- Bağlantı (koparsa yeniden bağlanır) ----
  let ws: WebSocket | null = null;
  let stopped = false;
  let pingAt = 0;
  function send(message: DrawClientMessage): void {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  }
  function connect(): void {
    if (stopped) return;
    const url = `${location.origin.replace(/^http/, 'ws')}/api/draw/${encodeURIComponent(gameId)}/ws`;
    const socket = new WebSocket(url);
    ws = socket;
    const lang = document.documentElement.lang === 'en' ? 'en' : 'tr';
    socket.addEventListener('open', () =>
      socket.send(JSON.stringify({ t: 'hello', v: DRAW_PROTOCOL_VERSION, name, avatar, cid: clientId(), lang } satisfies DrawClientMessage)),
    );
    socket.addEventListener('message', (event) => {
      let m: DrawServerMessage;
      try {
        m = JSON.parse(String(event.data)) as DrawServerMessage;
      } catch {
        return;
      }
      switch (m.t) {
        case 'welcome':
          me = m.you;
          offset = m.now - Date.now();
          break;
        case 'pong':
          // Gidiş-dönüşün yarısı kadar geç gelir.
          offset = m.now + (performance.now() - pingAt) / 2 - Date.now();
          break;
        case 'state':
          if (m.phase !== 'choose') choices = [];
          state = m;
          render();
          break;
        case 'choices':
          choices = m.words;
          render();
          break;
        case 'stroke':
          paint(m.s);
          break;
        case 'strokes':
          clearCanvas();
          m.list.forEach(paint);
          break;
        case 'clear':
          clearCanvas();
          break;
        case 'guess':
          line(m.secret ? 'secret' : '', el('b', {}, `${m.name}: `), m.text);
          // Wrong guesses while drawing: mine quietly, others' very quietly (at most one every 2 s).
          if (!m.secret && state?.phase === 'draw' && state.drawer !== m.from) {
            if (m.from !== me) playSound('guessOther');
            else if (Date.now() - closeAt > 1000) playSound('guessWrong');
          }
          break;
        case 'correct':
          line('correct', t('draw.correct', { name: m.name, points: m.points }));
          playSound(m.from === me ? 'guessRight' : 'otherRight');
          break;
        case 'close':
          line('close', t('draw.close', { text: m.text }));
          closeAt = Date.now();
          playSound('close');
          break;
        case 'error':
          if (m.code === 'version' || m.code === 'full') {
            stopped = true;
            line('system', t(m.code === 'version' ? 'games.version' : 'games.full'));
          } else if (m.code === 'too_few') line('system', t('draw.needTwo'));
          break;
      }
    });
    socket.addEventListener('close', () => {
      if (ws !== socket || stopped) return;
      line('system', t('games.reconnecting'));
      setTimeout(connect, 1500);
    });
  }
  connect();
  const ping = window.setInterval(() => {
    pingAt = performance.now();
    send({ t: 'ping' });
  }, 15_000);
  const close = () => {
    stopped = true;
    ws?.close();
  };
  const onLang = () => {
    translate(app);
    render();
  };
  addEventListener('pagehide', close);
  addEventListener('langchange', onLang);
  return () => {
    close();
    for (const timer of [flusher, ticker, ping]) clearInterval(timer);
    removeEventListener('pagehide', close);
    removeEventListener('langchange', onLang);
  };
}
