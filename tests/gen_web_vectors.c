/* Generates protocol vectors for the JS port: builds passes for deterministic images and
 * dumps total/coded and every physical frame as hex. Used by test/run.mjs. */
#include "sstv_frame.h"
#include "sstv_preview.h"
#include "sstv_params.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void fill(uint8_t* img, int kind) {
    if (kind == 0) for (int i = 0; i < SSTV_IMAGE_BYTES; i++) img[i] = (uint8_t)((i * 2654435761u) >> 13); /* raw */
    else if (kind == 1) memset(img, 0, SSTV_IMAGE_BYTES); /* white -> coded */
    else for (int y = 0; y < SSTV_HEIGHT; y++) for (int i = 0; i < SSTV_LINE_BYTES; i++) img[y * SSTV_LINE_BYTES + i] = ((y / 8) & 1) ? 0xF0 : 0x0F; /* stripes -> coded */
}

int main(int argc, char** argv) {
    int kind = argc > 1 ? atoi(argv[1]) : 0;
    const char* name = argc > 2 ? argv[2] : "vec";
    uint8_t* img = malloc(SSTV_IMAGE_BYTES);
    fill(img, kind);
    uint8_t* phys = malloc(SSTV_MAX_FRAMES * SSTV_FRAME_BYTES);
    uint8_t* la = malloc(SSTV_MAX_FRAMES);
    bool coded = false;
    int total;
    if (kind == 3) { /* note pass: fixed text incl UTF-8 (Cyrillic "привет") */
        const char* text = "Note: \xd0\xbf\xd1\x80\xd0\xb8\xd0\xb2\xd0\xb5\xd1\x82 123";
        total = sstv_build_note(text, name, phys, la);
        printf("total %d coded 0\n", total);
    } else {
        total = sstv_build_physical(img, name, phys, la, &coded);
        printf("total %d coded %d\n", total, coded ? 1 : 0);
    }
    for (int f = 0; f < total; f++) {
        for (int j = 0; j < SSTV_FRAME_BYTES; j++) printf("%02x", phys[f * SSTV_FRAME_BYTES + j]);
        printf("\n");
    }
    return 0;
}
