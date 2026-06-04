import { chromium, devices } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? '/tmp/kinetic-iphone.png';

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices['iPhone 14 Pro'],
});
const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: out, fullPage: false });
await browser.close();
console.log(`wrote ${out}`);
