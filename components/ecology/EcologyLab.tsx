'use client';
import dynamic from 'next/dynamic';
import {useState} from 'react';
import {Pause,Play} from 'lucide-react';
import { useStoryState } from '@/lib/hooks/useStoryState';
import { useDataStore } from '@/lib/stores/DataStore';
import { useUIStore } from '@/lib/stores/UIStore';
import { useSimulator } from '@/lib/core/SimulatorEngine';
import { ECOLOGY_BASELINE, ecologyState } from '@/lib/ecology';
import BotanicalDiorama,{type Season} from './BotanicalDiorama';
import AnimatedNumber from './AnimatedNumber';
import StoryAtmosphereControls from './StoryAtmosphereControls';
const Scene=dynamic(()=>import('./SakuraScene'),{ssr:false});
export default function EcologyLab(){
  const annual=useDataStore(s=>s.emissions?.annual??ECOLOGY_BASELINE),{inputs,update}=useSimulator(),busy=useUIStore(s=>s.networkBusy),revision=useUIStore(s=>s.ecoRevision),e=ecologyState(annual);
  const [season,setSeason]=useStoryState<Season>('season','spring',(v):v is Season=>['spring','summer','autumn','winter'].includes(String(v)));
  const [loadSeason,setLoadSeason]=useState(false),[paused,setPaused]=useState(false);
  return <section id="ecology-lab" className={`ecology-lab ${e.stress>.65?'ecology-stressed':''}`} aria-label="交互式生态沙盘" data-ecology={e.stress>.65?'stress':e.vitality>.7?'recovery':'transition'}>
    <header><div><span className="section-kicker">03 / AN ECOSYSTEM OF CHOICES</span><h2>What if the city<br/><i>could breathe again?</i></h2></div><p>移动上方任意活动滑块。<br/>让数字森林在失衡与复苏间变形，<br/>再观察，一次选择改变了多少。</p></header>
    <StoryAtmosphereControls /><div className="eco-stage"><Scene/><div className="eco-stage-label"><span className="live-dot"/> {e.stress>.65?'STRESS / 失衡':e.vitality>.7?'REGENERATION / 复苏':'BETWEEN TWO FUTURES / 转变中'}</div><div className="eco-stage-number"><span>相对初始情景 · 年度{e.saved>=0?'减少':'增加'}</span><strong><AnimatedNumber value={Math.abs(e.saved)/1000}/><small> t</small></strong></div><div className="eco-legend">{revision>0?'AI已点亮减碳路径 · 未修改输入数值':'风动花瓣 · 生态教学示意 · 同一组选择'}</div>{revision>0&&<svg className="eco-path-2d" viewBox="0 0 1000 500" aria-label="AI减碳路径光带"><path d="M100 460 Q800 300 450 260 T550 80"/></svg>}</div>
    <div className="botanical-study"><div><span className="tiny-label">THE BOTANICAL RESPONSE / 以一棵树为尺度</span><h3>{e.vitality>.7?'每一片新叶，都是另一种可能。':e.stress>.65?'当负担持续增加，生命变得安静。':'在枯萎之前，看见改变的余地。'}</h3><p>调低用电，观察叶片舒展；提高排放，观察落叶。这里的生长、暗雨与地形变化是具象化教学叙事，并非真实生态影响或碳汇测算。</p><label htmlFor="ecology-electricity">家庭用电 · 与核算滑块同步 <output>{inputs.electricity} kWh/月</output></label><input id="ecology-electricity" type="range" min="0" max={Math.max(1000,inputs.electricity)} step="0.01" value={inputs.electricity} disabled={busy} onChange={event=>update('electricity',Number(event.target.value))}/><small>初始情景基准 {(ECOLOGY_BASELINE/1000).toFixed(3)} t/年 · 视觉活力 = clamp(1 − 当前排放 / 2倍基准)</small></div><div className="botanical-diorama"><fieldset><legend>独立的季节轴 · 不改变排放计算</legend>{(["spring","summer","autumn","winter"] as const).map((s,i)=><button key={s} aria-pressed={season===s} onClick={()=>{setLoadSeason(false);setSeason(s);}}>{["春","夏","秋","冬"][i]}</button>)}</fieldset><label className="season-load-link"><input type="checkbox" checked={loadSeason} onChange={e=>setLoadSeason(e.target.checked)}/>随家庭负荷连续演绎四季</label><BotanicalDiorama vitality={e.vitality} season={season} seasonProgress={loadSeason?Math.min(3,inputs.electricity/1000*4):undefined} paused={paused}/><button className="botanical-motion" aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?<Play size={15}/>:<Pause size={15}/>} {paused?'继续生态舱动画':'暂停生态舱动画'}</button><p className="method-note">树根、土层与叶片均为原创三维教学模型。季节控制物候示意，活动量控制象征活力；两者不是植物生长预测或碳汇计量。</p></div></div>
  </section>;
}
