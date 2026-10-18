// localStorage gizli sekmede veya engellenmiş çerezlerde hata verebilir;
// o durumda site yine çalışsın, sadece hatırlamasın.

export function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * İsim/avatar kaydeder ve ne zaman değiştiğini yazar: eklenti (site-bridge)
 * sitedeki ile kendindekinden hangisi daha yeniyse onu iki tarafta da geçerli yapar.
 */
export function saveIdentity(name: string, avatar?: string): void {
  save('name', name);
  if (avatar) save('avatar', avatar);
  save('identityAt', String(Date.now()));
}

export function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Kaydedilemezse sorun değil.
  }
}
