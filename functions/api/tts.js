// CarbonTwin / DOUBAO TTS
// Cloudflare Pages Function: GET /api/tts (status) + POST /api/tts (audio/wav)
// Uses the Volcengine speech v3 endpoint already proven by the project.
// The API key is read only from the Cloudflare runtime env; never returned.

const ENDPOINT = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';
const MODEL = 'seed-tts-2.0';
const SAMPLE_RATE = 24000;
const MAX_TEXT = 2500;
const MAX_BODY = 20000;
const MAX_AUDIO = 24 * 1024 * 1024;
const VOICES = [
  { id: 'zh_female_vv_uranus_bigtts', name: 'Vivi 2.0 · 日常交流' },
  { id: 'zh_female_xiaohe_uranus_bigtts', name: '小何 2.0 · 清晰女声' },
  { id: 'zh_male_m191_uranus_bigtts', name: '云舟 2.0 · 沉稳男声' },
];

const buckets = new Map();
let active = 0;

function intEnv(env, name, fallback, min, max) {
  const raw = (env[name] || '').trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

function config(env) {
  const speaker = (env.VOLCENGINE_TTS_SPEAKER || '').trim();
  return {
    configured: Boolean((env.VOLCENGINE_TTS_API_KEY || '').trim()),
    model: MODEL,
    speaker: VOICES.some(voice => voice.id === speaker) ? speaker : VOICES[0].id,
    speechRate: intEnv(env, 'VOLCENGINE_TTS_SPEECH_RATE', -5, -50, 100),
    loudnessRate: intEnv(env, 'VOLCENGINE_TTS_LOUDNESS_RATE', 0, -50, 100),
    pitch: intEnv(env, 'VOLCENGINE_TTS_PITCH', 0, -12, 12),
    sampleRate: SAMPLE_RATE,
    maxText: MAX_TEXT,
    voices: VOICES,
  };
}

function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra },
  });
}

function clientIp(request) {
  return request.headers.get('cf-connecting-ip')
    || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || 'unknown';
}

function reserve(request, chars) {
  const now = Date.now();
  for (const [key, entry] of buckets) if (entry.until <= now) buckets.delete(key);
  const ip = clientIp(request);
  const bucket = buckets.get(ip) || { count: 0, until: now + 60000 };
  if (active >= 2 || bucket.count >= 8) return false;
  bucket.count += 1;
  buckets.set(ip, bucket);
  active += 1;
  return chars > 0;
}

function speechText(value) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT);
}

function base64Bytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function wavFromPcm(pcm) {
  const out = new Uint8Array(44 + pcm.length);
  const view = new DataView(out.buffer);
  const ascii = (offset, text) => { for (let i = 0; i < text.length; i += 1) out[offset + i] = text.charCodeAt(i); };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
}

export async function onRequestGet(context) {
  return json(200, config(context.env));
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get('origin');
  if (origin) {
    try { if (new URL(origin).origin !== new URL(request.url).origin) return json(403, { error: '请求来源无效。' }); }
    catch { return json(403, { error: '请求来源无效。' }); }
  }
  if (request.headers.get('sec-fetch-site') === 'cross-site') return json(403, { error: '请求来源无效。' });
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) {
    return json(415, { error: '请发送 JSON 文本。' });
  }
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_BODY) return json(413, { error: '朗读文本过长。' });
  let raw;
  try { raw = await request.text(); } catch { return json(400, { error: '朗读请求无法读取。' }); }
  if (raw.length > MAX_BODY) return json(413, { error: '朗读文本过长。' });
  let body;
  try { body = JSON.parse(raw); } catch { return json(400, { error: '朗读请求格式无效。' }); }
  if (!body || typeof body.text !== 'string') return json(400, { error: '请输入朗读文本。' });
  if (body.text.length > MAX_TEXT) return json(413, { error: `每次最多朗读 ${MAX_TEXT} 字，请分段播放。` });
  const text = speechText(body.text);
  if (!text) return json(400, { error: '请输入可朗读的文字。' });

  const apiKey = (env.VOLCENGINE_TTS_API_KEY || '').trim();
  if (!apiKey) return json(503, { error: '豆包语音服务端未配置（缺少 VOLCENGINE_TTS_API_KEY），可切换系统语音。' });
  const cfg = config(env);
  const speaker = typeof body.voice === 'string' && VOICES.some(voice => voice.id === body.voice) ? body.voice : cfg.speaker;
  if (!reserve(request, text.length)) return json(429, { error: '语音请求达到保护上限，请稍后再试或使用系统语音。' });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  const onAbort = () => controller.abort();
  request.signal.addEventListener('abort', onAbort, { once: true });
  let pcmBytes = 0;
  let audio = [];
  try {
    const upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
        'X-Api-Resource-Id': MODEL,
        'X-Api-Request-Id': crypto.randomUUID(),
        'X-Control-Require-Usage-Tokens-Return': '*',
      },
      body: JSON.stringify({
        req_params: {
          text,
          speaker,
          audio_params: { format: 'pcm', sample_rate: SAMPLE_RATE, speech_rate: cfg.speechRate, loudness_rate: cfg.loudnessRate },
          additions: JSON.stringify({
            explicit_language: 'zh-cn',
            disable_markdown_filter: true,
            silence_duration: 100,
            post_process: { pitch: cfg.pitch },
            context_texts: ['请用自然、温柔、清晰的普通话与用户交流，语气平和，停顿适当，不要夸张播音。'],
          }),
        },
      }),
      signal: controller.signal,
    });
    const upstreamText = await upstream.text();
    if (!upstream.ok) {
      const status = upstream.status;
      const error = status === 401 ? '火山引擎豆包语音鉴权失败（401），请检查服务端 API Key。'
        : status === 403 ? '豆包语音拒绝请求（403），请在豆包控制台核对凭证归属、服务授权与额度。'
        : status === 429 ? '豆包语音请求过于频繁或额度受限（429），请稍后再试。'
        : `豆包语音服务暂不可用（HTTP ${status}）。`;
      return json(status === 429 ? 429 : status === 401 ? 401 : status === 403 ? 403 : 502, { error }, { 'X-Audio-Engine': 'doubao-seed-tts-2.0' });
    }
    let complete = false;
    for (const line of upstreamText.split(/\r?\n/)) {
      if (!line.trim()) continue;
      let packet;
      try { packet = JSON.parse(line); } catch { continue; }
      if (packet && typeof packet.code === 'number' && packet.code !== 0 && packet.code !== 20000000) {
        return json(502, { error: `豆包语音合成失败（代码 ${packet.code}），请检查服务权限与可用额度。` }, { 'X-Audio-Engine': 'doubao-seed-tts-2.0' });
      }
      if (packet && typeof packet.data === 'string' && packet.data.length) {
        const bytes = base64Bytes(packet.data);
        pcmBytes += bytes.length;
        if (pcmBytes > MAX_AUDIO) return json(413, { error: '语音长度超出保护上限。' });
        audio.push(bytes);
      }
      if (packet && packet.code === 20000000) { complete = true; break; }
    }
    if (!pcmBytes) return json(502, { error: '豆包未返回可播放音频，请稍后重试或切换系统语音。' }, { 'X-Audio-Engine': 'doubao-seed-tts-2.0' });
    if (!complete) return json(502, { error: '豆包语音流未完整结束，未播放空音频。' }, { 'X-Audio-Engine': 'doubao-seed-tts-2.0' });
    const pcm = new Uint8Array(pcmBytes);
    let offset = 0;
    for (const chunk of audio) { pcm.set(chunk, offset); offset += chunk.length; }
    const wav = wavFromPcm(pcm);
    return new Response(wav, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(wav.length),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Audio-Sample-Rate': String(SAMPLE_RATE),
        'X-Audio-Engine': 'doubao-seed-tts-2.0',
        'X-Audio-Bytes': String(pcmBytes),
      },
    });
  } catch (error) {
    const timedOut = error && (error.name === 'AbortError' || error.name === 'TimeoutError');
    return json(timedOut ? 504 : 502, { error: timedOut ? '豆包语音连接超时，请检查网络后重试。' : '豆包语音合成未完成，请检查服务端凭证与网络。' }, { 'X-Audio-Engine': 'doubao-seed-tts-2.0' });
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener('abort', onAbort);
    active = Math.max(0, active - 1);
  }
}
