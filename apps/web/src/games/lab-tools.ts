// 🐞 Test Lab, games part (card DL3, Game Studio). The hall's commands (open any game, side-game time ×10, "pretend the
// film plays", restore my real saves) and the sandbox the side games' own lab commands use: before the first cheat a
// game's real save is copied aside, and "Restore my real saves" puts every copy back. Nothing here talks to the server.
// With the lab off, `debugHooks.register` only stores the factory; it runs only while the lab is open.

import { ROOM_GAME_KINDS, type ClientMessage, type RoomGame, type RoomGameKind } from '@swm/shared/protocol';
import { SOLO_KINDS, type SoloKind, type SoloRoom } from '@swm/shared/games/catalog';
import { debugHooks, type LabCommand, type LabText } from '../debug-lab.ts';
import { LOCAL_ONLY, labServerHere } from './lab-server.ts';
import { load, save } from '../storage.ts';

/** Side games: how fast their clock runs, and whether they act as if the room's film played. */
export const labClock = { speed: 1, playing: false };
/** The fake film "pretend the film plays" gives the side games (an hour long, its position moving with time). */
const LAB_FILM = 'lab-film';
let labFilmStart = 0;

/** The save keys the side games keep (the sandbox copies only these). */
export const SIDE_SAVES = ['snackBar', 'windowGarden', 'fiveFrames'] as const;
const REAL = 'lab:real:';
/** The event an open side game listens to: its save was put back, read it again. */
export const RESTORE_EVENT = 'swm-lab-restore';

function realCopy(key: string): string | null {
  try {
    return localStorage.getItem(REAL + key);
  } catch {
    return null;
  }
}

/** Before a game's first lab cheat: keep its real save aside (once; later cheats change only the sandbox). */
export function sandbox(key: string): void {
  if (realCopy(key) !== null) return;
  try {
    localStorage.setItem(REAL + key, load(key) ?? '');
  } catch {
    /* storage blocked: the cheat still works, there is just nothing to restore */
  }
}

export const sandboxed = (): string[] => SIDE_SAVES.filter((key) => realCopy(key) !== null);

/** Puts every real save back (through `save`, so the extension's copy follows) and tells open games to reload. */
export function restoreSaves(): string[] {
  const done: string[] = [];
  for (const key of SIDE_SAVES) {
    const real = realCopy(key);
    if (real === null) continue;
    save(key, real);
    try {
      localStorage.removeItem(REAL + key);
    } catch {
      /* ignore */
    }
    done.push(key);
  }
  if (done.length) dispatchEvent(new CustomEvent(RESTORE_EVENT, { detail: done }));
  return done;
}

/** The room as the side games see it, with the lab's "pretend the film plays". */
export function labRoom(r: SoloRoom): SoloRoom {
  if (!labClock.playing || r.playing) return r;
  const position = (Date.now() - labFilmStart) / 1000;
  return { ...r, playing: true, item: r.item ?? { id: LAB_FILM, duration: 3600, position, title: 'Lab film' } };
}

/** How many ticks a side game runs for one real tick (×10 time). */
export const labTicks = (): number => labClock.speed;

const SOLO_NAMES: Record<SoloKind, { en: string; tr: string }> = {
  snack: { en: 'Snack Bar', tr: 'Büfe' },
  garden: { en: 'Window Garden', tr: 'Pencere Bahçesi' },
  word: { en: 'Five Frames', tr: 'Beş Kare' },
};
const IN_ROOM = { en: 'in a room', tr: 'odada' };

/** The hall's commands, registered once by the games stage. */
/** LAB2: the tables a 🤖 friend can sit at (`lab-table-friend.ts`, loaded only when one sits down). */
const FRIEND_KINDS: readonly RoomGameKind[] = ['quiz', 'draw', 'poker', 'duel', 'sea'];
let friendsAtTables = 0;

export function registerGamesLab(
  openTable: (kind: RoomGameKind) => void,
  openSolo: (kind: SoloKind) => Promise<void>,
  send: (message: ClientMessage) => unknown,
  table: () => RoomGame | null = () => null,
): () => void {
  return debugHooks.register('games', () => {
    const commands: LabCommand[] = [
      ...ROOM_GAME_KINDS.map((kind): LabCommand => ({
        id: `games.open.${kind}`,
        title: { en: `Open a table: ${kind}`, tr: `Masa aç: ${kind}` },
        help: { en: 'Opens this game as a table in the room, the same as from the games hall; the others get the invite.', tr: 'Bu oyunu odada masa olarak açar, oyun salonundan açmakla aynı; diğerlerine davet gider.' },
        tab: 'games',
        where: IN_ROOM,
        run: () => openTable(kind),
      })),
      ...SOLO_KINDS.map((kind): LabCommand => ({
        id: `games.open.${kind}`,
        title: { en: `Open on the side: ${SOLO_NAMES[kind].en}`, tr: `Yanda aç: ${SOLO_NAMES[kind].tr}` },
        help: { en: 'Opens this side game in the game window.', tr: 'Bu yan oyunu oyun penceresinde açar.' },
        tab: 'games',
        where: IN_ROOM,
        run: () => void openSolo(kind),
      })),
      {
        id: 'games.speed',
        title: labClock.speed > 1 ? { en: 'Side games: normal time', tr: 'Yan oyunlar: zaman normal aksın' } : { en: 'Side games: time ×10', tr: 'Yan oyunlar: zaman 10 kat hızlı aksın' },
        help: { en: 'Snack Bar and Window Garden run ten times faster: coins and plants grow quickly (a number 1–30 sets the speed).', tr: 'Büfe ve Pencere Bahçesi 10 kat hızlı işler: jetonlar ve bitkiler çabuk büyür (1–30 arası bir sayı hızı belirler).' },
        tab: 'games',
        run: (arg) => {
          const was = labClock.speed;
          const asked = Number(arg);
          labClock.speed = Number.isFinite(asked) && asked >= 1 ? Math.min(30, Math.round(asked)) : was > 1 ? 1 : 10;
          return `×${labClock.speed}`;
        },
        undo: () => {
          labClock.speed = 1;
        },
      },
      {
        id: 'games.playing',
        title: labClock.playing ? { en: 'Side games: stop pretending', tr: 'Yan oyunlar: rol yapmayı bırak' } : { en: 'Side games: pretend the film plays', tr: 'Yan oyunlar: film oynuyormuş gibi yap' },
        help: { en: 'The side games act as if the room played an hour-long film, so they earn and grow; the room itself gets nothing.', tr: 'Yan oyunlar odada bir saatlik film oynuyormuş gibi davranır, kazanır ve büyür; odaya hiçbir şey gitmez.' },
        tab: 'games',
        run: () => {
          labClock.playing = !labClock.playing;
          if (labClock.playing) labFilmStart = Date.now();
          return labClock.playing ? { en: 'pretending', tr: 'rol yapıyor' } : { en: 'off', tr: 'kapalı' };
        },
        undo: () => {
          labClock.playing = false;
        },
      },
      {
        id: 'games.tipjar',
        title: { en: 'Fill the tip jar now', tr: 'Bahşiş kavanozunu hemen doldur' },
        help: { en: 'Local lab server only: the room\'s tip jar fills for the film playing (+10 % for everyone this film).', tr: 'Sadece yerel lab sunucusunda: odanın bahşiş kavanozu oynayan film için dolar (bu film boyunca herkese +%10).' },
        tab: 'games',
        where: { en: 'in a room with a film', tr: 'film oynayan bir odada' },
        available: () => labServerHere() || LOCAL_ONLY,
        run: () => void send({ t: 'lab', op: 'tipjar' }),
      },
      {
        id: 'games.friend',
        title: { en: 'A 🤖 friend sits at this table', tr: 'Bu masaya 🤖 bir arkadaş otursun' },
        help: {
          en: 'A pretend player joins the open table and plays along: answers the quiz, draws and guesses, checks or calls in Last Heart, presses Ready and guesses words in the Duel, places a fleet and shoots in Sea Battle. It never presses Start: you do. Classics: play Stub instead. Undo: it leaves.',
          tr: 'Açık masaya sahte bir oyuncu oturur ve oynar: bilgi yarışmasını cevaplar, çizer ve tahmin eder, Son Kalp’te bekler ya da görür, Düello’da Hazır’a basıp kelime dener, Amiral Battı’da filosunu dizip atış yapar. Başlat’a hiç basmaz: sen basarsın. Klasikler: onun yerine Stub’a karşı oyna. Geri al: kalkar.',
        },
        tab: 'games',
        where: { en: 'at a Quiz, Draw & Guess, Last Heart, Duel or Sea Battle table', tr: 'Bilgi yarışması, Çiz-Bil, Son Kalp, Düello ya da Amiral Battı masasında' },
        available: () => {
          const open = table();
          if (!open) return { en: 'open a table first', tr: 'önce bir masa aç' };
          return FRIEND_KINDS.includes(open.kind) || { en: 'at the Classics play Stub instead (Easy / Medium)', tr: 'Klasiklerde onun yerine Stub’a karşı oyna (Kolay / Orta)' };
        },
        run: async () => {
          const open = table()!;
          const m = await import('./lab-table-friend.ts');
          if (!m.canSit(open.kind)) return '';
          const name = m.sitFriend(open.kind, open.id);
          friendsAtTables = m.tableFriends().length;
          return name;
        },
        undo: async () => {
          const m = await import('./lab-table-friend.ts');
          m.leaveFriends();
          friendsAtTables = 0;
        },
      },
      {
        // LAB2 (hand test G10): a friend's network drops in the middle of a game.
        id: 'games.friendQuiet',
        title: { en: 'The 🤖 friend loses the connection for 2 minutes', tr: '🤖 arkadaşın bağlantısı 2 dakika kopsun' },
        help: {
          en: 'The friend at the table sends nothing for 2 minutes, as if its phone lost data: after about 1.5 minutes the table shows it offline, the game goes on without it; then it comes back.',
          tr: 'Masadaki arkadaş 2 dakika hiçbir şey göndermez, telefonunun interneti gitmiş gibi: yaklaşık 1,5 dakika sonra masa onu çevrimdışı gösterir, oyun onsuz sürer; sonra geri gelir.',
        },
        tab: 'games',
        available: () => friendsAtTables > 0 || { en: 'no 🤖 friend sits at a table', tr: 'masada oturan 🤖 arkadaş yok' },
        run: async () => {
          const m = await import('./lab-table-friend.ts');
          return { en: `${m.quietFriends(120_000)} quiet for 2 min`, tr: `${m.quietFriends(120_000)} kişi 2 dk sessiz` };
        },
      },
      {
        id: 'games.friendLeave',
        title: { en: 'The 🤖 friends leave the tables', tr: '🤖 arkadaşlar masalardan kalksın' },
        help: { en: 'Every pretend player at a table leaves (as if they closed their tab).', tr: 'Masadaki bütün sahte oyuncular kalkar (sekmelerini kapatmış gibi).' },
        tab: 'games',
        available: () => friendsAtTables > 0 || { en: 'no 🤖 friend sits at a table', tr: 'masada oturan 🤖 arkadaş yok' },
        run: async () => {
          const m = await import('./lab-table-friend.ts');
          const n = m.leaveFriends();
          friendsAtTables = 0;
          return { en: `${n} left`, tr: `${n} kişi kalktı` };
        },
      },
      {
        id: 'games.restore',
        title: { en: 'Restore my real saves', tr: 'Gerçek kayıtlarımı geri getir' },
        help: { en: 'Puts back the side-game saves the lab kept aside before its first cheat: my real coins and plants come back.', tr: 'Lab\'ın ilk hileden önce kenara ayırdığı yan oyun kayıtlarını geri koyar: gerçek jetonlarım ve bitkilerim geri gelir.' },
        tab: 'games',
        available: () => sandboxed().length > 0 || { en: 'no lab cheat used yet: the saves are the real ones', tr: 'henüz lab hilesi kullanılmadı: kayıtlar zaten gerçek' },
        run: () => restoreSaves().join(', '),
      },
    ];
    return {
      commands,
      status: (): [LabText, LabText][] => [
        [{ en: 'Side-game time', tr: 'Yan oyun zamanı' }, { en: `×${labClock.speed}${labClock.playing ? ' · pretending the film plays' : ''}`, tr: `×${labClock.speed}${labClock.playing ? ' · film oynuyormuş gibi' : ''}` }],
        [{ en: 'Saves kept aside', tr: 'Kenara ayrılan kayıtlar' }, sandboxed().join(', ') || { en: 'none', tr: 'yok' }],
        [{ en: '🤖 friends at tables', tr: 'Masadaki 🤖 arkadaşlar' }, String(friendsAtTables)],
      ],
    };
  });
}

/** For a side game: register its own commands while its window is open; each run is sandboxed first. */
export function registerSideLab(name: string, key: (typeof SIDE_SAVES)[number], commands: () => LabCommand[], status?: () => [LabText, LabText][]): () => void {
  return debugHooks.register(name, () => ({
    commands: commands().map((c) => ({
      ...c,
      run: (arg?: string) => {
        sandbox(key);
        return c.run(arg);
      },
    })),
    status,
  }));
}
