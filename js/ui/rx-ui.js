// Receiver UI (Playdate). Listens on the mic, decodes, and draws the Receive screen of the
// Playdate app (playdate/src/main.c): the dolphin-and-console scene, the title bar and LED,
// the picture sheet rising with its drawing line, the progress pill, "Verifying", the pause
// banner, the finished banner, the sticky note and the debug panel. Same fonts, images and
// 1-bit pixels (js/ui/pd-gfx.js), shown in the Playdate LCD's two tones.
import * as P from '../protocol/params.js';
import { Demod } from '../protocol/demod.js';
import { Rx } from '../protocol/rx.js';
import { RxAudio } from '../audio/rx-audio.js';
import { Gfx, BLACK, WHITE, fonts, images } from './pd-gfx.js';

const LCD_COLUMNS = 400, LCD_ROWS = 240;
const BAR_H = 30, PANEL_W = 200, SHEET_LEAD = 50, LOST_TIMEOUT_MS = 5000, PILL_H = 20;
const CONSOLE = { w: 140, h: 118, sx: 7, sy: 7, sw: 88, sh: 53 };
const DOLPHIN_H = 49;

const fontUi = fonts['Roobert-10-Bold'], fontNum = fonts['Roobert-9-Mono-Condensed'];
const fontGlyph = fonts['Roobert-11-Medium-extended'], fontNotes = fonts['Notes-14'];

const cv = document.getElementById('pd');
const ctx = cv.getContext('2d');
const gfx = new Gfx();

// ---- receive state (mirrors main.c) ----
const img = new Uint8Array(P.IMAGE_BYTES);          // received picture, 1 = black (PBM)
const disp = new Uint8Array(P.IMAGE_BYTES);         // picture with the placeholder in unseen halves
const phBits = new Uint8Array(P.IMAGE_BYTES);       // full-size placeholder (checker of the preview)
const segSeen = new Uint8Array(P.HEIGHT);
const previewBits = new Uint8Array(P.PREVIEW_BYTES), previewHave = new Uint8Array(P.PREVIEW_CHUNKS);
const tinyBits = new Uint8Array(P.TINY_BYTES), tinyHave = new Uint8Array(P.TINY_CHUNKS);
const consoleBits = new Uint8Array(P.PREVIEW_BYTES); // 80x48 preview shown in the console icon
const noteBuf = new Uint8Array(P.NOTE_MAX_CHARS + 64);
let noteText = '';
let previewChunks = 0, previewDirty = false;
let segsDone = 0, linesReached = 0, revealed = 0, finishedLines = 0;
let started = false, finished = false, rxPaused = false;
let startedMs = 0, finishedMs = 0, lastDataMs = 0, pauseAnchor = 0, hearingMs = -1e9;
let totalFrames = 0, name = '';
let sheetY = LCD_ROWS, barY = 0;
let showPanel = false;
let ledFrameMs = -1e9, ledBlockMs = -1e9, lastBlockMs = -1e9, lastBlockKind = 'data';
let micState = 0; // 0 not asked, 1 listening, -1 denied
let untitled = 0;
let micLabel = '';

const rxAudio = new RxAudio();
let demod = null, rx = null;
const nowMs = () => performance.now();
const bit = (bits, lb, x, y) => (bits[y * lb + (x >> 3)] >> (7 - (x & 7))) & 1;

function previewRowOk(py) {
  return previewHave[Math.floor(py * P.PREVIEW_LINE_BYTES / P.PREVIEW_CHUNK)] &&
    previewHave[Math.floor((py * P.PREVIEW_LINE_BYTES + P.PREVIEW_LINE_BYTES - 1) / P.PREVIEW_CHUNK)];
}
const tinyRowOk = (ty) => tinyHave[Math.floor(ty * P.TINY_LINE_BYTES / P.PREVIEW_CHUNK)];
function placeholderBit(x, line) {
  const py = Math.floor(line / (P.HEIGHT / P.PREVIEW_H));
  if (previewRowOk(py)) return bit(previewBits, P.PREVIEW_LINE_BYTES, Math.floor(x / (P.WIDTH / P.PREVIEW_W)), py);
  const ty = Math.floor(line / (P.HEIGHT / P.TINY_H));
  if (tinyRowOk(ty)) return bit(tinyBits, P.TINY_LINE_BYTES, Math.floor(x / (P.WIDTH / P.TINY_W)), ty);
  return 0;
}
// black preview pixels become a 50 % checker so real lines read as sharper
function paintPlaceholderLine(line) {
  for (let half = 0; half < 2; half++) {
    if (segSeen[line] & (1 << half)) continue;
    for (let i = half * P.SEG_BYTES; i < (half + 1) * P.SEG_BYTES; i++) {
      let v = 0;
      for (let b = 0; b < 8; b++) { const x = i * 8 + b; if (placeholderBit(x, line) && ((x + line) & 1) === 0) v |= 0x80 >> b; }
      disp[line * P.LINE_BYTES + i] = v;
    }
  }
}
function previewRefresh() {
  consoleBits.fill(0);
  for (let y = 0; y < P.PREVIEW_H; y++) for (let x = 0; x < P.PREVIEW_W; x++)
    if (placeholderBit(x * (P.WIDTH / P.PREVIEW_W), y * (P.HEIGHT / P.PREVIEW_H))) consoleBits[y * P.PREVIEW_LINE_BYTES + (x >> 3)] |= 0x80 >> (x & 7);
  phBits.fill(0);
  for (let yy = 0; yy < P.HEIGHT; yy++) for (let xx = 0; xx < P.WIDTH; xx++)
    if (placeholderBit(xx, yy) && ((xx + yy) & 1) === 0) phBits[yy * P.LINE_BYTES + (xx >> 3)] |= 0x80 >> (xx & 7);
  for (let line = 0; line < P.HEIGHT; line++) paintPlaceholderLine(line);
}

function clearImage() {
  noteBuf.fill(0); noteText = '';
  img.fill(0); disp.fill(0); segSeen.fill(0);
  previewBits.fill(0); previewHave.fill(0); tinyBits.fill(0); tinyHave.fill(0);
  previewChunks = 0; previewRefresh();
  segsDone = 0; linesReached = 0; revealed = 0;
  rxPaused = false; sheetY = LCD_ROWS; barY = 0;
  finished = false; started = false; totalFrames = 0;
  if (rx) rx.resetCounters();
}
function finish(now) {
  finished = true; started = false; finishedMs = now;
  finishedLines = segsDone >> 1;
  linesReached = P.HEIGHT; revealed = P.HEIGHT;
}
function beginPass(now) {
  if (started) return;
  clearImage();
  started = true; startedMs = now; lastDataMs = now;
}

function makeRx() {
  rx = new Rx({
    onPixels(line, x, nb, px) {
      const now = nowMs(); beginPass(now); lastDataMs = now; lastBlockKind = 'data';
      if (line >= P.HEIGHT || x + nb > P.LINE_BYTES) return;
      for (let i = 0; i < nb; i++) { img[line * P.LINE_BYTES + x + i] = px[i]; disp[line * P.LINE_BYTES + x + i] = px[i]; }
      if (line + 1 > linesReached) linesReached = line + 1;
      const mask = nb === P.LINE_BYTES ? 3 : (x === 0 ? 1 : 2);
      const before = segSeen[line];
      segSeen[line] |= mask;
      segsDone += ((segSeen[line] & 1) - (before & 1)) + (((segSeen[line] >> 1) & 1) - ((before >> 1) & 1));
    },
    onPreview(layer, chunk, nb, data) {
      const now = nowMs(); beginPass(now); lastDataMs = now; lastBlockKind = 'meta';
      if (layer === 2) return; // schedule: only the C sheet uses it
      if (layer === 0) { if (chunk < 0 || chunk >= P.TINY_CHUNKS) return; tinyBits.set(data.subarray(0, nb), chunk * P.PREVIEW_CHUNK); if (!tinyHave[chunk]) previewChunks++; tinyHave[chunk] = 1; }
      else { if (chunk < 0 || chunk >= P.PREVIEW_CHUNKS) return; previewBits.set(data.subarray(0, nb), chunk * P.PREVIEW_CHUNK); if (!previewHave[chunk]) previewChunks++; previewHave[chunk] = 1; }
      previewDirty = true;
    },
    onMeta(nm, isEnd, total) {
      const now = nowMs(); lastBlockKind = 'meta';
      if (isEnd) { finish(now); return; }
      clearImage();
      started = true; startedMs = now; totalFrames = total;
      name = nm && nm.trim() ? nm : (rx.note ? `note_${++untitled}` : `untitled_${++untitled}`);
      lastDataMs = now;
    },
    onNote(chunk, nb, buf) {
      const off = chunk * P.NOTE_CHUNK;
      for (let k = 0; k < nb && off + k < P.NOTE_MAX_CHARS; k++) noteBuf[off + k] = buf[k];
      let z = noteBuf.indexOf(0); if (z < 0) z = noteBuf.length;
      noteText = new TextDecoder().decode(noteBuf.subarray(0, z));
      lastBlockKind = 'data';
    },
    onControl(sub, arg) {
      const now = nowMs();
      if (sub === P.META_PAUSE) { if (!rxPaused) { rxPaused = true; pauseAnchor = now; } }
      else if (sub === P.META_RESUME && rxPaused) {
        rxPaused = false;
        const n = Math.max(P.ILEAVE, arg | 0); // set the origin so elapsed maps to physical frame n now
        startedMs = now - (n - P.ILEAVE) * physUsNow() / 1000;
        lastDataMs = now;
      }
    },
  });
}

// Recording exactly what the page captures (after the browser's audio path), for offline
// analysis: Record -> Stop -> Save. Capped at REC_MAX_S so a forgotten take can't eat memory.
const REC_MAX_S = 600;
let recState = 'idle';  // idle | recording | stopped
let recChunks = [], recSamples = 0, recRate = 0;
const recBtn = document.getElementById('rec'), saveBtn = document.getElementById('save');
const recClock = () => { const s = Math.floor(recSamples / (recRate || 1)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
// Touch the buttons only when their text actually changes: rewriting a button's content every
// frame makes the browser drop clicks on it (the press and release land on different content).
const setText = (el, t) => { if (el.textContent !== t) el.textContent = t; };
function recUi() {
  if (!recBtn) return;
  setText(recBtn, recState === 'recording' ? `■ Stop ${recClock()}` : '● Record');
  recBtn.classList.toggle('rec-on', recState === 'recording');
  saveBtn.style.display = recState === 'stopped' && recSamples > 0 ? '' : 'none';
  setText(saveBtn, `Save ${recClock()} WAV`);
}
function recPush(f32) {
  if (recState !== 'recording') return;
  const pcm = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) { const v = f32[i] * 32768; pcm[i] = v > 32767 ? 32767 : v < -32768 ? -32768 : v | 0; }
  recChunks.push(pcm); recSamples += pcm.length;
  if (recSamples >= recRate * REC_MAX_S) { recState = 'stopped'; recUi(); }
}
async function recToggle() {
  if (recState === 'recording') { recState = 'stopped'; recUi(); return; }
  if (!demod) await listen();
  recChunks = []; recSamples = 0; recState = 'recording'; recUi();
}
function saveWav() {
  const n = recSamples;
  const b = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o, t) => { for (let i = 0; i < t.length; i++) b.setUint8(o + i, t.charCodeAt(i)); };
  str(0, 'RIFF'); b.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt '); b.setUint32(16, 16, true);
  b.setUint16(20, 1, true); b.setUint16(22, 1, true); b.setUint32(24, recRate, true); b.setUint32(28, recRate * 2, true);
  b.setUint16(32, 2, true); b.setUint16(34, 16, true); str(36, 'data'); b.setUint32(40, n * 2, true);
  let o = 44;
  for (const c of recChunks) for (let i = 0; i < c.length; i++, o += 2) b.setInt16(o, c[i], true);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([b.buffer], { type: 'audio/wav' }));
  a.download = `sftv-rx-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.wav`;
  a.click();
}

function makeDemod(sr, band) {
  const d = new Demod(sr, (frame, margin) => {
    const now = nowMs();
    ledFrameMs = now;
    const before = rx.blocksOk, kindBefore = lastBlockKind;
    lastBlockKind = 'parity'; // stays so unless a data/meta callback fires for this frame
    rx.phys_frame(frame, margin);
    if (rx.blocksOk !== before) { ledBlockMs = now; lastBlockMs = now; }
    else lastBlockKind = kindBefore;
  });
  d.setBand(band);
  return d;
}

// Band sniffer (mirror of the Playdate app's): one demodulator on the active band, a block
// Goertzel on both bands; switch to HF when 18-21 kHz is loud while 3-5.5 kHz is quiet (audible
// passes leak harmonics up there, always with loud fundamentals), back on sustained audible
// tones, never in the middle of a pass.
const SNIFF_HZ = [3000, 3500, 4000, 5500, 18000, 19000, 20000, 21000];
const SNIFF_BLOCK = 256, SNIFF_HOLD = 20, SNIFF_HF_ON = 8, SNIFF_AUD_QUIET = 20, SNIFF_AUD_ON = 60;
let activeBand = P.BAND_AUDIBLE, sniffRate = 48000;
function physUsNow() { return P.bandPhysUs(activeBand); } // frame length of the band in use
let sniffCoef = [], sniffS1 = new Float64Array(8), sniffS2 = new Float64Array(8), sniffFill = 0, sniffHfRun = 0, sniffAudRun = 0;
function sniffInit(sr) { sniffRate = sr; sniffCoef = SNIFF_HZ.map((f) => 2 * Math.cos(2 * Math.PI * f / sr)); }
function setBand(band) {
  if (band === activeBand) return;
  activeBand = band;
  demod = makeDemod(sniffRate, band);
  rx.count = 0;
}
function sniff(x) {
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    for (let k = 0; k < 8; k++) { const s0 = v + sniffCoef[k] * sniffS1[k] - sniffS2[k]; sniffS2[k] = sniffS1[k]; sniffS1[k] = s0; }
    if (++sniffFill < SNIFF_BLOCK) continue;
    let aud = 0, hf = 0;
    for (let k = 0; k < 8; k++) {
      const pw = sniffS1[k] * sniffS1[k] + sniffS2[k] * sniffS2[k] - sniffCoef[k] * sniffS1[k] * sniffS2[k];
      const a = Math.sqrt(Math.max(0, pw)) * 2 / SNIFF_BLOCK;
      if (k < 4) aud = Math.max(aud, a); else hf = Math.max(hf, a);
      sniffS1[k] = sniffS2[k] = 0;
    }
    sniffFill = 0;
    sniffHfRun = hf > SNIFF_HF_ON && aud < SNIFF_AUD_QUIET ? sniffHfRun + 1 : 0;
    sniffAudRun = aud > SNIFF_AUD_ON ? sniffAudRun + 1 : 0;
    if (started && !finished && nowMs() - lastDataMs < 3000) continue;
    if (activeBand === P.BAND_AUDIBLE && sniffHfRun >= SNIFF_HOLD) setBand(P.BAND_HF);
    else if (activeBand === P.BAND_HF && sniffAudRun >= SNIFF_HOLD) setBand(P.BAND_AUDIBLE);
  }
}

async function listen() {
  if (demod) return;
  const sr = await rxAudio.start((f32) => {
    if (!demod) return;
    recPush(f32);
    const s = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) { const v = f32[i] * 32768; s[i] = v > 32767 ? 32767 : v < -32768 ? -32768 : v | 0; }
    sniff(s);
    demod.feed(s, s.length);
  });
  recRate = sr;
  const tr = rxAudio.stream && rxAudio.stream.getAudioTracks()[0];
  micLabel = tr ? tr.label : '';
  makeRx();
  sniffInit(sr);
  demod = makeDemod(sr, P.BAND_AUDIBLE);
  micState = 1;
  document.getElementById('listen').textContent = 'Listening…';
}

// ---- drawing helpers ----
function textCentered(str, cx, y) { gfx.drawText(str, cx - (gfx.textWidth(str) >> 1), y); }
function fitText(str, maxW) {
  if (gfx.textWidth(str) <= maxW) return str;
  for (let n = str.length - 1; n > 1; n--) { const t = str.slice(0, n) + '..'; if (gfx.textWidth(t) <= maxW) return t; }
  return '..';
}
function drawPill(str, x, y, filled) {
  const h = gfx.font.height + 4, w = gfx.textWidth(str) + 12;
  if (filled) { gfx.fillRoundRect(x, y, w, h, h >> 1, BLACK); gfx.drawText(str, x + 6, y + 2, true); }
  else { gfx.drawRoundRect(x, y, w, h, h >> 1, 1, BLACK); gfx.drawText(str, x + 6, y + 2); }
  return w;
}
function drawLed() {
  const now = nowMs(), cx = LCD_COLUMNS - 16, cy = BAR_H >> 1;
  gfx.fillEllipse(cx - 8, cy - 8, 16, 16, 0, 0, WHITE);
  if (now - ledBlockMs < 400) gfx.drawEllipse(cx - 7, cy - 7, 14, 14, 3, 0, 0, BLACK);
  else if (now - ledFrameMs < 150) gfx.fillEllipse(cx - 6, cy - 6, 12, 12, 0, 0, BLACK);
  else gfx.drawEllipse(cx - 6, cy - 6, 12, 12, 1, 0, 0, BLACK);
}
function drawTitleBar(title) {
  gfx.fillRect(0, 0, LCD_COLUMNS, BAR_H, BLACK);
  gfx.setFont(fontGlyph);
  gfx.drawText(title, 10, (BAR_H - fontGlyph.height) >> 1, true);
}
function drawConsole(x, y, withPreview) {
  gfx.drawImage(images.console, x, y);
  if (withPreview) {
    gfx.fillRect(x + CONSOLE.sx, y + CONSOLE.sy, CONSOLE.sw, CONSOLE.sh, WHITE);
    gfx.drawBits(consoleBits, P.PREVIEW_W, P.PREVIEW_H, P.PREVIEW_LINE_BYTES,
      x + CONSOLE.sx + ((CONSOLE.sw - P.PREVIEW_W) >> 1), y + CONSOLE.sy + ((CONSOLE.sh - P.PREVIEW_H) >> 1));
  }
}
function drawSpout(x0, y0, x1, y1, t) {
  const drops = 9;
  for (let k = 0; k < drops; k++) {
    const u = (t + k / drops) % 1;
    const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u - 40 * Math.sin(Math.PI * u);
    const r = 2 + Math.trunc(2 * Math.sin(Math.PI * u));
    gfx.fillEllipse(Math.trunc(x) - r, Math.trunc(y) - r, 2 * r, 2 * r, 0, 0, BLACK);
  }
}
function sceneDolphin(now) {
  if (!started) return now - hearingMs < 500 ? images.frame_22 : images.frame_11;
  if (now - lastBlockMs < 800) {
    if (lastBlockKind === 'parity') return images.frame_41;
    if (lastBlockKind === 'data') return images.frame_51;
    return images.frame_31;
  }
  return images.frame_51;
}
function isNote() { return !!(rx && rx.note); }

// Intro scene: the dolphin sends the preview to a Playdate.
function drawScene() {
  const now = rxPaused ? pauseAnchor : nowMs();
  gfx.clear(WHITE);
  const cx = 240, cy = 60, dx = 20, dy = cy + ((CONSOLE.h - DOLPHIN_H * 2) >> 1), textCx = LCD_COLUMNS >> 1;
  gfx.drawImage(sceneDolphin(now), dx, dy, { mode: 'ink', scale: 2 });
  drawConsole(cx, cy, started && !isNote());
  gfx.setFont(fontUi);
  if (started) {
    drawSpout(dx + 70, dy + 2, cx + CONSOLE.sx + (CONSOLE.sw >> 1), cy + CONSOLE.sy + (CONSOLE.sh >> 1), (now % 1200) / 1200);
    if (isNote()) textCentered('Receiving note', textCx, 200);
    else if (segsDone === 0) {
      const introTotal = P.INTRO_FRAMES + (rx && rx.coded ? P.SCHEDULE_CHUNKS : 0) + P.OUTER_PARITY;
      let est = (now - startedMs) / (physUsNow() / 1000);
      if (previewChunks < P.INTRO_FRAMES) est = Math.min(Math.max(est, previewChunks), previewChunks + P.ILEAVE);
      est = Math.min(Math.max(est, 0), introTotal);
      const ty = 200;
      textCentered('Receiving preview', textCx, ty);
      const bw = 220, bx = textCx - (bw >> 1), by = ty + fontUi.height + 8;
      gfx.drawRoundRect(bx, by, bw, 10, 5, 1, BLACK);
      const fill = Math.trunc((bw - 4) * est / introTotal);
      if (fill > 0) gfx.fillRoundRect(bx + 2, by + 2, fill, 6, 3, BLACK);
    }
  } else {
    const hint = micState < 0 ? 'microphone access denied' : micState === 0 ? 'press "Allow mic & listen" below' : 'start a transmission on the Flipper';
    textCentered(hint, textCx, 208);
  }
}

function drawStickyNote(x, y, w, h, text) {
  const fold = w < 120 ? 8 : 16;
  gfx.fillRect(x, y, w, h, WHITE);
  gfx.drawLine(x, y, x + w - fold, y, 1, BLACK);
  gfx.drawLine(x, y, x, y + h, 1, BLACK);
  gfx.drawLine(x, y + h, x + w, y + h, 1, BLACK);
  gfx.drawLine(x + w, y + fold, x + w, y + h, 1, BLACK);
  gfx.drawLine(x + w - fold, y, x + w, y + fold, 1, BLACK);
  gfx.fillTriangle(x + w - fold, y, x + w, y + fold, x + w - fold, y + fold, BLACK);
  gfx.drawLine(x + w - fold, y, x + w - fold, y + fold, 1, WHITE);
  gfx.drawLine(x + w - fold, y + fold, x + w, y + fold, 1, WHITE);
  gfx.setFont(fontNotes);
  const fh = fontNotes.height, margin = w < 120 ? 4 : 10, lineH = fh + 2;
  const tx = x + margin, right = x + w - margin, bottom = y + h - margin;
  let ty = y + margin, line = '';
  const flush = () => { if (line && ty + fh <= bottom) gfx.drawText(line, tx, ty); ty += lineH; line = ''; };
  for (const para of text.split('\n')) {
    for (const word of para.split(' ').filter(Boolean)) {
      const cand = line ? line + ' ' + word : word;
      if (tx + gfx.textWidth(cand) <= right || !line) line = cand;
      else { flush(); line = word; }
      if (ty + fh > bottom) return;
    }
    flush();
    if (ty + fh > bottom) return;
  }
}

function passProgress(enow) {
  if (!started || totalFrames <= 0) return -1;
  const phys = Math.min(totalFrames, Math.max(0, P.ILEAVE + (enow - startedMs) * 1000 / physUsNow()));
  return phys / totalFrames;
}
function drawMiniBar(x, y, w, h, frac) {
  gfx.drawRoundRect(x, y, w, h, h >> 1, 1, WHITE);
  const fill = Math.round((w - 4) * frac);
  if (fill > 0) gfx.fillRoundRect(x + 2, y + 2, fill, h - 4, (h - 4) >> 1, WHITE);
}
function spinner(x, y, sp, now) {
  const a0 = (now % 900) / 900 * 360;
  gfx.drawEllipse(x, y, sp, sp, 2, a0, a0 + 270, WHITE);
}
function drawProgressPill(now, enow) {
  const frac = passProgress(enow), pad = 10, bw = 64, bh = 8;
  if (frac < 0) {
    const sp = 12, w = pad + sp + pad, bx = LCD_COLUMNS - w - 10, by = LCD_ROWS - PILL_H - 10;
    gfx.fillRoundRect(bx, by, w, PILL_H, PILL_H >> 1, BLACK);
    spinner(bx + pad, by + ((PILL_H - sp) >> 1), sp, now);
    return;
  }
  const w = pad + bw + pad, bx = LCD_COLUMNS - w - 10, by = LCD_ROWS - PILL_H - 10;
  gfx.fillRoundRect(bx, by, w, PILL_H, PILL_H >> 1, BLACK);
  drawMiniBar(bx + pad, by + ((PILL_H - bh) >> 1), bw, bh, frac);
}

function drawPanel() {
  const x0 = LCD_COLUMNS - PANEL_W, now = nowMs();
  gfx.fillRect(x0, 0, PANEL_W, LCD_ROWS, WHITE);
  gfx.drawLine(x0, 0, x0, LCD_ROWS, 1, BLACK);
  const x = x0 + 8, right = x0 + PANEL_W - 8;
  let y = 8;
  gfx.setFont(fontUi);
  const lh = fontUi.height + 3;
  gfx.drawText(fitText(name || '-', PANEL_W - 36), x, y);
  y += lh + 4;
  const quiet = segsDone > 0 && !finished && !rxPaused && now - lastDataMs > LOST_TIMEOUT_MS;
  const state = rxPaused ? 'PAUSE' : finished ? 'DONE' : segsDone === P.NUM_SEGS ? 'DONE' : quiet ? 'LOST' : (segsDone > 0 || started) ? 'RX' : 'IDLE';
  let px = x;
  px += drawPill(state, px, y, true) + 5;
  px += drawPill(isNote() ? 'TXT' : rx && rx.coded ? 'ZIP' : 'RAW', px, y, false) + 5;
  if (activeBand === P.BAND_HF) drawPill('HF', px, y, false);
  y += fontUi.height + 12;
  const barW = PANEL_W - 16;
  gfx.drawRoundRect(x, y, barW, 8, 4, 1, BLACK);
  const got = isNote() ? noteText.length : segsDone;
  const tot = isNote() ? (rx.noteLen > 0 ? rx.noteLen : Math.max(1, got)) : P.NUM_SEGS;
  const fill = Math.min(barW - 2, Math.trunc((barW - 2) * got / tot));
  if (fill > 0) gfx.fillRoundRect(x + 1, y + 1, fill, 6, 3, BLACK);
  y += 12;
  gfx.drawText(isNote() ? `${noteText.length} / ${rx.noteLen} chars` : `${segsDone >> 1} / ${P.HEIGHT} lines`, x, y);
  y += lh + 6;
  const rows = [['recv', rx ? rx.framesIn : 0], ['preview', previewChunks], ['frames ok/bad', rx ? `${rx.framesOk}/${rx.framesBad}` : '0/0'],
    ['rs fixed/fixed', rx ? `${rx.rsCorrected}/${rx.framesRepaired}` : '0/0'], ['flywheel', demod ? demod.flywheelFrames : 0]];
  for (const [k, v] of rows) {
    gfx.setFont(fontUi); gfx.drawText(k, x, y);
    gfx.setFont(fontNum); const s = String(v); gfx.drawText(s, right - gfx.textWidth(s), y + 1);
    y += lh;
  }
  y += 6;
  gfx.setFont(fontUi); gfx.drawText('tone', x, y);
  const st = demod ? demod.status() : { tone: -1 };
  const r = 7, gap = 8, cx0 = x + 44, ccy = y + (fontUi.height >> 1);
  for (let k = 0; k < 3; k++) {
    const ccx = cx0 + k * (2 * r + gap);
    if (st.tone === k + 1) gfx.fillEllipse(ccx, ccy - r, 2 * r, 2 * r, 0, 0, BLACK);
    else gfx.drawEllipse(ccx, ccy - r, 2 * r, 2 * r, 1, 0, 0, BLACK);
  }
  gfx.drawLine(x0, LCD_ROWS - 20, LCD_COLUMNS, LCD_ROWS - 20, 1, BLACK);
  gfx.setFont(fontGlyph); gfx.drawText('🅐 clear', x, LCD_ROWS - 18);
}

function drawFinishedBanner() {
  const now = nowMs();
  if (!finished || now - finishedMs > 6000) return;
  gfx.setFont(fontUi);
  const t = isNote() ? `Received note "${name}"  ${rx.noteLen} chars` : `Received "${name}"   ${finishedLines}/${P.HEIGHT} lines`;
  const w = gfx.textWidth(t) + 24, h = fontUi.height + 16, x = (LCD_COLUMNS - w) >> 1, y = LCD_ROWS - h - 14;
  gfx.fillRoundRect(x, y, w, h, h >> 1, BLACK);
  gfx.drawText(t, x + 12, y + 8, true);
}

// Fixed 30 Hz animation step like the Playdate's frame update.
function stepAnimation() {
  if (isNote()) {
    const rest = BAR_H + 6;
    let frac = 0;
    if (finished) frac = 1;
    else if (started) {
      const enow = rxPaused ? pauseAnchor : nowMs();
      const textframes = rx.dataFrames > P.ILEAVE ? rx.dataFrames - P.ILEAVE : P.NOTE_MAX_FRAMES;
      const elapsed = Math.trunc((enow - startedMs) * 1000 / physUsNow());
      frac = textframes > 0 ? Math.min(1, Math.max(0, elapsed / textframes)) : 1;
    }
    const target = LCD_ROWS - frac * (LCD_ROWS - rest), d = target - sheetY;
    sheetY = Math.abs(d) > 0.5 ? sheetY + d * 0.15 : target;
  } else {
    if (!rxPaused && revealed < linesReached) revealed = Math.min(linesReached, revealed + 0.8);
    const shown = finished ? P.HEIGHT : Math.round(revealed);
    const target = shown <= 0 ? LCD_ROWS : shown <= LCD_ROWS - SHEET_LEAD ? LCD_ROWS - SHEET_LEAD - shown : 0;
    const d = target - sheetY;
    sheetY = Math.abs(d) > 0.5 ? sheetY + d * 0.15 : target;
  }
  const y = Math.round(sheetY);
  const barTarget = y < BAR_H + 40 ? -BAR_H : 0, bd = barTarget - barY;
  barY = Math.abs(bd) > 0.5 ? barY + bd * 0.18 : barTarget;
}

function drawReceive() {
  const now = nowMs(), enow = rxPaused ? pauseAnchor : now;
  const y = Math.round(sheetY);
  if (isNote() && (started || finished)) {
    if (y > 0) drawScene(); else gfx.clear(WHITE);
    const nx = 22, nw = LCD_COLUMNS - 44, nh = LCD_ROWS - y - 12;
    if (nh > 24) drawStickyNote(nx, y, nw, nh, noteText);
  } else {
    const shown = finished ? P.HEIGHT : Math.round(revealed);
    let frontier = Math.min(LCD_ROWS, y + shown);
    if (y > 0) drawScene(); else gfx.clear(WHITE);
    if (y < LCD_ROWS && (started || finished)) {
      gfx.drawBits(phBits, P.WIDTH, P.HEIGHT, P.LINE_BYTES, 0, y);
      gfx.setClipRect(0, 0, LCD_COLUMNS, Math.max(0, frontier));
      gfx.drawBits(disp, P.WIDTH, P.HEIGHT, P.LINE_BYTES, 0, y);
      gfx.clearClipRect();
      if (y > 0) gfx.fillRect(0, y, LCD_COLUMNS, 1, BLACK); // paper top edge
      if (frontier > 0 && frontier < LCD_ROWS) {
        gfx.fillRect(0, frontier - 1, LCD_COLUMNS, 1, BLACK); // thin drawing line
        for (let rx0 = 2; rx0 < LCD_COLUMNS; rx0 += 6) { // 1px roots hang down from it, animated
          const ph = now / 130 + rx0 * 0.5;
          let len = 2 + Math.trunc(2.5 * (0.5 + 0.5 * Math.sin(ph)));
          if ((rx0 / 6) & 1) len += 1;
          if (frontier + len > LCD_ROWS) len = LCD_ROWS - frontier;
          if (len > 0) gfx.fillRect(rx0, frontier, 1, len, BLACK);
        }
      }
    }
  }
  // the title bar stays on top and slides away as the picture nears it
  const boff = Math.trunc(barY - 0.5);
  if (boff > -BAR_H) {
    gfx.setDrawOffset(0, boff);
    drawTitleBar(started ? `Receiving: "${name}"` : 'Listening');
    gfx.setDrawOffset(0, 0);
  }
  const verifying = started && !finished && !rxPaused && !isNote() && revealed >= P.HEIGHT;
  if (started && !finished && !rxPaused && !verifying && (isNote() || segsDone > 0)) drawProgressPill(now, enow);
  if (verifying) {
    gfx.setFont(fontUi);
    const v = 'Verifying', r = 6, sp = 2 * r, pad = 10, gap = 6, tw = gfx.textWidth(v);
    const w = pad + sp + gap + tw + pad, h = 24, bx = LCD_COLUMNS - w - 10, by = LCD_ROWS - h - 10;
    gfx.fillRoundRect(bx, by, w, h, h >> 1, BLACK);
    spinner(bx + pad, by + ((h - sp) >> 1), sp, now);
    gfx.drawText(v, bx + pad + sp + gap, by + ((h - fontUi.height) >> 1), true);
  }
  if (rxPaused) {
    gfx.setFont(fontUi);
    const pm = 'Paused - waiting for sender', w = gfx.textWidth(pm) + 28, h = 28, bx = (LCD_COLUMNS - w) >> 1, by = 12;
    gfx.fillRoundRect(bx, by, w, h, h >> 1, BLACK);
    gfx.drawText(pm, bx + 14, by + ((h - fontUi.height) >> 1), true);
  }
  if (showPanel && demod) drawPanel();
  drawFinishedBanner();
  drawLed();
}

// Full reset without touching the microphone (no new permission prompt): picture, counters,
// receiver, demodulator, band and sniffer back to their start state.
function resetAll() {
  clearImage();
  if (!demod) return; // not listening yet: nothing else to reset
  makeRx();
  activeBand = P.BAND_AUDIBLE;
  sniffS1.fill(0); sniffS2.fill(0); sniffFill = 0; sniffHfRun = 0; sniffAudRun = 0;
  demod = makeDemod(sniffRate, P.BAND_AUDIBLE);
  name = ''; untitled = 0; finishedMs = -1e9; ledFrameMs = ledBlockMs = lastBlockMs = hearingMs = -1e9;
}

// ---- main loop ----
const hudEl = document.getElementById('hud');
const hudL1 = document.createElement('div'), hudL2 = document.createElement('div');
if (hudEl) { hudEl.textContent = ''; hudEl.append(hudL1, hudL2); }
let lastStep = nowMs();
function tick() {
  const now = nowMs();
  if (previewDirty) { previewRefresh(); previewDirty = false; }
  if (demod && !started) {
    const st = demod.status();
    if (st.tone >= 0 || st.state !== 0) hearingMs = now;
  }
  // END never came: the pass is over by the announced timeline plus a margin
  if (started && !rxPaused && totalFrames > 0 && now - startedMs > (totalFrames - P.ILEAVE) * (physUsNow() / 1000) + 4000) finish(now);
  let steps = 0;
  while (now - lastStep >= 1000 / 30 && steps < 10) { stepAnimation(); lastStep += 1000 / 30; steps++; }
  if (steps === 10) lastStep = now;
  drawReceive();
  gfx.present(ctx);
  if (hudEl) {
    const st = demod ? demod.status() : { tone: -2, level: 0 };
    const tc = tinyHave.reduce((a, v) => a + v, 0), pc = previewHave.reduce((a, v) => a + v, 0);
    // fixed-width fields: the line must not change width (it used to reflow and shift the page)
    const num = (v, w) => String(v).padStart(w, '\u2007'); // figure space
    const tone = st.tone < 0 ? '--' : st.tone === 8 ? 'S' : String(st.tone);
    const l1 = `${micLabel ? 'mic: ' + micLabel : 'mic: -'} · ${(sniffRate / 1000).toFixed(1)} kHz · band: ${activeBand === P.BAND_HF ? 'ultra  ' : 'audible'}`;
    const l2 = `frames ${num(demod ? demod.frames : 0, 5)} · ok ${num(rx ? rx.framesOk : 0, 5)} · bad ${num(rx ? rx.framesBad : 0, 4)} · tiny ${tc}/4 · preview ${num(pc, 2)}/20 · tone ${num(tone, 2)} · level ${st.level.toFixed(2)}`;
    if (hudL1.textContent !== l1) hudL1.textContent = l1;
    if (hudL2.textContent !== l2) hudL2.textContent = l2;
  }
  if (recState === 'recording') recUi();
  requestAnimationFrame(tick);
}
clearImage();
recUi();
tick();

// ---- controls ----
const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
on('listen', () => listen().catch((e) => { micState = -1; alert('Mic error: ' + e.message); }));
on('clear', clearImage);
on('reset', resetAll);
on('save', saveWav);
// pointerdown, not click: the label ticks every second and must not swallow the press
if (recBtn) {
  recBtn.addEventListener('pointerdown', (e) => { if (e.button === 0) recToggle().catch((err) => { micState = -1; alert('Mic error: ' + err.message); }); });
  recBtn.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); recToggle(); } });
}
on('a', clearImage);
on('panel', () => { showPanel = !showPanel; });
on('right', () => { showPanel = !showPanel; });
document.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'a') clearImage();
  if (e.key === 'ArrowRight') showPanel = !showPanel;
});
