// Animated GIF from 1-bit XBM frames (mirror of export_gif in playdate/src/export.c): two
// colours, LZW as in gif.h (C. Tangora), NETSCAPE loop, every pixel scaled by `scale`.
export function encodeGif(w, h, scale, frames, fb, order, delayCs) {
  const out = [];
  const u8 = (...b) => out.push(...b);
  const le16 = (v) => u8(v & 0xff, (v >> 8) & 0xff);
  const W = w * scale, H = h * scale, st = (w + 7) >> 3;
  u8(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); le16(W); le16(H); u8(0x80, 0, 0);
  u8(0xff, 0xff, 0xff, 0, 0, 0); // palette: 0 white, 1 black
  u8(0x21, 0xff, 0x0b, ...'NETSCAPE2.0'.split('').map((c) => c.charCodeAt(0)), 3, 1, 0, 0, 0);
  for (const fi of order) {
    u8(0x21, 0xf9, 4, 0); le16(delayCs); u8(0, 0);
    u8(0x2c); le16(0); le16(0); le16(W); le16(H); u8(0, 2);
    // LZW, minimum code size 2
    const clear = 4, eoi = 5;
    let size = 3, next = 6, prefix = -1, acc = 0, nacc = 0;
    let dict = new Map();
    const block = [];
    const flushBlock = (all) => { while (block.length >= 255 || (all && block.length)) { const n = Math.min(255, block.length); u8(n, ...block.splice(0, n)); } };
    const code = (c, sz) => { acc |= c << nacc; nacc += sz; while (nacc >= 8) { block.push(acc & 0xff); acc >>>= 8; nacc -= 8; } if (block.length >= 255) flushBlock(false); };
    code(clear, size);
    const f = frames.subarray(fi * fb, fi * fb + fb);
    for (let y = 0; y < H; y++) {
      const row = Math.floor(y / scale) * st;
      for (let x = 0; x < W; x++) {
        const sx = Math.floor(x / scale);
        const pix = (f[row + (sx >> 3)] >> (sx & 7)) & 1;
        if (prefix < 0) { prefix = pix; continue; }
        const key = (prefix << 1) | pix;
        const hit = dict.get(key);
        if (hit !== undefined) { prefix = hit; continue; }
        code(prefix, size);
        dict.set(key, next);
        if (next >= (1 << size)) size++;
        if (next === 4095) { code(clear, size); dict = new Map(); size = 3; next = 6; }
        else next++;
        prefix = pix;
      }
    }
    if (prefix >= 0) code(prefix, size);
    code(eoi, size);
    if (nacc > 0) block.push(acc & 0xff);
    flushBlock(true);
    u8(0);
  }
  u8(0x3b);
  return new Uint8Array(out);
}
