// All upstream requests are mocked. This script cannot contact Volcengine.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (id, ...rest) { return originalResolve.call(this, id.startsWith('@/') ? path.join(root, id.slice(2)) : id, ...rest); };
require.extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { speechText } = require('../lib/speech/text.ts');
const { jsonLines } = require('../lib/speech/protocol.ts');
const base = 'http://localhost:3011';
const encoder = new TextEncoder();
let calls = 0, last;
let fake = async () => new Response('{"code":0,"data":"AAAAAA=="}\n{"code":20000000}\n');
global.fetch = async (url, init) => { calls++; last = { url, init }; return fake(url, init); };
function fresh() {
  delete require.cache[require.resolve('../lib/server/doubaoTts.ts')];
  return require('../lib/server/doubaoTts.ts');
}
function request(body = { text: '你好，今天的碳排放是6.43 kg CO₂e。' }, options = {}) {
  return new Request(base + '/api/tts', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', ...options.headers }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: options.signal });
}
function splitStream(text) {
  const bytes = encoder.encode(text); let i = 0;
  return new ReadableStream({ pull(c) { if (i === bytes.length) c.close(); else { c.enqueue(bytes.slice(i, i + 7)); i = Math.min(i + 7, bytes.length); } } });
}
(async () => {
  assert.equal(speechText('**2026-11-03** 的排放为 6.43 kg CO₂e[1]，用电 2 kWh。'), '2026年11月03日 的排放为 6.43 千克二氧化碳当量，用电 2 千瓦时。');
  assert.equal(speechText('[原文](https://example.com) 6*52 × 27'), '原文 6乘52 乘 27');
  assert(!speechText('```js\nsecret()\n```').includes('secret'));
  const decoded = [];
  for await (const packet of jsonLines(splitStream('{"data":"中文"}\r\n{"code":0}'))) decoded.push(packet);
  assert.deepEqual(decoded, [{ data: '中文' }, { code: 0 }]);
  console.log('PASS text: Chinese/mixed units/dates/citations/Markdown, fragmented UTF-8 and final line');

  delete process.env.VOLCENGINE_TTS_API_KEY;
  assert.equal(fresh().ttsConfig().configured, false);
  assert.equal((await fresh().synthesize(request())).status, 503);
  assert.equal(calls, 0);
  process.env.VOLCENGINE_TTS_API_KEY = 'TEST_ONLY_NEW_SPEECH_KEY';
  let server = fresh();
  assert.equal((await server.synthesize(request(undefined, { headers: { Origin: 'https://attacker.invalid' } }))).status, 403);
  assert.equal((await server.synthesize(request({ text: '' }))).status, 400);
  assert.equal((await server.synthesize(request('{'))).status, 400);
  assert.equal((await server.synthesize(request({ text: 'a'.repeat(2501) }))).status, 413);
  assert.equal((await server.synthesize(request({ text: '你好', voice: 'cloned_voice' }))).status, 400);
  assert.equal((await server.synthesize(request({ text: '你好' }, { headers: { 'Content-Type': 'text/plain' } }))).status, 415);
  assert.equal(calls, 0);
  const localAlias = new Request('http://localhost:3011/api/tts', { method: 'POST', headers: { Origin: 'http://127.0.0.1:3011', Host: '127.0.0.1:3011', 'Content-Type': 'application/json' }, body: JSON.stringify({ text: '' }) });
  assert.equal((await fresh().synthesize(localAlias)).status, 400);
  assert.equal(calls, 0);
  const hostileAlias = new Request('http://localhost:3011/api/tts', { method: 'POST', headers: { Origin: 'https://attacker.invalid', Host: '127.0.0.1:3011', 'Content-Type': 'application/json' }, body: JSON.stringify({ text: '' }) });
  assert.equal((await fresh().synthesize(hostileAlias)).status, 403);
  assert.equal(calls, 0);
  console.log('PASS validation: missing key, cross origin, empty/invalid/oversized text, unsupported voice and content type; no upstream calls');

  for (const status of [401, 403, 429, 503]) {
    fake = async () => new Response('TEST_ONLY_NEW_SPEECH_KEY should never be reflected', { status });
    const res = await fresh().synthesize(request());
    assert.equal(res.status, status === 503 ? 502 : status);
    assert(!(await res.text()).includes('TEST_ONLY_NEW_SPEECH_KEY'));
  }
  console.log('PASS provider auth/permission/rate-limit/5xx handling; upstream credentials never reflected');

  fake = async () => new Response(splitStream('{"code":0,"data":"AAAAAA=="}\n{"code":0,"data":"AAAAAA=="}\n{"code":20000000,"usage":{"text_words":5}}\n'));
  const res = await fresh().synthesize(request());
  assert.equal(res.status, 200);
  const output = await res.text();
  assert.match(output, /"type":"audio"/); assert.match(output, /"type":"done"/);
  assert(!output.includes('TEST_ONLY_NEW_SPEECH_KEY'));
  assert.equal(last.url, 'https://openspeech.bytedance.com/api/v3/tts/unidirectional');
  assert.equal(last.init.headers['X-Api-Key'], 'TEST_ONLY_NEW_SPEECH_KEY');
  assert.equal(last.init.headers['X-Api-Resource-Id'], 'seed-tts-2.0');
  const body = JSON.parse(last.init.body);
  assert.equal(body.req_params.audio_params.format, 'pcm');
  assert.equal(body.req_params.audio_params.sample_rate, 24000);
  assert.equal(body.req_params.audio_params.speech_rate, -5);
  assert.equal(body.req_params.speaker, 'zh_female_vv_uranus_bigtts');
  assert.equal(JSON.parse(body.req_params.additions).post_process.pitch, 0);
  assert(!body.req_params.text.includes('[1]'));
  assert(!JSON.stringify(fresh().ttsConfig()).includes('TEST_ONLY_NEW_SPEECH_KEY'));
  console.log('PASS streaming request/response: official endpoint and X-Api-Key, resource 2.0, PCM 24kHz, no credentials in public config');

  fake = async () => new Response('{"code":0,"data":"AAAAAA=="}\n');
  assert.match(await (await fresh().synthesize(request())).text(), /"type":"error"/);
  fake = async () => new Response('{"code":0,"data":"AAAAAA=="}\n{"code":45000000,"message":"TEST_ONLY_NEW_SPEECH_KEY"}\n');
  const interrupted = await (await fresh().synthesize(request())).text();
  assert.match(interrupted, /"type":"error"/); assert(!interrupted.includes('TEST_ONLY_NEW_SPEECH_KEY'));
  console.log('PASS incomplete/error streams: explicit failure envelope instead of false completion');

  fake = async (_url, init) => { throw new DOMException('Timeout', 'AbortError'); };
  assert.equal((await fresh().synthesize(request())).status, 504);
  console.log('PASS upstream timeout -> HTTP 504');

  let aborted = false;
  fake = async (_url, init) => {
    init.signal.addEventListener('abort', () => { aborted = true; });
    return new Response(new ReadableStream({ start(c) { c.enqueue(encoder.encode('{"code":0,"data":"AAAAAA=="}\n')); } }));
  };
  const cancellation = await fresh().synthesize(request());
  await cancellation.body.cancel(); assert(aborted);
  console.log('PASS client cancellation aborts the upstream synthesis');

  process.env.VOLCENGINE_TTS_MAX_CHARS_PER_HOUR = '0';
  const before = calls;
  assert.equal((await fresh().synthesize(request())).status, 429); assert.equal(calls, before);
  delete process.env.VOLCENGINE_TTS_MAX_CHARS_PER_HOUR;
  server = fresh();
  const held = await server.synthesize(request());
  const held2 = await server.synthesize(request());
  assert.equal((await server.synthesize(request())).status, 429);
  await held.body.cancel(); await held2.body.cancel();
  console.log('PASS zero spending budget and concurrent-request limits block calls before upstream');
  console.log('ALL SERVER TESTS PASSED. Real TTS requests: 0.');
})().catch(e => { console.error(e); process.exitCode = 1; });
