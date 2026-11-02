import { calculateSigmoid } from '@/lib/math/sigmoid';
import { calculateEmissions } from '@/lib/emissions';
import { isWorkerRequest } from './validation';
import type { WorkerResponse } from '@/types';

let generation: number | null = null;
const send = (message: WorkerResponse) => self.postMessage(message);

self.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (!isWorkerRequest(event.data)) return;
  const message = event.data;
  if (message.type === 'INITIALIZE') {
    if (generation !== null) return;
    generation = message.generation;
    send({ type: 'READY', generation });
    return;
  }
  if (message.generation !== generation) return;
  if (message.type === 'PROBE') { send({ type: 'PING', generation }); return; }
  try {
    const { rawData, k, x0, actionType } = message.payload;
    const emissions = message.payload.activities ? calculateEmissions(message.payload.activities) : undefined;
    const calculated = emissions?.annual ?? rawData;
    send({ type: 'RESULT', generation, requestId: message.requestId, rawData: calculated, actionType, normalizedState: calculateSigmoid(calculated, k, x0), ...(emissions ? { emissions } : {}) });
  } catch {
    send({ type: 'ERROR', generation, requestId: message.requestId, code: 'CALCULATION_FAILED' });
  }
});
// The interval belongs to the worker and is destroyed by terminate().
setInterval(() => { if (generation !== null) send({ type: 'PING', generation }); }, 200);
