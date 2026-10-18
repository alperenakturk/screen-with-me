import type { BanEntry, ClientMessage, Member } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { avatarNode } from './avatar.ts';
import { t } from '../i18n.ts';

/**
 * Kişiler sekmesi: odadakiler, oda yöneticisi (👑), yönetici için "çıkar" butonu
 * ve çıkarılanlar listesi (yasağı kaldırmak için).
 */
export function createPeoplePanel(root: HTMLElement, send: (message: ClientMessage) => void) {
  const list = root.querySelector<HTMLUListElement>('#members')!;
  const hint = root.querySelector<HTMLElement>('#host-hint')!;
  const bansBox = root.querySelector<HTMLElement>('#bans')!;
  const bansList = root.querySelector<HTMLUListElement>('#bans-list')!;
  let members: Member[] = [];
  let hostId: string | null = null;
  let myId: string | null = null;
  let bans: BanEntry[] = [];

  function render(): void {
    const iAmHost = myId !== null && myId === hostId;
    list.replaceChildren(
      ...members.map((member) => {
        const isMe = member.id === myId;
        const kick = el('button', { type: 'button', class: 'icon-btn kick', title: t('kick'), 'aria-label': t('kick') }, '✕');
        kick.addEventListener('click', () => {
          if (confirm(t('kickConfirm', { name: member.name }))) send({ t: 'kick', id: member.id });
        });
        return el(
          'li',
          { class: isMe ? 'person me' : 'person' },
          avatarNode(member.avatar, 'person-avatar'),
          el('span', { class: 'person-name' }, isMe ? `${member.name} (${t('you')})` : member.name),
          member.id === hostId ? el('span', { class: 'host-badge', title: t('host') }, '👑') : '',
          member.client === 'ext' ? el('span', { class: 'host-badge', title: t('inFilm') }, '🎬') : '',
          iAmHost && !isMe ? kick : '',
        );
      }),
    );
    const host = members.find((m) => m.id === hostId);
    hint.textContent = iAmHost ? t('youAreHost') : host ? t('hostIs', { name: host.name }) : '';

    // Çıkarılanlar: sadece yönetici görür; boşken de (nereden kaldıracağını önceden bilsin).
    bansBox.hidden = !iAmHost;
    if (bans.length === 0) {
      bansList.replaceChildren(el('li', { class: 'muted small' }, t('noBans')));
      return;
    }
    bansList.replaceChildren(
      ...bans.map((ban) => {
        const unban = el('button', { type: 'button', class: 'btn small-btn' }, t('unban'));
        unban.addEventListener('click', () => send({ t: 'unban', id: ban.id }));
        return el(
          'li',
          { class: 'person banned' },
          avatarNode(ban.avatar, 'person-avatar'),
          el('span', { class: 'person-name' }, ban.name),
          unban,
        );
      }),
    );
  }

  return {
    set(next: Member[], nextHost: string | null, me: string | null): void {
      members = next;
      hostId = nextHost;
      myId = me;
      render();
    },
    setBans(next: BanEntry[]): void {
      bans = next;
      render();
    },
    get hostId(): string | null {
      return hostId;
    },
    render,
  };
}
