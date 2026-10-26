// Odanın kuralları: bir komut geldiğinde oynatma durumu ve sıra nasıl değişir?
// Saf fonksiyonlar; sunucu bunları çağırır, testler de doğrudan dener.

import {
  QUEUE_MAX_LENGTH,
  expectedPosition,
  type ClientMessage,
  type ErrorCode,
  type PlaybackAction,
  type PlaybackState,
  type QueueItem,
} from './protocol.ts';

/** İstemcinin "şu anda yaptım" dediği zamana en fazla bu kadar geçmişe kadar güvenilir. */
export const MAX_CLIENT_LAG_MS = 2000;

export interface RoomData {
  state: PlaybackState;
  queue: QueueItem[];
}

/** Sunucunun uyguladığı komutlar. `load`/`enqueue` için sunucu, medyadan bir QueueItem hazırlar. */
export type RoomAction =
  | { t: 'load'; item: QueueItem }
  | { t: 'enqueue'; item: QueueItem }
  | Extract<ClientMessage, { t: 'dequeue' | 'move' | 'jump' | 'next' | 'play' | 'pause' | 'seek' | 'rate' }>
  /** Bir öncekine dön: `item` sunucunun hatırladığı son oynayan; şu an oynayan sıranın başına girer. */
  | { t: 'prev'; from: string; item: QueueItem }
  /** Döngü: biten video başa sarıp yeniden oynar. */
  | { t: 'restart'; from: string };

export interface RoomUpdate {
  data: RoomData;
  /** Oynatma durumu değiştiyse yayınlanacak eylem; değişmediyse null. */
  stateAction: PlaybackAction | null;
  /** Sıra değişti mi? */
  queueChanged: boolean;
  /** Son hareketlerde gösterilecek sıra değişikliği. */
  change: { kind: 'add' | 'remove' | 'move'; item: QueueItem } | null;
  error: ErrorCode | null;
}

/** Sonradan bulunan başlığı, öğe hâlâ oynuyorsa ya da sıradaysa yerine yazar. Bulamazsa null. */
export function setItemTitle(data: RoomData, itemId: string, title: string): RoomData | null {
  const named = (item: QueueItem): QueueItem => (item.id === itemId ? { ...item, title } : item);
  const playing = data.state.item?.id === itemId;
  const queued = data.queue.some((q) => q.id === itemId);
  if (!playing && !queued) return null;
  return {
    state: playing && data.state.item ? { ...data.state, item: named(data.state.item) } : data.state,
    queue: queued ? data.queue.map(named) : data.queue,
  };
}

export function initialRoom(now: number): RoomData {
  return { state: { item: null, paused: true, position: 0, rate: 1, updatedAt: now }, queue: [] };
}

function unchanged(data: RoomData, error: ErrorCode | null = null): RoomUpdate {
  return { data, stateAction: null, queueChanged: false, change: null, error };
}

/** Yeni bir videoyu baştan, oynayarak başlatır. Hız korunur. */
function start(state: PlaybackState, item: QueueItem, now: number): PlaybackState {
  return { item, paused: false, position: 0, rate: state.rate, updatedAt: now };
}

export function applyRoomAction(data: RoomData, action: RoomAction, now: number): RoomUpdate {
  const { state, queue } = data;

  switch (action.t) {
    case 'load':
      return { ...unchanged({ state: start(state, action.item, now), queue }), stateAction: 'load' };

    case 'enqueue': {
      if (state.item === null) {
        return { ...unchanged({ state: start(state, action.item, now), queue }), stateAction: 'load' };
      }
      if (queue.length >= QUEUE_MAX_LENGTH) return unchanged(data, 'queue_full');
      return {
        ...unchanged({ state, queue: [...queue, action.item] }),
        queueChanged: true,
        change: { kind: 'add', item: action.item },
      };
    }

    case 'dequeue': {
      const item = queue.find((q) => q.id === action.id);
      if (!item) return unchanged(data);
      return {
        ...unchanged({ state, queue: queue.filter((q) => q !== item) }),
        queueChanged: true,
        change: { kind: 'remove', item },
      };
    }

    case 'move': {
      const from = queue.findIndex((q) => q.id === action.id);
      const to = Math.min(action.to, queue.length - 1);
      if (from === -1 || from === to) return unchanged(data);
      const next = [...queue];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return { ...unchanged({ state, queue: next }), queueChanged: true, change: { kind: 'move', item: item! } };
    }

    case 'jump': {
      const item = queue.find((q) => q.id === action.id);
      if (!item) return unchanged(data);
      return {
        data: { state: start(state, item, now), queue: queue.filter((q) => q !== item) },
        stateAction: 'load',
        queueChanged: true,
        change: null,
        error: null,
      };
    }

    case 'next': {
      // Herkesin oynatıcısı video bitince "sıradaki" der; sadece ilki uygulanır.
      if (state.item?.id !== action.from) return unchanged(data);
      const [item, ...rest] = queue;
      if (!item) {
        // Sıra bitti: son konumda dur.
        if (state.paused) return unchanged(data);
        return {
          ...unchanged({ state: { ...state, paused: true, position: expectedPosition(state, now), updatedAt: now }, queue }),
          stateAction: 'pause',
        };
      }
      return {
        data: { state: start(state, item, now), queue: rest },
        stateAction: 'next',
        queueChanged: true,
        change: null,
        error: null,
      };
    }

    case 'prev': {
      if (state.item?.id !== action.from) return unchanged(data);
      // Sıra doluysa şu anki geri giremez (yine de bir öncekine dönülür).
      const back = queue.length < QUEUE_MAX_LENGTH ? [state.item, ...queue] : queue;
      return {
        data: { state: start(state, action.item, now), queue: back },
        stateAction: 'load',
        queueChanged: back !== queue,
        change: null,
        error: null,
      };
    }

    case 'restart': {
      // Herkesin oynatıcısı "bitti" der; sadece ilki uygulanır: yeniden başlamış (başa yakın) video bir daha sarılmaz.
      if (state.item?.id !== action.from || expectedPosition(state, now) < 2) return unchanged(data);
      return { ...unchanged({ state: start(state, state.item, now), queue }), stateAction: 'seek' };
    }

    case 'play':
    case 'pause':
    case 'seek':
    case 'rate': {
      if (state.item === null) return unchanged(data);
      // İstemci, komutu verdiği anın sunucu saatini (`at`) yollar; ağ gecikmesi
      // kadar geride kalmamak için o an kullanılır. Saçma değerlere karşı sınırlanır.
      const at = Math.min(now, Math.max(now - MAX_CLIENT_LAG_MS, action.at));
      const base: PlaybackState = { ...state, position: action.position, updatedAt: at };
      const next =
        action.t === 'play'
          ? { ...base, paused: false }
          : action.t === 'pause'
            ? { ...base, paused: true }
            : action.t === 'rate'
              ? { ...base, rate: action.rate }
              : base;
      return { ...unchanged({ state: next, queue }), stateAction: action.t };
    }
  }
}
