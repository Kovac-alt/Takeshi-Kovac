// End-to-end smoke test: drives the built page through the main flows in a real browser.
// Usage: node tests/e2e/run.mjs   (after `node build.mjs`)
import { createRequire } from 'node:module';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

// Playwright is resolved the CommonJS way so a globally installed copy is found.
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'tests/e2e/artifacts');
await mkdir(out, { recursive: true });
const url = 'file://' + path.join(root, 'dist/index.html');

const browser = await chromium.launch();
const errors = [];
async function open(opts, scheme) {
  const ctx = await browser.newContext({ ...opts, colorScheme: scheme });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  return page;
}
const shot = (page, name) => page.screenshot({ path: path.join(out, name + '.png'), fullPage: false });
const noOverflow = async (page, where) => {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(over <= 0, `${where}: page scrolls sideways by ${over}px`);
};

const page = await open(devices['iPhone 13'], 'light');

// Onboarding
await page.getByRole('heading', { name: /Set your goal/ }).waitFor();
await shot(page, '01-onboarding');
await noOverflow(page, 'onboarding');
await page.getByRole('radio', { name: /^Lose fat/ }).click();
await page.getByRole('radio', { name: /^Build muscle/ }).click();
await page.locator('#g-weight').fill('82');
await page.getByRole('button', { name: 'Build my plan' }).click();

// Today
await page.getByRole('heading', { name: 'Today', exact: true }).waitFor();
await shot(page, '02-today');
await noOverflow(page, 'today');
assert.ok(await page.locator('.today-meals li').count() >= 3, 'meals planned for today');

// Train and a workout
await page.getByRole('button', { name: 'Train' }).click();
await page.locator('.day-card').first().waitFor();
await shot(page, '03-train');
await noOverflow(page, 'train');
await page.locator('.day-card').first().getByRole('button', { name: /^Start/ }).click();
await page.locator('.entry').first().waitFor();
const first = page.locator('.entry').first();
await first.locator('input[id$="-w"]').first().fill('60');
await first.locator('input[id$="-r"]').first().fill('8');
await first.locator('.tick').first().click();
await page.locator('.restbar').waitFor();
await shot(page, '04-workout');
await noOverflow(page, 'workout');
await first.locator('.tick').nth(1).click();
await page.getByRole('button', { name: 'Finish', exact: true }).click();
await page.getByRole('button', { name: 'Finish workout' }).click();
await page.getByRole('heading', { name: 'Workout done' }).waitFor();
await shot(page, '05-summary');
await page.getByRole('button', { name: 'Done', exact: true }).click();
await page.getByText('Trained today').waitFor();

// Food
await page.getByRole('button', { name: 'Food', exact: true }).click();
await page.getByRole('button', { name: 'Add to Breakfast' }).click();
await page.locator('#add-search').fill('oats');
await page.getByRole('button', { name: /Rolled oats/ }).click();
await page.locator('#amt-grams').fill('80');
await page.getByRole('button', { name: 'Add to log' }).click();
await page.locator('.food-list li').first().waitFor();
assert.match(await page.locator('.fuel-line').first().innerText(), /303/);
await page.getByRole('button', { name: 'Add to Lunch' }).click();
await page.getByRole('radio', { name: 'Quick add' }).click();
await page.locator('#quick-kcal').fill('650');
await page.locator('#quick-protein').fill('40');
await page.getByRole('button', { name: 'Add to log' }).click();
await shot(page, '06-food');
await noOverflow(page, 'food');

// Meals
await page.getByRole('button', { name: 'Meals', exact: true }).click();
await page.locator('.slot').first().waitFor();
await shot(page, '07-meals');
await noOverflow(page, 'meals');
await page.locator('.slot').first().getByRole('button', { name: 'Swap' }).click();
await page.locator('.pick-list button').first().click();
await page.locator('.slot').first().getByRole('button', { name: 'Log', exact: true }).click();
await page.locator('.slot.logged').waitFor();
await page.locator('.slot-main').nth(1).click();
await page.getByRole('heading', { name: 'Method' }).waitFor();
await shot(page, '08-recipe');
await page.getByRole('button', { name: 'Close' }).click();
await page.getByRole('radio', { name: 'Recipes' }).click();
await page.locator('.recipe').first().waitFor();
await shot(page, '09-recipes');
await noOverflow(page, 'recipes');
await page.getByRole('radio', { name: 'Shopping' }).click();
await page.locator('.shop').first().waitFor();
await shot(page, '10-shopping');
await noOverflow(page, 'shopping');

// Seed three weeks of history so the charts have something to draw, then reload.
await page.evaluate(() => {
  const P = 'liftledger:v1:';
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const body = JSON.parse(localStorage.getItem(P + 'body'));
  const sess = {};
  const food = {};
  for (let i = 24; i >= 1; i--) {
    const d = new Date(Date.now() - i * 864e5);
    body.v.push({ date: key(d), kg: 80.5 + (24 - i) * 0.06 + Math.sin(i) * 0.3 });
    const bucket = 'food-' + key(d).slice(0, 7);
    food[bucket] = food[bucket] || JSON.parse(localStorage.getItem(P + bucket) || '{"items":{}}');
    food[bucket].items[key(d)] = { id: key(d), note: '', updatedAt: 1, items: [{ id: 'x' + i, name: 'Day', meal: 'lunch', kcal: 2500 + Math.round(Math.cos(i) * 300), protein: 150, carbs: 300, fat: 70, amount: '', at: 1 }] };
    if (i % 2 === 0) {
      const b = 'sess-' + key(d).slice(0, 7);
      sess[b] = sess[b] || JSON.parse(localStorage.getItem(P + b) || '{"items":{}}');
      const id = 'seed' + i;
      const set = (w, r) => ({ id: id + w + r + Math.random(), type: 'work', weight: w, reps: r, done: true });
      sess[b].items[id] = { id, name: 'Upper A', status: 'done', unit: 'kg', startedAt: d.getTime(), finishedAt: d.getTime() + 36e5, updatedAt: 1, entries: [
        { id: id + 'a', exerciseId: 'barbell-bench-press', sets: [set(70 + (24 - i), 8), set(70 + (24 - i), 7), set(70 + (24 - i), 6)] },
        { id: id + 'b', exerciseId: 'barbell-row', sets: [set(60 + (24 - i) / 2, 10), set(60 + (24 - i) / 2, 9)] },
        { id: id + 'c', exerciseId: 'back-squat', sets: [set(90 + (24 - i), 6), set(90 + (24 - i), 6)] },
      ] };
    }
  }
  body.v.sort((a, b) => (a.date < b.date ? -1 : 1));
  localStorage.setItem(P + 'body', JSON.stringify(body));
  for (const [k, v] of Object.entries({ ...sess, ...food })) localStorage.setItem(P + k, JSON.stringify({ updatedAt: 1, ...v }));
});
await page.reload();
await page.getByRole('button', { name: 'Progress' }).click();
await page.getByRole('heading', { name: 'Bodyweight' }).waitFor();
await page.waitForTimeout(300);
await noOverflow(page, 'progress');
await page.screenshot({ path: path.join(out, '11-progress.png'), fullPage: true });

// Goals sheet
await page.getByRole('button', { name: 'Today', exact: true }).click();
await page.getByRole('button', { name: 'Goals and settings' }).click();
await page.getByRole('radio', { name: /^Lose fat/ }).click();
await shot(page, '12-goals');
await page.getByRole('button', { name: 'Save goals' }).click();
await page.getByRole('heading', { name: 'Today', exact: true }).waitFor();
await page.screenshot({ path: path.join(out, '13-today-full.png'), fullPage: true });

// Desktop, dark
const state = await page.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))));
const desk = await open({ viewport: { width: 1280, height: 900 } }, 'dark');
await desk.evaluate((s) => { for (const [k, v] of Object.entries(JSON.parse(s))) localStorage.setItem(k, v); }, state);
await desk.reload();
await desk.getByRole('heading', { name: 'Today', exact: true }).waitFor();
await shot(desk, '14-desktop-dark-today');
await desk.getByRole('button', { name: 'Progress' }).click();
await desk.waitForTimeout(300);
await desk.screenshot({ path: path.join(out, '15-desktop-dark-progress.png'), fullPage: true });
await desk.getByRole('button', { name: 'Train' }).click();
await desk.locator('.day-card').first().getByRole('button', { name: /^Start/ }).click();
await desk.locator('.entry').first().waitFor();
await shot(desk, '16-desktop-dark-workout');

await browser.close();
assert.deepEqual(errors, [], 'no console or page errors');
console.log('e2e passed; screenshots in tests/e2e/artifacts');
