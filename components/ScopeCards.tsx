'use client';
import { useState } from 'react';
import { recordLearning } from '@/lib/storage/LearningDB';
import { notifyToast } from './Toast';
const scopes = [
  { id:'scope-1', name:'Scope 1', title:'直接排放', example:'企业自有锅炉燃烧、自有车辆尾气。企业拥有或控制排放源时，计入直接排放。', note:'OWNED / CONTROLLED' },
  { id:'scope-2', name:'Scope 2', title:'购入能源', example:'企业购入并消耗的电力、蒸汽、供热、制冷。电厂直接排放，在购电企业侧通常归为间接排放。', note:'PURCHASED ENERGY' },
  { id:'scope-3', name:'Scope 3', title:'其余价值链', example:'购买商品、员工商务旅行、售出产品使用和废弃处置等其余价值链间接排放。先确认组织边界。', note:'UPSTREAM / DOWNSTREAM' },
];
export default function ScopeCards() {
  const [flipped, setFlipped] = useState<string[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState('scope-1');
  const active = scopes.find(scope => scope.id === (hovered ?? selected))!;
  const read = (id: string) => { void recordLearning({ type:'module', module:id }).catch(() => notifyToast('当前浏览器未能保存阅读记录，知识卡仍可使用。')); };
  return <section id="scope-boundaries" aria-label="Scope 1、2、3 结构教学剧场" className="scope-theatre">
    <header><span className="section-kicker">01 / DRAW THE BOUNDARY</span><h2>同一座工厂，<i>三种排放边界。</i></h2><p>分类取决于“谁拥有或控制排放源”，而不是把产品一生简单分成三段。</p></header>
    <figure className="scope-stage" data-active={active.id}>
      <svg viewBox="0 0 960 320" role="img" aria-label={`${active.name}：${active.title}的组织边界示意图`}>
        <defs><pattern id="scope-ground-grid" width="32" height="16" patternUnits="userSpaceOnUse"><path d="M0 16 32 0M0 0l32 16" fill="none" stroke="#9bbf9e" strokeOpacity=".08" /></pattern></defs>
        <path d="M30 198 470 32l460 166-460 116Z" fill="url(#scope-ground-grid)" />
        <path className="scope-boundary" d="m300 178 174-75 187 79-177 94Z" />
        <text x="465" y="296" textAnchor="middle" className="scope-boundary-label">企业拥有 / 控制</text>
        <g className="scope-facility" data-scope="scope-1">
          <path d="m368 169 95-39 110 45-94 45Z" fill="#253f32" />
          <path d="M368 169v64l111 46v-59Zm111 51v59l94-46v-58Z" fill="#42634e" stroke="#97b59b" />
          <path d="m368 169 32-31v22l33-31v20l30-19 110 45-94 45Z" fill="#6b8c68" stroke="#b5c6a0" />
          <path d="M529 156v-63l17-7v77m-17-70 17 7m-70 138v-20m12 25v-20m12 14v-20m12 14v-20m12 14v-20m-137-18v18m14-12v18m14-12v18m14-12v18" fill="none" stroke="#bdc9a5" />
          <path className="scope-smoke" d="M537 80c-15-17 17-21 2-40m9 40c19-18-6-26 9-40" fill="none" stroke="#d8bc86" strokeWidth="3" />
          <text x="473" y="111" textAnchor="middle">自有锅炉 · 燃料燃烧</text>
        </g>
        <g className="scope-facility" data-scope="scope-2">
          <path d="m677 163 31-113 32 113m-55-84h46m-51 21h58m-65 63h76m-52-39 28 24m0-24-28 24m2-98h18" fill="none" stroke="#b4c3ad" strokeWidth="2" />
          <path d="M708 55q-65-39-140-3M708 80q-64-30-140-12" fill="none" stroke="#bcce99" strokeWidth="1.5" />
          <path d="m772 143 47-18 60 25-48 21Z" fill="#84916c" /><path d="M772 143v33l59 25v-30m0 30 48-23v-28" fill="#345342" stroke="#a9bf9b" />
          <path d="m791 148 38-15m-22 22 38-15m-22 22 38-15" stroke="#d7c797" />
          <text x="773" y="235" textAnchor="middle">购入电力 · 蒸汽 · 冷热</text>
        </g>
        <g className="scope-facility" data-scope="scope-3">
          <path d="m79 150 54-22 71 30-53 23Z" fill="#91a17e" /><path d="M79 150v46l72 29v-44Zm72 31v44l53-27v-40Z" fill="#405f4b" stroke="#a0b69c" />
          <path d="m223 210 47-18 38 16-47 19Z" fill="#8e9b78" /><path d="M223 210v25l38 17v-25Zm38 17v25l47-22v-22Z" fill="#42634e" stroke="#abc0a0" />
          <circle cx="236" cy="242" r="6" fill="#14271e" /><circle cx="286" cy="242" r="6" fill="#14271e" />
          <path d="m218 162 45 19 35-13m357 51 32 14 45-18" fill="none" stroke="#d1bd8b" strokeWidth="2" strokeDasharray="5 5" />
          <path d="m737 242 31-13 25 10-31 14Zm0 0v22l25 11v-22m0 22 31-15v-21" fill="#6d8162" stroke="#b2c1a1" />
          <text x="170" y="103" textAnchor="middle">上游原料 · 运输</text><text x="771" y="300" textAnchor="middle">下游使用 · 处置</text>
        </g>
      </svg>
      <figcaption aria-live="polite"><span>{active.name} / {active.title}</span><p>{active.example}</p></figcaption>
    </figure>
    <div className="scope-flips">{scopes.map(scope => <button key={scope.id} className="scope-flip" data-flipped={hovered===scope.id||flipped.includes(scope.id)} aria-pressed={flipped.includes(scope.id)} aria-label={`${scope.name} ${scope.title}：翻转阅读案例`} onMouseEnter={() => setHovered(scope.id)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(scope.id)} onBlur={() => setHovered(null)} onClick={() => { if (!flipped.includes(scope.id)) read(scope.id); setSelected(scope.id); setHovered(null); setFlipped(values => values.includes(scope.id) ? values.filter(id => id !== scope.id) : [...values,scope.id]); }}>
    <span className="scope-flip-inner"><span className="scope-face"><small>{scope.note}</small><b>{scope.name}</b><p>{scope.title} <span aria-hidden="true">/ 翻转探索 ↗</span></p></span><span className="scope-face scope-back"><small>{scope.name} / 场景解码</small><p>{scope.example}</p><small>GHG PROTOCOL · CORPORATE STANDARD</small></span></span>
  </button>)}</div><p className="scope-source-note">组织边界教学图示，不代表工厂实测排放。依据 <a href="https://ghgprotocol.org/corporate-standard" target="_blank" rel="noreferrer">GHG Protocol Corporate Standard (2004)，第 4 章</a>；购电分类另参见 <a href="https://ghgprotocol.org/scope-2-guidance" target="_blank" rel="noreferrer">Scope 2 Guidance (2015)</a>。</p></section>;
}
