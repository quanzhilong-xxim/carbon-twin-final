'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, BookOpen, Users, SlidersHorizontal, Building2 } from 'lucide-react';
import { useCarbonStore } from '@/lib/store';
import EditorialHero from './EditorialHero';
import IdentityCarousel from './IdentityCarousel';
import ScopeCards from './ScopeCards';
import SiteFooter from './SiteFooter';
import RulerTicker from './RulerTicker';
import ExploreJourney from './ExploreJourney';
import ExploreRolePreview from './ExploreRolePreview';
import ExploreHandoffMedia from './ExploreHandoffMedia';
import ExploreNotebook from './ExploreNotebook';
import { useCinematicScroll } from '@/lib/hooks/useCinematicScroll';
import './explore-v7.css';
import './explore-v8-finish.css';
import './explore-v10.css';
import './explore-v10-finish.css';

export default function Experience() {
  const root = useRef<HTMLDivElement>(null);
  const identity = useCarbonStore(s => s.activeIdentity);
  useCinematicScroll(root);
  useEffect(() => { document.body.classList.add('explore-active'); return () => document.body.classList.remove('explore-active'); }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) useCarbonStore.getState().setSection(entry.target.id);
    }, { rootMargin: '-25% 0px -55% 0px' });
    root.current?.querySelectorAll('section[id]').forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return <div ref={root} className="carbon-experience ct-v7-explore" data-identity={identity}>
    <a className="skip-link" href="#boundaries">跳至碳核算边界</a>
    <main>
      <EditorialHero />
      <ExploreJourney />
      <ExploreRolePreview />
      <ExploreNotebook />
      <section id="knowledge" className="editorial-section evidence-section explore-handoff" data-reveal>
        <ExploreHandoffMedia />
        <div className="evidence-number" aria-hidden="true">AR6.</div><div className="evidence-copy"><span className="section-kicker"><BookOpen size={15} /> OPEN THE EVIDENCE</span><h2>Every claim.<br /><i>A source.</i></h2><p>从一座城市里的真实选择出发，继续阅读气候证据、核算边界与方法限制。让理解建立在可以追溯的来源之上。</p><div className="explore-handoff-actions"><Link href="/learn" className="primary-button">进入学术档案库 <ArrowUpRight size={18} /></Link><Link href="/simulator" className="explore-handoff-secondary"><SlidersHorizontal size={16} /> 带着一个问题进入行为沙盘 <ArrowUpRight size={15} /></Link></div></div>
      </section>
      <div className="source-strip"><span>THE SCIENCE BEHIND THE EXPERIENCE</span><a href="https://www.ipcc.ch/report/ar6/" target="_blank" rel="noopener noreferrer">IPCC AR6 <ArrowUpRight size={13} /></a><a href="https://ghgprotocol.org/corporate-standard" target="_blank" rel="noopener noreferrer">GHG Protocol <ArrowUpRight size={13} /></a><small>资料引用 · 非机构合作背书</small></div>
      <nav className="experience-v7-paths" aria-label="选择下一段探索">
        {[
          {number:'01',title:'Find your lens.',label:'身份视角',description:'从你的处境，找到值得追问的问题。',href:'/#identities',Icon:Users},
          {number:'02',title:'Follow the evidence.',label:'学术档案',description:'阅读证据、理解边界，留下学习记录。',href:'/learn',Icon:BookOpen},
          {number:'03',title:'Change one thing.',label:'行为沙盘',description:'调整活动量，比较一组真实计算的情景。',href:'/simulator',Icon:SlidersHorizontal},
          {number:'04',title:'Look a little closer.',label:'建筑与城市',description:'从立面到室内，理解空间与能源的关系。',href:'/city-studies',Icon:Building2},
        ].map(({number,title,label,description,href,Icon})=><Link href={href} key={number} className="experience-v7-path"><span className="experience-v7-path-top"><span>{number} / {label}</span><Icon size={18} aria-hidden="true"/></span><strong>{title}</strong><p>{description}</p><span className="experience-v7-path-go">继续探索 <ArrowUpRight size={17} aria-hidden="true"/></span></Link>)}
      </nav>
      <section id="boundaries" className="editorial-section boundary-section">
        <div className="section-topline"><span>01 / DEFINE THE BOUNDARY</span><span>ACCOUNTING BEFORE ACTION</span></div>
        <div className="section-intro" data-reveal><h2>One footprint.<br /><i>Three boundaries.</i></h2><p>同一份碳足迹，三种核算视角。<br />Scope 是企业温室气体核算分类，<br />不是给个人行为贴上的三种标签。</p></div>
        <ScopeCards />
        <Link className="card-source" href="/learn#scope-boundaries">阅读核算边界与来源 [GHG Protocol] <ArrowUpRight size={13} /></Link>
      </section>
      <section id="identities" className="editorial-section identity-section">
        <div className="section-topline"><span>02 / CHANGE YOUR PERSPECTIVE</span><span>THREE LENSES · ONE SHARED WORLD</span></div>
        <div className="section-intro" data-reveal><h2>换一个身份，<br /><i>看见另一座城市。</i></h2><p><span className="identity-english" lang="en">A different lens. A shared world.</span>学生的通勤、企业的价值链、城市的能源系统。<br />切换视角，让问题回到你的处境。</p></div>
        <IdentityCarousel />
      </section>
      <div className="endnote"><ArrowDown size={14} /><span>理解边界，是行动的第一步。</span><span>KNOW THE BOUNDARY. CHANGE THE OUTCOME.</span></div>
    </main>
    <RulerTicker /><SiteFooter />
  </div>;
}
