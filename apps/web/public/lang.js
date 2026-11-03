// Statik sayfalar (eklenti, gizlilik) için dil seçimi. Ana siteyle aynı
// 'lang' anahtarını kullanır: birinde seçilen dil hepsinde geçerli olur.
// Varsayılan İngilizce. İçerik [data-lang-block="tr|en"] bloklarında,
// düğmeler [data-set-lang="tr|en"]. Adreste ?lang=en|tr varsa (ör. İngilizce README'deki bağlantı) sayfa o dilde
// açılır; kayıtlı dil değişmez (kullanıcı düğmeyle seçerse değişir).
(function () {
  var KEY = 'lang';
  var current = 'en';
  try {
    if (localStorage.getItem(KEY) === 'tr') current = 'tr';
  } catch (e) {}
  var asked = new URLSearchParams(location.search).get('lang');
  var fromLink = asked === 'tr' || asked === 'en';
  if (fromLink) current = asked;

  function apply(lang, remember) {
    current = lang;
    if (remember) {
      try {
        localStorage.setItem(KEY, lang);
      } catch (e) {}
    }
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-lang-block]').forEach(function (el) {
      el.hidden = el.getAttribute('data-lang-block') !== lang;
    });
    document.querySelectorAll('[data-set-lang]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-set-lang') === lang));
    });
    var title = document.querySelector('meta[name="title-' + lang + '"]');
    if (title) document.title = title.getAttribute('content');
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-set-lang]').forEach(function (button) {
      button.addEventListener('click', function () {
        apply(button.getAttribute('data-set-lang'), true);
      });
    });
    apply(current, false);
    // A section link (help.html#connection): the Turkish block's ids end in -tr, and a section inside a block that was
    // hidden while the page loaded was never scrolled to.
    var id = decodeURIComponent(location.hash.slice(1));
    if (id) {
      var target = document.getElementById(current === 'tr' && !/-tr$/.test(id) ? id + '-tr' : id) || document.getElementById(id);
      if (target) target.scrollIntoView();
    }
  });
})();
