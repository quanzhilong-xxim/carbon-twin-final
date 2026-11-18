'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { searchSite, SEARCH_INDEX, type SearchGroup } from '@/lib/siteSearch';
const groups: [SearchGroup,string][]=[['all','全部内容'],['research','学术与材料'],['explore','探索与角色'],['lab','行为沙盘'],['architecture','建筑工作台']];
export default function SiteSearch({initialQuery=''}:{initialQuery?:string}) {
 const [query,setQuery]=useState(initialQuery),[group,setGroup]=useState<SearchGroup>('all'),[ready,setReady]=useState(false),input=useRef<HTMLInputElement>(null);
 useEffect(()=>setReady(true),[]);
 const results=useMemo(()=>searchSite(query,group),[query,group]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();input.current?.focus();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 useEffect(()=>{const url=new URL(location.href);if(query)url.searchParams.set('q',query);else url.searchParams.delete('q');history.replaceState(history.state,'',url);},[query]);
 return <main className="site-search-page" data-ready={ready}><header className="site-search-heading"><span className="section-kicker">THE CONNECTED INDEX / 站内搜索</span><h1>带着问题，<br/><i>找到下一条线索。</i></h1><p>在学术证据、城市探索、行为故事与建筑研究之间，循着同一个问题继续走。</p></header>
  <form className="site-search-form" role="search" onSubmit={e=>e.preventDefault()}><label htmlFor="site-search"><Search size={21}/>搜索 CarbonTwin</label><div><input id="site-search" ref={input} type="search" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setQuery('');}} placeholder="试试 Scope、纤维、咖啡、学生或光庭" aria-controls="site-search-results" aria-describedby="site-search-help"/>{query&&<button type="button" aria-label="清除站内搜索" onClick={()=>{setQuery('');input.current?.focus();}}><X size={19}/></button>}<kbd>Ctrl K</kbd></div></form>
  <p id="site-search-help" className="site-search-help">检索本站 {SEARCH_INDEX.length} 条内容。多个词共同匹配；Esc 清除。结果依据已保存内容，不调用外部 AI。</p>
  <div className="site-search-suggestions">{['Scope 3','纤维','咖啡','学生','光庭'].map(word=><button key={word} onClick={()=>{setQuery(word);setGroup('all');}}>{word} ↗</button>)}</div>
  <nav className="site-search-filters" aria-label="搜索内容分类">{groups.map(([key,label])=><button key={key} aria-pressed={group===key} onClick={()=>setGroup(key)}>{label}</button>)}</nav>
  <div className="site-search-count" aria-live="polite"><span>{query?'SEARCH RESULTS / 检索结果':'BROWSE THE INDEX / 浏览索引'}</span><strong>{results.length} 条</strong></div>
  <div id="site-search-results" className="site-search-results">{results.map((row,i)=><Link href={row.href} key={row.id} className="site-search-result"><span className="site-search-folio">{String(i+1).padStart(2,'0')}</span><div><small>{row.source}</small><h2>{row.title}<span>{row.subtitle}</span></h2><p>{row.text.length>150?row.text.slice(0,150)+'…':row.text}</p></div><ArrowUpRight size={24}/></Link>)}</div>
  {!results.length&&<div className="site-search-empty" role="status"><Search size={34}/><h2>这里还没有这条线索。</h2><p>试试更短的词，或切换内容分类。</p><button onClick={()=>{setQuery('');setGroup('all');input.current?.focus();}}>清除条件，浏览全部内容 ↗</button></div>}
 </main>;
}
