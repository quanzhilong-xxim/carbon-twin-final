const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium, expect } = require('@playwright/test');
const base = process.env.TTS_TEST_URL || 'http://localhost:3020';
const work = 'work/tts/page'; fs.mkdirSync(work, { recursive: true });
const pcm = Buffer.alloc(24000 * 2 * 8);
for (let i = 0; i < 24000 * 8; i++) pcm.writeInt16LE(Math.round(Math.sin(i / 24000 * 2 * Math.PI * 440) * 1000), i * 2);
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-proxy-server', '--autoplay-policy=no-user-gesture-required'] });
  let requests = 0;
  const errors = [];
  try {
    for (const [device, viewport] of [['desktop', { width: 1365, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
      const page = await browser.newPage({ viewport });
      page.setDefaultNavigationTimeout(60000);
      page.on('pageerror', e => errors.push(e.message));
      // No Decart calls. TTS stays local and uses generated PCM in this integration test.
      await page.route('**/api/decart/credits', r => r.fulfill({ json: { credits: null, minimumCredits: null } }));
      await page.route('**/api/decart/quota', r => r.fulfill({ json: { limit: null, active: null, remaining: null } }));
      await page.route('**/api/tts', r => {
        if (r.request().method() === 'GET') return r.fulfill({ json: { configured: true } });
        requests++;
        const body = r.request().postDataJSON();
        assert(typeof body.text === 'string' && body.text.length > 0);
        assert(!/api.?key|access.?key/i.test(JSON.stringify(body)));
        return r.fulfill({ contentType: 'application/x-ndjson', body: JSON.stringify({ type: 'audio', data: pcm.toString('base64') }) + '\n{"type":"done"}\n' });
      });
      const response = await page.goto(base + '/workspace', { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200);
      await expect(page.locator('.garment-options button').first()).toBeEnabled();
      await expect(page.getByRole('button', { name: '开启穿搭语音', exact: true })).toBeEnabled();
      assert.equal(requests, device === 'desktop' ? 0 : 2, 'no synthesis on page load');
      await page.getByRole('button', { name: '开启穿搭语音', exact: true }).click();
      const wardrobe = page.locator('.wardrobe-voice');
      await expect(wardrobe.getByLabel('语音方式')).toBeVisible();
      await wardrobe.getByLabel('豆包音色').selectOption('zh_female_xiaohe_uranus_bigtts');
      await wardrobe.getByRole('button', { name: '听听建议 ↗' }).click();
      await expect(wardrobe.getByRole('button', { name: '停止朗读', exact: true })).toBeVisible();
      await wardrobe.screenshot({ path: `${work}/${device}-wardrobe.png` });
      await wardrobe.getByRole('button', { name: '停止朗读', exact: true }).click();
      assert.equal(await page.locator('#local-camera-preview').evaluate(v => v.srcObject === null), true);
      assert.equal(await page.locator('#ai-tryon-video').evaluate(v => v.srcObject === null), true);
      console.log(`PASS ${device}: wardrobe cloud-voice selection/play/stop, both video windows preserved and remain off`);

      await page.getByRole('button', { name: '打开碳知识 AI 教练', exact: true }).click();
      const chat = page.locator('#ai-chat-panel');
      await expect(chat.getByLabel('语音方式')).toBeVisible();
      // A question without retrieval evidence uses the existing local refusal path;
      // this checks the actual chat route/SSE without calling DeepSeek or any model.
      await chat.getByLabel('向碳知识教练提问').fill('zzqxv8873');
      await chat.getByRole('button', { name: '发送问题', exact: true }).click();
      await expect(chat.locator('.chat-message.assistant')).toContainText('当前检索资料不足', { timeout: 20000 });
      await expect(chat.getByRole('button', { name: '朗读回复', exact: true }).last()).toBeVisible();
      await chat.getByRole('button', { name: '朗读回复', exact: true }).last().click();
      await expect(chat.locator('.speech-controls')).toContainText('豆包语音 · 正在朗读');
      await chat.screenshot({ path: `${work}/${device}-chat.png` });
      const bounds = await chat.boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width + 1);
      const input = await chat.locator('.chat-input').boundingBox();
      assert(input.y >= 0 && input.y + input.height < viewport.height, 'chat input must remain on screen');
      await page.getByRole('button', { name: '关闭 AI 聊天窗', exact: true }).click();
      await expect(chat).not.toBeVisible();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      console.log(`PASS ${device}: actual chat SSE refusal path, manual reply reading, close cleanup, input visible and no horizontal overflow`);
      await page.close();
    }
    const context = await browser.newContext();
    const config = await context.request.get(base + '/api/tts');
    assert.equal(config.status(), 200); const publicConfig = await config.json();
    assert(!/api.?key|access.?key|secret|token/i.test(Object.keys(publicConfig).join(' ')));
    assert.equal(publicConfig.model, 'seed-tts-2.0');
    console.log(`REAL ROUTE: GET /api/tts HTTP ${config.status()}, configured=${publicConfig.configured}; credentials omitted`);
    // Only test POST when no key exists. Never synthesize against a configured account.
    if (!publicConfig.configured) {
      const unavailable = await context.request.post(base + '/api/tts', { headers: { Origin: base }, data: { text: '测试' } });
      assert.equal(unavailable.status(), 503);
      console.log('PASS actual route: unconfigured POST returns 503 without a provider call');
    }
    assert.deepEqual(errors, []);
    await context.close();
    console.log('ALL PAGE TESTS PASSED. Real cloud TTS and real Decart connections: 0.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
