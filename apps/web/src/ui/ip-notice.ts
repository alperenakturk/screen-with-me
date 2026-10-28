import { el } from '../dom.ts';
import { t, type I18nKey } from '../i18n.ts';
import { load, save } from '../storage.ts';
import { confirmDialog } from './confirm.ts';

/**
 * Peer-to-peer voice, camera and streams reveal each person's public IP address to the others in the same call
 * (security review 1, W1). Before someone joins voice, starts a stream or watches one, we say so plainly, list who
 * would see it, and ask. "Don't show this again" is remembered per action in this browser (`opt:ipNotice:<kind>`).
 * Cloudflare's media server (SFU) hides IPs; the caller skips the notice in that mode.
 */
export type IpNoticeKind = 'voice' | 'stream' | 'watch';

const TEXTS: Record<IpNoticeKind, { title: I18nKey; text: I18nKey; yes: I18nKey }> = {
  voice: { title: 'ipNotice.voiceTitle', text: 'ipNotice.voice', yes: 'ipNotice.voiceYes' },
  stream: { title: 'ipNotice.streamTitle', text: 'ipNotice.stream', yes: 'ipNotice.streamYes' },
  watch: { title: 'ipNotice.watchTitle', text: 'ipNotice.watch', yes: 'ipNotice.watchYes' },
};

/**
 * Resolves true when the person agrees (or chose earlier not to be asked again). `people`: names of whoever would see
 * the address right now (in voice / the streamer / no one yet).
 */
export async function confirmIpNotice(kind: IpNoticeKind, people: string[]): Promise<boolean> {
  const key = `opt:ipNotice:${kind}`;
  if (load(key) === '1') return true;
  const texts = TEXTS[kind];
  const again = el('input', { type: 'checkbox' }) as HTMLInputElement;
  const who =
    kind === 'voice'
      ? el('p', { class: 'ip-notice-who small' }, people.length ? t('ipNotice.inVoice', { names: people.join(', ') }) : t('ipNotice.nobody'))
      : null;
  const extra = el(
    'div',
    { class: 'ip-notice' },
    who,
    el('p', { class: 'muted small' }, t('ipNotice.advice')),
    el('label', { class: 'ip-notice-again small' }, again, el('span', {}, t('ipNotice.again'))),
  );
  const yes = await confirmDialog({ icon: '🔒', title: t(texts.title), text: t(texts.text), yes: t(texts.yes), extra });
  if (yes && again.checked) save(key, '1');
  return yes;
}
