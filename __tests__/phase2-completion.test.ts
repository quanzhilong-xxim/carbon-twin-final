import { test, expect } from '@playwright/test';
import { describeRecognitionError, joinRecognitionText } from '@/lib/hooks/useSpeechRecognition';
import { retrieve } from '@/lib/ai/retrieval';

test('ASR error mapping is explicit about permission, device, network and abort', () => {
  expect(describeRecognitionError('not-allowed')).toEqual({ status: 'denied', message: expect.stringContaining('麦克风权限被拒绝') });
  expect(describeRecognitionError('service-not-allowed').status).toBe('denied');
  expect(describeRecognitionError('no-speech').status).toBe('error');
  expect(describeRecognitionError('audio-capture').message).toContain('麦克风');
  expect(describeRecognitionError('network').message).toContain('网络');
  expect(describeRecognitionError('aborted')).toEqual({ status: 'stopped', message: '' });
  expect(describeRecognitionError(undefined).status).toBe('error');
  // No message may pretend a transcript exists.
  for (const code of ['not-allowed', 'no-speech', 'network', 'audio-capture', 'weird']) {
    expect(describeRecognitionError(code).message).not.toMatch(/识别成功|已转写|transcript:/);
  }
});

test('recognition text joining never double-spaces or drops interim speech', () => {
  expect(joinRecognitionText([], '')).toBe('');
  expect(joinRecognitionText(['你好'], '')).toBe('你好');
  expect(joinRecognitionText(['你好，'], '世界')).toBe('你好，世界');
  expect(joinRecognitionText(['你好'], '世界')).toBe('你好 世界');
  expect(joinRecognitionText(['第一部分。', '第二部分。'], '第三部分')).toBe('第一部分。第二部分。第三部分');
});

test('role-scoped retrieval stays bounded, verified-only and never invents evidence for no-match queries', () => {
  for (const identity of ['student', 'business', 'city'] as const) {
    const results = retrieve('购入电力 排放因子 边界', { identity });
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(3);
    expect(results.every((row) => row.url.startsWith('https://') && row.excerpt.length > 10)).toBe(true);
    expect(retrieve('unmatchablequeryxyz', { identity })).toEqual([]);
    expect(retrieve('', { identity })).toEqual([]);
  }
  // Without an identity the legacy behaviour is preserved.
  expect(retrieve('GHG Protocol Scope 2 购入电力 企业边界')[0].referenceId).toBe('ghgp-scope2-audited');
  // A business hint must not remove the audited accounting source from a matching query.
  const business = retrieve('GHG Protocol Scope 2 购入电力 企业边界', { identity: 'business' });
  expect(business.some((row) => row.referenceId === 'ghgp-scope2-audited')).toBe(true);
});
