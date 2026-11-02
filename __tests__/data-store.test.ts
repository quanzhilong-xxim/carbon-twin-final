import { test, expect } from '@playwright/test';
import { createDataHub } from '@/lib/stores/internal/dataHub';
import { captureLogs } from './helpers/captureLogs';

const result = { type: 'RESULT', requestId: 'test-1', generation: 1, rawData: 23, normalizedState: 0.8, actionType: 'slide' } as const;
test('raw and visual values publish atomically, with immutable provenance and no exported setState', () => {
  const hub = createDataHub(), updates: number[] = [];
  const unsubscribe = hub.reader.subscribe(state => { updates.push(state.revision); expect(state.raw.value).toBe(23); expect(state.normalized.value).toBe(0.8); });
  expect(Reflect.has(hub.reader, 'setState')).toBe(false);
  expect(hub.publishCalculation(result)).toEqual({ accepted: true });
  expect(updates).toEqual([1]);
  expect(hub.reader.getSnapshot().raw.kind).toBe('demo-raw');
  expect(hub.reader.getSnapshot().normalized.kind).toBe('visual-normalized');
  expect(hub.reader.getServerSnapshot().revision).toBe(0);
  unsubscribe();
});
test('deep set/delete/defineProperty/prototype mutations are blocked and logged', () => {
  const hub = createDataHub(), logs = captureLogs(), snapshot = hub.reader.getSnapshot();
  try {
    expect(Object.isFrozen(snapshot)).toBe(true); expect(Object.isFrozen(snapshot.raw)).toBe(true);
    expect(Reflect.set(snapshot.raw, 'value', 999)).toBe(false);
    expect(Reflect.deleteProperty(snapshot.normalized, 'value')).toBe(false);
    expect(Reflect.defineProperty(snapshot, 'revision', { value: 99 })).toBe(false);
    expect(Reflect.setPrototypeOf(snapshot, {})).toBe(false);
    expect(hub.reader.getSnapshot().raw.value).toBe(0);
    expect(logs.entries).toHaveLength(4);
    expect(logs.entries.every(entry => String(entry.args[0]).startsWith('[Security Alert]'))).toBe(true);
  } finally { logs.restore(); }
});
test('invalid raw values, normalized bounds and forged envelopes never enter state', () => {
  const hub = createDataHub(), logs = captureLogs();
  try {
    const invalid: unknown[] = [null, {}, { ...result, rawData: NaN }, { ...result, rawData: Infinity }, { ...result, normalizedState: -0.01 }, { ...result, normalizedState: 1.01 }, { ...result, normalizedState: NaN }, { ...result, generation: 0 }, { ...result, requestId: '' }];
    invalid.forEach(input => expect(hub.publishCalculation(input).accepted).toBe(false));
    expect(hub.reader.getSnapshot().revision).toBe(0);
    expect(logs.entries).toHaveLength(invalid.length);
  } finally { logs.restore(); }
});
