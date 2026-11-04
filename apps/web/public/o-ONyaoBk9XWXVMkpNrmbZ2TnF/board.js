// The owner's test board: draws board.data.js (window.SIDELIT_BOARD) and builds the Turkish ticket the owner copies
// back to the Planner. Ticks and notes stay in this browser (localStorage, every access wrapped: private windows).
(() => {
  const B = window.SIDELIT_BOARD || { meta: {}, tests: [], decisions: [], road: [] };
  const TESTS = B.tests || [];
  const DECISIONS = B.decisions || [];
  const ROAD = B.road || [];
  const KEY = 'sidelit-board-v1';
  let st = { r: {}, n: {}, d: {}, dn: {}, road: '', f: 'all', tab: 'test' };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s === 'object') st = Object.assign(st, s);
  } catch {}
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {}
  };
  const $ = (id) => document.getElementById(id);
  const el = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else e.setAttribute(k, v);
    }
    e.append(...kids);
    return e;
  };
  const FILTER_TAG = { solo: 'tek başına', tabs: 'iki sekme', second: 'ikinci tarayıcı', friend: 'arkadaşla', soon: 'oyunlar' };
  const RESULTS = [['ok', '✅ Çalışıyor'], ['bad', '❌ Sorunlu'], ['skip', '⏭ Atla']];
  const STATUS = { done: 'bitti', now: 'sürüyor', next: 'sırada' };

  const meta = [];
  if (B.meta?.updated) meta.push(`Son güncelleme: ${B.meta.updated}`);
  if (B.meta?.live) meta.push(`canlı sürüm ${B.meta.live}`);
  $('meta').textContent = meta.join(' · ');

  function drawTests() {
    const host = $('groups');
    host.replaceChildren();
    for (const g of [...new Set(TESTS.map((x) => x.group))]) {
      const items = TESTS.filter((x) => x.group === g && (st.f === 'all' || x.filter === st.f || (st.f === 'soon' && x.soon)));
      if (!items.length) continue;
      host.append(el('h2', { text: g }));
      const list = el('div', { class: 'list' });
      for (const x of items) {
        const box = el('div', { class: 'item', 'data-id': x.id, 'data-state': st.r[x.id] || '' });
        const tags = el('div', { class: 'tags' }, el('span', { class: 'tag v', text: x.version || '—' }));
        if (FILTER_TAG[x.filter]) tags.append(el('span', { class: 'tag', text: FILTER_TAG[x.filter] }));
        if (x.soon) tags.append(el('span', { class: 'tag soon', text: 'yakında canlı' }));
        const res = el('div', { class: 'res', role: 'group', 'aria-label': 'Sonuç' });
        for (const [v, label] of RESULTS) {
          const b = el('button', { 'data-v': v, 'aria-pressed': String(st.r[x.id] === v), text: label });
          b.addEventListener('click', () => {
            if (st.r[x.id] === v) delete st.r[x.id];
            else st.r[x.id] = v;
            save();
            drawTests();
            update();
            document.querySelector(`.item[data-id="${CSS.escape(x.id)}"] button[data-v="${v}"]`)?.focus();
          });
          res.append(b);
        }
        const how = el('ul', { class: 'how' });
        for (const h of x.steps || []) how.append(el('li', { text: h }));
        const note = el('textarea', { class: 'note', 'aria-label': `Not: ${x.title}`, placeholder: 'Not (isteğe bağlı): ne oldu?' });
        note.value = st.n[x.id] || '';
        note.addEventListener('input', () => { st.n[x.id] = note.value; save(); update(); });
        box.append(el('div', {}, el('div', { class: 't', text: x.title }), tags), res, how, note);
        list.append(box);
      }
      host.append(list);
    }
  }

  function drawDecisions() {
    const host = $('decisions');
    host.replaceChildren();
    for (const x of DECISIONS) {
      const box = el('div', { class: 'item', 'data-id': x.id, 'data-state': st.d[x.id] ? 'ok' : '' });
      const left = el('div', {}, el('div', { class: 't', text: x.title }));
      if (x.link && /^https:\/\/claude\.ai\//.test(x.link)) {
        left.append(el('div', {}, el('a', { href: x.link, target: '_blank', rel: 'noopener noreferrer', text: 'Sayfayı aç ↗' })));
      }
      const res = el('div', { class: 'res' });
      for (const o of x.options || []) {
        const b = el('button', { 'data-v': 'ok', 'aria-pressed': String(st.d[x.id] === o), text: o });
        b.addEventListener('click', () => {
          if (st.d[x.id] === o) delete st.d[x.id];
          else st.d[x.id] = o;
          save();
          drawDecisions();
          update();
        });
        res.append(b);
      }
      const note = el('textarea', { class: 'note', 'aria-label': `Not: ${x.title}`, placeholder: 'Not (isteğe bağlı)' });
      note.value = st.dn[x.id] || '';
      note.addEventListener('input', () => { st.dn[x.id] = note.value; save(); update(); });
      box.append(left, res, note);
      host.append(box);
    }
  }

  function drawRoad() {
    const host = $('road');
    host.replaceChildren();
    for (const x of ROAD) {
      const s = el('div', { class: 'step', 'data-s': x.status });
      s.append(el('h3', {}, `${x.title} `, el('span', { class: `pill ${x.status}`, text: STATUS[x.status] || '' })));
      if (x.text) s.append(el('p', { text: x.text }));
      if (x.list) {
        const u = el('ul', {});
        for (const i of x.list) u.append(el('li', { text: i }));
        s.append(u);
      }
      host.append(s);
    }
    const rn = $('road-note');
    rn.value = st.road || '';
    rn.addEventListener('input', () => { st.road = rn.value; save(); update(); });
  }

  function update() {
    const by = (v) => TESTS.filter((x) => st.r[x.id] === v);
    const ok = by('ok'), bad = by('bad'), skip = by('skip');
    $('s-todo').textContent = TESTS.filter((x) => !x.soon && !st.r[x.id]).length;
    $('s-ok').textContent = ok.length;
    $('s-bad').textContent = bad.length;
    $('s-dec').textContent = DECISIONS.filter((x) => !st.d[x.id]).length;
    const note = (x) => (st.n[x.id] || '').trim();
    const line = (x) => `- ${x.title}${note(x) ? ` — not: ${note(x)}` : ''}`;
    const lines = [];
    if (ok.length) lines.push('✅ Çalışıyor:', ...ok.map(line));
    if (bad.length) lines.push('❌ Sorunlu:', ...bad.map(line));
    if (skip.length) lines.push('⏭ Atladım:', ...skip.map((x) => `- ${x.title}`));
    const noted = TESTS.filter((x) => !st.r[x.id] && note(x));
    if (noted.length) lines.push('📝 Not:', ...noted.map(line));
    const dnote = (x) => (st.dn[x.id] || '').trim();
    const dec = DECISIONS.filter((x) => st.d[x.id] || dnote(x));
    if (dec.length) {
      lines.push('🗳️ Kararlarım:', ...dec.map((x) => `- ${x.title.split(':')[0]}: ${st.d[x.id] || '—'}${dnote(x) ? ` (${dnote(x)})` : ''}`));
    }
    if ((st.road || '').trim()) lines.push(`🛣️ Yol notu: ${st.road.trim()}`);
    $('out').value = lines.length
      ? `Deneme panosu sonuçlarım:\n${lines.join('\n')}`
      : 'Henüz bir şey işaretlemedin. Bir maddeye ✅ / ❌ / ⏭ bas, burada belirsin.';
  }

  function setTab(t) {
    if (!['test', 'dec', 'road'].includes(t)) t = 'test';
    st.tab = t;
    save();
    for (const k of ['test', 'dec', 'road']) {
      $(`tab-${k}`).setAttribute('aria-selected', String(k === t));
      $(`p-${k}`).hidden = k !== t;
    }
  }
  for (const k of ['test', 'dec', 'road']) $(`tab-${k}`).addEventListener('click', () => setTab(k));
  const chips = [...document.querySelectorAll('.chip')];
  if (!chips.some((c) => c.dataset.f === st.f)) st.f = 'all';
  for (const c of chips) {
    c.setAttribute('aria-pressed', String(c.dataset.f === st.f));
    c.addEventListener('click', () => {
      st.f = c.dataset.f;
      save();
      for (const x of chips) x.setAttribute('aria-pressed', String(x === c));
      drawTests();
    });
  }
  $('copy').addEventListener('click', async () => {
    const out = $('out');
    const msg = $('copied');
    try {
      await navigator.clipboard.writeText(out.value);
      msg.textContent = 'Kopyalandı ✓';
    } catch {
      out.focus();
      out.select();
      msg.textContent = 'Seçildi, Ctrl/Cmd+C ile kopyala';
    }
    setTimeout(() => { msg.textContent = ''; }, 2500);
  });

  drawTests();
  drawDecisions();
  drawRoad();
  setTab(st.tab);
  update();
})();
