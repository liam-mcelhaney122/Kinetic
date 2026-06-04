import { chromium, devices } from 'playwright';

const url = 'http://localhost:5173/';
const exerciseName = process.argv[2] ?? 'Deadlift';

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 14 Pro'] });
const page = await context.newPage();

page.on('console', (msg) => console.log(`[browser:${msg.type()}]`, msg.text()));
page.on('pageerror', (err) => console.log('[pageerror]', err.message));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

// Tap Metrics tab in bottom nav
await page.locator('button:has-text("Metrics")').click();
await page.waitForTimeout(600);

// Tap dropdown chip → sheet opens
await page.locator('button:has-text("Exercise")').first().click();
await page.waitForTimeout(400);

// Pick the requested exercise
await page.locator(`button:has-text("${exerciseName}")`).first().click();
await page.waitForTimeout(1200);

await page.screenshot({ path: '/tmp/kinetic-metrics.png', fullPage: false });

// Scroll down to reveal stat grid
await page.evaluate(() => window.scrollBy(0, 400));
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/kinetic-metrics-scrolled.png', fullPage: false });

console.log('wrote /tmp/kinetic-metrics.png + /tmp/kinetic-metrics-scrolled.png');

await browser.close();
