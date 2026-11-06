// Captures the main screens of the demo family on an iPhone-sized viewport, in light and dark.
// Usage: node scripts/screenshots.mjs [baseUrl] [outDir]
// Needs the app running (npm run dev) and, for AI content, ANTHROPIC_API_KEY on the server.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const base = process.argv[2] || 'http://localhost:3000';
const out = process.argv[3] || 'screenshots';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const errors = [];
let visit = 0;

async function phone(theme) {
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: theme,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${theme}: ${e.message}`));
  page.on('response', (r) => {
    // Firebase anonymous sign-in is switched off for this project; the app falls back to a device id.
    if (r.status() >= 400 && !r.url().includes('identitytoolkit')) errors.push(`${theme}: ${r.status()} ${r.url()}`);
  });
  return { ctx, page };
}

const shot = async (page, name) => {
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  console.log('saved', name);
};

const idle = (page, timeout = 60000) =>
  page.waitForFunction(() => !document.querySelector('[aria-busy="true"], [role="status"]'), null, { timeout }).catch(() => {});

for (const theme of ['light', 'dark']) {
  const { ctx, page } = await phone(theme);
  // A fresh query string each time forces a full reload, which resets the demo family.
  const open = (hash) => page.goto(`${base}/?demo=1&theme=${theme}&v=${++visit}#${hash}`);
  const scrollTo = (y) => page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);

  await page.goto(`${base}/?theme=${theme}`);
  await page.getByRole('button', { name: 'Start your family' }).waitFor();
  await page.waitForTimeout(1500);
  await shot(page, `${theme}-01-welcome`);

  await open('garden');
  await page.getByText('Tonight at the table').waitFor();
  await idle(page);
  await shot(page, `${theme}-02-garden`);
  await scrollTo(760);
  await shot(page, `${theme}-03-garden-more`);

  await scrollTo(0);
  await page.getByRole('button', { name: /^Maya \(you\)/ }).click();
  await page.getByRole('dialog').getByText('with a touch of').waitFor();
  await shot(page, `${theme}-04-profile`);

  await open('together');
  await page.getByText('You all enjoy').waitFor({ timeout: 60000 });
  await shot(page, `${theme}-05-together`);
  const ideasY = await page.getByRole('heading', { name: 'Ideas to try' }).evaluate((el) => el.getBoundingClientRect().top + window.scrollY - 90);
  await scrollTo(ideasY);
  await shot(page, `${theme}-06-together-ideas`);

  if (theme === 'light') {
    await open('plan');
    await shot(page, `${theme}-07-plan`);
    await page.getByRole('button', { name: /^Eat/ }).first().click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Get three ideas' }).waitFor({ timeout: 60000 });
    for (const group of await page.locator('main [role="radiogroup"], main [role="group"]').all()) {
      const first = group.locator('button.chip').first();
      if (await first.count()) await first.click();
    }
    await shot(page, `${theme}-08-plan-questions`);
    await page.getByRole('button', { name: 'Get three ideas' }).click();
    await page.getByRole('button', { name: 'Pick for us' }).waitFor({ timeout: 90000 });
    await scrollTo(0);
    await shot(page, `${theme}-09-plan-ideas`);

    // Leo takes the Foundation questions, through to his bloom.
    await open('garden');
    await page.getByRole('button', { name: /Settings and profile/ }).click();
    await page.getByRole('radio', { name: /Leo/ }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Start', exact: true }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Start', exact: true }).click();
    for (let i = 0; i < 18; i++) {
      const dialog = page.getByRole('dialog');
      await dialog.getByText(`Question ${i + 1} of 18`).waitFor();
      await page.waitForTimeout(350);
      const boxes = dialog.getByRole('checkbox');
      if (await boxes.count()) {
        await boxes.nth((i * 2) % 6).click();
        await boxes.nth((i * 2 + 3) % 6).click();
        if (i === 2) await shot(page, `${theme}-10-foundation-question`);
        await dialog.getByRole('button', { name: /Next|See my flower/ }).click();
      } else {
        await dialog.getByRole('radio').nth([1, 1, 0, 1, 0, 1, 1, 5, 1, 1, 0, 1, 1, 5, 1, 1, 1, 1][i]).click();
      }
    }
    await page.getByRole('dialog').getByText('with a touch of').waitFor({ timeout: 15000 });
    await page.getByText('Try this week').waitFor({ timeout: 60000 }).catch(() => {});
    await shot(page, `${theme}-11-bloom-reveal`);

    // Leo carries on into Advanced discovery and gets a reflection from the helper.
    await page.getByRole('button', { name: 'Grow deeper roots' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByRole('dialog').locator('textarea').fill('When someone remembers the little things');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('button', { name: /Next question|Save and continue/ }).waitFor({ timeout: 60000 });
    await shot(page, `${theme}-12-roots-reflection`);
  }

  await open('ask');
  await page.getByText('Good questions to start with').waitFor();
  await idle(page, 30000);
  await shot(page, `${theme}-13-ask`);
  await page.getByRole('button', { name: 'What do we have in common?' }).click();
  await page.getByRole('button', { name: 'New chat' }).waitFor();
  await idle(page);
  await page.waitForTimeout(3000);
  await scrollTo(0);
  await shot(page, `${theme}-14-ask-answer`);

  await ctx.close();
}

await browser.close();
if (errors.length) {
  console.log('\nProblems:\n' + errors.join('\n'));
  process.exitCode = 1;
}
