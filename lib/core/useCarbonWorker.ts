'use client';

import { useEffect, useRef } from 'react';
import { CarbonWorkerClient } from './CarbonWorkerClient';
import { createBrowserWorkerPort } from './browserWorkerFactory';
import { dataHub } from '@/lib/stores/internal/dataHub';
import { machineHub } from '@/lib/stores/internal/machineHub';

/** A2 mount point: each effect owns exactly one controller, including StrictMode replay. */
export function useCarbonWorker() {
  const controller = useRef<CarbonWorkerClient | null>(null);
  useEffect(() => {
    const instance = new CarbonWorkerClient({ machine: machineHub, publish: dataHub.publishCalculation, factory: createBrowserWorkerPort });
    controller.current = instance; instance.start();
    return () => { instance.stop(); if (controller.current === instance) controller.current = null; };
  }, []);
  return controller;
}
