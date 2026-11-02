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
  const read = (id: string) => { void recordLearning({ type:'module', module:id }).catch(() => notifyToast('当前浏览器未能保存阅读记录，知识卡仍可使用。')); };
  return <section aria-label="Scope 1、2、3 翻转知识卡" className="scope-flips">{scopes.map(scope => <button key={scope.id} className="scope-flip" data-flipped={flipped.includes(scope.id)} aria-pressed={flipped.includes(scope.id)} aria-label={`${scope.name} ${scope.title}：翻转阅读案例`} onMouseEnter={() => { if (!flipped.includes(scope.id)) { setFlipped(values => [...values,scope.id]); read(scope.id); } }} onClick={() => { if (!flipped.includes(scope.id)) read(scope.id); setFlipped(values => values.includes(scope.id) ? values.filter(id => id !== scope.id) : [...values,scope.id]); }}>
    <span className="scope-flip-inner"><span className="scope-face"><small>{scope.note}</small><b>{scope.name}</b><p>{scope.title} <span aria-hidden="true">/ 翻转探索 ↗</span></p></span><span className="scope-face scope-back"><small>{scope.name} / 场景解码</small><p>{scope.example}</p><small>GHG PROTOCOL · CORPORATE STANDARD</small></span></span>
  </button>)}</section>;
}
