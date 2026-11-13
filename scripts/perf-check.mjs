// Cold static-production loads. Usage: node scripts/perf-check.mjs [base] [output] [runs]
// Build with VITE_STATIC=1. Vite preview negotiates gzip with Chromium; chunk
// gzip/Brotli sizes are also recorded independently of response headers.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync, brotliCompressSync } from 'node:zlib';

const base = process.argv[2] || 'http://127.0.0.1:4106';
const out = process.argv[3] || '/tmp/family-perf';
const runs = Number(process.argv[4] || 3);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const results = [];
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

try {
  for (const [screen, route, ready] of [
    ['welcome', '/', 'Start your family'],
    ['garden', '/?demo=1#garden', 'Settings and profile'],
  ]) {
    for (let run = 1; run <= runs; run++) {
      const ctx = await browser.newContext({
        viewport: { width: 393, height: 852 }, deviceScaleFactor: 2,
        isMobile: true, hasTouch: true, colorScheme: 'light',
      });
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      // 1.6 Mbps down / 750 Kbps up, 150 ms latency, 4x CPU: identical phone
      // profile for both builds. Each run has fresh storage and HTTP caches.
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false, latency: 150,
        downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8,
        connectionType: 'cellular4g',
      });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const requests = new Map();
      cdp.on('Network.requestWillBeSent', (e) => requests.set(e.requestId, { url: e.request.url, type: e.type }));
      cdp.on('Network.loadingFinished', (e) => {
        const req = requests.get(e.requestId);
        if (req) req.bytes = e.encodedDataLength;
      });
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await page.addInitScript(() => {
        window.__lcp = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) window.__lcp = entry.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      });
      await page.goto(`${base}${route}`, { waitUntil: 'load', timeout: 120_000 });
      await page.getByRole('button', { name: ready, exact: screen === 'welcome' }).waitFor({ timeout: 120_000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(3000); // include hero animations, font swaps and initial image requests
      const timings = await page.evaluate(() => ({
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        lcp: window.__lcp,
        load: performance.getEntriesByType('navigation')[0].loadEventEnd,
      }));
      const resources = [...requests.values()].filter((r) => /^https?:/.test(r.url));
      const js = resources.filter((r) => r.type === 'Script');
      let jsGzip = 0;
      for (const req of js) {
        const response = await ctx.request.get(req.url);
        jsGzip += gzipSync(await response.body()).length;
      }
      const result = { screen, run, bytes: resources.reduce((n, r) => n + (r.bytes || 0), 0), requests: resources.length, jsGzip, ...timings, errors, resources };
      results.push(result);
      console.log(JSON.stringify({ ...result, resources: undefined }));
      await ctx.close();
      fs.writeFileSync(path.join(out, 'runs.json'), JSON.stringify(results, null, 2));
    }
  }
  const summary = ['welcome', 'garden'].map((screen) => {
    const rs = results.filter((r) => r.screen === screen);
    return { screen, ...Object.fromEntries(['bytes', 'requests', 'jsGzip', 'fcp', 'lcp', 'load'].map((k) => [k, median(rs.map((r) => r[k]))])) };
  });
  fs.writeFileSync(path.join(out, 'medians.json'), JSON.stringify(summary, null, 2));
  console.log('Medians:', JSON.stringify(summary));
  if (process.env.BUILD_DIR) {
    const dir = path.join(process.env.BUILD_DIR, 'assets');
    const chunks = fs.readdirSync(dir).filter((f) => /\.(js|css)$/.test(f)).map((file) => {
      const b = fs.readFileSync(path.join(dir, file));
      return { file, raw: b.length, gzip: gzipSync(b).length, brotli: brotliCompressSync(b).length };
    });
    fs.writeFileSync(path.join(out, 'chunks.json'), JSON.stringify(chunks, null, 2));
    console.table(chunks);
  }
} finally {
  await browser.close();
}
