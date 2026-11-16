import { CHAT_KEEP, CHAT_PAGE_SIZE, type ChatKV } from './chat-store.ts';
import type { ChatMessage, Member } from './protocol.ts';

/**
 * Card MSG1: who sent each chat message, kept only on the server (never sent to clients), so "Delete for everyone"
 * can check that the caller is the sender. `k` is a short tag of the sender's browser key (`keyOf`, hashed by the room
 * so the list stays small); `p` marks a private message and holds the two people's person keys (it is never in the
 * room's history, so the deleted line goes only to them). Stored under `chatOwners`, newest last, at most
 * `CHAT_OWNERS_MAX` entries (as many as the history keeps); deleted with the room.
 */
export const CHAT_OWNERS_KEY = 'chatOwners';
export const CHAT_OWNERS_MAX = CHAT_KEEP + CHAT_PAGE_SIZE;

export interface ChatOwner {
  k: string;
  p?: [string, string];
}

export class ChatOwners {
  private map = new Map<string, ChatOwner>();

  constructor(private readonly kv: ChatKV) {}

  async load(): Promise<void> {
    const list = (await this.kv.get<[string, ChatOwner][]>(CHAT_OWNERS_KEY)) ?? [];
    this.map = new Map(list);
  }

  async add(id: string, owner: ChatOwner): Promise<void> {
    this.map.set(id, owner);
    while (this.map.size > CHAT_OWNERS_MAX) this.map.delete(this.map.keys().next().value!);
    await this.kv.put(CHAT_OWNERS_KEY, [...this.map]);
  }

  get(id: string): ChatOwner | undefined {
    return this.map.get(id);
  }

  get size(): number {
    return this.map.size;
  }

  reset(): void {
    this.map.clear();
  }
}

/**
 * Whether this caller may delete the message. The sender always may; the (acting) host may delete anyone's message
 * in the room's chat, never someone's private message. A message with no owner record (sent before MSG1) can only be
 * deleted by the host, and only when it is in the room's history (`inHistory`).
 */
export function canDeleteChat(owner: ChatOwner | undefined, callerTag: string, isHost: boolean, inHistory: boolean): boolean {
  if (owner) return owner.k === callerTag || (isHost && !owner.p);
  return isHost && inHistory;
}

/** What stands in the place of a deleted message: no text, no image, who deleted it. */
export function deletedChat(message: ChatMessage, by: Member): ChatMessage {
  const { image: _image, ...rest } = message;
  return { ...rest, text: '', deleted: { by } };
}
