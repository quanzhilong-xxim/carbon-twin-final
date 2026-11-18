'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Globe2 } from 'lucide-react';
import { REFERENCES, type AcademicReference } from '@/lib/references';
import CitationModal from './CitationModal';
import { selectLiteraryCopy } from '@/lib/copywriting';
import { useUIStore } from '@/lib/stores/UIStore';
const Library = dynamic(() => import('./3d/ResearchLibraryScene'), { ssr: false, loading: () => <div className="library-loading">正在打开研究图书馆…</div> });
const readings = [{ id: 'human-influence', name: '气候科学', source: 'IPCC · 2021' }, { id: 'scope-boundaries', name: '核算边界', source: 'GHG Protocol · 2004' }, { id: 'ipcc-wgiii-demand', name: '行动与系统', source: 'IPCC · 2022' }];

export default function ResearchLibraryHero() {
  const [reference, setReference] = useState<AcademicReference | null>(null);
  const [copyId, setCopyId] = useState<string>();
  const [pulled, setPulled] = useState<string | null>(null);
  const reduced = useUIStore(s => s.reduced), timer = useRef<ReturnType<typeof setTimeout>>();
  const copy = selectLiteraryCopy({ page: 'research', scene: 'archive', position: 'introduction' }, copyId);
  const open = useCallback((id: string) => {
    clearTimeout(timer.current); setPulled(id);
    const reveal = () => setReference(REFERENCES.find(r => r.id === id) ?? null);
    if (reduced) reveal(); else timer.current = setTimeout(reveal, 650);
  }, [reduced]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const close = useCallback(() => { setReference(null); setPulled(null); }, []);
  return <>
    <header className="library-hero">
      <div className="library-hero-copy"><span className="section-kicker"><BookOpen size={15} /> THE RESEARCH LIBRARY / 学术档案</span><h1>让每一次选择，<br /><i>都有据可循。</i></h1><span className="library-english" lang="en">Read the science. Question everything.</span><p>推开一间研究室，沿着一条证据，<br />看清碳与我们共同生活的关系。</p><div className="library-literary-copy"><span aria-live="polite">{copy?.text}</span><button type="button" onClick={() => setCopyId(copy?.id)} aria-label="换一句思考" title="换一句思考"><ArrowRight size={16} /></button></div><div className="library-entry-actions"><button className="primary-button" onClick={() => open('human-influence')}>寻找第一条证据 <ArrowRight size={17} /></button><a href="#archive">翻阅完整档案 <ArrowDown size={15} /></a></div><div className="library-facts"><span><b>{REFERENCES.length}</b>篇档案条目</span><span><Globe2 size={22} />一个共同世界</span></div></div>
      <figure className="library-hero-world"><Library open={open} pulled={pulled} /><figcaption><span>THE WORLD, IN CONTEXT.</span><span aria-live="polite">{pulled ? '取出一本书，打开原始证据…' : '轻拖转动 · 点选书本'}</span></figcaption></figure>
    </header>
    <nav className="library-featured" aria-label="研究图书馆精选文献">{readings.map((r, i) => <button key={r.id} onClick={() => open(r.id)}><span className="reading-folio">0{i + 1}</span><span><strong>{r.name}</strong><small>{r.source}</small></span><ArrowUpRight size={20} /></button>)}</nav>
    <CitationModal reference={reference} onClose={close} onNavigate={setReference} />
  </>;
}
