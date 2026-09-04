// Validates the JS protocol port against C-generated vectors (web/vectors/pass_*.txt).
// Run: node web/test/run.mjs
import { readFileSync } from 'node:fs';
import * as P from '../js/protocol/params.js';
import { buildPhysical, buildNote } from '../js/protocol/frame.js';

function image(kind) {
  const img = new Uint8Array(P.IMAGE_BYTES);
  if (kind === 0) for (let i = 0; i < P.IMAGE_BYTES; i++) img[i] = (Math.imul(i, 2654435761) >>> 13) & 0xff;
  else if (kind === 1) img.fill(0);
  else for (let y = 0; y < P.HEIGHT; y++) for (let i = 0; i < P.LINE_BYTES; i++) img[y * P.LINE_BYTES + i] = ((y >> 3) & 1) ? 0xf0 : 0x0f;
  return img;
}
const hex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('');

let fail = 0;
for (const kind of [0, 1, 2]) {
  const lines = readFileSync(new URL(`../vectors/pass_${kind}.txt`, import.meta.url), 'utf8').trim().split('\n');
  const [, ctotal, , ccoded] = lines[0].split(' ');
  const { frames, total, coded } = buildPhysical(image(kind), 'pic');
  let ok = total === +ctotal && (coded ? 1 : 0) === +ccoded;
  let firstBad = -1;
  for (let f = 0; f < total && f < lines.length - 1; f++) {
    const got = hex(frames.subarray(f * P.FRAME_BYTES, (f + 1) * P.FRAME_BYTES));
    if (got !== lines[1 + f]) { ok = false; if (firstBad < 0) firstBad = f; }
  }
  console.log(`kind ${kind}: JS total=${total} coded=${coded} vs C total=${ctotal} coded=${ccoded} -> ${ok ? 'MATCH' : 'MISMATCH' + (firstBad >= 0 ? ` first bad frame ${firstBad}` : '')}`);
  if (!ok) fail++;
}

// note pass (kind 3): must match C sstv_build_note byte for byte
{
  const noteText = 'Note: \u043f\u0440\u0438\u0432\u0435\u0442 123'; // "Note: привет 123"
  const lines = readFileSync(new URL('../vectors/pass_3.txt', import.meta.url), 'utf8').trim().split('\n');
  const [, ctotal] = lines[0].split(' ');
  const { frames, total } = buildNote(noteText, 'pic');
  let ok = total === +ctotal;
  let firstBad = -1;
  for (let f = 0; f < total && f < lines.length - 1; f++) {
    const got = hex(frames.subarray(f * P.FRAME_BYTES, (f + 1) * P.FRAME_BYTES));
    if (got !== lines[1 + f]) { ok = false; if (firstBad < 0) firstBad = f; }
  }
  console.log(`note: JS total=${total} vs C total=${ctotal} -> ${ok ? 'MATCH' : 'MISMATCH' + (firstBad >= 0 ? ` first bad frame ${firstBad}` : '')}`);
  if (!ok) fail++;
}
process.exit(fail ? 1 : 0);
