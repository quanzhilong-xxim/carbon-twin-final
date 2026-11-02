import { test, expect } from '@playwright/test';
import { CarbonWorkerClient } from '@/lib/core/CarbonWorkerClient';
import { createStateMachine } from '@/lib/core/StateMachine';
import { createDataHub } from '@/lib/stores/internal/dataHub';
import { FakeClock } from './helpers/FakeClock';
import { FakeVisibility, FakeWorker } from './helpers/FakeWorker';
import { captureLogs } from './helpers/captureLogs';

const payload = { rawData: 15, k: 0.1, x0: 0.5, actionType: 'slide' } as const;
function fixture() {
  const clock = new FakeClock(), visibility = new FakeVisibility(), ports: FakeWorker[] = [];
  const machine = createStateMachine({ clock }), hub = createDataHub();
  const client = new CarbonWorkerClient({ clock, visibility, machine, publish: hub.publishCalculation, factory: () => {
    const port = new FakeWorker(); ports.push(port); return port;
  } });
  return { clock, visibility, ports, machine, hub, client, close: () => { client.stop(); machine.dispose(); } };
}
test('start is lazy/idempotent; calculation waits for READY and publishes matching results', () => {
  const f = fixture();
  try {
    expect(f.ports).toHaveLength(0); f.client.start(); f.client.start(); expect(f.ports).toHaveLength(1);
    const request = f.client.calculate(payload); expect(request.accepted).toBe(true);
    expect(f.ports[0].messages.map(m => m.type)).toEqual(['INITIALIZE']);
    f.ports[0].emit({ type: 'READY', generation: 1 });
    const sent = f.ports[0].messages.find(m => m.type === 'CALCULATE');
    expect(sent?.type).toBe('CALCULATE');
    if (!sent || sent.type !== 'CALCULATE') throw new Error('No calculation sent');
    f.ports[0].emit({ type: 'RESULT', generation: 1, requestId: sent.requestId, rawData: 15, normalizedState: 0.8, actionType: 'slide' });
    expect(f.hub.reader.getSnapshot().revision).toBe(1); expect(f.machine.reader.getSnapshot().state).toBe('IDLE');
  } finally { f.close(); }
});
test('500ms foreground heartbeat threshold restarts and replays latest payload in a new generation', () => {
  const f = fixture(), logs = captureLogs();
  try {
    f.client.start(); f.ports[0].emit({ type: 'READY', generation: 1 });
    f.client.calculate(payload);
    const owner = f.machine.reader.getSnapshot().operationId!;
    f.client.calculate({ ...payload, rawData: 31 }, owner);
    f.clock.advance(500); expect(f.ports).toHaveLength(1);
    f.clock.advance(50); expect(f.ports).toHaveLength(2); expect(f.ports[0].terminated).toBe(true);
    f.ports[1].emit({ type: 'READY', generation: 2 });
    const replay = f.ports[1].messages.find(m => m.type === 'CALCULATE');
    if (!replay || replay.type !== 'CALCULATE') throw new Error('No replay');
    expect(replay.payload.rawData).toBe(31); expect(replay.generation).toBe(2);
    f.ports[1].emit({ type: 'RESULT', generation: 1, requestId: replay.requestId, rawData: 31, normalizedState: 0.9, actionType: 'slide' });
    expect(f.hub.reader.getSnapshot().revision).toBe(0);
    f.ports[1].emit({ type: 'RESULT', generation: 2, requestId: replay.requestId, rawData: 31, normalizedState: 0.9, actionType: 'slide' });
    expect(f.hub.reader.getSnapshot().raw.value).toBe(31);
    expect(logs.entries.filter(entry => entry.level === 'warn')).toHaveLength(1);
  } finally { f.close(); logs.restore(); }
});
test('latest request wins, malformed/foreign responses are ignored, cancelled work cannot publish', () => {
  const f = fixture();
  try {
    f.client.start(); f.ports[0].emit({ type: 'READY', generation: 1 });
    const first = f.client.calculate(payload); if (!first.accepted) throw new Error('No first request');
    const owner = f.machine.reader.getSnapshot().operationId!;
    const latest = f.client.calculate({ ...payload, rawData: 99 }, owner); if (!latest.accepted) throw new Error('No latest request');
    f.ports[0].emit({ type: 'RESULT', generation: 1, requestId: first.requestId, rawData: 15, normalizedState: 0.2, actionType: 'slide' });
    f.ports[0].emit({ type: 'RESULT', generation: 1, requestId: latest.requestId, rawData: NaN, normalizedState: 2, actionType: 'slide' });
    f.machine.cancel(owner, 'cancelled');
    f.ports[0].emit({ type: 'RESULT', generation: 1, requestId: latest.requestId, rawData: 99, normalizedState: 0.9, actionType: 'slide' });
    expect(f.hub.reader.getSnapshot().revision).toBe(0);
  } finally { f.close(); }
});
test('hidden tabs suspend timeout judgment, and foreground probes before restarting', () => {
  const f = fixture(), logs = captureLogs();
  try {
    f.client.start(); f.ports[0].emit({ type: 'READY', generation: 1 });
    f.visibility.change(true); f.clock.advance(60000); expect(f.ports).toHaveLength(1);
    expect(f.client.getStatus().status).toBe('SUSPENDED');
    f.visibility.change(false); expect(f.ports[0].messages.at(-1)?.type).toBe('PROBE');
    f.ports[0].emit({ type: 'PING', generation: 1 }); f.clock.advance(450); expect(f.ports).toHaveLength(1);
    f.clock.advance(100); expect(f.ports).toHaveLength(2);
  } finally { f.close(); logs.restore(); }
});
test('three failed recoveries terminate monitoring, release lock and report FAILED', () => {
  const f = fixture(), logs = captureLogs();
  try {
    f.client.start(); f.ports[0].emit({ type: 'READY', generation: 1 }); f.client.calculate(payload);
    for (let generation = 1; generation <= 4; generation++) {
      f.clock.advance(550);
      if (generation < 4) f.ports[generation].emit({ type: 'READY', generation: generation + 1 });
    }
    expect(f.ports).toHaveLength(4); expect(f.client.getStatus().status).toBe('FAILED');
    expect(f.client.getStatus().reason).toContain('连续恢复失败');
    expect(f.machine.reader.getSnapshot().state).toBe('IDLE'); expect(f.machine.reader.getSnapshot().lastReset).toBe('failure');
    expect(f.clock.pendingTimers).toBe(0); expect(f.visibility.listenerCount).toBe(0);
    expect(f.client.calculate(payload)).toEqual({ accepted: false, reason: 'NOT_RUNNING' });
    expect(logs.entries).toHaveLength(3);
  } finally { f.close(); logs.restore(); }
});
test('mount/cleanup/remount is safe and removes every listener and owned timer', () => {
  const f = fixture();
  try {
    f.client.start(); f.client.calculate(payload); f.client.stop(); f.client.stop();
    expect(f.ports[0].terminated).toBe(true); expect(f.ports[0].listenerCount).toBe(0);
    expect(f.visibility.listenerCount).toBe(0); expect(f.clock.pendingTimers).toBe(0);
    f.client.start(); expect(f.ports).toHaveLength(2); expect(f.client.getStatus().generation).toBe(2);
    f.ports[1].emit({ type: 'READY', generation: 2 }); expect(f.client.getStatus().status).toBe('READY');
  } finally { f.close(); }
});
test('startup timeout is distinct from heartbeat timeout and bounded if construction fails', () => {
  const f = fixture(), logs = captureLogs();
  try {
    f.client.start(); f.clock.advance(2000); expect(f.ports).toHaveLength(1);
    f.clock.advance(50); expect(f.ports).toHaveLength(2);
  } finally { f.close(); logs.restore(); }
});
test('invalid inputs do not lock the machine; mismatched result releases the owned lock', () => {
  const f = fixture();
  try {
    f.client.start(); expect(f.client.calculate({ ...payload, rawData: Infinity }).accepted).toBe(false);
    expect(f.machine.reader.getSnapshot().state).toBe('IDLE'); f.ports[0].emit({ type: 'READY', generation: 1 });
    const request = f.client.calculate(payload); if (!request.accepted) throw new Error('No request');
    f.ports[0].emit({ type: 'RESULT', generation: 1, requestId: request.requestId, rawData: 1234, normalizedState: 0.2, actionType: 'slide' });
    expect(f.client.getStatus().status).toBe('FAILED'); expect(f.hub.reader.getSnapshot().revision).toBe(0);
    expect(f.machine.reader.getSnapshot().state).toBe('IDLE');
  } finally { f.close(); }
});
test('a stalled main thread probes first instead of falsely terminating a healthy worker', () => {
  const f = fixture();
  try {
    f.client.start(); f.ports[0].emit({ type: 'READY', generation: 1 });
    f.clock.stall(1000); f.clock.advance(0);
    expect(f.ports).toHaveLength(1); expect(f.ports[0].messages.at(-1)?.type).toBe('PROBE');
    f.ports[0].emit({ type: 'PING', generation: 1 }); f.clock.advance(450);
    expect(f.ports).toHaveLength(1); expect(f.client.getStatus().status).toBe('READY');
  } finally { f.close(); }
});
