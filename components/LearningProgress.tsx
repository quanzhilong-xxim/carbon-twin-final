'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { learningSummary } from '@/lib/storage/LearningDB';
const modules = ['scope-1','scope-2','scope-3','source-reading','model-explore','simulation','ai-inquiry','scope-quiz'];
export default function LearningProgress() {
  const {data:session}=useSession();
  const [summary, setSummary] = useState({ count: 0, modules: [] as string[] }), [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true, running = false, dirty = false;
    const update = async () => {
      if (running) { dirty = true; return; } running = true;
      do { dirty = false; try { const result = await learningSummary(); if (active) setSummary(result); } catch { if (active) setFailed(true); } } while (dirty && active);
      running = false;
    };
    const refresh = () => { void update(); }; refresh(); window.addEventListener('carbon-learning-updated', refresh);
    return () => { active = false; window.removeEventListener('carbon-learning-updated', refresh); };
  }, []);
  const completed = modules.filter(id => summary.modules.includes(id)).length;
  return <div className="learning-progress" role="status"><span>学情进度 / 已完成 {completed}/{modules.length} 个学习环节</span><progress value={completed} max={modules.length} aria-label="学习环节完成进度" /><small>{failed ? '浏览器存储暂不可用' : `${summary.count} 条持久记录 · ${session ? "本地记录" : "本地记录"}`}</small></div>;
}
