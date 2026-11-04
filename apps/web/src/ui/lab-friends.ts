// 🐞 Test Lab, 👥 Fake friends (card DL, DL2): up to five pretend people in this room, so the owner can test every
// two-person flow alone. Part of the lab's lazy chunk; nothing here exists with the lab off.
//
// Rules (card DL): a fake friend is an ordinary client: its own browser id (random, in memory only), the normal hello,
// the server's normal limits; "🤖" in its name; only in the room the lab opened it in; all leave when the lab is turned
// off or the tab goes. No new server power: everything they do is a normal client message.
import { el } from '../dom.ts';
import { ServerClock } from '@swm/shared/clock';
import { RoomConnection, type ConnectionStatus } from '@swm/shared/connection';
import { AVATAR_PAGES, REACTIONS, type Avatar, type Member, type PlaybackState, type ServerMessage } from '@swm/shared/protocol';
import { debugRoom, type LabCommand } from '../debug-lab.ts';

export const MAX_FRIENDS = 5;
const NAMES = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus'];
const LINES = ['hi everyone 👋', 'this part is great', 'lol', 'wait what happened', 'can you pause a sec?', 'back!', 'nice one', 'I can hear you fine', 'who picked this 😄', 'one more?'];
const PACES = [2, 5, 10] as const;

type Log = (line: { dir: 'lab' | 'error'; type: string; text: string }) => void;

class FakeFriend {
  readonly name: string;
  readonly avatar: Avatar;
  readonly cid: string;
  readonly clock = new ServerClock();
  memberId: string | null = null;
  status: ConnectionStatus | 'door' | 'gone' = 'connecting';
  state: PlaybackState | null = null;
  hostId: string | null = null;
  members: Member[] = [];
  private conn: RoomConnection;
  private back: ReturnType<typeof setTimeout> | undefined;
  private stall: ReturnType<typeof setTimeout> | undefined;

  constructor(
    roomId: string,
    name: string,
    private readonly changed: () => void,
    private readonly log: Log,
  ) {
    this.name = `🤖 ${name}`;
    const pool = AVATAR_PAGES[0] as readonly string[];
    this.avatar = pool[Math.floor(Math.random() * pool.length)] as Avatar;
    this.cid = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
    this.conn = new RoomConnection({
      serverUrl: location.origin,
      roomId,
      name: this.name,
      avatar: this.avatar,
      cid: this.cid,
      client: 'web',
      clock: this.clock,
      handover: false,
      onMessage: (m) => this.receive(m),
      onStatus: (s) => {
        if (this.status === 'gone') return;
        this.status = s === 'open' && !this.memberId ? 'connecting' : s;
        this.changed();
      },
    });
    this.conn.connect();
  }

  private receive(message: ServerMessage): void {
    switch (message.t) {
      case 'welcome':
        this.memberId = message.you;
        this.state = message.state;
        this.hostId = message.hostId;
        this.members = message.members;
        this.status = 'open';
        break;
      case 'knock-wait':
        this.status = 'door';
        break;
      case 'state':
        this.state = message.state;
        break;
      case 'members':
        this.members = message.members;
        this.hostId = message.hostId;
        break;
      case 'kicked':
        this.status = 'gone';
        this.log({ dir: 'lab', type: 'friends', text: `${this.name} was removed from the room` });
        break;
      case 'error':
        this.log({ dir: 'error', type: 'friends', text: `${this.name}: ${message.code}` });
        break;
      default:
        return;
    }
    this.changed();
  }

  get inRoom(): boolean {
    return this.status === 'open' && this.memberId !== null;
  }

  /** The room's position now, from this friend's own copy of the state. */
  position(): number {
    const s = this.state;
    if (!s) return 0;
    return Math.max(0, s.position + (s.paused ? 0 : ((this.clock.now() - s.updatedAt) / 1000) * s.rate));
  }

  send(message: Parameters<RoomConnection['send']>[0]): boolean {
    if (!this.inRoom) throw new Error(`${this.name} is not in the room yet`);
    const ok = this.conn.send(message);
    if (!ok) throw new Error(`${this.name}: not sent (connection down)`);
    return ok;
  }

  say(text = LINES[Math.floor(Math.random() * LINES.length)]!): string {
    this.send({ t: 'chat', text });
    return text;
  }

  react(): string {
    const emoji = REACTIONS[Math.floor(Math.random() * Math.min(8, REACTIONS.length))]!;
    this.send({ t: 'react', emoji });
    return emoji;
  }

  play(): void {
    this.send({ t: 'play', position: this.position(), at: this.clock.now() });
  }

  pause(): void {
    this.send({ t: 'pause', position: this.position(), at: this.clock.now() });
  }

  seek(by: number): number {
    const to = Math.max(0, this.position() + by);
    this.send({ t: 'seek', position: to, at: this.clock.now() });
    return to;
  }

  /** "My video is stuck" for `seconds`, then ready again (the everyone-ready wait). */
  stallFor(seconds: number): void {
    this.send({ t: 'ready', ready: false });
    clearTimeout(this.stall);
    this.stall = setTimeout(() => {
      if (this.inRoom) this.conn.send({ t: 'ready', ready: true });
    }, seconds * 1000);
  }

  /** Leaves (the connection closes) and comes back after `seconds` with the same member id. */
  bounce(seconds: number): void {
    this.conn.close();
    this.status = 'reconnecting';
    this.changed();
    clearTimeout(this.back);
    this.back = setTimeout(() => {
      if (this.status !== 'gone') this.conn.connect();
    }, seconds * 1000);
  }

  leave(): void {
    clearTimeout(this.back);
    clearTimeout(this.stall);
    this.status = 'gone';
    this.conn.close();
  }
}

export function createFriends(roomId: string | null, log: Log, labCommand: (id: string, arg?: string) => Promise<unknown>) {
  const friends: FakeFriend[] = [];
  let chatty: ReturnType<typeof setInterval> | undefined;
  let pace: (typeof PACES)[number] = 5;
  const listeners = new Set<() => void>();
  const changed = () => {
    for (let i = friends.length - 1; i >= 0; i--) if (friends[i]!.status === 'gone') friends.splice(i, 1);
    for (const fn of listeners) fn();
  };

  const needRoom = () => (roomId ? true : 'not in a room');
  const needFriend = () => (roomId ? (friends.some((f) => f.inRoom) ? true : 'add a fake friend first') : 'not in a room');
  /** The friend a command acts on: the given number (1–5) or a random one in the room. */
  const pick = (arg?: string): FakeFriend => {
    const n = Number(arg);
    const inRoom = friends.filter((f) => f.inRoom);
    const friend = Number.isInteger(n) && n >= 1 ? friends[n - 1] : inRoom[Math.floor(Math.random() * inRoom.length)];
    if (!friend) throw new Error('no such fake friend');
    return friend;
  };

  function add(count: number): string {
    if (!roomId) throw new Error('not in a room');
    const room = roomId;
    const room_ = Math.min(count, MAX_FRIENDS - friends.length);
    if (room_ <= 0) throw new Error(`at most ${MAX_FRIENDS} fake friends`);
    const used = new Set(friends.map((f) => f.name));
    const added: string[] = [];
    for (let i = 0; i < room_; i++) {
      const name = NAMES.find((n) => !used.has(`🤖 ${n}`))!;
      used.add(`🤖 ${name}`);
      friends.push(new FakeFriend(room, name, changed, log));
      added.push(name);
    }
    changed();
    return `added ${added.join(', ')}`;
  }

  function removeAll(): string {
    const n = friends.length;
    for (const f of [...friends]) f.leave();
    friends.length = 0;
    setChatty(false);
    changed();
    return `${n} left`;
  }

  function setChatty(on: boolean): void {
    clearInterval(chatty);
    chatty = undefined;
    if (on) {
      chatty = setInterval(() => {
        const inRoom = friends.filter((f) => f.inRoom);
        const f = inRoom[Math.floor(Math.random() * inRoom.length)];
        if (!f) return;
        try {
          if (Math.random() < 0.7) f.say();
          else f.react();
        } catch (error) {
          log({ dir: 'error', type: 'friends', text: String((error as Error)?.message ?? error) });
        }
      }, pace * 1000);
    }
    changed();
  }

  const commands: LabCommand[] = [
    { id: 'friends.add', title: 'Friends: add a fake friend', help: `A 🤖 person joins this room (at most ${MAX_FRIENDS}); with "Ask before letting people in" on, they knock at the door. Undo: everyone leaves.`, tab: 'friends', where: 'in a room', available: needRoom, run: () => add(1), undo: removeAll },
    { id: 'friends.add3', title: 'Friends: add 3 fake friends', help: 'Three 🤖 people join this room. Undo: everyone leaves.', tab: 'friends', where: 'in a room', available: needRoom, run: () => add(3), undo: removeAll },
    { id: 'friends.removeAll', title: 'Friends: everyone leaves', help: 'All fake friends leave the room.', tab: 'friends', available: () => (friends.length ? true : 'no fake friends'), run: removeAll },
    { id: 'friends.say', title: 'Friends: someone writes', help: 'A fake friend writes a chat line (a number picks which one).', tab: 'friends', available: needFriend, run: (arg) => pick(arg).say() },
    { id: 'friends.react', title: 'Friends: someone sends an emoji', help: 'A fake friend sends an emoji.', tab: 'friends', available: needFriend, run: (arg) => pick(arg).react() },
    { id: 'friends.pause', title: 'Friends: someone pauses', help: 'A fake friend pauses the room (as if in their player). Undo plays.', tab: 'friends', available: needFriend, run: (arg) => pick(arg).pause(), undo: () => pick().play() },
    { id: 'friends.play', title: 'Friends: someone plays', help: 'A fake friend plays the room. Undo pauses.', tab: 'friends', available: needFriend, run: (arg) => pick(arg).play(), undo: () => pick().pause() },
    {
      id: 'friends.seek',
      title: 'Friends: someone jumps +30 s',
      help: 'A fake friend jumps 30 s ahead. Undo jumps back.',
      tab: 'friends',
      available: needFriend,
      run: (arg) => `to ${pick(arg).seek(30).toFixed(1)} s`,
      undo: () => `to ${pick().seek(-30).toFixed(1)} s`,
    },
    { id: 'friends.stall', title: 'Friends: someone\'s video gets stuck (5 s)', help: 'A fake friend reports "not ready" for 5 s: the room waits for them.', tab: 'friends', available: needFriend, run: (arg) => pick(arg).stallFor(5) },
    { id: 'friends.bounce', title: 'Friends: someone leaves and comes back', help: 'A fake friend\'s connection closes; they are back after 5 s with the same member id.', tab: 'friends', available: needFriend, run: (arg) => { const f = pick(arg); f.bounce(5); return f.name; } },
    {
      id: 'friends.host',
      title: 'Friends: make a fake friend the host',
      help: 'I hand the host role to a fake friend (the same path as 👑 Make host).',
      tab: 'friends',
      available: needFriend,
      run: (arg) => {
        const f = pick(arg);
        const room = debugRoom();
        if (!f.memberId || !room?.makeHost) throw new Error('not in a room yet');
        room.makeHost(f.memberId);
        return f.name;
      },
    },
    { id: 'friends.chatty', title: 'Friends: chatty mode on / off', help: `The fake friends write and send emojis by themselves (every ${pace} s; a number 2, 5 or 10 sets the pace).`, tab: 'friends', available: needFriend, run: (arg) => { const n = Number(arg); if (PACES.includes(n as (typeof PACES)[number])) pace = n as (typeof PACES)[number]; setChatty(!chatty || !!arg); return chatty ? `on, every ${pace} s` : 'off'; }, undo: () => setChatty(false) },
  ];

  /** The 👥 tab: one row per friend with its quick buttons. */
  function view(run: (id: string, arg?: string) => void): HTMLElement {
    const box = el('div', { class: 'lab-friends' });
    if (!friends.length) box.append(el('p', { class: 'muted' }, roomId ? 'No fake friends yet. "Add" brings one in.' : 'Fake friends work in a room.'));
    friends.forEach((f, i) => {
      const n = String(i + 1);
      const label = f.status === 'open' ? (f.memberId && f.hostId === f.memberId ? 'host' : 'in the room') : f.status === 'door' ? 'at the door' : f.status;
      const quick = (id: string, text: string) => {
        const b = el('button', { type: 'button', class: 'btn debug-small', 'data-friend': n, 'data-command': id }, text);
        b.disabled = !f.inRoom;
        b.addEventListener('click', () => run(id, n));
        return b;
      };
      box.append(
        el('div', { class: 'lab-friend', 'data-friend': n },
          el('div', { class: 'lab-friend-head' }, el('img', { src: `/avatars/${f.avatar}.svg`, alt: '', width: '24', height: '24' }), el('strong', {}, f.name), el('span', { class: 'lab-tag' }, label)),
          el('div', { class: 'debug-actions' }, quick('friends.say', '💬 say'), quick('friends.react', '😀'), quick('friends.pause', 'Pause'), quick('friends.play', 'Play'), quick('friends.seek', '+30 s'), quick('friends.stall', '⏳ stall'), quick('friends.bounce', '↺ leave & back'), quick('friends.host', '👑 host')),
        ),
      );
    });
    const addButton = el('button', { type: 'button', class: 'btn primary debug-small lab-friend-add', 'data-command': 'friends.add' }, `＋ Add (${friends.length}/${MAX_FRIENDS})`);
    addButton.disabled = !roomId || friends.length >= MAX_FRIENDS;
    addButton.addEventListener('click', () => run('friends.add'));
    const chattyButton = el('button', { type: 'button', class: 'btn debug-small lab-friend-chatty', 'data-command': 'friends.chatty' }, chatty ? `🗣 Chatty: on (${pace} s)` : '🗣 Chatty: off');
    chattyButton.disabled = !friends.some((f) => f.inRoom);
    chattyButton.addEventListener('click', () => run('friends.chatty'));
    const allButton = el('button', { type: 'button', class: 'btn debug-small', 'data-command': 'friends.removeAll' }, '🚪 Everyone leaves');
    allButton.disabled = !friends.length;
    allButton.addEventListener('click', () => run('friends.removeAll'));
    box.append(el('div', { class: 'debug-actions lab-friends-foot' }, addButton, chattyButton, allButton));
    return box;
  }

  addEventListener('pagehide', removeAll);
  return {
    commands,
    view,
    onChange: (fn: () => void) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    count: () => friends.length,
    close: () => {
      removeAll();
      removeEventListener('pagehide', removeAll);
    },
  };
}
