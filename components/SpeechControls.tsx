'use client';

import { TTS_VOICES, type SpeechMode } from '@/lib/speech/catalog';
import type { useSpeech } from '@/lib/hooks/useSpeech';

export default function SpeechControls({ speech }: { speech: ReturnType<typeof useSpeech> }) {
  return <div className="speech-controls">
    {!speech.activated && <button className="speech-enable" type="button" onClick={() => { void speech.activate(); }}>开启AI语音</button>}
    <label className="speech-auto"><input type="checkbox" checked={speech.autoSpeak} onChange={event => speech.setAutoSpeak(event.target.checked)} />回答后自动朗读</label>
    <div className="speech-settings">
      <label>语音方式<select aria-label="语音方式" value={speech.mode} onChange={e => speech.setMode(e.target.value as SpeechMode)}>
        <option value="auto">优先豆包 · 未配置时用系统</option><option value="doubao">豆包 AI 语音</option><option value="browser">系统语音</option>
      </select></label>
      {speech.mode !== 'browser' ? <label>豆包音色<select aria-label="豆包音色" value={speech.voice} onChange={e => speech.setVoice(e.target.value)}>
        <option value="">服务端推荐音色</option>{TTS_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select></label> : <label>设备音色<select aria-label="设备音色" value={speech.deviceVoice} onChange={e => speech.setDeviceVoice(e.target.value)}><option value="">自动选择中文音色</option>{speech.voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}</select></label>}
    </div>
    <div className="speech-actions">
      {speech.loading && <button type="button" onClick={speech.stop}>取消语音请求</button>}
      {speech.speaking && <button type="button" onClick={speech.pause}>暂停</button>}
      {speech.paused && <button type="button" onClick={speech.resume}>继续播放</button>}
      {(speech.speaking || speech.paused) && <button type="button" onClick={speech.stop}>停止</button>}
      {speech.canReplay && <button type="button" onClick={speech.replay}>{speech.failed ? '点击播放已生成语音' : '重播上一条'}</button>}
      <button type="button" aria-pressed={speech.muted} onClick={() => speech.setMuted(!speech.muted)}>{speech.muted ? '取消静音' : '静音'}</button>
    </div>
    <label className="speech-volume">音量 <input aria-label="语音音量" type="range" min="0" max="1" step="0.05" value={speech.volume} onChange={event => speech.setVolume(Number(event.target.value))} /></label>
    <small role="status" aria-live="polite">{speech.notice || (speech.loading ? '正在生成语音…' : speech.speaking ? `${speech.engine} · 正在朗读` : speech.paused ? '播放已暂停' : speech.autoSpeak && !speech.activated ? '已开启自动朗读；请点一次“开启AI语音”授权浏览器播放。' : speech.autoSpeak ? '自动朗读已开启，新回复会自动朗读。' : '自动朗读关闭时，仍可点击每条回复的“朗读回复”。')}</small>
  </div>;
}
