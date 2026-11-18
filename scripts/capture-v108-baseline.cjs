/* V10.8 baseline: isolated browser storage, actual routes and raw recordings. */
const { chromium } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'outputs/v108/baseline');
const base = process.env.CT_PREVIEW_URL || 'http://127.0.0.1:3047';
const routes = [{ id: 'home-explore', path: '/' }, { id: 'academic', path: '/learn' }, { id: 'behaviour', path: '/simulator' }, { id: 'city-studies', path: '/city-studies' }, { id: 'citylight-studio', path: '/citylight/studio' }];
const hash = data => crypto.createHash('sha256').update(data).digest('hex');

(async () => {
  await fs.mkdir(out, { recursive: true });
  const indexPath = path.join(out, 'index.json');
  try { await fs.access(indexPath); throw new Error('Baseline index already exists; refusing to overwrite'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'no-preference', recordVideo: { dir: out, size: { width: 1440, height: 900 } } });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const report = { capturedAt: new Date().toISOString(), base, browser: await browser.version(), viewport: '1440x900', deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'no-preference', storage: 'fresh isolated browser context', gitHead: cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), routes: [], events: [], errors: [], responses: [], files: [] };
  const start = Date.now();
  const mark = (label, details = {}) => report.events.push({ elapsedSeconds: +((Date.now() - start) / 1000).toFixed(1), label, ...details });
  page.on('pageerror', error => report.errors.push({ elapsedSeconds: +((Date.now() - start) / 1000).toFixed(1), message: error.message }));
  page.on('response', response => { if (response.status() >= 400) report.responses.push({ status: response.status(), url: response.url().split('?')[0] }); });
  await context.route('**/api/**', route => route.abort());
  async function shot(name, options = {}) {
    const file = `${name}.png`;
    await page.screenshot({ path: path.join(out, file), ...options, timeout: 30000 });
    const data = await fs.readFile(path.join(out, file));
    report.files.push({ file, bytes: data.length, sha256: hash(data) });
  }
  async function walk() {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 760) {
      await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), y);
      await page.waitForTimeout(350);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(600);
    return height;
  }
  try {
    for (const route of routes) {
      mark(route.id, { route: route.path });
      const entry = { ...route };
      report.routes.push(entry);
      try {
        const response = await page.goto(base + route.path, { waitUntil: 'domcontentloaded', timeout: 45000 });
        entry.status = response?.status();
        await page.waitForTimeout(3500);
        await shot(`${route.id}-top`);
        entry.documentHeight = await walk();
        await shot(`${route.id}-full`, { fullPage: true });
        if (route.id === 'home-explore') {
          const identities = page.locator('#identities');
          if (await identities.count()) {
            await identities.scrollIntoViewIfNeeded(); await page.waitForTimeout(1400); mark('identity-section'); await shot('identities');
            for (const id of ['student', 'business', 'city']) {
              const card = page.locator(`.identity-unit[data-character="${id}"]`);
              try {
                mark(`character-${id}`);
                await card.locator('.identity-card').click();
                await card.getByRole('button', { name: '进入角色展厅' }).click();
                await page.waitForTimeout(3500); await shot(`character-${id}`);
                await page.getByRole('button', { name: '关闭角色展厅' }).click();
              } catch (error) { report.errors.push({ label: `character-${id}`, message: String(error) }); await page.keyboard.press('Escape'); }
            }
          } else entry.identities = 'not found';
        }
        if (route.id === 'academic') {
          const search = page.getByLabel('检索学术档案', { exact: true });
          if (await search.count()) { mark('academic-search'); await search.scrollIntoViewIfNeeded(); await search.fill('Scope'); await page.waitForTimeout(1000); await shot('academic-search'); await search.clear(); }
          const garment = page.locator('.garment-lifecycle');
          if (await garment.count()) { mark('garment-lifecycle'); await garment.scrollIntoViewIfNeeded(); await page.waitForTimeout(2000); await shot('garment-lifecycle'); }
        }
      } catch (error) { entry.failure = String(error); await shot(`${route.id}-failure`).catch(() => {}); }
    }
  } finally {
    await context.close();
    const video = await page.video().path();
    const data = await fs.readFile(video);
    report.files.push({ file: path.basename(video), bytes: data.length, sha256: hash(data), type: 'raw browser video' });
    report.recordingFinishedAt = new Date().toISOString();
    await browser.close();
    await fs.writeFile(indexPath, JSON.stringify(report, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ index: indexPath, routes: report.routes, errors: report.errors, events: report.events, video }));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
