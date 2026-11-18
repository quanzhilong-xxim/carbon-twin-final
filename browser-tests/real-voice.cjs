// No response fixtures, mocked media or generated audio. Only real application routes.
const fs = require('node:fs');
const path = require('node:path');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= 'D:\\PlaywrightBrowsers';
process.env.PLAYWRIGHT_SKIP_BROWSER_GC = '1';
const { chromium, firefox, webkit, expect } = require('@playwright/test');
const base = process.env.BROWSER_REAL_TEST_BASE_URL || 'http://localhost:3020';
const host = new URL(base).hostname;
if (!['localhost', '127.0.0.1'].includes(host) && !host.endsWith('--carbontwin-quanzhilong.netlify.app')) throw new Error('Unrecognized test deployment.');
const output = process.env.BROWSER_REAL_TEST_OUTPUT || path.join(__dirname, '../work/browser-real', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(output, { recursive: true });
const report = { time: new Date().toISOString(), base, fixtures: false, browsers: {} };
(async () => {
  for (const [name, type] of Object.entries({ chromium, firefox, webkit })) {
    const result = report.browsers[name] = { apiRequests: [], pageErrors: [], actualAudio: false };
    let browser;
    try {
      browser = await type.launch({ headless: true });
      result.version = browser.version();
      const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1365, height: 900 } });
      const page = await context.newPage();
      page.on('pageerror', e => result.pageErrors.push(e.message));
      page.on('request', req => { const url = new URL(req.url()); if (/\/api\/tts|ddshub|bytedance/.test(url.href)) result.apiRequests.push({ method: req.method(), host: url.hostname, path: url.pathname }); });
      await page.addInitScript(() => {
        window.__realAudio = [];
        if (window.AudioBufferSourceNode) {
          const start = AudioBufferSourceNode.prototype.start;
          AudioBufferSourceNode.prototype.start = function (...args) { window.__realAudio.push({ frames: this.buffer?.length, sampleRate: this.buffer?.sampleRate, state: this.context.state }); return start.apply(this, args); };
        }
      });
      const response = await page.goto(base + '/workspace', { waitUntil: 'domcontentloaded', timeout: 60000 });
      result.pageStatus = response.status(); expect(result.pageStatus).toBe(200);
      await page.waitForFunction(() => [...document.querySelectorAll('.voice-switch')].some(el => Object.keys(el).some(key => key.startsWith('__reactProps'))), { timeout: 30000 });
      result.capabilities = await page.evaluate(() => ({ audioContext: !!(window.AudioContext || window.webkitAudioContext), microphone: !!navigator.mediaDevices?.getUserMedia, recognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition) }));
      const configResponse = await context.request.get(base + '/api/tts'); result.configStatus = configResponse.status();
      const config = await configResponse.json(); result.configured = config.configured; result.model = config.model;
      if (!config.configured) {
        const missing = await context.request.post(base + '/api/tts', { headers: { Origin: base }, data: { text: '真实接口连接检查。' } });
        result.postStatus = missing.status(); const body = await missing.json(); result.error = body.error;
        result.upstreamAuthentication = 'not reached: server configuration unavailable';
      }
      await page.getByRole('button', { name: '开启穿搭语音', exact: true }).click();
      const voice = page.locator('.wardrobe-voice');
      await expect(voice.getByLabel('语音方式')).toBeVisible();
      await voice.getByLabel('语音方式').selectOption('doubao');
      await voice.getByRole('button', { name: '听听建议 ↗' }).click();
      if (config.configured && result.capabilities.audioContext) {
        const stop = voice.getByRole('button', { name: '停止朗读', exact: true });
        await expect(stop).toBeVisible({ timeout: 30000 });
        result.audioEvents = await page.evaluate(() => window.__realAudio);
        result.actualAudio = result.audioEvents.some(e => e.frames > 0 && e.state === 'running');
        await stop.click(); result.stopSucceeded = await page.locator('.wardrobe-atelier').getAttribute('data-speaking') === 'false';
      } else {
        await expect(voice.locator('.speech-controls [role="status"]')).toContainText(result.capabilities.audioContext ? '当前服务端未读取到' : '无法播放流式音频', { timeout: 15000 });
      }
      result.uiMessage = (await voice.innerText()).slice(-500);
      result.noDdsHubRequest = result.apiRequests.every(r => !r.host.includes('ddshub'));
      await voice.screenshot({ path: path.join(output, name + '-real-voice.png') });
      result.status = result.actualAudio ? 'passed' : 'blocked';
    } catch (e) { result.status = 'failed'; result.testError = e.message; }
    finally { if (browser) await browser.close(); fs.writeFileSync(path.join(output, 'real-voice.json'), JSON.stringify(report, null, 2)); console.log(name, JSON.stringify(result)); }
  }
  console.log('Real application report:', output);
  process.exitCode = Object.values(report.browsers).some(b => b.status === 'failed') ? 1 : 0;
})();
