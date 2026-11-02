'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowUpRight, SlidersHorizontal, Zap, Fuel, Utensils } from 'lucide-react';
import { useSimulator } from '@/lib/core/SimulatorEngine';
import { useDataStore } from '@/lib/stores/DataStore';
import { useStateMachineStore } from '@/lib/stores/StateMachineStore';
import { useUIStore } from '@/lib/stores/UIStore';
import { FACTORS, type Activity } from '@/lib/emissions';
import GlassSurface from '../GlassSurface';
import ReportExport from './ReportExport';
import CitationBadge from '../CitationBadge';
import LearningProgress from '../LearningProgress';
import EcologyLab from '../ecology/EcologyLab';
import AnimatedNumber from '../ecology/AnimatedNumber';
const EmissionChart = dynamic(() => import('./EmissionChart'), { ssr: false, loading: () => <div className="chart-loading">正在装配可视化引擎…</div> });
const ModelObservatory = dynamic(() => import('../ModelObservatory'), { ssr: false });
const CityTour = dynamic(() => import('../3d/CityTour'), { ssr: false });
const controls = [
  { key: 'electricity' as const, title: '购入电力', unit: 'kWh / 月', max: 1000, step: .01, icon: Zap },
  { key: 'gasoline' as const, title: '汽油用量', unit: 'L / 月', max: 300, step: 1, icon: Fuel },
  { key: 'beef' as const, title: '牛肉消费', unit: 'kg / 周', max: 5, step: .1, icon: Utensils },
];
export default function SimulatorPanel() {
  const { inputs, update, error } = useSimulator(), result = useDataStore(s => s.emissions);
  const state = useStateMachineStore(s => s.state), networkBusy = useUIStore(s => s.networkBusy);
  const pending = useUIStore(s => s.chartPending);
  const busy = state === 'LOCKED' || state === 'EXPANDING' || pending;
  return <main className="simulator-page"><div className="section-topline"><span>THE BEHAVIOUR LAB / 01</span><span>ACTIVITY × FACTOR = CONSEQUENCE</span></div><header className="lab-heading"><div><span className="section-kicker"><SlidersHorizontal size={14} /> YOUR CHOICES HAVE WEIGHT</span><h1>Change a habit.<br /><i>Shift the horizon.</i></h1></div><p>不是给你一张成绩单。<br />把一个习惯放大到一年、二十四年，<br />看清因果，再选择下一步。</p></header>
    <div id="carbon-report" className="lab-grid"><GlassSurface className="control-panel"><div className="panel-heading"><span>01 / YOUR ACTIVITY</span><span className="live-dot" /></div>{controls.map(({ key, title, unit, max, step, icon: Icon }) => <section className="slider-block" key={key}><label htmlFor={key}><span><Icon size={16} />{title}</span><output>{inputs[key].toFixed(key==='beef'?1:key==='electricity'?2:0)} <small>{unit}</small></output></label><input id={key} type="range" min={0} max={Math.max(max, inputs[key])} step={step} value={inputs[key]} disabled={networkBusy} aria-valuetext={`${inputs[key]} ${unit}`} style={{ '--range-progress': `${inputs[key]/Math.max(max, inputs[key])*100}%` } as React.CSSProperties} onChange={e => update(key as keyof Activity, Number(e.target.value))} /><div className="slider-scale"><span>0</span><span>{Math.max(max, inputs[key])} {unit}</span></div><details className="factor-details"><summary>{FACTORS[key].value} {FACTORS[key].unit} · 因子依据 ↗</summary><p>{FACTORS[key].boundary}</p><a href={FACTORS[key].url} target="_blank" rel="noreferrer">{FACTORS[key].source} <ArrowUpRight size={12} /></a></details></section>)}<p className="method-note">三类活动的混合边界教学估算，不是完整个人足迹或认证清单。电力与汽油为 CO₂，牛肉为生命周期 CO₂e；相加仅作情景比较。1 年 = 12 月 / 52 周。</p>{error && <p role="status">{error}</p>}</GlassSurface>
    <GlassSurface className="chart-panel"><div className="panel-heading"><span>02 / THE INVISIBLE LEDGER</span><span>{busy ? 'CALCULATING' : 'WORKER VERIFIED'}</span></div>{result ? <><div className="annual-readout"><strong><AnimatedNumber value={result.annual/1000}/></strong><span>t / year<br />教学估算</span></div><EmissionChart result={result} busy={busy} /><div className="horizon-readout"><span>固定习惯推演至 2050<br /><small>{result.startYear}—2050 · {result.years} 个完整年度</small></span><strong>{(result.cumulative/1000).toFixed(1)}<small> t</small></strong></div></> : <div className="chart-loading">启动独立计算线程…</div>}</GlassSurface></div>
    <div className="lab-bottom"><div><h2>Every number has a boundary.</h2><p>固定习惯情景帮助你比较选择。<Link href="/learn">查阅核算边界 ↗</Link></p></div><ReportExport /></div>
    <LearningProgress />
    <aside className="boundary-declaration"><b>METHODS / SOURCES / LIMITATIONS</b>本平台依据指定年份与研究边界的活动量和排放因子进行教学计算：电力暂用教学约定值 0.581 kg CO₂/kWh，原始发布年份与版本尚未核验，不作为已核验的官方因子或通用基准线。汽油采用 EPA 燃烧排放教学取整值，牛肉采用 EWG 2011 生命周期情景值。边界涵盖日常交通中的汽油消耗、家庭购入电力与饮食中的牛肉消费，不含全部通勤方式或完整饮食足迹。电力、汽油 CO₂ 与牛肉 CO₂e 的混合边界总和仅作教学比较，不作为实际履约依据。<div className="research-citations"><CitationBadge /><CitationBadge id="carbon-budget" label="[3] IPCC AR6 · 累积排放" /></div></aside>
    <EcologyLab />
    <CityTour />
    <div className="workspace-invite"><span>FROM A ROOM TO YOUR EVERYDAY LIFE.</span><Link className="primary-button" href="/workspace">打开碳足迹穿搭镜 ↗</Link></div>
    <ModelObservatory />
  </main>;
}
