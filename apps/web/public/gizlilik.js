// Eski adres (gizlilik.html): yeni sayfaya git; ?lang= verildiyse onu koru, yoksa Türkçe.
location.replace('/privacy.html' + (location.search || '?lang=tr') + location.hash);
