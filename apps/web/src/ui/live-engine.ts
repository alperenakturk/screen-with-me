/**
 * Card SZ: what a stream needs once one starts or is watched (the peer-to-peer stream, the floating window, the "screen
 * + my camera" picture) is one lazy chunk; `live.ts` (the card and its buttons) loads it when someone streams, when the
 * Share button is hovered / focused, or on the first press.
 */
export { FPS, LiveP2p, screenConstraints } from '@swm/shared/live-p2p';
export { composeScreenWithCamera } from './live-compose.ts';
export { createLiveFloat } from './live-float.ts';
