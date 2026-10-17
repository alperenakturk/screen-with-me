// localStorage gizli sekmede veya engellenmiş çerezlerde hata verebilir;
// o durumda site yine çalışsın, sadece hatırlamasın.

export function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function save(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Kaydedilemezse sorun değil.
  }
}
