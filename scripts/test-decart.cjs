// Browser tests for lifecycle and UI behavior. SDK/media stand-ins do not test cloud try-on quality.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium, expect } = require('@playwright/test');
const compiler = require('next/dist/compiled/webpack/webpack');
compiler.init();
const root = path.resolve(__dirname, '..');
const work = path.join(root, 'work/decart-tests');
fs.mkdirSync(work, { recursive: true });
fs.writeFileSync(path.join(work, 'loader.cjs'), `module.exports = function(source) {
  return require(${JSON.stringify(require.resolve('typescript'))}).transpileModule(source, {
    compilerOptions: { jsx: 4, target: 7, module: 99, esModuleInterop: true }
  }).outputText;
};`);
fs.writeFileSync(path.join(work, 'sdk.js'), `export const models = { realtime: name => ({ name, width: 1280, height: 720 }) };
export function createDecartClient() { throw new Error('Test client must be injected'); }`);
fs.writeFileSync(path.join(work, 'app.tsx'), `import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useDecartTryOn } from '@/lib/hooks/useDecartTryOn';
import { useTryOnStore } from '@/lib/stores/TryOnStore';
import { TRY_ON_GARMENTS } from '@/lib/tryon/garments';
import { GARMENTS } from '@/lib/wardrobe';
const test = window.test;
const factory = () => ({ realtime: { connect: async (stream, options) => {
  test.connects++;
  const client = { disconnect: () => { test.disconnects++; }, on: () => {}, set: async state => {
    test.updates.push({ prompt: state.prompt, type: state.image.type, enhance: state.enhance });
    if (test.mode === 'hung') await new Promise(() => {});
    if (test.mode === 'no-frame') test.pauseFrames = true;
  }};
  if (test.mode === 'late') await new Promise(resolve => { test.release = resolve; });
  options.onConnectionChange('connected'); if (test.mode !== 'no-stream') options.onRemoteStream(stream.clone());
  return client;
}} });
function App() {
  const index = useTryOnStore(s => s.activeGarmentIndex);
  const select = useTryOnStore(s => s.selectGarment);
  const garment = TRY_ON_GARMENTS[index];
  const ar = useDecartTryOn(garment.id, factory);
  return <main data-status={ar.status} data-busy={ar.swapPending} data-ready={ar.remoteReady} data-camera={ar.cameraReady}>
    <video ref={ar.video} autoPlay muted playsInline />
    <video ref={ar.localVideo} autoPlay muted playsInline />
    {!ar.remoteReady && !ar.cameraReady && <img alt="fallback" src={garment.imagePath} />}
    {ar.frozenFrame && <img alt="previous" src={ar.frozenFrame} />}
    {ar.swapPending && <p role="status">AI 正在为您换装...</p>}
    <p role="alert">{ar.error}</p>
    <p id="carbon">{GARMENTS.find(g => g.id === garment.id).kg}</p>
    <button id="start" onClick={ar.start}>start</button><button id="stop" onClick={ar.stop}>stop</button>
    {TRY_ON_GARMENTS.map((g, i) => <button key={g.id} disabled={ar.swapPending} data-id={g.id} onClick={() => select(i)}>{g.name}</button>)}
  </main>;
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);`);

async function main() {
  await new Promise((resolve, reject) => compiler.webpack({
    mode: 'development', target: 'web', entry: path.join(work, 'app.tsx'), devtool: false,
    output: { path: work, filename: 'bundle.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@': root, '@decartai/sdk': path.join(work, 'sdk.js') } },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(work, 'loader.cjs') }] },
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const server = http.createServer((req, res) => {
    if (req.url === '/api/decart/token' || req.url === '/api/decart-token') { res.setHeader('Content-Type', 'application/json'); return res.end('{"apiKey":"test-only-token"}'); }
    const file = req.url === '/bundle.js' ? path.join(work, 'bundle.js')
      : req.url.startsWith('/garments/') ? path.join(root, 'public/garments', path.basename(req.url)) : null;
    if (file && fs.existsSync(file)) { res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'image/png'); return fs.createReadStream(file).pipe(res); }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<meta charset="utf-8"><div id="root"></div><script src="/bundle.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server'] });
  try {
    async function page(mode = 'success') {
      const p = await browser.newPage();
      await p.addInitScript(mode => {
        window.test = { mode, connects: 0, disconnects: 0, updates: [], pauseFrames: false, stopped: 0 };
        const test = window.test;
        Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => {
          if (test.mode === 'denied') throw new DOMException('Permission denied', 'NotAllowedError');
          const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 240;
          const ctx = canvas.getContext('2d'); let alive = true;
          const media = canvas.captureStream(0); const track = media.getVideoTracks()[0];
          const stop = track.stop.bind(track); track.stop = () => { alive = false; test.stopped++; stop(); };
          let frame = 0;
          function tick() { if (!alive) return; if (!test.pauseFrames) { ctx.fillStyle = frame++ % 2 ? '#346' : '#357'; ctx.fillRect(0, 0, 320, 240); track.requestFrame(); } setTimeout(tick, 33); }
          tick(); return media;
        } } });
      }, mode);
      await p.goto(base);
      await p.locator('#start').waitFor();
      return p;
    }
    const p = await page();
    await p.locator('#start').click();
    await expect(p.locator('main')).toHaveAttribute('data-ready', 'true');
    assert(await p.evaluate(() => { const videos = document.querySelectorAll('video'); return videos[0].srcObject && videos[1].srcObject && videos[0].srcObject !== videos[1].srcObject; }), 'local and remote video must use distinct streams');
    for (const [id, carbon] of [['longsleeve', '13.2'], ['coat', '101'], ['shorts', '25.1']]) {
      await p.locator(`[data-id="${id}"]`).click();
      await expect(p.locator('#carbon')).toHaveText(carbon);
      await expect(p.locator('main')).toHaveAttribute('data-busy', 'true');
      await expect(p.locator('[data-id="tshirt"]')).toBeDisabled();
      await expect(p.getByRole('status')).toHaveText('AI 正在为您换装...');
      await expect(p.locator('main')).toHaveAttribute('data-busy', 'false', { timeout: 4500 });
      await expect(p.locator('main')).toHaveAttribute('data-ready', 'true');
    }
    assert.equal(await p.evaluate(() => window.test.connects), 1, 'switching should retain the connection');
    const updates = await p.evaluate(() => window.test.updates);
    assert.deepEqual(updates.map(u => u.enhance), [false, false, false]);
    assert(updates.every(u => u.type === 'image/png'));
    assert(updates[2].prompt.includes('blue Nike casual shorts'));
    console.log('PASS: 3 swaps, immediate data, PNG + exact prompt, 2-second lock, one connection');
    await p.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(p.getByRole('alert')).toContainText('网络已断开');
    await expect(p.locator('main')).toHaveAttribute('data-camera', 'true');
    assert.equal(await p.evaluate(() => window.test.stopped), 0);
    await p.locator('#stop').click();
    assert(await p.evaluate(() => window.test.stopped > 0));
    console.log('PASS: offline preserves local camera; stop releases it');
    await p.close();
    for (const mode of ['hung', 'no-frame']) {
      const q = await page(mode);
      await q.locator('#start').click();
      await expect(q.locator('main')).toHaveAttribute('data-ready', 'true');
      await q.locator('[data-id="shorts"]').click();
      await expect(q.getByRole('alert')).toContainText('云端 AI 繁忙', { timeout: 6500 });
      await expect(q.locator('main')).toHaveAttribute('data-busy', 'false');
      await expect(q.locator('[data-id="coat"]')).toBeEnabled();
      await expect(q.locator('main')).toHaveAttribute('data-camera', 'true');
      console.log(`PASS: 5-second cutoff for ${mode}, no permanent loading or queued requests`);
      await q.close();
    }
    const denied = await page('denied');
    await denied.locator('#start').click();
    await expect(denied.getByRole('alert')).toContainText('摄像头权限被拒绝');
    await expect(denied.getByAltText('fallback')).toBeVisible();
    console.log('PASS: camera rejection preserves product fallback and actionable permission message');
    await denied.close();
    const late = await page('late');
    await late.locator('#start').click();
    await expect(late.locator('main')).toHaveAttribute('data-status', 'connecting');
    await late.locator('#stop').click();
    await late.evaluate(() => window.test.release());
    await expect(late.locator('main')).toHaveAttribute('data-status', 'idle');
    await expect(late.locator('main')).toHaveAttribute('data-ready', 'false');
    await expect.poll(() => late.evaluate(() => window.test.disconnects)).toBeGreaterThan(0);
    console.log('PASS: late connect after stop cannot re-open stream');
    await late.close();
    const noStream = await page('no-stream');
    await noStream.clock.install();
    await noStream.locator('#start').click();
    await expect(noStream.locator('main')).toHaveAttribute('data-status', 'connecting');
    await noStream.clock.fastForward(31000);
    await expect(noStream.getByRole('alert')).toContainText('连接超时');
    await expect(noStream.locator('main')).toHaveAttribute('data-camera', 'true');
    await noStream.locator('#stop').click();
    assert(await noStream.evaluate(() => window.test.stopped > 0));
    console.log('PASS: connection without remote video times out; camera remains available until stopped');
    await noStream.close();
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
