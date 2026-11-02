import { machineHub } from '@/lib/stores/internal/machineHub';
import { setNetworkBusy } from '@/lib/stores/UIStore';
/** Network lease: 4s watchdog retained, renewed once/sec, absolute cap 90s. */
export function acquireDialogueLease(abort: () => void) {
  const acquired = machineHub.begin('LOCKED');
  if (!acquired.accepted || !acquired.operationId) return null;
  const owner = acquired.operationId, started = Date.now();
  let closed = false;
  setNetworkBusy(true);
  let unregister: () => void = () => undefined;
  const finish = () => {
    if (closed) return; closed = true; clearInterval(timer); unregister(); setNetworkBusy(false);
    machineHub.complete(owner);
  };
  const timer = setInterval(() => { if (Date.now() - started > 90000) { abort(); finish(); } else machineHub.renew(owner); }, 1000);
  unregister = machineHub.registerCancellation(owner, () => { if (closed) return; closed = true; clearInterval(timer); setNetworkBusy(false); abort(); });
  return Object.freeze({ finish, cancel: () => { abort(); finish(); } });
}
