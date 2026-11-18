/* Local browser evidence only; no cloud, TTS or generation calls. */
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const stage = Math.max(0, Math.min(5, Number(process.argv[2] ?? 5)));
const name = process.argv[3] ?? `stage-${stage}`;
(async () => {
  const browser = await chromium.launch(process.env.CT_HEADFUL==='1'?{channel:'chrome',headless:false}:{headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
  const timer = setTimeout(() => browser.close().catch(() => {}), 55000);
  const errors = [], failedRequests = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 850 } });
    page.on('crash',()=>console.error('BROWSER_PAGE_CRASH'));
    page.on('pageerror', e => errors.push(String(e)));
    page.on('requestfailed', r => failedRequests.push({ url: r.url().replace(/\?.*$/, ''), error: r.failure()?.errorText }));
    await page.goto('http://127.0.0.1:3020', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('.city-formation canvas[data-rendered="true"]').waitFor({ timeout: 20000 });
    // Real chapter button with no auto-scroll to the panel below the fold.
    await page.locator('.dust-story-steps button').nth(stage).evaluate(button => button.click());
    const target = [0, .22, .42, .58, .88, 1][stage];
    await page.waitForFunction(target => Math.abs(Number(document.querySelector('.city-formation canvas')?.dataset.cityProgress) - target) < .002, target, { timeout: 12000 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const dwell = Math.max(0,Math.min(20000,Number(process.argv[4]??0)));
    if(dwell)await page.waitForTimeout(dwell);
    const evidence = await page.locator('.city-formation').evaluate(el => {
      const canvas = el.querySelector('canvas'), gl = canvas?.getContext('webgl2'), ext = gl?.getExtension('WEBGL_debug_renderer_info');
      return { root: { ...el.dataset }, canvas: { ...canvas?.dataset }, heading: el.querySelector('.dust-story-heading')?.textContent,
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable' };
    });
    const output = path.join(root, 'outputs/v10-explore', name);
    await fs.writeFile(output + '.json', JSON.stringify({ timestamp: new Date().toISOString(), stage, target, ...evidence, errors, failedRequests }, null, 2));
    console.log(JSON.stringify({ stage, ...evidence, errors, failedRequests }));
    await page.screenshot({ path: output + '.png', timeout: 18000 });
  } finally { clearTimeout(timer); await browser.close(); }
})().catch(e => { console.error(String(e)); process.exitCode = 1; });
