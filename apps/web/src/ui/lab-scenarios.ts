// 🐞 Test Lab, 🧪 Scenarios (card DL5, lane B): one-click scripted checks of two-person flows, run with the fake friends
// (DL2) and the 🎬 accidents (DL4). Each step says ✓ or ✗ (with why); a scenario stops at its first ✗ and always cleans
// up after itself (its friends leave, a setting it changed goes back). Everything goes through the room's own paths
// (`DebugRoom.lab`, the friends' ordinary connections) and the page as it shows; nothing here is a server power. Part of
// the lab chunk (lazy, never loaded with the lab off).
import { el } from '../dom.ts';
import { debugRoom, labFail, type LabCommand, type LabText, type RoomLab } from '../debug-lab.ts';
import { errorText, say } from './lab-text.ts';
import type { FakeFriend } from './lab-friends.ts';

export interface ScenarioFriends {
  list(): readonly FakeFriend[];
  add(count: number): LabText;
  removeAll(): LabText;
}

type Mark = 'ok' | 'fail' | 'skip';
export interface StepResult {
  title: LabText;
  mark: Mark;
  ms: number;
  note?: string;
}
export interface ScenarioResult {
  id: string;
  ok: boolean;
  steps: StepResult[];
  at: number;
}

interface Ctx {
  room: RoomLab;
  friends: ScenarioFriends;
  /** The fake friends in the room now (index 0 = the first one added). */
  inRoom(): FakeFriend[];
  /** Polls `fn` until it gives something truthy (then returned) or `ms` pass (then throws `why`). */
  until<T>(fn: () => T | null | undefined | false, why: LabText, ms?: number): Promise<T>;
  /** One lab command by id (the 🎬 ones), as the command box runs it. */
  command(id: string, arg?: string): Promise<unknown>;
  /** Puts something back when the scenario ends, whatever happened. */
  cleanup(fn: () => void): void;
  /** Values one step leaves for the next. */
  memo: Record<string, string | null>;
}
interface Step {
  title: LabText;
  run: (ctx: Ctx) => Promise<string | void> | string | void;
}
interface Scenario {
  id: string;
  title: LabText;
  help: LabText;
  /** True when it can run now, otherwise why not. */
  needs?: (room: RoomLab) => true | LabText;
  steps: Step[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const chatHas = (text: string) => [...document.querySelectorAll('#chat-list .chat-line, .chat-panel .chat-line')].some((l) => l.textContent?.includes(text));
const shown = (selector: string) => {
  const e = document.querySelector<HTMLElement>(selector);
  return !!e && !e.hidden && e.getClientRects().length > 0;
};
const stamp = () => Math.random().toString(36).slice(2, 6);

/** Friends join and the room shows them; resolves with the new ones. */
async function addFriends(ctx: Ctx, count: number): Promise<FakeFriend[]> {
  const before = ctx.inRoom().length;
  ctx.friends.add(count);
  ctx.cleanup(() => ctx.friends.removeAll());
  await ctx.until(() => ctx.inRoom().length >= before + count, { en: `${count} fake friend(s) did not get in`, tr: `${count} sahte arkadaş içeri giremedi` }, 12_000);
  return ctx.inRoom().slice(before);
}
async function withVideo(ctx: Ctx): Promise<string> {
  if (ctx.room.playback().item) return say({ en: 'a video is already playing', tr: 'zaten bir video oynuyor' });
  ctx.room.syncTest();
  await ctx.until(() => ctx.room.playback().item && !ctx.room.playback().paused, { en: 'the sync test did not start', tr: 'senkron testi başlamadı' }, 8000);
  return say({ en: 'sync test playing', tr: 'senkron testi oynuyor' });
}

const A_FRIEND_JOINS = { en: 'a fake friend joins', tr: 'sahte bir arkadaş girer' };
const A_VIDEO_PLAYS = { en: 'a video plays', tr: 'bir video oynar' };

const SCENARIOS: Scenario[] = [
  {
    id: 'basics',
    title: { en: 'Two people: join, chat, pause / play, leave', tr: 'İki kişi: gir, yaz, durdur / oynat, çık' },
    help: {
      en: 'A fake friend joins, writes, pauses and plays the room (the sync test), then leaves: each step must show on my screen.',
      tr: 'Sahte bir arkadaş girer, yazar, odayı durdurur ve oynatır (senkron testi), sonra çıkar: her adım benim ekranımda görünmeli.',
    },
    steps: [
      { title: A_FRIEND_JOINS, run: async (ctx) => (await addFriends(ctx, 1))[0]!.name },
      {
        title: { en: 'their message shows in my chat', tr: 'mesajı benim sohbetimde görünür' },
        run: async (ctx) => {
          const text = `hello ${stamp()}`;
          ctx.inRoom()[0]!.say(text);
          await ctx.until(() => chatHas(text), { en: 'the message never showed', tr: 'mesaj hiç görünmedi' });
        },
      },
      { title: A_VIDEO_PLAYS, run: (ctx) => withVideo(ctx) },
      {
        title: { en: 'they pause: the room pauses for me', tr: 'durdurur: oda bende de durur' },
        run: async (ctx) => {
          ctx.inRoom()[0]!.pause();
          await ctx.until(() => ctx.room.playback().paused, { en: 'still playing', tr: 'hâlâ oynuyor' });
        },
      },
      {
        title: { en: 'they play: the room plays for me', tr: 'oynatır: oda bende de oynar' },
        run: async (ctx) => {
          ctx.inRoom()[0]!.play();
          await ctx.until(() => !ctx.room.playback().paused, { en: 'still paused', tr: 'hâlâ duruyor' });
        },
      },
      {
        title: { en: 'they leave: only I am in the room', tr: 'çıkar: odada sadece ben kalırım' },
        run: async (ctx) => {
          const name = ctx.inRoom()[0]!.name;
          ctx.inRoom()[0]!.leave();
          await ctx.until(() => !ctx.room.members().some((m) => m.name === name), { en: `${name} is still listed`, tr: `${name} hâlâ listede` });
        },
      },
    ],
  },
  {
    id: 'wait',
    title: { en: 'Everyone ready: the room waits for a stuck friend', tr: 'Herkes hazır: oda takılan arkadaşı bekler' },
    help: {
      en: 'A fake friend\'s video gets stuck for 5 s: the room pauses with the waiting note, then plays on by itself.',
      tr: 'Sahte bir arkadaşın videosu 5 sn takılır: oda bekleme notuyla durur, sonra kendiliğinden devam eder.',
    },
    steps: [
      { title: A_FRIEND_JOINS, run: async (ctx) => (await addFriends(ctx, 1))[0]!.name },
      { title: A_VIDEO_PLAYS, run: (ctx) => withVideo(ctx) },
      {
        title: { en: 'they get stuck: the room waits (the note shows)', tr: 'takılır: oda bekler (not görünür)' },
        run: async (ctx) => {
          ctx.inRoom()[0]!.stallFor(5);
          await ctx.until(() => shown('#waiting-banner') && ctx.room.playback().paused, { en: 'the room did not wait', tr: 'oda beklemedi' }, 6000);
        },
      },
      {
        title: { en: 'it plays on by itself once they are ready', tr: 'hazır olunca kendiliğinden devam eder' },
        run: async (ctx) => {
          await ctx.until(() => !shown('#waiting-banner') && !ctx.room.playback().paused, { en: 'still waiting', tr: 'hâlâ bekliyor' }, 15_000);
        },
      },
    ],
  },
  {
    id: 'knock',
    title: { en: 'Knock: a newcomer waits at the door until I let them in', tr: 'Kapı: yeni gelen ben içeri alana kadar kapıda bekler' },
    help: {
      en: 'With "Ask before letting people in" on (I must be the host), a fake friend knocks, I press Let in on their card and they are in. The setting goes back afterwards.',
      tr: '"İçeri almadan önce sor" açıkken (yönetici ben olmalıyım) sahte bir arkadaş kapıyı çalar, kartında İçeri al\'a basarım ve içeri girer. Ayar sonra eski haline döner.',
    },
    needs: (room) => (room.isHost() ? true : { en: 'only the host can', tr: 'sadece yönetici yapabilir' }),
    steps: [
      {
        title: { en: 'the door is on', tr: 'kapı açık' },
        run: async (ctx) => {
          const was = ctx.room.knockOn();
          ctx.cleanup(() => ctx.room.knock(was));
          if (!ctx.room.knock(true)) throw labFail({ en: 'only the host can', tr: 'sadece yönetici yapabilir' });
          await ctx.until(() => ctx.room.knockOn(), { en: 'the setting did not change', tr: 'ayar değişmedi' });
        },
      },
      {
        title: { en: 'a fake friend knocks and waits at the door', tr: 'sahte bir arkadaş kapıyı çalar ve bekler' },
        run: async (ctx) => {
          ctx.friends.add(1);
          ctx.cleanup(() => ctx.friends.removeAll());
          const friend = await ctx.until(() => ctx.friends.list().find((f) => f.status === 'door'), { en: 'nobody waited at the door', tr: 'kapıda kimse beklemedi' }, 10_000);
          return friend.name;
        },
      },
      {
        title: { en: 'their card shows on my screen', tr: 'kartı benim ekranımda görünür' },
        run: async (ctx) => {
          await ctx.until(() => document.querySelector('#knock-cards .knock-card .knock-allow'), { en: 'no knock card', tr: 'kapı kartı yok' });
        },
      },
      {
        title: { en: 'Let in: they are in the room', tr: 'İçeri al: odaya girer' },
        run: async (ctx) => {
          document.querySelector<HTMLButtonElement>('#knock-cards .knock-card .knock-allow')!.click();
          await ctx.until(() => ctx.inRoom().length === 1, { en: 'they are still at the door', tr: 'hâlâ kapıda' }, 8000);
        },
      },
    ],
  },
  {
    id: 'private',
    title: { en: 'A private message reaches one person only', tr: 'Özel mesaj sadece bir kişiye gider' },
    help: {
      en: 'Two fake friends; I write privately to the first (the person menu\'s way): my bubble says private, the first gets it, the second never does.',
      tr: 'İki sahte arkadaş; ilkine özel yazarım (kişi menüsündeki yoldan): balonumda özel yazar, ilki alır, ikincisi hiç almaz.',
    },
    steps: [
      { title: { en: 'two fake friends join', tr: 'iki sahte arkadaş girer' }, run: async (ctx) => (await addFriends(ctx, 2)).map((f) => f.name).join(', ') },
      {
        title: { en: 'I write privately to the first', tr: 'ilkine özel yazarım' },
        run: async (ctx) => {
          const [first] = ctx.inRoom();
          if (!ctx.room.openPrivate(first!.memberId!)) throw labFail({ en: 'no such person in the room', tr: 'odada böyle biri yok' });
          const text = `secret ${stamp()}`;
          ctx.room.write(text);
          ctx.memo.text = text;
          await ctx.until(() => [...document.querySelectorAll('.chat-line.private')].some((l) => l.textContent?.includes(text)), { en: 'my private bubble never showed', tr: 'özel balonum hiç görünmedi' });
        },
      },
      {
        title: { en: 'the first fake friend got it, marked private', tr: 'ilk sahte arkadaş özel olarak aldı' },
        run: async (ctx) => {
          const text = ctx.memo.text!;
          await ctx.until(() => ctx.inRoom()[0]!.heard.find((h) => h.text === text && h.private), { en: 'it never arrived', tr: 'hiç gelmedi' });
        },
      },
      {
        title: { en: 'the second fake friend never got it', tr: 'ikinci sahte arkadaş hiç almadı' },
        run: async (ctx) => {
          const text = ctx.memo.text!;
          await sleep(1200);
          if (ctx.inRoom()[1]!.heard.some((h) => h.text === text)) throw labFail({ en: 'the second friend got it', tr: 'ikinci arkadaş da aldı' });
        },
      },
    ],
  },
  {
    id: 'reconnect',
    title: { en: 'My connection drops while a friend writes', tr: 'Arkadaşım yazarken bağlantım kopar' },
    help: {
      en: 'My connection is down for 4 s while a fake friend writes: I come back as the same person, still with them, and their message reaches me.',
      tr: 'Sahte bir arkadaş yazarken bağlantım 4 sn kopar: aynı kişi olarak geri dönerim, hâlâ onunlayım ve mesajı bana ulaşır.',
    },
    steps: [
      { title: A_FRIEND_JOINS, run: async (ctx) => (await addFriends(ctx, 1))[0]!.name },
      {
        title: { en: 'my connection drops', tr: 'bağlantım kopar' },
        run: async (ctx) => {
          const id = ctx.room.memberId();
          ctx.memo.id = id;
          await ctx.command('net.drop', '4');
          await ctx.until(() => ctx.room.transport() === null, { en: 'still connected', tr: 'hâlâ bağlı' }, 3000);
        },
      },
      {
        title: { en: 'they write while I am away', tr: 'ben yokken yazar' },
        run: async (ctx) => {
          const text = `while away ${stamp()}`;
          ctx.inRoom()[0]!.say(text);
          ctx.memo.text = text;
        },
      },
      {
        title: { en: 'I am back as the same person', tr: 'aynı kişi olarak geri dönerim' },
        run: async (ctx) => {
          await ctx.until(() => ctx.room.transport() !== null && ctx.room.memberId() !== null, { en: 'not back', tr: 'geri dönmedi' }, 15_000);
          const before = ctx.memo.id;
          const now = ctx.room.memberId();
          if (now !== before) throw labFail({ en: `came back as someone new (${before} → ${now})`, tr: `yeni biri olarak döndü (${before} → ${now})` });
        },
      },
      {
        title: { en: 'their message reached me and they are still here', tr: 'mesajı bana ulaştı ve hâlâ burada' },
        run: async (ctx) => {
          const text = ctx.memo.text!;
          await ctx.until(() => chatHas(text), { en: 'the message is missing', tr: 'mesaj eksik' });
          const n = () => ctx.room.members().length;
          await ctx.until(() => n() === 2, { en: `${n()} people`, tr: `${n()} kişi` });
        },
      },
    ],
  },
  {
    id: 'selfTest',
    title: { en: 'Lab self-test: a scenario that fails on purpose', tr: 'Lab kendini dener: bilerek bozulan senaryo' },
    help: {
      en: 'Its second step fails on purpose: it must show ✗ with the reason and skip the rest (–), and the room keeps working.',
      tr: 'İkinci adımı bilerek bozulur: nedeniyle birlikte ✗ göstermeli, kalanları atlamalı (–) ve oda çalışmaya devam etmeli.',
    },
    steps: [
      { title: { en: 'a step that passes', tr: 'geçen bir adım' }, run: () => say({ en: 'fine', tr: 'tamam' }) },
      {
        title: { en: 'a step that fails on purpose', tr: 'bilerek bozulan bir adım' },
        run: () => {
          throw labFail({ en: 'self-test: this failure is expected', tr: 'kendini deneme: bu hata bekleniyor' });
        },
      },
      { title: { en: 'a step after the failure', tr: 'hatadan sonraki adım' }, run: () => say({ en: 'never runs', tr: 'hiç çalışmaz' }) },
    ],
  },
];

export function createScenarios(friends: ScenarioFriends, command: (id: string, arg?: string) => Promise<unknown>) {
  const results = new Map<string, ScenarioResult>();
  const listeners = new Set<() => void>();
  let running: string | null = null;
  const changed = () => {
    for (const fn of listeners) fn();
  };

  async function play(scenario: Scenario): Promise<ScenarioResult> {
    const room = debugRoom()?.lab;
    if (!room) throw labFail({ en: 'not in a room', tr: 'odada değilsin' });
    if (running) throw labFail({ en: `"${running}" is still running`, tr: `"${running}" hâlâ çalışıyor` });
    running = scenario.id;
    const cleanups: (() => void)[] = [];
    const ctx: Ctx = {
      room,
      friends,
      inRoom: () => friends.list().filter((f) => f.inRoom),
      until: async (fn, why, ms = 8000) => {
        const end = Date.now() + ms;
        for (;;) {
          const v = fn();
          if (v) return v as never;
          if (Date.now() > end) throw labFail(why);
          await sleep(150);
        }
      },
      command,
      cleanup: (fn) => cleanups.push(fn),
      memo: {},
    };
    const steps: StepResult[] = [];
    const result: ScenarioResult = { id: scenario.id, ok: true, steps, at: Date.now() };
    results.set(scenario.id, result);
    try {
      for (const step of scenario.steps) {
        if (!result.ok) {
          steps.push({ title: step.title, mark: 'skip', ms: 0 });
          continue;
        }
        const start = performance.now();
        try {
          const note = await step.run(ctx);
          steps.push({ title: step.title, mark: 'ok', ms: Math.round(performance.now() - start), ...(note ? { note } : {}) });
        } catch (error) {
          result.ok = false;
          steps.push({ title: step.title, mark: 'fail', ms: Math.round(performance.now() - start), note: errorText(error) });
        }
        changed();
      }
    } finally {
      // Put back what it changed, newest first; a cleanup that throws never hides the result.
      for (const fn of cleanups.reverse()) {
        try {
          fn();
        } catch {
          // Nothing to put back.
        }
      }
      running = null;
      changed();
    }
    return result;
  }

  const summary = (r: ScenarioResult) => {
    const passed = r.steps.filter((s) => s.mark === 'ok').length;
    const failed = r.steps.find((s) => s.mark === 'fail');
    return `${r.ok ? '✓' : '✗'} ${passed}/${r.steps.length}${failed ? ` · ✗ ${say(failed.title)}: ${failed.note ?? ''}` : ''}`;
  };

  const commands: LabCommand[] = SCENARIOS.map((s) => ({
    id: `scenario.${s.id}`,
    title: typeof s.title === 'string' ? s.title : { en: `Scenario: ${s.title.en}`, tr: `Senaryo: ${s.title.tr}` },
    help: s.help,
    tab: 'scenarios',
    where: { en: 'in a room', tr: 'odada' },
    available: () => {
      const room = debugRoom()?.lab;
      if (!room) return { en: 'not in a room', tr: 'odada değilsin' };
      if (running) return { en: `"${running}" is running`, tr: `"${running}" çalışıyor` };
      return s.needs ? s.needs(room) : true;
    },
    run: async () => {
      const r = await play(s);
      // A failed check is a red line in the log (the command "failed"), with the step that broke.
      if (!r.ok) throw labFail(summary(r));
      return summary(r);
    },
  }));

  /** The 🧪 tab's list: each scenario with its last result, step by step. */
  function view(run: (id: string) => void): HTMLElement {
    const box = el('div', { class: 'lab-scenarios' });
    for (const s of SCENARIOS) {
      const r = results.get(s.id);
      const button = el('button', { type: 'button', class: 'btn debug-small lab-scenario-run', 'data-scenario': s.id }, running === s.id ? '…' : say({ en: '▶ Run', tr: '▶ Çalıştır' }));
      (button as HTMLButtonElement).disabled = running !== null;
      button.addEventListener('click', () => run(`scenario.${s.id}`));
      box.append(
        el(
          'section',
          { class: `lab-scenario${r ? (r.ok ? ' ok' : ' fail') : ''}`, 'data-scenario': s.id },
          el('div', { class: 'lab-scenario-head' }, el('strong', {}, say(s.title)), button),
          el('p', { class: 'muted small' }, say(s.help)),
          r
            ? el(
                'ol',
                { class: 'lab-steps' },
                ...r.steps.map((step) =>
                  el('li', { class: `lab-step ${step.mark}` }, `${step.mark === 'ok' ? '✓' : step.mark === 'fail' ? '✗' : '–'} ${say(step.title)}`, step.note ? el('small', {}, ` · ${step.note}`) : null, step.ms ? el('small', { class: 'muted' }, ` ${step.ms} ms`) : null),
                ),
              )
            : null,
        ),
      );
    }
    return box;
  }

  return {
    commands,
    view,
    results: () => [...results.values()],
    onChange: (fn: () => void) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
