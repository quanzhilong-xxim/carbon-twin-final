const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const pw = require('@playwright/test');
const baseline = require('./baseline.json');
const resultDir = process.env.BROWSER_TEST_RESULT_DIR;
const results = { time: new Date().toISOString(), playwright: require('@playwright/test/package.json').version,
  cache: process.env.PLAYWRIGHT_BROWSERS_PATH, launches: [], services: [], protectedFiles: {}, originalCachePreserved: false };
async function launch(name, type, options = {}) {
  let browser;
  try {
    browser = await type.launch({ headless: true, ...options });
    const context = await browser.newContext();
    for (const pattern of ['**/api/decart/**', '**/api/decart-token', '**/api/tts', '**/api/chat', '**/*decart.ai/**', '**/*bytedance.com/**']) {
      await context.route(pattern, r => r.fulfill({ status: 503, json: { error: 'Offline browser verification; cloud calls blocked.' } }));
    }
    const page = await context.newPage();
    const response = await page.goto(process.env.BROWSER_TEST_BASE_URL + '/workspace', { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (response.status() !== 200) throw new Error(`Workspace HTTP ${response.status()}`);
    await pw.expect(page.getByRole('button', { name: 'Nike 短袖', exact: true })).toBeEnabled({ timeout: 30000 });
    // Harmless local state interaction. Do not start the camera or any cloud session.
    await page.getByRole('button', { name: 'Nike 长袖', exact: true }).click();
    await pw.expect(page.locator('.wardrobe-reference > strong')).toContainText('13.2');
    const info = { name, executable: options.executablePath || type.executablePath(), version: browser.version(), status: 'passed', closed: false };
    await browser.close(); browser = null; info.closed = true;
    results.launches.push(info); console.log(JSON.stringify(info));
  } catch (error) { results.launches.push({ name, status: 'failed', error: error.message }); console.error(name, error.message); process.exitCode = 1; }
  finally { if (browser) await browser.close(); }
}
(async () => {
  for (const [name, type, options] of [
    ['chromium', pw.chromium, {}], ['firefox', pw.firefox, {}], ['webkit', pw.webkit, {}],
    ['original-chromium', pw.chromium, { executablePath: path.join(baseline.originalCache, 'chromium-1248/chrome-win64/chrome.exe') }],
    ['original-google-chrome', pw.chromium, { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' }],
  ]) {
    await launch(name, type, options);
  }
  for (const port of [3000, 3010, 3011, 3020]) {
    try { const r = await fetch(`http://localhost:${port}/api/tts`, { signal: AbortSignal.timeout(10000) }); results.services.push({ port, status: r.status }); }
    catch (e) { results.services.push({ port, error: e.message }); }
  }
  for (const [file, expected] of Object.entries(baseline.hashes)) {
    results.protectedFiles[file] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') === expected;
    if (!results.protectedFiles[file]) process.exitCode = 1;
  }
  results.originalCachePreserved = baseline.originalCacheEntries.every(name => fs.existsSync(path.join(baseline.originalCache, name)));
  if (!results.originalCachePreserved) process.exitCode = 1;
  fs.mkdirSync(resultDir, { recursive: true });
  fs.writeFileSync(path.join(resultDir, 'verification.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ services: results.services, protectedFiles: results.protectedFiles, originalCachePreserved: results.originalCachePreserved }, null, 2));
})().catch(e => { console.error(e.message); process.exitCode = 1; });
