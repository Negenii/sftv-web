# SFTV Web

Browser transmitter and receiver for SFTV, wire-compatible with the Flipper Zero and Playdate.
Static site, plain JS ES modules, no build. See `docs/2026-09-03-sftv-web-design.md`.

- `js/protocol/` — JS port of the C `common/` protocol (params, rs, crc8, codec, frame, preview, modem, demod, rx). Validated byte-for-byte against C.
- `vectors/` — reference passes emitted by `tests/gen_web_vectors.c` (fixtures for the test).
- `test/run.mjs` — `node web/test/run.mjs` checks the JS port reproduces the C vectors.

Regenerate vectors: `clang -std=c11 -I common -o /tmp/genvec tests/gen_web_vectors.c common/{crc8,rs,sstv_codec,sstv_frame,sstv_preview}.c` then `for k in 0 1 2; do /tmp/genvec $k pic > web/vectors/pass_$k.txt; done`.

## Run locally

`getUserMedia` and ES modules need a secure context; `localhost` counts. From the repo root:

    (cd web && python3 -m http.server 8000)

then open http://localhost:8000/ and pick Transmitter or Receiver. For the full loop on one
machine, open the transmitter and receiver in two tabs, unmute the speakers and allow the mic.
Deploy: serve `web/` as static files (GitHub Pages: set Pages source to the repo, `/web`).

## Tests

- `node web/test/run.mjs` — JS buildPhysical matches the C vectors byte-for-byte.
- `node web/test/loopback.mjs [recording.wav]` — JS modem→demod→rx loopback returns the image;
  with a recording it prints the JS demod's figures (compare to `tests/bin/sstv_decode_wav`).
