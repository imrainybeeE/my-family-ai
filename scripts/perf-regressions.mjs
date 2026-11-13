// Production boot and split-chunk checks with Firebase reads mocked; no real data is written.
// Usage: node scripts/perf-regressions.mjs [static-preview-base]
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base = process.argv[2] || 'http://127.0.0.1:4107';
const config = JSON.parse(fs.readFileSync(new URL('../firebase-applet-config.json', import.meta.url)));
const database = `projects/${config.projectId}/databases/${config.firestoreDatabaseId}`;
const code = 'AX-PER-2026';
const household = { code, name: 'Restored family', createdBy: 'saved-user', createdAt: '2026-11-01T10:00:00Z', memberCount: 2 };
const members = [
 { id: 'first', role: 'Me', nickname: 'First', avatarColor: '#3f8fc0' },
 { id: 'saved', role: 'Dad', nickname: 'Saved Dad', avatarColor: '#c99400' },
];
const field = value => typeof value === 'number' ? { integerValue: String(value) } : { stringValue: value };
const document = (name, data) => ({ name: `${database}/documents/${name}`, fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, field(v)])), createTime: '2026-11-01T10:00:00Z', updateTime: '2026-11-01T10:00:00Z' });
const browser = await chromium.launch();
let passed = 0;
async function check(name, seed, demo = false, expectedFamily = false) {
 const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
 const errors = [];
 const firebaseRequests = [];
 await ctx.addInitScript(seed);
 await ctx.route('https://identitytoolkit.googleapis.com/**', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { message: 'ADMIN_ONLY_OPERATION' } }) }));
 await ctx.route('https://firestore.googleapis.com/**', async route => {
  const url = route.request().url();
  firebaseRequests.push(url);
  if (url.includes('/Listen/')) return route.abort(); // listeners use the full SDK after restoration
  assert.ok(url.includes(database), `Wrong Firestore database: ${url}`);
  let body;
  if (url.includes(':batchGet')) {
   const target = route.request().postDataJSON().documents[0].split('/documents/')[1];
   const data = target.startsWith('userSessions/') ? { householdCode: code, memberId: 'saved' } : household;
   body = [{ found: document(target, data), readTime: '2026-11-13T04:00:00Z' }];
  } else if (url.includes(':runQuery')) {
   body = members.map(m => ({ document: document(`households/${code}/members/${m.id}`, m) }));
  } else throw new Error(`Unexpected Firebase request: ${url}`);
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
 });
 const page = await ctx.newPage();
 page.on('pageerror', e => errors.push(e.message));
 const scripts = [];
 page.on('request', r => { if (r.resourceType() === 'script') scripts.push(r.url()); });
 try {
  await page.goto(`${base}/${demo ? '?demo=1#garden' : ''}`);
  if (expectedFamily) {
   await page.getByRole('heading', { name: 'Restored family', exact: true }).waitFor();
   await page.getByRole('button', { name: /Settings and profile/ }).click();
   await page.getByRole('radio', { name: /Saved Dad/ }).waitFor();
   assert.equal(await page.getByRole('radio', { name: /Saved Dad/ }).getAttribute('aria-checked'), 'true');
   assert.ok(firebaseRequests.some(u => u.includes(':batchGet')));
   // A restored family must still load live sync, not leave the app read-only.
   assert.ok(scripts.some(u => /householdService-/.test(u)));
  } else if (demo) {
   await page.getByRole('heading', { name: 'The Tan family', exact: true }).waitFor();
   assert.equal(firebaseRequests.length, 0);
   assert.ok(!scripts.some(u => /firebase-|householdReads-|householdService-/.test(u)));
   assert.ok(!scripts.some(u => /PlanView-|AskView-|SettingsSheet-|FoundationFlow-/.test(u)));
   for (const hash of ['together', 'plan', 'ask', 'garden']) {
    await page.getByRole('tab', { name: hash === 'garden' ? 'Garden' : hash === 'together' ? 'Together' : hash === 'plan' ? 'Plan' : 'Ask', exact: true }).click();
    await page.locator(`main[aria-label="${hash}"]`).waitFor();
    await page.waitForTimeout(250);
   }
  } else {
   await page.getByRole('button', { name: 'Start your family', exact: true }).waitFor();
   assert.equal(firebaseRequests.length, 0);
   assert.ok(!scripts.some(u => /firebase-|householdReads-|householdService-/.test(u)));
   await page.getByRole('button', { name: 'Start your family', exact: true }).click();
   await page.getByRole('dialog').waitFor();
   await page.getByRole('dialog').locator('input').first().fill('Kept draft');
   await page.keyboard.press('Escape');
   await page.getByRole('dialog').waitFor({ state: 'hidden' });
   await page.getByRole('button', { name: 'Start your family', exact: true }).click();
   assert.equal(await page.getByRole('dialog').locator('input').first().inputValue(), 'Kept draft');
  }
  assert.deepEqual(errors, []);
  passed++;
  console.log(`ok   ${name}`);
 } finally { await ctx.close(); }
}
try {
 await check('fresh visitor defers Firebase and preserves onboarding drafts', () => {});
 await check('a theme preference alone does not trigger authentication', () => localStorage.setItem('myfamilyai_theme', 'light'));
 await check('saved local household restores the active member and live sync', () => localStorage.setItem('myfamilyai_last_session', JSON.stringify({ householdCode: 'AX-PER-2026', memberId: 'saved' })), false, true);
 await check('device fallback identity restores its server session', () => localStorage.setItem('my_family_device_uid', 'saved-device'), false, true);
 await check('IndexedDB identity is checked even without localStorage markers', () => { if (!location.protocol.startsWith('http')) return; return new Promise(resolve => { const req = indexedDB.open('existing-auth'); req.onsuccess = () => { req.result.close(); resolve(); }; }); }, false, true);
 await check('demo never loads Firebase or unopened sheets, and every tab opens', () => {}, true);
 console.log(`${passed}/6 production boot checks passed`);
} finally { await browser.close(); }
