export interface SiteConfig {
  origin: string;
  aliases: string[];
}
export const CONFIG_PATH: string;
export function readSiteConfig(path?: string): SiteConfig;
export function wsOrigin(origin: string): string;
