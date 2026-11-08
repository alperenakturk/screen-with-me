// BH11: the game e2e files have a "player drops" step: the test closes one player's socket and waits for the others to
// see that player offline. On live (0.9.97.75, draw.mjs) the network had already closed that socket (1006) a moment
// before the step, so the test's own close did nothing, and the game object never heard of the drop: no game object
// notices a connection that vanished without a close frame (only the room has a ghost check, `STALE_MS`). The others
// kept seeing the player "online" and the step timed out after 8 s.
//
// `dropFor` closes the socket the test means to drop and returns how long the step should wait. If the network already
// closed it, the step says so and waits much longer for the server to notice by itself, so it still tests what it says
// ("a player who is gone shows offline") instead of failing on a race it can't win. Game Studio's ghost-check card is
// what makes that wait short; until then a run that needs the long wait prints why.
export const NETWORK_DROP_WAIT_MS = 60_000;

export function dropFor(ws, name, ms = 8000) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.close();
    return ms;
  }
  console.log(`· ${name}'s socket was already closed by the network before the drop step; waiting up to ${NETWORK_DROP_WAIT_MS / 1000} s for the server to notice (no ghost check in game objects yet)`);
  return NETWORK_DROP_WAIT_MS;
}
