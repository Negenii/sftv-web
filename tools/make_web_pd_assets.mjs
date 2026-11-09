// Converts the receiver's fonts (.fnt + table PNG) and images (1-bit PNG) in pd-src/ into
// js/ui/pd-assets.js, so the web receiver draws the Playdate app's screens pixel for pixel.
// Embedded as data because a page opened from file:// can't read image pixels back.
// Run: node tools/make_web_pd_assets.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const SRC = new URL('../pd-src/', import.meta.url);
const OUT = new URL('../js/ui/pd-assets.js', import.meta.url);

// ---- minimal PNG decoder: gray 1/8-bit, RGBA 8-bit, palette 8-bit (+tRNS), non-interlaced ----
function decodePng(buf) {
  let p = 8, w, h, depth, ct, plte = null, trns = null; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; ct = d[9]; if (d[12]) throw new Error('interlaced'); }
    else if (type === 'PLTE') plte = d;
    else if (type === 'tRNS') trns = d;
    else if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  const chans = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct];
  const bpp = Math.max(1, (chans * depth) >> 3), stride = Math.ceil(w * chans * depth / 8);
  const raw = inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(stride * h); let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      line[i] = v & 255;
    }
    line.copy(px, y * stride); prev = line;
  }
  // -> per pixel { ink: dark & opaque, opaque }
  const ink = new Uint8Array(w * h), opaque = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r, g, b, al = 255;
    const row = y * stride;
    if (ct === 0) {
      const v = depth === 1 ? ((px[row + (x >> 3)] >> (7 - (x & 7))) & 1) * 255 : px[row + x];
      r = g = b = v;
    } else if (ct === 3) {
      const idx = depth === 8 ? px[row + x] : (px[row + ((x * depth) >> 3)] >> (8 - depth - ((x * depth) & 7))) & ((1 << depth) - 1);
      r = plte[idx * 3]; g = plte[idx * 3 + 1]; b = plte[idx * 3 + 2]; al = trns && idx < trns.length ? trns[idx] : 255;
    } else if (ct === 4) { r = g = b = px[row + x * 2]; al = px[row + x * 2 + 1]; }
    else if (ct === 6) { r = px[row + x * 4]; g = px[row + x * 4 + 1]; b = px[row + x * 4 + 2]; al = px[row + x * 4 + 3]; }
    else { r = px[row + x * 3]; g = px[row + x * 3 + 1]; b = px[row + x * 3 + 2]; }
    opaque[y * w + x] = al >= 128 ? 1 : 0;
    ink[y * w + x] = al >= 128 && (r + g + b) < 3 * 128 ? 1 : 0;
  }
  return { w, h, ink, opaque };
}

// pack a w x h 0/1 plane into MSB-first rows, base64
function pack(plane, w, h, x0 = 0, y0 = 0, pw = w) {
  const lb = Math.ceil(w / 8), out = Buffer.alloc(lb * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    if (plane[(y0 + y) * pw + x0 + x]) out[y * lb + (x >> 3)] |= 0x80 >> (x & 7);
  return out.toString('base64');
}

function font(name) {
  const fnt = readFileSync(new URL(`fonts/${name}.fnt`, SRC), 'utf8');
  let tracking = 0; const glyphs = []; const kern = {};
  for (const line of fnt.split('\n')) {
    if (!line || line.startsWith('--')) continue;
    if (line.startsWith('tracking=')) { tracking = +line.slice(9); continue; }
    const m = line.match(/^(.+?)\t+(-?\d+)\s*$/);
    if (!m) continue;
    const key = m[1] === 'space' ? ' ' : m[1];
    const cps = [...key];
    if (cps.length === 1) glyphs.push([key, +m[2]]);
    else if (cps.length === 2) kern[key] = +m[2];
  }
  return { tracking, glyphs, kern };
}

const fontFiles = readdirSync(new URL('fonts/', SRC));
const fonts = {};
for (const name of ['SFTV-10-Bold', 'SFTV-9-Mono-Condensed', 'SFTV-20-Medium', 'SFTV-11-Medium-extended', 'Notes-14']) {
  const table = fontFiles.find((f) => f.startsWith(name + '-table-'));
  const [, cw, ch] = table.match(/-table-(\d+)-(\d+)\.png$/).map(Number);
  const png = decodePng(readFileSync(new URL(`fonts/${table}`, SRC)));
  const { tracking, glyphs, kern } = font(name);
  const cols = Math.floor(png.w / cw);
  const map = {};
  glyphs.forEach(([chr, adv], i) => {
    const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
    if (cy + ch > png.h) return;
    map[chr] = [adv, pack(png.ink, cw, ch, cx, cy, png.w)];
  });
  fonts[name] = { cw, ch, tracking, kern, glyphs: map };
}

const images = {};
for (const name of ['console', 'dolphin', 'dolphin_open', 'frame_11', 'frame_22', 'frame_31', 'frame_41', 'frame_51']) {
  const png = decodePng(readFileSync(new URL(`images/${name}.png`, SRC)));
  images[name] = { w: png.w, h: png.h, ink: pack(png.ink, png.w, png.h), opaque: pack(png.opaque, png.w, png.h) };
}

writeFileSync(OUT, `// Generated by tools/make_web_pd_assets.mjs from pd-src/ (fonts: SFTV-* drawn from Figtree, OFL,
// with the device fonts' metrics; Notes-14 from HaxrCorp 4089, CC BY-SA). Do not edit by hand.
export const PD_FONTS = ${JSON.stringify(fonts)};
export const PD_IMAGES = ${JSON.stringify(images)};
`);
console.log('fonts', Object.entries(fonts).map(([k, f]) => `${k}:${Object.keys(f.glyphs).length}g ${f.cw}x${f.ch}`).join(', '));
console.log('bytes', readFileSync(OUT).length);
