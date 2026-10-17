// Sahte chrome API: content.js'in arka planla konuşmasını üst sayfadaki taklide bağlar.
(function () {
  const bg = window.top.__bg;
  const frameId = window === window.top ? 0 : bg.nextFrameId++;
  const listeners = [];
  window.chrome = {
    runtime: {
      connect: () => bg.connect(frameId),
      onMessage: { addListener: (fn) => listeners.push(fn) },
    },
    storage: {
      // "Bir odadayım" bilgisi: çerçeveler yüklenince buna bakıp kendiliğinden bağlanır.
      session: { get: async () => ({ sessions: bg.inRoom ? [{ tabId: 1, roomId: 'x' }] : [] }) },
      onChanged: { addListener: () => {} },
    },
  };
  bg.registerFrame((msg) => listeners.forEach((fn) => fn(msg)));
  // Gerçek Chrome'da çerçeve kapanınca bağlantı kopar; burada da öyle olsun.
  addEventListener('pagehide', () => bg.disconnect(frameId));
})();
