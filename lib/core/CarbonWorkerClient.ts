import type { CalculationPayload, CancelResource, PublishResult, RuntimeClock, WorkerResponse, WorkerStatus, WorkerStatusSnapshot } from '@/types';
import type { StateMachineEngine } from './StateMachine';
import { runtimeClock } from './clock';
import { protectSnapshot } from './readonly';
import { isCalculationPayload, isWorkerResponse } from './validation';
import { browserVisibility, type VisibilitySource, type WorkerPort } from './workerTransport';

type Options = {
  machine: StateMachineEngine;
  publish: (result: unknown) => PublishResult;
  factory: () => WorkerPort;
  visibility?: VisibilitySource;
  clock?: RuntimeClock;
  onStatus?: (snapshot: WorkerStatusSnapshot) => void;
};
type Pending = { readonly requestId: string; readonly owner: string; readonly payload: CalculationPayload; unregister: CancelResource };
export type RequestResult = { accepted: true; requestId: string } | { accepted: false; reason: 'INVALID_INPUT' | 'NOT_RUNNING' | 'BUSY' };

/** Owns one worker. No DOM/Worker access occurs until start(), making imports SSR-safe. */
export class CarbonWorkerClient {
  private readonly clock: RuntimeClock;
  private visibility: VisibilitySource | null = null;
  private port: WorkerPort | null = null;
  private detach: CancelResource[] = [];
  private unwatchVisibility: CancelResource | null = null;
  private cancelMonitor: CancelResource | null = null;
  private pending: Pending | null = null;
  private running = false;
  private ready = false;
  private unhealthy = false;
  private generation = 0;
  private sequence = 0;
  private recoveryCount = 0;
  private spawnedAt = 0;
  private lastPing = 0;
  private lastMonitorCheck = 0;
  private status: WorkerStatusSnapshot = protectSnapshot({ status: 'STOPPED', generation: 0, recoveryCount: 0, reason: null });

  constructor(private readonly options: Options) { this.clock = options.clock ?? runtimeClock; }
  getStatus = (): WorkerStatusSnapshot => this.status;
  private report(status: WorkerStatus, reason: string | null = null) {
    this.status = protectSnapshot({ status, generation: this.generation, recoveryCount: this.recoveryCount, reason });
    this.options.onStatus?.(this.status);
  }
  start() {
    if (this.running) return;
    this.running = true; this.recoveryCount = 0;
    this.visibility = this.options.visibility ?? browserVisibility();
    this.unwatchVisibility = this.visibility.subscribe(this.onVisibility);
    this.spawn();
  }
  stop() {
    if (!this.running && this.status.status === 'STOPPED') return;
    this.running = false; this.unwatchVisibility?.(); this.unwatchVisibility = null;
    this.destroyPort();
    const owner = this.pending?.owner; this.clearPending();
    if (owner) this.options.machine.cancel(owner, 'cancelled');
    this.report('STOPPED');
  }
  calculate(input: unknown, owner?: string): RequestResult {
    if (!isCalculationPayload(input)) return { accepted: false, reason: 'INVALID_INPUT' };
    if (!this.running || this.status.status === 'FAILED') return { accepted: false, reason: 'NOT_RUNNING' };
    let operationId = owner;
    if (!operationId) {
      const acquired = this.options.machine.begin('LOCKED');
      if (!acquired.accepted || !acquired.operationId) return { accepted: false, reason: 'BUSY' };
      operationId = acquired.operationId;
    }
    const snapshot = this.options.machine.reader.getSnapshot();
    if (snapshot.operationId !== operationId || snapshot.state !== 'LOCKED') return { accepted: false, reason: 'BUSY' };
    this.clearPending();
    const requestId = `calculation-${++this.sequence}`;
    this.pending = { requestId, owner: operationId, payload: Object.freeze({ ...input }), unregister: () => undefined };
    this.pending.unregister = this.options.machine.registerCancellation(operationId, () => this.clearPending());
    if (this.ready) this.sendPending();
    return { accepted: true, requestId };
  }
  private clearPending() {
    const previous = this.pending; this.pending = null; previous?.unregister();
  }
  private sendPending() {
    if (!this.pending || !this.port || !this.ready) return;
    try { this.port.postMessage({ type: 'CALCULATE', requestId: this.pending.requestId, generation: this.generation, payload: this.pending.payload }); }
    catch { this.recover('发送计算任务失败'); }
  }
  private spawn() {
    if (!this.running) return;
    this.destroyPort(); this.generation++; this.ready = false; this.unhealthy = false;
    this.spawnedAt = this.clock.now(); this.lastPing = this.spawnedAt; this.lastMonitorCheck = this.spawnedAt;
    this.report(this.recoveryCount ? 'RECOVERING' : 'STARTING');
    try {
      const port = this.options.factory(); this.port = port;
      const generation = this.generation;
      this.detach = [port.onMessage(data => { if (generation === this.generation && this.running) this.receive(data); }),
        port.onFailure(() => { if (generation === this.generation && this.running) this.recover('Worker 线程异常'); })];
      port.postMessage({ type: 'INITIALIZE', generation });
    } catch { this.unhealthy = true; }
    this.scheduleMonitor();
  }
  private receive(data: unknown) {
    if (!isWorkerResponse(data) || data.generation !== this.generation) return;
    if (data.type === 'READY' || data.type === 'PING') {
      this.lastPing = this.clock.now();
      if (data.type === 'READY' && !this.ready) {
        this.ready = true; this.report(this.visibility?.isHidden() ? 'SUSPENDED' : 'READY'); this.sendPending();
      }
      if (this.ready && this.lastPing - this.spawnedAt >= 3000 && this.recoveryCount) { this.recoveryCount = 0; this.report(this.visibility?.isHidden() ? 'SUSPENDED' : 'READY'); }
      return;
    }
    this.acceptResult(data);
  }
  private acceptResult(data: Extract<WorkerResponse, { type: 'RESULT' | 'ERROR' }>) {
    const pending = this.pending;
    if (!pending || data.requestId !== pending.requestId) return;
    const machine = this.options.machine.reader.getSnapshot();
    if (machine.operationId !== pending.owner || machine.state !== 'LOCKED') { this.clearPending(); return; }
    if (data.type === 'ERROR') { this.fail('计算线程拒绝了输入'); return; }
    if (data.rawData !== pending.payload.rawData || data.actionType !== pending.payload.actionType) { this.fail('计算结果与请求不一致'); return; }
    try {
      if (!this.options.publish(data).accepted) { this.fail('计算结果未通过数值校验'); return; }
      this.clearPending(); this.options.machine.complete(pending.owner);
    } catch { this.fail('计算结果发布失败'); }
  }
  private scheduleMonitor() {
    this.cancelMonitor?.(); this.cancelMonitor = null;
    if (!this.running || this.visibility?.isHidden()) return;
    this.cancelMonitor = this.clock.schedule(() => {
      this.cancelMonitor = null;
      if (!this.running || this.visibility?.isHidden()) return;
      const now = this.clock.now(), schedulingGap = now - this.lastMonitorCheck;
      this.lastMonitorCheck = now;
      // A delayed main-thread timer is not proof that the worker died. Let queued PINGs run.
      if (!this.unhealthy && schedulingGap > 250) {
        this.lastPing = now;
        if (!this.ready) this.spawnedAt = now;
        try { this.port?.postMessage({ type: 'PROBE', generation: this.generation }); }
        catch { this.recover('主线程恢复后探活失败'); return; }
        this.scheduleMonitor(); return;
      }
      if (this.unhealthy || (!this.ready && this.clock.now() - this.spawnedAt > 2000)
        || (this.ready && this.clock.now() - this.lastPing > 500)) this.recover('后台计算线程心跳超时');
      else this.scheduleMonitor();
    }, 50);
  }
  private onVisibility = () => {
    if (!this.running) return;
    this.cancelMonitor?.(); this.cancelMonitor = null;
    if (this.visibility?.isHidden()) { this.report('SUSPENDED'); return; }
    if (this.unhealthy) { this.recover('前台探活失败'); return; }
    this.lastPing = this.clock.now();
    this.lastMonitorCheck = this.clock.now();
    if (!this.ready) this.spawnedAt = this.clock.now();
    try { this.port?.postMessage({ type: 'PROBE', generation: this.generation }); }
    catch { this.recover('前台探活失败'); return; }
    this.report(this.ready ? 'READY' : 'STARTING'); this.scheduleMonitor();
  };
  private recover(reason: string) {
    if (!this.running) return;
    if (this.visibility?.isHidden()) { this.unhealthy = true; this.report('SUSPENDED', reason); return; }
    if (this.recoveryCount >= 3) { this.fail('计算线程连续恢复失败，请重新启动本地计算'); return; }
    this.recoveryCount++;
    console.warn('[Worker Self-Healing] 后台计算线程假死，已自动重启恢复！', { reason, nextGeneration: this.generation + 1 });
    this.spawn();
  }
  private fail(reason: string) {
    this.destroyPort(); this.running = false; this.unwatchVisibility?.(); this.unwatchVisibility = null;
    const owner = this.pending?.owner; this.clearPending();
    if (owner) this.options.machine.cancel(owner, 'failure');
    this.report('FAILED', reason);
  }
  private destroyPort() {
    this.cancelMonitor?.(); this.cancelMonitor = null;
    this.detach.forEach(cancel => cancel()); this.detach = [];
    this.port?.terminate(); this.port = null; this.ready = false;
  }
}
