import { FACTORS } from '../emissions';
import { OBJECTS, type calculateSpace } from '../experience/spaces';

/** A deterministic companion, labelled separately from the generated explanation. */
export function roomCalculationSummary(totals: ReturnType<typeof calculateSpace>, selected?: string | null): string {
  const device = totals.objects.find(row => row.id === selected);
  const line = (name: string, daily: number) => `${name}：${daily.toFixed(3)} kWh/日；${(daily * 30).toFixed(2)} kWh/月；${(daily * 30 * FACTORS.electricity.value).toFixed(2)} kg CO₂/月。`;
  return ['服务端计算对照（非 AI 生成，30 天教学情景）',
    ...(device ? [line(OBJECTS[device.id].name, device.kWh)] : []),
    line('整个房间（含照明及启用设备）', totals.daily),
    `仅为购电运行排放；${FACTORS.electricity.value} kg CO₂/kWh，${FACTORS.electricity.source}。${FACTORS.electricity.boundary}。`].join('\n');
}
