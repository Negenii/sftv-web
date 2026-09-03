// Microphone capture: getUserMedia -> AudioWorklet -> onSamples(Float32Array, sampleRate).
// The browser's AGC/NS/echo-cancel are disabled; the demodulator does its own gain tracking.
export class RxAudio {
  async start(onSamples) {
    this.ctx = new AudioContext();
    await this.ctx.resume();
    const workletUrl = new URL('./capture-worklet.js', import.meta.url);
    await this.ctx.audioWorklet.addModule(workletUrl);
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, 'capture');
    this.node.port.onmessage = (e) => onSamples(e.data, this.ctx.sampleRate);
    src.connect(this.node);
    // The worklet only pulls if it is connected to the destination; mute it with a zero gain.
    const g = this.ctx.createGain(); g.gain.value = 0;
    this.node.connect(g); g.connect(this.ctx.destination);
    this.sampleRate = this.ctx.sampleRate;
    return this.sampleRate;
  }
  stop() {
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    if (this.ctx) this.ctx.close();
    this.stream = this.ctx = this.node = null;
  }
}
