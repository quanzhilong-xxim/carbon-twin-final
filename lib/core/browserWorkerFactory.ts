import type { WorkerPort } from './workerTransport';

/** Browser-only module URL stays out of the environment-independent controller. */
export function createBrowserWorkerPort(): WorkerPort {
  const worker = new Worker(new URL('./CarbonWorker.ts', import.meta.url), { type: 'module', name: 'carbon-a1' });
  return {
    postMessage: message => worker.postMessage(message), terminate: () => worker.terminate(),
    onMessage: listener => {
      const handler = (event: MessageEvent<unknown>) => listener(event.data);
      worker.addEventListener('message', handler);
      return () => worker.removeEventListener('message', handler);
    },
    onFailure: listener => {
      const handler = (event: Event) => { event.preventDefault(); listener(); };
      worker.addEventListener('error', handler); worker.addEventListener('messageerror', handler);
      return () => { worker.removeEventListener('error', handler); worker.removeEventListener('messageerror', handler); };
    },
  };
}
