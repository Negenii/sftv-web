"""The Playdate body for the web receiver (assets/playdate.png), drawn from simple shapes in the
proportions of the real device (measured from a product render, no pixels copied).
Coordinates are in the render's 660x680 frame, where the screen is 438.5 px wide; the output is
scaled so the screen is 400x240 at 1:1, at (60, 60).
Run from the repo root: python3 tools/make_playdate_body.py (needs Pillow)."""
from PIL import Image, ImageDraw, ImageFilter
SS = 4
K = 400 / 438.5                       # render px -> output px
YEL, YEL_DARK, YEL_LIGHT = (255, 199, 52), (226, 160, 20), (255, 222, 120)
GLASS, LCD_BG, LCD_INK = (40, 40, 40), (177, 175, 168), (49, 47, 40)
STEEL, STEEL_DARK, STEEL_LIGHT = (150, 152, 155), (88, 90, 94), (205, 207, 210)
SCREW, SCREW_IN = (62, 62, 64), (150, 150, 152)
LCD_XY = (65.8, 65.8)                 # screen origin in render px


def body():
    W, H = 660, 680
    im = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    def B(x0, y0, x1, y1): return [x0 * SS, y0 * SS, x1 * SS, y1 * SS]
    def rr(box, r, fill, outline=None, w=0): d.rounded_rectangle(B(*box), r * SS, fill=fill, outline=outline, width=int(w * SS))
    def circ(cx, cy, r, fill, outline=None, w=0): d.ellipse(B(cx - r, cy - r, cx + r, cy + r), fill=fill, outline=outline, width=int(w * SS))

    # crank, folded against the right side: a steel housing with the yellow knob at its top
    rr((580, 304, 632, 501), 9, (40, 41, 41))              # dark edge
    rr((595, 304, 632, 501), 9, (134, 136, 136))           # steel
    rr((598, 308, 604, 497), 3, (160, 162, 163))           # a light streak along it
    circ(614, 324, 7, YEL, YEL_DARK, 1.5)
    # lock button on the top edge
    rr((444, 28, 500, 40), 4, STEEL_DARK)
    # body: darker rim, then the face
    rr((30, 32, 590, 609), 24, YEL_DARK)
    rr((32, 33, 588, 606), 23, YEL)
    # glass with the screen in it
    rr((36, 41, 526, 357), 16, GLASS)
    EDGE, BTN, BTN_HI = (214, 140, 16), (255, 206, 70), (255, 232, 150)
    def screw(cx, cy):
        circ(cx, cy, 20, (118, 118, 120)); circ(cx, cy, 18, (188, 188, 190)); circ(cx, cy, 15, (160, 160, 163))
        circ(cx, cy, 9, (52, 52, 54)); circ(cx - 2, cy - 2, 3, (95, 95, 98))
    # right column: screw, menu button, speaker grille
    screw(560, 64)
    circ(560, 120, 20, EDGE); circ(560, 119, 18, BTN); circ(559, 118, 9, (246, 240, 226))
    rr((548, 166, 572, 263), 12, (64, 62, 58))
    for gy in range(175, 258, 6):
        for gx in (553, 560, 567):
            circ(gx, gy, 1.5, (140, 136, 128))
    # d-pad: dark outline, a shadow under it, a highlight along its top-left edges
    arms = [(93, 457, 232, 501), (141, 405, 184, 553)]
    for b in arms: rr((b[0] - 2, b[1] - 2, b[2] + 2, b[3] + 5), 12, EDGE)
    for b in arms: rr(b, 10, BTN_HI)
    for b in arms: rr((b[0] + 2, b[1] + 3, b[2], b[3]), 9, BTN)
    # B and A
    from PIL import ImageFont
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", int(30 * SS), index=1)
    except Exception:
        font = ImageFont.load_default()
    for cx, letter in ((365, "B"), (476, "A")):
        circ(cx, 448, 34, EDGE); circ(cx, 445, 32, BTN_HI); circ(cx + 2, 447, 30, BTN)
        circ(cx, 445, 17, (255, 238, 196)); circ(cx, 445, 14, BTN)
        d.text((cx * SS, 446 * SS), letter, font=font, fill=(255, 238, 196), anchor="mm")
    # screws in the bottom corners
    for sx in (61, 562):
        screw(sx, 580)
    out_w, out_h = int(round(W * K)), int(round(H * K))
    im = im.resize((out_w, out_h), Image.LANCZOS)
    return im, (int(round(LCD_XY[0] * K)), int(round(LCD_XY[1] * K)))


if __name__ == "__main__":
    # assets/playdate.png: the body on transparency, its screen filled with the LCD colour
    im, (sx, sy) = body()
    ImageDraw.Draw(im).rectangle([sx, sy, sx + 399, sy + 239], fill=LCD_BG + (255,))
    im.save("assets/playdate.png", optimize=True); print(im.size, (sx, sy))
