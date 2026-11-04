import type { Clock } from './clock.ts';
import type { PlayerAdapter, PlayerEvent } from './player.ts';
import { expectedPosition, type ClientMessage, type PlaybackAction, type PlaybackState } from './protocol.ts';

/** Kontrol döngüsü bu sıklıkla çalışır. */
export const TICK_MS = 500;
/** Biz oynatıcıya komut verdikten sonra bu süre içinde gelen, beklediğimiz olaylar "bizim" sayılır. */
export const PROGRAMMATIC_WINDOW_MS = 1000;
/** Duraklatma bu kadar beklenip öyle gönderilir: ilerleme çubuğunu sürüklerken oynatıcı anlık durur. */
export const PAUSE_DEBOUNCE_MS = 300;
/** Birisi bilerek bir şey yaptığında (oynat, ileri sar) bundan büyük fark varsa konum eşitlenir. */
export const ACTION_SEEK_SECONDS = 0.3;
/** Kendiliğinden oluşan kayma bundan büyükse sıçrayarak düzeltilir. */
export const DRIFT_SEEK_SECONDS = 1;
/** Kayma düzeltmesi için atladıktan sonra bu kadar beklenir (sürekli atlayıp donmasın). */
export const DRIFT_COOLDOWN_MS = 3000;
/**
 * The calm profile for weak devices (a TV, owner's report 30 Oct 2026): a TV that falls a little behind was jumped
 * every 3 s, rebuffered and fell behind again. It jumps only at a bigger gap, waits longer between jumps, never
 * nudges the rate and never makes the room wait for it.
 */
export const RELAXED_DRIFT_SEEK_SECONDS = 2.5;
export const RELAXED_DRIFT_COOLDOWN_MS = 10_000;
/** Hassas hız ayarı destekleyen oynatıcılarda bu farkta hafifçe hızlanıp yavaşlanır. */
export const NUDGE_START_SECONDS = 0.15;
export const NUDGE_STOP_SECONDS = 0.04;
export const NUDGE_FACTOR = 0.05;
/**
 * Oda "oynuyor" derken oynatıcı hâlâ başlamadıysa (yükleniyor, reklam vb.)
 * oynat komutu en fazla bu sıklıkla tekrarlanır.
 */
export const PLAY_RETRY_MS = 3000;
/** Oda oynarken video bu kadar süre ilerlemezse "hazır değilim" denir (oda bekler). */
export const STALL_REPORT_MS = 1500;
/** Kullanıcının ileri/geri sarması: beklenen ilerlemeden bu kadar fazla sıçrama. */
export const SEEK_DETECT_SECONDS = 0.75;

export interface SyncEngineOptions {
  clock: Clock;
  send: (message: ClientMessage) => void;
  /** Tarayıcı sesli otomatik oynatmayı engellediğinde çağrılır; arayüz "başlat" butonu göstermeli. */
  onAutoplayBlocked?: () => void;
  /** Oynayan video sona erdiğinde (her öğe için bir kez) çağrılır; arayüz sıradakini ister. */
  onEnded?: (itemId: string) => void;
  /**
   * Hız kilidi: hız sadece requestRate ile (bizim hız menümüzden) değişir. Oynatıcıda
   * başka bir şey hızı değiştirirse (ör. başka bir hız eklentisinin kısayolu) odaya
   * yayılmaz, video odanın hızına geri döner. Eklentide açık; sitede kapalı.
   */
  lockRate?: boolean;
  /** Hız kilidi bir değişikliği geri aldığında (arayüz "hızı çubuktan değiştir" diyebilir). */
  onRateLocked?: () => void;
  /** Weak device (TV): see RELAXED_DRIFT_SEEK_SECONDS. */
  relaxed?: boolean;
  /** Test için değiştirilebilir. */
  wallNow?: () => number;
}

/** Hız kilidi başka bir eklentiyle inatlaşmasın: bu sürede en fazla bu kadar geri alınır. */
const RATE_REVERT_LIMIT = 6;
const RATE_REVERT_WINDOW_MS = 5000;

type Command = 'play' | 'pause' | 'rate' | 'seek';

/**
 * Sunucudaki oda durumunu (PlaybackState) yerel oynatıcıya uygular ve
 * kullanıcının oynatıcıda yaptığı değişiklikleri sunucuya bildirir.
 *
 * En zor kısım şunu ayırt etmek: oynatıcı "durdu" dediğinde kullanıcı mı
 * durdurdu, yoksa biz mi durdurduk? Motor oynatıcıya her komut verdiğinde
 * hangi olayı beklediğini not eder (durdur dediyse bir "durdu" olayı).
 * Kısa süre içinde gelen beklenen olaylar yok sayılır; beklenmeyen her olay
 * kullanıcıdan gelmiş kabul edilir. Böylece biz bir şey yaparken kullanıcının
 * bastığı "durdur" kaybolmaz.
 *
 * YouTube "ileri sarıldı" olayı vermediği için sarmalar, zamanın beklenmedik
 * şekilde sıçramasından anlaşılır.
 */
export class SyncEngine {
  private player: PlayerAdapter | null = null;
  private state: PlaybackState | null = null;
  /** Son komuttan sonra kontrol döngüsünün düzeltme yapmadan beklediği an. */
  private programmaticUntil = 0;
  /** Biz sardıktan sonra oynatıcının bildirdiği zaman bir süre güvenilmez. */
  private seekSettleUntil = 0;
  /** Verdiğimiz komutlar yüzünden beklenen olaylar. */
  private expected: Record<PlayerEvent, number> = { play: 0, pause: 0, ratechange: 0 };
  private lastSample: { wall: number; time: number; playing: boolean } | null = null;
  private driftCooldownUntil = 0;
  private nudgeRate: number | null = null;
  /** Hız kilidinin son geri almaları (inatlaşma sınırı için). */
  private rateReverts: number[] = [];
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private autoplayBlocked = false;
  private endedItemId: string | null = null;
  private lastPlayAttempt = -Infinity;
  /** "Herkes hazır": sunucuya en son ne dedik, video ne zamandan beri ilerlemiyor. */
  private readyReported = true;
  private stallSince: number | null = null;
  /** Last measured gap to the room (s, + = ahead) and how many drift jumps so far: the TV's sync status line. */
  private drift: number | null = null;
  private jumps = 0;
  private readonly wallNow: () => number;
  /** Fires when a "3-2-1" countdown's start comes (see `current`). */
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  /** 🐞 Test Lab (card DL4) only: until this wall time the video counts as stuck (see `labStall`). */
  private labStallUntil = 0;

  constructor(private readonly options: SyncEngineOptions) {
    this.wallNow = options.wallNow ?? (() => performance.now());
  }

  attach(player: PlayerAdapter): void {
    this.detach();
    // Önceki oynatıcıda "hazır değilim" demiş olabiliriz; yeni oynatıcıyla temiz başla.
    if (!this.readyReported) this.reportReady(true);
    this.stallSince = null;
    this.player = player;
    this.lastSample = null;
    this.nudgeRate = null;
    this.autoplayBlocked = false;
    this.expected = { play: 0, pause: 0, ratechange: 0 };
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
    const rateChanged = this.state !== null && this.state.rate !== state.rate;
    this.state = state;
    if (rateChanged) this.nudgeRate = null;
    if (this.holdTimer !== null) clearTimeout(this.holdTimer);
    this.holdTimer = null;
    const hold = this.holdLeft();
    if (hold > 0) this.holdTimer = setTimeout(() => this.enforce(ACTION_SEEK_SECONDS), hold + 10);
    this.enforce(ACTION_SEEK_SECONDS);
  }

  /**
   * "3-2-1, together" (0.9.93.2): the server starts a new video a few seconds ahead (`updatedAt` in the future while
   * playing). Until then the room is held at its start: the player waits paused there (and buffers), it reports no
   * stall, and everyone starts at the same moment. Milliseconds left, 0 when not holding.
   */
  holdLeft(): number {
    const s = this.state;
    if (s === null || s.paused || s.item === null) return 0;
    return Math.max(0, s.updatedAt - this.options.clock.now());
  }

  /** The room's state as the player should follow it now: a held start counts as paused at its position. */
  private current(): PlaybackState | null {
    const s = this.state;
    return s !== null && this.holdLeft() > 0 ? { ...s, paused: true } : s;
  }

  getState(): PlaybackState | null {
    return this.state;
  }

  /** Arayüzdeki hız seçicisi için. */
  requestRate(rate: number): void {
    const player = this.player;
    if (player === null || this.state === null) return;
    this.nudgeRate = null;
    this.command('rate');
    player.setRate(rate);
    this.localChange('rate', { rate, position: player.getTime() });
  }

  /** "Herkesi bana eşitle": kendi oynatıcımın konumunu odaya yayar. */
  syncEveryoneToMe(): void {
    const player = this.player;
    if (player === null || this.state === null || this.state.item === null) return;
    this.localChange('seek', { position: player.getTime() });
  }

  /** Otomatik oynatma engellendikten sonra kullanıcı "başlat"a bastığında çağrılır. */
  resume(): void {
    this.autoplayBlocked = false;
    this.enforce(ACTION_SEEK_SECONDS);
  }

  destroy(): void {
    this.detach();
    if (this.holdTimer !== null) clearTimeout(this.holdTimer);
    this.holdTimer = null;
    this.state = null;
  }

  /**
   * Oda durumunu oynatıcıya uygular. Sadece gerçekten farklı olanlar için
   * komut verir; hiçbir şey değişmediyse oynatıcıya dokunmaz.
   */
  private enforce(seekThreshold: number): void {
    const player = this.player;
    const state = this.current();
    if (player === null || state === null || state.item === null) return;

    // Kayma için hafifçe hızlanıyorsak (nudge) bu bilerek yapılan bir fark; bozma.
    const wantedRate = this.nudgeRate ?? state.rate;
    if (Math.abs(player.getRate() - wantedRate) > 0.01) {
      this.nudgeRate = null;
      this.command('rate');
      player.setRate(state.rate);
    }

    const target = expectedPosition(state, this.options.clock.now());
    if (Math.abs(player.getTime() - target) > seekThreshold) this.seekTo(target);

    if (state.paused) {
      if (!player.isPaused()) {
        this.command('pause');
        player.pause();
      }
    } else if (player.isPaused() && !player.isEnded() && !this.autoplayBlocked && this.pauseTimer === null) {
      // (pauseTimer: kullanıcı az önce duraklattı ve gönderilmeyi bekliyor; onu ezme.)
      this.command('play');
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
    const state = this.current();
    if (player !== this.player || state === null) return;
    // Bizim komutumuzun beklenen sonucu mu? Öyleyse yok say.
    if (this.wallNow() < this.programmaticUntil && this.expected[event] > 0) {
      this.expected[event]--;
      return;
    }

    switch (event) {
      case 'play':
        this.cancelPauseTimer();
        this.autoplayBlocked = false;
        if (state.paused) this.localChange('play', { paused: false, position: player.getTime() });
        break;
      case 'pause': {
        if (state.paused || this.pauseTimer !== null) break;
        const sendPause = () => {
          const current = this.current();
          if (this.player === player && current !== null && !current.paused && player.isPaused() && !player.isEnded()) {
            this.localChange('pause', { paused: true, position: player.getTime() });
          }
        };
        // YouTube ilerleme çubuğu sürüklenirken anlık "durdu" der; orada biraz beklenir.
        // Tarayıcının kendi <video>'su bunu yapmaz: duraklatma hemen gönderilir
        // (beklerken gelen bir oda mesajı kullanıcının duraklatmasını ezmesin).
        if (!player.seekNoise) {
          sendPause();
          break;
        }
        this.pauseTimer = setTimeout(() => {
          this.pauseTimer = null;
          sendPause();
        }, PAUSE_DEBOUNCE_MS);
        break;
      }
      case 'ratechange': {
        const rate = player.getRate();
        if (this.nudgeRate !== null && Math.abs(rate - this.nudgeRate) < 0.001) return;
        if (Math.abs(rate - state.rate) > 0.01) {
          this.nudgeRate = null;
          if (this.options.lockRate) {
            // Bizim menümüzden gelmeyen hız değişikliği: odaya yayma, geri al.
            const now = this.wallNow();
            this.rateReverts = this.rateReverts.filter((t) => now - t < RATE_REVERT_WINDOW_MS);
            if (this.rateReverts.length < RATE_REVERT_LIMIT) {
              this.rateReverts.push(now);
              this.command('rate');
              player.setRate(state.rate);
              this.options.onRateLocked?.();
            }
            break;
          }
          this.localChange('rate', { rate, position: player.getTime() });
        }
        break;
      }
    }
  }

  private tick(): void {
    const player = this.player;
    const state = this.current();
    if (player === null || state === null || state.item === null) return;

    const wall = this.wallNow();
    const time = player.getTime();
    const playing = !player.isPaused();
    const last = this.lastSample;
    this.lastSample = { wall, time, playing };
    // Video bitmiş değilse (geri sarıldı), bir dahaki bitişte yine "sıradaki" istensin.
    if (!player.isEnded()) this.endedItemId = null;

    // 0) "Herkes hazır": video takıldıysa ya da tekrar hazırsa sunucuya söyle.
    this.trackReadiness(player, state, wall, last, time);

    // 1) Kullanıcı ileri/geri sardı mı? (Biz yeni sardıysak zaman ölçümü henüz güvenilmez.)
    if (last !== null && wall >= this.seekSettleUntil) {
      const elapsed = (wall - last.wall) / 1000;
      const advance = last.playing ? elapsed * player.getRate() : 0;
      // Video takılırsa zaman ilerlemez; bu sarma sayılmasın diye `advance` kadar pay bırakılır.
      if (Math.abs(time - (last.time + advance)) > advance + SEEK_DETECT_SECONDS) {
        this.localChange('seek', { position: time });
        return;
      }
    }

    // Kendi komutumuzun sonucunu ya da kullanıcının duraklatmasının kesinleşmesini bekle.
    if (wall < this.programmaticUntil || this.pauseTimer !== null) return;

    // 2) Oynatıcı odadan farklı durumda kaldıysa (otomatik oynatma, oynatıcı tuhaflıkları) düzelt.
    if (state.paused && playing) {
      this.command('pause');
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
    this.drift = diff;
    const relaxed = this.options.relaxed === true;
    if (Math.abs(diff) > (relaxed ? RELAXED_DRIFT_SEEK_SECONDS : DRIFT_SEEK_SECONDS)) {
      this.clearNudge(player, state);
      this.seekTo(target);
      this.jumps++;
      this.driftCooldownUntil = wall + (relaxed ? RELAXED_DRIFT_COOLDOWN_MS : DRIFT_COOLDOWN_MS);
    } else if (player.fineRate && !relaxed) {
      if (Math.abs(diff) > NUDGE_START_SECONDS) {
        const rate = state.rate * (diff > 0 ? 1 - NUDGE_FACTOR : 1 + NUDGE_FACTOR);
        if (this.nudgeRate !== rate) {
          this.nudgeRate = rate;
          this.command('rate');
          player.setRate(rate);
        }
      } else if (Math.abs(diff) < NUDGE_STOP_SECONDS) {
        this.clearNudge(player, state);
      }
    }
  }

  /**
   * 🐞 Test Lab: moves my video `seconds` away from the room as if it had drifted (our own seek, so it is not taken for
   * the user's): the drift correction has to bring it back. False without a player.
   */
  labDrift(seconds: number): boolean {
    const player = this.player;
    if (player === null) return false;
    this.seekTo(Math.max(0, player.getTime() + seconds));
    return true;
  }

  /**
   * 🐞 Test Lab: for `ms` my video counts as stuck, as when it buffers: after `STALL_REPORT_MS` the room hears "not
   * ready" and waits (at most its own limit), and "ready" again once the time is over.
   */
  labStall(ms: number): void {
    this.labStallUntil = this.wallNow() + Math.max(0, ms);
  }

  /** Gap to the room (seconds, null before the first measurement) and drift jumps since start. */
  syncStats(): { drift: number | null; jumps: number } {
    return { drift: this.drift, jumps: this.jumps };
  }

  /**
   * Oda oynarken video STALL_REPORT_MS boyunca ilerlemezse (yükleniyor, reklam,
   * otomatik oynatma engeli) "hazır değilim" der; ilerlemeye başlayınca ya da oda
   * beklerken yeterince yüklenince "hazırım" der. Sadece değişince mesaj gider.
   */
  private trackReadiness(
    player: PlayerAdapter,
    state: PlaybackState,
    wall: number,
    last: { wall: number; time: number; playing: boolean } | null,
    time: number,
  ): void {
    // Otomatik oynatma engelli: video kullanıcı basana kadar ilerlemez. Bu "yükleniyor"
    // değildir; odayı bekletirsek oda dur-kalk döngüsüne girer.
    if (this.autoplayBlocked) {
      this.stallSince = null;
      if (!this.readyReported) this.reportReady(true);
      return;
    }
    if (state.paused) {
      this.stallSince = null;
      if (!this.readyReported && wall >= this.labStallUntil && (player.canPlayThrough?.() ?? true)) this.reportReady(true);
      return;
    }
    if (player.isEnded()) return;
    const advancing = wall >= this.labStallUntil && last !== null && Math.abs(time - last.time) > 0.05;
    if (advancing) {
      this.stallSince = null;
      if (!this.readyReported) this.reportReady(true);
      return;
    }
    this.stallSince ??= wall;
    // A relaxed device (TV) never makes the room wait: it catches up on its own.
    if (this.readyReported && !this.options.relaxed && wall - this.stallSince >= STALL_REPORT_MS) this.reportReady(false);
  }

  private reportReady(ready: boolean): void {
    this.readyReported = ready;
    this.options.send({ t: 'ready', ready });
  }

  private clearNudge(player: PlayerAdapter, state: PlaybackState): void {
    if (this.nudgeRate === null) return;
    this.nudgeRate = null;
    this.command('rate');
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
    this.command('seek');
    this.player?.seek(seconds);
    this.lastSample = null;
  }

  /** Oynatıcıya komut vermeden hemen önce çağrılır: hangi olayın geleceğini not eder. */
  private command(kind: Command): void {
    const wall = this.wallNow();
    if (wall >= this.programmaticUntil) this.expected = { play: 0, pause: 0, ratechange: 0 };
    this.programmaticUntil = wall + PROGRAMMATIC_WINDOW_MS;
    if (kind === 'play') this.expected.play++;
    else if (kind === 'pause') this.expected.pause++;
    else if (kind === 'rate') this.expected.ratechange++;
    else {
      this.seekSettleUntil = wall + PROGRAMMATIC_WINDOW_MS;
      // YouTube sararken kendiliğinden "oynuyor/durdu" diyebilir.
      if (this.player?.seekNoise) {
        this.expected.play++;
        this.expected.pause++;
      }
    }
  }

  private cancelPauseTimer(): void {
    if (this.pauseTimer !== null) clearTimeout(this.pauseTimer);
    this.pauseTimer = null;
  }
}
