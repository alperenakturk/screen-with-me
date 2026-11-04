// 🐞 Test Lab, 🧪 Scenarios (card DL5, lane B): one-click scripted checks of two-person flows, run with the fake friends
// (DL2) and the 🎬 accidents (DL4). Each step says ✓ or ✗ (with why); a scenario stops at its first ✗ and always cleans
// up after itself (its friends leave, a setting it changed goes back). Everything goes through the room's own paths
// (`DebugRoom.lab`, the friends' ordinary connections) and the page as it shows; nothing here is a server power. Part of
// the lab chunk (lazy, never loaded with the lab off).
import { el } from '../dom.ts';
import { debugRoom, type LabCommand, type RoomLab } from '../debug-lab.ts';
import type { FakeFriend } from './lab-friends.ts';

export interface ScenarioFriends {
  list(): readonly FakeFriend[];
  add(count: number): string;
  removeAll(): string;
}

type Mark = 'ok' | 'fail' | 'skip';
export interface StepResult {
  title: string;
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
  until<T>(fn: () => T | null | undefined | false, why: string, ms?: number): Promise<T>;
  /** One lab command by id (the 🎬 ones), as the command box runs it. */
  command(id: string, arg?: string): Promise<unknown>;
  /** Puts something back when the scenario ends, whatever happened. */
  cleanup(fn: () => void): void;
  /** Values one step leaves for the next. */
  memo: Record<string, string | null>;
}
interface Step {
  title: string;
  run: (ctx: Ctx) => Promise<string | void> | string | void;
}
interface Scenario {
  id: string;
  title: string;
  help: string;
  /** True when it can run now, otherwise why not. */
  needs?: (room: RoomLab) => true | string;
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
  await ctx.until(() => ctx.inRoom().length >= before + count, `${count} fake friend(s) did not get in`, 12_000);
  return ctx.inRoom().slice(before);
}
async function withVideo(ctx: Ctx): Promise<string> {
  if (ctx.room.playback().item) return 'a video is already playing';
  ctx.room.syncTest();
  await ctx.until(() => ctx.room.playback().item && !ctx.room.playback().paused, 'the sync test did not start', 8000);
  return 'sync test playing';
}

const SCENARIOS: Scenario[] = [
  {
    id: 'basics',
    title: 'Two people: join, chat, pause / play, leave',
    help: 'A fake friend joins, writes, pauses and plays the room (the sync test), then leaves: each step must show on my side.',
    steps: [
      { title: 'a friend joins', run: async (ctx) => (await addFriends(ctx, 1))[0]!.name },
      {
        title: 'their message shows in my chat',
        run: async (ctx) => {
          const text = `hello ${stamp()}`;
          ctx.inRoom()[0]!.say(text);
          await ctx.until(() => chatHas(text), 'the line never showed');
        },
      },
      { title: 'a video plays', run: (ctx) => withVideo(ctx) },
      {
        title: 'they pause: the room pauses for me',
        run: async (ctx) => {
          ctx.inRoom()[0]!.pause();
          await ctx.until(() => ctx.room.playback().paused, 'still playing');
        },
      },
      {
        title: 'they play: the room plays for me',
        run: async (ctx) => {
          ctx.inRoom()[0]!.play();
          await ctx.until(() => !ctx.room.playback().paused, 'still paused');
        },
      },
      {
        title: 'they leave: the room has only me',
        run: async (ctx) => {
          const name = ctx.inRoom()[0]!.name;
          ctx.inRoom()[0]!.leave();
          await ctx.until(() => !ctx.room.members().some((m) => m.name === name), `${name} is still listed`);
        },
      },
    ],
  },
  {
    id: 'wait',
    title: 'Everyone ready: the room waits for a stuck friend',
    help: 'A friend\'s video gets stuck for 5 s: the room pauses with the waiting note, then plays on by itself.',
    steps: [
      { title: 'a friend joins', run: async (ctx) => (await addFriends(ctx, 1))[0]!.name },
      { title: 'a video plays', run: (ctx) => withVideo(ctx) },
      {
        title: 'they get stuck: the room waits (note shown)',
        run: async (ctx) => {
          ctx.inRoom()[0]!.stallFor(5);
          await ctx.until(() => shown('#waiting-banner') && ctx.room.playback().paused, 'the room did not wait', 6000);
        },
      },
      {
        title: 'it plays on by itself once they are ready',
        run: async (ctx) => {
          await ctx.until(() => !shown('#waiting-banner') && !ctx.room.playback().paused, 'still waiting', 15_000);
        },
      },
    ],
  },
  {
    id: 'knock',
    title: 'Knock: a newcomer waits at the door until I let them in',
    help: 'With "Ask before letting people in" on (I must be the host), a fake friend knocks, I press Let in on their card, they are in. The setting goes back.',
    needs: (room) => (room.isHost() ? true : 'only the host can'),
    steps: [
      {
        title: 'the door is on',
        run: async (ctx) => {
          const was = ctx.room.knockOn();
          ctx.cleanup(() => ctx.room.knock(was));
          if (!ctx.room.knock(true)) throw new Error('only the host can');
          await ctx.until(() => ctx.room.knockOn(), 'the setting did not change');
        },
      },
      {
        title: 'a friend knocks and waits at the door',
        run: async (ctx) => {
          ctx.friends.add(1);
          ctx.cleanup(() => ctx.friends.removeAll());
          const friend = await ctx.until(() => ctx.friends.list().find((f) => f.status === 'door'), 'nobody waited at the door', 10_000);
          return friend.name;
        },
      },
      {
        title: 'their card shows for me',
        run: async (ctx) => {
          await ctx.until(() => document.querySelector('#knock-cards .knock-card .knock-allow'), 'no knock card');
        },
      },
      {
        title: 'Let in: they are in the room',
        run: async (ctx) => {
          document.querySelector<HTMLButtonElement>('#knock-cards .knock-card .knock-allow')!.click();
          await ctx.until(() => ctx.inRoom().length === 1, 'they are still at the door', 8000);
        },
      },
    ],
  },
  {
    id: 'private',
    title: 'A private message reaches one person only',
    help: 'Two fake friends; I write privately to the first (the person menu\'s path): my bubble says private, the first gets it, the second never does.',
    steps: [
      { title: 'two friends join', run: async (ctx) => (await addFriends(ctx, 2)).map((f) => f.name).join(', ') },
      {
        title: 'I write privately to the first',
        run: async (ctx) => {
          const [first] = ctx.inRoom();
          if (!ctx.room.openPrivate(first!.memberId!)) throw new Error('no such member');
          const text = `secret ${stamp()}`;
          ctx.room.write(text);
          ctx.memo.text = text;
          await ctx.until(() => [...document.querySelectorAll('.chat-line.private')].some((l) => l.textContent?.includes(text)), 'my private bubble never showed');
        },
      },
      {
        title: 'the first friend got it, marked private',
        run: async (ctx) => {
          const text = ctx.memo.text!;
          await ctx.until(() => ctx.inRoom()[0]!.heard.find((h) => h.text === text && h.private), 'it never arrived');
        },
      },
      {
        title: 'the second friend never got it',
        run: async (ctx) => {
          const text = ctx.memo.text!;
          await sleep(1200);
          if (ctx.inRoom()[1]!.heard.some((h) => h.text === text)) throw new Error('the second friend got it');
        },
      },
    ],
  },
  {
    id: 'reconnect',
    title: 'My connection drops while a friend writes',
    help: 'My connection is down for 4 s while a fake friend writes: I come back with the same member id, still with them, and their line reaches me.',
    steps: [
      { title: 'a friend joins', run: async (ctx) => (await addFriends(ctx, 1))[0]!.name },
      {
        title: 'my connection drops',
        run: async (ctx) => {
          const id = ctx.room.memberId();
          ctx.memo.id = id;
          await ctx.command('net.drop', '4');
          await ctx.until(() => ctx.room.transport() === null, 'still connected', 3000);
        },
      },
      {
        title: 'they write while I am away',
        run: async (ctx) => {
          const text = `while away ${stamp()}`;
          ctx.inRoom()[0]!.say(text);
          ctx.memo.text = text;
        },
      },
      {
        title: 'I am back with the same member id',
        run: async (ctx) => {
          await ctx.until(() => ctx.room.transport() !== null && ctx.room.memberId() !== null, 'not back', 15_000);
          const before = ctx.memo.id;
          if (ctx.room.memberId() !== before) throw new Error(`a new member id (${before} → ${ctx.room.memberId()})`);
        },
      },
      {
        title: 'their line reached me and they are still here',
        run: async (ctx) => {
          const text = ctx.memo.text!;
          await ctx.until(() => chatHas(text), 'the line is missing');
          await ctx.until(() => ctx.room.members().length === 2, `${ctx.room.members().length} people`);
        },
      },
    ],
  },
  {
    id: 'selfTest',
    title: 'Lab self-test: a scenario that fails on purpose',
    help: 'Its second step fails on purpose: it must show ✗ with the reason and skip the rest (–), and the room keeps working.',
    steps: [
      { title: 'a step that passes', run: () => 'fine' },
      {
        title: 'a step that fails on purpose',
        run: () => {
          throw new Error('self-test: this failure is expected');
        },
      },
      { title: 'a step after the failure', run: () => 'never runs' },
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
    if (!room) throw new Error('not in a room');
    if (running) throw new Error(`"${running}" is still running`);
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
          if (Date.now() > end) throw new Error(why);
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
          steps.push({ title: step.title, mark: 'fail', ms: Math.round(performance.now() - start), note: String((error as Error)?.message ?? error) });
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
    return `${r.ok ? '✓' : '✗'} ${passed}/${r.steps.length}${failed ? ` · ✗ ${failed.title}: ${failed.note ?? ''}` : ''}`;
  };

  const commands: LabCommand[] = SCENARIOS.map((s) => ({
    id: `scenario.${s.id}`,
    title: `Scenario: ${s.title}`,
    help: s.help,
    tab: 'scenarios',
    where: 'in a room',
    available: () => {
      const room = debugRoom()?.lab;
      if (!room) return 'not in a room';
      if (running) return `"${running}" is running`;
      return s.needs ? s.needs(room) : true;
    },
    run: async () => {
      const r = await play(s);
      // A failed check is a red line in the log (the command "failed"), with the step that broke.
      if (!r.ok) throw new Error(summary(r));
      return summary(r);
    },
  }));

  /** The 🧪 tab's list: each scenario with its last result, step by step. */
  function view(run: (id: string) => void): HTMLElement {
    const box = el('div', { class: 'lab-scenarios' });
    for (const s of SCENARIOS) {
      const r = results.get(s.id);
      const button = el('button', { type: 'button', class: 'btn debug-small lab-scenario-run', 'data-scenario': s.id }, running === s.id ? '…' : '▶ Run');
      (button as HTMLButtonElement).disabled = running !== null;
      button.addEventListener('click', () => run(`scenario.${s.id}`));
      box.append(
        el(
          'section',
          { class: `lab-scenario${r ? (r.ok ? ' ok' : ' fail') : ''}`, 'data-scenario': s.id },
          el('div', { class: 'lab-scenario-head' }, el('strong', {}, s.title), button),
          el('p', { class: 'muted small' }, s.help),
          r
            ? el(
                'ol',
                { class: 'lab-steps' },
                ...r.steps.map((step) =>
                  el('li', { class: `lab-step ${step.mark}` }, `${step.mark === 'ok' ? '✓' : step.mark === 'fail' ? '✗' : '–'} ${step.title}`, step.note ? el('small', {}, ` · ${step.note}`) : null, step.ms ? el('small', { class: 'muted' }, ` ${step.ms} ms`) : null),
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
