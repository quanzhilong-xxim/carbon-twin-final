'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Bookmark, BookOpen, X } from 'lucide-react';
import { REFERENCES, type AcademicReference } from '@/lib/references';
import { updateReading } from '@/lib/learning/research-library';
import GlassSurface from './GlassSurface';
import { useUIStore } from '@/lib/stores/UIStore';

export default function CitationModal({ reference, onClose, onNavigate }: { reference: AcademicReference | null; onClose: () => void; onNavigate?: (reference: AcademicReference) => void }) {
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false), [storageFailure, setStorageFailure] = useState('');
  const [copyStatus,setCopyStatus]=useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const systemReduced = useReducedMotion();
  const reduced = useUIStore(s => s.reduced) || systemReduced;
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!reference) return;
    window.dispatchEvent(new CustomEvent('carbon-reference-read', { detail: { id: reference.id, title: reference.title } }));
    let active = true;
    setStorageFailure(''); setSaved(false); setCopyStatus('');
    void updateReading(reference.id, 'read').then(row => { if (active) setSaved(row.saved); }).catch(() => { if (active) setStorageFailure('本次阅读未保存；你仍可阅读原文。'); });
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector<HTMLButtonElement>('.modal-close')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button, a[href], summary, [tabindex="0"]') ?? []).filter(item => item.getClientRects().length > 0 && !item.hasAttribute('disabled'));
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { active = false; document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, [reference, onClose]);

  if (!mounted) return null;
  const related = reference ? REFERENCES.filter(entry => entry.id !== reference.id).map(entry => ({ entry, weight: (entry.category === reference.category ? 3 : 0) + entry.keywords.filter(word => reference.keywords.includes(word)).length })).sort((a, b) => b.weight - a.weight).slice(0, 2).map(row => row.entry) : [];
  const toggleSaved = () => { if (!reference) return; void updateReading(reference.id, 'save').then(row => setSaved(row.saved)).catch(() => setStorageFailure('收藏未保存，请检查浏览器存储后重试。')); };
  const copyCitation=async()=>{if(!reference)return;try{await navigator.clipboard.writeText(`${reference.organization} (${reference.year}). ${reference.citation}. ${reference.locator}. ${reference.url}`);setCopyStatus('引文与原始链接已复制。');}catch{setCopyStatus('浏览器暂不允许复制，可展开下方引文手动选择。');}};
  return createPortal(<AnimatePresence onExitComplete={() => window.dispatchEvent(new CustomEvent('carbon-reference-closed'))}>{reference && <motion.div className="citation-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .22 }}>
    <button className="modal-backdrop" aria-label="关闭文献背景遮罩" onClick={onClose} tabIndex={-1} />
    <motion.div ref={dialog} className="citation-dialog academic-v7-dialog" role="dialog" aria-modal="true" aria-labelledby="citation-title" aria-describedby="citation-locator"
      initial={{ opacity: 0, y: reduced ? 0 : 38, scale: reduced ? 1 : .94, filter: reduced ? 'blur(0px)' : 'blur(12px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, y: reduced ? 0 : 20, scale: reduced ? 1 : .97, filter: reduced ? 'blur(0px)' : 'blur(8px)' }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}>
      <GlassSurface className="citation-glass" tilt={false}>
        <div className="modal-header"><span><BookOpen size={15} /> PRIMARY SOURCE / {reference.index}</span><button className="modal-close" onClick={onClose} aria-label="关闭文献"><X size={20} /></button></div>
        <div className="modal-reading-area" data-lenis-prevent>
          <span className="citation-author">{reference.organization} / {reference.year}</span>
          <h2 id="citation-title">{reference.title}</h2>
          <p className="citation-locator" id="citation-locator">{reference.locator}</p>
          <div className="quote-label">{reference.quoteKind === 'verbatim' ? 'EXCERPT / 原文摘录 · 请结合完整章节阅读' : 'SOURCE NOTES / 本站归纳 · 非逐字引文'}</div><blockquote lang={reference.quoteKind === 'verbatim' ? 'en' : undefined}>{reference.quoteKind === 'verbatim' ? `“${reference.quote}”` : reference.summary}</blockquote>
          {reference.quoteKind === 'verbatim' && <><div className="quote-label">ZH / 本站译文</div><p className="translation">{reference.translation}</p></>}
          <div className="citation-interpretation"><h3>如何理解与应用</h3><p>{reference.explanation}</p></div>
          <div className="citation-limit"><span>READ WITH CONTEXT / 适用边界</span><p>{reference.limitation}</p></div>
          <div className="citation-links"><a className="primary-button" href={reference.url} target="_blank" rel="noopener noreferrer">查看原始文献 <ArrowUpRight size={16} /></a>{reference.doi ? <a className="doi-link" href={reference.doi} target="_blank" rel="noopener noreferrer">DOI <ArrowUpRight size={13} /><span>{reference.doi.replace('https://doi.org/', '')}</span></a> : <span className="no-doi">标准原始发布页 · 未使用 DOI</span>}</div>
          <div className="citation-links"><button className="citation-save-v7" aria-pressed={saved} onClick={toggleSaved}><Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />{saved ? '已加入阅读清单' : '收藏到阅读清单'}</button><span className="no-doi">阅读与收藏保存在当前浏览器。</span></div>
          <div className="citation-links"><button className="citation-save-v7" onClick={copyCitation}>复制引文与来源</button><a href={`/learn?reference=${encodeURIComponent(reference.id)}#archive`}>打开本条档案链接 ↗</a></div>
          <p role="status" className="no-doi">{copyStatus}</p>
          <details className="citation-limit"><summary>完整引文</summary><p>{reference.organization} ({reference.year}). {reference.citation}. {reference.locator}. <a href={reference.url} target="_blank" rel="noopener noreferrer">{reference.url}</a></p></details>
          {storageFailure && <p role="alert" className="research-storage-error">{storageFailure}</p>}
          {onNavigate && <section className="citation-related-v7" aria-label="关联阅读"><h3>FOLLOW THE THREAD / 关联阅读</h3><div>{related.map(entry => <button key={entry.id} onClick={() => { onNavigate(entry); dialog.current?.querySelector('.modal-reading-area')?.scrollTo({ top: 0 }); }}><strong>{entry.title}</strong><span>{entry.organization} · {entry.year} ↗</span></button>)}</div></section>}
          <p className="citation-disclaimer">{reference.quoteKind === 'verbatim' ? '仅节选原文；译文由本站整理。' : '本条为本站整理的阅读笔记。'}完整定义和限定条件以原始文献为准。</p>
        </div>
      </GlassSurface>
    </motion.div>
  </motion.div>}</AnimatePresence>, document.body);
}
