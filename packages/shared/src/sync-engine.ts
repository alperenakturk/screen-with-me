import type { ServerClock } from './clock.ts';
import type { PlayerAdapter, PlayerEvent } from './player.ts';
import { expectedPosition, type ClientMessage, type PlaybackAction, type PlaybackState } from './protocol.ts';

/** Kontrol döngüsü bu sıklıkla çalışır. */
export const TICK_MS = 500;
/** Biz oynatıcıya komut verdikten sonra bu süre boyunca gelen olaylar "bizim" sayılır. */
export const PROGRAMMATIC_WINDOW_MS = 1000;
/** Duraklatma bu kadar beklenip öyle gönderilir: ilerleme çubuğunu sürüklerken oynatıcı anlık durur. */
export const PAUSE_DEBOUNCE_MS = 300;
/** Birisi bilerek bir şey yaptığında (oynat, ileri sar) bundan büyük fark varsa konum eşitlenir. */
export const ACTION_SEEK_SECONDS = 0.3;
/** Kendiliğinden oluşan kayma bundan büyükse sıçrayarak düzeltilir. */
export const DRIFT_SEEK_SECONDS = 1;
/** Kayma düzeltmesi için atladıktan sonra bu kadar beklenir (sürekli atlayıp donmasın). */
export const DRIFT_COOLDOWN_MS = 3000;
/** Hassas hız ayarı destekleyen oynatıcılarda bu farkta hafifçe hızlanıp yavaşlanır. */
export const NUDGE_START_SECONDS = 0.15;
export const NUDGE_STOP_SECONDS = 0.04;
export const NUDGE_FACTOR = 0.05;
/**
 * Oda "oynuyor" derken oynatıcı hâlâ başlamadıysa (yükleniyor, reklam vb.)
 * oynat komutu en fazla bu sıklıkla tekrarlanır. Sık tekrarlarsa her komutun
 * yankı penceresi kullanıcının gerçek "durdur"unu da yutar.
 */
export const PLAY_RETRY_MS = 3000;
/** Kullanıcının ileri/geri sarması: beklenen ilerlemeden bu kadar fazla sıçrama. */
export const SEEK_DETECT_SECONDS = 0.75;

export interface SyncEngineOptions {
  clock: ServerClock;
  send: (message: ClientMessage) => void;
  /** Tarayıcı sesli otomatik oynatmayı engellediğinde çağrılır; arayüz "başlat" butonu göstermeli. */
  onAutoplayBlocked?: () => void;
  /** Oynayan video sona erdiğinde (her öğe için bir kez) çağrılır; arayüz sıradakini ister. */
  onEnded?: (itemId: string) => void;
  /** Test için değiştirilebilir. */
  wallNow?: () => number;
}

/**
 * Sunucudaki oda durumunu (PlaybackState) yerel oynatıcıya uygular ve
 * kullanıcının oynatıcıda yaptığı değişiklikleri sunucuya bildirir.
 *
 * En zor kısım şunu ayırt etmek: oynatıcı "durdu" dediğinde kullanıcı mı
 * durdurdu, yoksa biz mi durdurduk? Bizim verdiğimiz komutlardan sonraki kısa
 * süre (PROGRAMMATIC_WINDOW_MS) içindeki olaylar yok sayılır; bunun dışında
 * odanın durumuyla çelişen her olay kullanıcıdan gelmiş kabul edilir.
 *
 * YouTube "ileri sarıldı" olayı vermediği için sarmalar, zamanın beklenmedik
 * şekilde sıçramasından anlaşılır.
 */
export class SyncEngine {
  private player: PlayerAdapter | null = null;
  private state: PlaybackState | null = null;
  private programmaticUntil = 0;
  private lastSample: { wall: number; time: number; playing: boolean } | null = null;
  private driftCooldownUntil = 0;
  private nudgeRate: number | null = null;
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private autoplayBlocked = false;
  private endedItemId: string | null = null;
  private lastPlayAttempt = -Infinity;
  private readonly wallNow: () => number;

  constructor(private readonly options: SyncEngineOptions) {
    this.wallNow = options.wallNow ?? (() => performance.now());
  }

  attach(player: PlayerAdapter): void {
    this.detach();
    this.player = player;
    this.lastSample = null;
    this.nudgeRate = null;
    this.autoplayBlocked = false;
    player.onEvent((event) => this.handlePlayerEvent(player, event));
    this.tickTimer = setInterval(() => this.tick(), TICK_MS);
    this.enforce(ACTION_SEEK_SECONDS);
  }

  detach(): void {
    if (this.tickTimer !== null) clearInterval(this.tickTimer);
    this.tickTimer = null;
    this.cancelPauseTimer();
    this.player = null;
  }

  /** Sunucudan yeni oda durumu geldiğinde çağrılır. */
  receive(state: PlaybackState): void {
    this.state = state;
    this.enforce(ACTION_SEEK_SECONDS);
  }

  getState(): PlaybackState | null {
    return this.state;
  }

  /** Arayüzdeki hız seçicisi için. */
  requestRate(rate: number): void {
    const player = this.player;
    if (player === null || this.state === null) return;
    this.markProgrammatic();
    this.nudgeRate = null;
    player.setRate(rate);
    this.localChange('rate', { rate, position: player.getTime() });
  }

  /** Otomatik oynatma engellendikten sonra kullanıcı "başlat"a bastığında çağrılır. */
  resume(): void {
    this.autoplayBlocked = false;
    this.enforce(ACTION_SEEK_SECONDS);
  }

  destroy(): void {
    this.detach();
    this.state = null;
  }

  /** Oda durumunu oynatıcıya zorla uygular. */
  private enforce(seekThreshold: number): void {
    const player = this.player;
    const state = this.state;
    if (player === null || state === null || state.item === null) return;

    this.markProgrammatic();
    this.nudgeRate = null;
    if (Math.abs(player.getRate() - state.rate) > 0.01) player.setRate(state.rate);

    const target = expectedPosition(state, this.options.clock.now());
    if (Math.abs(player.getTime() - target) > seekThreshold) this.seekTo(target);

    if (state.paused) {
      if (!player.isPaused()) player.pause();
    } else if (player.isPaused() && !player.isEnded() && !this.autoplayBlocked) {
      this.lastPlayAttempt = this.wallNow();
      void player.play().then((result) => {
        if (result === 'blocked' && this.player === player) {
          this.autoplayBlocked = true;
          this.options.onAutoplayBlocked?.();
        }
      });
    }
  }

  private handlePlayerEvent(player: PlayerAdapter, event: PlayerEvent): void {
    const state = this.state;
    if (player !== this.player || state === null) return;
    if (this.wallNow() < this.programmaticUntil) return;

    switch (event) {
      case 'play':
        this.cancelPauseTimer();
        this.autoplayBlocked = false;
        if (state.paused) this.localChange('play', { paused: false, position: player.getTime() });
        break;
      case 'pause':
        if (!state.paused && this.pauseTimer === null) {
          this.pauseTimer = setTimeout(() => {
            this.pauseTimer = null;
            const current = this.state;
            if (this.player === player && current !== null && !current.paused && player.isPaused() && !player.isEnded()) {
              this.localChange('pause', { paused: true, position: player.getTime() });
            }
          }, PAUSE_DEBOUNCE_MS);
        }
        break;
      case 'ratechange': {
        const rate = player.getRate();
        if (this.nudgeRate !== null && Math.abs(rate - this.nudgeRate) < 0.001) return;
        if (Math.abs(rate - state.rate) > 0.01) this.localChange('rate', { rate, position: player.getTime() });
        break;
      }
    }
  }

  private tick(): void {
    const player = this.player;
    const state = this.state;
    if (player === null || state === null || state.item === null) return;

    const wall = this.wallNow();
    const time = player.getTime();
    const playing = !player.isPaused();
    const inWindow = wall < this.programmaticUntil;
    const last = this.lastSample;
    this.lastSample = { wall, time, playing };

    // 1) Kullanıcı ileri/geri sardı mı?
    if (last !== null && !inWindow) {
      const elapsed = (wall - last.wall) / 1000;
      const advance = last.playing ? elapsed * player.getRate() : 0;
      // Video takılırsa zaman ilerlemez; bu sarma sayılmasın diye `advance` kadar pay bırakılır.
      if (Math.abs(time - (last.time + advance)) > advance + SEEK_DETECT_SECONDS) {
        this.localChange('seek', { position: time });
        return;
      }
    }

    if (inWindow || this.pauseTimer !== null) return;

    // 2) Oynatıcı odadan farklı durumda kaldıysa (otomatik oynatma, oynatıcı tuhaflıkları) düzelt.
    if (state.paused && playing) {
      this.markProgrammatic();
      player.pause();
      return;
    }
    if (!state.paused && !playing) {
      if (player.isEnded()) {
        if (this.endedItemId !== state.item.id) {
          this.endedItemId = state.item.id;
          this.options.onEnded?.(state.item.id);
        }
      } else if (!this.autoplayBlocked && wall - this.lastPlayAttempt >= PLAY_RETRY_MS) {
        this.enforce(DRIFT_SEEK_SECONDS);
      }
      return;
    }

    // 3) Kayma düzeltmesi.
    if (state.paused || !this.options.clock.synced || wall < this.driftCooldownUntil) return;
    const target = expectedPosition(state, this.options.clock.now());
    const diff = time - target;
    if (Math.abs(diff) > DRIFT_SEEK_SECONDS) {
      this.markProgrammatic();
      this.clearNudge(player, state);
      this.seekTo(target);
      this.driftCooldownUntil = wall + DRIFT_COOLDOWN_MS;
    } else if (player.fineRate) {
      if (Math.abs(diff) > NUDGE_START_SECONDS) {
        const rate = state.rate * (diff > 0 ? 1 - NUDGE_FACTOR : 1 + NUDGE_FACTOR);
        if (this.nudgeRate !== rate) {
          this.nudgeRate = rate;
          player.setRate(rate);
        }
      } else if (Math.abs(diff) < NUDGE_STOP_SECONDS) {
        this.clearNudge(player, state);
      }
    }
  }

  private clearNudge(player: PlayerAdapter, state: PlaybackState): void {
    if (this.nudgeRate === null) return;
    this.nudgeRate = null;
    player.setRate(state.rate);
  }

  /** Yerel kullanıcının yaptığı değişikliği hemen uygular (sunucuyu beklemeden) ve sunucuya yollar. */
  private localChange(action: Exclude<PlaybackAction, 'load' | 'next'>, patch: Partial<PlaybackState>): void {
    const state = this.state;
    if (state === null) return;
    const at = this.options.clock.now();
    const next: PlaybackState = { ...state, ...patch, updatedAt: at };
    this.state = next;
    if (action === 'rate') {
      this.options.send({ t: 'rate', rate: next.rate, position: next.position, at });
    } else {
      this.options.send({ t: action, position: next.position, at });
    }
  }

  private seekTo(seconds: number): void {
    this.player?.seek(seconds);
    this.lastSample = null;
  }

  private markProgrammatic(): void {
    this.programmaticUntil = this.wallNow() + PROGRAMMATIC_WINDOW_MS;
  }

  private cancelPauseTimer(): void {
    if (this.pauseTimer !== null) clearTimeout(this.pauseTimer);
    this.pauseTimer = null;
  }
}
