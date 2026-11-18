const { test, expect } = require('@playwright/test');

const baseUrl = 'http://127.0.0.1:3020';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === baseUrl && !url.pathname.startsWith('/api/') && ['GET', 'HEAD'].includes(request.method())) return route.continue();
    return route.abort();
  });
});

test('Explore WebGL milestones, botanical asset, role previews, and mobile width', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

  const canvas = page.locator('.city-formation canvas');
  await expect.poll(() => canvas.getAttribute('data-rendered'), { timeout: 45000 }).toBe('true');
  await expect(canvas).toHaveAttribute('data-city-stage', 'dust');
  const treeAsset = await page.request.head(`${baseUrl}/models/urban-vegetation/UrbanTree_Master.glb`);
  expect(treeAsset.status()).toBe(200);

  await page.locator('.dust-story-steps button').nth(1).click();
  await expect.poll(() => canvas.getAttribute('data-city-stage'), { timeout: 15000 }).toBe('tree');
  await page.locator('.city-formation').screenshot({ path: testInfo.outputPath('explore-tree.png') });

  await page.locator('.dust-story-steps button').nth(3).click();
  await expect.poll(() => canvas.getAttribute('data-city-stage'), { timeout: 15000 }).toBe('street');
  await page.locator('.city-formation').screenshot({ path: testInfo.outputPath('explore-street.png') });

  await page.locator('.role-preview-grid').scrollIntoViewIfNeeded();
  await expect(page.locator('.role-preview .avatar-stage canvas')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('explore-roles.png') });
  await page.locator('.role-preview-city').click();
  await expect(page.locator('.identity-unit[data-character="city"] .identity-card')).toHaveClass(/selected/);
  await page.locator('#identities').scrollIntoViewIfNeeded();
  await expect(page.locator('#identities .identity-card.selected .avatar-stage[data-ready="true"] canvas')).toHaveCount(1, { timeout: 45000 });
  await expect(page.locator('.role-preview .avatar-stage canvas')).toHaveCount(0);
  await expect(page.locator('#identities .avatar-stage canvas')).toHaveCount(1);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});
