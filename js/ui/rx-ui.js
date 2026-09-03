// Receiver UI (Playdate). Listens on the mic, decodes, draws the scene and the picture.
import * as P from '../protocol/params.js';
import { Demod } from '../protocol/demod.js';
import { Rx } from '../protocol/rx.js';
import { RxAudio } from '../audio/rx-audio.js';

const cv = document.getElementById('pd');
const g = cv.getContext('2d');
g.imageSmoothingEnabled = false;

const rxAudio = new RxAudio();
let demod = null, rx = null;
let showPanel = false;

// received-image state
const img = new Uint8Array(P.IMAGE_BYTES).fill(0);   // 1 = black
const segSeen = new Uint8Array(P.HEIGHT);
const previewBits = new Uint8Array(P.PREVIEW_BYTES);
const previewHave = new Uint8Array(P.PREVIEW_CHUNKS);
const tinyBits = new Uint8Array(P.TINY_BYTES);
const tinyHave = new Uint8Array(P.TINY_CHUNKS);
let started = false, finished = false, name = '', hearingMs = 0, linesReached = 0;

const assets = {};
for (const n of ['dolphin', 'dolphin_open', 'console']) {
  const im = new Image(); im.src = `assets/${n}.png`; assets[n] = im;
}

function clearImage() {
  img.fill(0); segSeen.fill(0); previewBits.fill(0); previewHave.fill(0);
  tinyBits.fill(0); tinyHave.fill(0);
  started = finished = false; name = ''; linesReached = 0;
  if (rx) rx.startPass(), rx.resetCounters();
}

function makeRx() {
  rx = new Rx({
    onPixels(line, x, nb, px) {
      if (line >= P.HEIGHT || x + nb > P.LINE_BYTES) return;
      for (let i = 0; i < nb; i++) img[line * P.LINE_BYTES + x + i] = px[i];
      const mask = nb === P.LINE_BYTES ? 3 : (x === 0 ? 1 : 2);
      segSeen[line] |= mask;
      if (line + 1 > linesReached) linesReached = line + 1;
      if (!started) started = true;
    },
    onPreview(layer, chunk, nb, data) {
      if (layer === 0) { tinyBits.set(data.subarray(0, nb), chunk * P.PREVIEW_CHUNK); tinyHave[chunk] = 1; }
      else if (layer === 1) { previewBits.set(data.subarray(0, nb), chunk * P.PREVIEW_CHUNK); previewHave[chunk] = 1; }
    },
    onMeta(nm, isEnd) { if (isEnd) { finished = true; } else { clearImageKeep(); name = nm; } },
  });
}
function clearImageKeep() { /* new pass starts: keep nothing */ img.fill(0); segSeen.fill(0); previewBits.fill(0); previewHave.fill(0); tinyBits.fill(0); tinyHave.fill(0); started = false; finished = false; linesReached = 0; }

async function listen() {
  const sr = await rxAudio.start((f32) => {
    if (!demod) return;
    const s = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) { let v = f32[i] * 32768; s[i] = v > 32767 ? 32767 : v < -32768 ? -32768 : v | 0; }
    demod.feed(s, s.length);
    const st = demod.status();
    if (st.tone >= 0 || st.state !== 0) hearingMs = performance.now();
  });
  makeRx();
  demod = new Demod(sr, (frame, margin) => rx.phys_frame(frame, margin));
  document.getElementById('listen').textContent = 'Listening…';
}

// ---- drawing ----
const px = (bits, w, lineBytes, x, y) => (bits[y * lineBytes + (x >> 3)] >> (7 - (x & 7))) & 1;

function drawPreviewInto(x0, y0, w, h) {
  // draw the best available preview (80x48 else 40x20) scaled into the console screen
  const useP = previewHave.some((v) => v);
  const src = useP ? previewBits : tinyBits;
  const sw = useP ? P.PREVIEW_W : P.TINY_W, sh = useP ? P.PREVIEW_H : P.TINY_H, lb = useP ? P.PREVIEW_LINE_BYTES : P.TINY_LINE_BYTES;
  const sx = w / sw, sy = h / sh;
  g.fillStyle = '#000';
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++)
    if (px(src, sw, lb, x, y)) g.fillRect(x0 + x * sx, y0 + y * sy, Math.ceil(sx), Math.ceil(sy));
}

// console.png is 140x118; its screen interior is at (7,7) size 88x53 (from the Playdate app).
const CONSOLE = { w: 140, h: 118, sx: 7, sy: 7, sw: 88, sh: 53 };
function drawScene() {
  g.fillStyle = '#b7c0ad'; g.fillRect(0, 0, 400, 240);
  const hearing = !started && performance.now() - hearingMs < 500;
  const dol = (hearing && assets.dolphin_open.complete) ? assets.dolphin_open : assets.dolphin;
  if (dol.complete) g.drawImage(dol, 16, 78, 71 * 1.5, 49 * 1.5);
  const scale = 1.35;
  const cw = CONSOLE.w * scale, ch = CONSOLE.h * scale;
  const cx = 400 - cw - 14, cy = 26;
  const sx = cx + CONSOLE.sx * scale, sy = cy + CONSOLE.sy * scale, sw = CONSOLE.sw * scale, sh = CONSOLE.sh * scale;
  if (assets.console.complete) g.drawImage(assets.console, cx, cy, cw, ch);
  // overwrite the console's screen with a light LCD and draw the preview on top
  g.fillStyle = '#c7d0bd'; g.fillRect(sx, sy, sw, sh);
  if (previewHave.some((v) => v) || tinyHave.some((v) => v)) drawPreviewInto(sx, sy, sw, sh);
  g.fillStyle = '#111'; g.font = '13px system-ui';
  g.fillText(hearing ? 'signal…' : 'Listening', 20, 210);
}

function drawImage() {
  const id = g.getImageData(0, 0, 400, 240);
  const d = id.data;
  for (let y = 0; y < P.HEIGHT; y++) for (let x = 0; x < P.WIDTH; x++) {
    const seen = segSeen[y] & (x < P.SEG_BYTES * 8 ? 1 : 2);
    let v;
    if (seen) v = px(img, P.WIDTH, P.LINE_BYTES, x, y) ? 0 : 255;
    else v = 180; // not yet received
    const p = (y * 400 + x) * 4;
    d[p] = d[p + 1] = d[p + 2] = v; d[p + 3] = 255;
  }
  g.putImageData(id, 0, 0);
}

function drawPanel() {
  g.fillStyle = 'rgba(0,0,0,.8)'; g.fillRect(250, 0, 150, 240);
  g.fillStyle = '#fff'; g.font = '12px system-ui';
  const rows = [['name', name || '—'], ['lines', `${segSeen.reduce((a, v) => a + (v === 3 ? 1 : 0), 0)}/240`],
    ['frames ok', rx ? rx.framesOk : 0], ['frames bad', rx ? rx.framesBad : 0],
    ['rs fixed', rx ? rx.rsCorrected : 0], ['fixed', rx ? rx.framesRepaired : 0],
    ['flywheel', demod ? demod.flywheelFrames : 0]];
  let y = 20;
  for (const [k, v] of rows) { g.fillText(k, 258, y); g.fillText(String(v), 392 - g.measureText(String(v)).width, y); y += 20; }
}

function drawHud() {
  const tc = tinyHave.reduce((a, v) => a + v, 0), pc = previewHave.reduce((a, v) => a + v, 0);
  const st = demod ? demod.status() : { tone: -2, level: 0 };
  const line = `f=${demod ? demod.frames : 0} ok=${rx ? rx.framesOk : 0} bad=${rx ? rx.framesBad : 0} tiny=${tc}/4 prev=${pc}/20 st=${started ? 1 : 0} tone=${st.tone} lvl=${st.level.toFixed(2)}`;
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, 400, 14);
  g.fillStyle = '#0f0'; g.font = '10px monospace'; g.fillText(line, 2, 11);
}
function tick() {
  if (!demod) { drawScene(); }
  else if (started || finished) { drawImage(); }
  else { drawScene(); }
  if (showPanel && demod) drawPanel();
  drawHud();
  requestAnimationFrame(tick);
}
tick();

document.getElementById('listen').addEventListener('click', () => listen().catch((e) => alert('Mic error: ' + e.message)));
document.getElementById('clear').addEventListener('click', clearImage);
document.getElementById('a').addEventListener('click', clearImage);
document.getElementById('panel').addEventListener('click', () => { showPanel = !showPanel; });
document.getElementById('right').addEventListener('click', () => { showPanel = !showPanel; });
const save = document.getElementById('save');
document.addEventListener('keydown', (e) => { if (e.key === 'a') clearImage(); if (e.key === 'ArrowRight') showPanel = !showPanel; });
