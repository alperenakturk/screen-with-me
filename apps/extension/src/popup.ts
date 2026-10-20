// Eklenti simgesine tıklanınca açılan küçük pencere. Ayar yok: eklentinin tek işi, odada açılan
// film sayfasının üstüne sitenin oda görünümünü getirmek. Burada sadece kısa bilgi ve tek düğme var:
// odadaki bir film sekmesindeysek "Odaya dön", değilse "ScreenWithMe'yi aç".

import { SITE_URL } from './config.ts';
import { langReady, t } from './i18n.ts';
import { SESSIONS_KEY } from './messages.ts';

const text = document.querySelector<HTMLElement>('#text')!;
const action = document.querySelector<HTMLButtonElement>('#action')!;
document.querySelector('#version')!.textContent = `v${chrome.runtime.getManifest().version}`;

async function main(): Promise<void> {
  await langReady;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const { [SESSIONS_KEY]: saved } = await chrome.storage.session.get(SESSIONS_KEY).catch(() => ({}) as Record<string, unknown>);
  const shell = Array.isArray(saved) ? (saved as { tabId: number; roomId: string }[]).find((s) => s.tabId === tab?.id) : undefined;
  const onSite = !!tab?.url?.startsWith(SITE_URL);

  if (shell && tab?.id !== undefined) {
    text.textContent = t('popupInRoom');
    action.textContent = t('popupBack');
    action.addEventListener('click', () => {
      void chrome.tabs.update(tab.id!, { url: `${SITE_URL}/r/${shell.roomId}#back` });
      window.close();
    });
    return;
  }
  text.textContent = onSite ? t('popupSite') : t('popupIntro');
  action.textContent = t('popupOpen');
  action.hidden = onSite;
  action.addEventListener('click', () => {
    void chrome.tabs.create({ url: SITE_URL });
    window.close();
  });
}

void main();
