'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef,useState } from 'react';
import { focusModel, useUIStore } from '@/lib/stores/UIStore';
import GlassSurface from './GlassSurface';
import { SUPPLY_CHAIN } from '@/lib/world/learning';
const SupplyChainPasture = dynamic(() => import('./3d/SupplyChainPasture'), { ssr: false });
export default function ModelObservatory() {
  const busy = useUIStore(s => s.networkBusy), focus = useUIStore(s => s.focus);
  const revision = useUIStore(s => s.focusRevision), action = useUIStore(s => s.lastAction), reduced = useUIStore(s => s.reduced);
  const root = useRef<HTMLElement>(null);
  const [stage,setStage]=useState(0);
  const select=(index:number)=>{setStage(index);focusModel(SUPPLY_CHAIN[index].target);};
  const actionRevision=useUIStore(s=>s.actionRevision);
  useEffect(()=>{const ui=useUIStore.getState();if(!ui.lastAction.startsWith('FOCUS_MODEL'))return;setStage(ui.focus==='energy'?3:ui.focus==='transport'?4:ui.focus==='beefTendon'?1:0);},[actionRevision]);
  useEffect(() => { if (revision && action.startsWith('FOCUS_MODEL')) root.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); }, [revision, action, reduced]);
  return <section id="supply-chain" ref={root} aria-label="供应链模型观察区"><GlassSurface className="model-observatory" tilt={false}>
    <div><span className="section-kicker">03 / FOLLOW THE CONNECTIONS</span><h2>A closer look.<br /><i>A wider consequence.</i></h2><p>让问题带你走近一个节点。询问 AI，或选择下方视角，观察食物与供应链的联系。</p>
      <div className="model-controls">{([{ target: 'overview', label: '全景' }, { target: 'energy', label: '能源' }, { target: 'transport', label: '运输' }, { target: 'beefTendon', label: '牛肉节点' }] as const).map(item => <button key={item.target} aria-pressed={focus === item.target} disabled={busy} onClick={() => {focusModel(item.target);setStage(item.target==="energy"?3:item.target==="transport"?4:item.target==="beefTendon"?1:0);}}>{item.label} ↗</button>)}</div>
      <small>概念教学模型 · 排放量由活动数据与因子计算</small><div className="supply-story" data-story={stage}><div className="story-nodes" role="group" aria-label="供应链八阶段">{SUPPLY_CHAIN.map((node,i)=><button key={node.name} disabled={busy} aria-pressed={stage===i} onClick={()=>select(i)}>{String(i+1).padStart(2,'0')} {node.name}</button>)}</div><h3>{SUPPLY_CHAIN[stage].name}</h3><p aria-live="polite">{SUPPLY_CHAIN[stage].note}</p><div><button onClick={()=>select(Math.max(0,stage-1))} disabled={stage===0||busy}>上一章</button><button onClick={()=>select(Math.min(SUPPLY_CHAIN.length-1,stage+1))} disabled={stage===SUPPLY_CHAIN.length-1||busy}>下一章</button></div><a href="https://www.fao.org/gleam/en/" target="_blank" rel="noreferrer">FAO GLEAM · 方法与边界 ↗</a><p className="method-note">牛肉沙盘的 27 kg CO₂e/kg 来自 EWG 2011 特定生命周期情景；这里的奶牛不作为乳制品排放估算。</p></div></div><SupplyChainPasture stage={stage} select={select}/>
  </GlassSurface></section>;
}
