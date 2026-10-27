// Ses akışlarının anlık seviyesi (0–1): "kim konuşuyor" göstergesi, kendi mikrofonumun seviyesi ve film sesini kısma
// için. WebRTC'nin kendi ölçüsü (`getSynchronizationSources().audioLevel`) her tarayıcıda/akışta gelmiyor; burada
// sesin kendisi Web Audio ile dinlenir (ses çalınmaz, sadece ölçülür).

export class LevelMeter {
  private context: AudioContext | null = null;
  private readonly meters = new Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode }>();
  /** ~40 ms'lik pencere: kısa sesler de yakalansın. */
  private readonly buffer = new Float32Array(2048);

  /** Bir akışı ölçmeye başla (aynı anahtar varsa eskisi bırakılır); `null` bırakır. */
  watch(key: string, stream: MediaStream | null): void {
    const old = this.meters.get(key);
    if (old) {
      old.source.disconnect();
      this.meters.delete(key);
    }
    if (!stream || stream.getAudioTracks().length === 0) return;
    try {
      this.context ??= new AudioContext();
      // Kullanıcı tıklamadan açılan bağlam askıda başlayabilir; ölçmek için çalışması gerekir.
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
      const analyser = this.context.createAnalyser();
      analyser.fftSize = 2048;
      const source = this.context.createMediaStreamSource(stream);
      source.connect(analyser);
      this.meters.set(key, { analyser, source });
    } catch {
      // Web Audio yok/kapalı: seviye 0 kalır.
    }
  }

  /** Anlık seviye (0–1, konuşma ≈ 0,1–0,8). */
  level(key: string): number {
    const meter = this.meters.get(key);
    if (!meter) return 0;
    // Bağlam askıda kaldıysa (kullanıcı hareketi olmadan açıldı) ölçüm sıfır döner: uyandır.
    if (this.context?.state === 'suspended') void this.context.resume().catch(() => {});
    meter.analyser.getFloatTimeDomainData(this.buffer);
    let sum = 0;
    for (const v of this.buffer) sum += v * v;
    return Math.min(1, Math.sqrt(sum / this.buffer.length) * 6);
  }

  levels(): Map<string, number> {
    const out = new Map<string, number>();
    for (const key of this.meters.keys()) out.set(key, this.level(key));
    return out;
  }

  clear(): void {
    for (const key of [...this.meters.keys()]) this.watch(key, null);
    void this.context?.close().catch(() => {});
    this.context = null;
  }
}
