// Real app acceptance. Fixture audio, actual cloud audio and hardware are reported separately.
const fs = require('node:fs');
const path = require('node:path');
const { chromium, firefox, webkit, expect } = require('@playwright/test');
const base = process.env.BROWSER_TEST_BASE_URL || 'http://localhost:3020';
const output = process.env.BROWSER_TEST_RESULT_DIR;
if (!output) throw new Error('Run through node browser-tests/run.cjs acceptance');
fs.mkdirSync(output, { recursive: true });
const report = { time: new Date().toISOString(), base, cache: process.env.PLAYWRIGHT_BROWSERS_PATH,
  playwright: require('@playwright/test/package.json').version, browsers: {}, cloudRequests: 0 };
const pcm = Buffer.alloc(24000 * 2 * 30);
for (let i = 0; i < pcm.length / 2; i++) pcm.writeInt16LE(Math.round(Math.sin(i * Math.PI * 880 / 24000) * 1500), i * 2);
const fixture = JSON.stringify({ type: 'audio', data: pcm.toString('base64') }) + '\n{"type":"done"}\n';
function save() { fs.writeFileSync(path.join(output, 'acceptance.json'), JSON.stringify(report, null, 2)); }
async function check(result, name, action) {
  try { const detail = await action(); result.checks.push({ name, status: 'passed', detail }); console.log(`PASS ${result.name}: ${name}`); }
  catch (e) { result.checks.push({ name, status: 'failed', error: e.message }); console.log(`FAIL ${result.name}: ${name}: ${e.message.slice(0, 240)}`); }
  save();
}
function blocked(result, name, reason, status = 'blocked') { result.checks.push({ name, status, reason }); save(); }
async function opened(page) {
  const response = await page.goto(base + '/workspace', { waitUntil: 'domcontentloaded' });
  expect(response.status()).toBe(200);
  await expect(page.getByRole('button', { name: '开启穿搭语音', exact: true })).toBeEnabled({ timeout: 30000 });
  await page.waitForFunction(() => [...document.querySelectorAll('.voice-switch')].some(el => Object.keys(el).some(key => key.startsWith('__reactProps'))));
}
async function enabled(page) {
  const button = page.getByRole('button', { name: '开启穿搭语音', exact: true });
  if (await button.count()) await button.click();
  return page.locator('.wardrobe-voice');
}
(async () => {
  const selected = process.argv.slice(2);
  if (selected.some(name => !['chromium', 'firefox', 'webkit'].includes(name))) throw new Error('Unknown browser selection');
  report.selectedEngines = selected.length ? selected : ['chromium', 'firefox', 'webkit'];
  for (const [name, type] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => report.selectedEngines.includes(name))) {
    const result = report.browsers[name] = { name, checks: [], consoleErrors: [], pageErrors: [], httpErrors: [], failedRequests: [] };
    let browser, context, page;
    try {
      await check(result, 'browser-launch', async () => {
        browser = await type.launch({ headless: true });
        return { version: browser.version(), executable: type.executablePath() };
      });
      if (!browser) continue;
      context = await browser.newContext({ viewport: { width: 1365, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
      // Prevent unrelated cloud trial sessions; never change the TTS route until a fixture test explicitly begins.
      for (const pattern of ['**/api/decart/token', '**/api/decart-token', '**/api/chat'])
        await context.route(pattern, r => r.fulfill({ status: 503, json: { error: 'Unrelated cloud operation disabled in acceptance' } }));
      page = await context.newPage();
      page.on('console', m => { if (m.type() === 'error') result.consoleErrors.push(m.text().slice(0, 1000)); });
      page.on('pageerror', e => result.pageErrors.push(e.message));
      page.on('response', r => { if (r.status() >= 400) result.httpErrors.push({ path: new URL(r.url()).pathname, status: r.status() }); });
      page.on('requestfailed', r => result.failedRequests.push({ path: new URL(r.url()).pathname, error: r.failure()?.errorText }));
      await page.addInitScript(() => {
        window.__audioAudit = [];
        if (window.AudioBufferSourceNode) {
          const original = AudioBufferSourceNode.prototype.start;
          AudioBufferSourceNode.prototype.start = function (...args) {
            window.__audioAudit.push({ state: this.context.state, frames: this.buffer?.length, sampleRate: this.buffer?.sampleRate,
              signal: this.buffer ? this.buffer.getChannelData(0).some(v => Math.abs(v) > 0.001) : false });
            return original.apply(this, args);
          };
        }
      });
      await check(result, 'page-load', () => opened(page));
      await check(result, 'page-interaction', async () => {
        await page.getByRole('button', { name: 'Nike 长袖', exact: true }).click();
        await expect(page.locator('.wardrobe-reference > strong')).toContainText('13.2');
        await page.getByLabel('衣物拥有件数', { exact: true }).fill('2');
        await page.getByLabel('使用寿命 / 年', { exact: true }).fill('3');
        await expect(page.locator('.wardrobe-number strong')).toHaveText('8.80');
      });
      await check(result, 'embedded-voice-entry', async () => {
        const voice = await enabled(page);
        await voice.getByLabel('语音方式', { exact: true }).selectOption('doubao');
        await voice.getByLabel('豆包音色', { exact: true }).selectOption('zh_female_xiaohe_uranus_bigtts');
        await expect(voice.getByRole('button', { name: '听听建议 ↗' })).toBeEnabled();
      });
      result.capabilities = await page.evaluate(() => ({ secure: isSecureContext, audioContext: !!(window.AudioContext || window.webkitAudioContext),
        getUserMedia: !!navigator.mediaDevices?.getUserMedia, speechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
        systemSpeech: !!window.speechSynthesis, userAgent: navigator.userAgent }));
      await check(result, 'real-tts-config', async () => {
        const response = await context.request.get(base + '/api/tts');
        expect(response.status()).toBe(200); const config = await response.json();
        expect(config.model).toBe('seed-tts-2.0'); expect(config.sampleRate).toBe(24000);
        expect(Object.keys(config).some(k => /key|token|secret/i.test(k))).toBe(false);
        result.configured = config.configured; return config;
      });
      if (!result.configured) {
        await check(result, 'real-missing-key-response', async () => {
          const response = await context.request.post(base + '/api/tts', { headers: { Origin: base }, data: { text: '你好。' } });
          expect(response.status()).toBe(503); expect((await response.json()).error).toContain('API Key');
          return { status: 503, cloudRequests: 0 };
        });
        blocked(result, 'real-doubao-synthesis-and-playback', 'VOLCENGINE_TTS_API_KEY is empty; no real provider audio has been received.');
      } else blocked(result, 'real-doubao-synthesis-and-playback', 'Use the explicit live probe to preserve a received audio artifact; fixture checks do not certify cloud TTS.');
      if (result.capabilities.audioContext) {
        await check(result, 'real-page-missing-key-feedback', async () => {
          if (result.configured) return { notApplicable: 'key configured' };
          const voice = page.locator('.wardrobe-voice');
          await voice.getByRole('button', { name: '听听建议 ↗' }).click();
          await expect(voice).toContainText('当前服务端未读取到豆包语音 API Key');
        });
        await check(result, 'generated-pcm-play-stop', async () => {
          await page.route('**/api/tts', r => r.request().method() === 'GET'
            ? r.fulfill({ json: { configured: true } }) : r.fulfill({ contentType: 'application/x-ndjson', body: fixture }));
          const voice = page.locator('.wardrobe-voice');
          await voice.getByRole('button', { name: '听听建议 ↗' }).click();
          await expect(voice.getByRole('button', { name: '停止朗读', exact: true })).toBeVisible();
          const events = await page.evaluate(() => window.__audioAudit);
          expect(events.some(e => e.state === 'running' && e.frames > 0 && e.signal && e.sampleRate === 24000)).toBe(true);
          await voice.screenshot({ path: path.join(output, name + '-voice.png') });
          await voice.getByRole('button', { name: '停止朗读', exact: true }).click();
          await expect(page.locator('.wardrobe-atelier')).toHaveAttribute('data-speaking', 'false');
          await page.unroute('**/api/tts');
          return { source: 'generated 440Hz PCM, not Doubao', audioEvents: events };
        });
        await check(result, 'network-failure-and-retry', async () => {
          await page.route('**/api/tts', r => r.abort('internetdisconnected'));
          const voice = page.locator('.wardrobe-voice');
          await voice.getByRole('button', { name: '听听建议 ↗' }).click();
          await expect(voice).toContainText('语音网络连接中断');
          await expect(voice.getByRole('button', { name: '取消合成', exact: true })).toHaveCount(0);
          await page.unroute('**/api/tts');
          if (!result.configured) {
            await voice.getByRole('button', { name: '听听建议 ↗' }).click();
            await expect(voice).toContainText('当前服务端未读取到豆包语音 API Key');
          }
          return { injectedNetworkFailure: true, realRouteRestored: true };
        });
      } else {
        blocked(result, 'generated-pcm-play-stop', 'This installed Windows WebKit runtime exposes neither AudioContext nor webkitAudioContext.', 'unsupported');
        blocked(result, 'network-failure-and-retry', 'Playback exits before fetch because Windows WebKit has no Web Audio.', 'unsupported');
        await check(result, 'unsupported-audio-feedback', async () => {
          const voice = page.locator('.wardrobe-voice');
          await voice.getByRole('button', { name: '听听建议 ↗' }).click();
          await expect(voice).toContainText('此浏览器无法播放流式音频');
        });
      }
      if (result.capabilities.getUserMedia) {
        let permission;
        try { await context.grantPermissions(['microphone'], { origin: base }); permission = true; }
        catch (e) { permission = false; blocked(result, 'microphone-permission-grant', e.message, 'unsupported'); }
        if (permission) {
          await check(result, 'microphone-permission-grant', async () => {
            return { method: 'Playwright grantPermissions, not a manually accepted dialog', devices: await page.evaluate(async () =>
              (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput').map(d => ({ kind: d.kind, available: !!d.deviceId }))) };
          });
          const capture = await page.evaluate(async () => {
            const pending = navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            let timedOut = false;
            pending.then(stream => { if (timedOut) stream.getTracks().forEach(t => t.stop()); }).catch(() => {});
            try {
              const stream = await Promise.race([pending, new Promise((_, reject) => setTimeout(() => { timedOut = true; reject(new Error('capture timed out')); }, 7000))]);
              const audio = new AudioContext(); const source = audio.createMediaStreamSource(stream); const analyser = audio.createAnalyser(); source.connect(analyser);
              await audio.resume(); await new Promise(r => setTimeout(r, 300));
              const data = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(data);
              const result = { tracks: stream.getAudioTracks().map(t => ({ state: t.readyState, enabled: t.enabled })), rms: Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length) };
              stream.getTracks().forEach(t => t.stop()); source.disconnect(); await audio.close(); return result;
            } catch (e) { return { error: e.name, message: e.message }; }
          });
          result.hardwareCapture = capture;
          if (capture.error) blocked(result, 'actual-microphone-capture', JSON.stringify(capture));
          else await check(result, 'actual-microphone-capture', async () => { expect(capture.tracks[0].state).toBe('live'); return capture; });
        } else blocked(result, 'actual-microphone-capture', 'Microphone permission cannot be granted by this Playwright backend.');
      } else {
        blocked(result, 'microphone-permission-grant', 'No mediaDevices.getUserMedia in this Windows WebKit build.', 'unsupported');
        blocked(result, 'actual-microphone-capture', 'No mediaDevices.getUserMedia in this Windows WebKit build.', 'unsupported');
      }
      await check(result, 'speech-input-entry-and-error-feedback', async () => {
        const voice = page.locator('.wardrobe-voice');
        await voice.getByRole('button', { name: '语音选衣', exact: true }).click();
        if (!result.capabilities.speechRecognition) await expect(voice).toContainText('此浏览器不支持语音输入');
        else {
          await expect(voice).toContainText(/语音输入|语音服务|麦克风/, { timeout: 10000 });
          const stop = voice.getByRole('button', { name: '正在听…', exact: true });
          if (await stop.count()) await stop.click();
        }
        return { recognitionAPI: result.capabilities.speechRecognition, text: (await voice.innerText()).slice(-400) };
      });
      blocked(result, 'actual-speech-recognition-and-command', result.capabilities.speechRecognition
        ? 'No confirmed spoken transcript/command from the browser recognition service. API presence and microphone capture do not establish recognition success.'
        : 'SpeechRecognition is unavailable. Existing project uses browser recognition, not Doubao ASR.', result.capabilities.speechRecognition ? 'blocked' : 'unsupported');
      await check(result, 'refresh-recovery-and-other-functions', async () => {
        await page.unroute('**/api/tts'); await opened(page);
        const voice = await enabled(page);
        await expect(voice.getByLabel('语音方式')).toHaveValue('auto');
        await page.getByRole('button', { name: 'Nike 短裤', exact: true }).click();
        await expect(page.locator('.wardrobe-reference > strong')).toContainText('25.1');
        expect(await page.locator('#local-camera-preview').evaluate(v => v.srcObject === null)).toBe(true);
        await page.getByRole('button', { name: '打开碳知识 AI 教练', exact: true }).click();
        await page.getByLabel('向碳知识教练提问', { exact: true }).fill('兼容性验收草稿，不发送');
        await expect(page.getByRole('button', { name: '发送问题', exact: true })).toBeEnabled();
        await page.getByLabel('向碳知识教练提问', { exact: true }).press('Escape');
        await page.screenshot({ path: path.join(output, name + '-workspace.png'), fullPage: true });
      });
      await check(result, 'auth-endpoints', async () => {
        const session = await context.request.get(base + '/api/auth/session');
        const log = await context.request.post(base + '/api/auth/_log', { form: { level: 'error', code: 'ACCEPTANCE_CHECK' } });
        result.auth = { session: session.status(), log: log.status() };
        expect(result.auth, 'Existing application routes; never stubbed or changed').toEqual({ session: 200, log: 200 });
      });
      await check(result, 'uncaught-javascript-errors', async () => expect(result.pageErrors).toEqual([]));
    } catch (e) { result.fatal = e.message; }
    finally { if (browser) await browser.close(); save(); }
  }
  report.summary = {};
  for (const status of ['passed', 'failed', 'blocked', 'unsupported']) report.summary[status] = Object.values(report.browsers).flatMap(b => b.checks).filter(c => c.status === status).length;
  save(); console.log(JSON.stringify({ output, summary: report.summary }));
  process.exitCode = report.summary.failed ? 1 : 0;
})().catch(e => { report.fatal = e.message; save(); console.error(e.message); process.exitCode = 1; });
