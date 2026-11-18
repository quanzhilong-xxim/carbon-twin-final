// Run serially with other GPU/browser jobs. This checks visible canvas pixels,
// coordinate alignment, keyboard interaction and live accessibility fallbacks.
const { chromium, firefox, webkit, expect } = require('@playwright/test');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const base = process.env.CT_PREVIEW_URL || 'http://127.0.0.1:3066';
const out = path.resolve(process.env.CT_EVIDENCE_DIR || 'outputs/v123/archive-particles');
const engine = process.env.CT_BROWSER || 'chromium';

(async () => {
  await fs.mkdir(out, { recursive: true });
  const report = { base, engine, at: new Date().toISOString(), checks: [], errors: [], http: [], passed: false };
  const browser = await ({ chromium, firefox, webkit }[engine]).launch({ headless: true, ...engine === 'chromium' ? { channel: 'chrome' } : {}, ...engine === 'firefox' && process.env.CT_FIREFOX_EXECUTABLE ? { executablePath: process.env.CT_FIREFOX_EXECUTABLE } : {} });
  let context, page;
  const open = async (options = {}, cores = 8) => {
    if (context) await context.close();
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference', ...options });
    await context.route('**/api/**', route => route.abort());
    // A deterministic desktop capability isolates animation from host core count;
    // a separate two-core context below verifies the actual weak-device branch.
    await context.addInitScript(count => Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { get: () => count }), cores);
    page = await context.newPage(); page.setDefaultTimeout(20000);
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) report.http.push({ path: new URL(response.url()).pathname, status: response.status() }); });
    await page.goto(base + '/learn#archive', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await expect(page.locator('.archive-entry')).toHaveCount(9);
    await page.mouse.move(5, 5);
  };
  const pixelSample = canvas => canvas.evaluate(c => {
    const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let hash = 2166136261, colored = 0;
    for (let i = 3; i < data.length; i += 4) { hash = Math.imul(hash ^ data[i], 16777619) >>> 0; if (data[i]) colored++; }
    return { hash, colored, width: c.width, height: c.height, progress: Number(c.dataset.particleProgress), count: Number(c.dataset.particleCount) };
  });
  const check = (name, evidence) => report.checks.push({ name, evidence });
  try {
    await open();
    const card = page.locator('.archive-entry').first(), visual = card.locator('.evidence-cover-visual'), canvas = card.locator('.evidence-particle-field');
    await visual.scrollIntoViewIfNeeded();
    await expect(visual).toHaveAttribute('data-particle-mode', 'interactive');
    assert.equal(await canvas.evaluate(c => c.width * c.height), 0, 'Allocate a particle buffer only after interaction');
    const geometry = await visual.evaluate(v => {
      const svg = v.querySelector('svg'), canvas = v.querySelector('canvas'), matrix = svg.getScreenCTM(), box = canvas.getBoundingClientRect();
      const origin = new DOMPoint(0, 0).matrixTransform(matrix), end = new DOMPoint(320, 152).matrixTransform(matrix);
      return { origin: [origin.x, origin.y], end: [end.x, end.y], box: [box.x, box.y, box.right, box.bottom], ratio: box.width / box.height, gridColumn: getComputedStyle(v).gridColumn };
    });
    for (let i = 0; i < 2; i++) { assert(Math.abs(geometry.origin[i] - geometry.box[i]) < .6); assert(Math.abs(geometry.end[i] - geometry.box[i + 2]) < .6); }
    assert(Math.abs(geometry.ratio - 320 / 152) < .01);
    check('svg-and-particles-share-the-same-coordinate-system', geometry);

    await visual.hover();
    await expect(visual).toHaveAttribute('data-particle-active', 'true');
    await expect.poll(() => canvas.evaluate(c => Number(c.dataset.particleProgress))).toBeGreaterThan(.03);
    const first = await pixelSample(canvas);
    assert(first.colored > 100 && first.count > 50 && first.count <= 850, 'Real visible particles must be drawn');
    await page.waitForTimeout(180); const second = await pixelSample(canvas);
    assert(second.progress > first.progress && second.hash !== first.hash, 'Particle pixels must change while converging');
    await visual.screenshot({ path: path.join(out, '01-forming-from-particles.png'), animations: 'allow' });
    await expect(canvas).toHaveAttribute('data-particle-progress', '1.000');
    await expect(visual).not.toHaveAttribute('data-particle-active', 'true');
    await visual.screenshot({ path: path.join(out, '02-vector-after-formation.png') });
    check('actual-pixels-animate-and-settle', { first, second });

    await page.mouse.move(5, 5);
    const links = card.locator('button'); await links.first().focus();
    await expect(visual).toHaveAttribute('data-particle-active', 'true');
    await expect.poll(() => canvas.evaluate(c => Number(c.dataset.particleProgress))).toBeGreaterThan(.08);
    const beforeFocusMove = Number(await canvas.getAttribute('data-particle-progress'));
    await links.nth(1).focus();
    const afterFocusMove = Number(await canvas.getAttribute('data-particle-progress'));
    assert(afterFocusMove >= beforeFocusMove, 'Tabbing within one card must not restart the animation');
    check('keyboard-focus-preserves-formation', { beforeFocusMove, afterFocusMove });

    await page.getByRole('button', { name: '暂停封面动态', exact: true }).click();
    await expect(visual).toHaveAttribute('data-particle-mode', 'static');
    assert.equal(await canvas.evaluate(c => c.width * c.height), 0);
    await page.getByRole('button', { name: '开启封面动态', exact: true }).click();
    await expect(visual).toHaveAttribute('data-particle-mode', 'interactive');
    check('manual-pause-releases-particle-buffer', true);

    await page.setViewportSize({ width: 390, height: 844 });
    await visual.scrollIntoViewIfNeeded(); await expect(visual).toHaveAttribute('data-particle-mode', 'static');
    assert.equal(await canvas.evaluate(c => c.width * c.height), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await card.screenshot({ path: path.join(out, '03-mobile-static-cover.png') });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(visual).toHaveAttribute('data-particle-mode', 'interactive');
    check('live-resize-to-mobile-and-back', true);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(visual).toHaveAttribute('data-particle-mode', 'static');
    assert.equal(await canvas.evaluate(c => c.width * c.height), 0);
    await visual.hover(); await expect(visual).not.toHaveAttribute('data-particle-active', 'true');
    check('live-reduced-motion-keeps-original-vector', true);

    await open({}, 2);
    const weakVisual = page.locator('.evidence-cover-visual').first(); await weakVisual.scrollIntoViewIfNeeded();
    await expect(weakVisual).toHaveAttribute('data-particle-mode', 'static');
    assert.equal(await weakVisual.locator('canvas').evaluate(c => c.width * c.height), 0);
    check('two-core-device-uses-zero-allocation-fallback', true);
    assert.deepEqual(report.errors, []); assert.deepEqual(report.http, []); report.passed = true;
  } catch (error) {
    report.failure = error.stack; process.exitCode = 1;
    await page?.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
  } finally {
    if (context) await context.close(); await browser.close(); report.finished = new Date().toISOString();
    await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ out, passed: report.passed, checks: report.checks.length, failure: report.failure }));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
