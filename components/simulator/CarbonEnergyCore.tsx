'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { EmissionResult,Sector } from '@/lib/emissions';
import { highlightChart,useUIStore } from '@/lib/stores/UIStore';
const colors=['#80dfad','#7cbee6','#efc486'];
const ParticleScene=dynamic(()=>import('./CarbonParticleScene'),{ssr:false,loading:()=> <div className="particle-loading">正在聚合三维粒子…</div>});
export default function CarbonEnergyCore({result}:{result:EmissionResult}){
 const reduced=useUIStore(s=>s.reduced),focus=useUIStore(s=>s.highlighted);
 const [shape,setShape]=useState<'tree'|'city'>('tree'),[paused,setPaused]=useState(false);
 const choose=(sector:Sector)=>{highlightChart(sector);document.querySelector<HTMLElement>(`[data-sector="${sector}"] input[type="number"]`)?.focus({preventScroll:true});};
 return <div className="energy-core" data-total={result.annual.toFixed(4)}>
  <div className="particle-heading"><span>LIVING DATA / 选择留下的形状</span><span>{result.annual===0?'零输入 · 无粒子':shape==='tree'?'01 / 生命树':'02 / 城市'}</span></div>
  <div className="carbon-particle-stage"><ParticleScene result={result} shape={shape} paused={paused} reduced={reduced} focus={focus} onChoose={choose}/></div>
  <div className="particle-controls" aria-label="粒子视图控制"><button aria-pressed={shape==='tree'} onClick={()=>setShape('tree')}>生命树</button><button aria-pressed={shape==='city'} onClick={()=>setShape('city')}>城市</button><button aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?'继续动态':'暂停动态'}</button></div>
  <table><caption>来源数值 · kg / 年（混合边界教学量）</caption><thead><tr><th>来源</th><th>估算</th><th>占比</th></tr></thead><tbody>{result.sectors.map((s,i)=><tr key={s.id}><th><button onClick={()=>choose(s.id)} aria-pressed={focus===s.id}><i style={{background:colors[i]}}/>{s.name}</button></th><td>{s.value.toFixed(2)}</td><td>{result.annual?(s.value/result.annual*100).toFixed(1):'0.0'}%</td></tr>)}</tbody></table>
  <p className="method-note">拖动环绕，点击粒子或来源定位参数。颜色抽样表达三类来源占比；总量越大，可见粒子越多（平方根映射，10,000 kg 封顶）。树与城市是同一数据的视觉隐喻，粒子不是碳单位，以表格为准。零输入无粒子。</p>
 </div>;
}
