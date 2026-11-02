import type { RuntimeClock } from '@/types';

export class FakeClock implements RuntimeClock {
  private time = 0;
  private sequence = 0;
  private jobs = new Map<number, { at: number; callback: () => void }>();
  now = () => this.time;
  schedule = (callback: () => void, delayMs: number) => {
    const id = ++this.sequence;
    this.jobs.set(id, { at: this.time + delayMs, callback });
    return () => { this.jobs.delete(id); };
  };
  advance(ms: number) {
    const end = this.time + ms;
    for (;;) {
      const next = [...this.jobs.entries()].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      const [id, task] = next; this.jobs.delete(id); this.time = Math.max(this.time, task.at); task.callback();
    }
    this.time = end;
  }
  get pendingTimers() { return this.jobs.size; }
  stall(ms: number) { this.time += ms; }
}
