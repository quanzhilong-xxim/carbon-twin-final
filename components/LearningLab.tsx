'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import ResearchQuiz from './ResearchQuiz';
import { readSnapshots } from '@/lib/storage/SnapshotDB';
import { recordLearning } from '@/lib/storage/LearningDB';
import GlassSurface from './GlassSurface';
import ScopeCards from './ScopeCards';
import LearningProgress from './LearningProgress';
import RoleGuide from './RoleGuide';
const ExplodedModel = dynamic(() => import('./3d/ExplodedModel'), { ssr: false });
export default function LearningLab() {
  const [read,setRead] = useState(false), [explored,setExplored] = useState(false), [open,setOpen] = useState(false), [count,setCount] = useState(0), [failure,setFailure] = useState('');
  const [ready,setReady] = useState(false);
  const [reading,setReading] = useState(false);
  const refresh = () => { void readSnapshots().then(rows => setCount(rows.filter(r => r.isPermanent).length)).catch(() => setFailure('浏览器存储不可用，当前阅读与练习仍可使用。')); };
  useEffect(() => {
    const handle = () => { setReading(true); setRead(true); void recordLearning({ type:'module',module:'source-reading' }).catch(() => setFailure('文献阅读记录未保存。')); };
    const closed = () => setReading(false);
    refresh(); window.addEventListener('carbon-reference-read',handle); window.addEventListener('carbon-reference-closed',closed);
    return () => { window.removeEventListener('carbon-reference-read',handle); window.removeEventListener('carbon-reference-closed',closed); };
  }, []);
  // Reading and model manipulation must not open a modal over the next
  // pointer or keyboard action. Invite the learner in place instead.
  useEffect(() => { if (read && explored && !reading) setReady(true); }, [read,explored,reading]);
  const explore = () => { if (!explored) { setExplored(true); void recordLearning({ type:'module',module:'model-explore' }).catch(() => setFailure('模型探索记录未保存。')); } };
  return <section className="learning-lab"><div className="section-topline"><span>理解 → 追溯 → 改变</span><span>答题快照 / {count}</span></div><RoleGuide/><nav className="learning-path" aria-label="学习路径"><a href="#scope-boundaries">01 理解核算边界</a><a href="#garment-journey">02 追溯衣物与证据</a><a href="/simulator">03 改变并比较情景 ↗</a></nav><ScopeCards /><LearningProgress /><div className="learning-grid" id="garment-journey">
    <GlassSurface className="model-panel" tilt={false}><ExplodedModel onExplore={explore} /></GlassSurface>
    <GlassSurface className="quiz-panel"><span className="section-kicker">A QUESTION WORTH ASKING</span><h2>理解，比记住<br /><i>更重要。</i></h2><div className="quiz-steps"><p>{read ? '✓' : '01'} 打开下方文献卡，阅读原文。</p><p>{explored ? '✓' : '02'} 拆解模型，探索生命周期。</p><p>03 完成测验，留下可追溯的学习记录。</p></div>{ready && <p role="status" className="method-note">证据与模型已探索，可以开始随堂测验，也可以继续阅读。</p>}<button className="primary-button quiz-invite" onClick={() => setOpen(true)}>开始随堂测验 ↗</button>{failure && <p role="alert">{failure}</p>}<p className="method-note">记录保存在当前浏览器；清除网站数据会删除记录。</p></GlassSurface>
  </div><AnimatePresence>{open && <ResearchQuiz close={() => setOpen(false)} onSaved={refresh} />}</AnimatePresence></section>;
}
