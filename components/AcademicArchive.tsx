'use client';

import { useCallback, useMemo, useState } from 'react';
import { ArrowUpRight, Plus } from 'lucide-react';
import { REFERENCES, type AcademicReference } from '@/lib/references';
import GlassSurface from './GlassSurface';
import CitationModal from './CitationModal';

export default function AcademicArchive() {
  const [reference, setReference] = useState<AcademicReference | null>(null), [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return REFERENCES;
    return REFERENCES.filter(entry => [entry.title, entry.subtitle, entry.organization, entry.citation, entry.summary, entry.explanation, ...entry.keywords].join(' ').toLowerCase().includes(needle));
  }, [query]);
  const close = useCallback(() => setReference(null), []);
  return <>
    <div className="archive-register"><span>INDEX / {REFERENCES.length} PRIMARY READINGS</span><span>SCIENCE · ACCOUNTING · SYSTEMS</span></div>
    <div className="archive-search"><label htmlFor="archive-search-input">检索学术档案</label><input id="archive-search-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Scope 1 / 用电 / 汽车 / 牛肉 / 电力因子" /><span>{visible.length} / {REFERENCES.length}</span></div>
    <div className="archive-grid">{visible.map(entry => <article id={entry.id} className={`archive-entry archive-entry-${entry.index}`} key={entry.id}>
      <GlassSurface className="academic-card">
        <div className="academic-topline"><span>{entry.category}</span><span>VOL. {entry.index}</span></div>
        <div className="academic-body"><span className="archive-folio">{entry.index}</span><h2>{entry.title}</h2><p className="academic-subtitle">{entry.subtitle}</p><div className="academic-rule" /><p className="academic-summary">{entry.summary}</p><div className="academic-keywords">{entry.keywords.map(word => <span key={word}>{word}</span>)}</div></div>
        <div className="academic-footer"><span className="source-type"><Plus size={12} /> 原始文献摘录</span><button className="citation-badge" onClick={() => setReference(entry)} aria-label={`阅读文献：${entry.title}`}><span>[{entry.organization}, {entry.year}]</span><ArrowUpRight size={14} /></button></div>
      </GlassSurface>
    </article>)}</div>
    <div className="archive-method"><span className="method-index">A NOTE<br />ON EVIDENCE.</span><div><h2>有出处，也有边界。</h2><p>这份档案区分科学报告、核算标准与本站解读。每一条引用均附章节定位；未被原文支持的个人减排阈值与统计比较，不会被包装成权威结论。</p><a href="https://www.ipcc.ch/reports/" target="_blank" rel="noopener noreferrer">前往 IPCC 完整报告目录 <ArrowUpRight size={14} /></a></div></div>
    <CitationModal reference={reference} onClose={close} />
  </>;
}
