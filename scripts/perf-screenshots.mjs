// Deterministic pixel checks: identical phone, fonts, clock, and reduced-motion preference.
// Usage: node scripts/perf-screenshots.mjs [base] [out]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const base = process.argv[2] || 'http://127.0.0.1:4106';
const out = process.argv[3] || '/tmp/family-perf-screenshots';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
 for (const palette of ['ocean', 'forest']) for (const colorScheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-11-13T04:00:00Z') });
  const shot = async (screen) => {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every(i => i.complete));
    await page.waitForTimeout(1800);
    // Pause JS motion at a settled frame, not in the middle of the cover's gentle drift.
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 10000));
    const prefix = path.join(out, `${palette}-${colorScheme}-${screen}`);
    fs.writeFileSync(`${prefix}-art.json`, JSON.stringify(await page.locator('img.felt').evaluateAll(images => images.map(image => { const r = image.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })), null, 2));
    await page.screenshot({ path: `${prefix}.png`, animations: 'disabled' });
    await page.clock.resume();
  };
  await page.goto(`${base}/?theme=${colorScheme}&palette=${palette}`);
  await page.getByRole('button', { name: 'Start your family', exact: true }).waitFor({ timeout: 120000 });
  await shot('welcome');
  await page.goto(`${base}/?demo=1&theme=${colorScheme}&palette=${palette}#garden`);
  await page.getByRole('button', { name: /Settings and profile/ }).waitFor();
  await shot('garden');
  await page.getByRole('button', { name: /Settings and profile/ }).click();
  await page.getByRole('dialog').waitFor();
  await shot('settings');
  await ctx.close();
 }
} finally { await browser.close(); }
