import { describe, expect, it } from 'vitest';
import { CHAT_KEEP, CHAT_META_KEY, CHAT_PAGE_SIZE, ChatStore, LEGACY_CHAT_KEY, chatPageKey, type ChatKV } from './chat-store.ts';
import type { ChatMessage } from './protocol.ts';

/** Durable Object storage stand-in; values are copied like structured clone, and every write is counted. */
function memoryKV(seed: Record<string, unknown> = {}) {
  const map = new Map<string, unknown>(Object.entries(seed).map(([k, v]) => [k, structuredClone(v)]));
  let writes = 0;
  const kv: ChatKV = {
    async get<T>(key: string) {
      return structuredClone(map.get(key)) as T | undefined;
    },
    async put(key, value) {
      writes++;
      map.set(key, structuredClone(value));
    },
    async delete(keys) {
      for (const key of keys) map.delete(key);
    },
  };
  return { kv, map, writes: () => writes };
}

const msg = (n: number): ChatMessage => ({ id: `m${n}`, text: `message ${n}`, by: { id: 'a', name: 'Alex' }, at: 1_000 + n });
const ids = (list: ChatMessage[]) => list.map((m) => m.id);

describe('ChatStore (card CH1)', () => {
  it('keeps well past the old 50: 300 messages are all there after a restart', async () => {
    const { kv } = memoryKV();
    const store = new ChatStore(kv);
    await store.load();
    for (let i = 1; i <= 300; i++) await store.add(msg(i));
    // A deploy or an evicted object: a new store reads the same storage.
    const again = new ChatStore(kv);
    await again.load();
    expect(again.count).toBe(300);
    const all: ChatMessage[] = [];
    let page: { messages: ChatMessage[]; more?: number } = again.welcome();
    all.unshift(...page.messages);
    while (page.more !== undefined) {
      page = await again.older(page.more);
      all.unshift(...page.messages);
    }
    expect(ids(all)).toEqual(Array.from({ length: 300 }, (_, i) => `m${i + 1}`));
  });

  it('a short chat (fewer than one page) is still there after a restart', async () => {
    for (const n of [1, 3, CHAT_PAGE_SIZE]) {
      const { kv } = memoryKV();
      const store = new ChatStore(kv);
      await store.load();
      for (let i = 1; i <= n; i++) await store.add(msg(i));
      const again = new ChatStore(kv);
      await again.load();
      expect(ids(again.recent)).toEqual(Array.from({ length: n }, (_, i) => `m${i + 1}`));
    }
  });

  it('after the room is deleted (storage gone, store reset) the next first message is kept again', async () => {
    const { kv, map } = memoryKV();
    const store = new ChatStore(kv);
    await store.load();
    await store.add(msg(1));
    map.clear();
    store.reset();
    await store.add(msg(2));
    const again = new ChatStore(kv);
    await again.load();
    expect(ids(again.recent)).toEqual(['m2']);
  });

  it('a joiner gets the newest two pages (at most 100) and the page to ask for next', async () => {
    const { kv } = memoryKV();
    const store = new ChatStore(kv);
    await store.load();
    for (let i = 1; i <= 30; i++) await store.add(msg(i));
    expect(store.welcome()).toEqual({ messages: Array.from({ length: 30 }, (_, i) => msg(i + 1)) });
    for (let i = 31; i <= 175; i++) await store.add(msg(i));
    const w = store.welcome();
    expect(w.messages.length).toBeLessThanOrEqual(2 * CHAT_PAGE_SIZE);
    expect(w.messages.at(-1)!.id).toBe('m175');
    expect(w.more).toBeDefined();
  });

  it('never drops a message below CHAT_KEEP; past it, the oldest page goes', async () => {
    const { kv, map } = memoryKV();
    const store = new ChatStore(kv);
    await store.load();
    const total = CHAT_KEEP + 3 * CHAT_PAGE_SIZE + 7;
    for (let i = 1; i <= total; i++) {
      await store.add(msg(i));
      expect(store.count).toBe(Math.min(i, store.count));
      expect(store.count).toBeGreaterThanOrEqual(Math.min(i, CHAT_KEEP));
      expect(store.count).toBeLessThan(CHAT_KEEP + CHAT_PAGE_SIZE);
    }
    const { first, last } = store.pages;
    expect(map.has(chatPageKey(first - 1))).toBe(false);
    expect(map.has(chatPageKey(first))).toBe(true);
    expect(map.get(CHAT_META_KEY)).toEqual({ first, last });
    // Every stored page fits a Durable Object value (128 KiB) even with the longest messages.
    const long = { ...msg(0), text: '🍿'.repeat(300), by: { id: 'x'.repeat(16), name: 'Ş'.repeat(32), avatar: 'wizard' as never } };
    expect(new TextEncoder().encode(JSON.stringify(Array(CHAT_PAGE_SIZE).fill(long))).length).toBeLessThan(128 * 1024);
  });

  it('moves a pre-CH1 room (one "chat" key) into page 0 and removes the old key', async () => {
    const legacy = Array.from({ length: 50 }, (_, i) => msg(i + 1));
    const { kv, map } = memoryKV({ [LEGACY_CHAT_KEY]: legacy });
    const store = new ChatStore(kv);
    await store.load();
    expect(ids(store.recent)).toEqual(ids(legacy));
    expect(map.has(LEGACY_CHAT_KEY)).toBe(false);
    expect(map.get(chatPageKey(0))).toEqual(legacy);
    await store.add(msg(51));
    const again = new ChatStore(kv);
    await again.load();
    expect(again.count).toBe(51);
  });

  it('a new message writes one page (no rewrite of the whole history)', async () => {
    const { kv, writes } = memoryKV();
    const store = new ChatStore(kv);
    await store.load();
    for (let i = 1; i <= CHAT_PAGE_SIZE; i++) await store.add(msg(i));
    const before = writes();
    await store.add(msg(CHAT_PAGE_SIZE + 1)); // starts page 1: the page and the meta
    await store.add(msg(CHAT_PAGE_SIZE + 2)); // just the page
    expect(writes() - before).toBe(3);
  });

  it('older() refuses pages that are not there', async () => {
    const { kv } = memoryKV();
    const store = new ChatStore(kv);
    await store.load();
    await store.add(msg(1));
    expect(await store.older(-1)).toEqual({ messages: [] });
    expect(await store.older(5)).toEqual({ messages: [] });
    expect(await store.older(0.5)).toEqual({ messages: [] });
  });
});
