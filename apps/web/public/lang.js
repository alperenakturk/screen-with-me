// Statik sayfalar (eklenti, gizlilik) için dil seçimi. Ana siteyle aynı
// 'lang' anahtarını kullanır: birinde seçilen dil hepsinde geçerli olur.
// Varsayılan İngilizce. İçerik [data-lang-block="tr|en"] bloklarında,
// düğmeler [data-set-lang="tr|en"].
(function () {
  var KEY = 'lang';
  var current = 'en';
  try {
    if (localStorage.getItem(KEY) === 'tr') current = 'tr';
  } catch (e) {}

  function apply(lang) {
    current = lang;
    try {
      localStorage.setItem(KEY, lang);
    } catch (e) {}
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
        apply(button.getAttribute('data-set-lang'));
      });
    });
    apply(current);
  });
})();
