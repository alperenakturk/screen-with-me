import { REACTION_PAGES, stickerId, type ClientMessage, type Member, type Sticker } from '@swm/shared/protocol';
import { fileToSticker } from '@swm/shared/sticker-file';
import { el } from '../dom.ts';
import { t, type I18nKey } from '../i18n.ts';
import { load, save } from '../storage.ts';
import { avatarNode } from './avatar.ts';

/** Ekranda aynı anda en fazla bu kadar uçuşan tepki. */
const MAX_FLOATS = 12;
/** Uçuşma süresi (CSS r-float ile aynı); animasyon olayı gelmezse bu sürede silinir. */
const FLOAT_MS = 3000;
/** Kendi özel emojilerim (tarayıcıda saklanır, girdiğim her odaya yüklenir). */
const MY_STICKERS_KEY = 'myStickers';
/** Aralık serbestken bile iki emoji arası en az bu kadar (ms). */
const MIN_GAP_MS = 150;
const MAX_MY_STICKERS = 12;
/** Video altındaki tepsinin yanında hep duran son kullanılanlar. */
const RECENT_KEY = 'recentReactions';
const RECENT_COUNT = 3;

type Item = { emoji: string } | { sticker: string } | { add: true };

/**
 * Tepkiler. Üç emoji sayfası + özel emoji (GIF/resim) sayfaları; 1–8 tuşları o sayfanın öğeleri. Video altında
 * (`.tray-bar`) "😀 Tepki" düğmesi sayfaları tepside açar, yanında son kullanılan üçü hep durur; tam ekranda ve
 * Shorts'ta düz çubuk (8 yuva + ▲▼). Gelen tepkiler videonun altından yükselip kaybolur (altında küçük avatar + isim);
 * art arda basılan her tepki ayrı uçar.
 */
/** Emoji çubuğunda her sayfada kaç yuva var (1–8 tuşları). */
const SLOTS = 8;

export function createReactions(
  root: HTMLElement,
  send: (message: ClientMessage) => void,
  canManage: () => boolean = () => false,
  /** Yönetici emojileri kapattıysa false (tuşlar da çalışmaz). */
  enabled: () => boolean = () => true,
  /** Yöneticinin koyduğu iki emoji arası en kısa süre (ms; 0 serbest: art arda basılabilir). */
  gap: () => number = () => 0,
) {
  // Biri video altında, biri tam ekran kontrollerinde olmak üzere birden fazla emoji çubuğu olabilir.
  const bars = root.querySelectorAll<HTMLElement>('.reaction-bar');
  const layer = root.querySelector<HTMLElement>('#reactions-layer')!;
  const stickers = new Map<string, string>();
  /** Benim eklediğim özel emojilerin kimlikleri (✕ ile kaldırabilirim). */
  const mine = new Set<string>();
  let page = 0;
  let coolUntil = 0;
  let trayOpen = false;
  let recent = readRecent();
  const fileInput = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', hidden: '' }) as HTMLInputElement;
  root.append(fileInput);

  /** Üç emoji sayfası, sonra (varsa) 8'erli özel emoji sayfaları. Ekleme 🖼️ düğmesiyle. */
  function pages(): Item[][] {
    const list: Item[][] = REACTION_PAGES.map((p) => p.map((emoji) => ({ emoji })));
    const ids = [...stickers.keys()];
    for (let i = 0; i < ids.length; i += SLOTS) list.push(ids.slice(i, i + SLOTS).map((sticker) => ({ sticker })));
    return list;
  }

  function turn(step: number): void {
    const count = pages().length;
    page = (page + step + count) % count;
    draw();
  }

  function fire(item: Item): void {
    if (!enabled()) return;
    if ('add' in item) {
      fileInput.click();
      return;
    }
    if (Date.now() < coolUntil) return;
    send('emoji' in item ? { t: 'react', emoji: item.emoji as never } : { t: 'react', sticker: item.sticker });
    remember(item);
    // Serbestken de art arda iki basış arası en az 150 ms (insan eli zaten bundan hızlı basamaz; otomatik
    // tekrar ya da takılan tuş sunucuyu boğmasın).
    const wait = gap();
    coolUntil = Date.now() + Math.max(MIN_GAP_MS, wait);
    if (wait <= 0) return;
    for (const bar of bars) {
      bar.classList.add('cooling');
      setTimeout(() => bar.classList.remove('cooling'), wait);
    }
  }

  /** Son kullanılanların başına alır (tepsinin yanındaki üç düğme); özel emoji odada yoksa gösterilmez. */
  function remember(item: { emoji: string } | { sticker: string }): void {
    const key = 'emoji' in item ? item.emoji : `s:${item.sticker}`;
    const next = [key, ...recent.filter((k) => k !== key)].slice(0, 8);
    if (next.join() === recent.join()) return;
    recent = next;
    save(RECENT_KEY, JSON.stringify(recent));
    drawRecent();
  }

  function recentItems(): ({ emoji: string } | { sticker: string })[] {
    const items = recent
      .map((key) => (key.startsWith('s:') ? (stickers.has(key.slice(2)) ? { sticker: key.slice(2) } : null) : { emoji: key }))
      .filter((x): x is { emoji: string } | { sticker: string } => x !== null);
    for (const emoji of REACTION_PAGES[0]) if (!items.some((i) => 'emoji' in i && i.emoji === emoji)) items.push({ emoji });
    return items.slice(0, RECENT_COUNT);
  }

  function itemButton(item: { emoji: string } | { sticker: string }, title: string): HTMLButtonElement {
    const content = 'emoji' in item ? item.emoji : el('img', { src: stickers.get(item.sticker) ?? '', alt: '' });
    const button = el('button', { type: 'button', class: 'reaction-btn', title, 'aria-label': title }, content);
    button.addEventListener('click', () => fire(item));
    return button;
  }

  function drawRecent(): void {
    for (const row of root.querySelectorAll<HTMLElement>('.react-recent')) {
      row.replaceChildren(...recentItems().map((item) => itemButton(item, t('react'))));
    }
  }

  function setTray(open: boolean): void {
    trayOpen = open;
    for (const tray of root.querySelectorAll<HTMLElement>('.react-tray')) tray.hidden = !open;
    for (const button of root.querySelectorAll<HTMLElement>('.react-open')) button.setAttribute('aria-expanded', String(open));
  }

  function draw(): void {
    const all = pages();
    if (page >= all.length) page = 0;
    for (const bar of bars) {
      if (bar.classList.contains('tray-bar')) {
        drawTrayBar(bar, all);
        continue;
      }
      const buttons: HTMLElement[] = all[page]!.map((item, i) => {
        if ('add' in item) return el('span', { class: 'reaction-slot' });
        const title = `${t('react')} (${i + 1})`;
        const content = 'emoji' in item ? item.emoji : el('img', { src: stickers.get(item.sticker) ?? '', alt: '' });
        const button = el('button', { type: 'button', class: 'reaction-btn', title, 'aria-label': title }, content);
        button.addEventListener('click', () => fire(item));
        if (!('sticker' in item) || !(mine.has(item.sticker) || canManage())) return button;
        // Kendi eklediğim (ya da yöneticiysem herhangi bir) özel emoji: üstüne gelince ✕.
        const remove = el('button', { type: 'button', class: 'sticker-x', title: t('stickerRemove'), 'aria-label': t('stickerRemove') }, '✕');
        remove.addEventListener('click', () => removeSticker(item.sticker));
        return el('span', { class: 'sticker-wrap' }, button, remove);
      });
      const up = el('button', { type: 'button', class: 'reaction-page', title: t('moreReactions'), 'aria-label': t('moreReactions') }, '▲');
      const down = el('button', { type: 'button', class: 'reaction-page', title: t('moreReactions'), 'aria-label': t('moreReactions') }, '▼');
      up.addEventListener('click', () => turn(-1));
      down.addEventListener('click', () => turn(1));
      // Yerler sabit: sayfada 8'den az şey varsa kalan yuvalar boş durur (yanındaki düğmeler kaymasın).
      while (buttons.length < SLOTS) buttons.push(el('span', { class: 'reaction-slot' }));
      // 🖼️: GIF / fotoğraf ekle (özel emoji sayfalarına ▲▼ ile gidilir).
      const add = el('button', { type: 'button', class: 'reaction-btn sticker-open', title: t('stickerAdd'), 'aria-label': t('stickerAdd') }, '🖼️');
      add.addEventListener('click', () => fire({ add: true }));
      bar.replaceChildren(...buttons, el('span', { class: 'reaction-pager' }, up, down), add);
    }
  }

  /** Video altı: "😀 Tepki" + tepsi (sayfanın 8 yuvası, Hazır/Benimkiler, ‹ 1/3 ›, 🖼️) + son kullanılan üçü. */
  function drawTrayBar(bar: HTMLElement, all: Item[][]): void {
    const slots: HTMLElement[] = all[page]!.map((item, i) => {
      if ('add' in item) return el('span', { class: 'reaction-slot' });
      const button = itemButton(item, `${t('react')} (${i + 1})`);
      if (!('sticker' in item) || !(mine.has(item.sticker) || canManage())) return button;
      const remove = el('button', { type: 'button', class: 'sticker-x', title: t('stickerRemove'), 'aria-label': t('stickerRemove') }, '✕');
      remove.addEventListener('click', () => removeSticker(item.sticker));
      return el('span', { class: 'sticker-wrap' }, button, remove);
    });
    while (slots.length < SLOTS) slots.push(el('span', { class: 'reaction-slot' }));
    const ownFirst = REACTION_PAGES.length;
    const kind = (label: string, target: number, on: boolean) => {
      const chip = el('button', { type: 'button', class: on ? 'tray-chip on' : 'tray-chip', 'aria-pressed': String(on) }, label);
      chip.addEventListener('click', () => {
        // "Benimkiler" boşsa doğrudan dosya seçilir.
        if (target >= all.length) fire({ add: true });
        else {
          page = target;
          draw();
        }
      });
      return chip;
    };
    const prev = el('button', { type: 'button', class: 'tray-page', title: t('moreReactions'), 'aria-label': t('moreReactions') }, '‹');
    const next = el('button', { type: 'button', class: 'tray-page', title: t('moreReactions'), 'aria-label': t('moreReactions') }, '›');
    prev.addEventListener('click', () => turn(-1));
    next.addEventListener('click', () => turn(1));
    const add = el('button', { type: 'button', class: 'tray-add', title: t('stickerAdd'), 'aria-label': t('stickerAdd') }, '🖼️ ', t('reactTray.add'));
    add.addEventListener('click', () => fire({ add: true }));
    const tray = el(
      'div',
      { class: 'react-tray', role: 'group', 'aria-label': t('reactTray'), 'data-island': '' },
      el('div', { class: 'tray-head' }, kind(t('reactTray.ready'), 0, page < ownFirst), kind(t('reactTray.mine'), ownFirst, page >= ownFirst)),
      el('div', { class: 'tray-grid' }, ...slots),
      el('div', { class: 'tray-foot' }, prev, el('span', { class: 'tray-count' }, `${page + 1}/${all.length}`), next, el('span', { class: 'tray-gap' }), add),
    );
    tray.hidden = !trayOpen;
    tray.addEventListener('wheel', (event) => {
      event.preventDefault();
      turn(event.deltaY > 0 ? 1 : -1);
    }, { passive: false });
    const open = el(
      'button',
      { type: 'button', class: 'btn react-open', 'aria-haspopup': 'true', 'aria-expanded': String(trayOpen), title: t('reactTray.hint') },
      el('span', { 'aria-hidden': 'true' }, '😀'),
      el('span', { class: 'tool-label' }, t('reactTray')),
      el('span', { class: 'react-caret', 'aria-hidden': 'true' }, '▴'),
    );
    open.addEventListener('click', () => setTray(!trayOpen));
    bar.replaceChildren(el('div', { class: 'react-tray-wrap' }, tray, open), el('div', { class: 'react-recent' }));
    drawRecent();
  }

  // Tepsi dışarı tıklayınca ya da Esc ile kapanır (içinde basılan emojiler tepsiyi kapatmaz: art arda atılabilsin).
  document.addEventListener('pointerdown', (event) => {
    const target = event.target as Element | null;
    if (!trayOpen || !target || target.closest('.react-tray-wrap')) return;
    setTray(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && trayOpen) setTray(false);
  });

  /** Özel emojiyi odadan kaldır; kendi listemden de çıkar (bir sonraki odaya yüklenmesin). */
  async function removeSticker(id: string): Promise<void> {
    const keep: string[] = [];
    for (const data of myStickers()) if ((await stickerId(data)) !== id) keep.push(data);
    save(MY_STICKERS_KEY, JSON.stringify(keep));
    mine.delete(id);
    send({ t: 'sticker-remove', id });
  }

  for (const bar of bars) {
    if (bar.classList.contains('tray-bar')) continue;
    bar.addEventListener('wheel', (event) => {
      event.preventDefault();
      turn(event.deltaY > 0 ? 1 : -1);
    }, { passive: false });
  }
  draw();

  // Özel emoji ekle: dosyayı küçült (GIF olduğu gibi), sakla, odaya yolla.
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    try {
      const data = await fileToSticker(file);
      const kept = myStickers().filter((d) => d !== data);
      save(MY_STICKERS_KEY, JSON.stringify([...kept, data].slice(-MAX_MY_STICKERS)));
      mine.add(await stickerId(data));
      // Eklenen emojinin sayfası açılsın: nereye geldiği görünsün.
      page = REACTION_PAGES.length + Math.floor(stickers.size / SLOTS);
      send({ t: 'sticker-add', data });
    } catch (error) {
      const code = error instanceof Error && ['type', 'too_big'].includes(error.message) ? error.message : 'broken';
      alert(t(`stickerError.${code}` as I18nKey));
    }
  });

  // Klavye: 1–8 o anki sayfanın öğeleri (yazı yazarken değil). Tam ekranda ve normalde çalışır.
  document.addEventListener('keydown', (event) => {
    // Basılı tutulan tuşun otomatik tekrarı emoji yağdırmasın.
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
    const n = Number(event.key);
    if (!Number.isInteger(n) || n < 1 || n > 8) return;
    const item = pages()[page]?.[n - 1];
    if (!item || 'add' in item) return;
    event.preventDefault();
    fire(item);
  });

  /** Tepkinin görünümü: emoji ya da odadaki özel emojinin resmi (bilinmeyen özel emoji: null). */
  function content(emoji?: string, sticker?: string): HTMLElement | null {
    if (!sticker) return el('span', { class: 'r-emoji' }, emoji ?? '');
    const data = stickers.get(sticker);
    return data ? el('img', { class: 'r-sticker', src: data, alt: '' }) : null;
  }

  return {
    content,
    /** Gelen tepki: videonun altından rastgele bir yerden yükselir. */
    show(by: Member, emoji?: string, sticker?: string): void {
      // Her tepki ayrı uçar (art arda basınca "×2" olmaz, yağmur gibi yükselir).
      const shown = content(emoji, sticker);
      if (!shown) return;
      while (layer.childElementCount >= MAX_FLOATS) layer.firstElementChild?.remove();
      const who = el('span', { class: 'r-who' }, avatarNode(by.avatar, 'r-avatar'), el('span', { class: 'r-name' }, by.name));
      const float = el('div', { class: 'r-float' }, shown, who);
      float.style.left = `${6 + Math.random() * 78}%`;
      float.style.setProperty('--drift', `${Math.round((Math.random() - 0.5) * 70)}px`);
      float.addEventListener('animationend', (event) => {
        if (event.target === float) float.remove();
      });
      setTimeout(() => float.remove(), FLOAT_MS + 200);
      layer.append(float);
    },
    /** Odaya özel emoji eklendi (girişte de odadakiler tek tek gelir). */
    addSticker(sticker: Sticker): void {
      stickers.set(sticker.id, sticker.data);
      draw();
    },
    removeSticker(id: string): void {
      stickers.delete(id);
      draw();
    },
    /** Odaya girince: kendi özel emojilerimi bu odaya da yükle. */
    registerMine(): void {
      for (const data of myStickers()) {
        send({ t: 'sticker-add', data });
        void stickerId(data).then((id) => {
          mine.add(id);
          draw();
        });
      }
    },
    /** Yeni odaya bağlanınca (yeniden bağlanma) eski odanın özel emojileri temizlenir. */
    clearStickers(): void {
      stickers.clear();
      draw();
    },
    relabel(): void {
      draw();
    },
  };
}

function readRecent(): string[] {
  try {
    const list = JSON.parse(load(RECENT_KEY) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string').slice(0, 8) : [];
  } catch {
    return [];
  }
}

function myStickers(): string[] {
  try {
    const list = JSON.parse(load(MY_STICKERS_KEY) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Klavye kısayolları yazı alanlarında çalışmasın. */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
