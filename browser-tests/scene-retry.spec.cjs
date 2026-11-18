const { test, expect } = require('@playwright/test');

test('a SceneStage retries one transient GLB 503 without manual input', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'The retry recovery probe runs in Chromium.');
  const modelPath = '/models/research/CT_AcademicPlant_LOD.glb';
  const requests = [];
  const failures = [];
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('response', response => {
    if (new URL(response.url()).pathname === modelPath && response.status() >= 400) {
      failures.push(response.status());
    }
  });
  await page.route(`**${modelPath}`, async route => {
    requests.push(route.request().url());
    if (requests.length === 1) {
      await route.fulfill({ status: 503, contentType: 'text/plain', body: 'injected transient 503' });
    } else {
      await route.continue();
    }
  });

  await page.goto('/learn', { waitUntil: 'domcontentloaded' });
  const stage = page.locator('.library-hero-world .scene-stage');
  await expect(stage).toHaveAttribute('data-load-state', 'rendered', { timeout: 60_000 });

  expect(failures).toEqual([503]);
  expect(requests).toHaveLength(2);
  expect(pageErrors.length).toBeGreaterThan(0);
  expect(pageErrors.every(message => message.includes('responded with 503'))).toBe(true);
});
