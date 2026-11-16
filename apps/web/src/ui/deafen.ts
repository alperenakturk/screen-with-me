/**
 * Card VC1: "deafened" for this tab right now (in voice and 🎧 on). Voice sets it; the stream viewer (`live.ts`) listens
 * for `deafchange` and silences what it plays. A tiny module so the stream's chunk needs nothing of voice.
 */
let deaf = false;

export const isDeaf = (): boolean => deaf;

export function setDeafNow(on: boolean): void {
  if (on === deaf) return;
  deaf = on;
  dispatchEvent(new Event('deafchange'));
}
