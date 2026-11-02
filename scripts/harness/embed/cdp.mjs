// Gerçek Chrome'u eklentiyle açar ve sürer. Markalı Chrome artık --load-extension kabul
// etmiyor; --remote-debugging-pipe + --enable-unsafe-extension-debugging ile açılıp eklenti
// CDP'nin Extensions.loadUnpacked komutuyla yüklenir.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

/**
 * Ekran görüntüsünü (8 bit PNG, RGB/RGBA/gri) piksellere açar; dış paket gerekmesin diye kısa çözücü.
 * Dönen `at(x, y)` → [r, g, b].
 */
export function decodePng(buf) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const bpp = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * 3);
  const prev = Buffer.alloc(stride);
  const cur = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 255;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 3;
      if (bpp >= 3) {
        out[o] = cur[x * bpp];
        out[o + 1] = cur[x * bpp + 1];
        out[o + 2] = cur[x * bpp + 2];
      } else out[o] = out[o + 1] = out[o + 2] = cur[x * bpp];
    }
    prev.set(cur);
  }
  return {
    width,
    height,
    at(x, y) {
      const xi = Math.min(width - 1, Math.max(0, Math.round(x)));
      const yi = Math.min(height - 1, Math.max(0, Math.round(y)));
      const o = (yi * width + xi) * 3;
      return [out[o], out[o + 1], out[o + 2]];
    },
  };
}

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

export async function launch({ ext, out, width = 1280, height = 860, headless = true, args = [] }) {
  const chrome = spawn(
    CHROME,
    [
      ...(headless ? ['--headless=new'] : []),
      // Linux'ta root olarak (ör. bulut konteyneri) Chrome korumalı alan olmadan açılmak zorunda.
      ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []),
      '--remote-debugging-pipe',
      '--enable-unsafe-extension-debugging',
      `--user-data-dir=${mkdtempSync(join(tmpdir(), 'swm-embed-'))}`,
      `--window-size=${width},${height}`,
      '--no-first-run',
      '--no-default-browser-check',
      // Ek bayraklar (ör. sesli sohbet testinde sahte mikrofon).
      ...args,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] },
  );
  const toChrome = chrome.stdio[3];
  const fromChrome = chrome.stdio[4];
  let buf = '';
  let id = 0;
  const pending = new Map();
  /** Sitenin içindeki başka kökenli çerçeveler (OOPIF): adres → oturum. */
  const frames = new Map();
  /** Olay dinleyicileri (ör. Page.screencastFrame). */
  const listeners = new Set();
  fromChrome.on('data', (chunk) => {
    buf += chunk.toString('utf8');
    let i;
    while ((i = buf.indexOf('\0')) >= 0) {
      const m = JSON.parse(buf.slice(0, i));
      buf = buf.slice(i + 1);
      if (m.id && pending.has(m.id)) {
        pending.get(m.id)(m);
        pending.delete(m.id);
      } else if (m.method === 'Target.attachedToTarget') {
        const { sessionId, targetInfo } = m.params;
        frames.set(sessionId, targetInfo.url);
        // Çerçevenin de alt çerçevelerini yakala (iç içe oynatıcı).
        send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, sessionId);
      } else if (m.method === 'Target.detachedFromTarget') {
        frames.delete(m.params.sessionId);
      }
      if (m.method) for (const fn of listeners) fn(m);
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve) => {
      const n = ++id;
      pending.set(n, resolve);
      toChrome.write(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
    });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(1500);
  const loaded = await send('Extensions.loadUnpacked', { path: ext });
  const target = await send('Target.createTarget', { url: 'about:blank' });
  const attached = await send('Target.attachToTarget', { targetId: target.result.targetId, flatten: true });
  const sid = attached.result.sessionId;
  const cdp = (method, params) => send(method, params, sid);
  await cdp('Page.enable');
  // The site starts in English (0.9.92.3); these harnesses check Turkish texts, so a fresh browser picks Turkish.
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: "try { if (!localStorage.getItem('lang')) localStorage.setItem('lang', 'tr'); } catch (e) {}" });
  await cdp('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  const evaluate = async (expression) =>
    (await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true })).result?.result?.value;

  /** Adresinde `urlPart` geçen çerçevede çalıştırır (başka süreçteyse kendi oturumunda, değilse ayrı dünyada). */
  const evalFrame = async (urlPart, expression) => {
    for (const [sessionId] of frames) {
      const info = await send('Runtime.evaluate', { expression: 'location.href', returnByValue: true }, sessionId);
      if (String(info.result?.result?.value ?? '').includes(urlPart)) {
        return (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId)).result?.result?.value;
      }
    }
    const tree = (await cdp('Page.getFrameTree')).result?.frameTree;
    const find = (node) => (node?.frame?.url?.includes(urlPart) ? node.frame : (node?.childFrames ?? []).map(find).find(Boolean));
    const frame = find(tree);
    if (!frame) return undefined;
    const world = await cdp('Page.createIsolatedWorld', { frameId: frame.id, worldName: 'test' });
    return (await cdp('Runtime.evaluate', { expression, contextId: world.result.executionContextId, awaitPromise: true, returnByValue: true })).result?.result?.value;
  };

  const shot = async (name) => {
    const r = await cdp('Page.captureScreenshot', { format: 'png' });
    const file = `${out}-${name}.png`;
    writeFileSync(file, Buffer.from(r.result.data, 'base64'));
    console.log('  📸', file);
    return file;
  };
  /** Ekran görüntüsü alır, kaydeder ve piksellerini döner (renk örneklemek için). */
  const pixels = async (name) => {
    const r = await cdp('Page.captureScreenshot', { format: 'png' });
    const data = Buffer.from(r.result.data, 'base64');
    const file = `${out}-${name}.png`;
    writeFileSync(file, data);
    console.log('  📸', file);
    return decodePng(data);
  };
  /**
   * Aynı tarayıcıda arka planda ayrı bir sekme açar (ör. ilgisiz bir site). `initScript` sayfanın her
   * yüklenişinde en başta çalışır.
   */
  const openTab = async (url, initScript) => {
    const created = await send('Target.createTarget', { url: 'about:blank', background: true });
    const targetId = created.result.targetId;
    const tab = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = tab.result.sessionId;
    await send('Page.enable', {}, s);
    if (initScript) await send('Page.addScriptToEvaluateOnNewDocument', { source: initScript }, s);
    await send('Page.navigate', { url }, s);
    return {
      evaluate: async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, s)).result?.result?.value,
      capture: async () => Buffer.from((await send('Page.captureScreenshot', { format: 'png' }, s)).result.data, 'base64'),
      close: () => send('Target.closeTarget', { targetId }),
    };
  };
  const mouse = (type, x, y, extra = {}) => cdp('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, ...extra });
  const click = async (x, y) => {
    await mouse('mouseMoved', x, y);
    await mouse('mousePressed', x, y);
    await mouse('mouseReleased', x, y);
  };
  const press = async (key, code, vk) => {
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, text: key.length === 1 ? key : key === 'Enter' ? '\r' : undefined });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });
  };
  const type = (text) => cdp('Input.insertText', { text });
  const navigate = (url) => cdp('Page.navigate', { url });
  /** Öğenin sayfadaki orta noktası (tıklamak için). */
  const center = async (selector) =>
    evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); e?.scrollIntoView({ block: 'center' }); const r = e?.getBoundingClientRect(); return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; })()`);
  const onEvent = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };
  /** Tarayıcının kendisine (sayfaya değil) komut: ör. Target.getTargets ile açık sekmeler. */
  const browser = (method, params = {}) => send(method, params);
  /** Başka bir hedefe (ör. eklentinin açtığı sekme, offscreen belge) bağlanıp içinde betik çalıştırır. */
  const attach = async (targetId) => {
    const s = (await send('Target.attachToTarget', { targetId, flatten: true })).result?.sessionId;
    return {
      evaluate: async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, s)).result?.result?.value,
    };
  };
  return { loaded, cdp, browser, attach, evaluate, evalFrame, shot, pixels, openTab, onEvent, mouse, click, press, type, navigate, center, sleep, close: () => chrome.kill() };
}
