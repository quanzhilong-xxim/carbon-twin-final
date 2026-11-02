import type { WorkerRequest } from '@/types';
import type { VisibilitySource, WorkerPort } from '@/lib/core/workerTransport';

export class FakeWorker implements WorkerPort {
  messages: WorkerRequest[] = [];
  terminated = false;
  private listeners = new Set<(data: unknown) => void>();
  private failures = new Set<() => void>();
  postMessage = (message: WorkerRequest) => { this.messages.push(message); };
  terminate = () => { this.terminated = true; };
  onMessage = (listener: (data: unknown) => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  onFailure = (listener: () => void) => { this.failures.add(listener); return () => { this.failures.delete(listener); }; };
  emit(data: unknown) { this.listeners.forEach(listener => listener(data)); }
  fail() { this.failures.forEach(listener => listener()); }
  get listenerCount() { return this.listeners.size + this.failures.size; }
}
export class FakeVisibility implements VisibilitySource {
  private hidden = false;
  private listeners = new Set<() => void>();
  isHidden = () => this.hidden;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  change(hidden: boolean) { this.hidden = hidden; this.listeners.forEach(listener => listener()); }
  get listenerCount() { return this.listeners.size; }
}
