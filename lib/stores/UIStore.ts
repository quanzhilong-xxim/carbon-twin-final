'use client';
import type { Citation } from '@/lib/ai/retrieval';
import { create } from 'zustand';
import type { ThemeTarget, ModelTarget } from '@/types';
import type { Sector } from '@/lib/emissions';

interface UIState {
  reduced: boolean; motionPreference: 'system' | 'reduce' | 'full';
  emotion: ThemeTarget; intensity: number; progress: number;
  focus: ModelTarget; highlighted: Sector | null;
  advice: string; adviceContext: string; adviceCitations: Citation[]; presentation: boolean; networkBusy: boolean; chartPending: boolean;
  focusRevision: number; highlightRevision: number;
  lastAction: string; actionRevision: number; ecoRevision: number;
}
export const useUIStore = create<UIState>(() => ({ reduced: false, motionPreference: 'system', emotion: 'neutral', intensity: 0, progress: 0, focus: 'overview', highlighted: null, advice: '', adviceContext: '', adviceCitations: [], presentation: false, networkBusy: false, chartPending: false, focusRevision: 0, highlightRevision: 0, lastAction: '', actionRevision: 0, ecoRevision: 0 }));
export const restoreEcosystem = () => useUIStore.setState(s => ({ ecoRevision: s.ecoRevision + 1 }));
export const setMotionPreference = (motionPreference: UIState['motionPreference']) => useUIStore.setState({ motionPreference });
export const setScrollProgress = (progress: number) => useUIStore.setState({ progress: Math.min(1, Math.max(0, progress)) });
export const setIntensity = (intensity: number) => useUIStore.setState({ intensity: Math.max(0, Math.min(1, intensity)) });
export const setNetworkBusy = (networkBusy: boolean) => useUIStore.setState({ networkBusy });
export const setChartPending = (chartPending: boolean) => useUIStore.setState({ chartPending });
export const setAdvice = (advice: string, adviceContext = '', adviceCitations: Citation[] = []) => useUIStore.setState({ advice, adviceContext, adviceCitations });
let pulse: ReturnType<typeof setTimeout> | undefined;
export function pulseTheme(emotion: ThemeTarget) {
  clearTimeout(pulse); useUIStore.setState({ emotion });
  pulse = setTimeout(() => useUIStore.setState({ emotion: 'neutral' }), 3000);
}
export const focusModel = (focus: ModelTarget) => useUIStore.setState(state => ({ focus, focusRevision: state.focusRevision + 1 }));
export const highlightChart = (highlighted: Sector) => useUIStore.setState(state => ({ highlighted, highlightRevision: state.highlightRevision + 1 }));
export const recordAIAction = (lastAction: string) => useUIStore.setState(state => ({ lastAction, actionRevision: state.actionRevision + 1 }));
