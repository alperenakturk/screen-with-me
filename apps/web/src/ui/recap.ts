import { avatarText } from '@swm/shared/protocol';
import { createLogo, logoSvg } from '@swm/shared/logo';
import { chooseFacts, STICKER_MARK, type Fact, type Recap, type RecapPerson } from '@swm/shared/recap';
import { el } from '../dom.ts';
import { lang, t, type I18nKey } from '../i18n.ts';

const SLIDE_MS = 5000;
/** Her kart için ayrı renk geçişi (sırayla döner). */
const BACKGROUNDS = [
  'linear-gradient(160deg, #5b3cf0, #2a1a7a 60%, #120b33)',
  'linear-gradient(160deg, #ff5f8f, #8a2b8f 55%, #2a0f3a)',
  'linear-gradient(160deg, #14b8a6, #1e4b8f 60%, #0b1430)',
  'linear-gradient(160deg, #f59e0b, #c2410c 55%, #3b0f0a)',
  'linear-gradient(160deg, #22c55e, #166534 55%, #052e16)',
  'linear-gradient(160deg, #8b6cff, #ff6fb5 60%, #3a0f2e)',
];

/** "1 sa 12 dk" / "38 dk" / "2 dk". */
function duration(sec: number): string {
  const m = Math.max(1, Math.round(sec / 60));
  return m >= 60 ? t('leftHM', { h: Math.floor(m / 60), m: m % 60 }) : t('endMinutes', { m });
}

function who(p: RecapPerson): string {
  return p.avatar ? `${avatarText(p.avatar)} ${p.name}` : p.name;
}

/** Bir kartın büyük yazısı, başlığı ve alt satırı. */
function slideText(fact: Fact, r: Recap): { big: string; title: string; sub: string } {
  const k = (key: string, params?: Record<string, string | number>) => t(`recap.${key}` as I18nKey, params);
  switch (fact.kind) {
    case 'time':
      return { big: duration(r.watchSec), title: k('time'), sub: k('timeSub', { videos: r.videos, people: Math.max(r.peak, r.people.length) }) };
    case 'videos':
      return { big: String(r.videos), title: k('videos'), sub: r.titles.slice(-3).join(' · ') };
    case 'speed': {
      const gained = Math.abs(r.videoSec - r.watchSec);
      return fact.rate > 1
        ? { big: `${fact.rate}x`, title: k('fast'), sub: k('fastSub', { time: duration(gained) }) }
        : { big: `${fact.rate}x`, title: k('slow'), sub: k('slowSub') };
    }
    case 'talker':
      return { big: '💬', title: k('talker', { name: who(fact.person) }), sub: k('talkerSub', { n: fact.person.chat }) };
    case 'reactor': {
      const top = fact.person.top === STICKER_MARK ? '🖼️' : (fact.person.top ?? '');
      return { big: top || '🎉', title: k('reactor', { name: who(fact.person) }), sub: k('reactorSub', { n: fact.person.reactions }) };
    }
    case 'sad':
      return { big: '😢', title: k('sad', { name: who(fact.person) }), sub: k('sadSub', { n: fact.person.sad }) };
    case 'laugh':
      return { big: '😂', title: k('laugh', { name: who(fact.person) }), sub: k('laughSub', { n: fact.person.laugh }) };
    case 'emoji':
      return { big: fact.emoji === STICKER_MARK ? '🖼️' : fact.emoji, title: k('emoji'), sub: k('emojiSub', { n: fact.count }) };
    case 'pins':
      return { big: `📌 ${r.pins}`, title: k('pins'), sub: k('pinsSub', { name: who(fact.person), n: fact.person.pins }) };
    case 'pauser':
      return { big: '⏸', title: k('pauser', { name: who(fact.person) }), sub: k('pauserSub', { n: fact.person.pauses }) };
    case 'seeker':
      return { big: '⏩', title: k('seeker', { name: who(fact.person) }), sub: k('seekerSub', { n: fact.person.seeks }) };
    case 'crowd':
      return { big: String(r.peak), title: k('crowd'), sub: k('crowdSub', { n: r.peak }) };
    case 'summary':
      return { big: '', title: k('summary'), sub: '' };
  }
}

function summaryLines(r: Recap): string[] {
  return [
    `⏱ ${duration(r.watchSec)}`,
    `🎬 ${t('recap.nVideos', { n: r.videos })}`,
    `💬 ${t('recap.nChat', { n: r.chat })}`,
    `😂 ${t('recap.nReactions', { n: r.reactions })}`,
    `📌 ${t('recap.nPins', { n: r.pins })}`,
    `👥 ${t('recap.nPeople', { n: Math.max(r.peak, r.people.length) })}`,
  ];
}

function timeText(at: number): string {
  return new Date(at).toLocaleTimeString(lang() === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
}

function dateText(at: number): string {
  return new Date(at).toLocaleString(lang() === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Oturum özeti: Spotify "blend"i gibi art arda kartlar. İlk kart toplam süre, sonra her seferinde
 * rastgele seçilen birkaç ilginç şey, en sonda özet + görsel indirme. Sağa dokun: ileri, sola: geri.
 */
export interface RecapOptions {
  /** Verilirse son kartta "Kaydet" (bugünün özeti yarına kalsın). Kaydedilmiş özette yok. */
  onSave?: () => void;
}

export function showRecap(recap: Recap, options: RecapOptions = {}): void {
  document.querySelector('.recap-backdrop')?.remove();
  // Ne kadar çok şey olduysa o kadar çok kart (en az birkaç, en fazla 8).
  const facts = chooseFacts(recap, Math.random, 8);
  let index = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const bars = el('div', { class: 'recap-bars' }, ...facts.map(() => el('span', {}, el('i', {}))));
  const logo = createLogo(document, { animated: true });
  logo.classList.add('recap-logo');
  const x = el('button', { type: 'button', class: 'recap-x', 'aria-label': t('close'), title: t('close') }, '✕');
  const body = el('div', { class: 'recap-body' });
  const card = el(
    'div',
    { class: 'recap-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('recap.title') },
    bars,
    el('div', { class: 'recap-head' }, logo, el('div', {}, el('b', {}, t('recap.title')), el('span', {}, `${dateText(recap.from)} – ${timeText(recap.to)}`)), x),
    body,
  );
  const backdrop = el('div', { class: 'recap-backdrop' }, card);

  const close = () => {
    if (timer !== null) clearTimeout(timer);
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
  };
  const go = (next: number) => {
    if (next < 0) next = 0;
    if (next >= facts.length) return close();
    index = next;
    draw();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close();
    else if (event.key === 'ArrowRight' || event.key === ' ') go(index + 1);
    else if (event.key === 'ArrowLeft') go(index - 1);
  };

  function draw(): void {
    if (timer !== null) clearTimeout(timer);
    const fact = facts[index]!;
    card.style.background = BACKGROUNDS[index % BACKGROUNDS.length]!;
    [...bars.children].forEach((bar, i) => {
      bar.className = i < index ? 'done' : i === index ? 'now' : '';
    });
    const text = slideText(fact, recap);
    if (fact.kind === 'summary') {
      const download = el('button', { type: 'button', class: 'btn primary' }, t('endDownload'));
      download.addEventListener('click', (event) => {
        event.stopPropagation();
        downloadImage(recap);
      });
      const done = el('button', { type: 'button', class: 'btn' }, t('close'));
      done.addEventListener('click', (event) => {
        event.stopPropagation();
        close();
      });
      const actions: HTMLElement[] = [download, done];
      if (options.onSave) {
        const save = el('button', { type: 'button', class: 'btn' }, t('recap.save'));
        save.addEventListener('click', (event) => {
          event.stopPropagation();
          options.onSave?.();
          save.textContent = t('recap.saved');
          save.setAttribute('disabled', '');
        });
        actions.unshift(save);
      }
      body.replaceChildren(
        el('h2', { class: 'recap-title' }, text.title),
        el('div', { class: 'recap-grid' }, ...summaryLines(recap).map((line) => el('span', {}, line))),
        el('div', { class: 'recap-actions' }, ...actions),
      );
      return;
    }
    body.replaceChildren(
      el('div', { class: 'recap-big' }, text.big),
      el('h2', { class: 'recap-title' }, text.title),
      el('p', { class: 'recap-sub' }, text.sub),
    );
    timer = setTimeout(() => go(index + 1), SLIDE_MS);
  }

  // Sağ yarıya dokun: ileri; sol: geri (düğmelere basınca değil).
  card.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('button')) return;
    const rect = card.getBoundingClientRect();
    go(event.clientX - rect.left > rect.width / 3 ? index + 1 : index - 1);
  });
  x.addEventListener('click', close);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.append(backdrop);
  draw();
}

/** Profildeki "kaydedilen özetler" listesi (yenisi üstte). */
export function renderRecapHistory(container: HTMLElement, recaps: Recap[]): void {
  container.replaceChildren(
    ...[...recaps].reverse().map((recap) => {
      const button = el('button', { type: 'button', class: 'recap-past' }, `📊 ${dateText(recap.to)}`, el('span', { class: 'muted small' }, ` · ${duration(recap.watchSec)}`));
      button.addEventListener('click', () => showRecap(recap));
      return button;
    }),
  );
}

/** Özeti 1200×630 paylaşılabilir görsel olarak indirir (logomuzla). */
function downloadImage(recap: Recap): void {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 1200, 630);
  g.addColorStop(0, '#5b3cf0');
  g.addColorStop(0.6, '#2a1a7a');
  g.addColorStop(1, '#120b33');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1200, 630);
  const logo = new Image();
  logo.onload = () => {
    ctx.drawImage(logo, 70, 60, 84, 84);
    ctx.fillStyle = '#fff';
    ctx.font = '800 52px system-ui, sans-serif';
    ctx.fillText(t('recap.title'), 176, 118);
    ctx.font = '500 26px system-ui, sans-serif';
    ctx.fillStyle = 'rgb(255 255 255 / 0.8)';
    ctx.fillText(dateText(recap.to), 176, 152);
    ctx.fillStyle = '#fff';
    ctx.font = '700 40px system-ui, sans-serif';
    summaryLines(recap).forEach((line, i) => ctx.fillText(line, 70 + (i % 2) * 540, 270 + Math.floor(i / 2) * 80));
    ctx.fillStyle = '#c9b8ff';
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.fillText('ScreenWithMe', 70, 580);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'screenwithme-ozet.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/png');
  };
  logo.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg({ gradientId: 'recap-logo' }))}`;
}
