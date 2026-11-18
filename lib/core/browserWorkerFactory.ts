import type { WorkerPort } from './workerTransport';

/** Browser-only module URL stays out of the environment-independent controller. */
export function createBrowserWorkerPort(): WorkerPort {
  const worker = new Worker(new URL('./CarbonWorker.ts', import.meta.url), { type: 'module', name: 'carbon-a1' });
  // Keep cancellation errors contained for the worker's entire lifetime.
  // WebKit may deliver an aborted module load after controller subscriptions
  // detach during navigation. Active failures still reach the recovery client.
  const failures=new Set<()=>void>();
  const failed=(event:Event)=>{event.preventDefault();failures.forEach(listener=>listener());};
  worker.addEventListener('error',failed);worker.addEventListener('messageerror',failed);
  return {
    postMessage: message => worker.postMessage(message), terminate: () => {failures.clear();worker.terminate();},
    onMessage: listener => {
      const handler = (event: MessageEvent<unknown>) => listener(event.data);
      worker.addEventListener('message', handler);
      return () => worker.removeEventListener('message', handler);
    },
    onFailure: listener => {
      failures.add(listener);
      return () => {failures.delete(listener);};
    },
  };
}
