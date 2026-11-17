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
  'voice.camPause': {
    title: { en: 'My camera freezes for the others for 6 s', tr: 'Kameram diğerlerinde 6 sn donsun' },
    help: { en: 'My picture stops reaching the others, as when a phone stalls: their tile must say "waiting for the picture…" and come back by itself. A number sets the seconds (1–30).', tr: 'Görüntüm diğerlerine gitmez, telefon takılınca olduğu gibi: onların ekranında "görüntü bekleniyor…" yazmalı ve kendiliğinden geri gelmeli. Bir sayı yazarsan saniye olur (1–30).' },
  },
  'voice.switchCam': {
    title: { en: 'Switch to my next camera', tr: 'Sıradaki kamerama geç' },
    help: { en: 'My camera changes to the next one on this device without leaving voice (on a phone: front, back, wide); the others see "camera changing…".', tr: 'Kameram sesten çıkmadan bu cihazdaki sıradakine geçer (telefonda: ön, arka, geniş); diğerleri "kamera değişiyor…" görür.' },
  },
};
