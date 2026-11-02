import { CarbonWorkerClient } from '@/lib/core/CarbonWorkerClient';
import { createStateMachine } from '@/lib/core/StateMachine';
import { createDataHub } from '@/lib/stores/internal/dataHub';
import { createBrowserWorkerPort } from '@/lib/core/browserWorkerFactory';
import type { CarbonDataState, MachineSnapshot, WorkerStatusSnapshot } from '@/types';
import type { RequestResult } from '@/lib/core/CarbonWorkerClient';
import type { WorkerPort } from '@/lib/core/workerTransport';

const hub = createDataHub();
const machine = createStateMachine();
const ports: WorkerPort[] = [];
let blocked = false;
const client = new CarbonWorkerClient({ machine, publish: hub.publishCalculation, factory: () => {
  const real = createBrowserWorkerPort(); ports.push(real);
  return { ...real, postMessage: message => { if (!blocked || message.type !== 'CALCULATE') real.postMessage(message); } };
} });

export interface BrowserHarness {
  start: () => void;
  stop: () => void;
  calculate: (rawData: number) => RequestResult;
  status: () => WorkerStatusSnapshot;
  data: () => CarbonDataState;
  machine: () => MachineSnapshot;
  block: (value: boolean) => void;
  kill: () => void;
  workerCount: () => number;
}
declare global { interface Window { __a1: BrowserHarness } }
window.__a1 = {
  start: () => client.start(), stop: () => client.stop(),
  calculate: rawData => client.calculate({ rawData, k: 0.1, x0: 0.5, actionType: 'slide' }),
  status: client.getStatus, data: hub.reader.getSnapshot, machine: machine.reader.getSnapshot,
  block: value => { blocked = value; }, kill: () => ports.at(-1)?.terminate(), workerCount: () => ports.length,
};
