// The site's address (card R3-3): written at build time from site.config.json (vite.config.ts `__SITE__`).

declare const __SITE__: { origin: string; aliases: string[] };

/** The main address and the older / other addresses of the same site. */
export const SITE: { readonly origin: string; readonly aliases: readonly string[] } = __SITE__;

/** Is this page open on one of the other addresses (it then moves to the main one)? */
export const onAlias = (): boolean => SITE.aliases.includes(location.origin);

/** The fragment that carries this browser's saves from an alias to the main address. */
export const HANDOFF_PREFIX = '#handoff=';
