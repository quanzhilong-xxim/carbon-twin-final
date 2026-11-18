const { chromium } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const base = process.env.CT_PREVIEW_URL || 'http://127.0.0.1:3047';
const out = path.join(root, 'outputs/v108/final-' + Date.now());
const routes = [{ id: 'home-explore', path: '/' }, { id: 'academic', path: '/learn' }, { id: 'behaviour', path: '/simulator' }, { id: 'city-studies', path: '/city-studies' }, { id: 'citylight-studio', path: '/citylight/studio' }];
const hash = data => crypto.createHash('sha256').update(data).digest('hex');

(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'no-preference', recordVideo: { dir: out, size: { width: 1440, height: 900 } } });
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  const report = { capturedAt: new Date().toISOString(), base, browser: browser.version(), viewport: '1440x900', routes: [], events: [], errors: [], responses: [], files: [] };
  const startedAt = Date.now();
  const mark = (label, details = {}) => report.events.push({ elapsedSeconds: +((Date.now() - startedAt) / 1000).toFixed(1), label, ...details });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.responses.push({ status: response.status(), url: response.url().split('?')[0] }); });
  await context.route('**/api/**', route => route.abort());
  async function shot(name, options = {}) { const file = `${name}.png`; await page.screenshot({ path: path.join(out, file), ...options }); const data = await fs.readFile(path.join(out, file)); report.files.push({ file, bytes: data.length, sha256: hash(data) }); }
  async function walk() { const height = await page.evaluate(() => document.documentElement.scrollHeight); for (let y = 0; y < height; y += 500) { await page.evaluate(top => window.scrollTo({ top, behavior: 'smooth' }), y); await page.waitForTimeout(1500); } await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(900); return height; }
  try {
    for (const route of routes) {
      mark(route.id, { route: route.path }); const entry = { ...route }; report.routes.push(entry);
      const response = await page.goto(base + route.path, { waitUntil: 'domcontentloaded', timeout: 60000 }); entry.status = response?.status(); await page.waitForTimeout(3500); await shot(`${route.id}-top`); entry.documentHeight = await walk(); await shot(`${route.id}-full`, { fullPage: true });
      if (route.id === 'home-explore') {
        const identities = page.locator('#identities'); await identities.scrollIntoViewIfNeeded(); await page.waitForTimeout(1200); await shot('identities');
        for (const id of ['student', 'business', 'city']) { const card = page.locator(`.identity-unit[data-character="${id}"]`); await card.locator('.identity-card').click(); await card.getByRole('button', { name: '进入角色展厅' }).click(); await page.waitForFunction(id=>document.querySelector('.character-room canvas')?.dataset.avatarIdentity===id,id,{timeout:60000}); await page.waitForTimeout(1200); mark(`character-${id}`); await shot(`character-${id}`); await page.getByRole('button', { name: '关闭角色展厅' }).click(); }
      }
      if (route.id === 'academic') { const search = page.getByLabel('检索学术档案', { exact: true }); await search.scrollIntoViewIfNeeded(); await search.fill('Scope'); await page.waitForTimeout(600); await shot('academic-search'); await search.clear(); const garment = page.locator('.garment-lifecycle'); await garment.scrollIntoViewIfNeeded(); await page.waitForTimeout(1400); await shot('garment-lifecycle'); }
    }
    report.errors = report.errors.filter(Boolean); report.passed = report.errors.length === 0 && report.responses.length === 0;
  } catch (error) { report.failure = String(error); await shot('failure').catch(() => {}); process.exitCode = 1; }
  finally { await context.close(); const video = await page.video().path(); const data = await fs.readFile(video); report.video = video; report.files.push({ file: path.basename(video), bytes: data.length, sha256: hash(data), type: 'raw browser video' }); await browser.close(); await fs.writeFile(path.join(out, 'index.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify({ out, video, passed: report.passed, errors: report.errors, responses: report.responses })); }
})().catch(error => { console.error(error); process.exitCode = 1; });
