import type { RuntimeClock } from '@/types';

export const runtimeClock: RuntimeClock = {
  now: () => performance.now(),
  schedule: (callback, delayMs) => {
    const timer = globalThis.setTimeout(callback, delayMs);
    return () => globalThis.clearTimeout(timer);
  },
};
