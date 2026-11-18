const { test: base, expect } = require('@playwright/test');
// Safety fixtures replace only network services; actual app/UI/3D assets are unmodified.
const test = base.extend({
  guard: [async ({ context, page }, use, testInfo) => {
    const audit = { cloudAttempts: [], authRequests: [], pageErrors: [], httpErrors: [] };
    const checkTime = '2026-11-03T00:00:00.000Z';
    await context.route('**/api/decart/credits', r => r.fulfill({ json: { credits: null, minimumCredits: null, checkedAt: checkTime, error: 'Offline test fixture: balance unknown' } }));
    await context.route('**/api/decart/quota', r => r.fulfill({ json: { limit: null, active: null, remaining: null, checkedAt: checkTime } }));
    for (const pattern of ['**/api/decart/token', '**/api/decart-token', '**/api/tts', '**/api/chat', '**/*decart.ai/**', '**/*bytedance.com/**']) {
      await context.route(pattern, r => {
        if (r.request().method() === 'GET' && new URL(r.request().url()).pathname === '/api/tts') return r.fulfill({ json: { configured: false } });
        audit.cloudAttempts.push(new URL(r.request().url()).pathname);
        return r.fulfill({ status: 503, json: { error: 'Cloud requests are disabled in this no-spend suite.' } });
      });
    }
    page.on('pageerror', e => audit.pageErrors.push(e.message));
    page.on('request', r => { if (new URL(r.url()).pathname.startsWith('/api/auth/')) audit.authRequests.push(new URL(r.url()).pathname); });
    page.on('response', r => { if (r.status() >= 400) audit.httpErrors.push({ url: r.url(), status: r.status() }); });
    await use(audit);
    await testInfo.attach('network-and-errors', { body: JSON.stringify(audit, null, 2), contentType: 'application/json' });
    expect(audit.cloudAttempts, 'No cloud synthesis, AI chat generation or Decart session attempts').toEqual([]);
    expect(audit.authRequests, 'Local learning records do not request an unimplemented authentication service').toEqual([]);
    expect(audit.pageErrors, 'Uncaught page errors').toEqual([]);
    expect(audit.httpErrors, 'HTTP errors including missing assets').toEqual([]);
  }, { auto: true }],
});
const garments = [
  ['耐克黑色短袖', 'tshirt', '6.43'], ['耐克白色长袖', 'longsleeve', '13.2'], ['阿迪达斯黄色外套', 'jacket', '101'],
  ['阿迪达斯黑色长裤', 'trousers', '25.1'], ['耐克深蓝色短裤', 'shorts', '25.1'], ['米白色羊毛衫', 'sweater', '56.7'], ['浅蓝色牛仔裤', 'jeans', '25.1'],
];
async function workspace(page) {
  const response = await page.goto('/workspace', { waitUntil: 'domcontentloaded' });
  expect(response.status()).toBe(200);
  await expect(page.getByRole('button', { name: '耐克黑色短袖', exact: true })).toBeEnabled();
}
async function noOverflow(page) {
  expect(await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth })))
    .toEqual(expect.objectContaining({ viewport: await page.evaluate(() => innerWidth) }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow').toBe(true);
}
test('workspace: seven garment images and immediate carbon data synchronization', async ({ page }) => {
  await workspace(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Wear a little.');
  await expect(page.locator('.garment-options button')).toHaveCount(7);
  for (const [name, file, carbon] of garments) {
    const button = page.getByRole('button', { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.wardrobe-reference > strong')).toContainText(carbon);
    const image = page.getByAltText(`${name}参考商品图`);
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
    const asset = await page.request.get(`/garments/${file}.png`);
    expect(asset.status()).toBe(200); expect(asset.headers()['content-type']).toContain('image/png');
  }
  await noOverflow(page);
});
test('annual allocation: actual number inputs update the result', async ({ page }) => {
  await workspace(page);
  await page.getByLabel('衣物拥有件数', { exact: true }).fill('2');
  await page.getByLabel('使用寿命 / 年', { exact: true }).fill('3');
  await expect(page.locator('.wardrobe-number strong')).toHaveText('4.29');
  await page.getByLabel('使用寿命 / 年', { exact: true }).fill('6');
  await expect(page.locator('.wardrobe-number strong')).toHaveText('2.14');
});
test('dual video windows: camera/session stay off on load, AI/snapshot disabled and upload stays local', async ({ page }) => {
  await workspace(page);
  for (const selector of ['#ai-tryon-video', '#local-camera-preview']) {
    await expect(page.locator(selector)).toHaveCount(1);
    expect(await page.locator(selector).evaluate(v => v.srcObject === null)).toBe(true);
  }
  await expect(page.getByRole('button', { name: '打开摄像头（不调用 AI）', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: '开始 AI 试衣（消耗额度）', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '上传衣服（暂存本地）', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: /保存快照/ })).toBeDisabled();
  await expect(page.locator('.mirror-meta')).toContainText('CAMERA OFF');
});
test('voice settings: modes/voices toggle without synthesis', async ({ page }) => {
  await workspace(page);
  await page.getByRole('button', { name: '开启穿搭语音', exact: true }).click();
  const voice = page.locator('.wardrobe-voice');
  await voice.getByLabel('语音方式', { exact: true }).selectOption('doubao');
  await voice.getByLabel('豆包音色', { exact: true }).selectOption('zh_female_xiaohe_uranus_bigtts');
  await expect(voice.getByLabel('豆包音色', { exact: true })).toHaveValue('zh_female_xiaohe_uranus_bigtts');
  await voice.getByLabel('语音方式', { exact: true }).selectOption('browser');
  await expect(voice.getByLabel('设备音色', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '关闭穿搭语音', exact: true }).click();
  await expect(voice.locator('.speech-controls')).toHaveCount(0);
});
test('AI chat: open, edit draft, close with Escape; no generation', async ({ page }) => {
  await workspace(page);
  await page.getByRole('button', { name: '打开碳知识 AI 教练', exact: true }).click();
  const panel = page.locator('#ai-chat-panel');
  await expect(panel).toBeVisible();
  await panel.getByLabel('向碳知识教练提问', { exact: true }).fill('请解释碳排放边界');
  await expect(panel.getByRole('button', { name: '发送问题', exact: true })).toBeEnabled();
  await panel.getByLabel('向碳知识教练提问', { exact: true }).press('Escape');
  await expect(panel).toHaveCount(0);
});
test('3D gallery: real WebGL mesh loads, selection/angle/details operate', async ({ page }, info) => {
  await workspace(page);
  const gallery = page.locator('.clothing-gallery');
  await gallery.scrollIntoViewIfNeeded();
  await expect(gallery).toHaveAttribute('data-ready', 'true', { timeout: 45000 });
  await expect(gallery.locator('canvas')).toBeVisible();
  await expect(gallery.locator('.garment-error')).toHaveCount(0);
  const nav = gallery.getByRole('navigation', { name: '选择数字衣物' });
  await expect(nav.getByRole('button')).toHaveCount(6);
  await nav.getByRole('button').nth(1).click();
  await expect(gallery).toHaveAttribute('data-asset', 'sweater');
  await expect(gallery).toHaveAttribute('data-ready', 'true', { timeout: 45000 });
  await expect(page.getByRole('button', { name: '米白色羊毛衫', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await gallery.getByRole('button', { name: '侧面', exact: true }).click();
  await gallery.getByRole('button', { name: '复位', exact: true }).click();
  await gallery.locator('summary').click();
  await expect(gallery.locator('details')).toHaveAttribute('open', '');
  await gallery.screenshot({ path: info.outputPath('gallery.png') });
  await page.getByRole('button', { name: '耐克深蓝色短裤', exact: true }).click();
  await expect(gallery).toHaveAttribute('data-asset', 'shorts');
  await expect(nav.getByRole('button').nth(5)).toHaveAttribute('aria-pressed', 'true');
});
test('navigation and quiz dialog: workspace to real learning route, modal open/close', async ({ page }) => {
  await workspace(page);
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '学术档案', exact: true }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Read the science.');
  await page.getByRole('button', { name: '开始随堂测验 ↗', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: /B \/ Scope 2/ }).click();
  await expect(page.getByRole('button', { name: '提交答案并保留记录', exact: true })).toBeEnabled();
  // Do not submit: preserves existing records even though this is an isolated context.
  await page.getByRole('button', { name: '关闭随堂测验', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('responsive mobile: 390px layout, garment interaction and visible chat input', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await workspace(page);
  await page.getByRole('button', { name: '耐克深蓝色短裤', exact: true }).click();
  await expect(page.locator('.wardrobe-reference > strong')).toContainText('25.1');
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('mobile-workspace.png'), fullPage: true });
  await page.getByRole('button', { name: '打开碳知识 AI 教练', exact: true }).click();
  const input = page.getByLabel('向碳知识教练提问', { exact: true });
  await input.fill('手机兼容性测试');
  await expect(input).toBeVisible();
  const rect = await input.boundingBox();
  expect(rect.x).toBeGreaterThanOrEqual(0); expect(rect.y).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual(391); expect(rect.y + rect.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: info.outputPath('mobile-chat.png') });
  await noOverflow(page);
});
