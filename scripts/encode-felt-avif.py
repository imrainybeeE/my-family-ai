"""Optional AVIF alternatives; requires Pillow with AVIF support. Originals stay intact."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'public' / 'felt'
for size in (256, 384, 512):
    out = root / 'avif' / str(size)
    out.mkdir(parents=True, exist_ok=True)
    for source in root.glob('*.webp'):
        image = Image.open(source)
        if size != 512:
            image = image.resize((size, size), Image.Resampling.LANCZOS)
        image.save(out / (source.stem + '.avif'), quality=90, subsampling='4:4:4', speed=6)
