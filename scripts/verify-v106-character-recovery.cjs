const { chromium, firefox, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

(async () => {
  const out = path.resolve(process.env.CT_EVIDENCE_DIR || 'outputs/v10-explore/character-recovery-' + Date.now());
  await fs.mkdir(out, { recursive: true });
  const browserName = process.env.CT_BROWSER || 'chromium';
  const browserType = { chromium, firefox, webkit }[browserName];
  if (!browserType) throw new Error(`Unsupported browser: ${browserName}`);
  const browser = await browserType.launch(browserName === 'chromium' ? { channel: 'chrome', headless: true } : { headless: true });
  const mobile = process.env.CT_MOBILE === '1';
  const viewport=mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const context = await browser.newContext({ viewport, recordVideo:{dir:out,size:viewport} });
  const page = await context.newPage();
  const report = { base: (process.env.CT_PREVIEW_URL || 'http://127.0.0.1:3066').replace(/\/+$/,'')+'/', browser: browserName, mobile, checks: [], passed: false };
  let attempts = 0;
  await context.route('**/api/**', route => route.abort());
  await context.route('**/CT_Student_Explore_*-portrait.glb', route => {
    attempts++;
    return attempts === 1 ? route.abort('failed') : route.continue();
  });
  try {
    await page.goto(report.base + '#identities', { waitUntil: 'domcontentloaded', timeout: 90000 });
    const card = page.locator('.identity-unit[data-character="student"]');
    await card.getByRole('button', { name: '选择身份：学生' }).click();
    await card.getByRole('button', { name: '进入角色展厅' }).click();
    const room = page.getByRole('dialog');
    const stage = room.locator('.avatar-stage');
    await stage.locator(`canvas[data-asset-quality="${mobile ? 'lite' : 'standard'}"]`).waitFor({ timeout: 90000 });
    const retry = room.getByRole('button', { name: '重试三维' });
    if (!mobile) {
      await room.getByRole('button', { name: '面部', exact: true }).click();
      await retry.waitFor({ state: 'visible', timeout: 90000 });
      await stage.locator('.avatar-poster').waitFor({ state: 'visible' });
      assert.equal(attempts, 1);
      report.checks.push('failed model download displays a poster and accessible retry');
      await retry.click();
      await page.waitForFunction(() => document.querySelector('.character-room .avatar-stage')?.dataset.ready === 'true', null, { timeout: 90000 });
      assert.equal(attempts, 2);
      assert.equal(await retry.count(), 0);
      report.checks.push('retry makes a new request and renders the model');
    }
    await page.screenshot({path:path.join(out,'before-context-loss.png')});
    await stage.locator('canvas').evaluate(canvas => {
      const ext=canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');
      if(!ext)throw Error('WEBGL_lose_context unavailable');
      ext.loseContext();
    });
    await retry.waitFor({ state: 'visible', timeout: 30000 });
    await stage.locator('.avatar-poster').waitFor({ state: 'visible' });
    await retry.click();
    await page.waitForFunction(() => document.querySelector('.character-room .avatar-stage')?.dataset.ready === 'true', null, { timeout: 90000 });
    await page.screenshot({path:path.join(out,'after-context-retry.png')});
    report.rendering=await stage.locator('canvas').evaluate(c=>({...c.dataset}));
    assert(Number(report.rendering.characterTriangles)>0);
    report.checks.push('actual WEBGL_lose_context then explicit retry renders real triangles');
    report.passed = true;
  } catch (error) {
    report.failure = String(error);
    process.exitCode = 1;
  } finally {
    await context.close();
    report.video=await page.video().path();
    await browser.close();
    await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ out, ...report }));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
