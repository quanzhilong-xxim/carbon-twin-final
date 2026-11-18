'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { saveSnapshot, readSnapshots } from '@/lib/storage/SnapshotDB';
import { recordLearning } from '@/lib/storage/LearningDB';
import { useDataStore } from '@/lib/stores/DataStore';
import { useUIStore } from '@/lib/stores/UIStore';

const questions = [
  { id: 'scope-electricity', title: 'A boundary, understood.', question: '按 GHG Protocol 的企业核算边界，购入并消耗的电力通常归入哪个 Scope？', options: ['Scope 1：直接排放','Scope 2：购入能源','Scope 3：其余价值链'], correct: 1, explanation: '购电企业通常不直接控制电厂排放源，购入并消耗的电力归入 Scope 2。具体分类始终取决于核算主体与组织边界。', source: 'GHG Protocol · Corporate Standard (2004), Chapter 4', url: 'https://ghgprotocol.org/corporate-standard' },
  { id: 'scope-owned-boiler', title: 'Follow the source.', question: '企业拥有并控制的燃气锅炉，其现场燃烧排放通常归入哪一类？', options: ['Scope 1：直接排放','Scope 2：购入能源','不属于温室气体清单'], correct: 0, explanation: '锅炉由企业拥有或控制，现场燃烧属于直接排放。天然气上游生产和运输可能另属于价值链间接排放，不能与燃烧边界混在一起。', source: 'GHG Protocol · Corporate Standard (2004), Chapter 4', url: 'https://ghgprotocol.org/corporate-standard' },
  { id: 'factor-version', title: 'A number, with context.', question: '用电量乘以排放因子前，最需要核对哪组信息？', options: ['只要图表好看即可','因子的数值越低越好','地区、年份、单位与适用边界'], correct: 2, explanation: '活动量和排放因子的单位、地区、年份与边界必须匹配。不同方法口径的数字不能直接比较，教学约定值也不能冒充商品或家庭实测值。', source: 'GHG Protocol · Scope 2 Guidance (2015)', url: 'https://ghgprotocol.org/scope-2-guidance' },
  { id: 'product-lifecycle', title: 'The whole journey.', question: '判断一件 T 恤的生命周期排放，以下哪种做法更可靠？', options: ['用袖子面积分摊一个假定总量','说明生命周期边界并收集各阶段活动数据','只计算商店照明即可代表整件产品'], correct: 1, explanation: '产品生命周期需要说明原材料、制造、运输、使用与处置的系统边界，并获得对应活动量与因子。几何分层是学习示意，不能代替真实产品数据。', source: 'GHG Protocol · Product Standard (2011)', url: 'https://ghgprotocol.org/product-standard' },
];

export default function ResearchQuiz({ close, onSaved }: { close: () => void; onSaved: () => void }) {
  const [index, setIndex] = useState(0), [answer, setAnswer] = useState<number | null>(null), [submitted, setSubmitted] = useState<number | null>(null);
  const [saving, setSaving] = useState(false), [error, setError] = useState(''), [completed, setCompleted] = useState<string[]>([]);
  const dialog = useRef<HTMLDivElement>(null), result = useDataStore(s => s.emissions), normalized = useDataStore(s => s.normalized.value);
  const systemReduced = useReducedMotion(), reduced = useUIStore(s => s.reduced) || systemReduced;
  const question = questions[index], correct = submitted === question.correct;
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialog.current?.focus();
    let active = true;
    void readSnapshots().then(rows => { if (active) setCompleted([...new Set(rows.filter(row => row.quizResult?.correct && questions.some(q => q.id === row.quizResult?.questionId)).map(row => row.quizResult!.questionId))]); }).catch(() => { if (active) setError('历史答题记录暂不可读；仍可继续本次练习。'); });
    return () => { active = false; document.body.style.overflow = overflow; if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  const submit = async () => {
    if (answer === null || saving || correct) return;
    setSaving(true); setError(''); const isCorrect = answer === question.correct;
    try {
      await saveSnapshot({ id: crypto.randomUUID(), timestamp: Date.now(), actionType: 'quiz', rawData: result?.annual ?? 0, normalizedState: normalized, isPermanent: true, schemaVersion: 1, sequence: Date.now(), quizResult: { questionId: question.id, answer, correct: isCorrect } });
      await recordLearning({ type: 'quiz', question: question.id, answer, correct: isCorrect });
      setSubmitted(answer); onSaved();
      if (isCorrect) {
        setCompleted(values => [...new Set([...values, question.id])]);
        if (!reduced) { const { default: confetti } = await import('canvas-confetti'); void confetti({ particleCount: 60, spread: 65, origin: { y: .55 }, colors: ['#bdd7a8','#e2edcd','#86aa80'], disableForReducedMotion: true }); }
      }
    } catch { setError('记录未完整保存，请检查浏览器存储后重试。'); }
    finally { setSaving(false); }
  };
  const next = () => { setIndex(value => (value + 1) % questions.length); setAnswer(null); setSubmitted(null); setError(''); dialog.current?.focus(); };
  return <motion.div className="quiz-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .2 }} onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <motion.div ref={dialog} tabIndex={-1} className="quiz-dialog" role="dialog" aria-modal="true" aria-labelledby="quiz-title" initial={{ y: reduced ? 0 : 25, scale: reduced ? 1 : .96 }} animate={{ y: 0, scale: 1 }} onKeyDown={e => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { const items = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]'); if (!items?.length) return; const first = items[0], last = items[items.length - 1]; if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }}>
      <div className="quiz-dialog-header"><span>KNOWLEDGE CHECK / {String(index + 1).padStart(2, '0')}</span><button onClick={close} aria-label="关闭随堂测验">关闭 ×</button></div>
      <div className="quiz-v7-progress"><span>已掌握 {completed.length} / {questions.length} 个问题</span><progress value={completed.length} max={questions.length} aria-label="知识检验进度" /></div>
      <h3 id="quiz-title">{question.title}</h3><p>{question.question}</p>
      <div className="quiz-options">{question.options.map((label, choice) => <button key={label} disabled={saving || correct} aria-pressed={answer === choice} onClick={() => { setAnswer(choice); setSubmitted(null); }}>{String.fromCharCode(65 + choice)} / {label}</button>)}</div>
      {submitted !== null && <div role="status" className="quiz-feedback"><p>{correct ? '回答正确，记录已保存。' : '可以重新选择，再理解一次边界。'}{question.explanation}</p><a href={question.url} target="_blank" rel="noopener noreferrer">阅读依据：{question.source} ↗</a></div>}
      {error && <p role="alert">{error}</p>}
      <button className="primary-button" disabled={answer === null || saving || correct} onClick={() => void submit()}>{saving ? '保存中…' : correct ? '已存入学习档案' : '提交答案并保留记录'}</button>
      {correct && <button className="quiz-v7-next" onClick={next}>{index === questions.length - 1 ? '回顾第一题' : '下一题'} ↗</button>}
      <p className="method-note">每次提交保存至当前浏览器；正确记录会在下次打开时保留。</p>
    </motion.div>
  </motion.div>;
}
