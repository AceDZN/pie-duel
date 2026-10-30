// Synthesized sound effects (WebAudio). Nothing is fetched; the context starts on the first gesture.

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.55;
  }

  private env(t0: number, dur: number, peak = 1) {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    g.connect(this.master!);
    return g;
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', peak = 0.4, glideTo?: number, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    o.connect(this.env(t0, dur, peak));
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, peak = 0.5, filter = 1200, q = 0.8, delay = 0, type: BiquadFilterType = 'lowpass') {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.ceil(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filter;
    f.Q.value = q;
    src.connect(f);
    f.connect(this.env(t0, dur, peak));
    src.start(t0);
  }

  click() {
    this.tone(880, 0.05, 'square', 0.12);
  }
  lever() {
    this.tone(180, 0.12, 'square', 0.18, 90);
    this.noise(0.08, 0.2, 2400, 1, 0.02, 'bandpass');
  }
  drumroll(ms: number) {
    if (!this.ctx || this.muted) return;
    for (let i = 0; i < ms / 45; i++) this.noise(0.04, 0.12 + (i / (ms / 45)) * 0.15, 900, 1, i * 0.045, 'bandpass');
  }
  whoosh() {
    this.noise(0.45, 0.35, 700, 0.6, 0, 'bandpass');
    this.tone(320, 0.4, 'sine', 0.1, 120);
  }
  splat() {
    this.noise(0.35, 0.9, 500, 0.7);
    this.tone(140, 0.25, 'sine', 0.5, 50);
    this.noise(0.2, 0.4, 3000, 2, 0.05, 'bandpass');
  }
  pop() {
    this.tone(1200, 0.08, 'triangle', 0.35, 300);
    this.noise(0.18, 0.4, 5000, 1.5, 0.01, 'highpass');
    for (let i = 0; i < 5; i++) this.tone(900 + Math.random() * 1400, 0.06, 'sine', 0.1, undefined, 0.05 + i * 0.03);
  }
  cheer() {
    this.noise(1.1, 0.25, 1800, 0.4, 0, 'bandpass');
    [523, 659, 784].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.18, undefined, i * 0.09));
  }
  boo() {
    this.tone(220, 0.5, 'sawtooth', 0.1, 150);
  }
  coin() {
    this.tone(1320, 0.08, 'square', 0.12);
    this.tone(1760, 0.18, 'square', 0.12, undefined, 0.07);
  }
  card() {
    this.noise(0.12, 0.3, 4000, 1, 0, 'highpass');
    this.tone(660, 0.12, 'triangle', 0.15, 990);
  }
  spin(ms: number) {
    if (!this.ctx || this.muted) return;
    const n = Math.floor(ms / 60);
    for (let i = 0; i < n; i++) this.tone(1500, 0.02, 'square', 0.05, undefined, ((i / n) ** 1.6 * ms) / 1000);
  }
  win() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.22, undefined, i * 0.12));
    this.noise(1.4, 0.2, 1800, 0.4, 0.3, 'bandpass');
  }
  lose() {
    [392, 330, 262].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.2, undefined, i * 0.16));
  }
}
