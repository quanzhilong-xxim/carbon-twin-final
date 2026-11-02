'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, BookOpen, Globe2 } from 'lucide-react';
import { useCarbonStore } from '@/lib/store';
import EditorialHero from './EditorialHero';
import IdentityCarousel from './IdentityCarousel';
import GlassSurface from './GlassSurface';
import SiteFooter from './SiteFooter';
import RulerTicker from './RulerTicker';
import { useCinematicScroll } from '@/lib/hooks/useCinematicScroll';

const scopes = [
  { number: '01', title: 'Direct.', label: '直接排放', text: '企业拥有或控制的锅炉、车辆等排放源。核算从组织边界开始。' },
  { number: '02', title: 'Purchased.', label: '购入能源', text: '购入并消耗的电力、蒸汽、供热与制冷产生的间接排放。' },
  { number: '03', title: 'Connected.', label: '价值链排放', text: '组织边界之外的其他间接排放，覆盖采购、使用及处置等环节。' },
];

export default function Experience() {
  const root = useRef<HTMLDivElement>(null);
  const identity = useCarbonStore(s => s.activeIdentity);
  useCinematicScroll(root);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) useCarbonStore.getState().setSection(entry.target.id);
    }, { rootMargin: '-25% 0px -55% 0px' });
    root.current?.querySelectorAll('section[id]').forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return <div ref={root} className="carbon-experience" data-identity={identity}>
    <a className="skip-link" href="#boundaries">跳至碳核算边界</a>
    <main>
      <EditorialHero />
      <div className="source-strip"><span>THE SCIENCE BEHIND THE EXPERIENCE</span><a href="https://www.ipcc.ch/report/ar6/" target="_blank" rel="noopener noreferrer">IPCC AR6 <ArrowUpRight size={13} /></a><a href="https://ghgprotocol.org/corporate-standard" target="_blank" rel="noopener noreferrer">GHG Protocol <ArrowUpRight size={13} /></a><small>资料引用 · 非机构合作背书</small></div>
      <section id="boundaries" className="editorial-section boundary-section">
        <div className="section-topline"><span>01 / DEFINE THE BOUNDARY</span><span>ACCOUNTING BEFORE ACTION</span></div>
        <div className="section-intro" data-reveal><h2>One footprint.<br /><i>Three boundaries.</i></h2><p>同一份碳足迹，三种核算视角。<br />Scope 是企业温室气体核算分类，<br />不是给个人行为贴上的三种标签。</p></div>
        <div className="boundary-grid">{scopes.map(scope => <GlassSurface key={scope.number} className="boundary-card"><div className="boundary-index"><span>SCOPE / {scope.number}</span><Globe2 size={16} /></div><h3>{scope.title}</h3><span className="boundary-label">{scope.label}</span><p>{scope.text}</p><Link className="card-source" href="/learn#scope-boundaries">[GHG Protocol, 2004] <ArrowUpRight size={13} /></Link></GlassSurface>)}</div>
      </section>
      <section id="identities" className="editorial-section identity-section">
        <div className="section-topline"><span>02 / CHANGE YOUR PERSPECTIVE</span><span>THREE LENSES · ONE SHARED WORLD</span></div>
        <div className="section-intro" data-reveal><h2>Where you stand<br /><i>changes what you see.</i></h2><p>学生的通勤、企业的价值链、城市的能源系统。<br />切换视角，让问题回到你的处境。</p></div>
        <IdentityCarousel />
      </section>
      <section id="knowledge" className="editorial-section evidence-section" data-reveal>
        <div className="evidence-number" aria-hidden="true">AR6.</div><div className="evidence-copy"><span className="section-kicker"><BookOpen size={15} /> OPEN THE EVIDENCE</span><h2>Every claim.<br /><i>A source.</i></h2><p>从气候归因到核算边界，阅读原文摘录、中文释义与方法限制。让理解建立在可以追溯的证据之上。</p><Link href="/learn" className="primary-button">进入学术档案库 <ArrowUpRight size={18} /></Link></div>
      </section>
      <div className="endnote"><ArrowDown size={14} /><span>理解边界，是行动的第一步。</span><span>KNOW THE BOUNDARY. CHANGE THE OUTCOME.</span></div>
    </main>
    <RulerTicker /><SiteFooter />
  </div>;
}
