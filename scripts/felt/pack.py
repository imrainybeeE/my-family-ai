# Crops rendered felt pieces to a shared square per group (so pieces in a group keep the same
# scale relative to each other) and writes WebP files for the app.
# Usage: python3 scripts/felt/pack.py <render_dir> <out_dir>
import subprocess, sys, os

src, out = sys.argv[1], sys.argv[2]
GROUPS = {
    'flowers': ['dandelion', 'poppy', 'daisy', 'sunflower', 'lavender', 'iris', 'bud'],
    'eat': ['eat'],
    'do': ['do'],
    'watch': ['watch'],
    'travel': ['travel'],
    'yarnball': ['yarnball'],
    'coins': ['coin-heads', 'coin-tails'],
}
SIZE = 512
# Fades alpha to zero in a thin band at each edge, so a long soft shadow never shows a
# square, while the object itself (inside the band) is untouched.
MASK = os.path.join(out, '.mask.png')
subprocess.run(['magick', '-size', f'{SIZE}x{SIZE}', 'xc:', '-fx', 'ee=min(min(i,w-1-i),min(j,h-1-j))/(w*0.07); ee>1?1:ee', MASK], check=True)
# Single objects fill this share of their square, so plan objects line up at one footprint.
FOOTPRINT = 0.8


def bbox(path, threshold='18%'):
    r = subprocess.run(['magick', path, '-alpha', 'extract', '-threshold', threshold, '-format', '%@', 'info:'], capture_output=True, text=True).stdout
    wh, x, y = r.split('+')
    w, h = wh.split('x')
    return int(x), int(y), int(x) + int(w), int(y) + int(h)


for group, names in GROUPS.items():
    # A single object is framed by its solid body, not its soft shadow.
    boxes = [bbox(os.path.join(src, f'{n}.png'), '60%' if len(names) == 1 else '18%') for n in names]
    full = int(subprocess.run(['magick', 'identify', '-format', '%w', os.path.join(src, f'{names[0]}.png')], capture_output=True, text=True).stdout)
    c = full / 2
    # Half-size of a square centred on the frame that holds every piece in the group.
    half = max(max(abs(b[0] - c), abs(b[2] - c), abs(b[1] - c), abs(b[3] - c)) for b in boxes) + 6
    if len(names) == 1:
        half = (half - 6) / FOOTPRINT
    half = min(half, c)
    crop = f'{int(2 * half)}x{int(2 * half)}+{int(c - half)}+{int(c - half)}'
    for n in names:
        dest = os.path.join(out, f'{n}.webp')
        subprocess.run(['magick', os.path.join(src, f'{n}.png'), '-crop', crop, '+repage', '-channel', 'A', '-level', '3%,100%', '+channel', '-resize', f'{SIZE}x{SIZE}', '-quality', '86', '-define', 'webp:alpha-quality=88', '(', '+clone', '-alpha', 'extract', MASK, '-compose', 'multiply', '-composite', ')', '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', '-define', 'webp:method=6', dest], check=True)
    print(group, crop)
os.remove(MASK)
