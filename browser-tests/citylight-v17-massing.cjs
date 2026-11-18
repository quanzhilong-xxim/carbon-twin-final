/* Local geometry study; block all APIs and all external network access. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium, firefox, webkit } = require('@playwright/test');
const root = process.cwd();
const output = process.env.CITYLIGHT_OUTPUT;
const base = process.env.CITYLIGHT_BASE || 'http://127.0.0.1:3020';
if (!output || fs.existsSync(output)) throw new Error('Choose a new CITYLIGHT_OUTPUT directory');
fs.mkdirSync(output, { recursive: true });
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const expected = hash(fs.readFileSync(path.join(root, 'public/models/citylight/v17/massing-r1/tower01-massing.glb')));
const report = { kind: 'UNAPPROVED_MASSING_STUDY', started: new Date().toISOString(), base, expected, browsers: {} };
(async () => {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const row = report.browsers[name] = { errors: [], blocked: [], models: [], checks: [] };
    let browser;
    try {
      browser = await engine.launch({ headless: true });
      row.version = browser.version();
      const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, serviceWorkers: 'block' });
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin === base && !url.pathname.startsWith('/api/') && route.request().method() === 'GET') return route.continue();
        row.blocked.push({ path: url.pathname, method: route.request().method() });
        return route.abort();
      });
      const page = await context.newPage();
      page.on('pageerror', error => row.errors.push(error.message));
      page.on('response', async response => {
        if (response.url().endsWith('.glb')) {
          try { row.models.push({ status: response.status(), sha256: hash(await response.body()) }); }
          catch (error) { row.errors.push('Model response: ' + error.message); }
        }
      });
      await page.goto(base + '/citylight/tower-study-v17', { waitUntil: 'domcontentloaded', timeout: 90000 });
      const canvas = page.locator('canvas');
      await canvas.waitFor({ timeout: 90000 });
      await page.waitForFunction(() => document.querySelector('canvas')?.dataset.modelLoaded === 'true', null, { timeout: 90000 });
      for (const [view, label] of [['perspective', '正面 45°'], ['front', '正面'], ['side', '侧面']]) {
        await page.getByRole('button', { name: label, exact: true }).click();
        await page.waitForTimeout(600);
        const actual = await canvas.getAttribute('data-view');
        const file = `${name}-${view}.png`;
        await canvas.screenshot({ path: path.join(output, file) });
        row.checks.push({ view, expected: view, actual, pass: actual === view, screenshot: file });
      }
      const box = await canvas.boundingBox();
      const before = await canvas.screenshot();
      await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
      await page.mouse.down(); await page.mouse.move(box.x + box.width * .7, box.y + box.height * .5, { steps: 12 }); await page.mouse.up();
      await page.waitForTimeout(500);
      const after = await canvas.screenshot({ path: path.join(output, `${name}-orbit.png`) });
      row.checks.push({ view: 'orbit', pass: !before.equals(after), note: 'browser canvas screenshot changed after drag', screenshot: `${name}-orbit.png` });
      row.modelMatches = row.models.some(m => m.status === 200 && m.sha256 === expected);
      row.renderer = await canvas.evaluate(el => { const g = el.getContext('webgl2') || el.getContext('webgl'); const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); });
      row.status = row.modelMatches && row.checks.every(x => x.pass) && !row.errors.length ? 'TECHNICAL_CHECKS_PASS_ONLY' : 'FAILED';
      await context.close();
    } catch (error) { row.status = 'FAILED'; row.error = error.stack; }
    finally { await browser?.close(); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); }
  }
  report.ended = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.browsers, null, 2));
  if (Object.values(report.browsers).some(row => row.status !== 'TECHNICAL_CHECKS_PASS_ONLY')) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
