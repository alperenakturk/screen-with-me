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
      id: 'video.drift',
      title: { en: 'My video falls 3 s behind', tr: 'Videom 3 sn geride kalsın' },
      help: {
        en: 'My video jumps 3 s behind the room: within a few seconds the sync must bring me back to the others. A number sets the seconds (plus = ahead, minus = behind).',
        tr: 'Videom odanın 3 sn gerisine düşer: birkaç saniye içinde senkron beni diğerlerinin yanına getirmeli. Bir sayı yazarsan saniye olur (artı = ileride, eksi = geride).',
      },
      tab: 'video',
      where: WITH_VIDEO,
      available: inRoom,
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
      available: inRoom,
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
