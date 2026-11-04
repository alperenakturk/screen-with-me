import { t } from './i18n.ts';
import { isShell, load, save } from './storage.ts';
import { flashHint } from './ui/hint.ts';

/** `0.9.91.12` < `0.9.91.13` (numeric parts; missing parts count as 0). */
export function olderVersion(have: string, latest: string): boolean {
  const a = have.split('.').map(Number);
  const b = latest.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    if (x !== y) return x < y;
  }
  return false;
}

/**
 * The installed extension is older than the site's (owner, 0.9.91.13: he unpacked a new zip into another folder, ↻ on
 * the extensions page kept reading the old one, and nothing told him). The top bar's "Eklenti" link gets a dot and
 * says which version is installed and which is new; once per new version a bubble says it too. The extension page
 * explains how to update. In the Web Store version Chrome updates by itself, so this stays quiet there.
 */
export function checkExtensionVersion(): void {
  if (isShell) return;
  let tries = 0;
  const check = () => {
    // The bridge marks the page with the installed version (it may arrive a moment after the page).
    const have = document.documentElement.dataset.swmExtension;
    if (!have) {
      if (++tries < 5) setTimeout(check, 1000);
      return;
    }
    void fetch('/extension-version.json', { cache: 'no-store' })
      .then((response) => (response.ok ? (response.json() as Promise<{ version?: unknown }>) : null))
      .then((data) => {
        const latest = typeof data?.version === 'string' ? data.version : null;
        if (!latest || !olderVersion(have, latest)) return;
        const link = document.querySelector<HTMLAnchorElement>('.topbar a.nav-link[href="/extension.html"]');
        if (!link) return;
        const text = t('extUpdate', { have, latest });
        link.classList.add('ext-update');
        link.title = text;
        if (load('extUpdateSeen') === latest) return;
        // R18: in a room, the bubble waits until I'm really in (not over the join card or the door).
        const show = () => {
          save('extUpdateSeen', latest);
          flashHint(link, text, 9000);
        };
        if (/^\/r\//.test(location.pathname) && document.documentElement.dataset.swmJoined !== '1') addEventListener('swm-joined', show, { once: true });
        else show();
      })
      .catch(() => {});
  };
  setTimeout(check, 1500);
}
