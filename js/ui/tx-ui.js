// Transmitter UI (Flipper). Loads pictures, dithers to 400x240 1-bit, plays them as sound.
import * as P from '../protocol/params.js';
import { ditherRGBA, bitsToRGBA } from '../protocol/image.js';
import { buildPhysical, frameSymbol } from '../protocol/frame.js';
import { Modem } from '../protocol/modem.js';
import { previewMake } from '../protocol/preview.js';
import { TxAudio } from '../audio/tx-audio.js';

const lcd = document.getElementById('lcd');
const g = lcd.getContext('2d');
const led = document.getElementById('led');
const tx = new TxAudio();
let images = [];        // { name, bits }
let index = 0;
let sending = null;      // { total, coded, dataFrames, intro, symbolTones } while playing

function checkerBits() {
  const b = new Uint8Array(P.IMAGE_BYTES);
  for (let y = 0; y < P.HEIGHT; y++) for (let x = 0; x < P.WIDTH; x++)
    if (((x >> 4) + (y >> 4)) & 1) b[y * P.LINE_BYTES + (x >> 3)] |= 0x80 >> (x & 7);
  return b;
}
images.push({ name: 'checker', bits: checkerBits() });

const rgba = new Uint8ClampedArray(P.WIDTH * P.HEIGHT * 4);
// The real Flipper LCD is 128x64: the picture goes out as the same 80x48 dithered sheet the
// receiver gets (sliding up through the top edge while sending) with a status panel on the right.
const LCD_W = 128, LCD_H = 64, SHEET_X = 2, SHEET_Y = 8, PANEL_X = 88;
const INK = '#2b1508', BACK = '#f39a52';
const previewCache = new WeakMap();
function previewOf(bits) {
  let pv = previewCache.get(bits);
  if (!pv) { pv = new Uint8Array(P.PREVIEW_BYTES); previewMake(bits, pv); previewCache.set(bits, pv); }
  return pv;
}
function drawImage(bits, progressLines = -1) {
  g.fillStyle = BACK; g.fillRect(0, 0, LCD_W, LCD_H);
  const frac = progressLines >= 0 ? Math.min(1, progressLines / P.HEIGHT) : 0;
  const y0 = Math.round(SHEET_Y - frac * (SHEET_Y + P.PREVIEW_H));
  const pv = previewOf(bits);
  g.fillStyle = INK;
  g.fillRect(SHEET_X - 1, y0 - 1, P.PREVIEW_W + 2, 1); g.fillRect(SHEET_X - 1, y0 + P.PREVIEW_H, P.PREVIEW_W + 2, 1);
  g.fillRect(SHEET_X - 1, y0 - 1, 1, P.PREVIEW_H + 2); g.fillRect(SHEET_X + P.PREVIEW_W, y0 - 1, 1, P.PREVIEW_H + 2);
  for (let y = 0; y < P.PREVIEW_H; y++) {
    const sy = y0 + y; if (sy < 0 || sy >= LCD_H) continue;
    for (let x = 0; x < P.PREVIEW_W; x++)
      if ((pv[y * P.PREVIEW_LINE_BYTES + (x >> 3)] >> (7 - (x & 7))) & 1) g.fillRect(SHEET_X + x, sy, 1, 1);
  }
  g.fillRect(PANEL_X - 3, 0, 1, LCD_H);
  g.font = 'bold 9px system-ui'; g.textBaseline = 'alphabetic';
  g.fillText(progressLines >= 0 ? 'TX' : 'Ready', PANEL_X, 10);
  if (progressLines >= 0) {
    const bw = LCD_W - PANEL_X - 2;
    g.fillRect(PANEL_X, 13, bw, 5);
    g.fillStyle = BACK; g.fillRect(PANEL_X + 1, 14, bw - 2, 3);
    g.fillStyle = INK; g.fillRect(PANEL_X + 1, 14, Math.round((bw - 2) * frac), 3);
    g.font = '9px system-ui'; g.fillText(Math.round(frac * 100) + '%', PANEL_X, 30);
  }
}
drawImage(images[0].bits);

async function loadFile(file) {
  const bmp = await createImageBitmap(file);
  const c = new OffscreenCanvas(P.WIDTH, P.HEIGHT);
  const cg = c.getContext('2d');
  cg.fillStyle = '#fff'; cg.fillRect(0, 0, P.WIDTH, P.HEIGHT);
  // fit (contain)
  const s = Math.min(P.WIDTH / bmp.width, P.HEIGHT / bmp.height);
  const w = bmp.width * s, h = bmp.height * s;
  cg.drawImage(bmp, (P.WIDTH - w) / 2, (P.HEIGHT - h) / 2, w, h);
  const id = cg.getImageData(0, 0, P.WIDTH, P.HEIGHT);
  const bits = ditherRGBA(id.data);
  images.push({ name: (file.name || 'image').replace(/\.[^.]+$/, '').slice(0, P.NAME_MAX), bits });
  index = images.length - 1;
  drawImage(images[index].bits);
}

// Precompute the tone played at every symbol of the pass, for the LED.
function symbolSchedule(bits) {
  const { frames, total } = buildPhysical(bits, images[index].name);
  const tones = [];
  for (let i = 0; i < P.LEADER_SYMBOLS; i++) tones.push({ t: i % P.NUM_TONES, sync: false });
  for (let f = 0; f < total; f++) {
    tones.push({ t: -1, sync: true });
    for (let s = 0; s < P.SYMBOLS_PER_FRAME; s++) tones.push({ t: frameSymbol(frames, f * P.FRAME_BYTES, s), sync: false });
  }
  return tones;
}

function ledColor(entry) {
  if (!entry) return '#333';
  if (entry.sync) return '#e33';                     // red on sync
  if (entry.t === 0) return '#333';                  // silence
  const b = [0, 0x66, 0x99, 0xff][entry.t] || 0xff;  // brighter blue for higher tones
  return `rgb(40,60,${b})`;
}

async function send() {
  if (tx.playing) return;
  const bits = images[index].bits;
  const sr = tx.sampleRate;
  const samples = new Modem(sr).image(bits, images[index].name);
  const sched = symbolSchedule(bits);
  const symDur = P.SYMBOL_US / 1e6, syncDur = P.SYNC_US / 1e6;
  sending = { bits, sched, symDur, syncDur };
  await tx.play(samples, () => { sending = null; led.setAttribute('fill', '#333'); drawImage(bits); });
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
  if (sending && tx.playing) {
    const t = tx.elapsed();
    const i = frameFor(t);
    led.setAttribute('fill', ledColor(sending.sched[i]));
    const frac = Math.min(1, t / tx.duration);
    drawImage(sending.bits, Math.floor(frac * P.HEIGHT));
  }
  requestAnimationFrame(tick);
}
tick();

// controls
const act = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
act('right', () => { if (!tx.playing) { index = (index + 1) % images.length; drawImage(images[index].bits); } });
act('left', () => { if (!tx.playing) { index = (index + images.length - 1) % images.length; drawImage(images[index].bits); } });
act('ok', send);
document.getElementById('send').addEventListener('click', send);
document.getElementById('stop').addEventListener('click', () => { tx.stop(); sending = null; led.setAttribute('fill', '#333'); drawImage(images[index].bits); });
document.getElementById('file').addEventListener('change', (e) => { if (e.target.files[0]) loadFile(e.target.files[0]); });
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') document.getElementById('right').dispatchEvent(new Event('click'));
  else if (e.key === 'ArrowLeft') document.getElementById('left').dispatchEvent(new Event('click'));
  else if (e.key === 'Enter' || e.key === ' ') send();
});

// ---- notes ----
const NOTE_PRESETS = [
  'Hello from the browser!',
  'Meet me at the usual spot, 7pm.',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 - text test pattern',
  'The quick brown fox jumps over the lazy dog.',
  'Privet! Eto zametka - proverka UTF-8.',
  'Привет! Это заметка на русском - проверка UTF-8.',
];
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
function drawNote(text) {
  g.fillStyle = BACK; g.fillRect(0, 0, LCD_W, LCD_H);
  g.fillStyle = INK; g.fillRect(1, 2, PANEL_X - 6, 50);
  g.fillStyle = BACK; g.fillRect(2, 3, PANEL_X - 8, 48);
  g.fillStyle = INK; g.font = '8px system-ui'; g.textBaseline = 'top';
  const maxW = PANEL_X - 12, words = text.split(/\s+/); let line = '', y = 5, lines = 0;
  for (const w of words) {
    const cand = line ? line + ' ' + w : w;
    if (g.measureText(cand).width > maxW && line) { g.fillText(line, 4, y); y += 10; line = w; if (++lines >= 4) { line = ''; break; } }
    else line = cand;
  }
  if (line && lines < 4) g.fillText(line, 4, y);
  g.fillRect(PANEL_X - 3, 0, 1, LCD_H);
  g.font = 'bold 9px system-ui'; g.textBaseline = 'alphabetic'; g.fillText('TX note', PANEL_X, 10);
}
const noteEl = document.getElementById('note-text');
const presetEl = document.getElementById('note-preset');
if (presetEl) {
  for (const p of NOTE_PRESETS) { const o = document.createElement('option'); o.value = p; o.textContent = p.slice(0, 32); presetEl.appendChild(o); }
  presetEl.addEventListener('change', () => { if (presetEl.value) { noteEl.value = presetEl.value; drawNote(presetEl.value); presetEl.selectedIndex = 0; } });
}
async function sendNote() {
  if (tx.playing) return;
  const text = (noteEl.value || '').slice(0, P.NOTE_MAX_CHARS);
  if (!text) return;
  const sr = tx.sampleRate;
  const samples = new Modem(sr).note(text, noteName(text));
  sending = null;
  led.setAttribute('fill', '#39f');
  drawNote(text);
  await tx.play(samples, () => { led.setAttribute('fill', '#333'); drawImage(images[index].bits); });
}
document.getElementById('send-note').addEventListener('click', sendNote);
if (noteEl) noteEl.addEventListener('input', () => drawNote(noteEl.value));
