// Loopback: JS modem -> JS demod -> rx, image must come back intact. And decode a real
// Playdate recording with the JS demod, printing the same figures as the C decoder.
import { readFileSync } from 'node:fs';
import * as P from '../js/protocol/params.js';
import { Modem } from '../js/protocol/modem.js';
import { Demod } from '../js/protocol/demod.js';
import { Rx } from '../js/protocol/rx.js';

function stripeImage() {
  const img = new Uint8Array(P.IMAGE_BYTES);
  for (let y = 0; y < P.HEIGHT; y++) for (let i = 0; i < P.LINE_BYTES; i++) img[y * P.LINE_BYTES + i] = ((y >> 3) & 1) ? 0xf0 : 0x0f;
  return img;
}
function capture() {
  const got = Array.from({ length: P.HEIGHT }, () => new Uint8Array(P.LINE_BYTES));
  const seen = new Uint8Array(P.HEIGHT);
  let tiny = 0, prev = 0, ends = 0;
  const rx = new Rx({
    onPixels: (line, x, nb, px) => { got[line].set(px.subarray(0, nb), x); seen[line] |= nb === P.LINE_BYTES ? 3 : (x === 0 ? 1 : 2); },
    onMeta: (name, isEnd) => { if (isEnd) ends++; },
    onPreview: (layer) => { if (layer === 0) tiny++; else if (layer === 1) prev++; },
  });
  return { rx, got, seen, stats: () => ({ tiny, prev, ends }) };
}
function linesOk(got, seen, img) {
  let ok = 0;
  for (let y = 0; y < P.HEIGHT; y++) {
    if (seen[y] !== 3) continue;
    let same = true;
    for (let i = 0; i < P.LINE_BYTES; i++) if (got[y][i] !== img[y * P.LINE_BYTES + i]) { same = false; break; }
    if (same) ok++;
  }
  return ok;
}

// --- loopback ---
const sr = 44100;
const img = stripeImage();
const samples = new Modem(sr).image(img);
const cap = capture();
const soft = new Float32Array(P.FRAME_BITS);
const demod = new Demod(sr, (frame, margin) => cap.rx.phys_frame(frame, margin));
demod.feed(samples, samples.length);
const ok = linesOk(cap.got, cap.seen, img);
const st = cap.stats();
console.log(`loopback stripe: ${ok}/${P.HEIGHT} lines, tiny ${st.tiny}/4, preview ${st.prev}/20, ends ${st.ends}, frames ${demod.frames}`);

// --- HF band, pattern sync (revision 13): JS modem -> JS demod at 48 kHz, plain and with a
// laptop-like microphone response (17/17.5 kHz ~20 dB under 19.5 kHz) ---
for (const [label, gains] of [['flat', null], ['laptop mic', [0.1, 0.11, 0.66, 0.6, 1.15, 1.4, 0.66, 0.46]]]) {
  const m = new Modem(48000, 2000).setBand(P.BAND_HF);
  if (gains) m.channelGain = gains;
  const s = m.image(img);
  for (let i = 0; i < s.length; i++) s[i] += ((Math.imul(i, 2654435761) >>> 24) % 9) - 4; // +-4 LSB noise
  const c = capture();
  const d = new Demod(48000, (frame, margin) => c.rx.phys_frame(frame, margin));
  d.setBand(P.BAND_HF);
  d.feed(s, s.length);
  console.log(`hf pattern-sync loopback (${label}): ${linesOk(c.got, c.seen, img)}/${P.HEIGHT} lines, frames ${d.frames}, patterns ${d.patternsSeen}, flywheel ${d.flywheelFrames}`);
}

// --- real recording (if present) ---
function readWav(path) {
  const buf = readFileSync(path);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // find 'data' chunk
  let off = 12;
  while (off + 8 <= buf.length) {
    const id = String.fromCharCode(buf[off], buf[off + 1], buf[off + 2], buf[off + 3]);
    const sz = dv.getUint32(off + 4, true);
    if (id === 'data') { const n = sz >> 1; const s = new Int16Array(n); for (let i = 0; i < n; i++) s[i] = dv.getInt16(off + 8 + i * 2, true); return s; }
    off += 8 + sz + (sz & 1);
  }
  throw new Error('no data chunk');
}
const rec = process.argv[2];
if (rec) {
  const s = readWav(rec);
  const cap2 = capture();
  const d2 = new Demod(44100, (frame, margin) => cap2.rx.phys_frame(frame, margin));
  d2.feed(s, s.length);
  const st2 = cap2.stats();
  let lines = 0; for (let y = 0; y < P.HEIGHT; y++) if (cap2.seen[y] === 3) lines++;
  console.log(`recording ${rec}: phys=${d2.frames} flywheel=${d2.flywheelFrames} framesOk=${cap2.rx.framesOk} framesBad=${cap2.rx.framesBad} repaired=${cap2.rx.framesRepaired} lines=${lines}/240 tiny=${st2.tiny}/4 preview=${st2.prev}/20`);
}
// --- note loopback (modem -> demod -> rx -> text) ---
function noteLoopback(text) {
  const s2 = new Modem(sr).note(text, 'lbl');
  let got = new Uint8Array(P.NOTE_MAX_CHARS + 64), noteFlag = false;
  const rxn = new Rx({ onNote: (chunk, nb, buf) => { const off = chunk * P.NOTE_CHUNK; for (let k = 0; k < nb; k++) got[off + k] = buf[k]; },
                       onMeta: (nm, end, tot, coded, note) => { if (!end) noteFlag = note; } });
  const d = new Demod(sr, (frame, margin) => rxn.phys_frame(frame, margin));
  d.feed(s2, s2.length);
  let z = got.indexOf(0); if (z < 0) z = got.length;
  const out = new TextDecoder().decode(got.subarray(0, z));
  return { ok: out === text && noteFlag, out };
}
const nAscii = noteLoopback('Hello from the browser! 123');
const nCyr = noteLoopback('Привет из браузера');
console.log(`note loopback ascii: ${nAscii.ok ? 'OK' : 'FAIL ' + JSON.stringify(nAscii.out)}`);
console.log(`note loopback utf8:  ${nCyr.ok ? 'OK' : 'FAIL ' + JSON.stringify(nCyr.out)}`);
process.exit((ok === P.HEIGHT && nAscii.ok && nCyr.ok) ? 0 : 1);
