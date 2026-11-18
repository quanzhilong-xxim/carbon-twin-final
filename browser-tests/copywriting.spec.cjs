const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:3020' || url.pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) return route.abort();
    return route.continue();
  });
});

test('research copy changes on request and remains readable', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:3020/learn', { waitUntil: 'domcontentloaded' });
  const copy = page.locator('.library-literary-copy span');
  const initial = await copy.innerText();
  await page.getByRole('button', { name: '换一句思考' }).click();
  await expect(copy).not.toHaveText(initial);
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.evaluate(() => document.documentElement.clientWidth));
  await page.screenshot({ path: testInfo.outputPath('research-copy.png') });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.evaluate(() => document.documentElement.clientWidth));
  await expect(page.getByRole('button', { name: '换一句思考' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('research-copy-mobile.png') });
});

test('sandbox caption follows the selected time', async ({ page }) => {
  await page.goto('http://127.0.0.1:3020/simulator', { waitUntil: 'domcontentloaded' });
  const caption = page.locator('.behaviour-intro-world figcaption strong');
  await page.locator('.behaviour-weather').getByRole('button', { name: '夕阳' }).click();
  await expect(caption).toContainText('夕阳');
});
