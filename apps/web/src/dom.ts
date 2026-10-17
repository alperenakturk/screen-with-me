/**
 * Küçük bir öğe oluşturucu. Kullanıcıdan gelen metinler (isim, sohbet, başlık)
 * her zaman textContent ile yazılır, asla innerHTML ile; böylece biri adına
 * <script> yazsa bile çalışmaz (XSS koruması).
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Record<string, string>> = {},
  ...children: (Node | string | null | false)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    if (key === 'class') element.className = value;
    else element.setAttribute(key, value);
  }
  for (const child of children) if (child !== null && child !== false) element.append(child);
  return element;
}

/** <details> panelinin açık/kapalı durumunu tarayıcıda hatırlar. */
export function rememberOpen(details: HTMLDetailsElement, key: string, load: (k: string) => string | null, save: (k: string, v: string) => void): void {
  const saved = load(key);
  if (saved !== null) details.open = saved === '1';
  details.addEventListener('toggle', () => save(key, details.open ? '1' : '0'));
}
