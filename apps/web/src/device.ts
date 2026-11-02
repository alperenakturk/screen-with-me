/**
 * What kind of device the site runs on (0.9.91.2), in one place: code asks here instead of sniffing on its own, so a
 * future store app (a native shell around this site, docs/internal/apps.md) or a TV version can change the answers in
 * one file. The same facts are on <html> as classes (`is-touch`, `is-ios`, `is-standalone`, `is-app`) for CSS; the
 * phone layout itself lives in phone.css.
 */

const coarse = matchMedia('(pointer: coarse)');

/**
 * A mouse or touchpad is there (also on a touch-screen laptop, whose primary pointer can be reported as coarse): the
 * room's rail then waits for the mouse at the video's edge instead of staying on screen (0.9.93.6, owner's bug: on his
 * laptop the rail never went away in YouTube fullscreen).
 */
const mouse = matchMedia('(any-pointer: fine) and (any-hover: hover)');
export function hasMouse(): boolean {
  return mouse.matches;
}

/** A finger, not a mouse (phones, tablets). */
export function isTouch(): boolean {
  return coarse.matches;
}

/**
 * A phone (a touch screen that is narrow upright or short sideways), not a tablet or a computer. Tablets get their
 * own tuning later (owner, 0.9.91.5).
 */
export function isPhone(): boolean {
  return matchMedia('(pointer: coarse) and (max-width: 700px), (pointer: coarse) and (max-height: 500px)').matches;
}

/**
 * The phone layout (0.9.92.3, owner's "app-like phone" redesign): a phone held either way, or any window as narrow as
 * a phone. `<html class="phone">` follows it live (phone.css and ui/phone-room.ts use it).
 */
const phoneQuery = matchMedia('(max-width: 700px), (pointer: coarse) and (max-height: 500px)');
export function isPhoneLayout(): boolean {
  return phoneQuery.matches;
}

/** Calls `listener` when the window enters or leaves the phone layout. */
export function onPhoneLayout(listener: (phone: boolean) => void): void {
  phoneQuery.addEventListener('change', () => listener(phoneQuery.matches));
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

/**
 * Sideways or upright (0.9.92.6). Not `(orientation: landscape)`: a phone's keyboard makes the page short and wide, and
 * the room took that for "turned sideways" (fullscreen opened, the layout jumped while typing). Turning the phone
 * changes the page's width; the keyboard (and the browser's bars) only change its height. So the answer is only
 * worked out again when the width changes. `<html class="sideways">` follows it (phone.css uses it, never the
 * orientation media query).
 */
let sidewaysNow = innerWidth > innerHeight;
let lastWidth = innerWidth;
const turnListeners = new Set<(sideways: boolean) => void>();
function checkTurn(): void {
  if (innerWidth === lastWidth) return;
  lastWidth = innerWidth;
  const next = innerWidth > innerHeight;
  if (next === sidewaysNow) return;
  sidewaysNow = next;
  document.documentElement.classList.toggle('sideways', next);
  for (const listener of turnListeners) listener(next);
}
addEventListener('resize', checkTurn);
screen.orientation?.addEventListener('change', () => setTimeout(checkTurn, 120));

export function isSideways(): boolean {
  return sidewaysNow;
}

/** Calls `listener` when the phone is turned (true = sideways). */
export function onTurn(listener: (sideways: boolean) => void): void {
  turnListeners.add(listener);
}

/** Marks <html> once at start-up. */
export function markDevice(): void {
  const root = document.documentElement.classList;
  root.toggle('is-touch', isTouch());
  root.toggle('has-mouse', hasMouse());
  root.toggle('is-ios', isIOS());
  root.toggle('is-standalone', isStandalone());
  root.toggle('is-app', isApp());
  coarse.addEventListener('change', () => root.toggle('is-touch', isTouch()));
  mouse.addEventListener('change', () => root.toggle('has-mouse', hasMouse()));
  root.toggle('sideways', sidewaysNow);
  root.toggle('phone', isPhoneLayout());
  onPhoneLayout((phone) => root.toggle('phone', phone));
}
