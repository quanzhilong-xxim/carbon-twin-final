'use client';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Plus, Minus, BookOpen } from 'lucide-react';
import type { KnowledgeEntry } from '@/lib/knowledge';
import { useCarbonStore } from '@/lib/store';
import GlassPanel from './GlassPanel';
export default function KnowledgeCard({ entry }: { entry: KnowledgeEntry }) {
  const expanded = useCarbonStore(s => s.expandedKnowledge === entry.id), setKnowledge = useCarbonStore(s => s.setKnowledge), reduced = useReducedMotion();
  return <article className={`knowledge-card ${expanded ? 'expanded' : ''}`}
    onPointerEnter={event => { if (event.pointerType === 'mouse') setKnowledge(entry.id); }}
    onPointerLeave={event => { if (event.pointerType === 'mouse' && !event.currentTarget.contains(document.activeElement)) setKnowledge(null); }}
    onFocus={event => { if (event.target.matches(':focus-visible')) setKnowledge(entry.id); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setKnowledge(null); }}>
    <GlassPanel className="knowledge-card-glass">
      <button className="knowledge-trigger" aria-expanded={expanded} aria-controls={`knowledge-${entry.id}`}
        onClick={() => setKnowledge(expanded ? null : entry.id)}>
        <span className="knowledge-index">{entry.index}</span>
        <span className="knowledge-main">
          <span className="knowledge-category">{entry.category} <span className="authority-badge">{entry.organization}</span></span>
          <span className="knowledge-title">{entry.title}</span>
          <span className="knowledge-summary">{entry.summary}</span>
        </span>
        <span className="knowledge-plus">{expanded ? <Minus size={20} /> : <Plus size={20} />}</span>
      </button>
      <motion.div id={`knowledge-${entry.id}`} className="knowledge-detail" initial={false}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : 0.32 }} aria-hidden={!expanded}>
        <div className="knowledge-detail-inner"><p>{entry.explanation}</p>
          <div className="knowledge-source"><span><BookOpen size={13} /> {entry.source}</span>
            <a href={entry.url} target="_blank" rel="noopener noreferrer" tabIndex={expanded ? 0 : -1}>查看原始报告 <ArrowUpRight size={14} /></a>
          </div>
        </div>
      </motion.div>
    </GlassPanel>
  </article>;
}
