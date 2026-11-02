'use client';
import { useDataStore } from '@/lib/stores/DataStore';
export default function RulerTicker() {
  const result = useDataStore(s => s.emissions);
  const readings = ['GHG PROTOCOL / SCOPE 1 · 2 · 3', 'EVIDENCE BEFORE ASSUMPTION', `YOUR SCENARIO / ${result ? (result.annual / 1000).toFixed(2) : '—'} t / yr`, 'IPCC AR6 / EVERY TONNE MATTERS'];
  return <div className="ruler-ticker" aria-label="碳核算与当前用户情景数据"><div className="ruler-track">{[0, 1].map(copy => <div className="ruler-half" key={copy} aria-hidden={copy === 1}>{readings.map((reading, index) => <div className="ruler-item" key={reading}><div className="ruler-ticks">{Array.from({ length: 16 }, (_, tick) => <i key={tick} style={{ height: tick % 8 === 0 ? 40 : tick % 4 === 0 ? 26 : 18 }} />)}</div><span>{String(index + 1).padStart(2, '0')} / {reading}</span></div>)}</div>)}</div></div>;
}
