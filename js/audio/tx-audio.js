// Plays a modulated Int16Array through the speakers. The caller generates the samples at
// this AudioContext's sample rate (new Modem(ctx.sampleRate)).
export class TxAudio {
  constructor() { this.ctx = null; this.src = null; this.startTime = 0; this.duration = 0; }
  get sampleRate() { this.ctx = this.ctx || new AudioContext(); return this.ctx.sampleRate; }
  async play(int16, onEnded) {
    this.ctx = this.ctx || new AudioContext();
    await this.ctx.resume();
    const buf = this.ctx.createBuffer(1, int16.length, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < int16.length; i++) ch[i] = int16[i] / 32768;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.connect(this.ctx.destination);
    src.onended = () => { this.src = null; if (onEnded) onEnded(); };
    src.start();
    this.src = src; this.startTime = this.ctx.currentTime; this.duration = buf.duration;
  }
  stop() { if (this.src) { try { this.src.onended = null; this.src.stop(); } catch (e) {} this.src = null; } }
  get playing() { return !!this.src; }
  elapsed() { return this.ctx && this.src ? this.ctx.currentTime - this.startTime : 0; }
}
