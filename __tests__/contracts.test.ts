import { test, expect } from '@playwright/test';
import { isAIAction, isStoredCarbonSnapshot, isWorkerRequest, isWorkerResponse } from '@/lib/core/validation';

test('AI contract rejects unknown actions and unknown targets without executing anything', () => {
  expect(isAIAction({ type: 'NONE' })).toBe(true);
  expect(isAIAction({ type: 'CHANGE_THEME', target: 'danger' })).toBe(true);
  expect(isAIAction({ type: 'CHANGE_THEME', target: '<script>' })).toBe(false);
  expect(isAIAction({ type: 'NONE', target: 'danger' })).toBe(false);
  expect(isAIAction({ type: 'EXECUTE' })).toBe(false);
  expect(isAIAction({ type: 'FOCUS_MODEL', target: 'overview' })).toBe(true);
});
test('storage contract rejects unprotected quiz records and unsupported versions', () => {
  const snapshot = { id: 'quiz-1', timestamp: 100, actionType: 'quiz', rawData: 50, normalizedState: 0.5, isPermanent: true, schemaVersion: 1, sequence: 1 };
  expect(isStoredCarbonSnapshot(snapshot)).toBe(true);
  expect(isStoredCarbonSnapshot({ ...snapshot, isPermanent: false })).toBe(false);
  expect(isStoredCarbonSnapshot({ ...snapshot, schemaVersion: 2 })).toBe(false);
  expect(isStoredCarbonSnapshot({ ...snapshot, normalizedState: Infinity })).toBe(false);
});
test('worker control and calculation messages have separate validated identities', () => {
  expect(isWorkerRequest({ type: 'INITIALIZE', generation: 1 })).toBe(true);
  expect(isWorkerResponse({ type: 'PING', generation: 1 })).toBe(true);
  expect(isWorkerResponse({ type: 'PING', generation: -1 })).toBe(false);
  expect(isWorkerRequest({ type: 'CALCULATE', generation: 1, requestId: '' })).toBe(false);
  expect(isWorkerResponse({ type: 'RESULT', generation: 1 })).toBe(false);
});
