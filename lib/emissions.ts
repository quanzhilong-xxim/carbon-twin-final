export interface Activity { readonly electricity: number; readonly gasoline: number; readonly beef: number }
export function isActivity(input: unknown): input is Activity {
  if (typeof input !== 'object' || input === null) return false;
  const a = input as Record<string, unknown>;
  return Object.keys(a).length === 3 && (['electricity', 'gasoline', 'beef'] as const).every((key, index) => typeof a[key] === 'number' && Number.isFinite(a[key]) && a[key] >= 0 && a[key] <= [10000, 3000, 100][index]);
}
export type Sector = 'energy' | 'transport' | 'food';
export interface EmissionResult {
  readonly annual: number;
  readonly cumulative: number;
  readonly years: number;
  readonly startYear: number;
  readonly sectors: readonly { readonly id: Sector; readonly name: string; readonly value: number }[];
}
/** Scenario factors are deliberately versioned; never presented as current universal factors. */
export const FACTOR_VERSION = 'CT-2026-11-MEE2023-0.5306-EPA2.3-EWG2011-27';
export const FACTORS = {
  electricity: { value: .5306, unit: 'kg CO₂ / kWh', source: '生态环境部、国家统计局：2023 年全国电力平均 CO₂ 因子（公告2025年第47号，2025-12-31发布）', url: 'https://www.mee.gov.cn/xxgk2018/xxgk/xxgk01/202512/t20251231_1139517.html', boundary: '中国全国平均、2023数据、地点法购电间接 CO₂；非实时电网、市场法或完整生命周期 CO₂e' },
  gasoline: { value: 2.3, unit: 'kg CO₂ / L', source: 'US EPA：汽油每美制加仑约 8,887 g CO₂，取整教学值', url: 'https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle', boundary: '仅燃烧 CO₂；不含燃料上游和车辆制造' },
  beef: { value: 27, unit: 'kg CO₂e / kg', source: 'EWG Meat Eaters Guide (2011)：牛肉生命周期教学情景', url: 'https://www.ewg.org/meateatersguide/a-meat-eaters-guide-to-climate-change-health-what-you-eat-matters/', boundary: '特定研究的生命周期 CO₂e；不能代表每种牛肉或产地' },
} as const;
export const DEFAULT_ACTIVITY: Activity = { electricity: 180, gasoline: 40, beef: .5 };
export function calculateEmissions(input: Activity, startYear = new Date().getFullYear()): EmissionResult {
  if (!isActivity(input)) throw new TypeError('Invalid activity');
  const a = input;
  if (!Number.isInteger(startYear) || startYear < 2000 || startYear > 2050) throw new RangeError('Invalid scenario year');
  const sectors = [
    { id: 'energy' as const, name: '购入电力', value: a.electricity * 12 * FACTORS.electricity.value },
    { id: 'transport' as const, name: '汽油燃烧', value: a.gasoline * 12 * FACTORS.gasoline.value },
    { id: 'food' as const, name: '牛肉消费', value: a.beef * 52 * FACTORS.beef.value },
  ];
  const annual = sectors.reduce((sum, sector) => sum + sector.value, 0);
  const years = 2050 - startYear;
  return { annual, cumulative: annual * years, years, startYear, sectors };
}
export function isEmissionResult(value: unknown): value is EmissionResult {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  if (!['annual', 'cumulative', 'years', 'startYear'].every(key => typeof r[key] === 'number' && Number.isFinite(r[key]))) return false;
  if (typeof r.annual !== 'number' || r.annual < 0 || typeof r.years !== 'number' || typeof r.startYear !== 'number' || !Number.isInteger(r.startYear) || r.startYear < 2000 || r.startYear > 2050 || r.years !== 2050 - r.startYear || r.cumulative !== r.annual * r.years) return false;
  if (!Array.isArray(r.sectors) || r.sectors.length !== 3) return false;
  const ids = new Set<string>(); let total = 0;
  for (const s of r.sectors) {
    if (typeof s !== 'object' || s === null || !['energy','transport','food'].includes(s.id) || typeof s.name !== 'string' || typeof s.value !== 'number' || !Number.isFinite(s.value) || s.value < 0) return false;
    ids.add(s.id); total += s.value;
  }
  return ids.size === 3 && Math.abs(total - r.annual) < 1e-6;
}
