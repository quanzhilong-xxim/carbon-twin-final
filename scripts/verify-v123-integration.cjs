// Serial integration of the saved production build. External API calls are blocked.
const {chromium, expect: baseExpect} = require('@playwright/test');
const assert = require('node:assert/strict'), fs = require('node:fs/promises'), path = require('node:path');
const expect = baseExpect.configure({timeout: 60000});
const base = process.env.CT_PREVIEW_URL || 'http://127.0.0.1:3074';
const out = path.resolve(process.env.CT_EVIDENCE_DIR || 'outputs/v123/integration');
(async () => {
  await fs.mkdir(out, {recursive: true});
  const report = {base, at: new Date().toISOString(), checks: [], errors: [], http: [], externalApisTested: false, passed: false};
  const browser = await chromium.launch({headless: true, channel: 'chrome'});
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
  await context.route('**/api/**', route => route.abort());
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => {if (response.status() >= 400) report.http.push({path: new URL(response.url()).pathname, status: response.status()});});
  const check = (name, evidence = true) => report.checks.push({name, evidence});
  const overflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  try {
    await page.goto(base, {waitUntil: 'domcontentloaded'}); await expect(page.locator('h1').first()).toBeVisible(); await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.city-formation canvas')).toHaveAttribute('data-city-prepared', 'true');
    await page.getByRole('button', {name: '跳过到街区', exact: true}).click();
    await expect(page.locator('.city-formation canvas')).toHaveAttribute('data-architecture-version', 'coastal-v10');
    await expect(page.locator('.city-formation canvas')).toHaveAttribute('data-city-progress', '1.000');
    await expect(page.locator('.city-status')).toHaveText('LIVE 3D');
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({width, height: width === 390 ? 844 : 1000}); await page.waitForTimeout(500); await overflow();
      await page.screenshot({path: path.join(out, `home-${width}.png`)});
    }
    check('home-1440-768-390-without-overflow');
    const business = page.locator('.identity-unit[data-character="business"]');
    await business.scrollIntoViewIfNeeded(); await business.locator('.identity-card').click();
    await expect(business.locator('.identity-card')).toHaveAttribute('aria-pressed', 'true');
    await expect(business.locator('canvas')).toHaveAttribute('data-avatar-identity', 'business');
    await page.screenshot({path: path.join(out, 'identity-business-mobile.png')});
    await page.reload({waitUntil: 'domcontentloaded'}); await business.scrollIntoViewIfNeeded();
    await expect(business.locator('.identity-card')).toHaveAttribute('aria-pressed', 'true');
    check('identity-selection-and-real-canvas-survive-reload');
    await page.goto(base + '/search?q=' + encodeURIComponent('咖啡'), {waitUntil: 'domcontentloaded'});
    await expect(page.locator('#site-search')).toHaveValue('咖啡'); await expect(page.locator('.site-search-result').first()).toBeVisible();
    await page.reload({waitUntil: 'domcontentloaded'}); await expect(page.locator('#site-search')).toHaveValue('咖啡');
    await overflow(); await page.screenshot({path: path.join(out, 'search-mobile.png')}); check('local-search-query-restored-from-url');
    await page.setViewportSize({width: 1440, height: 1000});
    await page.goto(base + '/simulator#digital-room', {waitUntil: 'domcontentloaded'});
    const city = page.locator('#digital-room'), stage = city.locator('.twin-stage-wrap'), viewport = city.locator('.twin-canvas'), nav = city.locator('.twin-director');
    await stage.scrollIntoViewIfNeeded(); await expect(viewport).toHaveAttribute('data-experience', 'orbit');
    await expect(city.locator('canvas')).toHaveAttribute('data-district-revision', 'v123-waterfront');
    for (const [label, space] of [['01 聚焦示范大楼','home'], ['02 写字楼','office'], ['03 咖啡厅','cafe']]) {
      await nav.getByRole('button', {name: label, exact: true}).click(); await expect(viewport).toHaveAttribute('data-experience', 'focused');
      await nav.getByRole('button', {name: '02 进入室内 ↗', exact: true}).click();
      await expect(viewport).toHaveAttribute('data-experience', 'room'); await expect(viewport).toHaveAttribute('data-room-ready', 'true'); await expect(viewport).toHaveAttribute('data-space', space);
      assert.equal(await city.locator('canvas').evaluate(canvas => canvas.getContext('webgl2').isContextLost()), false);
      await stage.screenshot({path: path.join(out, `interior-${space}.png`)});
      await nav.getByRole('button', {name: '返回城市', exact: true}).click(); await expect(viewport).toHaveAttribute('data-experience', 'orbit');
      check('enter-and-return-' + space);
    }
    await page.goto(base + '/citylight', {waitUntil: 'domcontentloaded'});
    const tower = page.locator('.citylight-viewport'); await expect(tower).toHaveAttribute('data-ready', 'true');
    await page.getByRole('button', {name: '夜景', exact: true}).click(); await expect(tower).toHaveAttribute('data-world-time', '1.000');
    await tower.screenshot({path: path.join(out, 'citylight-night.png')});
    await page.getByRole('button', {name: '暂停三维渲染', exact: true}).click(); await expect(page.getByRole('heading', {name:'三维视图已暂停'})).toBeVisible();
    await page.getByRole('button', {name: '重新加载三维', exact: true}).click(); await expect(tower).toHaveAttribute('data-ready', 'true');
    check('retained-citylight-night-and-pause-recovery');
    await page.setViewportSize({width: 390, height: 844}); await expect(tower).toHaveAttribute('data-ready', 'true'); await overflow();
    await page.screenshot({path: path.join(out, 'citylight-mobile.png')}); check('retained-citylight-mobile');
    assert.deepEqual(report.errors, []); assert.deepEqual(report.http, []); report.passed = true;
  } catch (error) {
    report.failure = error.stack; process.exitCode = 1; await page.screenshot({path: path.join(out, 'failure.png')}).catch(() => {});
  } finally {
    report.finished = new Date().toISOString(); report.version = browser.version(); await context.close(); await browser.close();
    await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({out, passed: report.passed, checks: report.checks.length, errors: report.errors, http: report.http, failure: report.failure}));
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
