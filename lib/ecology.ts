import { calculateEmissions, DEFAULT_ACTIVITY } from '@/lib/emissions';
export const ECOLOGY_BASELINE = calculateEmissions(DEFAULT_ACTIVITY).annual;
/** An explicitly labelled teaching metaphor, never a biological prediction. */
export function ecologyState(annual: number) {
  const ratio = annual / ECOLOGY_BASELINE;
  return { ratio, vitality: Math.max(0, Math.min(1, 1 - ratio / 2)), restoration: Math.max(0, Math.min(1, 1 - ratio)), stress: Math.max(0, Math.min(1, (ratio - 1) / 2)), saved: ECOLOGY_BASELINE - annual };
}
