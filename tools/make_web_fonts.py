"""1-bit Playdate-format fonts (.fnt + table PNG) for the web receiver, drawn from a free (OFL)
typeface but with the metrics of the SDK's Roobert fonts the Playdate app uses: the same
characters' advance widths, tracking, kerning, cell size, baseline and cap height, so every
text in the receiver lays out exactly as on the device. No Roobert glyph shapes are copied:
Roobert is read only for those numbers (and for where each glyph's ink sits horizontally).
Usage: make_web_fonts.py <Roobert dir> <OFL font.ttf> <out dir> [weights...]"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

KEEP = [chr(c) for c in range(0x20, 0x7F)] + ['…', '‘', '’', '“', '”', '©', 'Ⓐ', 'Ⓑ']
SPECS = {  # Roobert font -> (our name, weight of the free font, mono)
    'Roobert-10-Bold': ('SFTV-10-Bold', 700, False),
    'Roobert-9-Mono-Condensed': ('SFTV-9-Mono-Condensed', 600, True),
    'Roobert-20-Medium': ('SFTV-20-Medium', 500, False),
    'Roobert-11-Medium-extended': ('SFTV-11-Medium-extended', 500, False),
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


def build(roobert_dir, ttf, out_dir, weights=None):
    os.makedirs(out_dir, exist_ok=True)
    for rname, (name, wght, mono) in SPECS.items():
        if weights: wght = weights.get(rname, wght)
        head, tracking, glyphs = read_fnt(os.path.join(roobert_dir, rname + '.fnt'))
        tbl, cw, ch = table_of(roobert_dir, rname)
        idx = {g: i for i, (g, _) in enumerate(glyphs)}
        Hm = ink(cell(tbl, cw, ch, idx['H'])); hb = bbox(Hm)
        base_y, cap = hb[3], hb[3] - hb[1] + 1
        # free font size with the same cap height (measured on a big render, then scaled)
        probe = ImageFont.truetype(ttf, 400)
        try: probe.set_variation_by_axes([wght] if 'Inter' not in ttf else [14, wght])
        except Exception: pass
        cap400 = probe.getbbox('H', anchor='ls'); cap400 = cap400[3] - cap400[1]
        S = 8  # supersampling
        font = ImageFont.truetype(ttf, round(400 * cap * S / cap400))
        try: font.set_variation_by_axes([wght] if 'Inter' not in ttf else [14, wght])
        except Exception: pass
        out = [(g, w) for g, w in glyphs if g in KEEP]
        cols = 16
        sheet = Image.new('RGBA', (cols * cw, ((len(out) + cols - 1) // cols) * ch), (0, 0, 0, 0))
        for k, (g, adv) in enumerate(out):
            r = bbox(ink(cell(tbl, cw, ch, idx[g])))
            cm = [[0] * cw for _ in range(ch)]
            if g in ('Ⓐ', 'Ⓑ'):
                size = (r[2] - r[0] + 1) if r else cap + 4
                lf = ImageFont.truetype(ttf, int(size * 0.72 * 4))  # the knocked-out letter, bold
                try: lf.set_variation_by_axes([800])
                except Exception: pass
                cm = circled(g == 'Ⓐ' and 'A' or 'B', cw, ch, r[3] if r else base_y, size, lf)
                if r:  # place the disc where Roobert's is
                    b = bbox(cm); dx, dy = r[0] - b[0], r[1] - b[1]
                    cm = [[cm[y - dy][x - dx] if 0 <= y - dy < ch and 0 <= x - dx < cw else 0 for x in range(cw)] for y in range(ch)]
            elif g != ' ' and r:
                big = Image.new('L', (cw * S * 3, ch * S * 3), 0)
                ImageDraw.Draw(big).text((cw * S, (base_y + 1) * S + ch * S), g, font=font, fill=255, anchor='ls')
                bb = big.getbbox()
                if bb:
                    gl = big.crop(bb)
                    tw = (bb[2] - bb[0]) / S; th = (bb[3] - bb[1]) / S
                    rw = r[2] - r[0] + 1
                    if mono or tw > rw + 1: tw = min(tw, rw + (0 if mono else 1))  # squeeze to Roobert's ink width
                    gw, gh = max(1, round(tw)), max(1, round(th))
                    small = gl.resize((gw, gh), Image.BOX)
                    top = round(bb[1] / S - ch) - 1  # ink top relative to the cell (baseline at base_y)
                    left = round((r[0] + r[2] + 1) / 2 - gw / 2)
                    for y in range(gh):
                        for x in range(gw):
                            X, Y = left + x, top + y
                            if 0 <= X < cw and 0 <= Y < ch and small.getpixel((x, y)) > 110: cm[Y][X] = 1
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
        print(name, len(out), 'glyphs', f'{cw}x{ch}', 'cap', cap, 'baseline', base_y)


if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2], sys.argv[3])
