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
/** Bir tepkiden sonra butonlar kısa süre bekler: art arda basıp ekranı doldurmasın. */
const COOLDOWN_MS = 1100;
/** Kendi özel emojilerim (tarayıcıda saklanır, girdiğim her odaya yüklenir). */
const MY_STICKERS_KEY = 'myStickers';
const MAX_MY_STICKERS = 12;

type Item = { emoji: string } | { sticker: string } | { add: true };

/**
 * Tepkiler. Alttaki çubuk: üç emoji sayfası + özel emoji (GIF/resim) sayfaları; ▲▼ ya da
 * tekerlek sayfa değiştirir, 1–8 tuşları o sayfanın öğeleri. Gelen tepkiler videonun altından
 * yükselip kaybolur (altında küçük avatar + isim); aynı kişinin hâlâ uçuşan aynı tepkisi yenisini
 * açmaz, "×2" olur.
 */
/** Emoji çubuğunda her sayfada kaç yuva var (1–8 tuşları). */
const SLOTS = 8;

export function createReactions(
  root: HTMLElement,
  send: (message: ClientMessage) => void,
  canManage: () => boolean = () => false,
  /** Yönetici emojileri kapattıysa false (tuşlar da çalışmaz). */
  enabled: () => boolean = () => true,
) {
  // Biri video altında, biri tam ekran kontrollerinde olmak üzere birden fazla emoji çubuğu olabilir.
  const bars = root.querySelectorAll<HTMLElement>('.reaction-bar');
  const layer = root.querySelector<HTMLElement>('#reactions-layer')!;
  const stickers = new Map<string, string>();
  /** Benim eklediğim özel emojilerin kimlikleri (✕ ile kaldırabilirim). */
  const mine = new Set<string>();
  let page = 0;
  let coolUntil = 0;
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
    coolUntil = Date.now() + COOLDOWN_MS;
    send('emoji' in item ? { t: 'react', emoji: item.emoji as never } : { t: 'react', sticker: item.sticker });
    for (const bar of bars) {
      bar.classList.add('cooling');
      setTimeout(() => bar.classList.remove('cooling'), COOLDOWN_MS);
    }
  }

  function draw(): void {
    const all = pages();
    if (page >= all.length) page = 0;
    for (const bar of bars) {
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

  /** Özel emojiyi odadan kaldır; kendi listemden de çıkar (bir sonraki odaya yüklenmesin). */
  async function removeSticker(id: string): Promise<void> {
    const keep: string[] = [];
    for (const data of myStickers()) if ((await stickerId(data)) !== id) keep.push(data);
    save(MY_STICKERS_KEY, JSON.stringify(keep));
    mine.delete(id);
    send({ t: 'sticker-remove', id });
  }

  for (const bar of bars) {
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
    if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
    const n = Number(event.key);
    if (!Number.isInteger(n) || n < 1 || n > 8) return;
    const item = pages()[page]?.[n - 1];
    if (!item || 'add' in item) return;
    event.preventDefault();
    fire(item);
  });

  return {
    /** Gelen tepki: videonun altından rastgele bir yerden yükselir. */
    show(by: Member, emoji?: string, sticker?: string): void {
      const key = `${by.id}|${emoji ?? sticker}`;
      const existing = layer.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`);
      if (existing) {
        const count = Number(existing.dataset.count ?? '1') + 1;
        existing.dataset.count = String(count);
        existing.querySelector('.r-count')!.textContent = `×${count}`;
        existing.classList.remove('bump');
        void existing.offsetWidth;
        existing.classList.add('bump');
        return;
      }
      let content: HTMLElement;
      if (sticker) {
        const data = stickers.get(sticker);
        if (!data) return;
        content = el('img', { class: 'r-sticker', src: data, alt: '' });
      } else {
        content = el('span', { class: 'r-emoji' }, emoji ?? '');
      }
      while (layer.childElementCount >= MAX_FLOATS) layer.firstElementChild?.remove();
      const who = el('span', { class: 'r-who' }, avatarNode(by.avatar, 'r-avatar'), el('span', { class: 'r-name' }, by.name), el('span', { class: 'r-count' }));
      const float = el('div', { class: 'r-float', 'data-key': key, 'data-count': '1' }, content, who);
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
