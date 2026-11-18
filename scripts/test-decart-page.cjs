const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium, expect } = require('@playwright/test');
const base = process.env.DECART_TEST_URL || 'http://localhost:3010';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'] });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
    page.on('pageerror', error => { errors.push(error.message); console.log('PAGE ERROR:', error.message); });
    const response = await page.goto(`${base}/workspace`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    const items = [
      ['Nike 短袖', 'tshirt', '6.43'], ['Nike 长袖', 'longsleeve', '13.2'], ['Adidas 外套', 'jacket', '101'],
      ['Adidas 长裤', 'trousers', '25.1'], ['Nike 短裤', 'shorts', '25.1'], ['羊毛衫', 'sweater', '56.7'], ['牛仔裤', 'jeans', '25.1'],
    ];
    for (const [name, file, carbon] of items) {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.locator('.wardrobe-reference > strong')).toContainText(carbon);
      const image = page.getByAltText(`${name}参考商品图`);
      await expect(image).toBeVisible();
      await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBeTruthy();
      const asset = await page.request.get(`${base}/garments/${file}.png`);
      assert.equal(asset.status(), 200);
      assert.match(asset.headers()['content-type'], /image\/png/);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    fs.mkdirSync('work/decart-tests', { recursive: true });
    await page.screenshot({ path: 'work/decart-tests/desktop.png', fullPage: true });
    console.log('PASS: real page, all seven images and matching carbon data, no desktop overflow');

    // This token is deliberately fake: only permission-failure UI is being tested here.
    await page.route('**/api/decart-token', route => route.fulfill({ json: { apiKey: 'test-only-token' } }));
    await page.addInitScript(() => {
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => { throw new DOMException('Permission denied', 'NotAllowedError'); } });
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    // Confirm hydration through a state update before requesting the camera.
    await expect(page.getByRole('button', { name: 'Nike 长袖', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Nike 长袖', exact: true }).click();
    await expect(async () => {
      await page.getByRole('button', { name: 'Nike 长袖', exact: true }).click();
      await expect(page.locator('.wardrobe-reference > strong')).toContainText('13.2', { timeout: 500 });
    }).toPass({ timeout: 10000 });
    await page.getByRole('button', { name: 'Nike 短袖', exact: true }).click();
    await page.getByRole('button', { name: '开启云端试穿', exact: true }).click();
    await expect(page.locator('.atelier-notice')).toContainText('摄像头权限被拒绝', { timeout: 15000 });
    await expect(page.getByAltText('Nike 短袖参考商品图')).toBeVisible();
    await page.screenshot({ path: 'work/decart-tests/permission-denied.png', fullPage: true });
    console.log('PASS: real page camera rejection displays clear instructions and static product image');

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    mobile.on('pageerror', error => errors.push(error.message));
    await mobile.goto(`${base}/workspace`, { waitUntil: 'domcontentloaded' });
    await expect(mobile.getByRole('button', { name: 'Nike 短袖', exact: true })).toBeEnabled();
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await mobile.screenshot({ path: 'work/decart-tests/mobile.png', fullPage: true });
    console.log('PASS: real page 390px viewport has no horizontal overflow');
    assert.deepEqual(errors, [], 'page must have no uncaught JavaScript errors');

    // Never print the response body: a configured route returns a real short-lived token.
    const token = await mobile.request.post(`${base}/api/decart-token`, { headers: { Origin: base } });
    console.log(`REAL TOKEN ROUTE STATUS: ${token.status()} (body intentionally omitted)`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
