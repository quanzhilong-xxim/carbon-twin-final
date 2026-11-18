'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Leaf } from 'lucide-react';
import { literaryCopy } from '@/lib/copywriting';

const chapters = [
  { label: '城市与日常', category: 'city' },
  { label: '自然与未来', category: 'nature' },
  { label: '陪伴与时间', category: 'love' },
  { label: '家人与记忆', category: 'family' },
  { label: '选择与成长', category: 'philosophy' },
  { label: '知识与行动', category: 'research' },
].map(chapter => ({ ...chapter, lines: literaryCopy.filter(item => item.category === chapter.category).slice(0, 10) }));

export default function ExploreNotebook() {
  const [chapter, setChapter] = useState(0), [line, setLine] = useState(0);
  const current = chapters[chapter], copy = current.lines[line];
  return <section className="explore-notebook" aria-labelledby="notebook-heading">
    <div className="notebook-intro"><span className="explore-kicker"><Leaf size={14} aria-hidden="true" /> FIELD NOTES / 人与城市</span><h2 id="notebook-heading">数字之外，<i>还有日常。</i></h2><p>城市的价值，也在那些很小却值得被记住的瞬间。翻一页，把其中一句留给今天。</p></div>
    <div className="notebook-reader">
      <div className="notebook-tabs" role="group" aria-label="城市札记主题">{chapters.map((item, index) => <button key={item.category} type="button" aria-pressed={chapter === index} onClick={() => { setChapter(index); setLine(0); }}>{item.label}</button>)}</div>
      <blockquote aria-live="polite" key={copy.id}><span aria-hidden="true">“</span>{copy.text}</blockquote>
      <div className="notebook-controls"><small>{String(chapter * 10 + line + 1).padStart(2, '0')} / 60 · 原创城市札记</small><div><button type="button" aria-label="上一条城市札记" onClick={() => setLine(value => (value + 9) % 10)}><ArrowLeft size={18} /></button><button type="button" aria-label="下一条城市札记" onClick={() => setLine(value => (value + 1) % 10)}><ArrowRight size={18} /></button></div></div>
      <details className="notebook-all"><summary>展开「{current.label}」十则</summary><ol>{current.lines.map(item => <li key={item.id}>{item.text}</li>)}</ol></details>
    </div>
  </section>;
}
