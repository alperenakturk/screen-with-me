// The owner's test board: the ONLY file to edit when its content changes (the Planner keeps it current through
// docs-style PRs; board.js and index.html never need to change for new content). Nothing secret goes in here: no
// tokens, e-mail addresses or session links; links only to claude.ai option pages.
//
// Format (keys in English, every text in Turkish, for the owner):
//   meta      { updated: 'shown after "Son güncelleme:"', live: 'the live version shown in the header' }
//   tests     [{ group:   'heading the item sits under (items of one group are shown together, in first-seen order)',
//                filter:  'solo' | 'tabs' | 'second' | 'friend' | 'soon'   (which filter chip shows it),
//                id:      'short unique id; the owner's ticks are saved under it, so never reuse an old id for a new test',
//                title:   'one line',
//                version: 'the version it shipped in, or "—" / "yakında"',
//                steps:   ['what to do, one step per line', …],
//                soon:    true   (optional: not live yet; gets the "yakında canlı" badge and is not counted as "Denenecek") }]
//   decisions [{ id, title, options: ['button text', …], link: 'https://claude.ai/artifact/…' (optional) }]
//              The ticket shows the part of the title before its first ':' as the decision's name.
//   road      [{ status: 'done' | 'now' | 'next', title, text: 'a paragraph' (optional), list: ['…', …] (optional) }]
window.SIDELIT_BOARD = {
  meta: { updated: '4 Kasım 2026, 14:50', live: '0.9.97.34' },

  tests: [
    { group: 'Aynı Chrome, iki ad', filter: 'tabs', id: 'bg30', title: '30 dakika arka plan', version: '0.9.97.24',
      steps: ['Sekmelerden birini 30 dakika arka planda bırak.', 'Dönünce iki sekme hâlâ birbirini görüyor mu?'] },
    { group: 'Kapı ve oda yönetimi', filter: 'second', id: 'makehost', title: 'Yönetici devri: "senin" işareti doğru kişide', version: '0.9.97.27',
      steps: ['Bir oda kaydet, ikinci tarayıcıdan gir, ona "👑 Yönetici yap" de.', 'Senin ana sayfanda o odanın ✕\'i "kaydı da silinir" demez; onunkinde der.'] },
    { group: 'Oyunlar', filter: 'solo', id: 'sideroom', title: 'Büfe ve bitki sadece odada ve film oynarken ilerliyor', version: '0.9.97.31',
      steps: ['Video oynamıyorken büfe/bitkiyi aç: "Kapalı / film başlayınca açılır" yazar.', 'Video başlat: yazı kalkar, oyun ilerler.', 'Odadan çık, sonra dön: "sen yokken kazandın" parası yok, bitkiler aynı.'] },
    { group: 'Oyunlar', filter: 'second', id: 'xclose', title: '✕ sadece küçültüyor, masa düğmeleri soruyor', version: '0.9.97.31',
      steps: ['Arkadaşla XOX\'ta birer hamle yapın, ✕\'e bas: pencere gider, oyun sürer, 🎮 geri getirir.', '"↩ Masadan kalk" ve "⏹ Masayı bitir" önce sorar.', 'Oyun ortasında sayfayı yenile: "Siteden ayrılsın mı?" sorar; oyun bitince sormaz.', 'Büfe/bitkide kapatma yok; "?" yanındaki ↺ sorup baştan başlatır.'] },
    { group: 'Oyunlar', filter: 'solo', id: 'lamp', title: 'Glowbeam lambası ve film sonu tohumu', version: '0.9.97.31',
      steps: ['Video oynarken bitkide büyüyen saksıyı seç, "✨ Glowbeam"e bas: o saksı aydınlanır (her videoda bir kez).', '20 dakikadan uzun bir videoyu bahçe kapalıyken sonuna kadar izle, sonra bahçeyi aç: bir tohum bekliyor.'] },
    { group: 'Avatarlar', filter: 'solo', id: 'genres', title: 'Parodiler gitti, "Türler" sekmesi geldi', version: '0.9.97.30',
      steps: ['Avatar seçicide sadece "Tematik" ve "Türler" var, parodi sayfaları yok.', 'Kaldırılan bir avatarı kullanan biri girişte rastgele tematik bir avatar alır.'] },
    { group: 'Avatarlar', filter: 'solo', id: 'genres17', title: 'Türler sekmesinde 17 yeni avatar + armadillo', version: '0.9.97.30',
      steps: ['Türler sekmesinde dedektif, korsan, astronot, mucit, ninja, kovboy, vampir, robot, kahraman, kâşif, aşçı, rockçı, hayalet, uzaylı, samuray, peri, casus var.', 'Birini seç, odada diğerleri de onu doğru görüyor.'] },
    { group: 'Oyunlar', filter: 'solo', id: 'snackline', title: 'Büfe: müşteri sırası, film sonu fişi, rozet duvarı', version: '0.9.97.31',
      steps: ['Video oynarken Büfe\'yi aç: tezgâhın önünde müşteriler sıraya giriyor, dokununca servis ediliyor.', 'Bir videoyu sonuna kadar izle: Glowbeam\'in fişi geliyor (iyi gittiyse altın kova).', 'Rozet duvarını aç: 30 rozet var, kazandıkların renkli.'] },
    { group: 'Oyunlar', filter: 'solo', id: 'snackplaces', title: 'Büfe: yeni sinemalar ve süsler', version: '0.9.97.31',
      steps: ['"Yeni sinema" açınca yer değişiyor (açık hava, çatı, sanat sineması), her birinin küçük bir farkı var.', 'Süs satın al: sahnede görünüyor.'] },
    { group: 'Oyunlar', filter: 'solo', id: 'gardenhybrid', title: 'Bitki: melez renkler, albüm anıları, pencere havası', version: '0.9.97.31',
      steps: ['Yan yana iki çiçek açınca bazen melez renkli bir tohum çıkıyor.', 'Albümde bir bitkiye bas: hangi filmde ve kiminle açtığı yazıyor.', 'Pencerenin dışında hava değişiyor; geceleri küçük ziyaretçiler geliyor.'] },
    { group: 'Oyunlar', filter: 'solo', id: 'fiveownmarks', title: 'Five Frames kendi işaretleriyle', version: '0.9.97.31',
      steps: ['Five Frames\'te bir tahmin gir: doğru harf düz çerçeve ✓, yeri yanlış kesik çizgili çerçeve •, olmayan soluk ×.', 'Yeşil/sarı/gri dolgu yok; nasıl oynanır kartı da yeni işaretleri gösteriyor.'] },
    { group: 'Oyunlar', filter: 'second', id: 'tipjar', title: 'Odanın bahşiş kavanozu ve arkadaşa çelik', version: '0.9.97.32',
      steps: ['Film oynarken iki kişi Büfe\'de servis yapsın: başlıktaki 🫙 doluyor; dolunca o film boyunca herkese +%10.', 'Bitkide açan bir çiçekte "🎁 Çelik ver" → arkadaşını seç: onun boş saksısında "🎁" olarak çıkıyor.'] },
    { group: 'Tam ekran', filter: 'tabs', id: 'fsmsg2', title: 'Tam ekranda mesajlar daha büyük ve sağda daha aşağıda', version: '0.9.97.34',
      steps: ['İki sekmede aynı odaya gir, birinde videoyu tam ekran yap, diğerinden mesaj yaz.', 'Mesaj daha büyük yazıyla, sağ tarafta üst köşede değil biraz aşağıda (düğme sütununun solunda) çıkıyor; videonun alt çubuğunu kapatmıyor.'] },
    { group: 'Ana sayfa', filter: 'solo', id: 'home15e', title: 'Işık üç ekrana da düşüyor, sayfa dengeli', version: '0.9.97.33',
      steps: ['Ana sayfada Glowbeam\'in ışığı laptop, tablet ve telefon ekranlarına yumuşakça düşüyor; arkada gri şerit ya da keskin kenar yok.', 'Cihazlar birbirinin ekranını kapatmıyor; çizim daha büyük ve yazıya daha yakın, sağ ve sol boşluk eşit.'] },
    { group: 'Oyunlar', filter: 'soon', id: 'classics', title: 'Klasikler: tek kart, XOX + 4 Taş + dama, Glowbeam rakip', version: '0.9.97.35', soon: true,
      steps: ['🎮 salonunda "Klasikler" kartını aç: rafta XOX, 4 Taş ve dama var; satranç ve tavla "yakında".', 'Tek başınayken bir oyun seç: Glowbeam üç seviyeden birinde seninle oynuyor.', 'Arkadaşla dama oyna: hamleler ikinizde de aynı.'] },
    { group: 'Oyunlar', filter: 'soon', id: 'quizbank', title: 'Bilgi yarışması: 1175 soru, kolaydan zora, tekrar yok', version: '0.9.97.37', soon: true,
      steps: ['Arkadaşla bir Bilgi yarışması oyna: sorular kolaydan zora gidiyor.', 'Bir oyun daha oyna: daha önce gördüğün sorular gelmiyor.'] },
    { group: 'Film sayfası', filter: 'soon', id: 'shellname', title: 'Ana sitede değiştirdiğin ad film sayfasına da geçiyor', version: '0.9.97.36', soon: true,
      steps: ['Bir odada ana sitede adını değiştir.', 'Sonra bir film sayfası aç: arkadaşın yeni adını görüyor, eskisini hiç görmüyor.'] },
    { group: 'Oda', filter: 'soon', id: 'streamfit', title: 'Yayın açıkken kontroller sohbeti aşağı itmiyor', version: 'yakında', soon: true,
      steps: ['Ekranını paylaş: durdur ve kalite düğmeleri Birlikte kartının sağ üstünde, yüzlerin yanında; sohbet yerinde kalıyor.'] },
    { group: 'Arkadaşla', filter: 'friend', id: 'nodrop', title: 'Oyun ve yayın sırasında düşme olmuyor', version: '0.9.97.8+',
      steps: ['Arkadaşınla oyun aç, ekran paylaş, bir süre izleyin: kimse odadan ya da yayından düşmüyor.'] },
    { group: 'Arkadaşla', filter: 'friend', id: 'knockfriend', title: 'Kapıyı gerçek bir arkadaşla dene', version: '0.9.97.19',
      steps: ['"İçeri almadan önce sor" açıkken arkadaşın gelsin, sen içeri al ya da reddet.'] },
    { group: 'Henüz denemediklerin', filter: 'friend', id: 'games', title: 'Oda oyunları (XOX, 4 Taş, Çiz-Bil, Bilgi yarışması)', version: '—',
      steps: ['Arkadaşınla her birini bir tur oyna; takılan bir yer var mı?'] },
    { group: 'Henüz denemediklerin', filter: 'second', id: 'move', title: '📲 Başka cihaza taşıma', version: '0.9.96.4',
      steps: ['Profil menüsü → 📲: kodu ya da QR\'ı telefonda aç, oyunların ve kayıtlı odaların telefona geçiyor mu?'] },
    { group: 'Henüz denemediklerin', filter: 'solo', id: 'phone', title: 'Telefonda bir oda', version: '—',
      steps: ['Telefondan bir odaya gir: video, sohbet, ＋ ve ⋯ menüleri, yan çevirince tam ekran.'] },
    { group: 'Henüz denemediklerin', filter: 'solo', id: 'filmedge', title: 'Film sayfasında sağ kenar (eklentiyi güncelle)', version: '0.9.97.13',
      steps: ['Eklentiyi siteden yeniden indirip güncelle.', 'Bir film sayfasında fareyi filmin sağ kenarına getir: düğme sütunu açılır.'] },
  ],

  decisions: [
    { id: 'versions', title: 'Sürüm planı: güvenlik bitince 0.9.98, konsey + hata avından sonra 0.9.99', options: ['Onaylıyorum', 'Değişsin'] },
    { id: 'usage', title: 'Yeni USAGE_TOKEN: bir kez üret, sakla, GitHub secret\'ını güncelle', options: ['Yaptım', 'Sonra yapacağım'] },
    { id: 'filmintro', title: 'Film sayfasında intro: önerim oynamasın (odaya girerken zaten oynuyor)', options: ['Oynamasın', 'Oynasın'] },
  ],

  road: [
    { status: 'done', title: 'Oda ve sohbet sağlamlaştı',
      text: 'Test turu 1 ve 2: kapı, özel mesaj, aynı tarayıcıda iki ad, giriş sırası, YouTube tam ekran, ana sayfa.' },
    { status: 'now', title: 'Oyunlar baştan güzelleşiyor (Game Studio)',
      list: ['Büfe ve bitki sadece odada, ✕ = küçült kuralı', 'Büfe: müşteri sırası, film sonu fişi, rozetler · yeni sinemalar ve süsler', 'Bitki: melez renkler, albüm anıları, hava durumu · bahşiş kavanozu, çelik hediyesi', 'Klasikler: XOX, Four in a Row, dama, satranç, tavla (Okey kararı sende)', 'Bilgi yarışması: büyük soru bankası, tekrar yok · Çiz-Bil: araçlar ve kategoriler', 'Five Frames bize özgü görünüm'] },
    { status: 'done', title: 'Telif temizliği',
      list: ['Parodi avatarlar kaldırıldı, yerine bize ait 17 "Türler" avatarı (0.9.97.30)', 'Five Frames kendi işaretleriyle (0.9.97.31)'] },
    { status: 'next', title: 'Senin tek başına testlerin', text: 'Bu panodaki "Dene" sekmesi. Bittikçe işaretle, kopyala, bana at.' },
    { status: 'next', title: 'Sert konsey incelemesi', text: 'Beş danışmanlı inceleme (llm-council): 1.0\'dan önce neyi kesmeli, neyi düzeltmeli.' },
    { status: 'next', title: 'Güvenlik ve hata avı → 0.9.98', text: 'Security oturumunun son turu ve KVKK/GDPR denetimi (kvkk-gdpr-denetim).' },
    { status: 'next', title: 'Resmi işler',
      list: ['Gizlilik politikası (KVKK + GDPR) baştan', 'Kullanım koşulları, kötüye kullanım iletişimi', 'YouTube API uyum denetimi (kota artışı için)', 'Kendi alan adı + destek e-postası'] },
    { status: 'next', title: '0.9.99 → mağaza', text: 'Konsey ve hata avı düzeltmeleri, Brave/Edge testi, Chrome Web Store başvurusu.' },
    { status: 'next', title: 'Tanıtım videosu (gerçek oyuncularla)', text: '0.9.99 ile 1.0 arasında çekilir. Ekip: kamera, yönetmen ve kurgu tek kişi; iki oyuncu (bir erkek, bir kadın). Senaryoyu ve çekim listesini ben hazırlarım.' },
    { status: 'next', title: '1.0 çıkış', text: 'Son isim ve alan adı, sosyal hesaplar, tanıtım içeriği ve video.' },
  ],
};
