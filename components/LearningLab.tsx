'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '@/lib/stores/UIStore';
import { saveSnapshot, readSnapshots } from '@/lib/storage/SnapshotDB';
import { recordLearning } from '@/lib/storage/LearningDB';
import { useDataStore } from '@/lib/stores/DataStore';
import GlassSurface from './GlassSurface';
import ScopeCards from './ScopeCards';
import LearningProgress from './LearningProgress';
const ExplodedModel = dynamic(() => import('./3d/ExplodedModel'), { ssr: false });
function Quiz({ close, onSaved }: { close: () => void; onSaved: () => void }) {
  const [answer, setAnswer] = useState<number | null>(null), [submitted, setSubmitted] = useState<number | null>(null), [saving,setSaving] = useState(false), [error,setError] = useState('');
  const dialog = useRef<HTMLDivElement>(null), result = useDataStore(s => s.emissions), normalized = useDataStore(s => s.normalized.value);
  const reduced = useUIStore(s => s.reduced);
  useEffect(() => { const previous = document.activeElement; dialog.current?.focus(); return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); }; }, []);
  const submit = async () => {
    if (answer === null || saving || submitted === 1) return;
    setSaving(true); setError(''); const correct = answer === 1;
    try {
      await saveSnapshot({ id:crypto.randomUUID(), timestamp:Date.now(), actionType:'quiz', rawData:result?.annual ?? 0, normalizedState:normalized, isPermanent:true, schemaVersion:1, sequence:Date.now(), quizResult:{ questionId:'scope-electricity', answer, correct } });
      await recordLearning({ type:'quiz', question:'scope-electricity', answer, correct }); setSubmitted(answer); onSaved();
      if (correct && !reduced) { const { default: confetti } = await import('canvas-confetti'); void confetti({ particleCount:95, spread:80, origin:{ y:.5 }, colors:['#39ff14','#bcf593','#d4f9bb'], disableForReducedMotion:true }); }
    } catch { setError('记录未完整保存，请检查浏览器存储后重试。'); }
    finally { setSaving(false); }
  };
  return <motion.div className="quiz-overlay" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <motion.div ref={dialog} tabIndex={-1} className="quiz-dialog" role="dialog" aria-modal="true" aria-labelledby="quiz-title" initial={{ y:25,scale:.96 }} animate={{ y:0,scale:1 }} onKeyDown={e => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { const items = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled)'); if (!items?.length) return; const first=items[0],last=items[items.length-1]; if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }}><div className="quiz-dialog-header"><span>KNOWLEDGE CHECK / 01</span><button onClick={close} aria-label="关闭随堂测验">关闭 ×</button></div><h3 id="quiz-title">A boundary, understood.</h3><p>按 GHG Protocol 的企业核算边界，购入并消耗的电力通常归入哪个 Scope？</p>
      <div className="quiz-options">{['Scope 1：直接排放','Scope 2：购入能源','Scope 3：其余价值链'].map((label,index) => <button key={label} disabled={saving || submitted === 1} aria-pressed={answer === index} onClick={() => { setAnswer(index); if (submitted !== 1) setSubmitted(null); }}>{String.fromCharCode(65+index)} / {label}</button>)}</div>
      {submitted !== null && <p role="status" className="quiz-feedback">{submitted === 1 ? '回答正确 · 解锁下一个学习环节。' : '这次归类不正确，可以重新选择。'}购电企业并不直接控制电厂排放源，因此购入并消耗的电力通常计入 Scope 2。自有锅炉属于 Scope 1，其余采购价值链属于 Scope 3；分类取决于核算主体。</p>}
      {error && <p role="alert">{error}</p>}<button className="primary-button" disabled={answer === null || saving || submitted === 1} onClick={() => void submit()}>{saving ? '保存中…' : submitted === 1 ? '已存入学习档案' : '提交答案并保留记录'}</button><p className="method-note">每次提交均保存至当前浏览器的 IndexedDB。</p>
    </motion.div></motion.div>;
}
export default function LearningLab() {
  const [read,setRead] = useState(false), [explored,setExplored] = useState(false), [open,setOpen] = useState(false), [count,setCount] = useState(0), [failure,setFailure] = useState('');
  const invited = useRef(false);
  const refresh = () => { void readSnapshots().then(rows => setCount(rows.filter(r => r.isPermanent).length)).catch(() => setFailure('浏览器存储不可用，当前阅读与练习仍可使用。')); };
  useEffect(() => {
    const handle = () => { setRead(true); void recordLearning({ type:'module',module:'source-reading' }).catch(() => setFailure('文献阅读记录未保存。')); };
    refresh(); window.addEventListener('carbon-reference-read',handle); return () => window.removeEventListener('carbon-reference-read',handle);
  }, []);
  useEffect(() => { if (read && explored && !invited.current) { invited.current = true; setOpen(true); } }, [read,explored]);
  const explore = () => { if (!explored) { setExplored(true); void recordLearning({ type:'module',module:'model-explore' }).catch(() => setFailure('模型探索记录未保存。')); } };
  return <section className="learning-lab"><div className="section-topline"><span>READ → EXPLORE → REFLECT</span><span>答题快照 / {count}</span></div><ScopeCards /><LearningProgress /><div className="learning-grid">
    <GlassSurface className="model-panel" tilt={false}><ExplodedModel onExplore={explore} /></GlassSurface>
    <GlassSurface className="quiz-panel"><span className="section-kicker">A QUESTION WORTH ASKING</span><h2>理解，比记住<br /><i>更重要。</i></h2><div className="quiz-steps"><p>{read ? '✓' : '01'} 打开下方文献卡，阅读原文。</p><p>{explored ? '✓' : '02'} 拆解模型，探索生命周期。</p><p>03 完成测验，留下可追溯的学习记录。</p></div><button className="primary-button quiz-invite" onClick={() => setOpen(true)}>开始随堂测验 ↗</button>{failure && <p role="alert">{failure}</p>}<p className="method-note">记录保存在当前浏览器；清除网站数据会删除记录。</p></GlassSurface>
  </div><AnimatePresence>{open && <Quiz close={() => setOpen(false)} onSaved={refresh} />}</AnimatePresence></section>;
}
