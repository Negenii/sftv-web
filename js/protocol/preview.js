// Box-count downscale + Bayer dither to the tiny (40x20) and preview (80x48) layers.
// Mirror of common/sstv_preview.c.
import {
  LINE_BYTES, WIDTH, HEIGHT,
  PREVIEW_W, PREVIEW_H, PREVIEW_LINE_BYTES,
  TINY_W, TINY_H, TINY_LINE_BYTES,
} from './params.js';

const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

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
          black += (imageBits[rowOff + (x >> 3)] >> (7 - (x & 7))) & 1;
        }
      }
      if (black * 32 > (2 * bayer[py & 3][px & 3] + 1) * area)
        out[py * lineBytes + (px >> 3)] |= 0x80 >> (px & 7);
    }
  }
}

export function previewMake(imageBits, out) {
  shrink(imageBits, out, PREVIEW_W, PREVIEW_H, PREVIEW_LINE_BYTES, WIDTH / PREVIEW_W, HEIGHT / PREVIEW_H);
}
export function previewMakeTiny(imageBits, out) {
  shrink(imageBits, out, TINY_W, TINY_H, TINY_LINE_BYTES, WIDTH / TINY_W, HEIGHT / TINY_H);
}
