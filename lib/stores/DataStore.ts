'use client';

import { useSyncExternalStore } from 'react';
import type { CarbonDataState } from '@/types';
import { dataHub } from './internal/dataHub';

/** Selector only: no setState/getState API or writer is attached to this function. */
export function useDataStore<T>(selector: (state: CarbonDataState) => T): T {
  const snapshot = useSyncExternalStore(dataHub.reader.subscribe, dataHub.reader.getSnapshot, dataHub.reader.getServerSnapshot);
  return selector(snapshot);
}
export function useRawDemoValue() { return useDataStore(state => state.raw); }
export function useNormalizedVisualValue() { return useDataStore(state => state.normalized); }
