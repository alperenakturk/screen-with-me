// Gerçek Chrome'u eklentiyle açar ve sürer. Markalı Chrome artık --load-extension kabul
// etmiyor; --remote-debugging-pipe + --enable-unsafe-extension-debugging ile açılıp eklenti
// CDP'nin Extensions.loadUnpacked komutuyla yüklenir.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

export async function launch({ ext, out, width = 1280, height = 860, headless = true }) {
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
  return { loaded, cdp, evaluate, evalFrame, shot, mouse, click, press, type, navigate, center, sleep, close: () => chrome.kill() };
}
