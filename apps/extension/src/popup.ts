// Eklenti simgesine tıklanınca açılan pencere. Bütün işi arka plan yapar;
// burası sadece durumu gösterir ve istekleri iletir.

import { AVATARS, REACTIONS, randomAvatar, type Avatar } from '@swm/shared/protocol';
import { isKey, langReady, t } from './i18n.ts';
import type { PopupRequest, PopupResponse, PopupStatus } from './messages.ts';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

// Statik metinler (önce sitede seçilen dili oku)
await langReady;
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
  $('#diag').textContent = t('diag', { frames: session.frames, video: session.bestVideo ?? '–' });

  $('#members-title').textContent = t('members', { n: session.members.length });
  $('#members').replaceChildren(
    ...session.members.map((member) => {
      const li = document.createElement('li');
      const name = member.avatar ? `${member.avatar} ${member.name}` : member.name;
      li.textContent = member.id === session.myId ? `${name} (${t('you')})` : name;
      if (member.id === session.myId) li.className = 'me';
      return li;
    }),
  );
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

$('#create').addEventListener('click', async () => {
  await request({ type: 'create', tabId });
  await refresh();
});

$('#join-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  await request({ type: 'join', tabId, input: $<HTMLInputElement>('#join-input').value });
  await refresh();
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

for (const emoji of REACTIONS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = emoji;
  button.addEventListener('click', () => void request({ type: 'react', tabId, emoji }));
  $('#reactions').append(button);
}

$('#chat-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $<HTMLInputElement>('#chat-input');
  if (!input.value.trim()) return;
  await request({ type: 'chat', tabId, text: input.value });
  input.value = '';
});

await refresh();
setInterval(refresh, 1000);
