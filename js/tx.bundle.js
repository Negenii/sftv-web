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
  var CODED_MIN_GAIN = 0.85;
  var NUM_TONES = 4;
  var BITS_PER_SYMBOL = 2;
  var TONES_HZ = [0, 3e3, 3500, 4e3];
  var TONE_DUTY_PCT = [0, 12, 30, 50];
  var SYNC_DUTY_PCT = 50;
  var FSYNC_HZ = 5500;
  var SYMBOL_US = 4e3;
  var SYNC_US = 16e3;
  var BAND_AUDIBLE = 0;
  var BAND_HF = 1;
  var HF_NUM_TONES = 8;
  var HF_BITS_PER_SYMBOL = 3;
  var HF_TONES_HZ = [17e3, 17500, 18e3, 18500, 19e3, 19500, 2e4, 20500];
  var HF_FSYNC_HZ = 21e3;
  var HF_SYMBOL_US = 3e3;
  var LADDER_TONE_SYMBOLS = 50;
  var LADDER_GAP_SYMBOLS = 25;
  var LOCK_FRAMES = 3;
  var SYMBOLS_PER_FRAME = FRAME_BITS / BITS_PER_SYMBOL;
  var LEADER_SYMBOLS = (NUM_TONES - 1) * (LADDER_TONE_SYMBOLS + LADDER_GAP_SYMBOLS);
  var leaderSymbol = (i) => {
    const per = LADDER_TONE_SYMBOLS + LADDER_GAP_SYMBOLS;
    return i % per < LADDER_TONE_SYMBOLS ? 1 + Math.floor(i / per) : 0;
  };
  var PHYS_US = SYNC_US + SYMBOLS_PER_FRAME * SYMBOL_US;
  var LINE_US = PHYS_US * SEGS_PER_LINE;
  var PREAMBLE_US = LEADER_SYMBOLS * SYMBOL_US + LOCK_FRAMES * PHYS_US;
  var CODEC_RAW = 0;
  var CODEC_RLE = 1;
  var CODEC_XOR_RLE = 2;
  var CODEC_MAX_RECORD = 1 + LINE_BYTES;
  var bandSymbolUs = (band) => band === BAND_HF ? HF_SYMBOL_US : SYMBOL_US;
  var bandNumTones = (band) => band === BAND_HF ? HF_NUM_TONES : NUM_TONES;
  var bandBits = (band) => band === BAND_HF ? HF_BITS_PER_SYMBOL : BITS_PER_SYMBOL;
  var bandSymbolsPerFrame = (band) => Math.ceil(FRAME_BITS / bandBits(band));
  var HF_SYNC_SYMBOLS = 8;
  var HF_SYNC_PATTERN = [0, 4, 7, 3, 6, 2, 5, 1];
  var bandSyncUs = (band) => band === BAND_HF ? HF_SYNC_SYMBOLS * HF_SYMBOL_US : SYNC_US;
  var bandPhysUs = (band) => bandSyncUs(band) + bandSymbolsPerFrame(band) * bandSymbolUs(band);
  var bandLeaderSymbols = (band) => (bandNumTones(band) - 1) * (LADDER_TONE_SYMBOLS + LADDER_GAP_SYMBOLS);

  // js/protocol/image.js
  var bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  function ditherRGBA(rgba2) {
    const out = new Uint8Array(IMAGE_BYTES);
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const p = (y * WIDTH + x) * 4;
        const a = rgba2[p + 3] / 255;
        const luma = (0.299 * rgba2[p] + 0.587 * rgba2[p + 1] + 0.114 * rgba2[p + 2]) * a + 255 * (1 - a);
        const thr = (2 * bayer[y & 3][x & 3] + 1) / 32 * 255;
        if (luma < thr) out[y * LINE_BYTES + (x >> 3)] |= 128 >> (x & 7);
      }
    }
    return out;
  }

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
    const g2 = new Uint8Array(RS_PARITY + 1);
    let deg = 0;
    g2[0] = 1;
    for (let i = 0; i < RS_PARITY; i++) {
      const r = gfPow(i);
      const ng = new Uint8Array(RS_PARITY + 1);
      ng[0] = g2[0];
      for (let j = 1; j <= deg; j++) ng[j] = g2[j] ^ gfMul(r, g2[j - 1]);
      ng[deg + 1] = gfMul(r, g2[deg]);
      deg++;
      for (let j = 0; j <= deg; j++) g2[j] = ng[j];
    }
    gen.set(g2);
    ready = true;
  }
  function gfMul(a, b) {
    return a === 0 || b === 0 ? 0 : gfExp[gfLog[a] + gfLog[b]];
  }
  function gfPow(e) {
    e %= 255;
    if (e < 0) e += 255;
    return gfExp[e];
  }
  var RsEncoder = class {
    constructor() {
      tablesInit();
      this.rem = new Uint8Array(RS_PARITY);
    }
    feed(byte) {
      const coef = byte ^ this.rem[0];
      for (let j = 0; j < RS_PARITY - 1; j++) this.rem[j] = this.rem[j + 1];
      this.rem[RS_PARITY - 1] = 0;
      if (coef) for (let j = 0; j < RS_PARITY; j++) this.rem[j] ^= gfMul(gen[j + 1], coef);
    }
    finish(out, off = 0) {
      for (let j = 0; j < RS_PARITY; j++) out[off + j] = this.rem[j];
    }
  };
  function rsEncode(data, dataLen, parity, parityOff = 0) {
    const e = new RsEncoder();
    for (let i = 0; i < dataLen; i++) e.feed(data[i]);
    e.finish(parity, parityOff);
  }

  // js/protocol/codec.js
  var ROW_BITS = LINE_BYTES * 8;
  var getBit = (row, i) => row[i >> 3] >> 7 - (i & 7) & 1;
  function rleEncode(row, out, limit) {
    let n = 0, colour = 0, i = 0;
    while (i < ROW_BITS) {
      let run = 0;
      while (i < ROW_BITS && getBit(row, i) === colour && run < 255) {
        run++;
        i++;
      }
      if (n >= limit) return limit + 1;
      out[n++] = run;
      if (run === 255) {
        if (n >= limit) return limit + 1;
        out[n++] = 0;
        continue;
      }
      colour ^= 1;
    }
    return n;
  }
  function codecEncode(row, ref, out, outOff = 0) {
    let bestMode = CODEC_RAW, bestLen = LINE_BYTES;
    const cand = new Uint8Array(64);
    let n = rleEncode(row, cand, 63);
    if (n < bestLen) {
      bestLen = n;
      bestMode = CODEC_RLE;
      out.set(cand.subarray(0, n), outOff + 1);
    }
    if (ref) {
      const buf = new Uint8Array(LINE_BYTES);
      for (let i = 0; i < LINE_BYTES; i++) buf[i] = row[i] ^ ref[i];
      n = rleEncode(buf, cand, 63);
      if (n < bestLen) {
        bestLen = n;
        bestMode = CODEC_XOR_RLE;
        out.set(cand.subarray(0, n), outOff + 1);
      }
    }
    if (bestMode === CODEC_RAW) {
      out.set(row.subarray(0, LINE_BYTES), outOff + 1);
      out[outOff] = (CODEC_RAW << 6 | LINE_BYTES) & 255;
    } else {
      out[outOff] = (bestMode << 6 | bestLen & 63) & 255;
    }
    return 1 + bestLen;
  }

  // js/protocol/preview.js
  var bayer2 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  function shrink(imageBits, out, w, h, lineBytes, bw, bh) {
    out.fill(0, 0, lineBytes * h);
    const area = bw * bh;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        let black = 0;
        for (let dy = 0; dy < bh; dy++) {
          const rowOff = (py * bh + dy) * LINE_BYTES;
          for (let dx = 0; dx < bw; dx++) {
            const x = px * bw + dx;
            black += imageBits[rowOff + (x >> 3)] >> 7 - (x & 7) & 1;
          }
        }
        if (black * 32 > (2 * bayer2[py & 3][px & 3] + 1) * area)
          out[py * lineBytes + (px >> 3)] |= 128 >> (px & 7);
      }
    }
  }
  function previewMake(imageBits, out) {
    shrink(imageBits, out, PREVIEW_W, PREVIEW_H, PREVIEW_LINE_BYTES, WIDTH / PREVIEW_W, HEIGHT / PREVIEW_H);
  }
  function previewMakeTiny(imageBits, out) {
    shrink(imageBits, out, TINY_W, TINY_H, TINY_LINE_BYTES, WIDTH / TINY_W, HEIGHT / TINY_H);
  }

  // js/protocol/frame.js
  var hdr = (type, index2) => (type << FT_SHIFT | index2 & INDEX_MASK) & 65535;
  var segLine = (seg) => Math.floor(seg / SEGS_PER_LINE);
  var segByteOffset = (seg) => seg % SEGS_PER_LINE * SEG_BYTES;
  function frameBit(frame, off, index2) {
    return frame[off + (index2 >> 3)] >> 7 - (index2 & 7) & 1;
  }
  function frameSymbolBits(frame, off, index2, bits) {
    let v = 0;
    for (let b = 0; b < bits; b++) {
      const bi = index2 * bits + b;
      v = v << 1 | (bi < FRAME_BITS ? frameBit(frame, off, bi) : 0);
    }
    return v;
  }
  function pack(h, payload, out, off = 0) {
    out[off] = h >> 8 & 255;
    out[off + 1] = h & 255;
    for (let i = 0; i < PAYLOAD_BYTES; i++) out[off + 2 + i] = payload[i];
    out[off + DATA_BYTES - 1] = crc8(out.subarray(off, off + DATA_BYTES - 1), DATA_BYTES - 1);
    rsEncode(out.subarray(off, off + DATA_BYTES), DATA_BYTES, out, off + DATA_BYTES);
  }
  function interleave(logical, physical) {
    for (let i = 0; i < ILEAVE; i++)
      for (let j = 0; j < FRAME_BYTES; j++)
        physical[j * ILEAVE + i] = logical[i * FRAME_BYTES + j];
  }
  function blockPack(imageBits, firstLine, payload) {
    payload.fill(0, 0, BLOCK_PAYLOAD);
    payload[1] = firstLine & 255;
    let pos = 2, count = 0;
    let ref = null;
    const rec = new Uint8Array(CODEC_MAX_RECORD);
    const row = new Uint8Array(LINE_BYTES);
    for (let y = firstLine; y < HEIGHT; y++) {
      for (let i = 0; i < LINE_BYTES; i++) row[i] = imageBits[y * LINE_BYTES + i];
      const n = codecEncode(row, ref, rec, 0);
      if (pos + n > BLOCK_PAYLOAD) break;
      payload.set(rec.subarray(0, n), pos);
      pos += n;
      count++;
      ref = imageBits.subarray(y * LINE_BYTES, y * LINE_BYTES + LINE_BYTES);
    }
    payload[0] = count & 255;
    return count;
  }
  var passIntro = (coded) => ILEAVE + (coded ? INTRO_FRAMES_CODED : INTRO_FRAMES);
  function passGroups(dataFrames, intro) {
    if (dataFrames <= intro) return 1;
    return 1 + Math.floor((dataFrames - intro + OUTER_GROUP - 1) / OUTER_GROUP);
  }
  function passTotal(dataFrames, intro) {
    return dataFrames + passGroups(dataFrames, intro) * OUTER_PARITY + ILEAVE;
  }
  var Emitter = class {
    constructor(out, linesAfter) {
      this.out = out;
      this.linesAfter = linesAfter;
      this.blocks = 0;
      this.dataFrames = 0;
      this.enc = Array.from({ length: PAYLOAD_BYTES }, () => new RsEncoder());
      this.groupFrames = 0;
      this.group = 0;
    }
    block(logical, before, after) {
      interleave(logical, this.out.subarray(this.blocks * ILEAVE * FRAME_BYTES));
      if (this.linesAfter)
        for (let f = 0; f < ILEAVE; f++)
          this.linesAfter[this.blocks * ILEAVE + f] = (f === ILEAVE - 1 ? after : before) & 255;
      this.blocks++;
    }
    closeGroup() {
      if (this.groupFrames === 0) return;
      const logical = new Uint8Array(ILEAVE * FRAME_BYTES);
      const payload = Array.from({ length: ILEAVE }, () => new Uint8Array(PAYLOAD_BYTES));
      for (let j = 0; j < OUTER_PARITY; j += ILEAVE) {
        for (let k = 0; k < PAYLOAD_BYTES; k++) {
          const p = new Uint8Array(OUTER_PARITY);
          this.enc[k].finish(p, 0);
          for (let i = 0; i < ILEAVE; i++) payload[i][k] = p[j + i];
        }
        for (let i = 0; i < ILEAVE; i++)
          pack(hdr(FT_PARITY, this.group * OUTER_PARITY + j + i), payload[i], logical, i * FRAME_BYTES);
        this.block(logical, 0, 0);
      }
      for (let k = 0; k < PAYLOAD_BYTES; k++) this.enc[k] = new RsEncoder();
      this.groupFrames = 0;
      this.group++;
    }
    dataBlock(logical, before, after) {
      this.block(logical, before, after);
      for (let i = 0; i < ILEAVE; i++) {
        const base = i * FRAME_BYTES + 2;
        for (let k = 0; k < PAYLOAD_BYTES; k++) this.enc[k].feed(logical[base + k]);
        this.groupFrames++;
        this.dataFrames++;
      }
      if (this.groupFrames === OUTER_GROUP) this.closeGroup();
    }
  };
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
  function buildPhysical(imageBits, name) {
    const out = new Uint8Array(MAX_FRAMES * FRAME_BYTES);
    const linesAfter = new Uint8Array(MAX_FRAMES);
    const payload = new Uint8Array(BLOCK_PAYLOAD);
    const schedule = new Uint8Array(MAX_BLOCKS);
    let codedBlocks = 0;
    for (let line2 = 0; line2 < HEIGHT && codedBlocks < MAX_BLOCKS; ) {
      const n = blockPack(imageBits, line2, payload);
      if (n <= 0) break;
      schedule[codedBlocks] = n;
      line2 += n;
      codedBlocks++;
    }
    const rawFrames = NUM_SEGS;
    const useCoded = codedBlocks * ILEAVE <= CODED_MIN_GAIN * rawFrames && codedBlocks <= MAX_CODED_BLOCKS;
    const em = new Emitter(out, linesAfter);
    const dataBlocks = useCoded ? codedBlocks : NUM_SEGS / ILEAVE;
    const intro = useCoded ? INTRO_FRAMES_CODED : INTRO_FRAMES;
    const dataFrames = ILEAVE + intro + dataBlocks * ILEAVE;
    const total = passTotal(dataFrames, passIntro(useCoded)) & 65535;
    const word = (total | (useCoded ? META_CODED_FLAG : 0)) & 65535;
    const logical = new Uint8Array(ILEAVE * FRAME_BYTES);
    const meta = new Uint8Array(PAYLOAD_BYTES);
    meta[0] = META_START;
    meta[1] = word & 255;
    meta[2] = word >> 8 & 255;
    if (name) {
      const b = new TextEncoder().encode(name);
      for (let i = 0; i < Math.min(b.length, NAME_MAX); i++) meta[META_NAME_OFFSET + i] = b[i];
    }
    for (let i = 0; i < ILEAVE; i++) pack(hdr(FT_META, 0), meta, logical, i * FRAME_BYTES);
    em.dataBlock(logical, 0, 0);
    const tiny = new Uint8Array(TINY_BYTES);
    previewMakeTiny(imageBits, tiny);
    for (let i = 0; i < ILEAVE; i++) {
      payload.fill(0);
      payload[0] = META_TINY;
      payload.set(tiny.subarray(i * PREVIEW_CHUNK, i * PREVIEW_CHUNK + PREVIEW_CHUNK), 1);
      pack(hdr(FT_META, i), payload.subarray(0, PAYLOAD_BYTES), logical, i * FRAME_BYTES);
    }
    em.dataBlock(logical, 0, 0);
    const preview = new Uint8Array(PREVIEW_BYTES);
    previewMake(imageBits, preview);
    for (let chunk = 0; chunk < PREVIEW_CHUNKS; chunk += ILEAVE) {
      for (let i = 0; i < ILEAVE; i++) {
        const c = chunk + i;
        payload.fill(0);
        payload[0] = META_PREVIEW;
        if (c < PREVIEW_CHUNKS) {
          const o = c * PREVIEW_CHUNK;
          const n = Math.min(PREVIEW_BYTES - o, PREVIEW_CHUNK);
          payload.set(preview.subarray(o, o + n), 1);
        }
        pack(hdr(FT_META, c), payload.subarray(0, PAYLOAD_BYTES), logical, i * FRAME_BYTES);
      }
      em.dataBlock(logical, 0, 0);
    }
    if (useCoded) {
      for (let i = 0; i < ILEAVE; i++) {
        payload.fill(0);
        payload[0] = META_SCHEDULE;
        payload.set(schedule.subarray(i * PREVIEW_CHUNK, i * PREVIEW_CHUNK + PREVIEW_CHUNK), 1);
        pack(hdr(FT_META, i), payload.subarray(0, PAYLOAD_BYTES), logical, i * FRAME_BYTES);
      }
      em.dataBlock(logical, 0, 0);
      em.closeGroup();
      let line2 = 0;
      while (line2 < HEIGHT) {
        const n = blockPack(imageBits, line2, payload);
        if (n <= 0) break;
        const index2 = Math.floor(em.dataFrames / ILEAVE) - 1;
        for (let i = 0; i < ILEAVE; i++)
          pack(hdr(FT_CODED, index2), payload.subarray(i * PAYLOAD_BYTES, i * PAYLOAD_BYTES + PAYLOAD_BYTES), logical, i * FRAME_BYTES);
        line2 += n;
        em.dataBlock(logical, line2 - n, line2);
      }
    } else {
      em.closeGroup();
      for (let seg = 0; seg < NUM_SEGS; seg += ILEAVE) {
        for (let i = 0; i < ILEAVE; i++) {
          const s = seg + i;
          payload.fill(0);
          const src = segLine(s) * LINE_BYTES + segByteOffset(s);
          for (let b = 0; b < SEG_BYTES; b++) payload[b] = imageBits[src + b];
          pack(hdr(FT_RAW, s), payload.subarray(0, PAYLOAD_BYTES), logical, i * FRAME_BYTES);
        }
        em.dataBlock(logical, seg / 2, seg / 2 + 2);
      }
    }
    em.closeGroup();
    meta[0] = META_END;
    for (let i = 0; i < ILEAVE; i++) pack(hdr(FT_META, 1), meta, logical, i * FRAME_BYTES);
    em.block(logical, HEIGHT, HEIGHT);
    const total2 = em.blocks * ILEAVE;
    return { frames: out.subarray(0, total2 * FRAME_BYTES), linesAfter: linesAfter.subarray(0, total2), total: total2, coded: useCoded };
  }
  function buildNote(text2, name) {
    const bytes = new TextEncoder().encode(text2 || "");
    const len = Math.min(bytes.length, NOTE_MAX_CHARS);
    let utf8 = false;
    for (let i = 0; i < len; i++) if (bytes[i] & 128) {
      utf8 = true;
      break;
    }
    const chunks = Math.floor((len + NOTE_CHUNK - 1) / NOTE_CHUNK);
    let textFrames = Math.floor((chunks + ILEAVE - 1) / ILEAVE) * ILEAVE;
    if (textFrames === 0) textFrames = ILEAVE;
    const dataFrames = ILEAVE + textFrames;
    const total = passTotal(dataFrames, noteIntro(dataFrames)) & 65535;
    const out = new Uint8Array(total * FRAME_BYTES);
    const linesAfter = new Uint8Array(total);
    const clamp = (v) => Math.min(v, 255);
    const em = new Emitter(out, linesAfter);
    const logical = new Uint8Array(ILEAVE * FRAME_BYTES);
    const word = (total | META_NOTE_FLAG | (utf8 ? META_UTF8_FLAG : 0)) & 65535;
    const meta = new Uint8Array(PAYLOAD_BYTES);
    meta[0] = META_START;
    meta[1] = word & 255;
    meta[2] = word >> 8 & 255;
    meta[NOTE_LEN_OFFSET] = len & 255;
    meta[NOTE_LEN_OFFSET + 1] = len >> 8 & 255;
    if (name) {
      const nb = new TextEncoder().encode(name);
      for (let i = 0; i < Math.min(nb.length, NOTE_NAME_MAX); i++) meta[NOTE_NAME_OFFSET + i] = nb[i];
    }
    for (let i = 0; i < ILEAVE; i++) pack(hdr(FT_META, 0), meta, logical, i * FRAME_BYTES);
    em.dataBlock(logical, 0, 0);
    for (let block = 0; block < textFrames; block += ILEAVE) {
      for (let i = 0; i < ILEAVE; i++) {
        const c = block + i;
        const payload = new Uint8Array(PAYLOAD_BYTES);
        const o = c * NOTE_CHUNK;
        for (let k = 0; k < NOTE_CHUNK && o + k < len; k++) payload[k] = bytes[o + k];
        pack(hdr(FT_RAW, c), payload, logical, i * FRAME_BYTES);
      }
      em.dataBlock(logical, clamp(block), clamp(block + ILEAVE));
    }
    em.closeGroup();
    meta[0] = META_END;
    for (let i = 0; i < ILEAVE; i++) pack(hdr(FT_META, 1), meta, logical, i * FRAME_BYTES);
    em.block(logical, clamp(textFrames), clamp(textFrames));
    const t = em.blocks * ILEAVE;
    return { frames: out.subarray(0, t * FRAME_BYTES), linesAfter: linesAfter.subarray(0, t), total: t };
  }

  // js/protocol/modem.js
  var Modem = class _Modem {
    constructor(sampleRate, amplitude = 8e3) {
      this.sampleRate = sampleRate;
      this.amplitude = amplitude;
      this.tones = TONES_HZ.slice();
      this.duty = TONE_DUTY_PCT.map((d) => d / 100);
      this.channelGain = this.duty.map((d) => {
        const f = Math.sin(Math.PI * d);
        return d > 0 && f > 0.05 ? 1 / f : 1;
      });
      this.fsync = FSYNC_HZ;
      this.syncDuty = SYNC_DUTY_PCT / 100;
      this.symbolUs = SYMBOL_US;
      this.band = BAND_AUDIBLE;
      this.bits = BITS_PER_SYMBOL;
      this.spf = SYMBOLS_PER_FRAME;
      this.phase = 0;
      this.timeUs = 0;
      this.samplesOut = 0;
    }
    // Appends a tone; returns samples written into out at off.
    toneGain(freqHz, duty, gain, durationUs, out, off) {
      const endUs = this.timeUs + durationUs;
      const endSamples = Math.floor(endUs * this.sampleRate / 1e6 + 0.5);
      let n = endSamples - this.samplesOut;
      if (n < 0) n = 0;
      const step = freqHz / this.sampleRate;
      for (let i = 0; i < n; i++) {
        if (freqHz <= 0 || duty <= 0) {
          out[off + i] = 0;
          continue;
        }
        let a = this.amplitude * gain;
        if (a > 32767) a = 32767;
        out[off + i] = this.sine ? a * Math.sin(2 * Math.PI * this.phase) | 0 : this.phase < duty ? a | 0 : -a | 0;
        this.phase += step;
        if (this.phase >= 1) this.phase -= 1;
      }
      this.timeUs = endUs;
      this.samplesOut += n;
      return n;
    }
    frame(frames, frameOff, out, off) {
      let total = 0;
      if (this.band === BAND_HF) {
        for (const v of HF_SYNC_PATTERN) total += this.toneGain(this.tones[v], this.duty[v], this.channelGain[v], this.symbolUs, out, off + total);
      } else {
        total = this.toneGain(this.fsync, this.syncDuty, 1, SYNC_US, out, off);
      }
      for (let i = 0; i < this.spf; i++) {
        const v = frameSymbolBits(frames, frameOff, i, this.bits);
        total += this.toneGain(this.tones[v], this.duty[v], this.channelGain[v], this.symbolUs, out, off + total);
      }
      return total;
    }
    // Switches to the HF band (8-FSK, 3 ms) or back (mirror of sstv_mod_set_band).
    setBand(band) {
      if (band !== BAND_HF) {
        const fresh = new _Modem(this.sampleRate, this.amplitude);
        Object.assign(this, { tones: fresh.tones, duty: fresh.duty, channelGain: fresh.channelGain, fsync: fresh.fsync, symbolUs: fresh.symbolUs, band: fresh.band, bits: fresh.bits, spf: fresh.spf, sine: false });
        return this;
      }
      this.tones = HF_TONES_HZ.slice();
      this.duty = this.tones.map(() => 0.5);
      this.channelGain = this.tones.map(() => 1);
      this.fsync = HF_FSYNC_HZ;
      this.symbolUs = HF_SYMBOL_US;
      this.sine = true;
      this.band = BAND_HF;
      this.bits = HF_BITS_PER_SYMBOL;
      this.spf = bandSymbolsPerFrame(BAND_HF);
      return this;
    }
    // Start preamble: tone ladder, then lock frames (mirror of sstv_mod_preamble).
    preamble(out, off) {
      let total = 0;
      for (let i = 0; i < bandLeaderSymbols(this.band); i++) {
        const k = leaderSymbol(i);
        total += this.toneGain(this.tones[k], this.duty[k], this.channelGain[k], this.symbolUs, out, off + total);
      }
      const lock = lockFrame();
      for (let f = 0; f < LOCK_FRAMES; f++) total += this.frame(lock, 0, out, off + total);
      return total;
    }
    pass(frames, nframes) {
      const capUs = PREAMBLE_US + MAX_FRAMES * PHYS_US;
      const out = new Int16Array(Math.floor(capUs * this.sampleRate / 1e6) + 64);
      let total = this.preamble(out, 0);
      for (let p = 0; p < nframes; p++) total += this.frame(frames, p * FRAME_BYTES, out, total);
      return out.subarray(0, total);
    }
    // Modulates a whole image (preamble + all physical frames). Returns Int16Array.
    image(imageBits, name = "image") {
      const { frames, total } = buildPhysical(imageBits, name);
      return this.pass(frames, total);
    }
    // Modulates a text note (preamble + note frames). Returns Int16Array.
    note(text2, name = "note") {
      const { frames, total } = buildNote(text2, name);
      return this.pass(frames, total);
    }
  };

  // js/audio/tx-audio.js
  var TxAudio = class {
    constructor() {
      this.ctx = null;
      this.src = null;
      this.startTime = 0;
      this.duration = 0;
    }
    get sampleRate() {
      this.ctx = this.ctx || new AudioContext();
      return this.ctx.sampleRate;
    }
    async play(int16, onEnded) {
      this.ctx = this.ctx || new AudioContext();
      await this.ctx.resume();
      const buf = this.ctx.createBuffer(1, int16.length, this.ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < int16.length; i++) ch[i] = int16[i] / 32768;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      src.onended = () => {
        this.src = null;
        if (onEnded) onEnded();
      };
      src.start();
      this.src = src;
      this.startTime = this.ctx.currentTime;
      this.duration = buf.duration;
    }
    stop() {
      if (this.src) {
        try {
          this.src.onended = null;
          this.src.stop();
        } catch (e) {
        }
        this.src = null;
      }
    }
    get playing() {
      return !!this.src;
    }
    elapsed() {
      return this.ctx && this.src ? this.ctx.currentTime - this.startTime : 0;
    }
  };

  // js/ui/u8g2font.js
  var U8g2Font = class {
    constructor(data) {
      this.f = data;
      const h = data;
      this.bp0 = h[2];
      this.bp1 = h[3];
      this.bpw = h[4];
      this.bph = h[5];
      this.bpx = h[6];
      this.bpy = h[7];
      this.bpd = h[8];
      this.maxH = h[10];
      this.upperA = h[17] << 8 | h[18];
      this.lowerA = h[19] << 8 | h[20];
      this.unicode = h[21] << 8 | h[22];
      this.cache = /* @__PURE__ */ new Map();
    }
    get height() {
      return this.maxH;
    }
    glyphPtr(enc) {
      const f = this.f;
      let p = 23;
      if (enc <= 255) {
        if (enc >= 97) p += this.lowerA;
        else if (enc >= 65) p += this.upperA;
        for (; ; ) {
          if (f[p + 1] === 0) return -1;
          if (f[p] === enc) return p + 2;
          p += f[p + 1];
        }
      }
      p += this.unicode;
      let lut = p, e;
      do {
        p += f[lut] << 8 | f[lut + 1];
        e = f[lut + 2] << 8 | f[lut + 3];
        lut += 4;
      } while (e < enc);
      for (; ; ) {
        e = f[p] << 8 | f[p + 1];
        if (e === 0) return -1;
        if (e === enc) return p + 3;
        p += f[p + 2];
      }
    }
    // -> { w, h, x, y, dx, runs: [[px, py, len], ...] } with py counted from the glyph top
    glyph(enc) {
      if (this.cache.has(enc)) return this.cache.get(enc);
      const ptr = this.glyphPtr(enc);
      let g2 = null;
      if (ptr >= 0) {
        const f = this.f;
        let pos = ptr, bit = 0;
        const u = (cnt) => {
          let val = f[pos] >> bit;
          let nb = bit + cnt;
          if (nb >= 8) {
            pos++;
            val |= f[pos] << 8 - bit;
            nb -= 8;
          }
          bit = nb;
          return val & (1 << cnt) - 1;
        };
        const s = (cnt) => u(cnt) - (1 << cnt - 1);
        const w = u(this.bpw), h = u(this.bph), x = s(this.bpx), y = s(this.bpy), dx = s(this.bpd);
        const runs = [];
        if (w > 0) {
          let lx = 0, ly = 0;
          const len = (n, fg) => {
            let cnt = n;
            for (; ; ) {
              const rem = w - lx, cur = cnt < rem ? cnt : rem;
              if (fg && cur > 0) runs.push([lx, ly, cur]);
              if (cnt < rem) break;
              cnt -= rem;
              lx = 0;
              ly++;
            }
            lx += cnt;
          };
          for (; ; ) {
            const a = u(this.bp0), b = u(this.bp1);
            do {
              len(a, false);
              len(b, true);
            } while (u(1) !== 0);
            if (ly >= h) break;
          }
        }
        g2 = { w, h, x, y, dx, runs };
      }
      this.cache.set(enc, g2);
      return g2;
    }
    width(str) {
      let w = 0;
      for (const ch of str) {
        const g2 = this.glyph(ch.codePointAt(0));
        if (g2) w += g2.dx;
      }
      return w;
    }
    // draws with ctx's current fillStyle; (x, y) is the baseline start, like canvas_draw_str
    draw(ctx, x, y, str) {
      for (const ch of str) {
        const g2 = this.glyph(ch.codePointAt(0));
        if (!g2) continue;
        const tx2 = x + g2.x, ty = y - (g2.h + g2.y);
        for (const [px, py, n] of g2.runs) ctx.fillRect(tx2 + px, ty + py, n, 1);
        x += g2.dx;
      }
      return x;
    }
  };

  // js/ui/font-haxrcorp.js
  var HAXRCORP = new Uint8Array([
    158,
    0,
    2,
    2,
    4,
    4,
    1,
    4,
    5,
    8,
    11,
    0,
    254,
    7,
    254,
    8,
    255,
    1,
    56,
    2,
    135,
    3,
    138,
    32,
    5,
    0,
    81,
    2,
    33,
    7,
    113,
    81,
    50,
    84,
    0,
    34,
    7,
    51,
    153,
    146,
    172,
    0,
    35,
    10,
    85,
    211,
    86,
    13,
    85,
    13,
    85,
    1,
    36,
    12,
    149,
    207,
    154,
    87,
    165,
    242,
    78,
    170,
    218,
    17,
    37,
    13,
    119,
    17,
    151,
    145,
    138,
    109,
    152,
    97,
    151,
    70,
    9,
    38,
    11,
    118,
    241,
    166,
    99,
    91,
    202,
    164,
    227,
    10,
    39,
    5,
    49,
    89,
    50,
    40,
    8,
    147,
    143,
    154,
    202,
    238,
    2,
    41,
    8,
    147,
    143,
    146,
    203,
    174,
    18,
    42,
    9,
    85,
    213,
    90,
    85,
    171,
    25,
    1,
    43,
    10,
    85,
    211,
    154,
    81,
    28,
    50,
    163,
    8,
    44,
    7,
    50,
    111,
    150,
    20,
    0,
    45,
    6,
    21,
    215,
    50,
    4,
    46,
    5,
    17,
    81,
    18,
    47,
    14,
    119,
    17,
    143,
    51,
    204,
    48,
    195,
    12,
    51,
    204,
    48,
    19,
    48,
    11,
    117,
    209,
    182,
    178,
    92,
    105,
    234,
    180,
    0,
    49,
    6,
    114,
    113,
    182,
    122,
    50,
    10,
    117,
    209,
    182,
    114,
    70,
    185,
    61,
    4,
    51,
    12,
    117,
    209,
    182,
    114,
    70,
    81,
    67,
    157,
    22,
    0,
    52,
    12,
    117,
    209,
    158,
    101,
    42,
    211,
    208,
    25,
    37,
    0,
    53,
    12,
    117,
    209,
    114,
    163,
    145,
    97,
    70,
    58,
    45,
    0,
    54,
    12,
    117,
    209,
    182,
    178,
    70,
    35,
    101,
    157,
    22,
    0,
    55,
    13,
    117,
    209,
    50,
    52,
    202,
    40,
    103,
    148,
    51,
    138,
    0,
    56,
    11,
    117,
    209,
    182,
    178,
    78,
    43,
    235,
    180,
    0,
    57,
    12,
    117,
    209,
    182,
    178,
    78,
    35,
    35,
    157,
    22,
    0,
    58,
    6,
    65,
    83,
    18,
    3,
    59,
    8,
    98,
    111,
    150,
    97,
    82,
    0,
    60,
    7,
    83,
    147,
    154,
    234,
    2,
    61,
    8,
    53,
    213,
    50,
    52,
    28,
    2,
    62,
    7,
    83,
    147,
    146,
    171,
    18,
    63,
    11,
    117,
    209,
    182,
    114,
    70,
    185,
    166,
    35,
    0,
    64,
    17,
    136,
    49,
    55,
    86,
    198,
    114,
    169,
    152,
    84,
    76,
    114,
    164,
    76,
    142,
    5,
    65,
    10,
    117,
    209,
    182,
    178,
    30,
    35,
    219,
    1,
    66,
    12,
    117,
    209,
    50,
    82,
    214,
    67,
    101,
    61,
    20,
    0,
    67,
    12,
    117,
    209,
    182,
    178,
    70,
    25,
    101,
    148,
    211,
    2,
    68,
    9,
    117,
    209,
    50,
    82,
    246,
    30,
    10,
    69,
    12,
    117,
    209,
    114,
    163,
    140,
    70,
    202,
    40,
    163,
    33,
    70,
    13,
    117,
    209,
    114,
    163,
    140,
    70,
    202,
    40,
    163,
    140,
    0,
    71,
    11,
    117,
    209,
    182,
    178,
    70,
    113,
    235,
    180,
    0,
    72,
    9,
    117,
    209,
    146,
    237,
    49,
    178,
    29,
    73,
    6,
    113,
    81,
    114,
    4,
    74,
    13,
    117,
    209,
    142,
    50,
    202,
    40,
    163,
    140,
    116,
    90,
    0,
    75,
    11,
    117,
    209,
    146,
    101,
    42,
    117,
    138,
    85,
    14,
    76,
    13,
    117,
    209,
    146,
    81,
    70,
    25,
    101,
    148,
    81,
    70,
    67,
    77,
    14,
    119,
    17,
    147,
    225,
    94,
    149,
    140,
    26,
    106,
    168,
    97,
    0,
    78,
    10,
    117,
    209,
    146,
    245,
    84,
    73,
    110,
    29,
    79,
    9,
    117,
    209,
    182,
    178,
    119,
    90,
    0,
    80,
    13,
    117,
    209,
    50,
    82,
    214,
    67,
    101,
    148,
    81,
    70,
    0,
    81,
    9,
    133,
    207,
    182,
    178,
    119,
    218,
    48,
    82,
    11,
    117,
    209,
    50,
    82,
    214,
    67,
    149,
    85,
    14,
    83,
    11,
    117,
    209,
    182,
    178,
    134,
    27,
    234,
    180,
    0,
    84,
    13,
    117,
    209,
    50,
    100,
    70,
    25,
    101,
    148,
    81,
    70,
    17,
    85,
    8,
    117,
    209,
    146,
    125,
    167,
    5,
    86,
    11,
    117,
    209,
    146,
    237,
    84,
    166,
    156,
    81,
    4,
    87,
    14,
    119,
    17,
    19,
    163,
    140,
    50,
    202,
    40,
    163,
    172,
    44,
    0,
    88,
    10,
    117,
    209,
    146,
    117,
    170,
    171,
    90,
    7,
    89,
    12,
    117,
    209,
    146,
    117,
    170,
    51,
    202,
    40,
    163,
    8,
    90,
    10,
    117,
    209,
    50,
    52,
    202,
    221,
    104,
    8,
    91,
    8,
    147,
    143,
    50,
    98,
    159,
    3,
    92,
    14,
    119,
    17,
    147,
    169,
    76,
    101,
    42,
    83,
    153,
    202,
    84,
    0,
    93,
    8,
    147,
    143,
    50,
    251,
    28,
    1,
    94,
    7,
    53,
    217,
    154,
    83,
    29,
    95,
    6,
    21,
    209,
    50,
    4,
    96,
    6,
    51,
    153,
    146,
    11,
    97,
    8,
    84,
    177,
    54,
    162,
    153,
    6,
    98,
    10,
    116,
    177,
    146,
    243,
    138,
    230,
    72,
    0,
    99,
    9,
    84,
    177,
    166,
    162,
    142,
    73,
    1,
    100,
    9,
    116,
    177,
    94,
    141,
    104,
    166,
    1,
    101,
    9,
    84,
    177,
    166,
    226,
    216,
    72,
    1,
    102,
    8,
    114,
    113,
    166,
    210,
    170,
    0,
    103,
    10,
    116,
    173,
    54,
    162,
    153,
    118,
    82,
    0,
    104,
    9,
    116,
    177,
    146,
    243,
    138,
    206,
    0,
    105,
    7,
    113,
    81,
    146,
    134,
    0,
    106,
    8,
    146,
    109,
    150,
    83,
    151,
    2,
    107,
    10,
    116,
    177,
    146,
    75,
    149,
    100,
    42,
    3,
    108,
    6,
    113,
    81,
    114,
    4,
    109,
    11,
    87,
    17,
    179,
    84,
    140,
    50,
    202,
    40,
    11,
    110,
    7,
    84,
    177,
    178,
    162,
    51,
    111,
    9,
    84,
    177,
    166,
    162,
    153,
    20,
    0,
    112,
    10,
    116,
    173,
    178,
    162,
    57,
    82,
    206,
    0,
    113,
    9,
    116,
    173,
    54,
    162,
    153,
    118,
    1,
    114,
    7,
    83,
    145,
    50,
    98,
    19,
    115,
    7,
    83,
    145,
    182,
    243,
    2,
    116,
    9,
    115,
    145,
    22,
    211,
    138,
    45,
    0,
    117,
    7,
    84,
    177,
    18,
    157,
    105,
    118,
    8,
    84,
    177,
    18,
    157,
    73,
    1,
    119,
    11,
    87,
    17,
    19,
    163,
    140,
    50,
    202,
    202,
    2,
    120,
    9,
    84,
    177,
    18,
    101,
    82,
    81,
    6,
    121,
    9,
    116,
    173,
    18,
    157,
    105,
    39,
    5,
    122,
    9,
    84,
    177,
    50,
    114,
    82,
    121,
    4,
    123,
    9,
    147,
    143,
    154,
    98,
    149,
    99,
    29,
    124,
    6,
    145,
    79,
    242,
    0,
    125,
    10,
    147,
    143,
    146,
    99,
    157,
    98,
    21,
    1,
    126,
    7,
    38,
    247,
    38,
    45,
    0,
    0,
    0,
    0,
    4,
    255,
    255,
    4,
    16,
    11,
    117,
    209,
    182,
    178,
    30,
    35,
    219,
    1,
    4,
    17,
    13,
    117,
    209,
    114,
    163,
    140,
    70,
    202,
    122,
    40,
    0,
    4,
    18,
    13,
    117,
    209,
    50,
    82,
    214,
    67,
    101,
    61,
    20,
    0,
    4,
    19,
    14,
    117,
    209,
    114,
    163,
    140,
    50,
    202,
    40,
    163,
    140,
    0,
    4,
    20,
    15,
    135,
    15,
    187,
    203,
    28,
    115,
    204,
    49,
    167,
    49,
    52,
    12,
    4,
    21,
    13,
    117,
    209,
    114,
    163,
    140,
    70,
    202,
    40,
    163,
    33,
    4,
    22,
    15,
    119,
    17,
    19,
    163,
    140,
    178,
    26,
    42,
    70,
    25,
    101,
    1,
    4,
    23,
    13,
    117,
    209,
    182,
    114,
    70,
    105,
    67,
    157,
    22,
    0,
    4,
    24,
    11,
    117,
    209,
    146,
    205,
    149,
    166,
    214,
    1,
    4,
    25,
    12,
    149,
    209,
    86,
    199,
    108,
    174,
    52,
    181,
    14,
    4,
    26,
    12,
    117,
    209,
    146,
    101,
    42,
    117,
    138,
    85,
    14,
    4,
    27,
    13,
    117,
    209,
    186,
    98,
    138,
    41,
    166,
    152,
    162,
    14,
    4,
    28,
    15,
    119,
    17,
    147,
    225,
    94,
    149,
    140,
    26,
    106,
    168,
    97,
    0,
    4,
    29,
    10,
    117,
    209,
    146,
    237,
    49,
    178,
    29,
    4,
    30,
    10,
    117,
    209,
    182,
    178,
    119,
    90,
    0,
    4,
    31,
    8,
    117,
    209,
    114,
    251,
    14,
    4,
    32,
    14,
    117,
    209,
    50,
    82,
    214,
    67,
    101,
    148,
    81,
    70,
    0,
    4,
    33,
    13,
    117,
    209,
    182,
    178,
    70,
    25,
    101,
    148,
    211,
    2,
    4,
    34,
    14,
    117,
    209,
    50,
    100,
    70,
    25,
    101,
    148,
    81,
    70,
    17,
    4,
    35,
    12,
    117,
    209,
    146,
    237,
    52,
    50,
    210,
    105,
    1,
    4,
    36,
    18,
    151,
    15,
    159,
    209,
    80,
    49,
    202,
    40,
    163,
    140,
    178,
    26,
    26,
    101,
    0,
    4,
    37,
    11,
    117,
    209,
    146,
    117,
    170,
    171,
    90,
    7,
    4,
    38,
    16,
    134,
    239,
    146,
    83,
    78,
    57,
    229,
    148,
    83,
    78,
    99,
    195,
    0,
    4,
    39,
    13,
    117,
    209,
    146,
    237,
    52,
    50,
    202,
    40,
    163,
    0,
    4,
    40,
    15,
    119,
    17,
    19,
    163,
    140,
    50,
    202,
    40,
    163,
    140,
    99,
    8,
    4,
    41,
    17,
    136,
    47,
    19,
    171,
    88,
    197,
    42,
    86,
    177,
    138,
    213,
    24,
    154,
    10,
    4,
    42,
    15,
    119,
    17,
    179,
    113,
    198,
    25,
    143,
    92,
    230,
    56,
    18,
    0,
    4,
    43,
    15,
    119,
    17,
    147,
    161,
    134,
    26,
    14,
    169,
    147,
    78,
    67,
    6,
    4,
    44,
    14,
    117,
    209,
    146,
    81,
    70,
    25,
    141,
    148,
    245,
    80,
    0,
    4,
    45,
    13,
    117,
    209,
    182,
    114,
    70,
    113,
    35,
    157,
    22,
    0,
    4,
    46,
    15,
    120,
    49,
    147,
    87,
    204,
    50,
    15,
    45,
    179,
    204,
    122,
    1,
    4,
    47,
    12,
    117,
    209,
    54,
    180,
    78,
    35,
    166,
    82,
    7,
    4,
    48,
    9,
    84,
    177,
    54,
    162,
    153,
    6,
    4,
    49,
    11,
    116,
    177,
    54,
    242,
    138,
    102,
    82,
    0,
    4,
    50,
    11,
    84,
    177,
    178,
    226,
    72,
    113,
    36,
    0,
    4,
    51,
    8,
    84,
    177,
    50,
    116,
    27,
    4,
    52,
    11,
    102,
    239,
    170,
    99,
    175,
    49,
    50,
    10,
    4,
    53,
    10,
    84,
    177,
    166,
    226,
    216,
    72,
    1,
    4,
    54,
    12,
    87,
    17,
    19,
    163,
    172,
    134,
    138,
    81,
    22,
    4,
    55,
    10,
    84,
    177,
    166,
    98,
    21,
    147,
    2,
    4,
    56,
    10,
    85,
    209,
    146,
    229,
    74,
    83,
    7,
    4,
    57,
    12,
    133,
    209,
    86,
    103,
    42,
    203,
    149,
    166,
    14,
    4,
    58,
    10,
    84,
    177,
    18,
    85,
    146,
    169,
    12,
    4,
    59,
    9,
    84,
    177,
    170,
    122,
    201,
    0,
    4,
    60,
    10,
    85,
    209,
    146,
    215,
    74,
    90,
    7,
    4,
    61,
    9,
    84,
    177,
    18,
    229,
    152,
    50,
    4,
    62,
    10,
    84,
    177,
    166,
    162,
    153,
    20,
    0,
    4,
    63,
    8,
    84,
    177,
    50,
    164,
    51,
    4,
    64,
    11,
    116,
    173,
    178,
    162,
    57,
    82,
    206,
    0,
    4,
    65,
    10,
    84,
    177,
    166,
    162,
    142,
    73,
    1,
    4,
    66,
    12,
    85,
    209,
    50,
    100,
    70,
    25,
    101,
    20,
    1,
    4,
    67,
    10,
    116,
    173,
    18,
    157,
    105,
    39,
    5,
    4,
    68,
    18,
    151,
    13,
    159,
    113,
    70,
    67,
    197,
    40,
    163,
    172,
    134,
    70,
    25,
    103,
    0,
    4,
    69,
    10,
    84,
    177,
    18,
    101,
    82,
    81,
    6,
    4,
    70,
    13,
    101,
    207,
    18,
    83,
    76,
    49,
    197,
    52,
    52,
    10,
    4,
    71,
    9,
    84,
    177,
    18,
    101,
    218,
    5,
    4,
    72,
    13,
    87,
    17,
    19,
    163,
    140,
    50,
    202,
    56,
    134,
    0,
    4,
    73,
    14,
    104,
    47,
    19,
    171,
    88,
    197,
    42,
    86,
    99,
    104,
    42,
    4,
    74,
    11,
    85,
    209,
    162,
    81,
    70,
    179,
    90,
    0,
    4,
    75,
    13,
    86,
    241,
    146,
    145,
    70,
    35,
    202,
    52,
    98,
    0,
    4,
    76,
    10,
    84,
    177,
    146,
    243,
    138,
    35,
    1,
    4,
    78,
    12,
    86,
    241,
    18,
    85,
    57,
    162,
    138,
    22,
    0,
    4,
    79,
    10,
    84,
    177,
    54,
    98,
    90,
    73,
    6,
    0,
    0
  ]);

  // js/ui/icon-dolphin-done.js
  var DOLPHIN_DONE = { w: 80, h: 48, bits: new Uint8Array([
    0,
    0,
    0,
    127,
    56,
    0,
    0,
    0,
    192,
    0,
    0,
    0,
    0,
    62,
    0,
    0,
    0,
    15,
    224,
    0,
    0,
    0,
    0,
    255,
    128,
    0,
    0,
    31,
    255,
    0,
    0,
    0,
    1,
    249,
    224,
    0,
    0,
    56,
    255,
    192,
    0,
    0,
    1,
    152,
    240,
    0,
    0,
    33,
    248,
    224,
    0,
    0,
    3,
    152,
    16,
    0,
    0,
    3,
    188,
    0,
    0,
    0,
    2,
    24,
    0,
    0,
    0,
    7,
    28,
    0,
    0,
    0,
    2,
    24,
    0,
    63,
    240,
    15,
    14,
    0,
    0,
    0,
    0,
    24,
    1,
    255,
    254,
    14,
    3,
    0,
    0,
    0,
    126,
    28,
    7,
    192,
    15,
    158,
    1,
    0,
    0,
    0,
    195,
    220,
    30,
    0,
    1,
    254,
    0,
    0,
    0,
    1,
    128,
    124,
    56,
    0,
    0,
    126,
    0,
    0,
    255,
    255,
    0,
    31,
    240,
    0,
    0,
    31,
    0,
    0,
    170,
    171,
    224,
    6,
    224,
    0,
    0,
    7,
    0,
    0,
    85,
    85,
    248,
    3,
    192,
    0,
    0,
    3,
    240,
    7,
    170,
    42,
    254,
    1,
    192,
    0,
    0,
    0,
    239,
    250,
    85,
    84,
    255,
    0,
    64,
    0,
    0,
    0,
    117,
    85,
    170,
    170,
    255,
    128,
    32,
    0,
    0,
    0,
    58,
    170,
    85,
    85,
    127,
    192,
    16,
    0,
    0,
    0,
    29,
    85,
    170,
    170,
    191,
    224,
    8,
    0,
    0,
    0,
    10,
    170,
    85,
    85,
    95,
    240,
    4,
    0,
    0,
    0,
    13,
    85,
    170,
    170,
    175,
    248,
    2,
    0,
    0,
    0,
    6,
    138,
    85,
    85,
    87,
    252,
    1,
    0,
    0,
    0,
    7,
    85,
    170,
    170,
    189,
    254,
    0,
    128,
    0,
    0,
    3,
    170,
    85,
    85,
    224,
    255,
    0,
    0,
    124,
    0,
    3,
    85,
    170,
    254,
    0,
    127,
    128,
    0,
    255,
    0,
    1,
    170,
    255,
    128,
    0,
    63,
    128,
    0,
    255,
    128,
    0,
    223,
    0,
    0,
    0,
    31,
    192,
    0,
    15,
    192,
    0,
    240,
    0,
    0,
    0,
    31,
    224,
    0,
    3,
    192,
    0,
    192,
    0,
    15,
    254,
    15,
    224,
    0,
    3,
    224,
    0,
    96,
    0,
    27,
    3,
    255,
    240,
    0,
    1,
    224,
    0,
    96,
    0,
    16,
    192,
    5,
    248,
    0,
    1,
    224,
    0,
    48,
    0,
    16,
    60,
    2,
    248,
    0,
    11,
    224,
    0,
    48,
    254,
    16,
    3,
    197,
    124,
    0,
    5,
    192,
    0,
    56,
    1,
    248,
    0,
    63,
    254,
    0,
    10,
    128,
    0,
    56,
    0,
    28,
    0,
    3,
    255,
    129,
    5,
    64,
    0,
    24,
    0,
    6,
    0,
    0,
    0,
    126,
    10,
    160,
    0,
    28,
    0,
    3,
    128,
    0,
    0,
    0,
    5,
    64,
    0,
    31,
    0,
    0,
    224,
    0,
    0,
    0,
    2,
    160,
    0,
    31,
    0,
    0,
    60,
    0,
    0,
    0,
    0,
    0,
    0,
    19,
    0,
    0,
    7,
    128,
    0,
    0,
    0,
    0,
    0,
    16,
    0,
    0,
    1,
    192,
    0,
    0,
    0,
    0,
    0,
    16,
    0,
    0,
    0,
    112,
    0,
    0,
    0,
    0,
    0,
    16,
    0,
    0,
    15,
    255,
    255,
    255,
    128,
    0,
    0,
    16,
    0,
    127,
    240,
    0,
    0,
    0,
    126,
    0,
    0,
    0,
    15,
    192,
    0,
    0,
    0,
    0,
    1,
    192,
    0,
    32,
    240,
    0,
    0,
    0,
    0,
    0,
    0,
    63,
    128,
    127,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    127,
    128
  ]) };

  // js/ui/samples.js
  var SAMPLES = [{ "name": "Sphere", "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABEREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREREQQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgAkCBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAQAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAEQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAIIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABEAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAAAAIAAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgiAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgIIgICAgICAgICAgICAgICAgICAgICCAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAACQCAAEBAQEBAQEBAQEBAQEBAQEBAQEKilUqAgICAgICAgICAgICAgICAgICAgICAgIAgBAAAAAAAAAAAAAAAAAAAAAAAAAABEBBCUqgAAAAAAAAAAAAAAAAAAAAAAAAAAAAABIAAACEBAQEBAQEBAQEBAQEBAQEBARBFRRSIS0ICAgICAgICAgICAgICAgICAgICAgIAABAEgAQEBAQEBAQEBAQEBAQEBAQEBQAQQCUktAgICAgICAgICAgICAgICAgICAgICAAAgCAAEAAAAAAAAAAAAAAAAAAAABCgJISVQRJKwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAgAQAEBAQEBAQEBAQEBAQEBAQQgAAEAAUqSUoICAgICAgICAgICAgICAgICAgICAEQAIAAEAAQEBAQEBAQEBAQEBAQEEACRECSoIElKoAgICAgICAgICAgICAgICAgICAgAAACAEQAIAAAAAAAAAAAAAAAAAAAAgAACAAKKlKqsAAAAAAAAAAAAAAAAAAAAAAAAABAACABAACAgEBAQEBAQEBAQEBAQEIACAEBKkERCElUAICAgICAgICAgICAgICAgICAgACEgAQAQgIBAAAAAAAAAAAAAAAACBAAECAAFESlJUsCAAAAAAAAAAAAAAAAAAAAAAABAgAAEAAAAAQCAgICAgICAgICAgIAAAAABEJBIhKqVUgEBAQEBAQEBAQEBAQEBAQEBAQAAARACAAAEAAICAgICAgICAgICEAAAAAACBIRSJFVcAAQEBAQEBAQEBAQEBAQEBAQEAAQAAAhEBAACCAgICAgICAgICAgAAAAAIEBAIglKpVMEEBAQEBAQEBAQEBAQEBAQEBAAAEQAAABAQAgAAAAAAAAAAAAAAAAAAAABCBURUiEqrMAAAAAAAAAAAAAAAAAAAAAAAAggAACAAAAAIAAAAAAAAAAAAAAgAAAAAAABAEQJVJJTYEAAAAAAAAAAAAAAAAAAAAAAIAEARAAIAgiAIEBAQEBAQEBAQIAAAAAAAABEEVAKqqqoAICAgICAgICAgICAgICAgICAAAEAESCIAAACBAQEBAQEBAQEAAAAAAAAEQFEBVElVVwCCAgICAgICAgICAgICAgICACIEAAAAAAgAQAAAAAAAAAAAAAAAAAAAAIAEAFSSpJKpwgAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAECAAgICAgICAgIAAAAAAAAAQElAkkVSq5gABAQEBAQEBAQEBAQEBAQEAAAIASAgIQAkAAIgEBAQEBAQEAAAAAAAAAIJABREkkqqbgEQICAgICAgICAgICAgICAiACBEAIEAEIACAAAAAAAAAAAAAAAAAAAAAAAlQhJJKqqrBAAAAAAAAAAAAAAAAAAAAAAEgAAAAAAAAAAQAIBAQEBAQEAAAAAAAAAAAIARSSVUqtWAAACAgICAgICAgICAgICAgAAAAAAEBAIAiACIAgEBAQEBAAAAAAAAAABICQgiUkqVWsABBAICAgICAgICAgICAgIBAAIgEgAQQAQAAAAIBAAAAAAAAAAAAAAABAIgRUiJJVVWoEQQCAAAAAAAAAAAAAAAAAgAAAJAIEAAEACEAEAABAQEBAAAAAAAAAAAAAUQEiSpVVt5AAAACAgICAgICAgICAgIAARAAAAAAAhAEAAiABAAEBAQAAAAAAAAAAAhIEVEkpSqqqwAACAAICAgICAgICAgICAAAARAAAIAgABAEAAAQCAAAAAAAAAAAAAAAIQEECJKSpVV2gBBAEAAAAAAAAAAAAAAAEEAAAQBCAIAAABAgAIAgIBAQAAAAAAAAAAAACEFFKSlUqqvCQQBAQCAgICAgICAgICABAIQACQAEAICAgAASAACAQACAAAAAAAAAAAAhFCCElJKttqAAAAEAgAAAAAAAAAAAAEACAAQAABACCAAAAkAAgAEAggAAAAAAAAABBIABFSpFVVVbcAACAAIBAQEBAQEBAQEBAAAAQCAIAAgACAEIAAQABAAIAAAAAAAAAAAACVRAkSpKqq24BAgECAAEBAQEBAQEBAQEABAAAACAIAAgCAAAEAQAAgAAAAAAAAAAABAAARUkpSqq1WwgIBAABBAQEBAQEBAQEABAAQEAgACAEQCAIACAAEAIIAAAAAAAAAAAASSQQhJRVVVttgAAQAAQAAAAAAAAAAAAAA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ARAAIAAAggRAABAAgAAgAAAAAAAAAAAJAhRUpIilVVWt13rf/wAECAAgQAAAQIAABAAAAQgCAAIIAAAAQAIAUQAAAAAAAAACBEBIgQgSVVSqqqq1r7ttAIAAAQQBBAAEAAAAAAgAAIAICAAAAAIAIASEAAAAAAAAAAAQCQBUUqUiJVVVW1717/+AACBIAAgAEAAIIQACAEAAACCAABECEACAACAAAAAAAAAAAEEgJQEEkJVVSqrV6179t4gQgAAAIBABEACAEEgABCAIAAAQQBAAAgAQiIgAAAAAAAARAASAVKklUpJVVq6t67f+gEABAAEAAEAAIAQBACIAAgCAAEAAAEAQBEAgAAAAAAAAAEAEQCoCEJIpVVVVara+/3eBAAAAkACBAACAAAAAAACAIAIiAQBAAQAAAQRAAAAAAAAAABASAVClKUSVVVW122ut/8ACCAgAAAAEIgIARAAAIgAAAAAABAEEABAAoQEAAAAAAAIEgQCkChJEqlKqrVat3v/awAAgIAAiCAAAACAAAACACIIQAAAABAAAgAIICAAAAAAAAAAESglBSJJKqlVVW3b33v/CCACABIAAAIAAAgAkEgAAAAAIECAAACQBEKBAAAAAAAAQQEAAoColKSVKqqttra1330AAAAEgACBCABAAAIAAAAAAASCCASAQAAABBQAQAAAAAEAJElIKgRCFUlVVWqrbf/71wCCAAAAAgQgEQQgkAAAIhBCEAAAAAEEACAJQCIAAAAABAgAAAIAqSlSVUqqrbW7Vt//ggAQEAAgAAAAAIAAAAAAQQBAAABABAABAQABAAIAAAAQASIlKKoSlKlKVVW1Xtf//b2IAEEACIAAAEAAAgAQRAAAAAAIQgAgAEQACpQICAAAAIAACIACAURCRSlVVVbrfVVv94AIAACAACABABAAAIAARAAIAEAACQABAAQIIEAgCAAIAEiAFKiqKSkqpVSqq1Wr//2/gAAAAgAEAiAEgAASAAAABAACAAgAACQAECKCAQAgQiACAhJAAgCElUiVSqtauvatt/sAQQRIAgAAAAACIIAAIQBAQRABACABAABACCAkAAAAAJAQAAqoqlJEpVUqqqtXX///b8IAEAAQIIgEEAAEAACAAQAAAAQAgBAAEQASiQACAAgCAICSoAIRJKkVKVVVbdu1Vu3+wAQAAAAAAEBACAAAEAAQAAQAIBABAAAAAIggQJACIEAECAAEqKSSEqlVVVtWbW//v+/AAAAAQAIAAACAIAiABAAJECEAAAAAIQACEooSAJABACBCVJECCSSpJUqqqtu2+rX/e8QgQREBCAIBAACAQAAAQAAAAABBCAkACAgIQIAEAIAJAggABFSkkoSUqqrVatuv/+vvQAAAAAAAIAgCAAEAACACQAAEAQAAQAQggBISCJACCCAQQUqhARJIVVKVVVtWrXVbf3/AAgQABCAAIAgSBAAQAAAAAQAQBAAAAAAACURCAJABAQIIABRUSJNSSlKqqrt3v//v+0EQECAQAACAAAAABIACEAREEEAAIgAQAAASEBAiAEQISEJSgQKSSIlVVVVVqtrVbb2vwAAAAgABCABAAAAAAIgAEAAAAAAACIACIkiiggAJAEEBEAQqVEklKqqqqtrXb3////7AAEAAAAQAAQCAQCAAAEEAAAACIIAgAJAABQggkkARBBAFUICCJJKkkqqrVrq11a3be8RCAQhBIAAEAggIgAAAAAAgQgACAIACAAAQoooACEAQRKAEVClJSFJKVVVa19t/f3/vwAAAAAQAIkAIAAACIAAEAQIAIAAIAAgACBUIIEkiCQIACSICkiQmlVVVVWtabtX39v7AAAQgAAAAAAABAAAARBAgAAABEAACQAEgiEIEAACASJVESVRJSVFKqqqqqtW3f73f28AQQAEAAQAAICAECAAAQAAAEQQAAAAACAASlKFUkiQAABEAAiQlKlJVVVa2vtvW9/3/gkEAABAkCBEAACBAIAAABCCAAAEiIABAACRAFAAAAVVSRFVUkpKJKqSqqtXTdr/fd73gAACEAQAAgAEEAACAEQCABAAQBAAAAgACEpVBJVSUAAQRAiJIqFVJVVVbWq3d9X3f78AACAAAACAAAAAAAABAAgCAAEBAAASQAIgJIBAAACCSUURUiSUFSSqVVVVtu29f9/29wAQAAEAAAAIQEIQIAAAICAAJAAABEAAEABRKiqklBACEEQEkkKpUqlVVVarW2ve/d/9EQEBBBBECEABAAIAIACAAAIABACQAACAAEoRAAgBRVBFEVEklJSKlVVVtV2233f3/bcAAAggAQAAAAgAQAQAEgAAkAAAIgAABAACJKSqoqgQChBEJJEqQlVVVVarau+1/b93/wAEAAAAAEEBAAAAEAEAARIAACAAAAIgASBSQgAIAoVBRSlJJIFaqSqqqrW3Wv9f+9+9AiAgAEQBAAQAEgCAgAAAAABIgIABEAAIACkUqqJQIBQQgiRKWkUlUqqq1trvVfbffe8IAACBABAEEBBACAAAAAgAAQACAAQAAEAARKEACIUVQUQpEpElKKqqqrVarbX/3/v3/wAAAggAAAAAAQAgAACRAEAIAAAJIAAEAAhVFFVCIIAUKUShJJFVVJVVVqt23q19399tAASAAACAEAAAAAAIIgABAiAACAAAAkAAgSiiiCiKVUKCIhSSSkqSqqqq3at3+/f9/f8AkAgAEARAQIgBASCAACAAAAkAAABIAAgARRRFRCEAKFSUoklVJKqqqtaq3dqvv2932wgAAACAAAACAAgAAAACAAgAQABAAgACQAA0oigSlFUFAkJJJSKqlVVVWu1rb/33/d9/AAAASAIgAQAAQBAAABAEAAIAIQRIABAAJEpJQqBCAlCpKSSUlJJVVVVrV726t323//cAAEEAAAEECAIAAAIAgABAkAAAAAAAQAEAUSSUSpFUihIUkqJVVVKqq1Vq1u/v3/923gSJBAAQABAAIACCQAAAQAAABAQAABEABAAqkkKEJCEhSKJKVUkqqqqtW11ttX323f/+IAAAAkBEAAAABAAAQAECBAAgQBEAQACAACpVKFKJSkolFKSJJKSqqqqtt7d/23//23YAAAAIAQAAIQBACAgCCAAQAQAAABEAAgAREpCVCFIhJJCiElSqlVVVVdVa29V/7u3//gAQECAAAECACQAgAAAgCABEAACAAAAIEEAqSkJSiUoSSklVJVVVSqq2bettf+37/222AgBAgAAAAgAgAIBBAAAAQAACEAIAAiABAClVKSREJKSlKpFSSVU1VVW2rburf7+3//4QAQAAEBIABAAIAAAAAEAAAAgACAgIAAAAFSKUkqlJEhCRSkqlKqqq2qrbbv/b7v3d2ABEAgECQBAAAAABBAECAQIgQEIgIEAABAQVVEJJBJJJSqQpKSqlVVVW2223rX777/f8AAAABAAAABCAgAQAIBAEAAIAAAAAAAEgAEqSqqSqSSSklaVVVVVVVttttu3777++32wCAAAQAABBAAgEQAAAAAAIAAAAAAEAiAAgFKpREiEkkipIVKSqqqqrVVbbu1+99/v9/EgAIEAgAQAAABAAIQBAIAAQAgiBAAIAAAEVSSpJVJJVRSaSlUlVVVqra27e9v/e77/cACQEAAREAAIAQAAAAQEAQIAgIAQQEAACAAqlRSoKSSJQqUpVKqqq1XW9tbe/7f++93gAAAAAAAAESCIAIgQAAAEAAQAAAABAARAIClSopWUklSqUqVKqlVVWrtbe+ut/dvv98AAAgAIgAAAAAAEAECAEBAQAAQAgAgAkAEAKqpVQkKqolUpVSqqqq2tVW2uv/+3f77fYRIACQACAIAAAAABAABAQABAIAgBAAIAAAIqlSipKkkVIpUqqqqqtWu21vftdv/u//3gACBAAAgiBAIQQBAABAAAAQCAIAgACAAIABVSlRVVJKlUpKSpVVVVVVt7Wr/f7v/278AAAQAiAAAAQAEAgAIAAQCEBACAICCAASAQFVSkqSKVRSqVVVVVVatt7a3v632/27+/QgAEAAAgABAAQAQACAAEAgAAAgEAAgAEAIAVVVKklFJUklUqqqqtWrard3q/9/t+9vvAJIACAACIAAgAAAIgAiAIABAAAAAAAEAAAQqqlSqqqSqpUqVVVVVrVXba3/bf7/v/74AAAAgIAACBAAQQCAAIAAAQAEAAAQgRAAAEDVJUpUlKpUqqqqqqta27ra+1v/2+77e+gQAQICCEAAABAEBAAAAAQAEBBBAQIAAACBAKqqqUpSlSVUpVSqrWtVV2+u/tt/v+/fuEAACAAAAQCCAQAQABAAIAQAQAAkAAQAiBAAVVUqpUpSqqVVU1VVVW7ttXvX//b7fv3wARAgAAEEAgAAAAAIgAkAIAIABAAAAAAAAARqqqpUqVVSVVVVVWqttVrf3v23v+/77/AAAAAQIAAQAEAQACAAIACAQACAACAgSACAAC1VVVKqqSqqqqqqrbart3Vrt/37vt++wAQCAAEAEAAQBACBAAAAAgAAAgAABAAARARAKqqlSpVKqpVVVVWq1W1tr77+3777/fvhIAgBAAIAQAEAQAgAEAAQAQgQCJEAAgEAAAE1VVSqqlVVVKqqrVatttt676/27/+332AAQCAICAABAAACAAJAgQAEAIAAAACIAAAQCBaqqqqlVKSqqqrVatbbbd+6+3/7tv99wAAAACAgIQQIEQAACAAIABAAACAAEAAgAIBAGtVVVVVTVVVVVVa2u227au//73//7ffAAgCEAIAAAAAAACCAAAAAgAIAgAIAAAISAQALVVVUqqqqqqqrWttVtu7/va297be/3wIgBAAAAAAAIIAQggAAACQAIAgCSAIQAAAAAA1aqqqqlVVVVVqrVbarW6r3/////f79gAAgAIIBCEAABAAAACBBAACAIAAAIAEQAAQCBWqqqqpqqqqqqtVtbd3u/773bbbf2+8AAIAQCAABBIIAAgARAAQABAAAAAAAQACAEAhGq1VVVZVVVVWtbau2t3dV773///t/vwiIAEAACCAAABBACAAAAABABIEQAIAAAAiAIANtVVVUqqqq2rW2tVttrf979+7bv/b6AAABAQAgAAAAAAAAgAAQEQAAAAEQBAIEAAAAArVqqqtVVVarVqre7dt7bd7fu/723+4AAAgAEACAEBCBCEAEIEAAACAEAAAAECAgAIAB1a1VVVVVaq1q1qtWvd+/+/7/u///fAgiQAABAARBAAAAAAAAAIAJABAQAhCAAAAIARFaqtVVWqtVaq1bdbvraurfu+7/t3X8IIAACEACAAACCAEEIIAABAACAECAAAABAkAEAO21W2qrWq2ra22u3V////7/v+79/9AAAABAABAAAAgAIAAAAAQAQAAAAAgAAQgAABAAttaqrWqq1rW1tttr6qtdt+37u+/feAAABAEAQCEEQACAEIIIQCAAEEACAEIIABABAABbW21Vqta1Wq7Vbb1f//f+/97/v3fwAgkQAAkAABAAIgIAAAAAAARABAAAACAgAAgASDVqtbatWqrW1V221/Va32+2++77/aCIIAAIAACEAACAAAAIAAECEAEAkCEIAACBIAAAPa2qqrWrbWt26226v/f9+//vv++/4AAAAIAgAgAAAgAAIgBAJAgAAAAAAAAAAgQAIgCLdtbVVrWrtatdtu/Vb2/vd3/7vvbAAAAAAIAIAEEQABCAIACAAAAEEAEEAIIIAACAAg7Va1u1WrVevbbduv/9/v/f7d77/4EAgSQCAIAAAAAEQAAACAAAQRAABAAgCEAAAAAgC269bVutrtNW23ffVre3u32/f/+3gBIEACACABIIABAAAAIAAEAEAAJAEAIAACAIAQAHtdW1rOrbbett2uv//v7/9/v3bv0EAAAAAAAAQABBAAIJACABBAAAQAAAAAAAAkAIAALeqtbXXWq2vbdvfVrb9+3fb9377gAAEAEAEBEAIAQAACAQACQAIAEAAEEIIAIAASAEQ2t/W3Vrt9tW3buv//+/v33+/9++AEAAEAiAAAABAAEQAACAAACASAQRAAABEBAAABAB/am1W61abet27fWtt/b3//vu/vgIBECAAAEAAQAAIACAAAAAEAEAAEAAIAAAQAgAgACrbt7Vdu22vdu+v//+3/7tr7vv6CAAAABAAAQIBBAAAgCEAIAABAAQAAQBCAABAAIAIH3ba37bW9vXbuvtbbv9u//+/7uwACAEAgIQICAQAQRABBAQCIIAAEAAEAAAQgAAiAEELu21q23tbXu7vt//77fvtvvu/uCBAQAQAACAAAAAAAAAAEAAACAEAIRAQCAAACIABAAbdt7atre3re7r9tt+/77/37/vwAAAEEAIQgCAgEAQCCAAAAAIACACAAAEAQgRAAAQAB+7tbfbbX12u79///v9++37+73ABAQAACAAAgABBEAggIEAQgABAAAAAAAAAEAAAEAAjd7u7W3bq9/u99tt36/vv29u/4IQEAEBAAAABAgAAQACBAAAIIQBEAiCEIQAAAAiACQHdbu7u33+9Xvdf//9/b/7///tAAAAIAAACBAAIAAAAAAAAAgAAAAAIABAACEAJAAAgAPf3d3e1qtfr3/tu2/3+2+7e74AQEAACAJAQCAAEAACCBAQAAAQCACACAAAAASAAAAAAXV27uv7/fX97f///b9v/v/f+AgAAQIAEAAAgQBBECAAAABAhAAgQgAgACEAAACIEABA/993fV6vb2+/btu3+/737ftoAAIACCCAAQIAAQACACBAgAAAQIAAAQAEgAggAACCBABt9buv6/X9+/f7/v9vu9+/b/AggAgAAAAEAAAQAAAAgAAABAAAAAgEAIAEAIAEAAAgBD9f3fV+36++3t+37f7//ff+4IAIIEACAIAICEACIBABAgggIgQCABACAAAgAiAgAAAQG/r3X9e7e+///v+/2+7fvveAAgAAAIAIAAABAAgAgAAIAIAAAAAgQAgIAAAAAAIQAQAPv732/e/++3bv+/7/u/b734AAAIAECCAQQEACIAICCAAgAIAgQAAAIABAgggAgAEEAAL277+3fa+/37uu6+7/f+/8BAAgAhAAAEEBAAAACAAgIAACAQEEAgCAIQQAIAQAQBABAf/77f3v++39/v+/v+/tvtwASAIAQAABAAQACACAAACAAAAIAABAAgAAAAAAkAgAACAA277/X73+/3fv+/77vb/78AAAgAgAIQAAAAkAAAAQgAEAEAAEAAAQAIAAEIAAAARAACB+97f2/1vb/32/b+7/+9+wEQAAIACAEAIAAACIAEAAABBAABARBEACABBAAAAggACEADf+/f/t//+37+37v+3ffuBAAAgAAgAACCAgIABEAgQIAACIgAAAAAgEQQAEAIAAAgAED7fvW7/u3f2+/+/7v333gAAIIICIBEIgAgACAQAAAEBAAgAAQBAAQAAAAhBEABAIAIAG/7//+7/33/vdvt/7998BACEAAgAAAAAAAQAQAAAgAAAAAAAAAAIAEAAAAAACASACAAHt+3bv+397b/f7/b/ffAAEgAAAAAAAABAEAAACIAEBAEACBASBEABAhAgAAAgAABAIgP+//77v3e/+33+37f3wBAAAAQgARAiBAJAQgBAEAAQACCAgEAAAAgAAIEEQQCAAQAAALe23+77//7v97v9/d8AAIAAIACIAQAQAAAACAACIEAgAgACACAAgAACABAEAAgAAIBAf//3f++26/7/77fffwCAABEAAAAAAAAQAAggAgAAAAAAAgAAAQgAEIAAAAACAEQCAQAbbv37vv+/u92+/3v0CAIIQACEACAAgIACIAEIAAIAgggQCAIAAABACARAEAgBAAgIBAf7t9/77v7v9/v7/9AACAAAAgAhAhIAAQgAAAAggAIAQAAgEBAgSQAAEAEAICAAIAAAAb//e2+/9/7ff7+2wCAgAQAgAAAAAAQAAAEAIAQIEAAAQABAQIEAAiBAAACAAACAABAAd3vv/vu/e/3u7f8AAQAgBIARAABAEBAgABCAgABAAAABAAAAAAAAAAAIAgAEEgBAgIAf3/777vffv/v/uAEAAAAAAAAIIQAAQICIAgAAAAAABAQCAAIAAAgCAQBIAQBAAAQACAX9u9///f33b7vgBAQBBCAEQACAAgACAABAAgCCAEEgEAgEAAgIQAgAAAAAEAACAAIAAN/v93e3t93+/oAAEAgAAAAAQAQAIQACAAAAEggCAACAABCQAIAAgBAiAAgAAAgQCACANv7f3v//f9vuAIAAIBACIAQCABAAAAAEABAAABAAAAAgQABAAQAAQIAAIEEAgABAIgAHu/373bv3f/AECAAAAIgBAAAAAIAIECARAEAAQAAEAIAAAQIEBAAAACEAAAgAQQAABAD/t3//77/+gAAAgQCAAAAQIBCABCBAAIABACAAISAEAQAAABAAJAIAgAEAIAAAAAAQAA3/3bb++2gAEAAIAgIACACAgAQAAAEAAAQBAgEAAEAAAiAIABAAAAgAAAgASAACEAAgAG73/7vvAABAQgAQCACAAAIAABABAAQCIAQABAAAAAQIBAAAAICQAAQQAIEBCBBAgIAAA/9t/6AAAQEAAAAAJACEAAIgQIAAEAgAAAAQAAIAIAAAQICAAABAAEAgAAAAgAAAAgAAAAgAAAAkAAghAAAAAgAICAEACAhAQAAgEIACSBIAIAAACAIEAQJAAQAEAAAAAgQAIAAAAAAAAgAAAAAAgAAgAEAAAAAAIAAAAgBAACAAAACAkAQACBAAAAIAAhAEIgAAEAgCAAAAAAAgAAgABCQSIAARAEAIAiCBAACQAgAAgAAABAABECBAACAICAQAACAACRAAIAAiAAAAIgAAAIEAAAABAEABAIAIAAACBAAIAggAAICQAgAAAQAAggAAEBAAAAAgAECAQAARJIiAASIgCBAAAAAJAAACAEAAAAggAEAAIACIEgAAAAAAAIAAIEBAAIEAiAABAAAEAAAAAAAQAAAAAECAiCAAEAgCAAQEIAABABAAAAAAACAQgQgCCAABAABACAQAgCACAQBEQAAAAQAAAiBBAggAAARAABAAkEAAAEQAQICAAAAAgIIEABAACAACAAIAEAABAAAEAAAAABAIAAQIAAAAAACAAAEAAAIAAACEAAIAAgIhAAgCAAAAgAEggAgCAAAABAQCEBAQAASIgSAJEEACAAgAIgBAACBAIAABAAAACAAAAAAiIAAAECIAIAAIABAIIQBAEAAAQAEQEAAAACAAAAAIACIABAEEAgEAARAQEBAgBBAABAAACAAAAACAAACAQCAAAQBAEAEAAAEAAAAAgAAAkCCAAAAACBAAAAAIAAIAgIAQQCAAAAEAEgCABAICAAAAAAQgAQAAhACEAAARCAIAAQQAgAEAACAgAAAICIAAgAAAAEAAgSAIQABAIgAQABAiEQEAgAAIAIAAAAAIAIAAiACQEAAAEACSAQAASCAgAAQAQgIBAAIAAIAAIQAACIAIAAAAAAIABAAABBAEEEBIAAAAAgAAAgEAEgAAAIEAgIABIAgACAAAgAACAQQAAAAAACBAAAAIEAhAQAQAABAAAAAARAAIAEAgBACAAAgCCAAAAEgAAAAgEAIAAAgAAAQCIAAAgAEQRCBAAAAAQCBAgEABABIAIEAEAIAQBAAAgBAAAAACAABAiAAACAgBABAQgAgCIggABAEAAAAgAQQAAQAAAhACQACBABACAEAQABAAgAAIBAAAAgIAgEIgAEAAAEAAIAAAIAEAAAABAIEQAAIAAgEAAAgACAAAQAgEAEAIgAIAIEEQQACIAAABAAABACBCABCACAAABBAEAQACAAAQIAgABABAIAAgBAIAgAAAACACIACCAAAIRAAIAgQAAEAAggAAQACAIIEQAEAQEAgAAECAQBAgCAIAAQAACAAAAAIAgAAABAAAAAAAACAgAAEBBA" }, { "name": "Torus", "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAiSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQQRCEIQhCEIQhCEIQhCEIQhCEIQhCEIQhCEIQhCEIQhCEIQhCEIQhCEIQhCEIQhCEIQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIBEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEQhCEIQhCEIQhCEIQhCEIQhCEIQhCEIQhCEIQhCEIQhCEIQhCEIQhCEIQhCEIQhCAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACBAAAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAAAAARAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAiAAIIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAEQRBEEQRBEEQRBEEQRBEEQRBEEQRBEEQRBEEQRBEEQRBEEQRBEEQRBEEQRBEAAAAAARAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAQABEAAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAAAEAgQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAACAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIEAAgAAAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCAIAgCBAQAAAAiCIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAAAECAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAgAAAAAAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAgAACAAEAgAgIAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAAICAAAABAIgCAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAAAAAAIAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAAAIAAgAgBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEEQIAAAAiCIQAIAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAAAABACIAAAAAAQAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAIAAAAAEAAAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBAEAQBEAgIAAAAQRCACAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQECIEAAAARAAAAAAAAAAAAAAAAAAFVVWgAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAIAAgAAAAEAAAIBAEAQBAEAQBAEAaqgCAiq1CAQBAEAQBAEAQBAEAQBAEAQBAEAQAAAgAEAAAAAAAAACAQBAEAQBAEAQBFUAAqiogQqmEAQBAEAQBAEAQBAEAQBAEAQBAEAIEIAAAAAABAIBAAAEBAEAQBAEAQBQACRAAAAoQFGoQBAEAQBAEAQBAEAQBAEAQBAEACAAAAIAACAgQAQAEAAAAAAAAAAAAgSRABAEigIqCkVAAAAAAAAAAAAAAAAAAAAAAAAAAAACCAIIgQAAAAiAAAAAAAAAAABQkAACAkAAiICgKrcAAAAAAAAAAAAAAAAAAAAAAAAAAAAgCCAAAAAgAAAgAAAAAAAABQIABCBACEAgEgqACLAAAAAAAAAAAAAAAAAAAAAAAQAEAAAAAAAACIAAAAAhEREREREgCAEgAAQhCQJAQCqlTiIiIiIiIiIiIiIiIiIiIiIgAABAAAAAAAIgACABAQAAAAAAAghABACEAAAACAQSQEghoAAAAAAAAAAAAAAAAAAAAAAIAAQAQAAIQAAAgAgAAAAAAAAQQQAgAABAgAAgEQAKEpSsAAAAAAAAAAAAAAAAAAAAACAQAEAAAQAAAAIBIAQAAAAAAIAAAIACAAQESQEASSCBSlOAAAAAAAAAAAAAAAAAAAAEAAAAAgJEAAAAAAAAAARCEIQkCQQAAAgRABAABEQABFQhKLCEIQhCEIQhCEIQhCEIQhAAAIAAAAABCIEQAAAgAAAAAAEgAAQAQAAQQCCQAIlBARSGVgAAAAAAAAAAAAAAAAAAAAAACAAQABAABAAEAAAgAAAApAAAAAEAAAEBBAAiABQkQlFVgAAAAAAAAAAAAAAAAAAAQAQAiAAAAAAAAAAAgAAAQBQAABAQBABEQAQAAggkQIERFJVwBAEAQBAEAQBAEAQBAAACAAAAAAAAAAAAQBABAIgCAAAAAAAQAgAEEEkggAECFERCSpxAIAgCAIAgCAIAgCAIgQAAAABAiIBCEAIAQAACAABCQACAQEAIARBAAAgRJBBAERUkUwAAAAAAAAAAAAAAAAAIABBEAAIABAAAIAEABAAAARAEIgAAACAkAQIhIQAAQgUEQJKqwAAAAAAAAAAAAAAAAAAAAAACAAAAAACABAEACAEUAAAAAQEAgIBECIQESSQIQFEUSUqwhEEQRBEEQRBEEQRAAAgAACAAAAAAAAAAAAAAAAAAAAAABAQCCABAEIAAASESBEKSKqwAAAAAAAAAAAAAAAIAAAEAAAgCICIiACAAECAIQIIAAAQAEBAhKRJCKSVIAACQECSlVwAEAQBAEAQBAEAQACBAAAEAIBABAAACAAQAACEICAAAEBBBAQQAAAgAAAJKSgKKiRJVQAAAAAAAAAAAAAAAAgAIEAEAQAAAAAAAEACAAAAAEIhAQQBIIKVVQqVUkAAASCAiSVXhAAQBAEAQBAEAQBAAAAAACAAAAAAACACAAACCIAAAAAAACQKKCAAoCAAlUqkCRRElKlgAIAgCAIAgCAIAgAACAAAAAAAIAhAgCABEABABAAAAAghAKCCiqoKiqoAAAFAQiJKSrhCAAAAAAAAAAAABEAgAgIAAAIAgAIAgAAAEAAAAAAIgQhSCCggAUAgAKSpKBURESEq1AAAAAAAAAAAAAAAAIAgEAAQCAIAAAAAAAACSAAAESAEIgSihUqqKpVUCAACQARIlVVfAAEAQBAEAQBAEAACA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CAACEQEAICABAABEAAhAgAEIEAAQAAAAAAAAAABCAAAAAAQAAEAQgACCAAAEAAAAAAQAAAgAAAEBAAAAgAAAAAIABAAAgAEQAAAAAAAARAAAEQAAIAABAEAACAgCAAAAAAABEAARAAAIAAAAAAAIABEAAAQQAAAAAAEQgAAACEQAAAIAEAIAARAAAAAAAAAAIACIAAAAAEAAAAAEAACIAgAAAAEAAEAAAAiAAAAIhCEAAAAAQAABAAAAAAEACIAAACIAEACCIAAIAAAgQAAAAgAIAIAAEAgAABCIAAAAAAAAAAAAACIAAAAIAEQAAAEAAEAIAABAAAgAAAAAEIIAIAggAEAACIAAACAAAABABEAAAAAAAQAQgABEAAACAAAIAAAEACAAAQAAAAIgAABAAAEAIIAAAAgABAAAAABAAAAABERAEAQgAQAABABEACAABEAEABABAAAEARAAAAABBAAAAAAAAAIAIAAAQEACAQABARAAAAEAgAAIAAAAAAAgAAAgABAQgAQAiEAAAQAQAAgAAAAEAQAAEAAAIAACAQAgAQgAAAAAAAAAACAAACAAAACAAIAAQAAAEAAAAAAAAIACABABACAEAAEAAQCAgAAACAAAAAQAAAAEAAAEAAQIgCAAAAAiAAAAAABAAAAABAAQAAgAAAQIgAAACAAQAAAIAAQAAAAAAACIECAEERAAIEAAgiECAgAABAACAAACAAAQAAAAgAAAQAAAEARAAEAAAACIAAAECCAQAgCBABAAAAAAAAAAAAAAAAEQAIgCABAEREAkAAAAEIAAAABAEAABAAQEAAAgACAgAEAgAAAAAAAAAQAAAgAAEAAAAAAAAAgAABAAAABCCAAAAgAAAAAAACAAIAAgAABCAAABAAAAAAAAQACIAAAIAAAAEBAIACIAAACAAAAAAAAgAAAAAEQEAAAAAAEAIAAAAAAAAIAAAAIAAQABAAACCIAAhAAAgIAAgAAgBAAAAACAAABEAAgIACAAgAIAAAAAAQIBAACABACAIAQIAAQIAAggAAgAQIAAAAAAAIAgAQAQAAAAAAAEQAAAAAIBEAQIAICAEBAAAgAAAAQAECASAAAAIAAAAAACAAAAiAAQAAAEAQEQBCIAAAAAIAAAQAQAECAAAAQAAAiIBAAEAAAAAAAAAECAAABAAAAEAgIAAEAAABAQAAAAAAIAAAAAiIAAAAAAAAgCAAAAAAAAIAAAAIAAACABBAAAIgBEAAAQEAAIAAEAAAAAARAAIBAQAAAAAgAAAEAAQAAAAEAAAAAAQBCIAABAAEQAAAEAAQAgAEAAAIABBAIAAAQAAAAAAAACAAAACCACAAAAEAACAiAAAAEAQAABAQABAAAAiAAAAAAgAAACAAAACAAAgBAAiAAAARAIAAgAAEAAggCAEJAAAIAiBAEAAAQQAQAAAAAAAAgAAgAAABABAAAAIEQAAAAAgQAAACBBAACBAAAIAAAAAAACCIAQBAAAIAAACAAACAAAAAIAAgCAgAAIIAABAABAQAAECAAAAAQAIAAABAAEAIAAAAAAAAAAAEIAAAQAABEAAAiACBAAAggACAAAQAAACAECAAAACAAAAAAAAAQQABAAAAARAAAAAAACAAAAEAAIgABAgABAAAAQAAAAAAEAAAAAAAAEAAAAQQAACAAIAEAAAAgEAIAQAAEAEAAAAAiAAEAAAQQAAgAAQEAAAEAhBAIgAEAAACAQAAAEAiAgggAQACBAIABEAAAECABAEAAAgAAiAAAgAAAQAAEEAAAEAIAAAAIIAQgAAABEAAAIAAAAAEAAAQAAIAAAAJAgEQBACIgAAAAAAQAAAgAARAAABEAAAAAAAAAAABEAQAAIAAABAAAhAAAAAACAAACAAAAAAAAgAAAAAAAIAAAQAAEAAABAAAQAIAgAIAAAQAAAAACAAAAACAAAAQABAAAABAQAAAAAAIAAAgIAAiACAEAACAAAAQAAEAIAIEAAiAEAAQEAAABACAAgAACICAAAARAgAAAAQAIAAABAECAQAAAiACCAAAIgAAIAAAEAAgAARAAIAAAACACABAAAAgAACAgAAIAAAIEAAAQAIgAAAgAACAAAAgAAEAABEAAQAAAAAAAAACAAEBAAAgAgAIgAAABAAAgAAAAiBAIgEAEAAAAAAAAgAAAAAAiAAAQAAEAIAAAEAAACAAgAAQAIAAAAAEAAIQAggAAAIQAAAABAAAAEQAAAAQAAAQAAIAAEEAAgAEABECAiAAAAAAAAAQACAIAAAACAAAAACACAAAAAAQAIAAABAEIgABAIAAiAABBAAAEAAAQAgAAQEAAAggAQAAgACAEEEAAAgACABAAAAAgEACAAIAARAAAAgQAQIAAAgAABAAEAQAAAAACAAQAAAAAAAAQAhAAAAAIAAgCAAAAgICAAgAiABAAAAAAAAAEAAAQAABAAAAEAAACAAABEEAgIgCBAIAAAAEAACAIgAAAEEQIAAAAAQABAAAAEBAAAAAAAgAAAQAQEAAAEAAEAAAAAAAAAgQAAAAAAAQiAAAACAABAAACAAgAAAQAACIBAACEAAAIAAAEAEBAEACAEBAgCAAEAAAIAAAAgEBAAAAAAAAgIIAAAAAAIAAAAABAAAAAIAAgBEAACIAAAABACACAAAAgAAAAACAABAAIAAQAAAAgAIACAAAAAAEACAAgAgQAAACAAAAQACEAAAQAAAAgAABAAgAAgEAggAAQCAACABAAAIBEAAAAAEIgCAAAEQAIAABABAIQAQAAAAAAAAEAAAACAAAAAEQAA" }, { "name": "Cube", "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGBgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABiRgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYgBgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGIShgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABiAAhgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYgkghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGIIAghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABiCEgghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYggAgghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGIIKQgghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABiCCAQgghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYgggkIgghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGIIIQCAgghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABiCCEJAgoghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYgghCAgoAghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGIIIQBIgBIghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABiCCEEgAkgAghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYgghBASQAkgghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGIIIQQkASQAgghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABiCCEEACQAJIgghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYgghBBSASSAAoghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGIIIQQQCQABJIAghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABiCCEEEEgSSQABIghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYgghBBCAQAAJJQAghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGIIIQQQhISqSAAJIghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABiCCEEEIQEAABKSAAghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYgghBBCAJCQlAABJIghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGIIIQQQgkAgQBJJAAAghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABiCCEEEIICQQJAABJJIghgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYgghBBCCEgISBJJAAAAghgAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAD1eq3WtqpKSlJVgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADurdrXbqSqpSqYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADrbbbq2lUkqpGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD22211qqVKkrgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADtqtq7pFKlKYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADrdb22qqVKmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2u1tqVKKTgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADttbbqKVK4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADta2qmVKmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADu9XaklTgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADtWrpVJYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADbvaqlWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADVW6RTgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+tqq4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADPalOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADm6lgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADtpYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADauAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADbgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }, { "name": "Cone", "bits": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAECBAgQIECBAgQIECBAgQIECBAgQgIECBAgQIECBAgQIECBAgQIECBAgQIECAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAFCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAACYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAi4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAgQIECBAgQIECBAgQIECBAgQCgACCBAgQIECBAgQIECBAgQIECBAgQIEAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAQXABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAIS4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIACAAAIAAAAAAAAAAAAAAAAAAAAAAAAAFgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAECrAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAgAAAAAAAAAAAAAAAAAAAAAAAAABcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAACCV4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQIECBAgQIECBAgQIECBAgAAVgAAAQQQQQQhBBBCEEEEIQQQQhBBBCEAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAABCKvAgAEAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAABACsAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAgCn4AAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAABTgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAgAAAAAAAAAAAAAAAAAAAAAQCS3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAQAl8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAICJK4AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAECBAgQIECBAgQIECBAgAACvgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAEAAAAAAAAAAAAAAAAAACAFVWAAAAABAggAACCAAAIIAAAggAACCAAAAAAAAACAAQAAAAAAAAAAAAAAAAAAAAAAQRAV8AAAACAAAAAIAAAAgAAACAAAAIAAABCAAAABAgAEAAAAAAAAAAAAAAAAAAAAAACAAUt4AAAAgAAAEIAAAQgAABCAAAEIAAAQgAAAAAgAACAAAAAAAAAAAAAAAAAAAAAAAAAAKtgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAQAAAAAAACAAAAAAAAAAAAAAAAAABCBKV/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAABAQEq8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAgACJW4AAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAgQIECBAgQIECBAhAAiVvgIAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAQAAErfAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAQAAAAAAAAAAAAAAAAAEiJXcAAAAABCCAAAAQAAABAAAAEAAAAQAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAIIACSr4AAAAAAAAAACEAAAIQAAAhAAACEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIACQq9gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAEAAAUq/AAAAAIAAAAEAAEAQAAQBAABAEAAEAAABAAAEIAAAAAAAAAAAAAAAAAAAAAAAEASSKt8AAAACAAACCAAAAIAAAAgAAACAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAACAEACVd4AAAAgAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAgAAAAAAQIECBAgQIECBAkEACkq9gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAQAACAAAQAAAAAAAAAAAAAAABApdfAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAABAAAAgAAAAAAAAAAAAAAAAEQAQkUv8AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAQAAAAAAAAAAAAAAAAAgAAAkqt4ACAgAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAgAggJXegAAIAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAQAgIqVXvAAAAAACAAAAAAAAAAAAAAAAAAAAEAAAgAAAAAAAAAAAAEAAAAAAAAAAAAAAhAAAElX8AAAAAAAAAAAAQgAABCAAAEIAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAIQAISJWv4AAAAAAAAEAAEAAAAQAAABAAAAEAAAAAIAAACAAAAAAAAAAAECBAgQIECBAQACAFVXbgAAAAAQAAAACAAAAIAAAAgAAACAABAAAAQABAAAABAAAAAAEAAAAAAAAAAEAAgSAVX/AAAAAAAAAABAAAQEAABAQAAEBAAAAAAAAAAQAAAAAAAAAABAAAAAAAAAAAIgIACqVrsAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJAlV7wAAAACAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAEAAAAAAAAAAAAAAJAIABRKt/gEAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAABAAAIQqVbfAAAAQAAAQAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAABAAAAAAAAAAABBAAEIFW3sAAgEAAAAAAAAAAAAAAAAAAAAAAAQAAQAAAAAAQAAABAAAAAAAAAAAAAAAggAQAKkq/4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAABAgQIECBBIAAEUFK23gAAAAAAAAAAAAABAAAAEAAAAQAAAAAACAEAAAAAAAIAAAIAABAAAAAAAAQACAAFCq37AAAAAAAIAQAAAQAAABAAAAEAAAAAAAAAIAAAAAAAEAAACAAAAAAAAAAAAgAAISCqq38AAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAIQACECiVd34AAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAgAAIAAAQAAAIAAAAAAAAEBAABAkqt7gAAQAAAAAAAAAAAAAIAAAAgAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAFAQEARJJVu/AIAAAAgAAAAAIAAACAAAAIAAABAAAAAAAAABAAAAAAAAAABAAAAAAAAAAAAAQBJVbv0AAAAAAAAAAACAAAIAAAAgAAACAAAAIAAAAEAAAAAAAAAAAQAAAAAAAACggAACQRKr94AAAAAAAAAAAgAICAAAAIAAAAgAAAAAgAABAAAAAAAAAAAAAAAAQIECBAgAQhAUqq1fgAAAAAAAEAAIAAAAAACCAAAIIAAAAAAAAAAAABAAAAAgAAAAAAQAAAABQAAAAQISt//AAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAEAAAAAABAABEUUqqvcABAACAAAAQAAAAAAAAAAAAAAAAAAAAAIAgAAAAAAAAAAAAAAAAAAAAAkgCAQAEVK3v4AAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAABAAgICSKKqr9gAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAABAAAAAAQAAAAAEFKv7fAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAABAAAIAAQAAAAAAkAAAESKiVK/8AgAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAEAQAAAAAEAAAAAAICIAhACBVXW/YAAAAAEAAAAAAEEAAAAAAAAAAAAAAEAAAAAABAAAAEAAAAAAAAAAECAQAAAASColVu3gAAgAAAAEAAAAAAAAIAAAAgAAAAAAAIAAAAAgAAAAAAAEAAIAAAEAAESAAAACgVSrv/AAAAAAABAAAAAAACEAgAAgCAABAAAAAAAAAIABAAAAAQAAEAAAAAAAQAAQIggoiq138AAAAAAAAAAAAAACAAAAAIAAAAQAAAABAAAAAAAAAAAAAAAAAAAAAACQAEEAQIUlVt94AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAQiAAAEIJVbvegAAAAAAAAAIAIAAAAAAQQAABAgAAAAAAAAAAAAAAAAAAAAAAAAAAABQIAABCEKUqrv/AAAAAAAAAIAQAAAAAAAAAAAAAAAAAAAAgAEAAAAAAAAAAEAAAAAAAAQAAAQhESKVXv8AAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAECAAAAAAAAAIAAAoAAAEAAIlVXr24AgAAgAAAAAAAAAAAAAAAAAAAAAACCAAAAAAAAAAAAAAAAAAAAAAACIgACACSJIqrd/gAAAgAIAAAAAABAAAAAAAAAAAAAAAAAAACAAAAAAAAEABAAAAAAABCAAAgCACSVVXf7AACAAAAgAAAAAQAAAAAAAAAAAAAAAAQAAgAAAAAAAAACAAAAAAAARAARAABJASktr28AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAgAAAAEAAACJEAAEABURKrb/4AAAAAAABAAAAAAAAAQAAACAAAAAAAAAAAAAAEAAAEAAAAAAAAAAAiAAAABEgKVVXb/gAAAAAAAAAAAAABAAIAAAAgEAAAAAAAIAAAAAAAABAAAAAAAAAAEAgAAAIAAqEqrr9vAAAAAAAAAAAAIAACCACAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAQAAAQCIgFJKy6/0AEAAAAAAAAgCAAAAAAAAAAAAgAAAAAABAAACAABAAAAAACEAAAICQiAEAAIqCSptf/4CAAAAAAAAQCAAAAAAAAAIAAAAAAAAAAAAAQgAAAAAAAAAAAAACACIACAIIACkpVbVvgAAAAAAAAEAAAAAAAAABCAAAAAABBAAAAAEAAAAAAAAAAAAAAAABAABAACAkhJVW3/3AAAAAQAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAgAAAAACQAAAIAQAiRKq2/8AACAABAAAAAAAAAAAAAAAAAABAAAAIAAAAAAAAAAAAAAAAAAAgAgIiAAAEJRSqqtu3YAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAkAAAAIAAQhKrbv/gAAAQAAACAAAABAAAAAAAAAAAAAAAAAAAEAAAAAAgAAAEAAABAAQAAAAgEJIoqVVb/fAAAAAAAAAAAAAAEAAAAAAABAAAAAAAEAAAAAAEAAAAAQAAAAQAAoiAAQACAIUVKu638AAAAAAAAAAAAAAAQAAQAAAQAAAAAAAAAAAAACAAACAEAAAAAAAIIAAIAgAqIKKrVf+4AAAAAAAAAAAAAAAAAIAAAAAIAAAAAABBAAAAAAAAAAAAAAAgAASABCAASICKSlV/b/gAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAABAAAAAAQAAAABCEpVUr92ABAAAAAIAAAACAAACAAAAEAAAAACCAAAAAAAQAAAAAAAABAAAAUhEAACAIhFIVVt7f8AAAAAAQAAAAAgAAAgAAAAAAAAAAAAAAAAAAAAACAACAAAAAAACAQAAAgkAhCVJVa/74CAIAAEAAABCAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEgAAAAABIhElVW2u+gAAAACAAAAQAAAAAAAAACAAAAAAAABAAAAIIAAAAAAAAAIAAABAgAABAAQAiklVq/v/AAAAAgAAAIAAAAAAAAAAAAAAAAAAAAAAACAAAAAAgAAAAAAAACgBAEQCQEhBJJVdX+8AAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAQhABAAABAiiSqqvvvwAAABAAAAAAAAAQgAAAAAAAAAAAAAAAAAEAAAAAAAEAAIAAAACAQAgAEBARBSpVbVv9gAAAgAAAAAAAAAAAAAAAAAAEAAAAAACCBAAAAAAAAAAAAAAAAREAAAAAgkRQhUqrfvfAAAAAAAAAAAAAAAEAAAAAACAAAQAAAAAAAAAAAgAAAAQAAAAAhABAAAIAAARRKrXX/8AAAAAAAIAAAAAAAAAEAAAAgAAAAgIAAAAAAAAIAAAAAAAAAAIgAgABAAglUoqqrr2/YAAAAAAAAAAAAAAAACAQABAAAAAACAAAAAAAAEAEAAAgAAAACQAIAAQQIQAEVJVV7/fgAIQAAAAAAAAAAAAAAABAgAAAAAAAAAAAAABCAAAAAAAAACECSSAAEACASSEJVWq2//ACAAAAAAAAAEEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAACAAgQASlJKr13dsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAABAIAAAAACIAAAgAAAJUBJSqp73/4AAAAAAQAAAIAAAABAAAAAAAAAAAAAgAAAAAAAAAAAAAAAQACJAAIACAQACiRVVa1//gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAgCAAgQJEhSSkq1/bbAAAAAAAAEAQAAIQAAAAAAAAAAIIAAACEAAAAAAAAAAAAAAACkAEAAAEABAgklVa6v/8AAAAAAAAAIAAAABAAAAAAAAAAAAAAAAAACAAAAAAAAAACAAgCAAAAgAkQpRKkqtfvf4AAAAAQAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABIgIAAIAAAAApFKrWrvtgAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAIAAAAAAASIEAAAAIgklQSiq1v7//AgAAIAAAAAAAAAAAAAIEAAAAAAAQAAAAIAAAAACAEAABAAAgAABAQAAQAgqEqqrV+/8AAAIAAAAAAAAAAAAAEAAAAAAAAAAgAAAAAAAAAgAAAAQAAIQEAQEAIAEgQFKVVVqvbYAAEAAAAAAAACAAAACAAAgQAAAAAAAQAAAAAAAAAAAQQAAAoSAAAACCRAkVFFKrb///gABAAAAQAAAAAAAABAAAAABAAAAAAEAAAAAAABAAAAAAAAEIAAgAAAAAQECiqlW1bf/AAQAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAhAQAAAAAAAAEAAIAAEABEKFQkSqq+/tsAAAAAAAAAAAQAAAAAAAAAAAAEBAAAAAAAAQAEAAAAAAAACiREABAAIgACAVKqtdXf/4AAAAAAAAAAAACCAAAAAAAAAAAQAAAACAAEAAAAAAAAAAAIgAAAAECAEUiqCSVWt3f/gAAAAAAABAAAAAAAAAAAAAAAAAAAAAAgABAAAAAAAAAAAEIBAAAAAABAAgFUqqrb3tuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABCAAABCCQAAIACCQRIqEKVVVb7/sAAAAACAAAEIAAAAAAABAAAAAAAAgAAAAAAAAAAAAAAAAAhABACAgAAAQAFKlKre1//4CAAAAAAQAAAAAAAAAAABAAAAAAABAAAAIAAAAAAAAAAAAgAAIgACAAkJVCRSlWt92/gAAAAAAAAAAAAAAQAAAAQEAAAAAAAAAACAAAAAAAAAQAARJCAAAAgSQAABSUqqqtd+3AAAAAQAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAgAgAAAAAAASpQkqVW3ff/8AAAAIAAAAAABAAAAAAAAAAACAAAAAEAAAAAAAAAAAAAAJIgAgAIAABIAIUIVVVrX7/YAAACAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAIAAAEAQIAIAACBEQJIIKUkqq329vgAAAgAAAAAAAAIIAQAgAAAAAAQAAAAAAAAAAAAAAAAAAEIAAAAAAQACAKKEpVVtq///AAAIAAAABAAAAAAAAQAAAAAAAAIAAAAEAAACAAAAAgAAKIIgAhAAAQgkCFJUqqru3+8ABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgABAAAAACACAAAAAAIAIFCiRKq21v2/YAQAAAAAAAAEAAAAAAAAAAAAAAABAQAIAAAAAQQAEAAAEkAAAgAiCAiEhBSqpVVvr/fgAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABECAEIAAAgIAASgiJVVrr/3/AAAAAAQAABAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAQCCARAAAAAACJIBUlSqr12t+0AAAAAAAEAAAAAABAAABAAAAAAAAAABAAABAAAAAAAAAkgEAAAQAAQAAKiJJSqpa///4AAAAAAAAAAACAAABAAACEABCAgAAAAAAAgAAAAAAAABAJAAAAERAJJKBCSSpW2+t9/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAARIAAAAAAAQAABCkkpVVtX++3AAAAAAAAAgAAAAQAAAAAAAAAAAAAAIAAEAAAAAAQAAAgEAAECAAAABJJBEqVVVb1v/8AAAAAACAAAAABAAAAAAAAAAAAAAEAAABAAAAAAAABAJSABCAAAAgkgACikVKqta/9/YEAAABAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAQAIgAABCQIASVBQkSlWu2t+3gACAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAACAESIAAAIAAAAQABQUqpVVV/9//AAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAhAAAAAUAAAAAAAAAIJJIUIiVVbaq+/8AAAIAAAAgAAQAAAAAgAAAAAAAAAAAAAAAAAAAAgAACCQiAgAAICSCAAIKVVVW29//bYAAAAAAAAAAEAAABAIACAAAgAQAAAgACAAAAAAIAAAEgIAIBAQAgAAlUVECSqqtdrf/gAAAAAAAAAAAAAAACAAAAAAAEBAAAAAgAAAEAAAAABEQACAQAAIAEIAEBKkpVVa7///AAAAAAAAAAgAAAAAAAAAAAAEAAAAAAAAAAAAAAAAACAIAAAAQAAECCJFSKqUqtddu20AAAAABAgAIAAQAgAAAAAAAAAAAAIABAAAAAAAAAQAkiBIAAABACAgiBAlElVWuvf//4AgAAAAAAAAAABAAAAAAEAAAAAAIAAQAAAAAAAAAABAgQAAAAAQAQABRRClUqrXXb//gABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARQAAAAAAAEEBJAQikiVVVrv7bfAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAABQAgAggIEABAgBQRBJVVWq3V//sAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAISQAIAEBAAAAJAUSpSSqrdv//f4AAAQCAAAAAAAAAAAACAAAAAAAAAAAAAACAAAAAAAUABEAAAAEiBEBIEEQkpVWrVrfvgAAAAgAAAAAAAAAEAAAIAAQAAAAAAAAAEAAAEAAAECIgAAAAAAAgBAJFEpVVVrb7/f3AAAAAAABAAAAAAAAAAAAAABAABAACAAAAAABAQEAUgAAAIAAAAAERKJCkpJVVW17f/8AAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAQAAAKAIAAABAQAIhAAABBIqUqrW6/9vYAAAAABCAAAIBAAgAAAAAAAAAEAAAAAAgAAAAAAACkERAAAECIAARJKioUVKq2t+2/3gIQAAAAAAACAAAIAAQAAAAAABAAAQAAAAAAAAAABABAARAAAAACAQAAgKKKqtXav/9/AABAAAAAAAAAAEAAQAAAAAAAgAAIAAAAAAAAAAACkgAAAAAAAEhIEqRVFFKqqq3rd/8AAAAAAAAAEAAAAAAAAAAAAAAAACAAAAAAAAAAAAggBAAAQQAEAABACQJJSlVW91/+94AAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAABQRARAAAAiAAAgkgVKUpSqta+7/+gAAAQAAAAIAAAAAAAAQAAIAAAAAAABAAAACAAAAQQAAAAAAAAEJIIAUBEKVVWq9e97/AAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAEBURCAAIAAgBCACCUFRKlSqq1ev+98AAAAAgAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAIAAAgCAIIAQAEAgFApJJVVa6v2/+4AAAAAAABAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAUiEAAgEAAQACCISBUJKVVWtfV///gAAAAAAAAAAAEAACAAAAAAAAAAAAAAAAIQAAAgEAhAggAAAAACACECQFJFJKrWr+7bfAAAAAAAAAAABAAAAAAAAAAAAAAAACAAIAAAAIAVQAIAAAAgABAJACiVCSqqqq27e//sAACAABAQAAAAAAAACAAAAAAAAAAAAAAAAAAEACACAAAAAABCQEAJAgCkkSqqtt3f//4BCAAAAEAAAAAAAAAABAAAAAAAAAAAAAAAAEAAFJAgAAAAAAABAkBIVBJKkqtba3dtvgAAAEAAAAAAAAABAAAAAAAAAAAAAAAAAAAgAABAAIAIAIQCAAAICQECpKSqqqq/3//3AAAAAAAAAAAgAQQAAAAAEAAABAAAAAIAAAAAACpEAiBEAAgICCAgJFCJElVVbdV7//8AAAAAAAAAAAAAAAAAAAAABABAAAEAAAAAAAAAgBAAAAAAQACAgQSBCiJKkqq2u97bfYAAAAAAAAABAAAAAEAAAAAgEAAAIAAQAAAAAABSQCAAAAAAAAIAEBRBFKlKVarW9//fgAAAAIAAAAgAAAAAAAAAAAAAAAIAAEAAAAAAAQABAAAAAABCEAiBARSiElVVVrtd7/vAAAAAAAAAQAAAAAAAIAAAAAAAAAAAAAAAAAAAqQgEQQAIAAAAIAhQQBFJUqq11/d978AAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAABAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAEAAAAAAAAAAAAAAAAAACAIIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAABAAgAAQAAAAAAAAAAAAIAAABAAAgAAAAAAAAAAAAAAABAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAACAICAAAAAAAAAAAAAAAAAAEAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAgAAAAAAICAAAAABAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAEAgAAIAAAAAAABAAAAAAAAAAAAgAgAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAACAAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAgAAAEAAAAAAAAAAAAAQAIAAAAAACAAAIAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAIAQAAAAAAAAAIEAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAgAAABAAAAIAAAAQAAAAAAAAAAAgAAAAAAAAAAAhAAAAAAAABAAAAAAAABAAAAAAAAAAAAAhAAACCAAAAEAAAAAAAAAAAIBAAAAAAAAAAAAEAQAAAAAAACCAAAAAACAAAAAAAAAAAQAAAAgAAAAAAAAAAAAAAAAEAAAAAAAAAAABAAAAAAAAACAAAAAABAAAAAAAAAAAAAAEAAAAAAAAAAAAAIIAAAAAAAAAAIAAAAAAAAQAAAAEBACEAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAQAAAAAAAAAhCEIIIIIAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEEAAAAAAAAACAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAgAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAABAAAAIAAAAAAAAAAAAIAAAAAAAAAAAAAAAgQAAAAAAAAAIAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAggIACEAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAIAAAAAAgAABAAAAAAAAAAAAAAACAAAAAAIAABAAAEAAAAAAAAAAAABAAAAAAAAABAAAAAAAACAAAAAAACAAAAgAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAQQACAAAAAAAAAAAAAAAAAAAAAAAAgAAAIAAAAAAAAAIAAgAAAAAAAAQAAAAAAAAAAAEAABAIAAAAAAAAAAAAAAAAAAAAAAIAAACAEAAgEAAAAAAgACAAAAAAAACAAAAAQAgAAAAAAAAAAACAAAAAAAAAAAAAAAAACAAAAgAAAICAAAAAAAACAAAAAABAAAIAACEBAAAAAAAAAAAhBAAACCAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAQAAAAhCAAAAAAgAAAAAAIAAAEAAAAAAAAAAAAAAAAAAACAAAAQAAAgQAAEAAAAAAAAAAAAAAAAAAAAAIAAAAAACAAAAAAAAAAAAIAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAhAAAAAAAAAAAAAAgAAAAAAAgAAAAAAAAAAQEAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }, { "name": "Floor", "bits": "/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+222222222222222222222222222222222222222222222222222222222222222223///////////////////////////////////////////////////////////////////f/////////////////////////////////////////////////////////////////f2222222222222222222222222222222222222222222222222222222222222222239//////////////////////////////////////////////////////////////////f//////////////////////////////////////////////////////////////////9ttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttt/f/////////////////////////////////////////////////////////////////f//////////////////////////////////////////////////////////////////+222222222222222222222222222222222222222222222222222222222222222239v/////////////////////////////////////////////////////////////////f/+/3+/3+/3+/3+/3+/3+/3+/3+/3+/3+/3+/3+/3+/3+/3+/3+/3+/3+/3+/3+/3+//tvb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7f+7/////////////////////////////////////////////////////////////////f///v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/72232+32+32+32+32+32+32+32+32+32+32+32+32+32+32+32+32+32+32+32+32/+/////////////////////////////////////////////////////////////////3f3//b7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7fb7/97bf9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/v9/+///f/////////////////////////////////////////////////////////////vf//ft7e32+32+32+32+32+32+32+32+32+32+32+32+32+32+32+32+32+32+32+33/9tv/+/v7/f7/f7/f7/f7/f7/f7/f7/f7/f7/f7/f7/f7/f7/f7/f7/f7/f7/f7/f7/9//9v/////////////////////////////////////////////////////////////vf/+/29vt29t29t29t29t29t29t29t29t29t29t29t29t29t29t29t29t29t29t29t3/22////7//f//f//f//f//f//f//f//f//f//f//f//f//f//f//f//f//f//f//f////+9v7+/33/33/33/33/33/33/33/33/33/33/33/33/33/33/33/33/33/33/33/3ff//f29v77/b7/b7/b7/b7/b7/b7/b7/b7/b7/b7/b7/b7/b7/b7/b7/b7/b7/b7/b//tt////+//3//3//3//3//3//3//3//3//3//3//3//3//3//3//3//3//3//3//3/d//+/f//v33/vt/vt/vt/vt/vt/vt/vt/vt/vt/vt/vt/vt/vt/vt/vt/vt/vt/vt/v/f9/fttv/7/v3/33/33/33/33/33/33/33/33/33/33/33/33/33/33/33/33/33/3//t+/7///v/b//9//9//9//9//9//9//9//9//9//9//9//9//9//9//9//9//9//9/b/9/d//+33v+3bfvbfvbfvbfvbfvbfvbfvbfvbfvbfvbfvbfvbfvbfvbfvbfvbfvbfv/f///22//7/////3//3//3//3//3//3//3//3//3//3//3//3//3//3//3//3//3////t297/+/e/b/f/f//f//f//f//f//f//f//f//f//f//f//f//f//f//f//f//f//e3///e//ffv/9v23v23v23v23v23v23v23v23v23v23v23v23v23v23v23v23v23v23v7f3//23/v+//9//3//3//3//3//3//3//3//3//3//3//3//3//3//3//3//3//3////t9v9//f/vb+//9//9//9//9//9//9//9//9//9//9//9//9//9//9//9//9//9///v///7f/33b/9v9t/bbfbbfbbfbbfbbfbbfbbfbbfbbfbbfbbfbbfbbfbbfbbfbbfbbb3f7+/9t////f9/+/////////////////////////////////////////////////////t9v/f/3v7f/f/////f//f//f//f//f//f//f//f//f//f//f//f//f//f//f//f//3///+3/977/vf229ttv223223223223223223223223223223223223223223223223/f3vv/bf//7////f//9////////////////////////////////////////////////ft77/3//7t/dv///v+///3//3//3//3//3//3//3//3//3//3//3//3//3//3//3/+3////v//b////22+32/7bb7bb7bb7bb7bb7bb7bb7bb7bb7bb7bb7bb7bb7bb7bb7bf/f777323/v29///f//e/////////////////////////////////////////////////t++/9//v3/e3+//f3v/fvffvffvffvffvffvffvffvffvffvffvffvffvffvffvfdt//v//f/337//7fe3t/+333vv3vv3vv3vv3vv3vv3vv3vv3vv3vv3vv3vv3vv3vv3v//f3++39t//+////v///v////9//9//9//9//9//9//9//9//9//9//9//9//9//9/9//t/vv/f/vbvbb9//v9v/vf++/++/++/++/++/++/++/++/++/++/++/++/++/++/+/b//3//3/73///9+/b2//b3tvf9vf9vf9vf9vf9vf9vf9vf9vf9vf9vf9vf9vf9vf9v3/f7/fd/b//v//+/f//+3////7f/7f/7f/7f/7f/7f/7f/7f/7f/7f/7f/7f/7f/7f///t/vv/3/337bb/3//7f//v/d//9//9//9//9//9//9//9//9//9//9//9//9//9//vt//3/99/t9+//979tt//2323//bf/bf/bf/bf/bf/bf/bf/bf/bf/bf/bf/bf/bf/b3/f3/fff3//v/fe////9t////7f/7v/7v/7v/7v/7v/7v/7v/7v/7v/7v/7v/7v/7v///t/fv/9/97+3v/3//2///f/2//+//+//+//+//+//+//+//+//+//+//+//+//+//3t//fv+/ft//v/+97bb//9vtt/9tv3bf3bf3bf3bf3bf3bf3bf3bf3bf3bf3bf3bf3b//f/v+/f/+77/+/////9t////9/////9//9//9//9//9//9//9//9//9//9//9//9//f/t7+///f/+/tv7///t//+/v7f9/vf9//9//9//9//9//9//9//9//9//9//9//9//3t/+/f7dvt7v7/99ttv+/2/b2/7e33t/7bf7bf7bf7bf7bf7bf7bf7bf7bf7bf7bf7b//fv/7///+////f///v/b/f//+////+7//7//7//7//7//7//7//7//7//7//7//7////v+999+/v/v237/vv2//3//+///f/v//e//e//e//e//e//e//e//e//e//e//e//tt/3vf++/b+33//9v3///t+22/9tvtv/bf/tv/tv/tv/tv/tv/tv/tv/tv/tv/tv/tv//d//7//3/v/7/3/3+37b////7f///3v/d//9//9//9//9//9//9//9//9//9//9//3///v+977/7/u+379/f9//9//7//+/9///+/9+/9+/9+/9+/9+/9+/9+/9+/9+/9+/99t9/7f+9/t/v//+9/v/f/2+229/bfbfu29/bf/bf/bf/bf/bf/bf/bf/bf/bf/bf/bf//fe////v/79+/f+/+37b////+3//////f//73/73/73/73/73/73/73/73/73/73/9///v+2/3/7++/f/vvf///9739//97/e/37fe9/+9/+9/+9/+9/+9/+9/+9/+9/+9//e3+/+//t+2///fu3/3/3/t+97f/t+9vvt//v//2//2//2//2//2//2//2//2//2//23//ffvf7/v/t7////v+37b+///7b+/////3/999/e9/e9/e9/e9/e9/e9/e9/e9/e9//+wAAAAAAAAAAAAAAAAAAAAAAZttskkkkSSSSSRJJJJttswAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGbbJNkkiSSJJIkkiSTZJtswAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmyTJIkiSJJEkSSJIkiSZJswAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZs2TJEkSJIkSRIkiRJEmTZswAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGZMmTJkSJEiRJEiRIkTJkyZMwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmbMmRIiRIiRIiRIiRIiRMmbMwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZmTMiZESIiREiJESIiREyJmTMwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGZmREyIiJEREiIiRERIiImREzMwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABmZmZkRERERIiIiIiREREREzMzMwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYiIiIiIiIiIiIiIiIiIiIiIiIiIwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGMzMzEREREQiIiIiIiERERERmZmYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABjMzERmIiIRERCIiIRERCIiMxEZmYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYzERiIhEQiIREQiIREQiIREIiMRGYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGMxmIxEIiEQiIRCIhEIiEQiIRGIzGYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABjEYjEYjEIhEIhEIiEQiEQiEYjEYjEYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYxmMRiEQhEIhCIRCEQiEIhEIRCMRjMYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGMYjGIRiEIhCEQhEIRCEQhCIQjEIxiMYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABjGMQhGIQhCIQhCIQhCIQhCIQhCMQhGMYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYxjGMYhCEIQhCIQhCEIQiEIQhCEIxjGMYwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGEIQhCEIQhCEIQhCEIQhCEIQhCEIQhCEIQwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABhjGMYwhCEIQhBCEIQhCEIQQhCEIQhjGMYwwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYYxjCEMYQhCCEIQghCEIIQhCCEIQxhCGMYwwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGGMIQwhCCEIIQghCEEIQQhCCEIIQghCGEIYwwAAAAAAAAAAAAAAAAAAAAAAAAAAAAABhjDGEMIQQhBCCEIIQQhBCCEIIQQhBCGEMYYwwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYYQwhhDCGEEIIQQghBCEEIIQQghBDCGEMIYQwwAAAAAAAAAAAAAAAAAAAAAAAAAAAAGGGMMIYQQgghBCCCEEIIIQQgghBCCCEEMIYYwwwAAAAAAAAAAAAAAAAAAAAAAAAAAABhhhDDCCGEEEIIIIQQQgghBBCCCCEEEMIIYYQwwwAAAAAAAAAAAAAAAAAAAAAAAAAAAYYYYQQQwgggghBBBBCCCCCEEEEEIIIIIYQQQwwwwAAAAAAAAAAAAAAAAAAAAAAAAAAGGGGGGGEEEEEEEEEIIIIIIIIIQQQQQQQQQwwwwwwwAAAAAAAAAAAAAAAAAAAAAAAAABggggggggggggggggggggggggggggggggggggggggwAAAAAAAAAAAAAAAAAAAAAAAAAYMMMMMMEEEEEEEECCCCCCCCCCCBBBBBBBBBhhhhhgwAAAAAAAAAAAAAAAAAAAAAAAAGDDDDBBBhgggggQQQQQIIIIIEEEEECCCCDDBBBhhhgwAAAAAAAAAAAAAAAAAAAAAAABgwwQQYIIIEEECCCBBBBAgggQQQQIIIEEECCCDBBBhgwAAAAAAAAAAAAAAAAAAAAAAAYMMGGCDBBAgggQQIIIEECCCBBAgggQQIIIEEGCDDBhgwAAAAAAAAAAAAAAAAAAAAAAGDBBggwQYIMECCBBAggQQIIIEECCBBAggQYIMEGCDBBgwAAAAAAAAAAAAAAAAAAAAABgwYYMEGCBBAgQQIIECCBBAgQQIIECCBBAgQQIMEGDDBgwAAAAAAAAAAAAAAAAAAAAAYMGCDBggQYIECCBAgQQIEECBBAgQQIECCBAgwQIMGCDBgwAAAAAAAAAAAAAAAAAAAAGDBgwQIEGCBAgQIIECBAggQIECCBAgQIIECBAgwQIEGDBgwAAAAAAAAAAAAAAAAAAABgwYMGDBggQIECBAgQIIECBAgQIECCBAgQIECBAgwYMGDBgwAAAAAAAAAAAAAAAAAAAYECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAgQIECBAwAAAAAAAAAAAAAAAAAAGBgwYMGDAgQIECBAgQECBAgQIECBAgQECBAgQIECBgwYMGDAwAAAAAAAAAAAAAAAAABgYMGDAgQMGBAgQICBAgQICBAgQICBAgQICBAgQMGBAgYMGDAwAAAAAAAAAAAAAAAAAYGDAgQMCBAgIECAgQICBAgQECBAQIECAgQICBAgIECBgQIGDAwAAAAAAAA//////////////////////////////////////////////////////////////////8AAAAAAABgYEDAgYEDAgYEBAgIEBAgIEBAgQECAgQECAgQEDAgYEDAgYEDAwAAAAAAAAAAAAAAAYGBgwMCBgQECAgIEBAgICBAQICAgQECAgIEBAgICBAQMCBgYMDAwAAAAAAAAAAAAAAGBgYEDAwICBgQEBAgICAgQEBAgICBAQECAgICBAQEDAgIGBgQMDAwAAAAAAAAAAAAABgYGBgQEBAwICAgICBAQEBAQICAgICBAQEBAQICAgICBgQEBAwMDAwAAAAAAAAAAAAAYGBgYGBgYEBAQEBAQEBAQICAgICAgICAgQEBAQEBAQEBAwMDAwMDAwAAAAAAAAAAAAGAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAwAAAAAAAAAAABgMDAwMDAwEBAQEBAQEBAICAgICAgICAgICAQEBAQEBAQEBgYGBgYGAwAAAAAAAAAAAYDAwMDAQEBgYCAgICAQEBAQEAgICAgIBAQEBAQCAgICAwMBAQGBgYGAwAAAAAAAAAAGAwMBAQGAgICAQEBAICAgEBAQEAgICAQEBAQCAgIBAQEAgICAwEBAYGAwAAAAAAAAABgMDAYGAgMBAQCAgIBAQCAgIBAQCAgIBAQCAgIBAQCAgIBAQGAgMDAYGAwAAAAAAAAAYDAQGAgMBAYCAwEAgIBAQCAgEBAICAgEBAICAQEAgIBAYCAwEBgIDAQGAwAAAAAAAAGAwGBgMBAYCAQEAgEBAICAQCAgEBAIBAQCAgEAgIBAQCAQEAgMBAYDAwGAwAAAAAAABgMBgIDAYCAQGAgEAgIBAIBAQCAQEAgEBAIBAQCAQCAgEAgMBAIDAYCAwGAwAAAAAAAYDAYDAQCAQGAgEAgEAgIBAIBAICAQCAQCAgEAgEAgIBAIBAIDAQCAQGAwGAwAAAAAAGAwGAwGAwGAgEAgEAgEAgEAgIBAIBAIBAIBAICAQCAQCAQCAQCAwGAwGAwGAwAAAAABgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAgEAwAAAAAYBgMBgMBgMAgEAgEAgEAgEAQCAQCAQCAQCAQCAQBAIBAIBAIBAIBgMBgMBgMAwAAAAGAYDAYDAIBAMBgEAgEAgCAQCAQCAIBAIBAIAgEAgEAgCAQCAQDAYBAIBgMBgMAwAAABgGAwCAQDAIBAIAgEAgCAQCAIBAIBAEAgEAQCAQCAIBAIAgEAgCAQCAYBAIBgMAwAAAYBgMAwGAQDAIBAEAgEAQCAIBAIAgEAQCAQBAIAgEAgCAQBAIBAEAgGAQDAYBgMAwAAGAYBAMAgGAQDAIBgEAQCAIBAEAgCAQBAIBAEAgCAQBAIAgEAQDAIBgEAwCAYBAMAwABgGAYDAMAgGAQBAIAgCAQBAIAgCAQBAIAgCAQBAIAgCAQBAIAgCAQBAMAgGAYDAMAwAYBgGAQDAMAgCAYBAEAQCAIAgCAQBAEAgCAIBAEAQCAIAgCAQBAEAwCAIBgGAQDAMAwGAYBgGAQBAEAwCAIAgCAIBAEAQBAEAgCAIAgCAQBAEAQBAIAgCAIAgGAQBAEAwDAMAxgGAYBgGAYBgEAQBAEAQBAEAQBAIAgCAIAgCAIAgCAQBAEAQBAEAQBAEAwDAMAwDAMA///////////////////////////////////////////////////////////////////AMAwDAMAwDAEAQBAEAQBAEAQAgCAIAgCAIAgCAIAgCAEAQBAEAQBAEAQBgGAYBgGAYADAMAwDAEAQBgGAIAgCAIAQBAEAQBACAIAgCAIAQBAEAQBACAIAgCAMAwBAEAYBgGAYAwDAEAQBgCAIAgBAEAQAgCAIAQBAEAQAgCAIAQBAEAQAgCAIAQBAEAIAgCAMAQBAGAYMAwBgGAIAwBAEAIAgCAEAQAgCAIAQBACAIAgBAEAIAgCAEAQAgCAIAQBAGAIAwDAGAbAEAYAgDAEAYAgDAEAIAgBAEAIAgBAEAIAgCAEAQAgCAEAQAgCAEAYAgDAEAYAgDAEAQBgGAMAQBgCAEAQAgBAEAIAgBACAIAQBACAEAQAgCAEAIAgBAEAIAQBACAMAQBgDAMAAYAgDAGAIAQBgCAEAIAgBACAEAQAgBAEAIAQBACAEAQAgBACAIAQAgDAEAIAwBgCAMAGAMAQAgBAGAIAQAgBACAIAQAgBACAIAQAgBACAIAQAgBACAIAQAgBACAMAQAgBAGAMBgDAGAMAYAgBACAEAIAQAgBACAIAQAgBACAEAIAQAgCAEAIAQAgBACAEAIAwBgDAGAMIAQAgBACAEAIAQAgBACAEAIAQAgBACAEAIAQAgBACAEAIAQAgBACAEAIAQAgBACAEALAGAMAYAwAgBACAEAIAQAgBABACAEAIAQAgBACAEAIAQAQAgBACAEAIAQAgBgDAGAMAQBgDACAEAMAYAQAgBACACAEAIAQAgAgBACAEAIAIAQAgBACACAEAIAQAwBgBACAGAMAAIAQAwAgBACACAEAIAIAQAgAgBACAEAEAIAQAQAgBACACAEAIAIAQAgAgBACAGAEAIADAGAEAMAIAQAQAgBABACACAEAIAIAQAQAgBABACACAEAIAIAQAQAgBABACAGAEAMAYAwAgBgBADACAGAEAEAIAIAQAQAgAgBABACAEAEAIAIAQAQAgAgBABADACAGAEAMAIAYMAMAIAYAQAQAgAgAgBABACACACAEAEAIAIAIAQAQAgAgAgBABACACACAEAEAMAIAYAb//////////////////////////////////////////////////////////////////4AQAQAQAwAgAgAgAgAgBABABABABACACACACACAEAEAEAEAEAIAIAIAIAIAYAQAQAQAAGAGAGAEAEAEAEAEAEAEAEAEAIAIAIAIAIAIAIAIAIAQAQAQAQAQAQAQAQAQAwAwAwAAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAgAMAMAMAEAEAEAEAEAEAEAEACACACACACACACACACACACABABABABABABABABABgBgBgDABABABgBgAgAgAgAgAQAQAQAQAQAIAIAIAIAIAEAEAEAEAEACACACACADADABABABgQAYAIAIAIAEAEAEACACACABABABABAAgAgAgAQAQAQAQAIAIAIAEAEAEACACACADABGACADABABAAgAgAgAQAQAIAIAIAEAEACACACABABAAgAgAgAQAQAIAIAIAEAEAGACADgAwAQAYAIAMAEACACABABAAgAgAQAQAIAIAIAEAEACACABABAAgAgAQAYAIAMAEAGAAAEAGACABABAAgAQAQAIAIAEACACABABAAgAQAQAIAIAEACACABABAAgAQAQAIAMAEAABgAgAQAYAIAEACACABAAgAQAQAIAEAEACABABAAgAQAQAIAEACACABAAgAwAQAIAMAAIAEAGACABAAgAQAIAIAEACABAAgAgAQAIAEACACABAAgAQAIAIAEACABAAgAwAQAID//////////////////////////////////////////////////////////////////wQAIAEACABAAgAQAIAEACABAAgAQAIAEACABAAgAQAIAEACABAAgAQAIAEACABAAgAQGADAAgAQAIAEACABAAgAQAEACABAAgAQAIAEACABAAgAQAEACABAAgAQAIAEACABgAwgAQAMAGABAAgAQAIACABAAgAQAIACABAAgAQAIACABAAgAQAIACABAAgAQAMAGABAAsACABAAgAIAEACAAgAQAIACABAAgAQAEACABAAQAIAEACAAgAQAIACABAAgAIAEACABAAwAIAEABAAgAQAEACAAgAQAIACABAAQAIAEABAAgAIAEACAAgAQAEACABAAQAIAGAAAEADAAgAYAEABAAgAIAEABAAgAIAEABAAgAQAEACAAgAQAEACAAgAQAEADAAgAYAEAABgAQAEACAAgAIAEABAAgAIACABAAQAIACAAgAQAEACAAgAIAEABAAgAIACABAAQAMAAIACABgAQAEABAAgAIACAAgAQAEABAAgAIACABAAQAEACAAgAIACABAAQAEADAAgAID//////////////////////////////////////////////////////////////////wYAEABAAQAEABAAQAEABAAQAIACAAgAIACAAgAIACAAgAQAEABAAQAEABAAQAEABAAwCAAgAIACAAgAIACAAgAIACAAgAIACAAgAIACAAgAIACAAgAIACAAgAIACAAgAIACAAgwAEABAAQAEABAAQAEABAAIACAAgAIACAAgAIACAAgAIACAAQAEABAAQAEABAAQAEABkABgAYACAAgAIACAAQAEABAAQAEAAgAIACAAgAIABAAQAEABAAQACAAgAIACAAwAMABgAIACAAQAEABAAIACAAgAEABAAQAEAAgAIACAAQAEABAAQACAAgAIABAAQAEAAgAIAAABAAQACAAgAIABAAQACAAgAIABAAQACAAgAIABAAQACAAgAIABAAQACAAgAIABAAQAP//////////////////////////////////////////////////////////////////ACAAQAEAAgAEABAAIACAAQACAAgAEABAAIABAAQACAAgAEAAgAIABAAQACAAQAEAAgAAQAGAAgAEAAgAIABAAIABAAQACAAQAEAAgAEABAAIABAAQACAAQACAAgAEAAgAMABAAGAAgAEAAgAEAAgAIABAAIABAAIACAAQACAAQACAAgAEAAgAEAAgAIABAAIABAAIADAAgAEAAgAEAAgAEAAgAEAAgAIABAAIABAAIABAAIABAAIACAAQACAAQACAAQACAAQACD//////////////////////////////////////////////////////////////////wgAEAAgAEAAgAEAAgAEAAQACAAQACAAQACAAQACAAQACAAQABAAIABAAIABAAIABAAIMABgAEAAgAEAAgACAAQACAAQACAAIABAAIABAAIAAgAEAAgAEAAgACAAQACAAQADAAZAAIAAgAEAAgACAAQACAAIABAAIABAAEAAgAEAAQACAAQACAAIABAAIAAgAEAAgACAAYABAAEAAgAEAAQACAAIABAAIAAgAEAAQACAAQABAAIAAgAEAAgACAAQABAAIABAAEAA//////////////////////////////////////////////////////////////////8ABAAIAAgACAAQABAAIAAgACAAQABAAIAAgACAAQABAAIAAgACAAQABAAIAAgACAAQAAAYABAAEAAQACAAIAAgACAAQABAAEAAgACAAIABAAEAAQACAAIAAgACAAQABAAEAAwAACAAIAAgACAAIABAAEAAQABAAEAAgACAAIAAgACAAQABAAEAAQABAAIAAgACAAIAAgD//////////////////////////////////////////////////////////////////wCAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAQABAAEAAQABAAEAAQAAgACAAIAAgACAAIAAgACAAIAAgACAAEAAQABAAEAAQABAAED//////////////////////////////////////////////////////////////////wgABAAEAAQAAgACAAIAAQABAAEAAQAAgACAAIAAQABAAEAAQAAgACAAIAAQABAAEAAI//////////////////////////////////////////////////////////////////8gADAAEAAIAAgABAAEAAIAAgABAAEAAIAAgACAAEAAQAAgACAAEAAQAAgACAAEAAYAAkAAQAAgABAAEAAIAAgABAACAAIAAQABAACAAEAAQAAgACAAEAAIAAgABAAEAAIAAQAB//////////////////////////////////////////////////////////////////8AAQAAgABAACAAIAAQAAgABAACAAIAAQAAgABAACAAIAAQAAgABAACAAIAAQAAgABAAP//////////////////////////////////////////////////////////////////AAQAAgABAACAAEAAIAAQAAgABAACAAEAAIAAQAAgABAACAAEAAIAAQAAgABAACAAEAD/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////ACAAEAAIAAIAAQAAgAAgABAACAAEAAEAAIAAQAAQAAgABAACAACAAEAAIAAIAAQAAgD/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////gAAgAAgAAgAAQAAQAAQAAQAAQAAIAAIAAIAAIAAIAAEAAEAAEAAEAAEAACAACAACAAAAAEAAEAACAACAACAABAABAABAABAAAgAAgAAgAAQAAQAAQAAQAAIAAIAAIAAEAAEAAAAAgAAgAAQAAQAAIAAIAAIAAEAAEAACAACAACAABAABAAAgAAgAAgAAQAAQAAIAAIAAAAEAACAACAABAABAAAgAAgAAQAAQAAIAAIAAIAAEAAEAACAACAABAABAAAgAAgAAQAAAAgAAQAAQAAIAAIAAEAACAACAABAABAAAgAAQAAQAAIAAIAAEAACAACAABAABAAAgAAAEAACAACAABAAAgAAQAAQAAIAAEAAEAACAABAABAAAgAAQAAQAAIAAEAACAACAABAAAAgAAQAAIAAIAAEAACAABAAAgAAgAAQAAIAAEAACAACAABAAAgAAQAAIAAIAAEAACAAAEAACAABAAAgAAQAAIAAIAAEAACAABAAAgAAQAAIAAEAACAACAABAAAgAAQAAIAAEAAAgAAQAAIAAEAACAABAAAgAAQAAIAAEAACAABAAAgAAQAAIAAEAACAABAAAgAAQAAIAAEAACAABAAAgAAQAAEAACAABAAAgAAQAAIAAEAACAABAAAgAAQAAEAACAABAAAgAAQAAgAAQAAIAACAABAAAgAAQAAIAACAABAAAgAAQAAIAACAABAAAgAAQAAIAACAABAAAgAEAACAAAgAAQAAIAACAABAAAgAAQAAEAACAABAAAQAAIAAEAACAAAgAAQAAIAACAABAAgAAQAAEAACAAAgAAQAAIAACAABAAAQAAIAAEAABAAAgAAIAAEAACAAAgAAQAAEAACAEAABAAAgAAIAAEAABAAAgAAIAAEAABAAAgAAQAAEAACAAAgAAQAAEAACAAAgAAQAAEAgAAIAAEAABAAAgAAIAACAABAAAQAAIAACAAAgAAQAAEAACAAAgAAIAAEAABAAAgAAIEAABAAAgAAIAACAAAgAAQAAEAABAAAgAAIAACAABAAAQAAEAACAAAgAAIAACAABAAAQgAAIAACAABAAAQAAEAABAAAQAAIAACAAAgAAIAACAABAAAQAAEAABAAAQAAIAACAAAkAABAAAQAAEAABAAAQAAIAACAAAgAAIAACAAAgAAIAACAAAgAAQAAEAABAAAQAAEAAB" }, { "name": "Test pattern", "bits": "/////////////////////////VVVVVVVVVVVVVVVVUEEEEEEEEAAAAAAAAAAAAAAAAD////////////////qqqqqqqqrbbbbbbbbJJJJJJJJKlFFFFFFEIIIIIIIIAAAAAAAAP////////Wqqqqqqr3bdt23bd1W2222221VSqVSqVSAiiiiiiiiEEEEEEEEAAAAAAAA////////////////927btu27bbVVVVVVVUpVKpVKpVUggggggggBBBBBBBAAAAAAAAD////////+///////7u77vu+71VVVVVVVVKVKpVKpVREpUpUpUoEgQQQQQQAAAAAAAAP///////+/bbbbbbb1t63ret66tra2tra2qqlUqlUpREQIQIQIRAEAEAEAAAAAAAAAA////////+///////996212ttetVqtWq1alUlSqVSqUSEVKVKVKAEAiAiAiQAAAAAAAD/////////b7777776td3t3d7Wtq1WrVatkpSklJSVElKBCBCBBEEQgIgIgAAAAAAAAP///////+/9999999/vd173dfrVVbVVtVVJUpVSUqTICCpSpSpQEAAIAIAAAAAAAAAA/////////b/f/f/fdVut9a27XVttVbbVtqqqVKqqVSKlRAQIQIECSQIgIhAAAAAAAAD/////////9v232337vXte+9frarWtWq1aqkqqlUqqkRAhUVIqJCAAIAQAQAAAAAAAAP///////+7/9////+7r3uuuvV1VqrWqtaqSqVJSVUlKRUokhISQBCIEgREEAAAAAAAA//HGB79jj9F7Hu7ve37rvXXrtq1W1qtWq0pVKqqpJSCQIRIpKSEQgEAkRBAAAAAAAAD/7ru7vl13duLPv/v3q11r317ttWqq2tVtKpKlSUqqlSVKRIJAgEAICAAAAAAAAAAAAP/vv7u9XXS26u37v91299619bqrW1qrWrVVVVSqpKlASISRKBUoAiEhEBCAAAAAAAAA//PPu31ddrzK7+/9992td+6vbVqqq1qrVVJKSlSVJSqEKEhFQgIQgABCgiQAAAAAAAD//PO9e112fdqu/t96t/u6u/vdq221atVrKVUpSlVUhCKCJRCUoIAEiQAIAAAAAAAAAP/++714HWZrgOvf9+/dVtdtVrbaqtatW1VKqVUlUpVRSFUQpSEQCRAACEAQAAAAAAAA/+67vf9ttrb6z/u++rd9+9+97VW1WtWtWqpKpVVKUooSgKQQSERAAEQhAkAAAAAAAAD/8ce+/2ONoPsffv/f7ddddWt6rVarWrWtVVSUqSlVUKRVCUUSkQRFAIAQBAAAAAAAAP////////////3v93Veu6uv3tbVWtVrVWskpVKUqqpFCQhEkIhAEBASCEEQAAAAAAAA/////////b/b//3d/vXtfvq3fW2rWq1qqqqUqqqlJVBQopIlJRBBAEACBAAAAAAAAAD////////39v9vd//1r1/VrfurVW1rVa21UlKVSpSpCoUQSIiQogAiAJAQQAAAAAAAAP/////////f7/vff7969X93Vv1aqq1qtVaVVVJSVVVQKEqEREUIEgASAQAIAAAAAAAA/////////f99v//r9deu1d3tqtbVVa1WqqqqSqlSkoVCgikpEECAiIAkRIAAAAAAAAD////////ve/f9u77e/Xu+6172q1tqtarbSSVVJUpKUCgogkJKkggCCIAAEAAAAAAAAP/////////vv9/+//Wr1ute911taraqtWqqlKlVKqlKhUUokSBAIEggACJAAAAAAAAA////////+7799u/3/t79vfda7aqtqtbWrSSqlJSpVUEgKEUKFRCCAAIlCAQAAAAAAAD////////v/+9//9619avWre+2tVVVWqtVVVJSqqUqlEqCIFCgogghEAAAEAAAAAAAAP////////73v+92//9e3rv7dXqrattrWttSlUqlVUlCkSlKhQoIAIRBEJEAAAAAAAAA////////+937vf/31eu17q7f1tWtbVVqqpVSqlJKqlQkhBEoUVBCAARCAEAAAAAAAAD//////////+//233+ve9b27V9Wraqra1tVKpVSqklQQhSpEKEARAiEAAJCAAAAAAAAP///////+7u/vd/33XWuva9b6qtVat1VaqlJUkqVKqUoogJFClQAIBAEIAAAAAAAAAA/////////7+73/3//3vfu+v6/dWqtZVqqyqUpVVKqUIUIqJBQiIkCQJCJEQAAAAAAAD////////7+//93+u1rrVuvq9WWtrW21ttUlKVSSqUlKFISJQUiAAgCAAAEAAAAAAAAP///////+/v3vf3f/t177XV9e2rVqpqrVVKqqpVUlKBChKSIqEghIBAkhEAAAAAAAAA/////////v7733/93d9a739eutVatatqtSlVUqqpSqpQpCEQSIIQBAIAQCAAAAAAAAD////////7u+//7bf3dfd61evdWtWtVVWtqpJKSSVVRAUCikqEUAAhEAgEgAAAAAAAAP//////////v3b//3uura+7XWttVrW2trVKVSlUlSkpUKhEkSkAiQBAgRAIAAAAAAAA////////7979/97v3Xv79W73vVW1VqrVVSlJVUqqpUIlBShEBKggEgQgQCAAAAAAAAD////////9e/fd+/331q6v261qqqrVW1rWpVVKqqlUkIhQgpKpAgJAEAQCAAAAAAAAAP//////////3/e/v7q993q9e92221rVa1qqqlSSSkqlIoooIEJQQASBEIiIAAAAAAAA////////797+3/f2/+9a1+vW9tVVa1qqq1SSqlVVVUiUIUVKlAEIgARAAAAAAAAAAAD////////7e/v+/v/qte+9Xr9aq22ta1W1JUqSqSkpEiFKEBAhVAIQQARERAAAAAAAAP//////////v/vf2/3etevr6u1dVVVVbqqUqVVKpVTEihClRUogIAURARAQAAAAAAAA////////993u3/t/d3Xevr1fdtVWqq2y21KqSSqVSlEgpQiSEICEQAAgAQAAAAAAAAD////////+9//+7/37r3dr1/W7VbVttVtVVSVVUlSlREoIUiSFKAAICIhAIAAAAAAAAP////////v/d2+/39162t16rt1tVbbWqq0qqqqpUpUREVIEiFBCIiCgAgkEAAAAAAAA////////7739+/33d9e396/3aqraqqrVaqSUkkqqVMpEBKhCipAIAgIgIBAAAAAAAAD/////////79//73/6vd1a9Vv9tq1VW1tWqqpVKklSQJKpEpQgISCICAEAgAAAAAAAAP////////t/f26/7d/rd7dfvVaq1bbVarVSUqlVVUqVCEJEIpVEACBAiAoAAAAAAAAA////////7/v3//u/9V7a7errutVW1VqtqpVKlUkqqqBSkJFIQhAJAQIAgCQAAAAAAAD/////////v927/v7+9b9+v17tW2qra1VbUqlKVVJUioQlCBKUoIAEECQggAAAAAAAAP////////3t//7f99Wv6tXq9batWrVVatVKVSlSqUqkURBSoCECJEAAgAQAAAAAAAAA////////9/++7/e/f3q3u1+vbbWrVq2tWqqSpSpKpUkIpQkKiFAAESQJECQAAAAAAAD/////////e/f7vvv1323f9Xr61VWq1VbWlVSqpSpUgkUIpFElAREAACBBAAAAAAAAAP////////vff3/7797q+2qvr61Wtra2tVqoqpSUpVJUKFIRCJCoAEkRAAQQAAAAAAAA////////7/3t7u/+912u3vV1dqra2tVVqqaSUqqqlUFChKSlChCJAAAJEEAAAAAAAAD////////+7///v3v699u1v9/dtVVVWtq1UUqqpVJVKhQiCBBRQgAESSAABAAAAAAAAP////////v/v3b977+tdv9qtWqtq1ara1aVKpUqSqSEoUiipQQgJCAAAkIQAAAAAAAA////////77v33/f/9Xu9qt3vvWq1atVVaqqpUqlVKqgUJRRAqUiAgkRICIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAgAAIAACAAAgAAMAADAAAwAAMAADAABwAAcAAHAABwAAcAAHgAB4AAeAAHgAB4AAIAACAAAgAAIAACAAAwAAMAADAAAwAAMAAHAABwAAcAAHAABwAAeAAHgAB4AAeAAHgAAgAAIAACAAAgAAIAADAAAwAAMAADAAAwAAcAAHAABwAAcAAHAAB4AAeAAHgAB4AAeAACAAAgAAIAACAAAgAAMAADAAAwAAMAADAABwAAcAAHAABwAAcAAHgAB4AAeAAHgAB4AAIAACAAAgAAIAACAAAwAAMAADAAAwAAMAAHAABwAAcAAHAABwAAeAAHgAB4AAeAAHgAAgAAIAACAAAgAAIAADAAAwAAMAADAAAwAAcAAHAABwAAcAAHAAB4AAeAAHgAB4AAeAACAAAgAAIAACAAAgAAMAADAAAwAAMAADAABwAAcAAHAABwAAcAAHgAB4AAeAAHgAB4AAIAACAAAgAAIAACAAAwAAMAADAAAwAAMAAHAABwAAcAAHAABwAAeAAHgAB4AAeAAHgAAgAAIAACAAAgAAIAADAAAwAAMAADAAAwAAcAAHAABwAAcAAHAAB4AAeAAHgAB4AAeAACAAAgAAIAACAAAgAAMAADAAAwAAMAADAABwAAcAAHAABwAAcAAHgAB4AAeAAHgAB4AAIAACAAAgAAIAACAAAwAAMAADAAAwAAMAAHAABwAAcAAHAABwAAeAAHgAB4AAeAAHgAAgAAIAACAAAgAAIAADAAAwAAMAADAAAwAAcAAHAABwAAcAAHAAB4AAeAAHgAB4AAeAACAAAgAAIAACAAAgAAMAADAAAwAAMAADAABwAAcAAHAABwAAcAAHgAB4AAeAAHgAB4AAIAACAAAgAAIAACAAAwAAMAADAAAwAAMAAHAABwAAcAAHAABwAAeAAHgAB4AAeAAHgAAgAAIAACAAAgAAIAADAAAwAAMAADAAAwAAcAAHAABwAAcAAHAAB4AAeAAHgAB4AAeAACAAAgAAIAACAAAgAAMAADAAAwAAMAADAABwAAcAAHAABwAAcAAHgAB4AAeAAHgAB4AAIAACAAAgAAIAACAAAwAAMAADAAAwAAMAAHAABwAAcAAHAABwAAeAAHgAB4AAeAAHgAAgAAIAACAAAgAAIAADAAAwAAMAADAAAwAAcAAHAABwAAcAAHAAB4AAeAAHgAB4AAeAACAAAgAAIAACAAAgAAMAADAAAwAAMAADAABwAAcAAHAABwAAcAAHgAB4AAeAAHgAB4AAIAACAAAgAAIAACAAAwAAMAADAAAwAAMAAHAABwAAcAAHAABwAAeAAHgAB4AAeAAHgAAgAAIAACAAAgAAIAADAAAwAAMAADAAAwAAcAAHAABwAAcAAHAAB4AAeAAHgAB4AAeAACAAAgAAIAACAAAgAAMAADAAAwAAMAADAABwAAcAAHAABwAAcAAHgAB4AAeAAHgAB4AAIAACAAAgAAIAACAAAwAAMAADAAAwAAMAAHAABwAAcAAHAABwAAeAAHgAB4AAeAAHgAAgAAIAACAAAgAAIAADAAAwAAMAADAAAwAAcAAHAABwAAcAAHAAB4AAeAAHgAB4AAeAACAAAgAAIAACAAAgAAMAADAAAwAAMAADAABwAAcAAHAABwAAcAAHgAB4AAeAAHgAB4AAIAACAAAgAAIAACAAAwAAMAADAAAwAAMAAHAABwAAcAAHAABwAAeAAHgAB4AAeAAHgAAgAAIAACAAAgAAIAADAAAwAAMAADAAAwAAcAAHAABwAAcAAHAAB4AAeAAHgAB4AAeAACAAAgAAIAACAAAgAAMAADAAAwAAMAADAABwAAcAAHAABwAAcAAHgAB4AAeAAHgAB4AAIAACAAAgAAIAACAAAwAAMAADAAAwAAMAAHAABwAAcAAHAABwAAeAAHgAB4AAeAAHgAAgAAIAACAAAgAAIAADAAAwAAMAADAAAwAAcAAHAABwAAcAAHAAB4AAeAAHgAB4AAeAACAAAgAAIAACAAAgAAMAADAAAwAAMAADAABwAAcAAHAABwAAcAAHgAB4AAeAAHgAB4AAIAACAAAgAAIAACAAAwAAMAADAAAwAAMAAHAABwAAcAAHAABwAAeAAHgAB4AAeAAHgAAgAAIAACAAAgAAIAADAAAwAAMAADAAAwAAcAAHAABwAAcAAHAAB4AAeAAHgAB4AAeAACAAAgAAIAACAAAgAAMAADAAAwAAMAADAABwAAcAAHAABwAAcAAHgAB4AAeAAHgAB4AAIAACAAAgAAIAACAAAwAAMAADAAAwAAMAAHAABwAAcAAHAABwAAeAAHgAB4AAeAAHgAAgAAIAACAAAgAAIAADAAAwAAMAADAAAwAAcAAHAABwAAcAAHAAB4AAeAAHgAB4AAeAACAAAgAAIAACAAAgAAMAADAAAwAAMAADAABwAAcAAHAABwAAcAAHgAB4AAeAAHgAB4AAIAACAAAgAAIAACAAAwAAMAADAAAwAAMAAHAABwAAcAAHAABwAAeAAHgAB4AAeAAHgAAgAAIAACAAAgAAIAADAAAwAAMAADAAAwAAcAAHAABwAAcAAHAAB4AAeAAHgAB4AAeAACAAAgAAIAACAAAgAAMAADAAAwAAMAADAABwAAcAAHAABwAAcAAHgAB4AAeAAHgAB4AAIAACAAAgAAIAACAAAwAAMAADAAAwAAMAAHAABwAAcAAHAABwAAeAAHgAB4AAeAAHgAAgAAIAACAAAgAAIAADAAAwAAMAADAAAwAAcAAHAABwAAcAAHAAB4AAeAAHgAB4AAeAACAAAgAAIAACAAAgAAMAADAAAwAAMAADAABwAAcAAHAABwAAcAAHgAB4AAeAAHgAB4AAIAACAAAgAAIAACAAAwAAMAADAAAwAAMAAHAABwAAcAAHAABwAAeAAHgAB4AAeAAHgAAgAAIAACAAAgAAIAADAAAwAAMAADAAAwAAcAAHAABwAAcAAHAAB4AAeAAHgAB4AAeAACAAAgAAIAACAAAgAAMAADAAAwAAMAADAABwAAcAAHAABwAAcAAHgAB4AAeAAHgAB4AAIAACAAAgAAIAACAAAwAAMAADAAAwAAMAAHAABwAAcAAHAABwAAeAAHgAB4AAeAAHgAAgAAIAACAAAgAAIAADAAAwAAMAADAAAwAAcAAHAABwAAcAAHAAB4AAeAAHgAB4AAeAACAAAgAAIAACAAAgAAMAADAAAwAAMAADAABwAAcAAHAABwAAcAAHgAB4AAeAAHgAB4AAIAACAAAgAAIAACAAAwAAMAADAAAwAAMAAHAABwAAcAAHAABwAAeAAHgAB4AAeAAHgAAgAAIAACAAAgAAIAADAAAwAAMAADAAAwAAcAAHAABwAAcAAHAAB4AAeAAHgAB4AAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf/8AAAAAAAAAAAD////////////////4AAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAA////gAAAAAAAAAAP////////////////gAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAf////wAAAAAAAAAA////////////////+AAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAP/wAH/4AAAAAAAAADgAAAAAAAAAAAAAAA4AAAAAAAAAAAAEgAAAAAAAAAAAAAAAAAAD/gAAA/4AAAAAAAAAOAAAAAAAAAAAAAAADgAAAAAAAAAAAAiAAAAAAAAAAAAAAAAAAA/gAAAAP4AAAAAAAAA4AAAAAAAAAAAAAAAOAAAAAAAAAAAACEAAAAAAAAAAAAAAAAAAP4AAAAAP4AAAAAAAADgAAAAAAAAAAAAAAA4AAAAAAAAAAAAQQAAAAAAAAAAAAAAAAAD8AAAAAAH4AAAAAAAAOAAAAAAAAAAAAAAADgAAAAAAAAAAABAgAAAAAAAAAAAAAAAAAfAAAAAAAHwAAAAAAAA4AAAAAAAAAAAAAAAOAAAAAAAAAAAAICAAAAAAAAAAAAAAAAAHwAAAAAAAHwAAAAAAADgAAAAAAAAAAAAAAA4AAAAAAAAAAAAgEAAAAAAAAAAAAAAAAA+AAAAAAAAPgAAAAAAAOAAAAAAAAAAAAAAADgAAAAAAAAAAAEAQAAAAAAAAAAAAAAAAHgAAAAAAAAPAAAAAAAA4AAAAAAAAAAAAAAAOAAAAAAAAAAAAQAgAAAAAAAAAAAAAAAB8AAAAAAAAAfAAAAAAADgAAAAAAAAAAAAAAA4AAAAAAAAAAACACAAAAAAAAAAAAAAAAPgAAAAAAAAA+AAAAAAAOAAAAAAAAAAAAAAADgAAAAAAAAAAAIAEAAAAAAAAAAAAAAAB4AAAAAAAAAA8AAAAAAA4AAAAAAAAAAAAAAAOAAAAAAAAAAABAAQAAAAAAAAAAAAAAAPAAAAAAAAAAB4AAAAAADgAAAAAAAAAAAAAAA4AAAAAAAAAAAEAAgAAAAAAAAAAAAAAB4AAAAAAAAAADwAAAAAAOAAAAAAAAAAAAAAADgAAAAAAAAAAAgACAAAAAAAAAAAAAAAPAAAAAAAAAAAHgAAAAAA4AAAAAAAAAAAAAAAOAAAAAAAAAAACAAEAAAAAAAAAAAAAAA4AAAAAAAAAAAOAAAAAADgAAAAAAAAAAAAAAA4AAAAAAAAAAAQAAQAAAAAAAAAAAAAAHAAAAAAAAAAAAcAAAAAAOAAAAAAAAAAAAAAADgAAAAAAAAAABAAAgAAAAAAAAAAAAAA8AAAAAAAAAAAB4AAAAAA4AAAAAAAAAAAAAAAOAAAAAAAAAAAIAACAAAAAAAAAAAAAAHgAAAAAAAAAAADwAAAAADgAAAAAAAAAAAAAAA4AAAAAAAAAAAgAAEAAAAAAAAAAAAAAcAAAAAAAAAAAAHAAAAAAOAAAAAAAAAAAAAAADgAAAAAAAAAAEAAAQAAAAAAAAAAAAADgAAAAAAAAAAAAOAAAAAA4AAAAAAAAAAAAAAAOAAAAAAAAAAAQAAAgAAAAAAAAAAAAAeAAAAAAAAAAAAA8AAAAADgAAAAAAAAAAAAAAA4AAAAAAAAAACAAACAAAAAAAAAAAAABwAAAAAAAAAAAABwAAAAAOAAAAAAAAAAAAAAADgAAAAAAAAAAIAAAEAAAAAAAAAAAAAOAAAAAAAAAAAAADgAAAAA4AAAAAAAAAAAAAAAOAAAAAAAAAABAAAAQAAAAAAAAAAAAA4AAAAAAAAAAAAAOAAAAADgAAAAAAAAAAAAAAA4AAAAAAAAAAEAAAAgAAAAAAAAAAAAHAAAAAAAAAAAAAAcAAAAAOAAAAAAAAAAAAAAADgAAAAAAAAAAgAAACAAAAAAAAAAAAAcAAAAAAAAAAAAABwAAAAA4AAAAAAAAAAAAAAAOAAAAAAAAAACAAAAEAAAAAAAAAAAADgAAAAAAAAAAAAADgAAAADgAAAAAAAAAAAAAAA4AAAAAAAAAAQAAAAQAAAAAAAAAAAAOAAAAAAAAAAAAAAOAAAAAOAAAAAAAAAAAAAAADgAAAAAAAAABAAAAAgAAAAAAAAAAAB4AAAAAAAAAAAAAA8AAAAA4AAAAAAAAAAAAAAAOAAAAAAAAAAIAAAACAAAAAAAAAAAAHAAAAAAAAAAAAAABwAAAADgAAAAAAAAAAAAAAA4AAAAAAAAAAgAAAAEAAAAAAAAAAAAcAAAAAAAAAAAAAAHAAAAAOAAAAAAAAAAAAAAADgAAAAAAAAAEAAAAAQAAAAAAAAAAADgAAAAAAAAAAAAAAOAAAAA4AAAAAAAAAAAAAAAOAAAAAAAAAAQAAAAAgAAAAAAAAAAAOAAAAAAAAAAAAAAA4AAAADgAAAAAAAAAAAAAAA4AAAAAAAAACAAAAACAAAAAAAAAAAA4AAAAAAAAAAAAAADgAAAAOAAAAAAAAAAAAAAADgAAAAAAAAAIAAAAAEAAAAAAAAAAAHgAAAAAAAAAAAAAAPAAAAA4AAAAAAAAAAAAAAAOAAAAAAAAABAAAAAAQAAAAAAAAAAAcAAAAAAAAAAAAAAAcAAAADgAAAAAAAAAAAAAAA4AAAAAAAAAEAAAAAAgAAAAAAAAAABwAAAAAAAAAAAAAABwAAAAOAAAAAAAAAAAAAAADgAAAAAAAAAgAAAAACAAAAAAAAAAAHAAAAAAAAAAAAAAAHAAAAA4AAAAAAAAAAAAAAAOAAAAAAAAACAAAAAAEAAAAAAAAAAAcAAAAAAAAAAAAAAAcAAAADgAAAAAAAAAAAAAAA4AAAAAAAAAQAAAAAAQAAAAAAAAAADwAAAAAAAAAAAAAAB4AAAAOAAAAAAAAAAAAAAADgAAAAAAAABAAAAAAAgAAAAAAAAAAOAAAAAAAAAAAAAAADgAAAA4AAAAAAAAAAAAAAAOAAAAAAAAAIAAAAAACAAAAAAAAAAA4AAAAAAAAAAAAAAAOAAAADgAAAAAAAAAAAAAAA4AAAAAAAAAgAAAAAAEAAAAAAAAAADgAAAAAAAAAAAAAAA4AAAAOAAAAAAAAAAAAAAADgAAAAAAAAEAAAAAAAQAAAAAAAAAAOAAAAAAAAAAAAAAADgAAAA4AAAAAAAAAAAAAAAOAAAAAAAAAQAAAAAAAgAAAAAAAAAA4AAAAAAAAAAAAAAAOAAAADgAAAAAAAAAAAAAAA4AAAAAAAACAAAAAAACAAAAAAAAAADgAAAAAAAAAAAAAAA4AAAAOAAAAAAAAAAAAAAADgAAAAAAAAIAAAAAAAEAAAAAAAAAAOAAAAAAAAAAAAAAADgAAAA4AAAAAAAAAAAAAAAOAAAAAAAABAAAAAAAAQAAAAAAAAAA4AAAAAAAAAAAAAAAOAAAADgAAAAAAAAAAAAAAA4AAAAAAAAEAAAAAAAAgAAAAAAAAADgAAAAAAAAAAAAAAA4AAAAOAAAAAAAAAAAAAAADgAAAAAAAAgAAAAAAACAAAAAAAAAAOAAAAAAAAAAAAAAADgAAAA4AAAAAAAAAAAAAAAOAAAAAAAACAAAAAAAAEAAAAAAAAAA4AAAAAAAAAAAAAAAOAAAADgAAAAAAAAAAAAAAA4AAAAAAAAQAAAAAAAAQAAAAAAAAADgAAAAAAAAAAAAAAA4AAAAOAAAAAAAAAAAAAAADgAAAAAAABAAAAAAAAAgAAAAAAAAAOAAAAAAAAAAAAAAADgAAAA4AAAAAAAAAAAAAAAOAAAAAAAAIAAAAAAAACAAAAAAAAAA8AAAAAAAAAAAAAAAeAAAADgAAAAAAAAAAAAAAA4AAAAAAAAgAAAAAAAAEAAAAAAAAABwAAAAAAAAAAAAAABwAAAAOAAAAAAAAAAAAAAADgAAAAAAAEAAAAAAAAAQAAAAAAAAAHAAAAAAAAAAAAAAAHAAAAA4AAAAAAAAAAAAAAAOAAAAAAAAQAAAAAAAAAgAAAAAAAAAcAAAAAAAAAAAAAAAcAAAADgAAAAAAAAAAAAAAA4AAAAAAACAAAAAAAAACAAAAAAAAABwAAAAAAAAAAAAAABwAAAAOAAAAAAAAAAAAAAADgAAAAAAAIAAAAAAAAAEAAAAAAAAAHgAAAAAAAAAAAAAAPAAAAA4AAAAAAAAAAAAAAAOAAAAAAABAAAAAAAAAAQAAAAAAAAAOAAAAAAAAAAAAAAA4AAAADgAAAAAAAAAAAAAAA4AAAAAAAEAAAAAAAAAAgAAAAAAAAA4AAAAAAAAAAAAAADgAAAAOAAAAAAAAAAAAAAADgAAAAAAAgAAAAAAAAACAAAAAAAAADgAAAAAAAAAAAAAAOAAAAA4AAAAAAAAAAAAAAAOAAAAAAACAAAAAAAAAAEAAAAAAAAAHAAAAAAAAAAAAAABwAAAADgAAAAAAAAAAAAAAA4AAAAAAAQAAAAAAAAAAQAAAAAAAAAcAAAAAAAAAAAAAAHAAAAAOAAAAAAAAAAAAAAADgAAAAAABAAAAAAAAAAAgAAAAAAAAB4AAAAAAAAAAAAAA8AAAAA4AAAAAAAAAAAAAAAOAAAAAAAIAAAAAAAAAACAAAAAAAAADgAAAAAAAAAAAAADgAAAADgAAAAAAAAAAAAAAA4AAAAAAAgAAAAAAAAAAEAAAAAAAAAOAAAAAAAAAAAAAAOAAAAAOAAAAAAAAAAAAAAADgAAAAAAEAAAAAAAAAAAQAAAAAAAAAcAAAAAAAAAAAAABwAAAAA4AAAAAAAAAAAAAAAOAAAAAAAQAAAAAAAAAAAgAAAAAAAABwAAAAAAAAAAAAAHAAAAADgAAAAAAAAAAAAAAA4AAAAAACAAAAAAAAAAACAAAAAAAAADgAAAAAAAAAAAAA4AAAAAOAAAAAAAAAAAAAAADgAAAAAAIAAAAAAAAAAAEAAAAAAAAAOAAAAAAAAAAAAADgAAAAA4AAAAAAAAAAAAAAAOAAAAAABAAAAAAAAAAAAQAAAAAAAAAcAAAAAAAAAAAAAcAAAAADgAAAAAAAAAAAAAAA4AAAAAAEAAAAAAAAAAAAgAAAAAAAAB4AAAAAAAAAAAADwAAAAAOAAAAAAAAAAAAAAADgAAAAAAgAAAAAAAAAAACAAAAAAAAADgAAAAAAAAAAAAOAAAAAA4AAAAAAAAAAAAAAAOAAAAAACAAAAAAAAAAAAEAAAAAAAAAHAAAAAAAAAAAABwAAAAADgAAAAAAAAAAAAAAA4AAAAAAQAAAAAAAAAAAAQAAAAAAAAAeAAAAAAAAAAAAPAAAAAAOAAAAAAAAAAAAAAADgAAAAABAAAAAAAAAAAAAgAAAAAAAAA8AAAAAAAAAAAB4AAAAAA4AAAAAAAAAAAAAAAOAAAAAAIAAAAAAAAAAAACAAAAAAAAABwAAAAAAAAAAAHAAAAAADgAAAAAAAAAAAAAAA4AAAAAAgAAAAAAAAAAAAEAAAAAAAAADgAAAAAAAAAAA4AAAAAAOAAAAAAAAAAAAAAADgAAAAAEAAAAAAAAAAAAAQAAAAAAAAAPAAAAAAAAAAAHgAAAAAA4AAAAAAAAAAAAAAAOAAAAAAQAAAAAAAAAAAAAgAAAAAAAAAeAAAAAAAAAAA8AAAAAADgAAAAAAAAAAAAAAA4AAAAACAAAAAAAAAAAAACAAAAAAAAAA8AAAAAAAAAAHgAAAAAAOAAAAAAAAAAAAAAADgAAAAAIAAAAAAAAAAAAAEAAAAAAAAAB4AAAAAAAAAA8AAAAAAA4AAAAAAAAAAAAAAAOAAAAABAAAAAAAAAAAAAAQAAAAAAAAAD4AAAAAAAAAPgAAAAAADgAAAAAAAAAAAAAAA4AAAAAEAAAAAAAAAAAAAAgAAAAAAAAAHwAAAAAAAAB8AAAAAAAOAAAAAAAAAAAAAAADgAAAAAgAAAAAAAAAAAAACAAAAAAAAAAHgAAAAAAAAPAAAAAAAA4AAAAAAAAAAAAAAAOAAAAACAAAAAAAAAAAAAAEAAAAAAAAAAPgAAAAAAAD4AAAAAAADgAAAAAAAAAAAAAAA4AAAAAQAAAAAAAAAAAAAAQAAAAAAAAAAfAAAAAAAAfAAAAAAAAOAAAAAAAAAAAAAAADgAAAABAAAAAAAAAAAAAAAgAAAAAAAAAAfAAAAAAAHwAAAAAAAA4AAAAAAAAAAAAAAAOAAAAAIAAAAAAAAAAAAAACAAAAAAAAAAA/AAAAAAB+AAAAAAAADgAAAAAAAAAAAAAAA4AAAAAgAAAAAAAAAAAAAAEAAAAAAAAAAA/gAAAAA/gAAAAAAAAOAAAAAAAAAAAAAAADgAAAAEAAAAAAAAAAAAAAAQAAAAAAAAAAA/gAAAAP4AAAAAAAAA4AAAAAAAAAAAAAAAOAAAAAQAAAAAAAAAAAAAAAgAAAAAAAAAAA/4AAAP+AAAAAAAAADgAAAAAAAAAAAAAAA4AAAACAAAAAAAAAAAAAAACAAAAAAAAAAAA//AAf/gAAAAAAAAAOAAAAAAAAAAAAAAADgAAAAIAAAAAAAAAAAAAAAEAAAAAAAAAAAAf////wAAAAAAAAAA////////////////+AAAABAAAAAAAAAAAAAAAAQAAAAAAAAAAAAP///4AAAAAAAAAAD////////////////4AAAAEAAAAAAAAAAAAAAAAgAAAAAAAAAAAAB//wAAAAAAAAAAAP////////////////gAAAA////////////////+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }];

  // js/ui/tx-ui.js
  var BAND = BAND_HF;
  var TX_AMPLITUDE = 3e4;
  var lcd = document.getElementById("lcd");
  var g = lcd.getContext("2d");
  var led = document.getElementById("led");
  var tx = new TxAudio();
  var images = [];
  var index = 0;
  var sending = null;
  var noteSending = null;
  function checkerBits() {
    const b = new Uint8Array(IMAGE_BYTES);
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++)
      if ((x >> 4) + (y >> 4) & 1) b[y * LINE_BYTES + (x >> 3)] |= 128 >> (x & 7);
    return b;
  }
  images.push({ name: "Checker", bits: checkerBits() });
  for (const s of SAMPLES) images.push({ name: s.name, bits: Uint8Array.from(atob(s.bits), (c) => c.charCodeAt(0)) });
  var SAMPLE_COUNT = images.length;
  var rgba = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  var LCD_W = 128;
  var LCD_H = 64;
  var SHEET_X = 3;
  var SHEET_Y = 8;
  var SHEET_BOTTOM = 63;
  var PANEL_X = 88;
  var INK = "#1a0c02";
  var BACK = "#fe8a2c";
  var previewCache = /* @__PURE__ */ new WeakMap();
  function previewOf(bits) {
    let pv = previewCache.get(bits);
    if (!pv) {
      pv = new Uint8Array(PREVIEW_BYTES);
      previewMake(bits, pv);
      previewCache.set(bits, pv);
    }
    return pv;
  }
  var FONT = new U8g2Font(HAXRCORP);
  var text = (str, x, y) => FONT.draw(g, x, y, str);
  var box = (x, y, w, h) => g.fillRect(x, y, w, h);
  function rframe3(x, y, w, h) {
    box(x + 3, y, w - 6, 1);
    box(x + 3, y + h - 1, w - 6, 1);
    box(x, y + 3, 1, h - 6);
    box(x + w - 1, y + 3, 1, h - 6);
    for (const [cx, cy, sx, sy] of [[x + 3, y + 3, -1, -1], [x + w - 4, y + 3, 1, -1], [x + 3, y + h - 4, -1, 1], [x + w - 4, y + h - 4, 1, 1]])
      for (const [dx, dy] of [[1, 3], [2, 2], [3, 1]]) box(cx + sx * dx, cy + sy * dy, 1, 1);
  }
  function progressBar(x, y, w, frac) {
    const h = 9;
    g.fillStyle = BACK;
    box(x + 1, y + 1, w - 2, h - 2);
    g.fillStyle = INK;
    rframe3(x, y, w, h);
    box(x + 1, y + 1, Math.round(Math.min(1, Math.max(0, frac)) * (w - 2)), h - 2);
  }
  function line(x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (; ; ) {
      box(x0, y0, 1, 1);
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
  function icon(ic, x, y) {
    const lb = ic.w >> 3;
    for (let r = 0; r < ic.h; r++) for (let c = 0; c < ic.w; c++)
      if (ic.bits[r * lb + (c >> 3)] >> 7 - (c & 7) & 1) box(x + c, y + r, 1, 1);
  }
  function drawUnderLayer() {
    g.fillStyle = INK;
    icon(DOLPHIN_DONE, SHEET_X, LCD_H - DOLPHIN_DONE.h);
    const t = "Sent!", tw = FONT.width(t);
    const bx = SHEET_X + 6, by = 1, bw = tw + 8, bh = 12;
    rframe3(bx, by, bw, bh);
    text(t, bx + 4, by + 9);
    const tx2 = bx + bw - 6;
    g.fillStyle = BACK;
    line(tx2 - 4, by + bh - 1, tx2, by + bh - 1);
    g.fillStyle = INK;
    line(tx2 - 5, by + bh - 1, tx2 + 2, by + bh + 3);
    line(tx2 + 1, by + bh - 1, tx2 + 2, by + bh + 3);
  }
  var mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  function rbox(x, y, w, h) {
    box(x + 2, y, w - 4, h);
    box(x + 1, y + 1, w - 2, h - 2);
    box(x, y + 2, w, h - 4);
  }
  function drawPanel(st) {
    g.fillStyle = INK;
    box(PANEL_X - 3, 0, 1, LCD_H);
    if (!st) {
      text("Ready", PANEL_X, 9);
      const i = passInfo(images[index]), mode = i.coded ? "zip" : "raw", pw = FONT.width(mode) + 6;
      rbox(PANEL_X, 13, pw, 11);
      g.fillStyle = BACK;
      text(mode, PANEL_X + 3, 22);
      g.fillStyle = INK;
      text(mmss(i.seconds), PANEL_X, 35);
      return;
    }
    text(st.label, PANEL_X, 9);
    progressBar(PANEL_X, 12, LCD_W - PANEL_X, st.frac);
    g.fillStyle = INK;
    if (st.doneS != null) {
      text(mmss(st.doneS), PANEL_X, 32);
      return;
    }
    const pct = st.frames > 200 ? (Math.floor(st.frac * 1e3) / 10).toFixed(1) : String(Math.floor(st.frac * 100));
    text(pct + "%", PANEL_X, 32);
    text("~" + mmss(Math.max(0, st.leftS)), PANEL_X, 42);
  }
  var INK_RGB = [26, 12, 2];
  var BACK_RGB = [254, 138, 44];
  function snap1bit() {
    const id = g.getImageData(0, 0, LCD_W, LCD_H), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const c = d[i] + d[i + 1] + d[i + 2] < 3 * 128 ? INK_RGB : BACK_RGB;
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
      d[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
  }
  function drawImage(bits, st = null) {
    g.fillStyle = BACK;
    g.fillRect(0, 0, LCD_W, LCD_H);
    const done = !!(st && st.doneS != null);
    const frac = st ? Math.min(1, st.frac) : 0;
    const y0 = Math.round(SHEET_Y - frac * (SHEET_Y + PREVIEW_H));
    if (done || st && y0 <= 0) drawUnderLayer();
    if (!done) {
      const top = Math.max(0, y0), bottom = Math.min(SHEET_BOTTOM, y0 + PREVIEW_H - 1);
      if (bottom >= top) {
        g.fillStyle = BACK;
        g.fillRect(SHEET_X, top, PREVIEW_W, bottom - top + 1);
      }
      const pv = previewOf(bits);
      g.fillStyle = INK;
      for (let y = 0; y < PREVIEW_H; y++) {
        const sy = y0 + y;
        if (sy < 0 || sy > SHEET_BOTTOM) continue;
        for (let x = 0; x < PREVIEW_W; x++)
          if (pv[y * PREVIEW_LINE_BYTES + (x >> 3)] >> 7 - (x & 7) & 1) g.fillRect(SHEET_X + x, sy, 1, 1);
      }
      g.fillRect(SHEET_X - 1, y0 - 1, PREVIEW_W + 2, 1);
      g.fillRect(SHEET_X - 1, y0 + PREVIEW_H, PREVIEW_W + 2, 1);
      g.fillRect(SHEET_X - 1, y0 - 1, 1, PREVIEW_H + 2);
      g.fillRect(SHEET_X + PREVIEW_W, y0 - 1, 1, PREVIEW_H + 2);
    }
    drawPanel(st);
    snap1bit();
  }
  drawImage(images[0].bits);
  var statusEl = document.getElementById("status");
  var say = (t) => {
    if (statusEl) statusEl.textContent = t;
  };
  var nameOf = () => images[index].name || "image";
  function stopTx() {
    tx.stop();
    sending = null;
    noteSending = null;
    led.setAttribute("fill", "#333");
  }
  async function decodeImage(file) {
    try {
      return await createImageBitmap(file);
    } catch (e) {
    }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img.naturalWidth ? img : null;
    } catch (e) {
      return null;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  function passInfo(img) {
    if (!img.info) {
      const { total, coded } = buildPhysical(img.bits, img.name);
      const us = bandLeaderSymbols(BAND) * bandSymbolUs(BAND) + (LOCK_FRAMES + total) * bandPhysUs(BAND);
      img.info = { coded, seconds: Math.round(us / 1e6) };
    }
    return img.info;
  }
  var chipsEl = document.getElementById("samples");
  var chips = [];
  function markChip() {
    chips.forEach((c, i) => c.classList.toggle("on", i === index));
  }
  function pick(i) {
    if (tx.playing) {
      const was = sending ? `"${images[sendingIndex].name}"` : noteSending ? "the note" : "the transmission";
      stopTx();
      index = i;
      markChip();
      say(`Stopped ${was}, sending "${nameOf()}".`);
      send();
      return;
    }
    index = i;
    markChip();
    drawImage(images[index].bits);
    say(`Picked "${nameOf()}". Press Send to transmit it.`);
  }
  function thumbOf(bits, tw, th) {
    const id = new ImageData(tw, th), sx = WIDTH / tw, sy = HEIGHT / th;
    for (let ty = 0; ty < th; ty++) for (let tx2 = 0; tx2 < tw; tx2++) {
      let white = 0, n = 0;
      for (let y = Math.floor(ty * sy); y < Math.floor((ty + 1) * sy); y++)
        for (let x = Math.floor(tx2 * sx); x < Math.floor((tx2 + 1) * sx); x++, n++)
          if (!(bits[y * LINE_BYTES + (x >> 3)] >> 7 - (x & 7) & 1)) white++;
      const v = Math.round(255 * white / n), o = (ty * tw + tx2) * 4;
      id.data[o] = id.data[o + 1] = id.data[o + 2] = v;
      id.data[o + 3] = 255;
    }
    return id;
  }
  if (chipsEl) {
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const btn = document.createElement("button");
      btn.className = "act sample";
      btn.type = "button";
      const th = document.createElement("canvas");
      th.width = 60;
      th.height = 36;
      th.getContext("2d").putImageData(thumbOf(images[i].bits, 60, 36), 0, 0);
      const label = document.createElement("span");
      label.textContent = images[i].name;
      btn.append(th, label);
      btn.addEventListener("click", () => pick(i));
      chipsEl.append(btn);
      chips.push(btn);
    }
    markChip();
  }
  async function loadFile(file) {
    const bmp = await decodeImage(file);
    if (!bmp) {
      say(`Can't open "${file.name}": this browser can't read that file as a picture.`);
      return;
    }
    const c = new OffscreenCanvas(WIDTH, HEIGHT);
    const cg = c.getContext("2d");
    cg.fillStyle = "#fff";
    cg.fillRect(0, 0, WIDTH, HEIGHT);
    const bw = bmp.naturalWidth || bmp.width, bh = bmp.naturalHeight || bmp.height;
    const s = Math.min(WIDTH / bw, HEIGHT / bh);
    const w = bw * s, h = bh * s;
    cg.drawImage(bmp, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
    const id = cg.getImageData(0, 0, WIDTH, HEIGHT);
    const bits = ditherRGBA(id.data);
    const was = sending ? images[sendingIndex].name : noteSending ? "the note" : null;
    images.push({ name: (file.name || "image").replace(/\.[^.]+$/, "").slice(0, NAME_MAX), bits });
    index = images.length - 1;
    markChip();
    if (tx.playing) {
      stopTx();
      say(`Stopped ${was && was !== "the note" ? `"${was}"` : was || "the transmission"}, sending "${nameOf()}".`);
      send();
    } else {
      drawImage(images[index].bits);
      say(`Loaded "${nameOf()}". Press Send to transmit it.`);
    }
  }
  function symbolSchedule(bits) {
    const { frames, total, coded } = buildPhysical(bits, images[index].name);
    const tones = [];
    for (let i = 0; i < bandLeaderSymbols(BAND); i++) tones.push({ t: leaderSymbol(i), sync: false });
    const lock = lockFrame();
    for (let f = 0; f < LOCK_FRAMES; f++) {
      tones.push({ t: -1, sync: true });
      for (let s = 0; s < bandSymbolsPerFrame(BAND); s++) tones.push({ t: frameSymbolBits(lock, 0, s, bandBits(BAND)), sync: false });
    }
    for (let f = 0; f < total; f++) {
      tones.push({ t: -1, sync: true });
      for (let s = 0; s < bandSymbolsPerFrame(BAND); s++) tones.push({ t: frameSymbolBits(frames, f * FRAME_BYTES, s, bandBits(BAND)), sync: false });
    }
    return { tones, coded, total };
  }
  function ledColor(entry) {
    if (!entry) return "#333";
    if (entry.sync) return "#e33";
    const b = 80 + entry.t * 28;
    return `rgb(40,60,${b})`;
  }
  var sendingIndex = 0;
  async function send() {
    if (tx.playing) {
      say(sending ? `Already sending "${images[sendingIndex].name}". Stop it first, or load another picture to replace it.` : "A note is on the air. Stop it first.");
      return;
    }
    sendingIndex = index;
    const bits = images[index].bits;
    const sr = tx.sampleRate;
    const samples = new Modem(sr, TX_AMPLITUDE).setBand(BAND).image(bits, images[index].name);
    const { tones: sched, coded, total } = symbolSchedule(bits);
    const symDur = bandSymbolUs(BAND) / 1e6, syncDur = bandSyncUs(BAND) / 1e6;
    sending = { bits, sched, symDur, syncDur, coded, total };
    if (!statusEl || !statusEl.textContent.startsWith("Stopped")) say(`Sending "${nameOf()}".`);
    const sentName = nameOf();
    await tx.play(samples, () => {
      const doneS = Math.round(tx.duration);
      sending = null;
      led.setAttribute("fill", "#333");
      drawImage(bits, { label: "Done", frac: 1, doneS });
      say(`Sent "${sentName}".`);
    });
  }
  function frameFor(t) {
    let acc = 0;
    for (let i = 0; i < sending.sched.length; i++) {
      const d = sending.sched[i].sync ? sending.syncDur : sending.symDur;
      if (t < acc + d) return i;
      acc += d;
    }
    return sending.sched.length - 1;
  }
  function tick() {
    if (noteSending && tx.playing) {
      const t = tx.elapsed();
      drawNote(noteSending, { label: "TX note", frac: Math.min(1, t / tx.duration), leftS: tx.duration - t, frames: 0 });
    } else if (sending && tx.playing) {
      const t = tx.elapsed();
      const i = frameFor(t);
      led.setAttribute("fill", ledColor(sending.sched[i]));
      const frac = Math.min(1, t / tx.duration);
      drawImage(sending.bits, { label: sending.coded ? "TX zip" : "TX raw", frac, leftS: tx.duration - t, frames: sending.total });
    }
    requestAnimationFrame(tick);
  }
  tick();
  var act = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  };
  var browse = (step) => {
    if (tx.playing) {
      say("Stop the transmission to switch pictures, or load another picture to replace it.");
      return;
    }
    index = (index + step + images.length) % images.length;
    drawImage(images[index].bits);
    markChip();
    say("");
  };
  act("right", () => browse(1));
  act("left", () => browse(-1));
  act("ok", send);
  document.getElementById("send").addEventListener("click", send);
  document.getElementById("stop").addEventListener("click", () => {
    const was = sending ? `"${images[sendingIndex].name}"` : noteSending ? "the note" : null;
    stopTx();
    drawImage(images[index].bits);
    say(was ? `Stopped ${was}.` : "");
  });
  document.getElementById("file").addEventListener("change", (e) => {
    if (e.target.files[0]) loadFile(e.target.files[0]);
  });
  window.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("textarea, input, select")) return;
    if (e.key === "ArrowRight") document.getElementById("right").dispatchEvent(new Event("click"));
    else if (e.key === "ArrowLeft") document.getElementById("left").dispatchEvent(new Event("click"));
    else if (e.key === "Enter" || e.key === " ") send();
  });
  var CYR = ["a", "b", "v", "g", "d", "e", "zh", "z", "i", "y", "k", "l", "m", "n", "o", "p", "r", "s", "t", "u", "f", "h", "ts", "ch", "sh", "sch", "", "y", "", "e", "yu", "ya"];
  function translit(text2) {
    let out = "";
    for (const ch of text2) {
      const cp = ch.codePointAt(0);
      if (cp < 128) out += ch;
      else if (cp >= 1072 && cp <= 1103) out += CYR[cp - 1072];
      else if (cp >= 1040 && cp <= 1071) out += CYR[cp - 1040];
      else if (cp === 1105 || cp === 1025) out += "e";
    }
    return out;
  }
  function noteName(text2) {
    const s = translit(text2.split("\n")[0] || "").slice(0, NOTE_NAME_MAX).trim();
    return s || "note";
  }
  function wrapLines(str, maxW, maxLines) {
    const out = [];
    for (const para of str.split("\n")) {
      let line2 = "";
      for (const ch of para) {
        const cand = line2 + ch;
        if (FONT.width(cand) <= maxW) {
          line2 = cand;
          continue;
        }
        const sp = line2.lastIndexOf(" ");
        if (ch === " ") {
          out.push(line2);
          line2 = "";
        } else if (sp > 0) {
          out.push(line2.slice(0, sp));
          line2 = line2.slice(sp + 1) + ch;
        } else {
          out.push(line2);
          line2 = ch;
        }
        if (out.length >= maxLines) return out;
      }
      out.push(line2);
      if (out.length >= maxLines) return out;
    }
    return out;
  }
  function drawNote(str, st = null) {
    g.fillStyle = BACK;
    g.fillRect(0, 0, LCD_W, LCD_H);
    g.fillStyle = INK;
    const fx = 1, fy = 2, fw = PANEL_X - 5, fh = 50;
    box(fx, fy, fw, 1);
    box(fx, fy + fh - 1, fw, 1);
    box(fx, fy, 1, fh);
    box(fx + fw - 1, fy, 1, fh);
    const fh1 = FONT.height, lh = fh1 + 2, maxLines = Math.max(1, Math.floor((fh - 4) / lh));
    wrapLines(str, PANEL_X - 11, maxLines).forEach((ln, i) => text(ln, 4, fy + fh1 + i * lh));
    drawPanel(st);
    snap1bit();
  }
  var noteEl = document.getElementById("note-text");
  async function sendNote() {
    const text2 = (noteEl.value || "").slice(0, NOTE_MAX_CHARS);
    if (!text2) {
      say("Type a note first.");
      return;
    }
    if (tx.playing) {
      const was = sending ? `"${images[sendingIndex].name}"` : "the previous note";
      stopTx();
      say(`Stopped ${was}, sending the note.`);
    } else say("Sending the note.");
    const sr = tx.sampleRate;
    const samples = new Modem(sr, TX_AMPLITUDE).setBand(BAND).note(text2, noteName(text2));
    sending = null;
    noteSending = text2;
    led.setAttribute("fill", "#39f");
    await tx.play(samples, () => {
      noteSending = null;
      led.setAttribute("fill", "#333");
      drawImage(images[index].bits);
      say("Sent the note.");
    });
  }
  document.getElementById("send-note").addEventListener("click", sendNote);
  if (noteEl) noteEl.addEventListener("input", () => drawNote(noteEl.value));
})();
