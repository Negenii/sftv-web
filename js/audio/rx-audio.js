// Microphone capture: getUserMedia -> AudioWorklet -> onSamples(Float32Array, sampleRate).
// The browser's AGC/NS/echo-cancel are disabled; the demodulator does its own gain tracking.
// The worklet is inlined as a Blob so the page also works opened straight from disk (file://).
const WORKLET_SRC = `class Capture extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor('capture', Capture);`;

export class RxAudio {
  async start(onSamples) {
    // Ask for the mic first and run the context at the mic's own rate (48 kHz if it has no
    // opinion): a default context follows the output device (often 44.1 kHz), and resampling
    // 48 -> 44.1 kHz low-passes away everything above ~20 kHz, i.e. the HF band's 21 kHz sync.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: { ideal: 48000 } },
    });
    const tr = this.stream.getAudioTracks()[0];
    const micRate = (tr && tr.getSettings && tr.getSettings().sampleRate) || 48000;
    try { this.ctx = new AudioContext({ sampleRate: micRate }); } catch (e) { this.ctx = new AudioContext(); }
    await this.ctx.resume();
    const workletUrl = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'text/javascript' }));
    try { await this.ctx.audioWorklet.addModule(workletUrl); } finally { URL.revokeObjectURL(workletUrl); }
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
