import { cleanName, type Avatar } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { avatarNode, openAvatarDialog } from './avatar.ts';
import { t } from '../i18n.ts';
import { renderThemeSetting } from '../themes.ts';
import { load, save } from '../storage.ts';

export interface Options {
  /** Oda hareketleri (oynattı, durdurdu...) sohbette görünsün mü? */
  showEvents: boolean;
  /** Emojiler videonun üstünde uçuşsun mu? */
  showReactions: boolean;
}

function readOption(key: string): boolean {
  return load(key) !== '0';
}

/** Ayarlar sekmesi: isim, avatar, tema ve birkaç aç/kapa. */
export function createSettingsPanel(
  root: HTMLElement,
  identity: { name: string; avatar: Avatar },
  onIdentity: (name: string, avatar: Avatar) => void,
) {
  const form = root.querySelector<HTMLFormElement>('#rename-form')!;
  const input = root.querySelector<HTMLInputElement>('#rename-input')!;
  const avatars = root.querySelector<HTMLElement>('#settings-avatars')!;
  const events = root.querySelector<HTMLInputElement>('#opt-events')!;
  const reactions = root.querySelector<HTMLInputElement>('#opt-reactions')!;
  let { name, avatar } = identity;

  input.value = name;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const next = cleanName(input.value);
    if (!next) return;
    name = next;
    input.value = next;
    onIdentity(name, avatar);
    // Kaydedildiğini göster.
    const button = form.querySelector<HTMLButtonElement>('button');
    if (button) {
      button.textContent = t('savedNote');
      setTimeout(() => (button.textContent = t('saveName')), 1500);
    }
  });

  // Küçük ızgara yerine: şu anki avatar büyük + "Avatarı değiştir" → ekranın ortasında büyük pencere.
  const drawAvatars = () => {
    const change = el('button', { type: 'button', class: 'btn' }, t('changeAvatar'));
    change.addEventListener('click', () =>
      openAvatarDialog(
        () => avatar,
        (option) => {
          avatar = option;
          onIdentity(name, avatar);
          drawAvatars();
        },
      ),
    );
    avatars.replaceChildren(avatarNode(avatar, 'avatar-big'), change);
  };
  drawAvatars();
  window.addEventListener('langchange', drawAvatars);
  renderThemeSetting(root.querySelector<HTMLElement>('#settings-themes')!);

  const options: Options = { showEvents: readOption('opt:events'), showReactions: readOption('opt:reactions') };
  events.checked = options.showEvents;
  reactions.checked = options.showReactions;
  events.addEventListener('change', () => {
    options.showEvents = events.checked;
    save('opt:events', events.checked ? '1' : '0');
  });
  reactions.addEventListener('change', () => {
    options.showReactions = reactions.checked;
    save('opt:reactions', reactions.checked ? '1' : '0');
  });

  return {
    options,
    /** Başka yerden (eklentiden) gelen isim/avatarı uygular ve odaya bildirir. */
    setIdentity(nextName: string, nextAvatar: Avatar): void {
      name = nextName;
      avatar = nextAvatar;
      input.value = name;
      drawAvatars();
      onIdentity(name, avatar);
    },
  };
}
