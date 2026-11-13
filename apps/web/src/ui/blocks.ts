// SAFE1 (owner, 13 Nov 2026): "🔇 Block for me" in the person menu. Local only: that person's chat lines (pictures
// included), private messages and reactions are hidden on this screen; nothing goes to the server and they still see
// my messages. Kept per room in `block:<room>` (person key → the name shown when blocked) and undone from the same
// menu. A person is matched like the rest of the room does (`personOf`: the server's per-room person key, else name +
// avatar), so a reload or a second tab of theirs stays blocked.
import { personOf, type Member } from '@swm/shared/protocol';
import { load, save } from '../storage.ts';
import { debugHooks } from '../debug-lab.ts';

export interface Blocks {
  has(member: Pick<Member, 'pk' | 'name' | 'avatar'>): boolean;
  /** Blocks or unblocks; true when they are blocked now. */
  toggle(member: Pick<Member, 'pk' | 'name' | 'avatar'>): boolean;
  /** The names of the people blocked in this room (for the Test Lab). */
  names(): string[];
  /** Runs after every change (the chat redraws). */
  onChange(fn: () => void): void;
  /** The last report's result (`ok`, `busy`, `off`, `failed`), for the Test Lab. */
  reported(result: string): void;
}

export function createBlocks(roomId: string): Blocks {
  const key = `block:${roomId}`;
  let blocked: Record<string, string> = {};
  try {
    const raw = JSON.parse(load(key) ?? '{}') as unknown;
    if (raw && typeof raw === 'object') for (const [k, v] of Object.entries(raw)) if (typeof v === 'string') blocked[k] = v;
  } catch {
    blocked = {};
  }
  const listeners: Array<() => void> = [];
  let lastReport = 'none';
  const blocks: Blocks = {
    has: (member) => Object.hasOwn(blocked, personOf(member)),
    toggle(member) {
      const k = personOf(member);
      const now = !Object.hasOwn(blocked, k);
      if (now) blocked = { ...blocked, [k]: member.name };
      else {
        const { [k]: _gone, ...rest } = blocked;
        blocked = rest;
      }
      save(key, JSON.stringify(blocked));
      for (const fn of listeners) fn();
      return now;
    },
    names: () => Object.values(blocked),
    onChange: (fn) => void listeners.push(fn),
    reported: (result) => void (lastReport = result),
  };
  debugHooks.register('safety', () => ({
    commands: [
      {
        id: 'safety.state',
        tab: 'status',
        title: { en: 'Safety: blocked people and the last report', tr: 'Güvenlik: engellenenler ve son bildirim' },
        help: { en: 'Writes who is blocked for me in this room and how the last report went into the log.', tr: 'Bu odada benim için engellenenleri ve son bildirimin sonucunu kayda yazar.' },
        run: () => JSON.stringify({ blocked: blocks.names(), lastReport }),
      },
    ],
  }));
  return blocks;
}
