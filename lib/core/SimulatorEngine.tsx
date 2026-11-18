'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useCarbonWorker } from './useCarbonWorker';
import { calculateEmissions, DEFAULT_ACTIVITY, type Activity } from '@/lib/emissions';
import { activitySchema } from '@/lib/activitySchema';
import { useStateMachineStore } from '@/lib/stores/StateMachineStore';
import { useUIStore, setIntensity, setChartPending } from '@/lib/stores/UIStore';
import { dataHub } from '@/lib/stores/internal/dataHub';
import { saveSnapshot } from '@/lib/storage/SnapshotDB';
import { recordLearning } from '@/lib/storage/LearningDB';

interface SimulatorContext { inputs: Activity; update: (key: keyof Activity, value: number) => void; replace: (activity: Activity) => boolean; error: string | null }
const Context = createContext<SimulatorContext | null>(null);
export function SimulatorProvider({ children }: { children: ReactNode }) {
  const controller = useCarbonWorker();
  const [inputs, setInputs] = useState<Activity>(DEFAULT_ACTIVITY), [error, setError] = useState<string | null>(null);
  const machine = useStateMachineStore(s => s.state), busy = useUIStore(s => s.networkBusy);
  const last = useRef('');
  useEffect(() => {
    try { const value: unknown = JSON.parse(localStorage.getItem('carbontwin-inputs') ?? 'null'); const checked = activitySchema.safeParse(value); if (checked.success) setInputs(checked.data); } catch { /* Invalid local data is discarded. */ }
    return dataHub.reader.subscribe(state => {
      if (!state.emissions) return;
      setChartPending(false);
      void saveSnapshot({ id: crypto.randomUUID(), timestamp: Date.now(), actionType: 'slide', rawData: state.emissions.annual, normalizedState: state.normalized.value, isPermanent: false, schemaVersion: 1, sequence: state.revision }).catch(() => setError('浏览器未能保存历史记录，当前计算仍可使用。'));
    });
  }, []);
  useEffect(() => {
    if (busy || machine === 'LOCKED' || machine === 'EXPANDING') return;
    const key = JSON.stringify(inputs);
    if (key === last.current) return;
    const timer = setTimeout(() => {
      const annual = calculateEmissions(inputs).annual;
      const result = controller.current?.calculate({ rawData: annual, k: .001, x0: 5000, actionType: 'slide', activities: inputs });
      if (result?.accepted) {
        last.current = key; setError(null); setIntensity(annual / 10000);
        try { localStorage.setItem('carbontwin-inputs', key); } catch { setError('当前计算有效，但浏览器未能保存活动量。'); }
      }
      else { setChartPending(false); setError('计算线程尚未就绪；请调整数值重试。'); }
    }, 120);
    return () => clearTimeout(timer);
  }, [inputs, machine, controller, busy]);
  const update = useCallback((key: keyof Activity, value: number) => {
    if (useUIStore.getState().networkBusy) return;
    const checked = activitySchema.safeParse({ ...inputs, [key]: value });
    if (!checked.success || inputs[key] === value) return;
    setChartPending(true);
    setInputs(checked.data);
    void recordLearning({ type: 'slider', activity: checked.data, field: key }).catch(() => setError('活动调整已计算，但浏览器未能保存这次学习记录。'));
  }, [inputs]);
  // A scenario is one transaction: calling update three times from one event
  // would otherwise reuse the same rendered inputs and lose two of the fields.
  const replace = useCallback((activity: Activity) => {
    if (useUIStore.getState().networkBusy) return false;
    const checked = activitySchema.safeParse(activity);
    if (!checked.success) return false;
    if (JSON.stringify(checked.data) === JSON.stringify(inputs)) return true;
    setChartPending(true);
    setInputs(checked.data);
    void recordLearning({ type: 'module', module: 'simulation' }).catch(() => setError('情景已应用，但浏览器未能保存这次学习记录。'));
    return true;
  }, [inputs]);
  return <Context.Provider value={{ inputs, update, replace, error }}>{children}</Context.Provider>;
}
export function useSimulator() { const context = useContext(Context); if (!context) throw new Error('SimulatorProvider required'); return context; }
