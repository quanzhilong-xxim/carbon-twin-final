import { createStore } from 'zustand/vanilla';
import type { CarbonDataState, PublishResult } from '@/types';
import { protectSnapshot } from '@/lib/core/readonly';
import { isWorkerResponse } from '@/lib/core/validation';

/** Internal capability: components must import the public selector module instead. */
export function createDataHub() {
  const initial = protectSnapshot<CarbonDataState>({
    raw: { value: 0, kind: 'demo-raw', unit: 'demo-unit' },
    normalized: { value: 0.5, kind: 'visual-normalized', min: 0, max: 1 },
    revision: 0, provenance: null, emissions: null,
  });
  // The vanilla store and setState are never exported, including by this factory.
  const store = createStore<CarbonDataState>(() => initial);
  const reader = Object.freeze({ getSnapshot: store.getState, getServerSnapshot: () => initial, subscribe: store.subscribe });
  function publishCalculation(input: unknown): PublishResult {
    if (!isWorkerResponse(input) || input.type !== 'RESULT') {
      console.error('[Security Alert] 非法计算结果已阻断');
      return { accepted: false, reason: 'INVALID_RESULT' };
    }
    // Separate, explicitly labelled readouts are committed atomically, never half-published.
    store.setState(protectSnapshot<CarbonDataState>({
      emissions: input.emissions ?? null,
      raw: { value: input.rawData, kind: 'demo-raw', unit: 'demo-unit' },
      normalized: { value: input.normalizedState, kind: 'visual-normalized', min: 0, max: 1 },
      revision: store.getState().revision + 1,
      provenance: { requestId: input.requestId, generation: input.generation, actionType: input.actionType },
    }), true);
    return { accepted: true };
  }
  return Object.freeze({ reader, publishCalculation });
}
export const dataHub = createDataHub();
