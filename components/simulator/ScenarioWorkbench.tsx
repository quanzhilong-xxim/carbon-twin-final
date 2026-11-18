'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, BookmarkCheck, RotateCcw, Home, TrainFront, Utensils, BriefcaseBusiness, Compass } from 'lucide-react';
import { calculateEmissions, DEFAULT_ACTIVITY, FACTOR_VERSION, FACTORS, isActivity, type Activity } from '@/lib/emissions';
import { useSimulator } from '@/lib/core/SimulatorEngine';
import { useDataStore } from '@/lib/stores/DataStore';

const STORAGE_KEY = 'carbontwin-scenarios-v1';
type Snapshot = { inputs: Activity; year: number; savedAt: number; factorVersion?: string };
type Snapshots = Partial<Record<'A' | 'B', Snapshot>>;
const scenarios = [
  { id: 'initial', name: '初始情景', note: '保留同一条比较基线。', activity: DEFAULT_ACTIVITY },
  { id: 'lighter', name: '轻量一周', note: '减少电力、汽油与牛肉活动量。', activity: { electricity: 90, gasoline: 10, beef: .2 } },
  { id: 'home', name: '居家情景', note: '用电增加，出行与饮食同时变化。', activity: { electricity: 210, gasoline: 5, beef: .3 } },
  { id: 'journey', name: '城市旅程', note: '增加汽油活动量，观察出行选择。', activity: { electricity: 180, gasoline: 70, beef: .5 } },
  { id: 'table', name: '餐桌情景', note: '减少牛肉活动量，观察饮食选择。', activity: { electricity: 180, gasoline: 40, beef: .1 } },
  { id: 'study', name: '办公学习', note: '用电与通勤的独立教学情景。', activity: { electricity: 160, gasoline: 20, beef: .3 } },
  { id: 'leisure', name: '旅行休闲', note: '仅比较旅程中的汽油、电力与牛肉；不含航空等完整旅游足迹。', activity: { electricity: 100, gasoline: 80, beef: .4 } },
] as const;
function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<Snapshot>;
  return isActivity(v.inputs) && Number.isInteger(v.year) && v.year! >= 2000 && v.year! <= 2050 && typeof v.savedAt === 'number' && Number.isFinite(v.savedAt) && v.savedAt > 0;
}
function sameActivity(a: Activity, b: Activity) { return a.electricity === b.electricity && a.gasoline === b.gasoline && a.beef === b.beef; }

export function ScenarioSelector({ disabled }: { disabled: boolean }) {
  const { inputs, replace } = useSimulator();
  const [message, setMessage] = useState('');
  const places = [
    { id: 'home', title: '居家生活', text: '从一扇亮着的窗，看见能源的去向。', target: 'two-lives', Icon: Home },
    { id: 'journey', title: '绿色出行', text: '同一条路，尝试不同的抵达方式。', target: 'activity-lab', Icon: TrainFront },
    { id: 'table', title: '饮食选择', text: '一杯牛奶，也有来自土地的故事。', target: 'pasture-letter', Icon: Utensils },
    { id: 'study', title: '办公学习', text: '在一间房里，认真比较每份消耗。', target: 'coffee-time', Icon: BriefcaseBusiness },
    { id: 'leisure', title: '旅行休闲', text: '走进滨水城市，发现生活的细节。', target: 'digital-room', Icon: Compass },
  ];
  return <section id="daily-choices" className="scenario-starts" data-chapter="2" aria-label="选择教学活动情景">
    <div><span className="section-kicker">A STARTING POINT / 选择出发点</span><h3>同一套方法，试一试另一种日常。</h3><p>以下数值是可编辑的教学假设，不是人群平均值或推荐标准。</p></div>
    <nav className="story-life-choices" aria-label="五种生活故事入口">{places.map(({ id, title, text, target, Icon }) => <a key={id} href={`#${target}`} aria-disabled={disabled || undefined} onClick={event => {
      if (disabled) { event.preventDefault(); return; }
      const scenario = scenarios.find(item => item.id === id);
      if (scenario && replace(scenario.activity)) setMessage(`已应用${title}教学情景，并前往可操作章节。`);
    }}><Icon size={23} /><strong>{title}</strong><span>{text}</span><small>进入故事 <ArrowUpRight size={15} /></small></a>)}</nav>
    <p className="section-kicker">或直接比较七组教学活动量</p>
    <div className="scenario-start-grid">{scenarios.map(s => <button key={s.id} className="scenario-start" disabled={disabled} aria-pressed={sameActivity(inputs, s.activity)} onClick={() => { if (replace(s.activity)) setMessage(`已应用${s.name}，三个活动量已同时更新。`); }}><span>{s.name}<ArrowUpRight size={17} aria-hidden="true" /></span><small>{s.note}</small><em>{s.activity.electricity} kWh / 月 · {s.activity.gasoline} L / 月 · {s.activity.beef} kg / 周</em></button>)}</div>
    <p className="scenario-feedback" role="status">{message || '每次切换同步更新计算、图表与自然场景。'}</p>
  </section>;
}

export default function ScenarioWorkbench({ disabled }: { disabled: boolean }) {
  const { inputs, replace } = useSimulator(), year = useDataStore(s => s.emissions?.startYear) ?? new Date().getFullYear();
  const [snapshots, setSnapshots] = useState<Snapshots>({}), [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        if (saved && typeof saved === 'object' && (saved as { version?: number }).version === 1) {
          const source = (saved as { snapshots?: Snapshots }).snapshots;
          if (source && typeof source === 'object') {
            const valid: Snapshots = {};
            for (const slot of ['A', 'B'] as const) if (isSnapshot(source[slot])) valid[slot] = source[slot];
            setSnapshots(valid);
            const older = Object.values(valid).some(value => value.factorVersion !== FACTOR_VERSION);
            setMessage(Object.keys(valid).length ? older ? '已恢复活动量。旧情景按当前因子重算并明确标记；重新保存 A/B 后再比较变化。' : '已恢复本浏览器保存的情景及因子版本。' : '旧情景格式不可用；当前计算仍可使用。');
          }
        } else setMessage('旧情景格式不可用；当前计算仍可使用。');
      }
    } catch { setMessage('本地情景暂时无法读取；当前计算仍可使用。'); }
    setLoaded(true);
  }, []);
  const save = (slot: 'A' | 'B') => {
    const next = { ...snapshots, [slot]: { inputs: { ...inputs }, year, savedAt: Date.now(), factorVersion: FACTOR_VERSION } };
    setSnapshots(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, snapshots: next })); setMessage(`情景 ${slot} 已保存在此浏览器，可在刷新后恢复。`); }
    catch { setMessage(`情景 ${slot} 已在当前页保留；浏览器存储不可用，刷新后将丢失。`); }
  };
  const a = snapshots.A && calculateEmissions(snapshots.A.inputs, snapshots.A.year), b = snapshots.B && calculateEmissions(snapshots.B.inputs, snapshots.B.year);
  const comparable = snapshots.A?.factorVersion === FACTOR_VERSION && snapshots.B?.factorVersion === FACTOR_VERSION;
  const difference = a && b && comparable ? b.annual - a.annual : null;
  const percent = difference !== null && a && a.annual > 0 ? difference / a.annual * 100 : null;
  return <section id="scenario-comparison" className="scenario-comparison v7-scenario-comparison" aria-label="A/B 情景比较">
    <header><span className="section-kicker">SAVE A CHOICE / COMPARE A CONSEQUENCE</span><h2>把改变留下来。<br /><i>再看清它的重量。</i></h2><p>将现在保存为 A，改变活动量后保存为 B。快照保存在此浏览器，沿用同一套教学因子；不会替换原有学习档案。</p><Link href="/learn?reference=scope-boundaries" className="scenario-method-link">回看核算边界 <ArrowUpRight size={15} aria-hidden="true" /></Link></header>
    <div className="comparison-values">{(['A', 'B'] as const).map(slot => {
      const snapshot = snapshots[slot], estimate = slot === 'A' ? a : b;
      return <article className="scenario-snapshot" key={slot} data-saved={!!snapshot}>
        <div className="scenario-snapshot-heading"><span>情景 {slot}</span><BookmarkCheck size={19} aria-hidden="true" /></div>
        {snapshot && estimate ? <><strong>{estimate.annual.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<small> kg / 年</small></strong><small className="scenario-factor-version">{snapshot.factorVersion === FACTOR_VERSION ? "当前因子版本 · 2023全国电力平均" : "当前版本重算 · 原因子版本未匹配，请重新保存"}</small><p>{snapshot.inputs.electricity} kWh/月 · {snapshot.inputs.gasoline} L/月 · {snapshot.inputs.beef} kg/周</p><dl>{estimate.sectors.map(s => <div key={s.id}><dt>{s.name}</dt><dd>{s.value.toFixed(2)} kg</dd></div>)}</dl><small className="scenario-saved-at">保存于 {new Date(snapshot.savedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} · 北京时间</small></> : <div className="scenario-empty"><span>一段选择，还没有被记录。</span><p>保存当前的三个活动量，建立属于这次实验的参照。</p></div>}
        <div className="scenario-snapshot-actions"><button disabled={disabled || !loaded} onClick={() => save(slot)}>保存当前为 {slot}</button><button disabled={disabled || !snapshot} onClick={() => { if (snapshot && replace(snapshot.inputs)) setMessage(`已恢复情景 ${slot} 的三个活动量。`); }} aria-label={`恢复情景 ${slot}`}><RotateCcw size={14} aria-hidden="true" /> 恢复</button></div>
      </article>;
    })}</div>
    <div className="scenario-difference" aria-live="polite"><span>B − A / 年度教学量变化</span>{difference === null ? <strong>{a && b && !comparable ? "请重新保存 A / B" : "等待两个情景"}</strong> : <><strong>{difference > 0 ? '+' : ''}{difference.toFixed(2)}<small> kg / 年</small></strong><span>{difference < 0 ? <ArrowDown size={15} aria-hidden="true" /> : null}{percent === null ? 'A 为零，百分比变化不适用。' : `相对 A ${difference < 0 ? '减少' : difference > 0 ? '增加' : '变化'} ${Math.abs(percent).toFixed(1)}%`}</span></>}</div>
    <p className="scenario-feedback" role="status">{message || `保存活动量、年份与因子版本。电力采用2023全国平均 ${FACTORS.electricity.value} kg CO₂/kWh；两个情景须使用相同版本。`}</p>
  </section>;
}
