/* Exercise a delayed portrait download without calling any external API. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

(async () => {
  const out = path.resolve('outputs/v10-explore/character-loading-' + Date.now());
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const report = { base: process.env.CT_PREVIEW_URL || 'http://127.0.0.1:3047/', checks: [], errors: [], passed: false };
  let release, signalRequest;
  const requestSeen = new Promise(resolve => { signalRequest = resolve; });
  await context.route('**/api/**', route => route.abort());
  await context.route('**/CT_Student_Explore_*-portrait.glb', route => new Promise(resolve => {
    release = () => resolve(route.continue());
    signalRequest();
  }));
  page.on('pageerror', error => report.errors.push(error.message));
  try {
    await page.goto(report.base + '#identities', { waitUntil: 'domcontentloaded', timeout: 90000 });
    const card = page.locator('.identity-unit[data-character="student"]');
    await card.getByRole('button', { name: '选择身份：学生' }).click();
    await card.getByRole('button', { name: '进入角色展厅' }).click();
    const room = page.getByRole('dialog');
    const stage = room.locator('.avatar-stage');
    await stage.locator('canvas[data-asset-quality="standard"]').waitFor({ timeout: 90000 });
    await page.waitForFunction(() => document.querySelector('.character-room .avatar-stage')?.dataset.ready === 'true');
    await room.getByRole('button', { name: '面部', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.character-room .avatar-stage')?.dataset.ready === 'false');
    await stage.locator('.avatar-poster').waitFor({ state: 'visible' });
    await Promise.race([requestSeen, new Promise((_, reject) => setTimeout(() => reject(new Error('portrait request was not made')), 30000).unref())]);
    assert.equal(typeof release, 'function', 'portrait request was intercepted');
    await room.screenshot({ path: path.join(out, 'portrait-loading.png') });
    report.checks.push('poster remains visible while the portrait model is delayed');
    release();
    release = undefined;
    await stage.locator('canvas[data-asset-quality="portrait"]').waitFor({ timeout: 90000 });
    await page.waitForFunction(() => document.querySelector('.character-room .avatar-stage')?.dataset.ready === 'true');
    assert.equal(await stage.locator('.avatar-poster').count(), 0);
    await room.screenshot({ path: path.join(out, 'portrait-ready.png') });
    report.checks.push('poster clears only after the requested portrait model is ready');
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } catch (error) {
    report.failure = String(error);
    process.exitCode = 1;
  } finally {
    if (release) release();
    await context.close();
    await browser.close();
    await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ out, ...report }));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
