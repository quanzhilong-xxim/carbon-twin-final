import { expect, test } from '@playwright/test';
import { automaticSceneRetryDelay } from '@/lib/three/scene-retry-policy';

test('transient scene failures receive at most three bounded automatic retries', () => {
  const delays = [0, 1, 2].map(retryCount => automaticSceneRetryDelay(new Error('HTTP 503: Service Unavailable'), retryCount));

  expect(delays).toEqual([500, 1_500, 3_000]);
  expect(automaticSceneRetryDelay(new Error('HTTP 503: Service Unavailable'), 3)).toBeNull();
  expect(automaticSceneRetryDelay(new Error('fetch for "/models/demo.glb" responded with 503: Service Unavailable'), 0)).toBe(500);
  expect(automaticSceneRetryDelay(new Error('三维加载超时（45 秒）'), 0)).toBe(500);
  expect(automaticSceneRetryDelay(new TypeError('Failed to fetch'), 1)).toBe(1_500);
});

test('permanent resource and renderer failures stay on manual recovery', () => {
  expect(automaticSceneRetryDelay(new Error('HTTP 404: Not Found'), 0)).toBeNull();
  expect(automaticSceneRetryDelay(new Error('Unexpected token < in JSON'), 0)).toBeNull();
  expect(automaticSceneRetryDelay(new Error('WebGL context lost'), 0)).toBeNull();
  expect(automaticSceneRetryDelay(new Error('WebGL context creation failed'), 0)).toBeNull();
});
