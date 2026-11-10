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
import { debugRoom, labFail, type LabCommand, type LabText } from '../debug-lab.ts';
import { errorText, labTr } from './lab-text.ts';

export const MAX_FRIENDS = 5;
/** The fake friend I last made the host (`friends.host`), for its Undo. */
let hostFriend: FakeFriend | null = null;
const NAMES = ['Ada', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus'];
const LINES = ['hi everyone 👋', 'this part is great', 'lol', 'wait what happened', 'can you pause a sec?', 'back!', 'nice one', 'I can hear you fine', 'who picked this 😄', 'one more?'];
const PACES = [2, 5, 10] as const;

type Log = (line: { dir: 'lab' | 'error'; type: string; text: string }) => void;

const NOT_IN_ROOM = { en: 'not in a room', tr: 'odada değilsin' };
/** The 👥 tab's own words (the commands carry theirs). */
const TEXT = {
  en: {
    removed: 'was removed from the room',
    notYet: 'is not in the room yet',
    notSent: 'not sent (connection down)',
    none: 'No fake friends yet. "Add" brings one in.',
    outside: 'Fake friends work in a room.',
    host: '👑 host',
    inRoom: '🟢 in the room',
    door: '🟡 at the door',
    connecting: '🟡 connecting',
    reconnecting: '🟡 coming back',
    closed: '🔴 gone',
    say: '💬 write',
    pause: 'Pause',
    play: 'Play',
    stall: '⏳ get stuck',
    bounce: '↺ leave & come back',
    makeHost: '👑 make host',
    add: '＋ Add',
    chattyOn: '🗣 Chatty: on',
    chattyOff: '🗣 Chatty: off',
    everyone: '🚪 Everyone leaves',
  },
  tr: {
    removed: 'odadan çıkarıldı',
    notYet: 'henüz odada değil',
    notSent: 'gönderilemedi (bağlantı kopuk)',
    none: 'Henüz sahte arkadaş yok. "Ekle" bir tane getirir.',
    outside: 'Sahte arkadaşlar bir odada çalışır.',
    host: '👑 yönetici',
    inRoom: '🟢 odada',
    door: '🟡 kapıda bekliyor',
    connecting: '🟡 bağlanıyor',
    reconnecting: '🟡 geri geliyor',
    closed: '🔴 gitti',
    say: '💬 yazsın',
    pause: 'Durdursun',
    play: 'Oynatsın',
    stall: '⏳ takılsın',
    bounce: '↺ çıkıp gelsin',
    makeHost: '👑 yönetici yap',
    add: '＋ Ekle',
    chattyOn: '🗣 Konuşkan: açık',
    chattyOff: '🗣 Konuşkan: kapalı',
    everyone: '🚪 Herkes çıksın',
  },
};
const tx = () => TEXT[labTr() ? 'tr' : 'en'];

export class FakeFriend {
  readonly name: string;
  readonly avatar: Avatar;
  readonly cid: string;
  readonly clock = new ServerClock();
  memberId: string | null = null;
  status: ConnectionStatus | 'door' | 'gone' = 'connecting';
  state: PlaybackState | null = null;
  hostId: string | null = null;
  members: Member[] = [];
  /** 🧪 Scenarios (DL5): the last chat lines this friend received (text, sender's name, private or not). */
  heard: { text: string; by: string; private: boolean }[] = [];
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
      case 'chat':
        this.heard.push({ text: message.message.text, by: message.message.by.name, private: !!message.message.to });
        if (this.heard.length > 30) this.heard.shift();
        return;
      case 'kicked':
        this.status = 'gone';
        this.log({ dir: 'lab', type: 'friends', text: `${this.name} ${tx().removed}` });
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
    if (!this.inRoom) throw labFail({ en: `${this.name} ${TEXT.en.notYet}`, tr: `${this.name} ${TEXT.tr.notYet}` });
    const ok = this.conn.send(message);
    if (!ok) throw labFail({ en: `${this.name}: ${TEXT.en.notSent}`, tr: `${this.name}: ${TEXT.tr.notSent}` });
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

  const needRoom = (): true | LabText => (roomId ? true : NOT_IN_ROOM);
  const needFriend = (): true | LabText => (roomId ? (friends.some((f) => f.inRoom) ? true : { en: 'add a fake friend first', tr: 'önce bir sahte arkadaş ekle' }) : NOT_IN_ROOM);
  const IN_ROOM = { en: 'in a room', tr: 'odada' };
  const ONE = { en: ' A number (1–5) picks which friend.', tr: ' Bir sayı (1–5) hangi arkadaş olduğunu seçer.' };
  /** The friend a command acts on: the given number (1–5) or a random one in the room. */
  const pick = (arg?: string): FakeFriend => {
    const n = Number(arg);
    const inRoom = friends.filter((f) => f.inRoom);
    const friend = Number.isInteger(n) && n >= 1 ? friends[n - 1] : inRoom[Math.floor(Math.random() * inRoom.length)];
    if (!friend) throw labFail({ en: 'no such fake friend', tr: 'böyle bir sahte arkadaş yok' });
    return friend;
  };

  function add(count: number): LabText {
    if (!roomId) throw labFail(NOT_IN_ROOM);
    const room = roomId;
    const room_ = Math.min(count, MAX_FRIENDS - friends.length);
    if (room_ <= 0) throw labFail({ en: `at most ${MAX_FRIENDS} fake friends`, tr: `en çok ${MAX_FRIENDS} sahte arkadaş` });
    const used = new Set(friends.map((f) => f.name));
    const added: string[] = [];
    for (let i = 0; i < room_; i++) {
      const name = NAMES.find((n) => !used.has(`🤖 ${n}`))!;
      used.add(`🤖 ${name}`);
      friends.push(new FakeFriend(room, name, changed, log));
      added.push(name);
    }
    changed();
    return { en: `added ${added.join(', ')}`, tr: `eklendi: ${added.join(', ')}` };
  }

  function removeAll(): LabText {
    const n = friends.length;
    for (const f of [...friends]) f.leave();
    friends.length = 0;
    setChatty(false);
    changed();
    return { en: `${n} left`, tr: `${n} kişi çıktı` };
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
          log({ dir: 'error', type: 'friends', text: errorText(error) });
        }
      }, pace * 1000);
    }
    changed();
  }

  const commands: LabCommand[] = [
    {
      id: 'friends.add',
      title: { en: 'Add a fake friend', tr: 'Sahte bir arkadaş ekle' },
      help: { en: `A 🤖 person joins this room and shows in the faces and the people list (at most ${MAX_FRIENDS}); with "Ask before letting people in" on, they knock at the door. Undo: everyone leaves.`, tr: `Odaya 🤖 bir kişi girer, yüzlerde ve kişi listesinde görünür (en çok ${MAX_FRIENDS}); "İçeri almadan önce sor" açıksa kapıyı çalar. Geri al: herkes çıkar.` },
      tab: 'friends',
      where: IN_ROOM,
      available: needRoom,
      run: () => add(1),
      undo: removeAll,
    },
    { id: 'friends.add3', title: { en: 'Add 3 fake friends', tr: '3 sahte arkadaş ekle' }, help: { en: 'Three 🤖 people join this room. Undo: everyone leaves.', tr: 'Odaya 🤖 üç kişi girer. Geri al: herkes çıkar.' }, tab: 'friends', where: IN_ROOM, available: needRoom, run: () => add(3), undo: removeAll },
    { id: 'friends.removeAll', title: { en: 'All fake friends leave', tr: 'Bütün sahte arkadaşlar çıksın' }, help: { en: 'Every fake friend leaves the room; the room shows only the real people again.', tr: 'Bütün sahte arkadaşlar odadan çıkar; odada yine sadece gerçek kişiler görünür.' }, tab: 'friends', available: () => (friends.length ? true : { en: 'no fake friends', tr: 'sahte arkadaş yok' }), run: removeAll },
    { id: 'friends.say', title: { en: 'A fake friend writes', tr: 'Sahte bir arkadaş yazsın' }, help: { en: `A chat line from them shows in my chat.${ONE.en}`, tr: `Onlardan bir mesaj sohbetimde görünür.${ONE.tr}` }, tab: 'friends', available: needFriend, run: (arg) => pick(arg).say() },
    { id: 'friends.react', title: { en: 'A fake friend sends an emoji', tr: 'Sahte bir arkadaş emoji göndersin' }, help: { en: `Their emoji flies over the video.${ONE.en}`, tr: `Emojileri videonun üstünde uçar.${ONE.tr}` }, tab: 'friends', available: needFriend, run: (arg) => pick(arg).react() },
    { id: 'friends.pause', title: { en: 'A fake friend pauses', tr: 'Sahte bir arkadaş durdursun' }, help: { en: `Everyone's video stops and "🤖 … paused" shows. Undo plays again.${ONE.en}`, tr: `Herkesin videosu durur, "🤖 … durdurdu" yazar. Geri al yeniden oynatır.${ONE.tr}` }, tab: 'friends', available: needFriend, run: (arg) => pick(arg).pause(), undo: () => pick().play() },
    { id: 'friends.play', title: { en: 'A fake friend plays', tr: 'Sahte bir arkadaş oynatsın' }, help: { en: `Everyone's video plays. Undo pauses.${ONE.en}`, tr: `Herkesin videosu oynar. Geri al durdurur.${ONE.tr}` }, tab: 'friends', available: needFriend, run: (arg) => pick(arg).play(), undo: () => pick().pause() },
    {
      id: 'friends.seek',
      title: { en: 'A fake friend jumps 30 s ahead', tr: 'Sahte bir arkadaş 30 sn ileri atlasın' },
      help: { en: `Everyone's video jumps 30 s ahead together. Undo jumps back.${ONE.en}`, tr: `Herkesin videosu birlikte 30 sn ileri atlar. Geri al geri atlar.${ONE.tr}` },
      tab: 'friends',
      available: needFriend,
      run: (arg) => {
        const to = pick(arg).seek(30).toFixed(1);
        return { en: `to ${to} s`, tr: `${to}. sn'ye` };
      },
      undo: () => {
        const to = pick().seek(-30).toFixed(1);
        return { en: `to ${to} s`, tr: `${to}. sn'ye` };
      },
    },
    { id: 'friends.stall', title: { en: 'A fake friend\'s video gets stuck for 5 s', tr: 'Sahte bir arkadaşın videosu 5 sn takılsın' }, help: { en: `The room pauses with "waiting for 🤖 …" and plays on when they are ready.${ONE.en}`, tr: `Oda "🤖 … bekleniyor" diye durur, hazır olunca devam eder.${ONE.tr}` }, tab: 'friends', available: needFriend, run: (arg) => pick(arg).stallFor(5) },
    { id: 'friends.bounce', title: { en: 'A fake friend leaves and comes back', tr: 'Sahte bir arkadaş çıkıp geri gelsin' }, help: { en: `Their connection drops; after 5 s they are back as the same person (not twice in the list).${ONE.en}`, tr: `Bağlantısı kopar; 5 sn sonra aynı kişi olarak geri gelir (listede iki kez görünmez).${ONE.tr}` }, tab: 'friends', available: needFriend, run: (arg) => { const f = pick(arg); f.bounce(5); return f.name; } },
    {
      id: 'friends.host',
      title: { en: 'Make a fake friend the host', tr: 'Sahte bir arkadaşı yönetici yap' },
      help: { en: `I hand the host role to them, the same way as 👑 Make host: the chat says so and I become a guest. Undo: they hand it back to me.${ONE.en}`, tr: `Yöneticiliği ona veririm, 👑 Yönetici yap ile aynı yoldan: sohbet bunu yazar, ben misafir olurum. Geri al: bana geri verir.${ONE.tr}` },
      tab: 'friends',
      available: needFriend,
      run: (arg) => {
        const f = pick(arg);
        const room = debugRoom();
        if (!f.memberId || !room?.makeHost) throw labFail({ en: 'not in a room yet', tr: 'henüz odada değil' });
        room.makeHost(f.memberId);
        hostFriend = f;
        return f.name;
      },
      // LAB2: the friend hands it back the same way (they are the real host now), so the host's commands work again.
      undo: () => {
        const f = hostFriend;
        const me = debugRoom()?.lab?.memberId();
        if (!f?.inRoom || !me) throw labFail({ en: 'that fake friend has left (the role moved on by itself)', tr: 'o sahte arkadaş çıktı (yöneticilik kendiliğinden geçti)' });
        f.send({ t: 'make-host', id: me });
        hostFriend = null;
        return f.name;
      },
    },
    {
      id: 'friends.chatty',
      title: { en: 'Fake friends chat by themselves (on / off)', tr: 'Sahte arkadaşlar kendi kendine konuşsun (aç / kapat)' },
      help: { en: `They write and send emojis on their own every ${pace} s, like a lively room. A number 2, 5 or 10 sets how often.`, tr: `Hareketli bir oda gibi her ${pace} sn'de bir kendileri yazar ve emoji gönderir. 2, 5 ya da 10 yazarsan sıklığı o olur.` },
      tab: 'friends',
      available: needFriend,
      run: (arg) => {
        const n = Number(arg);
        if (PACES.includes(n as (typeof PACES)[number])) pace = n as (typeof PACES)[number];
        setChatty(!chatty || !!arg);
        return chatty ? { en: `on, every ${pace} s`, tr: `açık, ${pace} sn'de bir` } : { en: 'off', tr: 'kapalı' };
      },
      undo: () => setChatty(false),
    },
  ];

  /** The 👥 tab: one row per friend with its quick buttons. */
  function view(run: (id: string, arg?: string) => void): HTMLElement {
    const box = el('div', { class: 'lab-friends' });
    const t = tx();
    if (!friends.length) box.append(el('p', { class: 'muted' }, roomId ? t.none : t.outside));
    friends.forEach((f, i) => {
      const n = String(i + 1);
      const label = f.status === 'open' ? (f.memberId && f.hostId === f.memberId ? t.host : t.inRoom) : f.status === 'door' ? t.door : f.status === 'connecting' ? t.connecting : f.status === 'reconnecting' ? t.reconnecting : f.status === 'closed' || f.status === 'gone' ? t.closed : f.status;
      const quick = (id: string, text: string) => {
        const b = el('button', { type: 'button', class: 'btn debug-small', 'data-friend': n, 'data-command': id }, text);
        b.disabled = !f.inRoom;
        b.addEventListener('click', () => run(id, n));
        return b;
      };
      box.append(
        el('div', { class: 'lab-friend', 'data-friend': n },
          el('div', { class: 'lab-friend-head' }, el('img', { src: `/avatars/${f.avatar}.svg`, alt: '', width: '24', height: '24' }), el('strong', {}, f.name), el('span', { class: 'lab-tag' }, label)),
          el('div', { class: 'debug-actions' }, quick('friends.say', t.say), quick('friends.react', '😀'), quick('friends.pause', t.pause), quick('friends.play', t.play), quick('friends.seek', '+30 s'), quick('friends.stall', t.stall), quick('friends.bounce', t.bounce), quick('friends.host', t.makeHost)),
        ),
      );
    });
    const addButton = el('button', { type: 'button', class: 'btn primary debug-small lab-friend-add', 'data-command': 'friends.add' }, `${t.add} (${friends.length}/${MAX_FRIENDS})`);
    addButton.disabled = !roomId || friends.length >= MAX_FRIENDS;
    addButton.addEventListener('click', () => run('friends.add'));
    const chattyButton = el('button', { type: 'button', class: 'btn debug-small lab-friend-chatty', 'data-command': 'friends.chatty' }, chatty ? `${t.chattyOn} (${pace} s)` : t.chattyOff);
    chattyButton.disabled = !friends.some((f) => f.inRoom);
    chattyButton.addEventListener('click', () => run('friends.chatty'));
    const allButton = el('button', { type: 'button', class: 'btn debug-small', 'data-command': 'friends.removeAll' }, t.everyone);
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
    /** 🧪 Scenarios (DL5): the friends themselves, adding and removing them. */
    list: (): readonly FakeFriend[] => friends,
    add,
    removeAll,
    close: () => {
      removeAll();
      removeEventListener('pagehide', removeAll);
    },
  };
}
