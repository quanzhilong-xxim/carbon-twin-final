/* Capture the live local preview without sending API requests. */
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');

(async () => {
  const base = process.env.CT_PREVIEW_URL || 'http://127.0.0.1:3046/';
  const out = path.resolve('outputs/v10-explore/home-' + Date.now());
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const report = { base, out, errors: [], api: [], status: null, passed: false };
  await context.route('**/api/**', route => { report.api.push(new URL(route.request().url()).pathname); return route.abort(); });
  page.on('pageerror', error => report.errors.push(String(error)));
  try {
    const response = await page.goto(base, { waitUntil: 'domcontentloaded' });
    report.status = response.status();
    await page.getByRole('navigation', { name: '主导航' }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, 'home.png') });
    report.passed = report.status === 200 && report.errors.length === 0 && report.api.length === 0;
    if (!report.passed) process.exitCode = 1;
  } catch (error) {
    report.failure = String(error);
    process.exitCode = 1;
  } finally {
    await browser.close();
    await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
