'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, BookOpen, X } from 'lucide-react';
import type { AcademicReference } from '@/lib/references';
import GlassSurface from './GlassSurface';
import { useUIStore } from '@/lib/stores/UIStore';

export default function CitationModal({ reference, onClose }: { reference: AcademicReference | null; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const systemReduced = useReducedMotion();
  const reduced = useUIStore(s => s.reduced) || systemReduced;
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!reference) return;
    window.dispatchEvent(new CustomEvent('carbon-reference-read'));
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector<HTMLButtonElement>('.modal-close')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const items = dialog.current?.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]');
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); opener?.focus({ preventScroll: true }); };
  }, [reference, onClose]);

  if (!mounted) return null;
  return createPortal(<AnimatePresence>{reference && <motion.div className="citation-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .22 }}>
    <button className="modal-backdrop" aria-label="关闭文献背景遮罩" onClick={onClose} tabIndex={-1} />
    <motion.div ref={dialog} className="citation-dialog" role="dialog" aria-modal="true" aria-labelledby="citation-title" aria-describedby="citation-locator"
      initial={{ opacity: 0, y: reduced ? 0 : 38, scale: reduced ? 1 : .94, filter: reduced ? 'blur(0px)' : 'blur(12px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, y: reduced ? 0 : 20, scale: reduced ? 1 : .97, filter: reduced ? 'blur(0px)' : 'blur(8px)' }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}>
      <GlassSurface className="citation-glass" tilt={false}>
        <div className="modal-header"><span><BookOpen size={15} /> PRIMARY SOURCE / {reference.index}</span><button className="modal-close" onClick={onClose} aria-label="关闭文献"><X size={20} /></button></div>
        <div className="modal-reading-area" data-lenis-prevent>
          <span className="citation-author">{reference.organization} / {reference.year}</span>
          <h2 id="citation-title">{reference.title}</h2>
          <p className="citation-locator" id="citation-locator">{reference.locator}</p>
          <div className="quote-label">{reference.verified ? 'ORIGINAL / 本轮已核对' : 'CATALOG / 待重新核验，勿作正式证据'}</div><blockquote lang="en">“{reference.quote}”</blockquote>
          <div className="quote-label">ZH / 本站译文</div><p className="translation">{reference.translation}</p>
          <div className="citation-interpretation"><h3>如何理解这段原文</h3><p>{reference.explanation}</p></div>
          <div className="citation-limit"><span>READ WITH CONTEXT / 适用边界</span><p>{reference.limitation}</p></div>
          <div className="citation-links"><a className="primary-button" href={reference.url} target="_blank" rel="noopener noreferrer">查看原始文献 <ArrowUpRight size={16} /></a>{reference.doi ? <a className="doi-link" href={reference.doi} target="_blank" rel="noopener noreferrer">DOI <ArrowUpRight size={13} /><span>{reference.doi.replace('https://doi.org/', '')}</span></a> : <span className="no-doi">标准原始发布页 · 未使用 DOI</span>}</div>
          <p className="citation-disclaimer">仅节选原文；译文与解读由本站整理。完整定义和限定条件以原始文献为准。</p>
        </div>
      </GlassSurface>
    </motion.div>
  </motion.div>}</AnimatePresence>, document.body);
}
