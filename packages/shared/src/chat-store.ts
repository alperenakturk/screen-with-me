import type { ChatMessage } from './protocol.ts';

/**
 * Card CH1: the room's chat kept until the room is deleted, in pages. A Durable Object value is capped at 128 KiB, so
 * the history is split into pages of `CHAT_PAGE_SIZE` messages under `chatp:<n>` (≈1 KB a message at most: 300 chars
 * of text and the sender's name and avatar), with `chatMeta` = the first and last page numbers. A new message rewrites
 * only the last page (as the old single 50-message key did). Past `CHAT_KEEP` messages the oldest page goes, so a room
 * keeps between CHAT_KEEP and CHAT_KEEP + CHAT_PAGE_SIZE messages; pictures go much earlier on their own (IMG2 time
 * limit and MAX_CHAT_IMAGES), their messages stay with a placeholder. A joiner gets the newest two pages
 * (`welcome()`, at most 100 messages) and asks for older pages one at a time (`older()`).
 */
export const CHAT_PAGE_SIZE = 50;
/** At least this many messages are kept (the oldest page goes only past it). */
export const CHAT_KEEP = 1000;
/** The pre-CH1 single key (the last 50 messages); moved into page 0 the first time a room loads. */
export const LEGACY_CHAT_KEY = 'chat';
export const CHAT_META_KEY = 'chatMeta';
export const chatPageKey = (n: number) => `chatp:${n}`;

/** The slice of Durable Object storage the store needs (a Map stands in for it in the tests). */
export interface ChatKV {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(keys: string[]): Promise<unknown>;
}

interface Meta {
  first: number;
  last: number;
}

export class ChatStore {
  private meta: Meta = { first: 0, last: 0 };
  private lastPage: ChatMessage[] = [];
  private prevPage: ChatMessage[] = [];
  /** Whether `chatMeta` is in storage (a new room writes it with its first message, or a reload finds no pages). */
  private metaStored = false;

  constructor(private readonly kv: ChatKV) {}

  /** Reads the newest two pages (moving a pre-CH1 room's history into page 0 first). */
  async load(): Promise<void> {
    const meta = await this.kv.get<Meta>(CHAT_META_KEY);
    if (!meta) {
      const legacy = (await this.kv.get<ChatMessage[]>(LEGACY_CHAT_KEY)) ?? [];
      this.meta = { first: 0, last: 0 };
      this.lastPage = legacy.slice(-CHAT_PAGE_SIZE);
      this.prevPage = [];
      this.metaStored = false;
      if (legacy.length) {
        await this.kv.put(chatPageKey(0), this.lastPage);
        await this.kv.put(CHAT_META_KEY, this.meta);
        this.metaStored = true;
        await this.kv.delete([LEGACY_CHAT_KEY]);
      }
      return;
    }
    this.metaStored = true;
    this.meta = { first: meta.first, last: meta.last };
    this.lastPage = (await this.kv.get<ChatMessage[]>(chatPageKey(meta.last))) ?? [];
    this.prevPage = meta.last > meta.first ? ((await this.kv.get<ChatMessage[]>(chatPageKey(meta.last - 1))) ?? []) : [];
  }

  /** Adds a message (the last page is rewritten; a full page starts the next one; past CHAT_KEEP the oldest page goes). */
  async add(message: ChatMessage): Promise<void> {
    if (this.lastPage.length >= CHAT_PAGE_SIZE) {
      this.prevPage = this.lastPage;
      this.lastPage = [];
      this.meta = { ...this.meta, last: this.meta.last + 1 };
      await this.kv.put(CHAT_META_KEY, this.meta);
      this.metaStored = true;
    } else if (!this.metaStored) {
      // The room's first message: without the page numbers a reload would find no chat at all.
      await this.kv.put(CHAT_META_KEY, this.meta);
      this.metaStored = true;
    }
    this.lastPage = [...this.lastPage, message];
    await this.kv.put(chatPageKey(this.meta.last), this.lastPage);
    // Full pages before the last one: drop the oldest while the rest still hold CHAT_KEEP.
    while ((this.meta.last - this.meta.first - 1) * CHAT_PAGE_SIZE + this.lastPage.length >= CHAT_KEEP) {
      await this.kv.delete([chatPageKey(this.meta.first)]);
      this.meta = { ...this.meta, first: this.meta.first + 1 };
      await this.kv.put(CHAT_META_KEY, this.meta);
    }
  }

  /** The newest messages (the last two pages, oldest first). */
  get recent(): ChatMessage[] {
    return [...this.prevPage, ...this.lastPage];
  }

  /** What a joiner gets: the newest messages and, when there are older ones, the page to ask for next. */
  welcome(): { messages: ChatMessage[]; more?: number } {
    const oldestSent = this.meta.last > this.meta.first ? this.meta.last - 1 : this.meta.last;
    return { messages: this.recent, ...(oldestSent > this.meta.first ? { more: oldestSent - 1 } : {}) };
  }

  /** One older page (empty when it is gone or not there) and the page before it, if any. */
  async older(page: number): Promise<{ messages: ChatMessage[]; more?: number }> {
    if (!Number.isInteger(page) || page < this.meta.first || page > this.meta.last) return { messages: [] };
    const messages =
      page === this.meta.last ? this.lastPage : page === this.meta.last - 1 ? this.prevPage : ((await this.kv.get<ChatMessage[]>(chatPageKey(page))) ?? []);
    return { messages, ...(page > this.meta.first ? { more: page - 1 } : {}) };
  }

  /**
   * Card MSG1: replaces the message with this id wherever its page is (the newest pages first, then older ones from
   * storage) and rewrites only that page (not when `change` returns the message itself). Returns the message as it was, or null when it is not kept (any more).
   */
  async replace(id: string, change: (message: ChatMessage) => ChatMessage): Promise<ChatMessage | null> {
    for (let page = this.meta.last; page >= this.meta.first; page--) {
      const messages =
        page === this.meta.last ? this.lastPage : page === this.meta.last - 1 ? this.prevPage : ((await this.kv.get<ChatMessage[]>(chatPageKey(page))) ?? []);
      const at = messages.findIndex((m) => m.id === id);
      if (at < 0) continue;
      const old = messages[at]!;
      const changed = change(old);
      if (changed === old) return old;
      const next = messages.map((m, i) => (i === at ? changed : m));
      if (page === this.meta.last) this.lastPage = next;
      else if (page === this.meta.last - 1) this.prevPage = next;
      await this.kv.put(chatPageKey(page), next);
      return old;
    }
    return null;
  }

  /** How many messages are kept (pages before the last are full). */
  get count(): number {
    return (this.meta.last - this.meta.first) * CHAT_PAGE_SIZE + this.lastPage.length;
  }

  get pages(): Meta {
    return { ...this.meta };
  }

  /** The room was deleted (its storage is already gone): start empty. */
  reset(): void {
    this.metaStored = false;
    this.meta = { first: 0, last: 0 };
    this.lastPage = [];
    this.prevPage = [];
  }
}
