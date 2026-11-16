import { describe, expect, it } from 'vitest';
import { CHAT_OWNERS_KEY, CHAT_OWNERS_MAX, ChatOwners, canDeleteChat, deletedChat } from './chat-delete.ts';
import { ChatStore, type ChatKV } from './chat-store.ts';
import type { ChatMessage } from './protocol.ts';

function memoryKV() {
  const map = new Map<string, unknown>();
  const kv: ChatKV = {
    async get<T>(key: string) {
      return structuredClone(map.get(key)) as T | undefined;
    },
    async put(key, value) {
      map.set(key, structuredClone(value));
    },
    async delete(keys) {
      for (const key of keys) map.delete(key);
    },
  };
  return { kv, map };
}

const alex = { id: 'a1', name: 'Alex' };
const sam = { id: 's1', name: 'Sam' };
const msg = (n: number, by = alex, image?: string): ChatMessage => ({ id: `m${n}`, text: `message ${n}`, by, at: 1_000 + n, ...(image ? { image } : {}) });

describe('canDeleteChat (card MSG1)', () => {
  it('the sender may delete their own message', () => {
    expect(canDeleteChat({ k: 'alex' }, 'alex', false, true)).toBe(true);
  });
  it('someone else who is not the host may not', () => {
    expect(canDeleteChat({ k: 'alex' }, 'sam', false, true)).toBe(false);
  });
  it('the host may delete anyone’s room message', () => {
    expect(canDeleteChat({ k: 'alex' }, 'host', true, true)).toBe(true);
  });
  it('the host may not delete someone’s private message; its sender may', () => {
    expect(canDeleteChat({ k: 'alex', p: ['pa', 'ps'] }, 'host', true, false)).toBe(false);
    expect(canDeleteChat({ k: 'alex', p: ['pa', 'ps'] }, 'alex', false, false)).toBe(true);
    expect(canDeleteChat({ k: 'alex', p: ['pa', 'ps'] }, 'sam', false, false)).toBe(false);
  });
  it('an older message with no owner record: only the host, only from the history', () => {
    expect(canDeleteChat(undefined, 'alex', false, true)).toBe(false);
    expect(canDeleteChat(undefined, 'host', true, true)).toBe(true);
    expect(canDeleteChat(undefined, 'host', true, false)).toBe(false);
  });
});

describe('ChatOwners (card MSG1)', () => {
  it('survives a restart and keeps at most CHAT_OWNERS_MAX, the oldest going first', async () => {
    const { kv, map } = memoryKV();
    const owners = new ChatOwners(kv);
    for (let i = 0; i < CHAT_OWNERS_MAX + 5; i++) await owners.add(`m${i}`, { k: i % 2 ? 'alex' : 'sam' });
    const again = new ChatOwners(kv);
    await again.load();
    expect(again.size).toBe(CHAT_OWNERS_MAX);
    expect(again.get('m0')).toBeUndefined();
    expect(again.get(`m${CHAT_OWNERS_MAX + 4}`)).toEqual({ k: 'sam' });
    // A stored value stays well under the 128 KiB Durable Object limit (16-char tags, 12-char ids).
    for (let i = 0; i < CHAT_OWNERS_MAX; i++) await owners.add(`x${String(i).padStart(11, '0')}`, { k: 'f'.repeat(16), p: ['p'.repeat(16), 'q'.repeat(16)] });
    expect(JSON.stringify(map.get(CHAT_OWNERS_KEY)).length).toBeLessThan(128 * 1024);
  });
});

describe('Deleting from the chat history (card MSG1)', () => {
  it('the text and image are gone from storage, the line stays with who deleted it, after a restart too', async () => {
    const { kv } = memoryKV();
    const store = new ChatStore(kv);
    await store.load();
    await store.add(msg(1));
    await store.add(msg(2, sam, 'img1'));
    await store.add(msg(3));
    const old = await store.replace('m2', (m) => deletedChat(m, alex));
    expect(old?.text).toBe('message 2');
    const again = new ChatStore(kv);
    await again.load();
    const gone = again.recent.find((m) => m.id === 'm2')!;
    expect(gone.text).toBe('');
    expect(gone.image).toBeUndefined();
    expect(gone.deleted).toEqual({ by: alex });
    expect(gone.by).toEqual(sam);
    expect(again.recent.map((m) => m.text)).toEqual(['message 1', '', 'message 3']);
  });
  it('finds a message on an older page in storage, and an unknown id changes nothing', async () => {
    const { kv } = memoryKV();
    const store = new ChatStore(kv);
    await store.load();
    for (let i = 1; i <= 260; i++) await store.add(msg(i));
    expect(await store.replace('m3', (m) => deletedChat(m, alex))).not.toBeNull();
    const older = await store.older(store.pages.first);
    expect(older.messages.find((m) => m.id === 'm3')?.deleted).toEqual({ by: alex });
    expect(await store.replace('nope', (m) => deletedChat(m, alex))).toBeNull();
  });
});
