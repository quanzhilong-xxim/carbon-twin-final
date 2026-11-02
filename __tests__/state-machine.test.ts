import { test, expect } from '@playwright/test';
import { createStateMachine } from '@/lib/core/StateMachine';
import { FakeClock } from './helpers/FakeClock';
import { captureLogs } from './helpers/captureLogs';

test('legal transitions require ownership; LOCKED returns to its previous stable state', () => {
  const clock = new FakeClock(), machine = createStateMachine({ clock });
  const expansion = machine.begin('EXPANDING');
  expect(expansion.accepted).toBe(true);
  const id = machine.reader.getSnapshot().operationId!;
  expect(machine.transition('ACTIVE')).toEqual({ accepted: false, reason: 'STALE_OWNER' });
  expect(machine.complete(id).accepted).toBe(true);
  expect(machine.reader.getSnapshot().state).toBe('ACTIVE');
  machine.begin('LOCKED'); machine.complete(machine.reader.getSnapshot().operationId!);
  expect(machine.reader.getSnapshot().state).toBe('ACTIVE');
  machine.begin('COLLAPSING'); machine.complete(machine.reader.getSnapshot().operationId!);
  expect(machine.reader.getSnapshot().state).toBe('IDLE');
  expect(clock.pendingTimers).toBe(0); machine.dispose();
});
test('ten concurrent expansion requests produce one transition and nine refusals', () => {
  const clock = new FakeClock(), transitions: string[] = [], rejections: string[] = [];
  const machine = createStateMachine({ clock, onTransition: (a, b) => transitions.push(`${a}->${b}`), onRejected: reason => rejections.push(reason) });
  const attempts = Array.from({ length: 10 }, () => machine.begin('EXPANDING'));
  expect(attempts.filter(result => result.accepted)).toHaveLength(1);
  expect(transitions).toEqual(['IDLE->EXPANDING']); expect(rejections).toEqual(Array(9).fill('BUSY'));
  machine.dispose(); expect(clock.pendingTimers).toBe(0);
});
test('invalid state edges and stale owners cannot complete or unlock a task', () => {
  const machine = createStateMachine({ clock: new FakeClock() });
  expect(machine.transition('ACTIVE')).toEqual({ accepted: false, reason: 'INVALID_TRANSITION' });
  expect(machine.begin('COLLAPSING')).toEqual({ accepted: false, reason: 'INVALID_TRANSITION' });
  machine.begin('LOCKED');
  expect(machine.complete('stale')).toEqual({ accepted: false, reason: 'STALE_OWNER' });
  expect(machine.cancel('stale', 'cancelled').accepted).toBe(false);
  expect(machine.reader.getSnapshot().state).toBe('LOCKED'); machine.dispose();
});
test('four-second fuse precisely cancels owned resources and resets once', () => {
  const clock = new FakeClock(), notices: string[] = [], cancelled: string[] = [];
  const machine = createStateMachine({ clock, onReset: message => notices.push(message) });
  machine.begin('LOCKED'); const owner = machine.reader.getSnapshot().operationId!;
  machine.registerCancellation(owner, () => cancelled.push('fetch'));
  machine.registerCancellation(owner, () => cancelled.push('worker-request'));
  const unregister = machine.registerCancellation(owner, () => cancelled.push('already-completed')); unregister();
  clock.advance(3999); expect(machine.reader.getSnapshot().state).toBe('LOCKED');
  clock.advance(1); expect(machine.reader.getSnapshot().state).toBe('IDLE');
  expect(machine.reader.getSnapshot().lastReset).toBe('timeout');
  expect(cancelled).toEqual(['fetch', 'worker-request']); expect(notices).toEqual(['系统已重置，请重新操作']);
  clock.advance(8000); expect(notices).toHaveLength(1); expect(clock.pendingTimers).toBe(0); machine.dispose();
});
test('old task timers do not reset a new owner; repeated disposal clears all resources', () => {
  const clock = new FakeClock(), machine = createStateMachine({ clock });
  machine.begin('LOCKED'); const first = machine.reader.getSnapshot().operationId!;
  clock.advance(3000); machine.complete(first);
  machine.begin('LOCKED'); const second = machine.reader.getSnapshot().operationId!;
  expect(first).not.toBe(second);
  clock.advance(1100); expect(machine.reader.getSnapshot().operationId).toBe(second);
  expect(machine.complete(first).accepted).toBe(false);
  machine.dispose(); machine.dispose(); expect(clock.pendingTimers).toBe(0);
  expect(machine.begin('LOCKED')).toEqual({ accepted: false, reason: 'DISPOSED' });
});
test('one cleanup failure does not prevent remaining cleanups or unlocking', () => {
  const clock = new FakeClock(), machine = createStateMachine({ clock }), logs = captureLogs(); let cleaned = false;
  try {
    machine.begin('LOCKED'); const owner = machine.reader.getSnapshot().operationId!;
    machine.registerCancellation(owner, () => { throw new Error('injected-cleanup-failure'); });
    machine.registerCancellation(owner, () => { cleaned = true; });
    clock.advance(4000); expect(cleaned).toBe(true); expect(machine.reader.getSnapshot().state).toBe('IDLE');
    expect(logs.entries).toHaveLength(1);
  } finally { machine.dispose(); logs.restore(); }
});
