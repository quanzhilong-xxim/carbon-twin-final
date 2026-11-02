'use client';

import { useSyncExternalStore } from 'react';
import type { MachineSnapshot } from '@/types';
import { machineHub } from './internal/machineHub';

export function useStateMachineStore<T>(selector: (state: MachineSnapshot) => T): T {
  const snapshot = useSyncExternalStore(machineHub.reader.subscribe, machineHub.reader.getSnapshot, machineHub.reader.getServerSnapshot);
  return selector(snapshot);
}
