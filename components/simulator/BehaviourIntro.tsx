'use client';

import dynamic from 'next/dynamic';
import { useStoryAtmosphere } from '@/lib/stores/StoryAtmosphere';
import StoryAtmosphereControls from '../ecology/StoryAtmosphereControls';
import { ArrowDown, ArrowUpRight, Leaf } from 'lucide-react';
import { useDataStore } from '@/lib/stores/DataStore';
import { ECOLOGY_BASELINE, ecologyState } from '@/lib/ecology';
import { selectLiteraryCopy } from '@/lib/copywriting';
import { STORY_CHAPTERS } from './StoryChapters';
const Sakura = dynamic(() => import('../ecology/SakuraScene'), { ssr: false, loading: () => <div className="library-loading">正在点亮自然场景…</div> });

export default function BehaviourIntro() {
  const annual = useDataStore(s => s.emissions?.annual ?? ECOLOGY_BASELINE), state = ecologyState(annual);
  const weather = useStoryAtmosphere(s => s.weather);
  return <>
    <header id="sakura-meeting" className="behaviour-intro" data-chapter="1">
      <div className="behaviour-intro-copy"><span className="section-kicker"><Leaf size={15} /> THE BEHAVIOUR LAB / 行为沙盘</span><h1>把改变留下来，<br /><i>再看清它的重量。</i></h1><p className="behaviour-deck">Every choice leaves a trace.</p><p>一次开灯、一段路程、一杯咖啡，<br />都是生活里普通的小事。<br />循着一片花瓣，看看选择留下的痕迹。</p><a className="primary-button" href="#daily-choices">开启我的城市故事 <ArrowDown size={17} /></a><a className="behaviour-method-link" href="/learn#scope-boundaries">先理解核算边界 <ArrowUpRight size={15} /></a></div>
      <figure className="behaviour-intro-world"><div className="behaviour-scene-slot"><Sakura /></div><figcaption><span className="section-kicker">A LIVING METAPHOR / 生态教学示意</span><strong>{selectLiteraryCopy({ page:'sandbox', scene:weather, position:'weather' })?.text ?? (state.stress > .65 ? '在失衡之前，看见改变。' : state.vitality > .7 ? '让每一种可能，重新生长。' : '在两种未来之间，做一次选择。')}</strong><small>花瓣、枝条与草地在浏览器中运行；生态活力是象征性叙事，不是碳汇测算。</small></figcaption><StoryAtmosphereControls /></figure>
    </header>
    <nav className="lab-chapters" aria-label="行为沙盘故事导航">{STORY_CHAPTERS.map(([id,title,english],i)=><a href={`#${id}`} key={id}><span>{String(i+1).padStart(2,'0')} / {english}</span><strong>{title}</strong><small>{i===8?'比较结果与核算边界':i===9?'回看你的选择':english}</small></a>)}</nav>
  </>;
}
