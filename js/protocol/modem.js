// Reference software modulator: image -> square-wave PCM (Int16Array). Mirror of
// common/sstv_modem_ref.c (doubles instead of C float; functionally identical, decodable
// by the JS and C demodulators and by the real Playdate).
import * as P from './params.js';
import { buildPhysical, frameSymbol } from './frame.js';

export class Modem {
  constructor(sampleRate, amplitude = 8000) {
    this.sampleRate = sampleRate;
    this.amplitude = amplitude;
    this.tones = P.TONES_HZ.slice();
    this.duty = P.TONE_DUTY_PCT.map((d) => d / 100);
    this.channelGain = this.duty.map((d) => {
      const f = Math.sin(Math.PI * d);
      return (d > 0 && f > 0.05) ? 1 / f : 1;
    });
    this.fsync = P.FSYNC_HZ;
    this.syncDuty = P.SYNC_DUTY_PCT / 100;
    this.phase = 0; this.timeUs = 0; this.samplesOut = 0;
  }
  // Appends a tone; returns samples written into out at off.
  toneGain(freqHz, duty, gain, durationUs, out, off) {
    const endUs = this.timeUs + durationUs;
    const endSamples = Math.floor(endUs * this.sampleRate / 1e6 + 0.5);
    let n = endSamples - this.samplesOut;
    if (n < 0) n = 0;
    const step = freqHz / this.sampleRate;
    for (let i = 0; i < n; i++) {
      if (freqHz <= 0 || duty <= 0) { out[off + i] = 0; continue; }
      let a = this.amplitude * gain;
      if (a > 32767) a = 32767;
      out[off + i] = this.phase < duty ? a | 0 : (-a) | 0;
      this.phase += step;
      if (this.phase >= 1) this.phase -= 1;
    }
    this.timeUs = endUs; this.samplesOut += n;
    return n;
  }
  frame(frames, frameOff, out, off) {
    let total = this.toneGain(this.fsync, this.syncDuty, 1, P.SYNC_US, out, off);
    for (let i = 0; i < P.SYMBOLS_PER_FRAME; i++) {
      const v = frameSymbol(frames, frameOff, i);
      total += this.toneGain(this.tones[v], this.duty[v], this.channelGain[v], P.SYMBOL_US, out, off + total);
    }
    return total;
  }
  // Modulates a whole image (leader + all physical frames). Returns Int16Array.
  image(imageBits, name = 'image') {
    const capUs = P.LEADER_SYMBOLS * P.SYMBOL_US + P.MAX_FRAMES * P.PHYS_US;
    const out = new Int16Array(Math.floor(capUs * this.sampleRate / 1e6) + 64);
    let total = 0;
    for (let i = 0; i < P.LEADER_SYMBOLS; i++) {
      const k = i % P.NUM_TONES;
      total += this.toneGain(this.tones[k], this.duty[k], this.channelGain[k], P.SYMBOL_US, out, total);
    }
    const { frames, total: nframes } = buildPhysical(imageBits, name);
    for (let p = 0; p < nframes; p++) total += this.frame(frames, p * P.FRAME_BYTES, out, total);
    return out.subarray(0, total);
  }
}
