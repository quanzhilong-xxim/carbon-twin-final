import { createStore } from 'zustand/vanilla';
import type { CancelResource, GlobalState, MachineSnapshot, RuntimeClock, TransitionResult } from '@/types';
import { runtimeClock } from './clock';
import { protectSnapshot } from './readonly';

type BusyState = 'EXPANDING' | 'COLLAPSING' | 'LOCKED';
type Options = {
  clock?: RuntimeClock;
  onReset?: (message: string) => void;
  onRejected?: (reason: string) => void;
  onTransition?: (from: GlobalState, to: GlobalState, operationId: string | null) => void;
};
const graph: Readonly<Record<GlobalState, readonly GlobalState[]>> = {
  IDLE: ['EXPANDING', 'LOCKED'], EXPANDING: ['ACTIVE', 'IDLE'],
  ACTIVE: ['COLLAPSING', 'LOCKED'], COLLAPSING: ['IDLE'], LOCKED: ['IDLE', 'ACTIVE'],
};
let instanceCounter = 0;

export function createStateMachine(options: Options = {}) {
  const clock = options.clock ?? runtimeClock;
  const prefix = ++instanceCounter;
  let sequence = 0, disposed = false, releasing = false;
  let cancelTimer: CancelResource | null = null;
  const resources = new Set<CancelResource>();
  const initial = protectSnapshot<MachineSnapshot>({ state: 'IDLE', operationId: null, returnState: 'IDLE', revision: 0, lastReset: null });
  const store = createStore<MachineSnapshot>(() => initial);
  const reader = Object.freeze({ getSnapshot: store.getState, getServerSnapshot: () => initial, subscribe: store.subscribe });
  const reject = (reason: Extract<TransitionResult, { accepted: false }>['reason']): TransitionResult => {
    options.onRejected?.(reason);
    return { accepted: false, reason };
  };
  function publish(state: GlobalState, operationId: string | null, returnState: 'IDLE' | 'ACTIVE', lastReset: MachineSnapshot['lastReset'] = null) {
    const previous = store.getState();
    store.setState(protectSnapshot({ state, operationId, returnState, revision: previous.revision + 1, lastReset }), true);
    options.onTransition?.(previous.state, state, operationId);
  }
  function releaseResources() {
    cancelTimer?.(); cancelTimer = null;
    const owned = [...resources]; resources.clear(); releasing = true;
    for (const cancel of owned) {
      try { cancel(); } catch (error: unknown) { console.error('[StateMachine Cleanup Error]', error instanceof Error ? error.message : 'Unknown cleanup failure'); }
    }
    releasing = false;
  }
  function reset(operationId: string, reason: NonNullable<MachineSnapshot['lastReset']>): TransitionResult {
    if (disposed) return reject('DISPOSED');
    if (releasing || store.getState().operationId !== operationId) return reject('STALE_OWNER');
    releaseResources();
    publish('IDLE', null, 'IDLE', reason);
    if (reason === 'timeout') options.onReset?.('系统已重置，请重新操作');
    return { accepted: true, operationId: null, state: 'IDLE' };
  }
  function begin(target: BusyState): TransitionResult {
    if (disposed) return reject('DISPOSED');
    const current = store.getState();
    if (releasing || current.operationId !== null) return reject('BUSY');
    if (!graph[current.state].includes(target)) return reject('INVALID_TRANSITION');
    const operationId = `operation-${prefix}-${++sequence}`;
    const returnState = current.state === 'ACTIVE' ? 'ACTIVE' : 'IDLE';
    // Arm before publication so a synchronous observer completing the task can cancel it.
    cancelTimer = clock.schedule(() => {
      if (!disposed && store.getState().operationId === operationId) reset(operationId, 'timeout');
    }, 4000);
    publish(target, operationId, returnState);
    return { accepted: true, operationId, state: target };
  }
  function complete(operationId: string): TransitionResult {
    if (disposed) return reject('DISPOSED');
    const current = store.getState();
    if (releasing || current.operationId !== operationId) return reject('STALE_OWNER');
    const next = current.state === 'EXPANDING' ? 'ACTIVE' : current.state === 'LOCKED' ? current.returnState : 'IDLE';
    releaseResources(); publish(next, null, next);
    return { accepted: true, operationId: null, state: next };
  }
  /** Explicit network lease renewal; callers must impose their own absolute deadline. */
  function renew(operationId: string): boolean {
    if (disposed || store.getState().operationId !== operationId) return false;
    cancelTimer?.();
    cancelTimer = clock.schedule(() => {
      if (!disposed && store.getState().operationId === operationId) reset(operationId, 'timeout');
    }, 4000);
    return true;
  }
  function transition(next: GlobalState, operationId?: string): TransitionResult {
    if (disposed) return reject('DISPOSED');
    const current = store.getState();
    if (!graph[current.state].includes(next)) return reject(current.operationId ? 'BUSY' : 'INVALID_TRANSITION');
    if (current.operationId) {
      if (operationId !== current.operationId) return reject('STALE_OWNER');
      const expected = current.state === 'EXPANDING' ? 'ACTIVE' : current.state === 'LOCKED' ? current.returnState : 'IDLE';
      if (next === expected) return complete(operationId);
      if (next === 'IDLE') return reset(operationId, 'cancelled');
      return reject('INVALID_TRANSITION');
    }
    if (operationId) return reject('STALE_OWNER');
    if (next === 'EXPANDING' || next === 'COLLAPSING' || next === 'LOCKED') return begin(next);
    return reject('INVALID_TRANSITION');
  }
  function registerCancellation(operationId: string, cancel: CancelResource): CancelResource {
    if (disposed || releasing || store.getState().operationId !== operationId) {
      try { cancel(); } catch (error: unknown) { console.error('[StateMachine Cleanup Error]', error); }
      return () => undefined;
    }
    resources.add(cancel);
    return () => { resources.delete(cancel); };
  }
  function dispose() {
    if (disposed) return;
    disposed = true; releaseResources(); publish('IDLE', null, 'IDLE', 'cancelled');
  }
  return Object.freeze({ reader, begin, transition, complete, renew, cancel: reset, registerCancellation, dispose });
}
export type StateMachineEngine = ReturnType<typeof createStateMachine>;
