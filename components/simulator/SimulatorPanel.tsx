'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { SlidersHorizontal } from 'lucide-react';
import { useSimulator } from '@/lib/core/SimulatorEngine';
import { useDataStore } from '@/lib/stores/DataStore';
import { useStateMachineStore } from '@/lib/stores/StateMachineStore';
import { useUIStore } from '@/lib/stores/UIStore';
import CarbonEnergyCore from './CarbonEnergyCore';
import RoleGuide from '../RoleGuide';
import GlassSurface from '../GlassSurface';
import ReportExport from './ReportExport';
import CitationBadge from '../CitationBadge';
import LearningProgress from '../LearningProgress';
import EcologyLab from '../ecology/EcologyLab';
import AnimatedNumber from '../ecology/AnimatedNumber';
import BehaviourIntro from './BehaviourIntro';
import ActivityControl, { ACTIVITY_CONTROLS } from './ActivityControl';
import ScenarioWorkbench, { ScenarioSelector } from './ScenarioWorkbench';
import StoryProgress from './StoryProgress';
import StoryEnding from './StoryEnding';
import { ChapterLead, NextChapter, CafeChapter, CompanionChapter, BuildingsChapter, PastureChapter, DataEcho } from './StoryChapters';
import './behaviour-v7.css';
import './behaviour-v108.css';
const EmissionChart = dynamic(() => import('./EmissionChart'), { ssr: false, loading: () => <div className="chart-loading">正在装配可视化引擎…</div> });
const CityTour = dynamic(() => import('../3d/CityTour'), { ssr: false });
export default function SimulatorPanel() {
  const { inputs, update, error } = useSimulator(), result = useDataStore(s => s.emissions);
  const state = useStateMachineStore(s => s.state), networkBusy = useUIStore(s => s.networkBusy);
  const pending = useUIStore(s => s.chartPending);
  const highlighted=useUIStore(s=>s.highlighted);
  const busy = state === 'LOCKED' || state === 'EXPANDING' || pending;
  return <main className="simulator-page v7-behaviour"><div className="section-topline"><span>THE BEHAVIOUR LAB / 01</span><span>ACTIVITY × FACTOR = CONSEQUENCE</span></div><BehaviourIntro />
    <StoryProgress /><RoleGuide/>
    <ScenarioSelector disabled={busy || networkBusy} />
    <section id="activity-lab" aria-label="活动量与排放情景实验"><header className="lab-experiment-heading"><span className="section-kicker"><SlidersHorizontal size={14} /> 01 / CHANGE THE INPUT</span><h2>让改变，<i>有据可比。</i></h2><p>调整左侧活动量，右侧结果由同一套因子重新计算。保存 A / B，比较你的两个选择。</p></header><div id="carbon-report" className="lab-grid"><GlassSurface className="control-panel"><div className="panel-heading"><span>01 / YOUR ACTIVITY</span><span className="live-dot" /></div>{ACTIVITY_CONTROLS.map(control => <ActivityControl key={control.key} control={control} value={inputs[control.key]} disabled={networkBusy} highlighted={highlighted === control.sector} onChange={update} />)}<p className="method-note">三类活动的混合边界教学估算，不是完整个人足迹或认证清单。电力与汽油为 CO₂，牛肉为生命周期 CO₂e；相加仅作情景比较。1 年 = 12 月 / 52 周。预设只改变相应活动量，不代表现实人群水平。</p>{error && <p role="status">{error}</p>}</GlassSurface>
    <GlassSurface className="chart-panel" tilt={false}><div className="panel-heading"><span>02 / THE INVISIBLE LEDGER</span><span>{busy ? 'CALCULATING' : 'WORKER VERIFIED'}</span></div>{result ? <><div className="annual-readout"><strong><AnimatedNumber value={result.annual/1000}/></strong><span>t / year<br />教学估算</span></div><CarbonEnergyCore result={result}/><details className="original-chart"><summary>展开原有环形图 ↗</summary><EmissionChart result={result} busy={busy}/></details><div className="horizon-readout"><span>固定习惯推演至 2050<br /><small>{result.startYear}—2050 · {result.years} 个完整年度</small></span><strong>{(result.cumulative/1000).toFixed(1)}<small> t</small></strong></div></> : <div className="chart-loading">启动独立计算线程…</div>}</GlassSurface></div></section>
    <NextChapter n={2} /><EcologyLab /><NextChapter n={3} />
    <CityTour /><NextChapter n={4} />
    <CafeChapter /><CompanionChapter /><BuildingsChapter /><PastureChapter />
    <DataEcho /><ScenarioWorkbench disabled={busy || networkBusy} /><NextChapter n={9} />
    <section id="story-reflection" className="story-reflection" data-chapter="10" aria-labelledby="story-reflection-title">
      <ChapterLead n={10} title="城市余韵" english="BACK TO THE BEGINNING" />
      <div><span className="section-kicker">EVERY CHOICE LEAVES A TRACE</span><h2 id="story-reflection-title">把改变留下来，<br /><i>再看清它的重量。</i></h2><p>从城市、房间到餐桌，这些结果连接的是你选择的活动量与教学因子。回到实验继续调整，或保存两个情景，看看变化来自哪里。</p><div className="story-reflection-actions"><a className="primary-button" href="#activity-lab">重新调整活动量 ↗</a><Link href="/learn#scope-boundaries">了解核算边界 ↗</Link></div></div>
      <div className="story-reflection-ledger" aria-live="polite"><span>YOUR SCENARIO / 当前年度教学估算</span>{result ? <><strong>{(result.annual / 1000).toFixed(2)} <small>t / 年</small></strong><dl>{result.sectors.map(sector => <div key={sector.id}><dt>{sector.name}</dt><dd>{sector.value.toFixed(1)} kg</dd></div>)}</dl></> : <p>正在计算当前情景…</p>}<p>混合边界的情景比较，不代表完整个人足迹。</p></div>
    </section><StoryEnding />
    <div className="lab-bottom"><div><h2>Every number has a boundary.</h2><p>固定习惯情景帮助你比较选择。<Link href="/learn">查阅核算边界 ↗</Link></p></div><ReportExport /></div>
    <LearningProgress />
    <aside className="boundary-declaration"><b>METHODS / SOURCES / LIMITATIONS</b>本平台依据指定年份与研究边界的活动量和排放因子进行教学计算：电力采用2023年中国全国平均因子 0.5306 kg CO₂/kWh（生态环境部、国家统计局，公告2025年第47号），用于地点法购电间接CO₂，不含完整生命周期，也不代表实时电网。汽油采用 EPA 燃烧排放教学取整值，牛肉采用 EWG 2011 生命周期情景值。边界涵盖日常交通中的汽油消耗、家庭购入电力与饮食中的牛肉消费，不含全部通勤方式或完整饮食足迹。电力、汽油 CO₂ 与牛肉 CO₂e 的混合边界总和仅作教学比较，不作为实际履约依据。<div className="research-citations"><CitationBadge /><CitationBadge id="carbon-budget" label="[3] IPCC AR6 · 累积排放" /></div></aside>
    <div className="workspace-invite"><span>FROM A ROOM TO YOUR EVERYDAY LIFE.</span><Link className="primary-button" href="/workspace">打开碳足迹穿搭镜 ↗</Link></div>
  </main>;
}
