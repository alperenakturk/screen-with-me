// Offline page (shown by sw.js): language and "try again" (moved out of the page for the CSP).
// Dil: sitede seçilen (yoksa tarayıcının dili); bu sayfa çevrimdışı açıldığı için her şey burada.
var en = localStorage.getItem('lang') !== 'tr';
if (en) {
  document.documentElement.lang = 'en';
  document.title = 'Sidelit · Offline';
  document.getElementById('title').textContent = "You're offline";
  document.getElementById('text').textContent = "Sidelit needs an internet connection. Try again once you're back online.";
  document.getElementById('retry').textContent = 'Try again';
}
document.getElementById('retry').addEventListener('click', function () {
  location.reload();
});
addEventListener('online', function () {
  location.reload();
});
