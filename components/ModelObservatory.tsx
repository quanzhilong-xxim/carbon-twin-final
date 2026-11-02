'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { focusModel, useUIStore } from '@/lib/stores/UIStore';
import GlassSurface from './GlassSurface';
const CarbonModel = dynamic(() => import('./CarbonModel'), { ssr: false });
export default function ModelObservatory() {
  const busy = useUIStore(s => s.networkBusy), focus = useUIStore(s => s.focus);
  const revision = useUIStore(s => s.focusRevision), action = useUIStore(s => s.lastAction), reduced = useUIStore(s => s.reduced);
  const root = useRef<HTMLElement>(null);
  useEffect(() => { if (revision && action.startsWith('FOCUS_MODEL')) root.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); }, [revision, action, reduced]);
  return <section ref={root} aria-label="供应链模型观察区"><GlassSurface className="model-observatory" tilt={false}>
    <div><span className="section-kicker">03 / FOLLOW THE CONNECTIONS</span><h2>A closer look.<br /><i>A wider consequence.</i></h2><p>让问题带你走近一个节点。询问 AI，或选择下方视角，观察食物与供应链的联系。</p>
      <div className="model-controls">{([{ target: 'overview', label: '全景' }, { target: 'energy', label: '能源' }, { target: 'transport', label: '运输' }, { target: 'beefTendon', label: '牛肉节点' }] as const).map(item => <button key={item.target} aria-pressed={focus === item.target} disabled={busy} onClick={() => focusModel(item.target)}>{item.label} ↗</button>)}</div>
      <small>概念教学模型 · 排放量由活动数据与因子计算</small></div><CarbonModel />
  </GlassSurface></section>;
}
