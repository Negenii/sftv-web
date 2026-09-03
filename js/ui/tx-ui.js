// Transmitter UI (Flipper). Loads pictures, dithers to 400x240 1-bit, plays them as sound.
import * as P from '../protocol/params.js';
import { ditherRGBA, bitsToRGBA } from '../protocol/image.js';
import { buildPhysical, frameSymbol } from '../protocol/frame.js';
import { Modem } from '../protocol/modem.js';
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
function drawImage(bits, progressLines = -1) {
  bitsToRGBA(bits, rgba);
  g.putImageData(new ImageData(rgba, P.WIDTH, P.HEIGHT), 0, 0);
  if (progressLines >= 0) {
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(0, 0, P.WIDTH, Math.max(0, P.HEIGHT - progressLines));
    g.fillStyle = '#000'; g.fillRect(0, 8, P.WIDTH * progressLines / P.HEIGHT, 3);
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
