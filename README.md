# SFTV Web

Browser transmitter and receiver for SFTV, wire-compatible with the Flipper Zero and Playdate.
Near-ultrasound band only (17-21 kHz); the audible 3-4 kHz band is archived at git tag
`audible-mode-archive`. Mac speakers may not reproduce 17-21 kHz well: the web transmitter is
mainly a protocol simulator, the receiver is the useful part.
Static site, plain JS ES modules, no build. See `docs/2026-09-03-sftv-web-design.md`.

- `js/protocol/` — JS port of the C `common/` protocol (params, rs, crc8, codec, frame, preview, modem, demod, rx). Validated byte-for-byte against C.
- `vectors/` — reference passes emitted by `tests/gen_web_vectors.c` (fixtures for the test).
- `test/run.mjs` — `node web/test/run.mjs` checks the JS port reproduces the C vectors.

Regenerate vectors: `clang -std=c11 -I common -o /tmp/genvec tests/gen_web_vectors.c common/{crc8,rs,sstv_codec,sstv_frame,sstv_preview}.c` then `for k in 0 1 2; do /tmp/genvec $k pic > web/vectors/pass_$k.txt; done`.

## Run locally

Just open `tx.html` from disk: the pages load `js/tx.bundle.js` / `js/rx.bundle.js`, plain
scripts built from the ES modules by `./build.sh` (esbuild via npx). Rerun it after editing `js/`.

The receiver needs the mic, and Safari only allows `getUserMedia` on `localhost`/https. If
`rx.html` from disk can't get the mic, serve the folder. From the repo root:

    (cd web && python3 -m http.server 8000)

then open http://localhost:8000/ and pick Transmitter or Receiver. For the full loop on one
machine, open the transmitter and receiver in two tabs, unmute the speakers and allow the mic.
Deploy: serve `web/` as static files (GitHub Pages: set Pages source to the repo, `/web`).

## Looks

- The receiver draws the Playdate app's Receive screen with the app's own fonts and images:
  `node tools/make_web_pd_assets.mjs` converts `playdate/Source/{fonts,images}` into
  `js/ui/pd-assets.js`; `js/ui/pd-gfx.js` is a 1-bit framebuffer with the Playdate drawing calls.
  Rerun the converter if those assets change, then `./build.sh`.
- Device art: `assets/flipper.svg` (qFlipper, GPL-3.0) and `assets/playdate.png` (Panic's product
  render). Both are third-party images: fine for local use, check the rights before publishing.

## Tests

- `node web/test/run.mjs` — JS buildPhysical matches the C vectors byte-for-byte.
- `node web/test/loopback.mjs [recording.wav]` — JS modem→demod→rx loopback returns the image;
  with a recording it prints the JS demod's figures (compare to `tests/bin/sstv_decode_wav`).
