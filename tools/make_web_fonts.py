"""1-bit Playdate-format fonts (.fnt + table PNG) for the web receiver, drawn from a free (OFL)
typeface but with the metrics of the SDK's Roobert fonts the Playdate app uses: the same
characters' advance widths, tracking, kerning, cell size, baseline and cap height, so every
text in the receiver lays out exactly as on the device. No Roobert glyph shapes are copied:
Roobert is read only for those numbers (and for where each glyph's ink sits horizontally).
Usage: make_web_fonts.py <Roobert dir> <OFL font.ttf> <out dir> [weights...]"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

KEEP = [chr(c) for c in range(0x20, 0x7F)] + ['…', '‘', '’', '“', '”', '©', 'Ⓐ', 'Ⓑ']
SPECS = {  # Roobert font -> (our name, weight of the free font, mono); EMBOLDEN: 2 px stems
    'Roobert-10-Bold': ('SFTV-10-Bold', 600, False),
    'Roobert-9-Mono-Condensed': ('SFTV-9-Mono-Condensed', 500, True),
    'Roobert-20-Medium': ('SFTV-20-Medium', 500, False),
    'Roobert-11-Medium-extended': ('SFTV-11-Medium-extended', 600, False),
}


def read_fnt(path):
    head, glyphs, tracking = [], [], 0
    for line in open(path, encoding='utf-8').read().splitlines():
        if line.startswith('tracking='): tracking = int(line.split('=')[1])
        if line.startswith('--') or line.startswith('tracking=') or '\t' not in line:
            if line.startswith('--'): head.append(line)
            continue
        g, w = line.split('\t')[0], int(line.split('\t')[-1])
        glyphs.append((' ' if g == 'space' else g, w))
    return head, tracking, glyphs


def table_of(d, base):
    t = [f for f in os.listdir(d) if f.startswith(base + '-table-') and f.endswith('.png')][0]
    cw, ch = map(int, t[:-4].split('-')[-2:])
    return Image.open(os.path.join(d, t)).convert('RGBA'), cw, ch


def ink(img):  # 1 where opaque and dark
    w, h = img.size; px = img.load()
    return [[1 if px[x, y][3] > 127 and sum(px[x, y][:3]) < 384 else 0 for x in range(w)] for y in range(h)]


def bbox(m):
    ys = [y for y, r in enumerate(m) if any(r)]; xs = [x for r in m for x, v in enumerate(r) if v]
    return (min(xs), min(ys), max(xs), max(ys)) if xs else None


def cell(tbl, cw, ch, i):
    cols = tbl.width // cw
    return tbl.crop(((i % cols) * cw, (i // cols) * ch, (i % cols + 1) * cw, (i // cols + 1) * ch))


def render(font, ch_, size_h):
    """The glyph as an ink matrix plus its baseline row, rendered big then thresholded."""
    img = Image.new('L', (size_h * 4, size_h * 3), 0)
    d = ImageDraw.Draw(img)
    d.text((size_h, size_h), ch_, font=font, fill=255, anchor='ls')
    m = [[1 if v > 120 else 0 for v in row] for row in [list(img.crop((0, y, img.width, y + 1)).getdata()) for y in range(img.height)]]
    return m, size_h


def circled(letter, cw, ch, base_y, size, font_px):
    """Ⓐ / Ⓑ: a filled disc with the letter knocked out, as the Playdate's glyphs."""
    S = 4
    img = Image.new('L', (cw * S, ch * S), 0); d = ImageDraw.Draw(img)
    r = size / 2; cx = (size / 2 + 1) * S; cy = (base_y - size / 2 + 1) * S
    d.ellipse([cx - r * S, cy - r * S, cx + r * S, cy + r * S], fill=255)
    d.text((cx, cy + S * 0.5), letter, font=font_px, fill=0, anchor='mm')
    img = img.resize((cw, ch), Image.BOX)
    return [[1 if img.getpixel((x, y)) > 127 else 0 for x in range(cw)] for y in range(ch)]


def hinted(font, g, px):
    """The glyph as FreeType draws it at its real pixel size with hinting, in 1 bit (strokes
    land on whole pixels). Returns the ink matrix and the row of its baseline."""
    W = px * 4
    im = Image.new('L', (W, W), 0); d = ImageDraw.Draw(im); d.fontmode = '1'
    d.text((px, px * 3), g, font=font, fill=255, anchor='ls')
    b = im.getbbox()
    if not b: return None, 0
    m = [[1 if im.getpixel((x, y)) > 127 else 0 for x in range(b[0], b[2])] for y in range(b[1], b[3])]
    return m, (px * 3 - 1) - b[1]   # baseline row inside the matrix


EMBOLDEN = {'Roobert-10-Bold', 'Roobert-9-Mono-Condensed'}
DIAGONAL = set('vVwWxXyYkKzZAM/\\<>')  # shifting these fills the gap between their strokes: drawn heavier instead


def embolden(m):
    """Pixel-font bold: the glyph OR itself shifted one pixel right (1 px stems become 2)."""
    return [[1 if (x < len(r) and r[x]) or (x > 0 and r[x - 1]) else 0 for x in range(len(r) + 1)] for r in m]


def fit_rows(m, gb, below):
    """Fit the part under the baseline (rows after gb) into `below` rows by dropping repeated
    rows of the descender, nearest the baseline first, then the row just under the baseline."""
    m = [r[:] for r in m]
    while len(m) - 1 - gb > below:
        cand = [y for y in range(gb + 2, len(m)) if m[y] == m[y - 1]]
        y = cand[0] if cand else gb + 1
        del m[y]
    return m


def narrow(m, w):
    """Fit the ink into w columns by dropping columns that repeat their neighbour (a stroke one
    pixel thicker than needed), nearest the middle first; then any middle column."""
    m = [r[:] for r in m]
    while m and len(m[0]) > w:
        n = len(m[0]); mid = n // 2
        order = sorted(range(1, n - 1), key=lambda x: abs(x - mid))
        dup = [x for x in order if all(r[x] == r[x - 1] for r in m)]
        x = dup[0] if dup else order[0]
        m = [r[:x] + r[x + 1:] for r in m]
    return m


def squeeze(font_big, g, k, rows, w, thr=0.42):
    """A diagonal glyph fitted into w columns: drawn k times bigger and averaged down to
    w x rows, so its strokes keep their slant and the tip stays. narrow() drops whole columns,
    which cuts the point off a v (only the middle columns reach its bottom rows)."""
    im = Image.new('L', (font_big.size * 4, font_big.size * 4), 0)
    ImageDraw.Draw(im).text((font_big.size, font_big.size * 3), g, font=font_big, fill=255, anchor='ls')
    im = im.crop(im.getbbox()).resize((w, rows), Image.BOX)
    return [[1 if im.getpixel((x, y)) >= thr * 255 else 0 for x in range(w)] for y in range(rows)]


def thicken(m):
    """A stroke left one pixel wide by squeeze() gets its second pixel on the side the stroke
    continues (where the row above or below has ink)."""
    m = [r[:] for r in m]; h, w = len(m), len(m[0])
    for y in range(h):
        r = m[y]; x = 0
        while x < w:
            if r[x] and (x == 0 or not r[x - 1]) and (x + 1 >= w or not r[x + 1]):
                near = lambda c: 0 <= c < w and any(m[yy][c] for yy in (y - 1, y + 1) if 0 <= yy < h)
                if x + 1 < w and near(x + 1): r[x + 1] = 1
                elif x > 0: r[x - 1] = 1
                x += 2
            else: x += 1
    return m


def set_wght(f, w):
    try: f.set_variation_by_axes([w])
    except Exception: pass
    return f


def build(roobert_dir, ttf, out_dir, weights=None):
    os.makedirs(out_dir, exist_ok=True)
    for rname, (name, wght, mono) in SPECS.items():
        if weights: wght = weights.get(rname, wght)
        head, tracking, glyphs = read_fnt(os.path.join(roobert_dir, rname + '.fnt'))
        tbl, cw, ch = table_of(roobert_dir, rname)
        idx = {g: i for i, (g, _) in enumerate(glyphs)}
        hb = bbox(ink(cell(tbl, cw, ch, idx['H'])))
        base_y, cap = hb[3], hb[3] - hb[1] + 1
        # the pixel size whose hinted H is as tall as Roobert's
        px = min(range(6, 48), key=lambda p: (abs(len(hinted(set_wght(ImageFont.truetype(ttf, p), wght), 'H', p)[0]) - cap), p))
        font = set_wght(ImageFont.truetype(ttf, px), wght)
        heavy = set_wght(ImageFont.truetype(ttf, px), 900)
        out = [(g, w) for g, w in glyphs if g in KEEP]
        cols = 16
        sheet = Image.new('RGBA', (cols * cw, ((len(out) + cols - 1) // cols) * ch), (0, 0, 0, 0))
        for k, (g, adv) in enumerate(out):
            r = bbox(ink(cell(tbl, cw, ch, idx[g])))
            cm = [[0] * cw for _ in range(ch)]
            if g in ('Ⓐ', 'Ⓑ'):
                size = (r[2] - r[0] + 1) if r else cap + 4
                lf = set_wght(ImageFont.truetype(ttf, int(size * 0.72 * 4)), 800)  # the knocked-out letter, bold
                cm = circled(g == 'Ⓐ' and 'A' or 'B', cw, ch, r[3] if r else base_y, size, lf)
                if r:  # the disc where Roobert's is
                    b = bbox(cm); dx, dy = r[0] - b[0], r[1] - b[1]
                    cm = [[cm[y - dy][x - dx] if 0 <= y - dy < ch and 0 <= x - dx < cw else 0 for x in range(cw)] for y in range(ch)]
            elif g != ' ' and r:
                diag = rname in EMBOLDEN and g in DIAGONAL
                m, gb = hinted(heavy if diag else font, g, px)
                if m:
                    rw = r[2] - r[0] + 1
                    if g in DIAGONAL and (len(m[0]) > rw or rw - len(m[0]) >= 2):   # too wide, or a gap beside it
                        # the hinted rows stay (height, baseline); only the width is resampled
                        big = set_wght(ImageFont.truetype(ttf, px * 8), 900 if diag else wght)
                        m = thicken(squeeze(big, g, 8, len(m), rw))
                    elif rname in EMBOLDEN and not diag: m = embolden(m)
                    m = fit_rows(m, gb, ch - 1 - base_y)        # descenders inside the cell
                    if len(m[0]) > rw: m = narrow(m, rw)
                    if g == 'N' and not rname in EMBOLDEN:   # Figtree's hinted N has a 1 px left stem
                        rows = [y for y, row in enumerate(m) if row[0]]
                        if sum(1 for y in rows if not m[y][1]) > len(rows) // 2:
                            for y in rows: m[y][1] = 1
                    gw = len(m[0])
                    left = r[0] + (rw - gw) // 2          # centred in Roobert's ink box: never closer to a neighbour
                    top = base_y - gb                      # baselines on the same row
                    for y, row in enumerate(m):
                        for x, v in enumerate(row):
                            X, Y = left + x, top + y
                            if v and 0 <= X < cw and 0 <= Y < ch: cm[Y][X] = 1
            ox, oy = (k % cols) * cw, (k // cols) * ch
            for y in range(ch):
                for x in range(cw):
                    if cm[y][x]: sheet.putpixel((ox + x, oy + y), (0, 0, 0, 255))
        sheet.save(os.path.join(out_dir, f'{name}-table-{cw}-{ch}.png'))
        with open(os.path.join(out_dir, f'{name}.fnt'), 'w', encoding='utf-8') as f:
            for h in head: f.write(h + '\n')
            if tracking: f.write(f'tracking={tracking}\n')
            f.write('\n')
            for g, w in out: f.write(('space' if g == ' ' else g) + '\t' + str(w) + '\n')
        print(name, len(out), 'glyphs', f'{cw}x{ch}', 'cap', cap, 'px', px, 'weight', wght)


if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2], sys.argv[3])
