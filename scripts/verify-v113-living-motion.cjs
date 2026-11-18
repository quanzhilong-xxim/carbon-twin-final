const { chromium, webkit, firefox, expect: browserExpect } = require('@playwright/test');
const expect = browserExpect.configure({ timeout: 60000 });
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

// Interacts with the rendered GLBs and freezes their measured transforms while
// OrbitControls still requests frames. No synthetic model or API responses.
(async () => {
  const engine = process.argv[2] || 'chromium', mobile = process.argv.includes('mobile');
  const base = (process.env.CT_PREVIEW_URL || 'http://127.0.0.1:3066').replace(/\/$/, '');
  const out = path.resolve(process.env.CT_EVIDENCE_DIR || 'outputs/v113/internal', `living-motion-${engine}-${mobile ? 'mobile-' : ''}${Date.now()}`);
  await fs.mkdir(out, { recursive: true });
  const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const browser = await ({ chromium, webkit, firefox }[engine]).launch({ headless: true, ...(engine === 'chromium' ? { channel: 'chrome' } : {}) });
  const context = await browser.newContext({ viewport, recordVideo: { dir: out, size: viewport } });
  const page = await context.newPage(), report = { base, out, engine, mobile, version: browser.version(), checks: [], errors: [], http: [] };
  page.setDefaultTimeout(60000);
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) report.http.push({ status: r.status(), url: r.url().split('?')[0] }); });
  await context.route('**/api/**', r => r.abort());
  const shot = name => page.screenshot({ path: path.join(out, name + '.png') });
  const drag = async canvas => {
    const box = await canvas.boundingBox(); assert(box);
    const x = box.x + box.width * .5, y = Math.max(100, Math.min(viewport.height - 80, box.y + box.height * .45));
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 35, y + 8, { steps: 6 }); await page.mouse.up();
  };
  try {
    await page.goto(base + '/simulator#eco-companion', { waitUntil: 'domcontentloaded', timeout: 60000 });
    const companion = page.locator('#eco-companion'), cat = companion.locator('canvas[data-story-scene=cat]');
    await companion.locator('.story-companion-scene').scrollIntoViewIfNeeded();
    await expect(cat).toHaveAttribute('data-companion-parts', '5');
    await expect(cat).toHaveAttribute('data-companion-eyes', '8');
    await expect(cat).not.toHaveAttribute('data-companion-head', 'missing');
    const initial = Number(await cat.getAttribute('data-companion-time'));
    await page.waitForFunction(before => Number(document.querySelector('#eco-companion canvas')?.dataset.companionTime) > before + .08, initial);
    await companion.getByRole('button', { name: '暂停场景动画', exact: true }).click();
    await expect(cat).toHaveAttribute('data-companion-paused', 'true');
    const frozen = await cat.evaluate(c => ({ time: c.dataset.companionTime, head: c.dataset.companionHead }));
    await drag(cat); await page.waitForTimeout(400);
    assert.deepEqual(await cat.evaluate(c => ({ time: c.dataset.companionTime, head: c.dataset.companionHead })), frozen);
    await shot('cat-paused-orbit');
    const annual = await companion.locator('.story-live-strip').innerText();
    await companion.getByRole('button', { name: '轻触猫咪', exact: true }).click();
    await expect(companion.locator('p[role=status]')).toContainText('继续后回应');
    await companion.locator('.story-companion-scene').scrollIntoViewIfNeeded();
    await expect(cat).toHaveAttribute('data-companion-reaction', '1');
    const queuedHead = await cat.getAttribute('data-companion-head');
    await companion.getByRole('button', { name: '继续场景动画', exact: true }).click();
    await expect(cat).toHaveAttribute('data-companion-paused', 'false');
    await expect(cat).not.toHaveAttribute('data-companion-head', queuedHead);
    assert.equal(await companion.locator('.story-live-strip').innerText(), annual);
    await shot('cat-touch-response');
    report.checks.push('real cat GLB resolves five animated pivots, moves, freezes during orbit, queues touch while paused, resumes head response without changing annual calculation');

    const cafe = page.locator('#coffee-time'), cafeCanvas = cafe.locator('canvas[data-story-scene=cafe]');
    await cafe.locator('.story-wide-scene').scrollIntoViewIfNeeded();
    await expect(cafeCanvas).toHaveAttribute('data-cafe-paused', 'false');
    const cafeInitial = Number(await cafeCanvas.getAttribute('data-cafe-motion-time'));
    await page.waitForFunction(before => Number(document.querySelector('#coffee-time canvas')?.dataset.cafeMotionTime) > before + .08, cafeInitial);
    await cafe.getByRole('button', { name: '暂停场景动画', exact: true }).click();
    await expect(cafeCanvas).toHaveAttribute('data-cafe-paused', 'true');
    const cafeFrozen = await cafeCanvas.getAttribute('data-cafe-motion-time');
    await drag(cafeCanvas); await page.waitForTimeout(400);
    assert.equal(await cafeCanvas.getAttribute('data-cafe-motion-time'), cafeFrozen);
    await shot('cafe-paused-orbit');
    await cafe.getByRole('button', { name: '继续场景动画', exact: true }).click();
    await expect(cafeCanvas).toHaveAttribute('data-cafe-paused', 'false');
    await expect(cafeCanvas).not.toHaveAttribute('data-cafe-motion-time', cafeFrozen);
    report.checks.push('cafe local motion clock freezes while OrbitControls renders and resumes from retained time');

    const pasture = page.locator('#pasture-letter'), herd = pasture.locator('canvas[data-story-scene=pasture]');
    await pasture.locator('.story-pasture-scene').scrollIntoViewIfNeeded();
    await expect(herd).toHaveAttribute('data-cow-animated-parts', '5');
    await expect(herd).toHaveAttribute('data-sheep-animated-parts', '5');
    const herdInitial = Number(await herd.getAttribute('data-cow-motion-time'));
    await page.waitForFunction(before => Number(document.querySelector('#pasture-letter canvas')?.dataset.cowMotionTime) > before + .08, herdInitial);
    await pasture.getByRole('button', { name: '暂停场景动画', exact: true }).click();
    await page.waitForTimeout(200);
    const herdFrozen = await herd.evaluate(c => [c.dataset.cowMotionTime, c.dataset.sheepMotionTime]);
    await drag(herd); await page.waitForTimeout(400);
    assert.deepEqual(await herd.evaluate(c => [c.dataset.cowMotionTime, c.dataset.sheepMotionTime]), herdFrozen);
    await shot('pasture-paused-herd');
    await pasture.getByRole('button', { name: '继续场景动画', exact: true }).click();
    await expect(herd).not.toHaveAttribute('data-cow-motion-time', herdFrozen[0]);
    report.checks.push('real cow and sheep GLBs resolve all five animated pivots after loader name sanitization, animate and retain their clocks while paused during orbit');

    const botanical = page.locator('#ecology-lab .botanical-diorama'), tree = botanical.locator('canvas[data-season]');
    await botanical.scrollIntoViewIfNeeded(); await expect(tree).toBeVisible();
    await botanical.getByRole('button', { name: '暂停生态舱动画', exact: true }).click();
    await page.waitForTimeout(300); const treeFrozen = await tree.getAttribute('data-motion-time');
    await drag(tree); await page.waitForTimeout(400);
    assert.equal(await tree.getAttribute('data-motion-time'), treeFrozen);
    await botanical.getByRole('button', { name: '冬', exact: true }).click();
    await expect(tree).toHaveAttribute('data-season', 'winter');
    assert.equal(await tree.getAttribute('data-motion-time'), treeFrozen);
    await shot('botanical-paused-winter');
    await botanical.getByRole('button', { name: '继续生态舱动画', exact: true }).click();
    await expect(tree).not.toHaveAttribute('data-motion-time', treeFrozen);
    report.checks.push('botanical motion freezes during orbit while manual winter selection remains available, then resumes');
    assert.deepEqual(report.errors, []); assert.deepEqual(report.http, []);
    report.passed = true;
  } catch (error) {
    report.failure = String(error); process.exitCode = 1;
    report.scenes = await page.locator('.story-chapter .scene-stage').evaluateAll(stages => stages.map(stage => ({ chapter: stage.closest('[id]')?.id, mode: stage.dataset.mode, canvas: stage.querySelector('canvas')?.dataset }))).catch(() => []);
    await shot('failure').catch(() => {});
  } finally {
    await context.close(); report.video = await page.video().path(); await browser.close();
    await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
