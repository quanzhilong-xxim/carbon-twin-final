'use client';

import { TTS_MAX_TEXT, TTS_SAMPLE_RATE, type SpeechMode } from './catalog';
import { jsonLines } from './protocol';
import { speechText } from './text';

export type Playback = {
  owner: string;
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  notice: string;
  engine: string;
  activated: boolean;
  autoSpeak: boolean;
  volume: number;
  muted: boolean;
  canReplay: boolean;
};
// autoSpeak is shared state, not per-hook state: the speech controls and the chat
// window are separate components, so a local useState made "回答后自动朗读" silently
// ineffective for the instance that actually triggers playback.
const storedAutoSpeak = () => {
  if (typeof window === 'undefined') return false;
  try { return sessionStorage.getItem('carbon-ai-auto-speak') === 'true'; } catch { return false; }
};
const initial: Playback = { owner: '', status: 'idle', notice: '', engine: '', activated: false, autoSpeak: false, volume: 0.85, muted: false, canReplay: false };
let state: Playback = { ...initial, autoSpeak: storedAutoSpeak() };
const listeners = new Set<() => void>();
let generation = 0;
let controller: AbortController | null = null;
let context: AudioContext | null = null;
let gain: GainNode | null = null;
const sources = new Set<AudioBufferSourceNode>();
let utterance: SpeechSynthesisUtterance | null = null;
let configCache: { configured: boolean; at: number } | null = null;
const audioCache = new Map<string, Uint8Array>();
let cacheBytes = 0;
const CACHE_LIMIT = 24 * 1024 * 1024;
const CACHE_COUNT = 8;
const MAX_PCM_BYTES = TTS_SAMPLE_RATE * 2 * 600;

function publish(next: Playback) { state = next; listeners.forEach(listener => listener()); }
function update(patch: Partial<Playback>) { publish({ ...state, ...patch }); }
function cacheKey(text: string, voice: string) { return `${voice}\u0000${text}`; }
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const Constructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Constructor) return null;
  if (!context || context.state === 'closed') {
    context = new Constructor();
    gain = context.createGain();
    gain.gain.value = state.muted ? 0 : state.volume;
    gain.connect(context.destination);
  }
  return context;
}
function setGain() { if (gain) gain.gain.setTargetAtTime(state.muted ? 0 : state.volume, gain.context.currentTime, 0.015); }

export const subscribeSpeech = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const speechSnapshot = () => state;
export const serverSpeechSnapshot = () => initial;

/** Call directly from the explicit user gesture. It performs no network or provider request. */
export async function activateSpeech(owner: string) {
  try {
    const audio = getAudioContext();
    if (audio) {
      await audio.resume();
      if (audio.state !== 'running') throw new Error('浏览器尚未开放音频播放权限。');
    } else if (typeof window === 'undefined' || !window.speechSynthesis) {
      throw new Error('此浏览器不支持音频播放。');
    }
    update({ activated: true, owner, autoSpeak: true, notice: 'AI语音已开启；后续有效回复会自动朗读。' });
    try { sessionStorage.setItem('carbon-ai-auto-speak', 'true'); } catch { /* Storage may be disabled. */ }
    return true;
  } catch (error) {
    update({ owner, status: 'error', notice: error instanceof Error ? error.message : '开启音频失败，请检查浏览器权限。' });
    return false;
  }
}

export function stopSpeech(owner?: string) {
  if (owner && state.owner !== owner) return;
  generation++;
  controller?.abort(); controller = null;
  for (const source of sources) { try { source.stop(); } catch { /* Already ended. */ } source.disconnect(); }
  sources.clear();
  if (utterance) { utterance.onend = null; utterance.onerror = null; utterance = null; }
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  publish({ ...initial, activated: state.activated, autoSpeak: state.autoSpeak, volume: state.volume, muted: state.muted, canReplay: state.canReplay });
}

/** Shared across every useSpeech() instance so the toggle and the chat window agree. */
export function setSpeechAutoSpeak(next: boolean) {
  update({ autoSpeak: next });
  try { sessionStorage.setItem('carbon-ai-auto-speak', String(next)); } catch { /* The preference stays active for this page. */ }
}

export async function pauseSpeech(owner?: string) {
  if (owner && state.owner !== owner) return;
  if (state.status !== 'playing') return;
  if (state.engine === '系统语音') window.speechSynthesis?.pause();
  else if (context?.state === 'running') await context.suspend().catch(() => undefined);
  update({ status: 'paused' });
}

export async function resumeSpeech(owner?: string) {
  if (owner && state.owner !== owner) return;
  if (state.status !== 'paused') return;
  if (state.engine === '系统语音') window.speechSynthesis?.resume();
  else if (context && context.state !== 'running') await context.resume().catch(() => undefined);
  if (state.engine !== '系统语音' && context?.state !== 'running') {
    update({ status: 'error', notice: '浏览器阻止了音频播放（Autoplay Blocked）。已保留音频，请点击播放已生成语音。' });
    return;
  }
  update({ status: 'playing' });
}

export function setSpeechVolume(volume: number) {
  update({ volume: Math.max(0, Math.min(1, volume)) }); setGain();
  if (utterance) utterance.volume = state.muted ? 0 : state.volume;
}
export function setSpeechMuted(muted: boolean) {
  update({ muted }); setGain();
  if (utterance) utterance.volume = muted ? 0 : state.volume;
}

function concat(chunks: Uint8Array[], length: number) {
  const joined = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.length; }
  return joined;
}
function saveAudio(key: string, pcm: Uint8Array) {
  const previous = audioCache.get(key); if (previous) cacheBytes -= previous.byteLength;
  audioCache.delete(key); audioCache.set(key, pcm); cacheBytes += pcm.byteLength;
  while (audioCache.size > CACHE_COUNT || cacheBytes > CACHE_LIMIT) {
    const oldestKey = audioCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    cacheBytes -= audioCache.get(oldestKey)?.byteLength ?? 0; audioCache.delete(oldestKey);
  }
}

function playPcm(owner: string, run: number, pcm: Uint8Array, audio: AudioContext, notice = '') {
  const current = () => generation === run;
  const totalSamples = pcm.byteLength / 2;
  let sampleIndex = 0, nextStart = audio.currentTime + 0.045;
  const finish = () => {
    if (current() && sampleIndex >= totalSamples && sources.size === 0) update({ owner, status: 'idle', notice: notice || '豆包语音播放完成，可重播缓存音频。', engine: '豆包语音', canReplay: true });
  };
  const pump = () => {
    if (!current()) return;
    while (sources.size < 2 && sampleIndex < totalSamples) {
      const count = Math.min(TTS_SAMPLE_RATE * 5, totalSamples - sampleIndex);
      const buffer = audio.createBuffer(1, count, TTS_SAMPLE_RATE), floats = buffer.getChannelData(0), view = new DataView(pcm.buffer, pcm.byteOffset + sampleIndex * 2, count * 2);
      for (let i = 0; i < count; i++) floats[i] = view.getInt16(i * 2, true) / 32768;
      const source = audio.createBufferSource(); source.buffer = buffer; source.connect(gain ?? audio.destination); sources.add(source);
      source.onended = () => { sources.delete(source); source.disconnect(); if (current()) { pump(); finish(); } };
      const startAt = Math.max(nextStart, audio.currentTime + 0.02);
      source.start(startAt); nextStart = startAt + buffer.duration; sampleIndex += count;
    }
    finish();
  };
  update({ owner, status: 'playing', notice, engine: '豆包语音', canReplay: true });
  pump();
}

function playWav(owner: string, run: number, bytes: Uint8Array, audio: AudioContext, notice = '') {
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  audio.decodeAudioData(copy).then(buffer => {
    if (generation !== run) return;
    const source = audio.createBufferSource();
    source.buffer = buffer; source.connect(gain ?? audio.destination); sources.add(source);
    source.onended = () => {
      sources.delete(source); source.disconnect();
      if (generation === run) update({ owner, status: 'idle', notice: notice || '豆包语音播放完成，可重播缓存音频。', engine: '豆包语音', canReplay: true });
    };
    update({ owner, status: 'playing', notice, engine: '豆包语音', canReplay: true });
    source.start();
  }).catch(() => {
    if (generation !== run) return;
    publish({ ...state, owner, status: 'error', notice: '音频解码失败，已保留音频，请重试或切换系统语音。', engine: '豆包语音', canReplay: true });
  });
}
/** Plays either a buffered WAV (new server format) or raw PCM (legacy NDJSON cache). */
function playAudioBytes(owner: string, run: number, bytes: Uint8Array, audio: AudioContext, notice = '') {
  const isWav = bytes.length > 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  if (isWav) playWav(owner, run, bytes, audio, notice); else playPcm(owner, run, bytes, audio, notice);
}

function playSystemSpeech(owner: string, run: number, text: string, voiceId: string, notice: string) {  if (!window.speechSynthesis) throw new Error('此浏览器不支持系统语音，请切换豆包语音。');
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find(v => v.voiceURI === voiceId) ?? voices.find(v => /^zh/i.test(v.lang) && /Xiaoxiao|晓晓|Tingting|女/i.test(v.name)) ?? voices.find(v => /^zh/i.test(v.lang));
  const chunks = text.match(/[^。！？!?；;]+[。！？!?；;]?|[。！？!?；;]/g) ?? [text];
  const parts = chunks.flatMap(chunk => chunk.match(/[\s\S]{1,180}/g) ?? []);
  let index = 0;
  const next = () => {
    if (generation !== run) return;
    const part = parts[index++];
    if (!part) { utterance = null; update({ owner, status: 'idle', notice: notice || '系统语音播放完成。', engine: '系统语音' }); return; }
    const item = new SpeechSynthesisUtterance(part); utterance = item;
    item.lang = 'zh-CN'; item.voice = voice ?? null; item.rate = 0.95; item.pitch = 1; item.volume = state.muted ? 0 : state.volume;
    item.onstart = () => update({ owner, status: 'playing', notice, engine: '系统语音' });
    item.onend = next;
    item.onerror = () => { if (generation === run) update({ owner, status: 'error', notice: '系统语音播放失败，请点击重试或切换音色。', engine: '系统语音' }); };
    window.speechSynthesis.speak(item);
  };
  next();
}

export async function playSpeech(owner: string, raw: string, options: { mode: SpeechMode; voice: string; deviceVoice: string }) {
  stopSpeech();
  const run = generation, text = speechText(raw);
  if (!text) return;
  const key = cacheKey(text, options.voice);
  const updateRun = (patch: Partial<Playback>) => { if (generation === run) update({ owner, ...patch }); };
  publish({ ...state, owner, status: 'loading', notice: '', engine: '', canReplay: audioCache.has(key) });
  const abort = new AbortController(); controller = abort;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let audio: AudioContext | null = null;
  try {
    if (options.mode !== 'browser') {
      audio = getAudioContext();
      if (!audio) throw new Error('此浏览器无法播放豆包音频，请切换系统语音。');
      if (audio.state !== 'running') {
        try { await audio.resume(); } catch { /* The explicit replay action can retry this later. */ }
      }
    }
    if (generation !== run) return;
    const cached = audioCache.get(key);
    if (cached && options.mode !== 'browser') {
      if (audio?.state !== 'running') throw new Error('浏览器阻止了音频播放（Autoplay Blocked）。已保留音频，请点击播放已生成语音。');
      playAudioBytes(owner, run, cached, audio, '已使用缓存音频，不会重复请求语音合成。'); return;
    }
    if (options.mode === 'browser') { playSystemSpeech(owner, run, text, options.deviceVoice, ''); return; }

    let cloud = options.mode === 'doubao', fallbackNotice = '';
    if (options.mode === 'auto') {
      try {
        if (!configCache || Date.now() - configCache.at > 30000) {
          const response = await fetch('/api/tts', { cache: 'no-store', signal: AbortSignal.any([abort.signal, AbortSignal.timeout(5000)]) });
          if (!response.ok) throw new Error(`语音配置检查失败（HTTP ${response.status}）。`);
          const config = await response.json(); configCache = { configured: config.configured === true, at: Date.now() };
        }
        cloud = configCache.configured;
        if (!cloud) fallbackNotice = '服务端未配置豆包语音，本次使用系统语音。';
      } catch {
        if (abort.signal.aborted) return;
        fallbackNotice = '豆包配置暂不可用，本次使用系统语音。';
      }
    }
    if (generation !== run) return;
    if (!cloud) { playSystemSpeech(owner, run, text, options.deviceVoice, fallbackNotice); return; }
    if (text.length > TTS_MAX_TEXT) throw new Error(`每次最多朗读 ${TTS_MAX_TEXT} 字，请选择较短的段落。`);
    timeout = setTimeout(() => abort.abort(), 90000);
    const response = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: abort.signal,
      body: JSON.stringify({ text, ...(options.voice ? { voice: options.voice } : {}) }) });
    if (!response.ok) {
      let message = `语音服务请求失败（HTTP ${response.status}）。`;
      try { const body = await response.json(); if (typeof body.error === 'string') message = body.error; } catch { /* Keep the status-specific error. */ }
      throw new Error(message);
    }
    const ctype = response.headers.get('content-type') ?? '';
    if (!response.body) throw new Error('语音服务未返回音频。');
    if (ctype.includes('audio/wav')) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length) throw new Error('语音服务返回了空音频。');
      if (bytes.length > MAX_PCM_BYTES) throw new Error('语音长度超出保护上限。');
      if (generation !== run) return;
      saveAudio(key, bytes);
      updateRun({ canReplay: true, notice: '音频已生成并缓存。' });
      if (!audio) throw new Error('浏览器无法播放生成的音频；已保留音频，请点击重试。');
      if (audio.state !== 'running') {
        try { await audio.resume(); } catch { /* Report below, preserving the completed cache. */ }
      }
      if (audio.state !== 'running') throw new Error('浏览器阻止了音频播放（Autoplay Blocked）。音频已保留，请点击播放已生成语音。');
      playAudioBytes(owner, run, bytes, audio);
      return;
    }
    if (!ctype.includes('application/x-ndjson')) throw new Error('语音服务返回的音频格式无效。');
    const chunks: Uint8Array[] = []; let byteCount = 0, complete = false, received = false;
    for await (const packet of jsonLines(response.body)) {
      if (generation !== run) return;
      if (packet.type === 'error') throw new Error(typeof packet.error === 'string' ? packet.error : '语音流中断，音频未生成完整。');
      if (packet.type === 'done') { complete = true; break; }
      if (packet.type !== 'audio' || typeof packet.data !== 'string') throw new Error('音频数据格式无法识别。');
      let binary: string;
      try { binary = atob(packet.data); } catch { throw new Error('音频解码失败：Base64 数据不完整。'); }
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      byteCount += bytes.byteLength;
      if (byteCount > MAX_PCM_BYTES) throw new Error('语音长度超出保护上限。');
      chunks.push(bytes); received ||= bytes.length > 0;
    }
    if (!complete || !received || byteCount % 2) throw new Error('音频解码失败：语音流未完整结束或PCM采样不完整。');
    const pcm = concat(chunks, byteCount);
    if (generation !== run) return;
    saveAudio(key, pcm);
    updateRun({ canReplay: true, notice: '音频已生成并缓存。' });
    if (!audio) throw new Error('浏览器无法播放生成的音频；已保留音频，请点击重试。');
    if (audio.state !== 'running') {
      try { await audio.resume(); } catch { /* Report below, preserving the completed cache. */ }
    }
    if (audio.state !== 'running') throw new Error('浏览器阻止了音频播放（Autoplay Blocked）。音频已保留，请点击播放已生成语音。');
    playAudioBytes(owner, run, pcm, audio);
  } catch (error) {
    if (generation !== run) return;
    const message = abort.signal.aborted ? '豆包语音请求超时或已取消，请稍后重试。' : error instanceof TypeError ? '语音网络连接中断，请联网后重试。' : error instanceof Error ? error.message : '豆包语音暂不可用。';
    stopSpeech(owner);
    publish({ ...state, owner, status: 'error', notice: message, engine: '豆包语音', canReplay: audioCache.has(key) });
  } finally { clearTimeout(timeout); }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => stopSpeech());
  window.addEventListener('carbon-presentation-cancel', () => stopSpeech());
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopSpeech(); });
}
