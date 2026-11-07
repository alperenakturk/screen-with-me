// 🐞 Test Lab (card LABTR): a lab text in the page's language. Part of the lab's lazy chunk. Texts are `LabText`
// (debug-lab.ts): plain English, or `{ en, tr }` pairs written next to the command (checked by scripts/check-texts.mjs).
import { lang } from '../i18n.ts';
import type { LabText } from '../debug-lab.ts';

export const labTr = (): boolean => lang() === 'tr';

/** The text to show now. */
export function say(text: LabText | undefined | null): string {
  if (text === undefined || text === null) return '';
  if (typeof text === 'string') return text;
  return labTr() ? text.tr : text.en;
}

/** Both languages, for the command box's search (an English word finds a command on a Turkish page too). */
export function both(text: LabText | undefined | null): string {
  if (text === undefined || text === null) return '';
  return typeof text === 'string' ? text : `${text.en} ${text.tr}`;
}

/** The message of a thrown error in the page's language (`labFail` keeps the pair on the error). */
export function errorText(error: unknown): string {
  const pair = (error as { lab?: LabText } | null)?.lab;
  if (pair) return say(pair);
  return String((error as Error)?.message ?? error);
}

