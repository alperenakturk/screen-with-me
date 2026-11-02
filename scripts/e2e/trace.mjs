// Loaded before every e2e file (run.mjs passes it with --import). Prints one line for every WebSocket that the server
// or the network closed (not the test itself), with the close code, the time and how long it was open. A test that
// times out after such a line lost its connection (e.g. a Durable Object restarted under it); one without it waited
// for an answer the server never sent.
const Native = globalThis.WebSocket;
globalThis.WebSocket = class TracedWebSocket extends Native {
  constructor(url, ...rest) {
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
