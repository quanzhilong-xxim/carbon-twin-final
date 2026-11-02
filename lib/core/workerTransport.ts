import type { CancelResource, WorkerRequest } from '@/types';

export interface WorkerPort {
  postMessage: (message: WorkerRequest) => void;
  terminate: () => void;
  onMessage: (listener: (data: unknown) => void) => CancelResource;
  onFailure: (listener: () => void) => CancelResource;
}
export interface VisibilitySource {
  isHidden: () => boolean;
  subscribe: (listener: () => void) => CancelResource;
}
export function browserVisibility(): VisibilitySource {
  return {
    isHidden: () => document.hidden,
    subscribe: listener => { document.addEventListener('visibilitychange', listener); return () => document.removeEventListener('visibilitychange', listener); },
  };
}
