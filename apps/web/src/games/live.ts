// Whether the table I have open holds a game in progress (I play in it, it started and has not ended). The game
// pieces set it as their state changes; the games stage asks it before the tab closes ("are you sure?", owner, 4 Nov
// 2026: only for a real game in progress, never on every page close). Tiny on purpose: it lives in the room's chunk.

let live = false;
export const setGameLive = (on: boolean): void => {
  live = on;
};
export const gameLive = (): boolean => live;
