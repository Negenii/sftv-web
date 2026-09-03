// Demodulator: PCM samples -> physical frames + soft bits. Mirror of common/sstv_demod.c.
import * as P from './params.js';

const MAX_WINDOW = 128;
const RING = MAX_WINDOW * P.SYNC_WINDOW_MULT; // 512
const TABLE_BITS = 10, TABLE_SIZE = 1 << TABLE_BITS; // 1024
const SYNC_DET = P.NUM_TONES; // 4
const FLYWHEEL_FRAMES = 3;
const IDLE = 0, SYNC = 1, DATA = 2;

const sine = new Int32Array(TABLE_SIZE);
(function tableInit() {
  const twoPi = 6.283185307179586476925286766559;
  const a = twoPi / TABLE_SIZE, a2 = a * a;
  const s = a * (1 - a2 / 6 * (1 - a2 / 20 * (1 - a2 / 42)));
  const c = 1 - a2 / 2 * (1 - a2 / 12 * (1 - a2 / 30));
  let x = 1, y = 0;
  for (let i = 0; i < TABLE_SIZE; i++) {
    sine[i] = Math.trunc(y * 32767 + (y >= 0 ? 0.5 : -0.5));
    const nx = x * c - y * s, ny = x * s + y * c;
    x = nx; y = ny;
  }
})();
const tsin = (ph) => sine[ph >>> (32 - TABLE_BITS)];
const tcos = (ph) => sine[((ph >>> (32 - TABLE_BITS)) + TABLE_SIZE / 4) & (TABLE_SIZE - 1)];

export const DEMOD_IDLE = IDLE, DEMOD_SYNC = SYNC, DEMOD_DATA = DATA;

export class Demod {
  constructor(sampleRate, cb) {
    this.cb = cb;
    this.sampleRate = sampleRate;
    this.samplesPerMs = Math.floor(sampleRate / 1000 + 0.5);
    this.bitLen = sampleRate * P.SYMBOL_US / 1e6;
    this.bitLenNominal = this.bitLen;
    this.lastEdge = -1; this.predictedEdge = -1;
    let win = Math.floor(sampleRate * P.WINDOW_US / 1e6 + 0.5);
    if (win > MAX_WINDOW) win = MAX_WINDOW;
    if (win < 4) win = 4;
    this.window = win;

    // detectors: NUM_TONES data (index 0 = silence, no detector) + sync, plus the long sync.
    this.det = Array.from({ length: P.NUM_TONES + 1 }, () => ({ phase: 0, step: 0, i: 0, q: 0 }));
    for (let k = 0; k < P.NUM_TONES; k++) this.det[k].step = (Math.floor(P.TONES_HZ[k] / sampleRate * 4294967296)) >>> 0;
    this.det[SYNC_DET].step = (Math.floor(P.FSYNC_HZ / sampleRate * 4294967296)) >>> 0;
    this.syncLong = { phase: 0, step: this.det[SYNC_DET].step, i: 0, q: 0 };
    this.syncGainDecay = 1 - 1 / (P.SYNC_GAIN_TAU_S * sampleRate);
    this.silenceLevel = P.SILENCE_LEVEL;
    this.dominance = 3.0;
    this.syncMinRun = P.SYNC_MIN_MS * this.samplesPerMs;
    this.edgeAdjust = sampleRate * P.EDGE_ADJUST_US / 1e6;
    this.samplePoint = P.SAMPLE_POINT;
    this.gainDecay = 1 - 1 / (P.GAIN_TAU_S * sampleRate);
    const full = 32767 * 0.6366 * this.window * 32767;
    this.levelNorm = 1 / (full * full);
    const floorAmp = P.NOISE_FLOOR_LSB * 0.6366 * this.window * 32767;
    this.minEnergy = floorAmp * floorAmp;
    this.gain = new Float64Array(P.NUM_TONES).fill(this.minEnergy);
    this.syncGain = this.minEnergy;

    this.ring = new Int16Array(RING); this.ringPos = 0; this.n = 0;
    this.state = IDLE; this.syncRun = 0; this.nextDecision = 0; this.symbolIndex = 0;
    this.frame = new Uint8Array(P.FRAME_BYTES);
    this.energy = new Float64Array(P.NUM_TONES + 1);
    this.energySyncLong = 0;
    this.margin = new Float32Array(P.FRAME_BITS);
    this.syncPeak = 0;
    this.flywheelLeft = 0; this.flywheelFrames = 0; this.frames = 0;
  }

  detPush(dt, newS, oldS, window) {
    const oldPh = (dt.phase - ((window * dt.step) >>> 0)) >>> 0;
    dt.i += newS * tcos(dt.phase) - oldS * tcos(oldPh);
    dt.q += newS * tsin(dt.phase) - oldS * tsin(oldPh);
    dt.phase = (dt.phase + dt.step) >>> 0;
  }

  trackGains() {
    const gMin = this.minEnergy * 0.01;
    let gmax = 0;
    for (let k = 0; k < P.NUM_TONES; k++) {
      let g = this.gain[k] * this.gainDecay;
      if (this.energy[k] > g) g = this.energy[k];
      if (g < gMin) g = gMin;
      this.gain[k] = g;
      if (g > gmax) gmax = g;
    }
    const floor = gmax / P.GAIN_CLAMP;
    for (let k = 0; k < P.NUM_TONES; k++) if (this.gain[k] < floor) this.gain[k] = floor;
  }

  decideSymbol() {
    const nrm = new Float64Array(P.NUM_TONES);
    let best = 0;
    for (let k = 0; k < P.NUM_TONES; k++) {
      nrm[k] = P.TONES_HZ[k] === 0 ? this.silenceLevel : this.energy[k] / this.gain[k];
      if (nrm[k] > nrm[best]) best = k;
    }
    const base = this.symbolIndex * P.BITS_PER_SYMBOL;
    for (let b = 0; b < P.BITS_PER_SYMBOL; b++) {
      const shift = P.BITS_PER_SYMBOL - 1 - b;
      const bit = (best >> shift) & 1;
      if (bit) this.frame[(base + b) >> 3] |= 0x80 >> ((base + b) & 7);
      let m1 = 0, m0 = 0;
      for (let k = 0; k < P.NUM_TONES; k++) {
        if ((k >> shift) & 1) { if (nrm[k] > m1) m1 = nrm[k]; }
        else { if (nrm[k] > m0) m0 = nrm[k]; }
      }
      this.margin[base + b] = (m1 - m0) / (m1 + m0 + 1e-30);
    }
    this.symbolIndex++;
  }

  finishFrame() {
    this.frames++;
    if (this.cb) this.cb(this.frame, this.margin);
    this.state = IDLE;
  }

  startFrame(t0, realEdge) {
    const symbols = P.PHYS_US / P.SYMBOL_US;
    if (realEdge) this.flywheelLeft = FLYWHEEL_FRAMES;
    else { this.flywheelLeft--; this.flywheelFrames++; }
    this.predictedEdge = t0 + symbols * this.bitLen;
    this.nextDecision = t0 + this.samplePoint * this.bitLen - 1;
    this.symbolIndex = 0;
    this.frame.fill(0);
    this.syncRun = 0;
    this.state = DATA;
  }

  onMeasuredEdge(tMeas) {
    const symbols = P.PHYS_US / P.SYMBOL_US;
    if (this.predictedEdge < 0 || this.flywheelLeft <= 0) {
      if (this.lastEdge >= 0) {
        const interval = tMeas - this.lastEdge;
        const nominal = this.bitLenNominal * symbols;
        const r = interval / nominal;
        const k = Math.trunc(r + 0.5);
        if (k >= 1 && k <= 4 && r > k * 0.98 && r < k * 1.02) this.bitLen = interval / (k * symbols);
      }
      this.lastEdge = tMeas;
      this.startFrame(tMeas, true);
      return;
    }
    const err = tMeas - this.predictedEdge;
    if (err > 1.5 * this.bitLen || err < -1.5 * this.bitLen) { this.startFrame(this.predictedEdge, true); return; }
    if (this.syncPeak < 0.5 * this.syncGain) { this.startFrame(this.predictedEdge, true); return; }
    const t0 = this.predictedEdge + 0.5 * err;
    this.bitLen += 0.2 * err / symbols;
    this.lastEdge = t0;
    this.startFrame(t0, true);
  }

  maybeFlywheel() {
    if (this.predictedEdge < 0 || this.flywheelLeft <= 0) return;
    const tolerance = 0.5 * this.bitLen;
    if (this.n > this.predictedEdge + tolerance) this.startFrame(this.predictedEdge, false);
  }

  feed(samples, n = samples.length) {
    const W = this.window, WL = W * P.SYNC_WINDOW_MULT;
    const longScale = 1 / (P.SYNC_WINDOW_MULT * P.SYNC_WINDOW_MULT);
    for (let idx = 0; idx < n; idx++) {
      const s = samples[idx];
      const pos = this.ringPos;
      const old = this.ring[(pos - W + RING) % RING];
      const oldLong = this.ring[(pos - WL + RING) % RING];
      this.ring[pos] = s;
      this.ringPos = (pos + 1) % RING;

      let edata = 0;
      for (let k = 0; k <= P.NUM_TONES; k++) {
        if (k < P.NUM_TONES && P.TONES_HZ[k] === 0) { this.energy[k] = 0; continue; }
        this.detPush(this.det[k], s, old, W);
        const fi = this.det[k].i, fq = this.det[k].q;
        this.energy[k] = fi * fi + fq * fq;
        if (k < P.NUM_TONES && this.energy[k] > edata) edata = this.energy[k];
      }
      this.detPush(this.syncLong, s, oldLong, WL);
      this.energySyncLong = (this.syncLong.i * this.syncLong.i + this.syncLong.q * this.syncLong.q) * longScale;
      const es = this.energy[SYNC_DET];
      this.trackGains();
      { let g = this.syncGain * this.syncGainDecay; if (this.energySyncLong > g) g = this.energySyncLong; if (g < this.minEnergy) g = this.minEnergy; this.syncGain = g; }
      const dominant = (this.energySyncLong > this.dominance * edata) && (this.energySyncLong > this.minEnergy) && (this.energySyncLong > P.SYNC_MIN_REL * this.syncGain);
      if (dominant) this.syncRun++;
      else if (this.syncRun > 0) this.syncRun--;

      switch (this.state) {
        case IDLE:
          if (this.syncRun >= this.syncMinRun) { this.state = SYNC; this.syncPeak = es; }
          else this.maybeFlywheel();
          break;
        case SYNC:
          if (es > this.syncPeak) this.syncPeak = es;
          if (es < 0.25 * this.syncPeak) this.onMeasuredEdge(this.n - W / 2 + this.edgeAdjust);
          else this.maybeFlywheel();
          break;
        case DATA:
          if (this.syncRun >= this.syncMinRun) {
            const syncLen = this.sampleRate * P.SYNC_US / 1e6;
            if (this.predictedEdge >= 0 && this.flywheelLeft > 0 && this.n < this.predictedEdge - syncLen - 0.5 * this.bitLen) this.syncRun = 0;
            else { this.state = SYNC; this.syncPeak = es; }
            break;
          }
          if (this.n >= this.nextDecision) {
            this.decideSymbol();
            this.nextDecision += this.bitLen;
            if (this.symbolIndex >= P.SYMBOLS_PER_FRAME) this.finishFrame();
          }
          break;
      }
      this.n++;
    }
  }

  // { level (0..1), tone (-1 none, 0..NUM_TONES-1, NUM_TONES sync), state }
  status() {
    let best = -1, bestE = this.minEnergy, maxE = 0;
    for (let k = 0; k <= P.NUM_TONES; k++) {
      if (this.energy[k] > bestE) { bestE = this.energy[k]; best = k; }
      if (this.energy[k] > maxE) maxE = this.energy[k];
    }
    let lvl = maxE * this.levelNorm;
    lvl = lvl > 0 ? Math.min(1, Math.sqrt(lvl)) : 0;
    return { level: lvl, tone: best, state: this.state, frames: this.frames };
  }
}
