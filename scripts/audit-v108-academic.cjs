const { chromium, firefox, webkit, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const base = (process.env.CT_PREVIEW_URL || 'http://127.0.0.1:3066').replace(/\/+$/, '') + '/';
  const engine=process.env.CT_BROWSER||'chromium';
  assert(['chromium','firefox','webkit'].includes(engine), 'Unknown CT_BROWSER');
  const mobile=process.argv.includes('mobile'),viewport=mobile?{width:390,height:844}:{width:1440,height:900};
  const out = path.resolve(process.env.CT_EVIDENCE_DIR || 'outputs/v108/internal/academic-'+engine+(mobile?'-mobile':'')+'-' + Date.now());
  await fs.mkdir(out, { recursive: true });
  const browser = await ({chromium,firefox,webkit}[engine]).launch({ headless: true,...engine==='chromium'?{channel:'chrome'}:{} });
  const context = await browser.newContext({ viewport,recordVideo: { dir: out, size: viewport } });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  const report = { out, base, viewport,browser: browser.version(), checks: [], errors: [], http: [], api: [],modelTimings:[] };
  await page.addInitScript(() => { window.__resizeEvents = []; const Native = window.ResizeObserver; window.ResizeObserver = class extends Native { constructor(callback) { const owner = new Error().stack; super((entries, observer) => { window.__resizeEvents.push({ at: performance.now(), owner, targets: entries.map(e => ({ tag: e.target.tagName, cls: e.target.className, rect: [e.contentRect.width, e.contentRect.height] })) }); if (window.__resizeEvents.length > 80) window.__resizeEvents.shift(); callback(entries, observer); }); } }; });
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('pageerror', async () => { report.resizeAtError = await page.evaluate(() => window.__resizeEvents).catch(() => []); });
  page.on('response', r => { if (r.status() >= 400) report.http.push({ status: r.status(), url: r.url().split('?')[0] }); });
  await context.route('**/api/**', route => { report.api.push(new URL(route.request().url()).pathname); return route.abort(); });
  const travel = async selector => { await page.locator(selector).scrollIntoViewIfNeeded(); await page.waitForTimeout(900); };
  try {
    const response = await page.goto(base + 'learn', { waitUntil: 'domcontentloaded', timeout: 60000 }); assert.equal(response.status(), 200);
    await expect(page.locator('.library-hero-world')).toBeVisible();
    await page.waitForSelector('canvas[data-library-ready="true"]', { timeout: 60000 });
    await page.waitForFunction(()=>Number(document.querySelector('canvas[data-library-ready]')?.dataset.libraryTriangles)>0);
    report.libraryRendering=await page.locator('canvas[data-library-ready]').evaluate(n=>({...n.dataset}));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, 'library.png') }); report.checks.push('academic archive actual 3D library loaded');
    await page.getByRole('button', { name: '寻找第一条证据', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.waitForTimeout(350); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.citation-overlay')).toHaveCount(0); report.checks.push('citation modal opens and Escape closes its overlay');
    await travel('#scope-boundaries');
    for (let i = 0; i < 3; i++) { await page.locator('.scope-flip').nth(i).click(); await expect(page.locator('.scope-stage')).toHaveAttribute('data-active', 'scope-' + (i + 1)); }
    await page.screenshot({ path: path.join(out, 'scope.png') }); report.checks.push('three scope cards switch');
    await travel('.research-register-v7');
    const search = page.getByLabel('检索学术档案', { exact: true }); await search.fill('Scope'); await page.waitForTimeout(500); assert((await page.locator('.archive-grid article').count()) > 0);
    const card = page.locator('.archive-grid article').first(); await card.locator('.research-save-v7').click(); await expect(card.locator('.research-save-v7')).toHaveAttribute('aria-pressed', 'true'); await card.locator('.citation-badge').click(); await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape'); report.checks.push('archive search, save and citation detail');
    await travel('.garment-lifecycle'); const garment = page.locator('.garment-lifecycle'); await expect(garment).toBeVisible(); await expect(page.locator('canvas[data-garment-ready="true"]')).toBeVisible();
    for (let i = 0; i < 3; i++) { await garment.getByRole('button', { name: ['正面', '侧面', '背面'][i], exact: true }).click(); await expect(page.locator('canvas[data-garment-angle]')).toHaveAttribute('data-garment-angle', String(i)); }
    for (let i = 0; i < 9; i++) {
      await garment.locator('.lifecycle-path button').nth(i).click();
      await expect(page.getByRole('dialog', { name: 'A boundary, understood.', exact: true })).toHaveCount(0);
    }
    await garment.getByRole('button', { name: '展开材料分层', exact: true }).click(); for (const name of ['棉', '聚酯', '羊毛', '牛仔斜纹']) await garment.getByRole('button', { name, exact: true }).click();
    await garment.getByRole('button', { name: '放大织纹', exact: true }).click(); await expect(garment.locator('canvas')).toHaveAttribute('data-garment-angle','3'); await garment.locator('canvas').scrollIntoViewIfNeeded(); await page.waitForTimeout(250); await page.screenshot({ path: path.join(out, 'garment.png') }); report.checks.push('garment real GLB views, nine stages and four material controls');
    await garment.getByRole('button',{name:'结构观察',exact:true}).click(); await expect(garment.locator('.textile-diagram')).toBeVisible();
    await garment.getByRole('button',{name:'三维成衣',exact:true}).click(); await expect(garment.locator('canvas[data-garment-ready="true"]')).toBeVisible();
    await expect(garment.locator('canvas')).toHaveAttribute('data-fabric-study','denim'); await expect(garment.locator('canvas')).toHaveAttribute('data-lifecycle-stage','8');
    report.garmentRendering=await garment.locator('canvas').evaluate(n=>({...n.dataset}));
    report.checks.push('3D-to-structure-to-3D return preserves material and lifecycle selection');
    await expect(page.getByRole('status').filter({ hasText: '证据与模型已探索' })).toBeVisible();
    await page.getByRole('button', { name: '开始随堂测验 ↗', exact: true }).click();
    const quiz = page.getByRole('dialog', { name: 'A boundary, understood.', exact: true });
    await expect(quiz).toBeVisible();
    await quiz.getByRole('button', { name: 'B / Scope 2：购入能源', exact: true }).click();
    await quiz.getByRole('button', { name: '提交答案并保留记录', exact: true }).click();
    await expect(quiz.getByRole('status')).toContainText('回答正确，记录已保存');
    await quiz.getByRole('button', { name: '关闭随堂测验', exact: true }).click();
    await expect(quiz).toHaveCount(0); report.checks.push('nonmodal learning invitation, explicit quiz and saved correct answer');
    report.modelTimings=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/\.(glb|gltf)(\?|$)/.test(r.name)).map(r=>({url:new URL(r.name).pathname,durationMs:Math.round(r.duration),transferBytes:r.transferSize})));
    report.renderers=await page.locator('canvas').evaluateAll(nodes=>nodes.map(n=>({...n.dataset})));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'page must not overflow horizontally');
    assert.deepEqual(report.errors, []); assert.deepEqual(report.http, []); assert.deepEqual(report.api, []); report.passed = true;
  } catch (error) { report.failure = String(error); process.exitCode = 1; await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {}); }
  finally { await context.close(); report.video = await page.video().path(); await browser.close(); await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
