'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowUpRight, ScanLine } from 'lucide-react';
import { useDataStore } from '@/lib/stores/DataStore';
import { useScrambleText } from '@/lib/hooks/useScrambleText';
import GlassSurface from './GlassSurface';
import CitationBadge from './CitationBadge';
import MagneticButton from './MagneticButton';
const CityScene = dynamic(() => import('./CityScene'), { ssr: false, loading: () => <div className="city-poster" /> });
function DecodedLine({ text, delay }: { text: string; delay: number }) {
  const value = useScrambleText(text, delay);
  return <span aria-label={text}><span aria-hidden="true">{Array.from(value).map((letter, i) => <span className="decode-letter" key={i}>{letter === ' ' ? '\u00a0' : letter}</span>)}</span></span>;
}
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
  return <section id="home" className="research-hero" data-phase="0">
    <div className="narrative-caption" aria-hidden="true"><span>01 / THE CITY WE INHERIT</span><span>02 / THE WEIGHT OF A CHOICE</span><span>03 / A FUTURE WE CAN REBUILD</span></div>
    <div className="research-masthead"><span><span className="live-dot" /> CARBONTWIN / RESEARCH EDITION 001</span><span>CLIMATE SCIENCE × EVERYDAY CHOICES</span></div>
    <div className="research-grid"><div className="research-copy">
      <p className="eyebrow">MAKE THE INVISIBLE / ACCOUNTABLE.</p>
      <h1 className="research-title"><DecodedLine text="Unmasking" delay={0} /><em><DecodedLine text="Scope 1/2/3:" delay={150} /></em><span className="research-subtitle"><DecodedLine text="The Invisible Ledger." delay={300} /></span></h1>
      <p className="research-deck">看见一座城市的呼吸，读懂每一次选择的重量。<br />以气候科学为起点，以可追溯的核算为尺度。</p>
      <Sparks />
      <div className="scope-ledger">
        <div><b>01 / DIRECT</b><p>Scope 1 · 企业拥有或控制的排放源：燃料燃烧、自有车辆。</p></div>
        <div><b>02 / PURCHASED</b><p>Scope 2 · 购入并消耗的电力、蒸汽、供热与制冷。</p></div>
        <div><b>03 / VALUE CHAIN</b><p>Scope 3 · 价值链中其余间接排放：采购、使用、处置。</p></div>
        <div><b>E = Σ (AD × EF)</b><p>活动量 × 排放因子。先明确组织边界，再讨论排放。</p></div>
      </div>
      <div className="research-citations"><CitationBadge /><CitationBadge id="human-influence" label="[1] IPCC AR6" /><span>企业分类 ≠ 个人足迹分类</span></div>
      <div className="research-actions"><MagneticButton href="/simulator">进入行为沙盘 <ArrowUpRight size={17} /></MagneticButton><Link href="/learn">追溯科学依据 ↗</Link></div>
    </div><figure className="city-observatory" aria-label="交互式绿色立方粒子城市，空间示意而非实测数字孪生">
      <div className="city-topline"><ScanLine size={15} /><span>URBAN FIELD / INSTANCED VOXELS</span><span className="live-dot" /></div>
      <CityScene />
      <span className="city-axis axis-top">+ Y / THE ANATOMY OF AN IMPACT</span>
      <div className="city-stat city-stat-annual"><GlassSurface><span className="tiny-label">01 / YOUR ANNUAL SCENARIO</span><strong className="shiny-number">{result ? (result.annual/1000).toFixed(2) : '—'}<small> t / yr</small></strong><p><span className="live-dot" /> 活动量驱动 · 教学估算</p><CitationBadge /></GlassSurface></div>
      <div className="city-stat city-stat-future"><GlassSurface><span className="tiny-label">02 / A CONSTANT-HABIT FUTURE</span><strong className="shiny-number">{result ? (result.cumulative/1000).toFixed(1) : '—'}<small> t</small></strong><p>{result?.startYear ?? '当前年'}—2050 · 固定习惯情景</p></GlassSurface></div>
      <figcaption><span>SPACE IS A METAPHOR.<br />THE CALCULATION IS EXPLICIT.</span><span>城市为空间示意 / 不冒充实测数据<br />MOVE TO EXPLORE ↗</span></figcaption>
    </figure></div>
    <div className="research-baseline"><span>SCROLL TO DEFINE THE BOUNDARY ↓</span><span>FROM INDIVIDUAL CHOICES TO SHARED FUTURES.</span></div>
    <div className="hero-ticker" aria-label="历史气候观测与核算原则"><div className="ticker-track">{[0,1].map(copy => <div className="ticker-stream" key={copy} aria-hidden={copy === 1}>{stream.map((text,i) => <span data-ticker={i % 3} key={text}><i />{text}</span>)}</div>)}</div></div>
    <div className="seam-mosaic" aria-hidden="true">{Array.from({length:48},(_,i)=><i key={i} className="seam-tile" />)}</div>
  </section>;
}
