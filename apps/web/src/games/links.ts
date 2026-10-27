// Odadan oyun açma: sohbete atılan kendi oyun linkimiz (/oyun/<tür>/<kod>) sohbette "Katıl" kartı olarak görünür.
// Protokol değişmez: mesaj düz metin, kartı istemci çizer; sadece bu sitenin adresi tanınır (başka site linki karta
// dönüşmez).

export const PLAY_KINDS = ['xox', 'four', 'draw', 'quiz'] as const;
export type PlayKind = (typeof PLAY_KINDS)[number];

const ICONS: Record<PlayKind, string> = { xox: '❌⭕', four: '🔴🟡', draw: '✏️', quiz: '❓' };
export const gameIcon = (kind: PlayKind): string => ICONS[kind];

export function gameLink(text: string): { kind: PlayKind; url: string } | null {
  const m = text.trim().match(/^(https?:\/\/[^/\s]+)\/oyun\/(xox|four|draw|quiz)\/([A-Za-z0-9_-]{3,40})\/?$/);
  if (!m || m[1] !== location.origin) return null;
  return { kind: m[2] as PlayKind, url: `${m[1]}/oyun/${m[2]}/${m[3]}` };
}
