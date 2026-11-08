// Odanın içindeki Çiz-Bil (oyun sahnesinde): tuval, kalem araçları (sadece çizende), tahmin kutusu ve akış,
// oyuncular ve puanlar. Sunucu (Draw nesnesi) turları yürütür; burası gelen durumu çizer, çizeni dinler.
// Çizim 1000×750'lik ızgarada tam sayı noktalar olarak, 50 ms'de bir parça parça gider.

import './lobby.css';
import { OPEN, openSocket, type SwmSocket } from '@swm/shared/socket';
import {
  DRAW_CHOOSE_MS,
  DRAW_COLORS,
  DRAW_COLOR_ORDER,
  DRAW_FILL_TOLERANCE,
  DRAW_H,
  DRAW_MAX_PLAYERS,
  DRAW_PROTOCOL_VERSION,
  DRAW_REVEAL_MS,
  DRAW_ROUNDS,
  DRAW_ROUND_MS,
  DRAW_SIZES,
  DRAW_SIZE_ORDER,
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
import { setGameLive } from './live.ts';
import { debugHooks } from '../debug-lab.ts';
import { lang } from '../i18n.ts';
import draw1Art from './art/tutorial/draw-1-pick.svg?raw';
import draw2Art from './art/tutorial/draw-2-draw.svg?raw';
import draw3Art from './art/tutorial/draw-3-guess.svg?raw';
import { tableHowTo } from './how-to-play.ts';
import { resultCard, resultGlowbeam, showPointsResult } from './result.ts';
import { langChoices, lobbyPlayers, podium, settingsPanel } from './ui.ts';
import { DRAW_CATEGORIES } from '@swm/shared/games/draw-words';
import type { DrawTopic } from '@swm/shared/games/draw';
import { GAME_PING_MS, silence } from './silent.ts';

type State = Extract<DrawServerMessage, { t: 'state' }>;

/** Oyunu `app`'in içine kurar; dönen işlev bağlantıyı ve zamanlayıcıları kapatır. */

/** GP2: this game's "How to play" texts (its own, like every game chunk's; the room page's i18n stays small). */
const TEXT = {
  en: {
    how1: 'Pick a word',
    how1Line: 'On your turn, choose one of three words; only you see it.',
    how2: 'Draw it',
    how2Line: 'Draw it with the pen and colours: no letters, no numbers!',
    how3: 'Guess in the chat',
    how3Line: 'The others type their guesses; a right guess scores for the guesser and for you.',
    endWin: 'The best artist in the room!',
    endLose: 'Lovely drawings. One more round?',
    endDraw: 'A tie! Play again to settle it.',
    endOver: 'What a gallery!',
  },
  tr: {
    how1: 'Bir kelime seç',
    how1Line: 'Sıra sende olunca üç kelimeden birini seç; onu bir tek sen görürsün.',
    how2: 'Çiz',
    how2Line: 'Kalem ve renklerle çiz: harf yok, rakam yok!',
    how3: 'Sohbette tahmin et',
    how3Line: 'Diğerleri tahminlerini yazar; doğru tahmin hem bilene hem sana puan getirir.',
    endWin: 'Odanın en iyi ressamı!',
    endLose: 'Çizimler harikaydı. Bir tur daha?',
    endDraw: 'Berabere! Yeniden oynayıp kapatın.',
    endOver: 'Ne sergiydi!',
  },
} as const;
const tx = (key: keyof (typeof TEXT)['en']): string => (lang() === 'tr' ? TEXT.tr : TEXT.en)[key];

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
  // Fills read the pixels back: keep the canvas on the CPU.
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const clearCanvas = () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, DRAW_W, DRAW_H);
  };
  clearCanvas();
  /** Flood fill from (x, y): every connected pixel close to the clicked one's color takes the new color. Everyone
   *  replays the same strokes in the same order on the same 1000×750 canvas, so everyone gets the same picture. */
  function fillAt(x: number, y: number, hex: string): void {
    const W = DRAW_W;
    const H = DRAW_H;
    const sx = Math.min(W - 1, x);
    const sy = Math.min(H - 1, y);
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    const at = (sy * W + sx) * 4;
    const r0 = d[at]!;
    const g0 = d[at + 1]!;
    const b0 = d[at + 2]!;
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    if (Math.max(Math.abs(r - r0), Math.abs(g - g0), Math.abs(b - b0)) < 6) return;
    const seen = new Uint8Array(W * H);
    const like = (p: number) => !seen[p] && Math.max(Math.abs(d[p * 4]! - r0), Math.abs(d[p * 4 + 1]! - g0), Math.abs(d[p * 4 + 2]! - b0)) <= DRAW_FILL_TOLERANCE;
    const stack = [sx, sy];
    while (stack.length) {
      const py = stack.pop()!;
      let px = stack.pop()!;
      let p = py * W + px;
      while (px > 0 && like(p - 1)) {
        px--;
        p--;
      }
      let up = false;
      let down = false;
      while (px < W && like(p)) {
        seen[p] = 1;
        d[p * 4] = r;
        d[p * 4 + 1] = g;
        d[p * 4 + 2] = b;
        d[p * 4 + 3] = 255;
        if (py > 0) {
          if (like(p - W)) {
            if (!up) stack.push(px, py - 1);
            up = true;
          } else up = false;
        }
        if (py < H - 1) {
          if (like(p + W)) {
            if (!down) stack.push(px, py + 1);
            down = true;
          } else down = false;
        }
        px++;
        p++;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  function paint(s: Stroke): void {
    if (s.f) return fillAt(s.p[0]!, s.p[1]!, DRAW_COLORS[s.c] ?? '#000');
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

  // ---- Tools (for the drawer): pen / fill, colors, sizes, undo, clear ----
  let color = 0;
  let size = 1;
  let tool: 'pen' | 'fill' = 'pen';
  /** The drawing action pieces belong to (one press = one group, so "undo" takes back a whole line). */
  let group = Math.floor(Math.random() * 1000) * 1000;
  const tools = $('#draw-tools');
  const toolButton = (name: 'pen' | 'fill', glyph: string) => {
    const b = el('button', { type: 'button', class: 'draw-tool', title: t(`draw.${name}`), 'aria-label': t(`draw.${name}`) }, glyph);
    b.addEventListener('click', () => {
      tool = name;
      // The pen after the eraser draws in black again.
      if (name === 'pen' && color === 1) color = 0;
      renderTools();
    });
    return b;
  };
  const penButton = toolButton('pen', '✏️');
  const fillButton = toolButton('fill', '🪣');
  const colorButtons = DRAW_COLOR_ORDER.map((i) => {
    const c = DRAW_COLORS[i];
    const b = el('button', { type: 'button', class: 'draw-color', 'aria-label': t(i === 1 ? 'draw.eraser' : 'draw.color', { n: i + 1 }) });
    b.style.setProperty('--c', c);
    b.dataset.i = String(i);
    if (i === 1) b.textContent = '⌫';
    b.addEventListener('click', () => {
      color = i;
      renderTools();
    });
    return b;
  });
  const sizeButtons = DRAW_SIZE_ORDER.map((i) => {
    const w = DRAW_SIZES[i];
    const b = el('button', { type: 'button', class: 'draw-size', 'aria-label': t('draw.size', { n: i + 1 }) }, el('i'));
    b.style.setProperty('--w', `${Math.max(3, Math.min(22, w * 0.55))}px`);
    b.dataset.i = String(i);
    b.addEventListener('click', () => {
      size = i;
      tool = 'pen';
      renderTools();
    });
    return b;
  });
  // P10: a real eraser (the white pen, one press) and redo beside undo.
  const eraserButton = el('button', { type: 'button', class: 'draw-tool', title: t('draw.eraserTool'), 'aria-label': t('draw.eraserTool') }, '🧽');
  eraserButton.addEventListener('click', () => {
    tool = 'pen';
    color = 1;
    renderTools();
  });
  const undoButton = el('button', { type: 'button', class: 'btn small-btn', title: `${t('draw.undo')} · Ctrl+Z` }, `↶ ${t('draw.undo')}`);
  undoButton.addEventListener('click', () => send({ t: 'undo' }));
  const redoButton = el('button', { type: 'button', class: 'btn small-btn', title: `${t('draw.redo')} · Ctrl+Y`, 'aria-label': t('draw.redo') }, '↷');
  redoButton.addEventListener('click', () => send({ t: 'redo' }));
  const clearButton = el('button', { type: 'button', class: 'btn small-btn' }, t('draw.clear'));
  clearButton.addEventListener('click', () => {
    clearCanvas();
    send({ t: 'clear' });
  });
  tools.append(
    el('div', { class: 'draw-tool-pick' }, penButton, eraserButton, fillButton),
    el('div', { class: 'draw-colors' }, ...colorButtons),
    el('div', { class: 'draw-sizes' }, ...sizeButtons),
    el('div', { class: 'draw-tool-pick' }, undoButton, redoButton, clearButton),
  );
  function renderTools(): void {
    penButton.classList.toggle('on', tool === 'pen' && color !== 1);
    eraserButton.classList.toggle('on', tool === 'pen' && color === 1);
    fillButton.classList.toggle('on', tool === 'fill');
    colorButtons.forEach((b) => b.classList.toggle('on', Number(b.dataset.i) === color));
    sizeButtons.forEach((b) => b.classList.toggle('on', tool === 'pen' && Number(b.dataset.i) === size));
    canvas.classList.toggle('filling', tool === 'fill');
  }
  renderTools();
  const onKey = (event: KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey) || !iDraw()) return;
    const key = event.key.toLowerCase();
    if (key === 'y' || (key === 'z' && event.shiftKey)) {
      event.preventDefault();
      send({ t: 'redo' });
    } else if (key === 'z') {
      event.preventDefault();
      send({ t: 'undo' });
    }
  };
  addEventListener('keydown', onKey);

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
    const s: Stroke = { c: color, w: size, p: pending, g: group };
    send({ t: 'stroke', s });
    pending = lastPoint && drawing ? [...lastPoint] : [];
  }
  const flusher = window.setInterval(() => {
    if (pending.length >= 4 || (!drawing && pending.length >= 2)) flush();
  }, 50);
  const iDraw = () => !!state && state.phase === 'draw' && state.drawer === me;
  canvas.addEventListener('pointerdown', (event) => {
    if (!iDraw()) return;
    group++;
    if (tool === 'fill') {
      const [x, y] = point(event);
      const s: Stroke = { c: color, w: 0, p: [x, y], f: 1, g: group };
      paint(s);
      send({ t: 'stroke', s });
      return;
    }
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

  // GP3: the tables' result card at the end, with the podium inside.
  const result = resultCard(app.firstElementChild as HTMLElement, resultGlowbeam());
  function render(): void {
    if (state) setGameLive(state.phase !== 'lobby' && state.phase !== 'over' && state.players.some((p) => p.id === me));
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
    $('#draw-round').textContent =
      s.phase === 'lobby' || s.phase === 'over' ? t('draw.players', { n: s.players.filter((p) => p.online).length, max: DRAW_MAX_PLAYERS }) : t('draw.turn', { n: s.round, rounds: s.rounds });
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
    // Lobby and podium need no canvas: the card takes the canvas's place at its own height (BHG: it was shrunk to fit).
    app.firstElementChild!.classList.toggle('draw-lobby', s.phase === 'lobby' || s.phase === 'over');
    if (s.phase === 'over') showPointsResult(result, `draw:${gameId}`, s.players, s.host, me, { win: tx('endWin'), lose: tx('endLose'), draw: tx('endDraw'), over: tx('endOver') }, () => send({ t: 'start' }));
    else result.hide();
    if (s.phase === 'lobby' || s.phase === 'over') {
      const online = s.players.filter((p) => p.online).length;
      const go = el('button', { type: 'button', class: 'btn primary' }, t(s.phase === 'over' ? 'games.again' : 'draw.start'));
      const host = s.players.find((p) => p.id === s.host);
      // Only the host starts (the server checks too).
      go.disabled = online < 2 || (!!host && s.host !== me);
      go.addEventListener('click', () => send({ t: 'start' }));
      const settings = settingsPanel(
        [
          { label: t('games.lang'), value: s.lang, choices: langChoices, pick: (lang) => send({ t: 'settings', lang: lang as 'tr' | 'en' }) },
          { label: t('draw.rounds'), value: s.rounds, choices: DRAW_ROUNDS.map((n) => ({ value: n, label: t('draw.roundsN', { n }) })), pick: (rounds) => send({ t: 'settings', rounds: rounds as 1 | 2 | 3 }) },
          {
            label: t('draw.topic'),
            value: s.topic ?? 'mix',
            select: true,
            choices: (['mix', ...DRAW_CATEGORIES] as const).map((topic) => ({ value: topic, label: t(`draw.cat.${topic}`) })),
            pick: (topic) => send({ t: 'settings', topic: topic as DrawTopic }),
          },
        ],
        s.host === me || !host ? null : host.name,
      );
      if (s.phase === 'over') overlay.append(el('h3', {}, t('games.over')), podium(s.players));
      else overlay.append(el('h3', {}, t('games.draw.title')), el('p', { class: 'draw-rules' }, t('draw.rules')), lobbyPlayers(s.players, me, s.host));
      overlay.append(settings, go, el('p', { class: 'muted small' }, online < 2 ? t('draw.needTwo') : t('draw.ready', { n: online })));
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
      const gained = s.players.filter((p) => p.gained).sort((a, b) => (b.gained ?? 0) - (a.gained ?? 0));
      overlay.append(
        el('p', { class: 'muted' }, t('draw.wordWas')),
        el('h3', { class: 'draw-reveal' }, s.word ?? ''),
        gained.length
          ? el(
              'ul',
              { class: 'draw-gains', 'aria-label': t('draw.roundPoints') },
              ...gained.map((p) =>
                el('li', { class: p.id === s.drawer ? 'drawer' : '' }, avatarNode(p.avatar, 'draw-avatar'), el('span', {}, `${p.id === s.drawer ? '✏️ ' : ''}${p.name}`), el('b', {}, `+${p.gained}`)),
              ),
            )
          : el('p', {}, t('draw.nobody')),
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
      const drawer = s.players.find((p) => p.id === s.drawer);
      if (s.phase === 'reveal' && drawer?.gained) line('system', t('draw.drawerGot', { name: drawer.name, points: drawer.gained }));
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
    // Time is up but the phase hasn't moved: nudge the server (any message makes it catch up, 0.9.93.2).
    const now = Date.now();
    if (left === 0 && s.endsAt + 1500 < now + offset && now - nudgedAt > 3000) {
      nudgedAt = now;
      send({ t: 'ping' });
    }
  }
  let nudgedAt = 0;
  const ticker = window.setInterval(tick, 250);

  $('#draw-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    send({ t: 'guess', text });
    input.value = '';
  });

  // ---- Bağlantı (koparsa yeniden bağlanır) ----
  let ws: SwmSocket | null = null;
  let stopped = false;
  let pingAt = 0;
  // GHOST: the Test Lab's "go silent" keeps this page quiet, as a dead connection would be.
  const quiet = silence();
  function send(message: DrawClientMessage): void {
    if (quiet.on) return;
    if (ws?.readyState === OPEN) ws.send(JSON.stringify(message));
  }
  function connect(): void {
    if (stopped) return;
    const url = `${location.origin.replace(/^http/, 'ws')}/api/draw/${encodeURIComponent(gameId)}/ws`;
    const socket = openSocket(url);
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
          line('correct', t('draw.correctRank', { name: m.name, rank: m.rank, points: m.points }));
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
  }, GAME_PING_MS);
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
  // Test Lab (DL3b): the current phase ends now (local lab server only).
  const offLab = debugHooks.register('table.draw', () => ({
    commands: [
      quiet.command('draw', { en: 'Draw & Guess', tr: 'Çiz-Bil' }),
      { id: 'draw.skip', title: { en: 'Draw & Guess: end this phase now', tr: 'Çiz-Bil: bu aşamayı hemen bitir' }, help: { en: 'Local lab server only: the question / round / reveal ends at once.', tr: 'Sadece yerel lab sunucusunda: soru / tur / cevap ekranı hemen biter.' }, tab: 'games', where: { en: 'at a Draw & Guess table', tr: 'Çiz-Bil masasında' }, run: () => send({ t: 'lab', op: 'skip' }) },
    ],
  }));
  // GP2: the same "How to play" cards as every game (first time, and the "?" in the head).
  const how = tableHowTo(app, 'draw:howSeen', () => [
    { art: draw1Art, title: tx('how1'), line: tx('how1Line') },
    { art: draw2Art, title: tx('how2'), line: tx('how2Line') },
    { art: draw3Art, title: tx('how3'), line: tx('how3Line') },
  ], app.querySelector<HTMLElement>('.draw-top'));
  return () => {
    offLab();
    how.destroy();
    setGameLive(false);
    close();
    for (const timer of [flusher, ticker, ping]) clearInterval(timer);
    removeEventListener('pagehide', close);
    removeEventListener('langchange', onLang);
    removeEventListener('keydown', onKey);
  };
}
