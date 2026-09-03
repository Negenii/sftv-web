// Lossless per-line 1-bit codec (RAW / RLE / XOR-RLE). Mirror of common/sstv_codec.c.
import { LINE_BYTES, CODEC_RAW, CODEC_RLE, CODEC_XOR_RLE } from './params.js';

const ROW_BITS = LINE_BYTES * 8;
const getBit = (row, i) => (row[i >> 3] >> (7 - (i & 7))) & 1;

function rleEncode(row, out, limit) {
  let n = 0, colour = 0, i = 0;
  while (i < ROW_BITS) {
    let run = 0;
    while (i < ROW_BITS && getBit(row, i) === colour && run < 255) { run++; i++; }
    if (n >= limit) return limit + 1;
    out[n++] = run;
    if (run === 255) { if (n >= limit) return limit + 1; out[n++] = 0; continue; }
    colour ^= 1;
  }
  return n;
}

function rleDecode(inBuf, len, row) {
  row.fill(0, 0, LINE_BYTES);
  let i = 0, colour = 0;
  for (let k = 0; k < len; k++) {
    const run = inBuf[k];
    if (i + run > ROW_BITS) return -1;
    if (colour) for (let b = 0; b < run; b++) row[(i + b) >> 3] |= 0x80 >> ((i + b) & 7);
    i += run;
    if (run === 255) { if (k + 1 >= len || inBuf[k + 1] !== 0) return -1; k++; continue; }
    colour ^= 1;
  }
  return i === ROW_BITS ? 0 : -1;
}

// Encodes `row` (ref may be null). Writes to out; returns record length (1 + payload).
export function codecEncode(row, ref, out, outOff = 0) {
  let bestMode = CODEC_RAW, bestLen = LINE_BYTES;
  const cand = new Uint8Array(64);
  let n = rleEncode(row, cand, 63);
  if (n < bestLen) { bestLen = n; bestMode = CODEC_RLE; out.set(cand.subarray(0, n), outOff + 1); }
  if (ref) {
    const buf = new Uint8Array(LINE_BYTES);
    for (let i = 0; i < LINE_BYTES; i++) buf[i] = row[i] ^ ref[i];
    n = rleEncode(buf, cand, 63);
    if (n < bestLen) { bestLen = n; bestMode = CODEC_XOR_RLE; out.set(cand.subarray(0, n), outOff + 1); }
  }
  if (bestMode === CODEC_RAW) {
    out.set(row.subarray(0, LINE_BYTES), outOff + 1);
    out[outOff] = ((CODEC_RAW << 6) | LINE_BYTES) & 0xff;
  } else {
    out[outOff] = ((bestMode << 6) | (bestLen & 0x3f)) & 0xff;
  }
  return 1 + bestLen;
}

// Decodes one record from in[inOff..inOff+avail). Returns bytes consumed, or -1.
export function codecDecode(inBuf, inOff, avail, ref, row) {
  if (avail < 1) return -1;
  const mode = inBuf[inOff] >> 6;
  const len = inBuf[inOff] & 0x3f;
  if (len === 0 || avail < 1 + len) return -1;
  if (mode === CODEC_RAW) {
    if (len !== LINE_BYTES) return -1;
    for (let i = 0; i < LINE_BYTES; i++) row[i] = inBuf[inOff + 1 + i];
    return 1 + len;
  }
  if (rleDecode(inBuf.subarray(inOff + 1, inOff + 1 + len), len, row) < 0) return -1;
  if (mode === CODEC_XOR_RLE) { if (!ref) return -1; for (let i = 0; i < LINE_BYTES; i++) row[i] ^= ref[i]; }
  else if (mode !== CODEC_RLE) return -1;
  return 1 + len;
}
