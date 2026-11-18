'use client';

import { useEffect, useRef, useState } from 'react';
import SpeechControls from '@/components/SpeechControls';
import { useSpeech } from '@/lib/hooks/useSpeech';
import { TTS_MAX_TEXT } from '@/lib/speech/catalog';

const samples = [
  ['温柔问候', '你好，欢迎回来。我们可以慢慢来，一起看看今天想穿什么。'],
  ['轻柔建议', '这件衣服很适合今天的搭配。如果你愿意，我们可以再看看有没有更舒服、自然的选择。'],
  ['自然追问', '你更喜欢温柔一点的风格，还是清新甜美一点的风格？我们可以一起试试看。'],
];
type Config = { configured: boolean; model: string; speaker: string; speechRate: number; pitch: number };

export default function TtsAudition() {
  const speech = useSpeech();
  const initialSetMode = useRef(speech.setMode);
  const [config, setConfig] = useState<Config | null>(null);
  const [configError, setConfigError] = useState(false);
  const [selected, setSelected] = useState('');
  const [customText, setCustomText] = useState('');
  useEffect(() => {
    initialSetMode.current('doubao');
    const abort = new AbortController();
    fetch('/api/tts', { cache: 'no-store', signal: abort.signal })
      .then(async response => {
        if (!response.ok) throw new Error('配置暂不可用');
        const value = await response.json();
        if (typeof value.configured !== 'boolean' || typeof value.speaker !== 'string') throw new Error('配置格式无效');
        setConfig(value);
      })
      .catch(() => { if (!abort.signal.aborted) setConfigError(true); });
    return () => abort.abort();
  }, []);

  return <main style={{ maxWidth: 820, margin: '100px auto 48px', padding: 24, lineHeight: 1.8 }}>
    <h1 style={{ fontSize: 30 }}>豆包语音试听</h1>
    <p>先用 Vivi 2.0 听完三段，再切换小何 2.0 对比。请判断声音是否温柔、甜美、自然，是否有刻意夹嗓或生硬断句。</p>
    <p role="status">{configError ? '暂时无法读取语音配置，请刷新后重试。' : !config ? '正在读取语音配置…' : config.configured ? '服务端已读取语音凭证；合成和听感仍需实际试听确认。' : '当前服务端未读取到豆包语音凭证，暂时无法生成真实豆包音频。'}</p>
    {config && <p>服务端默认：{config.speaker} · {config.model} · 语速 {config.speechRate} · 音调 {config.pitch}</p>}
    <SpeechControls speech={speech} />
    {speech.mode !== 'doubao' && <p>当前选择会使用自动降级或系统语音，其结果不能作为豆包音色验收依据。请切回「豆包 AI 语音」进行验收。</p>}
    {samples.map(([label, text]) => <section key={label} style={{ marginTop: 24, padding: 20, border: '1px solid #697785', borderRadius: 12 }}>
      <h2 style={{ fontSize: 20 }}>{label}</h2><p>{text}</p>
      <button type="button" style={{ border: '1px solid #92aca9', padding: '8px 20px', borderRadius: 6 }} onClick={() => { setSelected(label); speech.speak(text); }}>试听{label}</button>
    </section>)}
    <section style={{ marginTop: 24, padding: 20, border: '1px solid #697785', borderRadius: 12 }}>
      <h2 style={{ fontSize: 20 }}>试试自己的文字</h2>
      <label htmlFor="tts-custom-text">输入想听的内容</label>
      <textarea id="tts-custom-text" maxLength={TTS_MAX_TEXT} value={customText} onChange={event => setCustomText(event.target.value)} rows={4} style={{ display: 'block', width: '100%', padding: 12, color: '#fff', background: '#101d24', border: '1px solid #697785', borderRadius: 6 }} />
      <small>{customText.length} / {TTS_MAX_TEXT}</small><br />
      <button type="button" disabled={!customText.trim()} style={{ border: '1px solid #92aca9', padding: '8px 20px', borderRadius: 6, opacity: customText.trim() ? 1 : 0.5 }} onClick={() => { setSelected('自定义文字'); speech.speak(customText); }}>试听输入文字</button>
    </section>
    <p aria-live="polite">{selected ? `最近选择：${selected}。` : ''}播放结束后可重复试听，也可随时停止或切换音色。</p>
    <a href="/workspace">返回语音选衣与听听建议</a>
  </main>;
}
