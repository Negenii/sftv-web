// Transmitter UI (Flipper). Loads pictures, dithers to 400x240 1-bit, plays them as sound.
import * as P from '../protocol/params.js';
import { ditherRGBA, bitsToRGBA } from '../protocol/image.js';
import { buildPhysical, frameSymbolBits, lockFrame } from '../protocol/frame.js';
// Near-ultrasound only (the audible band is archived: git tag audible-mode-archive).
const BAND = P.BAND_HF;
const TX_AMPLITUDE = 30000; // sines near full scale: laptop speakers are weak at 17-21 kHz
import { Modem } from '../protocol/modem.js';
import { previewMake } from '../protocol/preview.js';
import { TxAudio } from '../audio/tx-audio.js';
import { U8g2Font } from './u8g2font.js';
import { HAXRCORP } from './font-haxrcorp.js';
import { DOLPHIN_DONE } from './icon-dolphin-done.js';
import { SAMPLES } from './samples.js';

const lcd = document.getElementById('lcd');
const g = lcd.getContext('2d');
const led = document.getElementById('led');
const tx = new TxAudio();
let images = [];        // { name, bits }
let index = 0;
let sending = null;      // { bits, sched, coded, total, ... } while an image plays
let noteSending = null;  // note text while a note pass plays

function checkerBits() {
  const b = new Uint8Array(P.IMAGE_BYTES);
  for (let y = 0; y < P.HEIGHT; y++) for (let x = 0; x < P.WIDTH; x++)
    if (((x >> 4) + (y >> 4)) & 1) b[y * P.LINE_BYTES + (x >> 3)] |= 0x80 >> (x & 7);
  return b;
}
images.push({ name: 'Checker', bits: checkerBits() });
// the sample pictures that come with the Flipper app (js/ui/samples.js)
for (const s of SAMPLES) images.push({ name: s.name, bits: Uint8Array.from(atob(s.bits), (c) => c.charCodeAt(0)) });
const SAMPLE_COUNT = images.length; // the chips cover these; loaded pictures come after

const rgba = new Uint8ClampedArray(P.WIDTH * P.HEIGHT * 4);
// The real Flipper LCD is 128x64: the picture goes out as the same 80x48 dithered sheet the
// receiver gets (sliding up through the top edge while sending) with a status panel on the right.
const LCD_W = 128, LCD_H = 64, SHEET_X = 3, SHEET_Y = 8, SHEET_BOTTOM = 63, PANEL_X = 88;
const INK = '#1a0c02', BACK = '#fe8a2c';
const previewCache = new WeakMap();
function previewOf(bits) {
  let pv = previewCache.get(bits);
  if (!pv) { pv = new Uint8Array(P.PREVIEW_BYTES); previewMake(bits, pv); previewCache.set(bits, pv); }
  return pv;
}
// Text uses the Flipper's own bitmap font (FontSecondary look + Cyrillic), decoded from u8g2 data.
const FONT = new U8g2Font(HAXRCORP);
const text = (str, x, y) => FONT.draw(g, x, y, str); // y = baseline, like canvas_draw_str
const box = (x, y, w, h) => g.fillRect(x, y, w, h);
// u8g2 rounded frame, radius 3 (what elements_progress_bar draws)
function rframe3(x, y, w, h) {
  box(x + 3, y, w - 6, 1); box(x + 3, y + h - 1, w - 6, 1);
  box(x, y + 3, 1, h - 6); box(x + w - 1, y + 3, 1, h - 6);
  for (const [cx, cy, sx, sy] of [[x + 3, y + 3, -1, -1], [x + w - 4, y + 3, 1, -1], [x + 3, y + h - 4, -1, 1], [x + w - 4, y + h - 4, 1, 1]])
    for (const [dx, dy] of [[1, 3], [2, 2], [3, 1]]) box(cx + sx * dx, cy + sy * dy, 1, 1);
}
function progressBar(x, y, w, frac) {
  const h = 9;
  g.fillStyle = BACK; box(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle = INK; rframe3(x, y, w, h);
  box(x + 1, y + 1, Math.round(Math.min(1, Math.max(0, frac)) * (w - 2)), h - 2);
}
// Bresenham line, like canvas_draw_line
function line(x0, y0, x1, y1) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    box(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function icon(ic, x, y) {
  const lb = ic.w >> 3;
  for (let r = 0; r < ic.h; r++) for (let c = 0; c < ic.w; c++)
    if ((ic.bits[r * lb + (c >> 3)] >> (7 - (c & 7))) & 1) box(x + c, y + r, 1, 1);
}
// What lies under the sheet: the resting dolphin low on the screen and a "Sent!" bubble above
// (draw_under_layer() in flipper/sstv_app.c).
function drawUnderLayer() {
  g.fillStyle = INK;
  icon(DOLPHIN_DONE, SHEET_X, LCD_H - DOLPHIN_DONE.h);
  const t = 'Sent!', tw = FONT.width(t);
  const bx = SHEET_X + 6, by = 1, bw = tw + 8, bh = 12;
  rframe3(bx, by, bw, bh);
  text(t, bx + 4, by + 9);
  // tail towards the dolphin, who lies to the right
  const tx = bx + bw - 6;
  g.fillStyle = BACK; line(tx - 4, by + bh - 1, tx, by + bh - 1);
  g.fillStyle = INK; line(tx - 5, by + bh - 1, tx + 2, by + bh + 3); line(tx + 1, by + bh - 1, tx + 2, by + bh + 3);
}
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
// Right-hand panel, laid out like draw_panel() in flipper/sstv_app.c.
// st: null -> "Ready"; else { label, frac, leftS, frames }
function drawPanel(st) {
  g.fillStyle = INK;
  box(PANEL_X - 3, 0, 1, LCD_H);
  if (!st) { text('Ready', PANEL_X, 9); return; }
  text(st.label, PANEL_X, 9);
  progressBar(PANEL_X, 12, LCD_W - PANEL_X, st.frac);
  g.fillStyle = INK;
  if (st.doneS != null) { text(mmss(st.doneS), PANEL_X, 32); return; } // Done: total airtime
  // tenths only on long passes, like the device
  const pct = st.frames > 200 ? (Math.floor(st.frac * 1000) / 10).toFixed(1) : String(Math.floor(st.frac * 100));
  text(pct + '%', PANEL_X, 32);
  text('~' + mmss(Math.max(0, st.leftS)), PANEL_X, 42);
}
// The real LCD is 1-bit: snap every pixel to ink or background, so canvas text antialiasing
// doesn't turn into grey mush when the 128x64 canvas is scaled up.
const INK_RGB = [0x1a, 0x0c, 0x02], BACK_RGB = [0xfe, 0x8a, 0x2c];
function snap1bit() {
  const id = g.getImageData(0, 0, LCD_W, LCD_H), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const c = (d[i] + d[i + 1] + d[i + 2]) < 3 * 0x80 ? INK_RGB : BACK_RGB;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
}
// st.done: the pass is over, only the under-layer shows (the sheet has left), like StateDone.
function drawImage(bits, st = null) {
  g.fillStyle = BACK; g.fillRect(0, 0, LCD_W, LCD_H);
  const done = !!(st && st.doneS != null);
  const frac = st ? Math.min(1, st.frac) : 0;
  const y0 = Math.round(SHEET_Y - frac * (SHEET_Y + P.PREVIEW_H));
  if (done || (st && y0 <= 0)) drawUnderLayer();
  if (!done) {
    // paper: background box so it covers the layer underneath, then the preview and its frame
    const top = Math.max(0, y0), bottom = Math.min(SHEET_BOTTOM, y0 + P.PREVIEW_H - 1);
    if (bottom >= top) { g.fillStyle = BACK; g.fillRect(SHEET_X, top, P.PREVIEW_W, bottom - top + 1); }
    const pv = previewOf(bits);
    g.fillStyle = INK;
    for (let y = 0; y < P.PREVIEW_H; y++) {
      const sy = y0 + y; if (sy < 0 || sy > SHEET_BOTTOM) continue;
      for (let x = 0; x < P.PREVIEW_W; x++)
        if ((pv[y * P.PREVIEW_LINE_BYTES + (x >> 3)] >> (7 - (x & 7))) & 1) g.fillRect(SHEET_X + x, sy, 1, 1);
    }
    g.fillRect(SHEET_X - 1, y0 - 1, P.PREVIEW_W + 2, 1); g.fillRect(SHEET_X - 1, y0 + P.PREVIEW_H, P.PREVIEW_W + 2, 1);
    g.fillRect(SHEET_X - 1, y0 - 1, 1, P.PREVIEW_H + 2); g.fillRect(SHEET_X + P.PREVIEW_W, y0 - 1, 1, P.PREVIEW_H + 2);
  }
  drawPanel(st);
  snap1bit();
}
drawImage(images[0].bits);

// One line under the buttons that says what just happened (actions during a pass used to be
// silently ignored).
const statusEl = document.getElementById('status');
const say = (t) => { if (statusEl) statusEl.textContent = t; };
const nameOf = () => images[index].name || 'image';
// Stops whatever is on the air (picture or note) without the end-of-pass "Done".
function stopTx() {
  tx.stop(); sending = null; noteSending = null; led.setAttribute('fill', '#333');
}

// Decodes a picture file. createImageBitmap misses some formats an <img> shows (AVIF on some
// browsers), so that is the fallback; null when neither can read it.
async function decodeImage(file) {
  try { return await createImageBitmap(file); } catch (e) { /* try the <img> path */ }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode();
    return img.naturalWidth ? img : null;
  } catch (e) { return null; } finally { URL.revokeObjectURL(url); }
}

// What the picture on screen will cost before it is sent: the pass layout decides between raw and
// compressed and gives the frame count; the air time is the tone ladder, the lock frames and the
// frames (the same timeline the transmission plays). Cached per picture.
const infoEl = document.getElementById('info');
function passInfo(img) {
  if (!img.info) {
    const { total, coded } = buildPhysical(img.bits, img.name);
    const us = P.bandLeaderSymbols(BAND) * P.bandSymbolUs(BAND) + (P.LOCK_FRAMES + total) * P.bandPhysUs(BAND);
    img.info = { coded, seconds: Math.round(us / 1e6) };
  }
  return img.info;
}
function showInfo() {
  if (!infoEl) return;
  const img = images[index], i = passInfo(img);
  infoEl.textContent = `"${img.name}" · ${i.coded ? 'compressed' : 'raw'} · ${mmss(i.seconds)} on the air`;
}

// Sample chips: a thumbnail and a name for each built-in picture; the one on screen is lit.
const chipsEl = document.getElementById('samples');
const chips = [];
function markChip() { chips.forEach((c, i) => c.classList.toggle('on', i === index)); showInfo(); }
function pick(i) {
  if (tx.playing) { // a sample while something is on the air: this one now instead
    const was = sending ? `"${images[sendingIndex].name}"` : noteSending ? 'the note' : 'the transmission';
    stopTx(); index = i; markChip();
    say(`Stopped ${was}, sending "${nameOf()}".`);
    send();
    return;
  }
  index = i; markChip(); drawImage(images[index].bits);
  say(`Picked "${nameOf()}". Press Send to transmit it.`);
}
if (chipsEl) {
  const big = document.createElement('canvas'); big.width = P.WIDTH; big.height = P.HEIGHT;
  const bg = big.getContext('2d'), id = bg.createImageData(P.WIDTH, P.HEIGHT);
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const b = images[i].bits;
    for (let y = 0; y < P.HEIGHT; y++) for (let x = 0; x < P.WIDTH; x++) {
      const v = (b[y * P.LINE_BYTES + (x >> 3)] >> (7 - (x & 7))) & 1 ? 0 : 255, o = (y * P.WIDTH + x) * 4;
      id.data[o] = id.data[o + 1] = id.data[o + 2] = v; id.data[o + 3] = 255;
    }
    bg.putImageData(id, 0, 0);
    const btn = document.createElement('button'); btn.className = 'act sample'; btn.type = 'button';
    const th = document.createElement('canvas'); th.width = 60; th.height = 36;
    const tg = th.getContext('2d'); tg.imageSmoothingQuality = 'high'; tg.drawImage(big, 0, 0, 60, 36);
    const label = document.createElement('span'); label.textContent = images[i].name;
    btn.append(th, label); btn.addEventListener('click', () => pick(i));
    chipsEl.append(btn); chips.push(btn);
  }
  markChip();
}

async function loadFile(file) {
  const bmp = await decodeImage(file);
  if (!bmp) { say(`Can't open "${file.name}": this browser can't read that file as a picture.`); return; }
  const c = new OffscreenCanvas(P.WIDTH, P.HEIGHT);
  const cg = c.getContext('2d');
  cg.fillStyle = '#fff'; cg.fillRect(0, 0, P.WIDTH, P.HEIGHT);
  // fit (contain)
  const bw = bmp.naturalWidth || bmp.width, bh = bmp.naturalHeight || bmp.height;
  const s = Math.min(P.WIDTH / bw, P.HEIGHT / bh);
  const w = bw * s, h = bh * s;
  cg.drawImage(bmp, (P.WIDTH - w) / 2, (P.HEIGHT - h) / 2, w, h);
  const id = cg.getImageData(0, 0, P.WIDTH, P.HEIGHT);
  const bits = ditherRGBA(id.data);
  const was = sending ? images[sendingIndex].name : noteSending ? 'the note' : null;
  images.push({ name: (file.name || 'image').replace(/\.[^.]+$/, '').slice(0, P.NAME_MAX), bits });
  index = images.length - 1; markChip();
  if (tx.playing) {
    // a new picture while one is on the air: this one now instead
    stopTx();
    say(`Stopped ${was && was !== 'the note' ? `"${was}"` : was || 'the transmission'}, sending "${nameOf()}".`);
    send();
  } else {
    drawImage(images[index].bits);
    say(`Loaded "${nameOf()}". Press Send to transmit it.`);
  }
}

// Precompute the tone played at every symbol of the pass, for the LED.
function symbolSchedule(bits) {
  const { frames, total, coded } = buildPhysical(bits, images[index].name);
  const tones = [];
  for (let i = 0; i < P.bandLeaderSymbols(BAND); i++) tones.push({ t: P.leaderSymbol(i), sync: false }); // tone ladder
  const lock = lockFrame();
  for (let f = 0; f < P.LOCK_FRAMES; f++) { // lock frames
    tones.push({ t: -1, sync: true });
    for (let s = 0; s < P.bandSymbolsPerFrame(BAND); s++) tones.push({ t: frameSymbolBits(lock, 0, s, P.bandBits(BAND)), sync: false });
  }
  for (let f = 0; f < total; f++) {
    tones.push({ t: -1, sync: true });
    for (let s = 0; s < P.bandSymbolsPerFrame(BAND); s++) tones.push({ t: frameSymbolBits(frames, f * P.FRAME_BYTES, s, P.bandBits(BAND)), sync: false });
  }
  return { tones, coded, total };
}

function ledColor(entry) {
  if (!entry) return '#333';
  if (entry.sync) return '#e33';                     // red on sync
  const b = 0x50 + entry.t * 0x1c;                    // 8 HF tones: brighter blue for higher tones
  return `rgb(40,60,${b})`;
}

let sendingIndex = 0;
async function send() {
  if (tx.playing) { say(sending ? `Already sending "${images[sendingIndex].name}". Stop it first, or load another picture to replace it.` : 'A note is on the air. Stop it first.'); return; }
  sendingIndex = index;
  const bits = images[index].bits;
  const sr = tx.sampleRate;
  const samples = new Modem(sr, TX_AMPLITUDE).setBand(BAND).image(bits, images[index].name);
  const { tones: sched, coded, total } = symbolSchedule(bits);
  const symDur = P.bandSymbolUs(BAND) / 1e6, syncDur = P.bandSyncUs(BAND) / 1e6;
  sending = { bits, sched, symDur, syncDur, coded, total };
  if (!statusEl || !statusEl.textContent.startsWith('Stopped')) say(`Sending "${nameOf()}".`);
  const sentName = nameOf();
  await tx.play(samples, () => {
    const doneS = Math.round(tx.duration);
    sending = null; led.setAttribute('fill', '#333');
    drawImage(bits, { label: 'Done', frac: 1, doneS }); // stays until the next button press
    say(`Sent "${sentName}".`);
  });
}

function frameFor(t) {
  // map elapsed time to a schedule entry index
  let acc = 0;
  for (let i = 0; i < sending.sched.length; i++) {
    const d = sending.sched[i].sync ? sending.syncDur : sending.symDur;
    if (t < acc + d) return i;
    acc += d;
  }
  return sending.sched.length - 1;
}

function tick() {
  if (noteSending && tx.playing) {
    const t = tx.elapsed();
    drawNote(noteSending, { label: 'TX note', frac: Math.min(1, t / tx.duration), leftS: tx.duration - t, frames: 0 });
  } else if (sending && tx.playing) {
    const t = tx.elapsed();
    const i = frameFor(t);
    led.setAttribute('fill', ledColor(sending.sched[i]));
    const frac = Math.min(1, t / tx.duration);
    drawImage(sending.bits, { label: sending.coded ? 'TX zip' : 'TX raw', frac, leftS: tx.duration - t, frames: sending.total });
  }
  requestAnimationFrame(tick);
}
tick();

// controls
const act = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
const browse = (step) => {
  if (tx.playing) { say('Stop the transmission to switch pictures, or load another picture to replace it.'); return; }
  index = (index + step + images.length) % images.length; drawImage(images[index].bits); markChip(); say('');
};
act('right', () => browse(1));
act('left', () => browse(-1));
act('ok', send);
document.getElementById('send').addEventListener('click', send);
document.getElementById('stop').addEventListener('click', () => {
  const was = sending ? `"${images[sendingIndex].name}"` : noteSending ? 'the note' : null;
  stopTx(); drawImage(images[index].bits); say(was ? `Stopped ${was}.` : '');
});
document.getElementById('file').addEventListener('change', (e) => { if (e.target.files[0]) loadFile(e.target.files[0]); });
window.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('textarea, input, select')) return; // typing a note, not driving the Flipper
  if (e.key === 'ArrowRight') document.getElementById('right').dispatchEvent(new Event('click'));
  else if (e.key === 'ArrowLeft') document.getElementById('left').dispatchEvent(new Event('click'));
  else if (e.key === 'Enter' || e.key === ' ') send();
});

// ---- notes ----
const CYR = ['a','b','v','g','d','e','zh','z','i','y','k','l','m','n','o','p','r','s','t','u','f','h','ts','ch','sh','sch','','y','','e','yu','ya'];
function translit(text) {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) out += ch;
    else if (cp >= 0x430 && cp <= 0x44f) out += CYR[cp - 0x430];
    else if (cp >= 0x410 && cp <= 0x42f) out += CYR[cp - 0x410];
    else if (cp === 0x451 || cp === 0x401) out += 'e';
  }
  return out;
}
function noteName(text) {
  const s = translit((text.split('\n')[0] || '')).slice(0, P.NOTE_NAME_MAX).trim();
  return s || 'note';
}
// Word wrap with a hard break of overlong words, like note_draw_wrapped() on the device.
function wrapLines(str, maxW, maxLines) {
  const out = [];
  for (const para of str.split('\n')) {
    let line = '';
    for (const ch of para) {
      const cand = line + ch;
      if (FONT.width(cand) <= maxW) { line = cand; continue; }
      const sp = line.lastIndexOf(' ');
      if (ch === ' ') { out.push(line); line = ''; }
      else if (sp > 0) { out.push(line.slice(0, sp)); line = line.slice(sp + 1) + ch; }
      else { out.push(line); line = ch; }
      if (out.length >= maxLines) return out;
    }
    out.push(line);
    if (out.length >= maxLines) return out;
  }
  return out;
}
// A note has no picture sheet: the text in a paper box, the panel on the right (sstv_app.c).
function drawNote(str, st = null) {
  g.fillStyle = BACK; g.fillRect(0, 0, LCD_W, LCD_H);
  g.fillStyle = INK;
  const fx = 1, fy = 2, fw = PANEL_X - 5, fh = 50;
  box(fx, fy, fw, 1); box(fx, fy + fh - 1, fw, 1); box(fx, fy, 1, fh); box(fx + fw - 1, fy, 1, fh);
  const fh1 = FONT.height, lh = fh1 + 2, maxLines = Math.max(1, Math.floor((fh - 4) / lh));
  wrapLines(str, PANEL_X - 11, maxLines).forEach((ln, i) => text(ln, 4, fy + fh1 + i * lh));
  drawPanel(st);
  snap1bit();
}
const noteEl = document.getElementById('note-text');
async function sendNote() {
  const text = (noteEl.value || '').slice(0, P.NOTE_MAX_CHARS);
  if (!text) { say('Type a note first.'); return; }
  if (tx.playing) { // a note while something is on the air: the note now instead
    const was = sending ? `"${images[sendingIndex].name}"` : 'the previous note';
    stopTx(); say(`Stopped ${was}, sending the note.`);
  } else say('Sending the note.');
  const sr = tx.sampleRate;
  const samples = new Modem(sr, TX_AMPLITUDE).setBand(BAND).note(text, noteName(text));
  sending = null;
  noteSending = text;
  led.setAttribute('fill', '#39f');
  await tx.play(samples, () => { noteSending = null; led.setAttribute('fill', '#333'); drawImage(images[index].bits); say('Sent the note.'); });
}
document.getElementById('send-note').addEventListener('click', sendNote);
if (noteEl) noteEl.addEventListener('input', () => drawNote(noteEl.value));
