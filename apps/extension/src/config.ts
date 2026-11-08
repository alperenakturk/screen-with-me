declare const __SITE_URL__: string;
declare const __SITE_ALIASES__: string[];

/** Sitenin (ve sunucunun) adresi; derleme sırasında yazılır (bkz. build.mjs, site.config.json). */
export const SITE_URL: string = __SITE_URL__;

/** The site's origin and its other addresses (site.config.json `aliases`, card R3-3): all of them are "our site". */
export const SITE_ORIGINS: readonly string[] = [new URL(SITE_URL).origin, ...__SITE_ALIASES__];

/** Is this origin our site (the main address or an alias)? */
export const isSiteOrigin = (origin: string | null | undefined): boolean => !!origin && SITE_ORIGINS.includes(origin);

/** Tab-query patterns for every address of our site, e.g. `/r/*` for the rooms. */
export const sitePatterns = (path = '/*'): string[] => SITE_ORIGINS.map((origin) => `${origin}${path}`);
