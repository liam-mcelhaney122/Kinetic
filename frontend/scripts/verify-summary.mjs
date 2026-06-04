import { chromium, devices } from 'playwright';

const url = 'http://localhost:5173/';
const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 14 Pro'] });
const page = await context.newPage();

page.on('console', (msg) => console.log(`[browser:${msg.type()}]`, msg.text()));
page.on('pageerror', (err) => console.log('[pageerror]', err.message));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

// Tap target workout card (default: first; or pass a name as arg)
const targetName = process.argv[2];
const card = targetName
  ? page.locator('button', { hasText: new RegExp(targetName, 'i') }).first()
  : page.locator('button:has-text("kg")').first();
await card.click().catch(() => {});
await page.waitForTimeout(200);

// Click Start/Resume
const cta = page.locator('button', { hasText: /Start Workout|Resume Workout/ }).first();
await cta.click();
await page.waitForTimeout(800);

// Fill the first three set rows (templates often pre-populate from history)
const weightInputs = page.locator('input[inputmode="decimal"]');
const repsInputs = page.locator('input[inputmode="numeric"]');
const inputCount = Math.min(await weightInputs.count(), 3);
for (let i = 0; i < inputCount; i++) {
  const w = await weightInputs.nth(i).inputValue();
  const r = await repsInputs.nth(i).inputValue();
  if (!w) await weightInputs.nth(i).fill('80');
  if (!r) await repsInputs.nth(i).fill('8');
}
await page.waitForTimeout(300);

// Finish
await page.locator('button', { hasText: 'Finish Workout' }).click();
await page.waitForTimeout(1500);

await page.screenshot({ path: '/tmp/kinetic-summary.png', fullPage: false });
await page.screenshot({ path: '/tmp/kinetic-summary-full.png', fullPage: true });
console.log('wrote /tmp/kinetic-summary.png + /tmp/kinetic-summary-full.png');

await browser.close();
