// Block assembler + outer-code repair: physical frames -> pixel lines, previews, meta.
// Mirror of common/sstv_rx.c.
import * as P from './params.js';
import * as F from './frame.js';

export class Rx {
  constructor({ onPixels, onMeta, onPreview, onNote, onControl } = {}) {
    this.onPixels = onPixels; this.onMeta = onMeta; this.onPreview = onPreview;
    this.onNote = onNote; this.onControl = onControl;
    this.note = false; this.noteUtf8 = false; this.noteLen = 0;
    this.anim = false; this.merged = false; this.lastStart = null; // animation passes (revision 12)
    this.phys = new Uint8Array(P.ILEAVE * P.FRAME_BYTES);
    this.conf = new Float32Array(P.ILEAVE * P.FRAME_BYTES);
    this.count = 0; this.framesIn = 0;
    this.blocksOk = 0; this.framesOk = 0; this.framesBad = 0; this.rsCorrected = 0;
    this.coded = false;
    this.data = Array.from({ length: P.RX_MAX_DATA_FRAMES }, () => new Uint8Array(P.PAYLOAD_BYTES));
    this.have = new Uint8Array(P.RX_MAX_DATA_FRAMES);
    this.parity = Array.from({ length: P.RX_GROUPS_MAX }, () => Array.from({ length: P.OUTER_PARITY }, () => new Uint8Array(P.PAYLOAD_BYTES)));
    this.haveParity = Array.from({ length: P.RX_GROUPS_MAX }, () => new Uint8Array(P.OUTER_PARITY));
    this.groupDone = new Uint8Array(P.RX_GROUPS_MAX);
    this.dataFrames = 0; this.passOpen = false;
    this.framesRepaired = 0; this.groupsRepaired = 0; this.repairsFailed = 0;
    this.startPass();
  }

  startPass() {
    this.have.fill(0);
    for (const g of this.haveParity) g.fill(0);
    this.groupDone.fill(0);
    this.dataFrames = 0;
  }
  // forget the last START: the next pass opens fresh even if it resends the same animation
  // (call once an animation arrived complete, or the user deleted or cleared it); sstv_rx_forget
  forget() { this.lastStart = null; }
  resetCounters() {
    this.framesIn = this.blocksOk = this.framesOk = this.framesBad = this.rsCorrected = 0;
    this.framesRepaired = this.groupsRepaired = this.repairsFailed = 0;
  }

  byteConfidence(soft, conf, off) {
    for (let j = 0; j < P.FRAME_BYTES; j++) {
      let c = 1;
      for (let b = 0; b < 8; b++) { let m = soft[j * 8 + b]; if (m < 0) m = -m; if (m < c) c = m; }
      conf[off + j] = c;
    }
  }

  dataFramesFromTotal(total, coded, note) {
    if (note) { for (let d = 1; d <= P.RX_MAX_DATA_FRAMES; d++) if (F.passTotal(d, P.noteIntro(d)) === total) return d; return 0; }
    const intro = F.passIntro(coded);
    for (let d = 1; d <= P.RX_MAX_DATA_FRAMES; d++) if (F.passTotal(d, intro) === total) return d;
    return 0;
  }
  rxIntro() { return this.note ? P.noteIntro(this.dataFrames) : F.passIntro(this.coded); }

  headerForPosition(pos) {
    if (pos < P.ILEAVE) return F.hdr(P.FT_META, 0);
    if (this.note) return F.hdr(P.FT_RAW, pos - P.ILEAVE);
    if (pos < P.ILEAVE + P.TINY_CHUNKS) return F.hdr(P.FT_META, pos - P.ILEAVE);
    if (pos < P.ILEAVE + P.INTRO_FRAMES) return F.hdr(P.FT_META, pos - P.ILEAVE - P.TINY_CHUNKS);
    if (this.coded) {
      if (pos < P.ILEAVE + P.INTRO_FRAMES_CODED) return F.hdr(P.FT_META, pos - P.ILEAVE - P.INTRO_FRAMES);
      return F.hdr(P.FT_CODED, Math.floor(pos / P.ILEAVE) - 1);
    }
    return F.hdr(P.FT_RAW, pos - P.ILEAVE - P.INTRO_FRAMES);
  }

  codedBlockUnpack(index) {
    const base = (index + 1) * P.ILEAVE;
    if (base < 0 || base + P.ILEAVE > P.RX_MAX_DATA_FRAMES) return;
    let valid = 0;
    while (valid < P.ILEAVE && this.have[base + valid]) valid++;
    if (valid === 0) return;
    const buf = new Uint8Array(P.BLOCK_PAYLOAD);
    for (let i = 0; i < P.ILEAVE; i++) buf.set(this.data[base + i], i * P.PAYLOAD_BYTES);
    F.blockUnpack(buf, 0, valid * P.PAYLOAD_BYTES, (line, row) => { if (this.onPixels) this.onPixels(line, 0, P.LINE_BYTES, row); });
  }

  store(pos, payload) {
    if (pos < 0 || pos >= P.RX_MAX_DATA_FRAMES) return;
    this.data[pos].set(payload.subarray(0, P.PAYLOAD_BYTES));
    this.have[pos] = 1;
    const g = F.passGroupOf(pos, this.rxIntro());
    if (g < P.RX_GROUPS_MAX && !this.groupDone[g]) {
      for (let j = 0; j < P.OUTER_PARITY; j++) if (this.haveParity[g][j]) { this.tryRepair(g); break; }
    }
  }

  handleFrame(h, payload, i, announce) {
    const type = F.hdrType(h), index = F.hdrIndex(h);
    if (type === P.FT_PARITY) {
      const g = Math.floor(index / P.OUTER_PARITY), j = index % P.OUTER_PARITY;
      if (g >= P.RX_GROUPS_MAX) return;
      this.parity[g][j].set(payload.subarray(0, P.PAYLOAD_BYTES));
      this.haveParity[g][j] = 1;
      this.tryRepair(g);
      return;
    }
    if (type === P.FT_META) {
      const sub = payload[0];
      if (sub === P.META_PREVIEW || sub === P.META_TINY || sub === P.META_SCHEDULE) {
        const layer = sub === P.META_TINY ? 0 : sub === P.META_PREVIEW ? 1 : 2;
        const totals = [P.TINY_BYTES, P.PREVIEW_BYTES, P.MAX_CODED_BLOCKS];
        const chunks = [P.TINY_CHUNKS, P.PREVIEW_CHUNKS, P.SCHEDULE_CHUNKS];
        if (sub === P.META_SCHEDULE) this.coded = true;
        if (index >= chunks[layer]) return;
        let nb = totals[layer] - index * P.PREVIEW_CHUNK;
        if (nb > P.PREVIEW_CHUNK) nb = P.PREVIEW_CHUNK;
        if (this.onPreview) this.onPreview(layer, index, nb, payload.subarray(1, 1 + nb));
      } else if (sub === P.META_START || sub === P.META_END) {
        const word = (payload[1] | (payload[2] << 8)) & 0xffff;
        const coded = (word & P.META_CODED_FLAG) !== 0;
        const note = (word & P.META_NOTE_FLAG) !== 0;
        const utf8 = (word & P.META_UTF8_FLAG) !== 0;
        const total = word & ~(P.META_CODED_FLAG | P.META_NOTE_FLAG | P.META_UTF8_FLAG);
        this.note = note;
        this.anim = note && coded; // NOTE + CODED marks an animation stream
        const codedPic = this.anim ? false : coded;
        if (note) { this.noteUtf8 = utf8; this.noteLen = payload[P.NOTE_LEN_OFFSET] | (payload[P.NOTE_LEN_OFFSET + 1] << 8); }
        if (sub === P.META_START && announce) {
          // a fresh pass, except a resend of the same animation: its frames go on top of what the
          // earlier attempts left (the segment CRCs catch a false-accepted frame); see sstv_rx.c
          const same = this.lastStart && this.lastStart.every((v, k) => v === payload[k]);
          this.merged = this.anim && !!same;
          if (!this.merged) this.startPass();
          this.lastStart = payload.slice(0, P.PAYLOAD_BYTES);
          this.passOpen = true;
          this.coded = codedPic;
        }
        if (sub === P.META_END) this.passOpen = false;
        this.dataFrames = this.dataFramesFromTotal(total, coded, note);
        if (sub === P.META_END) for (let g = 0; g < P.RX_GROUPS_MAX; g++) this.tryRepair(g);
        if (announce && this.onMeta) {
          const noff = note ? P.NOTE_NAME_OFFSET : P.META_NAME_OFFSET;
          const nmax = note ? P.NOTE_NAME_MAX : P.NAME_MAX;
          const nb = payload.subarray(noff, noff + nmax);
          let z = nb.indexOf(0); if (z < 0) z = nmax;
          const name = new TextDecoder().decode(nb.subarray(0, z));
          this.onMeta(name, sub === P.META_END, total, coded, note);
        }
      } else if (sub === P.META_PAUSE || sub === P.META_RESUME) {
        if (this.onControl) this.onControl(sub, (payload[1] | (payload[2] << 8)) >>> 0);
        return; // control frames carry no data position
      } else return;
      this.store(F.passMetaPosition(sub, index, i), payload);
    } else if (type === P.FT_RAW) {
      if (this.note) {
        if (this.onNote) this.onNote(index, P.NOTE_CHUNK, payload.subarray(0, P.NOTE_CHUNK));
        this.store(P.ILEAVE + index, payload);
      } else {
        this.coded = false;
        if (this.onPixels) this.onPixels(F.segLine(index), F.segByteOffset(index), P.SEG_BYTES, payload.subarray(0, P.SEG_BYTES));
        this.store(F.passPosition(h, i), payload);
      }
    } else if (type === P.FT_CODED) {
      this.coded = true;
      this.store(F.passPosition(h, i), payload);
    }
  }

  tryRepair(g) {
    if (g >= P.RX_GROUPS_MAX || this.groupDone[g]) return;
    const intro = this.rxIntro();
    const n = this.dataFrames > 0 ? F.passGroupSize(this.dataFrames, intro, g) : (g === 0 ? intro : P.OUTER_GROUP);
    if (n <= 0) return;
    const base = F.passGroupBase(intro, g);
    const erasures = [];
    let missingData = 0;
    for (let p = 0; p < n; p++) if (!this.have[base + p]) { if (erasures.length < P.OUTER_PARITY) erasures.push(p); missingData++; }
    for (let j = 0; j < P.OUTER_PARITY; j++) if (!this.haveParity[g][j]) { if (erasures.length < P.OUTER_PARITY) erasures.push(n + j); }
    let ne = 0;
    for (let p = 0; p < n; p++) if (!this.have[base + p]) ne++;
    for (let j = 0; j < P.OUTER_PARITY; j++) if (!this.haveParity[g][j]) ne++;
    if (missingData === 0) { this.groupDone[g] = 1; return; }
    if (ne > P.OUTER_PARITY) return;
    const cw = new Uint8Array(P.OUTER_GROUP + P.OUTER_PARITY);
    for (let k = 0; k < P.PAYLOAD_BYTES; k++) {
      for (let p = 0; p < n; p++) cw[p] = this.have[base + p] ? this.data[base + p][k] : 0;
      for (let j = 0; j < P.OUTER_PARITY; j++) cw[n + j] = this.haveParity[g][j] ? this.parity[g][j][k] : 0;
      const dec = rsDecErasures(cw, n + P.OUTER_PARITY, erasures, erasures.length);
      if (dec < 0) { this.repairsFailed++; return; }
      for (let p = 0; p < n; p++) if (!this.have[base + p]) this.data[base + p][k] = cw[p];
    }
    this.groupDone[g] = 1; this.groupsRepaired++;
    const touched = new Uint8Array(Math.floor(P.OUTER_GROUP / P.ILEAVE) + 2);
    for (let p = 0; p < n; p++) {
      const pos = base + p;
      if (this.have[pos]) continue;
      this.have[pos] = 1; this.framesRepaired++;
      const h = this.headerForPosition(pos);
      if (F.hdrType(h) === P.FT_CODED) touched[Math.floor(p / P.ILEAVE)] = 1;
      this.handleFrame(h, this.data[pos], pos % P.ILEAVE, false);
    }
    for (let b = 0; b < touched.length; b++) {
      if (!touched[b]) continue;
      const pos = base + b * P.ILEAVE;
      this.codedBlockUnpack(Math.floor(pos / P.ILEAVE) - 1);
    }
  }

  tryBlock() {
    const logical = new Uint8Array(P.ILEAVE * P.FRAME_BYTES);
    const lconf = new Float32Array(P.ILEAVE * P.FRAME_BYTES);
    F.deinterleave(this.phys, 0, logical);
    F.deinterleaveConf(this.conf, lconf);
    const res = [];
    let good = 0;
    for (let i = 0; i < P.ILEAVE; i++) {
      const r = F.unpackSoft(logical, i * P.FRAME_BYTES, lconf.subarray(i * P.FRAME_BYTES, i * P.FRAME_BYTES + P.FRAME_BYTES));
      res.push(r); if (r.ok) good++;
    }
    if (good === 0) return 0;
    let type = -1, index = -1;
    for (let i = 0; i < P.ILEAVE; i++) {
      if (!res[i].ok) continue;
      const t = F.hdrType(res[i].h), x = F.hdrIndex(res[i].h);
      if (type >= 0 && t !== type) return 0;
      if (t === P.FT_CODED && index >= 0 && x !== index) return 0;
      if ((t === P.FT_RAW || t === P.FT_PARITY) && index >= 0 && x !== index + i) return 0;
      type = t;
      index = (t === P.FT_RAW || t === P.FT_PARITY) ? x - i : x;
    }
    this.blocksOk++;
    for (let i = 0; i < P.ILEAVE; i++) {
      if (res[i].ok) { this.framesOk++; if (res[i].corrected > 0) this.rsCorrected += res[i].corrected; }
      else this.framesBad++;
    }
    let announced = false;
    for (let i = 0; i < P.ILEAVE; i++) {
      if (!res[i].ok) continue;
      const p = res[i].payload;
      const metaNamed = type === P.FT_META && (p[0] === P.META_START || p[0] === P.META_END);
      this.handleFrame(res[i].h, p, i, !metaNamed || !announced);
      if (metaNamed) announced = true;
    }
    // Provisional glitch (raw mode): a failed half-line whose segment is known from the block's
    // good frames is drawn now; a later outer-code repair overwrites it. Not stored.
    if (type === P.FT_RAW && index >= 0) {
      for (let i = 0; i < P.ILEAVE; i++) {
        if (res[i].ok) continue;
        const seg = index + i;
        if (seg >= 0 && seg < P.NUM_SEGS && this.onPixels)
          this.onPixels(F.segLine(seg), F.segByteOffset(seg), P.SEG_BYTES, res[i].payload.subarray(0, P.SEG_BYTES));
      }
    }
    if (type === P.FT_CODED) this.codedBlockUnpack(index);
    return good;
  }

  phys_frame(frame, soft) {
    this.framesIn++;
    if (F.isLockFrame(frame)) { this.count = 0; return; } // preamble lock frame: keep it out of the window
    if (this.count === P.ILEAVE) {
      this.phys.copyWithin(0, P.FRAME_BYTES, P.ILEAVE * P.FRAME_BYTES);
      this.conf.copyWithin(0, P.FRAME_BYTES, P.ILEAVE * P.FRAME_BYTES);
      this.count--;
    }
    this.phys.set(frame.subarray(0, P.FRAME_BYTES), this.count * P.FRAME_BYTES);
    this.byteConfidence(soft, this.conf, this.count * P.FRAME_BYTES);
    this.count++;
    if (this.count < P.ILEAVE) return;
    if (this.tryBlock() > 0) this.count = 0;
  }
}

// rs decode erasures, imported lazily to avoid a cycle-free structure
import { rsDecodeErasures as rsDecErasures } from './rs.js';
