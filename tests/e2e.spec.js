// End-to-end tests in a real browser, run against the production build (vite preview).
// They run without Supabase, so sharing uses snapshot links.
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', err => { throw err; });
});

test('home page loads and opens the studio', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Your Thanksgiving/ })).toBeVisible();
  await page.getByRole('button', { name: /Create my table/ }).click();
  await expect(page.getByRole('heading', { name: 'Table studio' })).toBeVisible();
});

test('host decorates, shares, and a guest leaves a card', async ({ page, context }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /Create my table/ }).click();
  await page.getByRole('button', { name: /Build the ultimate feast/ }).click();
  const placed = page.locator('#table-canvas .placed-item');
  expect(await placed.count()).toBeGreaterThan(4);

  await page.getByRole('button', { name: 'Share table' }).first().click();
  await page.locator('#host-name').fill('Test family');
  await page.getByRole('button', { name: /Get my share link/ }).click();
  const link = await page.locator('#share-url').inputValue();
  expect(link).toContain('#table=');

  const guest = await context.newPage();
  await guest.goto(link);
  await expect(guest.getByRole('heading', { name: /Test family/ })).toBeVisible();
  await expect(guest.locator('.placed-item')).toHaveCount(await placed.count());

  await guest.getByRole('button', { name: /Write a thank-you card/ }).click();
  await guest.locator('textarea[name=message]').fill('Thanks for dinner! <img src=x onerror=alert(1)>');
  await guest.locator('input[name=name]').fill('Sam');
  await guest.getByRole('button', { name: /Place card on table/ }).click();
  await expect(guest.locator('.card-sticker')).toHaveCount(1);

  await guest.locator('.card-sticker').click();
  await expect(guest.locator('.card-message')).toHaveText('Thanks for dinner! <img src=x onerror=alert(1)>');
  await expect(guest.locator('.card-message img')).toHaveCount(0);
});

test('locked pieces cannot be added', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /Create my table/ }).click();
  const locked = page.locator('.food-card.locked').first();
  await expect(locked).toBeVisible();
  await locked.click();
  await expect(page.locator('.toast')).toContainText('unlocks after');
  await expect(page.locator('#table-canvas .placed-item')).toHaveCount(0);
});

test('menu, how it works and leaderboard open', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: /How it works/ }).click();
  await expect(page.locator('.unlock-tiers > div')).toHaveCount(4);
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: /Leaderboard/ }).click();
  await expect(page.getByRole('heading', { name: 'Most-loved tables' })).toBeVisible();
});

test('phone layout: no sideways scrolling and food stays on the table', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./');
  await page.getByRole('button', { name: /Create my table/ }).click();
  await page.getByRole('button', { name: /Build the ultimate feast/ }).click();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(375);
  const canvas = await page.locator('#table-canvas').boundingBox();
  expect(Math.round(canvas.width / canvas.height * 10) / 10).toBe(1.5);
  for (const box of await page.locator('#table-canvas .placed-item').evaluateAll(els => els.map(e => e.getBoundingClientRect().toJSON()))) {
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    expect(cx).toBeGreaterThan(canvas.x);
    expect(cx).toBeLessThan(canvas.x + canvas.width);
    expect(cy).toBeGreaterThan(canvas.y);
    expect(cy).toBeLessThan(canvas.y + canvas.height);
  }
});

test('table names read naturally (no "family’s’s")', async ({ page }) => {
  const open = async (hostName) => {
    const payload = Buffer.from(JSON.stringify({ items: [], cards: [], gratitude: '', hostName }), 'utf8').toString('base64');
    await page.goto(`./#table=${payload}`);
    await page.reload();
    return (await page.locator('h1').textContent()).trim();
  };
  expect(await open('Fozhan’s family')).toBe('Fozhan’s family Thanksgiving table');
  expect(await open("Fozhan's family")).toBe("Fozhan's family Thanksgiving table");
  expect(await open('Chris')).toBe('Chris’s Thanksgiving table');
  expect(await open('The Lee family')).toBe('The Lee family’s Thanksgiving table');
});

test('phone: the card form fits and the send button is reachable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const payload = Buffer.from(JSON.stringify({ items: [], cards: [], gratitude: '', hostName: 'Phone family' }), 'utf8').toString('base64');
  await page.goto(`./#table=${payload}`);
  await page.reload();
  await page.getByRole('button', { name: /Write a thank-you card/ }).click();
  const send = page.getByRole('button', { name: /Place card on table/ });
  // Wait for the sheet's slide-up animation so we measure where it finally sits.
  await page.locator('.modal').evaluate(el => Promise.all(el.getAnimations().map(x => x.finished)));
  const box = await send.boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(667);
  const sheet = await page.locator('.modal').boundingBox();
  expect(sheet.x).toBeGreaterThanOrEqual(0);
  expect(sheet.x + sheet.width).toBeLessThanOrEqual(375);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.locator('textarea[name=message]').fill('From a phone');
  await send.click();
  await expect(page.locator('.card-sticker')).toHaveCount(1);
});

test('animations respect reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.getByRole('button', { name: /Create my table/ }).click();
  await page.getByRole('button', { name: /Build the ultimate feast/ }).click();
  await expect(page.locator('.burst')).toHaveCount(0);
  const anim = await page.locator('#table-canvas .placed-item.pop-in').first().evaluate(el => getComputedStyle(el).animationName);
  expect(anim).toBe('none');
});

test('animations play normally', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /Create my table/ }).click();
  await page.getByRole('button', { name: /Build the ultimate feast/ }).click();
  await expect(page.locator('.burst span').first()).toBeAttached();
  await expect(page.locator('#table-canvas .placed-item.fx-steam').first()).toBeAttached();
});

test('share sheet: quick buttons, message templates and a make-your-own line', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /Create my table/ }).click();
  await page.getByRole('button', { name: 'Share table' }).first().click();
  await page.locator('#host-name').fill('Lee family');
  await page.getByRole('button', { name: /Get my share link/ }).click();
  const msg = page.locator('#share-msg');
  await expect(msg).toContainText('Lee family');
  await expect(msg).toContainText('Make one here');
  await page.getByRole('button', { name: 'Coworkers' }).click();
  await expect(page.locator('#share-msg')).toContainText('make your own');
  const wa = await page.locator('[data-quick=whatsapp]').getAttribute('href');
  expect(wa).toMatch(/^https:\/\/wa\.me\/\?text=/);
  expect(decodeURIComponent(wa)).toContain('#table=');
  await expect(page.locator('[data-quick=email]')).toHaveAttribute('href', /^mailto:/);
  await expect(page.locator('[data-story]')).toBeVisible();
});

test('table settings: rename the table from the studio and the menu', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /Create my table/ }).click();
  await page.locator('.settings-link').click();
  await page.locator('#settings-name').fill('Rivera family');
  await page.locator('[data-save-settings]').click();
  await expect(page.locator('.workspace-top h3')).toContainText('Rivera family’s Thanksgiving table');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.locator('.menu-list [data-menu=settings]').click();
  await expect(page.locator('#settings-name')).toHaveValue('Rivera family');
});
