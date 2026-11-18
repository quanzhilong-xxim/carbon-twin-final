const { chromium } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

(async () => {
  const root = process.cwd();
  const out = path.resolve('outputs/v108/internal/posters-' + Date.now());
  const target = path.join(root, 'public/media/explore-v10');
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const report = { out, browser: browser.version(), viewport: [1440, 900], roles: [], errors: [] };
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto('http://127.0.0.1:3047/#identities', { waitUntil: 'domcontentloaded', timeout: 60000 });
  for (const id of ['student', 'business', 'city']) {
    const unit = page.locator(`.identity-unit[data-character="${id}"]`);
    await unit.scrollIntoViewIfNeeded();
    await unit.locator('.identity-card').click();
    const canvas = unit.locator('canvas').first();
    await canvas.waitFor({ state: 'visible', timeout: 60000 });
    await page.waitForFunction(expected => document.querySelector(`.identity-unit[data-character="${expected}"] canvas`)?.dataset.assetVersion?.startsWith('v108'), id, { timeout: 60000 });
    await page.waitForTimeout(900);
    await page.evaluate(() => { document.body.classList.remove('custom-cursor'); document.querySelectorAll('.cursor-dot,.cursor-ring').forEach(node => { node.style.display = 'none'; }); });
    const png = path.join(out, `${id}.png`);
    await canvas.screenshot({ path: png });
    await sharp(png).resize({ width: 640, height: 720, fit: 'cover', position: 'centre' }).webp({ quality: 88 }).toFile(path.join(target, `full-${id}-v108.webp`));
    await sharp(png).resize({ width: 640, height: 720, fit: 'cover', position: 'centre' }).webp({ quality: 88 }).toFile(path.join(target, `role-${id}-v108.webp`));
    report.roles.push({ id, assetVersion: await canvas.getAttribute('data-asset-version'), source: await canvas.getAttribute('data-model-source'), screenshot: png });
  }
  await context.close();
  await browser.close();
  await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
})().catch(error => { console.error(error); process.exitCode = 1; });
