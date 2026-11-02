'use client';
import ReactECharts from 'echarts-for-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { EChartsType } from 'echarts';
import type { EmissionResult } from '@/lib/emissions';
import { emissionOptions, emissionBarOptions } from '@/lib/charts/emissionOptions';
import { useUIStore } from '@/lib/stores/UIStore';
import { useCarbonStore, THEMES } from '@/lib/store';
import CitationBadge from '../CitationBadge';

export default function EmissionChart({ result, busy }: { result: EmissionResult; busy: boolean }) {
  const chart = useRef<EChartsType | null>(null), bars = useRef<EChartsType | null>(null);
  const identity = useCarbonStore(s => s.activeIdentity), reduced = useUIStore(s => s.reduced);
  const highlighted = useUIStore(s => s.highlighted), emotion = useUIStore(s => s.emotion);
  const revision = useUIStore(s => s.highlightRevision);
  const colors = useMemo(() => emotion === 'danger' ? ['#FF6F91', '#E38A62', '#B7569E'] : [THEMES[identity].accent, '#67E5BD', '#729CF9'], [identity, emotion]);
  const option = useMemo(() => emissionOptions(result, colors, reduced), [result, colors, reduced]);
  const barOption = useMemo(() => emissionBarOptions(result, colors, reduced), [result, colors, reduced]);
  const highlight = useCallback(() => {
    const dataIndex = result.sectors.findIndex(sector => sector.id === highlighted);
    for (const instance of [chart.current, bars.current]) {
      if (!instance || instance.isDisposed()) continue;
      instance.dispatchAction({ type: 'downplay', seriesIndex: 0 });
      if (dataIndex >= 0 && !busy) {
        instance.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex });
        instance.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex });
        instance.getDom().dataset.aiHighlight = highlighted ?? '';
      }
    }
  }, [highlighted, result, busy]);
  useEffect(highlight, [highlight, revision, option]);
  useEffect(() => {
    const instance=chart.current;if(!instance||reduced||busy)return;
    const indices=result.sectors.map((_,i)=>i);
    instance.dispatchAction({type:'select',seriesIndex:0,dataIndex:indices});
    const timer=setTimeout(()=>{if(!instance.isDisposed())instance.dispatchAction({type:'unselect',seriesIndex:0,dataIndex:indices});},180);
    return()=>{clearTimeout(timer);if(!instance.isDisposed())instance.dispatchAction({type:'unselect',seriesIndex:0,dataIndex:indices});};
  },[result,reduced,busy]);
  // echarts-for-react owns dispose() on unmount (including StrictMode replay).
  return <div className={`emission-charts ${busy ? 'chart-busy' : ''}`} aria-busy={busy} data-highlight={highlighted ?? 'none'} data-highlight-revision={revision}>
    <div className="chart-orbit" key={result.annual} aria-hidden="true">{Array.from({length:14},(_,i)=><i key={i} style={{'--i':i} as React.CSSProperties}/>)}</div>
    <ReactECharts option={option} onChartReady={(instance: EChartsType) => { chart.current = instance; highlight(); }} style={{ height: 330 }} opts={{ renderer: 'canvas' }} />
    <ReactECharts option={barOption} onChartReady={(instance: EChartsType) => { bars.current = instance; highlight(); }} style={{ height: 135 }} opts={{ renderer: 'canvas' }} />
    <span className="tiny-label">单位 kg / 年 · 可点击图例筛选 · 非行业统计占比</span>
    <div className="research-citations"><CitationBadge /><CitationBadge id="carbon-budget" label="[3] IPCC AR6 · 累积排放" /></div>
  </div>;
}
