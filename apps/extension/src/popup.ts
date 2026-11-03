// Eklenti simgesine tıklanınca açılan küçük pencere. Ayar yok: eklentinin tek işi, odada açılan
// film sayfasının üstüne sitenin oda görünümünü getirmek. Burada sadece kısa bilgi ve tek düğme var:
// odadaki bir film sekmesindeysek odayı ayrı sekmede aç, değilse "Sidelit'i aç".

import { SITE_URL } from './config.ts';
import { langReady, t } from './i18n.ts';
import { SESSIONS_KEY } from './messages.ts';

const text = document.querySelector<HTMLElement>('#text')!;
const action = document.querySelector<HTMLButtonElement>('#action')!;
const action2 = document.querySelector<HTMLButtonElement>('#action2')!;
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
    // Opens the room's page next to the film tab instead of navigating the film tab away (that left the film
    // and broke the room for this person). If the room is already open in another tab, switch to it.
    action.addEventListener('click', () => {
      void openRoomTab(shell.roomId, tab).finally(() => window.close());
    });
    return;
  }
  // Not on a film tab of a room. If a room is open in another tab, the main button goes back to it (owner's feedback,
  // 0.9.89: the button only ever opened the home page in a new tab, even while a room was open).
  const roomTabs = onSite ? [] : await chrome.tabs.query({ url: `${SITE_URL}/r/*` }).catch(() => [] as chrome.tabs.Tab[]);
  const roomTab = roomTabs.find((t) => t.id !== undefined);
  const openHome = () => {
    void chrome.tabs.create({ url: SITE_URL });
    window.close();
  };
  if (roomTab?.id !== undefined) {
    text.textContent = t('popupRoomOpen');
    action.textContent = t('popupToRoom');
    action.addEventListener('click', () => {
      void switchTo(roomTab).finally(() => window.close());
    });
    action2.textContent = t('popupOpen');
    action2.hidden = false;
    action2.addEventListener('click', openHome);
    return;
  }
  text.textContent = onSite ? t('popupSite') : t('popupIntro');
  action.textContent = t('popupOpen');
  action.hidden = onSite;
  action.addEventListener('click', openHome);
}

async function switchTo(tab: chrome.tabs.Tab): Promise<void> {
  if (tab.id === undefined) return;
  await chrome.tabs.update(tab.id, { active: true });
  if (tab.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true });
}

async function openRoomTab(roomId: string, filmTab: chrome.tabs.Tab): Promise<void> {
  const roomUrl = `${SITE_URL}/r/${roomId}`;
  const open = await chrome.tabs.query({ url: `${roomUrl}*` }).catch(() => [] as chrome.tabs.Tab[]);
  const existing = open.find((t) => t.id !== undefined && t.id !== filmTab.id);
  if (existing?.id !== undefined) {
    await switchTo(existing);
    return;
  }
  await chrome.tabs.create({ url: `${roomUrl}#back`, index: (filmTab.index ?? 0) + 1, windowId: filmTab.windowId });
}

void main();
