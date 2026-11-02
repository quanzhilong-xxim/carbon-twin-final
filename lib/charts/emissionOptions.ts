import type { EChartsOption } from 'echarts';
import type { EmissionResult } from '@/lib/emissions';

/** All chart values come from the validated Worker result; the palette is purely visual. */
export function emissionOptions(result: EmissionResult, colors: readonly string[], reduced: boolean): EChartsOption {
  const dominant = [...result.sectors].sort((a, b) => b.value - a.value)[0];
  return {
    backgroundColor: 'transparent', color: [...colors],
    animationDuration: reduced ? 0 : 600, animationDurationUpdate: reduced ? 0 : 600,
    animationEasing: 'cubicOut', animationEasingUpdate: 'cubicOut',
    tooltip: { trigger: 'item', formatter: '{b}: {c} kg ({d}%)', backgroundColor: '#102237', borderColor: '#456078', textStyle: { color: '#FFF' } },
    legend: { bottom: 4, textStyle: { color: 'rgba(255,255,255,0.68)', fontSize: 11 }, itemWidth: 7, itemHeight: 7 },
    graphic: [
      { type: 'text', left: 'center', top: '37%', style: { text: `${result.annual ? (dominant.value / result.annual * 100).toFixed(0) : 0}%`, fill: '#F4F9FF', font: 'italic 52px Georgia' } },
      { type: 'text', left: 'center', top: '55%', style: { text: `${dominant.name} · 原始情景占比`, fill: '#AABED3', font: '10px sans-serif' } },
    ],
    series: [{ type: 'pie', selectedMode: 'multiple', selectedOffset: reduced ? 0 : 9, radius: ['50%', '70%'], center: ['50%', '46%'],
      labelLine: { show: false }, label: { show: true, position: 'inside', formatter: '{d}%', color: '#081726', fontSize: 10 }, minShowLabelAngle: 18,
      emphasis: { scale: !reduced, scaleSize: 10, itemStyle: { shadowBlur: reduced ? 0 : 30 } },
      data: result.sectors.map((sector, index) => ({ ...sector, value: Number(sector.value.toFixed(2)),
        itemStyle: { color: colors[index], shadowBlur: reduced ? 0 : 25, shadowColor: colors[index], borderWidth: 3, borderColor: '#0B1827' },
      })),
    }],
  };
}

export function emissionBarOptions(result: EmissionResult, colors: readonly string[], reduced: boolean): EChartsOption {
  return { backgroundColor: 'transparent', animationDuration: reduced ? 0 : 600, animationDurationUpdate: reduced ? 0 : 600, animationEasingUpdate: 'cubicOut',
    grid: { left: 62, right: 35, top: 12, bottom: 22 },
    tooltip: { trigger: 'item', valueFormatter: value => `${value} kg / 年` },
    xAxis: { type: 'value', axisLabel: { color: '#8298AE', fontSize: 9 }, splitLine: { lineStyle: { color: '#FFFFFF0C' } } },
    yAxis: { type: 'category', data: result.sectors.map(s => s.name), axisLabel: { color: '#B9C9D9', fontSize: 10 }, axisTick: { show: false }, axisLine: { show: false } },
    series: [{ type: 'bar', barWidth: 10, data: result.sectors.map((sector, index) => ({ value: Number(sector.value.toFixed(2)), itemStyle: { color: colors[index], borderRadius: 4, shadowBlur: reduced ? 0 : 12, shadowColor: colors[index] } })) }],
  };
}
