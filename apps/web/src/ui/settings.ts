import { cleanName, type Avatar } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { avatarNode, openAvatarDialog } from './avatar.ts';
import { t } from '../i18n.ts';
import { renderThemeSetting } from '../themes.ts';
import { load, save } from '../storage.ts';
import { previewSound, setSoundVolume, setSoundsOn, soundVolume, soundsOn } from '../sound.ts';

export interface Options {
  /** Emojiler videonun üstünde uçuşsun mu? */
  showReactions: boolean;
  /** Başkası durdurunca/sarınca videonun üstünde kısa not ("Ali durdurdu"). */
  actionNotice: boolean;
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
  const reactions = root.querySelector<HTMLInputElement>('#opt-reactions')!;
  const notice = root.querySelector<HTMLInputElement>('#opt-actionnotice')!;
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

  const options: Options = { showReactions: readOption('opt:reactions'), actionNotice: readOption('opt:actionNotice') };
  reactions.checked = options.showReactions;
  reactions.addEventListener('change', () => {
    options.showReactions = reactions.checked;
    save('opt:reactions', reactions.checked ? '1' : '0');
  });
  notice.checked = options.actionNotice;
  notice.addEventListener('change', () => {
    options.actionNotice = notice.checked;
    save('opt:actionNotice', notice.checked ? '1' : '0');
  });

  // Phones (0.9.91.2): turning the phone sideways while a video plays opens our fullscreen (on by default).
  const rotate = root.querySelector<HTMLInputElement>('#opt-rotatefs');
  if (rotate) {
    rotate.checked = load('opt:rotateFs') !== '0';
    rotate.addEventListener('change', () => save('opt:rotateFs', rotate.checked ? '1' : '0'));
  }

  // Sound effects: on/off and volume (the slider plays a sample when let go).
  const sounds = root.querySelector<HTMLInputElement>('#opt-sounds')!;
  const volume = root.querySelector<HTMLInputElement>('#opt-soundvolume')!;
  const volumeText = root.querySelector<HTMLOutputElement>('#opt-soundvolume-val')!;
  const drawSound = () => {
    sounds.checked = soundsOn();
    volume.value = String(soundVolume());
    volume.disabled = !sounds.checked;
    volumeText.textContent = `${volume.value}%`;
  };
  drawSound();
  sounds.addEventListener('change', () => {
    setSoundsOn(sounds.checked);
    drawSound();
    if (sounds.checked) previewSound();
  });
  volume.addEventListener('input', () => {
    setSoundVolume(Number(volume.value));
    volumeText.textContent = `${volume.value}%`;
  });
  volume.addEventListener('change', previewSound);

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
