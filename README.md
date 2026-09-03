# SFTV Web

Browser transmitter and receiver for SFTV, wire-compatible with the Flipper Zero and Playdate.
Static site, plain JS ES modules, no build. See `docs/2026-09-03-sftv-web-design.md`.

- `js/protocol/` — JS port of the C `common/` protocol (params, rs, crc8, codec, frame, preview, modem, demod, rx). Validated byte-for-byte against C.
- `vectors/` — reference passes emitted by `tests/gen_web_vectors.c` (fixtures for the test).
- `test/run.mjs` — `node web/test/run.mjs` checks the JS port reproduces the C vectors.

Regenerate vectors: `clang -std=c11 -I common -o /tmp/genvec tests/gen_web_vectors.c common/{crc8,rs,sstv_codec,sstv_frame,sstv_preview}.c` then `for k in 0 1 2; do /tmp/genvec $k pic > web/vectors/pass_$k.txt; done`.
