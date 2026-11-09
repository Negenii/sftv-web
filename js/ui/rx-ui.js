// Receiver UI (Playdate). Listens on the mic, decodes, and draws the Receive screen of the
// Playdate app (playdate/src/main.c): the dolphin-and-console scene, the title bar and LED,
// the picture sheet rising with its drawing line, the progress pill, "Verifying", the pause
// banner, the finished banner, the sticky note and the debug panel. Same fonts, images and
// 1-bit pixels (js/ui/pd-gfx.js), shown in the Playdate LCD's two tones.
import * as P from '../protocol/params.js';
import { Demod } from '../protocol/demod.js';
import { Rx } from '../protocol/rx.js';
import { lockDistance, passDataBefore, passFrameKind } from '../protocol/frame.js';
import * as A from '../protocol/anim.js';
import { encodeGif } from './gif.js';
import { RxAudio } from '../audio/rx-audio.js';
import { Gfx, BLACK, WHITE, fonts, images } from './pd-gfx.js';

const LCD_COLUMNS = 400, LCD_ROWS = 240;
const BAR_H = 30, PANEL_W = 200, SHEET_LEAD = 50, LOST_TIMEOUT_MS = 5000, PILL_H = 20;
const CONSOLE = { w: 140, h: 118, sx: 7, sy: 7, sw: 88, sh: 53 };
const DOLPHIN_H = 49;

const fontUi = fonts['SFTV-10-Bold'], fontNum = fonts['SFTV-9-Mono-Condensed'];
const fontGlyph = fonts['SFTV-11-Medium-extended'], fontNotes = fonts['Notes-14'];

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
// Which note chunks arrived (a lost chunk leaves zeros in noteBuf; the text used to end at the
// first gap, so a note whose first chunk was lost came out empty) and how many bytes.
let noteHave = new Set(), noteGot = 0;
// The note as shown: received chunks in order, each run of lost ones as " [...] ", UTF-8 torn at a
// gap's edges dropped (a chunk is NOTE_CHUNK bytes, so a Cyrillic letter can straddle two).
function buildNoteText() {
  let total = rx && rx.noteLen > 0 ? rx.noteLen : 0;
  if (!total) for (const c of noteHave) total = Math.max(total, (c + 1) * P.NOTE_CHUNK);
  const chunks = Math.ceil(Math.min(total, P.NOTE_MAX_CHARS) / P.NOTE_CHUNK), out = [];
  const gap = new TextEncoder().encode(' [...] ');
  for (let c = 0; c < chunks; c++) {
    if (!noteHave.has(c)) { if (c === 0 || noteHave.has(c - 1)) out.push(...gap); continue; }
    let a = c * P.NOTE_CHUNK, b = Math.min(a + P.NOTE_CHUNK, total);
    if (c > 0 && !noteHave.has(c - 1)) while (a < b && (noteBuf[a] & 0xc0) === 0x80) a++;
    if (c + 1 < chunks && !noteHave.has(c + 1)) {
      for (let k = b - 1; k >= a && k >= b - 3; k--) {
        const u = noteBuf[k];
        if ((u & 0xc0) === 0x80) continue;
        const need = u >= 0xf0 ? 4 : u >= 0xe0 ? 3 : u >= 0xc0 ? 2 : 1;
        if (b - k < need) b = k;
        break;
      }
    }
    for (let k = a; k < b; k++) if (noteBuf[k]) out.push(noteBuf[k]);
  }
  return new TextDecoder().decode(new Uint8Array(out));
}
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

// ---- animation passes (revision 12): the stream sits in rx.data like note text and is decoded
// as it arrives; the screen wipes the decoded frames in one by one (as on the Playdate) ----
let animHdr = 0, animInfo = null, animDec = null, animSegOk = null, animStamp = -1;
let animDisp = 0, animWipePrev = -1, animWipeRow = 0, animWipeMs = 0, animPlayPos = 0, animPlayMs = 0, animShown = 0;
let animCompose = null, animScaled = null, animLine = 0, animRepairing = false;
const gifBtn = document.getElementById('gif');
let gifUrl = null;
function isAnim() { return !!(rx && rx.anim); }
function animReset() {
  animHdr = 0; animInfo = null; animDec = null; animSegOk = null; animStamp = -1;
  animDisp = 0; animWipePrev = -1; animWipeRow = 0; animWipeMs = 0; animPlayPos = 0; animPlayMs = 0; animShown = 0;
  animCompose = null; animScaled = null; animLine = 0;
  if (gifBtn) gifBtn.style.display = 'none';
  if (gifUrl) { URL.revokeObjectURL(gifUrl); gifUrl = null; }
}
function animByte(pos) {
  if (!rx || pos < 0 || pos >= rx.noteLen) return -1;
  const at = P.ILEAVE + Math.floor(pos / P.NOTE_CHUNK);
  return at < rx.have.length && rx.have[at] ? rx.data[at][pos % P.NOTE_CHUNK] : -1;
}
function animPump(budget, final) {
  if (!isAnim()) return;
  if (animHdr === 0) {
    const r = A.parse(animByte);
    if (r === -1) animHdr = -1;
    else if (r) { animInfo = r.info; animHdr = r.len; animDec = new A.AnimDecoder(r.info, r.len, rx.noteLen); animSegOk = new Int8Array(A.segs(r.info.n)); }
  }
  if (animHdr <= 0) return;
  // checkpoint CRCs, rechecked as frames arrive or get repaired; a range that comes right after a
  // mismatch (a resend overwrote a false-accepted frame) means decoding again
  const stamp = rx.framesOk + rx.framesRepaired;
  if (stamp !== animStamp || final) {
    animStamp = stamp;
    for (let sg = 0; sg < animSegOk.length; sg++) {
      if (animSegOk[sg] === 1) continue;
      const r = animDec.segCheck(sg, animByte);
      if (r === 1) {
        let redo = animSegOk[sg] === -1;
        for (let f = sg * A.ANIM_SEG; f < (sg + 1) * A.ANIM_SEG && f < animInfo.n; f++) if (animDec.state[f] === 3) redo = true;
        if (redo) animDec.rewind();
      }
      animSegOk[sg] = r;
    }
  }
  if (!animDec.done()) animDec.run(animByte, budget, final);
}
function animFramesOk() {
  if (animHdr <= 0) return 0;
  let n = 0;
  for (let f = 0; f < animInfo.n; f++) if (animDec.state[f] === 2 && animSegOk[Math.floor(f / A.ANIM_SEG)] === 1) n++;
  return n;
}
// the pass is over: decode what can be, hold the last good frame where a checkpoint never
// matched, and offer a GIF (2x, the animation's own order and frame rate)
function animFinish() {
  animPump(1 << 30, true);
  if (animHdr <= 0) return;
  const fb = A.frameBytes(animInfo), fr = animDec.frames;
  if (animFramesOk() === animInfo.n) rx.forget(); // complete: a resend starts over
  for (let f = 0; f < animInfo.n; f++) {
    if (animSegOk[Math.floor(f / A.ANIM_SEG)] !== -1) continue;
    if (f > 0) fr.copyWithin(f * fb, (f - 1) * fb, f * fb); else fr.fill(0, 0, fb);
  }
  const gif = encodeGif(animInfo.w, animInfo.h, 2, fr, fb, animInfo.order, Math.trunc(100 / (animInfo.fps || 2)));
  if (gifUrl) URL.revokeObjectURL(gifUrl);
  gifUrl = URL.createObjectURL(new Blob([gif], { type: 'image/gif' }));
  if (gifBtn) gifBtn.style.display = '';
}
function drawAnimReceive(now, enow) {
  if (animHdr <= 0) { // header not in yet (or unreadable): the scene
    drawScene();
    drawTitleBar(started ? `Receiving: "${name}"` : 'Listening');
    return;
  }
  gfx.clear(WHITE);
  const a = animInfo, fb = A.frameBytes(a), st = A.stride(a.w), fr = animDec.frames;
  const sc = Math.max(1, Math.min(Math.floor(LCD_COLUMNS / a.w), Math.floor((LCD_ROWS - BAR_H - 8) / a.h)));
  const ox = (LCD_COLUMNS - a.w * sc) >> 1, oy = BAR_H + ((LCD_ROWS - BAR_H - a.h * sc) >> 1);
  // The drawing line follows the air, not the decoder (see main.c): the byte on the air one
  // interleave block ago, the row of that byte by animDec.rowPos, never past a decoded row,
  // eased. Rows count across frames: g = frame * h + row.
  const AH = a.h, totalRows = a.n * AH;
  const decoded = Math.min(totalRows, animDec.frame * AH + (animDec.frameOpen ? Math.floor(animDec.pix / a.w) : 0));
  let target = decoded;
  animRepairing = false;
  if (!finished && rx.dataFrames > 0) {
    const df = rx.dataFrames, intro = P.noteIntro(df);
    const phys = Math.max(0, (enow - startedMs) * 1000 / physUsNow()); // one block behind the air
    const f0 = Math.floor(phys), frac = phys - f0;
    // outer-code parity on the air (the Flipper's green LED): the line waits, "Verifying" says so
    animRepairing = passFrameKind(f0, df, intro) !== P.PASS_DATA;
    const d0 = passDataBefore(f0, df, intro), d1 = passDataBefore(f0 + 1, df, intro);
    const bytes = (d0 + (d1 - d0) * frac - P.ILEAVE) * P.NOTE_CHUNK;
    let lo = 0, hi = decoded;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (animDec.rowPos[mid] <= bytes) lo = mid + 1; else hi = mid; }
    target = lo;
    if (lo < decoded) {
      const p0 = lo > 0 ? animDec.rowPos[lo - 1] : animHdr, p1 = animDec.rowPos[lo];
      if (p1 > p0) target += Math.max(0, (bytes - p0) / (p1 - p0));
    }
    target = Math.min(target, decoded);
  }
  if (!rxPaused && animLine < target) {
    const d = target - animLine, st2 = Math.max(0.25, d * 0.2);
    animLine = d < st2 ? target : animLine + st2;
  }
  const caughtUp = (finished || animDec.done()) && animLine >= decoded;
  const step = 1000 / (a.fps || 2);
  let src, row = -1, show;
  if (caughtUp) {
    if (enow - animPlayMs > 5000) animPlayMs = enow;
    while (enow - animPlayMs >= step) { animPlayMs += step; animPlayPos = (animPlayPos + 1) % a.orderLen; }
    show = a.order[animPlayPos];
    src = fr.subarray(show * fb, show * fb + fb);
  } else {
    const g = Math.floor(animLine);
    let cur = Math.floor(g / AH), rows = g % AH;
    if (cur >= a.n) { cur = a.n - 1; rows = AH; }
    if (!animCompose) animCompose = new Uint8Array(fb);
    animCompose.set(fr.subarray(cur * fb, cur * fb + rows * st), 0);
    if (cur > 0) animCompose.set(fr.subarray((cur - 1) * fb + rows * st, cur * fb), rows * st);
    else animCompose.fill(0, rows * st);
    src = animCompose; show = cur;
    if (rows < AH) row = rows;
    animPlayMs = enow;
  }
  animShown = show;
  // XBM (LSB first, 1 = black) -> scaled PBM bits (MSB first) for gfx.drawBits
  const W = a.w * sc, H = a.h * sc, lb = (W + 7) >> 3;
  if (!animScaled || animScaled.length !== lb * H) animScaled = new Uint8Array(lb * H);
  animScaled.fill(0);
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
    if (!((src[y * st + (x >> 3)] >> (x & 7)) & 1)) continue;
    for (let dy = 0; dy < sc; dy++) { const r0 = (y * sc + dy) * lb; for (let dx = 0; dx < sc; dx++) { const X = x * sc + dx; animScaled[r0 + (X >> 3)] |= 0x80 >> (X & 7); } }
  }
  gfx.drawBits(animScaled, W, H, lb, ox, oy);
  gfx.fillRect(ox - 2, oy - 2, W + 4, 1, BLACK); gfx.fillRect(ox - 2, oy + H + 1, W + 4, 1, BLACK);
  gfx.fillRect(ox - 2, oy - 2, 1, H + 4, BLACK); gfx.fillRect(ox + W + 1, oy - 2, 1, H + 4, BLACK);
  if (row >= 0) { // the drawing line: markers at both ends, roots hanging below (as on pictures)
    const ly = oy + row * sc;
    gfx.fillRect(ox, ly, W, 1, BLACK);
    gfx.fillRect(ox - 6, ly - 2, 4, 5, BLACK); gfx.fillRect(ox + W + 2, ly - 2, 4, 5, BLACK);
    for (let rx0 = 2; rx0 < W; rx0 += 6) {
      let len = 2 + Math.trunc(2.5 * (0.5 + 0.5 * Math.sin(now / 130 + rx0 * 0.5)));
      if ((rx0 / 6) & 1) len += 1;
      if (ly + 1 + len > oy + H) len = oy + H - ly - 1;
      if (len > 0) gfx.fillRect(ox + rx0, ly + 1, 1, len, BLACK);
    }
  }
  // title bar: name, frame counter and the pass progress (left of the LED)
  gfx.fillRect(0, 0, LCD_COLUMNS, BAR_H, BLACK);
  gfx.setFont(fontUi);
  const fc = `${show + 1}/${a.n}`, bw = 64, right = LCD_COLUMNS - 34;
  const frac = passProgress(enow);
  if (frac >= 0 && !finished) drawMiniBar(right - bw, (BAR_H - 8) >> 1, bw, 8, frac);
  const fcx = right - bw - 8 - gfx.textWidth(fc);
  gfx.drawText(fc, fcx, (BAR_H - fontUi.height) >> 1, true);
  gfx.setFont(fontGlyph);
  gfx.drawText(fitText(name, fcx - 20), 10, (BAR_H - fontGlyph.height) >> 1, true);
}

function clearImage() {
  animReset();
  noteBuf.fill(0); noteText = ''; noteHave = new Set(); noteGot = 0; noteScroll = 0; noteFollow = true;
  img.fill(0); disp.fill(0); segSeen.fill(0);
  previewBits.fill(0); previewHave.fill(0); tinyBits.fill(0); tinyHave.fill(0);
  previewChunks = 0; previewRefresh();
  segsDone = 0; linesReached = 0; revealed = 0;
  rxPaused = false; sheetY = LCD_ROWS; barY = 0;
  finished = false; started = false; totalFrames = 0;
  if (rx) rx.resetCounters();
}
function finish(now) {
  if (isAnim()) animFinish();
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
      calibActive = false; calibStreak = 0; // a real pass ends calibration
      clearImage();
      started = true; startedMs = now; totalFrames = total;
      name = nm && nm.trim() ? nm : (rx.anim ? `anim_${++untitled}` : rx.note ? `note_${++untitled}` : `untitled_${++untitled}`);
      lastDataMs = now;
    },
    onNote(chunk, nb, buf) {
      if (rx.anim) { lastDataMs = nowMs(); lastBlockKind = 'data'; return; } // bytes stay in rx.data
      const off = chunk * P.NOTE_CHUNK;
      for (let k = 0; k < nb && off + k < P.NOTE_MAX_CHARS; k++) noteBuf[off + k] = buf[k];
      if (!noteHave.has(chunk)) {
        noteHave.add(chunk);
        const len = rx.noteLen > 0 ? rx.noteLen : P.NOTE_MAX_CHARS;
        noteGot += Math.max(0, Math.min(nb, len - off));
      }
      noteText = buildNoteText();
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

// ---- calibration (the Flipper's menu > Calibrate loops the preamble's lock frame): every frame
// is compared with the known pattern, so the bit error rate is exact. Opens after a run of lock
// frames longer than a preamble's; once open, any frame keeps it up (far away the lock frames
// arrive with too many errors to be recognised but still score 0); closes 3 s after frames
// stop, or when a real pass starts. Same as calib_frame / draw_calibration on the Playdate. ----
// CALIB_OPEN_BITS: a frame counts towards opening the screen when it differs from the lock
// frame in at most this many of its 328 bits. Looser than LOCK_MATCH_BITS (60): a laptop mic
// hears 17-21 kHz worse than the Playdate and the lock frames came in with 20-30 % errors; a
// random frame differs in ~164 +- 9 bits, so 110 stays far from noise.
const CALIB_HIST = 60, CALIB_STREAK = 4, CALIB_OPEN_BITS = 120;
// quality = the chance that a frame with this bit error rate passes the inner RS code (at most
// PARITY_BYTES / 2 bad bytes of FRAME_BYTES, a byte bad with p = 1 - (1 - ber)^8); see main.c
function frameOkProb(ber) {
  const pb = 1 - Math.pow(1 - ber, 8);
  if (pb >= 1) return 0;
  let term = Math.pow(1 - pb, P.FRAME_BYTES), sum = 0;
  for (let k = 0; k <= P.PARITY_BYTES / 2; k++) { sum += term; term *= (P.FRAME_BYTES - k) / (k + 1) * pb / (1 - pb); }
  return Math.min(1, sum);
}
let calibForced = false; // the page's Calibration toggle: screen up regardless of lock frames
let calibActive = false, calibLastMs = -1e9, calibStreak = 0, calibN = 0, calibFlyPrev = 0, calibBer = 0;
const calibScore = new Uint8Array(CALIB_HIST), calibSync = new Uint8Array(CALIB_HIST);
function calibFrame(frame, now, d) {
  const dist = lockDistance(frame);
  const real = d.flywheelFrames === calibFlyPrev;
  calibFlyPrev = d.flywheelFrames;
  if (dist <= CALIB_OPEN_BITS) {
    calibLastMs = now;
    if (++calibStreak >= CALIB_STREAK && !calibActive && (!started || finished)) { calibActive = true; calibN = 0; }
  } else {
    calibStreak = 0;
  }
  if (!calibActive && !calibForced) return;
  calibLastMs = now;
  calibBer = dist / P.FRAME_BITS;
  const sc = 100 * frameOkProb(calibBer);
  calibScore[calibN % CALIB_HIST] = Math.round(sc);
  calibSync[calibN % CALIB_HIST] = real ? 1 : 0;
  calibN++;
}
const fontBig = fonts['SFTV-20-Medium'] || fontUi;
function drawRect(x, y, w, h, c) {
  gfx.fillRect(x, y, w, 1, c); gfx.fillRect(x, y + h - 1, w, 1, c);
  gfx.fillRect(x, y, 1, h, c); gfx.fillRect(x + w - 1, y, 1, h, c);
}
function drawCalibration() {
  gfx.clear(WHITE);
  drawTitleBar('Calibration');
  const n = Math.min(calibN, CALIB_HIST);
  let sum = 0, cnt = 0;
  for (let k = 0; k < 3 && k < n; k++) { sum += calibScore[(calibN - 1 - k + CALIB_HIST) % CALIB_HIST]; cnt++; }
  const score = cnt ? Math.trunc(sum / cnt) : 0;
  gfx.setFont(fontUi);
  gfx.drawText('quality', 16, 40);
  gfx.setFont(fontBig);
  gfx.drawText(`${score}%`, 16, 56);
  gfx.setFont(fontUi);
  gfx.drawText(`errors: ${(calibBer * 100).toFixed(1)}%`, 16, 96);
  // "sync" while frames come in on their own sync tone; gone when it is lost
  const syncOk = n > 0 && calibSync[(calibN - 1) % CALIB_HIST];
  if (syncOk && nowMs() - calibLastMs < 1000) gfx.drawText('sync', 16, 114);
  // graph: one 4 px bar per frame, newest on the right; dashed line at 60
  const gx = 140, gy = 40, gw = CALIB_HIST * 4, gh = 100;
  drawRect(gx - 1, gy - 1, gw + 2, gh + 2, BLACK);
  for (let x = gx; x < gx + gw; x += 6) gfx.fillRect(x, gy + gh - gh * 60 / 100, 3, 1, BLACK);
  for (let k = 0; k < n; k++) {
    const idx = (calibN - n + k) % CALIB_HIST, h = Math.trunc(calibScore[idx] * gh / 100), x = gx + (CALIB_HIST - n + k) * 4;
    if (h > 0) gfx.fillRect(x, gy + gh - h, 3, h, BLACK);
    if (!calibSync[idx]) gfx.fillRect(x, gy + gh + 3, 3, 2, BLACK);
  }
  // per-tone level in dB over the noise floor, 0..40: they drop together with distance
  const labels = ['17', '17.5', '18', '18.5', '19', '19.5', '20', '20.5'];
  gfx.setFont(fontNum);
  const by = 222, bmax = 60;
  for (let k = 0; k < demod.numTones && k < labels.length; k++) {
    let db = 10 * Math.log10(demod.gain[k] / demod.minEnergy + 1e-12);
    db = Math.max(0, Math.min(40, db));
    const h = Math.round(bmax * db / 40), x = 16 + k * 48;
    drawRect(x, by - bmax, 30, bmax, BLACK);
    if (h > 0) gfx.fillRect(x, by - h, 30, h, BLACK);
    gfx.drawText(labels[k], x + 15 - (gfx.textWidth(labels[k]) >> 1), by + 3);
  }
}

function makeDemod(sr, band) {
  const d = new Demod(sr, (frame, margin) => {
    const now = nowMs();
    ledFrameMs = now;
    calibFrame(frame, now, d);
    const before = rx.blocksOk, kindBefore = lastBlockKind;
    lastBlockKind = 'parity'; // stays so unless a data/meta callback fires for this frame
    rx.phys_frame(frame, margin);
    if (rx.blocksOk !== before) { ledBlockMs = now; lastBlockMs = now; }
    else lastBlockKind = kindBefore;
  });
  d.setBand(band);
  return d;
}

// Near-ultrasound only (the audible band is archived: git tag audible-mode-archive).
const activeBand = P.BAND_HF;
let ctxRate = 48000; // the context's sample rate, shown in the status line
function physUsNow() { return P.bandPhysUs(activeBand); } // frame length of the band in use

async function listen() {
  if (demod) return;
  const sr = await rxAudio.start((f32) => {
    if (!demod) return;
    recPush(f32);
    const s = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) { const v = f32[i] * 32768; s[i] = v > 32767 ? 32767 : v < -32768 ? -32768 : v | 0; }
    demod.feed(s, s.length);
  });
  recRate = sr;
  const tr = rxAudio.stream && rxAudio.stream.getAudioTracks()[0];
  micLabel = tr ? tr.label : '';
  makeRx();
  ctxRate = sr;
  demod = makeDemod(sr, activeBand);
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
function isNote() { return !!(rx && rx.note && !rx.anim); }

// Intro scene: the dolphin sends the preview to a Playdate.
function drawScene() {
  const now = rxPaused ? pauseAnchor : nowMs();
  gfx.clear(WHITE);
  const cx = 240, cy = 60, dx = 20, dy = cy + ((CONSOLE.h - DOLPHIN_H * 2) >> 1), textCx = LCD_COLUMNS >> 1;
  gfx.drawImage(sceneDolphin(now), dx, dy, { mode: 'ink', scale: 2 });
  drawConsole(cx, cy, started && !isNote() && !isAnim());
  gfx.setFont(fontUi);
  if (started) {
    drawSpout(dx + 70, dy + 2, cx + CONSOLE.sx + (CONSOLE.sw >> 1), cy + CONSOLE.sy + (CONSOLE.sh >> 1), (now % 1200) / 1200);
    if (isAnim()) textCentered(animHdr < 0 ? 'Animation header unreadable' : 'Receiving animation', textCx, 200);
    else if (isNote()) textCentered('Receiving note', textCx, 200);
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
    const hint = micState < 0 ? 'microphone access denied' : micState === 0 ? 'press "Allow mic & listen" below' : 'waiting for a transmission';
    textCentered(hint, textCx, 208);
  }
}

// Word wrap cached per text/width (a 64 KB note must not be re-measured every frame).
let noteLay = { text: null, width: 0, lines: [] };
function layoutNote(text, width) {
  if (noteLay.text === text && noteLay.width === width) return noteLay.lines;
  gfx.setFont(fontNotes);
  const lines = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ').filter(Boolean)) {
      const cand = line ? line + ' ' + word : word;
      if (gfx.textWidth(cand) <= width || !line) line = cand;
      else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  noteLay = { text, width, lines };
  return lines;
}
let noteScroll = 0, noteFollow = true; // receive view scroll (px); follow the newest text until the wheel is used
function noteMaxScroll(w, h, text) {
  const margin = w < 120 ? 4 : 10, lineH = fontNotes.height + 2;
  return Math.max(0, layoutNote(text, w - 2 * margin - 6).length * lineH - (h - 2 * margin));
}
// Sticky note (mirror of the Playdate's draw_sticky_note_scrolled): scroll in px, with a bar
// on the right when the text is longer than the note.
function drawStickyNote(x, y, w, h, text, scroll = 0) {
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
  const top = y + margin, innerH = h - 2 * margin;
  const lines = layoutNote(text, w - 2 * margin - 6);
  const content = lines.length * lineH, maxScroll = Math.max(0, content - innerH);
  const off = Math.min(Math.max(0, scroll), maxScroll);
  gfx.setClipRect(x + 1, top, w - 2, innerH);
  for (let i = Math.floor(off / lineH); i < lines.length; i++) {
    const ty = top + i * lineH - off;
    if (ty > top + innerH) break;
    if (lines[i]) gfx.drawText(lines[i], x + margin, ty);
  }
  gfx.clearClipRect();
  if (maxScroll > 0) {
    const bx = x + w - margin - 2, bh = Math.max(8, Math.floor(innerH * innerH / content));
    const by = top + Math.floor((innerH - bh) * off / maxScroll);
    gfx.fillRect(bx, top, 1, innerH, BLACK);
    gfx.fillRect(bx - 1, by, 3, bh, BLACK);
  }
  return off;
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
  let y = 6;
  gfx.setFont(fontUi);
  const lh = fontUi.height + 1; // compact rows: everything stays above the hint line
  gfx.drawText(fitText(name || '-', PANEL_W - 36), x, y);
  y += lh + 3;
  const quiet = segsDone > 0 && !finished && !rxPaused && now - lastDataMs > LOST_TIMEOUT_MS;
  const state = rxPaused ? 'PAUSE' : finished ? 'DONE' : segsDone === P.NUM_SEGS ? 'DONE' : quiet ? 'LOST' : (segsDone > 0 || started) ? 'RX' : 'IDLE';
  let px = x;
  px += drawPill(state, px, y, true) + 5;
  px += drawPill(isAnim() ? 'ANI' : isNote() ? 'TXT' : rx && rx.coded ? 'ZIP' : 'RAW', px, y, false) + 5;
  y += fontUi.height + 9;
  const barW = PANEL_W - 16;
  gfx.drawRoundRect(x, y, barW, 8, 4, 1, BLACK);
  const got = isAnim() ? (animHdr > 0 ? animDec.framesDone : 0) : isNote() ? noteGot : segsDone;
  const tot = isAnim() ? (animHdr > 0 ? animInfo.n : 1) : isNote() ? (rx.noteLen > 0 ? rx.noteLen : Math.max(1, got)) : P.NUM_SEGS;
  const fill = Math.min(barW - 2, Math.trunc((barW - 2) * got / tot));
  if (fill > 0) gfx.fillRoundRect(x + 1, y + 1, fill, 6, 3, BLACK);
  y += 11;
  gfx.drawText(isAnim() ? `${got} / ${animHdr > 0 ? animInfo.n : 0} frames` : isNote() ? `${noteGot} / ${rx.noteLen} chars` : `${segsDone >> 1} / ${P.HEIGHT} lines`, x, y);
  y += lh + 4;
  const rows = [['recv', rx ? rx.framesIn : 0], ['preview', previewChunks], ['frames ok/bad', rx ? `${rx.framesOk}/${rx.framesBad}` : '0/0'],
    ['rs fixed/fixed', rx ? `${rx.rsCorrected}/${rx.framesRepaired}` : '0/0'], ['flywheel', demod ? demod.flywheelFrames : 0]];
  for (const [k, v] of rows) {
    gfx.setFont(fontUi); gfx.drawText(k, x, y);
    gfx.setFont(fontNum); const s = String(v); gfx.drawText(s, right - gfx.textWidth(s), y + 1);
    y += lh;
  }
  // tone: one lamp per data tone (8 in the HF band, 17.0-20.5 kHz), the one heard filled (the
  // sync is a pattern of these tones since revision 13)
  y += 4;
  gfx.setFont(fontUi); gfx.drawText('tone', x, y);
  const st = demod ? demod.status() : { tone: -1 };
  const nt = demod ? demod.numTones - demod.firstDet : 8;
  const r = 5, step = 2 * r + 4, cx0 = x + 40, ccy = y + (fontUi.height >> 1);
  for (let k = 0; k < nt; k++) {
    const ccx = cx0 + k * step;
    if (demod && st.tone === k + demod.firstDet) gfx.fillEllipse(ccx, ccy - r, 2 * r, 2 * r, 0, 0, BLACK);
    else gfx.drawEllipse(ccx, ccy - r, 2 * r, 2 * r, 1, 0, 0, BLACK);
  }
  // hints: sized from the glyph font (22 px line) so they stay on screen
  gfx.setFont(fontGlyph);
  const hy = LCD_ROWS - fontGlyph.height - 1;
  gfx.drawLine(x0, hy - 3, LCD_COLUMNS, hy - 3, 1, BLACK);
  gfx.drawText('Ⓐ clear', x, hy);
}

function drawFinishedBanner() {
  const now = nowMs();
  if (!finished || now - finishedMs > 6000) return;
  gfx.setFont(fontUi);
  const t = isAnim() ? `Received "${name}"   ${animFramesOk()}/${animHdr > 0 ? animInfo.n : 0} frames`
    : isNote() ? `Received note "${name}"  ${noteGot}/${rx.noteLen} chars` : `Received "${name}"   ${finishedLines}/${P.HEIGHT} lines`;
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
      const textframes = rx.dataFrames > P.ILEAVE ? rx.dataFrames - P.ILEAVE : 40;
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
  if (isAnim() && (started || finished)) {
    drawAnimReceive(now, enow);
    if (animHdr > 0 && animRepairing && started && !finished && !rxPaused) {
      gfx.setFont(fontUi);
      const v = 'Verifying', r = 6, sp = 2 * r, pad = 10, gap = 6, tw = gfx.textWidth(v);
      const w = pad + sp + gap + tw + pad, h = 24, bx = LCD_COLUMNS - w - 10, by = LCD_ROWS - h - 10;
      gfx.fillRoundRect(bx, by, w, h, h >> 1, BLACK);
      spinner(bx + pad, by + ((h - sp) >> 1), sp, now);
      gfx.drawText(v, bx + pad + sp + gap, by + ((h - fontUi.height) >> 1), true);
    }
    if (rxPaused) {
      gfx.setFont(fontUi);
      const pm = 'Paused - waiting for sender', w = gfx.textWidth(pm) + 28, h = 28, bx = (LCD_COLUMNS - w) >> 1, by = BAR_H + 12;
      gfx.fillRoundRect(bx, by, w, h, h >> 1, BLACK);
      gfx.drawText(pm, bx + 14, by + ((h - fontUi.height) >> 1), true);
    }
    if (showPanel && demod) drawPanel();
    drawFinishedBanner();
    drawLed();
    return;
  }
  const y = Math.round(sheetY);
  if (isNote() && (started || finished)) {
    if (y > 0) drawScene(); else gfx.clear(WHITE);
    const nx = 22, nw = LCD_COLUMNS - 44, nh = LCD_ROWS - y - 12;
    if (nh > 24) {
      if (noteFollow) noteScroll = noteMaxScroll(nw, nh, noteText);
      noteScroll = drawStickyNote(nx, y, nw, nh, noteText, noteScroll);
    }
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
// receiver and demodulator back to their start state.
function resetAll() {
  clearImage();
  if (!demod) return; // not listening yet: nothing else to reset
  makeRx();
  demod = makeDemod(ctxRate, activeBand);
  name = ''; untitled = 0; finishedMs = -1e9; ledFrameMs = ledBlockMs = lastBlockMs = hearingMs = -1e9;
}

// ---- main loop ----
// diagnostics card: header (mic, sample rate) + labelled tiles, built once, updated in place
const hudEl = document.getElementById('hud');
const hud = {};
if (hudEl) {
  hudEl.textContent = '';
  const head = document.createElement('div'); head.className = 'hud-head';
  const title = document.createElement('b'); title.textContent = 'Diagnostics';
  hud.mic = document.createElement('span');
  head.append(title, hud.mic);
  const grid = document.createElement('div'); grid.className = 'hud-grid';
  for (const [key, label] of [['frames', 'Frames'], ['ok', 'OK'], ['bad', 'Bad'], ['tiny', 'Tiny'], ['preview', 'Preview'], ['tone', 'Tone'], ['level', 'Level']]) {
    const cell = document.createElement('div'); cell.className = 'hud-cell';
    const k = document.createElement('div'); k.className = 'k'; k.textContent = label;
    const v = document.createElement('div'); v.className = 'v';
    cell.append(k, v); grid.append(cell); hud[key] = v;
    if (key === 'level') { const m = document.createElement('div'); m.className = 'hud-meter'; hud.meter = document.createElement('i'); m.append(hud.meter); cell.append(m); }
  }
  hudEl.append(head, grid);
}
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
  if (isAnim() && started && !finished) animPump(4096, false);
  let steps = 0;
  while (now - lastStep >= 1000 / 30 && steps < 10) { stepAnimation(); lastStep += 1000 / 30; steps++; }
  if (steps === 10) lastStep = now;
  if (calibActive && now - calibLastMs > 3000) calibActive = false;
  if ((calibActive || calibForced) && demod) { drawCalibration(); drawLed(); } else drawReceive();
  gfx.present(ctx);
  if (hudEl) {
    const st = demod ? demod.status() : { tone: -2, level: 0 };
    const tc = tinyHave.reduce((a, v) => a + v, 0), pc = previewHave.reduce((a, v) => a + v, 0);
    const bad = rx ? rx.framesBad : 0;
    setText(hud.mic, `${micLabel || 'no microphone yet'} · ${(ctxRate / 1000).toFixed(1)} kHz`);
    setText(hud.frames, String(demod ? demod.frames : 0));
    setText(hud.ok, String(rx ? rx.framesOk : 0));
    setText(hud.bad, String(bad));
    hud.bad.classList.toggle('bad', bad > 0);
    setText(hud.tiny, `${tc}/4`);
    setText(hud.preview, `${pc}/20`);
    setText(hud.tone, st.tone < 0 ? '–' : st.tone === 8 ? 'sync' : String(st.tone));
    setText(hud.level, st.level.toFixed(2));
    const pct = `${Math.min(100, Math.round(st.level * 100))}%`;
    if (hud.meter.style.width !== pct) hud.meter.style.width = pct;
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
// Calibration toggle (outside the device): the calibration screen stays up until switched off,
// whatever arrives; the tone bars are live from the microphone even before any frame
const calibBtn = document.getElementById('calib');
on('calib', () => {
  calibForced = !calibForced;
  if (calibForced && !demod) listen().catch((e) => { micState = -1; alert('Mic error: ' + e.message); });
  if (calibForced) calibN = 0;
  if (calibBtn) calibBtn.classList.toggle('on', calibForced);
  if (calibBtn) calibBtn.textContent = calibForced ? 'Calibration: on' : 'Calibration';
});
const clearAll = () => { clearImage(); if (rx) rx.forget(); }; // clear means clear: no merging into it
on('clear', clearAll);
// mouse wheel / trackpad scrolls a note, like the Playdate's crank
cv.addEventListener('wheel', (e) => { if (isNote()) { e.preventDefault(); noteScroll += e.deltaY * 0.5; noteFollow = false; } }, { passive: false });
on('reset', resetAll);
on('save', saveWav);
on('gif', () => {
  if (!gifUrl) return;
  const a = document.createElement('a');
  a.href = gifUrl; a.download = `${(name || 'animation').replace(/[^A-Za-z0-9_.-]/g, '_')}.gif`;
  document.body.appendChild(a); a.click(); a.remove();
});
// pointerdown, not click: the label ticks every second and must not swallow the press
if (recBtn) {
  recBtn.addEventListener('pointerdown', (e) => { if (e.button === 0) recToggle().catch((err) => { micState = -1; alert('Mic error: ' + err.message); }); });
  recBtn.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); recToggle(); } });
}
on('a', clearAll);
on('panel', () => { showPanel = !showPanel; });
on('right', () => { showPanel = !showPanel; });
document.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'a') clearAll();
  if (e.key === 'ArrowRight') showPanel = !showPanel;
});
