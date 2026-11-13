// Keep the 512px originals. Smaller high-quality copies serve badges and tiles;
// srcset still selects the originals for large art and higher-density displays.
// Requires cwebp (libwebp). Run after updating the original public/felt/*.webp.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = new URL('../public/felt/', import.meta.url);
for (const size of [256, 384]) {
  const dir = new URL(`${size}/`, root);
  fs.mkdirSync(dir, { recursive: true });
  for (const file of fs.readdirSync(root).filter((file) => file.endsWith('.webp'))) {
    execFileSync('cwebp', ['-quiet', '-resize', `${size}`, `${size}`, '-q', '90', '-m', '6', path.join(root.pathname, file), '-o', path.join(dir.pathname, file)]);
  }
}
