// Offline page (shown by sw.js): language and "try again" (moved out of the page for the CSP).
// Dil: sitede seçilen (yoksa tarayıcının dili); bu sayfa çevrimdışı açıldığı için her şey burada.
var en = (localStorage.getItem('lang') || (navigator.language.startsWith('tr') ? 'tr' : 'en')) === 'en';
if (en) {
  document.documentElement.lang = 'en';
  document.title = 'ScreenWithMe · Offline';
  document.getElementById('title').textContent = "You're offline";
  document.getElementById('text').textContent = "ScreenWithMe needs an internet connection. Try again once you're back online.";
  document.getElementById('retry').textContent = 'Try again';
}
document.getElementById('retry').addEventListener('click', function () {
  location.reload();
});
addEventListener('online', function () {
  location.reload();
});
