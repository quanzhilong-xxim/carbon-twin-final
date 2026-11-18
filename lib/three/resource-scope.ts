/** Per-view bookkeeping. The underlying Fiber/Drei caches remain shared. */
export class SceneResourceScope {
  private entries = new Map<string, { state: 'pending' | 'ready' | 'error'; clear: () => void; error?: string; promise?: PromiseLike<unknown> }>();
  private listeners = new Set<() => void>();
  private version = 0;
  private scheduled = false;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  snapshot = () => this.version;
  private changed() {
    this.version++;
    // Asset hooks run during render, including renders that suspend. Notify
    // React after that render, never update another component during render.
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => { this.scheduled = false; this.listeners.forEach(fn => fn()); });
  }
  record(key: string, state: 'pending' | 'ready' | 'error', clear: () => void, error?: string) {
    const old = this.entries.get(key);
    if (old?.state === state && old.error === error) return;
    this.entries.set(key, { state, clear, error }); this.changed();
  }
  /** A suspended component can leave before React visits it again. Settle the
   * exact request independently; an old attempt must never alter a retry.
   * suspend-react also fulfills on failure, so inspect the loader cache. */
  trackPending(key: string, promise: PromiseLike<unknown>, clear: () => void, isCached: () => boolean) {
    if (this.entries.get(key)?.promise === promise) return;
    const entry = { state: 'pending' as const, clear, promise };
    this.entries.set(key, entry); this.changed();
    const settle = () => {
      if (this.entries.get(key) !== entry) return;
      if (isCached()) this.record(key, 'ready', clear);
      else { this.entries.delete(key); this.changed(); }
    };
    void Promise.resolve(promise).then(settle, settle);
  }
  get pending() { return [...this.entries].filter(([, value]) => value.state !== 'ready').map(([key]) => key); }
  get errors() { return [...this.entries.values()].flatMap(value => value.error ? [value.error] : []); }
  get progress() { const values = [...this.entries.values()]; return { loaded: values.filter(value => value.state === 'ready').length, total: values.length }; }
  /** Exact full batch keys are retained by each clear closure. No global flush,
   * no disposal of successful models owned by other mounted views. */
  retry() {
    for (const [key, entry] of this.entries) if (entry.state !== 'ready') { entry.clear(); this.entries.delete(key); }
    this.changed();
  }
}

export function sceneError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/creating webgl|webgl.*(not supported|unavailable)|context.*creation/i.test(message)) return '浏览器未能创建 WebGL 上下文；请检查硬件加速与图形策略。';
  return message.replace(/https?:\/\/[^\s)]+/g, url => { try { return new URL(url).pathname; } catch { return '[资源地址]'; } }).slice(0, 320);
}
