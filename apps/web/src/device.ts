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

/** iOS Safari itself (not Chrome / Firefox / an in-app browser on iOS): the one with "Add to Home Screen" in Share. */
export function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  return isIOS() && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|Instagram|FBAN|FBAV|Line\//.test(ua);
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
let realSideways = innerWidth > innerHeight;
let sidewaysNow = realSideways;
let lastWidth = innerWidth;
/** PH2: while a game is open in the phone's Games tab, the room stays upright however the phone is held. */
let heldUpright = false;
/** The last upright page size: held sideways, the upright column is laid out at it and scaled to the height. */
let upright = realSideways ? null : { w: innerWidth, h: innerHeight };
const turnListeners = new Set<(sideways: boolean) => void>();
function applyTurn(): void {
  const root = document.documentElement;
  const turned = heldUpright && realSideways;
  root.classList.toggle('upright-turned', turned);
  if (turned) {
    // Never seen upright (opened sideways): the screen's own short and long sides, less the browser's bars.
    const w = upright?.w ?? Math.min(screen.width, screen.height);
    const h = upright?.h ?? Math.max(screen.width, screen.height) - (Math.min(screen.width, screen.height) - innerHeight);
    root.style.setProperty('--up-w', `${w}px`);
    root.style.setProperty('--up-h', `${h}px`);
    root.style.setProperty('--up-s', String(Math.min(1, innerHeight / h)));
  } else for (const v of ['--up-w', '--up-h', '--up-s']) root.style.removeProperty(v);
  const next = realSideways && !heldUpright;
  if (next === sidewaysNow) return;
  sidewaysNow = next;
  root.classList.toggle('sideways', next);
  for (const listener of turnListeners) listener(next);
}
function checkTurn(): void {
  if (innerWidth !== lastWidth) {
    lastWidth = innerWidth;
    realSideways = innerWidth > innerHeight;
    // Only a turn changes the width (the keyboard and the browser's bars change the height), so its height then is
    // the page's real upright height.
    if (!realSideways) upright = { w: innerWidth, h: innerHeight };
  }
  applyTurn();
}
addEventListener('resize', checkTurn);
screen.orientation?.addEventListener('change', () => setTimeout(checkTurn, 120));

/**
 * PH2 (owner, 13 Nov 2026: "nothing happens when the phone is turned"): while `on`, the room is upright whatever the
 * phone does. `isSideways()` stays false and `<html class="sideways">` stays off. Held sideways, `<html
 * class="upright-turned">` lays the upright column out at its upright size, centred and scaled to the height
 * (room.css). Releasing it brings the real orientation back.
 */
export function holdUpright(on: boolean): void {
  if (on === heldUpright) return;
  heldUpright = on;
  applyTurn();
}

export function isSideways(): boolean {
  return sidewaysNow;
}

/** Calls `listener` when the phone is turned (true = sideways). */
export function onTurn(listener: (sideways: boolean) => void): void {
  turnListeners.add(listener);
}

/**
 * An upright tablet (card T, owner's pick B on https://claude.ai/artifact/GXitrW7UaKsiWHBtWzk4Mw): a touch screen
 * without a mouse, not in the phone layout, held upright (by width, like `sideways`: the keyboard never flips it) and
 * at least 701 px wide. `<html class="tablet-up">` follows it: the room puts the video on top and two columns below
 * (chat; Together + Queue / People). Sideways tablets keep the computer layout.
 */
export function isTabletUpright(): boolean {
  return isTouch() && !hasMouse() && !isPhoneLayout() && !sidewaysNow && innerWidth >= 701;
}

const tabletListeners = new Set<(upright: boolean) => void>();
let tabletNow = false;
let tabletCss = false;
function checkTablet(): void {
  // The tablet styles (tablet.css) load only on a touch screen without a mouse that is not in the phone layout.
  if (!tabletCss && isTouch() && !hasMouse() && !isPhoneLayout()) {
    tabletCss = true;
    void import('./tablet.css');
  }
  const next = isTabletUpright();
  if (next === tabletNow) return;
  tabletNow = next;
  document.documentElement.classList.toggle('tablet-up', next);
  for (const listener of tabletListeners) listener(next);
}

/** Calls `listener` when the window enters or leaves the upright-tablet layout. */
export function onTabletUpright(listener: (upright: boolean) => void): void {
  tabletListeners.add(listener);
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
  checkTablet();
  onPhoneLayout(checkTablet);
  onTurn(checkTablet);
  addEventListener('resize', checkTablet);
  coarse.addEventListener('change', checkTablet);
  mouse.addEventListener('change', checkTablet);
}
