const { chromium, firefox, webkit } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browserName = process.env.CT_BROWSER || 'chromium';
  const browserType = { chromium, firefox, webkit }[browserName];
  if (!browserType) throw new Error(`Unsupported browser: ${browserName}`);
  const browser = await browserType.launch(browserName === 'chromium' ? { channel: 'chrome', headless: true } : { headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.route('**/api/**', route => route.abort());
  const page = await context.newPage();
  try {
    await page.goto((process.env.CT_PREVIEW_URL || 'http://127.0.0.1:3047/') + '#identities', { waitUntil: 'domcontentloaded' });
    const card = page.locator('.identity-unit[data-character="student"]');
    await card.getByRole('button', { name: '选择身份：学生' }).click();
    const cardWave = card.getByRole('button', { name: '挥手', exact: true });
    await cardWave.click({ force: true });
    assert.equal(await cardWave.getAttribute('aria-pressed'), 'true', 'card action starts before pausing');
    await card.getByRole('button', { name: '暂停动作', exact: true }).click({ force: true });
    await page.waitForTimeout(2800);
    assert.equal(await cardWave.getAttribute('aria-pressed'), 'true', 'paused card action must not expire');
    await card.getByRole('button', { name: '继续动作', exact: true }).click();
    await page.waitForTimeout(400);
    assert.equal(await cardWave.getAttribute('aria-pressed'), 'true', 'card action resumes with remaining time');
    await card.getByRole('button', { name: '进入角色展厅' }).click();
    const room = page.getByRole('dialog');
    const canvas = room.locator('canvas');
    await page.waitForFunction(() => document.querySelector('.character-room .avatar-stage')?.dataset.ready === 'true', null, { timeout: 90000 });
    const wave = room.getByRole('button', { name: '挥手', exact: true });
    await wave.click();
    await page.waitForTimeout(600);
    await room.getByRole('button', { name: '暂停动作', exact: true }).click();
    const frame = await canvas.getAttribute('data-character-frame');
    await page.waitForTimeout(3500);
    assert.equal(await wave.getAttribute('aria-pressed'), 'true', 'paused action must not expire');
    assert.equal(await canvas.getAttribute('data-character-frame'), frame, 'the pose must stay paused');
    await room.getByRole('button', { name: '继续动作', exact: true }).click();
    await page.waitForTimeout(500);
    assert.equal(await wave.getAttribute('aria-pressed'), 'true', 'action resumes with remaining time');
    await page.waitForFunction(() => document.querySelector('.character-room .character-actions button')?.getAttribute('aria-pressed') === 'false', null, { timeout: 5000 });
    await wave.click();
    await page.waitForTimeout(1200);
    const nod = room.getByRole('button', { name: '点头', exact: true });
    await nod.click();
    await page.waitForTimeout(2100);
    assert.equal(await nod.getAttribute('aria-pressed'), 'true', 'a new action gets its full duration');
    console.log(`PASS (${browserName}): card and room gestures resume with remaining time; a new gesture gets its full duration`);
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
