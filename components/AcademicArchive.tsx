'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Bookmark, Check, Search, X } from 'lucide-react';
import { REFERENCES, type AcademicReference } from '@/lib/references';
import { readLibrary, updateReading, type ReadingRecord } from '@/lib/learning/research-library';
import GlassSurface from './GlassSurface';
import CitationModal from './CitationModal';
import EvidenceCoverArt from './EvidenceCoverArt';

const topics = {
  all: { title: '全部证据', english: 'All evidence', note: '从一个问题开始，沿着原始文献找到方法、结论与适用边界。', ids: [] as string[] },
  understand: { title: '理解碳排放', english: 'Understand emissions', note: '辨认温室气体、组织边界与 Scope 分类。产品生命周期与企业盘查各有自己的边界。', ids: ['human-influence','scope-boundaries','carbon-budget','ghgp-corporate','ghgp-scope2','ipcc-syr-risks'] },
  trace: { title: '追踪碳排放', english: 'Trace emissions', note: '从活动量追溯到因子、地区与版本，让每一个数字都有可检查的来路。', ids: ['ghgp-scope3','mee-power-2023','mee-carbon-footprint-2024','mee-factor-database','epa-passenger-vehicle','epa-household-electricity','poore-nemecek'] },
  change: { title: '改变碳排放', english: 'Change emissions', note: '比较需求、能源与系统选择，同时看见行动的实施条件和不确定性。', ids: ['ipcc-wgiii-demand','ipcc-wgiii-energy','wynes-nicholas','ipcc-15c','unep-gap','iea-behaviour','ipcc-land'] },
};
type Topic = keyof typeof topics;

function matchesTopic(entry: AcademicReference, topic: Topic) {
  if (topic === 'all' || topics[topic].ids.includes(entry.id)) return true;
  if (Number(entry.index) <= 32) return topic === 'trace' && Number(entry.index) > 20;
  if (topic === 'understand') return /METHODS|ACCOUNTING|TARGETS/.test(entry.category);
  if (topic === 'trace') return /METHODS|ACCOUNTING|FOOD|MATERIAL/.test(entry.category);
  return /SYSTEMS|TRANSITION|POLICY|BUILDING|TRANSPORT|MATERIAL/.test(entry.category);
}

function evidenceLane(category: string) {
  if (/PHYSICAL SCIENCE|CUMULATIVE|CLIMATE RISK|CLIMATE TARGET/i.test(category)) return 'climate';
  if (/ACCOUNTING|BOUNDAR/i.test(category)) return 'accounting';
  if (/MITIGATION|BEHAVIOUR|ENERGY TRANSITION/i.test(category)) return 'action';
  if (/FACTOR|ACTIVITY|DATA/i.test(category)) return 'measurement';
  if (/LAND|ECOSYSTEM|FOOD/i.test(category)) return 'ecosystem';
  return 'archive';
}

export default function AcademicArchive() {
  const [reference, setReference] = useState<AcademicReference | null>(null);
  const [query, setQuery] = useState(''), [topic, setTopic] = useState<Topic>('all');
  const [records, setRecords] = useState<ReadingRecord[]>([]), [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState('folio'), [limit, setLimit] = useState(9), [failure, setFailure] = useState('');
  const [coverPaused,setCoverPaused]=useState(false);
  const [urlReady,setUrlReady]=useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const restore=()=>{
      const params=new URLSearchParams(location.search),selectedTopic=params.get('topic'),selectedSort=params.get('sort'),count=Number(params.get('count'));
      setQuery((params.get('q')??'').slice(0,160));
      setTopic(selectedTopic&&Object.hasOwn(topics,selectedTopic)?selectedTopic as Topic:'all');
      setSavedOnly(params.get('saved')==='1');
      setSort(selectedSort&&['folio','year','recent'].includes(selectedSort)?selectedSort:'folio');
      setLimit(Number.isFinite(count)&&count>=9?Math.min(45,Math.ceil(count/9)*9):9);
      setCoverPaused(params.get('motion')==='paused');
      setReference(REFERENCES.find(row=>row.id===params.get('reference'))??null);
      setUrlReady(true);
    };
    restore();window.addEventListener('popstate',restore);
    return()=>window.removeEventListener('popstate',restore);
  }, []);
  useEffect(()=>{
    if(!urlReady)return;
    const timer=window.setTimeout(()=>{
      const url=new URL(location.href);
      const values:Record<string,string|undefined>={q:query||undefined,topic:topic==='all'?undefined:topic,saved:savedOnly?'1':undefined,sort:sort==='folio'?undefined:sort,count:limit>9?String(limit):undefined,motion:coverPaused?'paused':undefined,reference:reference?.id};
      Object.entries(values).forEach(([key,value])=>{if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);});
      if(url.href!==location.href)history.replaceState(history.state,'',url);
    },180);
    return()=>window.clearTimeout(timer);
  },[urlReady,query,topic,savedOnly,sort,limit,coverPaused,reference]);
  useEffect(() => {
    let active = true;
    const refresh = () => { void readLibrary().then(rows => { if (active) setRecords(rows); }).catch(() => { if (active) setFailure('阅读清单暂时无法保存；检索与阅读仍可使用。'); }); };
    refresh(); window.addEventListener('carbon-library-updated', refresh);
    return () => { active = false; window.removeEventListener('carbon-library-updated', refresh); };
  }, []);
  const recordMap = useMemo(() => new Map(records.map(row => [row.id, row])), [records]);
  const topicCounts = useMemo(() => Object.fromEntries((Object.keys(topics) as Topic[]).map(key => [key, REFERENCES.filter(entry => matchesTopic(entry, key)).length])) as Record<Topic, number>, []);
  const visible = useMemo(() => {
    const needle = query.trim().normalize('NFKC').toLocaleLowerCase();
    return REFERENCES.filter(entry => matchesTopic(entry, topic) && (!savedOnly || recordMap.get(entry.id)?.saved))
      .filter(entry => !needle || [entry.title, entry.subtitle, entry.organization, entry.citation, entry.summary, entry.explanation, entry.category, entry.year, ...entry.keywords].join(' ').normalize('NFKC').toLocaleLowerCase().includes(needle))
      .sort((a, b) => sort === 'year' ? b.year - a.year || Number(a.index) - Number(b.index) : sort === 'recent' ? (recordMap.get(b.id)?.readAt ?? 0) - (recordMap.get(a.id)?.readAt ?? 0) || Number(a.index) - Number(b.index) : Number(a.index) - Number(b.index));
  }, [query, topic, recordMap, savedOnly, sort]);
  const close = useCallback(() => setReference(null), []);
  const reset = () => { setQuery(''); setTopic('all'); setSavedOnly(false); setLimit(9); };
  const save = (id: string) => { void updateReading(id, 'save').catch(() => setFailure('这次收藏没有保存，请检查浏览器存储后重试。')); };
  const lastRead = REFERENCES.find(entry => entry.id === records.find(row => row.readAt > 0)?.id);
  return <div className="research-register-v7">
    <header className="research-section-heading">
      <div><span className="section-kicker">THE EVIDENCE ARCHIVE / 原始出处与适用边界</span><h2>把问题，带到证据面前。</h2><p>先看科学结论，再核对核算方法、数据来源与它们各自的边界。</p></div>
      <div className="research-current-count" aria-live="polite"><b>{visible.length.toString().padStart(2, '0')}</b><span>条匹配文献<br />当前筛选</span></div>
    </header>
    <section className="evidence-atmosphere" aria-label="理解、追踪与改变的证据">
      <span className="section-kicker">RESEARCH PATHS / 循着问题，找到证据</span>
      <div className="research-paths-v7">{(Object.keys(topics) as Topic[]).map((key, index) => <button key={key} aria-pressed={topic === key} aria-controls="evidence-grid" onClick={() => { setTopic(key); setLimit(9); }}>
        <span className="research-path-number">0{index + 1}</span><strong>{topics[key].title}</strong><span lang="en">{topics[key].english}</span><small>{topicCounts[key].toString().padStart(2, '0')} SOURCES · {REFERENCES.filter(entry => matchesTopic(entry, key) && recordMap.get(entry.id)?.readAt).length} 已打开</small><ArrowUpRight size={19} aria-hidden="true" />
      </button>)}</div>
      <p aria-live="polite">{topics[topic].note}</p>
    </section>
    <div className="reading-desk-v7"><div><span className="section-kicker">YOUR READING DESK / 本地阅读清单</span><p><b>{records.filter(row => row.readAt > 0).length}</b> 篇已打开 · <b>{records.filter(row => row.saved).length}</b> 篇已收藏</p></div>{lastRead ? <button onClick={() => setReference(lastRead)}>继续阅读 <i>{lastRead.title}</i><ArrowUpRight size={16} /></button> : <span>打开一本文献，留下自己的阅读轨迹。</span>}<small>记录仅保存在当前浏览器；打开文献不代表已掌握其内容。</small></div>
    <div className="archive-register"><span>INDEX / {REFERENCES.length} PRIMARY READINGS</span><span>SCIENCE · ACCOUNTING · SYSTEMS</span></div>
    <div className="archive-search"><label htmlFor="archive-search-input"><Search size={16} />检索学术档案</label><div className="research-search-field"><input ref={searchInput} type="search" id="archive-search-input" list="archive-query-examples" aria-controls="evidence-grid" aria-describedby="archive-search-help" value={query} onKeyDown={event => { if (event.key === 'Escape') { setQuery(''); setLimit(9); } }} onChange={event => { setQuery(event.target.value); setLimit(9); }} placeholder="主题、机构或年份，如 Scope 1 / 电力 / 2024" />{query && <button onClick={() => { setQuery(''); setLimit(9); searchInput.current?.focus(); }} aria-label="清除检索词"><X size={16} /></button>}<datalist id="archive-query-examples">{['Scope 1','Scope 2','Scope 3','电力','生命周期','IPCC','2024'].map(term => <option key={term} value={term} />)}</datalist></div><span aria-live="polite">{visible.length} / {REFERENCES.length}</span></div>
    <p className="archive-search-help" id="archive-search-help">按主题、机构、关键词或年份查找；Esc 清除检索词。检索范围为本站 {REFERENCES.length} 条学术档案。</p>
    <div className="research-filter-v7"><button aria-pressed={savedOnly} onClick={() => { setSavedOnly(value => !value); setLimit(9); }}><Bookmark size={15} fill={savedOnly ? 'currentColor' : 'none'} />仅看收藏</button><label>排列方式<select value={sort} onChange={event => setSort(event.target.value)} aria-label="文献排列方式"><option value="folio">档案顺序</option><option value="year">年份从新到旧</option><option value="recent">最近阅读优先</option></select></label><button aria-pressed={coverPaused} onClick={()=>setCoverPaused(value=>!value)}>{coverPaused?'开启封面动态':'暂停封面动态'}</button>{(query || savedOnly || topic !== 'all') && <button onClick={reset}>重置筛选</button>}</div>
    {failure && <p className="research-storage-error" role="alert">{failure}</p>}
    {!visible.length && <div className="research-empty-v7" role="status"><Search size={30} /><h3>{savedOnly ? '阅读清单正在等待第一本书。' : '换一个词，继续追问。'}</h3><p>{savedOnly ? '点击文献卡片上的书签，即可加入当前浏览器的收藏。' : '试试「Scope」「电力」或「生命周期」，也可以清除主题与收藏筛选。'}</p><button className="primary-button" onClick={reset}>查看全部文献 <ArrowUpRight size={16} /></button></div>}
    <div className="archive-grid" id="evidence-grid">{visible.slice(0, limit).map(entry => <article id={`evidence-${entry.id}`} className={`archive-entry archive-entry-${entry.index}`} data-lane={evidenceLane(entry.category)} key={entry.id}>
      <GlassSurface className="academic-card">
        <div className="academic-topline"><span>{entry.category}</span><span>VOL. {entry.index}</span></div>
        <div className="research-cover-v7"><span>{entry.organization}</span><b>{entry.year}</b><EvidenceCoverArt entry={entry} paused={coverPaused}/><small>原创概念图示 · 非实测图表 / 非官方封面</small></div>
        <div className="academic-body"><h2 lang="en">{entry.title}</h2><p className="academic-subtitle">{entry.subtitle}</p><p className="academic-summary">{entry.summary}</p><div className="academic-keywords">{entry.keywords.map(word => <button key={word} onClick={() => { setQuery(word); setLimit(9); }} aria-label={`检索关键词：${word}`}>#{word}</button>)}</div></div>
        <div className="academic-footer"><button className="research-save-v7" aria-label={`${recordMap.get(entry.id)?.saved ? '取消收藏' : '收藏文献'}：${entry.title}`} aria-pressed={recordMap.get(entry.id)?.saved ?? false} onClick={() => save(entry.id)}><Bookmark size={17} fill={recordMap.get(entry.id)?.saved ? 'currentColor' : 'none'} /></button>{recordMap.get(entry.id)?.readAt ? <span className="research-read-v7"><Check size={13} />已打开</span> : null}<button className="citation-badge" onClick={() => setReference(entry)} aria-label={`阅读文献：${entry.title}`}><span>{entry.organization} · {entry.year}</span><ArrowUpRight size={14} /></button></div>
      </GlassSurface>
    </article>)}</div>
    {visible.length > limit && <div className="research-more-v7"><button className="primary-button" onClick={() => setLimit(value => value + 9)}>继续翻阅 · 还有 {visible.length - limit} 篇 <ArrowUpRight size={16} /></button></div>}
    <div className="archive-method"><span className="method-index">A NOTE<br />ON EVIDENCE.</span><div><h2>有出处，也有边界。</h2><p>这份档案区分科学报告、核算标准与本站解读。引用附章节定位；请把摘录放回原文语境阅读。个人减排阈值、统计比较与商品排放，只有被对应数据支持时才成立。</p><a href="https://www.ipcc.ch/reports/" target="_blank" rel="noopener noreferrer">前往 IPCC 完整报告目录 <ArrowUpRight size={14} /></a><a href="/simulator">把阅读带入一次情景比较 <ArrowUpRight size={14} /></a></div></div>
    <CitationModal reference={reference} onClose={close} onNavigate={setReference} />
  </div>;
}
