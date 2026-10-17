import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    // Geliştirirken /api isteklerini (WebSocket dahil) yerel Cloudflare sunucusuna yönlendir.
    // Böylece site her ortamda sunucuyu kendi adresinde arar.
    proxy: {
      '/api': { target: 'http://localhost:8787', ws: true },
    },
  },
});
