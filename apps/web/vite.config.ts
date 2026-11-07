import { defineConfig, type Plugin } from 'vite';
import { readSiteConfig } from '../../scripts/site-config.mjs';

// Node tipleri bu pakette yok; sadece ortam değişkenleri okunuyor.
declare const process: { env: Record<string, string | undefined> };

// Aynı bilgisayarda iki geliştirme sunucusu çalışabilsin diye bağlantı noktaları değiştirilebilir:
// SWM_WEB_PORT (site, varsayılan 5173) ve SWM_API_PORT (yerel Cloudflare sunucusu, varsayılan 8787).
const apiPort = process.env.SWM_API_PORT ?? '8787';

// The site's address (card R3-3): one value in site.config.json, see docs/internal/custom-domain.md.
const site = readSiteConfig();

/**
 * Puts the address where the build needs it: `%SITE_ORIGIN%` in index.html (og:image), `__SITE__` in the code
 * (`site.ts`) and `/domain.js` for the static pages (help, privacy, terms, thanks, extension), which moves a visit on
 * an alias to the same page on the main address. With no aliases `domain.js` does nothing.
 */
function siteAddress(): Plugin {
  const domainJs =
    `// Generated from site.config.json (card R3-3): a visit on an older address of the site moves to the main one.\n` +
    `(function () {\n  var origin = ${JSON.stringify(site.origin)};\n  var aliases = ${JSON.stringify(site.aliases)};\n` +
    `  if (aliases.indexOf(location.origin) >= 0) location.replace(origin + location.pathname + location.search + location.hash);\n})();\n`;
  return {
    name: 'site-address',
    transformIndexHtml: { order: 'pre', handler: (html) => html.replaceAll('%SITE_ORIGIN%', site.origin) },
    configureServer(server) {
      server.middlewares.use('/domain.js', (_req, res) => {
        res.setHeader('Content-Type', 'text/javascript');
        res.end(domainJs);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'domain.js', source: domainJs });
    },
  };
}

export default defineConfig({
  define: { __SITE__: JSON.stringify(site) },
  plugins: [siteAddress()],
  server: {
    port: Number(process.env.SWM_WEB_PORT ?? 5173),
    // Geliştirirken /api isteklerini (WebSocket dahil) yerel Cloudflare sunucusuna yönlendir.
    // Böylece site her ortamda sunucuyu kendi adresinde arar.
    proxy: {
      '/api': { target: `http://localhost:${apiPort}`, ws: true },
    },
  },
});
