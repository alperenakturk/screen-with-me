// Eklenti simgesine tıklanınca açılan pencere. Bütün işi arka plan yapar;
// burası sadece durumu gösterir ve istekleri iletir.

import { AVATAR_PAGES, AVATAR_TABS, AVATARS_PER_VIEW, REACTION_PAGES, avatarPageOf, avatarText, isDrawnAvatar, randomAvatar, type Avatar } from '@swm/shared/protocol';
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

/** Avatarın görsel hali: çizilmiş avatar eklentinin içindeki resim, hayvan emoji. */
function avatarGlyph(option: string): HTMLElement {
  const span = document.createElement('span');
  if (isDrawnAvatar(option)) {
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL(`avatars/${option}.svg`);
    img.alt = '';
    span.className = 'drawn';
    span.append(img);
  } else {
    span.textContent = option;
  }
  return span;
}

// Avatar sayfaları: Temalı / Hayvanlar / Parodi (altında Film / Dizi / Anime)
let avatarPage = 0;
/** 20'den fazla avatarı olan sekmede görünüm (‹ ›). */
let avatarView = 0;
const TAB_KEYS = { theme: 'avatarPageTheme', animals: 'avatarPageAnimals', parody: 'avatarPageParody' } as const;
const SUB_KEYS = { film: 'avatarPageFilm', series: 'avatarPageSeries', anime: 'avatarPageAnime' } as const;

function tabRow(items: Array<{ label: string; selected: boolean; go: () => void }>, sub = false): HTMLElement {
  const row = document.createElement('div');
  row.className = sub ? 'avatar-tabs sub' : 'avatar-tabs';
  for (const item of items) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'avatar-tab';
    tab.textContent = item.label;
    tab.setAttribute('aria-selected', String(item.selected));
    tab.addEventListener('click', () => {
      item.go();
      renderPicker();
    });
    row.append(tab);
  }
  return row;
}

function renderPicker(): void {
  const active = AVATAR_TABS.find((tab) => (tab.pages as readonly number[]).includes(avatarPage)) ?? AVATAR_TABS[0];
  const rows = [
    tabRow(AVATAR_TABS.map((tab) => ({
      label: t(TAB_KEYS[tab.key]),
      selected: tab === active,
      go: () => {
        if (tab !== active) {
          avatarPage = tab.pages[0];
          avatarView = 0;
        }
      },
    }))),
  ];
  if ('subs' in active) {
    rows.push(tabRow(active.subs.map((sub, i) => ({
      label: t(SUB_KEYS[sub]),
      selected: active.pages[i] === avatarPage,
      go: () => {
        avatarPage = active.pages[i]!;
        avatarView = 0;
      },
    })), true));
  }
  const grid = document.createElement('div');
  grid.className = 'avatar-grid';
  grid.append(
    ...AVATAR_PAGES[avatarPage]!.slice(avatarView * AVATARS_PER_VIEW, (avatarView + 1) * AVATARS_PER_VIEW).map((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.append(avatarGlyph(option));
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', String(option === avatar));
      button.addEventListener('click', () => {
        avatar = option;
        renderPicker();
      });
      return button;
    }),
  );
  const views = Math.ceil(AVATAR_PAGES[avatarPage]!.length / AVATARS_PER_VIEW);
  if (views > 1) {
    const pager = document.createElement('div');
    pager.className = 'avatar-tabs sub';
    const step = (d: number) => {
      avatarView = (avatarView + d + views) % views;
      renderPicker();
    };
    for (const [text, d] of [['‹', -1], [`${avatarView + 1} / ${views}`, 0], ['›', 1]] as const) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'avatar-tab';
      b.textContent = text;
      if (d) b.addEventListener('click', () => step(d));
      else b.disabled = true;
      pager.append(b);
    }
    $('#avatar-picker').replaceChildren(...rows, grid, pager);
    return;
  }
  $('#avatar-picker').replaceChildren(...rows, grid);
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
  $('#me-name').replaceChildren(...(status.avatar ? [avatarGlyph(status.avatar), ' '] : []), status.name ?? '');
  if (needName && document.activeElement !== $('#name')) $<HTMLInputElement>('#name').value = status.name ?? '';
  if (avatar === null) {
    avatar = status.avatar ?? randomAvatar();
    // Seçili avatarın sayfasıyla aç
    avatarPage = avatarPageOf(avatar);
    avatarView = Math.max(0, Math.floor((AVATAR_PAGES[avatarPage] as readonly string[]).indexOf(avatar) / AVATARS_PER_VIEW));
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
      const name = (member.avatar ? `${avatarText(member.avatar)} ${member.name}` : member.name) + (member.id === session.hostId ? ' 👑' : '');
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
      label.textContent = ban.avatar ? `${avatarText(ban.avatar)} ${ban.name}` : ban.name;
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
// Odaya dön: yanlışlıkla basılmasın diye ilk basışta "Emin misin?" der, 3 sn içinde ikinci basış gider.
let goRoomArmed = 0;
$('#go-room').addEventListener('click', () => {
  const button = $('#go-room');
  if (Date.now() - goRoomArmed > 3000) {
    goRoomArmed = Date.now();
    button.textContent = t('backToRoomSure');
    setTimeout(() => {
      if (Date.now() - goRoomArmed >= 3000) button.textContent = t('backToRoomShort');
    }, 3000);
    return;
  }
  void request({ type: 'go-room', tabId }).then(() => window.close());
});
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
