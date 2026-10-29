/**
 * What kind of device the site runs on (0.9.91.2), in one place: code asks here instead of sniffing on its own, so a
 * future store app (a native shell around this site, docs/internal/apps.md) or a TV version can change the answers in
 * one file. The same facts are on <html> as classes (`is-touch`, `is-ios`, `is-standalone`, `is-app`) for CSS; the
 * phone layout itself lives in phone.css.
 */

const coarse = matchMedia('(pointer: coarse)');

/** A finger, not a mouse (phones, tablets). */
export function isTouch(): boolean {
  return coarse.matches;
}

/** iPhone / iPad (iPadOS says "Macintosh" but has touch points). */
export function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

/** Opened from the home screen (PWA) or inside a store app: no browser bar around the page. */
export function isStandalone(): boolean {
  return matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true || isApp();
}

/** Inside a native store app (a Capacitor-style shell sets `window.Capacitor`); none exists yet. */
export function isApp(): boolean {
  return typeof (window as Window & { Capacitor?: unknown }).Capacitor === 'object';
}

/** Can a page element go fullscreen? Not on iPhone (only its own video player can); there the room uses its own. */
export function canElementFullscreen(): boolean {
  return typeof document.documentElement.requestFullscreen === 'function';
}

/** Has the system share sheet (phones): the invite opens it instead of copying. */
export function canShareSheet(): boolean {
  return typeof navigator.share === 'function' && isTouch();
}

type LockableOrientation = ScreenOrientation & { lock?: (orientation: string) => Promise<void> };

/** Turns a phone sideways for a landscape video in fullscreen (Android; iPhone ignores it, the person rotates). */
export function lockLandscape(): void {
  if (!isTouch()) return;
  (screen.orientation as LockableOrientation | undefined)?.lock?.('landscape').catch(() => {});
}

export function unlockOrientation(): void {
  if (!isTouch()) return;
  screen.orientation?.unlock?.();
}

/** Calls `listener` when the phone is turned (true = sideways). */
export function onTurn(listener: (sideways: boolean) => void): void {
  const sideways = matchMedia('(orientation: landscape)');
  sideways.addEventListener('change', () => listener(sideways.matches));
}

/** Marks <html> once at start-up. */
export function markDevice(): void {
  const root = document.documentElement.classList;
  root.toggle('is-touch', isTouch());
  root.toggle('is-ios', isIOS());
  root.toggle('is-standalone', isStandalone());
  root.toggle('is-app', isApp());
  coarse.addEventListener('change', () => root.toggle('is-touch', isTouch()));
}
