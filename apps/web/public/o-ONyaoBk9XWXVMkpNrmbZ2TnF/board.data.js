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
  meta: { updated: '4 Kasım 2026, 12:15', live: '0.9.97.28' },

  tests: [
    { group: 'Ana sayfa', filter: 'solo', id: 'home3', title: 'Üç cihaz ve rastgele avatarlar', version: '0.9.97.23',
      steps: ['Ana sayfayı aç: Glowbeam\'in ışığı laptop, tablet ve telefona düşüyor, üç çubuk birlikte ilerliyor.', 'Yüzlerde tematik avatarlar var; yenileyince başka avatarlar geliyor.'] },
    { group: 'Ana sayfa', filter: 'solo', id: 'home15d', title: 'Büyük cihazlar, sağ üstte 🎨, temaya göre Glowbeam', version: '0.9.97.28',
      steps: ['Cihazlar öncekinden biraz büyük.', 'Sağ üstte 🎨 var, basınca tema penceresi açılıyor.', 'Temayı değiştir: Glowbeam\'in kostümü/şapkası da değişiyor.', 'Yardım ya da Gizlilik sayfasında 🎨 seni tema penceresiyle ana sayfaya götürüyor.'] },
    { group: 'Ana sayfa', filter: 'solo', id: 'blackbox', title: 'Siyah kutu hâlâ var mı?', version: '—',
      steps: ['Ana sayfayı yenile, sonra gizli pencerede aç.', 'Glowbeam\'in üstündeki siyah kutu ve yeşil artı duruyor mu? Notuna eklentilerini de yaz.'] },
    { group: 'Odaya giriş sırası', filter: 'second', id: 'neworder', title: 'Yeni oda: intro → davet → ipuçları', version: '0.9.97.25',
      steps: ['Gizli pencerede tek başına yeni bir oda aç.', 'Önce intro oynar, sonra davet penceresi gelir, onu kapatınca 3 ipucu çıkar.', 'Sayfayı yenile: hiçbiri tekrar gelmez.'] },
    { group: 'Aynı Chrome, iki ad', filter: 'tabs', id: 'twonames', title: '"alperen" ve "alperen 2" iki kişi; özel mesaj gidiyor', version: '0.9.97.24',
      steps: ['Bir sekmede "alperen", diğerinde "alperen 2" olarak aynı odaya gir: odada 2 kişi görünür.', 'Birinden ötekine özel mesaj at: gider.'] },
    { group: 'Aynı Chrome, iki ad', filter: 'tabs', id: 'reloadname', title: 'Sekmeyi yenileyince ad korunuyor', version: '0.9.97.24',
      steps: ['İki sekmeden birini yenile: adını korur, ikisi birbirini görmeye devam eder.'] },
    { group: 'Aynı Chrome, iki ad', filter: 'tabs', id: 'bg30', title: '30 dakika arka plan', version: '0.9.97.24',
      steps: ['Sekmelerden birini 30 dakika arka planda bırak.', 'Dönünce iki sekme hâlâ birbirini görüyor mu?'] },
    { group: 'Aynı Chrome, iki ad', filter: 'tabs', id: 'ytfs', title: 'YouTube tam ekranda mesaj videonun üstünde', version: '0.9.97.26',
      steps: ['Bir sekmede YouTube\'u tam ekran yap, diğerinden mesaj yaz.', 'Mesaj sağ üstten, düğme sütununun solundan gelir; sağda siyah sütun açılmaz, YouTube\'un alt çubuğu kapanmaz.'] },
    { group: 'Kapı ve oda yönetimi', filter: 'second', id: 'knock', title: 'Kapıda beklerken ipucu yok', version: '0.9.97.24',
      steps: ['Chrome\'da Oda kuralları → "İçeri almadan önce sor"u aç.', 'Gizli pencereden odaya gir: sadece kapı ekranı görünür, ipucu yok.', 'Chrome\'dan "İçeri al": içeri girince intro ve ipuçları gelir.'] },
    { group: 'Kapı ve oda yönetimi', filter: 'second', id: 'refuse', title: 'Reddedilen sadece ret ekranını görüyor', version: '0.9.97.25',
      steps: ['Kapıda bekleyen gizli pencereyi "Reddet": arkasında bekleme kartı görünmez.'] },
    { group: 'Kapı ve oda yönetimi', filter: 'second', id: 'kickcont', title: 'Çıkarılan kişiye "Devam et" çıkmıyor', version: '0.9.97.25',
      steps: ['Gizli penceredeki kişiyi odadan çıkar.', 'O pencerede ana sayfaya git: o oda için "Devam et" satırı yok.'] },
    { group: 'Kapı ve oda yönetimi', filter: 'second', id: 'makehost', title: 'Yönetici devri: "senin" işareti doğru kişide', version: '0.9.97.27',
      steps: ['Bir oda kaydet, ikinci tarayıcıdan gir, ona "👑 Yönetici yap" de.', 'Senin ana sayfanda o odanın ✕\'i "kaydı da silinir" demez; onunkinde der.'] },
    { group: 'Oyunlar', filter: 'soon', id: 'sideroom', title: 'Büfe ve bitki sadece odada ve film oynarken ilerliyor', version: '0.9.97.29', soon: true,
      steps: ['Video oynamıyorken büfe/bitkiyi aç: "Kapalı / film başlayınca açılır" yazar.', 'Video başlat: yazı kalkar, oyun ilerler.', 'Odadan çık, sonra dön: "sen yokken kazandın" parası yok, bitkiler aynı.'] },
    { group: 'Oyunlar', filter: 'soon', id: 'xclose', title: '✕ sadece küçültüyor, masa düğmeleri soruyor', version: '0.9.97.30', soon: true,
      steps: ['Arkadaşla XOX\'ta birer hamle yapın, ✕\'e bas: pencere gider, oyun sürer, 🎮 geri getirir.', '"↩ Masadan kalk" ve "⏹ Masayı bitir" önce sorar.', 'Oyun ortasında sayfayı yenile: "Siteden ayrılsın mı?" sorar; oyun bitince sormaz.', 'Büfe/bitkide kapatma yok; "?" yanındaki ↺ sorup baştan başlatır.'] },
    { group: 'Oyunlar', filter: 'soon', id: 'lamp', title: 'Glowbeam lambası ve film sonu tohumu', version: '0.9.97.30', soon: true,
      steps: ['Video oynarken bitkide büyüyen saksıyı seç, "✨ Glowbeam"e bas: o saksı aydınlanır (her videoda bir kez).', '20 dakikadan uzun bir videoyu bahçe kapalıyken sonuna kadar izle, sonra bahçeyi aç: bir tohum bekliyor.'] },
    { group: 'Avatarlar', filter: 'soon', id: 'genres', title: 'Parodiler gitti, "Türler" sekmesi geldi', version: '0.9.97.30+', soon: true,
      steps: ['Avatar seçicide sadece "Tematik" ve "Türler" var, parodi sayfaları yok.', 'Kaldırılan bir avatarı kullanan biri girişte rastgele tematik bir avatar alır.'] },
    { group: 'Avatarlar', filter: 'soon', id: 'genres17', title: 'Türler sekmesinde 17 yeni avatar', version: 'yakında', soon: true,
      steps: ['Türler sekmesinde dedektif, korsan, astronot, mucit, ninja, kovboy, vampir, robot, kahraman, kâşif, aşçı, rockçı, hayalet, uzaylı, samuray, peri, casus var.', 'Birini seç, odada diğerleri de onu doğru görüyor.'] },
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
    { id: 'classic', title: 'Klasik oyunlar sayfası (7 soru, Okey dahil)', link: 'https://claude.ai/artifact/UMqmwdkAGFJR8vcgk6Wbib',
      options: ['Seçimlerimi oradan yapıştıracağım'] },
    { id: 'versions', title: 'Sürüm planı: güvenlik bitince 0.9.98, konsey + hata avından sonra 0.9.99', options: ['Onaylıyorum', 'Değişsin'] },
    { id: 'usage', title: 'Yeni USAGE_TOKEN: bir kez üret, sakla, GitHub secret\'ını güncelle', options: ['Yaptım', 'Sonra yapacağım'] },
    { id: 'branches', title: 'GitHub\'da işi bitmiş eski dalları sil (Branches sayfası): claude/preload-previews, claude/live-reload-ask, claude/rail-slide, claude/frames-streak, claude/yt-fs-no-column',
      options: ['Sildim', 'Sonra'] },
    { id: 'filmintro', title: 'Film sayfasında intro: önerim oynamasın (odaya girerken zaten oynuyor)', options: ['Oynamasın', 'Oynasın'] },
  ],

  road: [
    { status: 'done', title: 'Oda ve sohbet sağlamlaştı',
      text: 'Test turu 1 ve 2: kapı, özel mesaj, aynı tarayıcıda iki ad, giriş sırası, YouTube tam ekran, ana sayfa.' },
    { status: 'now', title: 'Oyunlar baştan güzelleşiyor (Game Studio)',
      list: ['Büfe ve bitki sadece odada, ✕ = küçült kuralı', 'Büfe: müşteri sırası, film sonu fişi, rozetler · yeni sinemalar ve süsler', 'Bitki: melez renkler, albüm anıları, hava durumu · bahşiş kavanozu, çelik hediyesi', 'Klasikler: XOX, Four in a Row, dama, satranç, tavla (Okey kararı sende)', 'Bilgi yarışması: büyük soru bankası, tekrar yok · Çiz-Bil: araçlar ve kategoriler', 'Five Frames bize özgü görünüm'] },
    { status: 'now', title: 'Telif temizliği',
      list: ['Parodi avatarlar kaldırılıyor, yerine bize ait "Türler"', 'Herkese açık metinlerde "Four in a Row" adı'] },
    { status: 'next', title: 'Senin tek başına testlerin', text: 'Bu panodaki "Dene" sekmesi. Bittikçe işaretle, kopyala, bana at.' },
    { status: 'next', title: 'Sert konsey incelemesi', text: 'Beş danışmanlı inceleme (llm-council): 1.0\'dan önce neyi kesmeli, neyi düzeltmeli.' },
    { status: 'next', title: 'Güvenlik ve hata avı → 0.9.98', text: 'Security oturumunun son turu ve KVKK/GDPR denetimi (kvkk-gdpr-denetim).' },
    { status: 'next', title: 'Resmi işler',
      list: ['Gizlilik politikası (KVKK + GDPR) baştan', 'Kullanım koşulları, kötüye kullanım iletişimi', 'YouTube API uyum denetimi (kota artışı için)', 'Kendi alan adı + destek e-postası'] },
    { status: 'next', title: '0.9.99 → mağaza', text: 'Konsey ve hata avı düzeltmeleri, Brave/Edge testi, Chrome Web Store başvurusu.' },
    { status: 'next', title: '1.0 çıkış', text: 'Son isim ve alan adı, sosyal hesaplar, tanıtım içeriği ve video.' },
  ],
};
