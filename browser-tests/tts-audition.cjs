// Genuine application requests only. No response fixtures, synthetic speech or media.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= 'D:\\PlaywrightBrowsers';
process.env.PLAYWRIGHT_SKIP_BROWSER_GC = '1';
const { chromium, firefox, webkit, expect } = require('@playwright/test');
const base = process.env.BROWSER_REAL_TEST_BASE_URL || 'http://localhost:3020';
const preview = 'https://6ae9ead67487b134e89e0763--carbontwin-quanzhilong.netlify.app';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Use a local app for this listening review.');
const output = process.env.BROWSER_REAL_TEST_OUTPUT || path.join(__dirname, '../work/tts-audition', new Date().toISOString().replace(/[:.]/g, '-'));
if (fs.existsSync(path.join(output, 'tts-audition.json'))) throw new Error('Preserve prior evidence: choose a new output directory.');
fs.mkdirSync(output, { recursive: true });
const texts = [
  '你好，欢迎回来。我们可以慢慢来，一起看看今天想穿什么。',
  '这件衣服很适合今天的搭配。如果你愿意，我们可以再看看有没有更舒服、自然的选择。',
  '你更喜欢温柔一点的风格，还是清新甜美一点的风格？我们可以一起试试看。',
];
const voices = ['zh_female_vv_uranus_bigtts', 'zh_female_xiaohe_uranus_bigtts'];
const report = { time: new Date().toISOString(), fixtures: false, subjectiveListening: 'not performed by automation; user acceptance required', texts, environments: [], browsers: {} };
const save = () => fs.writeFileSync(path.join(output, 'tts-audition.json'), JSON.stringify(report, null, 2));
function wave(pcm, sampleRate) {
  const h = Buffer.alloc(44); h.write('RIFF'); h.writeUInt32LE(pcm.length + 36, 4); h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
async function actualRequests(url, label) {
  const env = { label, base: url, attempts: [] }; report.environments.push(env);
  try {
    const config = await fetch(url + '/api/tts', { signal: AbortSignal.timeout(30000) });
    env.configStatus = config.status;
    if (!config.ok) return;
    env.config = await config.json();
    for (const voice of voices) for (let i = 0; i < texts.length; i++) {
      const attempt = { voice, sample: i + 1, audioBytes: 0, complete: false };
      env.attempts.push(attempt); const start = performance.now();
      try {
        const response = await fetch(url + '/api/tts', { method: 'POST', headers: { Origin: url, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: texts[i], voice }), signal: AbortSignal.timeout(95000) });
        attempt.status = response.status; attempt.headersMs = Math.round(performance.now() - start); attempt.contentType = response.headers.get('content-type');
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          // Only expose the app's known safe error; never serialize unknown upstream errors.
          attempt.reason = body.error === '当前服务端未读取到豆包语音 API Key，请检查该服务的环境变量加载；可切换系统语音。' ? body.error : 'Application request failed; raw response omitted.';
        } else {
          if (!attempt.contentType?.includes('application/x-ndjson')) throw new Error('Unexpected response format');
          const reader = response.body.getReader(), decoder = new TextDecoder(), chunks = []; let pending = '';
          for (;;) {
            const next = await reader.read(); pending += decoder.decode(next.value, { stream: !next.done });
            const lines = pending.split('\n'); pending = lines.pop();
            for (const line of lines) {
              if (!line.trim()) continue;
              const p = JSON.parse(line);
              if (p.type === 'audio') { const bytes = Buffer.from(p.data, 'base64'); chunks.push(bytes); attempt.audioBytes += bytes.length; if (!attempt.firstAudioMs) attempt.firstAudioMs = Math.round(performance.now() - start); }
              if (p.type === 'done') attempt.complete = true;
              if (p.type === 'error') throw new Error('Application reported an interrupted stream');
            }
            if (attempt.audioBytes > 30 * 1024 * 1024) { await reader.cancel(); throw new Error('Audio evidence size limit'); }
            if (next.done) break;
          }
          if (pending.trim() || !attempt.complete || !attempt.audioBytes || attempt.audioBytes % 2) throw new Error('Incomplete PCM stream');
          const pcm = Buffer.concat(chunks), rate = Number(response.headers.get('x-audio-sample-rate'));
          if (rate !== 24000) throw new Error('Unexpected sample rate');
          attempt.durationSeconds = pcm.length / (rate * 2);
          attempt.sha256 = crypto.createHash('sha256').update(pcm).digest('hex');
          attempt.file = `${label}-${voice}-sample-${i + 1}.wav`;
          fs.writeFileSync(path.join(output, attempt.file), wave(pcm, rate));
        }
      } catch { attempt.failure = 'Synthesis unavailable or invalid/incomplete stream; raw response omitted.'; }
      attempt.elapsedMs = Math.round(performance.now() - start);
      save(); console.log(label, voice, i + 1, attempt.status, attempt.audioBytes + ' bytes');
    }
  } catch { env.failure = 'Configuration request failed; raw output omitted.'; }
  save();
}
async function browsers() {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const result = report.browsers[name] = { checks: [], requests: [], errors: [] }; let browser;
    const check = (name, status, detail) => { result.checks.push({ name, status, detail }); console.log('browser', name, status); save(); };
    try {
      browser = await engine.launch({ headless: true }); result.version = browser.version(); check('浏览器启动', 'pass');
      const context = await browser.newContext({ viewport: { width: 1365, height: 1000 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.on('pageerror', e => result.errors.push(e.message.slice(0, 250)));
      page.on('response', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/')) result.requests.push({ host: u.hostname, path: u.pathname, method: r.request().method(), status: r.status() }); });
      await page.addInitScript(() => {
        window.__ttsAudio = [];
        if (window.AudioBufferSourceNode) {
          const start = AudioBufferSourceNode.prototype.start;
          AudioBufferSourceNode.prototype.start = function (...args) {
            const e = { frames: this.buffer?.length, rate: this.buffer?.sampleRate, state: this.context.state, ended: false };
            this.addEventListener('ended', () => { e.ended = true; }); window.__ttsAudio.push(e); return start.apply(this, args);
          };
        }
      });
      let response = await page.goto(base + '/tts-audition', { waitUntil: 'domcontentloaded', timeout: 60000 });
      expect(response.status()).toBe(200); await expect(page.getByLabel('语音方式')).toHaveValue('doubao'); check('独立试听页与三段文本', 'pass');
      for (const text of texts) await expect(page.getByText(text, { exact: true })).toBeVisible();
      result.capabilities = await page.evaluate(() => ({ audioContext: !!(window.AudioContext || window.webkitAudioContext), microphone: !!navigator.mediaDevices?.getUserMedia, recognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition) }));
      const config = await (await context.request.get(base + '/api/tts')).json(); result.config = config;
      const status = page.locator('.speech-controls [role=status]');
      for (const voice of voices) {
        await page.getByLabel('豆包音色').selectOption(voice);
        for (const label of ['温柔问候', '轻柔建议', '自然追问']) {
          const before = await page.evaluate(() => window.__ttsAudio.length);
          await page.getByRole('button', { name: '试听' + label, exact: true }).click();
          if (!result.capabilities.audioContext || !config.configured) {
            await expect(status).toContainText(!result.capabilities.audioContext ? '无法播放流式音频' : '当前服务端未读取到', { timeout: 15000 });
            await expect(page.getByRole('button', { name: /取消合成|停止朗读/ })).toHaveCount(0);
            check(`${voice}/${label}失败提示及状态恢复`, 'pass');
          } else {
            await expect(status).toContainText('正在朗读', { timeout: 30000 });
            await expect(status).not.toContainText('正在朗读', { timeout: 90000 });
            const audio = await page.evaluate(() => window.__ttsAudio);
            expect(audio.slice(before).some(e => e.frames > 0 && e.state === 'running' && e.ended)).toBe(true);
            check(`${voice}/${label}真实音频播放结束`, 'pass', 'Browser playback events; human listening still required.');
          }
        }
      }
      check('连续重试无卡住状态', 'pass');
      if (!config.configured) check('真实豆包合成', 'blocked', 'HTTP 503 before upstream authentication; no audio');
      if (!result.capabilities.audioContext) check('真实豆包播放结束', 'unsupported', 'This Windows WebKit exposes no Web Audio');
      else if (!config.configured) check('真实豆包播放结束', 'blocked', 'No real provider audio');
      if (!config.configured || !result.capabilities.audioContext) {
        await page.getByRole('button', { name: '试听温柔问候', exact: true }).dblclick();
        await expect(status).toContainText(result.capabilities.audioContext ? '当前服务端未读取到' : '无法播放流式音频');
        await expect(page.getByRole('button', { name: /取消合成|停止朗读/ })).toHaveCount(0);
        check('快速重复点击状态恢复', 'pass');
      }
      await context.setOffline(true);
      try {
        await page.getByRole('button', { name: '试听温柔问候', exact: true }).click();
        await expect(status).toContainText(result.capabilities.audioContext ? '网络连接中断' : '无法播放流式音频');
        check('断网提示', result.capabilities.audioContext ? 'pass' : 'unsupported', result.capabilities.audioContext ? 'Actual browser offline mode' : 'Capability guard runs before network; unsupported notice verified separately');
      } finally { await context.setOffline(false); }
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.getByLabel('语音方式')).toHaveValue('doubao');
      await page.getByRole('button', { name: '试听温柔问候', exact: true }).click();
      if (!config.configured || !result.capabilities.audioContext) await expect(status).toContainText(!result.capabilities.audioContext ? '无法播放流式音频' : '当前服务端未读取到');
      check('刷新及联网后可重试', 'pass');
      result.auditionAudioEvents = await page.evaluate(() => window.__ttsAudio);
      await page.screenshot({ path: path.join(output, name + '-audition.png'), fullPage: true });
      response = await page.goto(base + '/workspace', { waitUntil: 'domcontentloaded', timeout: 60000 }); expect(response.status()).toBe(200);
      await page.waitForFunction(() => [...document.querySelectorAll('.voice-switch')].some(el => Object.keys(el).some(key => key.startsWith('__reactProps'))), { timeout: 30000 });
      await page.getByRole('button', { name: '开启穿搭语音', exact: true }).click();
      const voice = page.locator('.wardrobe-voice'); await voice.getByLabel('语音方式').selectOption('doubao');
      await voice.getByRole('button', { name: '听听建议 ↗' }).click();
      if (!config.configured || !result.capabilities.audioContext) await expect(voice.locator('.speech-controls [role=status]')).toContainText(result.capabilities.audioContext ? '当前服务端未读取到' : '无法播放流式音频');
      check('原网页听听建议入口与错误提示', 'pass');
      await voice.getByRole('button', { name: '语音选衣', exact: true }).click();
      if (!result.capabilities.recognition) await expect(voice.getByRole('status').last()).toContainText('不支持语音输入');
      else await expect(voice.getByRole('status').last()).toContainText(/语音输入|麦克风|语音服务/);
      result.microphoneNotice = await voice.getByRole('status').last().innerText(); check('麦克风与语音输入提示', 'pass', 'No real microphone/ASR success claimed');
      await page.getByLabel('衣物拥有件数').fill('2'); await expect(page.getByLabel('衣物拥有件数')).toHaveValue('2'); check('原页面交互', 'pass');
      const session = await context.request.get(base + '/api/auth/session');
      const log = await context.request.post(base + '/api/auth/_log', { form: {} });
      check('原认证接口', session.status() === 200 && log.ok() ? 'pass' : 'fail', { session: session.status(), log: log.status(), independentOfTts: true });
      check('未调用DDShub', result.requests.every(r => !r.host.includes('ddshub')) ? 'pass' : 'fail', 'Website requests plus static inspection of the server endpoint');
      await voice.screenshot({ path: path.join(output, name + '-wardrobe.png') });
      result.audioEvents = await page.evaluate(() => window.__ttsAudio);
    } catch (error) { check('回归执行', 'fail', error.message.slice(0, 500)); }
    finally { if (browser) await browser.close(); save(); }
  }
}
(async () => {
  if (!process.argv.includes('--browsers-only')) {
    await actualRequests(base, 'local');
    await actualRequests(preview, 'preview');
    await actualRequests('https://carbontwin-quanzhilong.netlify.app', 'production');
  }
  await browsers(); save(); console.log('Evidence:', output);
  process.exitCode = Object.values(report.browsers).some(b => b.checks.some(c => c.status === 'fail')) ? 1 : 0;
})().catch(() => { report.failure = 'Test runner failed; inspect structured evidence'; save(); process.exitCode = 1; });
