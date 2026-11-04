// Draw & Guess words (P10, 4 Nov 2026): easy to draw, known to everyone, family friendly; 12 categories the room's
// host can pick (or all of them). English and Turkish lists are separate (not translations). No brands, film,
// series or character names, nothing religious, political, scary-gory or rude.

export const DRAW_CATEGORIES = ['animals', 'food', 'home', 'places', 'transport', 'nature', 'jobs', 'sports', 'things', 'cinema', 'fantasy', 'actions'] as const;
export type DrawCategory = (typeof DRAW_CATEGORIES)[number];

export const DRAW_WORD_SETS: Record<'tr' | 'en', Record<DrawCategory, readonly string[]>> = {
  tr: {
    animals: [
      'kedi', 'köpek', 'balık', 'kuş', 'tavşan', 'fil', 'zürafa', 'aslan', 'penguen', 'kaplumbağa', 'yılan', 'örümcek',
      'kelebek', 'arı', 'inek', 'at', 'tavuk', 'ördek', 'baykuş', 'ahtapot', 'maymun', 'zebra', 'kanguru', 'timsah',
      'köpekbalığı', 'balina', 'yunus', 'kurbağa', 'salyangoz', 'koyun', 'fare', 'ayı', 'kaplan', 'deve', 'yengeç',
      'uğur böceği', 'sincap', 'flamingo', 'kirpi', 'papağan', 'keçi', 'geyik', 'denizanası', 'yarasa', 'karınca',
    ],
    food: [
      'elma', 'muz', 'çilek', 'karpuz', 'armut', 'üzüm', 'limon', 'havuç', 'mısır', 'mantar', 'pizza', 'hamburger',
      'dondurma', 'pasta', 'simit', 'çay', 'kahve', 'yumurta', 'peynir', 'ekmek', 'kiraz', 'ananas', 'portakal',
      'domates', 'patates', 'soğan', 'brokoli', 'balkabağı', 'sandviç', 'sosisli', 'kurabiye', 'krep', 'lolipop',
      'şeker', 'çikolata', 'süt', 'bal', 'çorba', 'makarna', 'sucuk', 'avokado', 'fıstık', 'salatalık', 'patlıcan',
      'zeytin',
    ],
    home: [
      'yastık', 'yatak', 'sandalye', 'masa', 'kapı', 'pencere', 'buzdolabı', 'çaydanlık', 'tencere', 'diş fırçası',
      'lamba', 'mum', 'kanepe', 'küvet', 'duş', 'klozet', 'lavabo', 'ayna', 'halı', 'fırın', 'mikrodalga', 'tava',
      'tabak', 'çatal', 'kaşık', 'bıçak', 'fincan', 'kase', 'süpürge', 'kova', 'çamaşır makinesi', 'saat', 'havlu',
      'battaniye', 'raf', 'merdiven', 'şömine', 'kapı zili', 'vazo', 'sabun', 'sünger', 'ütü', 'vantilatör',
      'çöp kutusu', 'bardak',
    ],
    places: [
      'ev', 'okul', 'köprü', 'çadır', 'kule', 'deniz feneri', 'çeşme', 'iglo', 'hastane', 'kütüphane', 'çiftlik',
      'hayvanat bahçesi', 'plaj', 'park', 'oyun parkı', 'havalimanı', 'istasyon', 'market', 'pastane', 'restoran',
      'müze', 'ahır', 'yel değirmeni', 'gökdelen', 'şehir', 'köy', 'bahçe', 'havuz', 'stadyum', 'sirk', 'liman',
      'otobüs durağı', 'yol', 'benzinlik', 'postane', 'karakol', 'itfaiye', 'otel', 'fabrika', 'pazar', 'tünel',
      'ağaç ev', 'lunapark', 'otopark', 'kafe',
    ],
    transport: [
      'araba', 'otobüs', 'tren', 'uçak', 'gemi', 'bisiklet', 'roket', 'helikopter', 'kayık', 'traktör', 'motosiklet',
      'kamyon', 'taksi', 'ambulans', 'itfaiye aracı', 'polis arabası', 'denizaltı', 'yelkenli', 'kano', 'tramvay',
      'metro', 'minibüs', 'kepçe', 'vinç', 'çöp kamyonu', 'teleferik', 'paraşüt', 'uzay gemisi', 'direksiyon',
      'trafik lambası', 'fayton', 'kızak', 'sal', 'vapur', 'jet ski', 'karavan', 'forklift', 'yat', 'tekerlek',
      'zeplin', 'tır', 'kamyonet', 'dolmuş', 'deniz otobüsü', 'el arabası',
    ],
    nature: [
      'güneş', 'ay', 'yıldız', 'bulut', 'yağmur', 'kar tanesi', 'gökkuşağı', 'şimşek', 'dağ', 'ağaç', 'çiçek',
      'kaktüs', 'yaprak', 'volkan', 'ada', 'şelale', 'nehir', 'göl', 'deniz', 'dalga', 'mağara', 'çöl', 'orman',
      'ayçiçeği', 'gül', 'lale', 'palmiye', 'çam ağacı', 'çimen', 'kaya', 'kasırga', 'kuyruklu yıldız', 'gezegen',
      'buzdağı', 'meşe palamudu', 'çam kozalağı', 'deniz kabuğu', 'tüy', 'yuva', 'su birikintisi', 'gün batımı',
      'tepe', 'mercan', 'kütük', 'buz sarkıtı',
    ],
    jobs: [
      'astronot', 'palyaço', 'aşçı', 'doktor', 'itfaiyeci', 'hemşire', 'öğretmen', 'polis', 'çiftçi', 'pilot',
      'diş hekimi', 'ressam', 'fırıncı', 'inşaat işçisi', 'tamirci', 'postacı', 'garson', 'kasiyer', 'bilim insanı',
      'hakim', 'cankurtaran', 'bahçıvan', 'balıkçı', 'denizci', 'şarkıcı', 'dansçı', 'sihirbaz', 'fotoğrafçı',
      'berber', 'veteriner', 'kovboy', 'bebek', 'büyükanne', 'ikizler', 'gelin', 'dedektif', 'dalgıç', 'madenci',
      'marangoz', 'terzi', 'hakem', 'hokkabaz', 'kütüphaneci', 'çoban', 'dede',
    ],
    sports: [
      'top', 'uçurtma', 'robot', 'basketbol', 'tenis', 'golf', 'bowling', 'kaykay', 'sörf tahtası', 'kayak',
      'buz pateni', 'paten', 'boks eldiveni', 'kupa', 'madalya', 'düdük', 'futbol', 'satranç', 'zar', 'iskambil',
      'yapboz', 'yoyo', 'oyuncak ayı', 'oyuncak bebek', 'ip atlama', 'topaç', 'bilye', 'salıncak', 'kaydırak',
      'tahterevalli', 'dart', 'domino', 'lastik ördek', 'oyuncak araba', 'sallanan at', 'tenis raketi', 'kask',
      'dambıl', 'hedef tahtası', 'trambolin', 'voleybol', 'hokey sopası', 'kumdan kale', 'masa tenisi', 'tavla',
    ],
    things: [
      'telefon', 'bilgisayar', 'televizyon', 'gözlük', 'şapka', 'ayakkabı', 'eldiven', 'şemsiye', 'çanta', 'anahtar',
      'kilit', 'makas', 'kalem', 'kitap', 'mektup', 'zarf', 'hediye', 'balon', 'gitar', 'davul', 'piyano', 'kum saati',
      'sırt çantası', 'cüzdan', 'kol saati', 'yüzük', 'kolye', 'tarak', 'diş macunu', 'çorap', 'gömlek', 'elbise',
      'düğme', 'çekiç', 'mıknatıs', 'el feneri', 'pil', 'ampul', 'dünya küresi', 'harita', 'trompet', 'keman',
      'kulaklık', 'cetvel', 'silgi',
    ],
    cinema: [
      'patlamış mısır', 'bilet', 'kamera', 'perde', 'projektör', 'film makarası', 'ekran', 'klaket', 'yönetmen',
      'oyuncu', 'spot ışığı', 'mikrofon', 'kırmızı halı', 'ödül', 'kumanda', 'gazoz', 'pipet', 'cips', 'sahne',
      'megafon', 'tripod', 'sinema koltuğu', 'hoparlör', 'gişe', 'afiş', 'kameraman', 'dublör', 'kostüm', 'maske',
      'seyirci', 'senaryo', 'yazlık sinema', 'büfe', 'film yıldızı', 'imza', 'tablet', 'film şeridi', 'mısır makinesi',
      'çizgi film', 'kukla', 'tiyatro', 'çıkış tabelası', 'dev ekran', 'sinema salonu', 'karton bardak',
    ],
    fantasy: [
      'ejderha', 'hayalet', 'deniz kızı', 'uzaylı', 'taç', 'kılıç', 'kalkan', 'hazine', 'korsan', 'kale', 'büyücü',
      'cadı', 'tekboynuz', 'peri', 'dev', 'trol', 'prenses', 'prens', 'kral', 'kraliçe', 'şövalye', 'sihirli değnek',
      'iksir', 'kristal küre', 'büyü kitabı', 'uçan süpürge', 'uçan halı', 'ejderha yumurtası', 'sihirli lamba',
      'hazine haritası', 'ufo', 'süper kahraman', 'pelerin', 'anka kuşu', 'kanatlı at', 'yeti', 'kardan adam',
      'canavar', 'dinozor', 'deniz canavarı', 'sihirli fasulye', 'kurabiye adam', 'taht', 'kazan', 'sihirli ayna',
    ],
    actions: [
      'yüzmek', 'uyumak', 'dans etmek', 'koşmak', 'zıplamak', 'yemek yemek', 'su içmek', 'okumak', 'yazmak',
      'şarkı söylemek', 'ağlamak', 'gülmek', 'hapşırmak', 'esnemek', 'balık tutmak', 'yemek pişirmek', 'resim yapmak',
      'tırmanmak', 'uçmak', 'kayak yapmak', 'sörf yapmak', 'paten kaymak', 'el sallamak', 'alkışlamak', 'sarılmak',
      'diş fırçalamak', 'araba sürmek', 'ata binmek', 'yürümek', 'oturmak', 'kazmak', 'örgü örmek', 'süpürmek',
      'çiçek sulamak', 'alışveriş yapmak', 'tekme atmak', 'top atmak', 'kamp yapmak', 'yürüyüş yapmak', 'horlamak',
      'ıslık çalmak', 'düşmek', 'emeklemek', 'baloncuk üflemek', 'kürek çekmek',
    ],
  },
  en: {
    animals: [
      'cat', 'dog', 'fish', 'bird', 'rabbit', 'elephant', 'giraffe', 'lion', 'penguin', 'turtle', 'snake', 'spider',
      'butterfly', 'bee', 'cow', 'horse', 'chicken', 'duck', 'owl', 'octopus', 'monkey', 'zebra', 'kangaroo',
      'crocodile', 'shark', 'whale', 'dolphin', 'frog', 'snail', 'pig', 'sheep', 'mouse', 'bear', 'tiger', 'camel',
      'crab', 'ladybug', 'squirrel', 'flamingo', 'hedgehog', 'parrot', 'goat', 'deer', 'jellyfish', 'bat',
    ],
    food: [
      'apple', 'banana', 'strawberry', 'watermelon', 'pear', 'grapes', 'lemon', 'carrot', 'corn', 'mushroom', 'pizza',
      'hamburger', 'ice cream', 'cake', 'donut', 'tea', 'coffee', 'egg', 'cheese', 'bread', 'cherry', 'pineapple',
      'orange', 'tomato', 'potato', 'onion', 'broccoli', 'pumpkin', 'sandwich', 'hot dog', 'fries', 'cookie',
      'cupcake', 'pancake', 'lollipop', 'candy', 'chocolate', 'milk', 'honey', 'soup', 'pretzel', 'noodles', 'sausage',
      'avocado', 'peanut',
    ],
    home: [
      'pillow', 'bed', 'chair', 'table', 'door', 'window', 'fridge', 'teapot', 'pot', 'toothbrush', 'lamp', 'candle',
      'sofa', 'bathtub', 'shower', 'toilet', 'sink', 'mirror', 'carpet', 'oven', 'microwave', 'kettle', 'frying pan',
      'plate', 'fork', 'spoon', 'knife', 'cup', 'bowl', 'broom', 'bucket', 'washing machine', 'clock', 'towel',
      'blanket', 'shelf', 'stairs', 'fireplace', 'doorbell', 'vase', 'soap', 'sponge', 'iron', 'fan', 'trash can',
    ],
    places: [
      'house', 'school', 'bridge', 'tent', 'tower', 'lighthouse', 'fountain', 'igloo', 'hospital', 'library', 'farm',
      'zoo', 'beach', 'park', 'playground', 'airport', 'train station', 'supermarket', 'bakery', 'restaurant',
      'museum', 'barn', 'windmill', 'skyscraper', 'city', 'village', 'garden', 'swimming pool', 'stadium', 'circus',
      'harbor', 'bus stop', 'road', 'gas station', 'post office', 'police station', 'fire station', 'hotel', 'factory',
      'market', 'tunnel', 'treehouse', 'amusement park', 'parking lot', 'cafe',
    ],
    transport: [
      'car', 'bus', 'train', 'airplane', 'ship', 'bicycle', 'rocket', 'helicopter', 'boat', 'tractor', 'motorcycle',
      'scooter', 'truck', 'taxi', 'ambulance', 'fire truck', 'police car', 'submarine', 'sailboat', 'canoe', 'tram',
      'subway', 'van', 'bulldozer', 'crane', 'garbage truck', 'school bus', 'cable car', 'parachute', 'spaceship',
      'steering wheel', 'traffic light', 'carriage', 'sled', 'raft', 'ferry', 'jet ski', 'kayak', 'unicycle',
      'tricycle', 'wagon', 'forklift', 'cruise ship', 'yacht', 'wheel',
    ],
    nature: [
      'sun', 'moon', 'star', 'cloud', 'rain', 'snowflake', 'rainbow', 'lightning', 'mountain', 'tree', 'flower',
      'cactus', 'leaf', 'volcano', 'island', 'waterfall', 'river', 'lake', 'sea', 'wave', 'cave', 'desert', 'forest',
      'sunflower', 'rose', 'tulip', 'palm tree', 'pine tree', 'grass', 'rock', 'tornado', 'comet', 'planet', 'iceberg',
      'acorn', 'pinecone', 'seashell', 'feather', 'nest', 'puddle', 'sunset', 'hill', 'coral', 'log', 'icicle',
    ],
    jobs: [
      'astronaut', 'clown', 'chef', 'doctor', 'firefighter', 'nurse', 'teacher', 'police officer', 'farmer', 'pilot',
      'dentist', 'painter', 'baker', 'builder', 'mechanic', 'postman', 'waiter', 'scientist', 'judge', 'lifeguard',
      'gardener', 'fisherman', 'sailor', 'singer', 'dancer', 'magician', 'photographer', 'barber', 'vet', 'cowboy',
      'baby', 'grandmother', 'twins', 'bride', 'detective', 'diver', 'miner', 'carpenter', 'tailor', 'referee',
      'juggler', 'librarian', 'cashier', 'plumber', 'grandfather',
    ],
    sports: [
      'ball', 'kite', 'robot', 'basketball', 'tennis', 'golf', 'bowling', 'skateboard', 'surfboard', 'skis',
      'ice skates', 'roller skates', 'boxing glove', 'trophy', 'medal', 'whistle', 'goal', 'chess', 'dice',
      'playing cards', 'puzzle', 'yoyo', 'teddy bear', 'doll', 'jump rope', 'spinning top', 'marbles', 'swing',
      'slide', 'seesaw', 'darts', 'dominoes', 'rubber duck', 'toy car', 'building blocks', 'rocking horse',
      'tennis racket', 'helmet', 'dumbbell', 'target', 'trampoline', 'baseball', 'volleyball', 'hockey stick',
      'sandcastle',
    ],
    things: [
      'phone', 'computer', 'television', 'glasses', 'hat', 'shoe', 'glove', 'umbrella', 'bag', 'key', 'lock',
      'scissors', 'pencil', 'book', 'letter', 'envelope', 'gift', 'balloon', 'guitar', 'drum', 'piano', 'hourglass',
      'backpack', 'wallet', 'watch', 'ring', 'necklace', 'comb', 'toothpaste', 'sock', 'shirt', 'dress', 'button',
      'hammer', 'ladder', 'magnet', 'flashlight', 'battery', 'light bulb', 'globe', 'map', 'trumpet', 'violin',
      'headphones', 'ruler',
    ],
    cinema: [
      'popcorn', 'ticket', 'camera', 'curtain', 'projector', 'film reel', 'screen', 'clapperboard', 'director',
      'actor', 'spotlight', 'microphone', 'red carpet', 'award', 'remote', 'soda', 'straw', 'nachos', 'stage',
      'megaphone', 'tripod', 'cinema seat', 'speaker', 'ticket booth', 'movie poster', 'cameraman', 'stuntman',
      'costume', 'mask', 'audience', 'script', 'big screen', 'drive in', 'snack bar', 'movie star', 'autograph',
      'cup holder', 'laptop', 'film strip', 'popcorn machine', 'cartoon', 'puppet show', 'theater', 'tablet',
      'exit sign',
    ],
    fantasy: [
      'dragon', 'ghost', 'mermaid', 'alien', 'crown', 'sword', 'shield', 'treasure', 'pirate', 'castle', 'wizard',
      'witch', 'unicorn', 'fairy', 'giant', 'troll', 'elf', 'princess', 'prince', 'king', 'queen', 'knight',
      'magic wand', 'potion', 'crystal ball', 'spell book', 'broomstick', 'flying carpet', 'genie', 'magic lamp',
      'treasure map', 'ufo', 'superhero', 'cape', 'phoenix', 'pegasus', 'yeti', 'snowman', 'monster', 'dinosaur',
      'sea monster', 'beanstalk', 'gingerbread man', 'throne', 'cauldron',
    ],
    actions: [
      'swimming', 'sleeping', 'dancing', 'running', 'jumping', 'eating', 'drinking', 'reading', 'writing', 'singing',
      'crying', 'laughing', 'sneezing', 'yawning', 'fishing', 'cooking', 'painting', 'climbing', 'flying', 'skiing',
      'surfing', 'skating', 'waving', 'clapping', 'hugging', 'brushing teeth', 'driving', 'riding', 'walking',
      'sitting', 'digging', 'knitting', 'sweeping', 'gardening', 'shopping', 'kicking', 'throwing', 'camping',
      'hiking', 'snoring', 'whistling', 'falling', 'crawling', 'blowing bubbles', 'rowing',
    ],
  },
};

/** Every word of a language (all categories). */
export const DRAW_WORDS: Record<'tr' | 'en', readonly string[]> = {
  tr: DRAW_CATEGORIES.flatMap((c) => DRAW_WORD_SETS.tr[c]),
  en: DRAW_CATEGORIES.flatMap((c) => DRAW_WORD_SETS.en[c]),
};
