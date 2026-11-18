'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowUpRight, Camera, Check, Mic, Volume2, VolumeX } from 'lucide-react';
import { saveARSnapshot } from '@/lib/storage/ARSnapshot';
import { askEvidence } from '@/lib/visualDynamics';
import { GARMENTS, annualGarmentAllocation, garmentSpeech } from '@/lib/wardrobe';
import { useWardrobeVoice } from '@/lib/hooks/useWardrobeVoice';
import { useUIStore } from '@/lib/stores/UIStore';
import { useTryOnStore } from '@/lib/stores/TryOnStore';
import { TRY_ON_GARMENTS, tryOnGarment } from '@/lib/tryon/garments';
import { useDecartTryOn, type SessionStatus } from '@/lib/hooks/useDecartTryOn';
import { useDecartAccount } from '@/lib/hooks/useDecartAccount';
import SpeechControls from '@/components/SpeechControls';

export default function ARGarmentTryOn() {
  const activeGarmentIndex = useTryOnStore((state) => state.activeGarmentIndex);
  const origin = useTryOnStore((state) => state.source);
  const selectGarment = useTryOnStore((state) => state.selectGarment);
  const garment = TRY_ON_GARMENTS[activeGarmentIndex].id;
  const { video, localVideo, status, remoteReady, cameraReady, swapPending, frozenFrame, error, notice, setError, start, stop, preview, uploadGarment, clearUpload, appliedGarment } = useDecartTryOn(garment);
  const [policy, setPolicy] = useState<{ enabled: boolean; message: string } | null>(null);
  const [targetSeconds, setTargetSeconds] = useState(3);
  const [consent, setConsent] = useState(false);
  const busy = ['connecting', 'connected', 'generating', 'reconnecting', 'requesting', 'stopping'].includes(status);
  const { credits, quota, sufficient, refresh: refreshAccount } = useDecartAccount();
  const uploadInput = useRef<HTMLInputElement>(null);
  const [uploadedPreview, setUploadedPreview] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [years, setYears] = useState(3);
  const [snapshot, setSnapshot] = useState('');
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    const abort = new AbortController();
    void fetch('/api/decart/policy', { cache: 'no-store', signal: abort.signal })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => setPolicy({ enabled: data.enabled === true, message: String(data.message || '') }))
      .catch(() => { if (!abort.signal.aborted) setPolicy({ enabled: false, message: '无法确认收费授权，已安全锁定 AI 连接。' }); });
    return () => abort.abort();
  }, []);
  useEffect(() => () => { if (uploadedPreview) URL.revokeObjectURL(uploadedPreview); }, [uploadedPreview]);
  useEffect(() => { setUploadedPreview(''); }, [garment]);
  const reduced = useUIStore((state) => state.reduced);
  const item = GARMENTS.find((entry) => entry.id === garment)!;
  const annual = annualGarmentAllocation(item.kg, quantity, years);
  const voice = useWardrobeVoice((text) => {
    const index = GARMENTS.findIndex((entry) => text.includes(entry.name));
    if (index >= 0) select(index, '语音选择');
    else voice.setNotice('请说“选择短袖”“选择牛仔裤”等衣物名称。');
  });

  function select(wardrobeIndex: number, source = '手动选择') {
    if (swapPending || busy) return;
    const index = TRY_ON_GARMENTS.findIndex((entry) => entry.id === GARMENTS[wardrobeIndex]?.id);
    if (index < 0) return;
    clearUpload(); setUploadedPreview('');
    selectGarment(index, source);
    voice.speak(garmentSpeech(wardrobeIndex, quantity, years));
  }

  const capture = async () => {
    const source = video.current;
    if (!source || !remoteReady || swapPending || !source.videoWidth) return;
    const frame = document.createElement('canvas');
    frame.width = source.videoWidth;
    frame.height = source.videoHeight;
    const context = frame.getContext('2d');
    if (!context) return;
    context.drawImage(source, 0, 0);
    const image = frame.toDataURL('image/jpeg', 0.88);
    try {
      await saveARSnapshot({ image, createdAt: Date.now(), garment: item.name, tracking: status });
      setSnapshot(image);
    } catch {
      setError('快照保存失败，请检查浏览器存储。');
    }
  };

  const upload = async (file: File) => {
    const region = ['trousers', 'shorts', 'jeans'].includes(garment) ? 'lower' : 'upper';
    if (!await uploadGarment(file, `Substitute the ${region} body garment with the clothing item in the reference, preserving its visible color, cut and graphics. Do not alter the person or background.`)) return;
    const preview = URL.createObjectURL(file);
    setUploadedPreview((previous) => { if (previous) URL.revokeObjectURL(previous); return preview; });
  };

  const startTryOn = async () => {
    if (!policy?.enabled) { setError('收费试穿尚未授权，未调用 AI。'); return; }
    if (credits.minimumCredits !== null && !sufficient) {
      setError('Decart 账户余额低于安全阈值，已暂停新的云端试穿连接。');
      return;
    }
    if (quota.remaining === 0) {
      setError('Decart 实时并发会话已达上限，请先结束其他试穿会话后重试。');
      return;
    }
    await start(targetSeconds, consent);
  };

  const grade = item.kg < 10 ? '较低基准' : item.kg < 30 ? '中等基准' : '较高基准';
  const statusLabel: Record<SessionStatus, string> = {
    idle: 'CAMERA OFF', requesting: 'REQUESTING CAMERA', preview: 'LOCAL PREVIEW / NO AI', connecting: 'CONNECTING TO DECART',
    connected: 'DECART REMOTE STREAM', generating: 'GENERATING TRY-ON', reconnecting: 'STOPPING CONNECTION', stopping: 'STOPPING', stopped: 'STOPPED', unavailable: 'SESSION UNAVAILABLE',
  };

  return <section className="ar-lab wardrobe-atelier" data-tracking={status} data-speaking={voice.speaking}>
    <header className="interactive-heading"><div><span className="section-kicker">THE FOOTPRINT MIRROR / 03</span><h1>Wear a little.<br/><i>Mean a lot.</i></h1><p className="atelier-subtitle">看见衣橱里的碳。让每一次穿着，更有分量。</p></div><span className="local-record-badge"><span className="live-dot"/> DECART / REAL-TIME V-TRY-ON</span></header>
    <div className="ar-layout">
      <div className="mirror-column">
        <div className="ar-viewport" data-active-garment={item.id}>
          <video id="ai-tryon-video" ref={video} playsInline muted autoPlay className="ar-live-video" aria-label="Decart 实时试穿画面" />
          <video id="local-camera-preview" ref={localVideo} playsInline muted autoPlay className={remoteReady ? 'ar-local-video ar-local-pip' : 'ar-local-video'} aria-label="本地摄像头预览" />
          {frozenFrame && <Image className="ar-frozen-frame" src={frozenFrame} alt="上一次成功播放的试穿画面" fill unoptimized />}
          {!remoteReady && !cameraReady && !frozenFrame && <div className="ar-idle ar-product-fallback">
            <Image src={tryOnGarment(garment).imagePath} alt={tryOnGarment(garment).name + '参考商品图'} fill sizes="(max-width: 760px) 90vw, 45vw" priority unoptimized />
            <div className="ar-fallback-caption"><span>{status === 'idle' || status === 'stopped' ? 'YOUR WARDROBE.' : status === 'unavailable' ? 'READY WHEN YOU ARE.' : 'PREPARING YOUR PREVIEW.'}</span><p>{status === 'idle' || status === 'stopped' ? '选择衣物后先打开本地摄像头。AI 试穿需要单独授权。' : status === 'unavailable' ? '连接暂不可用，请查看下方提示后重试。' : '正在准备摄像头；尚未显示 AI 结果。'}</p></div>
          </div>}
          {swapPending && <div className="ar-swap-loading" role="status" aria-live="polite"><span className="ar-swap-spinner"/><span>AI 正在为您换装...</span></div>}
          <div className="mirror-frame" aria-hidden="true"><i/><i/><i/><i/></div>
          <div className="mirror-meta"><span><span className="live-dot"/>{statusLabel[status]}</span><span>{remoteReady ? `AI / ${appliedGarment ? tryOnGarment(appliedGarment).name : '远端视频'}` : cameraReady ? '原始摄像头 / 非 AI 结果' : 'CAMERA STAYS OFF UNTIL YOU START'}</span></div>
        </div>
        <div className="mirror-toolbar">
          <button className="atelier-button light" disabled={!hydrated || busy || cameraReady} onClick={() => void preview()}><Camera size={17}/>打开摄像头（不调用 AI）</button>
          <button className="atelier-button light" disabled={!hydrated || !cameraReady || busy || !policy?.enabled || !consent} onClick={() => void startTryOn()}>开始 AI 试衣（消耗额度）</button>
          <button className="atelier-button" disabled={!cameraReady && !busy} onClick={stop}>立即停止 / 关闭摄像头</button>
          {status === 'unavailable' && cameraReady && <button className="atelier-button" onClick={stop}>关闭摄像头</button>}
          <button className="atelier-button" disabled={!remoteReady || swapPending} onClick={() => void capture()}>保存快照 <ArrowUpRight size={16}/></button>
          <button className="atelier-button" disabled={busy} onClick={() => uploadInput.current?.click()}>上传衣服（暂存本地）</button>
          <input ref={uploadInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ''; }} />
        </div>
        {uploadedPreview && <div><Image className="uploaded-garment-preview" src={uploadedPreview} alt="已上传衣物预览" width={120} height={120} unoptimized /><button onClick={() => { clearUpload(); setUploadedPreview(''); }} disabled={busy}>使用服装库参考图</button></div>}
        <div className="mirror-status"><label>试穿目标时长 <select aria-label="试穿目标时长" value={targetSeconds} disabled={busy} onChange={event => setTargetSeconds(Number(event.target.value))}><option value={3}>3 秒</option><option value={4}>4 秒</option><option value={5}>5 秒</option></select></label><p>{policy?.message || '正在检查本地授权策略（不调用 Decart）…'}</p><label><input type="checkbox" checked={consent} disabled={busy || !policy?.enabled} onChange={event => setConsent(event.target.checked)}/>我同意本次收费试穿：标准模式约 2 credits/生成秒；服务端最短上限 10 秒，3 秒目标不等于费用上限。</label><p>仅提供正面素材；动作、侧身和背面效果待真实验收，不承诺完整 360°。切换服装不会调用 AI。</p><p>{tryOnGarment(garment).name} · {tryOnGarment(garment).width} × {tryOnGarment(garment).height} PNG · 正面有 / 侧面无 / 背面无 · 实际试穿未验证</p></div>
        <p className="mirror-status" role="status">开启后，摄像头视频会发送至 Decart 实时生成试穿画面；服务使用受 Decart 账户额度与计费规则约束。</p>
        {error && <p className="atelier-notice ar-error-notice" role="alert">{error}</p>}
        {notice && <p className="mirror-status" role="status">{notice}</p>}
        <div className="decart-account-status" aria-live="polite">
          <div className="wardrobe-section-label"><span>DECART ACCOUNT</span><button type="button" onClick={() => void refreshAccount()} disabled={credits.loading || quota.loading}>刷新状态</button></div>
          <div className="decart-account-grid"><span>Credits <strong>{credits.credits === null ? '余额暂时无法确认' : credits.credits}</strong></span><span>Realtime <strong>{quota.remaining === null ? '未知' : `${quota.remaining}${quota.limit === null ? '' : ` / ${quota.limit}`}`}</strong></span></div>
          <p>{credits.error || quota.error || (credits.minimumCredits === null ? '未设置最低余额阈值。' : sufficient ? `最低保护阈值：${credits.minimumCredits}` : '低于最低余额保护阈值。')}</p>
          {credits.checkedAt && <small>查询时间：{new Date(credits.checkedAt).toLocaleString()}</small>}
        </div>
      </div>

      <aside className="ar-sidebar"><div className="wardrobe-section-label"><span>01 / YOUR GARMENT</span><span>{origin}</span></div>
        <div className="garment-options">{TRY_ON_GARMENTS.map(({ id, name }) => {
          const entry = GARMENTS.find((candidate) => candidate.id === id)!;
          return <button key={id} aria-pressed={garment === id} disabled={!hydrated || swapPending || busy} onClick={() => { setUploadedPreview(''); select(GARMENTS.indexOf(entry)); }}>{name}{garment === id && <Check size={13}/>}</button>;
        })}</div>
        <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.12 }} className="wardrobe-result">
          <div className="wardrobe-section-label"><span>02 / ANNUAL ALLOCATION</span><span className={`footprint-grade grade-${item.kg < 10 ? 'low' : item.kg < 30 ? 'mid' : 'high'}`}>{grade}</span></div>
          <div className="wardrobe-number"><strong>{annual.toFixed(2)}</strong><span>kg CO₂e / 年</span></div><p className="wardrobe-number-caption">{quantity} 件 × {item.kg} kg ÷ {years} 年 · 全生命周期年度分摊</p>
          <div className="wardrobe-inputs"><label>拥有件数<input aria-label="衣物拥有件数" type="number" min="1" max="50" value={quantity} onChange={(event) => setQuantity(Math.min(50, Math.max(1, Number(event.target.value) || 1)))}/></label><label>使用寿命 / 年<input aria-label="使用寿命 / 年" type="number" min="1" max="20" value={years} onChange={(event) => setYears(Math.min(20, Math.max(1, Number(event.target.value) || 1)))}/></label></div>
          <div className="wardrobe-reference"><span>代表产品 · {item.reference}{item.proxy ? ' / 代理基准' : ''}</span><strong>{item.kg}<small> kg CO₂e / 件，全生命周期</small></strong><p>{item.advice}</p><a href={`https://impactco2.fr/outils/habillement/${item.path}`} target="_blank" rel="noreferrer">[1] ADEME / Impact CO₂ · 查看数据与边界 <ArrowUpRight size={13}/></a></div>
        </motion.div>
        <div className="wardrobe-voice"><div className="wardrobe-section-label"><span>03 / A GENTLER GUIDE</span><span>{voice.speaking ? '正在朗读' : voice.enabled ? '语音已开启' : '默认静音'}</span></div><div className="voice-actions"><button className={`voice-switch ${voice.enabled ? 'enabled' : ''}`} aria-pressed={voice.enabled} onClick={voice.toggle} aria-label={voice.enabled ? '关闭穿搭语音' : '开启穿搭语音'}>{voice.enabled ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button><button className={voice.listening ? 'mic listening' : 'mic'} aria-pressed={voice.listening} onClick={voice.listen}><Mic size={17}/>{voice.listening ? '正在听…' : '语音选衣'}</button><button disabled={!voice.enabled} onClick={() => voice.speak(garmentSpeech(GARMENTS.findIndex((entry) => entry.id === garment), quantity, years))}>听听建议 ↗</button><div className="voice-wave" aria-hidden="true">{[0, 1, 2, 3, 4].map((index) => <i key={index} style={{ animationDelay: `${index * 0.09}s` }}/>)}</div></div>{voice.enabled && <SpeechControls speech={voice} />}{voice.notice && <p role="status">{voice.notice}</p>}</div>
        <button className="wardrobe-ai-link" onClick={() => askEvidence(`请依据检索文献解释服装生命周期：当前选择${item.name}，页面采用 ADEME Impact CO2 的${item.reference}${item.proxy ? '代理' : ''}参考值${item.kg} kgCO2e/件，${quantity}件使用${years}年。此网页参考值并非用户产品实测，请明确边界，未检索到出处时不要替该数值背书。`)}>向 Carbon-E 追问碳足迹 <ArrowUpRight size={17}/></button>
      </aside>
    </div>
    <div className="wardrobe-method"><span>THE SMALL PRINT / 方法与边界</span><p>公开基准来自法国 ADEME Impact CO₂ / Base Empreinte，查询于 2026-11-03。涵盖代表产品的生命周期，产地、质量、纤维和护理条件会改变数值。年度分摊 = 件数 × 单件全生命周期 ÷ 使用年数，是教学分摊，非当年实际排放清单。开启试穿会将摄像头视频发送给 Decart；请先阅读 Decart 的服务与隐私条款。年度分摊不是实时服务的费用估算。</p></div>
    {snapshot && <div className="ar-snapshot"><Image src={snapshot} alt="保存在当前浏览器的云端试穿快照" width={960} height={720} unoptimized/><p role="status">已保存至本地。</p></div>}
  </section>;
}
