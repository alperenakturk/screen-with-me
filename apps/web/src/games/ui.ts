// Shared pieces of the in-room games: the host's settings rows (language, topic, length…) and the podium. Every game
// uses the same ones so the games look like one product. Built with DOM calls, never innerHTML with user data.

import type { Avatar } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { avatarNode } from '../ui/avatar.ts';

export interface Choice<T extends string | number> {
  value: T;
  label: string;
}

export interface SettingRow<T extends string | number = string | number> {
  label: string;
  value: T;
  choices: readonly Choice<T>[];
  /** Many choices: a drop-down instead of chips. */
  select?: boolean;
  pick: (value: T) => void;
}

/**
 * The host's settings: chips (or a drop-down) per row. Others see the same rows as plain text and who picks them.
 * `hostName` is null when I am the host.
 */
export function settingsPanel(rows: readonly SettingRow[], hostName: string | null): HTMLElement {
  const box = el('div', { class: 'game-settings' });
  for (const row of rows) {
    const current = row.choices.find((c) => c.value === row.value)?.label ?? String(row.value);
    let control: HTMLElement;
    if (hostName !== null) control = el('span', { class: 'game-setting-value' }, current);
    else if (row.select) {
      const select = el('select', { class: 'game-setting-select', 'aria-label': row.label }) as HTMLSelectElement;
      for (const choice of row.choices) {
        const option = el('option', { value: String(choice.value) }, choice.label) as HTMLOptionElement;
        option.selected = choice.value === row.value;
        select.append(option);
      }
      select.addEventListener('change', () => {
        const choice = row.choices.find((c) => String(c.value) === select.value);
        if (choice) row.pick(choice.value);
      });
      control = select;
    } else {
      control = el(
        'span',
        { class: 'game-chips', role: 'radiogroup', 'aria-label': row.label },
        ...row.choices.map((choice) => {
          const on = choice.value === row.value;
          const chip = el('button', { type: 'button', class: `game-chip${on ? ' on' : ''}`, role: 'radio', 'aria-checked': String(on) }, choice.label);
          chip.addEventListener('click', () => {
            if (!on) row.pick(choice.value);
          });
          return chip;
        }),
      );
    }
    box.append(el('div', { class: 'game-setting' }, el('span', { class: 'game-setting-label' }, row.label), control));
  }
  if (hostName !== null) box.append(el('p', { class: 'muted small game-setting-note' }, t('games.hostPicks', { name: hostName })));
  return box;
}

/** The game language row, the same in every word game: English first (the product's language order). */
export const langChoices: readonly Choice<'tr' | 'en'>[] = [
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Türkçe' },
];

/**
 * QA3 (one lobby family): every table's lobby card is two parts: what the game is (the title, the rules, the faces) and
 * its setup (the settings, Start and the hint under Start). lobby.css puts them side by side in a wide box and one
 * above the other in a narrow one.
 */
export function lobbySplit(intro: readonly (HTMLElement | null | false)[], setup: readonly (HTMLElement | null | false)[]): HTMLElement[] {
  return [el('div', { class: 'lobby-intro' }, ...intro), el('div', { class: 'lobby-setup' }, ...setup)];
}

/** Podium for the top three (1st in the middle and highest). */
export function podium(players: readonly { name: string; avatar?: Avatar; score: number }[]): HTMLElement {
  const top = [...players].sort((a, b) => b.score - a.score).slice(0, 3);
  // Visual order 2 · 1 · 3.
  const order = [top[1], top[0], top[2]];
  return el(
    'ol',
    { class: 'game-podium' },
    ...order.map((p, i) => {
      if (!p) return el('li', { class: 'vacant', 'aria-hidden': 'true' });
      const place = [2, 1, 3][i]!;
      return el(
        'li',
        { class: `place-${place}` },
        avatarNode(p.avatar, 'game-podium-avatar'),
        el('b', {}, p.name),
        el('span', { class: 'game-podium-score' }, String(p.score)),
        el('span', { class: 'game-podium-step', 'aria-label': `${place}.` }, ['🥇', '🥈', '🥉'][place - 1]!),
      );
    }),
  );
}

/**
 * A lobby's players (CL2): a row of faces inside the lobby card, so the lobby needs no players column beside it. The
 * host wears a 👑; an empty chair shows while fewer than two are here.
 */
export function lobbyPlayers(players: readonly { id: string; name: string; avatar?: Avatar; online?: boolean }[], me: string | null, host?: string | null): HTMLElement {
  const here = players.filter((p) => p.online !== false);
  return el(
    'ul',
    { class: 'lobby-players' },
    ...here.map((p) =>
      el(
        'li',
        { class: `lobby-player${p.id === me ? ' me' : ''}` },
        avatarNode(p.avatar, 'lobby-avatar'),
        el('span', { class: 'lobby-name' }, `${p.id === host ? '👑 ' : ''}${p.name}${p.id === me ? ` (${t('games.you')})` : ''}`),
      ),
    ),
    ...(here.length < 2 ? [el('li', { class: 'lobby-player lobby-free' }, el('span', { class: 'lobby-avatar lobby-empty', 'aria-hidden': 'true' }, '?'), el('span', { class: 'lobby-name muted' }, t('games.seatEmpty')))] : []),
  );
}
