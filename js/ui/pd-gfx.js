// A small 1-bit framebuffer with the Playdate graphics calls the receiver app uses (rects,
// rounded rects, ellipses/arcs, lines, triangles, bitmaps, bitmap fonts, draw offset, clip),
// so the web receiver can draw the same screens as playdate/src/main.c, pixel for pixel.
import { PD_FONTS, PD_IMAGES } from './pd-assets.js';

export const BLACK = 1, WHITE = 0;
const W = 400, H = 240;

const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export class PdFont {
  constructor(def) {
    this.cw = def.cw; this.ch = def.ch; this.tracking = def.tracking; this.kern = def.kern;
    this.glyphs = new Map();
    for (const [c, [adv, bits]] of Object.entries(def.glyphs)) this.glyphs.set(c, { adv, bits: b64(bits) });
  }
  get height() { return this.ch; }
  width(str) {
    let w = 0, prev = null, n = 0;
    for (const c of str) {
      const g = this.glyphs.get(c) || this.glyphs.get('?');
      if (!g) continue;
      if (prev) w += (this.kern[prev + c] || 0) + this.tracking;
      w += g.adv; prev = c; n++;
    }
    return n ? w : 0;
  }
}

export class PdImage {
  constructor(def) { this.w = def.w; this.h = def.h; this.ink = b64(def.ink); this.opaque = b64(def.opaque); this.lb = Math.ceil(def.w / 8); }
  bit(plane, x, y) { return (plane[y * this.lb + (x >> 3)] >> (7 - (x & 7))) & 1; }
}

export const fonts = Object.fromEntries(Object.entries(PD_FONTS).map(([k, v]) => [k, new PdFont(v)]));
export const images = Object.fromEntries(Object.entries(PD_IMAGES).map(([k, v]) => [k, new PdImage(v)]));

export class Gfx {
  constructor() {
    this.w = W; this.h = H;
    this.px = new Uint8Array(W * H); // 1 = black
    this.ox = 0; this.oy = 0;
    this.clip = [0, 0, W, H];
    this.font = null;
  }
  setDrawOffset(x, y) { this.ox = x; this.oy = y; }
  setClipRect(x, y, w, h) { this.clip = [Math.max(0, x + this.ox), Math.max(0, y + this.oy), Math.min(W, x + this.ox + w), Math.min(H, y + this.oy + h)]; }
  clearClipRect() { this.clip = [0, 0, W, H]; }
  clear(c) { this.px.fill(c); }

  // raw pixel / span in screen coordinates (offset already applied)
  _span(x0, x1, y, c) { // [x0, x1)
    const [cx0, cy0, cx1, cy1] = this.clip;
    if (y < cy0 || y >= cy1) return;
    if (x0 < cx0) x0 = cx0; if (x1 > cx1) x1 = cx1;
    if (x0 < x1) this.px.fill(c, y * W + x0, y * W + x1);
  }
  _dot(x, y, c) { const [cx0, cy0, cx1, cy1] = this.clip; if (x >= cx0 && x < cx1 && y >= cy0 && y < cy1) this.px[y * W + x] = c; }

  fillRect(x, y, w, h, c) {
    x += this.ox; y += this.oy;
    for (let yy = y; yy < y + h; yy++) this._span(x, x + w, yy, c);
  }
  // half-width of the rounded rect row `yy` (0..h-1): how far the corners cut in
  static _cut(yy, h, r) {
    let d = -1;
    if (yy < r) d = r - 1 - yy; else if (yy >= h - r) d = yy - (h - r);
    if (d < 0) return 0;
    return r - Math.round(Math.sqrt(Math.max(0, r * r - (d + 0.5) * (d + 0.5))));
  }
  fillRoundRect(x, y, w, h, r, c) {
    r = Math.min(r, w >> 1, h >> 1);
    x += this.ox; y += this.oy;
    for (let yy = 0; yy < h; yy++) { const k = Gfx._cut(yy, h, r); this._span(x + k, x + w - k, y + yy, c); }
  }
  drawRoundRect(x, y, w, h, r, lw, c) {
    r = Math.min(r, w >> 1, h >> 1);
    const ri = Math.max(0, r - lw);
    x += this.ox; y += this.oy;
    for (let yy = 0; yy < h; yy++) {
      const k = Gfx._cut(yy, h, r);
      const inner = yy >= lw && yy < h - lw;
      if (!inner) { this._span(x + k, x + w - k, y + yy, c); continue; }
      const ki = lw + Gfx._cut(yy - lw, h - 2 * lw, ri);
      this._span(x + k, x + ki, y + yy, c);
      this._span(x + w - ki, x + w - k, y + yy, c);
    }
  }
  // Playdate angles: degrees, 0 at 12 o'clock, clockwise; start == end draws the full ellipse
  fillEllipse(x, y, w, h, a0, a1, c) { this._ellipse(x, y, w, h, 0, a0, a1, c); }
  drawEllipse(x, y, w, h, lw, a0, a1, c) { this._ellipse(x, y, w, h, lw, a0, a1, c); }
  _ellipse(x, y, w, h, lw, a0, a1, c) {
    x += this.ox; y += this.oy;
    const rx = w / 2, ry = h / 2, cx = x + rx, cy = y + ry;
    const full = a0 === a1;
    let s = ((a0 % 360) + 360) % 360, span = full ? 360 : (((a1 - a0) % 360) + 360) % 360 || 360;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      const dx = (xx + 0.5 - cx) / rx, dy = (yy + 0.5 - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      if (lw > 0) {
        const ix = (xx + 0.5 - cx) / (rx - lw), iy = (yy + 0.5 - cy) / (ry - lw);
        if (rx - lw > 0 && ry - lw > 0 && ix * ix + iy * iy <= 1) continue;
      }
      if (!full) {
        let ang = Math.atan2(xx + 0.5 - cx, -(yy + 0.5 - cy)) * 180 / Math.PI; // 0 = up, clockwise
        ang = ((ang - s) % 360 + 360) % 360;
        if (ang > span) continue;
      }
      this._dot(xx, yy, c);
    }
  }
  drawLine(x0, y0, x1, y1, lw, c) {
    x0 += this.ox; y0 += this.oy; x1 += this.ox; y1 += this.oy;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    const half = (lw - 1) >> 1;
    for (;;) {
      for (let a = -half; a < lw - half; a++) for (let b = -half; b < lw - half; b++) this._dot(x0 + a, y0 + b, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  fillTriangle(x0, y0, x1, y1, x2, y2, c) {
    const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
    const edge = (ax, ay, bx, by, yy) => (ay === by ? null : ((yy - ay) * (bx - ax)) / (by - ay) + ax);
    for (let yy = minY; yy <= maxY; yy++) {
      const xs = [];
      for (const [ax, ay, bx, by] of [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]])
        if ((yy >= Math.min(ay, by)) && (yy <= Math.max(ay, by))) { const v = edge(ax, ay, bx, by, yy); if (v !== null) xs.push(v); }
      if (xs.length < 2) continue;
      this._span(Math.round(Math.min(...xs)) + this.ox, Math.round(Math.max(...xs)) + 1 + this.ox, yy + this.oy, c);
    }
  }
  // 1-bit image: copy mode paints opaque white and ink; 'ink' paints only the ink (transparent
  // background, like render_scaled() sprites); scale draws each pixel as a scale x scale block
  drawImage(img, x, y, { mode = 'copy', scale = 1 } = {}) {
    x += this.ox; y += this.oy;
    for (let r = 0; r < img.h; r++) for (let q = 0; q < img.w; q++) {
      const ink = img.bit(img.ink, q, r);
      if (!ink && (mode === 'ink' || !img.bit(img.opaque, q, r))) continue;
      const c = ink ? BLACK : WHITE;
      for (let a = 0; a < scale; a++) this._span(x + q * scale, x + q * scale + scale, y + r * scale + a, c);
    }
  }
  // raw 1-bit plane (1 = black) w x h, MSB first rows of `lb` bytes; transparent where 0 unless opaque
  drawBits(bits, w, h, lb, x, y, opaque = true) {
    x += this.ox; y += this.oy;
    const [cx0, cy0, cx1, cy1] = this.clip;
    for (let r = 0; r < h; r++) {
      const yy = y + r; if (yy < cy0 || yy >= cy1) continue;
      for (let q = 0; q < w; q++) {
        const xx = x + q; if (xx < cx0 || xx >= cx1) continue;
        const on = (bits[r * lb + (q >> 3)] >> (7 - (q & 7))) & 1;
        if (on) this.px[yy * W + xx] = BLACK; else if (opaque) this.px[yy * W + xx] = WHITE;
      }
    }
  }
  setFont(f) { this.font = f; }
  // top-left text like pd->graphics->drawText; white = kDrawModeFillWhite
  drawText(str, x, y, white = false) {
    const f = this.font, c = white ? WHITE : BLACK, lb = Math.ceil(f.cw / 8);
    let prev = null;
    for (const ch of str) {
      const g = f.glyphs.get(ch) || f.glyphs.get('?');
      if (!g) continue;
      if (prev) x += (f.kern[prev + ch] || 0) + f.tracking;
      for (let r = 0; r < f.ch; r++) for (let q = 0; q < f.cw; q++)
        if ((g.bits[r * lb + (q >> 3)] >> (7 - (q & 7))) & 1) this._dot(x + q + this.ox, y + r + this.oy, c);
      x += g.adv; prev = ch;
    }
  }
  textWidth(str) { return this.font.width(str); }

  // blit to a 2D canvas with the Playdate LCD's two tones
  present(ctx, light = [0xb1, 0xaf, 0xa8], dark = [0x31, 0x2f, 0x28]) {
    if (!this._id) this._id = ctx.createImageData(W, H);
    const d = this._id.data;
    for (let i = 0, p = 0; i < W * H; i++, p += 4) {
      const t = this.px[i] ? dark : light;
      d[p] = t[0]; d[p + 1] = t[1]; d[p + 2] = t[2]; d[p + 3] = 255;
    }
    ctx.putImageData(this._id, 0, 0);
  }
}
