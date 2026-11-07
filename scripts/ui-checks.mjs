// Regression checks for interaction bugs, with the AI mocked so they're fast and free.
// Usage: node scripts/ui-checks.mjs [baseUrl]   (needs `npm run dev` running)
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://localhost:3000';
const browser = await chromium.launch();
const results = [];

const MOCKS = {
  suggest: { suggestions: ['What could Maya and Dad do outside?'] },
  spark: { question: 'What made you laugh this week?', why: 'A mock question.', members: [] },
  insights: { headline: 'Mock headline.', together: [{ title: 'Mock', detail: 'Mock detail.', members: [] }], differences: [], ideas: [{ title: 'Mock idea', why: 'Why.', tip: 'Tip.', members: [] }], missing: null },
  'plan/ask': { known: ['Mock fact.'], questions: [] },
  bloom: { headline: 'Mock bloom', note: 'Mock note.', tryThis: 'Mock try.' },
  roots: { reflection: 'Mock reflection.', followUp: null },
};

/** Milliseconds to hold back each AI endpoint's reply, so a check can act while it is pending. */
async function newPage(delays = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  await ctx.route('**/api/ai/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/ai/', '');
    const lastQuestion = path === 'suggest' && JSON.parse(route.request().postData() || '{}').lastQuestion;
    if (lastQuestion) {
      // Follow-ups to the first question arrive late, after the second chat has started.
      await new Promise((r) => setTimeout(r, lastQuestion.startsWith('What do we') ? 900 : 100));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ suggestions: [`Follow-up to: ${lastQuestion}`] }) });
    }
    if (path === 'chat') {
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'data: {"t":"Mock answer for Maya."}\n\ndata: {"done":true,"refused":false}\n\n' });
    }
    if (delays[path]) await new Promise((r) => setTimeout(r, delays[path]));
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCKS[path] || {}) }).catch(() => {});
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => results.push(`page error: ${e.message}`));
  return { ctx, page };
}

async function check(name, fn, delays) {
  const { ctx, page } = await newPage(delays);
  try {
    await fn(page);
    console.log(`ok   ${name}`);
  } catch (err) {
    console.log(`FAIL ${name}\n     ${err.message.split('\n')[0]}`);
    results.push(name);
  } finally {
    await ctx.close();
  }
}

const switchTo = async (page, who) => {
  await page.getByRole('button', { name: /Settings and profile/ }).click();
  await page.getByRole('dialog').getByRole('radio', { name: new RegExp(`^${who}`) }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
};

/** The brief's six questions sit under "More questions" on an empty chat. */
const askGuided = async (page, question) => {
  const more = page.getByRole('button', { name: 'More questions' });
  if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click();
  await page.getByRole('button', { name: question }).click();
};

await check('chat stays with the person who had it', async (page) => {
  await page.goto(`${base}/?demo=1#ask`);
  await askGuided(page, 'What do we have in common?');
  await page.getByText('Mock answer for Maya.').waitFor();
  await switchTo(page, 'Mum');
  await page.getByText('Try asking').waitFor();
  assert.equal(await page.getByText('Mock answer for Maya.').count(), 0, 'Mum sees Maya’s chat');
  await switchTo(page, 'Maya');
  await page.getByText('Mock answer for Maya.').waitFor();
});

await check('a follow-up from an old chat never lands after New chat', async (page) => {
  await page.goto(`${base}/?demo=1#ask`);
  await askGuided(page, 'What do we have in common?');
  await page.getByText('Mock answer for Maya.').waitFor();
  await page.getByRole('button', { name: 'New chat' }).click();
  await askGuided(page, 'Where are we different?');
  await page.getByText('Follow-up to: Where are we different?').waitFor();
  await page.waitForTimeout(1200);
  assert.equal(await page.getByText('Follow-up to: What do we have in common?').count(), 0, 'old follow-up appeared in the new chat');
});

await check(
  'leaving a plan while the helper thinks drops its reply',
  async (page) => {
    await page.goto(`${base}/?demo=1#plan`);
    await page.getByRole('button', { name: /^Eat/ }).first().click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Back to all plans' }).click();
    await page.waitForTimeout(1400);
    assert.equal(await page.getByRole('button', { name: 'Get three ideas' }).count(), 0, 'old plan reply reopened the questions');
    await page.getByRole('button', { name: /^Watch/ }).first().waitFor();
  },
  { 'plan/ask': 900 }
);

await check(
  'closing Deeper roots while it saves leaves nothing behind',
  async (page) => {
    await page.goto(`${base}/?demo=1#garden`);
    await page.getByRole('button', { name: 'Continue', exact: true }).first().click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('button', { name: /Keep going|Start/ }).click();
    await sheet.locator('textarea').fill('Being asked about my day');
    await sheet.getByRole('button', { name: 'Save', exact: true }).click();
    await page.keyboard.press('Escape');
    await sheet.waitFor({ state: 'detached' });
    await page.waitForTimeout(1400);
    await page.getByRole('button', { name: 'Continue', exact: true }).first().click();
    await sheet.getByRole('button', { name: /Keep going|Start/ }).waitFor();
    assert.equal(await sheet.getByText('Mock reflection.').count(), 0, 'a stale reflection appeared after reopening');
    await sheet.getByRole('button', { name: /Keep going|Start/ }).click();
    assert.equal(await sheet.getByText('Mock reflection.').count(), 0, 'a stale reflection appeared on the next question');
    assert.notEqual(await sheet.locator('textarea').inputValue(), 'Being asked about my day', 'the last answer leaked into the next question');
  },
  { roots: 900 }
);

await check(
  'closing the quiz before the reveal leaves nothing behind',
  async (page) => {
    await page.goto(`${base}/?demo=1#garden`);
    await switchTo(page, 'Leo');
    await page.getByRole('button', { name: 'Start', exact: true }).first().click();
    const sheet = page.getByRole('dialog');
    await sheet.getByRole('button', { name: 'Start', exact: true }).click();
    for (let i = 0; i < 18; i++) {
      await sheet.getByText(`Question ${i + 1} of 18`).waitFor();
      const multi = (await sheet.getByRole('checkbox').count()) > 0;
      await sheet.getByRole(multi ? 'checkbox' : 'radio').first().click();
      if (multi || i === 17) await sheet.getByRole('button', { name: i === 17 ? 'See my flower' : 'Next', exact: true }).click();
    }
    await page.keyboard.press('Escape');
    await sheet.waitFor({ state: 'detached' });
    await page.waitForTimeout(2200);
    assert.equal(await page.getByRole('dialog').count(), 0, 'the reveal reopened the sheet');
    assert.equal(await page.getByText('Mock note.').count(), 0, 'a stale bloom note appeared');
  },
  { bloom: 900 }
);

await check('sheets keep keyboard focus inside and make the app inert', async (page) => {
  await page.goto(`${base}/?demo=1#garden`);
  const opener = page.getByRole('button', { name: /Settings and profile/ });
  await opener.click();
  await page.getByRole('dialog').waitFor();
  assert.ok(await page.evaluate(() => document.getElementById('root').hasAttribute('inert')), 'background not inert');
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press(i % 7 === 6 ? 'Shift+Tab' : 'Tab');
    const inside = await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')));
    assert.ok(inside, `focus left the sheet after ${i + 1} presses`);
  }
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  assert.ok(!(await page.evaluate(() => document.getElementById('root').hasAttribute('inert'))), 'app still inert');
  assert.ok(await opener.evaluate((el) => el === document.activeElement), 'focus not returned to the opener');
});

await check('arrow keys move between tabs', async (page) => {
  await page.goto(`${base}/?demo=1#garden`);
  await page.getByRole('tab', { name: 'Garden' }).focus();
  await page.keyboard.press('ArrowRight');
  await page.getByRole('tab', { name: 'Together', selected: true }).waitFor();
  assert.ok(page.url().endsWith('#together'));
  await page.keyboard.press('End');
  await page.getByRole('tab', { name: 'Ask', selected: true }).waitFor();
});

await check('Back cancels a pending auto-advance, and the latest pick wins', async (page) => {
  await page.goto(`${base}/?demo=1#garden`);
  await switchTo(page, 'Leo');
  await page.getByRole('button', { name: 'Start', exact: true }).first().click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: 'Start', exact: true }).click();
  await sheet.getByText('Question 1 of 18').waitFor();
  await sheet.getByRole('radio').nth(1).click();
  await sheet.getByRole('button', { name: 'Previous question' }).click();
  await page.waitForTimeout(900);
  await sheet.getByText('18 quick picks').waitFor();
  assert.equal(await sheet.getByText('Question 2 of 18').count(), 0, 'advanced after Back');

  await sheet.getByRole('button', { name: /Continue from question|Start/ }).click();
  await sheet.getByText('Question 1 of 18').waitFor();
  await sheet.getByRole('radio').nth(0).click();
  await sheet.getByRole('radio').nth(3).click();
  await sheet.getByText('Question 2 of 18').waitFor();
  await page.waitForTimeout(500);
  assert.equal(await sheet.getByText('Question 3 of 18').count(), 0, 'advanced twice');
  await sheet.getByRole('button', { name: 'Previous question' }).click();
  await sheet.getByText('Question 1 of 18').waitFor();
  assert.equal(await sheet.getByRole('radio').nth(3).getAttribute('aria-checked'), 'true', 'latest pick was not kept');
});

await check('two people with the same name stay separate', async (page) => {
  await page.goto(`${base}/?demo=1#garden`);
  await page.getByRole('button', { name: /Settings and profile/ }).click();
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Add someone to the family' }).click();
    await page.getByRole('combobox', { name: 'Role' }).selectOption('Grandparent');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: 'Add someone to the family' }).waitFor();
  }
  await page.getByRole('dialog').getByRole('radio', { name: /^Grandparent 2/ }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Plan' }).click();
  await page.getByRole('button', { name: /^Eat/ }).first().click();
  const first = page.getByRole('button', { name: 'Grandparent', exact: true });
  const second = page.getByRole('button', { name: 'Grandparent 2', exact: true });
  await second.click();
  assert.equal(await second.getAttribute('aria-pressed'), 'false');
  assert.equal(await first.getAttribute('aria-pressed'), 'true', 'deselecting one grandparent deselected both');
});

await browser.close();
if (results.length) {
  console.log(`\n${results.length} problem(s)`);
  process.exitCode = 1;
}
