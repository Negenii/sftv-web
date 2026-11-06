(() => {
  // js/protocol/params.js
  var WIDTH = 400;
  var HEIGHT = 240;
  var LINE_BYTES = 50;
  var IMAGE_BYTES = LINE_BYTES * HEIGHT;
  var PAYLOAD_BYTES = 26;
  var SEG_BYTES = 25;
  var SEGS_PER_LINE = 2;
  var NUM_SEGS = HEIGHT * SEGS_PER_LINE;
  var META_NAME_OFFSET = 3;
  var NAME_MAX = PAYLOAD_BYTES - META_NAME_OFFSET;
  var META_CODED_FLAG = 32768;
  var META_START = 0;
  var META_END = 1;
  var META_PREVIEW = 2;
  var META_TINY = 3;
  var META_SCHEDULE = 4;
  var TINY_W = 40;
  var TINY_H = 20;
  var TINY_LINE_BYTES = 5;
  var TINY_BYTES = TINY_LINE_BYTES * TINY_H;
  var TINY_CHUNKS = 4;
  var PREVIEW_W = 80;
  var PREVIEW_H = 48;
  var PREVIEW_LINE_BYTES = 10;
  var PREVIEW_BYTES = PREVIEW_LINE_BYTES * PREVIEW_H;
  var PREVIEW_CHUNK = PAYLOAD_BYTES - 1;
  var PREVIEW_CHUNKS = Math.floor((PREVIEW_BYTES + PREVIEW_CHUNK - 1) / PREVIEW_CHUNK);
  var SCHEDULE_CHUNKS = 4;
  var MAX_CODED_BLOCKS = SCHEDULE_CHUNKS * PREVIEW_CHUNK;
  var INTRO_FRAMES = TINY_CHUNKS + PREVIEW_CHUNKS;
  var INTRO_FRAMES_CODED = INTRO_FRAMES + SCHEDULE_CHUNKS;
  var DATA_BYTES = 2 + PAYLOAD_BYTES + 1;
  var PARITY_BYTES = 16;
  var FRAME_BYTES = DATA_BYTES + PARITY_BYTES;
  var FRAME_BITS = FRAME_BYTES * 8;
  var ILEAVE = 4;
  var META_PAUSE = 5;
  var META_RESUME = 6;
  var META_NOTE_FLAG = 16384;
  var META_UTF8_FLAG = 8192;
  var NOTE_MAX_BYTES = 65535;
  var NOTE_MAX_CHARS = NOTE_MAX_BYTES;
  var NOTE_CHUNK = SEG_BYTES;
  var NOTE_MAX_FRAMES = Math.floor((Math.floor((NOTE_MAX_CHARS + NOTE_CHUNK - 1) / NOTE_CHUNK) + ILEAVE - 1) / ILEAVE) * ILEAVE;
  var NOTE_LEN_OFFSET = 3;
  var NOTE_NAME_OFFSET = 5;
  var NOTE_NAME_MAX = PAYLOAD_BYTES - NOTE_NAME_OFFSET;
  var BLOCK_PAYLOAD = ILEAVE * PAYLOAD_BYTES;
  var FT_RAW = 0;
  var FT_CODED = 1;
  var FT_META = 2;
  var FT_PARITY = 3;
  var FT_SHIFT = 14;
  var INDEX_MASK = 16383;
  var MAX_BLOCKS = Math.floor(HEIGHT / 2);
  var OUTER_GROUP = 108;
  var OUTER_PARITY = PARITY_BYTES;
  var MAX_DATA_FRAMES = ILEAVE + INTRO_FRAMES_CODED + NUM_SEGS;
  var OUTER_GROUPS_MAX = 1 + Math.floor((MAX_DATA_FRAMES + OUTER_GROUP - 1) / OUTER_GROUP);
  var MAX_FRAMES = MAX_DATA_FRAMES + OUTER_GROUPS_MAX * OUTER_PARITY + ILEAVE;
  var NOTE_MAX_TEXT_FRAMES = Math.ceil(Math.ceil(NOTE_MAX_BYTES / SEG_BYTES) / ILEAVE) * ILEAVE;
  var RX_MAX_DATA_FRAMES = ILEAVE + NOTE_MAX_TEXT_FRAMES;
  var RX_GROUPS_MAX = 1 + Math.floor((RX_MAX_DATA_FRAMES + OUTER_GROUP - 1) / OUTER_GROUP);
  var noteIntro = (dataFrames) => Math.min(dataFrames, OUTER_GROUP);
  var NUM_TONES = 4;
  var BITS_PER_SYMBOL = 2;
  var TONES_HZ = [0, 3e3, 3500, 4e3];
  var SILENCE_LEVEL = 0.3;
  var FSYNC_HZ = 5500;
  var SYMBOL_US = 4e3;
  var SYNC_US = 16e3;
  var WINDOW_US = 2e3;
  var SYNC_WINDOW_MULT = 4;
  var SAMPLE_POINT = 0.95;
  var EDGE_ADJUST_US = -300;
  var NOISE_FLOOR_LSB = 40;
  var GAIN_TAU_S = 0.5;
  var SYNC_GAIN_TAU_S = 3;
  var SYNC_MIN_REL = 0.15;
  var GAIN_CLAMP = 100;
  var SYNC_MIN_MS = 6;
  var BAND_HF = 1;
  var MAX_TONES = 8;
  var HF_NUM_TONES = 8;
  var HF_BITS_PER_SYMBOL = 3;
  var HF_TONES_HZ = [17e3, 17500, 18e3, 18500, 19e3, 19500, 2e4, 20500];
  var HF_HAS_SILENCE = false;
  var HF_FSYNC_HZ = 21e3;
  var HF_SYMBOL_US = 3e3;
  var HF_WINDOW_US = 2e3;
  var HF_NOISE_FLOOR_LSB = 5;
  var SYNC_DOMINANCE = 1.2;
  var LADDER_TONE_SYMBOLS = 50;
  var LADDER_GAP_SYMBOLS = 25;
  var LOCK_FRAMES = 3;
  var LOCK_MATCH_BITS = 66;
  var SYMBOLS_PER_FRAME = FRAME_BITS / BITS_PER_SYMBOL;
  var LEADER_SYMBOLS = (NUM_TONES - 1) * (LADDER_TONE_SYMBOLS + LADDER_GAP_SYMBOLS);
  var PHYS_US = SYNC_US + SYMBOLS_PER_FRAME * SYMBOL_US;
  var LINE_US = PHYS_US * SEGS_PER_LINE;
  var PREAMBLE_US = LEADER_SYMBOLS * SYMBOL_US + LOCK_FRAMES * PHYS_US;
  var CODEC_RAW = 0;
  var CODEC_RLE = 1;
  var CODEC_XOR_RLE = 2;
  var CODEC_MAX_RECORD = 1 + LINE_BYTES;
  var PASS_DATA = 0;
  var PASS_PARITY = 1;
  var PASS_END = 2;
  var bandSymbolUs = (band) => band === BAND_HF ? HF_SYMBOL_US : SYMBOL_US;
  var bandNumTones = (band) => band === BAND_HF ? HF_NUM_TONES : NUM_TONES;
  var bandBits = (band) => band === BAND_HF ? HF_BITS_PER_SYMBOL : BITS_PER_SYMBOL;
  var bandSymbolsPerFrame = (band) => Math.ceil(FRAME_BITS / bandBits(band));
  var HF_SYNC_SYMBOLS = 8;
  var HF_SYNC_PATTERN = [0, 4, 7, 3, 6, 2, 5, 1];
  var SYNC_SCORE_MIN = 0.45;
  var bandSyncUs = (band) => band === BAND_HF ? HF_SYNC_SYMBOLS * HF_SYMBOL_US : SYNC_US;
  var bandPhysUs = (band) => bandSyncUs(band) + bandSymbolsPerFrame(band) * bandSymbolUs(band);

  // js/protocol/demod.js
  var MAX_WINDOW = 128;
  var RING = MAX_WINDOW * SYNC_WINDOW_MULT;
  var TABLE_BITS = 10;
  var TABLE_SIZE = 1 << TABLE_BITS;
  var SYNC_DET = MAX_TONES;
  var FLYWHEEL_FRAMES = 3;
  var IDLE = 0;
  var SYNC = 1;
  var DATA = 2;
  var HIST = 64;
  var sine = new Int32Array(TABLE_SIZE);
  (function tableInit() {
    const twoPi = 6.283185307179586;
    const a = twoPi / TABLE_SIZE, a2 = a * a;
    const s = a * (1 - a2 / 6 * (1 - a2 / 20 * (1 - a2 / 42)));
    const c = 1 - a2 / 2 * (1 - a2 / 12 * (1 - a2 / 30));
    let x = 1, y = 0;
    for (let i = 0; i < TABLE_SIZE; i++) {
      sine[i] = Math.trunc(y * 32767 + (y >= 0 ? 0.5 : -0.5));
      const nx = x * c - y * s, ny = x * s + y * c;
      x = nx;
      y = ny;
    }
  })();
  var tsin = (ph) => sine[ph >>> 32 - TABLE_BITS];
  var tcos = (ph) => sine[(ph >>> 32 - TABLE_BITS) + TABLE_SIZE / 4 & TABLE_SIZE - 1];
  var Demod = class {
    constructor(sampleRate, cb) {
      this.cb = cb;
      this.sampleRate = sampleRate;
      this.samplesPerMs = Math.floor(sampleRate / 1e3 + 0.5);
      this.symbolUs = SYMBOL_US;
      this.bitLen = sampleRate * SYMBOL_US / 1e6;
      this.bitLenNominal = this.bitLen;
      this.lastEdge = -1;
      this.predictedEdge = -1;
      let win = Math.floor(sampleRate * WINDOW_US / 1e6 + 0.5);
      if (win > MAX_WINDOW) win = MAX_WINDOW;
      if (win < 4) win = 4;
      this.window = win;
      this.det = Array.from({ length: MAX_TONES + 1 }, () => ({ phase: 0, step: 0, i: 0, q: 0 }));
      this.numTones = NUM_TONES;
      this.bits = BITS_PER_SYMBOL;
      this.spf = SYMBOLS_PER_FRAME;
      this.firstDet = 1;
      for (let k = 0; k < NUM_TONES; k++) this.det[k].step = Math.floor(TONES_HZ[k] / sampleRate * 4294967296) >>> 0;
      this.det[SYNC_DET].step = Math.floor(FSYNC_HZ / sampleRate * 4294967296) >>> 0;
      this.syncLong = { phase: 0, step: this.det[SYNC_DET].step, i: 0, q: 0 };
      this.syncGainDecay = 1 - 1 / (SYNC_GAIN_TAU_S * sampleRate);
      this.silenceLevel = SILENCE_LEVEL;
      this.dominance = SYNC_DOMINANCE;
      this.syncMinRun = SYNC_MIN_MS * this.samplesPerMs;
      this.edgeAdjust = sampleRate * EDGE_ADJUST_US / 1e6;
      this.samplePoint = SAMPLE_POINT;
      this.gainDecay = 1 - 1 / (GAIN_TAU_S * sampleRate);
      const full = 32767 * 0.6366 * this.window * 32767;
      this.levelNorm = 1 / (full * full);
      const floorAmp = NOISE_FLOOR_LSB * 0.6366 * this.window * 32767;
      this.minEnergy = floorAmp * floorAmp;
      this.gain = new Float64Array(MAX_TONES).fill(this.minEnergy);
      this.syncGain = this.minEnergy;
      this.ring = new Int16Array(RING);
      this.ringPos = 0;
      this.n = 0;
      this.state = IDLE;
      this.syncRun = 0;
      this.nextDecision = 0;
      this.symbolIndex = 0;
      this.frame = new Uint8Array(FRAME_BYTES);
      this.energy = new Float64Array(MAX_TONES + 1);
      this.energySyncLong = 0;
      this.margin = new Float32Array(FRAME_BITS);
      this.syncPeak = 0;
      this.flywheelLeft = 0;
      this.flywheelFrames = 0;
      this.frames = 0;
      this.syncUs = SYNC_US;
      this.pattern = false;
      this.hop = 1;
      this.hopCount = 0;
      this.hopDecay = 1;
      this.shareHist = Array.from({ length: HIST }, () => new Float64Array(MAX_TONES));
      this.histPos = 0;
      this.score = 0;
      this.scorePrev = 0;
      this.scorePrev2 = 0;
      this.syncScore = 0;
      this.patternsSeen = 0;
    }
    detPush(dt, newS, oldS, window) {
      const oldPh = dt.phase - (window * dt.step >>> 0) >>> 0;
      dt.i += newS * tcos(dt.phase) - oldS * tcos(oldPh);
      dt.q += newS * tsin(dt.phase) - oldS * tsin(oldPh);
      dt.phase = dt.phase + dt.step >>> 0;
    }
    trackGains(decay = this.gainDecay) {
      const gMin = this.minEnergy * 0.01;
      let gmax = 0;
      for (let k = this.firstDet; k < this.numTones; k++) {
        let g = this.gain[k] * decay;
        if (this.energy[k] > g) g = this.energy[k];
        if (g < gMin) g = gMin;
        this.gain[k] = g;
        if (g > gmax) gmax = g;
      }
      const floor = gmax / GAIN_CLAMP;
      for (let k = this.firstDet; k < this.numTones; k++) if (this.gain[k] < floor) this.gain[k] = floor;
    }
    // Lazy data detectors for 8-FSK (mirror of block_energies in sstv_demod.c): correlate the data
    // tones over the last W ring samples instead of sliding 7 detectors per sample.
    blockEnergies() {
      const W2 = this.window;
      let pos = (this.ringPos - W2 + RING) % RING, edata = 0;
      const start = pos;
      for (let k = this.firstDet; k < this.numTones; k++) {
        let ph = 0, i = 0, q = 0;
        const step = this.det[k].step;
        pos = start;
        for (let t = 0; t < W2; t++) {
          const x = this.ring[pos];
          i += x * tcos(ph);
          q += x * tsin(ph);
          ph = ph + step >>> 0;
          if (++pos === RING) pos = 0;
        }
        this.energy[k] = i * i + q * q;
        if (this.energy[k] > edata) edata = this.energy[k];
      }
      if (this.firstDet) this.energy[0] = 0;
      this.edataLazy = edata;
    }
    decideSymbol() {
      if (this.lazy) this.blockEnergies();
      const nrm = new Float64Array(this.numTones);
      let best = 0;
      for (let k = 0; k < this.numTones; k++) {
        nrm[k] = k < this.firstDet ? this.silenceLevel : this.energy[k] / this.gain[k];
        if (nrm[k] > nrm[best]) best = k;
      }
      const base = this.symbolIndex * this.bits;
      for (let b = 0; b < this.bits; b++) {
        const shift = this.bits - 1 - b;
        if (base + b >= FRAME_BITS) break;
        const bit2 = best >> shift & 1;
        if (bit2) this.frame[base + b >> 3] |= 128 >> (base + b & 7);
        let m1 = 0, m0 = 0;
        for (let k = 0; k < this.numTones; k++) {
          if (k >> shift & 1) {
            if (nrm[k] > m1) m1 = nrm[k];
          } else {
            if (nrm[k] > m0) m0 = nrm[k];
          }
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
      const symbols = (this.syncUs + this.spf * this.symbolUs) / this.symbolUs;
      if (realEdge) this.flywheelLeft = FLYWHEEL_FRAMES;
      else {
        this.flywheelLeft--;
        this.flywheelFrames++;
      }
      this.predictedEdge = t0 + symbols * this.bitLen;
      this.nextDecision = t0 + this.samplePoint * this.bitLen - 1;
      this.symbolIndex = 0;
      this.frame.fill(0);
      this.syncRun = 0;
      this.state = DATA;
    }
    // Retunes the detectors to BAND_AUDIBLE (default) or BAND_HF; mirror of sstv_demod_set_band.
    setBand(band) {
      const tones = band === BAND_HF ? HF_TONES_HZ : TONES_HZ;
      this.numTones = bandNumTones(band);
      this.bits = bandBits(band);
      this.spf = bandSymbolsPerFrame(band);
      this.lazy = this.numTones > NUM_TONES;
      this.lazyCount = 0;
      this.edataLazy = 0;
      this.firstDet = band === BAND_HF && !HF_HAS_SILENCE ? 0 : 1;
      for (let k = 0; k < MAX_TONES; k++) this.det[k].step = Math.floor((tones[k] || 0) / this.sampleRate * 4294967296) >>> 0;
      const fsync = band === BAND_HF ? HF_FSYNC_HZ : FSYNC_HZ;
      this.det[SYNC_DET].step = Math.floor(fsync / this.sampleRate * 4294967296) >>> 0;
      this.syncLong.step = this.det[SYNC_DET].step;
      this.window = Math.max(4, Math.floor(this.sampleRate * (band === BAND_HF ? HF_WINDOW_US : WINDOW_US) / 1e6 + 0.5));
      {
        const full = 32767 * 0.6366 * this.window * 32767;
        this.levelNorm = 1 / (full * full);
      }
      this.gainDecayBlock = Math.pow(this.gainDecay, this.window);
      const floorLsb = band === BAND_HF ? HF_NOISE_FLOOR_LSB : NOISE_FLOOR_LSB;
      const floorAmp = floorLsb * 0.6366 * this.window * 32767;
      this.minEnergy = floorAmp * floorAmp;
      this.gain.fill(this.minEnergy);
      this.syncGain = this.minEnergy;
      this.band = band;
      this.symbolUs = bandSymbolUs(band);
      this.bitLen = this.sampleRate * this.symbolUs / 1e6;
      this.bitLenNominal = this.bitLen;
      this.syncUs = bandSyncUs(band);
      this.pattern = band === BAND_HF;
      this.hop = Math.max(1, Math.trunc(this.window / 2));
      this.hopCount = 0;
      this.hopDecay = Math.pow(this.gainDecay, this.hop);
      if (this.pattern) this.edgeAdjust = 0;
    }
    // Pattern sync: one hop (mirror of pattern_hop in sstv_demod.c).
    patternHop() {
      this.blockEnergies();
      this.trackGains(this.hopDecay);
      const nrm = new Float64Array(MAX_TONES);
      let sum = 0, heard = false;
      for (let k = 0; k < this.numTones; k++) {
        nrm[k] = this.energy[k] / this.gain[k];
        sum += nrm[k];
        if (this.energy[k] > this.minEnergy) heard = true;
      }
      const row = this.shareHist[this.histPos];
      for (let k = 0; k < MAX_TONES; k++) row[k] = heard && sum > 0 && k < this.numTones ? nrm[k] / sum : 0;
      let sc = 0;
      for (let k = 0; k < HF_SYNC_SYMBOLS; k++) {
        const back = Math.trunc((HF_SYNC_SYMBOLS - 1 - k) * this.bitLen / this.hop + 0.5);
        if (back >= HIST) {
          sc = 0;
          break;
        }
        sc += this.shareHist[(this.histPos - back + HIST) % HIST][HF_SYNC_PATTERN[k]];
      }
      sc /= HF_SYNC_SYMBOLS;
      this.histPos = (this.histPos + 1) % HIST;
      this.scorePrev2 = this.scorePrev;
      this.scorePrev = this.score;
      this.score = sc;
      if (this.state === DATA) return;
      if (this.scorePrev >= SYNC_SCORE_MIN && this.scorePrev >= this.scorePrev2 && this.scorePrev > this.score) {
        const y0 = this.scorePrev2, y1 = this.scorePrev, y2 = this.score, den = y0 - 2 * y1 + y2;
        let delta = den < 0 ? 0.5 * (y0 - y2) / den : 0;
        delta = Math.max(-1, Math.min(1, delta));
        const tCenter = this.n - this.hop + delta * this.hop;
        const t0 = tCenter + 0.5 * (this.bitLen - this.window) + 1 + this.edgeAdjust;
        this.syncScore = this.scorePrev;
        this.patternsSeen++;
        this.onMeasuredEdge(t0);
      }
    }
    onMeasuredEdge(tMeas) {
      const symbols = (this.syncUs + this.spf * this.symbolUs) / this.symbolUs;
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
      if (err > 1.5 * this.bitLen || err < -1.5 * this.bitLen) {
        if (!this.pattern) this.startFrame(this.predictedEdge, true);
        return;
      }
      if (!this.pattern && this.syncPeak < 0.5 * this.syncGain) {
        this.startFrame(this.predictedEdge, true);
        return;
      }
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
      if (this.pattern) {
        for (let idx = 0; idx < n; idx++) {
          this.ring[this.ringPos] = samples[idx];
          this.ringPos = (this.ringPos + 1) % RING;
          if (++this.hopCount >= this.hop) {
            this.hopCount = 0;
            this.patternHop();
          }
          if (this.state === DATA) {
            if (this.n >= this.nextDecision) {
              this.decideSymbol();
              this.nextDecision += this.bitLen;
              if (this.symbolIndex >= this.spf) this.finishFrame();
            }
          } else this.maybeFlywheel();
          this.n++;
        }
        return;
      }
      const W2 = this.window, WL = W2 * SYNC_WINDOW_MULT;
      const longScale = 1 / (SYNC_WINDOW_MULT * SYNC_WINDOW_MULT);
      for (let idx = 0; idx < n; idx++) {
        const s = samples[idx];
        const pos = this.ringPos;
        const old = this.ring[(pos - W2 + RING) % RING];
        const oldLong = this.ring[(pos - WL + RING) % RING];
        this.ring[pos] = s;
        this.ringPos = (pos + 1) % RING;
        let edata = 0;
        if (this.lazy) {
          if (++this.lazyCount >= W2) {
            this.lazyCount = 0;
            this.blockEnergies();
            this.trackGains(this.gainDecayBlock);
          }
          edata = this.edataLazy;
        } else {
          if (this.firstDet) this.energy[0] = 0;
          for (let k = this.firstDet; k < this.numTones; k++) {
            this.detPush(this.det[k], s, old, W2);
            const fi = this.det[k].i, fq = this.det[k].q;
            this.energy[k] = fi * fi + fq * fq;
            if (this.energy[k] > edata) edata = this.energy[k];
          }
        }
        {
          const sd = this.det[SYNC_DET];
          this.detPush(sd, s, old, W2);
          this.energy[SYNC_DET] = sd.i * sd.i + sd.q * sd.q;
        }
        this.detPush(this.syncLong, s, oldLong, WL);
        this.energySyncLong = (this.syncLong.i * this.syncLong.i + this.syncLong.q * this.syncLong.q) * longScale;
        const es = this.energy[SYNC_DET];
        if (!this.lazy) this.trackGains();
        {
          let g = this.syncGain * this.syncGainDecay;
          if (this.energySyncLong > g) g = this.energySyncLong;
          if (g < this.minEnergy) g = this.minEnergy;
          this.syncGain = g;
        }
        const dominant = this.energySyncLong > this.dominance * edata && this.energySyncLong > this.minEnergy && this.energySyncLong > SYNC_MIN_REL * this.syncGain;
        if (dominant) this.syncRun++;
        else if (this.syncRun > 0) this.syncRun--;
        switch (this.state) {
          case IDLE:
            if (this.syncRun >= this.syncMinRun) {
              this.state = SYNC;
              this.syncPeak = es;
            } else this.maybeFlywheel();
            break;
          case SYNC:
            if (es > this.syncPeak) this.syncPeak = es;
            if (es < 0.25 * this.syncPeak) this.onMeasuredEdge(this.n - W2 / 2 + this.edgeAdjust);
            else this.maybeFlywheel();
            break;
          case DATA:
            if (this.syncRun >= this.syncMinRun) {
              const syncLen = this.sampleRate * SYNC_US / 1e6;
              if (this.predictedEdge >= 0 && this.flywheelLeft > 0 && this.n < this.predictedEdge - syncLen - 0.5 * this.bitLen) this.syncRun = 0;
              else {
                this.state = SYNC;
                this.syncPeak = es;
              }
              break;
            }
            if (this.n >= this.nextDecision) {
              this.decideSymbol();
              this.nextDecision += this.bitLen;
              if (this.symbolIndex >= this.spf) this.finishFrame();
            }
            break;
        }
        this.n++;
      }
    }
    // { level (0..1), tone (-1 none, 0..numTones-1 data, SYNC_DET sync), state }
    status() {
      let best = -1, bestE = this.minEnergy, maxE = 0;
      for (let k = 0; k <= SYNC_DET; k++) {
        if (k >= this.numTones && k !== SYNC_DET) continue;
        if (this.energy[k] > bestE) {
          bestE = this.energy[k];
          best = k;
        }
        if (this.energy[k] > maxE) maxE = this.energy[k];
      }
      let lvl = maxE * this.levelNorm;
      lvl = lvl > 0 ? Math.min(1, Math.sqrt(lvl)) : 0;
      return { level: lvl, tone: best, state: this.state, frames: this.frames };
    }
  };

  // js/protocol/crc8.js
  function crc8(data, len = data.length) {
    let crc = 0;
    for (let i = 0; i < len; i++) {
      crc ^= data[i];
      for (let b = 0; b < 8; b++) {
        crc = crc & 128 ? (crc << 1 ^ 7) & 255 : crc << 1 & 255;
      }
    }
    return crc;
  }

  // js/protocol/rs.js
  var RS_PARITY = PARITY_BYTES;
  var gfExp = new Uint8Array(512);
  var gfLog = new Uint8Array(256);
  var gen = new Uint8Array(RS_PARITY + 1);
  var ready = false;
  function tablesInit() {
    if (ready) return;
    let x = 1;
    for (let i = 0; i < 255; i++) {
      gfExp[i] = x;
      gfLog[x] = i;
      x <<= 1;
      if (x & 256) x ^= 285;
    }
    for (let i = 255; i < 512; i++) gfExp[i] = gfExp[i - 255];
    gfLog[0] = 0;
    const g = new Uint8Array(RS_PARITY + 1);
    let deg = 0;
    g[0] = 1;
    for (let i = 0; i < RS_PARITY; i++) {
      const r = gfPow(i);
      const ng = new Uint8Array(RS_PARITY + 1);
      ng[0] = g[0];
      for (let j = 1; j <= deg; j++) ng[j] = g[j] ^ gfMul(r, g[j - 1]);
      ng[deg + 1] = gfMul(r, g[deg]);
      deg++;
      for (let j = 0; j <= deg; j++) g[j] = ng[j];
    }
    gen.set(g);
    ready = true;
  }
  function gfMul(a, b) {
    return a === 0 || b === 0 ? 0 : gfExp[gfLog[a] + gfLog[b]];
  }
  function gfDiv(a, b) {
    return a === 0 ? 0 : gfExp[gfLog[a] + 255 - gfLog[b]];
  }
  function gfPow(e) {
    e %= 255;
    if (e < 0) e += 255;
    return gfExp[e];
  }
  function gfInv(a) {
    return gfExp[255 - gfLog[a]];
  }
  function polyEval(p, n, x) {
    let y = 0;
    for (let i = 0; i < n; i++) y = gfMul(y, x) ^ p[i];
    return y;
  }
  function rsDecodeErasures(block, n, erasures = null, numErasures = 0) {
    tablesInit();
    if (n <= RS_PARITY || n > 255) return -1;
    if (numErasures < 0 || numErasures > RS_PARITY) return -1;
    const S = new Uint8Array(RS_PARITY);
    let nonzero = 0;
    for (let i = 0; i < RS_PARITY; i++) {
      S[i] = polyEval(block, n, gfPow(i));
      if (S[i]) nonzero = 1;
    }
    if (!nonzero) return 0;
    const G = new Uint8Array(RS_PARITY + 1);
    G[0] = 1;
    let e = 0;
    for (let j = 0; j < numErasures; j++) {
      const k = erasures[j];
      if (k < 0 || k >= n) return -1;
      let dup = 0;
      for (let q = 0; q < j; q++) dup |= erasures[q] === k ? 1 : 0;
      if (dup) continue;
      const X = gfPow(n - 1 - k);
      for (let d = e + 1; d > 0; d--) G[d] ^= gfMul(G[d - 1], X);
      e++;
    }
    const Xi = new Uint8Array(RS_PARITY);
    for (let i = 0; i < RS_PARITY; i++)
      for (let j = 0; j <= e && i + j < RS_PARITY; j++) Xi[i + j] ^= gfMul(S[i], G[j]);
    const C = new Uint8Array(RS_PARITY + 1), B = new Uint8Array(RS_PARITY + 1), T = new Uint8Array(RS_PARITY + 1);
    C[0] = 1;
    B[0] = 1;
    let L = 0, m = 1, b = 1;
    const nsyn = RS_PARITY - e;
    for (let k = 0; k < nsyn; k++) {
      let d = Xi[e + k];
      for (let i = 1; i <= L; i++) d ^= gfMul(C[i], Xi[e + k - i]);
      if (d === 0) {
        m++;
      } else if (2 * L <= k) {
        T.set(C);
        const coef = gfDiv(d, b);
        for (let i = m; i <= RS_PARITY; i++) C[i] ^= gfMul(coef, B[i - m]);
        L = k + 1 - L;
        B.set(T);
        b = d;
        m = 1;
      } else {
        const coef = gfDiv(d, b);
        for (let i = m; i <= RS_PARITY; i++) C[i] ^= gfMul(coef, B[i - m]);
        m++;
      }
    }
    if (2 * L + e > RS_PARITY) return -1;
    const Psi = new Uint8Array(2 * RS_PARITY + 2);
    for (let i = 0; i <= L; i++) for (let j = 0; j <= e; j++) Psi[i + j] ^= gfMul(C[i], G[j]);
    const deg = L + e;
    const pos = [];
    for (let k = 0; k < n; k++) {
      let xinv = gfPow(-(n - 1 - k));
      let v = 0, xp = 1;
      for (let i = 0; i <= deg; i++) {
        v ^= gfMul(Psi[i], xp);
        xp = gfMul(xp, xinv);
      }
      if (v === 0) {
        if (pos.length >= RS_PARITY) return -1;
        pos.push(k);
      }
    }
    if (pos.length !== deg) return -1;
    const Om = new Uint8Array(RS_PARITY);
    for (let i = 0; i < RS_PARITY; i++) for (let j = 0; j <= L && i + j < RS_PARITY; j++) Om[i + j] ^= gfMul(Xi[i], C[j]);
    let corrected = 0;
    for (let q = 0; q < pos.length; q++) {
      const k = pos[q];
      const X = gfPow(n - 1 - k);
      const xinv = gfInv(X);
      let om = 0, xp = 1;
      for (let i = 0; i < RS_PARITY; i++) {
        om ^= gfMul(Om[i], xp);
        xp = gfMul(xp, xinv);
      }
      let dl = 0;
      xp = 1;
      for (let i = 1; i <= deg; i += 2) {
        dl ^= gfMul(Psi[i], xp);
        xp = gfMul(xp, gfMul(xinv, xinv));
      }
      if (dl === 0) return -1;
      const Y = gfMul(X, gfDiv(om, dl));
      if (Y) corrected++;
      block[k] ^= Y;
    }
    for (let i = 0; i < RS_PARITY; i++) if (polyEval(block, n, gfPow(i)) !== 0) return -1;
    return corrected;
  }

  // js/protocol/codec.js
  var ROW_BITS = LINE_BYTES * 8;
  function rleDecode(inBuf, len, row) {
    row.fill(0, 0, LINE_BYTES);
    let i = 0, colour = 0;
    for (let k = 0; k < len; k++) {
      const run = inBuf[k];
      if (i + run > ROW_BITS) return -1;
      if (colour) for (let b = 0; b < run; b++) row[i + b >> 3] |= 128 >> (i + b & 7);
      i += run;
      if (run === 255) {
        if (k + 1 >= len || inBuf[k + 1] !== 0) return -1;
        k++;
        continue;
      }
      colour ^= 1;
    }
    return i === ROW_BITS ? 0 : -1;
  }
  function codecDecode(inBuf, inOff, avail, ref, row) {
    if (avail < 1) return -1;
    const mode = inBuf[inOff] >> 6;
    const len = inBuf[inOff] & 63;
    if (len === 0 || avail < 1 + len) return -1;
    if (mode === CODEC_RAW) {
      if (len !== LINE_BYTES) return -1;
      for (let i = 0; i < LINE_BYTES; i++) row[i] = inBuf[inOff + 1 + i];
      return 1 + len;
    }
    if (rleDecode(inBuf.subarray(inOff + 1, inOff + 1 + len), len, row) < 0) return -1;
    if (mode === CODEC_XOR_RLE) {
      if (!ref) return -1;
      for (let i = 0; i < LINE_BYTES; i++) row[i] ^= ref[i];
    } else if (mode !== CODEC_RLE) return -1;
    return 1 + len;
  }

  // js/protocol/frame.js
  var hdr = (type, index) => (type << FT_SHIFT | index & INDEX_MASK) & 65535;
  var hdrType = (h) => h >> FT_SHIFT;
  var hdrIndex = (h) => h & INDEX_MASK;
  var segLine = (seg) => Math.floor(seg / SEGS_PER_LINE);
  var segByteOffset = (seg) => seg % SEGS_PER_LINE * SEG_BYTES;
  function check(buf) {
    const h = buf[0] << 8 | buf[1];
    if (crc8(buf, DATA_BYTES - 1) !== buf[DATA_BYTES - 1]) return null;
    const type = hdrType(h), index = hdrIndex(h);
    if (type === FT_RAW && !(index < NOTE_MAX_TEXT_FRAMES)) return null;
    if (type === FT_CODED && !(index < MAX_BLOCKS)) return null;
    if (type === FT_PARITY && !(index < RX_GROUPS_MAX * OUTER_PARITY)) return null;
    if (type !== FT_RAW && type !== FT_CODED && type !== FT_PARITY && type !== FT_META) return null;
    const payload = buf.slice(2, 2 + PAYLOAD_BYTES);
    return { h, payload };
  }
  function unpackSoft(inBuf, off, byteConf) {
    let order = null;
    if (byteConf) {
      order = [];
      for (let i = 0; i < FRAME_BYTES; i++) {
        let j = order.length;
        order.push(i);
        while (j > 0 && byteConf[order[j - 1]] > byteConf[i]) {
          order[j] = order[j - 1];
          j--;
        }
        order[j] = i;
      }
    }
    const maxE = byteConf ? PARITY_BYTES : 0;
    const buf = new Uint8Array(FRAME_BYTES);
    for (let e = 0; e <= maxE; e += 2) {
      for (let i = 0; i < FRAME_BYTES; i++) buf[i] = inBuf[off + i];
      const c = rsDecodeErasures(buf, FRAME_BYTES, order, e);
      if (c >= 0) {
        const r2 = check(buf);
        if (r2) return { ok: true, h: r2.h, payload: r2.payload, corrected: c };
      }
    }
    const r = check(inBuf.subarray(off, off + FRAME_BYTES)) || { h: inBuf[off] << 8 | inBuf[off + 1], payload: inBuf.slice(off + 2, off + 2 + PAYLOAD_BYTES) };
    return { ok: false, h: r.h, payload: r.payload, corrected: -1 };
  }
  function deinterleave(physical, off, logical) {
    for (let i = 0; i < ILEAVE; i++)
      for (let j = 0; j < FRAME_BYTES; j++)
        logical[i * FRAME_BYTES + j] = physical[off + j * ILEAVE + i];
  }
  function deinterleaveConf(physConf, logConf) {
    for (let i = 0; i < ILEAVE; i++)
      for (let j = 0; j < FRAME_BYTES; j++)
        logConf[i * FRAME_BYTES + j] = physConf[j * ILEAVE + i];
  }
  function blockUnpack(payload, off, validBytes, cb) {
    if (validBytes < 2) return 0;
    const count = payload[off], line = payload[off + 1];
    let pos = 2, delivered = 0;
    const prev = new Uint8Array(LINE_BYTES), row = new Uint8Array(LINE_BYTES);
    let ref = null;
    for (let k = 0; k < count && line + k < HEIGHT; k++) {
      if (pos + 1 > validBytes) break;
      const n = codecDecode(payload, off + pos, BLOCK_PAYLOAD - pos, ref, row);
      if (n < 0 || pos + n > validBytes) break;
      pos += n;
      cb(line + k, row);
      delivered++;
      prev.set(row);
      ref = prev;
    }
    return delivered;
  }
  var passIntro = (coded) => ILEAVE + (coded ? INTRO_FRAMES_CODED : INTRO_FRAMES);
  function passPosition(h, i) {
    const type = hdrType(h), index = hdrIndex(h);
    if (type === FT_RAW) return ILEAVE + INTRO_FRAMES + index;
    if (type === FT_CODED) return (index + 1) * ILEAVE + i;
    return -1;
  }
  function passMetaPosition(subtype, index, i) {
    switch (subtype) {
      case META_START:
        return i;
      case META_TINY:
        return ILEAVE + index;
      case META_PREVIEW:
        return ILEAVE + TINY_CHUNKS + index;
      case META_SCHEDULE:
        return ILEAVE + INTRO_FRAMES + index;
      default:
        return -1;
    }
  }
  function passGroups(dataFrames, intro) {
    if (dataFrames <= intro) return 1;
    return 1 + Math.floor((dataFrames - intro + OUTER_GROUP - 1) / OUTER_GROUP);
  }
  function passGroupSize(dataFrames, intro, g) {
    if (g === 0) return dataFrames < intro ? dataFrames : intro;
    const start = intro + (g - 1) * OUTER_GROUP;
    const left = dataFrames - start;
    if (left <= 0) return 0;
    return left < OUTER_GROUP ? left : OUTER_GROUP;
  }
  var passGroupBase = (intro, g) => g === 0 ? 0 : intro + (g - 1) * OUTER_GROUP;
  var passGroupOf = (pos, intro) => pos < intro ? 0 : 1 + Math.floor((pos - intro) / OUTER_GROUP);
  function passTotal(dataFrames, intro) {
    return dataFrames + passGroups(dataFrames, intro) * OUTER_PARITY + ILEAVE;
  }
  function passFrameKind(phys, dataFrames, intro) {
    let at = 0;
    for (let g = 0; g < passGroups(dataFrames, intro); g++) {
      const n = passGroupSize(dataFrames, intro, g);
      if (phys < at + n) return PASS_DATA;
      if (phys < at + n + OUTER_PARITY) return PASS_PARITY;
      at += n + OUTER_PARITY;
    }
    return PASS_END;
  }
  function passDataBefore(phys, dataFrames, intro) {
    let at = 0, data = 0;
    for (let g = 0; g < passGroups(dataFrames, intro); g++) {
      const n = passGroupSize(dataFrames, intro, g);
      if (phys <= at + n) return data + (phys - at);
      data += n;
      at += n + OUTER_PARITY;
      if (phys <= at) return data;
    }
    return data;
  }
  function lockFrame() {
    const out = new Uint8Array(FRAME_BYTES);
    let x = 24442;
    for (let i = 0; i < FRAME_BYTES; i++) {
      x = Math.imul(x, 1103515245) + 12345 >>> 0;
      out[i] = x >>> 16 & 255;
    }
    return out;
  }
  var LOCK = lockFrame();
  function lockDistance(frame) {
    let diff = 0;
    for (let i = 0; i < FRAME_BYTES; i++) {
      let x = LOCK[i] ^ frame[i];
      while (x) {
        diff += x & 1;
        x >>= 1;
      }
    }
    return diff;
  }
  function isLockFrame(frame) {
    return lockDistance(frame) <= LOCK_MATCH_BITS;
  }

  // js/protocol/rx.js
  var Rx = class {
    constructor({ onPixels, onMeta, onPreview, onNote, onControl } = {}) {
      this.onPixels = onPixels;
      this.onMeta = onMeta;
      this.onPreview = onPreview;
      this.onNote = onNote;
      this.onControl = onControl;
      this.note = false;
      this.noteUtf8 = false;
      this.noteLen = 0;
      this.anim = false;
      this.merged = false;
      this.lastStart = null;
      this.phys = new Uint8Array(ILEAVE * FRAME_BYTES);
      this.conf = new Float32Array(ILEAVE * FRAME_BYTES);
      this.count = 0;
      this.framesIn = 0;
      this.blocksOk = 0;
      this.framesOk = 0;
      this.framesBad = 0;
      this.rsCorrected = 0;
      this.coded = false;
      this.data = Array.from({ length: RX_MAX_DATA_FRAMES }, () => new Uint8Array(PAYLOAD_BYTES));
      this.have = new Uint8Array(RX_MAX_DATA_FRAMES);
      this.parity = Array.from({ length: RX_GROUPS_MAX }, () => Array.from({ length: OUTER_PARITY }, () => new Uint8Array(PAYLOAD_BYTES)));
      this.haveParity = Array.from({ length: RX_GROUPS_MAX }, () => new Uint8Array(OUTER_PARITY));
      this.groupDone = new Uint8Array(RX_GROUPS_MAX);
      this.dataFrames = 0;
      this.passOpen = false;
      this.framesRepaired = 0;
      this.groupsRepaired = 0;
      this.repairsFailed = 0;
      this.startPass();
    }
    startPass() {
      this.have.fill(0);
      for (const g of this.haveParity) g.fill(0);
      this.groupDone.fill(0);
      this.dataFrames = 0;
    }
    // forget the last START: the next pass opens fresh even if it resends the same animation
    // (call once an animation arrived complete, or the user deleted or cleared it); sstv_rx_forget
    forget() {
      this.lastStart = null;
    }
    resetCounters() {
      this.framesIn = this.blocksOk = this.framesOk = this.framesBad = this.rsCorrected = 0;
      this.framesRepaired = this.groupsRepaired = this.repairsFailed = 0;
    }
    byteConfidence(soft, conf, off) {
      for (let j = 0; j < FRAME_BYTES; j++) {
        let c = 1;
        for (let b = 0; b < 8; b++) {
          let m = soft[j * 8 + b];
          if (m < 0) m = -m;
          if (m < c) c = m;
        }
        conf[off + j] = c;
      }
    }
    dataFramesFromTotal(total, coded, note) {
      if (note) {
        for (let d = 1; d <= RX_MAX_DATA_FRAMES; d++) if (passTotal(d, noteIntro(d)) === total) return d;
        return 0;
      }
      const intro = passIntro(coded);
      for (let d = 1; d <= RX_MAX_DATA_FRAMES; d++) if (passTotal(d, intro) === total) return d;
      return 0;
    }
    rxIntro() {
      return this.note ? noteIntro(this.dataFrames) : passIntro(this.coded);
    }
    headerForPosition(pos) {
      if (pos < ILEAVE) return hdr(FT_META, 0);
      if (this.note) return hdr(FT_RAW, pos - ILEAVE);
      if (pos < ILEAVE + TINY_CHUNKS) return hdr(FT_META, pos - ILEAVE);
      if (pos < ILEAVE + INTRO_FRAMES) return hdr(FT_META, pos - ILEAVE - TINY_CHUNKS);
      if (this.coded) {
        if (pos < ILEAVE + INTRO_FRAMES_CODED) return hdr(FT_META, pos - ILEAVE - INTRO_FRAMES);
        return hdr(FT_CODED, Math.floor(pos / ILEAVE) - 1);
      }
      return hdr(FT_RAW, pos - ILEAVE - INTRO_FRAMES);
    }
    codedBlockUnpack(index) {
      const base = (index + 1) * ILEAVE;
      if (base < 0 || base + ILEAVE > RX_MAX_DATA_FRAMES) return;
      let valid = 0;
      while (valid < ILEAVE && this.have[base + valid]) valid++;
      if (valid === 0) return;
      const buf = new Uint8Array(BLOCK_PAYLOAD);
      for (let i = 0; i < ILEAVE; i++) buf.set(this.data[base + i], i * PAYLOAD_BYTES);
      blockUnpack(buf, 0, valid * PAYLOAD_BYTES, (line, row) => {
        if (this.onPixels) this.onPixels(line, 0, LINE_BYTES, row);
      });
    }
    store(pos, payload) {
      if (pos < 0 || pos >= RX_MAX_DATA_FRAMES) return;
      this.data[pos].set(payload.subarray(0, PAYLOAD_BYTES));
      this.have[pos] = 1;
      const g = passGroupOf(pos, this.rxIntro());
      if (g < RX_GROUPS_MAX && !this.groupDone[g]) {
        for (let j = 0; j < OUTER_PARITY; j++) if (this.haveParity[g][j]) {
          this.tryRepair(g);
          break;
        }
      }
    }
    handleFrame(h, payload, i, announce) {
      const type = hdrType(h), index = hdrIndex(h);
      if (type === FT_PARITY) {
        const g = Math.floor(index / OUTER_PARITY), j = index % OUTER_PARITY;
        if (g >= RX_GROUPS_MAX) return;
        this.parity[g][j].set(payload.subarray(0, PAYLOAD_BYTES));
        this.haveParity[g][j] = 1;
        this.tryRepair(g);
        return;
      }
      if (type === FT_META) {
        const sub = payload[0];
        if (sub === META_PREVIEW || sub === META_TINY || sub === META_SCHEDULE) {
          const layer = sub === META_TINY ? 0 : sub === META_PREVIEW ? 1 : 2;
          const totals = [TINY_BYTES, PREVIEW_BYTES, MAX_CODED_BLOCKS];
          const chunks = [TINY_CHUNKS, PREVIEW_CHUNKS, SCHEDULE_CHUNKS];
          if (sub === META_SCHEDULE) this.coded = true;
          if (index >= chunks[layer]) return;
          let nb = totals[layer] - index * PREVIEW_CHUNK;
          if (nb > PREVIEW_CHUNK) nb = PREVIEW_CHUNK;
          if (this.onPreview) this.onPreview(layer, index, nb, payload.subarray(1, 1 + nb));
        } else if (sub === META_START || sub === META_END) {
          const word = (payload[1] | payload[2] << 8) & 65535;
          const coded = (word & META_CODED_FLAG) !== 0;
          const note = (word & META_NOTE_FLAG) !== 0;
          const utf8 = (word & META_UTF8_FLAG) !== 0;
          const total = word & ~(META_CODED_FLAG | META_NOTE_FLAG | META_UTF8_FLAG);
          this.note = note;
          this.anim = note && coded;
          const codedPic = this.anim ? false : coded;
          if (note) {
            this.noteUtf8 = utf8;
            this.noteLen = payload[NOTE_LEN_OFFSET] | payload[NOTE_LEN_OFFSET + 1] << 8;
          }
          if (sub === META_START && announce) {
            const same = this.lastStart && this.lastStart.every((v, k) => v === payload[k]);
            this.merged = this.anim && !!same;
            if (!this.merged) this.startPass();
            this.lastStart = payload.slice(0, PAYLOAD_BYTES);
            this.passOpen = true;
            this.coded = codedPic;
          }
          if (sub === META_END) this.passOpen = false;
          this.dataFrames = this.dataFramesFromTotal(total, coded, note);
          if (sub === META_END) for (let g = 0; g < RX_GROUPS_MAX; g++) this.tryRepair(g);
          if (announce && this.onMeta) {
            const noff = note ? NOTE_NAME_OFFSET : META_NAME_OFFSET;
            const nmax = note ? NOTE_NAME_MAX : NAME_MAX;
            const nb = payload.subarray(noff, noff + nmax);
            let z = nb.indexOf(0);
            if (z < 0) z = nmax;
            const name2 = new TextDecoder().decode(nb.subarray(0, z));
            this.onMeta(name2, sub === META_END, total, coded, note);
          }
        } else if (sub === META_PAUSE || sub === META_RESUME) {
          if (this.onControl) this.onControl(sub, (payload[1] | payload[2] << 8) >>> 0);
          return;
        } else return;
        this.store(passMetaPosition(sub, index, i), payload);
      } else if (type === FT_RAW) {
        if (this.note) {
          if (this.onNote) this.onNote(index, NOTE_CHUNK, payload.subarray(0, NOTE_CHUNK));
          this.store(ILEAVE + index, payload);
        } else {
          this.coded = false;
          if (this.onPixels) this.onPixels(segLine(index), segByteOffset(index), SEG_BYTES, payload.subarray(0, SEG_BYTES));
          this.store(passPosition(h, i), payload);
        }
      } else if (type === FT_CODED) {
        this.coded = true;
        this.store(passPosition(h, i), payload);
      }
    }
    tryRepair(g) {
      if (g >= RX_GROUPS_MAX || this.groupDone[g]) return;
      const intro = this.rxIntro();
      const n = this.dataFrames > 0 ? passGroupSize(this.dataFrames, intro, g) : g === 0 ? intro : OUTER_GROUP;
      if (n <= 0) return;
      const base = passGroupBase(intro, g);
      const erasures = [];
      let missingData = 0;
      for (let p = 0; p < n; p++) if (!this.have[base + p]) {
        if (erasures.length < OUTER_PARITY) erasures.push(p);
        missingData++;
      }
      for (let j = 0; j < OUTER_PARITY; j++) if (!this.haveParity[g][j]) {
        if (erasures.length < OUTER_PARITY) erasures.push(n + j);
      }
      let ne = 0;
      for (let p = 0; p < n; p++) if (!this.have[base + p]) ne++;
      for (let j = 0; j < OUTER_PARITY; j++) if (!this.haveParity[g][j]) ne++;
      if (missingData === 0) {
        this.groupDone[g] = 1;
        return;
      }
      if (ne > OUTER_PARITY) return;
      const cw = new Uint8Array(OUTER_GROUP + OUTER_PARITY);
      for (let k = 0; k < PAYLOAD_BYTES; k++) {
        for (let p = 0; p < n; p++) cw[p] = this.have[base + p] ? this.data[base + p][k] : 0;
        for (let j = 0; j < OUTER_PARITY; j++) cw[n + j] = this.haveParity[g][j] ? this.parity[g][j][k] : 0;
        const dec = rsDecodeErasures(cw, n + OUTER_PARITY, erasures, erasures.length);
        if (dec < 0) {
          this.repairsFailed++;
          return;
        }
        for (let p = 0; p < n; p++) if (!this.have[base + p]) this.data[base + p][k] = cw[p];
      }
      this.groupDone[g] = 1;
      this.groupsRepaired++;
      const touched = new Uint8Array(Math.floor(OUTER_GROUP / ILEAVE) + 2);
      for (let p = 0; p < n; p++) {
        const pos = base + p;
        if (this.have[pos]) continue;
        this.have[pos] = 1;
        this.framesRepaired++;
        const h = this.headerForPosition(pos);
        if (hdrType(h) === FT_CODED) touched[Math.floor(p / ILEAVE)] = 1;
        this.handleFrame(h, this.data[pos], pos % ILEAVE, false);
      }
      for (let b = 0; b < touched.length; b++) {
        if (!touched[b]) continue;
        const pos = base + b * ILEAVE;
        this.codedBlockUnpack(Math.floor(pos / ILEAVE) - 1);
      }
    }
    tryBlock() {
      const logical = new Uint8Array(ILEAVE * FRAME_BYTES);
      const lconf = new Float32Array(ILEAVE * FRAME_BYTES);
      deinterleave(this.phys, 0, logical);
      deinterleaveConf(this.conf, lconf);
      const res = [];
      let good = 0;
      for (let i = 0; i < ILEAVE; i++) {
        const r = unpackSoft(logical, i * FRAME_BYTES, lconf.subarray(i * FRAME_BYTES, i * FRAME_BYTES + FRAME_BYTES));
        res.push(r);
        if (r.ok) good++;
      }
      if (good === 0) return 0;
      let type = -1, index = -1;
      for (let i = 0; i < ILEAVE; i++) {
        if (!res[i].ok) continue;
        const t = hdrType(res[i].h), x = hdrIndex(res[i].h);
        if (type >= 0 && t !== type) return 0;
        if (t === FT_CODED && index >= 0 && x !== index) return 0;
        if ((t === FT_RAW || t === FT_PARITY) && index >= 0 && x !== index + i) return 0;
        type = t;
        index = t === FT_RAW || t === FT_PARITY ? x - i : x;
      }
      this.blocksOk++;
      for (let i = 0; i < ILEAVE; i++) {
        if (res[i].ok) {
          this.framesOk++;
          if (res[i].corrected > 0) this.rsCorrected += res[i].corrected;
        } else this.framesBad++;
      }
      let announced = false;
      for (let i = 0; i < ILEAVE; i++) {
        if (!res[i].ok) continue;
        const p = res[i].payload;
        const metaNamed = type === FT_META && (p[0] === META_START || p[0] === META_END);
        this.handleFrame(res[i].h, p, i, !metaNamed || !announced);
        if (metaNamed) announced = true;
      }
      if (type === FT_RAW && index >= 0) {
        for (let i = 0; i < ILEAVE; i++) {
          if (res[i].ok) continue;
          const seg = index + i;
          if (seg >= 0 && seg < NUM_SEGS && this.onPixels)
            this.onPixels(segLine(seg), segByteOffset(seg), SEG_BYTES, res[i].payload.subarray(0, SEG_BYTES));
        }
      }
      if (type === FT_CODED) this.codedBlockUnpack(index);
      return good;
    }
    phys_frame(frame, soft) {
      this.framesIn++;
      if (isLockFrame(frame)) {
        this.count = 0;
        return;
      }
      if (this.count === ILEAVE) {
        this.phys.copyWithin(0, FRAME_BYTES, ILEAVE * FRAME_BYTES);
        this.conf.copyWithin(0, FRAME_BYTES, ILEAVE * FRAME_BYTES);
        this.count--;
      }
      this.phys.set(frame.subarray(0, FRAME_BYTES), this.count * FRAME_BYTES);
      this.byteConfidence(soft, this.conf, this.count * FRAME_BYTES);
      this.count++;
      if (this.count < ILEAVE) return;
      if (this.tryBlock() > 0) this.count = 0;
    }
  };

  // js/protocol/anim.js
  var ANIM_VERSION = 3;
  var ANIM_MAX_FRAMES = 120;
  var ANIM_SEG = 16;
  var ANIM_KEY = 127;
  var ANIM_DUP = 128;
  var CTX = 1 << 12;
  var PROB_BITS = 12;
  var PROB_ONE = 1 << PROB_BITS;
  var MOVE_BITS = 4;
  var TOP = 1 << 24;
  var FIXED = 8;
  var stride = (w) => w + 7 >> 3;
  var frameBytes = (a) => stride(a.w) * a.h;
  var segs = (n) => Math.ceil(n / ANIM_SEG);
  var headerLen = (a) => FIXED + a.orderLen + a.n + 4 * segs(a.n);
  function crc16(crc, b) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 32768 ? (crc << 1 ^ 4129) & 65535 : crc << 1 & 65535;
    return crc;
  }
  function parse(get) {
    const b = [];
    for (let i = 0; i < FIXED; i++) {
      b.push(get(i));
      if (b[i] < 0) return 0;
    }
    if (b[0] !== ANIM_VERSION || b[1] < 1 || b[2] < 1 || b[3] < 1 || b[3] > ANIM_MAX_FRAMES) return -1;
    const a = { w: b[1], h: b[2], n: b[3], fps: b[4], passive: b[5], active: b[6], orderLen: b[7] };
    const len = headerLen(a);
    for (let i = FIXED; i < len; i++) if (get(i) < 0) return 0;
    let pos = FIXED;
    a.order = new Uint8Array(a.orderLen);
    for (let i = 0; i < a.orderLen; i++) {
      a.order[i] = get(pos++);
      if (a.order[i] >= a.n) return -1;
    }
    a.ref = new Uint8Array(a.n);
    for (let i = 0; i < a.n; i++) {
      a.ref[i] = get(pos++);
      const r = a.ref[i] & 127;
      if (a.ref[i] !== ANIM_KEY && (r >= i || i - r >= ANIM_SEG)) return -1;
    }
    const S = segs(a.n);
    a.segOff = new Uint16Array(S);
    a.segCrc = new Uint16Array(S);
    for (let s = 0; s < S; s++) {
      a.segOff[s] = get(pos) | get(pos + 1) << 8;
      pos += 2;
    }
    for (let s = 0; s < S; s++) {
      a.segCrc[s] = get(pos) | get(pos + 1) << 8;
      pos += 2;
    }
    return { info: a, len };
  }
  var AnimDecoder = class {
    constructor(info, hdrLen, streamLen) {
      this.info = info;
      this.hdrLen = hdrLen;
      this.streamLen = streamLen;
      this.fb = frameBytes(info);
      this.frames = new Uint8Array(info.n * this.fb);
      this.state = new Uint8Array(info.n);
      this.prob = new Uint16Array(CTX);
      this.rowPos = new Uint32Array(info.n * info.h).fill(4294967295);
      this.rewind();
      this.corrupt = 0;
    }
    // decode again from the start (a checkpoint's bytes changed); frames keep their pixels
    rewind() {
      this.seg = 0;
      this.open = false;
      this.frame = 0;
      this.frameOpen = false;
      this.pix = 0;
      this.framesDone = 0;
      this.state.fill(0);
    }
    done() {
      return this.seg >= segs(this.info.n);
    }
    finishAll() {
      this.seg = segs(this.info.n);
    }
    segRange(s) {
      const S = segs(this.info.n);
      const start = this.hdrLen + this.info.segOff[s];
      const end = Math.min(this.streamLen, s + 1 < S ? this.hdrLen + this.info.segOff[s + 1] : this.streamLen);
      return [start, end];
    }
    // 1 CRC matches, 0 bytes missing, -1 mismatch
    segCheck(s, get) {
      const [st, en] = this.segRange(s);
      let crc = 65535;
      for (let i = st; i < en; i++) {
        const b = get(i);
        if (b < 0) return 0;
        crc = crc16(crc, b);
      }
      return crc === this.info.segCrc[s] ? 1 : -1;
    }
    px(f, off, x, y) {
      const a = this.info;
      if (x < 0 || y < 0 || x >= a.w || y >= a.h) return 0;
      return f[off + y * stride(a.w) + (x >> 3)] >> (x & 7) & 1;
    }
    context(fo, ro, x, y) {
      const f = this.frames;
      let c = this.px(f, fo, x - 1, y) | this.px(f, fo, x - 2, y) << 1 | this.px(f, fo, x - 1, y - 1) << 2 | this.px(f, fo, x, y - 1) << 3 | this.px(f, fo, x + 1, y - 1) << 4 | this.px(f, fo, x, y - 2) << 5;
      if (ro >= 0) {
        c |= this.px(f, ro, x, y) << 6 | this.px(f, ro, x - 1, y) << 7 | this.px(f, ro, x + 1, y) << 8 | this.px(f, ro, x, y - 1) << 9 | this.px(f, ro, x, y + 1) << 10;
      } else c |= 1 << 11;
      return c;
    }
    // Decodes up to `budget` pixels; final: the pass is over, stop at the first missing byte.
    // Returns { done: pixels decoded, stuck }.
    run(get, budget, final) {
      const a = this.info, w = a.w, h = a.h, st = stride(w), fb = this.fb, npx = w * h;
      const byteAt = (p) => p >= this.streamLen ? -2 : get(p);
      let done = 0;
      if (this.done()) return { done, stuck: false };
      if (!this.open) {
        const b = [];
        this.pos = this.hdrLen;
        for (let i = 0; i < 5; i++) {
          b.push(byteAt(this.pos + i));
          if (b[i] < 0) break;
        }
        if (b.length < 5 || b[b.length - 1] < 0) {
          const last = b[b.length - 1];
          if (last === -2) this.corrupt++;
          if (final || last === -2) this.finishAll();
          return { done, stuck: !final && last !== -2 };
        }
        this.code = 0;
        for (let i = 0; i < 5; i++) this.code = (this.code << 8 | b[i]) >>> 0;
        this.pos += 5;
        this.range = 4294967295;
        this.prob.fill(PROB_ONE / 2);
        this.open = true;
        this.frame = 0;
        this.frameOpen = false;
      }
      while (budget > 0 && this.frame < a.n) {
        this.seg = Math.floor(this.frame / ANIM_SEG);
        const r = a.ref[this.frame], fo = this.frame * fb;
        if (r & ANIM_DUP) {
          this.frames.copyWithin(fo, (r & 127) * fb, (r & 127) * fb + fb);
          this.rowPos.fill(this.pos, this.frame * h, this.frame * h + h);
          this.state[this.frame] = 2;
          this.framesDone++;
          this.frame++;
          continue;
        }
        const ro = r === ANIM_KEY ? -1 : r * fb;
        if (!this.frameOpen) {
          if (ro >= 0) this.frames.copyWithin(fo, ro, ro + fb);
          else this.frames.fill(0, fo, fo + fb);
          this.pix = 0;
          this.frameOpen = true;
          this.state[this.frame] = 1;
        }
        let blocked = false, corrupt = false;
        while (budget > 0 && this.pix < npx) {
          while (this.range < TOP) {
            const b = byteAt(this.pos);
            if (b === -2) {
              corrupt = true;
              break;
            }
            if (b < 0) {
              blocked = true;
              break;
            }
            this.range = this.range * 256 >>> 0;
            this.code = (this.code << 8 | b) >>> 0;
            this.pos++;
          }
          if (blocked || corrupt) break;
          const x = this.pix % w, y = Math.floor(this.pix / w);
          const ci = this.context(fo, ro, x, y), p = this.prob[ci];
          const bound = (this.range >>> PROB_BITS) * p;
          const bi = fo + y * st + (x >> 3);
          if (this.code < bound) {
            this.range = bound;
            this.prob[ci] = p + (PROB_ONE - p >> MOVE_BITS);
            this.frames[bi] &= ~(1 << (x & 7));
          } else {
            this.code = this.code - bound >>> 0;
            this.range = this.range - bound >>> 0;
            this.prob[ci] = p - (p >> MOVE_BITS);
            this.frames[bi] |= 1 << (x & 7);
          }
          this.pix++;
          budget--;
          done++;
          if (this.pix % w === 0) this.rowPos[this.frame * h + this.pix / w - 1] = this.pos;
        }
        if (corrupt) {
          this.corrupt++;
          this.state[this.frame] = 3;
          this.finishAll();
          return { done, stuck: false };
        }
        if (blocked) {
          if (final) this.finishAll();
          return { done, stuck: !final };
        }
        if (this.pix >= npx) {
          this.state[this.frame] = 2;
          this.framesDone++;
          this.frame++;
          this.frameOpen = false;
        }
      }
      if (this.frame >= a.n) this.finishAll();
      return { done, stuck: false };
    }
  };

  // js/ui/gif.js
  function encodeGif(w, h, scale, frames, fb, order, delayCs) {
    const out = [];
    const u8 = (...b) => out.push(...b);
    const le16 = (v) => u8(v & 255, v >> 8 & 255);
    const W2 = w * scale, H2 = h * scale, st = w + 7 >> 3;
    u8(71, 73, 70, 56, 57, 97);
    le16(W2);
    le16(H2);
    u8(128, 0, 0);
    u8(255, 255, 255, 0, 0, 0);
    u8(33, 255, 11, ..."NETSCAPE2.0".split("").map((c) => c.charCodeAt(0)), 3, 1, 0, 0, 0);
    for (const fi of order) {
      u8(33, 249, 4, 0);
      le16(delayCs);
      u8(0, 0);
      u8(44);
      le16(0);
      le16(0);
      le16(W2);
      le16(H2);
      u8(0, 2);
      const clear = 4, eoi = 5;
      let size = 3, next = 6, prefix = -1, acc = 0, nacc = 0;
      let dict = /* @__PURE__ */ new Map();
      const block = [];
      const flushBlock = (all) => {
        while (block.length >= 255 || all && block.length) {
          const n = Math.min(255, block.length);
          u8(n, ...block.splice(0, n));
        }
      };
      const code = (c, sz) => {
        acc |= c << nacc;
        nacc += sz;
        while (nacc >= 8) {
          block.push(acc & 255);
          acc >>>= 8;
          nacc -= 8;
        }
        if (block.length >= 255) flushBlock(false);
      };
      code(clear, size);
      const f = frames.subarray(fi * fb, fi * fb + fb);
      for (let y = 0; y < H2; y++) {
        const row = Math.floor(y / scale) * st;
        for (let x = 0; x < W2; x++) {
          const sx = Math.floor(x / scale);
          const pix = f[row + (sx >> 3)] >> (sx & 7) & 1;
          if (prefix < 0) {
            prefix = pix;
            continue;
          }
          const key = prefix << 1 | pix;
          const hit = dict.get(key);
          if (hit !== void 0) {
            prefix = hit;
            continue;
          }
          code(prefix, size);
          dict.set(key, next);
          if (next >= 1 << size) size++;
          if (next === 4095) {
            code(clear, size);
            dict = /* @__PURE__ */ new Map();
            size = 3;
            next = 6;
          } else next++;
          prefix = pix;
        }
      }
      if (prefix >= 0) code(prefix, size);
      code(eoi, size);
      if (nacc > 0) block.push(acc & 255);
      flushBlock(true);
      u8(0);
    }
    u8(59);
    return new Uint8Array(out);
  }

  // js/audio/rx-audio.js
  var WORKLET_SRC = `class Capture extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor('capture', Capture);`;
  var RxAudio = class {
    async start(onSamples) {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: { ideal: 48e3 } }
      });
      const tr = this.stream.getAudioTracks()[0];
      const micRate = tr && tr.getSettings && tr.getSettings().sampleRate || 48e3;
      try {
        this.ctx = new AudioContext({ sampleRate: micRate });
      } catch (e) {
        this.ctx = new AudioContext();
      }
      await this.ctx.resume();
      const workletUrl = URL.createObjectURL(new Blob([WORKLET_SRC], { type: "text/javascript" }));
      try {
        await this.ctx.audioWorklet.addModule(workletUrl);
      } finally {
        URL.revokeObjectURL(workletUrl);
      }
      const src = this.ctx.createMediaStreamSource(this.stream);
      this.node = new AudioWorkletNode(this.ctx, "capture");
      this.node.port.onmessage = (e) => onSamples(e.data, this.ctx.sampleRate);
      src.connect(this.node);
      const g = this.ctx.createGain();
      g.gain.value = 0;
      this.node.connect(g);
      g.connect(this.ctx.destination);
      this.sampleRate = this.ctx.sampleRate;
      return this.sampleRate;
    }
    stop() {
      if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
      if (this.ctx) this.ctx.close();
      this.stream = this.ctx = this.node = null;
    }
  };

  // js/ui/pd-assets.js
  var PD_FONTS = { "SFTV-10-Bold": { "cw": 12, "ch": 14, "tracking": 1, "kern": {}, "glyphs": { "0": [7, "AAA8AH4A5wDDAMMAwwDDAOcAfgA8AAAAAAAAAA=="], "1": [8, "AAAMADwAPAAMAAwADAAMAAwADAAMAAAAAAAAAA=="], "2": [7, "AAA8AHwAxgAGAA4AHAA4AGAA/gD+AAAAAAAAAA=="], "3": [7, "AAA4AHwAzgAGABwAPAAOAAYAxgD+AHwAAAAAAA=="], "4": [8, "AAAMABwAHAA8AGwATAD/AP8ADAAMAAAAAAAAAA=="], "5": [8, "AAB+AHwAYADgAPwAbgAGAEYA/AB4AAAAAAAAAA=="], "6": [8, "AAA8AHwAwADAAPwA7gDGAMYAfgA8AAAAAAAAAA=="], "7": [8, "AAD+AP4ADgAMAAwAGAA4ADAAMABgAAAAAAAAAA=="], "8": [7, "AAA8AH4A5wDnAH4AfgDDAMMA/wB+AAAAAAAAAA=="], "9": [8, "AAB4APwAxgDGAO4AfgAGAAYAfAB4AAAAAAAAAA=="], " ": [2, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="], "!": [2, "AADAAMAAwADAAMAAwADAAAAAwADAAAAAAAAAAA=="], '"': [5, "AADwAPAA8ADwAAAAAAAAAAAAAAAAAAAAAAAAAA=="], "#": [10, "AAATABIAEgB/gDYANgD/AHYAJABkAAAAAAAAAA=="], "$": [7, "GAA4AHwA5gDAAHAAfAAOAEYA/gB8ABgAGAAAAA=="], "%": [7, "AABiAOYAtADsAHgAFgA3AC0AbwBGAAAAAAAAAA=="], "&": [10, "AAA4AHwAZgB8ADgAeADPAM8A/wB/gAAAAAAAAA=="], "'": [2, "AADAAMAAwADAAAAAAAAAAAAAAAAAAAAAAAAAAA=="], "(": [4, "YABgAMAAwADAAMAAwADAAMAAYABgADAAAAAAAA=="], ")": [4, "YABgADAAMAAwADAAMAAwADAAYABgAMAAAAAAAA=="], "*": [6, "AAAwAPwAeAB4AEgAAAAAAAAAAAAAAAAAAAAAAA=="], "+": [8, "AAAAAAAAEAAQADgA/gA4ABAAEAAAAAAAAAAAAA=="], ",": [3, "AAAAAAAAAAAAAAAAAAAAAAAAYADAAMAAAAAAAA=="], "-": [6, "AAAAAAAAAAAAAAAAeAB4AAAAAAAAAAAAAAAAAA=="], ".": [2, "AAAAAAAAAAAAAAAAAAAAAAAAwADAAAAAAAAAAA=="], "/": [6, "DAAMABgAGAAYADAAMAAwAGAAYABgAMAAAAAAAA=="], ":": [2, "AAAAAAAAAADAAMAAAAAAAAAAwADAAAAAAAAAAA=="], ";": [3, "AAAAAAAAAABgAGAAAAAAAAAAQABgAMAAwAAAAA=="], "<": [7, "AAAAAAAABAA8AHAAcAAcAAQAAAAAAAAAAAAAAA=="], "=": [6, "AAAAAAAAAAAAAPwAAAAAAPwAAAAAAAAAAAAAAA=="], ">": [7, "AAAAAAAAQABwABwAHABwAEAAAAAAAAAAAAAAAA=="], "?": [7, "AAB4APwADAAMADwAOAAwAAAAMAAgAAAAAAAAAA=="], "@": [9, "AAAeADsAYIDewJ5AskCyQLJAnsDfgGAAOgAeAA=="], "A": [8, "AAAcABwAHAA2ADYAMgB/AH8AYYDBgAAAAAAAAA=="], "B": [7, "AAD4APwAxgDOAPwA/gDGAMYA/gD8AAAAAAAAAA=="], "C": [8, "AAAeAH8AY4DAAMAAwADAAGOAfwA+AAAAAAAAAA=="], "D": [8, "AAD4AP4AxgDDAMMAwwDDAMYA/gD4AAAAAAAAAA=="], "E": [7, "AAD8APwAwADAAPgA+ADAAMAA/AD8AAAAAAAAAA=="], "F": [7, "AAD8APwAwADAAPgA+ADAAMAAwADAAAAAAAAAAA=="], "G": [8, "AAAeAH8AYwDAAMAAx4DBgOGAfwAeAAAAAAAAAA=="], "H": [8, "AADDAMMAwwDDAP8A/wDDAMMAwwDDAAAAAAAAAA=="], "I": [2, "AADAAMAAwADAAMAAwADAAMAAwADAAAAAAAAAAA=="], "J": [4, "AAAIABgAGAAYABgAGAAYAJgA+ABwAAAAAAAAAA=="], "K": [8, "AADGAM4A3AD4APAA+ADYAMwAzgDHAAAAAAAAAA=="], "L": [6, "AADAAMAAwADAAMAAwADAAMAA/AD8AAAAAAAAAA=="], "M": [11, "AADBwOHA88D/wN7AzMDMwMDAwMDAwAAAAAAAAA=="], "N": [8, "AADBgOGA8YD5gNmAzYDPgMeAw4DBgAAAAAAAAA=="], "O": [10, "AAAeAH+AYYDAwMDAwMDAwGGAf4AeAAAAAAAAAA=="], "P": [7, "AAD8AP4AxgDGAMYA/AD4AMAAwADAAAAAAAAAAA=="], "Q": [10, "AAAeAH8AYYDAwMDAwMDCwOfAc4A/wAyAAAAAAA=="], "R": [7, "AAD8AP4AxgDHAM4A/ADcAMwAxgDHAAAAAAAAAA=="], "S": [7, "AAA8AH4A5wDgAHAAfgAPAAMA4wB/AD4AAAAAAA=="], "T": [8, "AAD/AP8AGAAYABgAGAAYABgAGAAYAAAAAAAAAA=="], "U": [8, "AADDAMMAwwDDAMMAwwDDAMMAfgA8AAAAAAAAAA=="], "V": [8, "AADBgGEAYwBjADIANgA2ABwAHAAcAAAAAAAAAA=="], "W": [10, "AADEYM5gTkBOQGrAe8A7gDuAMYAxgAAAAAAAAA=="], "X": [7, "AADDAGYAfAA8ABgAGAA8AG4AZgDDAAAAAAAAAA=="], "Y": [8, "AADjgGMANwA+ABwAHAAIAAgACAAIAAAAAAAAAA=="], "Z": [8, "AAD/AP8ABwAOABwAOABwAOAA/wD/AAAAAAAAAA=="], "[": [4, "4ADAAMAAwADAAMAAwADAAMAAwADgAOAAAAAAAA=="], "\\": [6, "wADAAGAAYABwADAAMAAYABgAGAAMAAwAAAAAAA=="], "]": [4, "4ABgAGAAYABgAGAAYABgAGAAYADgAOAAAAAAAA=="], "^": [6, "AAAwAHgAeABIAMwAAAAAAAAAAAAAAAAAAAAAAA=="], "_": [7, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwA/AAAAA=="], "`": [3, "AADgAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="], "a": [7, "AAAAAAAAAAB4APwADAB8APwAzAD8AHwAAAAAAA=="], "b": [8, "AADAAMAAwAD8AO4AxgDGAMYA/gD8AAAAAAAAAA=="], "c": [7, "AAAAAAAAOAB+AOQAwADAAOQAfgA8AAAAAAAAAA=="], "d": [8, "AAAGAAYABgB+AO4AxgDGAMYA/gB+AAAAAAAAAA=="], "e": [8, "AAAAAAAAAAA4AHwAxgD+AP4A5AB8ADgAAAAAAA=="], "f": [5, "AAA4AHAAYAD4APAAYABgAGAAYABgAAAAAAAAAA=="], "g": [8, "AAAAAAAAAAB+AP4AxgDGAMYA/gB+AAYAfAB4AA=="], "h": [7, "AADAAMAAwAD8AP4AxgDGAMYAxgDGAAAAAAAAAA=="], "i": [2, "wADAAAAAwADAAMAAwADAAMAAwADAAAAAAAAAAA=="], "j": [4, "AAAwADAAAAAgADAAMAAwADAAMAAwADAAMADwAA=="], "k": [7, "AADAAMAAwADMANgA8AD4APgAzADOAAAAAAAAAA=="], "l": [2, "AADAAMAAwADAAMAAwADAAMAAwADAAAAAAAAAAA=="], "m": [12, "AAAAAAAAAAD9wP/gzmDMYMxgzGDMYAAAAAAAAA=="], "n": [7, "AAAAAAAAAADcAP4AxgDGAMYAxgDGAAAAAAAAAA=="], "o": [8, "AAAAAAAAPAB+AOcAwwDDAOcAfgA8AAAAAAAAAA=="], "p": [8, "AAAAAAAA+AD8AMYAxgDGAO4A/ADAAMAAwAAAAA=="], "q": [8, "AAAAAAAANgB+AMYAxgDGAO4AfgAGAAYABgAAAA=="], "r": [5, "AAAAAAAAAADwAPAAwADAAMAAwADAAAAAAAAAAA=="], "s": [6, "AAAAAAAAAAB4AHwA4AB4ADwATAD8AHgAAAAAAA=="], "t": [5, "AABgAGAA8AD4AGAAYABgAGAAeAA4AAAAAAAAAA=="], "u": [7, "AAAAAAAAAADGAMYAxgDGAMYA/gB2AAAAAAAAAA=="], "v": [6, "AAAAAAAAAADGAEQAbABsADgAOAA4AAAAAAAAAA=="], "w": [10, "AAAAAAAAAADOYM5gbsB7wHvAO4AxgAAAAAAAAA=="], "x": [7, "AAAAAAAAAADuAHwAOAA4ADgAbADuAAAAAAAAAA=="], "y": [7, "AAAAAAAAAADDAGYAZgA8ADwAPAAYABgAcABwAA=="], "z": [7, "AAAAAAAAAAD8APwAGAAwAGAA/AD8AAAAAAAAAA=="], "{": [6, "GAAwADAAMAAwAGAAMAAwADAAMAAYABgAAAAAAA=="], "|": [2, "wADAAMAAwADAAMAAwADAAMAAwADAAMAAwADAAA=="], "}": [6, "YAAwADAAMAAwABgAMAAwADAAMABgAGAAAAAAAA=="], "~": [7, "AAAAAAAAAAAAAHAA+wDfAA4AAAAAAAAAAAAAAA=="], "\u2026": [8, "AAAAAAAAAAAAAAAAAAAAAAAAyYDJgAAAAAAAAA=="], "\xA9": [12, "AAAPADnAJkBvYFggWCBvYCZAOcAPAAAAAAAAAA=="], "\u2018": [3, "AABgAGAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="], "\u2019": [3, "AABgAMAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="], "\u201C": [6, "AABsAGwA2AAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="], "\u201D": [6, "AABsANgA2AAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="], "\u24B6": [12, "AAAPgD/Af+B54Png+ODy4PDg5mB/4D/AH4AAAA=="], "\u24B7": [12, "AAAPgD/Af+Bx4PDg8ODw4Pbg8OB/4D/AH4AAAA=="] } }, "SFTV-9-Mono-Condensed": { "cw": 8, "ch": 14, "tracking": 0, "kern": {}, "glyphs": { "0": [8, "ADhsxsaGxsZsOAAAAAA="], "1": [8, "ABh4WBgYGBgYGAAAAAA="], "2": [8, "AHj8DAwYMGDA/AAAAAA="], "3": [8, "AHjcDBg4DAzMeAAAAAA="], "4": [8, "ABwcPCxMzP4MCAAAAAA="], "5": [8, "AHxAwPj8DAzceAAAAAA="], "6": [8, "ADhowPD8zMzseAAAAAA="], "7": [8, "APwMCBgQMCBgQAAAAAA="], "8": [8, "AHzuxmx8xsbufAAAAAA="], "9": [8, "AHjcjMz8PAxYcAAAAAA="], " ": [8, "AAAAAAAAAAAAAAAAAAA="], "!": [8, "ADAwMDAwMAAwMAAAAAA="], '"': [8, "AHBwcAAAAAAAAAAAAAA="], "#": [8, "ACQkLH4o/PxISAAAAAA="], "$": [8, "EDB8zMBwHAzMeDAQAAA="], "%": [8, "AOSkqOhQFC4qSk4AAAA="], "&": [8, "ADg8JDw4OG9Gbj8AAAA="], "'": [8, "ACAgIAAAAAAAAAAAAAA="], "(": [8, "DBgQMDAwMDAwEBgMAAA="], ")": [8, "MBgIDAwMDAwMGBgwAAA="], "*": [8, "AAgqHBwUAAAAAAAAAAA="], "+": [8, "AAAAMDD8/DAwAAAAAAA="], ",": [8, "AAAAAAAAAAAAMDAgAAA="], "-": [8, "AAAAAAB4AAAAAAAAAAA="], ".": [8, "AAAAAAAAAAAwMAAAAAA="], "/": [8, "GBAQMDAgYGBAwMAAAAA="], ":": [8, "AAAAMDAAADAwAAAAAAA="], ";": [8, "AAAAMBAAAAAQMCAAAAA="], "<": [8, "AAAABBxwcBwEAAAAAAA="], "=": [8, "AAAAAPgAAPgAAAAAAAA="], ">": [8, "AAAAQHAcHHBAAAAAAAA="], "?": [8, "AHjMDAw4IAAgMAAAAAA="], "@": [8, "ADhkRLqqiqqqvkRgOAA="], "A": [8, "ABA4OChsfHxGxgAAAAA="], "B": [8, "APjMjMz4jIzM+AAAAAA="], "C": [8, "ADhuwoCAgMJuOAAAAAA="], "D": [8, "APjchoaGhobc+AAAAAA="], "E": [8, "APzAwMD4wMDA/AAAAAA="], "F": [8, "APzAwMD4wMDAwAAAAAA="], "G": [8, "ADhswICOjsJsPAAAAAA="], "H": [8, "AIKCgsb+goKCggAAAAA="], "I": [8, "ADAwMDAwMDAwMAAAAAA="], "J": [8, "AAQEBAQEBARsOAAAAAA="], "K": [8, "AMzY2PDw8NjMxgAAAAA="], "L": [8, "AMDAwMDAwMDA/AAAAAA="], "M": [8, "AMbG7qq6koKCggAAAAA="], "N": [8, "AMLC4rKSmo6GhgAAAAA="], "O": [8, "ADhsxoKCgsZsOAAAAAA="], "P": [8, "APjcjIz8+ICAgAAAAAA="], "Q": [8, "ADhsxoKCgo5MfhIAAAA="], "R": [8, "APjMxsb8+MzMxgAAAAA="], "S": [8, "AHjMwMB4DATMeAAAAAA="], "T": [8, "APwwMDAwMDAwMAAAAAA="], "U": [8, "AIaGhoaGhsbseAAAAAA="], "V": [8, "AILGRERsKDg4EAAAAAA="], "W": [8, "AJKSknxsbGxsbAAAAAA="], "X": [8, "AMZsKDgQOGhMxgAAAAA="], "Y": [8, "AMxIWDAwMDAwMAAAAAA="], "Z": [8, "AP4ODBgQMGDg/gAAAAA="], "[": [8, "MCAgICAgICAgICAwAAA="], "\\": [8, "wMBAYGAgMDAQEBgAAAA="], "]": [8, "MBAQEBAQEBAQEDAwAAA="], "^": [8, "ADB4SMwAAAAAAAAAAAA="], "_": [8, "AAAAAAAAAAAAAPgAAAA="], "`": [8, "ADAYAAAAAAAAAAAAAAA="], "a": [8, "AAAAePwMfMzMfAAAAAA="], "b": [8, "AICAsPjMhMz8+AAAAAA="], "c": [8, "AAAAePzAgMD8eAAAAAA="], "d": [8, "AAQENHzMhMz8fAAAAAA="], "e": [8, "AAAAeMjM/MD8eAAAAAA="], "f": [8, "ADhgYPhgYGBgYAAAAAA="], "g": [8, "AAAAfMzMjMx8DEx4AAA="], "h": [8, "AMDA2PzMzMzMzAAAAAA="], "i": [8, "ADAwADAwMDAwMAAAAAA="], "j": [8, "ADAwADAwMDAwMDAw4AA="], "k": [8, "AMDAyNjw8PDYzAAAAAA="], "l": [8, "ABgYGBgYGBgYGAAAAAA="], "m": [8, "AAAA7P6SkpKSkgAAAAA="], "n": [8, "AAAA+PzMzMzMzAAAAAA="], "o": [8, "AAAAeOzGxsbsfAAAAAA="], "p": [8, "AAAAuPzMhMz4sICAAAA="], "q": [8, "AAAAdPzMhMz8PAQEAAA="], "r": [8, "AAAAPDgwMDAwAAAAAAA="], "s": [8, "AAAAHDYwHAY2HAAAAAA="], "t": [8, "AGBg+GBgYGBwOAAAAAA="], "u": [8, "AAAAzMzMzMz8fAAAAAA="], "v": [8, "AAAAxkRsLDg4AAAAAAA="], "w": [8, "AAAAkpJ8bGxsAAAAAAA="], "x": [8, "AAAAyHgwMHjMAAAAAAA="], "y": [8, "AAAAxkRsLDg4EDBgAAA="], "z": [8, "AAAAfAwYMGB8AAAAAAA="], "{": [8, "GBAwMDBgYDAwMBAYAAA="], "|": [8, "CAgICAgICAgICAgICAA="], "}": [8, "MBAYGBgMHBgYGDAwAAA="], "~": [8, "AAAAAHD+DAAAAAAAAAA="] } }, "SFTV-20-Medium": { "cw": 32, "ch": 32, "tracking": 2, "kern": {}, "glyphs": { "0": [15, "AAAAAAAAAAAAAAAAB+AAAA/wAAA/+AAAOBwAAHAOAABwDgAA4AcAAOAHAADgBwAA4AcAAOAHAADgBwAA4AcAAOAHAADgBwAAcA4AAHgeAAA8PAAAP/wAAA/wAAAH4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "1": [7, "AAAAAAAAAAAAAAAADgAAAB4AAAB+AAAA/gAAAO4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "2": [14, "AAAAAAAAAAAAAAAAD8AAAD/wAAB/+AAAcDgAAOAcAAAAHAAAABwAAAA8AAAAOAAAAHAAAAHgAAADwAAAD4AAAB8AAAA8AAAAeAAAAHgAAAB//AAAf/wAAH/8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "3": [15, "AAAAAAAAAAAAAAAAD8AAAB/wAAA/+AAAODgAAAA4AAAAHAAAABgAAAA4AAAB8AAAB+AAAAfwAAAA+AAAADgAAAAcAAAAHAAAABwAABAcAAB4PAAAP/gAAB/wAAAPwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "4": [17, "AAAAAAAAAAAAAAAAAHAAAADwAAAB8AAAAfAAAAPwAAAHcAAAB3AAAA5wAAAccAAAOHAAADhwAABwcAAA8HAAAP//AAD//wAAAHgAAABwAAAAcAAAAHAAAABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "5": [15, "AAAAAAAAAAAAAAAAP/gAAD/4AAA/+AAAcAAAAHAAAABwAAAAcAAAAHOAAAB/8AAAf/gAAHA4AAAAHAAAABwAAAAcAAAAHAAAABwAAPA4AAB/+AAAP/AAAA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "6": [15, "AAAAAAAAAAAAAAAAB+AAAB/4AAA/+AAAOBAAAHAAAABwAAAA4AAAAOAAAADv4AAA//AAAPx4AADwOAAA8BwAAOAcAADgHAAA4BwAAHAcAAB4OAAAP/gAAB/wAAAPwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "7": [14, "AAAAAAAAAAAAAAAA//wAAP/8AAD//AAAADgAAAA4AAAAcAAAAHAAAADgAAAA4AAAAcAAAAPAAAADgAAAB4AAAAcAAAAPAAAADgAAABwAAAAcAAAAOAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "8": [15, "AAAAAAAAAAAAAAAAD+AAAB/wAAA++AAAeDwAAHAcAABwHAAAcBwAAHAcAAA8eAAAH/AAAB/wAAB/+AAAcBwAAOAOAADgDgAA4A4AAOAOAADwHgAAf/wAAD/4AAAP4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "9": [15, "AAAAAAAAAAAAAAAAD8AAAD/gAAB/8AAAcHgAAOA4AADgHAAA4BwAAOAcAADgPAAAcDwAAHj8AAA//AAAH9wAAAAcAAAAGAAAADgAAAA4AAAgcAAAf/AAAH/gAAAfgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], " ": [6, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "!": [3, "AAAAAAAAAAAAAAAA8AAAAPAAAADwAAAA8AAAAPAAAADwAAAA8AAAAPAAAADwAAAA8AAAAPAAAADwAAAA8AAAAHAAAAAAAAAAAAAAAGAAAADwAAAA8AAAAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], '"': [8, "AAAAAAAAAAAAAAAA7gAAAO4AAADuAAAA7gAAAO4AAADuAAAA7gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "#": [17, "AAAAAAAAAAAAAAAAAwYAAAMGAAADDgAAAw4AAAcMAAAHDAAAf//AAH//wAAGHAAABhwAAA4YAAAOGAAADjgAAP//gAD//wAADDgAAAwwAAAcMAAAGDAAABgwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "$": [16, "AAAAAADAAAAAwAAAAMAAAAPwAAAP+AAAH/wAABzOAAAYwAAAGMAAABzAAAAfwAAAD+AAAAP4AAAA/AAAAN4AAADOAAAAzgAAOM4AABzeAAAf/AAAB/gAAAHAAAAAwAAAAMAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "%": [18, "AAAAAAAAAAAAAAAAPAGAAH8DgADnBwAAw4cAAMOOAADDnAAA4xwAAH84AAA+cAAACHAAAADgAAABwwAAAc/AAAOdwAAHGOAABxhgAA4YYAAcGGAAHBzgADgPwAAwB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "&": [18, "AAAAAAAAAAAAAAAAD4AAAB/gAAA98AAAOHAAADBwAAA4cAAAOPAAAB3gAAAfwAAAD4AAAB+AAAA/gAAAeccAAPHnAADg9gAA4H4AAOA+AADwPAAAef4AAD/3AAAfw4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "'": [3, "AAAAAAAAAAAAAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "(": [6, "DgAAABwAAAAcAAAAOAAAADgAAABwAAAAcAAAAGAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAAYAAAAHAAAABwAAAAOAAAADgAAAAcAAAAHAAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], ")": [6, "4AAAAHAAAABwAAAAOAAAADgAAAAcAAAAHAAAAAwAAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADAAAABwAAAAcAAAAOAAAADgAAABwAAAAcAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "*": [10, "AAAAAAAAAAAAAAAADAAAAAwAAAAMAAAA7cAAAP/AAAAeAAAAHgAAAD8AAABzgAAAIQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "+": [15, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgAAAA4AAAAOAAAADgAAAA4AAAH/8AAB//AAAf/wAAAOAAAADgAAAA4AAAAOAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], ",": [5, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAAAcAAAAHAAAABwAAAA4AAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "-": [12, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/gAAA/4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], ".": [3, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgAAAA8AAAAPAAAABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "/": [13, "AAAAAAAAAAAAcAAAAGAAAADgAAAA4AAAAOAAAAHAAAABwAAAAYAAAAOAAAADgAAAAwAAAAcAAAAHAAAABgAAAA4AAAAOAAAADAAAABwAAAAcAAAAPAAAADgAAAA4AAAAeAAAAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], ":": [3, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAPAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAA8AAAAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], ";": [5, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAAHgAAAB4AAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAHAAAABwAAAAYAAAAOAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "<": [10, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAHAAAAHwAAAHwAAAPwAAADwAAAA8AAAAPwAAAA/AAAAB8AAAAHAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "=": [14, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB/+AAAf/gAAAAAAAAAAAAAAAAAAAAAAAB/+AAAf/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], ">": [10, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAOAAAAD4AAAAPgAAAA/AAAADwAAAA8AAAA+AAAA+AAAA+AAAAOAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "?": [12, "AAAAAAAAAAAAAAAAH4AAAD/gAAB/8AAA8HgAAAA4AAAAOAAAADgAAAA4AAAAeAAAAPAAAA/gAAAPgAAADgAAAA4AAAAOAAAAAAAAAAAAAAAEAAAADgAAAA8AAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "@": [25, "AAAAAAAAAAAAAAAAAH+AAAH/8AAH4PgADwAcABwADgA4AAcAMDwDgHD/Y4Bh/+GA4cHhwOOA4cDDgGDAwwBgwMMAYMDDgGDA44DhwOHB4YBh//OAcP9/ADA8PgA4AAgAHAAAAA8AAAAH4OAAAf/gAAB/gAAAAAAAAAAAAAAAAAA="], "A": [18, "AAAAAAAAAAAAAAAAAOAAAAHwAAAB8AAAA/AAAAO4AAADuAAABxwAAAccAAAHHAAADg4AAA4OAAAcBwAAH/8AAB//AAA//4AAOAOAAHABwABwAcAAcAHAAOAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "B": [15, "AAAAAAAAAAAAAAAA/8AAAP/wAADh+AAA4DgAAOA4AADgOAAA4DgAAOA4AADg8AAA/+AAAP/wAADgeAAA4DwAAOAcAADgHAAA4BwAAOA8AAD/+AAA//AAAP/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "C": [18, "AAAAAAAAAAAAAAAAA/gAAA/+AAAf/wAAPAeAAHgDwABwAcAAcAAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAABwAAAAcAHAAHgDwAA8B4AAH/8AAA/+AAAD+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "D": [17, "AAAAAAAAAAAAAAAA/8AAAP/wAAD/+AAA4HwAAOAeAADgDgAA4A8AAOAHAADgBwAA4AcAAOAHAADgBwAA4AcAAOAPAADgDgAA4B4AAOB8AAD/+AAA//AAAP/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "E": [13, "AAAAAAAAAAAAAAAA//AAAP/wAAD/8AAA4AAAAOAAAADgAAAA4AAAAOAAAAD/4AAA/+AAAP/gAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAAD/8AAA//AAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "F": [13, "AAAAAAAAAAAAAAAA//AAAP/wAAD/8AAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA/+AAAP/gAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "G": [18, "AAAAAAAAAAAAAAAAAfgAAAf+AAAf/4AAPgfAADgBwABwAAAAcAAAAOAAAADgAAAA4AAAAOAP4ADgD+AA4A/gAOAA4ABwAOAAcADgADgBwAA+B4AAH/+AAAf/AAAB/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "H": [16, "AAAAAAAAAAAAAAAA4AcAAOAHAADgBwAA4AcAAOAHAADgBwAA4AcAAOAHAAD//wAA//8AAP//AADgBwAA4AcAAOAHAADgBwAA4AcAAOAHAADgBwAA4AcAAOAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "I": [3, "AAAAAAAAAAAAAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "J": [7, "AAAAAAAAAAAAAAAAAwAAAAMAAAADAAAAAwAAAAMAAAADAAAAAwAAAAMAAAADAAAAAwAAAAMAAAADAAAAAwAAAAMAAAADAAAAQwAAAMcAAAD+AAAAfgAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "K": [17, "AAAAAAAAAAAAAAAAcA4AAHAcAABwOAAAcHAAAHDgAABx4AAAc8AAAHeAAAB/AAAAfwAAAH8AAAB7gAAAc8AAAHHgAABw8AAAcHAAAHA4AABwHAAAcB4AAHAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "L": [13, "AAAAAAAAAAAAAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAAD/8AAA//AAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "M": [18, "AAAAAAAAAAAAAAAA4ADgAPAB4AD4A+AA+APgAPwH4AD+D+AA7g7gAOcc4ADnvOAA4/jgAOHw4ADh8OAA4ODgAOBA4ADgAOAA4ADgAOAA4ADgAOAA4ADgAOAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "N": [14, "AAAAAAAAAAAAAAAA4A4AAPAOAADwDgAA+A4AAPgOAAD8DgAA7g4AAO4OAADnDgAA444AAOOOAADhzgAA4O4AAODuAADgfgAA4D4AAOA+AADgHgAA4B4AAOAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "O": [21, "AAAAAAAAAAAAAAAAA/wAAA//AAAf/4AAPgfAADgB4ABwAOAAcADgAOAAcADgAHAA4ABwAOAAcADgAHAA4ABwAOAAcABwAOAAcADgADgB4AA+B8AAH/+AAA//AAAD/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "P": [14, "AAAAAAAAAAAAAAAA/8AAAP/wAAD/+AAA4DgAAOA8AADgHAAA4BwAAOAcAADgPAAA4DgAAP/4AAD/8AAA/8AAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "Q": [21, "AAAAAAAAAAAAAAAAA/wAAA//AAAf/4AAPgfAADgBwABwAOAAcADgAOAAcADgAHAA4ABwAOAAcADgAHAA4ABwAOAMcABwHuAAcA/gADgHwAA+B8AAH//gAA//4AAD/HAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "R": [15, "AAAAAAAAAAAAAAAA/4AAAP/gAAD/8AAA4HgAAOA4AADgOAAA4DgAAOA4AADgeAAA4PAAAP/gAAD/wAAA48AAAOHAAADg4AAA4OAAAOBwAADgeAAA4DgAAOAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "S": [16, "AAAAAAAAAAAAAAAAD+AAAB/4AAA//AAAeB4AAHAOAABwAAAAcAAAAHAAAAB8AAAAP8AAAA/wAAAD+AAAADwAAAAeAAAADgAAAA4AAOAOAADwHgAAf/wAAD/4AAAP4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "T": [15, "AAAAAAAAAAAAAAAA//4AAP/+AAD//gAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "U": [16, "AAAAAAAAAAAAAAAA4AcAAOAHAADgBwAA4AcAAOAHAADgBwAA4AcAAOAHAADgBwAA4AcAAOAHAADgBwAA4AcAAOAHAADgBwAA8A8AAHgeAAA//AAAH/gAAAfgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "V": [16, "AAAAAAAAAAAAAAAA4AOAAOADAABwBwAAcAcAADAGAAA4DgAAOA4AABgMAAAcHAAAHBwAAAwYAAAOOAAADjgAAAYwAAAHcAAAB2AAAAPgAAAD4AAAAcAAAAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "W": [29, "AAAAAAAAAAAAAAAAcAcAcHAHAGA4D4DgOA+A4DgPgOAcH8HAHB3BwBwdwcAOOMOADjjjgA4444AOMOcAB3B3AAdwdwAHcHYAA+A+AAPgPgAD4D4AAcA8AAHAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "X": [14, "AAAAAAAAAAAAAAAA4A4AAHAcAAA4OAAAODgAABxwAAAccAAADuAAAAfAAAAHwAAAA4AAAAOAAAAHwAAAD+AAAA7gAAAccAAAHHAAADg4AABwHAAAcBwAAOAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "Y": [15, "AAAAAAAAAAAAAAAA4AcAAHAOAAB4HgAAOBwAABw4AAAcOAAADnAAAA5wAAAH4AAAB+AAAAPAAAADgAAAAYAAAAGAAAABgAAAAYAAAAGAAAABgAAAAYAAAAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "Z": [15, "AAAAAAAAAAAAAAAA//8AAP//AAD//wAAAB4AAAAeAAAAPAAAAHgAAADwAAAB4AAAAcAAAAOAAAAHgAAADwAAAB4AAAA8AAAAeAAAAHAAAAD//wAA//8AAP//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "[": [6, "+AAAAPgAAAD4AAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAAD4AAAA+AAAAPgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "\\": [12, "AAAAAAAAAADgAAAA4AAAAHAAAABwAAAAcAAAADgAAAA4AAAAOAAAABwAAAAcAAAADAAAAA4AAAAOAAAABgAAAAcAAAAHAAAAAwAAAAOAAAADgAAAA4AAAAHAAAABwAAAAcAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "]": [5, "+AAAAPgAAAD4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAD4AAAA+AAAAPgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "^": [12, "AAAAAAAAAAAAAAAADwAAAA8AAAAfgAAAH4AAADnAAAA5wAAAcOAAAHBgAADgcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "_": [14, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB/+AAAf/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "`": [5, "AAAAAAAAAAAAAAAA4AAAAHAAAAA4AAAAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "a": [13, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgAAAP8AAAHngAABg8AAAAHAAAABwAAAf8AAAf/AAAPhwAADgcAAA4HAAAODwAAD78AAAf/AAAD8wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "b": [15, "AAAAAAAAAAAAAAAA4AAAAOAAAADgAAAA4AAAAOAAAADjwAAA7+AAAP/wAAD4eAAA8DwAAOAcAADgHAAA4BwAAOAcAADgHAAA4DwAAPA4AAD/+AAA7/AAAMfAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "c": [14, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwAAAH/AAAD/4AAB4PAAA8BAAAOAAAADgAAAA4AAAAOAAAADgAAAA8BgAAHg8AAA/+AAAH/AAAA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "d": [14, "AAAAAAAAAAAAAAAAABwAAAAcAAAAHAAAABwAAAAcAAAPHAAAH9wAAD/8AAB4fAAA8DwAAOAcAADgHAAA4BwAAOAcAADgHAAA8BwAAHA8AAB//AAAP9wAAA+MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "e": [15, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwAAAH+AAAD7wAABwOAAA8BgAAOAcAAD//AAA//wAAOAAAADgAAAA8BAAAHA8AAA/+AAAH/AAAA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "f": [10, "AAAAAAAAAAAAAAAAD4AAAB/AAAAegAAAHAAAADgAAAA4AAAA/4AAAP+AAAA8AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "g": [15, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPnAAAP9wAAHz8AABwPAAA8DwAAOAcAADgHAAA4BwAAOAcAADgHAAA8DwAAHh8AAA//AAAH9wAAAccAAAAHAAAABwAACA4AAB/+AAAf/AAAB/AAAAAAAAAAAAAAAAAAAA="], "h": [13, "AAAAAAAAAAAAAAAA4AAAAOAAAADgAAAA4AAAAOAAAADjgAAA7+AAAP/wAAD4eAAA8HgAAOA4AADgOAAA4DgAAOA4AADgOAAA4DgAAOA4AADgOAAA4DgAAOA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "i": [3, "AAAAAAAAAADgAAAA4AAAAOAAAAAAAAAAAAAAAAAAAABAAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "j": [7, "AAAAAAAAAAAHAAAADwAAAAcAAAAAAAAAAAAAAAAAAAAGAAAABwAAAAcAAAAHAAAABwAAAAcAAAAHAAAABwAAAAcAAAAHAAAABwAAAAcAAAAHAAAABwAAAAcAAAAHAAAABwAAAA8AAAB+AAAA/gAAAHgAAAAAAAAAAAAAAAAAAAA="], "k": [13, "AAAAAAAAAAAAAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4eAAAOHAAADjgAAA5wAAAO4AAAD+AAAA/gAAAP8AAAD3AAAA44AAAOPAAADhwAAA4OAAAODwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "l": [3, "AAAAAAAAAAAAAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "m": [23, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABnw+AAf+f4AH/3+AB4fDwAcDgcAHA4HABwOBwAcDgcAHA4HABwOBwAcDgcAHA4HABwOBwAcDgcAHA4HAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "n": [13, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADnwAAA/+AAAP/wAADweAAA8DgAAOA4AADgOAAA4DgAAOA4AADgOAAA4DgAAOA4AADgOAAA4DgAAOA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "o": [15, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwAAAH+AAAD/wAABwOAAA8BwAAOAcAADgHAAA4BwAAOAcAADgHAAA8BwAAHA4AAA/8AAAH+AAAA/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "p": [15, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADHwAAA7/AAAP/4AADwOAAA4DwAAOAcAADgHAAA4BwAAOAcAADgHAAA8DwAAPh4AAD/8AAA7+AAAOPAAADgAAAA4AAAAOAAAADgAAAA4AAAAAAAAAAAAAAAAAAAAAAAAAA="], "q": [15, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPjAAAP9wAAH/8AABwPAAA8BwAAOAcAADgHAAA4BwAAOAcAADgHAAA8DwAAHh8AAA//AAAH9wAAA8cAAAAHAAAABwAAAAcAAAAHAAAABwAAAAAAAAAAAAAAAAAAAAAAAA="], "r": [9, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA5wAAAO8AAAD/AAAA8AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "s": [12, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgAAAP8AAAHvgAABwwAAAcAAAAHgAAAB/AAAAH4AAAAfAAAAA4AAAAOAAAODgAAB/4AAAf8AAAB+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "t": [10, "AAAAAAAAAAAAAAAAAAAAADgAAAA4AAAAOAAAADgAAAD/gAAA/8AAAP/AAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADwAAAAfgAAAH8AAAA+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "u": [13, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4DgAAOA4AADgOAAA4DgAAOA4AADgOAAA4DgAAOA4AADgOAAA4DgAAOB4AADweAAAf/gAAD/4AAAfOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "v": [12, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4DgAAOAwAABgcAAAcHAAADBgAAA44AAAOOAAABjAAAAdwAAADYAAAA+AAAAPgAAABwAAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "w": [21, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4DAcAOB4HABweDgAcPw4ADD8MAA4zHAAOc5wABnOYAAdhuAAH4fgAA+HwAAPA8AADwPAAAcDgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "x": [12, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcHAAAHBwAAA44AAAHcAAAB/AAAAPgAAABwAAAA+AAAAPgAAAHcAAAD3gAAA44AAAcHAAAPB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "y": [14, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4A4AAHAcAABwHAAAMBgAADg4AAA4OAAAHHAAABxwAAAO4AAADuAAAAfgAAAHwAAAB8AAAAOAAAADgAAAAwAAAAcAAAB+AAAAfgAAAHwAAAAAAAAAAAAAAAAAAAA="], "z": [12, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//AAAP/wAAAA8AAAAeAAAAPAAAAHgAAABwAAAA4AAAAcAAAAOAAAAHgAAADwAAAA//AAAP/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "{": [8, "BwAAAA8AAAAeAAAAHAAAABwAAAAcAAAAGAAAABgAAAAYAAAAGAAAADgAAAA4AAAA8AAAAPAAAAA4AAAAOAAAABgAAAAYAAAAGAAAABgAAAAcAAAAHAAAABwAAAAeAAAADwAAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "|": [3, "wAAAAMAAAADAAAAAwAAAAMAAAADAAAAAwAAAAMAAAADAAAAAwAAAAMAAAADAAAAAwAAAAMAAAADAAAAAwAAAAMAAAADAAAAAwAAAAMAAAADAAAAAwAAAAMAAAADAAAAAwAAAAMAAAADAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAAA="], "}": [8, "4AAAAPAAAAB4AAAAOAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAABgAAAAcAAAADwAAAA8AAAAcAAAAGAAAADgAAAA4AAAAOAAAADgAAAA4AAAAOAAAADgAAAB4AAAA8AAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "~": [15, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAfwwAAP8cAADj/AAAw/gAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "\u2026": [17, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABhhgAA888AAPPPAABhhgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "\xA9": [20, "AAAAAAAAAAAAAAAAAfwAAAf/AAAfB8AAHAHAADgA4ABw+HAAY/wwAOOOOADnBjgAxgAYAMYAGADGABgA5wY4AOOOOABj/DAAcPhwADgA4AAcAcAAHwfAAAf/AAAB/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="], "\u24B6": [27, "AAAAAAA/gAAB//AAA//4AAf//gAP//8AH///gD///4B/8f/Af+D/wH/g/+D/4P/g/8B/4P/Ef+D/hD/g/44/4P+AP+D/AB/gfwAf4H8fD8B+P4/APj+PgB///4Af//8AD//+AAf//AAB//AAAH/AAAAAAAAAAAAAAAAAAAAAAAA="], "\u24B7": [27, "AAAAAAA/gAAB//AAA//4AAf//gAP//8AH///gD///4B/gP/Af4B/wH+IP+D/jj/g/44/4P+IP+D/gH/g/4A/4P+OP+D/jh/gf44f4H+AP8B/gD/AP4D/gB///4Af//8AD//+AAf//AAB//AAAH/AAAAAAAAAAAAAAAAAAAAAAAA="] } }, "SFTV-11-Medium-extended": { "cw": 22, "ch": 22, "tracking": 1, "kern": {}, "glyphs": { "0": [12, "AAAADwAAP8AAcOAAYGAA4HAAwDAAwDAAwDAAwDAAwDAAwDAA4HAAYGAAcOAAP8AADwAAAAAAAAAAAAAAAAAAAAAA"], "1": [5, "AAAAHAAAPAAA/AAA7AAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAADAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "2": [11, "AAAAHwAAf4AA4cAAwMAAAMAAAcAAAYAAB4AADwAAHAAAOAAAcAAAYAAAf8AAf8AAAAAAAAAAAAAAAAAAAAAAAAAA"], "3": [12, "AAAAPgAAf4AA44AAAcAAAcAAAYAAD4AAHwAAB4AAAcAAAMAAAMAAAcAA44AAf4AAPgAAAAAAAAAAAAAAAAAAAAAA"], "4": [12, "AAAAA4AAA4AAB4AAD4AADYAAGYAAOYAAMYAAYYAA4YAA//AA//AAAYAAAYAAAYAAAAAAAAAAAAAAAAAAAAAAAAAA"], "5": [11, "AAAAf4AAf4AAYAAAYAAAYAAAbgAAf4AAc4AAAcAAAMAAAMAAAMAA4YAAf4AAPgAAAAAAAAAAAAAAAAAAAAAAAAAA"], "6": [12, "AAAAD4AAP8AAcMAAYAAA4AAAwAAA3wAA/8AA8MAA4OAA4GAA4GAAYOAAccAAP8AAHwAAAAAAAAAAAAAAAAAAAAAA"], "7": [11, "AAAA/8AA/8AAAcAAAYAAA4AAAwAABwAABgAADgAADAAAHAAAGAAAOAAAMAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "8": [11, "AAAAHwAAf8AAcMAAYMAAYOAAYMAAccAAP4AAf8AAYMAAwGAAwGAAwGAA4eAAf8AAP4AAAAAAAAAAAAAAAAAAAAAA"], "9": [12, "AAAAHwAAf4AAccAA4MAAwOAAwOAA4OAAYeAAf+AAP2AAAGAAAOAAAMAAYcAAf4AAPgAAAAAAAAAAAAAAAAAAAAAA"], " ": [3, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "!": [2, "AAAA4AAA4AAA4AAA4AAA4AAA4AAA4AAA4AAA4AAA4AAAAAAAAAAAQAAA4AAA4AAAAAAAAAAAAAAAAAAAAAAAAAAA"], '"': [6, "AAAA2AAA2AAA2AAA2AAA2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "#": [14, "AAAABGAADGAADGAADEAAf/gAf/gACMAAGMAAGMAAf/AA//AAEYAAEYAAMYAAMYAAAAAAAAAAAAAAAAAAAAAAAAAA"], "$": [11, "DAAAHgAAf4AAbcAA7IAA7AAAbAAAfgAAHwAAD4AADcAADMAA7cAAf4AAPwAADAAADAAADAAAAAAAAAAAAAAAAAAA"], "%": [15, "AAAAOAwAfBgAxjAAxnAAxmAAzMAAfcAAAYAAAwAAB3wABmYADMYAGMYAGMYAMHwAYDgAAAAAAAAAAAAAAAAAAAAA"], "&": [13, "AAAAHgAAP4AAcYAAcYAAcYAAOwAAHwAAHgAAPgAAdzAA47AAwfAAwOAA4eAAf/AAPzgAAAAAAAAAAAAAAAAAAAAA"], "'": [2, "AAAAwAAAwAAAwAAAwAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "(": [5, "GAAAMAAAcAAAYAAAYAAA4AAAwAAAwAAAwAAAwAAAwAAA4AAAYAAAYAAAcAAAMAAAGAAAHAAAAAAAAAAAAAAAAAAA"], ")": [5, "YAAAMAAAOAAAGAAAGAAAHAAADAAADAAADAAADAAADAAAHAAAGAAAGAAAOAAAMAAAYAAA4AAAAAAAAAAAAAAAAAAA"], "*": [8, "AAAAGAAAGAAA/wAAfgAAPAAAdgAAJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "+": [10, "AAAAAAAAAAAAAAAAAAAADAAADAAADAAADAAA/8AA/8AADAAADAAADAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"], ",": [3, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAYAAAYAAA4AAAwAAAAAAAAAAAAAAA"], "-": [8, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfgAAfgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"], ".": [2, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4AAA4AAA4AAAAAAAAAAAAAAAAAAAAAAA"], "/": [9, "AwAABwAABgAABgAADgAADAAADAAAHAAAGAAAGAAAOAAAMAAAMAAAcAAAYAAAYAAA4AAAwAAAAAAAAAAAAAAAAAAA"], ":": [2, "AAAAAAAAAAAAAAAAAAAA4AAA4AAAQAAAAAAAAAAAAAAAAAAAAAAAQAAA4AAA4AAAAAAAAAAAAAAAAAAAAAAAAAAA"], ";": [4, "AAAAAAAAAAAAAAAAAAAAYAAAcAAAIAAAAAAAAAAAAAAAAAAAAAAAIAAAcAAAYAAA4AAAwAAAAAAAAAAAAAAAAAAA"], "<": [9, "AAAAAAAAAAAAAAAAAAAAAQAABwAAPgAA+AAA4AAA+AAAPgAADwAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "=": [11, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAP8AAAAAAAAAAP8AAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"], ">": [9, "AAAAAAAAAAAAAAAAAAAAgAAA4AAAfAAAHwAABwAAHwAAfAAA8AAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "?": [9, "AAAAPgAAfwAA4wAAAYAAAYAAAYAAA4AAHwAAHgAAGAAAGAAAGAAAAAAAGAAAGAAAGAAAAAAAAAAAAAAAAAAAAAAA"], "@": [18, "AAAAA/gAD/4AHAcAOAGAcADAY+zAx/xgzhxgzAxgzAxgzAxgzgxgxhxgx/zAY+fAcAcAOAAAHAAAD/wAA/gAAAAA"], "A": [13, "AAAAAwAAB4AAB4AAD8AADMAADMAAHOAAGGAAGHAAP/AAP/AAcDgAYBgAYBgA4AwAAAAAAAAAAAAAAAAAAAAAAAAA"], "B": [11, "AAAA/gAA/4AAwYAAwcAAwcAAwYAA/4AA/wAAw4AAwMAAwMAAwMAAwcAA/4AA/wAAAAAAAAAAAAAAAAAAAAAAAAAA"], "C": [14, "AAAAD8AAH/AAODgAcBwAYAgA4AAAwAAAwAAAwAAAwAAA4AAAYAgAcBwAOHgAH/AAD8AAAAAAAAAAAAAAAAAAAAAA"], "D": [12, "AAAA/wAA/4AAwcAAwOAAwHAAwHAAwDAAwDAAwDAAwHAAwHAAwOAAwcAA/4AA/wAAAAAAAAAAAAAAAAAAAAAAAAAA"], "E": [10, "AAAA/4AA/4AAwAAAwAAAwAAAwAAA/wAA/wAAwAAAwAAAwAAAwAAAwAAA/4AA/4AAAAAAAAAAAAAAAAAAAAAAAAAA"], "F": [10, "AAAA/4AA/4AAwAAAwAAAwAAAwAAAwAAA/wAA/wAAwAAAwAAAwAAAwAAAwAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "G": [14, "AAAAB8AAH/AAODgAcBgAYAAAwAAAwAAAwAAAwPwAwHwA4AwAYAwAcBgAODgAH/AAB8AAAAAAAAAAAAAAAAAAAAAA"], "H": [12, "AAAAwDAAwDAAwDAAwDAAwDAAwDAA//AA//AAwDAAwDAAwDAAwDAAwDAAwDAAwDAAAAAAAAAAAAAAAAAAAAAAAAAA"], "I": [2, "AAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "J": [5, "AAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAADAAAzAAAeAAAcAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "K": [12, "AAAAwMAAwYAAw4AAxwAAzgAA3AAA+AAA+AAA/AAAzgAAxwAAwwAAw4AAwcAAwOAAAAAAAAAAAAAAAAAAAAAAAAAA"], "L": [9, "AAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAA/4AA/4AAAAAAAAAAAAAAAAAAAAAAAAAA"], "M": [15, "AAAA4BwA4BwA8DwA8HwA2GwA3OwAz8wAx4wAx4wAwwwAwAwAwAwAwAwAwAwAwAwAAAAAAAAAAAAAAAAAAAAAAAAA"], "N": [11, "AAAAwDAA4DAA8DAA8DAA2DAA3DAAzjAAxjAAxzAAw7AAwbAAwfAAwPAAwHAAwDAAAAAAAAAAAAAAAAAAAAAAAAAA"], "O": [15, "AAAAB8AAH/AAODgAcBwAYAwA4A4AwAYAwAYAwAYAwAYA4A4AYAwAcBwAODgAH/AAB+AAAAAAAAAAAAAAAAAAAAAA"], "P": [10, "AAAA/gAA/4AAwcAAwMAAwMAAwMAAwcAAw4AA/wAA/gAAwAAAwAAAwAAAwAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "Q": [15, "AAAAB8AAH/AAODgAcBwAYAwA4A4AwAYAwAYAwAYAwEYA4O4AYHwAeDwAP/wAD+4AAAQAAAAAAAAAAAAAAAAAAAAA"], "R": [10, "AAAA/wAA/4AAwcAAwMAAwMAAwMAAwcAA/4AA/wAAxwAAwwAAw4AAwcAAwMAAwOAAAAAAAAAAAAAAAAAAAAAAAAAA"], "S": [11, "AAAAHwAAP8AAcOAAYGAAYAAAYAAAeAAAPwAAD8AAAcAAAOAAAGAA4GAAcOAAf8AAH4AAAAAAAAAAAAAAAAAAAAAA"], "T": [12, "AAAA//AA//AABgAABgAABgAABgAABgAABgAABgAABgAABgAABgAABgAABgAABgAAAAAAAAAAAAAAAAAAAAAAAAAA"], "U": [12, "AAAAwDAAwDAAwDAAwDAAwDAAwDAAwDAAwDAAwDAAwDAAwDAA4HAAcOAAP8AAH4AAAAAAAAAAAAAAAAAAAAAAAAAA"], "V": [12, "AAAAwBgAYDAAYDAAYDAAMGAAMGAAMGAAGMAAGMAAHcAADYAADYAABwAABwAABwAAAAAAAAAAAAAAAAAAAAAAAAAA"], "W": [18, "AAAAwOBg4OBgYODAYPDAYfDAMbGAMbGAMxmAOxuAGxsAGxsAHg8ADg4ADg4ADg4AAAAAAAAAAAAAAAAAAAAAAAAA"], "X": [11, "AAAA4HAAYGAAMMAAOcAAGYAADwAADwAABgAADwAADwAAGYAAOcAAMMAAYGAA4HAAAAAAAAAAAAAAAAAAAAAAAAAA"], "Y": [10, "AAAAwGAAYMAAYcAAMYAAM4AAGwAAHwAADgAADgAABAAABAAABAAABAAABAAABAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "Z": [11, "AAAA//AA//AAAHAAAOAAAcAAA4AABwAABgAADgAAHAAAOAAAcAAA4AAA//AA//AAAAAAAAAAAAAAAAAAAAAAAAAA"], "[": [5, "8AAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAA8AAA8AAAAAAAAAAAAAAAAAAA"], "\\": [9, "wAAA4AAAYAAAYAAAcAAAMAAAMAAAOAAAGAAAGAAAHAAADAAADAAADgAABgAABgAABwAAAwAAAAAAAAAAAAAAAAAA"], "]": [5, "8AAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAA8AAA8AAAAAAAAAAAAAAAAAAA"], "^": [7, "AAAAGAAAPAAAPAAAZAAAZgAARgAAwwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "_": [11, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8AAP8AAAAAAAAAAAAAAAAAA"], "`": [3, "AAAAwAAAYAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "a": [9, "AAAAAAAAAAAAAAAAAAAAPgAAfwAAY4AAAYAAH4AAf4AA4YAAwYAAw4AA/4AAPYAAAAAAAAAAAAAAAAAAAAAAAAAA"], "b": [10, "AAAAwAAAwAAAwAAAwAAA3wAA/4AA4YAAwMAAwMAAwMAAwMAAwMAA4YAA/4AA3wAAAAAAAAAAAAAAAAAAAAAAAAAA"], "c": [10, "AAAAAAAAAAAAAAAAAAAAHwAAP4AAYcAA4AAAwAAAwAAAwAAA4IAAYcAAP4AAHwAAAAAAAAAAAAAAAAAAAAAAAAAA"], "d": [10, "AAAAAMAAAMAAAMAAAMAAPsAAf8AAYcAAwMAAwMAAwMAAwMAAwMAAYcAAf8AAPsAAAAAAAAAAAAAAAAAAAAAAAAAA"], "e": [10, "AAAAAAAAAAAAAAAAAAAAHgAAf4AAYYAAwMAA/8AA/8AAwAAAwAAAYcAAf4AAHwAAAAAAAAAAAAAAAAAAAAAAAAAA"], "f": [7, "AAAAHwAAPgAAMAAAMAAA/gAA/gAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "g": [10, "AAAAAAAAAAAAAAAAAAAAPsAAf8AAYcAA4cAAwMAAwMAAwMAA4cAAYcAAf8AAPsAAAMAAAcAAQYAAf4AAPgAAAAAA"], "h": [9, "AAAAwAAAwAAAwAAAwAAA3wAA/4AA4cAA4cAAwMAAwMAAwMAAwMAAwMAAwMAAwMAAAAAAAAAAAAAAAAAAAAAAAAAA"], "i": [3, "AAAAwAAAwAAAAAAAAAAAAAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAAAAAAAAAAAAAAAAAAAAA"], "j": [4, "AAAAGAAAGAAAAAAAAAAAAAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAA8AAA8AAAAAAA"], "k": [10, "AAAAwAAAwAAAwAAAwAAAwwAAxwAAzgAA3AAA+AAA+AAA7AAAzgAAxgAAwwAAw4AAAAAAAAAAAAAAAAAAAAAAAAAA"], "l": [2, "AAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "m": [16, "AAAAAAAAAAAAAAAAAAAA3jwA/34A48cAwYMAwYMAwYMAwYMAwYMAwYMAwYMAwYMAAAAAAAAAAAAAAAAAAAAAAAAA"], "n": [9, "AAAAAAAAAAAAAAAAAAAA3wAA/4AA4cAA4cAAwMAAwMAAwMAAwMAAwMAAwMAAwMAAAAAAAAAAAAAAAAAAAAAAAAAA"], "o": [11, "AAAAAAAAAAAAAAAAAAAAHwAAP4AAccAA4OAAwGAAwGAAwGAA4OAAccAAP4AAHwAAAAAAAAAAAAAAAAAAAAAAAAAA"], "p": [10, "AAAAAAAAAAAAAAAAAAAA3wAA/4AA4YAAwMAAwMAAwMAAwMAAwMAA4YAA/4AA3wAAwAAAwAAAwAAAwAAAAAAAAAAA"], "q": [10, "AAAAAAAAAAAAAAAAAAAAPsAAf8AAYcAAwMAAwMAAwMAAwMAAwMAAYcAAf8AAPsAAAMAAAMAAAMAAAMAAAAAAAAAA"], "r": [6, "AAAAAAAAAAAAAAAAAAAAzAAA/AAA8AAA4AAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "s": [8, "AAAAAAAAAAAAAAAAAAAAPgAAfwAAYQAAYAAAeAAAPwAAB4AAAYAA44AAfwAAPgAAAAAAAAAAAAAAAAAAAAAAAAAA"], "t": [7, "AAAAAAAAMAAAMAAAMAAA/gAA/gAAMAAAMAAAMAAAMAAAMAAAMAAAMAAAPgAAHgAAAAAAAAAAAAAAAAAAAAAAAAAA"], "u": [9, "AAAAAAAAAAAAAAAAAAAAwMAAwMAAwMAAwMAAwMAAwMAAwMAAwcAA4cAAf8AAPsAAAAAAAAAAAAAAAAAAAAAAAAAA"], "v": [8, "AAAAAAAAAAAAAAAAAAAAwYAAwQAAYwAAYwAAYwAANgAANgAANgAAHAAAHAAAHAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "w": [14, "AAAAAAAAAAAAAAAAAAAAw4YAw4YAY4wAY8wAZswANtgANFgAPHgAHHgAHHAAGDAAAAAAAAAAAAAAAAAAAAAAAAAA"], "x": [9, "AAAAAAAAAAAAAAAAAAAAYYAAc4AAMwAAHgAAHgAADAAAHgAAPwAAMwAAYYAA4cAAAAAAAAAAAAAAAAAAAAAAAAAA"], "y": [10, "AAAAAAAAAAAAAAAAAAAAwGAAYMAAYMAAccAAMYAAM4AAGwAAHwAADgAADgAADgAADAAADAAAeAAAcAAAAAAAAAAA"], "z": [9, "AAAAAAAAAAAAAAAAAAAA/4AA/4AAAwAABwAADgAAHAAAOAAAcAAAYAAA/4AA/4AAAAAAAAAAAAAAAAAAAAAAAAAA"], "{": [6, "HAAAOAAAMAAAMAAAMAAAMAAAMAAAcAAA4AAAcAAAMAAAMAAAMAAAMAAAMAAAOAAAHAAADAAAAAAAAAAAAAAAAAAA"], "|": [2, "wAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAAAAA"], "}": [6, "4AAAcAAAMAAAMAAAMAAAMAAAMAAAOAAAHAAAOAAAMAAAMAAAMAAAMAAAMAAAcAAA4AAAwAAAAAAAAAAAAAAAAAAA"], "~": [10, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAA/MAAz8AAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "\u2026": [12, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxjAA5nAAxjAAAAAAAAAAAAAAAAAAAAAA"], "\xA9": [15, "AAAAB+AAH/gAOBwAYAYAZ+YAzmMAzCMAzAMAzAMAzDMAzmMAZ8YAYAYAOBwAH/gAB+AAAAAAAAAAAAAAAAAAAAAA"], "\u24B6": [18, "AAAAA/AAD/wAH/4AP/8Af/+Afz/A/h/A/h/A/B/A/M/A/I/A+AfAeefAeeeAP/8AH/8AD/wAB/gAAAAAAAAAAAAA"], "\u24B7": [18, "AAAAA/AAD/wAH/4AP/8Af/+AfB/A/A/A/M/A/I/A/B/A/M/A/M/AfA/AfB+AP/8AH/8AD/wAB/gAAAAAAAAAAAAA"], "\u2018": [3, "AAAAMAAAcAAAYAAAYAAA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "\u2019": [3, "AAAAcAAAYAAAYAAA4AAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "\u201C": [6, "AAAAJgAAZgAAbAAAbAAAzAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"], "\u201D": [6, "AAAAZgAAbgAAbAAAzAAAyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"] } }, "Notes-14": { "cw": 10, "ch": 11, "tracking": 1, "kern": {}, "glyphs": { "0": [6, "AAAAAHAAiACYAKgAyACIAHAAAAAAAA=="], "1": [3, "AAAAAEAAwABAAEAAQABAAEAAAAAAAA=="], "2": [6, "AAAAAHAAiAAIABAAIABAAPgAAAAAAA=="], "3": [6, "AAAAAHAAiAAIADAACACIAHAAAAAAAA=="], "4": [6, "AAAAABAAMABQAJAA+AAQABAAAAAAAA=="], "5": [6, "AAAAAPgAgADwAAgACACIAHAAAAAAAA=="], "6": [6, "AAAAAHAAiACAAPAAiACIAHAAAAAAAA=="], "7": [6, "AAAAAPgACAAIABAAEAAgACAAAAAAAA=="], "8": [6, "AAAAAHAAiACIAHAAiACIAHAAAAAAAA=="], "9": [6, "AAAAAHAAiACIAHgACACIAHAAAAAAAA=="], " ": [2, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="], "!": [2, "AAAAAIAAgACAAIAAgAAAAIAAAAAAAA=="], '"': [4, "AAAAAKAAoACgAAAAAAAAAAAAAAAAAA=="], "#": [6, "AAAAAAAAUAD4AFAA+ABQAAAAAAAAAA=="], "$": [6, "AAAgAHAAqACgAHAAKACoAHAAIAAAAA=="], "%": [8, "AAAAAEIApABIABAAJABKAIQAAAAAAA=="], "&": [7, "AAAAAGAAkACQAGQAlACIAHQAAAAAAA=="], "'": [2, "AAAAAIAAgACAAAAAAAAAAAAAAAAAAA=="], "(": [4, "AAAgAEAAgACAAIAAgACAAEAAIAAAAA=="], ")": [4, "AACAAEAAIAAgACAAIAAgAEAAgAAAAA=="], "*": [6, "AAAAACAAqABwAKgAIAAAAAAAAAAAAA=="], "+": [6, "AAAAAAAAIAAgAPgAIAAgAAAAAAAAAA=="], ",": [3, "AAAAAAAAAAAAAAAAAABAAEAAgAAAAA=="], "-": [6, "AAAAAAAAAAAAAPgAAAAAAAAAAAAAAA=="], ".": [2, "AAAAAAAAAAAAAAAAAAAAAIAAAAAAAA=="], "/": [8, "AAAAAAIABAAIABAAIABAAIAAAAAAAA=="], ":": [2, "AAAAAAAAAACAAAAAAACAAAAAAAAAAA=="], ";": [3, "AAAAAAAAAABAAAAAAABAAEAAgAAAAA=="], "<": [4, "AAAAAAAAIABAAIAAQAAgAAAAAAAAAA=="], "=": [6, "AAAAAAAAAAD4AAAA+AAAAAAAAAAAAA=="], ">": [4, "AAAAAAAAgABAACAAQACAAAAAAAAAAA=="], "?": [6, "AAAAAHAAiAAIABAAIAAAACAAAAAAAA=="], "@": [9, "AAB+AIEAnQClAKUAngCAAH4AAAAAAA=="], "A": [6, "AAAAAHAAiACIAPgAiACIAIgAAAAAAA=="], "B": [6, "AAAAAPAAiACIAPAAiACIAPAAAAAAAA=="], "C": [6, "AAAAAHAAiACAAIAAgACIAHAAAAAAAA=="], "D": [6, "AAAAAPAAiACIAIgAiACIAPAAAAAAAA=="], "E": [6, "AAAAAPgAgACAAPAAgACAAPgAAAAAAA=="], "F": [6, "AAAAAPgAgACAAPAAgACAAIAAAAAAAA=="], "G": [6, "AAAAAHAAiACAAJgAiACIAHAAAAAAAA=="], "H": [6, "AAAAAIgAiACIAPgAiACIAIgAAAAAAA=="], "I": [2, "AAAAAIAAgACAAIAAgACAAIAAAAAAAA=="], "J": [6, "AAAAAAgACAAIAAgACACIAHAAAAAAAA=="], "K": [6, "AAAAAIgAkACgAMAAoACQAIgAAAAAAA=="], "L": [6, "AAAAAIAAgACAAIAAgACAAPgAAAAAAA=="], "M": [8, "AAAAAIIAxgCqAJIAggCCAIIAAAAAAA=="], "N": [6, "AAAAAIgAiADIAKgAmACIAIgAAAAAAA=="], "O": [6, "AAAAAHAAiACIAIgAiACIAHAAAAAAAA=="], "P": [6, "AAAAAPAAiACIAPAAgACAAIAAAAAAAA=="], "Q": [6, "AAAAAHAAiACIAIgAiACIAHAACAAAAA=="], "R": [6, "AAAAAPAAiACIAPAAoACQAIgAAAAAAA=="], "S": [6, "AAAAAHAAiACAAHAACACIAHAAAAAAAA=="], "T": [6, "AAAAAPgAIAAgACAAIAAgACAAAAAAAA=="], "U": [6, "AAAAAIgAiACIAIgAiACIAHAAAAAAAA=="], "V": [6, "AAAAAIgAiACIAFAAUAAgACAAAAAAAA=="], "W": [8, "AAAAAJIAkgCSAJIAkgCSAGwAAAAAAA=="], "X": [6, "AAAAAIgAiABQACAAUACIAIgAAAAAAA=="], "Y": [6, "AAAAAIgAiABQACAAIAAgACAAAAAAAA=="], "Z": [6, "AAAAAPgACAAQACAAQACAAPgAAAAAAA=="], "[": [4, "AADgAIAAgACAAIAAgACAAIAA4AAAAA=="], "\\": [8, "AAAAAIAAQAAgABAACAAEAAIAAAAAAA=="], "]": [4, "AADgACAAIAAgACAAIAAgACAA4AAAAA=="], "^": [6, "AAAAACAAUACIAAAAAAAAAAAAAAAAAA=="], "_": [6, "AAAAAAAAAAAAAAAAAAAAAPgAAAAAAA=="], "`": [4, "AAAAAIAAQAAgAAAAAAAAAAAAAAAAAA=="], "a": [5, "AAAAAAAAAABwAJAAkACQAHAAAAAAAA=="], "b": [5, "AAAAAIAAgADgAJAAkACQAOAAAAAAAA=="], "c": [5, "AAAAAAAAAABgAJAAgACQAGAAAAAAAA=="], "d": [5, "AAAAABAAEABwAJAAkACQAHAAAAAAAA=="], "e": [5, "AAAAAAAAAABgAJAA8ACAAGAAAAAAAA=="], "f": [3, "AAAAAEAAgACAAMAAgACAAIAAAAAAAA=="], "g": [5, "AAAAAAAAAABwAJAAkACQAHAAEABgAA=="], "h": [5, "AAAAAIAAgADgAJAAkACQAJAAAAAAAA=="], "i": [2, "AAAAAIAAAACAAIAAgACAAIAAAAAAAA=="], "j": [3, "AAAAAEAAAABAAEAAQABAAEAAQACAAA=="], "k": [5, "AAAAAIAAgACQAKAAwACgAJAAAAAAAA=="], "l": [2, "AAAAAIAAgACAAIAAgACAAIAAAAAAAA=="], "m": [8, "AAAAAAAAAADsAJIAkgCSAJIAAAAAAA=="], "n": [5, "AAAAAAAAAADgAJAAkACQAJAAAAAAAA=="], "o": [5, "AAAAAAAAAABgAJAAkACQAGAAAAAAAA=="], "p": [5, "AAAAAAAAAADgAJAAkACQAOAAgACAAA=="], "q": [5, "AAAAAAAAAABwAJAAkACQAHAAEAAQAA=="], "r": [4, "AAAAAAAAAADgAIAAgACAAIAAAAAAAA=="], "s": [4, "AAAAAAAAAABgAIAAQAAgAMAAAAAAAA=="], "t": [4, "AAAAAEAAQADgAEAAQABAAEAAAAAAAA=="], "u": [5, "AAAAAAAAAACQAJAAkACQAHAAAAAAAA=="], "v": [5, "AAAAAAAAAACQAJAAkACQAGAAAAAAAA=="], "w": [8, "AAAAAAAAAACSAJIAkgCSAGwAAAAAAA=="], "x": [5, "AAAAAAAAAACQAJAAYACQAJAAAAAAAA=="], "y": [5, "AAAAAAAAAACQAJAAkACQAHAAEABgAA=="], "z": [5, "AAAAAAAAAADwABAAYACAAPAAAAAAAA=="], "{": [4, "AAAgAEAAQABAAIAAQABAAEAAIAAAAA=="], "|": [2, "AACAAIAAgACAAIAAgACAAIAAgAAAAA=="], "}": [4, "AACAAEAAQABAACAAQABAAEAAgAAAAA=="], "~": [7, "AAAAAAAAAABkAJgAAAAAAAAAAAAAAA=="], "\u2014": [6, "AAAAAAAAAAAAAPgAAAAAAAAAAAAAAA=="], "\u2013": [6, "AAAAAAAAAAAAAPgAAAAAAAAAAAAAAA=="], "\xAB": [4, "AAAAAAAAIABAAIAAQAAgAAAAAAAAAA=="], "\xBB": [4, "AAAAAAAAgABAACAAQACAAAAAAAAAAA=="], "\u201C": [6, "AAAAAEgAkACQAAAAAAAAAAAAAAAAAA=="], "\u201D": [6, "AAAAAEgASACQAAAAAAAAAAAAAAAAAA=="], "\u2026": [2, "AAAAAAAAAAAAAAAAAAAAAIAAAAAAAA=="], "\u2116": [6, "AAAAAIgAiADIAKgAmACIAIgAAAAAAA=="], "\u0401": [6, "AAAAAPgAgACAAPAAgACAAPgAAAAAAA=="], "\u0451": [5, "AAAAAAAAAABgAJAA8ACAAGAAAAAAAA=="], "\u0410": [6, "AAAAAHAAiACIAPgAiACIAIgAAAAAAA=="], "\u0411": [6, "AAAAAPgAgACAAPAAiACIAPAAAAAAAA=="], "\u0412": [6, "AAAAAPAAiACIAPAAiACIAPAAAAAAAA=="], "\u0413": [6, "AAAAAPgAgACAAIAAgACAAIAAAAAAAA=="], "\u0414": [8, "AAAAADgARABEAEQARABEAP4AggAAAA=="], "\u0415": [6, "AAAAAPgAgACAAPAAgACAAPgAAAAAAA=="], "\u0416": [8, "AAAAAJIAkgCSAHwAkgCSAJIAAAAAAA=="], "\u0417": [6, "AAAAAHAAiAAIAHAACACIAHAAAAAAAA=="], "\u0418": [6, "AAAAAIgAiACYAKgAyACIAIgAAAAAAA=="], "\u0419": [6, "AAAgAIgAiACYAKgAyACIAIgAAAAAAA=="], "\u041A": [6, "AAAAAIgAkACgAMAAoACQAIgAAAAAAA=="], "\u041B": [6, "AAAAADgASABIAEgASABIAIgAAAAAAA=="], "\u041C": [8, "AAAAAIIAxgCqAJIAggCCAIIAAAAAAA=="], "\u041D": [6, "AAAAAIgAiACIAPgAiACIAIgAAAAAAA=="], "\u041E": [6, "AAAAAHAAiACIAIgAiACIAHAAAAAAAA=="], "\u041F": [6, "AAAAAPgAiACIAIgAiACIAIgAAAAAAA=="], "\u0420": [6, "AAAAAPAAiACIAPAAgACAAIAAAAAAAA=="], "\u0421": [6, "AAAAAHAAiACAAIAAgACIAHAAAAAAAA=="], "\u0422": [6, "AAAAAPgAIAAgACAAIAAgACAAAAAAAA=="], "\u0423": [6, "AAAAAIgAiACIAHgACACIAHAAAAAAAA=="], "\u0424": [8, "AAAQAHwAkgCSAJIAkgCSAHwAEAAAAA=="], "\u0425": [6, "AAAAAIgAiABQACAAUACIAIgAAAAAAA=="], "\u0426": [7, "AAAAAIgAiACIAIgAiACIAPwABAAAAA=="], "\u0427": [6, "AAAAAIgAiACIAHgACAAIAAgAAAAAAA=="], "\u0428": [8, "AAAAAJIAkgCSAJIAkgCSAP4AAAAAAA=="], "\u0429": [9, "AAAAAJIAkgCSAJIAkgCSAP8AAQAAAA=="], "\u042A": [8, "AAAAAOAAIAAgADwAIgAiADwAAAAAAA=="], "\u042B": [8, "AAAAAIIAggCCAPIAigCKAPIAAAAAAA=="], "\u042C": [6, "AAAAAIAAgACAAPAAiACIAPAAAAAAAA=="], "\u042D": [6, "AAAAAHAAiAAIADgACACIAHAAAAAAAA=="], "\u042E": [9, "AAAAAI4AkQCRAPEAkQCRAI4AAAAAAA=="], "\u042F": [6, "AAAAAHgAiACIAHgAKABIAIgAAAAAAA=="], "\u0430": [5, "AAAAAAAAAABwAJAAkACQAHAAAAAAAA=="], "\u0431": [5, "AAAAAHAAgADgAJAAkACQAGAAAAAAAA=="], "\u0432": [5, "AAAAAAAAAADgAJAA4ACQAOAAAAAAAA=="], "\u0433": [5, "AAAAAAAAAADwAIAAgACAAIAAAAAAAA=="], "\u0434": [7, "AAAAAAAAAAAwAEgASABIAPwAhAAAAA=="], "\u0435": [5, "AAAAAAAAAABgAJAA8ACAAGAAAAAAAA=="], "\u0436": [8, "AAAAAAAAAACSAJIAfACSAJIAAAAAAA=="], "\u0437": [5, "AAAAAAAAAABgAJAAIACQAGAAAAAAAA=="], "\u0438": [6, "AAAAAAAAAACIAJgAqADIAIgAAAAAAA=="], "\u0439": [6, "UAAAACAAAACIAJgAqADIAIgAAAAAAA=="], "\u043A": [5, "AAAAAAAAAACQAKAAwACgAJAAAAAAAA=="], "\u043B": [5, "AAAAAAAAAAAwAFAAUABQAJAAAAAAAA=="], "\u043C": [6, "AAAAAAAAAACIANgAqACIAIgAAAAAAA=="], "\u043D": [5, "AAAAAAAAAACQAJAA8ACQAJAAAAAAAA=="], "\u043E": [5, "AAAAAAAAAABgAJAAkACQAGAAAAAAAA=="], "\u043F": [5, "AAAAAAAAAADwAJAAkACQAJAAAAAAAA=="], "\u0440": [5, "AAAAAAAAAADgAJAAkACQAOAAgACAAA=="], "\u0441": [5, "AAAAAAAAAABgAJAAgACQAGAAAAAAAA=="], "\u0442": [6, "AAAAAAAAAAD4ACAAIAAgACAAAAAAAA=="], "\u0443": [5, "AAAAAAAAAACQAJAAkACQAHAAEABgAA=="], "\u0444": [8, "AAAAABAAEAB8AJIAkgCSAHwAEAAQAA=="], "\u0445": [5, "AAAAAAAAAACQAJAAYACQAJAAAAAAAA=="], "\u0446": [6, "AAAAAAAAAACQAJAAkACQAPgACAAAAA=="], "\u0447": [5, "AAAAAAAAAACQAJAAcAAQABAAAAAAAA=="], "\u0448": [8, "AAAAAAAAAACSAJIAkgCSAP4AAAAAAA=="], "\u0449": [9, "AAAAAAAAAACSAJIAkgCSAP8AAQAAAA=="], "\u044A": [6, "AAAAAAAAAADAAEAAcABIAHAAAAAAAA=="], "\u044B": [7, "AAAAAAAAAACEAIQA5ACUAOQAAAAAAA=="], "\u044C": [5, "AAAAAAAAAACAAIAA4ACQAOAAAAAAAA=="], "\u044D": [2, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="], "\u044E": [7, "AAAAAAAAAACYAKQA5ACkAJgAAAAAAA=="], "\u044F": [5, "AAAAAAAAAABwAJAAcABQAJAAAAAAAA=="] } } };
  var PD_IMAGES = { "console": { "w": 140, "h": 118, "ink": "AAAAAAAAAAAAAA//AAAAAAAAH/////////////////wAAAAAP/////////////////4AAAAAeAAAAAAAAAAAAAAAf/8AAAAA4AAAAAAAAAAAAAAAH4eAAAAA4AAAAAAAAAAAAAAAHwOAAAAAwAAAAAAAAAAAAAAADjGAAAAAwAAAAAAAAAAAAAAADnmAAAAAwf/////////////+DjGAAAAAwf/////////////+DwOAAAAAwf/////////////+D4eAAAAAwf/////////////+D/+AAAAAwf/////////////+D/+AAAAAwf/////////////+D/+AAAAAwf/////////////+D/+AAAAAwf/////////////+D/+AAAAAwf/////////////+D/+AAAAAwf/////////////+D/+AAAAAwf/////////////+D/+AAAAAwf/////////////+D/+AAAAAwf/////////////+D/+AAAAAwf/////////////+D/+AAAAAwf/////////////+D/+////Awf/////////////+D/+////gwf/////////////+D/+////wwf/////////////+D/+////wwf/////////////+D/+////wwf/////////////+D/+////wwf/////////////+D8+////wwf/////////////+D5e////wwf/////////////+D5e////wwf/////////////+D5e////wwf/////////////+D5e////gwf/////////////+D5e////Awf/////////////+D5e/wAAAwf/////////////+D5e/wAAAwf/////////////+D5e/wAAAwf/////////////+D5e/wAAAwf/////////////+D5e/wAAAwf/////////////+D5e/wAAAwf/////////////+D5e/wAAAwf/////////////+D5e/wAAAwf/////////////+D5e/wAAAwf/////////////+D5e/wAAAwf/////////////+D5e/wAAAwf/////////////+D4e/wAAAwf/////////////+D8+/wAAAwf/////////////+D/+/wAAAwf/////////////+D/+/wAAAwf/////////////+D/+/wAAAwf/////////////+D/+/wAAAwf/////////////+D/+/wAAAwf/////////////+D/+/wAAAwf/////////////+D/+/wAAAwf/////////////+D///wAAAwf/////////////+D///wAAAwf/////////////+D///wAAAwf/////////////+D///wAAAwf/////////////+D///wAAAwf/////////////+D///wAAAwf/////////////+D///gAAAwAAAAAAAAAAAAAAAD///gAAA4AAAAAAAAAAAAAAAH///AAAA4AAAAAAAAAAAAAAAH/+8AAAA+AAAAAAAAAAAAAAAf/+AAAAA//////////////////+AAAAA//////////////////+AAAAA//////////////////+AAAAA//////////////////+AAAAA//////////////////+AAAAA//////////////////+AAAAA//////////////////+AAAAA//////////////////+AAAAA//////////////////+AAAAA//////////////////+AAAAA//////////////////+AAAAA////j/////////////+AAAAA///+A/////+B//8H//+AAAAA///+A/////4Af/wB//+AAAAA///8Af////4Af/gA//+AAAAA///8Af////wAP/gA//+AAAAA///8Af////wAP/AAf/+AAAAA///8Af////gAH/AAf/+AAAAA///8Af////gAH/AAf/+AAAAA///8Af////gAH/AAf/+AAAAA///8Af////wAP/AAf/+AAAAA///8Af////wAP/gA//+AAAAA//wAAAD///4Af/gA//+AAAAA//gAAAB///4Af/wB//+AAAAA//AAAAA///+B//8H//+AAAAA//AAAAA///////////+AAAAA//AAAAA///////////+AAAAA//AAAAA///////////+AAAAA//gAAAB///////////+AAAAA//wAAAD///////////+AAAAA///8Af////////////+AAAAA///8Af////////////+AAAAA///8Af////////////+AAAAA///8Af////////////+AAAAA///8Af////////////+AAAAA///8Af////////////+AAAAA///8Af////////////+AAAAA///8Af////////////+AAAAA///+A/////////////+AAAAA///+A/////////////+AAAAA////j/////////////+AAAAA//////////////////+AAAAA//////////////////+AAAAA+P///////////////4eAAAAA8H///////////////wOAAAAA4j///////////////jGAAAAA5z///////////////nmAAAAA5z///////////////nmAAAAA4j///////////////jGAAAAA8H///////////////wOAAAAAeP///////////////4cAAAAAP/////////////////4AAAAAH/////////////////wAAAAA", "opaque": "///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w///////////////////////w" }, "dolphin": { "w": 71, "h": 49, "ink": "AAD//8AAAAAAAAeAAHgAAAAAABwAAA8AAAAAAHAAAAHAAAAAAcAAAABwAAAAAwAAAAAYAAAABgAAAAAMAAAADAAAAAAGAAAAGAAAAAADAAAAMAAAAAABAAAAIAAAAAABgAAAYAAAAAAAgAAAQAAAAAAAwAAAwAAAAAAAQAAAgAAAAAAAYAAAgAB/AAAAIAAAgAGAwAAAIAAAAAIAIAAAMAAAAAQ+EAAAED/gAAj/iAAAEeA4AAn/yAAAHwAMABH/xAAAcAAGABPP5AADgAACABPP5AAAAAACABP/5AAAAAD6ABP/5AAAAAMGABP/5AAAAAwCADH/9AAAADACAFn8DAAAAMACACjgAAAAAwAGAFSAAAAADAAEACsAAAAAMAAMAFUAAAAAQAAYACoAAAABgAAwABYAAAAGAABgAAIAIAAYAADAAAAAGABgAAGAAAAABgeAAAcAAAAAAfgAAAwAAAAAAAAAADgAAAAAAAAAAGAAAAAAAAAAAcAAAAAAAAAAAwAAAAAAAAAADgAAAAAAAAAAEgAAAAAAAAAAAgAAAAAAAAAAAgAAAAAAAAAAAgAAAAAAAAAAAgAA", "opaque": "///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+" }, "dolphin_open": { "w": 71, "h": 49, "ink": "AAD//8AAAAAAAAeAAHgAAAAAABwAAA8AAAAAAHAAAAHAAAAAAcAAAABwAAAAAwAAAAAYAAAABgAAAAAMAAAADAAAAAAGAAAAGAAAAAADAAAAMAAAAAABAAAAIAAAAAABgAAAYAAAAAAAgAAAQAAAAAAAwAAAwAAAAAAAQAAAgAAAAAAAYAAAgAB/AAAAIAAAgAGAwAAAIAAAAAIAIAAAMAAAAAQ+EAAAED/gAAj/iAAAEeA4AAn/yAAAHwAMABH/xAAAcAAGABPP5AADgAACABPP5AAAAAACABP/5AAAAAD6ABP/5AAAAAMGABP/5AAAAAwCADH/9AAAADACAFn8DAAAAMACADjgAAAAAwAGAHyAAAAADAAEAD8AAAAAMAAMAH8AAAAAQAAYAD4AAAABgAAwAB4AAAAGAABgAD4AIAAYAADAADwAGABgAAGAABgABgeAAAcAAAAAAfgAAAwAAAAAAAAAADgAAAAAAAAAAGAAAAAAAAAAAcAAAAAAAAAAAwAAAAAAAAAADgAAAAAAAAAAEgAAAAAAAAAAAgAAAAAAAAAAAgAAAAAAAAAAAgAAAAAAAAAAAgAA", "opaque": "///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+///////////+" }, "frame_11": { "w": 47, "h": 49, "ink": "AAf/gAAAADgAcAAAAMAADAAAAwAAAwAABAAAAIAACAAAAEAAEAAAACAAIAAAABAAIAAAAAgAQAAAAAgAQAAAAAQAgAAAAAQAgAAAAAIAAAAAAAIAAAAAAAIAAA8AAAEAADzAAAEAAHhgAAEAAHhgAAEAAPhwAAEAANhwAAEAAPzwAAEAAK+wAAEAAL3wAAEAAF3gAAEAAEcgAAUAADDAAAMAAA8AAAEAAIAAAACAAkgAAABAASQAAAAgAJIAAAAQAEkAAAAIAAAGAAAEAAABgAAEAAAAeAAEAAAABwAEAAADAODkAAAB4B8YAAAB/AAQAAAA/4BgAAAAP/+AAAAAD/+AAAAAA/4AAAAAAAIAAAAAAAIAAAAAAAEAAAAAAAEAAAAAAAEA", "opaque": "///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+" }, "frame_22": { "w": 47, "h": 49, "ink": "AAf/gAAAADgAcAAAAMAADAAAAwAAAwAABAAAAIAACAAAAEAAEAAAACAAIAAAABAAIAAAAAgAQAAAAAgAQAAAAAQAgAAAAAQAgAAAAAIAAAAAAAIAAAAAAAIAAAAAAAEAAAAAAAEAAAAAAAEAAD+AAAEAAHjgAAEAALhgAAEAAPzwAAEAAN+wAAEAALnwAAEAAFngAAEAAD/AAAUAAAAAAAMAAJAAAAEAAkgAAACAASSAAABABJJAAAAgAkkgAAAQCSAAAAAIBIAGAAAEAAABgAAEAAAAeAAEAAAAHwAEAAAAB+DkAAAAAf/YAAAAgPHgAAAAcB/gAAAAPAAgAAAAHwAgAAAAD8BAAAAAB//AAAAAAf4AAAAAAH0AAAAAAAEAAAAAAAEA", "opaque": "///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+" }, "frame_31": { "w": 47, "h": 49, "ink": "AAf/gAAAADgAcAAAAMAADAAAAwAAAwAABAAAAIAACAAAAEAAEAAAACAAIAAAABAAIAAAAAgAQAAAAAgAQAAAAAQAgAAAAAQAgAAAAAIAAAAAAAIAAAAAAAIAAAAAAAEAAAAAAAEAAAAAAAEAAD+AAAEAAHjgAAEAALhgAAEAAPzwAAEAAN+wAAEAALnwAAEAAFngAAEAAD/AAAUAAAAAAAMAAJAAAAEAAkgAAACAASSAAABABJJAAAAgAkkgAAAQCSAAAAAIBIAGAAAEAAABgAAEAAAAeAAEAAAABwAEAAADAODkAAAB4B8YAAAB/AAQAAAA/4BgAAAAP/+AAAAAD/4AAAAAA/4AAAAAAB4AAAAAAAIAAAAAAAEAAAAAAAEAAAAAAAEA", "opaque": "///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+" }, "frame_41": { "w": 47, "h": 49, "ink": "AAf/gAAAADgAcAAAAMAADAAAAwAAAwAABAAAAIAACAAAAEAAEAAAACAAIAAAABAAIAAAAAgAQAAAAAgAQAAAAAQAgAAAAAQAgAAAAAIAAAAAAAIAAAAAAAIAAAAAAAEAAAAAAAEAAAAAAAEAAAAAAAEAAAAAAAEAAMAAAAEAAOAAAAEAAPAwAAEAAH/wAAEAAD/gAAEAAB/AAAUAAAAAAAMAAJAAAAEAAkgAAACAASSAAABABJJAAAAgAkkgAAAQCSAAAAAIBIAGAAAEAAABgAAEAAAAeAAEAAAAHwAEAAAAB+DkAAAAAf/YAAAAgPHgAAAAcB/gAAAAPAAgAAAAHwAgAAAAD8BAAAAAB//AAAAAAf4AAAAAAH0AAAAAAAEAAAAAAAEA", "opaque": "///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+" }, "frame_51": { "w": 47, "h": 49, "ink": "AAf/gAAAADgAcAAAAMAADAAAAwAAAwAABAAAAIAACAAAAEAAEAAAACAAIAAAABAAIAAAAAgAQAAAAAgAQAAAAAQAgAAAAAQAgAAAAAIAAAAAAAIAAAAAAAIAAA8AAAEAADzAAAEAAHhgAAEAAHhgAAEAAPhwAAEAANhwAAEAAPzwAAEAAK+wAAEAAL3wAAEAAF3gAAEAAEcgAAUAADDAAAMAAA8AAAEAAIAAAACAAkgAAABAASQAAAAgAJIAAAAQAEkAAAAIAAAGAAAEAAABgAAEAAAAeAAEAAAAHwAEAAAAB+DkAAAAAf/YAAAAgPHgAAAAcB/gAAAAPAAgAAAAHwAgAAAAD8BAAAAAB//AAAAAAf4AAAAAAH0AAAAAAAEAAAAAAAEA", "opaque": "///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+///////+" } };

  // js/ui/pd-gfx.js
  var BLACK = 1;
  var WHITE = 0;
  var W = 400;
  var H = 240;
  var b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  var PdFont = class {
    constructor(def) {
      this.cw = def.cw;
      this.ch = def.ch;
      this.tracking = def.tracking;
      this.kern = def.kern;
      this.glyphs = /* @__PURE__ */ new Map();
      for (const [c, [adv, bits]] of Object.entries(def.glyphs)) this.glyphs.set(c, { adv, bits: b64(bits) });
    }
    get height() {
      return this.ch;
    }
    width(str) {
      let w = 0, prev = null, n = 0;
      for (const c of str) {
        const g = this.glyphs.get(c) || this.glyphs.get("?");
        if (!g) continue;
        if (prev) w += (this.kern[prev + c] || 0) + this.tracking;
        w += g.adv;
        prev = c;
        n++;
      }
      return n ? w : 0;
    }
  };
  var PdImage = class {
    constructor(def) {
      this.w = def.w;
      this.h = def.h;
      this.ink = b64(def.ink);
      this.opaque = b64(def.opaque);
      this.lb = Math.ceil(def.w / 8);
    }
    bit(plane, x, y) {
      return plane[y * this.lb + (x >> 3)] >> 7 - (x & 7) & 1;
    }
  };
  var fonts = Object.fromEntries(Object.entries(PD_FONTS).map(([k, v]) => [k, new PdFont(v)]));
  var images = Object.fromEntries(Object.entries(PD_IMAGES).map(([k, v]) => [k, new PdImage(v)]));
  var Gfx = class _Gfx {
    constructor() {
      this.w = W;
      this.h = H;
      this.px = new Uint8Array(W * H);
      this.ox = 0;
      this.oy = 0;
      this.clip = [0, 0, W, H];
      this.font = null;
    }
    setDrawOffset(x, y) {
      this.ox = x;
      this.oy = y;
    }
    setClipRect(x, y, w, h) {
      this.clip = [Math.max(0, x + this.ox), Math.max(0, y + this.oy), Math.min(W, x + this.ox + w), Math.min(H, y + this.oy + h)];
    }
    clearClipRect() {
      this.clip = [0, 0, W, H];
    }
    clear(c) {
      this.px.fill(c);
    }
    // raw pixel / span in screen coordinates (offset already applied)
    _span(x0, x1, y, c) {
      const [cx0, cy0, cx1, cy1] = this.clip;
      if (y < cy0 || y >= cy1) return;
      if (x0 < cx0) x0 = cx0;
      if (x1 > cx1) x1 = cx1;
      if (x0 < x1) this.px.fill(c, y * W + x0, y * W + x1);
    }
    _dot(x, y, c) {
      const [cx0, cy0, cx1, cy1] = this.clip;
      if (x >= cx0 && x < cx1 && y >= cy0 && y < cy1) this.px[y * W + x] = c;
    }
    fillRect(x, y, w, h, c) {
      x += this.ox;
      y += this.oy;
      for (let yy = y; yy < y + h; yy++) this._span(x, x + w, yy, c);
    }
    // half-width of the rounded rect row `yy` (0..h-1): how far the corners cut in
    static _cut(yy, h, r) {
      let d = -1;
      if (yy < r) d = r - 1 - yy;
      else if (yy >= h - r) d = yy - (h - r);
      if (d < 0) return 0;
      return r - Math.round(Math.sqrt(Math.max(0, r * r - (d + 0.5) * (d + 0.5))));
    }
    fillRoundRect(x, y, w, h, r, c) {
      r = Math.min(r, w >> 1, h >> 1);
      x += this.ox;
      y += this.oy;
      for (let yy = 0; yy < h; yy++) {
        const k = _Gfx._cut(yy, h, r);
        this._span(x + k, x + w - k, y + yy, c);
      }
    }
    drawRoundRect(x, y, w, h, r, lw, c) {
      r = Math.min(r, w >> 1, h >> 1);
      const ri = Math.max(0, r - lw);
      x += this.ox;
      y += this.oy;
      for (let yy = 0; yy < h; yy++) {
        const k = _Gfx._cut(yy, h, r);
        const inner = yy >= lw && yy < h - lw;
        if (!inner) {
          this._span(x + k, x + w - k, y + yy, c);
          continue;
        }
        const ki = lw + _Gfx._cut(yy - lw, h - 2 * lw, ri);
        this._span(x + k, x + ki, y + yy, c);
        this._span(x + w - ki, x + w - k, y + yy, c);
      }
    }
    // Playdate angles: degrees, 0 at 12 o'clock, clockwise; start == end draws the full ellipse
    fillEllipse(x, y, w, h, a0, a1, c) {
      this._ellipse(x, y, w, h, 0, a0, a1, c);
    }
    drawEllipse(x, y, w, h, lw, a0, a1, c) {
      this._ellipse(x, y, w, h, lw, a0, a1, c);
    }
    _ellipse(x, y, w, h, lw, a0, a1, c) {
      x += this.ox;
      y += this.oy;
      const rx2 = w / 2, ry = h / 2, cx = x + rx2, cy = y + ry;
      const full = a0 === a1;
      let s = (a0 % 360 + 360) % 360, span = full ? 360 : ((a1 - a0) % 360 + 360) % 360 || 360;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
        const dx = (xx + 0.5 - cx) / rx2, dy = (yy + 0.5 - cy) / ry;
        const d = dx * dx + dy * dy;
        if (d > 1) continue;
        if (lw > 0) {
          const ix = (xx + 0.5 - cx) / (rx2 - lw), iy = (yy + 0.5 - cy) / (ry - lw);
          if (rx2 - lw > 0 && ry - lw > 0 && ix * ix + iy * iy <= 1) continue;
        }
        if (!full) {
          let ang = Math.atan2(xx + 0.5 - cx, -(yy + 0.5 - cy)) * 180 / Math.PI;
          ang = ((ang - s) % 360 + 360) % 360;
          if (ang > span) continue;
        }
        this._dot(xx, yy, c);
      }
    }
    drawLine(x0, y0, x1, y1, lw, c) {
      x0 += this.ox;
      y0 += this.oy;
      x1 += this.ox;
      y1 += this.oy;
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      const half = lw - 1 >> 1;
      for (; ; ) {
        for (let a = -half; a < lw - half; a++) for (let b = -half; b < lw - half; b++) this._dot(x0 + a, y0 + b, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) {
          err += dy;
          x0 += sx;
        }
        if (e2 <= dx) {
          err += dx;
          y0 += sy;
        }
      }
    }
    fillTriangle(x0, y0, x1, y1, x2, y2, c) {
      const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
      const edge = (ax, ay, bx, by, yy) => ay === by ? null : (yy - ay) * (bx - ax) / (by - ay) + ax;
      for (let yy = minY; yy <= maxY; yy++) {
        const xs = [];
        for (const [ax, ay, bx, by] of [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]])
          if (yy >= Math.min(ay, by) && yy <= Math.max(ay, by)) {
            const v = edge(ax, ay, bx, by, yy);
            if (v !== null) xs.push(v);
          }
        if (xs.length < 2) continue;
        this._span(Math.round(Math.min(...xs)) + this.ox, Math.round(Math.max(...xs)) + 1 + this.ox, yy + this.oy, c);
      }
    }
    // 1-bit image: copy mode paints opaque white and ink; 'ink' paints only the ink (transparent
    // background, like render_scaled() sprites); scale draws each pixel as a scale x scale block
    drawImage(img2, x, y, { mode = "copy", scale = 1 } = {}) {
      x += this.ox;
      y += this.oy;
      for (let r = 0; r < img2.h; r++) for (let q = 0; q < img2.w; q++) {
        const ink = img2.bit(img2.ink, q, r);
        if (!ink && (mode === "ink" || !img2.bit(img2.opaque, q, r))) continue;
        const c = ink ? BLACK : WHITE;
        for (let a = 0; a < scale; a++) this._span(x + q * scale, x + q * scale + scale, y + r * scale + a, c);
      }
    }
    // raw 1-bit plane (1 = black) w x h, MSB first rows of `lb` bytes; transparent where 0 unless opaque
    drawBits(bits, w, h, lb, x, y, opaque = true) {
      x += this.ox;
      y += this.oy;
      const [cx0, cy0, cx1, cy1] = this.clip;
      for (let r = 0; r < h; r++) {
        const yy = y + r;
        if (yy < cy0 || yy >= cy1) continue;
        for (let q = 0; q < w; q++) {
          const xx = x + q;
          if (xx < cx0 || xx >= cx1) continue;
          const on2 = bits[r * lb + (q >> 3)] >> 7 - (q & 7) & 1;
          if (on2) this.px[yy * W + xx] = BLACK;
          else if (opaque) this.px[yy * W + xx] = WHITE;
        }
      }
    }
    setFont(f) {
      this.font = f;
    }
    // top-left text like pd->graphics->drawText; white = kDrawModeFillWhite
    drawText(str, x, y, white = false) {
      const f = this.font, c = white ? WHITE : BLACK, lb = Math.ceil(f.cw / 8);
      let prev = null;
      for (const ch of str) {
        const g = f.glyphs.get(ch) || f.glyphs.get("?");
        if (!g) continue;
        if (prev) x += (f.kern[prev + ch] || 0) + f.tracking;
        for (let r = 0; r < f.ch; r++) for (let q = 0; q < f.cw; q++)
          if (g.bits[r * lb + (q >> 3)] >> 7 - (q & 7) & 1) this._dot(x + q + this.ox, y + r + this.oy, c);
        x += g.adv;
        prev = ch;
      }
    }
    textWidth(str) {
      return this.font.width(str);
    }
    // blit to a 2D canvas with the Playdate LCD's two tones
    present(ctx2, light = [177, 175, 168], dark = [49, 47, 40]) {
      if (!this._id) this._id = ctx2.createImageData(W, H);
      const d = this._id.data;
      for (let i = 0, p = 0; i < W * H; i++, p += 4) {
        const t = this.px[i] ? dark : light;
        d[p] = t[0];
        d[p + 1] = t[1];
        d[p + 2] = t[2];
        d[p + 3] = 255;
      }
      ctx2.putImageData(this._id, 0, 0);
    }
  };

  // js/ui/rx-ui.js
  var LCD_COLUMNS = 400;
  var LCD_ROWS = 240;
  var BAR_H = 30;
  var PANEL_W = 200;
  var SHEET_LEAD = 50;
  var LOST_TIMEOUT_MS = 5e3;
  var PILL_H = 20;
  var CONSOLE = { w: 140, h: 118, sx: 7, sy: 7, sw: 88, sh: 53 };
  var DOLPHIN_H = 49;
  var fontUi = fonts["SFTV-10-Bold"];
  var fontNum = fonts["SFTV-9-Mono-Condensed"];
  var fontGlyph = fonts["SFTV-11-Medium-extended"];
  var fontNotes = fonts["Notes-14"];
  var cv = document.getElementById("pd");
  var ctx = cv.getContext("2d");
  var gfx = new Gfx();
  var img = new Uint8Array(IMAGE_BYTES);
  var disp = new Uint8Array(IMAGE_BYTES);
  var phBits = new Uint8Array(IMAGE_BYTES);
  var segSeen = new Uint8Array(HEIGHT);
  var previewBits = new Uint8Array(PREVIEW_BYTES);
  var previewHave = new Uint8Array(PREVIEW_CHUNKS);
  var tinyBits = new Uint8Array(TINY_BYTES);
  var tinyHave = new Uint8Array(TINY_CHUNKS);
  var consoleBits = new Uint8Array(PREVIEW_BYTES);
  var noteBuf = new Uint8Array(NOTE_MAX_CHARS + 64);
  var noteText = "";
  var previewChunks = 0;
  var previewDirty = false;
  var segsDone = 0;
  var linesReached = 0;
  var revealed = 0;
  var finishedLines = 0;
  var started = false;
  var finished = false;
  var rxPaused = false;
  var startedMs = 0;
  var finishedMs = 0;
  var lastDataMs = 0;
  var pauseAnchor = 0;
  var hearingMs = -1e9;
  var totalFrames = 0;
  var name = "";
  var sheetY = LCD_ROWS;
  var barY = 0;
  var showPanel = false;
  var ledFrameMs = -1e9;
  var ledBlockMs = -1e9;
  var lastBlockMs = -1e9;
  var lastBlockKind = "data";
  var micState = 0;
  var untitled = 0;
  var micLabel = "";
  var rxAudio = new RxAudio();
  var demod = null;
  var rx = null;
  var nowMs = () => performance.now();
  var bit = (bits, lb, x, y) => bits[y * lb + (x >> 3)] >> 7 - (x & 7) & 1;
  function previewRowOk(py) {
    return previewHave[Math.floor(py * PREVIEW_LINE_BYTES / PREVIEW_CHUNK)] && previewHave[Math.floor((py * PREVIEW_LINE_BYTES + PREVIEW_LINE_BYTES - 1) / PREVIEW_CHUNK)];
  }
  var tinyRowOk = (ty) => tinyHave[Math.floor(ty * TINY_LINE_BYTES / PREVIEW_CHUNK)];
  function placeholderBit(x, line) {
    const py = Math.floor(line / (HEIGHT / PREVIEW_H));
    if (previewRowOk(py)) return bit(previewBits, PREVIEW_LINE_BYTES, Math.floor(x / (WIDTH / PREVIEW_W)), py);
    const ty = Math.floor(line / (HEIGHT / TINY_H));
    if (tinyRowOk(ty)) return bit(tinyBits, TINY_LINE_BYTES, Math.floor(x / (WIDTH / TINY_W)), ty);
    return 0;
  }
  function paintPlaceholderLine(line) {
    for (let half = 0; half < 2; half++) {
      if (segSeen[line] & 1 << half) continue;
      for (let i = half * SEG_BYTES; i < (half + 1) * SEG_BYTES; i++) {
        let v = 0;
        for (let b = 0; b < 8; b++) {
          const x = i * 8 + b;
          if (placeholderBit(x, line) && (x + line & 1) === 0) v |= 128 >> b;
        }
        disp[line * LINE_BYTES + i] = v;
      }
    }
  }
  function previewRefresh() {
    consoleBits.fill(0);
    for (let y = 0; y < PREVIEW_H; y++) for (let x = 0; x < PREVIEW_W; x++)
      if (placeholderBit(x * (WIDTH / PREVIEW_W), y * (HEIGHT / PREVIEW_H))) consoleBits[y * PREVIEW_LINE_BYTES + (x >> 3)] |= 128 >> (x & 7);
    phBits.fill(0);
    for (let yy = 0; yy < HEIGHT; yy++) for (let xx = 0; xx < WIDTH; xx++)
      if (placeholderBit(xx, yy) && (xx + yy & 1) === 0) phBits[yy * LINE_BYTES + (xx >> 3)] |= 128 >> (xx & 7);
    for (let line = 0; line < HEIGHT; line++) paintPlaceholderLine(line);
  }
  var animHdr = 0;
  var animInfo = null;
  var animDec = null;
  var animSegOk = null;
  var animStamp = -1;
  var animDisp = 0;
  var animWipePrev = -1;
  var animWipeRow = 0;
  var animWipeMs = 0;
  var animPlayPos = 0;
  var animPlayMs = 0;
  var animShown = 0;
  var animCompose = null;
  var animScaled = null;
  var animLine = 0;
  var animRepairing = false;
  var gifBtn = document.getElementById("gif");
  var gifUrl = null;
  function isAnim() {
    return !!(rx && rx.anim);
  }
  function animReset() {
    animHdr = 0;
    animInfo = null;
    animDec = null;
    animSegOk = null;
    animStamp = -1;
    animDisp = 0;
    animWipePrev = -1;
    animWipeRow = 0;
    animWipeMs = 0;
    animPlayPos = 0;
    animPlayMs = 0;
    animShown = 0;
    animCompose = null;
    animScaled = null;
    animLine = 0;
    if (gifBtn) gifBtn.style.display = "none";
    if (gifUrl) {
      URL.revokeObjectURL(gifUrl);
      gifUrl = null;
    }
  }
  function animByte(pos) {
    if (!rx || pos < 0 || pos >= rx.noteLen) return -1;
    const at = ILEAVE + Math.floor(pos / NOTE_CHUNK);
    return at < rx.have.length && rx.have[at] ? rx.data[at][pos % NOTE_CHUNK] : -1;
  }
  function animPump(budget, final) {
    if (!isAnim()) return;
    if (animHdr === 0) {
      const r = parse(animByte);
      if (r === -1) animHdr = -1;
      else if (r) {
        animInfo = r.info;
        animHdr = r.len;
        animDec = new AnimDecoder(r.info, r.len, rx.noteLen);
        animSegOk = new Int8Array(segs(r.info.n));
      }
    }
    if (animHdr <= 0) return;
    const stamp = rx.framesOk + rx.framesRepaired;
    if (stamp !== animStamp || final) {
      animStamp = stamp;
      for (let sg = 0; sg < animSegOk.length; sg++) {
        if (animSegOk[sg] === 1) continue;
        const r = animDec.segCheck(sg, animByte);
        if (r === 1) {
          let redo = animSegOk[sg] === -1;
          for (let f = sg * ANIM_SEG; f < (sg + 1) * ANIM_SEG && f < animInfo.n; f++) if (animDec.state[f] === 3) redo = true;
          if (redo) animDec.rewind();
        }
        animSegOk[sg] = r;
      }
    }
    if (!animDec.done()) animDec.run(animByte, budget, final);
  }
  function animFramesOk() {
    if (animHdr <= 0) return 0;
    let n = 0;
    for (let f = 0; f < animInfo.n; f++) if (animDec.state[f] === 2 && animSegOk[Math.floor(f / ANIM_SEG)] === 1) n++;
    return n;
  }
  function animFinish() {
    animPump(1 << 30, true);
    if (animHdr <= 0) return;
    const fb = frameBytes(animInfo), fr = animDec.frames;
    if (animFramesOk() === animInfo.n) rx.forget();
    for (let f = 0; f < animInfo.n; f++) {
      if (animSegOk[Math.floor(f / ANIM_SEG)] !== -1) continue;
      if (f > 0) fr.copyWithin(f * fb, (f - 1) * fb, f * fb);
      else fr.fill(0, 0, fb);
    }
    const gif = encodeGif(animInfo.w, animInfo.h, 2, fr, fb, animInfo.order, Math.trunc(100 / (animInfo.fps || 2)));
    if (gifUrl) URL.revokeObjectURL(gifUrl);
    gifUrl = URL.createObjectURL(new Blob([gif], { type: "image/gif" }));
    if (gifBtn) gifBtn.style.display = "";
  }
  function drawAnimReceive(now, enow) {
    if (animHdr <= 0) {
      drawScene();
      drawTitleBar(started ? `Receiving: "${name}"` : "Listening");
      return;
    }
    gfx.clear(WHITE);
    const a = animInfo, fb = frameBytes(a), st = stride(a.w), fr = animDec.frames;
    const sc = Math.max(1, Math.min(Math.floor(LCD_COLUMNS / a.w), Math.floor((LCD_ROWS - BAR_H - 8) / a.h)));
    const ox = LCD_COLUMNS - a.w * sc >> 1, oy = BAR_H + (LCD_ROWS - BAR_H - a.h * sc >> 1);
    const AH = a.h, totalRows = a.n * AH;
    const decoded = Math.min(totalRows, animDec.frame * AH + (animDec.frameOpen ? Math.floor(animDec.pix / a.w) : 0));
    let target = decoded;
    animRepairing = false;
    if (!finished && rx.dataFrames > 0) {
      const df = rx.dataFrames, intro = noteIntro(df);
      const phys = Math.max(0, (enow - startedMs) * 1e3 / physUsNow());
      const f0 = Math.floor(phys), frac2 = phys - f0;
      animRepairing = passFrameKind(f0, df, intro) !== PASS_DATA;
      const d0 = passDataBefore(f0, df, intro), d1 = passDataBefore(f0 + 1, df, intro);
      const bytes = (d0 + (d1 - d0) * frac2 - ILEAVE) * NOTE_CHUNK;
      let lo = 0, hi = decoded;
      while (lo < hi) {
        const mid = lo + hi >> 1;
        if (animDec.rowPos[mid] <= bytes) lo = mid + 1;
        else hi = mid;
      }
      target = lo;
      if (lo < decoded) {
        const p0 = lo > 0 ? animDec.rowPos[lo - 1] : animHdr, p1 = animDec.rowPos[lo];
        if (p1 > p0) target += Math.max(0, (bytes - p0) / (p1 - p0));
      }
      target = Math.min(target, decoded);
    }
    if (!rxPaused && animLine < target) {
      const d = target - animLine, st2 = Math.max(0.25, d * 0.2);
      animLine = d < st2 ? target : animLine + st2;
    }
    const caughtUp = (finished || animDec.done()) && animLine >= decoded;
    const step = 1e3 / (a.fps || 2);
    let src, row = -1, show;
    if (caughtUp) {
      if (enow - animPlayMs > 5e3) animPlayMs = enow;
      while (enow - animPlayMs >= step) {
        animPlayMs += step;
        animPlayPos = (animPlayPos + 1) % a.orderLen;
      }
      show = a.order[animPlayPos];
      src = fr.subarray(show * fb, show * fb + fb);
    } else {
      const g = Math.floor(animLine);
      let cur = Math.floor(g / AH), rows = g % AH;
      if (cur >= a.n) {
        cur = a.n - 1;
        rows = AH;
      }
      if (!animCompose) animCompose = new Uint8Array(fb);
      animCompose.set(fr.subarray(cur * fb, cur * fb + rows * st), 0);
      if (cur > 0) animCompose.set(fr.subarray((cur - 1) * fb + rows * st, cur * fb), rows * st);
      else animCompose.fill(0, rows * st);
      src = animCompose;
      show = cur;
      if (rows < AH) row = rows;
      animPlayMs = enow;
    }
    animShown = show;
    const W2 = a.w * sc, H2 = a.h * sc, lb = W2 + 7 >> 3;
    if (!animScaled || animScaled.length !== lb * H2) animScaled = new Uint8Array(lb * H2);
    animScaled.fill(0);
    for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
      if (!(src[y * st + (x >> 3)] >> (x & 7) & 1)) continue;
      for (let dy = 0; dy < sc; dy++) {
        const r0 = (y * sc + dy) * lb;
        for (let dx = 0; dx < sc; dx++) {
          const X = x * sc + dx;
          animScaled[r0 + (X >> 3)] |= 128 >> (X & 7);
        }
      }
    }
    gfx.drawBits(animScaled, W2, H2, lb, ox, oy);
    gfx.fillRect(ox - 2, oy - 2, W2 + 4, 1, BLACK);
    gfx.fillRect(ox - 2, oy + H2 + 1, W2 + 4, 1, BLACK);
    gfx.fillRect(ox - 2, oy - 2, 1, H2 + 4, BLACK);
    gfx.fillRect(ox + W2 + 1, oy - 2, 1, H2 + 4, BLACK);
    if (row >= 0) {
      const ly = oy + row * sc;
      gfx.fillRect(ox, ly, W2, 1, BLACK);
      gfx.fillRect(ox - 6, ly - 2, 4, 5, BLACK);
      gfx.fillRect(ox + W2 + 2, ly - 2, 4, 5, BLACK);
      for (let rx0 = 2; rx0 < W2; rx0 += 6) {
        let len = 2 + Math.trunc(2.5 * (0.5 + 0.5 * Math.sin(now / 130 + rx0 * 0.5)));
        if (rx0 / 6 & 1) len += 1;
        if (ly + 1 + len > oy + H2) len = oy + H2 - ly - 1;
        if (len > 0) gfx.fillRect(ox + rx0, ly + 1, 1, len, BLACK);
      }
    }
    gfx.fillRect(0, 0, LCD_COLUMNS, BAR_H, BLACK);
    gfx.setFont(fontUi);
    const fc = `${show + 1}/${a.n}`, bw = 64, right = LCD_COLUMNS - 34;
    const frac = passProgress(enow);
    if (frac >= 0 && !finished) drawMiniBar(right - bw, BAR_H - 8 >> 1, bw, 8, frac);
    const fcx = right - bw - 8 - gfx.textWidth(fc);
    gfx.drawText(fc, fcx, BAR_H - fontUi.height >> 1, true);
    gfx.setFont(fontGlyph);
    gfx.drawText(fitText(name, fcx - 20), 10, BAR_H - fontGlyph.height >> 1, true);
  }
  function clearImage() {
    animReset();
    noteBuf.fill(0);
    noteText = "";
    noteScroll = 0;
    noteFollow = true;
    img.fill(0);
    disp.fill(0);
    segSeen.fill(0);
    previewBits.fill(0);
    previewHave.fill(0);
    tinyBits.fill(0);
    tinyHave.fill(0);
    previewChunks = 0;
    previewRefresh();
    segsDone = 0;
    linesReached = 0;
    revealed = 0;
    rxPaused = false;
    sheetY = LCD_ROWS;
    barY = 0;
    finished = false;
    started = false;
    totalFrames = 0;
    if (rx) rx.resetCounters();
  }
  function finish(now) {
    if (isAnim()) animFinish();
    finished = true;
    started = false;
    finishedMs = now;
    finishedLines = segsDone >> 1;
    linesReached = HEIGHT;
    revealed = HEIGHT;
  }
  function beginPass(now) {
    if (started) return;
    clearImage();
    started = true;
    startedMs = now;
    lastDataMs = now;
  }
  function makeRx() {
    rx = new Rx({
      onPixels(line, x, nb, px) {
        const now = nowMs();
        beginPass(now);
        lastDataMs = now;
        lastBlockKind = "data";
        if (line >= HEIGHT || x + nb > LINE_BYTES) return;
        for (let i = 0; i < nb; i++) {
          img[line * LINE_BYTES + x + i] = px[i];
          disp[line * LINE_BYTES + x + i] = px[i];
        }
        if (line + 1 > linesReached) linesReached = line + 1;
        const mask = nb === LINE_BYTES ? 3 : x === 0 ? 1 : 2;
        const before = segSeen[line];
        segSeen[line] |= mask;
        segsDone += (segSeen[line] & 1) - (before & 1) + ((segSeen[line] >> 1 & 1) - (before >> 1 & 1));
      },
      onPreview(layer, chunk, nb, data) {
        const now = nowMs();
        beginPass(now);
        lastDataMs = now;
        lastBlockKind = "meta";
        if (layer === 2) return;
        if (layer === 0) {
          if (chunk < 0 || chunk >= TINY_CHUNKS) return;
          tinyBits.set(data.subarray(0, nb), chunk * PREVIEW_CHUNK);
          if (!tinyHave[chunk]) previewChunks++;
          tinyHave[chunk] = 1;
        } else {
          if (chunk < 0 || chunk >= PREVIEW_CHUNKS) return;
          previewBits.set(data.subarray(0, nb), chunk * PREVIEW_CHUNK);
          if (!previewHave[chunk]) previewChunks++;
          previewHave[chunk] = 1;
        }
        previewDirty = true;
      },
      onMeta(nm, isEnd, total) {
        const now = nowMs();
        lastBlockKind = "meta";
        if (isEnd) {
          finish(now);
          return;
        }
        calibActive = false;
        calibStreak = 0;
        clearImage();
        started = true;
        startedMs = now;
        totalFrames = total;
        name = nm && nm.trim() ? nm : rx.anim ? `anim_${++untitled}` : rx.note ? `note_${++untitled}` : `untitled_${++untitled}`;
        lastDataMs = now;
      },
      onNote(chunk, nb, buf) {
        if (rx.anim) {
          lastDataMs = nowMs();
          lastBlockKind = "data";
          return;
        }
        const off = chunk * NOTE_CHUNK;
        for (let k = 0; k < nb && off + k < NOTE_MAX_CHARS; k++) noteBuf[off + k] = buf[k];
        let z = noteBuf.indexOf(0);
        if (z < 0) z = noteBuf.length;
        noteText = new TextDecoder().decode(noteBuf.subarray(0, z));
        lastBlockKind = "data";
      },
      onControl(sub, arg) {
        const now = nowMs();
        if (sub === META_PAUSE) {
          if (!rxPaused) {
            rxPaused = true;
            pauseAnchor = now;
          }
        } else if (sub === META_RESUME && rxPaused) {
          rxPaused = false;
          const n = Math.max(ILEAVE, arg | 0);
          startedMs = now - (n - ILEAVE) * physUsNow() / 1e3;
          lastDataMs = now;
        }
      }
    });
  }
  var REC_MAX_S = 600;
  var recState = "idle";
  var recChunks = [];
  var recSamples = 0;
  var recRate = 0;
  var recBtn = document.getElementById("rec");
  var saveBtn = document.getElementById("save");
  var recClock = () => {
    const s = Math.floor(recSamples / (recRate || 1));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  var setText = (el, t) => {
    if (el.textContent !== t) el.textContent = t;
  };
  function recUi() {
    if (!recBtn) return;
    setText(recBtn, recState === "recording" ? `\u25A0 Stop ${recClock()}` : "\u25CF Record");
    recBtn.classList.toggle("rec-on", recState === "recording");
    saveBtn.style.display = recState === "stopped" && recSamples > 0 ? "" : "none";
    setText(saveBtn, `Save ${recClock()} WAV`);
  }
  function recPush(f32) {
    if (recState !== "recording") return;
    const pcm = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      const v = f32[i] * 32768;
      pcm[i] = v > 32767 ? 32767 : v < -32768 ? -32768 : v | 0;
    }
    recChunks.push(pcm);
    recSamples += pcm.length;
    if (recSamples >= recRate * REC_MAX_S) {
      recState = "stopped";
      recUi();
    }
  }
  async function recToggle() {
    if (recState === "recording") {
      recState = "stopped";
      recUi();
      return;
    }
    if (!demod) await listen();
    recChunks = [];
    recSamples = 0;
    recState = "recording";
    recUi();
  }
  function saveWav() {
    const n = recSamples;
    const b = new DataView(new ArrayBuffer(44 + n * 2));
    const str = (o2, t) => {
      for (let i = 0; i < t.length; i++) b.setUint8(o2 + i, t.charCodeAt(i));
    };
    str(0, "RIFF");
    b.setUint32(4, 36 + n * 2, true);
    str(8, "WAVEfmt ");
    b.setUint32(16, 16, true);
    b.setUint16(20, 1, true);
    b.setUint16(22, 1, true);
    b.setUint32(24, recRate, true);
    b.setUint32(28, recRate * 2, true);
    b.setUint16(32, 2, true);
    b.setUint16(34, 16, true);
    str(36, "data");
    b.setUint32(40, n * 2, true);
    let o = 44;
    for (const c of recChunks) for (let i = 0; i < c.length; i++, o += 2) b.setInt16(o, c[i], true);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([b.buffer], { type: "audio/wav" }));
    a.download = `sftv-rx-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/[:T]/g, "-")}.wav`;
    a.click();
  }
  var CALIB_HIST = 60;
  var CALIB_STREAK = 4;
  var CALIB_OPEN_BITS = 120;
  function frameOkProb(ber) {
    const pb = 1 - Math.pow(1 - ber, 8);
    if (pb >= 1) return 0;
    let term = Math.pow(1 - pb, FRAME_BYTES), sum = 0;
    for (let k = 0; k <= PARITY_BYTES / 2; k++) {
      sum += term;
      term *= (FRAME_BYTES - k) / (k + 1) * pb / (1 - pb);
    }
    return Math.min(1, sum);
  }
  var calibForced = false;
  var calibActive = false;
  var calibLastMs = -1e9;
  var calibStreak = 0;
  var calibN = 0;
  var calibFlyPrev = 0;
  var calibBer = 0;
  var calibScore = new Uint8Array(CALIB_HIST);
  var calibSync = new Uint8Array(CALIB_HIST);
  function calibFrame(frame, now, d) {
    const dist = lockDistance(frame);
    const real = d.flywheelFrames === calibFlyPrev;
    calibFlyPrev = d.flywheelFrames;
    if (dist <= CALIB_OPEN_BITS) {
      calibLastMs = now;
      if (++calibStreak >= CALIB_STREAK && !calibActive && (!started || finished)) {
        calibActive = true;
        calibN = 0;
      }
    } else {
      calibStreak = 0;
    }
    if (!calibActive && !calibForced) return;
    calibLastMs = now;
    calibBer = dist / FRAME_BITS;
    const sc = 100 * frameOkProb(calibBer);
    calibScore[calibN % CALIB_HIST] = Math.round(sc);
    calibSync[calibN % CALIB_HIST] = real ? 1 : 0;
    calibN++;
  }
  var fontBig = fonts["SFTV-20-Medium"] || fontUi;
  function drawRect(x, y, w, h, c) {
    gfx.fillRect(x, y, w, 1, c);
    gfx.fillRect(x, y + h - 1, w, 1, c);
    gfx.fillRect(x, y, 1, h, c);
    gfx.fillRect(x + w - 1, y, 1, h, c);
  }
  function drawCalibration() {
    gfx.clear(WHITE);
    drawTitleBar("Calibration");
    const n = Math.min(calibN, CALIB_HIST);
    let sum = 0, cnt = 0;
    for (let k = 0; k < 3 && k < n; k++) {
      sum += calibScore[(calibN - 1 - k + CALIB_HIST) % CALIB_HIST];
      cnt++;
    }
    const score = cnt ? Math.trunc(sum / cnt) : 0;
    gfx.setFont(fontUi);
    gfx.drawText("quality", 16, 40);
    gfx.setFont(fontBig);
    gfx.drawText(`${score}%`, 16, 56);
    gfx.setFont(fontUi);
    gfx.drawText(`errors: ${(calibBer * 100).toFixed(1)}%`, 16, 96);
    const syncOk = n > 0 && calibSync[(calibN - 1) % CALIB_HIST];
    if (syncOk && nowMs() - calibLastMs < 1e3) gfx.drawText("sync", 16, 114);
    const gx = 140, gy = 40, gw = CALIB_HIST * 4, gh = 100;
    drawRect(gx - 1, gy - 1, gw + 2, gh + 2, BLACK);
    for (let x = gx; x < gx + gw; x += 6) gfx.fillRect(x, gy + gh - gh * 60 / 100, 3, 1, BLACK);
    for (let k = 0; k < n; k++) {
      const idx = (calibN - n + k) % CALIB_HIST, h = Math.trunc(calibScore[idx] * gh / 100), x = gx + (CALIB_HIST - n + k) * 4;
      if (h > 0) gfx.fillRect(x, gy + gh - h, 3, h, BLACK);
      if (!calibSync[idx]) gfx.fillRect(x, gy + gh + 3, 3, 2, BLACK);
    }
    const labels = ["17", "17.5", "18", "18.5", "19", "19.5", "20", "20.5"];
    gfx.setFont(fontNum);
    const by = 222, bmax = 60;
    for (let k = 0; k < demod.numTones && k < labels.length; k++) {
      let db = 10 * Math.log10(demod.gain[k] / demod.minEnergy + 1e-12);
      db = Math.max(0, Math.min(40, db));
      const h = Math.round(bmax * db / 40), x = 16 + k * 48;
      drawRect(x, by - bmax, 30, bmax, BLACK);
      if (h > 0) gfx.fillRect(x, by - h, 30, h, BLACK);
      gfx.drawText(labels[k], x + 15 - (gfx.textWidth(labels[k]) >> 1), by + 3);
    }
  }
  function makeDemod(sr, band) {
    const d = new Demod(sr, (frame, margin) => {
      const now = nowMs();
      ledFrameMs = now;
      calibFrame(frame, now, d);
      const before = rx.blocksOk, kindBefore = lastBlockKind;
      lastBlockKind = "parity";
      rx.phys_frame(frame, margin);
      if (rx.blocksOk !== before) {
        ledBlockMs = now;
        lastBlockMs = now;
      } else lastBlockKind = kindBefore;
    });
    d.setBand(band);
    return d;
  }
  var activeBand = BAND_HF;
  var ctxRate = 48e3;
  function physUsNow() {
    return bandPhysUs(activeBand);
  }
  async function listen() {
    if (demod) return;
    const sr = await rxAudio.start((f32) => {
      if (!demod) return;
      recPush(f32);
      const s = new Int16Array(f32.length);
      for (let i = 0; i < f32.length; i++) {
        const v = f32[i] * 32768;
        s[i] = v > 32767 ? 32767 : v < -32768 ? -32768 : v | 0;
      }
      demod.feed(s, s.length);
    });
    recRate = sr;
    const tr = rxAudio.stream && rxAudio.stream.getAudioTracks()[0];
    micLabel = tr ? tr.label : "";
    makeRx();
    ctxRate = sr;
    demod = makeDemod(sr, activeBand);
    micState = 1;
    document.getElementById("listen").textContent = "Listening\u2026";
  }
  function textCentered(str, cx, y) {
    gfx.drawText(str, cx - (gfx.textWidth(str) >> 1), y);
  }
  function fitText(str, maxW) {
    if (gfx.textWidth(str) <= maxW) return str;
    for (let n = str.length - 1; n > 1; n--) {
      const t = str.slice(0, n) + "..";
      if (gfx.textWidth(t) <= maxW) return t;
    }
    return "..";
  }
  function drawPill(str, x, y, filled) {
    const h = gfx.font.height + 4, w = gfx.textWidth(str) + 12;
    if (filled) {
      gfx.fillRoundRect(x, y, w, h, h >> 1, BLACK);
      gfx.drawText(str, x + 6, y + 2, true);
    } else {
      gfx.drawRoundRect(x, y, w, h, h >> 1, 1, BLACK);
      gfx.drawText(str, x + 6, y + 2);
    }
    return w;
  }
  function drawLed() {
    const now = nowMs(), cx = LCD_COLUMNS - 16, cy = BAR_H >> 1;
    gfx.fillEllipse(cx - 8, cy - 8, 16, 16, 0, 0, WHITE);
    if (now - ledBlockMs < 400) gfx.drawEllipse(cx - 7, cy - 7, 14, 14, 3, 0, 0, BLACK);
    else if (now - ledFrameMs < 150) gfx.fillEllipse(cx - 6, cy - 6, 12, 12, 0, 0, BLACK);
    else gfx.drawEllipse(cx - 6, cy - 6, 12, 12, 1, 0, 0, BLACK);
  }
  function drawTitleBar(title) {
    gfx.fillRect(0, 0, LCD_COLUMNS, BAR_H, BLACK);
    gfx.setFont(fontGlyph);
    gfx.drawText(title, 10, BAR_H - fontGlyph.height >> 1, true);
  }
  function drawConsole(x, y, withPreview) {
    gfx.drawImage(images.console, x, y);
    if (withPreview) {
      gfx.fillRect(x + CONSOLE.sx, y + CONSOLE.sy, CONSOLE.sw, CONSOLE.sh, WHITE);
      gfx.drawBits(
        consoleBits,
        PREVIEW_W,
        PREVIEW_H,
        PREVIEW_LINE_BYTES,
        x + CONSOLE.sx + (CONSOLE.sw - PREVIEW_W >> 1),
        y + CONSOLE.sy + (CONSOLE.sh - PREVIEW_H >> 1)
      );
    }
  }
  function drawSpout(x0, y0, x1, y1, t) {
    const drops = 9;
    for (let k = 0; k < drops; k++) {
      const u = (t + k / drops) % 1;
      const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u - 40 * Math.sin(Math.PI * u);
      const r = 2 + Math.trunc(2 * Math.sin(Math.PI * u));
      gfx.fillEllipse(Math.trunc(x) - r, Math.trunc(y) - r, 2 * r, 2 * r, 0, 0, BLACK);
    }
  }
  function sceneDolphin(now) {
    if (!started) return now - hearingMs < 500 ? images.frame_22 : images.frame_11;
    if (now - lastBlockMs < 800) {
      if (lastBlockKind === "parity") return images.frame_41;
      if (lastBlockKind === "data") return images.frame_51;
      return images.frame_31;
    }
    return images.frame_51;
  }
  function isNote() {
    return !!(rx && rx.note && !rx.anim);
  }
  function drawScene() {
    const now = rxPaused ? pauseAnchor : nowMs();
    gfx.clear(WHITE);
    const cx = 240, cy = 60, dx = 20, dy = cy + (CONSOLE.h - DOLPHIN_H * 2 >> 1), textCx = LCD_COLUMNS >> 1;
    gfx.drawImage(sceneDolphin(now), dx, dy, { mode: "ink", scale: 2 });
    drawConsole(cx, cy, started && !isNote() && !isAnim());
    gfx.setFont(fontUi);
    if (started) {
      drawSpout(dx + 70, dy + 2, cx + CONSOLE.sx + (CONSOLE.sw >> 1), cy + CONSOLE.sy + (CONSOLE.sh >> 1), now % 1200 / 1200);
      if (isAnim()) textCentered(animHdr < 0 ? "Animation header unreadable" : "Receiving animation", textCx, 200);
      else if (isNote()) textCentered("Receiving note", textCx, 200);
      else if (segsDone === 0) {
        const introTotal = INTRO_FRAMES + (rx && rx.coded ? SCHEDULE_CHUNKS : 0) + OUTER_PARITY;
        let est = (now - startedMs) / (physUsNow() / 1e3);
        if (previewChunks < INTRO_FRAMES) est = Math.min(Math.max(est, previewChunks), previewChunks + ILEAVE);
        est = Math.min(Math.max(est, 0), introTotal);
        const ty = 200;
        textCentered("Receiving preview", textCx, ty);
        const bw = 220, bx = textCx - (bw >> 1), by = ty + fontUi.height + 8;
        gfx.drawRoundRect(bx, by, bw, 10, 5, 1, BLACK);
        const fill = Math.trunc((bw - 4) * est / introTotal);
        if (fill > 0) gfx.fillRoundRect(bx + 2, by + 2, fill, 6, 3, BLACK);
      }
    } else {
      const hint = micState < 0 ? "microphone access denied" : micState === 0 ? 'press "Allow mic & listen" below' : "waiting for a transmission";
      textCentered(hint, textCx, 208);
    }
  }
  var noteLay = { text: null, width: 0, lines: [] };
  function layoutNote(text, width) {
    if (noteLay.text === text && noteLay.width === width) return noteLay.lines;
    gfx.setFont(fontNotes);
    const lines = [];
    for (const para of text.split("\n")) {
      let line = "";
      for (const word of para.split(" ").filter(Boolean)) {
        const cand = line ? line + " " + word : word;
        if (gfx.textWidth(cand) <= width || !line) line = cand;
        else {
          lines.push(line);
          line = word;
        }
      }
      lines.push(line);
    }
    noteLay = { text, width, lines };
    return lines;
  }
  var noteScroll = 0;
  var noteFollow = true;
  function noteMaxScroll(w, h, text) {
    const margin = w < 120 ? 4 : 10, lineH = fontNotes.height + 2;
    return Math.max(0, layoutNote(text, w - 2 * margin - 6).length * lineH - (h - 2 * margin));
  }
  function drawStickyNote(x, y, w, h, text, scroll = 0) {
    const fold = w < 120 ? 8 : 16;
    gfx.fillRect(x, y, w, h, WHITE);
    gfx.drawLine(x, y, x + w - fold, y, 1, BLACK);
    gfx.drawLine(x, y, x, y + h, 1, BLACK);
    gfx.drawLine(x, y + h, x + w, y + h, 1, BLACK);
    gfx.drawLine(x + w, y + fold, x + w, y + h, 1, BLACK);
    gfx.drawLine(x + w - fold, y, x + w, y + fold, 1, BLACK);
    gfx.fillTriangle(x + w - fold, y, x + w, y + fold, x + w - fold, y + fold, BLACK);
    gfx.drawLine(x + w - fold, y, x + w - fold, y + fold, 1, WHITE);
    gfx.drawLine(x + w - fold, y + fold, x + w, y + fold, 1, WHITE);
    gfx.setFont(fontNotes);
    const fh = fontNotes.height, margin = w < 120 ? 4 : 10, lineH = fh + 2;
    const top = y + margin, innerH = h - 2 * margin;
    const lines = layoutNote(text, w - 2 * margin - 6);
    const content = lines.length * lineH, maxScroll = Math.max(0, content - innerH);
    const off = Math.min(Math.max(0, scroll), maxScroll);
    gfx.setClipRect(x + 1, top, w - 2, innerH);
    for (let i = Math.floor(off / lineH); i < lines.length; i++) {
      const ty = top + i * lineH - off;
      if (ty > top + innerH) break;
      if (lines[i]) gfx.drawText(lines[i], x + margin, ty);
    }
    gfx.clearClipRect();
    if (maxScroll > 0) {
      const bx = x + w - margin - 2, bh = Math.max(8, Math.floor(innerH * innerH / content));
      const by = top + Math.floor((innerH - bh) * off / maxScroll);
      gfx.fillRect(bx, top, 1, innerH, BLACK);
      gfx.fillRect(bx - 1, by, 3, bh, BLACK);
    }
    return off;
  }
  function passProgress(enow) {
    if (!started || totalFrames <= 0) return -1;
    const phys = Math.min(totalFrames, Math.max(0, ILEAVE + (enow - startedMs) * 1e3 / physUsNow()));
    return phys / totalFrames;
  }
  function drawMiniBar(x, y, w, h, frac) {
    gfx.drawRoundRect(x, y, w, h, h >> 1, 1, WHITE);
    const fill = Math.round((w - 4) * frac);
    if (fill > 0) gfx.fillRoundRect(x + 2, y + 2, fill, h - 4, h - 4 >> 1, WHITE);
  }
  function spinner(x, y, sp, now) {
    const a0 = now % 900 / 900 * 360;
    gfx.drawEllipse(x, y, sp, sp, 2, a0, a0 + 270, WHITE);
  }
  function drawProgressPill(now, enow) {
    const frac = passProgress(enow), pad = 10, bw = 64, bh = 8;
    if (frac < 0) {
      const sp = 12, w2 = pad + sp + pad, bx2 = LCD_COLUMNS - w2 - 10, by2 = LCD_ROWS - PILL_H - 10;
      gfx.fillRoundRect(bx2, by2, w2, PILL_H, PILL_H >> 1, BLACK);
      spinner(bx2 + pad, by2 + (PILL_H - sp >> 1), sp, now);
      return;
    }
    const w = pad + bw + pad, bx = LCD_COLUMNS - w - 10, by = LCD_ROWS - PILL_H - 10;
    gfx.fillRoundRect(bx, by, w, PILL_H, PILL_H >> 1, BLACK);
    drawMiniBar(bx + pad, by + (PILL_H - bh >> 1), bw, bh, frac);
  }
  function drawPanel() {
    const x0 = LCD_COLUMNS - PANEL_W, now = nowMs();
    gfx.fillRect(x0, 0, PANEL_W, LCD_ROWS, WHITE);
    gfx.drawLine(x0, 0, x0, LCD_ROWS, 1, BLACK);
    const x = x0 + 8, right = x0 + PANEL_W - 8;
    let y = 6;
    gfx.setFont(fontUi);
    const lh = fontUi.height + 1;
    gfx.drawText(fitText(name || "-", PANEL_W - 36), x, y);
    y += lh + 3;
    const quiet = segsDone > 0 && !finished && !rxPaused && now - lastDataMs > LOST_TIMEOUT_MS;
    const state = rxPaused ? "PAUSE" : finished ? "DONE" : segsDone === NUM_SEGS ? "DONE" : quiet ? "LOST" : segsDone > 0 || started ? "RX" : "IDLE";
    let px = x;
    px += drawPill(state, px, y, true) + 5;
    px += drawPill(isAnim() ? "ANI" : isNote() ? "TXT" : rx && rx.coded ? "ZIP" : "RAW", px, y, false) + 5;
    y += fontUi.height + 9;
    const barW = PANEL_W - 16;
    gfx.drawRoundRect(x, y, barW, 8, 4, 1, BLACK);
    const got = isAnim() ? animHdr > 0 ? animDec.framesDone : 0 : isNote() ? noteText.length : segsDone;
    const tot = isAnim() ? animHdr > 0 ? animInfo.n : 1 : isNote() ? rx.noteLen > 0 ? rx.noteLen : Math.max(1, got) : NUM_SEGS;
    const fill = Math.min(barW - 2, Math.trunc((barW - 2) * got / tot));
    if (fill > 0) gfx.fillRoundRect(x + 1, y + 1, fill, 6, 3, BLACK);
    y += 11;
    gfx.drawText(isAnim() ? `${got} / ${animHdr > 0 ? animInfo.n : 0} frames` : isNote() ? `${noteText.length} / ${rx.noteLen} chars` : `${segsDone >> 1} / ${HEIGHT} lines`, x, y);
    y += lh + 4;
    const rows = [
      ["recv", rx ? rx.framesIn : 0],
      ["preview", previewChunks],
      ["frames ok/bad", rx ? `${rx.framesOk}/${rx.framesBad}` : "0/0"],
      ["rs fixed/fixed", rx ? `${rx.rsCorrected}/${rx.framesRepaired}` : "0/0"],
      ["flywheel", demod ? demod.flywheelFrames : 0]
    ];
    for (const [k, v] of rows) {
      gfx.setFont(fontUi);
      gfx.drawText(k, x, y);
      gfx.setFont(fontNum);
      const s = String(v);
      gfx.drawText(s, right - gfx.textWidth(s), y + 1);
      y += lh;
    }
    y += 4;
    gfx.setFont(fontUi);
    gfx.drawText("tone", x, y);
    const st = demod ? demod.status() : { tone: -1 };
    const nt = demod ? demod.numTones - demod.firstDet : 8;
    const r = 5, step = 2 * r + 4, cx0 = x + 40, ccy = y + (fontUi.height >> 1);
    for (let k = 0; k < nt; k++) {
      const ccx = cx0 + k * step;
      if (demod && st.tone === k + demod.firstDet) gfx.fillEllipse(ccx, ccy - r, 2 * r, 2 * r, 0, 0, BLACK);
      else gfx.drawEllipse(ccx, ccy - r, 2 * r, 2 * r, 1, 0, 0, BLACK);
    }
    gfx.setFont(fontGlyph);
    const hy = LCD_ROWS - fontGlyph.height - 1;
    gfx.drawLine(x0, hy - 3, LCD_COLUMNS, hy - 3, 1, BLACK);
    gfx.drawText("\u24B6 clear", x, hy);
  }
  function drawFinishedBanner() {
    const now = nowMs();
    if (!finished || now - finishedMs > 6e3) return;
    gfx.setFont(fontUi);
    const t = isAnim() ? `Received "${name}"   ${animFramesOk()}/${animHdr > 0 ? animInfo.n : 0} frames` : isNote() ? `Received note "${name}"  ${rx.noteLen} chars` : `Received "${name}"   ${finishedLines}/${HEIGHT} lines`;
    const w = gfx.textWidth(t) + 24, h = fontUi.height + 16, x = LCD_COLUMNS - w >> 1, y = LCD_ROWS - h - 14;
    gfx.fillRoundRect(x, y, w, h, h >> 1, BLACK);
    gfx.drawText(t, x + 12, y + 8, true);
  }
  function stepAnimation() {
    if (isNote()) {
      const rest = BAR_H + 6;
      let frac = 0;
      if (finished) frac = 1;
      else if (started) {
        const enow = rxPaused ? pauseAnchor : nowMs();
        const textframes = rx.dataFrames > ILEAVE ? rx.dataFrames - ILEAVE : 40;
        const elapsed = Math.trunc((enow - startedMs) * 1e3 / physUsNow());
        frac = textframes > 0 ? Math.min(1, Math.max(0, elapsed / textframes)) : 1;
      }
      const target = LCD_ROWS - frac * (LCD_ROWS - rest), d = target - sheetY;
      sheetY = Math.abs(d) > 0.5 ? sheetY + d * 0.15 : target;
    } else {
      if (!rxPaused && revealed < linesReached) revealed = Math.min(linesReached, revealed + 0.8);
      const shown = finished ? HEIGHT : Math.round(revealed);
      const target = shown <= 0 ? LCD_ROWS : shown <= LCD_ROWS - SHEET_LEAD ? LCD_ROWS - SHEET_LEAD - shown : 0;
      const d = target - sheetY;
      sheetY = Math.abs(d) > 0.5 ? sheetY + d * 0.15 : target;
    }
    const y = Math.round(sheetY);
    const barTarget = y < BAR_H + 40 ? -BAR_H : 0, bd = barTarget - barY;
    barY = Math.abs(bd) > 0.5 ? barY + bd * 0.18 : barTarget;
  }
  function drawReceive() {
    const now = nowMs(), enow = rxPaused ? pauseAnchor : now;
    if (isAnim() && (started || finished)) {
      drawAnimReceive(now, enow);
      if (animHdr > 0 && animRepairing && started && !finished && !rxPaused) {
        gfx.setFont(fontUi);
        const v = "Verifying", r = 6, sp = 2 * r, pad = 10, gap = 6, tw = gfx.textWidth(v);
        const w = pad + sp + gap + tw + pad, h = 24, bx = LCD_COLUMNS - w - 10, by = LCD_ROWS - h - 10;
        gfx.fillRoundRect(bx, by, w, h, h >> 1, BLACK);
        spinner(bx + pad, by + (h - sp >> 1), sp, now);
        gfx.drawText(v, bx + pad + sp + gap, by + (h - fontUi.height >> 1), true);
      }
      if (rxPaused) {
        gfx.setFont(fontUi);
        const pm = "Paused - waiting for sender", w = gfx.textWidth(pm) + 28, h = 28, bx = LCD_COLUMNS - w >> 1, by = BAR_H + 12;
        gfx.fillRoundRect(bx, by, w, h, h >> 1, BLACK);
        gfx.drawText(pm, bx + 14, by + (h - fontUi.height >> 1), true);
      }
      if (showPanel && demod) drawPanel();
      drawFinishedBanner();
      drawLed();
      return;
    }
    const y = Math.round(sheetY);
    if (isNote() && (started || finished)) {
      if (y > 0) drawScene();
      else gfx.clear(WHITE);
      const nx = 22, nw = LCD_COLUMNS - 44, nh = LCD_ROWS - y - 12;
      if (nh > 24) {
        if (noteFollow) noteScroll = noteMaxScroll(nw, nh, noteText);
        noteScroll = drawStickyNote(nx, y, nw, nh, noteText, noteScroll);
      }
    } else {
      const shown = finished ? HEIGHT : Math.round(revealed);
      let frontier = Math.min(LCD_ROWS, y + shown);
      if (y > 0) drawScene();
      else gfx.clear(WHITE);
      if (y < LCD_ROWS && (started || finished)) {
        gfx.drawBits(phBits, WIDTH, HEIGHT, LINE_BYTES, 0, y);
        gfx.setClipRect(0, 0, LCD_COLUMNS, Math.max(0, frontier));
        gfx.drawBits(disp, WIDTH, HEIGHT, LINE_BYTES, 0, y);
        gfx.clearClipRect();
        if (y > 0) gfx.fillRect(0, y, LCD_COLUMNS, 1, BLACK);
        if (frontier > 0 && frontier < LCD_ROWS) {
          gfx.fillRect(0, frontier - 1, LCD_COLUMNS, 1, BLACK);
          for (let rx0 = 2; rx0 < LCD_COLUMNS; rx0 += 6) {
            const ph = now / 130 + rx0 * 0.5;
            let len = 2 + Math.trunc(2.5 * (0.5 + 0.5 * Math.sin(ph)));
            if (rx0 / 6 & 1) len += 1;
            if (frontier + len > LCD_ROWS) len = LCD_ROWS - frontier;
            if (len > 0) gfx.fillRect(rx0, frontier, 1, len, BLACK);
          }
        }
      }
    }
    const boff = Math.trunc(barY - 0.5);
    if (boff > -BAR_H) {
      gfx.setDrawOffset(0, boff);
      drawTitleBar(started ? `Receiving: "${name}"` : "Listening");
      gfx.setDrawOffset(0, 0);
    }
    const verifying = started && !finished && !rxPaused && !isNote() && revealed >= HEIGHT;
    if (started && !finished && !rxPaused && !verifying && (isNote() || segsDone > 0)) drawProgressPill(now, enow);
    if (verifying) {
      gfx.setFont(fontUi);
      const v = "Verifying", r = 6, sp = 2 * r, pad = 10, gap = 6, tw = gfx.textWidth(v);
      const w = pad + sp + gap + tw + pad, h = 24, bx = LCD_COLUMNS - w - 10, by = LCD_ROWS - h - 10;
      gfx.fillRoundRect(bx, by, w, h, h >> 1, BLACK);
      spinner(bx + pad, by + (h - sp >> 1), sp, now);
      gfx.drawText(v, bx + pad + sp + gap, by + (h - fontUi.height >> 1), true);
    }
    if (rxPaused) {
      gfx.setFont(fontUi);
      const pm = "Paused - waiting for sender", w = gfx.textWidth(pm) + 28, h = 28, bx = LCD_COLUMNS - w >> 1, by = 12;
      gfx.fillRoundRect(bx, by, w, h, h >> 1, BLACK);
      gfx.drawText(pm, bx + 14, by + (h - fontUi.height >> 1), true);
    }
    if (showPanel && demod) drawPanel();
    drawFinishedBanner();
    drawLed();
  }
  function resetAll() {
    clearImage();
    if (!demod) return;
    makeRx();
    demod = makeDemod(ctxRate, activeBand);
    name = "";
    untitled = 0;
    finishedMs = -1e9;
    ledFrameMs = ledBlockMs = lastBlockMs = hearingMs = -1e9;
  }
  var hudEl = document.getElementById("hud");
  var hudL1 = document.createElement("div");
  var hudL2 = document.createElement("div");
  if (hudEl) {
    hudEl.textContent = "";
    hudEl.append(hudL1, hudL2);
  }
  var lastStep = nowMs();
  function tick() {
    const now = nowMs();
    if (previewDirty) {
      previewRefresh();
      previewDirty = false;
    }
    if (demod && !started) {
      const st = demod.status();
      if (st.tone >= 0 || st.state !== 0) hearingMs = now;
    }
    if (started && !rxPaused && totalFrames > 0 && now - startedMs > (totalFrames - ILEAVE) * (physUsNow() / 1e3) + 4e3) finish(now);
    if (isAnim() && started && !finished) animPump(4096, false);
    let steps = 0;
    while (now - lastStep >= 1e3 / 30 && steps < 10) {
      stepAnimation();
      lastStep += 1e3 / 30;
      steps++;
    }
    if (steps === 10) lastStep = now;
    if (calibActive && now - calibLastMs > 3e3) calibActive = false;
    if ((calibActive || calibForced) && demod) {
      drawCalibration();
      drawLed();
    } else drawReceive();
    gfx.present(ctx);
    if (hudEl) {
      const st = demod ? demod.status() : { tone: -2, level: 0 };
      const tc = tinyHave.reduce((a, v) => a + v, 0), pc = previewHave.reduce((a, v) => a + v, 0);
      const num = (v, w) => String(v).padStart(w, "\u2007");
      const tone = st.tone < 0 ? "--" : st.tone === 8 ? "S" : String(st.tone);
      const l1 = `${micLabel ? "mic: " + micLabel : "mic: -"} \xB7 ${(ctxRate / 1e3).toFixed(1)} kHz`;
      const l2 = `frames ${num(demod ? demod.frames : 0, 5)} \xB7 ok ${num(rx ? rx.framesOk : 0, 5)} \xB7 bad ${num(rx ? rx.framesBad : 0, 4)} \xB7 tiny ${tc}/4 \xB7 preview ${num(pc, 2)}/20 \xB7 tone ${num(tone, 2)} \xB7 level ${st.level.toFixed(2)}`;
      if (hudL1.textContent !== l1) hudL1.textContent = l1;
      if (hudL2.textContent !== l2) hudL2.textContent = l2;
    }
    if (recState === "recording") recUi();
    requestAnimationFrame(tick);
  }
  clearImage();
  recUi();
  tick();
  var on = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  };
  on("listen", () => listen().catch((e) => {
    micState = -1;
    alert("Mic error: " + e.message);
  }));
  var calibBtn = document.getElementById("calib");
  on("calib", () => {
    calibForced = !calibForced;
    if (calibForced && !demod) listen().catch((e) => {
      micState = -1;
      alert("Mic error: " + e.message);
    });
    if (calibForced) calibN = 0;
    if (calibBtn) calibBtn.classList.toggle("on", calibForced);
    if (calibBtn) calibBtn.textContent = calibForced ? "Calibration: on" : "Calibration";
  });
  var clearAll = () => {
    clearImage();
    if (rx) rx.forget();
  };
  on("clear", clearAll);
  cv.addEventListener("wheel", (e) => {
    if (isNote()) {
      e.preventDefault();
      noteScroll += e.deltaY * 0.5;
      noteFollow = false;
    }
  }, { passive: false });
  on("reset", resetAll);
  on("save", saveWav);
  on("gif", () => {
    if (!gifUrl) return;
    const a = document.createElement("a");
    a.href = gifUrl;
    a.download = `${(name || "animation").replace(/[^A-Za-z0-9_.-]/g, "_")}.gif`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
  if (recBtn) {
    recBtn.addEventListener("pointerdown", (e) => {
      if (e.button === 0) recToggle().catch((err) => {
        micState = -1;
        alert("Mic error: " + err.message);
      });
    });
    recBtn.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        recToggle();
      }
    });
  }
  on("a", clearAll);
  on("panel", () => {
    showPanel = !showPanel;
  });
  on("right", () => {
    showPanel = !showPanel;
  });
  document.addEventListener("keydown", (e) => {
    if (e.target && e.target.tagName === "TEXTAREA") return;
    if (e.key === "a") clearAll();
    if (e.key === "ArrowRight") showPanel = !showPanel;
  });
})();
