// Any image -> 400x240 1-bit (Bayer 4x4 ordered dither). Bit 1 = black, like PBM P4.
import { WIDTH, HEIGHT, LINE_BYTES, IMAGE_BYTES } from './params.js';

const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

// rgba: Uint8ClampedArray of a WIDTH x HEIGHT canvas (already scaled by the caller).
export function ditherRGBA(rgba) {
  const out = new Uint8Array(IMAGE_BYTES);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const p = (y * WIDTH + x) * 4;
      // luma 0..255 (Rec.601), respect alpha over white
      const a = rgba[p + 3] / 255;
      const luma = (0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]) * a + 255 * (1 - a);
      const thr = (2 * bayer[y & 3][x & 3] + 1) / 32 * 255; // (bayer+0.5)/16 * 255
      if (luma < thr) out[y * LINE_BYTES + (x >> 3)] |= 0x80 >> (x & 7); // dark -> black bit
    }
  }
  return out;
}

// 1-bit image -> ImageData-style RGBA for display (black bit -> black pixel).
export function bitsToRGBA(bits, rgba) {
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
    const on = (bits[y * LINE_BYTES + (x >> 3)] >> (7 - (x & 7))) & 1;
    const p = (y * WIDTH + x) * 4;
    const v = on ? 0 : 255;
    rgba[p] = rgba[p + 1] = rgba[p + 2] = v; rgba[p + 3] = 255;
  }
}
