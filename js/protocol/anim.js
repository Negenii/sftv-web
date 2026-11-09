// Animation stream decoder (version 3): mirror of the decoder half of common/sstv_anim.c. One
// LZMA-style binary range coder over the whole stream; every pixel's probability comes from 6
// coded neighbours in the frame and 5 pixels of its reference frame. Frames are XBM rows
// (stride (w + 7) >> 3, leftmost pixel in bit 0, 1 = black).
export const ANIM_VERSION = 3, ANIM_MAX_FRAMES = 120, ANIM_SEG = 16, ANIM_KEY = 0x7f, ANIM_DUP = 0x80;
const CTX = 1 << 12, PROB_BITS = 12, PROB_ONE = 1 << PROB_BITS, MOVE_BITS = 4, TOP = 1 << 24, FIXED = 8;

export const stride = (w) => (w + 7) >> 3;
export const frameBytes = (a) => stride(a.w) * a.h;
export const segs = (n) => Math.ceil(n / ANIM_SEG);
export const headerLen = (a) => FIXED + a.orderLen + a.n + 4 * segs(a.n);

export function crc16(crc, b) { // CRC-16/CCITT-FALSE
  crc ^= b << 8;
  for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  return crc;
}

// get(pos) -> byte or -1 while it has not arrived. Returns {info, len} | 0 (bytes missing) | -1.
export function parse(get) {
  const b = [];
  for (let i = 0; i < FIXED; i++) { b.push(get(i)); if (b[i] < 0) return 0; }
  if (b[0] !== ANIM_VERSION || b[1] < 1 || b[2] < 1 || b[3] < 1 || b[3] > ANIM_MAX_FRAMES) return -1;
  const a = { w: b[1], h: b[2], n: b[3], fps: b[4], passive: b[5], active: b[6], orderLen: b[7] };
  const len = headerLen(a);
  for (let i = FIXED; i < len; i++) if (get(i) < 0) return 0;
  let pos = FIXED;
  a.order = new Uint8Array(a.orderLen);
  for (let i = 0; i < a.orderLen; i++) { a.order[i] = get(pos++); if (a.order[i] >= a.n) return -1; }
  a.ref = new Uint8Array(a.n);
  for (let i = 0; i < a.n; i++) {
    a.ref[i] = get(pos++);
    const r = a.ref[i] & 0x7f;
    if (a.ref[i] !== ANIM_KEY && (r >= i || i - r >= ANIM_SEG)) return -1;
  }
  const S = segs(a.n);
  a.segOff = new Uint16Array(S); a.segCrc = new Uint16Array(S);
  for (let s = 0; s < S; s++) { a.segOff[s] = get(pos) | (get(pos + 1) << 8); pos += 2; }
  for (let s = 0; s < S; s++) { a.segCrc[s] = get(pos) | (get(pos + 1) << 8); pos += 2; }
  return { info: a, len };
}

export class AnimDecoder {
  constructor(info, hdrLen, streamLen) {
    this.info = info; this.hdrLen = hdrLen; this.streamLen = streamLen;
    this.fb = frameBytes(info);
    this.frames = new Uint8Array(info.n * this.fb);
    this.state = new Uint8Array(info.n); // 0 nothing, 1 partial, 2 complete, 3 corrupt
    this.prob = new Uint16Array(CTX);
    // stream position once row r of frame k is decoded, at [k * h + r] (times the drawing line)
    this.rowPos = new Uint32Array(info.n * info.h).fill(0xffffffff);
    this.rewind();
    this.corrupt = 0;
  }
  // decode again from the start (a checkpoint's bytes changed); frames keep their pixels
  rewind() {
    this.seg = 0; this.open = false; this.frame = 0; this.frameOpen = false; this.pix = 0;
    this.framesDone = 0; this.state.fill(0);
  }
  done() { return this.seg >= segs(this.info.n); }
  finishAll() { this.seg = segs(this.info.n); }
  segRange(s) {
    const S = segs(this.info.n);
    const start = this.hdrLen + this.info.segOff[s];
    const end = Math.min(this.streamLen, s + 1 < S ? this.hdrLen + this.info.segOff[s + 1] : this.streamLen);
    return [start, end];
  }
  // 1 CRC matches, 0 bytes missing, -1 mismatch
  segCheck(s, get) {
    const [st, en] = this.segRange(s);
    let crc = 0xffff;
    for (let i = st; i < en; i++) { const b = get(i); if (b < 0) return 0; crc = crc16(crc, b); }
    return crc === this.info.segCrc[s] ? 1 : -1;
  }
  px(f, off, x, y) {
    const a = this.info;
    if (x < 0 || y < 0 || x >= a.w || y >= a.h) return 0;
    return (f[off + y * stride(a.w) + (x >> 3)] >> (x & 7)) & 1;
  }
  context(fo, ro, x, y) {
    const f = this.frames;
    let c = this.px(f, fo, x - 1, y) | this.px(f, fo, x - 2, y) << 1 | this.px(f, fo, x - 1, y - 1) << 2 |
      this.px(f, fo, x, y - 1) << 3 | this.px(f, fo, x + 1, y - 1) << 4 | this.px(f, fo, x, y - 2) << 5;
    if (ro >= 0) {
      c |= this.px(f, ro, x, y) << 6 | this.px(f, ro, x - 1, y) << 7 | this.px(f, ro, x + 1, y) << 8 |
        this.px(f, ro, x, y - 1) << 9 | this.px(f, ro, x, y + 1) << 10;
    } else c |= 1 << 11;
    return c;
  }
  // Decodes up to `budget` pixels; final: the pass is over, stop at the first missing byte.
  // Returns { done: pixels decoded, stuck }.
  run(get, budget, final) {
    const a = this.info, w = a.w, h = a.h, st = stride(w), fb = this.fb, npx = w * h;
    const byteAt = (p) => (p >= this.streamLen ? -2 : get(p));
    let done = 0;
    if (this.done()) return { done, stuck: false };
    if (!this.open) {
      const b = [];
      this.pos = this.hdrLen;
      for (let i = 0; i < 5; i++) { b.push(byteAt(this.pos + i)); if (b[i] < 0) break; }
      if (b.length < 5 || b[b.length - 1] < 0) {
        const last = b[b.length - 1];
        if (last === -2) this.corrupt++;
        if (final || last === -2) this.finishAll();
        return { done, stuck: !final && last !== -2 };
      }
      this.code = 0;
      for (let i = 0; i < 5; i++) this.code = ((this.code << 8) | b[i]) >>> 0;
      this.pos += 5; this.range = 0xffffffff; this.prob.fill(PROB_ONE / 2);
      this.open = true; this.frame = 0; this.frameOpen = false;
    }
    while (budget > 0 && this.frame < a.n) {
      this.seg = Math.floor(this.frame / ANIM_SEG);
      const r = a.ref[this.frame], fo = this.frame * fb;
      if (r & ANIM_DUP) {
        this.frames.copyWithin(fo, (r & 0x7f) * fb, (r & 0x7f) * fb + fb);
        this.rowPos.fill(this.pos, this.frame * h, this.frame * h + h);
        this.state[this.frame] = 2; this.framesDone++; this.frame++;
        continue;
      }
      const ro = r === ANIM_KEY ? -1 : r * fb;
      if (!this.frameOpen) {
        if (ro >= 0) this.frames.copyWithin(fo, ro, ro + fb); else this.frames.fill(0, fo, fo + fb);
        this.pix = 0; this.frameOpen = true; this.state[this.frame] = 1;
      }
      let blocked = false, corrupt = false;
      while (budget > 0 && this.pix < npx) {
        while (this.range < TOP) {
          const b = byteAt(this.pos);
          if (b === -2) { corrupt = true; break; }
          if (b < 0) { blocked = true; break; }
          this.range = (this.range * 256) >>> 0;
          this.code = ((this.code << 8) | b) >>> 0;
          this.pos++;
        }
        if (blocked || corrupt) break;
        const x = this.pix % w, y = Math.floor(this.pix / w);
        const ci = this.context(fo, ro, x, y), p = this.prob[ci];
        const bound = (this.range >>> PROB_BITS) * p;
        const bi = fo + y * st + (x >> 3);
        if (this.code < bound) {
          this.range = bound;
          this.prob[ci] = p + ((PROB_ONE - p) >> MOVE_BITS);
          this.frames[bi] &= ~(1 << (x & 7));
        } else {
          this.code = (this.code - bound) >>> 0;
          this.range = (this.range - bound) >>> 0;
          this.prob[ci] = p - (p >> MOVE_BITS);
          this.frames[bi] |= 1 << (x & 7);
        }
        this.pix++; budget--; done++;
        if (this.pix % w === 0) this.rowPos[this.frame * h + this.pix / w - 1] = this.pos;
      }
      if (corrupt) { this.corrupt++; this.state[this.frame] = 3; this.finishAll(); return { done, stuck: false }; }
      if (blocked) { if (final) this.finishAll(); return { done, stuck: !final }; }
      if (this.pix >= npx) { this.state[this.frame] = 2; this.framesDone++; this.frame++; this.frameOpen = false; }
    }
    if (this.frame >= a.n) this.finishAll();
    return { done, stuck: false };
  }
}
