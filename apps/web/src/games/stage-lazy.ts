/**
 * The games window (`stage.ts`) as a lazy chunk (budget step after BUD2): the room page no longer downloads it on its
 * first paint. The real stage loads at the first sign it is needed, and calls that came before it are kept and replayed
 * in order once it is there:
 * - a press of any games button (the press waits for the chunk, then goes through as if nothing happened);
 * - the room lists a table, or this tab was at a table or a side game before a reload (`swm:table:<path>`);
 * - the Test Lab is on in this tab (its game commands must be there at once);
 * - otherwise once the room has settled (`whenIdle`), so a first press is instant.
 */
import type { SoloKind } from '@swm/shared/games/catalog';
import type { RoomGame } from '@swm/shared/protocol';
import { loadChunk, whenIdle } from '../ui/lazy.ts';
import type { StageOptions, createGameStage } from './stage.ts';

type Stage = ReturnType<typeof createGameStage>;
type Call = (stage: Stage) => void;

const labIsOn = (): boolean => {
  try {
    return sessionStorage.getItem('swm:debug') == '1';
  } catch {
    return false;
  }
};

const wasAtGame = (): boolean => {
  try {
    return !!sessionStorage.getItem(`swm:table:${location.pathname}`);
  } catch {
    return false;
  }
};

export function createLazyGameStage(opts: StageOptions) {
  let stage: Stage | null = null;
  let loading: Promise<Stage | null> | null = null;
  const queue: Call[] = [];
  const triggers = [opts.button, ...(opts.extraButtons ?? [])];

  const load = (): Promise<Stage | null> => {
    loading ??= (async () => {
      const mod = await loadChunk(() => import('./stage.ts'));
      if (!mod) {
        // The chunk failed (offline, a new deploy): the next sign of need tries again.
        loading = null;
        return null;
      }
      stage = mod.createGameStage(opts);
      for (const call of queue.splice(0)) call(stage);
      return stage;
    })();
    return loading;
  };
  const run = (call: Call): void => {
    if (stage) call(stage);
    else queue.push(call);
  };

  // A press before the chunk is there: hold it, load, then press again (the real stage's own listeners hear that one).
  for (const b of triggers) {
    b.addEventListener(
      'click',
      (event) => {
        if (stage) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        void load().then((s) => s && b.click());
      },
      true,
    );
  }

  if (labIsOn() || wasAtGame()) void load();
  else whenIdle(() => void load());

  return {
    setTables(next: RoomGame[], change: Parameters<Stage['setTables']>[1] = {}, announce = true): void {
      run((s) => s.setTables(next, change, announce));
      if (next.length) void load();
    },
    rejoined(): void {
      run((s) => s.rejoined());
    },
    membersChanged(): void {
      if (stage) stage.membersChanged();
    },
    refused(code: Parameters<Stage['refused']>[0]): void {
      run((s) => s.refused(code));
    },
    isOpen: (): boolean => stage?.isOpen() ?? false,
    openSolo: (kind: SoloKind): void => {
      run((s) => s.openSolo(kind));
      void load();
    },
  };
}
