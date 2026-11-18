/* Real local user paths. External APIs and network origins are blocked. */
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const out = path.resolve(__dirname, '../outputs/v10-explore/journey-current-' + Date.now());
  const base = (process.env.CT_PREVIEW_URL || 'http://127.0.0.1:3020/').replace(/\/$/, '');
(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage(), checks = [], errors = [], failed = [], blocked = [];
  const report = { at: new Date().toISOString(), base, browserVersion: browser.version(), environment: 'Installed Chrome, visible window, actual local preview '+base, passed: false, checks, errors, failed, blocked };
  const timeout = setTimeout(() => browser.close().catch(() => {}), 140000);
  page.on('pageerror', e => errors.push(String(e)));
  page.on('requestfailed', r => { if (!/ERR_ABORTED/.test(r.failure()?.errorText ?? '')) failed.push({ path: new URL(r.url()).pathname, error: r.failure()?.errorText }); });
  await ctx.route('**/*', route => {
    const r = route.request(), u = new URL(r.url());
    if (u.origin === base && !u.pathname.startsWith('/api/') && ['GET', 'HEAD'].includes(r.method())) return route.continue();
    blocked.push({ path: u.pathname, method: r.method() }); return route.abort();
  });
  const check = (name, detail) => checks.push({ name, passed: true, detail });
  try {
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('.city-formation canvas[data-rendered=true]').waitFor({ timeout: 30000 });
    await page.locator('.dust-story-steps button').nth(5).click();
    await page.waitForFunction(() => Number(document.querySelector('.city-formation canvas')?.dataset.cityProgress) > .996);
    const dock = await page.locator('.formation-controls').boundingBox(), stage = await page.locator('.city-observatory').boundingBox();
    assert(dock && stage && dock.y > stage.y + stage.height * .7, 'control rail must leave at least 70% of the city height visible');
    check('desktop control rail leaves the city visible', { dock, stage });
    await page.screenshot({ path: path.join(out, '01-hero.png') });
    await page.locator('#city-journey').scrollIntoViewIfNeeded();
    const backgrounds = await page.locator('.city-atlas-card').evaluateAll(els => els.map(e => e.style.getPropertyValue('--atlas-image')));
    assert.equal(backgrounds.length, 6); assert.equal(new Set(backgrounds).size, 6);
    for (const [i, asset] of ['culture-v5','waterfront-v5','innovation-v5','valley-v8','mobility-v5','symbiosis-v6'].entries()) assert(backgrounds[i].includes(asset + '.webp'));
    for (let i = 0; i < 6; i++) {
      const card = page.locator('.city-atlas-card').nth(i);
      await card.click();
      const dialog = page.locator('#city-chapter');
      await dialog.waitFor({ state: 'visible' });
      const title = await dialog.locator('h2').innerText(); assert(title.length > 6);
      await page.waitForFunction(() => { const image = document.querySelector('#city-chapter img'); return image?.complete && image.naturalWidth > 0; });
      const lines = new Set();
      for (let lens = 0; lens < 3; lens++) {
        await dialog.locator('.city-chapter-lenses button').nth(lens).click();
        lines.add(await dialog.locator('.city-chapter-insight p').innerText());
      }
      assert.equal(lines.size, 3);
      if (i === 0) await dialog.screenshot({ path: path.join(out, '02-chapter-reading.png') });
      await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
      assert.equal(await card.evaluate(e => e === document.activeElement), true, 'Escape must return focus to the opening card');
      assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
      check(`chapter ${i + 1}: unique image, three observations, Escape and focus`, title);
    }
    await page.screenshot({ path: path.join(out, '03-journeys-roles.png') });
    for (const width of [1440, 768, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator('#city-journey').scrollIntoViewIfNeeded();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `horizontal overflow at ${width}`);
      await page.locator('.city-atlas-card').nth(2).click();
      const dialog = page.locator('#city-chapter'); await dialog.waitFor({ state: 'visible' });
      assert(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth + 1), `dialog overflow at ${width}`);
      await page.screenshot({ path: path.join(out, `04-dialog-${width}.png`) });
      await page.keyboard.press('Escape');
      await page.locator('.explore-roles').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(out, `05-roles-${width}.png`) });
      check(`layout and chapter reader at ${width}px`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('.role-preview-city').click();
    await page.locator('.identity-city[aria-pressed=true]').waitFor();
    check('role entry retains the selected identity and destination');
    assert.equal(await page.locator('.explore-handoff a[href="/learn"]').count(), 1);
    check('academic handoff preserves the real /learn route');
    assert.deepEqual(errors, []); assert.deepEqual(blocked.filter(x => x.method === 'POST'), []);
    report.passed = true;
  } catch (e) { report.failure = String(e); process.exitCode = 1; }
  finally {
    clearTimeout(timeout); await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(report, null, 2));
    await ctx.close(); await browser.close(); console.log(JSON.stringify(report));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
