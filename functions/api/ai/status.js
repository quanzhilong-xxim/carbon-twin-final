// CarbonTwin service status.
// GET /api/ai/status — reports CONFIGURATION only, never keys or balances.
// The browser uses this to show DEEPSEEK / DOUBAO truthfully instead of
// hard-coding "CONNECTED".

export async function onRequestGet(context) {
  const env = context.env || {};
  const deepseekKey = (env.DEEPSEEK_API_KEY || '').trim();
  const ttsKey = (env.VOLCENGINE_TTS_API_KEY || '').trim();
  const speaker = (env.VOLCENGINE_TTS_SPEAKER || '').trim() || 'zh_female_vv_uranus_bigtts';
  const body = {
    deepseek: {
      configured: Boolean(deepseekKey),
      model: (env.DEEPSEEK_MODEL || 'deepseek-chat').trim(),
      provider: 'api.deepseek.com',
    },
    tts: {
      configured: Boolean(ttsKey),
      provider: 'volcengine-openspeech',
      model: 'seed-tts-2.0',
      speaker,
    },
    asr: {
      mode: 'browser',
      note: '使用浏览器 Web Speech API；没有云端 ASR 凭证，不自动录音。',
    },
    generatedAt: new Date().toISOString(),
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
