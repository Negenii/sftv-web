# SFTV Web: browser transmitter and receiver

Date: 2026-09-03
Status: approved design
Related: `2026-09-03-sstv-flipper-playdate-design.md` (the protocol this reimplements), the `common/` C sources (the reference)

## Goal

A static website that emulates the SFTV transmitter and the receiver in the browser so people
with only one device, or none, can use the mechanic. Two roles, each in its own tab: the
transmitter plays the image as sound through the speakers; the receiver listens on the
microphone and draws the image. Wire-compatible with the real Flipper and Playdate: same
tones, timing and frame format, so any pair works (browser↔browser, browser↔hardware both
ways).

## Decisions (from discussion)

- **Protocol in JavaScript**, a faithful port of `common/`. No WebAssembly. The C stays the
  reference: JS is validated byte-for-byte against vectors generated from C, and the JS
  demodulator is checked against the real Playdate recordings in `recordings/`.
- **Wire-compatible** with the devices (identical protocol).
- **Both roles** in v1, one tab each.
- **Static, no framework, no build.** Plain JS ES modules, served as-is from GitHub Pages
  (which provides the https that `getUserMedia` requires).
- **Image input:** upload any file; the browser scales to 400×240 and dithers with the same
  ordered Bayer matrix as `tools/img2pbm.py`.
- **UI:** each tab is a contour silhouette (outline only) of the device it emulates — Flipper
  Zero on the transmitter tab, Playdate on the receiver tab — and the whole app runs inside the
  device's screen. The silhouette's buttons (Flipper: arrows, OK, Back; Playdate: d-pad, A, B,
  crank) are functional controls, mirrored on the keyboard.

## Protocol port (`js/protocol/`)

One shared core, used by both tabs. Faithful translation of `common/` using typed arrays
(`Uint8Array` bytes, `Int16Array`/`Float32Array` samples). Modules mirror the C files:

| JS module | C source | contents |
|---|---|---|
| `params.js` | `sstv_params.h` | every constant, exact values (tones 0/3000/3500/4000, sync 5500, 4 ms symbol, 16 ms sync, 2 s leader, frame 41 B = 2 hdr + 26 payload + 1 CRC + 12 RS, interleave 4, outer group 108, intro group, etc.) |
| `gf256.js` | `rs.c` tables | GF(256) exp/log, poly 0x11D |
| `rs.js` | `rs.c` | `rsEncode`, streaming encoder, `rsDecodeErasures` |
| `crc8.js` | `crc8.c` | CRC-8 (poly 0x07) |
| `codec.js` | `sstv_codec.c` | RAW / RLE / XOR-RLE line codec |
| `frame.js` | `sstv_frame.c` | `pack`/`unpackSoft`, interleave, pass-layout helpers (`passIntro`, `passGroups`, `passTotal`, `passFrameKind`, `passDataBefore`, positions), `buildPhysical`, block pack/unpack |
| `preview.js` | `sstv_preview.c` | tiny 40×20 and 80×48 preview (Bayer block counts) |
| `image.js` | `pbm.c` + `tools/img2pbm.py` | any image → 400×240 1-bit (Bayer 4×4), and PBM read/write |
| `modem.js` | `sstv_modem_ref.c` | square-wave tones with PWM duty, leader, sync; image → `Int16Array` at the AudioContext sample rate |
| `demod.js` | `sstv_demod.c` | quadrature detectors, sync detection, second-order clock loop, flywheel, gain trackers; samples → physical frames + soft bits |
| `rx.js` | `sstv_rx.c` | de-interleave, RS errors-and-erasures, CRC, block assembler, outer-code repair by group, callbacks (pixel line, preview chunk, meta, counters) |

The demod is sample-rate-agnostic (it already takes the rate as a parameter), so it runs at
the browser's 44100/48000 Hz directly.

## Audio (`js/audio/`)

- **Transmit** (`tx-audio.js`): `modem.js` builds the whole pass as an `Int16Array` at
  `audioContext.sampleRate`; convert to `Float32`, wrap in an `AudioBuffer`, play through an
  `AudioBufferSourceNode`. The LED and progress follow `audioContext.currentTime` against the
  known per-symbol schedule. Start requires a user gesture (autoplay policy).
- **Receive** (`rx-audio.js` + `capture-worklet.js`): `getUserMedia({audio:{echoCancellation:false,
  noiseSuppression:false,autoGainControl:false}})` → `AudioContext` → a tiny `AudioWorklet`
  that only copies each input block to the main thread via `port.postMessage` (no protocol
  code in the worklet, so no bundling). The main thread converts `Float32`→`Int16` and feeds
  `demod.js` → `rx.js`. Disabling the browser's AGC/NS matters: the demod does its own gain
  tracking and the processing would distort the tones.

## UI

- `index.html`: role picker; opens `tx.html` or `rx.html`.
- `tx.html` + `js/ui/tx-ui.js`: Flipper Zero silhouette (SVG outline). Inside the screen: a
  tile grid of images (uploaded + samples), a send action, the sending "sheet" leaving the top
  edge, progress and time left, an on-screen RGB LED that follows the symbol (blue tone, green
  parity frame, red sync, off silence). Buttons: Left/Right/Up/Down select, OK sends, Back
  stops. Upload control adds an image (dithered preview shown as a tile).
- `rx.html` + `js/ui/rx-ui.js`: Playdate silhouette (SVG outline). Inside the screen: the
  intro scene (dolphin, console filling with the preview, the dolphin opening its mouth when a
  tone is heard), the picture rising from the bottom edge, the side panel (name, state, ZIP/RAW,
  line progress, counters incl. "fixed"), the END banner. Buttons: A clears, B back, Right
  toggles the panel, the crank is decorative for now. A mic permission prompt gates listening.
- Sprites (`assets/`): the dolphin (closed + open mouth) and console PNGs reused from the
  Playdate app.

## Validation (`vectors/`, dev-time only)

A small C harness (`tests/gen_web_vectors.c`) writes JSON vectors: GF/RS encode+erasure cases,
CRC of known inputs, codec round-trips, a packed frame's bytes, an interleave round-trip, a
full `buildPhysical` pass (per-frame hex) for the sample images, and a hash of the modulator
output. A Node script (`test/run.mjs`, run with `node`, not shipped) imports the JS
protocol modules and asserts they reproduce the vectors. Separately it decodes the real
`recordings/*.wav` with the JS demod and compares lines/frames/preview against the C decoder's
numbers. Browser↔browser is tested by loopback in the page; browser↔hardware needs the user's
devices.

## Build order

1. Protocol core (`params`, `gf256`, `rs`, `crc8`, `codec`, `frame`, `preview`, `image`) +
   C vector harness; JS matches the vectors byte-for-byte.
2. `modem` + `demod` + `rx`; JS-modulate → JS-demodulate loopback returns the image intact,
   and the JS demod on the real recordings matches the C decoder.
3. Audio glue: transmit playback and microphone capture.
4. UI: the Flipper tab and the Playdate tab (silhouettes + screens + functional buttons).
5. Deploy to GitHub Pages; cross-test with real hardware (with the user).

## Non-goals (v1)

Server side of any kind; storing or sharing received images beyond a local download; the
Playdate crank; pixel-exact reproduction of the device firmware UIs (themed, not cloned);
mobile-browser polish.
