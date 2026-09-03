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
export const PARITY_BYTES = 12;
export const FRAME_BYTES = DATA_BYTES + PARITY_BYTES;               // 41
export const FRAME_BITS = FRAME_BYTES * 8;                           // 328
export const ILEAVE = 4;
export const BLOCK_PAYLOAD = ILEAVE * PAYLOAD_BYTES;                 // 104
export const FT_RAW = 0, FT_CODED = 1, FT_META = 2, FT_PARITY = 3;
export const FT_SHIFT = 14, INDEX_MASK = 0x3fff;
export const MAX_BLOCKS = Math.floor(HEIGHT / 2);
export const OUTER_GROUP = 108;
export const OUTER_PARITY = PARITY_BYTES;
export const MAX_DATA_FRAMES = ILEAVE + INTRO_FRAMES_CODED + NUM_SEGS; // 512
export const OUTER_GROUPS_MAX = 1 + Math.floor((MAX_DATA_FRAMES + OUTER_GROUP - 1) / OUTER_GROUP);
export const MAX_FRAMES = MAX_DATA_FRAMES + OUTER_GROUPS_MAX * OUTER_PARITY + ILEAVE;
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
export const LEADER_US = 2000000;
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
export const SYMBOLS_PER_FRAME = FRAME_BITS / BITS_PER_SYMBOL;       // 164
export const LEADER_SYMBOLS = Math.floor(LEADER_US / SYMBOL_US);
export const PHYS_US = SYNC_US + SYMBOLS_PER_FRAME * SYMBOL_US;     // 672000
export const LINE_US = PHYS_US * SEGS_PER_LINE;

// Codec modes
export const CODEC_RAW = 0, CODEC_RLE = 1, CODEC_XOR_RLE = 2;
export const CODEC_MAX_RECORD = 1 + LINE_BYTES;

// Pass frame kinds
export const PASS_DATA = 0, PASS_PARITY = 1, PASS_END = 2;
