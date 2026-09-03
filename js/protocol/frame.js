// Frame format, interleave, block codec, pass layout and buildPhysical.
// Mirror of common/sstv_frame.c.
import * as P from './params.js';
import { crc8 } from './crc8.js';
import { rsEncode, RsEncoder, rsDecodeErasures } from './rs.js';
import { codecEncode, codecDecode } from './codec.js';
import { previewMake, previewMakeTiny } from './preview.js';

export const hdr = (type, index) => ((type << P.FT_SHIFT) | (index & P.INDEX_MASK)) & 0xffff;
export const hdrType = (h) => h >> P.FT_SHIFT;
export const hdrIndex = (h) => h & P.INDEX_MASK;
export const segLine = (seg) => Math.floor(seg / P.SEGS_PER_LINE);
export const segByteOffset = (seg) => (seg % P.SEGS_PER_LINE) * P.SEG_BYTES;

export function frameBit(frame, off, index) { return (frame[off + (index >> 3)] >> (7 - (index & 7))) & 1; }
export function frameSymbol(frame, off, index) {
  let v = 0;
  for (let b = 0; b < P.BITS_PER_SYMBOL; b++) v = (v << 1) | frameBit(frame, off, index * P.BITS_PER_SYMBOL + b);
  return v;
}

// out[off .. off+FRAME_BYTES): header (big endian) + 26 payload + CRC-8 + 12 RS parity.
export function pack(h, payload, out, off = 0) {
  out[off] = (h >> 8) & 0xff;
  out[off + 1] = h & 0xff;
  for (let i = 0; i < P.PAYLOAD_BYTES; i++) out[off + 2 + i] = payload[i];
  out[off + P.DATA_BYTES - 1] = crc8(out.subarray(off, off + P.DATA_BYTES - 1), P.DATA_BYTES - 1);
  rsEncode(out.subarray(off, off + P.DATA_BYTES), P.DATA_BYTES, out, off + P.DATA_BYTES);
}

function check(buf) {
  const h = (buf[0] << 8) | buf[1];
  if (crc8(buf, P.DATA_BYTES - 1) !== buf[P.DATA_BYTES - 1]) return null;
  const type = hdrType(h), index = hdrIndex(h);
  if (type === P.FT_RAW && !(index < P.NUM_SEGS)) return null;
  if (type === P.FT_CODED && !(index < P.MAX_BLOCKS)) return null;
  if (type === P.FT_PARITY && !(index < P.OUTER_GROUPS_MAX * P.OUTER_PARITY)) return null;
  if (type !== P.FT_RAW && type !== P.FT_CODED && type !== P.FT_PARITY && type !== P.FT_META) return null;
  const payload = buf.slice(2, 2 + P.PAYLOAD_BYTES);
  return { h, payload };
}

// byteConf: Float32Array of per-byte confidence in [0,1] or null. Returns {ok, h, payload, corrected}.
export function unpackSoft(inBuf, off, byteConf) {
  let order = null;
  if (byteConf) {
    order = [];
    for (let i = 0; i < P.FRAME_BYTES; i++) {
      let j = order.length; order.push(i);
      while (j > 0 && byteConf[order[j - 1]] > byteConf[i]) { order[j] = order[j - 1]; j--; }
      order[j] = i;
    }
  }
  const maxE = byteConf ? P.PARITY_BYTES : 0;
  const buf = new Uint8Array(P.FRAME_BYTES);
  for (let e = 0; e <= maxE; e += 2) {
    for (let i = 0; i < P.FRAME_BYTES; i++) buf[i] = inBuf[off + i];
    const c = rsDecodeErasures(buf, P.FRAME_BYTES, order, e);
    if (c >= 0) {
      const r = check(buf);
      if (r) return { ok: true, h: r.h, payload: r.payload, corrected: c };
    }
  }
  const r = check(inBuf.subarray(off, off + P.FRAME_BYTES)) || { h: (inBuf[off] << 8) | inBuf[off + 1], payload: inBuf.slice(off + 2, off + 2 + P.PAYLOAD_BYTES) };
  return { ok: false, h: r.h, payload: r.payload, corrected: -1 };
}

export function interleave(logical, physical) {
  for (let i = 0; i < P.ILEAVE; i++)
    for (let j = 0; j < P.FRAME_BYTES; j++)
      physical[j * P.ILEAVE + i] = logical[i * P.FRAME_BYTES + j];
}
export function deinterleave(physical, off, logical) {
  for (let i = 0; i < P.ILEAVE; i++)
    for (let j = 0; j < P.FRAME_BYTES; j++)
      logical[i * P.FRAME_BYTES + j] = physical[off + j * P.ILEAVE + i];
}
export function deinterleaveConf(physConf, logConf) {
  for (let i = 0; i < P.ILEAVE; i++)
    for (let j = 0; j < P.FRAME_BYTES; j++)
      logConf[i * P.FRAME_BYTES + j] = physConf[j * P.ILEAVE + i];
}

// ---- coded block payload ----
export function blockPack(imageBits, firstLine, payload) {
  payload.fill(0, 0, P.BLOCK_PAYLOAD);
  payload[1] = firstLine & 0xff;
  let pos = 2, count = 0;
  let ref = null;
  const rec = new Uint8Array(P.CODEC_MAX_RECORD);
  const row = new Uint8Array(P.LINE_BYTES);
  for (let y = firstLine; y < P.HEIGHT; y++) {
    for (let i = 0; i < P.LINE_BYTES; i++) row[i] = imageBits[y * P.LINE_BYTES + i];
    const n = codecEncode(row, ref, rec, 0);
    if (pos + n > P.BLOCK_PAYLOAD) break;
    payload.set(rec.subarray(0, n), pos);
    pos += n; count++;
    ref = imageBits.subarray(y * P.LINE_BYTES, y * P.LINE_BYTES + P.LINE_BYTES);
  }
  payload[0] = count & 0xff;
  return count;
}

export function blockUnpack(payload, off, validBytes, cb) {
  if (validBytes < 2) return 0;
  const count = payload[off], line = payload[off + 1];
  let pos = 2, delivered = 0;
  const prev = new Uint8Array(P.LINE_BYTES), row = new Uint8Array(P.LINE_BYTES);
  let ref = null;
  for (let k = 0; k < count && line + k < P.HEIGHT; k++) {
    if (pos + 1 > validBytes) break;
    const n = codecDecode(payload, off + pos, P.BLOCK_PAYLOAD - pos, ref, row);
    if (n < 0 || pos + n > validBytes) break;
    pos += n;
    cb(line + k, row);
    delivered++;
    prev.set(row); ref = prev;
  }
  return delivered;
}

// ---- pass layout ----
export const passIntro = (coded) => P.ILEAVE + (coded ? P.INTRO_FRAMES_CODED : P.INTRO_FRAMES);
export function passPosition(h, i) {
  const type = hdrType(h), index = hdrIndex(h);
  if (type === P.FT_RAW) return P.ILEAVE + P.INTRO_FRAMES + index;
  if (type === P.FT_CODED) return (index + 1) * P.ILEAVE + i;
  return -1;
}
export function passMetaPosition(subtype, index, i) {
  switch (subtype) {
    case P.META_START: return i;
    case P.META_TINY: return P.ILEAVE + index;
    case P.META_PREVIEW: return P.ILEAVE + P.TINY_CHUNKS + index;
    case P.META_SCHEDULE: return P.ILEAVE + P.INTRO_FRAMES + index;
    default: return -1;
  }
}
export function passGroups(dataFrames, intro) {
  if (dataFrames <= intro) return 1;
  return 1 + Math.floor((dataFrames - intro + P.OUTER_GROUP - 1) / P.OUTER_GROUP);
}
export function passGroupSize(dataFrames, intro, g) {
  if (g === 0) return dataFrames < intro ? dataFrames : intro;
  const start = intro + (g - 1) * P.OUTER_GROUP;
  const left = dataFrames - start;
  if (left <= 0) return 0;
  return left < P.OUTER_GROUP ? left : P.OUTER_GROUP;
}
export const passGroupBase = (intro, g) => (g === 0 ? 0 : intro + (g - 1) * P.OUTER_GROUP);
export const passGroupOf = (pos, intro) => (pos < intro ? 0 : 1 + Math.floor((pos - intro) / P.OUTER_GROUP));
export function passTotal(dataFrames, intro) {
  return dataFrames + passGroups(dataFrames, intro) * P.OUTER_PARITY + P.ILEAVE;
}
export function passFrameKind(phys, dataFrames, intro) {
  let at = 0;
  for (let g = 0; g < passGroups(dataFrames, intro); g++) {
    const n = passGroupSize(dataFrames, intro, g);
    if (phys < at + n) return P.PASS_DATA;
    if (phys < at + n + P.OUTER_PARITY) return P.PASS_PARITY;
    at += n + P.OUTER_PARITY;
  }
  return P.PASS_END;
}
export function passDataBefore(phys, dataFrames, intro) {
  let at = 0, data = 0;
  for (let g = 0; g < passGroups(dataFrames, intro); g++) {
    const n = passGroupSize(dataFrames, intro, g);
    if (phys <= at + n) return data + (phys - at);
    data += n; at += n + P.OUTER_PARITY;
    if (phys <= at) return data;
  }
  return data;
}

// ---- pass emitter + buildPhysical ----
class Emitter {
  constructor(out, linesAfter) {
    this.out = out; this.linesAfter = linesAfter;
    this.blocks = 0; this.dataFrames = 0;
    this.enc = Array.from({ length: P.PAYLOAD_BYTES }, () => new RsEncoder());
    this.groupFrames = 0; this.group = 0;
  }
  block(logical, before, after) {
    interleave(logical, this.out.subarray(this.blocks * P.ILEAVE * P.FRAME_BYTES));
    if (this.linesAfter)
      for (let f = 0; f < P.ILEAVE; f++)
        this.linesAfter[this.blocks * P.ILEAVE + f] = (f === P.ILEAVE - 1 ? after : before) & 0xff;
    this.blocks++;
  }
  closeGroup() {
    if (this.groupFrames === 0) return;
    const logical = new Uint8Array(P.ILEAVE * P.FRAME_BYTES);
    const payload = Array.from({ length: P.ILEAVE }, () => new Uint8Array(P.PAYLOAD_BYTES));
    for (let j = 0; j < P.OUTER_PARITY; j += P.ILEAVE) {
      for (let k = 0; k < P.PAYLOAD_BYTES; k++) {
        const p = new Uint8Array(P.OUTER_PARITY);
        this.enc[k].finish(p, 0);
        for (let i = 0; i < P.ILEAVE; i++) payload[i][k] = p[j + i];
      }
      for (let i = 0; i < P.ILEAVE; i++)
        pack(hdr(P.FT_PARITY, this.group * P.OUTER_PARITY + j + i), payload[i], logical, i * P.FRAME_BYTES);
      this.block(logical, 0, 0);
    }
    for (let k = 0; k < P.PAYLOAD_BYTES; k++) this.enc[k] = new RsEncoder();
    this.groupFrames = 0; this.group++;
  }
  dataBlock(logical, before, after) {
    this.block(logical, before, after);
    for (let i = 0; i < P.ILEAVE; i++) {
      const base = i * P.FRAME_BYTES + 2;
      for (let k = 0; k < P.PAYLOAD_BYTES; k++) this.enc[k].feed(logical[base + k]);
      this.groupFrames++; this.dataFrames++;
    }
    if (this.groupFrames === P.OUTER_GROUP) this.closeGroup();
  }
}

// Returns {frames: Uint8Array(total*FRAME_BYTES), linesAfter: Uint8Array(total), total, coded}.
export function buildPhysical(imageBits, name) {
  const out = new Uint8Array(P.MAX_FRAMES * P.FRAME_BYTES);
  const linesAfter = new Uint8Array(P.MAX_FRAMES);
  const payload = new Uint8Array(P.BLOCK_PAYLOAD);

  const schedule = new Uint8Array(P.MAX_BLOCKS);
  let codedBlocks = 0;
  for (let line = 0; line < P.HEIGHT && codedBlocks < P.MAX_BLOCKS;) {
    const n = blockPack(imageBits, line, payload);
    if (n <= 0) break;
    schedule[codedBlocks] = n; line += n; codedBlocks++;
  }
  const rawFrames = P.NUM_SEGS;
  const useCoded = (codedBlocks * P.ILEAVE) <= P.CODED_MIN_GAIN * rawFrames && codedBlocks <= P.MAX_CODED_BLOCKS;

  const em = new Emitter(out, linesAfter);
  const dataBlocks = useCoded ? codedBlocks : P.NUM_SEGS / P.ILEAVE;
  const intro = useCoded ? P.INTRO_FRAMES_CODED : P.INTRO_FRAMES;
  const dataFrames = P.ILEAVE + intro + dataBlocks * P.ILEAVE;
  const total = passTotal(dataFrames, passIntro(useCoded)) & 0xffff;
  const word = (total | (useCoded ? P.META_CODED_FLAG : 0)) & 0xffff;

  const logical = new Uint8Array(P.ILEAVE * P.FRAME_BYTES);
  const meta = new Uint8Array(P.PAYLOAD_BYTES);
  meta[0] = P.META_START; meta[1] = word & 0xff; meta[2] = (word >> 8) & 0xff;
  if (name) { const b = new TextEncoder().encode(name); for (let i = 0; i < Math.min(b.length, P.NAME_MAX); i++) meta[P.META_NAME_OFFSET + i] = b[i]; }
  for (let i = 0; i < P.ILEAVE; i++) pack(hdr(P.FT_META, 0), meta, logical, i * P.FRAME_BYTES);
  em.dataBlock(logical, 0, 0);

  const tiny = new Uint8Array(P.TINY_BYTES); previewMakeTiny(imageBits, tiny);
  for (let i = 0; i < P.ILEAVE; i++) {
    payload.fill(0); payload[0] = P.META_TINY;
    payload.set(tiny.subarray(i * P.PREVIEW_CHUNK, i * P.PREVIEW_CHUNK + P.PREVIEW_CHUNK), 1);
    pack(hdr(P.FT_META, i), payload.subarray(0, P.PAYLOAD_BYTES), logical, i * P.FRAME_BYTES);
  }
  em.dataBlock(logical, 0, 0);

  const preview = new Uint8Array(P.PREVIEW_BYTES); previewMake(imageBits, preview);
  for (let chunk = 0; chunk < P.PREVIEW_CHUNKS; chunk += P.ILEAVE) {
    for (let i = 0; i < P.ILEAVE; i++) {
      const c = chunk + i;
      payload.fill(0); payload[0] = P.META_PREVIEW;
      if (c < P.PREVIEW_CHUNKS) {
        const o = c * P.PREVIEW_CHUNK;
        const n = Math.min(P.PREVIEW_BYTES - o, P.PREVIEW_CHUNK);
        payload.set(preview.subarray(o, o + n), 1);
      }
      pack(hdr(P.FT_META, c), payload.subarray(0, P.PAYLOAD_BYTES), logical, i * P.FRAME_BYTES);
    }
    em.dataBlock(logical, 0, 0);
  }

  if (useCoded) {
    for (let i = 0; i < P.ILEAVE; i++) {
      payload.fill(0); payload[0] = P.META_SCHEDULE;
      payload.set(schedule.subarray(i * P.PREVIEW_CHUNK, i * P.PREVIEW_CHUNK + P.PREVIEW_CHUNK), 1);
      pack(hdr(P.FT_META, i), payload.subarray(0, P.PAYLOAD_BYTES), logical, i * P.FRAME_BYTES);
    }
    em.dataBlock(logical, 0, 0);
    em.closeGroup();
    let line = 0;
    while (line < P.HEIGHT) {
      const n = blockPack(imageBits, line, payload);
      if (n <= 0) break;
      const index = Math.floor(em.dataFrames / P.ILEAVE) - 1;
      for (let i = 0; i < P.ILEAVE; i++)
        pack(hdr(P.FT_CODED, index), payload.subarray(i * P.PAYLOAD_BYTES, i * P.PAYLOAD_BYTES + P.PAYLOAD_BYTES), logical, i * P.FRAME_BYTES);
      line += n;
      em.dataBlock(logical, line - n, line);
    }
  } else {
    em.closeGroup();
    for (let seg = 0; seg < P.NUM_SEGS; seg += P.ILEAVE) {
      for (let i = 0; i < P.ILEAVE; i++) {
        const s = seg + i;
        payload.fill(0);
        const src = segLine(s) * P.LINE_BYTES + segByteOffset(s);
        for (let b = 0; b < P.SEG_BYTES; b++) payload[b] = imageBits[src + b];
        pack(hdr(P.FT_RAW, s), payload.subarray(0, P.PAYLOAD_BYTES), logical, i * P.FRAME_BYTES);
      }
      em.dataBlock(logical, seg / 2, seg / 2 + 2);
    }
  }
  em.closeGroup();
  meta[0] = P.META_END;
  for (let i = 0; i < P.ILEAVE; i++) pack(hdr(P.FT_META, 1), meta, logical, i * P.FRAME_BYTES);
  em.block(logical, P.HEIGHT, P.HEIGHT);

  const total2 = em.blocks * P.ILEAVE;
  return { frames: out.subarray(0, total2 * P.FRAME_BYTES), linesAfter: linesAfter.subarray(0, total2), total: total2, coded: useCoded };
}
