'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowUpRight, Zap, Fuel, Utensils } from 'lucide-react';
import { FACTORS, type Activity } from '@/lib/emissions';

export type ActivityKey = keyof Activity;
export const ACTIVITY_CONTROLS = [
  { key: 'electricity' as const, sector: 'energy', title: '购入电力', unit: 'kWh / 月', max: 1000, limit: 10000, step: .01, digits: 2, icon: Zap, presets: [90, 180, 450] },
  { key: 'gasoline' as const, sector: 'transport', title: '汽油用量', unit: 'L / 月', max: 300, limit: 3000, step: 1, digits: 0, icon: Fuel, presets: [10, 40, 100] },
  { key: 'beef' as const, sector: 'food', title: '牛肉消费', unit: 'kg / 周', max: 5, limit: 100, step: .1, digits: 1, icon: Utensils, presets: [.1, .5, 1.5] },
];
type Control = typeof ACTIVITY_CONTROLS[number];
export default function ActivityControl({ control, value, disabled, highlighted, onChange, idPrefix = '' }: { control: Control; value: number; disabled: boolean; highlighted: boolean; onChange: (key: ActivityKey, value: number) => void; idPrefix?: string }) {
  const { key, title, sector, unit, max, limit, step, digits, icon: Icon, presets } = control;
  const inputId = idPrefix + key;
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const invalid = draft !== '' && (!Number.isFinite(Number(draft)) || Number(draft) < 0 || Number(draft) > limit);
  const input = (raw: string) => { setDraft(raw); const number = Number(raw); if (raw !== '' && Number.isFinite(number) && number >= 0 && number <= limit) onChange(key, number); };
  return <section className="slider-block" data-sector={sector} data-highlighted={highlighted}>
    <label htmlFor={inputId}><span><Icon size={17} aria-hidden="true" />{title}</span><output htmlFor={`${inputId} ${inputId}-number`}>{value.toFixed(digits)} <small>{unit}</small></output></label>
    <input id={inputId} type="range" min={0} max={Math.max(max, value)} step={step} value={value} disabled={disabled} aria-valuetext={`${value} ${unit}`} style={{ '--range-progress': `${value / Math.max(max, value) * 100}%` } as CSSProperties} onChange={e => onChange(key, Number(e.target.value))} />
    <div className="activity-edit"><label htmlFor={`${inputId}-number`}>直接输入 · {unit}</label><input id={`${inputId}-number`} type="number" inputMode="decimal" min={0} max={limit} step={step} value={draft} disabled={disabled} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${inputId}-validation` : undefined} onChange={e => input(e.target.value)} onBlur={() => { if (draft === '' || invalid) setDraft(String(value)); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></div>
    {invalid && <p id={`${inputId}-validation`} className="activity-validation" role="status">请输入 0—{limit.toLocaleString('zh-CN')} 之间的数值；当前计算保持不变。</p>}
    <div className="scenario-presets" role="group" aria-label={`${title}预设情景`}>{(['低用量', '初始情景', '高用量'] as const).map((label, i) => <button key={label} disabled={disabled} aria-pressed={value === presets[i]} onClick={() => onChange(key, presets[i])}>{label}</button>)}</div>
    <details className="factor-details"><summary>{FACTORS[key].value} {FACTORS[key].unit} · 因子依据 ↗</summary><p>{FACTORS[key].boundary}</p><a href={FACTORS[key].url} target="_blank" rel="noreferrer">{FACTORS[key].source} <ArrowUpRight size={12} aria-hidden="true" /></a></details>
  </section>;
}
