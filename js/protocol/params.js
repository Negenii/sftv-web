// Protocol constants, mirror of common/sstv_params.h. Keep values identical to the C.
export const WIDTH = 400;
export const HEIGHT = 240;
export const LINE_BYTES = 50;                 // ceil(400/8)
export const IMAGE_BYTES = LINE_BYTES * HEIGHT;
export const PAYLOAD_BYTES = 26;
export const SEG_BYTES = 25;                  // half a line
export const SEGS_PER_LINE = 2;
export const NUM_SEGS = HEIGHT * SEGS_PER_LINE;
export const META_NAME_OFFSET = 3;
export const NAME_MAX = PAYLOAD_BYTES - META_NAME_OFFSET;
export const META_CODED_FLAG = 0x8000;
export const META_START = 0, META_END = 1, META_PREVIEW = 2, META_TINY = 3, META_SCHEDULE = 4;
export const TINY_W = 40, TINY_H = 20, TINY_LINE_BYTES = 5;
export const TINY_BYTES = TINY_LINE_BYTES * TINY_H;
export const TINY_CHUNKS = 4;
export const PREVIEW_W = 80, PREVIEW_H = 48, PREVIEW_LINE_BYTES = 10;
export const PREVIEW_BYTES = PREVIEW_LINE_BYTES * PREVIEW_H;
export const PREVIEW_CHUNK = PAYLOAD_BYTES - 1;                       // 25
export const PREVIEW_CHUNKS = Math.floor((PREVIEW_BYTES + PREVIEW_CHUNK - 1) / PREVIEW_CHUNK); // 20
export const SCHEDULE_CHUNKS = 4;
export const MAX_CODED_BLOCKS = SCHEDULE_CHUNKS * PREVIEW_CHUNK;      // 100
export const INTRO_FRAMES = TINY_CHUNKS + PREVIEW_CHUNKS;            // 24
export const INTRO_FRAMES_CODED = INTRO_FRAMES + SCHEDULE_CHUNKS;   // 28
export const DATA_BYTES = 2 + PAYLOAD_BYTES + 1;                     // 29
export const PARITY_BYTES = 16;                                      // revision 14 (was 12)
export const FRAME_BYTES = DATA_BYTES + PARITY_BYTES;               // 45
export const FRAME_BITS = FRAME_BYTES * 8;                           // 360
export const ILEAVE = 4;
export const META_PAUSE = 5, META_RESUME = 6;
export const META_NOTE_FLAG = 0x4000;   // START/END: this pass carries a text note
export const META_UTF8_FLAG = 0x2000;   // note charset: set = UTF-8, clear = ASCII
export const NOTE_MAX_BYTES = 65535; // revision 11: multi-group notes (see sstv_params.h)
export const NOTE_MAX_CHARS = NOTE_MAX_BYTES; // the web builder sends the full range (the Flipper: 12000)
export const NOTE_CHUNK = SEG_BYTES;     // 25 text bytes per RAW frame
export const NOTE_MAX_FRAMES = Math.floor((Math.floor((NOTE_MAX_CHARS + NOTE_CHUNK - 1) / NOTE_CHUNK) + ILEAVE - 1) / ILEAVE) * ILEAVE; // 2624
export const NOTE_LEN_OFFSET = 3;        // START: [subtype][total lo][total hi][len lo][len hi][name...]
export const NOTE_NAME_OFFSET = 5;
export const NOTE_NAME_MAX = PAYLOAD_BYTES - NOTE_NAME_OFFSET; // 21
export const BLOCK_PAYLOAD = ILEAVE * PAYLOAD_BYTES;                 // 104
export const FT_RAW = 0, FT_CODED = 1, FT_META = 2, FT_PARITY = 3;
export const FT_SHIFT = 14, INDEX_MASK = 0x3fff;
export const MAX_BLOCKS = Math.floor(HEIGHT / 2);
export const OUTER_GROUP = 108;
export const OUTER_PARITY = PARITY_BYTES;
export const MAX_DATA_FRAMES = ILEAVE + INTRO_FRAMES_CODED + NUM_SEGS; // 512
export const OUTER_GROUPS_MAX = 1 + Math.floor((MAX_DATA_FRAMES + OUTER_GROUP - 1) / OUTER_GROUP);
export const MAX_FRAMES = MAX_DATA_FRAMES + OUTER_GROUPS_MAX * OUTER_PARITY + ILEAVE;
export const NOTE_MAX_TEXT_FRAMES = Math.ceil(Math.ceil(NOTE_MAX_BYTES / SEG_BYTES) / ILEAVE) * ILEAVE; // 2624
export const RX_MAX_DATA_FRAMES = ILEAVE + NOTE_MAX_TEXT_FRAMES; // 2628
export const RX_GROUPS_MAX = 1 + Math.floor((RX_MAX_DATA_FRAMES + OUTER_GROUP - 1) / OUTER_GROUP); // 26
export const noteIntro = (dataFrames) => Math.min(dataFrames, OUTER_GROUP); // group 0 of a note
export const CODED_MIN_GAIN = 0.85;

export const NUM_TONES = 4;
export const BITS_PER_SYMBOL = 2;
export const TONES_HZ = [0, 3000, 3500, 4000];
export const TONE_DUTY_PCT = [0, 12, 30, 50];
export const SILENCE_LEVEL = 0.3;
export const SYNC_DUTY_PCT = 50;
export const FSYNC_HZ = 5500;
export const SYMBOL_US = 4000;
export const SYNC_US = 16000;
export const WINDOW_US = 2000;
export const SYNC_WINDOW_MULT = 4;
export const SAMPLE_POINT = 0.95;
export const EDGE_ADJUST_US = -300;
export const NOISE_FLOOR_LSB = 40.0;
export const GAIN_TAU_S = 0.5;
export const SYNC_GAIN_TAU_S = 3.0;
export const SYNC_MIN_REL = 0.15;
export const GAIN_CLAMP = 100.0;
export const SYNC_MIN_MS = 6;
// Near-ultrasound band (see sstv_params.h): same protocol, tones 18.0/18.5/19.0 kHz, sync 21 kHz
export const BAND_AUDIBLE = 0, BAND_HF = 1;
// 8-FSK (revision 10): 7 tones + silence, 3 bits per symbol, 110 symbols per frame
export const MAX_TONES = 8, HF_NUM_TONES = 8, HF_BITS_PER_SYMBOL = 3;
export const HF_TONES_HZ = [17000, 17500, 18000, 18500, 19000, 19500, 20000, 20500]; // no silence (see sstv_params.h)
export const HF_HAS_SILENCE = false;
export const HF_FSYNC_HZ = 21000;
export const HF_SYMBOL_US = 3000, HF_WINDOW_US = 2000; // 2 ms / 1 ms failed on hardware, see sstv_params.h
export const HF_NOISE_FLOOR_LSB = 5.0;
export const SYNC_DOMINANCE = 1.2; // sync must beat every data detector by this (was 3; see sstv_params.h)
// Start preamble (revision 9): tone ladder + lock frames
export const LADDER_TONE_SYMBOLS = 50, LADDER_GAP_SYMBOLS = 25, LOCK_FRAMES = 3, LOCK_MATCH_BITS = 66;
export const SYMBOLS_PER_FRAME = FRAME_BITS / BITS_PER_SYMBOL;       // 164
export const LEADER_SYMBOLS = (NUM_TONES - 1) * (LADDER_TONE_SYMBOLS + LADDER_GAP_SYMBOLS); // 225
export const leaderSymbol = (i) => { const per = LADDER_TONE_SYMBOLS + LADDER_GAP_SYMBOLS; return (i % per) < LADDER_TONE_SYMBOLS ? 1 + Math.floor(i / per) : 0; };
export const PHYS_US = SYNC_US + SYMBOLS_PER_FRAME * SYMBOL_US;     // 672000
export const LINE_US = PHYS_US * SEGS_PER_LINE;
export const PREAMBLE_US = LEADER_SYMBOLS * SYMBOL_US + LOCK_FRAMES * PHYS_US; // 2.916 s

// Codec modes
export const CODEC_RAW = 0, CODEC_RLE = 1, CODEC_XOR_RLE = 2;
export const CODEC_MAX_RECORD = 1 + LINE_BYTES;

// Pass frame kinds
export const PASS_DATA = 0, PASS_PARITY = 1, PASS_END = 2;

// per-band timing (mirror of SSTV_BAND_SYMBOL_US / SSTV_BAND_PHYS_US)
export const bandSymbolUs = (band) => (band === BAND_HF ? HF_SYMBOL_US : SYMBOL_US);
export const bandNumTones = (band) => (band === BAND_HF ? HF_NUM_TONES : NUM_TONES);
export const bandBits = (band) => (band === BAND_HF ? HF_BITS_PER_SYMBOL : BITS_PER_SYMBOL);
export const bandSymbolsPerFrame = (band) => Math.ceil(FRAME_BITS / bandBits(band)); // 164 / 110
// pattern sync (revision 13, mirror of SSTV_HF_SYNC_*): the HF frame starts with these data tones
export const HF_SYNC_SYMBOLS = 8, HF_SYNC_PATTERN = [0, 4, 7, 3, 6, 2, 5, 1], SYNC_SCORE_MIN = 0.45;
export const bandSyncUs = (band) => (band === BAND_HF ? HF_SYNC_SYMBOLS * HF_SYMBOL_US : SYNC_US);
export const bandPhysUs = (band) => bandSyncUs(band) + bandSymbolsPerFrame(band) * bandSymbolUs(band);
export const bandLeaderSymbols = (band) => (bandNumTones(band) - 1) * (LADDER_TONE_SYMBOLS + LADDER_GAP_SYMBOLS);
