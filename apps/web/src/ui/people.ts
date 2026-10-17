import type { ClientMessage, Member } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';

/** Kişiler sekmesi: odadakiler, oda yöneticisi (👑) ve yönetici için "çıkar" butonu. */
export function createPeoplePanel(root: HTMLElement, send: (message: ClientMessage) => void) {
  const list = root.querySelector<HTMLUListElement>('#members')!;
  const hint = root.querySelector<HTMLElement>('#host-hint')!;
  let members: Member[] = [];
  let hostId: string | null = null;
  let myId: string | null = null;

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
          el('span', { class: 'person-avatar', 'aria-hidden': 'true' }, member.avatar ?? '🙂'),
          el('span', { class: 'person-name' }, isMe ? `${member.name} (${t('you')})` : member.name),
          member.id === hostId ? el('span', { class: 'host-badge', title: t('host') }, '👑') : '',
          iAmHost && !isMe ? kick : '',
        );
      }),
    );
    const host = members.find((m) => m.id === hostId);
    hint.textContent = iAmHost ? t('youAreHost') : host ? t('hostIs', { name: host.name }) : '';
  }

  return {
    set(next: Member[], nextHost: string | null, me: string | null): void {
      members = next;
      hostId = nextHost;
      myId = me;
      render();
    },
    get hostId(): string | null {
      return hostId;
    },
    render,
  };
}
