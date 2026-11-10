// 🐞 Test Lab, 🎬 Video & network (card DL4, lane B): accidents on purpose, on this tab's own side only. The room gives
// the lab small named handles (`DebugRoom.lab`, see debug-lab.ts `RoomLab`); nothing here reaches into the room's
// code, and nothing gives the server a new power: a drop or a slow network is this tab's connection, a drift or a stall
// is this tab's player. Part of the lab chunk (lazy, never loaded with the lab off).
import { debugRoom, labFail, type LabCommand, type LabText, type RoomLab } from '../debug-lab.ts';

/** The film-server harness (scripts/harness/embed/film-server.mjs): a film page with a pre-roll ad before the film. */
export const FILM_AD_URL = 'http://localhost:5299/preroll';

const lab = (): RoomLab | null => debugRoom()?.lab ?? null;
const NOT_IN_ROOM = { en: 'not in a room', tr: 'odada değilsin' };
const IN_ROOM = { en: 'in a room', tr: 'odada' };
const WITH_VIDEO = { en: 'with a video', tr: 'video açıkken' };
const inRoom = (): true | LabText => (lab() ? true : NOT_IN_ROOM);
/** Card LAB2: a command that needs a video says so before it runs (it used to run and end in a red line). */
const withVideo = (): true | LabText => {
  const handles = lab();
  if (!handles) return NOT_IN_ROOM;
  return handles.playback().item ? true : { en: 'add a video first (a link, or 🧪 Sync test)', tr: 'önce bir video ekle (bir link ya da 🧪 Senkron testi)' };
};
const local = (): boolean => ['localhost', '127.0.0.1'].includes(location.hostname);
/** A whole number from the command box's argument, within limits, or the default. */
function amount(arg: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(arg?.trim());
  return Number.isFinite(n) && arg?.trim() ? Math.min(max, Math.max(min, n)) : fallback;
}
function need(): RoomLab {
  const handles = lab();
  if (!handles) throw labFail(NOT_IN_ROOM);
  return handles;
}

export function createVideoLab() {
  let latencyBefore = 0;
  const commands: LabCommand[] = [
    {
      id: 'net.drop',
      title: { en: 'Drop my connection for 6 s', tr: 'Bağlantımı 6 sn kopar' },
      help: {
        en: 'The room loses me for a moment and I come back as the same person: voice, a stream and a game should stay. A number sets the seconds (1–60).',
        tr: 'Oda beni bir an kaybeder, aynı kişi olarak geri dönerim: ses, yayın ve oyun yerinde kalmalı. Bir sayı yazarsan saniyeyi o olur (1–60).',
      },
      tab: 'video',
      where: IN_ROOM,
      available: inRoom,
      run: (arg) => {
        const s = amount(arg, 6, 1, 60);
        need().drop(s * 1000);
        return { en: `connection down for ${s} s`, tr: `bağlantı ${s} sn kopuk` };
      },
    },
    {
      id: 'net.restart',
      title: { en: 'Pretend the server restarted', tr: 'Sunucu yeniden başlamış gibi yap' },
      help: {
        en: 'I reconnect at once, the way the room comes back after an update: voice, a stream and a game should stay.',
        tr: 'Hemen yeniden bağlanırım, güncellemeden sonra oda nasıl geri geliyorsa öyle: ses, yayın ve oyun yerinde kalmalı.',
      },
      tab: 'video',
      where: IN_ROOM,
      available: inRoom,
      run: () => {
        need().restart();
        return { en: 'reconnecting as the same person', tr: 'aynı kişi olarak yeniden bağlanıyor' };
      },
    },
    {
      id: 'net.slow',
      title: { en: 'Make my internet slow', tr: 'İnternetimi yavaşlat' },
      help: {
        en: 'Everything I send and get waits 0.8 s, like a weak connection: buttons answer late, the video should still stay together. A number sets the ms (up to 10000). Undo puts it back.',
        tr: 'Gönderdiğim ve aldığım her şey 0,8 sn bekler, zayıf bağlantı gibi: düğmeler geç cevap verir, video yine de birlikte kalmalı. Bir sayı yazarsan ms olur (en çok 10000). Geri al düzeltir.',
      },
      tab: 'video',
      where: IN_ROOM,
      available: inRoom,
      run: (arg) => {
        const handles = need();
        latencyBefore = handles.latencyMs();
        const ms = amount(arg, 800, 0, 10_000);
        handles.latency(ms);
        return { en: `everything waits ${ms} ms`, tr: `her şey ${ms} ms bekliyor` };
      },
      undo: () => lab()?.latency(latencyBefore),
    },
    {
      id: 'net.http',
      title: { en: 'Use the backup connection', tr: 'Yedek bağlantıyı kullan' },
      help: {
        en: 'I reconnect the backup way, as on a network where the live connection never opens (a phone hotspot): the room should work the same, a little slower. Undo or "Network back to normal" ends it.',
        tr: 'Yedek yoldan yeniden bağlanırım, canlı bağlantının hiç açılmadığı bir ağdaki gibi (telefonun hotspot\'u): oda aynı çalışmalı, biraz daha yavaş. Geri al ya da "Ağ normale dönsün" bitirir.',
      },
      tab: 'video',
      where: IN_ROOM,
      available: inRoom,
      run: () => {
        need().forceHttp(true);
        return { en: 'reconnecting the backup way', tr: 'yedek yoldan yeniden bağlanıyor' };
      },
      undo: () => lab()?.forceHttp(false),
    },
    {
      id: 'net.normal',
      title: { en: 'Network back to normal', tr: 'Ağ normale dönsün' },
      help: {
        en: 'No waiting and the normal live connection again; reconnects if the backup way was on.',
        tr: 'Bekleme kalkar, normal canlı bağlantıya dönülür; yedek yol açıksa yeniden bağlanır.',
      },
      tab: 'video',
      where: IN_ROOM,
      available: inRoom,
      run: () => {
        const handles = need();
        handles.latency(0);
        if (handles.forcedHttp()) handles.forceHttp(false);
        return { en: 'network back to normal', tr: 'ağ normale döndü' };
      },
    },
    {
      id: 'limits.flood',
      title: { en: 'Send too much at once', tr: 'Bir anda çok fazla gönder' },
      help: {
        en: 'This tab sends 300 messages in one go, far more than a person ever does: the room closes my connection with a note ("sent too much at once") and I reconnect as the same person. A number sets how many (1–1000).',
        tr: 'Bu sekme bir seferde 300 mesaj gönderir, bir insanın hiç göndermeyeceği kadar: oda bağlantımı bir notla kapatır ("bir anda çok fazla şey gönderdi") ve aynı kişi olarak geri bağlanırım. Bir sayı yazarsan kaç tane olacağı o olur (1–1000).',
      },
      tab: 'video',
      where: IN_ROOM,
      available: inRoom,
      run: (arg) => {
        const n = amount(arg, 300, 1, 1000);
        need().flood(n);
        return { en: `sent ${n} at once`, tr: `bir anda ${n} gönderildi` };
      },
    },
    {
      id: 'limits.crowd',
      title: { en: 'Open 12 more connections to this room', tr: 'Bu odaya 12 bağlantı daha aç' },
      help: {
        en: 'Opens 12 extra connections from this browser (they never join; closed after 5 s). One address may hold 12 in a room, so with mine the last one is refused ("too many connections from your network"). A test server started for CI lets all of them in. They also count toward the 60 new connections one address may open in a minute, so fake friends may need a minute to get in afterwards. A number sets how many (1–40).',
        tr: 'Bu tarayıcıdan 12 bağlantı daha açar (odaya girmezler; 5 sn sonra kapanır). Bir adres bir odada 12 bağlantı tutabilir, benimkiyle birlikte sonuncusu reddedilir ("ağından çok fazla bağlantı var"). CI için açılan test sunucusu hepsini alır. Bir adresin dakikada açabileceği 60 yeni bağlantıdan da sayılırlar; bu yüzden sonrasında sahte arkadaşların girmesi bir dakika sürebilir. Bir sayı yazarsan kaç tane olacağı o olur (1–40).',
      },
      tab: 'video',
      where: IN_ROOM,
      available: inRoom,
      run: async (arg) => {
        const n = amount(arg, 12, 1, 40);
        const url = need().socketUrl();
        const results = await Promise.all(
          Array.from(
            { length: n },
            () =>
              new Promise<boolean>((done) => {
                const ws = new WebSocket(url);
                let refused = false;
                ws.addEventListener('message', (e) => {
                  if (String(e.data).includes('"room_ip_full"')) refused = true;
                });
                ws.addEventListener('close', () => done(refused));
                setTimeout(() => {
                  ws.close();
                  done(refused);
                }, 5000);
              }),
          ),
        );
        const refused = results.filter(Boolean).length;
        return { en: `${n} opened, ${refused} refused for too many from this address`, tr: `${n} açıldı, ${refused} tanesi bu adresten çok fazla diye reddedildi` };
      },
    },
    {
      id: 'limits.fallbackCrowd',
      title: { en: 'Open 13 backup connections in other rooms', tr: 'Başka odalarda 13 yedek bağlantı aç' },
      help: {
        en: 'Opens 13 backup-way (hotspot) connections from this browser, each in a new empty room, then closes them. One address may hold 12 across all rooms, so one is refused. A test server started for CI lets all of them in. A number sets how many (1–30).',
        tr: 'Bu tarayıcıdan, her biri yeni ve boş bir odada olmak üzere 13 yedek yol (hotspot) bağlantısı açar, sonra kapatır. Bir adres tüm odalarda en çok 12 tutabilir, biri reddedilir. CI için açılan test sunucusu hepsini alır. Bir adresin dakikada açabileceği 60 yeni bağlantıdan da sayılırlar; bu yüzden sonrasında sahte arkadaşların girmesi bir dakika sürebilir. Bir sayı yazarsan kaç tane olacağı o olur (1–30).',
      },
      tab: 'video',
      run: async (arg) => {
        const n = amount(arg, 13, 1, 30);
        const tag = Math.random().toString(36).slice(2, 7);
        const opened: string[] = [];
        let refused = 0;
        for (let i = 0; i < n; i++) {
          const base = `${location.origin}/api/rooms/lab${tag}${i}/ws`;
          const r = await fetch(`${base}?http=open`, { method: 'POST', cache: 'no-store' }).catch(() => null);
          if (r?.status === 429) refused++;
          else if (r?.ok) {
            const { sid } = (await r.json()) as { sid: string };
            opened.push(`${base}?http=close&sid=${sid}`);
          }
        }
        for (const url of opened) await fetch(url, { method: 'POST' }).catch(() => {});
        return { en: `${opened.length} opened, ${refused} refused for too many from this address (all closed again)`, tr: `${opened.length} açıldı, ${refused} tanesi bu adresten çok fazla diye reddedildi (hepsi yeniden kapatıldı)` };
      },
    },
    {
      id: 'limits.serverError',
      title: { en: 'Make one server request fail', tr: 'Bir sunucu isteği hata versin' },
      help: {
        en: 'Local lab server only: one request fails inside the server on purpose. It must answer a short {"error":"unavailable"} (503) and write one line to its log, never an error page.',
        tr: 'Sadece yerel lab sunucusunda: bir istek sunucunun içinde bilerek hata verir. Kısa bir {"error":"unavailable"} (503) cevabı vermeli ve kaydına tek satır yazmalı, asla bir hata sayfası değil.',
      },
      tab: 'video',
      where: { en: 'test server only', tr: 'sadece test sunucusu' },
      available: () => (local() ? true : { en: 'not a local test server', tr: 'yerel test sunucusu değil' }),
      run: async () => {
        const r = await fetch('/api/lab/fail', { cache: 'no-store' });
        const body = await r.text();
        return { en: `answer ${r.status}: ${body.slice(0, 60)}`, tr: `cevap ${r.status}: ${body.slice(0, 60)}` };
      },
    },
    {
      id: 'limits.ageImages',
      title: { en: 'Chat images run out now', tr: 'Sohbet görselleri şimdi süresini doldursun' },
      help: {
        en: 'Local lab server only: the room drops its chat images as if their time were up (1 day, 7 in a saved room). Their messages stay; after a reload they show the "Image" placeholder.',
        tr: 'Sadece yerel lab sunucusunda: oda sohbet görsellerini süreleri dolmuş gibi siler (1 gün, kayıtlı odada 7). Mesajları kalır; sayfa yenilenince yerlerinde "Görsel" yazar.',
      },
      tab: 'video',
      where: { en: 'test server only', tr: 'sadece test sunucusu' },
      available: () => (local() ? inRoom() : { en: 'not a local test server', tr: 'yerel test sunucusu değil' }),
      run: () => {
        need().ageImages();
        return { en: 'asked the room', tr: 'odaya söylendi' };
      },
    },
    {
      id: 'video.drift',
      title: { en: 'My video falls 3 s behind', tr: 'Videom 3 sn geride kalsın' },
      help: {
        en: 'My video jumps 3 s behind the room: within a few seconds the sync must bring me back to the others. A number sets the seconds (plus = ahead, minus = behind).',
        tr: 'Videom odanın 3 sn gerisine düşer: birkaç saniye içinde senkron beni diğerlerinin yanına getirmeli. Bir sayı yazarsan saniye olur (artı = ileride, eksi = geride).',
      },
      tab: 'video',
      where: WITH_VIDEO,
      available: withVideo,
      run: (arg) => {
        const s = amount(arg, -3, -60, 60);
        if (!need().drift(s)) throw labFail({ en: 'no video playing here', tr: 'burada oynayan video yok' });
        const by = `${s > 0 ? '+' : ''}${s}`;
        return { en: `my video moved ${by} s`, tr: `videom ${by} sn kaydı` };
      },
    },
    {
      id: 'video.stall',
      title: { en: 'My video gets stuck for 5 s', tr: 'Videom 5 sn takılsın' },
      help: {
        en: 'My video acts as if it were loading: the room pauses for everyone with "waiting for …" and plays on by itself when I am ready. A number sets the seconds (1–30).',
        tr: 'Videom yükleniyormuş gibi takılır: oda herkes için "… bekleniyor" diye durur, ben hazır olunca kendiliğinden devam eder. Bir sayı yazarsan saniye olur (1–30).',
      },
      tab: 'video',
      where: WITH_VIDEO,
      available: withVideo,
      run: (arg) => {
        const s = amount(arg, 5, 1, 30);
        if (!need().stall(s * 1000)) throw labFail({ en: 'no video in the room', tr: 'odada video yok' });
        return { en: `my video stuck for ${s} s`, tr: `videom ${s} sn takılı` };
      },
    },
    {
      id: 'video.adFilm',
      title: { en: 'Open a film page with an ad first', tr: 'Önce reklam çıkan bir film sayfası aç' },
      help: {
        en: `Adds our test film page (${FILM_AD_URL}) that plays a short ad before the film: with the extension, the room must wait out the ad and sync the film.`,
        tr: `Filmden önce kısa reklam gösteren test film sayfamızı (${FILM_AD_URL}) sıraya ekler: eklentiyle oda reklamı beklemeli ve filmi eşitlemeli.`,
      },
      tab: 'video',
      where: { en: 'local test server only', tr: 'sadece yerel test sunucusu' },
      available: () => (!local() ? { en: 'only on the local test server (the test film page lives there)', tr: 'sadece yerel test sunucusunda (test film sayfası orada)' } : inRoom()),
      run: () => {
        need().addLink(FILM_AD_URL);
        return { en: 'film page with an ad queued', tr: 'reklamlı film sayfası sıraya eklendi' };
      },
    },
  ];
  return {
    commands,
    status: (): [LabText, LabText][] => {
      const handles = lab();
      if (!handles) return [];
      const way = handles.transport();
      const lines: [LabText, LabText][] = [
        [
          { en: 'Room connection', tr: 'Oda bağlantısı' },
          way === 'ws'
            ? { en: '🟢 live connection', tr: '🟢 canlı bağlantı' }
            : way === 'http'
              ? { en: '🟡 backup way', tr: '🟡 yedek yolla bağlı' }
              : way
                ? way
                : { en: '🔴 connecting…', tr: '🔴 bağlanıyor…' },
        ],
      ];
      if (handles.forcedHttp()) lines.push([{ en: 'Lab', tr: 'Lab' }, { en: 'backup way forced', tr: 'yedek yol zorlandı' }]);
      if (handles.latencyMs()) lines.push([{ en: 'Lab slowness', tr: 'Lab yavaşlığı' }, { en: `🟡 everything waits ${handles.latencyMs()} ms`, tr: `🟡 her şey ${handles.latencyMs()} ms bekliyor` }]);
      return lines;
    },
    /** The lab goes off: nothing of it stays (no latency, no forced fallback). */
    close(): void {
      const handles = lab();
      if (!handles) return;
      handles.latency(0);
      if (handles.forcedHttp()) handles.forceHttp(false);
    },
  };
}
