// Real browser/Web Audio scheduling with generated sine-wave PCM, never cloud TTS.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium, webkit, firefox, expect } = require('@playwright/test');
const compiler = require('next/dist/compiled/webpack/webpack');
compiler.init();
const root = path.resolve(__dirname, '..');
const work = path.join(root, 'work/tts/browser'); fs.mkdirSync(work, { recursive: true });
fs.writeFileSync(path.join(work, 'loader.cjs'), `module.exports = source => require(${JSON.stringify(require.resolve('typescript'))}).transpileModule(source, { compilerOptions: { jsx: 4, target: 9, module: 99, esModuleInterop: true } }).outputText;`);
fs.writeFileSync(path.join(work, 'app.tsx'), `import React,{StrictMode,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {useSpeech} from '@/lib/hooks/useSpeech';
import SpeechControls from '@/components/SpeechControls';
function Reader({name}) {const s=useSpeech();return <section id={name} data-playing={s.speaking} data-loading={s.loading}><SpeechControls speech={s}/><button className="read" onClick={()=>s.speak('你好，今天是2026-11-03，Carbon Twin 的排放是6.43 kg CO₂e。')}>朗读</button><button className="long" onClick={()=>s.speak('长文本测试。'.repeat(500))}>长文本</button></section>}
function App(){const [open,setOpen]=useState(true);return <><button id="unmount" onClick={()=>setOpen(!open)}>切换对话</button>{open&&<Reader name="first"/>}<Reader name="second"/></>}
createRoot(document.getElementById('root')).render(<StrictMode><App/></StrictMode>);`);
const pcm = Buffer.alloc(24000 * 2);
for (let i = 0; i < 24000; i++) pcm.writeInt16LE(Math.round(Math.sin(i / 24000 * 2 * Math.PI * 440) * 1000), i * 2);
let posts = 0, completed = 0, cancelled = 0;
async function main() {
  await new Promise((resolve, reject) => compiler.webpack({ mode: 'development', target: 'web', entry: path.join(work, 'app.tsx'), devtool: false,
    output: { path: work, filename: 'bundle.js' }, resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@': root } },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(work, 'loader.cjs') }] },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const server = http.createServer((req, res) => {
    if (req.url === '/api/tts') {
      const mode = /mode=([\w-]+)/.exec(req.headers.cookie || '')?.[1] || 'normal';
      if (req.method === 'GET') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ configured: mode !== 'unconfigured' })); }
      posts++;
      if (mode === 'auth') { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end('{"error":"豆包语音鉴权失败，请检查新 API Key。"}'); }
      if (mode === 'offline') return req.socket.destroy();
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8' });
      let ended = false;
      const done = setTimeout(() => {
        if (mode === 'stall') return;
        if (mode === 'broken') { res.end('{"type":"error","error":"语音流中断。"}\n'); ended = true; return; }
        res.end('{"type":"done"}\n'); completed++; ended = true;
      }, 1800);
      // Odd byte boundaries exercise signed-16 PCM framing across packets.
      res.write(JSON.stringify({ type: 'audio', data: pcm.subarray(0, 481).toString('base64') }) + '\n');
      const rest = setTimeout(() => res.write(JSON.stringify({ type: 'audio', data: pcm.subarray(481).toString('base64') }) + '\n'), 100);
      res.on('close', () => { clearTimeout(done); clearTimeout(rest); if (!ended) cancelled++; });
      return;
    }
    if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); return fs.createReadStream(path.join(work, 'bundle.js')).pipe(res); }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script src="/bundle.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [name, type] of Object.entries({ chromium, webkit, firefox })) {
      if (!fs.existsSync(type.executablePath())) { console.log(`NOT RUN: ${name} browser runtime is not installed`); continue; }
      const browser = await type.launch({ headless: true, ...(name === 'chromium' ? { args: ['--no-proxy-server', '--autoplay-policy=no-user-gesture-required'] } : {}) });
      const errors = [];
      try {
        async function page(mode = 'normal', viewport = { width: 1280, height: 800 }) {
          const p = await browser.newPage({ viewport });
          p.on('pageerror', e => errors.push(e.message));
          await p.context().addCookies([{ url: base, name: 'mode', value: mode }]);
          await p.goto(base); await p.locator('#first .read').waitFor(); return p;
        }
        const p = await page(); const before = posts; const priorCompleted = completed;
        await p.waitForTimeout(150); assert.equal(posts, before, 'page load must not synthesize');
        const supportsPcm = await p.evaluate(() => !!(window.AudioContext || window.webkitAudioContext));
        if (!supportsPcm) {
          await p.locator('#first .read').click();
          await expect(p.locator('#first [role=status]')).toContainText('无法播放流式音频');
          await expect(p.locator('#first')).toHaveAttribute('data-playing', 'false');
          assert.equal(posts, before, 'unsupported audio must not create a synthesis request');
          await p.close();
          console.log(`UNSUPPORTED ${name}: native Web Audio is absent in this browser runtime; PCM playback not tested. PASS clear error and zero synthesis requests.`);
        } else {
        await p.locator('#first .read').click();
        await expect(p.locator('#first')).toHaveAttribute('data-loading', 'true');
        assert.equal(completed, priorCompleted, 'PCM is not presented as ready until the synthesis stream completes');
        await p.getByRole('button', { name: '取消语音请求', exact: true }).click();
        await expect(p.locator('#first')).toHaveAttribute('data-loading', 'false');
        await expect(p.locator('#first')).toHaveAttribute('data-playing', 'false');
        await p.locator('#first .read').click();
        await expect(p.locator('#first')).toHaveAttribute('data-playing', 'true');
        await expect(p.locator('#first')).toHaveAttribute('data-loading', 'false');
        const afterFirstSynthesis = posts;
        await p.getByRole('button', { name: '暂停', exact: true }).click();
        await expect(p.locator('#first')).toContainText('播放已暂停');
        await p.getByRole('button', { name: '继续播放', exact: true }).click();
        await p.locator('#first').getByRole('button', { name: '静音', exact: true }).click();
        await expect(p.locator('#first button[aria-pressed="true"]')).toContainText('取消静音');
        await p.locator('#first').getByLabel('语音音量').evaluate(input => { input.value = '0.4'; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); });
        await p.locator('#first').getByRole('button', { name: '重播上一条', exact: true }).click();
        await expect(p.locator('#first')).toHaveAttribute('data-playing', 'true');
        assert.equal(posts, afterFirstSynthesis, 'replay must use the completed PCM cache without another synthesis request');
        await p.locator('#second .read').click();
        await expect(p.locator('#first')).toHaveAttribute('data-playing', 'false');
        await expect(p.locator('#second')).toHaveAttribute('data-playing', 'true');
        await expect(p.locator('#second')).toHaveAttribute('data-playing', 'false', { timeout: 5000 });
        assert(cancelled > 0, 'stop must cancel fetch, not merely mute audio');
        console.log(`PASS ${name}: complete-stream cache, pause/resume, mute/volume, no-charge replay, cancellation, exclusive readers and idle reset`);

        // Rapid clicks: only the current generation is allowed to play.
        await p.locator('#first .read').click({ clickCount: 3, delay: 1 });
        await expect(p.locator('#first')).toHaveAttribute('data-playing', 'true');
        await p.locator('#unmount').click();
        await expect(p.locator('#second')).toHaveAttribute('data-playing', 'false');
        await p.close();
        console.log(`PASS ${name}: rapid replacement and conversation unmount cleanup`);

        // The provider response is fully cached even if the browser rejects playback.
        const blocked = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        blocked.on('pageerror', e => errors.push(e.message));
        await blocked.context().addCookies([{ url: base, name: 'mode', value: 'normal' }]);
        await blocked.addInitScript(() => {
          const NativeAudioContext = window.AudioContext;
          if (NativeAudioContext) Object.defineProperty(window, 'AudioContext', { configurable: true, value: class extends NativeAudioContext {
            get state() { return 'suspended'; }
            resume() { return Promise.reject(new DOMException('Blocked by test policy', 'NotAllowedError')); }
          } });
        });
        await blocked.goto(base); await blocked.locator('#first .read').waitFor();
        const beforeBlocked = posts;
        await blocked.locator('#first .read').click();
        await expect(blocked.locator('#first [role=status]')).toContainText('Autoplay Blocked', { timeout: 5000 });
        assert.equal(posts, beforeBlocked + 1);
        await blocked.getByRole('button', { name: '点击播放已生成语音', exact: true }).click();
        await expect(blocked.locator('#first [role=status]')).toContainText('Autoplay Blocked');
        assert.equal(posts, beforeBlocked + 1, 'retrying blocked playback must never request TTS again');
        await blocked.close();
        console.log(`PASS ${name}: blocked playback retains generated audio and retry does not make a second TTS request`);

        for (const mode of ['auth', 'broken', 'offline']) {
          const q = await page(mode);
          await q.locator('#first .read').click();
          await expect(q.locator('#first [role=status]')).toContainText(mode === 'auth' ? '鉴权失败' : mode === 'broken' ? '语音流中断' : '网络连接中断', { timeout: 5000 });
          await expect(q.locator('#first')).toHaveAttribute('data-playing', 'false');
          await expect(q.locator('#first')).toHaveAttribute('data-loading', 'false');
          await q.close();
        }
        const long = await page(); const count = posts;
        await long.locator('#first .long').click();
        await expect(long.locator('#first [role=status]')).toContainText('最多朗读'); assert.equal(posts, count);
        await long.close();
        console.log(`PASS ${name}: auth/network/stream errors leave no loading; oversized text blocked before request`);

        const stalled = await page('stall');
        await stalled.clock.install();
        await stalled.locator('#first .read').click();
        await expect(stalled.locator('#first')).toHaveAttribute('data-loading', 'true');
        await stalled.clock.fastForward(91000);
        await expect(stalled.locator('#first [role=status]')).toContainText('超时');
        await expect(stalled.locator('#first')).toHaveAttribute('data-playing', 'false');
        await expect(stalled.locator('#first')).toHaveAttribute('data-loading', 'false');
        await stalled.close();
        console.log(`PASS ${name}: stalled stream aborts at 90-second deadline`);
        }

        const fallback = await browser.newPage();
        await fallback.context().addCookies([{ url: base, name: 'mode', value: 'unconfigured' }]);
        await fallback.addInitScript(() => {
          window.spoken = []; let pending;
          // Advance this mocked speech engine explicitly. Browser timer
          // throttling must not determine whether the application's 500-part
          // queue is correct; native speech output is not asserted here.
          window.finishMockSpeech = () => { let count = 0; while (pending) { const u = pending; pending = null; u.onend?.(new Event('end')); if (++count > 1000) throw Error('Mock speech queue did not terminate'); } };
          if (!window.SpeechSynthesisUtterance) Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class { constructor(text) { this.text = text; } } });
          Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
            getVoices: () => [], addEventListener() {}, removeEventListener() {},
            cancel() { pending = null; },
            speak(u) { window.spoken.push(u.text); pending = u; u.onstart?.(new Event('start')); },
          } });
        });
        await fallback.goto(base);
        const prior = posts;
        await fallback.locator('#first .read').click();
        await expect(fallback.locator('#first [role=status]')).toContainText('本次使用系统语音');
        await fallback.locator('#first').getByLabel('语音方式').selectOption('browser');
        await fallback.locator('#first .long').click();
        await expect(fallback.locator('#first')).toHaveAttribute('data-playing', 'true');
        await fallback.evaluate(() => window.finishMockSpeech());
        await expect(fallback.locator('#first')).toHaveAttribute('data-playing', 'false', { timeout: 10000 });
        const spoken = await fallback.evaluate(() => window.spoken.join(''));
        assert.equal((spoken.match(/长文本测试。/g) ?? []).length, 500);
        assert.equal(posts, prior, 'system fallback never creates cloud synthesis');
        await fallback.close();
        console.log(`PASS ${name}: missing-key fallback, system voice switching and 500-sentence queue (speech engine mocked, no cloud charge)`);

        if (supportsPcm) {
        const mobile = await page('normal', { width: 390, height: 844 });
        await mobile.locator('#first .read').click();
        await expect(mobile.locator('#first')).toHaveAttribute('data-playing', 'true');
        await mobile.screenshot({ path: path.join(work, `${name}-mobile.png`), fullPage: true });
        await mobile.close();
        console.log(`PASS ${name}: 390px viewport and streaming Web Audio`);
        }
        assert.deepEqual(errors, []);
        console.log(`PASS ${name}: no uncaught JavaScript errors`);
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
  console.log('Browser fixtures use local generated PCM only. Real TTS requests: 0.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
