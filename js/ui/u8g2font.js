// Minimal u8g2 font renderer (port of u8g2_font.c glyph lookup + RLE decode), so the web
// Flipper draws text with the same bitmap fonts and pixels as the real one.
export class U8g2Font {
  constructor(data) {
    this.f = data;
    const h = data;
    this.bp0 = h[2]; this.bp1 = h[3];
    this.bpw = h[4]; this.bph = h[5]; this.bpx = h[6]; this.bpy = h[7]; this.bpd = h[8];
    this.maxH = h[10];
    this.upperA = (h[17] << 8) | h[18];
    this.lowerA = (h[19] << 8) | h[20];
    this.unicode = (h[21] << 8) | h[22];
    this.cache = new Map();
  }
  get height() { return this.maxH; }

  glyphPtr(enc) {
    const f = this.f;
    let p = 23;
    if (enc <= 255) {
      if (enc >= 97) p += this.lowerA; else if (enc >= 65) p += this.upperA;
      for (;;) {
        if (f[p + 1] === 0) return -1;
        if (f[p] === enc) return p + 2;
        p += f[p + 1];
      }
    }
    p += this.unicode;
    let lut = p, e;
    do {
      p += (f[lut] << 8) | f[lut + 1];
      e = (f[lut + 2] << 8) | f[lut + 3];
      lut += 4;
    } while (e < enc);
    for (;;) {
      e = (f[p] << 8) | f[p + 1];
      if (e === 0) return -1;
      if (e === enc) return p + 3;
      p += f[p + 2];
    }
  }

  // -> { w, h, x, y, dx, runs: [[px, py, len], ...] } with py counted from the glyph top
  glyph(enc) {
    if (this.cache.has(enc)) return this.cache.get(enc);
    const ptr = this.glyphPtr(enc);
    let g = null;
    if (ptr >= 0) {
      const f = this.f;
      let pos = ptr, bit = 0;
      const u = (cnt) => {
        let val = f[pos] >> bit;
        let nb = bit + cnt;
        if (nb >= 8) { pos++; val |= f[pos] << (8 - bit); nb -= 8; }
        bit = nb;
        return val & ((1 << cnt) - 1);
      };
      const s = (cnt) => u(cnt) - (1 << (cnt - 1));
      const w = u(this.bpw), h = u(this.bph), x = s(this.bpx), y = s(this.bpy), dx = s(this.bpd);
      const runs = [];
      if (w > 0) {
        let lx = 0, ly = 0;
        const len = (n, fg) => {
          let cnt = n;
          for (;;) {
            const rem = w - lx, cur = cnt < rem ? cnt : rem;
            if (fg && cur > 0) runs.push([lx, ly, cur]);
            if (cnt < rem) break;
            cnt -= rem; lx = 0; ly++;
          }
          lx += cnt;
        };
        for (;;) {
          const a = u(this.bp0), b = u(this.bp1);
          do { len(a, false); len(b, true); } while (u(1) !== 0);
          if (ly >= h) break;
        }
      }
      g = { w, h, x, y, dx, runs };
    }
    this.cache.set(enc, g);
    return g;
  }

  width(str) {
    let w = 0;
    for (const ch of str) { const g = this.glyph(ch.codePointAt(0)); if (g) w += g.dx; }
    return w;
  }

  // draws with ctx's current fillStyle; (x, y) is the baseline start, like canvas_draw_str
  draw(ctx, x, y, str) {
    for (const ch of str) {
      const g = this.glyph(ch.codePointAt(0));
      if (!g) continue;
      const tx = x + g.x, ty = y - (g.h + g.y);
      for (const [px, py, n] of g.runs) ctx.fillRect(tx + px, ty + py, n, 1);
      x += g.dx;
    }
    return x;
  }
}
