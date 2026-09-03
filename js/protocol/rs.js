// Reed-Solomon over GF(256), primitive poly 0x11D, RS_PARITY=12 parity symbols.
// Faithful port of common/rs.c (rs_encode, streaming encoder, rs_decode_erasures).
import { PARITY_BYTES } from './params.js';

const RS_PARITY = PARITY_BYTES;

const gfExp = new Uint8Array(512);
const gfLog = new Uint8Array(256);
const gen = new Uint8Array(RS_PARITY + 1); // generator, gen[0]=1 (highest degree)
let ready = false;

function tablesInit() {
  if (ready) return;
  let x = 1;
  for (let i = 0; i < 255; i++) {
    gfExp[i] = x;
    gfLog[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) gfExp[i] = gfExp[i - 255];
  gfLog[0] = 0;
  // gen(x) = prod_{i=0}^{RS_PARITY-1} (x + alpha^i)
  const g = new Uint8Array(RS_PARITY + 1);
  let deg = 0;
  g[0] = 1;
  for (let i = 0; i < RS_PARITY; i++) {
    const r = gfPow(i);
    const ng = new Uint8Array(RS_PARITY + 1);
    ng[0] = g[0];
    for (let j = 1; j <= deg; j++) ng[j] = g[j] ^ gfMul(r, g[j - 1]);
    ng[deg + 1] = gfMul(r, g[deg]);
    deg++;
    for (let j = 0; j <= deg; j++) g[j] = ng[j];
  }
  gen.set(g);
  ready = true;
}

function gfMul(a, b) { return (a === 0 || b === 0) ? 0 : gfExp[gfLog[a] + gfLog[b]]; }
function gfDiv(a, b) { return a === 0 ? 0 : gfExp[gfLog[a] + 255 - gfLog[b]]; }
function gfPow(e) { e %= 255; if (e < 0) e += 255; return gfExp[e]; }
function gfInv(a) { return gfExp[255 - gfLog[a]]; }
function polyEval(p, n, x) { let y = 0; for (let i = 0; i < n; i++) y = gfMul(y, x) ^ p[i]; return y; }

export class RsEncoder {
  constructor() { tablesInit(); this.rem = new Uint8Array(RS_PARITY); }
  feed(byte) {
    const coef = byte ^ this.rem[0];
    for (let j = 0; j < RS_PARITY - 1; j++) this.rem[j] = this.rem[j + 1];
    this.rem[RS_PARITY - 1] = 0;
    if (coef) for (let j = 0; j < RS_PARITY; j++) this.rem[j] ^= gfMul(gen[j + 1], coef);
  }
  finish(out, off = 0) { for (let j = 0; j < RS_PARITY; j++) out[off + j] = this.rem[j]; }
}

// Writes RS_PARITY parity bytes for data[0..dataLen) into parity[0..].
export function rsEncode(data, dataLen, parity, parityOff = 0) {
  const e = new RsEncoder();
  for (let i = 0; i < dataLen; i++) e.feed(data[i]);
  e.finish(parity, parityOff);
}

// Corrects block[0..n) (data followed by parity) in place. erasures: array of known-bad
// positions (<= RS_PARITY). Returns corrected symbol count, or -1 if uncorrectable.
export function rsDecodeErasures(block, n, erasures = null, numErasures = 0) {
  tablesInit();
  if (n <= RS_PARITY || n > 255) return -1;
  if (numErasures < 0 || numErasures > RS_PARITY) return -1;

  const S = new Uint8Array(RS_PARITY);
  let nonzero = 0;
  for (let i = 0; i < RS_PARITY; i++) { S[i] = polyEval(block, n, gfPow(i)); if (S[i]) nonzero = 1; }
  if (!nonzero) return 0;

  const G = new Uint8Array(RS_PARITY + 1); G[0] = 1;
  let e = 0;
  for (let j = 0; j < numErasures; j++) {
    const k = erasures[j];
    if (k < 0 || k >= n) return -1;
    let dup = 0;
    for (let q = 0; q < j; q++) dup |= (erasures[q] === k) ? 1 : 0;
    if (dup) continue;
    const X = gfPow(n - 1 - k);
    for (let d = e + 1; d > 0; d--) G[d] ^= gfMul(G[d - 1], X);
    e++;
  }

  const Xi = new Uint8Array(RS_PARITY);
  for (let i = 0; i < RS_PARITY; i++)
    for (let j = 0; j <= e && i + j < RS_PARITY; j++) Xi[i + j] ^= gfMul(S[i], G[j]);

  const C = new Uint8Array(RS_PARITY + 1), B = new Uint8Array(RS_PARITY + 1), T = new Uint8Array(RS_PARITY + 1);
  C[0] = 1; B[0] = 1;
  let L = 0, m = 1, b = 1;
  const nsyn = RS_PARITY - e;
  for (let k = 0; k < nsyn; k++) {
    let d = Xi[e + k];
    for (let i = 1; i <= L; i++) d ^= gfMul(C[i], Xi[e + k - i]);
    if (d === 0) { m++; }
    else if (2 * L <= k) {
      T.set(C);
      const coef = gfDiv(d, b);
      for (let i = m; i <= RS_PARITY; i++) C[i] ^= gfMul(coef, B[i - m]);
      L = k + 1 - L; B.set(T); b = d; m = 1;
    } else {
      const coef = gfDiv(d, b);
      for (let i = m; i <= RS_PARITY; i++) C[i] ^= gfMul(coef, B[i - m]);
      m++;
    }
  }
  if (2 * L + e > RS_PARITY) return -1;

  const Psi = new Uint8Array(2 * RS_PARITY + 2);
  for (let i = 0; i <= L; i++) for (let j = 0; j <= e; j++) Psi[i + j] ^= gfMul(C[i], G[j]);
  const deg = L + e;

  const pos = [];
  for (let k = 0; k < n; k++) {
    let xinv = gfPow(-(n - 1 - k));
    let v = 0, xp = 1;
    for (let i = 0; i <= deg; i++) { v ^= gfMul(Psi[i], xp); xp = gfMul(xp, xinv); }
    if (v === 0) { if (pos.length >= RS_PARITY) return -1; pos.push(k); }
  }
  if (pos.length !== deg) return -1;

  const Om = new Uint8Array(RS_PARITY);
  for (let i = 0; i < RS_PARITY; i++) for (let j = 0; j <= L && i + j < RS_PARITY; j++) Om[i + j] ^= gfMul(Xi[i], C[j]);

  let corrected = 0;
  for (let q = 0; q < pos.length; q++) {
    const k = pos[q];
    const X = gfPow(n - 1 - k);
    const xinv = gfInv(X);
    let om = 0, xp = 1;
    for (let i = 0; i < RS_PARITY; i++) { om ^= gfMul(Om[i], xp); xp = gfMul(xp, xinv); }
    let dl = 0; xp = 1;
    for (let i = 1; i <= deg; i += 2) { dl ^= gfMul(Psi[i], xp); xp = gfMul(xp, gfMul(xinv, xinv)); }
    if (dl === 0) return -1;
    const Y = gfMul(X, gfDiv(om, dl));
    if (Y) corrected++;
    block[k] ^= Y;
  }
  for (let i = 0; i < RS_PARITY; i++) if (polyEval(block, n, gfPow(i)) !== 0) return -1;
  return corrected;
}

export function rsDecode(block, n) { return rsDecodeErasures(block, n, null, 0); }
