import './styles.css';
import { isShell, syncStore } from './storage.ts';

// Film sayfasının üstündeki oda katmanında (kabuk) sitenin bazı parçaları (eklenti linki, ana sayfa
// logosu, alt bilgi) gizlenir; sınıf en başta konur ki ilk karede görünmesin.
if (isShell) document.documentElement.classList.add('shell');

// Önce ayarlar eklentiyle eşitlenir (dil, tema, isim ilk karede doğru gelsin), sonra site çizilir.
void syncStore().then(() => import('./app.ts'));
