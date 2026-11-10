// ART-L: render every tutorial picture + the sill scene on a page background, with or without the Matinee variables.
//   NODE_PATH=$(npm root -g) node docs/internal/design/games/art-l/render.cjs <svg folder> <out.png> <page colour> [css file]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const [dir, out, bg = '#e8dfcf', css] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 400 } });
  const files = [...fs.readdirSync(path.join(dir, 'tutorial')).map((f) => `tutorial/${f}`), 'garden/window-sill.svg'];
  const style = css ? fs.readFileSync(css, 'utf8').replace(":root[data-theme='matinee']", ':root') : '';
  await p.setContent(`<style>${style} body{margin:0;background:${bg};display:grid;grid-template-columns:repeat(6,1fr);gap:6px;padding:6px;font:11px system-ui;color:${bg < '#8' ? '#ccc' : '#564b3e'}}figure{margin:0}svg{width:100%;height:auto;display:block}</style>` +
    files.map((f) => `<figure>${fs.readFileSync(path.join(dir, f), 'utf8').replace(/id="([^"]+)"/g, `id="${path.basename(f, '.svg')}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${path.basename(f, '.svg')}-$1)`)}<figcaption>${path.basename(f)}</figcaption></figure>`).join(''));
  await p.waitForTimeout(500); await p.screenshot({ path: out, fullPage: true }); await b.close();
})();
