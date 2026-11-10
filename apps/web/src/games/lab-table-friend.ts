// 🐞 Test Lab, 🎮 tab (card LAB2): "a 🤖 friend sits at this table". One pretend player joins the table I'm at and
// plays along, so the owner can test a two-person table alone: Quiz (answers), Draw & Guess (chooses, draws a shape,
// guesses), Last Heart (checks or calls), the Five Frames Duel (Ready, then real words), Sea Battle (a random fleet,
// Ready, then shots). Loaded only when the command runs (never with the lab off).
//
// Rules (as lane A's fake friends, card DL): an ordinary client with its own random browser id (in memory only), the
// normal hello and the server's normal limits; "🤖" in its name; it never presses Start (the person tests that); it
// leaves when asked, when the table closes, or with the tab. Classics have Stub as the opponent instead.
import { openSocket, type SwmSocket } from '@swm/shared/socket';
import { KEEPALIVE_ACK } from '@swm/shared/keepalive';
import type { RoomGameKind } from '@swm/shared/protocol';
import { DRAW_PROTOCOL_VERSION } from '@swm/shared/games/draw';
import { DUEL_PROTOCOL_VERSION } from '@swm/shared/games/duel';
import { POKER_PROTOCOL_VERSION } from '@swm/shared/games/poker';
import { QUIZ_PROTOCOL_VERSION } from '@swm/shared/games/quiz';
import { SEA_PROTOCOL_VERSION } from '@swm/shared/games/sea';

/** The tables a friend can sit at (Classics: play Stub). */
export const FRIEND_TABLES = ['quiz', 'draw', 'poker', 'duel', 'sea'] as const;
export type FriendTable = (typeof FRIEND_TABLES)[number];
export const canSit = (kind: RoomGameKind | null | undefined): kind is FriendTable => !!kind && (FRIEND_TABLES as readonly string[]).includes(kind);

const VERSION: Record<FriendTable, number> = { quiz: QUIZ_PROTOCOL_VERSION, draw: DRAW_PROTOCOL_VERSION, poker: POKER_PROTOCOL_VERSION, duel: DUEL_PROTOCOL_VERSION, sea: SEA_PROTOCOL_VERSION };
const NAMES = ['Sam', 'Alex', 'Kim', 'Lee'];
/** Real five-letter words, so the Duel's guesses count (a refused one costs nothing, the friend just tries the next). */
const WORDS = {
  en: ['slate', 'crane', 'pious', 'mound', 'lucky', 'brick', 'dwarf', 'nymph', 'fight', 'house', 'water', 'light'],
  tr: ['kalem', 'kitap', 'araba', 'deniz', 'bahçe', 'masal', 'sabun', 'limon', 'balık', 'kapak', 'tavuk', 'yatak'],
};
const GUESSES = { en: ['cat', 'house', 'sun', 'tree', 'car', 'fish', 'boat', 'pizza'], tr: ['kedi', 'ev', 'güneş', 'ağaç', 'araba', 'balık', 'gemi', 'pizza'] };

const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

interface Friend {
  kind: FriendTable;
  table: string;
  name: string;
  socket: SwmSocket;
  timers: Set<ReturnType<typeof setTimeout>>;
  ping: ReturnType<typeof setInterval>;
  /** Until this time the friend sends nothing (its connection seems gone to the table). */
  quietUntil: number;
}
const friends: Friend[] = [];

/** The friends sitting now (for the lab's status line and the harness). */
export const tableFriends = (): { kind: string; table: string; name: string }[] => friends.map(({ kind, table, name }) => ({ kind, table, name }));

/** One 🤖 friend joins `table` (a `kind` table) and plays along. Returns its name. */
export function sitFriend(kind: FriendTable, table: string): string {
  const name = `🤖 ${NAMES.find((n) => !friends.some((f) => f.name === `🤖 ${n}`)) ?? 'Sam'}`;
  const socket = openSocket(`${location.origin.replace(/^http/, 'ws')}/api/${kind}/${encodeURIComponent(table)}/ws`);
  const friend: Friend = { kind, table, name, socket, timers: new Set(), ping: setInterval(() => send({ t: 'ping' }), 15_000), quietUntil: 0 };
  friends.push(friend);
  let me = '';
  let state: Record<string, unknown> | null = null;
  const send = (message: unknown) => {
    if (Date.now() < friend.quietUntil) return;
    try {
      socket.send(JSON.stringify(message));
    } catch {
      // Not open yet or gone: the next state tries again.
    }
  };
  const later = (ms: number, fn: () => void) => {
    const timer = setTimeout(() => {
      friend.timers.delete(timer);
      fn();
    }, ms);
    friend.timers.add(timer);
  };
  /** What it already did in this moment (one answer per question, one shot per turn …). */
  let done = '';
  socket.addEventListener('open', () => send({ t: 'hello', v: VERSION[kind], name, cid: randomId() }));
  socket.addEventListener('message', (event) => {
    if (event.data === KEEPALIVE_ACK) return;
    let m: Record<string, unknown>;
    try {
      m = JSON.parse(String(event.data));
    } catch {
      return;
    }
    if (m.t === 'welcome') me = String(m.you);
    if (m.t === 'choices' && kind === 'draw') later(900, () => send({ t: 'choose', index: 0 }));
    if (m.t !== 'state') return;
    state = m;
    act();
  });
  socket.addEventListener('close', () => leave(friend));

  function act(): void {
    const s = state as Record<string, any> | null;
    if (!s) return;
    if (kind === 'quiz') {
      const mine = (s.players as { id: string; answered: boolean }[]).find((p) => p.id === me);
      const key = `q${s.n}`;
      if (s.phase === 'question' && mine && !mine.answered && done !== key && Array.isArray(s.options)) {
        done = key;
        later(1500 + Math.random() * 2500, () => send({ t: 'answer', n: s.n, pick: Math.floor(Math.random() * s.options.length) }));
      }
    } else if (kind === 'draw') {
      const key = `${s.round}:${s.drawer}:${s.phase}`;
      if (s.phase === 'draw' && s.drawer === me && done !== key) {
        done = key;
        // A circle and a cross: something to look at while the person guesses.
        const circle: number[] = [];
        for (let i = 0; i <= 24; i++) circle.push(Math.round(500 + 180 * Math.cos((i / 24) * 2 * Math.PI)), Math.round(375 + 180 * Math.sin((i / 24) * 2 * Math.PI)));
        later(800, () => send({ t: 'stroke', s: { c: 0, w: 1, p: circle, g: 1 } }));
        later(1600, () => send({ t: 'stroke', s: { c: 0, w: 1, p: [380, 255, 620, 495], g: 2 } }));
      } else if (s.phase === 'draw' && s.drawer !== me && done !== key) {
        done = key;
        const lang: 'en' | 'tr' = s.lang === 'tr' ? 'tr' : 'en';
        GUESSES[lang].slice(0, 3).forEach((word, i) => later(3000 + i * 4000, () => state?.phase === 'draw' && send({ t: 'guess', text: word })));
      }
    } else if (kind === 'poker') {
      const key = `${s.phase}:${s.toAct}:${s.currentBet}:${s.pot}`;
      if (s.toAct === me && done !== key) {
        done = key;
        later(1200, () => send({ t: 'act', a: s.options?.call > 0 ? 'call' : 'check' }));
      }
    } else if (kind === 'duel') {
      const seat = s.seat as number;
      if (s.phase === 'wait' && seat >= 0 && !s.players[seat]?.ready && done !== 'ready') {
        done = 'ready';
        later(800, () => send({ t: 'ready', on: true }));
      }
      if (s.phase === 'over') done = '';
      if (s.phase === 'play' && seat >= 0 && !s.players[seat]?.solved && !s.players[seat]?.out) {
        const tries = (s.players[seat]?.marks as unknown[] | undefined)?.length ?? 0;
        const key = `play:${s.round}:${tries}`;
        if (done !== key) {
          done = key;
          const words = WORDS[s.lang === 'tr' ? 'tr' : 'en'];
          later(4000 + Math.random() * 3000, () => send({ t: 'guess', word: words[(tries + Math.floor(Math.random() * 3)) % words.length] }));
        }
      }
    } else if (kind === 'sea') {
      const seat = s.seat as number;
      if (seat < 0) return;
      if (s.phase === 'place' && !s.players[seat]?.ready && done !== 'ready') {
        done = 'ready';
        later(600, () => send({ t: 'shuffle' }));
        later(1400, () => send({ t: 'ready', on: true }));
      }
      if (s.phase === 'over') done = '';
      if (s.phase === 'play' && s.turn === seat) {
        const theirs = s.seas[1 - seat] as { shots: [number, number][] };
        const key = `shot:${theirs.shots.length}`;
        if (done !== key) {
          done = key;
          const taken = new Set(theirs.shots.map(([c]) => c));
          const free = Array.from({ length: 100 }, (_, i) => i).filter((c) => !taken.has(c));
          if (free.length) later(1300, () => send({ t: 'shot', cell: pick(free) }));
        }
      }
    }
  }
  return name;
}

function leave(friend: Friend): void {
  const i = friends.indexOf(friend);
  if (i < 0) return;
  friends.splice(i, 1);
  for (const timer of friend.timers) clearTimeout(timer);
  clearInterval(friend.ping);
  try {
    friend.socket.close();
  } catch {
    // Already closed.
  }
}

/** Every 🤖 friend at a table leaves (all tables, or only `table`). Returns how many left. */
export function leaveFriends(table?: string): number {
  const going = friends.filter((f) => !table || f.table === table);
  for (const f of going) leave(f);
  return going.length;
}

/** The friends' connections go quiet for `ms` (no ping, no move: the table marks them offline after ~90 s), then they
 *  talk again. Returns how many went quiet. */
export function quietFriends(ms: number): number {
  for (const f of friends) {
    f.quietUntil = Date.now() + ms;
    const timer = setTimeout(() => {
      f.timers.delete(timer);
      try {
        f.socket.send(JSON.stringify({ t: 'ping' }));
      } catch {
        // Gone meanwhile.
      }
    }, ms + 100);
    f.timers.add(timer);
  }
  return friends.length;
}
