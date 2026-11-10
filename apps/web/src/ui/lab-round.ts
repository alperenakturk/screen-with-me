// 🐞 Test Lab, 🧪 Test round (card LAB2): one command per test on the owner's board (STATUS "Owner's hand tests": S1–S4,
// N1–N4, F1–F2 and the 0.9.98 round's items 1–11). Each sets the stage the lab can set (a theme, a font, a fake friend
// who writes / pauses / knocks, fullscreen, the invite's QR code) and says in one line what to look at; a test that needs
// a real second person or device says so. Undo puts back what it changed. Part of the lab chunk (lazy).
import { DEFAULT_THEME, type ThemeId } from '@swm/shared/themes';
import { debugRoom, labFail, type LabCommand, type LabText } from '../debug-lab.ts';
import { applyFont, currentFont, FONTS, type FontId } from '../fonts.ts';
import { load, save } from '../storage.ts';
import { applyTheme, currentTheme } from '../themes.ts';
import { MAX_FRIENDS, type FakeFriend } from './lab-friends.ts';
import type { ScenarioFriends } from './lab-scenarios.ts';

/** Both languages, always (LabText may be a plain string). */
type Pair = { en: string; tr: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const NOT_IN_ROOM: LabText = { en: 'open a room first', tr: 'önce bir oda aç' };
const inRoom = (): true | LabText => (debugRoom()?.lab ? true : NOT_IN_ROOM);
const hostInRoom = (): true | LabText => {
  const room = debugRoom()?.lab;
  if (!room) return NOT_IN_ROOM;
  return room.isHost() ? true : { en: 'only the host can (you are a guest here)', tr: 'yalnızca yönetici yapabilir (burada misafirsin)' };
};

const THEME_NAMES: Record<ThemeId, Pair> = {
  gece: { en: 'Night', tr: 'Gece' },
  matinee: { en: 'Matinee', tr: 'Matine' },
  okyanus: { en: 'Ocean', tr: 'Okyanus' },
  gunbatimi: { en: 'Sunset', tr: 'Gün batımı' },
  neon: { en: 'Neon', tr: 'Neon' },
  lokum: { en: 'Moonlit Nights', tr: 'Mehtaplı Geceler' },
  binbirgece: { en: 'Arabian Nights', tr: 'Binbir Gece' },
  sinema: { en: 'Picture Palace', tr: 'Sinema Sarayı' },
  acikhava: { en: 'Drive-In', tr: 'Açık Hava Sineması' },
  tren: { en: 'Night Express', tr: 'Gece Ekspresi' },
};
const FONT_NAMES: Record<FontId, string> = {
  device: "device / cihaz",
  sidelit: 'Sidelit',
  poster: 'Poster / Afiş',
  polished: 'Polished / Cilalı',
  readable: 'Readable / Okunaklı',
  rounded: 'Rounded / Yuvarlak',
  easy: 'Easy reading / Kolay okuma',
};
const TR_LETTERS = 'ğ ş ı İ Ç Ö Ü';

/** Shows one theme after another on this page only (the saved theme stays); Undo shows the saved one again. */
function themeCycle(themes: readonly ThemeId[], look: Pair) {
  let i = 0;
  return {
    run: (): LabText => {
      const id = themes[i % themes.length]!;
      i++;
      applyTheme(id, { wait: false, remember: false });
      const name = THEME_NAMES[id];
      const more = themes.length > 1 ? { en: ` (${i}/${themes.length}; run again for the next)`, tr: ` (${i}/${themes.length}; sıradaki için yeniden çalıştır)` } : { en: '', tr: '' };
      return { en: `${name.en}${more.en}: ${look.en}`, tr: `${name.tr}${more.tr}: ${look.tr}` };
    },
    undo: () => {
      i = 0;
      applyTheme(currentTheme(), { wait: false, remember: false });
    },
  };
}

/** A key's saved value kept in this tab, so an Undo after a reload can put it back. */
function keepThenSet(keys: readonly string[], value: (key: string) => string | null): void {
  const kept: Record<string, string | null> = {};
  for (const key of keys) kept[key] = load(key);
  try {
    if (sessionStorage.getItem('lab:roundKept') === null) sessionStorage.setItem('lab:roundKept', JSON.stringify(kept));
  } catch {
    // No tab storage: Undo can't put it back, the help says how.
  }
  for (const key of keys) save(key, value(key) ?? '');
}
function putBack(): boolean {
  let kept: Record<string, string | null> | null = null;
  try {
    kept = JSON.parse(sessionStorage.getItem('lab:roundKept') ?? 'null') as Record<string, string | null> | null;
    sessionStorage.removeItem('lab:roundKept');
  } catch {
    kept = null;
  }
  if (!kept) return false;
  for (const [key, value] of Object.entries(kept)) save(key, value ?? '');
  return true;
}

export function createTestRound(friends: ScenarioFriends) {
  let timers: ReturnType<typeof setTimeout>[] = [];
  const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
  const stopTimers = () => {
    for (const t of timers) clearTimeout(t);
    timers = [];
  };
  /** `count` fake friends in the room (earlier ones leave first when there is no place). */
  async function friendsIn(count: number): Promise<FakeFriend[]> {
    if (friends.list().length + count > MAX_FRIENDS) friends.removeAll();
    const before = friends.list().filter((f) => f.inRoom).length;
    friends.add(count);
    const end = Date.now() + 12_000;
    for (;;) {
      const here = friends.list().filter((f) => f.inRoom);
      if (here.length >= before + count) return here.slice(before);
      if (Date.now() > end) throw labFail({ en: 'the fake friend did not get in (wait a minute: one address may open 60 connections a minute)', tr: 'sahte arkadaş içeri giremedi (bir dakika bekle: bir adres dakikada 60 bağlantı açabilir)' });
      await sleep(150);
    }
  }
  const everyoneLeaves = () => {
    stopTimers();
    friends.removeAll();
  };
  /** Something plays (the sync test when the room is empty). */
  async function somethingPlays(): Promise<void> {
    const room = debugRoom()?.lab;
    if (!room || room.playback().item) return;
    room.syncTest();
    for (let i = 0; i < 40 && !room.playback().item; i++) await sleep(150);
  }

  /** The board's name for a test (n2old is the second half of N2). */
  const label = (id: string) => (id === 'n2old' ? 'N2b' : id.toUpperCase());
  const cmd = (id: string, title: Pair, help: LabText, run: LabCommand['run'], extra: Partial<LabCommand> = {}): LabCommand => ({
    id: `round.${id}`,
    title: { en: `Test round ${label(id)}: ${title.en}`, tr: `Test turu ${label(id)}: ${title.tr}` },
    help,
    tab: 'scenarios',
    run,
    ...extra,
  });
  /** A board test the lab can't set up: its help line says who or what it needs. */
  const needsPerson = (id: string, title: Pair, needs: Pair, look: Pair): LabCommand =>
    cmd(id, title, { en: `Needs ${needs.en}. ${look.en}`, tr: `${needs.tr} gerekir. ${look.tr}` }, () => ({ en: `needs ${needs.en}: ${look.en}`, tr: `${needs.tr} gerekir: ${look.tr}` }));

  const s1 = themeCycle(['gece', 'matinee', 'lokum', 'acikhava'], { en: 'on the home page Stub wears this theme\'s costume, the light starts at his torch and covers the laptop, tablet and phone', tr: 'ana sayfada Stub bu temanın kostümünü giyer, ışık fenerinden çıkar ve laptopu, tableti, telefonu kaplar' });
  const s2 = themeCycle(['neon'], { en: 'the coral and amber look reads well on the home page and in the room', tr: 'mercan ve kehribar görünüm ana sayfada ve odada rahat okunur' });
  const s3 = themeCycle(['lokum', 'acikhava', 'tren'], { en: 'at full screen (F11) the home page title and buttons have only sky behind them', tr: 'tam ekranda (F11) ana sayfanın başlığı ve düğmelerinin arkasında sadece gökyüzü var' });
  const n1 = themeCycle(['matinee'], { en: 'home, the room, ⚙️ Settings and 🎮 the games hall read well; the video\'s place stays black and the empty room\'s words on it are light', tr: 'ana sayfa, oda, ⚙️ Ayarlar ve 🎮 oyun salonu rahat okunur; videonun yeri siyah kalır, boş odanın üstündeki yazılar açık renktir' });
  const n2 = themeCycle(['okyanus', 'neon', 'matinee', 'gece'], { en: 'on the home page the slogan\'s second line, "Create room" and the step numbers have this theme\'s colour (Night keeps the gold)', tr: 'ana sayfada sloganın ikinci satırı, "Oda oluştur" ve adım numaraları bu temanın renginde (Gece altın rengini korur)' });
  let fontIndex = 0;
  const fontCycle = (list: readonly FontId[], look: Pair) => ({
    run: (): LabText => {
      const id = list[fontIndex % list.length]!;
      fontIndex++;
      applyFont(id, { remember: false });
      return { en: `${FONT_NAMES[id]} (${fontIndex}/${list.length}; run again for the next): ${look.en} ${TR_LETTERS}`, tr: `${FONT_NAMES[id]} (${fontIndex}/${list.length}; sıradaki için yeniden çalıştır): ${look.tr} ${TR_LETTERS}` };
    },
    undo: () => {
      fontIndex = 0;
      applyFont(currentFont(), { remember: false });
    },
  });
  const n3 = fontCycle(['sidelit', 'device'], { en: 'Sidelit (Figtree text) first, then the device\'s font; both read well, Turkish letters too:', tr: 'önce Sidelit (Figtree yazı), sonra cihazın yazı tipi; ikisi de rahat okunur, Türkçe harfler de:' });
  const f1 = fontCycle(FONTS, { en: 'the whole site changes at once; Turkish letters look right:', tr: 'bütün site bir anda değişir; Türkçe harfler düzgün görünür:' });

  const commands: LabCommand[] = [
    cmd('s1', { en: 'Stub in four themes', tr: 'Dört temada Stub' }, { en: 'Shows Night, Matinee, Moonlit Nights, Drive-In one by one (this page only). Look on the home page: Stub\'s costume, the light from his torch over the three screens. Undo: your theme again.', tr: 'Gece, Matine, Mehtaplı Geceler, Açık Hava\'yı sırayla gösterir (yalnızca bu sayfa). Ana sayfaya bak: Stub\'ın kostümü, fenerinden çıkan ışık üç ekranın üstünde. Geri al: kendi teman.' }, s1.run, { undo: s1.undo }),
    cmd('s2', { en: 'Neon\'s new look', tr: 'Neon\'un yeni görünümü' }, { en: 'Shows Neon on this page. Look at the home page and a room: coral and amber, easy to read. Undo: your theme again.', tr: 'Bu sayfada Neon\'u gösterir. Ana sayfaya ve bir odaya bak: mercan ve kehribar, kolay okunur. Geri al: kendi teman.' }, s2.run, { undo: s2.undo }),
    cmd('s3', { en: 'Scene themes at full screen', tr: 'Tam ekranda resimli temalar' }, { en: 'Shows Moonlit Nights, Drive-In, Night Express one by one. On the home page press F11: the title and buttons have only sky behind them. Undo: your theme again.', tr: 'Mehtaplı Geceler, Açık Hava, Gece Ekspresi\'ni sırayla gösterir. Ana sayfada F11\'e bas: başlık ve düğmelerin arkasında sadece gökyüzü var. Geri al: kendi teman.' }, s3.run, { undo: s3.undo }),
    cmd('s4', { en: 'Stub on the Help page and the empty room', tr: 'Yardım sayfasında ve boş odada Stub' }, { en: 'Opens the Help page in a new tab: Stub is there. An empty room (no video yet) shows Stub too. The "Start watching" card needs the extension on a film page (your own Chrome).', tr: 'Yardım sayfasını yeni sekmede açar: Stub orada. Boş bir oda (henüz video yok) da Stub\'ı gösterir. "İzlemeye başla" kartı için film sayfasında eklenti gerekir (kendi Chrome\'un).' }, () => {
      window.open('/help.html', '_blank', 'noopener');
      return { en: 'the Help page opened in a new tab: look for Stub', tr: 'Yardım sayfası yeni sekmede açıldı: Stub\'ı ara' };
    }),
    cmd('n1', { en: 'Matinee by day', tr: 'Gündüz Matine' }, { en: 'Shows Matinee on this page. Open ⚙️ Settings and 🎮 the games hall too: everything reads well, the video\'s place stays black. Undo: your theme again.', tr: 'Bu sayfada Matine\'yi gösterir. ⚙️ Ayarlar\'ı ve 🎮 oyun salonunu da aç: her şey rahat okunur, videonun yeri siyah kalır. Geri al: kendi teman.' }, n1.run, { undo: n1.undo }),
    cmd('n2', { en: 'The home page\'s colour in four themes', tr: 'Dört temada ana sayfanın rengi' }, { en: 'Shows Ocean, Neon, Matinee, Night one by one. On the home page the slogan\'s second line, "Create room" and the step numbers take the theme\'s colour; Night keeps the gold. Undo: your theme again.', tr: 'Okyanus, Neon, Matine, Gece\'yi sırayla gösterir. Ana sayfada sloganın ikinci satırı, "Oda oluştur" ve adım numaraları temanın rengini alır; Gece altın rengini korur. Geri al: kendi teman.' }, n2.run, { undo: n2.undo }),
    cmd('n2old', { en: 'A browser that had Ocean Liner', tr: 'Okyanus Gemisi seçili bir tarayıcı' }, { en: 'Saves the removed Ocean Liner theme as yours and reloads: the page must show Night. Undo puts your own theme back and reloads.', tr: 'Kaldırılan Okyanus Gemisi temasını seninki gibi kaydeder ve yeniler: sayfa Gece görünmeli. Geri al kendi temanı geri koyar ve yeniler.' }, () => {
      keepThenSet(['theme'], () => 'gemi');
      setTimeout(() => location.reload(), 300);
      return { en: 'reloading with Ocean Liner saved: Night must show', tr: 'Okyanus Gemisi kayıtlı olarak yenileniyor: Gece görünmeli' };
    }, { undo: () => {
      if (!putBack()) save('theme', DEFAULT_THEME);
      setTimeout(() => location.reload(), 300);
    } }),
    cmd('n3', { en: 'The Sidelit font and the device\'s font', tr: 'Sidelit yazı tipi ve cihazın yazı tipi' }, { en: 'Shows the default Sidelit font, then (run again) the device\'s font, on this page. A fresh browser starts with Sidelit; ⚙️ → My screen → Font → "the device\'s font" still works. Undo: your font again.', tr: 'Bu sayfada önce varsayılan Sidelit yazı tipini, sonra (yeniden çalıştır) cihazın yazı tipini gösterir. Yeni bir tarayıcı Sidelit ile başlar; ⚙️ → Ekranım → Yazı tipi → "cihazın yazı tipi" hâlâ çalışır. Geri al: kendi yazı tipin.' }, n3.run, { undo: n3.undo }),
    cmd('n4', { en: 'Where the camera window starts', tr: 'Kamera penceresinin başladığı yer' }, { en: 'Needs a second device with a camera in voice. Forgets where you put the camera window and reloads: it starts at the video\'s bottom left, above the player\'s bar. Drag it, reload, it stays; double-click its bar, it goes back. Undo puts your old place back and reloads.', tr: 'Seste kamerası açık ikinci bir cihaz gerekir. Kamera penceresini koyduğun yeri unutur ve yeniler: videonun sol altında, oynatıcının çubuğunun üstünde başlar. Sürükle, yenile, yerinde kalır; çubuğuna çift tıkla, geri gider. Geri al eski yerini geri koyar ve yeniler.' }, () => {
      keepThenSet(['camFloat:spot', 'camFloat:fsSpot'], () => 'null');
      setTimeout(() => location.reload(), 300);
      return { en: 'camera window place forgotten, reloading: join voice with 📷 on both devices', tr: 'kamera penceresinin yeri unutuldu, yenileniyor: iki cihazda da 📷 açık sese katıl' };
    }, { available: inRoom, where: { en: 'in a room', tr: 'odada' }, undo: () => {
      putBack();
      setTimeout(() => location.reload(), 300);
    } }),
    cmd('f1', { en: 'The seven fonts', tr: 'Yedi yazı tipi' }, { en: 'Shows the seven fonts one by one on this page (run again for the next): the whole site changes at once and ğ ş ı İ look right. Pick one in ⚙️ → My screen → Font to check it stays after a reload. Undo: your font again.', tr: 'Yedi yazı tipini bu sayfada sırayla gösterir (sıradaki için yeniden çalıştır): bütün site bir anda değişir, ğ ş ı İ düzgün görünür. Yenilemeden sonra kaldığını görmek için ⚙️ → Ekranım → Yazı tipi\'nden birini seç. Geri al: kendi yazı tipin.' }, f1.run, { undo: f1.undo }),
    cmd('f2', { en: 'The home title\'s typeface', tr: 'Ana sayfa başlığının yazı tipi' }, { en: 'Opens the home page in a new tab: its big title has the same letters as "Sidelit" in the top bar.', tr: 'Ana sayfayı yeni sekmede açar: büyük başlığı üst çubuktaki "Sidelit" ile aynı harflerde.' }, () => {
      window.open('/', '_blank', 'noopener');
      return { en: 'the home page opened: compare its title with "Sidelit" in the top bar', tr: 'ana sayfa açıldı: başlığını üst çubuktaki "Sidelit" ile karşılaştır' };
    }),
    cmd('t1', { en: 'Playing together (a fake friend)', tr: 'Birlikte oynatma (sahte arkadaş)' }, { en: 'A fake friend joins; 6 s apart they pause, play and jump 30 s ahead: your video follows each time. Real YouTube with a real friend is still yours to try (item 1). Undo: the friend leaves.', tr: 'Sahte bir arkadaş girer; 6 sn arayla durdurur, oynatır ve 30 sn ileri atlar: videon her seferinde takip eder. Gerçek bir arkadaşla gerçek YouTube yine sende (madde 1). Geri al: arkadaş çıkar.' }, async () => {
      const [f] = await friendsIn(1);
      await somethingPlays();
      later(2000, () => f!.pause());
      later(8000, () => f!.play());
      later(14_000, () => f!.seek(30));
      return { en: `${f!.name} pauses in 2 s, plays at 8 s, jumps +30 s at 14 s`, tr: `${f!.name} 2 sn sonra durdurur, 8. sn oynatır, 14. sn +30 sn atlar` };
    }, { available: inRoom, where: { en: 'in a room', tr: 'odada' }, undo: everyoneLeaves }),
    cmd('t2', { en: 'Fullscreen with messages', tr: 'Mesajlarla tam ekran' }, { en: 'Something plays, the room goes fullscreen and a fake friend writes three lines 3 s apart: they come in on the right, never over the player\'s own bar; the rail comes at the right edge. Undo: fullscreen ends, the friend leaves.', tr: 'Bir şey oynar, oda tam ekran olur ve sahte bir arkadaş 3 sn arayla üç satır yazar: sağdan gelirler, oynatıcının kendi çubuğunun üstüne asla binmezler; ray sağ kenarda gelir. Geri al: tam ekran biter, arkadaş çıkar.' }, async () => {
      const [f] = await friendsIn(1);
      await somethingPlays();
      document.querySelector<HTMLButtonElement>('#fullscreen')?.click();
      for (let i = 1; i <= 3; i++) later(i * 3000, () => f!.say(`fullscreen test ${i}/3`));
      return { en: 'fullscreen: three messages come in 3 s apart', tr: 'tam ekran: üç mesaj 3 sn arayla gelir' };
    }, { available: inRoom, where: { en: 'in a room', tr: 'odada' }, undo: () => {
      everyoneLeaves();
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      else if (document.querySelector('.theater.fake-fs')) document.querySelector<HTMLButtonElement>('#fullscreen')?.click();
    } }),
    needsPerson('t3', { en: 'Voice and cameras', tr: 'Ses ve kameralar' }, { en: 'a real friend (or a second device) with a mic', tr: 'mikrofonu olan gerçek bir arkadaş (ya da ikinci bir cihaz)' }, { en: 'Both press 🎙: hear each other, M turns the mic on and off, cameras open in their own window; a reload keeps you in voice.', tr: 'İkiniz de 🎙\'a basın: birbirinizi duyun, M mikrofonu açıp kapatır, kameralar kendi penceresinde açılır; yenileme seni seste tutar.' }),
    needsPerson('t4', { en: 'Screen share', tr: 'Ekran paylaşımı' }, { en: 'a real friend on another device', tr: 'başka bir cihazda gerçek bir arkadaş' }, { en: '"🖥️ Share ▾" → a tab with sound; the friend presses "▶ Watch", sees and hears it; their reload brings the stream back.', tr: '"🖥️ Paylaş ▾" → sesli bir sekme; arkadaş "▶ İzle"ye basar, görür ve duyar; sayfasını yenileyince yayın kendiliğinden geri gelir.' }),
    cmd('t5', { en: 'The door: a fake friend knocks', tr: 'Kapı: sahte bir arkadaş kapıyı çalar' }, { en: 'Turns on "Ask before letting people in" and a fake friend knocks: the "Let in / Refuse" card shows top right. Let them in, then 👑 Make host on them (their face → menu). Undo: the door opens, the friend leaves.', tr: '"İçeri almadan önce sor"u açar ve sahte bir arkadaş kapıyı çalar: sağ üstte "İçeri al / Reddet" kartı çıkar. İçeri al, sonra ona 👑 Yönetici yap (yüzü → menü). Geri al: kapı açılır, arkadaş çıkar.' }, () => {
      const room = debugRoom()?.lab;
      if (!room?.knock(true)) throw labFail({ en: 'only the host can turn the door on', tr: 'kapıyı yalnızca yönetici açabilir' });
      later(800, () => friends.add(1));
      return { en: 'the door is on; a fake friend knocks in a moment', tr: 'kapı açık; birazdan sahte bir arkadaş kapıyı çalar' };
    }, { available: hostInRoom, where: { en: 'in a room, as the host', tr: 'odada, yönetici olarak' }, undo: () => {
      debugRoom()?.lab?.knock(false);
      everyoneLeaves();
    } }),
    cmd('t6', { en: 'A private message', tr: 'Özel mesaj' }, { en: 'Two fake friends join; the first writes to you privately (🔒). Press their name in the chat and answer: only they get it, the second friend does not. ✕ goes back to the room chat. Undo: they leave.', tr: 'İki sahte arkadaş girer; ilki sana özelden (🔒) yazar. Sohbette adına bas ve cevap ver: sadece o alır, ikinci arkadaş almaz. ✕ oda sohbetine döner. Geri al: çıkarlar.' }, async () => {
      const [a] = await friendsIn(2);
      const me = debugRoom()?.lab?.memberId();
      if (!me) throw labFail(NOT_IN_ROOM);
      a!.send({ t: 'chat', text: 'only you see this 🔒', to: me });
      return { en: `${a!.name} wrote to you privately: press their name and answer`, tr: `${a!.name} sana özelden yazdı: adına bas ve cevap ver` };
    }, { available: inRoom, where: { en: 'in a room', tr: 'odada' }, undo: everyoneLeaves }),
    cmd('t8', { en: 'Join from your phone by QR code', tr: 'Telefondan QR kodla katıl' }, { en: 'Needs your phone. Opens 🔗 Invite on its "QR code" tab: scan it with the phone, the video plays in sync there; sideways, the big ⛶ "Watch fullscreen". Undo closes the window.', tr: 'Telefonun gerekir. 🔗 Davet et\'i "QR kod" sekmesinde açar: telefonla tara, video orada da eşit oynar; yan çevirince büyük ⛶ "Tam ekran izle". Geri al pencereyi kapatır.' }, async () => {
      document.querySelector<HTMLButtonElement>('#invite-btn')?.click();
      for (let i = 0; i < 20 && !document.querySelector('.invite-tab[data-tab="qr"]'); i++) await sleep(100);
      const tab = document.querySelector<HTMLButtonElement>('.invite-tab[data-tab="qr"]');
      if (!tab) throw labFail({ en: 'the invite window did not open', tr: 'davet penceresi açılmadı' });
      tab.click();
      return { en: 'the QR code is on screen: scan it with your phone', tr: 'QR kod ekranda: telefonunla tara' };
    }, { available: inRoom, where: { en: 'in a room', tr: 'odada' }, undo: () => document.querySelector<HTMLButtonElement>('.invite-close')?.click() }),
    needsPerson('t9', { en: 'Shorts together on a phone', tr: 'Telefonda birlikte Shorts' }, { en: 'your phone and a friend', tr: 'telefonun ve bir arkadaş' }, { en: 'The friend adds Shorts (or 🎲 Discover in ♾); swipe on the bar under the video or press ▲ ▼: you both move together.', tr: 'Arkadaş Shorts ekler (ya da ♾ içinde 🎲 Keşfet); videonun altındaki çubukta kaydır ya da ▲ ▼\'e bas: ikiniz birlikte geçersiniz.' }),
    needsPerson('t10', { en: 'The extension on a film page', tr: 'Film sayfasında eklenti' }, { en: 'the extension in your Chrome and a legal demo player page', tr: 'Chrome\'unda eklenti ve yasal bir demo oynatıcı sayfası' }, { en: 'Paste its address in the room, "Go to the film": the rail at the film\'s right edge, sync, the film\'s own ⛶, 🎮 and voice there.', tr: 'Adresini odaya yapıştır, "Filme git": filmin sağ kenarında ray, senkron, filmin kendi ⛶ düğmesi, 🎮 ve orada ses.' }),
    needsPerson('t11', { en: 'Edge, Brave, Opera', tr: 'Edge, Brave, Opera' }, { en: 'those browsers with the extension', tr: 'eklentiyle o tarayıcılar' }, { en: 'Steps 1, 2, 3 and 6 of the list in each.', tr: 'Her birinde listenin 1, 2, 3 ve 6. adımları.' }),
  ];
  return { commands, close: everyoneLeaves };
}

/** The ids of the test round's commands, in the board's order (used by the 🧪 tab). */
export const ROUND_PREFIX = 'round.';
