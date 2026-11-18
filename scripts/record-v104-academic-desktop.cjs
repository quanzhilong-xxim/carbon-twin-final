/* Dedicated desktop recording: no viewport resizing, fixture APIs or page CSS changes. */
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
(async () => {
  const out = path.resolve('outputs/academic-archive/desktop-video-' + Date.now()); await fs.mkdir(out, { recursive: true });
  const base = 'http://127.0.0.1:3044/';
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 }, recordVideo: { dir: out, size: { width: 1440, height: 960 } } });
  const page = await ctx.newPage(); page.setDefaultTimeout(20000);
  const result = { at: new Date().toISOString(), base, out, browser: browser.version(), viewport: '1440x960 throughout', checks: [], errors: [], http: [], api: [], passed: false };
  const timer = setTimeout(() => browser.close().catch(() => {}), 150000);
  await ctx.route('**/api/**', r => { result.api.push(new URL(r.request().url()).pathname); return r.abort(); });
  page.on('pageerror', e => result.errors.push(String(e)));
  page.on('response', r => { if (r.status() >= 400) result.http.push({ status: r.status(), url: r.url().replace(/\?.*$/, '') }); });
  async function travel(selector) {
    const top = await page.locator(selector).evaluate(e => e.getBoundingClientRect().top + scrollY - 140);
    await page.evaluate(y => scrollTo({ top: y, behavior: 'smooth' }), top); await page.waitForTimeout(1400);
  }
  try {
    await page.goto(base + 'learn', { waitUntil: 'domcontentloaded' }); await page.bringToFront();
    await page.waitForFunction(() => document.querySelector('.library-hero-world canvas')?.dataset.libraryReady === 'true');
    await page.waitForTimeout(2400); await page.screenshot({ path: path.join(out, 'library.png') });
    await page.getByRole('button', { name: '寻找第一条证据', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible(); await page.waitForTimeout(2200); await page.keyboard.press('Escape');
    result.checks.push('actual library and book extraction to IPCC dialog');
    await travel('#scope-boundaries');
    for (let i = 0; i < 3; i++) { await page.locator('.scope-flip').nth(i).click(); await expect(page.locator('.scope-stage')).toHaveAttribute('data-active', 'scope-' + (i + 1)); await page.waitForTimeout(1700); }
    await page.screenshot({ path: path.join(out, 'scope.png') }); result.checks.push('three Scope boundaries with actual selection');
    await travel('.research-register-v7');
    const search = page.getByLabel('检索学术档案', { exact: true });
    await search.click(); await search.pressSequentially('Scope', { delay: 140 }); await page.waitForTimeout(1500);
    assert(await page.locator('.archive-grid .archive-entry').count() > 0); await search.press('Escape');
    const card = page.locator('.archive-grid article').first(); await card.locator('.research-save-v7').click();
    await expect(card.locator('.research-save-v7')).toHaveAttribute('aria-pressed', 'true');
    await card.locator('.citation-badge').click(); await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForTimeout(1800); await page.keyboard.press('Escape'); result.checks.push('search, bookmark, evidence dialog and Escape');
    await travel('.garment-lifecycle'); const garment = page.locator('.garment-lifecycle');
    await page.waitForFunction(() => document.querySelector('canvas[data-garment-angle]'));
    for (const [i, name] of ['正面', '侧面', '背面'].entries()) { await garment.getByRole('button', { name, exact: true }).click(); await page.waitForFunction(i => document.querySelector('canvas[data-garment-angle]')?.dataset.garmentAngle === String(i), i); await page.waitForTimeout(1400); }
    for (let i = 0; i < 9; i++) {
      await garment.locator('.lifecycle-path button').nth(i).click();
      if (i === 0) {
        // Existing learning flow invites a quiz after reading + model exploration.
        // Exercise that real invitation, rather than click through its modal.
        const quiz = page.getByRole('dialog', { name: 'A boundary, understood.', exact: true });
        await expect(quiz).toBeVisible();
        await quiz.getByRole('button', { name: 'B / Scope 2：购入能源', exact: true }).click();
        await quiz.getByRole('button', { name: '提交答案并保留记录', exact: true }).click();
        await expect(quiz.getByRole('status')).toContainText('回答正确，记录已保存');
        await page.waitForTimeout(1400); await quiz.getByRole('button', { name: '关闭随堂测验', exact: true }).click();
        await expect(quiz).toHaveCount(0); result.checks.push('existing automatic quiz invitation, genuine correct answer saved, modal closes');
      }
      await page.waitForTimeout(750);
    }
    await garment.getByRole('button', { name: '展开材料分层', exact: true }).click();
    for (const name of ['棉', '聚酯', '羊毛', '牛仔斜纹']) { await garment.getByRole('button', { name, exact: true }).click(); await page.waitForTimeout(1300); }
    await garment.getByRole('button', { name: '放大织纹', exact: true }).click(); await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(out, 'fabric.png') }); result.checks.push('garment three views, nine lifecycle stages, four materials and yarn closeup');
    await page.mouse.wheel(0, 800); await page.waitForTimeout(2200);
    assert.deepEqual(result.errors, []); assert.deepEqual(result.http, []); assert.deepEqual(result.api, []); result.passed = true;
  } catch (e) { result.failure = String(e); process.exitCode = 1; await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); }
  finally { clearTimeout(timer); await ctx.close(); result.video = await page.video()?.path(); await browser.close(); await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
