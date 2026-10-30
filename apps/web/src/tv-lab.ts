// Tiny on purpose: loaded with every page (app.ts), while the TV code itself (tv.ts, QR) loads only when used.
import { load, save } from './storage.ts';

/**
 * The TV version is hidden for now (owner, 30 Oct 2026: shelved until a Google Cast version after 1.0; the code stays).
 * It only works on a device where the hidden lab switch is on: open any page of the site with `?tvlab=1` (`?tvlab=0`
 * turns it off). Without it the TV button, `/tv`, `/tv/<code>` and `/tv-test` are not reachable.
 */
export function tvLab(): boolean {
  return load('opt:tvLab') === '1';
}

/** Reads `?tvlab=1|0` from the address once and removes it. */
export function readTvLabSwitch(): void {
  const params = new URLSearchParams(location.search);
  const value = params.get('tvlab');
  if (value === null) return;
  save('opt:tvLab', value === '1' ? '1' : '0');
  params.delete('tvlab');
  const rest = params.toString();
  history.replaceState(null, '', `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`);
}
