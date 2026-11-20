// Card BUD1: the Test Lab's titles and help lines for commands that features in the room's own chunk register. They
// live here, in the lab's lazy chunk, so the room page doesn't carry them for everyone (the room's JS budget). A
// command without `title` / `help` gets them from here by its id (ui/test-lab.ts `allCommands`); the command itself
// (`run`, `available`, `undo`) stays where the feature registers it, so every hook is registered before the lab opens.
import type { LabText } from '../debug-lab.ts';

export const LAB_TEXTS: Record<string, { title: LabText; help: LabText; where?: LabText }> = {
  'app.staleChunk': {
    title: { en: 'A missing chunk after an update', tr: 'Güncellemeden sonra eksik parça' },
    help: { en: 'Acts as if a chunk failed to load: the "Sidelit was updated" note shows, the room stays. Run again to read it.', tr: 'Bir parça yüklenemedi gibi davranır: "Sidelit güncellendi" notu çıkar, oda kalır. Tekrar çalıştırınca okur.' },
  },
  'chat.fill': {
    title: { en: 'Chat: add 250 numbered messages (lab server)', tr: 'Sohbet: 250 numaralı mesaj ekle (test sunucusu)' },
    help: { en: 'The room keeps 250 "Lab message N" lines at once (only on a local lab server), to check that a long chat stays after a reload and pages back in on scroll-up.', tr: 'Oda bir seferde 250 "Lab message N" satırı saklar (yalnızca yerel test sunucusunda); uzun bir sohbetin yenilemeden sonra kaldığını ve yukarı kaydırınca geri geldiğini denemek için.', },
  },
  'chat.history': {
    title: { en: 'Chat: how much is loaded and whether older pages are offered', tr: 'Sohbet: ne kadarı yüklü ve eski sayfalar sunuluyor mu' },
    help: { en: 'Writes how many chat messages and room-activity lines this tab holds and the older page the room offers (null: everything is here) into the log.', tr: 'Bu sekmede kaç sohbet mesajı ve oda hareketi satırı olduğunu ve odanın sunduğu eski sayfayı (null: hepsi burada) kayda yazar.', },
  },
  'chat.delete': {
    title: { en: 'Chat: delete my newest message for everyone', tr: 'Sohbet: en yeni mesajımı herkesten sil' },
    help: { en: 'Deletes your newest message without asking (as "🗑 Delete for everyone" does) and writes which one and how many lines read "deleted" here into the log.', tr: 'En yeni mesajını sormadan siler ("🗑 Herkesten sil" gibi) ve hangisini sildiğini ve burada kaç satırın "sildi" dediğini kayda yazar.' },
  },
  'queue.playlist': {
    title: { en: 'Queue: add a fixture YouTube Music album', tr: 'Sıra: örnek bir YouTube Music albümü ekle' },
    help: { en: 'Adds three fixture songs to the queue the way a pasted playlist or album link does (no YouTube call) and writes how many went in.', tr: 'Yapıştırılan bir çalma listesi ya da albüm linki gibi sıraya üç örnek şarkı ekler (YouTube\'a sorulmaz) ve kaçının girdiğini yazar.' },
  },
  'endcard.show': {
    title: { en: 'Show the "Video ended" card', tr: '"Video bitti" kartını göster' },
    help: { en: 'Opens the card people see when a video ends and the next one does not start by itself (a sample title; "Start next" only closes it). Run it again to read what is showing.', tr: 'Bir video bitince ve sıradaki kendiliğinden başlamayınca görünen kartı açar (örnek başlık; "Sıradakini başlat" yalnızca kapatır). Yeniden çalıştırınca açık olanı yazar.', },
  },
  'phoneRoom.state': {
    title: { en: 'Phone room: what shows now', tr: 'Telefon odası: şu an ne görünüyor' },
    help: { en: 'Writes the open tab, the input row and the visible buttons into the log.', tr: 'Açık sekmeyi, yazma satırını ve görünen düğmeleri kayda yazar.' },
  },
  'phone.turnNote': {
    title: { en: 'Phone: the "turn upright" note', tr: 'Telefon: "dik tut" notu' },
    help: { en: 'Writes whether the note shows, whether the phone is sideways and whether only the video is on screen.', tr: 'Notun görünüp görünmediğini, telefonun yan olup olmadığını ve ekranda yalnızca videonun olup olmadığını kayda yazar.' },
  },
  'pwa.state': {
    title: { en: 'Home-screen app: installed, screen on, sharing', tr: 'Ana ekran uygulaması: kurulu mu, ekran açık mı, paylaşım' },
    help: { en: 'Writes whether this runs as the installed app, the screen wake lock and the share target into the log.', tr: 'Bunun kurulu uygulama olarak çalışıp çalışmadığını, ekran kilidini ve paylaşım hedefini kayda yazar.' },
  },
  'rail.speed': {
    title: { en: 'Speed picker', tr: 'Hız seçici' },
    help: { en: 'Logs the speed, this video\'s speeds, the ⋯ picker and "Keep the controls open".', tr: 'Hızı, videonun hızlarını, ⋯ seçicisini ve "Kontroller hep açık"ı kayda yazar.' },
  },
  'safety.state': {
    title: { en: 'Safety: blocked people and the last report', tr: 'Güvenlik: engellenenler ve son bildirim' },
    help: { en: 'Writes who is blocked for me in this room and how the last report went into the log.', tr: 'Bu odada benim için engellenenleri ve son bildirimin sonucunu kayda yazar.' },
  },
  'voice.deafen': {
    title: { en: 'Voice: 🎧 deafen (on / off)', tr: 'Ses: 🎧 sesleri kapat (on / off)' },
    help: { en: 'With "on" or "off" deafens or undeafens me; then writes whether I am deafened, in voice, my mic, whether every voice is silent here and who else is deafened into the log.', tr: '"on" ya da "off" ile benim için sesleri kapatır ya da açar; sonra seslerimin kapalı olup olmadığını, seste olup olmadığımı, mikrofonumu, buradaki bütün seslerin kısık olup olmadığını ve başka kimin seslerini kapattığını kayda yazar.' },
  },
  'player.focus': {
    title: { en: 'Player: is the keyboard focus in it', tr: 'Oynatıcı: klavye odağı onda mı' },
    help: { en: 'Writes whether the keyboard focus is inside the player\'s frame now (after a click there it comes back to the room, later while YouTube\'s volume is being dragged) and the player\'s volume into the log.', tr: 'Klavye odağının şu an oynatıcının çerçevesinde olup olmadığını (oraya tıklayınca odaya geri döner, YouTube\'un sesi sürüklenirken daha geç) ve oynatıcının ses düzeyini kayda yazar.' },
  },
  'voice.blocked': {
    title: { en: 'Voice: links that can\'t connect (VPN, strict networks)', tr: 'Ses: bağlanamayan bağlantılar (VPN, sıkı ağlar)' },
    help: { en: 'Writes whether the "your voice isn\'t reaching the others" note shows, whose link with me never connected (after 10 s) and the state of each voice link into the log.', tr: '"Sesin diğerlerine ulaşmıyor" notunun görünüp görünmediğini, kiminle bağlantımın hiç kurulamadığını (10 sn sonra) ve her ses bağlantısının durumunu kayda yazar.' },
  },
  'shorts.chat': {
    title: { en: 'Shorts: the chat panel on a computer', tr: 'Shorts: bilgisayardaki sohbet paneli' },
    help: { en: 'Writes whether 💬 left the chat panel open, whether it shows now, how many messages came in while it was closed, its box and whether it covers the video (it never should) into the log.', tr: '💬 ile sohbet panelinin açık bırakılıp bırakılmadığını, şu an görünüp görünmediğini, kapalıyken kaç mesaj geldiğini, kutusunu ve videoyu örtüp örtmediğini (hiç örtmemeli) kayda yazar.' },
  },
  'shorts.state': {
    title: { en: 'Shorts: which view, the way back, who speaks and the start', tr: 'Shorts: hangi görünüm, geri dönüş yolu, kim konuşuyor ve başlangıç' },
    help: { en: 'Writes the view (Shorts, room or none), whether "📱 Shorts view" is offered, who is speaking, how many seat faces show the green ring and where this Short started playing here (0 = from its very start) into the log.', tr: 'Görünümü (Shorts, oda ya da yok), "📱 Shorts görünümü" düğmesinin sunulup sunulmadığını, kimin konuştuğunu, kaç koltuk yüzünde yeşil halka olduğunu ve bu Short\'un burada kaçıncı saniyeden oynamaya başladığını (0 = en baştan) kayda yazar.' },
  },
  'recap.show': {
    title: { en: 'Recap: show it to everyone now (lab server)', tr: 'Özet: şimdi herkese göster (test sunucusu)' },
    help: { en: 'As the host, shows this session\'s recap to everyone in the video\'s place without waiting for 30 minutes together (only a local lab server allows that). A second show in the same session is refused, as for everyone.', tr: 'Yönetici olarak bu oturumun özetini, birlikte 30 dakika beklemeden videonun yerinde herkese gösterir (bunu yalnızca yerel test sunucusu izin verir). Aynı oturumda ikinci gösterim herkes için olduğu gibi reddedilir.' },
  },
  'recap.state': {
    title: { en: 'Recap: status, ready, scene', tr: 'Özet: durum, hazır mı, sahne' },
    help: { en: 'Writes this session\'s recap status into the log: minutes watched together, whether it was shown, whether ✨ is ready, the show running and which scene the stage is on.', tr: 'Bu oturumun özet durumunu kayda yazar: birlikte izlenen dakikalar, gösterildi mi, ✨ hazır mı, açık gösteri ve sahnenin hangi sahnede olduğu.' },
  },
  'shorts.tidy': {
    title: { en: 'Shorts view: rail groups, labels, pill, overlaps', tr: 'Shorts görünümü: ray grupları, etiketler, şerit, çakışmalar' },
    help: { en: 'Writes the Shorts view\'s layout into the log: the rail\'s group headings, how many buttons show a name, the "N left" line, where the feed pill sits (above the Short or not), whether any rail button overlaps another or the video, the last note\'s place and the phone bar\'s captions.', tr: 'Shorts görünümünün düzenini kayda yazar: rayın grup başlıkları, kaç düğmenin adı göründüğü, "N kaldı" satırı, akış şeridinin yeri (Short\'un üstünde mi), bir ray düğmesinin başka birinin ya da videonun üstüne binip binmediği, son notun yeri ve telefon çubuğunun yazıları.' },
  },
  'shorts.note': {
    title: { en: 'Shorts view: show a feed note', tr: 'Shorts görünümü: bir akış notu göster' },
    help: { en: 'Shows the "Nothing new left … the feed stopped" note the way a feed shows it, to check it sits under the Short (or at its foot) and never over the rail, the chat or the video.', tr: '"… için yeni bir şey kalmadı, akış durdu" notunu bir akışın gösterdiği gibi gösterir; Short\'un altında (ya da dibinde) durduğunu, rayın, sohbetin ya da videonun üstüne binmediğini denemek için.' },
  },
  'shorts.more': {
    title: { en: 'Shorts view: open ⋯ More', tr: 'Shorts görünümü: ⋯ Diğer menüsünü aç' },
    help: { en: 'Presses the Shorts view\'s ⋯ More as a person would (the rail\'s on a computer, the bottom bar\'s on a phone) and writes the menu that opened into the log: its rows and whether it fits the window.', tr: 'Shorts görünümünün ⋯ Diğer düğmesine bir kişi gibi basar (bilgisayarda raydakine, telefonda alt çubuktakine) ve açılan menüyü kayda yazar: satırları ve pencereye sığıp sığmadığı.' },
  },
  'feed.region': {
    title: { en: 'Feed: its country, language, kind and words', tr: 'Akış: ülkesi, dili, türü ve kelimeleri' },
    help: { en: 'Writes the running feed\'s request and what it asks YouTube for: the country (regionCode), that country\'s language (relevanceLanguage), the kind\'s category, the words and the order. With "My country" the server picks the connection\'s country.', tr: 'Açık akışın isteğini ve YouTube\'dan ne istediğini kayda yazar: ülke (regionCode), o ülkenin dili (relevanceLanguage), türün kategorisi, kelimeler ve sıralama. "Benim ülkem" seçiliyse ülkeyi sunucu bağlantıdan seçer.' },
  },
  'feed.start': {
    title: { en: 'Feed: open the drawer and start ▶ Popular', tr: 'Akış: çekmeceyi aç ve ▶ Popüler başlat' },
    help: { en: 'Opens the feed drawer on the right, picks ▶ Videos · 🔥 Popular (or "shorts music" etc. typed after the command) and starts it with the drawer\'s own "▶ Start feed" button, then writes what the drawer showed and whether the host rule locked it into the log.', tr: 'Sağdaki akış çekmecesini açar, ▶ Videolar · 🔥 Popüler seçer (ya da komuttan sonra yazılan "shorts music" gibi) ve çekmecenin kendi "▶ Akışı başlat" düğmesiyle başlatır; çekmecenin ne gösterdiğini ve yönetici kuralının kilitleyip kilitlemediğini kayda yazar.' },
  },
  'feed.drawer': {
    title: { en: 'Feed: the drawer\'s state', tr: 'Akış: çekmecenin durumu' },
    help: { en: 'Writes the open feed drawer\'s kind, pick, summary line, host lock, running feed and who started it, its box, whether it sits on the right edge and whether anything scrolls into the log.', tr: 'Açık akış çekmecesinin türünü, seçimini, özet satırını, yönetici kilidini, açık akışı ve kimin başlattığını, kutusunu, sağ kenarda durup durmadığını ve bir şeyin kayıp kaymadığını kayda yazar.' },
  },
  'sources.state': {
    title: { en: 'Search sources: the chosen one and the last search', tr: 'Arama kaynakları: seçili olan ve son arama' },
    help: { en: 'Writes the ⠿ source (YouTube, Vimeo, podcasts or the web), whether Vimeo search is on at the server and the last search into the log.', tr: '⠿ kaynağını (YouTube, Vimeo, podcast ya da web), Vimeo aramasının sunucuda açık olup olmadığını ve son aramayı kayda yazar.', },
  },
  'sources.picker': {
    title: { en: '"What are we watching?": where it sits and what it shows', tr: '"Ne izliyoruz?": nerede duruyor, ne gösteriyor' },
    help: { en: 'Writes whether the big source picker is open, its place (the video\'s, the side panel\'s or a phone sheet), the chip, the tiles shown, the source in use, its box, whether it fits on the screen without a scrollbar and the last tile pressed into the log.', tr: 'Büyük kaynak seçicinin açık olup olmadığını, yerini (videonun, yan panelin ya da telefonda alttan açılan pencere), çipi, görünen kutucukları, kullanılan kaynağı, kutusunu, kaydırma çubuğu olmadan ekrana sığıp sığmadığını ve son basılan kutucuğu kayda yazar.' },
  },
  'sources.open': {
    title: { en: 'Open "What are we watching?"', tr: '"Ne izliyoruz?" penceresini aç' },
    help: { en: 'Opens the big source picker where ⠿ would open it (the video\'s place, the side panel\'s place while YouTube plays, a sheet on a phone).', tr: 'Büyük kaynak seçiciyi ⠿ düğmesinin açacağı yerde açar (videonun yeri, YouTube oynarken yan panelin yeri, telefonda alttan açılan pencere).' },
  },
  'stream.view': {
    title: { en: 'Where the stream I watch sits', tr: 'İzlediğim yayın nerede' },
    help: { en: 'Writes the stream viewer\'s mode (window or fullscreen), its box, whether it is on the screen and whether it covers a YouTube player (it never should) into the log.', tr: 'İzlediğim yayının hâlini (pencere ya da tam ekran), kutusunu, ekranda olup olmadığını ve bir YouTube oynatıcısını örtüp örtmediğini (hiç örtmemeli) kayda yazar.', },
  },
  'together.compact': {
    title: { en: 'Together card: compact beside a game window?', tr: 'Birlikte kartı: oyun penceresinin yanında kısa mı?' },
    help: { en: 'Writes whether the Together card is compact (a game window lies over the side panel) and whether "Join voice" and "Share" are clear. "on" / "off" hold it that way, "auto" follows the game window again.', tr: 'Birlikte kartının kısa olup olmadığını (bir oyun penceresi yan panelin üstünde) ve "Sese katıl" ile "Paylaş"ın açıkta olup olmadığını yazar. "on" / "off" kartı öyle tutar, "auto" yeniden oyun penceresine uyar.' },
  },
  'phoneRoom.gamesTab': {
    title: { en: 'Phone Games tab: no page scroll, the strip\'s buttons whole', tr: 'Telefon Oyunlar sekmesi: sayfa kaymaz, şeritteki düğmeler tam' },
    help: { en: 'With a game open in the Games tab: writes whether the page scrolls (it must not) and whether the empty room\'s Search / Invite buttons are whole inside the video strip, above "Back to video".', tr: 'Oyunlar sekmesinde bir oyun açıkken: sayfanın kayıp kaymadığını (kaymamalı) ve boş odanın Ara / Davet et düğmelerinin video şeridinde, "Videoya dön"ün üstünde tam görünüp görünmediğini yazar.' },
  },
  'camera.open': {
    title: { en: 'Turn my camera on with a test picture', tr: 'Kameramı test görüntüsüyle aç' },
    help: { en: 'Presses 📷 with a drawn picture instead of the real camera: my camera window must open and show it. "fold" folds the window first (it must open again). "blocked", "system", "busy" or "none" makes the browser refuse instead: a message must say why and how to allow it.', tr: '📷 düğmesine gerçek kamera yerine çizilmiş bir görüntüyle basar: kamera pencerem açılıp onu göstermeli. "fold" önce pencereyi küçültür (yeniden açılmalı). "blocked", "system", "busy" ya da "none" tarayıcının reddetmesini sağlar: bir mesaj nedenini ve nasıl izin verileceğini söylemeli.' },
  },
  'voice.camPause': {
    title: { en: 'My camera freezes for the others for 6 s', tr: 'Kameram diğerlerinde 6 sn donsun' },
    help: { en: 'My picture stops reaching the others, as when a phone stalls: their tile must say "waiting for the picture…" and come back by itself. A number sets the seconds (1–30).', tr: 'Görüntüm diğerlerine gitmez, telefon takılınca olduğu gibi: onların ekranında "görüntü bekleniyor…" yazmalı ve kendiliğinden geri gelmeli. Bir sayı yazarsan saniye olur (1–30).' },
  },
  'voice.switchCam': {
    title: { en: 'Switch to my next camera', tr: 'Sıradaki kamerama geç' },
    help: { en: 'My camera changes to the next one on this device without leaving voice (on a phone: front, back, wide); the others see "camera changing…".', tr: 'Kameram sesten çıkmadan bu cihazdaki sıradakine geçer (telefonda: ön, arka, geniş); diğerleri "kamera değişiyor…" görür.' },
  },
};
