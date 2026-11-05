// Çiz-Bil: lobi, kelime seçimi (sadece çizene), çizimin aktarılması, geç gelenin çizimi alması, tahminler (yanlış
// herkese, "yaklaştın" sadece tahmin edene, doğru bilenin puanı), bilenlerin gizli sohbeti, herkes bilince turun
// bitmesi ve kelimenin açıklanması, sıranın sonraki çizene geçmesi.
const base = process.argv[2] ?? 'ws://localhost:8787';
const game = 'draw' + Math.random().toString(36).slice(2, 8);

function client(name, cid, id = game) {
  const ws = new WebSocket(`${base}/api/draw/${id}/ws`);
  const inbox = [];
  let last = null;
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    inbox.push(m);
    if (m.t === 'state') last = m;
  });
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, name, cid, lang: 'tr' })));
  let nudgedAt = 0;
  const wait = async (pred, label, ms = 8000) => {
    for (let i = 0; i < ms / 50; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      // Like the game page: a phase whose time is up and that hasn't moved gets a ping (any message makes the server
      // catch up). Live alarms can run tens of seconds late right after a deploy (BH2: draw.mjs waited 25 s silently).
      const now = Date.now();
      if (last?.endsAt && last.endsAt + 1500 < now && now - nudgedAt > 3000 && ws.readyState === WebSocket.OPEN) {
        nudgedAt = now;
        ws.send(JSON.stringify({ t: 'ping' }));
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    // Say where the game stood (live failures are otherwise blind): the last state, and the server's clock from the
    // newest pong.
    const pong = [...inbox].reverse().find((m) => m.t === 'pong');
    const seen = last && { phase: last.phase, endsAt: last.endsAt, round: last.round, rounds: last.rounds, players: last.players?.map((p) => `${p.name}:${p.online ? 'on' : 'off'}`) };
    throw new Error(`${name}: timeout ${label} · last state ${JSON.stringify(seen)} · server now ${pong?.now ?? '?'} · pongs ${inbox.filter((m) => m.t === 'pong').length} · open ${ws.readyState === WebSocket.OPEN}`);
  };
  return { ws, wait, inbox, send: (m) => ws.send(JSON.stringify(m)), get state() { return last; } };
}
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Waits for what the server's storage alarm moves on (the 6 s reveal): live alarms were seen running several seconds
// late right after a deploy, so these get more room than plain replies.
const ALARM_WAIT = 25_000;

const alex = client('Alex', 'drawAlex000001');
const wa = await alex.wait((m) => m.t === 'welcome', 'welcome');
alex.send({ t: 'start' });
const few = await alex.wait((m) => m.t === 'error', 'too few');
ok(few.code === 'too_few', 'Tek kişiyken oyun başlamıyor (too_few)');
const sam = client('Sam', 'drawSam00001');
const wy = await sam.wait((m) => m.t === 'welcome', 'welcome sam');
const max = client('Max', 'drawMax000001');
const wc = await max.wait((m) => m.t === 'welcome', 'welcome can');
await sleep(300);
ok(max.state.phase === 'lobby' && max.state.players.length === 3, 'Üç kişi lobide');

sam.send({ t: 'start' });
ok((await sam.wait((m) => m.t === 'error', 'not host start')).code === 'not_host', 'Only the host (the first player still here) starts');
sam.send({ t: 'hello', v: 3, name: 'Other', cid: 'drawOther0001', lang: 'tr' });
ok((await sam.wait((m) => m.t === 'error', 'second hello')).code === 'bad', 'A second hello on the same connection is refused');
alex.send({ t: 'start' });
const choices = await alex.wait((m) => m.t === 'choices', 'choices');
ok(choices.words.length === 3, 'İlk çizen (ilk gelen Alex) üç kelime aldı');
await sleep(200);
ok(!sam.inbox.some((m) => m.t === 'choices') && max.state.phase === 'choose' && max.state.drawer === wa.you, 'Kelimeler sadece çizene gitti, diğerleri "seçiyor" görüyor');

alex.send({ t: 'choose', index: 1 });
const word = choices.words[1];
await alex.wait((m) => m.t === 'state' && m.phase === 'draw', 'draw alex');
await sleep(200);
ok(alex.state.word === word && !('word' in sam.state) && sam.state.hint.replace(/[_ ]/g, '') === '', 'Kelime sadece çizende; diğerlerinde "_ _ _"');

// Çizim: Alex çizer, Sam ve Max görür; Sam çizemez.
alex.send({ t: 'stroke', s: { c: 2, w: 1, p: [100, 100, 200, 150, 300, 220] } });
const st = await max.wait((m) => m.t === 'stroke', 'stroke');
ok(st.s.p.length === 6 && st.s.c === 2, 'Çizgi diğerlerine ulaştı');
// A fill and one pen press in two pieces (same group), then undo: the whole press goes, the earlier line and the
// fill stay, and everyone gets the rest to redraw.
alex.send({ t: 'stroke', s: { c: 5, w: 0, p: [500, 400], f: 1, g: 7 } });
const fill = await max.wait((m) => m.t === 'stroke' && m.s.f === 1, 'fill');
ok(fill.s.p.length === 2 && fill.s.g === 7, 'A fill reaches the others');
alex.send({ t: 'stroke', s: { c: 0, w: 4, p: [10, 10, 50, 50], g: 8 } });
alex.send({ t: 'stroke', s: { c: 0, w: 4, p: [50, 50, 90, 90], g: 8 } });
await max.wait((m) => m.t === 'stroke' && m.s.g === 8 && m.s.p[0] === 50, 'second piece');
alex.send({ t: 'undo' });
const rest = await max.wait((m) => m.t === 'strokes', 'undo');
ok(rest.list.length === 2 && rest.list[1].f === 1 && !rest.list.some((x) => x.g === 8), 'Undo took back the whole last press (both pieces), the rest is redrawn');
sam.send({ t: 'stroke', s: { c: 0, w: 0, p: [1, 1, 2, 2] } });
const nd = await sam.wait((m) => m.t === 'error', 'not drawer');
ok(nd.code === 'not_drawer', 'Çizen olmayan çizemiyor');

// Yanlış tahmin herkese; doğru tahmin metni kimseye gitmez, puan.
sam.send({ t: 'guess', text: 'yanlış kelime' });
const wrong = await max.wait((m) => m.t === 'guess', 'wrong guess');
ok(wrong.text === 'yanlış kelime' && wrong.name === 'Sam', 'Yanlış tahmin herkese göründü');
sam.send({ t: 'guess', text: word.toUpperCase() });
const right = await max.wait((m) => m.t === 'correct', 'correct');
await sleep(200);
ok(right.name === 'Sam' && right.rank === 1 && right.points > 150 && !max.inbox.some((m) => m.t === 'guess' && m.text.toLowerCase() === word), 'Sam guessed first (#1, > 150 points), the word was shown to nobody');

// Bilenler kendi arasında: Sam'in mesajı Max'a gitmez, Alex'e gider.
sam.send({ t: 'guess', text: 'çok kolaydı' });
const secret = await alex.wait((m) => m.t === 'guess' && m.secret, 'secret');
await sleep(200);
ok(secret.text === 'çok kolaydı' && !max.inbox.some((m) => m.t === 'guess' && m.text === 'çok kolaydı'), 'Bilenin mesajı sadece çizene ve bilenlere gitti');

// Geç gelen o ana kadarki çizimi alır.
const robin = client('Robin', 'drawRobin0001');
const list = await robin.wait((m) => m.t === 'strokes', 'late strokes');
ok(list.list.length === 2, 'Geç gelen o ana kadarki çizimi aldı');
// Undo re-sends the whole drawing to everyone, so it is limited to about one a second: a burst gets "rate".
alex.inbox.length = 0;
for (let i = 0; i < 6; i++) alex.send({ t: 'undo' });
ok((await alex.wait((m) => m.t === 'error', 'undo rate')).code === 'rate', 'A burst of undos is cut (about one a second)');
// Max tries three wrong words first (two are free, the third costs 10 %).
for (const w of ['xx1', 'xx2', 'xx3']) max.send({ t: 'guess', text: w });
await sleep(400);
robin.send({ t: 'guess', text: word });
const second = await robin.wait((m) => m.t === 'correct' && m.name === 'Robin', 'robin correct');
ok(second.rank === 2 && second.points < right.points, 'The second guesser gets less than the first');
max.send({ t: 'guess', text: word });
const third = await max.wait((m) => m.t === 'correct' && m.name === 'Max', 'can correct');
ok(third.rank === 3 && third.points < second.points, 'The third guesser, after three wrong tries, gets less still');
const reveal = await sam.wait((m) => m.t === 'state' && m.phase === 'reveal', 'reveal', 6000);
ok(reveal.word === word, 'Everyone guessed: the round ended, the word was shown to everyone');
const drawerGain = reveal.players.find((p) => p.id === wa.you).gained;
const average = Math.round((right.points + second.points + third.points) / 3);
ok(drawerGain === average && reveal.players.find((p) => p.id === wa.you).score === drawerGain, 'The drawer got the guessers’ average (everyone guessed)');

// Sıradaki çizen: Sam (geliş sırası).
const next = await sam.wait((m) => m.t === 'choices', 'next choices', ALARM_WAIT);
// The server sends the words just before the new state; live, they can arrive in separate packets (0.9.93.9 deploy:
// the check read the reveal's state, drawer still Alex), so wait for the "choose" state itself.
const choosing = await sam.wait((m) => m.t === 'state' && m.phase === 'choose' && m.round === reveal.round + 1, 'choose state');
ok(next.words.length === 3 && choosing.drawer === wy.you, 'Sıra Sam’e geçti, kelimeleri o seçiyor');

// Sıfırla: lobi, puanlar 0. (Kutuda oyun başlamadan önceki "lobi" mesajları var: önce boşalt.)
max.send({ t: 'reset' });
ok((await max.wait((m) => m.t === 'error', 'not host reset')).code === 'not_host', 'Only the host resets the game');
max.inbox.length = 0;
alex.send({ t: 'reset' });
await max.wait((m) => m.t === 'state' && m.phase === 'lobby', 'lobby');
ok(max.state.players.every((p) => p.score === 0), 'Sıfırla: lobiye dönüldü, puanlar sıfır');

for (const c of [alex, sam, max, robin]) c.ws.close();

// A short game: the host picks English and one round each; two turns, then the podium.
const short = 'draw' + Math.random().toString(36).slice(2, 8);
const eda = client('Eda', 'drawEda000001', short);
const ew = await eda.wait((m) => m.t === 'welcome', 'welcome eda');
const fat = client('Fat', 'drawFat000001', short);
await fat.wait((m) => m.t === 'welcome', 'welcome fat');
await sleep(300);
ok(eda.state.host === ew.you && eda.state.rounds === 2, 'The first player is the host; default: everyone draws twice');
fat.send({ t: 'settings', rounds: 1 });
ok((await fat.wait((m) => m.t === 'error', 'not host')).code === 'not_host', 'Only the host changes the settings');
eda.send({ t: 'settings', rounds: 1, lang: 'en' });
await fat.wait((m) => m.t === 'state' && m.rounds === 1 && m.lang === 'en', 'settings');
eda.send({ t: 'start' });
// Like the game pages, ping now and then: a phase whose time is up moves on with any message even when the server's
// alarm runs late (live, right after a deploy, it was seen late by more than 25 s twice in a row; 0.9.93.2).
const pinger = setInterval(() => {
  for (const c of [eda, fat]) if (c.ws.readyState === WebSocket.OPEN) c.send({ t: 'ping' });
}, 2000);
// Wait by round: the first turn's drawer never read that turn's own "draw" / "reveal" states, and on its turn as the
// guesser they were still in its inbox. Matched first, they made it guess before the word was chosen (the guess was
// lost) and then wait for a podium while the second turn ran its 80 s (live, a few ms slower than local: 4 of 5 runs
// after 0.9.93.5).
for (const [round, drawer, guesser] of [[1, eda, fat], [2, fat, eda]]) {
  const words = await drawer.wait((m) => m.t === 'choices', 'short choices', ALARM_WAIT);
  ok(words.words.every((w) => /^[a-z ]+$/.test(w)), 'English words');
  drawer.send({ t: 'choose', index: 0 });
  await guesser.wait((m) => m.t === 'state' && m.phase === 'draw' && m.round === round, 'short draw');
  guesser.send({ t: 'guess', text: words.words[0] });
  await guesser.wait((m) => m.t === 'state' && m.phase === 'reveal' && m.round === round, 'short reveal');
}
const end = await eda.wait((m) => m.t === 'state' && m.phase === 'over', 'over', ALARM_WAIT);
ok(end.players.every((p) => p.score > 0), 'Everyone drew once: podium');

// BHG: one of two players reloads mid-game: the game waits for them (FEW_GRACE_MS) instead of going to the lobby.
eda.send({ t: 'start' });
await eda.wait((m) => m.t === 'state' && m.phase === 'choose', 'again', ALARM_WAIT);
fat.ws.close();
await eda.wait((m) => m.t === 'state' && m.players.some((p) => !p.online), 'fat offline');
await sleep(1200);
ok(eda.state.phase !== 'lobby', 'A player who drops mid-game does not send the game back to the lobby at once');
const fat2 = client('Fat', 'drawFat000001', short);
await fat2.wait((m) => m.t === 'welcome', 'fat back');
await sleep(300);
ok(fat2.state.phase !== 'lobby' && fat2.state.players.length === 2 && fat2.state.players.every((p) => p.online), 'Back within the grace: the same game goes on with both players');
clearInterval(pinger);
for (const c of [eda, fat2]) c.ws.close();
setTimeout(() => process.exit(0), 100);
