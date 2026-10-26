import { defineConfig } from 'vite';

// Node tipleri bu pakette yok; sadece ortam değişkenleri okunuyor.
declare const process: { env: Record<string, string | undefined> };

// Aynı bilgisayarda iki geliştirme sunucusu çalışabilsin diye bağlantı noktaları değiştirilebilir:
// SWM_WEB_PORT (site, varsayılan 5173) ve SWM_API_PORT (yerel Cloudflare sunucusu, varsayılan 8787).
const apiPort = process.env.SWM_API_PORT ?? '8787';

export default defineConfig({
  server: {
    port: Number(process.env.SWM_WEB_PORT ?? 5173),
    // Geliştirirken /api isteklerini (WebSocket dahil) yerel Cloudflare sunucusuna yönlendir.
    // Böylece site her ortamda sunucuyu kendi adresinde arar.
    proxy: {
      '/api': { target: `http://localhost:${apiPort}`, ws: true },
    },
  },
});
