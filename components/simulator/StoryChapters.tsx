'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useSimulator } from '@/lib/core/SimulatorEngine';
import { useDataStore } from '@/lib/stores/DataStore';
import { useUIStore } from '@/lib/stores/UIStore';
import { useTwinStore } from '@/lib/experience/store';
import { calculateSpace, OBJECTS, type SpaceObject } from '@/lib/experience/spaces';
import { FACTORS } from '@/lib/emissions';
import { ECOLOGY_BASELINE, ecologyState } from '@/lib/ecology';
import { useStoryState } from '@/lib/hooks/useStoryState';
import ActivityControl, { ACTIVITY_CONTROLS } from './ActivityControl';
const Scene = dynamic(() => import('./StoryScenes'), { ssr: false, loading: () => <div className="story-loading">正在装配场景与材质…</div> });

export const STORY_CHAPTERS = [
  ['sakura-meeting', '樱花之约', 'THE MEETING'], ['daily-choices', '日常选择', 'SMALL CHOICES'], ['ecology-lab', '四季生态舱', 'FOUR SEASONS'],
  ['digital-room', '城市之光', 'CITY LIGHTS'], ['coffee-time', '咖啡时光', 'A CUP OF TIME'], ['eco-companion', '生态伙伴', 'A LIVING RESPONSE'],
  ['two-lives', '两种生活', 'A FAIR COMPARISON'], ['pasture-letter', '牧场来信', 'FROM THE PASTURE'], ['data-echo', '数据回响', 'THE EVIDENCE'], ['story-reflection', '城市余韵', 'BACK TO THE BEGINNING'],
] as const;
export function ChapterLead({ n, title, english, children }: { n: number; title: string; english: string; children?: React.ReactNode }) {
  return <header className="story-chapter-lead"><span className="story-chapter-number">{String(n).padStart(2, '0')}</span><div><span className="section-kicker">{english}</span><h2>{title}</h2>{children && <p>{children}</p>}</div></header>;
}
export function NextChapter({ n }: { n: number }) {
  const next = STORY_CHAPTERS[n]; return next ? <a className="story-next" href={`#${next[0]}`}><span>下一章 / {String(n + 1).padStart(2, '0')}</span><strong>{next[1]}</strong><ArrowDownRight size={22} /></a> : null;
}
function MotionButton({ paused, setPaused }: { paused: boolean; setPaused: (value: boolean) => void }) {
  return <button type="button" className="story-motion" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play size={15} /> : <Pause size={15} />}{paused ? '继续场景动画' : '暂停场景动画'}</button>;
}

export function CafeChapter() {
  const devices = useTwinStore(s => s.devices), energy = useTwinStore(s => s.energy), busy = useUIStore(s => s.networkBusy), [paused, setPaused] = useState(false);
  const result = calculateSpace('cafe', energy, devices);
  const controls: SpaceObject[] = ['coffeeMachine', 'fridge', 'grinder', 'cafeLight'];
  return <section id="coffee-time" className="story-chapter story-cafe" data-chapter="5">
    <ChapterLead n={5} title="留一杯温度，少一点无谓的消耗。" english="A CUP OF TIME">从上一章城市里的街角门厅，走进同一间咖啡馆。拖动环绕，点击设备，或用下方按钮改变它们的运行情景。</ChapterLead>
    <div className="story-wide-scene"><Scene kind="cafe" paused={paused} /><MotionButton paused={paused} setPaused={setPaused} /></div>
    <div className="story-device-grid">{controls.map(id => <button key={id} disabled={busy} aria-pressed={Boolean(devices[id])} onClick={() => useTwinStore.setState(s => ({ devices: { ...s.devices, [id]: !s.devices[id] } }))}><span>{OBJECTS[id].name}</span><strong>{devices[id] ? '运行中' : '已关闭'}</strong><small>{OBJECTS[id].watts} W × {OBJECTS[id].hours} h / 日</small></button>)}</div>
    <div className="story-live-strip" aria-live="polite"><span>同一咖啡馆 · 设备运行情景</span><strong>{result.daily.toFixed(3)} <small>kWh / 日</small></strong><strong>{result.scope2Daily.toFixed(3)} <small>kg CO₂ / 日</small></strong></div>
    <details className="story-method"><summary>这一杯的边界，还缺什么？</summary><p>设备功率和等效满负荷时长是教学假设。只核算咖啡馆运行购电，采用全站相同的 {FACTORS.electricity.value} kg CO₂/kWh 约定值；不是整杯咖啡的生命周期。奶、咖啡豆、包装、冷媒与物流均需要另外的数据。关闭冷柜仅用于数值比较，真实食品安全需要连续冷藏。</p></details>
    <NextChapter n={5} />
  </section>;
}

export function CompanionChapter() {
  const { inputs, update } = useSimulator(), result = useDataStore(s => s.emissions), annual = result?.annual ?? ECOLOGY_BASELINE, eco = ecologyState(annual), busy = useUIStore(s => s.networkBusy);
  const [paused, setPaused] = useState(false), [muted, setMuted] = useState(true), [touches, setTouches] = useState(0);
  const [classic, setClassic] = useState(false);
  useEffect(() => { setClassic(new URLSearchParams(window.location.search).get('companion') === 'classic'); }, []);
  const audio = useRef<AudioContext>(), lastVoice = useRef(-Infinity);
  useEffect(() => () => { void audio.current?.close(); }, []);
  const voice = () => {
    if (muted || performance.now() - lastVoice.current < 700) return; lastVoice.current = performance.now(); const a = audio.current ??= new AudioContext(); void a.resume();
    const osc = a.createOscillator(), gain = a.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(420, a.currentTime); osc.frequency.exponentialRampToValueAtTime(210, a.currentTime + .4); gain.gain.setValueAtTime(0, a.currentTime); gain.gain.linearRampToValueAtTime(.025, a.currentTime + .08); gain.gain.exponentialRampToValueAtTime(.001, a.currentTime + .5); osc.connect(gain).connect(a.destination); osc.start(); osc.stop(a.currentTime + .55); osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  };
  const mood = eco.vitality > .7 ? '活力' : eco.stress > .65 ? '疲惫' : '平衡';
  const touch = () => { setTouches(t => t + 1); voice(); };
  return <section id="eco-companion" className="story-chapter" data-chapter="6" data-companion-state={mood} data-companion-revision={classic ? 'classic' : 'v113e'}>
    <ChapterLead n={6} title="有些回应，不需要语言。" english="A LIVING RESPONSE">同一组日常选择，在这里留下可感知的回响。猫咪的姿态是一种故事表达，不是动物健康或生态影响预测。</ChapterLead>
    <div className="story-split"><div className="story-companion-scene"><Scene kind="cat" vitality={eco.vitality} state={mood} paused={paused} reaction={touches} onInteract={touch} companionModel={classic ? undefined : '/models/behaviour-v113-candidate/woodland-companion-v113e.glb'} /><MotionButton paused={paused} setPaused={setPaused} /></div><div className="story-controls">
      <span className="section-kicker">YOUR COMPANION / {mood}</span><h3>{mood === '活力' ? '抬起头，让今天再轻快一点。' : mood === '疲惫' ? '慢下来，试一试更轻的日常。' : '不必一次完美，持续改变就很好。'}</h3>
      {ACTIVITY_CONTROLS.filter(c => c.key !== 'beef').map(c => <ActivityControl key={c.key} idPrefix="companion-" control={c} value={inputs[c.key]} disabled={busy} highlighted={false} onChange={update} />)}
      <div className="story-live-strip" aria-live="polite"><span>全站当前年度教学量</span><strong>{(annual / 1000).toFixed(3)} <small>t / 年</small></strong></div>
      <div className="story-actions"><button aria-pressed={!muted} onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}{muted ? '开启轻声回应' : '静音'}</button><button onClick={touch}>轻触猫咪</button></div><p role="status">{touches ? `已轻触 ${touches} 次。${paused ? '动作已暂停，继续后回应。' : '它轻轻抬头、眯眼回应。'}陪伴不会改变核算结果。` : '点击猫咪或“轻触猫咪”观察抬头、眯眼与摆尾；拖动画面环绕观察。短音默认静音。'}</p>
      {result && <div className="companion-sources" aria-label="同一情景的排放来源构成"><span className="section-kicker">排放来源 / kg · 年</span>{result.sectors.map(sector => <div key={sector.id}><span>{sector.name}</span><strong>{sector.value.toFixed(1)} <small>kg</small></strong><i><b style={{ width: `${result.annual > 0 ? sector.value / result.annual * 100 : 0}%` }} /></i><small>{result.annual > 0 ? (sector.value / result.annual * 100).toFixed(1) : '0.0'}%</small></div>)}</div>}
    </div></div><NextChapter n={6} />
  </section>;
}

type BuildingInput = { area: number; people: number; intensity: number };
const buildingValid = (v: unknown): v is BuildingInput => typeof v === 'object' && v !== null && ['area', 'people', 'intensity'].every(key => { const n = (v as Record<string, unknown>)[key]; return typeof n === 'number' && Number.isFinite(n) && n >= 1 && n <= (key === 'area' ? 2000 : key === 'people' ? 200 : 350); });
export function BuildingsChapter() {
  const [a, setA] = useStoryState<BuildingInput>('building-a', { area: 100, people: 4, intensity: 45 }, buildingValid), [b, setB] = useStoryState<BuildingInput>('building-b', { area: 600, people: 30, intensity: 180 }, buildingValid);
  const [metric, setMetric] = useStoryState<'area' | 'person'>('building-metric', 'area', (v): v is 'area' | 'person' => v === 'area' || v === 'person'), [paused, setPaused] = useState(false);
  const annualA = a.area * a.intensity, annualB = b.area * b.intensity, perA = annualA * FACTORS.electricity.value / (metric === 'area' ? a.area : a.people), perB = annualB * FACTORS.electricity.value / (metric === 'area' ? b.area : b.people);
  const [view, setView] = useState<'both' | 'home' | 'office'>('both');
  return <section id="two-lives" className="story-chapter" data-chapter="7">
    <ChapterLead n={7} title="比较之前，先站在同一把尺上。" english="A FAIR COMPARISON">住宅与办公室服务不同生活。总量之外，换成相同面积或相同人数，再看选择意味着什么。</ChapterLead>
    <div className="story-actions" role="group" aria-label="生活场景镜头"><button aria-pressed={view === 'both'} onClick={() => setView('both')}>全景对照</button><button aria-pressed={view === 'home'} onClick={() => setView('home')}>A / 走近住宅</button><button aria-pressed={view === 'office'} onClick={() => setView('office')}>B / 走近办公</button></div>
    <div className="story-wide-scene"><Scene kind="buildings" home={a.intensity} office={b.intensity} buildingView={view} onBuildingSelect={setView} paused={paused} /><MotionButton paused={paused} setPaused={setPaused} /></div>
    <div className="building-scene-caption"><span>A / 住宅 · 起居、阳台与日常用能</span><span>B / 办公 · 工作区、幕墙与屋顶设备</span></div>
    <div className="building-inputs">{([{ label: 'A / 住宅情景', value: a, change: setA }, { label: 'B / 办公情景', value: b, change: setB }]).map((item, i) => <fieldset key={i}><legend>{item.label}</legend>{([{ key: 'area', label: '使用面积', unit: 'm²', max: 2000 }, { key: 'people', label: '使用人数', unit: '人', max: 200 }, { key: 'intensity', label: '年度用电强度', unit: 'kWh/m²·年', max: 350 }] as const).map(c => <label key={c.key} htmlFor={`building-${i}-${c.key}`}>{c.label}<output>{item.value[c.key]} {c.unit}</output><input id={`building-${i}-${c.key}`} type="range" min="1" max={c.max} step="1" value={item.value[c.key]} onChange={e => item.change({ ...item.value, [c.key]: Number(e.target.value) })} /></label>)}<p>{(item.value.area * item.value.intensity).toLocaleString()} kWh / 年 · {(item.value.area * item.value.intensity * FACTORS.electricity.value / 1000).toFixed(2)} t CO₂ / 年</p></fieldset>)}</div>
    <div className="story-actions" role="group" aria-label="建筑归一化比较"><button aria-pressed={metric === 'area'} onClick={() => setMetric('area')}>按单位面积</button><button aria-pressed={metric === 'person'} onClick={() => setMetric('person')}>按使用人数</button></div>
    <div className="building-comparison" data-metric={metric} aria-live="polite">{[perA, perB].map((v, i) => <div key={i}><span>{i ? 'B / 办公' : 'A / 住宅'}</span><i style={{ width: `${Math.max(1, v / Math.max(perA, perB, 1) * 100)}%` }} /><strong>{v.toFixed(2)} <small>kg CO₂ / {metric === 'area' ? 'm²·年' : '人·年'}</small></strong></div>)}</div>
    <p className="method-note">同一年度、同一购入电力边界；年用电 = 面积 × 用电强度。每人数值按同时使用人数平均分配，不代表利用率或个人责任。初始参数为教学假设，几何模型不提供计量数据；未包含燃料、冷媒、建材与完整生命周期。</p><NextChapter n={7} />
  </section>;
}

const MILK_STAGES = [
  { title: '牧场', subtitle: '一切从土地和饲养开始。', text: '饲料种植、动物肠道发酵、粪污与牧场用能共同影响原奶。奶牛与小牛共用同一套模型，羊有独立形态。模型不会提供真实甲烷排放量。', source: 'FAO GLEAM', url: 'https://www.fao.org/gleam/en/' },
  { title: '加工', subtitle: '温度、清洗与包装的旅程。', text: '冷却、巴氏杀菌、清洗和包装需要能源。需要工厂实际用电、热源、包装重量与产品分配方法，才能计算每升牛奶的加工足迹。', source: 'FAO GLEAM · 生命周期边界', url: 'https://www.fao.org/gleam/en/' },
  { title: '冷链', subtitle: '把新鲜送到远方，也需要能源。', text: '核对运输距离、载重率、燃料、冷库用电及冷媒泄漏。汽油燃烧因子不能直接代替柴油货运或整个冷链的生命周期。', source: 'GHG Protocol · 价值链核算', url: 'https://ghgprotocol.org/corporate-value-chain-scope-3-standard' },
  { title: '消费', subtitle: '最后的一小段，也值得珍惜。', text: '家庭冷藏、食物损失与包装处理改变边界。减少浪费能减少满足同样消费量所需的上游产量；不等于已经测得精确减排。', source: 'UNEP · Food Waste Index', url: 'https://www.unep.org/resources/publication/food-waste-index-report-2024' },
];
export function PastureChapter() {
  const [stage, setStage] = useStoryState('milk-stage', 0, (v): v is number => Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 3), [litres, setLitres] = useStoryState('milk-litres', 3, (v): v is number => typeof v === 'number' && v >= .5 && v <= 14), [loss, setLoss] = useStoryState('milk-loss', 10, (v): v is number => typeof v === 'number' && v >= 0 && v <= 30), [paused, setPaused] = useState(false), node = MILK_STAGES[stage];
  return <section id="pasture-letter" className="story-chapter" data-chapter="8" data-milk-stage={stage}>
    <ChapterLead n={8} title="一杯牛奶，途经多少个清晨？" english="FROM THE PASTURE">从草地、奶牛与小牛，到工厂、冷链和厨房。把供应链拉近，分清模型、数据与真实证据。</ChapterLead>
    <div className="story-split"><div className="story-pasture-scene"><Scene kind="pasture" stage={stage} paused={paused} /><MotionButton paused={paused} setPaused={setPaused} /></div><div className="story-controls"><nav className="milk-stages" aria-label="乳品四节点">{MILK_STAGES.map((s, i) => <button key={s.title} aria-pressed={stage === i} onClick={() => setStage(i)}><small>{String(i + 1).padStart(2, '0')}</small>{s.title}</button>)}</nav><h3>{node.subtitle}</h3><p aria-live="polite">{node.text}</p><a href={node.url} target="_blank" rel="noreferrer">{node.source} ↗</a>
      <label htmlFor="milk-consumption">每周实际饮用量 <output>{litres} L</output><input id="milk-consumption" type="range" min=".5" max="14" step=".5" value={litres} onChange={e => setLitres(Number(e.target.value))} /></label>
      <label htmlFor="milk-loss">流通与消费损失假设 <output>{loss}%</output><input id="milk-loss" type="range" min="0" max="30" step="1" value={loss} onChange={e => setLoss(Number(e.target.value))} /></label>
      <div className="story-live-strip" aria-live="polite"><span>满足同样饮用量的上游产量</span><strong>{(litres / (1 - loss / 100)).toFixed(2)} <small>L / 周</small></strong></div><p className="method-note">需生产量 = 饮用量 ÷ (1 − 损失比例)。这是物质量教学模型。未取得匹配地域、年份和系统边界的乳品 LCA 因子，不把牛肉 27 kg CO₂e/kg 套给牛奶，也不把此处数值加进个人三活动核算。</p>
    </div></div><details className="story-method"><summary>保留的牛肉供应链研究</summary><p>原有八节点模型、AI聚焦和牛肉生命周期情景仍可展开使用，与上方乳品故事分开标明边界。</p><LegacySupply /></details><NextChapter n={8} />
  </section>;
}
const LegacySupply = dynamic(() => import('../ModelObservatory'), { ssr: false });

export function DataEcho() {
  const { inputs } = useSimulator(), result = useDataStore(s => s.emissions);
  const [open, setOpen] = useState<keyof typeof FACTORS>('electricity');
  return <section id="data-echo" className="story-chapter" data-chapter="9"><ChapterLead n={9} title="让每个数字，都能回到来处。" english="THE EVIDENCE">故事里的变化，回到活动量、单位与因子。这里使用与第二、六章及结尾相同的计算结果。</ChapterLead>
    <div className="story-factor-grid">{(['electricity', 'gasoline', 'beef'] as const).map((key, i) => <button key={key} aria-pressed={open === key} onClick={() => setOpen(key)}><span>{['购入电力','汽油燃烧','牛肉消费'][i]}</span><strong>{inputs[key]} × {key === 'beef' ? '52' : '12'} × {FACTORS[key].value}</strong><small>{result?.sectors[i].value.toFixed(2) ?? '…'} kg / 年</small></button>)}</div>
    <article className="story-evidence" aria-live="polite"><span className="section-kicker">FACTOR / UNIT / BOUNDARY</span><h3>{FACTORS[open].value} {FACTORS[open].unit}</h3><p>{FACTORS[open].source}</p><p>{FACTORS[open].boundary}</p><a href={FACTORS[open].url} target="_blank" rel="noreferrer">查阅来源与方法 ↗</a></article>
    <p className="method-note">月活动量 × 12，周活动量 × 52；当前起始年 {result?.startYear ?? '…'}，固定活动情景至 2050，不预测未来电网或个人行为。电力与燃烧 CO₂、牛肉生命周期 CO₂e 的混合量只适用于本站教学比较。购电在家庭活动和组织 Scope 2 中的归属取决于报告主体；不会自动变成同一个组织的完整清单。</p>
  </section>;
}
