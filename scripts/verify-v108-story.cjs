const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      await context.route('**/api/**', route => route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const base = (process.env.CT_PREVIEW_URL || 'http://127.0.0.1:3066').replace(/\/$/, '');
      await page.goto(base + '/simulator', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.getByRole('button', { name: /城市旅程/ }).click({ timeout: 60000 });
      // 180 kWh/month, 70 L/month and 0.5 kg/week with the site's teaching factors.
      await page.waitForFunction(() => document.querySelector('#story-reflection .story-reflection-ledger strong')?.textContent?.includes('3.89'), null, { timeout: 30000 });
      const amount = await page.locator('#story-reflection .story-reflection-ledger strong').innerText();
      await page.getByRole('navigation', { name: '行为沙盘故事导航' }).getByRole('link', { name: /回看你的选择/ }).click();
      const navigation = await page.evaluate(() => location.hash);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      const anchors = await page.locator('.lab-chapters a').evaluateAll(links => links.map(a => ({ href: a.getAttribute('href'), exists: !!document.querySelector(a.getAttribute('href')) })));
      results.push({ viewport, amount, navigation, overflow, anchors, errors });
      await context.close();
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify(results, null, 2));
  if (results.some(r => r.overflow || r.errors.length || r.navigation !== '#story-reflection' || r.anchors.some(a => !a.exists))) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
