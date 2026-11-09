// Reference software modulator: image -> square-wave PCM (Int16Array). Mirror of
// common/sstv_modem_ref.c (doubles instead of C float; functionally identical, decodable
// by the JS and C demodulators and by the real Playdate).
import * as P from './params.js';
import { buildPhysical, buildNote, frameSymbolBits, lockFrame } from './frame.js';

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
    this.symbolUs = P.SYMBOL_US; // see setBand
    this.band = P.BAND_AUDIBLE; this.bits = P.BITS_PER_SYMBOL; this.spf = P.SYMBOLS_PER_FRAME;
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
      // HF band: pure sines. A digital square wave's harmonics fold back under Nyquist (the 3rd of
      // 17 kHz lands near 3 kHz at 48 kHz) and come out of the speakers audible, 7-9 dB under the
      // signal. The Flipper's buzzer is analog, its harmonics really are ultrasonic.
      out[off + i] = this.sine ? (a * Math.sin(2 * Math.PI * this.phase)) | 0 : (this.phase < duty ? a | 0 : (-a) | 0);
      this.phase += step;
      if (this.phase >= 1) this.phase -= 1;
    }
    this.timeUs = endUs; this.samplesOut += n;
    return n;
  }
  frame(frames, frameOff, out, off) {
    let total = 0;
    if (this.band === P.BAND_HF) { // pattern sync (revision 13)
      for (const v of P.HF_SYNC_PATTERN) total += this.toneGain(this.tones[v], this.duty[v], this.channelGain[v], this.symbolUs, out, off + total);
    } else {
      total = this.toneGain(this.fsync, this.syncDuty, 1, P.SYNC_US, out, off);
    }
    for (let i = 0; i < this.spf; i++) {
      const v = frameSymbolBits(frames, frameOff, i, this.bits);
      total += this.toneGain(this.tones[v], this.duty[v], this.channelGain[v], this.symbolUs, out, off + total);
    }
    return total;
  }
  // Switches to the HF band (8-FSK, 3 ms) or back (mirror of sstv_mod_set_band).
  setBand(band) {
    if (band !== P.BAND_HF) {
      const fresh = new Modem(this.sampleRate, this.amplitude);
      Object.assign(this, { tones: fresh.tones, duty: fresh.duty, channelGain: fresh.channelGain, fsync: fresh.fsync, symbolUs: fresh.symbolUs, band: fresh.band, bits: fresh.bits, spf: fresh.spf, sine: false });
      return this;
    }
    this.tones = P.HF_TONES_HZ.slice(); this.duty = this.tones.map(() => 0.5); this.channelGain = this.tones.map(() => 1);
    this.fsync = P.HF_FSYNC_HZ; this.symbolUs = P.HF_SYMBOL_US; this.sine = true;
    this.band = P.BAND_HF; this.bits = P.HF_BITS_PER_SYMBOL; this.spf = P.bandSymbolsPerFrame(P.BAND_HF);
    return this;
  }
  // Start preamble: tone ladder, then lock frames (mirror of sstv_mod_preamble).
  preamble(out, off) {
    let total = 0;
    for (let i = 0; i < P.bandLeaderSymbols(this.band); i++) {
      const k = P.leaderSymbol(i);
      total += this.toneGain(this.tones[k], this.duty[k], this.channelGain[k], this.symbolUs, out, off + total);
    }
    const lock = lockFrame();
    for (let f = 0; f < P.LOCK_FRAMES; f++) total += this.frame(lock, 0, out, off + total);
    return total;
  }
  pass(frames, nframes) {
    const capUs = P.PREAMBLE_US + P.MAX_FRAMES * P.PHYS_US;
    const out = new Int16Array(Math.floor(capUs * this.sampleRate / 1e6) + 64);
    let total = this.preamble(out, 0);
    for (let p = 0; p < nframes; p++) total += this.frame(frames, p * P.FRAME_BYTES, out, total);
    return out.subarray(0, total);
  }
  // Modulates a whole image (preamble + all physical frames). Returns Int16Array.
  image(imageBits, name = 'image') {
    const { frames, total } = buildPhysical(imageBits, name);
    return this.pass(frames, total);
  }
  // Modulates a text note (preamble + note frames). Returns Int16Array.
  note(text, name = 'note') {
    const { frames, total } = buildNote(text, name);
    return this.pass(frames, total);
  }
}
