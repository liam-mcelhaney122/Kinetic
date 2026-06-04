import { chromium, devices } from 'playwright';

const url = 'http://localhost:5173/';

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['iPhone 14 Pro'] });
const page = await context.newPage();

page.on('console', (msg) => console.log(`[browser:${msg.type()}]`, msg.text()));
page.on('pageerror', (err) => console.log('[pageerror]', err.message));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

// Tap Profile tab in bottom nav
await page.locator('button:has-text("Profile")').click();
await page.waitForTimeout(800);

await page.screenshot({ path: '/tmp/kinetic-profile.png', fullPage: false });
console.log('wrote /tmp/kinetic-profile.png');

// Switch to LBS and save
await page.locator('button:has-text("lbs")').click();
await page.waitForTimeout(200);
await page.screenshot({ path: '/tmp/kinetic-profile-lbs.png', fullPage: false });
console.log('wrote /tmp/kinetic-profile-lbs.png');

// Save
await page.locator('button:has-text("Save Settings")').click();
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/kinetic-profile-saved.png', fullPage: false });
console.log('wrote /tmp/kinetic-profile-saved.png');

// Navigate to Metrics and verify lbs display
await page.locator('button:has-text("Metrics")').click();
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/kinetic-metrics-lbs.png', fullPage: false });
console.log('wrote /tmp/kinetic-metrics-lbs.png');

await browser.close();
