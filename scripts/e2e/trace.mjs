// Loaded before every e2e file (run.mjs passes it with --import). Prints one line for every WebSocket that the server
// or the network closed (not the test itself), with the close code, the time and how long it was open. A test that
// times out after such a line lost its connection (e.g. a Durable Object restarted under it); one without it waited
// for an answer the server never sent.
//
// It also writes the time of every new room connection (a WebSocket, or the HTTP fallback's `?http=open`) to the file
// named in SWM_CONNECT_LOG: the Worker allows one address 60 a minute (CONNECT_LIMIT) and the whole suite runs from one
// address, so run.mjs reads it and waits between files when the last minute is nearly full.
import { appendFileSync } from 'node:fs';

const connectLog = process.env.SWM_CONNECT_LOG;
const count = () => {
  if (connectLog) appendFileSync(connectLog, `${Date.now()}\n`);
};
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  if (/[?&]http=open\b/.test(String(input instanceof Request ? input.url : input))) count();
  return nativeFetch(input, init);
};
const Native = globalThis.WebSocket;
globalThis.WebSocket = class TracedWebSocket extends Native {
  constructor(url, ...rest) {
    count();
    super(url, ...rest);
    const opened = Date.now();
    let byTest = false;
    const close = this.close.bind(this);
    this.close = (...args) => {
      byTest = true;
      return close(...args);
    };
    this.addEventListener('close', (event) => {
      if (byTest) return;
      const path = new URL(String(url)).pathname;
      const reason = event.reason ? ` ${event.reason}` : '';
      console.log(`· ${new Date().toISOString()} socket closed by the server or network: ${event.code}${reason} · ${path} · open ${Date.now() - opened} ms`);
    });
  }
};
