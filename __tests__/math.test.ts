import { test, expect } from '@playwright/test';
import { calculateSigmoid } from '@/lib/math/sigmoid';
import { captureLogs } from './helpers/captureLogs';

test('finite inputs: midpoint, monotonicity, saturation, negative slope and zero slope', () => {
  expect(calculateSigmoid(0.5)).toBe(0.5);
  expect(calculateSigmoid(-100)).toBeLessThan(calculateSigmoid(0));
  expect(calculateSigmoid(100)).toBeGreaterThan(calculateSigmoid(0));
  expect(calculateSigmoid(Number.MAX_VALUE)).toBe(1);
  expect(calculateSigmoid(-Number.MAX_VALUE)).toBe(0);
  expect(calculateSigmoid(100, -1)).toBeLessThan(0.5);
  expect(calculateSigmoid(Number.MAX_VALUE, 0, -Number.MAX_VALUE)).toBe(0.5);
});
test('finite extreme subtraction and tiny slopes do not lose a representable result', () => {
  const x = Number.MAX_VALUE, k = 1e-308;
  expect(calculateSigmoid(x, k, -x)).toBeCloseTo(1 / (1 + Math.exp(-2 * (x * k))), 14);
  expect(calculateSigmoid(-x, k, x)).toBeCloseTo(1 / (1 + Math.exp(2 * (x * k))), 14);
  expect(calculateSigmoid(Number.MIN_VALUE)).toBeGreaterThanOrEqual(0);
});
test('NaN/Infinity in all three parameters returns neutral with explicit diagnostics', () => {
  const logs = captureLogs();
  try {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(calculateSigmoid(bad)).toBe(0.5);
      expect(calculateSigmoid(1, bad)).toBe(0.5);
      expect(calculateSigmoid(1, 0.1, bad)).toBe(0.5);
    }
    expect(logs.entries).toHaveLength(9);
    expect(logs.entries.every(entry => entry.args[0] === '[Math Hub Error] 非法输入被拦截')).toBe(true);
  } finally { logs.restore(); }
});
test('mapping stays within [0,1] for a broad deterministic finite domain', () => {
  for (let x = -1000; x <= 1000; x += 0.5) {
    const y = calculateSigmoid(x);
    expect(Number.isFinite(y) && y >= 0 && y <= 1).toBe(true);
  }
});
