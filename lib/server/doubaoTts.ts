import { TTS_MAX_TEXT, TTS_SAMPLE_RATE, TTS_VOICES } from '@/lib/speech/catalog';
import { speechText } from '@/lib/speech/text';
import { jsonLines } from '@/lib/speech/protocol';

const ENDPOINT = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const failure = (error: string, status: number) => Response.json({ error }, { status, headers });

function integer(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

export function ttsConfig() {
  const speaker = process.env.VOLCENGINE_TTS_SPEAKER?.trim();
  return {
    configured: Boolean(process.env.VOLCENGINE_TTS_API_KEY?.trim()),
    model: 'seed-tts-2.0',
    speaker: TTS_VOICES.find(v => v.id === speaker)?.id ?? TTS_VOICES[0].id,
    speechRate: integer('VOLCENGINE_TTS_SPEECH_RATE', -5, -50, 100),
    loudnessRate: integer('VOLCENGINE_TTS_LOUDNESS_RATE', 0, -50, 100),
    pitch: integer('VOLCENGINE_TTS_PITCH', 0, -12, 12),
    sampleRate: TTS_SAMPLE_RATE,
    maxText: TTS_MAX_TEXT,
    voices: TTS_VOICES,
  };
}

// Per warm server instance, not a distributed billing limit. Production account-side
// quotas should also be set in Volcengine. No retries and at most two upstream streams.
const buckets = new Map<string, { count: number; until: number }>();
let active = 0;
let hourly = { characters: 0, until: 0 };
function reserve(request: Request, characters: number) {
  const now = Date.now();
  for (const [key, entry] of buckets) if (entry.until <= now) buckets.delete(key);
  const ip = request.headers.get('x-nf-client-connection-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const bucket = buckets.get(ip) ?? { count: 0, until: now + 60000 };
  if (active >= 2 || bucket.count >= 8 || buckets.size > 10000) return false;
  if (hourly.until <= now) hourly = { characters: 0, until: now + 3600000 };
  if (hourly.characters + characters > integer('VOLCENGINE_TTS_MAX_CHARS_PER_HOUR', 30000, 0, 1000000)) return false;
  bucket.count++; buckets.set(ip, bucket); active++; hourly.characters += characters;
  return true;
}

function providerFailure(status: number) {
  if (status === 401) return failure('火山引擎豆包语音鉴权失败，请核对服务端 API Key 的产品归属与启用状态。', 401);
  if (status === 403) return failure('火山引擎豆包语音拒绝请求（HTTP 403），请在豆包语音控制台核对凭证归属、服务授权和额度；此状态不能单独确定余额。', 403);
  if (status === 429) return failure('豆包语音请求过于频繁或额度受限，请稍后再试。', 429);
  return failure(`豆包语音服务暂不可用（HTTP ${status}）。`, 502);
}

class ProviderPacketError extends Error {}
function checkPacket(packet: Record<string, unknown>) {
  if (packet.code !== 0 && packet.code !== 20000000) {
    const code = typeof packet.code === 'number' ? packet.code : 'unknown';
    // Never reflect provider error.message: it may contain credentials or input.
    throw new ProviderPacketError(`豆包语音合成失败（代码 ${code}），请检查服务权限与可用额度。`);
  }
}

export async function synthesize(request: Request) {
  // Next's local request URL can use localhost even when the browser requested
  // 127.0.0.1. Behind the Cloudflare tunnel the TLS terminates at the edge, so the
  // public scheme/host only exist in the forwarded headers; honour both or every
  // public TTS request is rejected as cross-origin.
  const requested = new URL(request.url);
  const first = (value: string | null) => value?.split(',')[0]?.trim() || '';
  const forwardedHost = first(request.headers.get('x-forwarded-host'));
  const forwardedProto = first(request.headers.get('x-forwarded-proto')) || (() => {
    try { return JSON.parse(request.headers.get('cf-visitor') ?? '{}').scheme ?? ''; } catch { return ''; }
  })();
  const host = forwardedHost || request.headers.get('host');
  if (host) requested.host = host;
  if (forwardedProto === 'https' || forwardedProto === 'http') requested.protocol = forwardedProto + ':';
  const origin = request.headers.get('origin') ?? '';
  const sameOrigin = origin === requested.origin || (Boolean(request.headers.get('host')) && origin === `${requested.protocol}//${request.headers.get('host')}`);
  if (!sameOrigin || request.headers.get('sec-fetch-site') === 'cross-site') return failure('请求来源无效。', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return failure('请发送 JSON 文本。', 415);
  let payload: unknown;
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 20000) return failure('朗读文本过长。', 413);
    const reader = request.body?.getReader();
    if (!reader) return failure('朗读文本为空。', 400);
    let raw = ''; let size = 0; const decoder = new TextDecoder();
    try {
      while (true) {
        const next = await reader.read(); if (next.done) break;
        size += next.value.byteLength;
        if (size > 20000) { await reader.cancel(); return failure('朗读文本过长。', 413); }
        raw += decoder.decode(next.value, { stream: true });
      }
      payload = JSON.parse(raw + decoder.decode());
    } finally { reader.releaseLock(); }
  } catch { return failure('朗读请求格式无效。', 400); }
  if (!payload || typeof payload !== 'object' || !('text' in payload) || typeof payload.text !== 'string') return failure('请输入朗读文本。', 400);
  if (payload.text.length > TTS_MAX_TEXT) return failure(`每次最多朗读 ${TTS_MAX_TEXT} 字，请分段播放。`, 413);
  const text = speechText(payload.text);
  if (!text) return failure('请输入可朗读的文字。', 400);
  const config = ttsConfig();
  const apiKey = process.env.VOLCENGINE_TTS_API_KEY?.trim();
  if (!apiKey) return failure('当前服务端未读取到豆包语音 API Key，请检查该服务的环境变量加载；可切换系统语音。', 503);
  const speaker = 'voice' in payload ? payload.voice : config.speaker;
  if (!TTS_VOICES.some(v => v.id === speaker)) return failure('请选择支持的豆包音色。', 400);
  if (!reserve(request, text.length)) return failure('语音请求达到保护上限，请稍后再试或使用系统语音。', 429);

  const abort = new AbortController();
  const cancelled = () => abort.abort();
  request.signal.addEventListener('abort', cancelled, { once: true });
  if (request.signal.aborted) abort.abort();
  const timeout = setTimeout(() => abort.abort(), 90000);
  const firstByteTimeout = setTimeout(() => abort.abort(), 15000);
  let released = false;
  const release = () => {
    if (released) return; released = true;
    clearTimeout(timeout); clearTimeout(firstByteTimeout);
    request.signal.removeEventListener('abort', cancelled);
    active--;
  };
  let packets: AsyncGenerator<Record<string, unknown>> | undefined;
  try {
    const upstream = await fetch(ENDPOINT, {
      method: 'POST', cache: 'no-store', signal: abort.signal,
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey, 'X-Api-Resource-Id': config.model, 'X-Api-Request-Id': crypto.randomUUID(), 'X-Control-Require-Usage-Tokens-Return': '*' },
      body: JSON.stringify({ req_params: {
        text, speaker,
        audio_params: { format: 'pcm', sample_rate: TTS_SAMPLE_RATE, speech_rate: config.speechRate, loudness_rate: config.loudnessRate },
        additions: JSON.stringify({ explicit_language: 'zh-cn', disable_markdown_filter: true, silence_duration: 100, post_process: { pitch: config.pitch }, context_texts: ['请用自然、温柔、清晰的普通话与用户交流，语气平和，停顿适当，不要夸张播音。'] }),
      } }),
    });
    if (!upstream.ok) { await upstream.body?.cancel(); abort.abort(); release(); return providerFailure(upstream.status); }
    if (!upstream.body) throw new Error('豆包未返回音频。');
    packets = jsonLines(upstream.body);
    // Inspect the first audio before sending headers, so auth/parameter errors are JSON errors.
    let first: Record<string, unknown> | undefined;
    while (true) {
      const next = await packets.next();
      if (next.done) throw new Error('豆包未返回可播放音频。');
      checkPacket(next.value);
      if (typeof next.value.data === 'string' && next.value.data.length) { first = next.value; break; }
      if (next.value.code === 20000000) throw new Error('豆包未返回可播放音频。');
    }
    clearTimeout(firstByteTimeout);
    // Buffer the whole utterance and answer with one WAV response. Streamed NDJSON chunks
    // were abandoned by the browser behind the review tunnel (ERR_ABORTED at the 90s client
    // timeout), while a single ~200 KB audio/wav body completes reliably.
    const pcmChunks: Buffer[] = [];
    let total = 0;
    const push = (packet: Record<string, unknown>) => {
      if (typeof packet.data === 'string' && packet.data.length) {
        const buf = Buffer.from(packet.data, 'base64');
        pcmChunks.push(buf); total += buf.length;
      }
    };
    push(first as Record<string, unknown>);
    while (true) {
      const next = await packets.next();
      if (next.done) break;
      checkPacket(next.value);
      push(next.value);
      if (next.value.code === 20000000) break;
    }
    abort.abort(); release();
    if (!total) return failure('豆包未返回可播放音频，请稍后重试或切换系统语音。', 502);
    const sampleRate = TTS_SAMPLE_RATE, dataSize = total;
    const wav = Buffer.alloc(44 + dataSize);
    wav.write('RIFF', 0); wav.writeUInt32LE(36 + dataSize, 4); wav.write('WAVE', 8);
    wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28); wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(dataSize, 40);
    let offset = 44;
    for (const chunk of pcmChunks) { chunk.copy(wav, offset); offset += chunk.length; }
    return new Response(wav, { status: 200, headers: {
      ...headers,
      'Content-Type': 'audio/wav',
      'Content-Length': String(wav.length),
      'Cache-Control': 'no-store',
      'X-Audio-Sample-Rate': String(sampleRate),
      'X-Audio-Engine': 'doubao-seed-tts-2.0',
    } });
  } catch (error) {
    abort.abort(); release();
    if (packets) void packets.return(undefined).catch(() => undefined);
    // Deliberately never log provider responses, request text, or credentials.
    const timedOut = error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
    if (error instanceof ProviderPacketError) return failure(error.message, 502);
    return failure(timedOut ? '豆包语音连接超时，请检查网络后重试。' : '豆包语音合成未完成，请检查服务端凭证读取、服务权限和网络。', timedOut ? 504 : 502);
  }
}
