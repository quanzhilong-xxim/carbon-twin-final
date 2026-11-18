'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {useState} from 'react';
import { ArrowRight, ScanLine, Sparkles } from 'lucide-react';
import { useDataStore } from '@/lib/stores/DataStore';
import GlassSurface from './GlassSurface';
import CitationBadge from './CitationBadge';
import MagneticButton from './MagneticButton';
import { selectLiteraryCopy } from '@/lib/copywriting';
const CityScene = dynamic(() => import('./CityScene'), { ssr: false, loading: () => <div className="city-poster" /> });
// Historical observations, downloaded from the agencies' source tables, 2015–2024.
// NASA GISTEMP v4 J-D: 1951–1980 baseline; NOAA global marine-surface annual CO₂.
const climate = [
  { id: 'temperature', label: 'GLOBAL TEMPERATURE', value: '+1.28°C', note: '2024 / 相对 1951–1980', values: [.89,1.01,.91,.85,.98,1.01,.85,.89,1.17,1.28], color: '#ff7c86', url: 'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv', source: 'NASA GISTEMP v4' },
  { id: 'co2', label: 'ATMOSPHERIC CO₂', value: '422.79 ppm', note: '2024 / 全球海洋表面年均', values: [399.65,403.07,405.22,407.61,410.07,412.45,414.70,417.08,419.35,422.79], color: '#9af579', url: 'https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_annmean_gl.txt', source: 'NOAA GML' },
];
function Sparks() {
  return <div className="climate-sparks">{climate.map(row => {
    const min = Math.min(...row.values), range = Math.max(...row.values) - min;
    const path = row.values.map((v,i) => `${i ? 'L' : 'M'}${i / 9 * 186 + 2},${40 - (v-min) / range * 32}`).join(' ');
    return <a href={row.url} target="_blank" rel="noreferrer" className="climate-spark" key={row.id}>
      <span>{row.label}<small>2015—2024</small></span><div><strong>{row.value}</strong><svg viewBox="0 0 190 46" role="img" aria-label={`${row.label} 十年趋势，${row.note}`}><defs><filter id={`glow-${row.id}`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="1.5" /></filter></defs><path d={path} fill="none" stroke={row.color} strokeWidth="3" opacity=".5" filter={`url(#glow-${row.id})`} /><path d={path} fill="none" stroke={row.color} strokeWidth="1.5" /></svg></div><small>{row.note}<br />Source: {row.source} ↗</small>
    </a>;
  })}</div>;
}
const stream = ['GLOBAL CO₂ / 422.79 ppm · NOAA 2024', 'NASA GISTEMP / +1.28°C · 2024 vs 1951–80', 'IPCC AR6 / EVERY TONNE MATTERS', 'GHG PROTOCOL / DEFINE THE BOUNDARY', 'E = Σ (ACTIVITY × FACTOR)', 'HISTORICAL OBSERVATIONS · NOT A LIVE FEED'];
export default function EditorialHero() {
  const result = useDataStore(s => s.emissions);
  const [cityStatus,setCityStatus]=useState<'loading'|'ready'|'fallback'>('loading');
  return <section id="home" className="research-hero explore-hero-v7" data-phase="0">
    <div className="research-masthead"><span><span className="live-dot" /> CARBONTWIN / RESEARCH EDITION 001</span><span>CLIMATE SCIENCE × EVERYDAY CHOICES</span></div>
    <div className="narrative-caption" aria-live="polite"><span>我们继承的城市，并非从空白开始。</span><span>每一次选择，都在改写资源如何流动。</span><span>更好的未来，要在此刻一起建成。</span></div>
    <div className="research-grid"><div className="research-copy">
      <p className="eyebrow"><Sparkles size={14} /> FROM PARTICLES TO A LIVING CITY</p>
      <h1 className="research-title explore-title"><span>探索 <em>Explore</em></span><span className="explore-title-tail">从一粒粒数据之光，<br /><i>到一座会呼吸的低碳城市。</i></span></h1>
      <p className="research-deck">{selectLiteraryCopy({ page: 'explore', scene: 'city', position: 'introduction' })?.text}<br />在真实三维场景中，看见选择如何成为土地、树木、道路与建筑。</p>
      <div className="research-citations"><CitationBadge /><CitationBadge id="human-influence" label="[1] IPCC AR6" /><span>企业分类 ≠ 个人足迹分类</span></div>
      <div className="research-actions explore-actions"><MagneticButton href="#home" onClick={() => window.dispatchEvent(new CustomEvent('carbontwin:city-story-play'))}>观看城市生长之旅 <ArrowRight size={17} /></MagneticButton><Link href="/learn">追溯科学依据 ↗</Link></div>
    </div><figure className="city-observatory" aria-label="从微尘汇聚到街区的交互场景，空间示意而非实测数字孪生">
      <div className="city-topline"><ScanLine size={15} /><span>URBAN FIELD / DUST INTO FORM</span><span className="city-status" role="status">{cityStatus==='ready'?'LIVE 3D':cityStatus==='fallback'?'示意视图':'三维载入中'}</span><span className="live-dot" /></div>
      <CityScene onStatusChange={setCityStatus}/>
      <span className="city-axis axis-top">+ Y / THE ANATOMY OF AN IMPACT</span>
      <div className="city-stat city-stat-annual"><GlassSurface><span className="tiny-label">01 / YOUR ANNUAL SCENARIO</span><strong className="shiny-number">{result ? (result.annual/1000).toFixed(2) : '—'}<small> t / yr</small></strong><p><span className="live-dot" /> 活动量驱动 · 教学估算</p><CitationBadge /></GlassSurface></div>
      <div className="city-stat city-stat-future"><GlassSurface><span className="tiny-label">02 / A CONSTANT-HABIT FUTURE</span><strong className="shiny-number">{result ? (result.cumulative/1000).toFixed(1) : '—'}<small> t</small></strong><p>{result?.startYear ?? '当前年'}—2050 · 固定习惯情景</p></GlassSurface></div>
      <figcaption><span>粒子 → 树木 → 场地 → 建筑 → 激活</span><span>城市为空间示意 / 不冒充实测数据<br />拖动或点击章节继续探索 ↗</span></figcaption>
    </figure></div>
    <div className="explore-climate-ledger"><p><span className="explore-kicker">THE WORLD WE SHARE</span>从一座城市出发，<br /><i>理解一个共同世界。</i></p><Sparks /><Link href="/learn">让每个判断，都有证据。<ArrowRight size={17} /></Link></div>
    <div className="scope-ledger" aria-label="企业温室气体核算边界">
      <div><b>01 / DIRECT</b><p>Scope 1 · 企业拥有或控制的排放源：燃料燃烧、自有车辆。</p></div>
      <div><b>02 / PURCHASED</b><p>Scope 2 · 购入并消耗的电力、蒸汽、供热与制冷。</p></div>
      <div><b>03 / VALUE CHAIN</b><p>Scope 3 · 价值链中其余间接排放：采购、使用、处置。</p></div>
      <div><b>E = Σ (AD × EF)</b><p>活动量 × 排放因子。先明确组织边界，再讨论排放。</p></div>
    </div>
    <div className="research-baseline"><span>SCROLL TO DEFINE THE BOUNDARY ↓</span><span>FROM INDIVIDUAL CHOICES TO SHARED FUTURES.</span></div>
    <div className="hero-ticker" aria-label="历史气候观测与核算原则"><div className="ticker-track">{[0,1].map(copy => <div className="ticker-stream" key={copy} aria-hidden={copy === 1}>{stream.map((text,i) => <span data-ticker={i % 3} key={text}><i />{text}</span>)}</div>)}</div></div>
    <div className="seam-mosaic" aria-hidden="true">{Array.from({length:48},(_,i)=><i key={i} className="seam-tile" />)}</div>
  </section>;
}
