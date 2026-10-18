// Eklenti simgesine tıklanınca açılan pencere. Bütün işi arka plan yapar;
// burası sadece durumu gösterir ve istekleri iletir.

import { AVATARS, REACTION_PAGES, randomAvatar, type Avatar } from '@swm/shared/protocol';
import { SITE_URL } from './config.ts';
import { isKey, langReady, t } from './i18n.ts';
import type { PopupRequest, PopupResponse, PopupStatus } from './messages.ts';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

// Statik metinler (önce sitede seçilen dili oku)
await langReady;
document.documentElement.lang = t('you') === 'sen' ? 'tr' : 'en';
for (const el of document.querySelectorAll<HTMLElement>('[data-t]')) {
  const key = el.dataset.t!;
  if (isKey(key)) el.textContent = t(key);
}
for (const el of document.querySelectorAll<HTMLInputElement>('[data-t-placeholder]')) {
  const key = el.dataset.tPlaceholder!;
  if (isKey(key)) el.placeholder = t(key);
}

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const tabId = tab?.id ?? -1;
let editingName = false;
let last: PopupStatus | null = null;

async function request(message: PopupRequest): Promise<PopupResponse> {
  const response = (await chrome.runtime.sendMessage(message)) as PopupResponse;
  const error = $('#error');
  if (!response.ok) {
    const key = `error.${response.error}`;
    error.textContent = isKey(key) ? t(key) : response.error;
    error.hidden = false;
  } else {
    error.hidden = true;
  }
  return response;
}

async function refresh(): Promise<void> {
  const response = await chrome.runtime.sendMessage({ type: 'status', tabId } satisfies PopupRequest) as PopupResponse;
  if (response.ok && response.status) render(response.status);
}

let avatar: Avatar | null = null;

function renderPicker(): void {
  $('#avatar-picker').replaceChildren(
    ...AVATARS.map((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = option;
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', String(option === avatar));
      button.addEventListener('click', () => {
        avatar = option;
        renderPicker();
      });
      return button;
    }),
  );
}

function render(status: PopupStatus): void {
  last = status;
  // ScreenWithMe sitesinin kendisindeyken eklentiye gerek yok: sadece kısa bir not.
  const onSite = !!status.tabUrl && status.tabUrl.startsWith(SITE_URL);
  $('#site-view').hidden = !onSite;
  if (onSite) {
    for (const id of ['#name-view', '#me-view', '#idle-view', '#room-view', '#status', '#error', '#ended']) $(id).hidden = true;
    return;
  }
  const needName = !status.name || editingName;
  $('#name-view').hidden = !needName;
  $('#me-view').hidden = needName;
  $('#me-name').textContent = status.avatar ? `${status.avatar} ${status.name ?? ''}` : (status.name ?? '');
  if (needName && document.activeElement !== $('#name')) $<HTMLInputElement>('#name').value = status.name ?? '';
  if (avatar === null) {
    avatar = status.avatar ?? randomAvatar();
    renderPicker();
  }

  const session = status.session;
  // Oda az önce kapandıysa nedenini söyle (çıkarıldın / güncelle / oda dolu).
  const ended = $('#ended');
  ended.hidden = status.ended === null;
  if (status.ended) ended.textContent = t(status.ended === 'kicked' ? 'endedKicked' : status.ended === 'version' ? 'endedVersion' : 'endedFull');
  $('#idle-view').hidden = needName || session !== null;
  $('#room-view').hidden = needName || session === null;

  const statusEl = $('#status');
  statusEl.hidden = session === null;
  if (!session) return;

  statusEl.dataset.status = session.connection;
  statusEl.textContent = t(`status.${session.connection}`);
  const invite = $<HTMLInputElement>('#invite');
  if (invite.value !== session.inviteUrl) invite.value = session.inviteUrl;

  $('#item-title').textContent = session.item ? (session.item.title ?? session.item.id) : t('nothingPlaying');
  $('#page-warning').hidden = session.onRoomPage;
  $('#video-state').textContent = session.onRoomPage && session.item ? t(session.hasVideo ? 'videoFound' : 'noVideo') : '';
  // Hiç çerçeve bağlı değilse eklenti bu sekmeye sonradan kurulmuştur: yenilemek gerekir.
  $('#reload-box').hidden = !(session.onRoomPage && session.frames === 0);
  // Tanı satırı sadece video bulunamadığında (kullanıcı bize iletebilsin), kapalı kutuda.
  $('#diag-box').hidden = session.hasVideo || !session.onRoomPage;
  $('#diag').textContent = t('diag', { frames: session.frames, video: session.bestVideo ?? '–' });

  // Odadakiler: yönetici 👑; yöneticiysem başkalarının yanında "çıkar" butonu.
  const iAmHost = session.myId !== null && session.myId === session.hostId;
  $('#members-title').textContent = t('members', { n: session.members.length });
  $('#members').replaceChildren(
    ...session.members.map((member) => {
      const li = document.createElement('li');
      const isMe = member.id === session.myId;
      const name = (member.avatar ? `${member.avatar} ${member.name}` : member.name) + (member.id === session.hostId ? ' 👑' : '');
      const label = document.createElement('span');
      label.textContent = isMe ? `${name} (${t('you')})` : name;
      li.append(label);
      if (isMe) li.className = 'me';
      if (iAmHost && !isMe) {
        li.append(smallButton('✕', t('kick'), () => {
          if (confirm(t('kickConfirm', { name: member.name }))) void request({ type: 'kick', tabId, memberId: member.id });
        }));
      }
      return li;
    }),
  );

  // Çıkarılanlar (sadece yöneticiye gelir).
  $('#bans-card').hidden = session.bans.length === 0;
  $('#bans').replaceChildren(
    ...session.bans.map((ban) => {
      const li = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = ban.avatar ? `${ban.avatar} ${ban.name}` : ban.name;
      li.append(label, smallButton(t('unban'), t('unban'), () => void request({ type: 'unban', tabId, banId: ban.id })));
      return li;
    }),
  );
}

function smallButton(text: string, title: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mini';
  button.textContent = text;
  button.title = title;
  button.addEventListener('click', onClick);
  return button;
}

// ---- Olaylar ----

$('#name-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const response = await request({ type: 'set-name', name: $<HTMLInputElement>('#name').value, avatar: avatar ?? randomAvatar() });
  if (response.ok) editingName = false;
  await refresh();
});

$('#edit-name').addEventListener('click', () => {
  editingName = true;
  if (last) render(last);
  $<HTMLInputElement>('#name').focus();
});

/** İstek sürerken butonu kapat (çift tıklama iki oda kurmasın). */
async function busy(button: HTMLButtonElement, work: () => Promise<unknown>): Promise<void> {
  if (button.disabled) return;
  button.disabled = true;
  try {
    await work();
  } finally {
    button.disabled = false;
  }
}

$('#create').addEventListener('click', () =>
  busy($<HTMLButtonElement>('#create'), async () => {
    await request({ type: 'create', tabId });
    await refresh();
  }),
);
$('#reload').addEventListener('click', () => void request({ type: 'reload', tabId }));

$('#join-form').addEventListener('submit', (event) => {
  event.preventDefault();
  void busy($<HTMLButtonElement>('#join-form button'), async () => {
    await request({ type: 'join', tabId, input: $<HTMLInputElement>('#join-input').value });
    await refresh();
  });
});

$('#copy').addEventListener('click', async () => {
  const invite = $<HTMLInputElement>('#invite');
  await navigator.clipboard.writeText(invite.value).catch(() => invite.select());
  $('#copy').textContent = t('copied');
  setTimeout(() => ($('#copy').textContent = t('copy')), 1500);
});

$('#go-room-page').addEventListener('click', () => void request({ type: 'go-to-room-page', tabId }));
$('#share-page').addEventListener('click', () => void request({ type: 'share-this-page', tabId }));
$('#leave').addEventListener('click', async () => {
  await request({ type: 'leave', tabId });
  await refresh();
});

// Emojiler sekizli sayfalar halinde; ▲▼ ile diğerleri.
let reactionPage = 0;
function renderReactions(): void {
  const buttons = REACTION_PAGES[reactionPage]!.map((emoji) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = emoji;
    button.addEventListener('click', () => void request({ type: 'react', tabId, emoji }));
    return button;
  });
  const pager = document.createElement('span');
  pager.className = 'pager';
  for (const [arrow, step] of [['▲', -1], ['▼', 1]] as const) {
    const b = smallButton(arrow, t('moreReactions'), () => {
      reactionPage = (reactionPage + step + REACTION_PAGES.length) % REACTION_PAGES.length;
      renderReactions();
    });
    pager.append(b);
  }
  $('#reactions').replaceChildren(...buttons, pager);
}
renderReactions();

$('#chat-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $<HTMLInputElement>('#chat-input');
  if (!input.value.trim()) return;
  await request({ type: 'chat', tabId, text: input.value });
  input.value = '';
});

await refresh();
setInterval(refresh, 1000);
